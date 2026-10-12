# App para iPhone / iPad (PWA) — Grupo Kuroda

La app de iPhone es el mismo Monitor publicado en Vercel, instalado desde Safari como app
(PWA). No pasa por la App Store ni necesita compilarse: **cada publicación en Vercel actualiza
la app de todos**.

## Qué hay en el repositorio

| Ruta | Qué es |
|---|---|
| `manifest.webmanifest` | Nombre, colores e íconos de la app instalada. |
| `icons/` | Íconos (pantalla de inicio de iOS y manifiesto). |
| `sw.js` | Service worker: siempre pide la versión más reciente a Vercel; la copia guardada solo se usa sin conexión. |
| `js/app-ios.js` | Detecta iPhone/iPad, el aviso para instalar, guardar archivos con la hoja Compartir, gesto atrás y actualizaciones. |
| `css/ios.css` | Áreas seguras del iPhone (isla/muesca, barra de inicio) y la hoja "Archivo listo". |
| `js/app-apk.js`, `css/apk.css` | Diseño de app (el mismo de Android). `app-apk.js` ahora también se activa cuando existe `window.GKIos`. |
| `index.html` | Etiquetas de iOS (`apple-touch-icon`, `apple-mobile-web-app-*`), manifiesto y carga de `css/ios.css` y `js/app-ios.js`. |
| `descargar/index.html` | En iPhone muestra los pasos para instalar desde Safari. |

## Cómo se instala

1. Abrir el Monitor **en Safari** (en iPhone también sirve la página `/descargar`).
2. Tocar **Compartir** (cuadro con flecha hacia arriba).
3. **Agregar a inicio** › **Agregar**.
4. Abrir la app desde el ícono **Monitor**.

En Safari, sin instalar, aparece un aviso con estos pasos (se puede cerrar y vuelve a salir a los 14 días).

## Qué hace igual que la app Android

- Mismo diseño: barra superior fija con el nombre de la sección, menú lateral ☰ con todas las
  secciones permitidas, ventanas que suben desde abajo, tablas en tarjetas, modo claro/oscuro.
- Deslizar hacia abajo para recargar los datos sin salir de la sección.
- Copia local de datos (solo baja lo nuevo) y descifrado por lotes.
- Gesto atrás (deslizar desde el borde izquierdo): cierra la ventana abierta o regresa a Inicio.
- **Buscar actualizaciones** en el menú; además revisa sola al volver a la app.
- Archivos que genera la app (Excel, PDF, PPTX, Word, imágenes): se abren en la hoja
  **Compartir** de iOS para **Guardar en Archivos** o enviarlos. Si el archivo tardó en generarse
  aparece la hoja "Archivo listo" con el botón **Guardar o compartir**.

## Qué es distinto en iPhone

- **Entrar con huella / Face ID:** no hay botón propio. Se usa el llavero de iOS: al iniciar
  sesión, acepta **Guardar contraseña**; después Safari la rellena con Face ID o Touch ID.
- **Notificaciones push:** no están activadas en iPhone. La app Android usa Firebase; iOS
  requiere Web Push (llaves VAPID y cambios en la función `notificar-push` de Supabase).
- **Sesión:** la app instalada guarda su sesión aparte de Safari; hay que iniciar sesión en la app.

## Probar el diseño en computadora

Abrir `index.html?ios=1`: activa el diseño de la app de iPhone en esa pestaña (usar la vista de
teléfono del navegador). `index.html?ios=0` lo quita.

## Publicar cambios

Igual que siempre: commit y push a `main`; Vercel publica y la app se actualiza. Los iPhone
con la app abierta reciben el aviso "Nueva versión de la app" al volver a ella.
