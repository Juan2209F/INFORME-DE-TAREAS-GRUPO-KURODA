# App Android (APK) — Grupo Kuroda

## Qué hay en el repositorio

| Ruta | Qué es |
|---|---|
| `css/apk.css`, `js/app-apk.js`, `css/apk-frame.css` | Diseño exclusivo de la app. Solo se activa dentro del APK (clase `gk-apk`); en el navegador nada cambia. Se publica con Vercel, **sin reinstalar la app**. |
| `js/app-movil.js` | Ajustado: dentro del APK siempre usa la vista de teléfono. |
| `index.html` | Carga `css/apk.css` y `js/app-apk.js`. |
| `android/` | Código de la app (WebView + descargas + actualizador). |
| `.github/workflows/android-apk.yml` | Compila, firma y publica cada versión en Supabase Storage. |
| `.github/workflows/android-llave.yml` | Crea la llave de firma (solo una vez, si no tienes la de la v1.0). |

## Cómo funcionan las actualizaciones

1. Corres el workflow **APK Android — publicar versión** con la versión (ej. `1.2.0`) y las novedades.
2. El workflow sube `AuditoriaKuroda-v1.2.0.apk` y `latest.json` al bucket público **`app-releases`** de Supabase (lo crea la primera vez).
3. Cada vez que alguien abre la app (y cada 6 h si queda abierta), se lee `latest.json`. Si hay una versión mayor, aparece la hoja **"Versión 1.2.0 lista"**, con las novedades y el botón **Actualizar ahora**.
4. La app descarga el APK mostrando el avance, comprueba su huella SHA-256 y abre el instalador de Android. La primera vez, Android pide activar **"Permitir de esta fuente"**: la app lleva al usuario a ese ajuste y, al regresar, continúa sola.
5. Si marcas **obligatoria**, la ventana no se puede cerrar hasta actualizar.
6. También se puede buscar a mano: **perfil (arriba a la derecha) › Buscar actualizaciones**.

La app **v1.0** no traía actualizador. Al iniciar sesión, la página le muestra un aviso para descargar la versión nueva una sola vez; desde esa versión ya se actualiza sola.

## Configuración (una sola vez)

En GitHub: **Settings › Secrets and variables › Actions › New repository secret**

| Secreto | Valor |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase › Project Settings › API Keys › `service_role` (o una *secret key* `sb_secret_…`). **Nunca** la pongas en el código. |
| `ANDROID_KEYSTORE_PASSWORD` | Contraseña de la llave de firma. |
| `ANDROID_KEY_ALIAS` | Alias de la llave (ej. `kuroda`). |
| `ANDROID_KEYSTORE_BASE64` | La llave `.jks` en base64 (ver abajo). |
| `ANDROID_KEY_PASSWORD` | Opcional; solo si la clave del alias es distinta. |

### La llave de firma

Android solo instala una actualización si está firmada con **la misma llave** que la versión instalada.

- **Si tienes la llave con la que se firmó la v1.0** (certificado "Grupo Kuroda" del 5 oct 2026), conviértela a base64 en PowerShell y pégala en `ANDROID_KEYSTORE_BASE64`:
  ```powershell
  [Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\ruta\kuroda.jks")) | Set-Clipboard
  ```
- **Si no la tienes**, crea los secretos `ANDROID_KEYSTORE_PASSWORD` y `ANDROID_KEY_ALIAS`. Luego corre el workflow **APK Android — crear llave de firma**, con el repositorio en privado y escribiendo `CREAR`. Descarga el artefacto `llave-firma-kuroda` (dura 1 día): pega el contenido de `kuroda.jks.base64.txt` en `ANDROID_KEYSTORE_BASE64` y guarda `kuroda.jks` en un lugar seguro.
  En ese caso, quien tenga la v1.0 debe **desinstalarla una vez** e instalar la nueva. Después todo se actualiza desde la app.

## Publicar una versión

GitHub › **Actions › APK Android — publicar versión › Run workflow**

- **Versión:** siempre mayor que la anterior: `1.1.0`, `1.1.1`, `1.2.0`…
- **Novedades:** separadas con `|`, por ejemplo `Nuevo diseño|Actualizaciones automáticas`.
- **Obligatoria:** márcala solo si la versión anterior ya no debe usarse.

Al terminar, el resumen del workflow muestra el enlace del APK. El APK también queda como artefacto por 30 días. El primer APK (v1.1.0) se comparte con ese enlace.

## Notas

- Los cambios de diseño (`css/apk.css`, `js/app-apk.js`) llegan a todos al publicar el sitio en Vercel. Solo hay que generar APK nuevo al cambiar `android/`.
- Los avisos `alert`/`confirm`/`prompt` de la página se muestran como hojas nativas con el diseño de la app (claro/oscuro). Las que dicen "eliminar" se pintan en rojo.
- El botón **Atrás** de Android cierra primero la ventana abierta, luego regresa a Inicio y, por último, manda la app al fondo.
