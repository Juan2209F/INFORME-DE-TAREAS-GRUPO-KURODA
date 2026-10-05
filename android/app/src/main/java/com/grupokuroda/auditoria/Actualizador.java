package com.grupokuroda.auditoria;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.SystemClock;
import android.provider.Settings;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InterruptedIOException;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Locale;

/* Actualizaciones desde Supabase Storage.
   El workflow .github/workflows/android-apk.yml sube cada versión al bucket público
   "app-releases" junto con latest.json:
     { "versionCode": 10100, "versionName": "1.1.0", "url": ".../AuditoriaKuroda-v1.1.0.apk",
       "sha256": "…", "tamano": 123456, "notas": ["…"], "obligatoria": false, "versionMinima": 0 }
   Al abrir la app se lee latest.json; si trae un versionCode mayor que el instalado se ofrece
   la actualización, se descarga aquí mismo (con avance), se verifica su SHA-256 y se abre el
   instalador de Android. "obligatoria" (o versionMinima mayor a la instalada) no deja posponerla. */
final class Actualizador {

    private final MainActivity act;
    private JSONObject info;
    private Hoja hoja;
    private File apk;
    private boolean revisando, descargando, esperandoPermiso;
    private volatile boolean cancelado;

    Actualizador(MainActivity a) {
        act = a;
        limpiar();
    }

    /* manual = el usuario tocó "Buscar actualizaciones": se le avisa también si ya está al día. */
    void revisar(final boolean manual) {
        if (revisando || descargando || (hoja != null && hoja.visible())) return;
        revisando = true;
        final Hoja espera = manual ? act.hoja().logo().etiqueta("Actualizaciones").titulo("Buscando versión nueva…") : null;
        if (espera != null) { espera.progreso(-1, null); espera.mostrar(); }
        new Thread(() -> {
            JSONObject j = null;
            try { j = leerInfo(); } catch (Exception ignorado) { }
            final JSONObject datos = j;
            act.runOnUiThread(() -> {
                revisando = false;
                if (espera != null) espera.cerrar();
                if (datos != null && datos.optInt("versionCode", 0) > BuildConfig.VERSION_CODE && !datos.optString("url").isEmpty()) {
                    info = datos;
                    ofrecer();
                } else if (manual) {
                    Hoja h = act.hoja().logo().etiqueta("Actualizaciones");
                    if (datos != null) h.titulo("Ya tienes la versión más reciente").mensaje("Versión instalada: " + BuildConfig.VERSION_NAME);
                    else h.titulo("No se pudo revisar").mensaje("Revisa tu conexión a internet e inténtalo de nuevo.");
                    h.primario("Listo", null, true).cancelable(true, null).mostrar();
                }
            });
        }, "gk-revisar").start();
    }

    private static JSONObject leerInfo() throws IOException, org.json.JSONException {
        HttpURLConnection c = (HttpURLConnection) new URL(BuildConfig.URL_ACTUALIZACION + "?t=" + System.currentTimeMillis()).openConnection();
        c.setConnectTimeout(10000);
        c.setReadTimeout(15000);
        c.setUseCaches(false);
        c.setRequestProperty("Cache-Control", "no-cache");
        try {
            if (c.getResponseCode() != 200) throw new IOException("HTTP " + c.getResponseCode());
            try (InputStream in = c.getInputStream()) {
                ByteArrayOutputStream b = new ByteArrayOutputStream();
                byte[] buf = new byte[8192];
                int n;
                while ((n = in.read(buf)) != -1) b.write(buf, 0, n);
                return new JSONObject(new String(b.toByteArray(), StandardCharsets.UTF_8));
            }
        } finally {
            c.disconnect();
        }
    }

    private boolean obligatoria() {
        return info != null && (info.optBoolean("obligatoria", false) || BuildConfig.VERSION_CODE < info.optInt("versionMinima", 0));
    }

    private String version() { return info.optString("versionName", "nueva"); }

    private String notas() {
        StringBuilder s = new StringBuilder("Tienes la versión ").append(BuildConfig.VERSION_NAME).append('.');
        Object n = info.opt("notas");
        StringBuilder lista = new StringBuilder();
        if (n instanceof JSONArray) {
            JSONArray a = (JSONArray) n;
            for (int i = 0; i < a.length(); i++) {
                String t = a.optString(i).trim();
                if (!t.isEmpty()) lista.append("\n•  ").append(t);
            }
        } else if (n instanceof String && !((String) n).trim().isEmpty()) {
            lista.append("\n").append(((String) n).trim());
        }
        if (lista.length() > 0) s.append("\n\nNovedades:").append(lista);
        long t = info.optLong("tamano", 0);
        if (t > 0) s.append("\n\nTamaño de la descarga: ").append(mb(t));
        if (obligatoria()) s.append("\n\nEsta actualización es necesaria para seguir usando la app.");
        return s.toString();
    }

    private void ofrecer() {
        boolean ob = obligatoria();
        hoja = act.hoja().logo()
                .etiqueta(ob ? "Actualización obligatoria" : "Actualización disponible")
                .titulo("Versión " + version() + " lista")
                .mensaje(notas())
                .primario("Actualizar ahora", this::descargar, false)
                .cancelable(!ob, null);
        if (!ob) hoja.secundario("Más tarde", null);
        hoja.mostrar();
    }

    /* ---------- Descarga ---------- */

    private void descargar() {
        if (descargando || info == null) return;
        descargando = true;
        cancelado = false;
        hoja.titulo("Descargando versión " + version())
                .mensaje("Puedes seguir viendo esta pantalla; no cierres la app hasta que termine.")
                .sinPrimario()
                .cancelable(false, null);
        hoja.secundario(obligatoria() ? null : "Cancelar", () -> cancelado = true);
        hoja.progreso(0, "Conectando…");
        if (!hoja.visible()) hoja.mostrar();
        new Thread(this::bajar, "gk-descarga").start();
    }

    private void bajar() {
        File dir = ArchivoProvider.carpeta(act, ArchivoProvider.ACTUALIZACION);
        File destino = new File(dir, "AuditoriaKuroda-v" + version().replaceAll("[^0-9A-Za-z._-]", "") + ".apk");
        File parcial = new File(dir, destino.getName() + ".part");
        String sha = info.optString("sha256", "").trim().toLowerCase(Locale.ROOT);
        String error = null;
        HttpURLConnection c = null;
        try {
            /* Ya descargada antes (p. ej. se pospuso la instalación): no se vuelve a bajar. */
            if (destino.isFile() && !sha.isEmpty() && sha.equals(sha256(destino))) {
                listo(destino);
                return;
            }
            c = (HttpURLConnection) new URL(info.getString("url")).openConnection();
            c.setInstanceFollowRedirects(true);
            c.setConnectTimeout(15000);
            c.setReadTimeout(30000);
            c.setUseCaches(false);
            if (c.getResponseCode() != 200) throw new Falla("El servidor de actualizaciones respondió con el código " + c.getResponseCode() + ". Inténtalo más tarde.");
            long total = c.getContentLengthLong();
            if (total <= 0) total = info.optLong("tamano", -1);
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            try (InputStream in = c.getInputStream(); OutputStream out = new FileOutputStream(parcial)) {
                byte[] buf = new byte[64 * 1024];
                long leido = 0, ultimoT = 0;
                int n, ultimo = -2;
                while ((n = in.read(buf)) != -1) {
                    if (cancelado) throw new InterruptedIOException("cancelado");
                    out.write(buf, 0, n);
                    md.update(buf, 0, n);
                    leido += n;
                    final int pct = total > 0 ? (int) Math.min(100, leido * 100 / total) : -1;
                    long ahora = SystemClock.uptimeMillis();
                    if (pct != ultimo && ahora - ultimoT > 150) {
                        ultimo = pct;
                        ultimoT = ahora;
                        final String txt = total > 0 ? pct + "%  ·  " + mb(leido) + " de " + mb(total) : mb(leido);
                        act.runOnUiThread(() -> hoja.progreso(pct, txt));
                    }
                }
            }
            if (!sha.isEmpty() && !sha.equals(hex(md.digest())))
                throw new Falla("El archivo descargado llegó incompleto o dañado. Inténtalo de nuevo.");
            if (destino.exists()) destino.delete();
            if (!parcial.renameTo(destino)) throw new Falla("No se pudo guardar la actualización. Revisa que haya espacio libre en el teléfono.");
            listo(destino);
            return;
        } catch (Exception e) {
            if (!cancelado) error = e instanceof Falla ? e.getMessage() : "Revisa tu conexión a internet e inténtalo de nuevo.";
        } finally {
            if (c != null) c.disconnect();
        }
        parcial.delete();
        final String err = error;
        act.runOnUiThread(() -> {
            descargando = false;
            if (err != null) fallo(err);
        });
    }

    private void listo(File f) {
        act.runOnUiThread(() -> {
            descargando = false;
            apk = f;
            instalar();
        });
    }

    private void fallo(String msg) {
        boolean ob = obligatoria();
        hoja.etiqueta("Actualización").titulo("No se pudo descargar").mensaje(msg).cancelable(!ob, null);
        hoja.sinProgreso();
        hoja.primario("Reintentar", this::descargar, false);
        hoja.secundario(ob ? null : "Cerrar", null);
        if (!hoja.visible()) hoja.mostrar();
    }

    /* ---------- Instalación ---------- */

    private void instalar() {
        if (apk == null || !apk.isFile() || hoja == null) return;
        boolean ob = obligatoria();
        hoja.sinProgreso();
        hoja.cancelable(!ob, null);
        hoja.secundario(ob ? null : "Más tarde", null);
        if (!act.getPackageManager().canRequestPackageInstalls()) {
            /* Android 8+: la primera vez hay que autorizar a la app a instalar su actualización. */
            esperandoPermiso = true;
            hoja.etiqueta("Un paso más").titulo("Permite instalar la actualización")
                    .mensaje("Android pide autorizar a Auditoría Kuroda para instalar su propia actualización.\n\n"
                            + "Toca «Abrir ajustes», activa «Permitir de esta fuente» y regresa con la flecha de atrás.");
            hoja.primario("Abrir ajustes", () -> {
                try {
                    act.startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + act.getPackageName())));
                } catch (ActivityNotFoundException e) {
                    act.aviso("Abre Ajustes › Apps › Auditoría Kuroda › Instalar apps desconocidas");
                }
            }, false);
            if (!hoja.visible()) hoja.mostrar();
            return;
        }
        esperandoPermiso = false;
        hoja.etiqueta("Descarga completa").titulo("Instala la versión " + version())
                .mensaje("Confirma en la ventana de Android. Al terminar, la app se abrirá con la versión nueva.\n\n"
                        + "Si cerraste esa ventana, toca «Instalar».");
        hoja.primario("Instalar", this::instalar, false);
        if (!hoja.visible()) hoja.mostrar();
        Intent i = new Intent(Intent.ACTION_VIEW);
        i.setDataAndType(ArchivoProvider.uri(ArchivoProvider.ACTUALIZACION, apk), "application/vnd.android.package-archive");
        i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            act.startActivity(i);
        } catch (ActivityNotFoundException e) {
            fallo("No se encontró el instalador de Android.");
        }
    }

    /* Al regresar de Ajustes con el permiso ya concedido, se instala sin pedir nada más. */
    void alVolver() {
        if (esperandoPermiso && act.getPackageManager().canRequestPackageInstalls()) instalar();
    }

    /* ---------- Auxiliares ---------- */

    /* Error con mensaje propio para el usuario (los de red se muestran con un texto genérico). */
    private static final class Falla extends IOException {
        Falla(String m) { super(m); }
    }

    /* Borra descargas a medias y APKs de más de 7 días. */
    private void limpiar() {
        File[] fs = ArchivoProvider.carpeta(act, ArchivoProvider.ACTUALIZACION).listFiles();
        if (fs == null) return;
        long limite = System.currentTimeMillis() - 7L * 24 * 3600 * 1000;
        for (File f : fs) if (f.getName().endsWith(".part") || f.lastModified() < limite) f.delete();
    }

    private static String sha256(File f) {
        try (InputStream in = new FileInputStream(f)) {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] buf = new byte[64 * 1024];
            int n;
            while ((n = in.read(buf)) != -1) md.update(buf, 0, n);
            return hex(md.digest());
        } catch (Exception e) {
            return "";
        }
    }

    private static String hex(byte[] b) {
        StringBuilder s = new StringBuilder(b.length * 2);
        for (byte x : b) s.append(String.format(Locale.ROOT, "%02x", x));
        return s.toString();
    }

    private static String mb(long bytes) {
        return String.format(Locale.US, "%.1f MB", bytes / 1048576.0);
    }
}
