/* Envía por correo las tareas pendientes de cada tienda — Grupo Kuroda
   La llama pg_cron cada lunes 8:00 am Pacífico (encabezado x-cron-token) y
   también el botón "Enviar" del panel Correos y tiendas (usuario y contraseña
   de un administrador en el cuerpo).

   - Solo envía las razones sociales activas en correos_razones, cada una con
     sus propias tareas. Por tienda se envían como máximo dos correos:
       1) Colaboración + Orden y Limpieza: uno solo, con una sección por tipo.
       2) Cartera: aparte, solo si la tienda tiene tareas de cartera.
     Cada tarea lleva su ID. La firma es "AUDITORÍA <razón social>".
   - Para: correos capturados en la tienda como "para" (tienda_correos).
   - CC: correos "cc" de la tienda + copias de la razón social (correos_copias).

   Se envía por Gmail (SMTP smtp.gmail.com:465; Supabase bloquea 25 y 587).
   Secretos requeridos (Supabase → Edge Functions → Secrets):
     GMAIL_USER, GMAIL_APP_PASSWORD

   Cuerpo (JSON):
     admin, pass  credenciales de administrador (si no viene x-cron-token)
     razon        "KNO" → solo esa razón social (aunque esté inactiva)
     tienda_id    solo esa tienda
     dry          true → arma los correos y los regresa sin enviarlos
     force        true → reenvía aunque la tienda/tipo ya tenga correo enviado hoy
                  (los envíos desde el panel siempre lo hacen; solo pg_cron evita duplicados)
     prueba       ["a@x.com", ...] → manda los correos SOLO a esas direcciones,
                  sin copias y con "[PRUEBA]" en el asunto; no se registra.
                  Sin tienda_id manda solo el primer correo (con todas: true, todos).
     prueba_real  true → prueba a los destinatarios configurados (Para + CC),
                  con "[PRUEBA]" en el asunto; no se registra ni bloquea el lunes. */
import { createClient } from "npm:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6";

const TZ = "America/Tijuana";
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Tarea = {
  tarea_id: string | null;
  actividad: string | null;
  nombre: string | null;
  area_resp: string | null;
  estado: string | null;
  fecha_creacion: string | null;
  fecha_term: string | null;
};
type Grupo = {
  tienda_id: string;
  tienda: string;
  razon: string;
  centro: string | null;
  tipo_tarea: string;
  destinatarios: string[];
  cc: string[];
  tareas: Tarea[];
};
type Razon = { razon: string; remitente: string };
type Clase = "col" | "ol" | "cartera";
type Seccion = { clase: Clase; tipo_tarea: string; tareas: Tarea[] };
/* Un correo: todas las secciones de una tienda que viajan juntas. */
type Paquete = {
  tienda_id: string;
  tienda: string;
  razon: string;
  centro: string | null;
  cartera: boolean;
  destinatarios: string[];
  cc: string[];
  secciones: Seccion[];
};

/* Tipo de tarea → clase (mismo criterio que tipoNorm() del dashboard). */
function claseDe(tipo: string | null): Clase {
  const t = (tipo || "").toLowerCase();
  if (t.includes("cartera")) return "cartera";
  if (t.includes("orden") || t.includes("limpieza")) return "ol";
  return "col";
}
const TITULO: Record<Clase, string> = {
  col: "Auditoría de Colaboración",
  ol: "Auditoría de Orden y Limpieza",
  cartera: "Auditoría de Cartera",
};
const CORTO: Record<Clase, string> = { col: "Colaboración", ol: "Orden y Limpieza", cartera: "Cartera" };
const ORDEN: Record<Clase, number> = { col: 1, ol: 2, cartera: 3 };
/* Lo que se guarda en correos_envios.tipo_tarea para cada correo. */
const TIPO_REGISTRO = { combinado: "COLABORACION Y ORDEN Y LIMPIEZA", cartera: "TAREAS CARTERA" };

/* Agrupa los grupos (tienda × tipo) de la base en correos: uno de Colaboración + Orden y
   Limpieza por tienda y, aparte, uno de Cartera. */
function armarPaquetes(grupos: Grupo[]): Paquete[] {
  const mapa = new Map<string, Paquete>();
  const unir = (a: string[], b: string[]) => [...new Set([...a, ...b].map((s) => s.toLowerCase()))];
  for (const g of grupos) {
    const clase = claseDe(g.tipo_tarea);
    const cartera = clase === "cartera";
    const k = `${g.tienda_id}|${cartera ? "cartera" : "combinado"}`;
    let p = mapa.get(k);
    if (!p) {
      p = { tienda_id: g.tienda_id, tienda: g.tienda, razon: g.razon, centro: g.centro, cartera, destinatarios: [], cc: [], secciones: [] };
      mapa.set(k, p);
    }
    p.destinatarios = unir(p.destinatarios, g.destinatarios || []);
    p.cc = unir(p.cc, g.cc || []).filter((c) => !p!.destinatarios.includes(c));
    const previa = p.secciones.find((s) => s.clase === clase);
    if (previa) previa.tareas.push(...(g.tareas || []));
    else p.secciones.push({ clase, tipo_tarea: g.tipo_tarea, tareas: [...(g.tareas || [])] });
  }
  const out = [...mapa.values()];
  out.forEach((p) => p.secciones.sort((a, b) => ORDEN[a.clase] - ORDEN[b.clase]));
  return out.sort((a, b) => a.tienda.localeCompare(b.tienda) || Number(a.cartera) - Number(b.cartera));
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

/* Campos de las tareas que se guardan cifrados (AES-256-GCM, "iv:cifrado" en base64) con las
   claves del Vault. Se descifran aquí para armar el correo. */
const CIFRADOS: (keyof Tarea)[] = ["actividad", "nombre", "area_resp"];
const PARECE = /^[A-Za-z0-9+/=]{16}:[A-Za-z0-9+/=]{16,}$/;
const desdeB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function clavesDatos(sb: ReturnType<typeof createClient>): Promise<CryptoKey[]> {
  const { data } = await sb.rpc("_claves_servidor");
  const out: CryptoKey[] = [];
  for (const k of [data?.nueva, data?.anterior]) {
    if (k) out.push(await crypto.subtle.importKey("raw", desdeB64(k), { name: "AES-GCM" }, false, ["decrypt"]));
  }
  return out;
}
async function descifrar(claves: CryptoKey[], v: string | null): Promise<string | null> {
  if (!v || !PARECE.test(v)) return v;
  const [iv, ct] = v.split(":");
  for (const k of claves) {
    try { return new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: desdeB64(iv) }, k, desdeB64(ct))); } catch { /* otra clave */ }
  }
  return v;
}

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
  );

const hoyLocal = () => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());

const fmt = (d: string | null) => (d ? d.split("-").reverse().join("/") : "—");

const plural = (n: number, s: string) => `${n} ${s}${n === 1 ? "" : "s"}`;

function diasVencida(fechaTerm: string | null, hoy: string) {
  if (!fechaTerm) return null;
  return Math.round((Date.parse(hoy) - Date.parse(fechaTerm)) / 86400000);
}

/* Paleta formal compatible con Outlook (escritorio, web y modo oscuro):
   todo el diseño va en tablas con colores explícitos (bgcolor + style). */
const C = {
  marca: "#1F3864",    // azul marino corporativo (encabezado)
  texto: "#262626",
  suave: "#595959",
  borde: "#D9D9D9",
  cabecera: "#F2F2F2", // fondo de encabezados de tabla
  fondo: "#FFFFFF",
  abierta: "#1F4E79",  // azul: Abierta en plazo
  atrasada: "#C00000", // rojo: Abierta atrasada / días de atraso
};
const FUENTE = "font-family:Calibri,'Segoe UI',Arial,sans-serif";

const esAtrasada = (estado: string | null) => (estado || "").toLowerCase().includes("atrasad");

/* Colores por tipo de auditoría: tarjeta de cantidad y barra de cada sección. */
const COLOR: Record<Clase, { fuerte: string; oscuro: string; fondo: string; borde: string }> = {
  col: { fuerte: "#2563EB", oscuro: "#1E3A8A", fondo: "#EFF6FF", borde: "#BFDBFE" },
  ol: { fuerte: "#16A34A", oscuro: "#14532D", fondo: "#F0FDF4", borde: "#BBF7D0" },
  cartera: { fuerte: "#7C3AED", oscuro: "#4C1D95", fondo: "#F5F3FF", borde: "#DDD6FE" },
};
const NOMBRE_RAZON: Record<string, string> = { KNO: "Kuroda Norte", KS: "Kuroda Sonora", KSC: "Kuroda Sonora", KSA: "Kuroda" };
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
/* "2026-10-16" → "16 oct 2026" */
const fechaCorta = (d: string | null) => {
  if (!d) return "—";
  const [a, m, dia] = d.split("-").map(Number);
  return `${dia} ${MESES[m - 1]} ${a}`;
};
/* "2026-10-19" → "lunes 19 de octubre de 2026" */
const fechaLarga = (d: string) =>
  new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${d}T12:00:00Z`)).replace(",", "");

function armarCorreo(p: Paquete, remitente: string, hoy: string) {
  const todas = p.secciones.flatMap((s) => s.tareas);
  const n = todas.length;
  const vencidas = todas.filter((x) => (diasVencida(x.fecha_term, hoy) ?? 0) > 0).length;
  const firma = `AUDITORÍA ${p.razon.toUpperCase()}`;
  const empresa = NOMBRE_RAZON[p.razon.toUpperCase()] || `Razón social ${p.razon}`;
  const F = FUENTE;
  const celda = `style="${F};font-size:13px;color:#1F2937;padding:8px;border-bottom:1px solid #F1F5F9;vertical-align:top"`;
  const cab = (alinea = "left") =>
    `bgcolor="#F8FAFC" style="${F};font-size:11px;color:#6B7280;text-transform:uppercase;padding:7px 8px;border-bottom:1px solid #E2E8F0;text-align:${alinea}"`;

  const fila = (x: Tarea) => {
    const dv = diasVencida(x.fecha_term, hoy);
    const titulo = x.nombre && x.nombre !== x.actividad ? x.nombre : x.actividad;
    const estado = dv && dv > 0
      ? `<span style="color:#DC2626;font-weight:bold">Vencida ${dv} día${dv === 1 ? "" : "s"}</span>`
      : `<span style="color:#2563EB;font-weight:bold">En plazo</span>`;
    return `<tr>
      <td ${celda} nowrap><span style="font-family:Consolas,'Courier New',monospace;font-size:12px;color:#475569">${esc(x.tarea_id || "—")}</span></td>
      <td ${celda}>${esc(titulo)}</td>
      <td ${celda}>${esc(x.area_resp || "—")}</td>
      <td ${celda} nowrap>${fechaCorta(x.fecha_term)}</td>
      <td ${celda} align="right" nowrap>${estado}</td>
    </tr>`;
  };

  /* Tarjetas con la cantidad de tareas por tipo */
  const ancho = Math.floor(100 / Math.max(p.secciones.length, 1));
  const tarjetas = p.secciones.map((s) => {
    const c = COLOR[s.clase];
    return `<td width="${ancho}%" style="padding:4px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${c.fondo}" style="border:1px solid ${c.borde};border-radius:10px">
        <tr><td align="center" style="padding:10px;${F}">
          <div style="font-size:24px;font-weight:bold;color:${c.fuerte}">${s.tareas.length}</div>
          <div style="font-size:11px;font-weight:bold;color:${c.oscuro}">${esc(CORTO[s.clase])}</div>
        </td></tr>
      </table></td>`;
  }).join("");

  /* Una sección por tipo: barra de color con el título y la cantidad, y su tabla */
  const secciones = p.secciones.map((s) => {
    const c = COLOR[s.clase];
    return `<tr><td style="padding:16px 26px 0;${F}">
      <div style="border-left:4px solid ${c.fuerte};padding:4px 10px;font-size:15px;font-weight:bold;color:${c.oscuro}">${esc(TITULO[s.clase])} · ${plural(s.tareas.length, "tarea")}</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;border-collapse:collapse">
        <tr>
          <td ${cab()}>ID</td>
          <td ${cab()}>Tarea</td>
          <td ${cab()}>Área</td>
          <td ${cab()}>Fecha límite</td>
          <td ${cab("right")}>Estado</td>
        </tr>
        ${s.tareas.map(fila).join("")}
      </table>
    </td></tr>`;
  }).join("");

  const pendientes = `${plural(n, "tarea")} pendiente${n === 1 ? "" : "s"}`;
  const subject = p.cartera
    ? `${TITULO.cartera} — ${p.tienda}: ${pendientes}`
    : `Tareas pendientes — ${p.tienda}: ${pendientes} (${p.secciones.map((s) => `${s.tareas.length} ${CORTO[s.clase]}`).join(" · ")})`;
  const cabecera = p.cartera
    ? { fondo: "#4C1D95", etiqueta: "#DDD6FE", texto: "AVISO SEMANAL · AUDITORÍA DE CARTERA", sub: "#DDD6FE" }
    : { fondo: "#0D1B3E", etiqueta: "#F0A500", texto: "AVISO SEMANAL · TAREAS PENDIENTES", sub: "#C7D2FE" };
  const intro = p.cartera
    ? "Les informamos que, a la fecha de corte, la tienda cuenta con las siguientes tareas pendientes de la <b>Auditoría de Cartera</b>. Las marcadas en rojo ya pasaron su fecha límite."
    : `Les informamos que, a la fecha de corte, la tienda cuenta con las siguientes tareas pendientes${p.secciones.length > 1 ? ", separadas por tipo de auditoría" : ""}. Las marcadas en rojo ya pasaron su fecha límite.`;

  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"></head>
<body style="margin:0;padding:0;background-color:#EEF1F6">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#EEF1F6"><tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="680" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFFFFF" style="width:680px;max-width:100%;border:1px solid #E2E8F0;border-radius:14px">
    <tr><td bgcolor="${cabecera.fondo}" style="padding:22px 26px;${F};border-radius:14px 14px 0 0">
      <div style="font-size:12px;letter-spacing:2px;color:${cabecera.etiqueta};font-weight:bold">${cabecera.texto}</div>
      <div style="font-size:24px;font-weight:bold;color:#FFFFFF;margin-top:4px">${esc(p.tienda)}</div>
      <div style="font-size:13px;color:${cabecera.sub};margin-top:2px">${esc(empresa)}${p.centro ? ` · Centro ${esc(p.centro)}` : ""} · ${fechaLarga(hoy)}</div>
    </td></tr>
    <tr><td style="padding:20px 26px 6px;${F};color:#1F2937">
      <p style="margin:0 0 8px;font-size:14px;line-height:21px">Buen día, Gerente y equipo de almacén.</p>
      <p style="margin:0 0 14px;font-size:14px;line-height:21px">${intro}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${tarjetas}</tr></table>
      ${vencidas ? `<p style="margin:10px 0 0;font-size:12px;color:#DC2626;font-weight:bold">⚠ ${vencidas} de ${n} tarea${n === 1 ? "" : "s"} ya ${vencidas === 1 ? "está vencida" : "están vencidas"}.</p>` : ""}
    </td></tr>
    ${secciones}
    <tr><td style="padding:22px 26px 24px;${F};font-size:14px;line-height:21px;color:#1F2937">
      <p style="margin:0 0 14px">Favor de atender y realizar las tareas a la brevedad posible.</p>
      <p style="margin:0">Saludos.</p>
      <p style="margin:4px 0 0;font-weight:bold;color:#1F3864">${esc(firma)}</p>
    </td></tr>
    <tr><td bgcolor="#F8FAFC" style="padding:10px 26px;${F};font-size:11px;line-height:16px;color:#6B7280;border-top:1px solid #E2E8F0;border-radius:0 0 14px 14px">
      Mensaje generado automáticamente por el Monitor de Cumplimiento de Grupo Kuroda.
      Para dejar de recibir este aviso, solicite al administrador que lo retire de la tienda en "Correos y tiendas".
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;

  // Versión en texto plano: los correos solo-HTML son más sospechosos para los filtros de spam
  const text = [
    `${firma} · ${p.cartera ? "Aviso semanal · Auditoría de Cartera" : "Aviso semanal · Tareas pendientes"}`,
    `${p.tienda} | ${empresa}${p.centro ? ` | Centro ${p.centro}` : ""} | ${fechaLarga(hoy)}`,
    "",
    "Buen día, Gerente y equipo de almacén.",
    "",
    intro.replace(/<[^>]+>/g, ""),
    p.secciones.map((s) => `${CORTO[s.clase]}: ${s.tareas.length}`).join(" · ") +
      (vencidas ? ` · ${vencidas} de ${n} vencida${vencidas === 1 ? "" : "s"}` : ""),
    ...p.secciones.flatMap((s) => [
      "",
      `${TITULO[s.clase].toUpperCase()} · ${plural(s.tareas.length, "tarea")}`,
      ...s.tareas.map((x) => {
        const dv = diasVencida(x.fecha_term, hoy);
        const titulo = x.nombre && x.nombre !== x.actividad ? x.nombre : x.actividad;
        return `- [ID ${x.tarea_id || "—"}] ${titulo} | Área: ${x.area_resp || "—"} | Fecha límite: ${fechaCorta(x.fecha_term)} | ${dv && dv > 0 ? `Vencida ${dv} día${dv === 1 ? "" : "s"}` : "En plazo"}`;
      }),
    ]),
    "",
    "Favor de atender y realizar las tareas a la brevedad posible.",
    "",
    "Saludos.",
    firma,
  ].join("\n");
  return { subject, html, text };
}

function crearTransporte() {
  const user = Deno.env.get("GMAIL_USER");
  const pass = (Deno.env.get("GMAIL_APP_PASSWORD") || "").replace(/\s+/g, "");
  if (!user || !pass) return null;
  const tr = nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user, pass } });
  return (remitente: string, to: string[], cc: string[], subject: string, html: string, text: string) =>
    tr.sendMail({
      from: `"${remitente.replace(/"/g, "")}" <${user}>`,
      to: to.join(", "),
      cc: cc.length ? cc.join(", ") : undefined,
      subject,
      text,
      html,
    });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const body = await req.json().catch(() => ({}));

  // Autorización: token de pg_cron o credenciales de administrador del panel
  const token = req.headers.get("x-cron-token");
  const { data: ok } = token
    ? await sb.rpc("validar_token_correos", { p_token: token })
    : await sb.rpc("_es_admin_kuroda", { p_user: String(body.admin || ""), p_pass: String(body.pass || "") });
  if (!ok) return json({ error: "No autorizado" }, 401);

  const dry = body.dry === true;
  // Los envíos manuales del panel siempre salen; solo el automático (pg_cron) evita duplicados del día
  const force = body.force === true || !token;
  const soloRazon = typeof body.razon === "string" && body.razon.trim() ? body.razon.trim().toUpperCase() : null;
  const soloTienda = typeof body.tienda_id === "string" && body.tienda_id ? body.tienda_id : null;
  const prueba = (Array.isArray(body.prueba) ? body.prueba : typeof body.prueba === "string" ? body.prueba.split(/[\s,;]+/) : [])
    .map((s: unknown) => String(s).trim().toLowerCase())
    .filter((s: string) => EMAIL_RE.test(s));
  const pruebaManual = prueba.length > 0;
  const esPrueba = pruebaManual || body.prueba_real === true;

  const enviar = crearTransporte();
  if (!dry && !enviar) {
    // Solo nombres (nunca valores) para detectar secretos mal escritos
    const vistos = Object.keys(Deno.env.toObject()).filter((k) => /mail|gmail|smtp/i.test(k));
    return json({ error: "Faltan los secretos GMAIL_USER / GMAIL_APP_PASSWORD", secretos_de_correo_encontrados: vistos }, 500);
  }

  let q = sb.from("correos_razones").select("razon, remitente");
  q = soloRazon ? q.eq("razon", soloRazon) : q.eq("activo", true);
  const { data: rz, error: rzErr } = await q;
  if (rzErr) return json({ error: rzErr.message }, 500);
  const razones: Razon[] = rz?.length ? rz : soloRazon ? [{ razon: soloRazon, remitente: `AUDITORIA ${soloRazon}` }] : [];

  const hoy = hoyLocal();
  const yaEnviadas = new Set<string>();
  if (!force && !esPrueba) {
    const { data: env } = await sb.from("correos_envios").select("tienda_id, tipo_tarea").eq("fecha", hoy).eq("estado", "enviado");
    (env || []).forEach((e) => yaEnviadas.add(`${e.tienda_id}|${e.tipo_tarea}`));
  }

  const res = {
    fecha: hoy, dry, prueba: esPrueba, razones: razones.map((r) => r.razon),
    enviadas: [] as unknown[], omitidas: [] as unknown[], sin_destinatario: [] as string[], errores: [] as unknown[],
  };
  const limitePrueba = pruebaManual && !soloTienda && body.todas !== true ? 1 : Infinity;
  let armados = 0;
  const claves = await clavesDatos(sb);

  for (const r of razones) {
    const { data, error } = await sb.rpc("correos_pendientes_semana", { p_razon: r.razon });
    if (error) { res.errores.push({ razon: r.razon, detalle: error.message }); continue; }

    const grupos = ((data || []) as Grupo[]).filter((g) => !soloTienda || g.tienda_id === soloTienda);
    for (const g of grupos) {
      for (const t of g.tareas || []) {
        for (const c of CIFRADOS) (t as Record<string, unknown>)[c] = await descifrar(claves, t[c] as string | null);
      }
    }

    for (const p of armarPaquetes(grupos)) {
      if (armados >= limitePrueba) break;
      const tipoRegistro = p.cartera ? TIPO_REGISTRO.cartera : TIPO_REGISTRO.combinado;
      const etiqueta = `${r.razon} · ${p.tienda} · ${p.cartera ? "Cartera" : p.secciones.map((s) => CORTO[s.clase]).join(" + ")}`;
      const nTareas = p.secciones.reduce((a, s) => a + s.tareas.length, 0);
      const to = pruebaManual ? prueba : p.destinatarios;
      const cc = pruebaManual ? [] : p.cc;
      if (!to.length) { res.sin_destinatario.push(etiqueta); continue; }
      /* Ya enviado hoy: el correo nuevo o, el día del cambio, cualquiera de los correos por tipo de antes. */
      const enviadoHoy = yaEnviadas.has(`${p.tienda_id}|${tipoRegistro}`) ||
        p.secciones.some((s) => yaEnviadas.has(`${p.tienda_id}|${s.tipo_tarea}`));
      if (enviadoHoy) { res.omitidas.push({ grupo: etiqueta, motivo: "ya enviado hoy" }); continue; }

      const correo = armarCorreo(p, r.remitente, hoy);
      const subject = esPrueba ? `[PRUEBA] ${correo.subject}` : correo.subject;
      armados++;
      if (dry) { res.enviadas.push({ grupo: etiqueta, de: r.remitente, to, cc, subject, tareas: nTareas }); continue; }

      const registro = { fecha: hoy, tienda_id: p.tienda_id, tienda: p.tienda, razon: r.razon, tipo_tarea: tipoRegistro, destinatarios: to, cc, n_tareas: nTareas };
      try {
        const info = await enviar!(r.remitente, to, cc, subject, correo.html, correo.text);
        // Respuesta del SMTP de Gmail: quién aceptó/rechazó el correo
        const smtp = { aceptados: info.accepted, rechazados: info.rejected, respuesta: info.response, id: info.messageId };
        res.enviadas.push({ grupo: etiqueta, to, cc, subject, tareas: nTareas, smtp });
        if (!esPrueba) await sb.from("correos_envios").insert({ ...registro, estado: "enviado" });
      } catch (e) {
        const detalle = e instanceof Error ? e.message : String(e);
        res.errores.push({ grupo: etiqueta, detalle });
        if (!esPrueba) await sb.from("correos_envios").insert({ ...registro, estado: "error", detalle });
      }
      await new Promise((ok) => setTimeout(ok, 500)); // no saturar el SMTP de Gmail
    }
  }

  // Bitácora en los logs de Supabase (sin contraseñas) para diagnosticar envíos
  console.log(JSON.stringify({
    origen: token ? "cron" : `panel:${body.admin}`,
    pedido: { razon: soloRazon, tienda_id: soloTienda, dry, force, prueba_manual: prueba, prueba_real: body.prueba_real === true },
    enviadas: res.enviadas, omitidas: res.omitidas, sin_destinatario: res.sin_destinatario, errores: res.errores,
  }));
  return json(res);
});
