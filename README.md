Misma funcionalidad y UX que la versión anterior de un solo archivo — reorganizado en carpetas para que sea más fácil ubicar y modificar cada parte.

Estructura
monitor-cumplimiento-v2/
├── index.html                 → shell principal: head, estructura de vistas, modales
├── config/
│   └── supabase-config.js     → SB_URL / SB_KEY (llave pública anon) / SB_SESSION_KEY
├── css/
│   └── main.css               → todos los estilos (antes <style> embebido)
├── js/
│   ├── theme-init.js          → modo claro/oscuro + defaults de Chart.js (se carga primero)
│   ├── app-core.js            → lógica principal: Auditorías, Tareas, Ajustes, Mermas,
│   │                              Actividades, Finalizadas, Desempeño, Evaluación KPIs
│   └── app-usuarios.js        → Supabase/login/sesión, Gestión de Usuarios, permisos por
│                                  razón social, wiring de los iframes Generador/Documentos
└── assets/
    ├── generador.html         → módulo "Generador de Dashboard Ejecutivo" (antes base64)
    └── documentos.html        → módulo "Generador de Documentos" (antes base64)
Qué cambió (solo estructura, cero funcionalidad nueva ni removida)
El <style> de ~500 líneas ahora es css/main.css.
Los dos <script> gigantes del archivo original ahora son js/app-core.js y js/app-usuarios.js — se separaron en el mismo punto donde el archivo original ya los separaba (dos bloques <script> distintos), así que el orden de carga y el scope global quedan exactamente iguales.
SB_URL/SB_KEY (antes enterrados en medio de app-usuarios.js) ahora viven solos en config/supabase-config.js, para poder rotarlos sin tocar lógica. La "publishable key" de Supabase está diseñada para exponerse en el cliente (la protege RLS en la base de datos) — no es un secreto que haya que ocultar.
Los dos módulos que antes viajaban como texto base64 gigante embebido dentro del script (GENERADOR_HTML_B64, DOCUMENTOS_HTML_B64, ~200 KB de texto cada uno) ahora son archivos .html reales y editables en assets/. El dashboard los carga con iframe.src="assets/generador.html" en vez de iframe.srcdoc=atob(...). Esto es seguro porque ambos módulos ya esperan a un mensaje postMessage de "listo" del iframe antes de configurarlo — no dependían de que el contenido apareciera de forma síncrona.
El único bloque que se dejó inline dentro de index.html a propósito es el JSON de datos semilla (<script id="seed-data" type="application/json">): convertirlo a un archivo cargado con fetch() cambiaría de síncrono a asíncrono, y no hay forma de probar en vivo aquí que ningún código dependa de tenerlo disponible de inmediato. Si quieres que también se separe, lo hacemos en un paso aparte que puedas probar tú.
Nada de la lógica de negocio (cálculos, permisos, razón social, Supabase) se tocó — es exactamente el mismo código, solo reubicado.
Cómo publicarlo en GitHub Pages
En GitHub, crea un repositorio nuevo. Los nombres de repo no llevan espacios ni acentos; usa por ejemplo monitor-cumplimiento-v2.
Sube el contenido de esta carpeta (todo lo que está junto a este README) a la raíz del repo — no la carpeta contenedora, su contenido.
Settings → Pages → Source: main branch, carpeta /root.
Tu URL quedará como https://TU-USUARIO.github.io/monitor-cumplimiento-v2/.
Correos automáticos de tareas pendientes
Cada lunes a las 8:00 am hora del Pacífico se envía un correo por tienda y por tipo de tarea (el tipo va en el asunto, p. ej. TAREAS ORDEN Y LIMPIEZA — KN TECATE: 14 tareas pendientes) con sus tareas pendientes (Abierta, Abierta atrasada y No resuelta, sin fecha de cumplimiento).

Todo se administra en Gestión de Usuarios → Correos y tiendas:

Correos por tienda: varios correos por tienda (se pueden pegar separados por coma).
Tiendas / Usuarios: usuarios asignados a cada tienda (también reciben el aviso).
Envío por razón: qué razones sociales envían y con qué remitente. Cada razón solo envía sus propias tareas. Hoy solo KNO está activa, con remitente AUDITORIA KNO.
Migraciones: 20260925_correos_tareas_pendientes.sql y 20260926_correos_razon_tipo_tienda.sql.

supabase/migrations/20260925_correos_tareas_pendientes.sql → pg_cron + pg_net, bitácora correos_envios, función correos_pendientes_semana() y los dos jobs (15:00 y 16:00 UTC; solo dispara el que cae a las 8:00 en America/Tijuana, así funciona con y sin horario de verano).
supabase/functions/enviar-tareas-pendientes/index.ts → arma y envía los correos por Gmail (SMTP smtp.gmail.com:465). No reenvía a una tienda que ya recibió correo ese día.
Secretos de la Edge Function (Supabase → Edge Functions → Secrets): GMAIL_USER (la cuenta que envía) y GMAIL_APP_PASSWORD (contraseña de aplicación de 16 letras: myaccount.google.com/apppasswords, requiere verificación en 2 pasos). El nombre del remitente se configura por razón social en la pestaña "Envío por razón".

## Nota de seguridad

Este proyecto no contiene tokens ni contraseñas — solo la llave pública de Supabase,
que es segura de exponer. Si en algún momento pegas un token personal (de GitHub o de
cualquier otro servicio) en un chat, revócalo de inmediato: un token en texto plano en
una conversación no es un canal seguro para credenciales.
