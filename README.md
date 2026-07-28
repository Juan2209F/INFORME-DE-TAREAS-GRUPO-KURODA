# Monitor de Cumplimiento — Grupo Kuroda (V2)

Misma funcionalidad y UX que la versión anterior de un solo archivo — reorganizado en
carpetas para que sea más fácil ubicar y modificar cada parte.

## Estructura

```
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
```

## Qué cambió (solo estructura, cero funcionalidad nueva ni removida)

- El `<style>` de ~500 líneas ahora es `css/main.css`.
- Los dos `<script>` gigantes del archivo original ahora son `js/app-core.js` y
  `js/app-usuarios.js` — se separaron **en el mismo punto donde el archivo original
  ya los separaba** (dos bloques `<script>` distintos), así que el orden de carga y
  el scope global quedan exactamente iguales.
- `SB_URL`/`SB_KEY` (antes enterrados en medio de `app-usuarios.js`) ahora viven solos
  en `config/supabase-config.js`, para poder rotarlos sin tocar lógica. La "publishable
  key" de Supabase está diseñada para exponerse en el cliente (la protege RLS en la
  base de datos) — no es un secreto que haya que ocultar.
- Los dos módulos que antes viajaban como texto base64 gigante embebido dentro del
  script (`GENERADOR_HTML_B64`, `DOCUMENTOS_HTML_B64`, ~200 KB de texto cada uno) ahora
  son archivos `.html` reales y editables en `assets/`. El dashboard los carga con
  `iframe.src="assets/generador.html"` en vez de `iframe.srcdoc=atob(...)`. Esto es
  seguro porque ambos módulos ya esperan a un mensaje `postMessage` de "listo" del
  iframe antes de configurarlo — no dependían de que el contenido apareciera de forma
  síncrona.
- El único bloque que se dejó **inline dentro de `index.html`** a propósito es el JSON
  de datos semilla (`<script id="seed-data" type="application/json">`): convertirlo a
  un archivo cargado con `fetch()` cambiaría de síncrono a asíncrono, y no hay forma de
  probar en vivo aquí que ningún código dependa de tenerlo disponible de inmediato. Si
  quieres que también se separe, lo hacemos en un paso aparte que puedas probar tú.
- Nada de la lógica de negocio (cálculos, permisos, razón social, Supabase) se tocó —
  es exactamente el mismo código, solo reubicado.

## Cómo publicarlo en GitHub Pages

1. En GitHub, crea un repositorio nuevo. Los nombres de repo no llevan espacios ni
   acentos; usa por ejemplo `monitor-cumplimiento-v2`.
2. Sube el contenido de esta carpeta (todo lo que está junto a este README) a la raíz
   del repo — no la carpeta contenedora, su contenido.
3. Settings → Pages → Source: `main` branch, carpeta `/root`.
4. Tu URL quedará como `https://TU-USUARIO.github.io/monitor-cumplimiento-v2/`.

## Nota de seguridad

Este proyecto no contiene tokens ni contraseñas — solo la llave pública de Supabase,
que es segura de exponer. Si en algún momento pegas un token personal (de GitHub o de
cualquier otro servicio) en un chat, revócalo de inmediato: un token en texto plano en
una conversación no es un canal seguro para credenciales.
