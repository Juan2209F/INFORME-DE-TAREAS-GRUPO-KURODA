// Edge Function "notificar-push" — Grupo Kuroda
// La llama la base de datos (disparador public.notif_movimiento) cada vez que registra un
// movimiento en public.notificaciones, y manda la notificación (Firebase Cloud Messaging) a los
// teléfonos registrados en public.push_dispositivos a los que les toca ese aviso:
//   - menos al de quien hizo el cambio,
//   - solo a quien por su rol ve ese módulo y por su razón social ve ese movimiento
//     (regla public.notif_le_toca, la misma de la campanita del Monitor),
//   - un solo aviso por carga: la base junta los cambios seguidos en un mismo registro.
// Secreto necesario (Supabase › Edge Functions › Secrets): FIREBASE_SERVICE_ACCOUNT con el JSON
// completo de la cuenta de servicio de Firebase. Desplegar con "Verify JWT" desactivado: la
// protege la clave x-aviso que solo conoce la base (tabla push_config).
import { createClient } from 'jsr:@supabase/supabase-js@2';

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

// módulo -> [título, singular, plural, sección de la app, género]
const TEXTOS: Record<string, [string, string, string, string, 'm' | 'f']> = {
  tareas: ['📝 Tareas', 'tarea', 'tareas', 'tareas', 'f'],
  finalizadas: ['✅ Tareas finalizadas', 'tarea finalizada', 'tareas finalizadas', 'auditorias', 'f'],
  auditorias: ['🔍 Auditorías', 'auditoría', 'auditorías', 'auditorias', 'f'],
  actividades: ['📋 Actividades', 'actividad', 'actividades', 'actividades', 'f'],
  ajustes: ['⚖️ Ajustes', 'ajuste', 'ajustes', 'ajustes', 'm'],
  mermas: ['🗂️ Mermas', 'merma', 'mermas', 'mermas', 'f'],
  archivero: ['🗄️ Archivero', 'documento', 'documentos', 'archivero', 'm'],
  activos: ['📦 Activos', 'movimiento de activos', 'movimientos de activos', 'activos', 'm'],
};
// operación -> [con autor, sin autor (singular), sin autor (plural)]
const VERBOS: Record<string, [string, string, string]> = {
  INSERT: ['registró', 'Se registró', 'Se registraron'],
  UPDATE: ['actualizó', 'Se actualizó', 'Se actualizaron'],
  DELETE: ['eliminó', 'Se eliminó', 'Se eliminaron'],
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

  // 2) Movimiento registrado por el disparador.
  const p = await req.json().catch(() => ({}));
  const id = Number(p.id);
  if (!id) return json({ omitido: 'sin movimiento' });
  const { data: mov } = await sb.from('notificaciones')
    .select('modulo,tabla,operacion,n,razones,actor_nombre').eq('id', id).maybeSingle();
  if (!mov) return json({ omitido: 'movimiento no encontrado' });
  const t = TEXTOS[mov.modulo];
  const v = VERBOS[mov.operacion];
  if (!t || !v) return json({ omitido: 'módulo sin aviso' });

  // 3) Teléfonos a avisar (rol + razón social; nunca el de quien hizo el cambio).
  const { data: disp, error: errDisp } = await sb.rpc('notif_tokens', { p_id: id });
  if (errDisp) return json({ error: errDisp.message }, 500);
  const destino: string[] = (disp || []).map((d: { token: string }) => d.token);

  const n = Number(mov.n) || 1;
  const razones: string[] = Array.isArray(mov.razones) ? mov.razones.filter(Boolean) : [];
  const cuanto = n === 1 ? `${t[4] === 'f' ? 'una' : 'un'} ${t[1]}` : `${n} ${t[2]}`;
  const texto = (mov.actor_nombre ? `${mov.actor_nombre} ${v[0]} ${cuanto}` : `${n === 1 ? v[1] : v[2]} ${cuanto}`) +
    (razones.length ? ` · ${razones.join(', ')}` : '');

  await sb.from('push_envios').insert({ tabla: mov.tabla, n, razones: razones.length ? razones : null, dispositivos: destino.length });
  if (!destino.length) return json({ enviados: 0 });

  // 4) Envío por Firebase.
  const sa = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT') || '{}');
  if (!sa.project_id) return json({ error: 'Falta el secreto FIREBASE_SERVICE_ACCOUNT' }, 500);
  const acceso = await tokenGoogle(sa);
  let enviados = 0;
  const vencidos: string[] = [];
  await Promise.all(destino.map(async (token) => {
    const r = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + acceso, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: { token, data: { titulo: t[0], texto, seccion: t[3] }, android: { priority: 'HIGH' } },
      }),
    });
    if (r.ok) enviados++;
    else if (r.status === 404) vencidos.push(token);   // UNREGISTERED: la app se desinstaló
  }));
  if (vencidos.length) await sb.from('push_dispositivos').delete().in('token', vencidos);
  return json({ enviados, borrados: vencidos.length });
});
