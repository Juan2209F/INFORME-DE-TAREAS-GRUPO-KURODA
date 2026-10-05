// Edge Function "notificar-push" — Grupo Kuroda
// La llama la base de datos (disparador public.push_aviso) cuando cambian tareas, auditorías,
// actividades, ajustes, mermas o activos, y manda una notificación (Firebase Cloud Messaging) a
// los teléfonos registrados en public.push_dispositivos:
//   - menos al de quien hizo el cambio,
//   - solo a quien ve esa razón social (si el usuario tiene razones limitadas),
//   - un solo aviso por tabla cada 45 s (una carga de Excel = un aviso, no cientos).
// Secreto necesario (Supabase › Edge Functions › Secrets): FIREBASE_SERVICE_ACCOUNT con el JSON
// completo de la cuenta de servicio de Firebase. Desplegar con "Verify JWT" desactivado: la
// protege la clave x-aviso que solo conoce la base (tabla push_config).
import { createClient } from 'jsr:@supabase/supabase-js@2';

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

// tabla -> [título, singular, plural, sección de la app]
const TEXTOS: Record<string, [string, string, string, string]> = {
  tareas: ['📝 Tareas', 'tarea', 'tareas', 'tareas'],
  tareas_finalizadas: ['✅ Tareas finalizadas', 'tarea finalizada', 'tareas finalizadas', 'auditorias'],
  auditorias: ['🔍 Auditorías', 'auditoría', 'auditorías', 'auditorias'],
  actividades: ['📋 Actividades', 'actividad', 'actividades', 'actividades'],
  ajustes: ['⚖️ Ajustes', 'ajuste', 'ajustes', 'ajustes'],
  mermas: ['🗂️ Mermas', 'merma', 'mermas', 'mermas'],
  activos: ['📦 Activos', 'activo', 'activos', 'activos'],
  movimientos: ['📦 Activos', 'movimiento de activos', 'movimientos de activos', 'activos'],
  inventarios: ['📦 Inventarios', 'inventario', 'inventarios', 'activos'],
};

const b64url = (b: Uint8Array) => {
  let s = '';
  b.forEach((x) => (s += String.fromCharCode(x)));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

// Token de Google (OAuth) a partir de la cuenta de servicio, para la API v1 de FCM.
let cache: { token: string; vence: number } | null = null;
async function tokenGoogle(sa: { client_email: string; private_key: string }) {
  const ahora = Math.floor(Date.now() / 1000);
  if (cache && cache.vence > ahora + 60) return cache.token;
  const enc = (o: unknown) => b64url(new TextEncoder().encode(JSON.stringify(o)));
  const cabeza = enc({ alg: 'RS256', typ: 'JWT' });
  const datos = enc({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: ahora,
    exp: ahora + 3600,
  });
  const pem = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const llave = await crypto.subtle.importKey(
    'pkcs8',
    Uint8Array.from(atob(pem), (c) => c.charCodeAt(0)),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const firma = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', llave, new TextEncoder().encode(cabeza + '.' + datos)));
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + cabeza + '.' + datos + '.' + b64url(firma),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error('Google no dio token: ' + JSON.stringify(j));
  cache = { token: j.access_token, vence: ahora + (j.expires_in || 3600) };
  return cache.token;
}

const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  // 1) Solo la base de datos puede llamar (clave guardada en push_config).
  const { data: cfg } = await sb.from('push_config').select('valor').eq('clave', 'secreto').maybeSingle();
  if (!cfg || req.headers.get('x-aviso') !== cfg.valor) return json({ error: 'no autorizado' }, 401);

  const p = await req.json().catch(() => ({}));
  const tabla = String(p.tabla || '');
  const t = TEXTOS[tabla];
  if (!t) return json({ omitido: 'tabla sin aviso' });
  const n = Number(p.n) || 1;
  const razones: string[] = Array.isArray(p.razones) ? p.razones.filter(Boolean) : [];

  // 2) Un aviso por tabla cada 45 s (las cargas de Excel generan varios cambios seguidos).
  const desde = new Date(Date.now() - 45_000).toISOString();
  const { count } = await sb.from('push_envios').select('id', { count: 'exact', head: true }).eq('tabla', tabla).gte('enviado', desde);
  if ((count || 0) > 0) return json({ omitido: 'aviso reciente' });

  // 3) Teléfonos a avisar.
  const { data: disp } = await sb.from('push_dispositivos').select('token,user_id,razones');
  const destino = (disp || []).filter((d) =>
    d.user_id !== p.actor &&
    (!razones.length || !d.razones || !d.razones.length || d.razones.some((r: string) => razones.includes(r)))
  );

  const nuevo = p.operacion === 'INSERT';
  const texto = (n === 1
    ? (nuevo ? `Se registró 1 ${t[1]}` : `Se actualizó 1 ${t[1]}`)
    : (nuevo ? `Se registraron ${n} ${t[2]}` : `Se actualizaron ${n} ${t[2]}`)) +
    (razones.length ? ` · ${razones.join(', ')}` : '');

  await sb.from('push_envios').insert({ tabla, n, razones: razones.length ? razones : null, dispositivos: destino.length });
  if (!destino.length) return json({ enviados: 0 });

  // 4) Envío por Firebase.
  const sa = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT') || '{}');
  if (!sa.project_id) return json({ error: 'Falta el secreto FIREBASE_SERVICE_ACCOUNT' }, 500);
  const acceso = await tokenGoogle(sa);
  let enviados = 0;
  const vencidos: string[] = [];
  await Promise.all(destino.map(async (d) => {
    const r = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + acceso, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: { token: d.token, data: { titulo: t[0], texto, seccion: t[3] }, android: { priority: 'HIGH' } },
      }),
    });
    if (r.ok) enviados++;
    else if (r.status === 404) vencidos.push(d.token);   // UNREGISTERED: la app se desinstaló
  }));
  if (vencidos.length) await sb.from('push_dispositivos').delete().in('token', vencidos);
  return json({ enviados, borrados: vencidos.length });
});
