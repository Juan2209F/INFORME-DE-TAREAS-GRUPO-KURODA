package com.grupokuroda.auditoria;

import android.Manifest;
import android.app.Activity;
import android.app.DownloadManager;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.res.ColorStateList;
import android.graphics.Color;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.SystemClock;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.JsPromptResult;
import android.webkit.JsResult;
import android.webkit.MimeTypeMap;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.Toast;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/* App Android de Grupo Kuroda — Monitor de Cumplimiento.
   Abre el sitio (BuildConfig.URL_APP) en un WebView. El diseño para teléfono lo pone el
   propio sitio (css/apk.css + js/app-apk.js) al detectar window.GKAndroid, así los cambios
   de diseño se publican en Vercel sin reinstalar la app.
   La app agrega lo que el navegador del WebView no sabe hacer solo:
   - Guardar en Descargas los archivos que la página genera (assets/puente.js -> GKAndroid).
   - Elegir archivos para subir (Excel, PDF, fotos).
   - Avisos de la página (alert/confirm/prompt) como hoja emergente con el diseño de la app.
   - Revisar y descargar actualizaciones desde Supabase Storage (Actualizador). */
public class MainActivity extends Activity {

    private static final int REQ_ARCHIVO = 10;
    private static final int REQ_PERMISO_ESCRITURA = 11;
    private static final long REVISAR_CADA_MS = 6L * 3600 * 1000;

    private static final String PAGINA_SIN_CONEXION = "<!DOCTYPE html><html lang='es'><head><meta charset='UTF-8'>"
            + "<meta name='viewport' content='width=device-width,initial-scale=1'><style>"
            + "body{margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;"
            + "padding:32px;box-sizing:border-box;background:#0a0e23;color:#e8eaf6;font-family:system-ui,sans-serif;text-align:center}"
            + ".i{width:76px;height:76px;border-radius:50%;background:rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center;font-size:34px}"
            + "h1{font-size:20px;margin:6px 0 0}p{margin:0;font-size:14px;color:#a3aed0;line-height:1.55;max-width:320px}"
            + "a{margin-top:14px;padding:15px 38px;border-radius:16px;color:#fff;font-weight:700;text-decoration:none;"
            + "background:linear-gradient(135deg,#4318ff,#9f7aea);box-shadow:0 8px 24px rgba(67,24,255,.35)}</style></head><body>"
            + "<div class='i'>📡</div><h1>Sin conexión</h1><p>No se pudo abrir el Monitor de Cumplimiento.<br>"
            + "Revisa tu conexión a internet e inténtalo de nuevo.</p><a href='" + BuildConfig.URL_APP + "'>Reintentar</a></body></html>";

    private WebView web;
    private ProgressBar barra;
    private ValueCallback<Uri[]> respuestaArchivo;
    private Actualizador actualizador;
    private String puenteJs = "";
    private String hostApp = "";
    private long ultimaRevision;
    private boolean paginaCargada;
    volatile boolean oscuro = true;   /* theme-init.js del sitio usa oscuro por defecto */

    private final Map<String, Recepcion> enCurso = new HashMap<>();
    private Recepcion pendienteDePermiso;

    /* Archivo que la página está mandando en trozos (base64) para guardarlo. */
    private static final class Recepcion {
        final String nombre, mime;
        final File temporal;
        final OutputStream salida;

        Recepcion(String nombre, String mime, File temporal) throws IOException {
            this.nombre = nombre;
            this.mime = mime;
            this.temporal = temporal;
            this.salida = new FileOutputStream(temporal);
        }
    }

    @Override
    protected void onCreate(Bundle guardado) {
        super.onCreate(guardado);
        /* Solo el APK de prueba (debug) permite inspeccionar el WebView; el publicado no. */
        if (BuildConfig.DEBUG) WebView.setWebContentsDebuggingEnabled(true);
        hostApp = Uri.parse(BuildConfig.URL_APP).getHost();
        aplicarBarras();
        limpiarArchivosViejos();

        FrameLayout raiz = new FrameLayout(this);
        raiz.setBackgroundColor(Color.parseColor("#0A0E23"));
        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#0A0E23"));
        raiz.addView(web, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        barra = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        barra.setMax(100);
        barra.setProgressTintList(ColorStateList.valueOf(Color.parseColor("#825EE4")));
        barra.setProgressBackgroundTintList(ColorStateList.valueOf(Color.TRANSPARENT));
        raiz.addView(barra, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(3)));
        setContentView(raiz);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setTextZoom(100);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setSupportMultipleWindows(false);
        s.setJavaScriptCanOpenWindowsAutomatically(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        /* El sitio reconoce la app por esta marca (además de window.GKAndroid). */
        s.setUserAgentString(s.getUserAgentString() + " GKApp/" + BuildConfig.VERSION_NAME);

        CookieManager cm = CookieManager.getInstance();
        cm.setAcceptCookie(true);
        cm.setAcceptThirdPartyCookies(web, true);

        puenteJs = leerAsset("puente.js");
        web.addJavascriptInterface(new Puente(), "GKAndroid");
        web.setWebViewClient(new Cliente());
        web.setWebChromeClient(new ClienteChrome());
        web.setDownloadListener(this::descargarPorUrl);

        actualizador = new Actualizador(this);
        if (guardado == null || web.restoreState(guardado) == null) web.loadUrl(BuildConfig.URL_APP);
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (web != null) web.onResume();
        if (actualizador != null) {
            actualizador.alVolver();
            /* App que se queda abierta en segundo plano: vuelve a revisar cada 6 horas. */
            if (paginaCargada && SystemClock.elapsedRealtime() - ultimaRevision > REVISAR_CADA_MS) revisarActualizacion(false);
        }
    }

    @Override
    protected void onPause() {
        if (web != null) web.onPause();
        CookieManager.getInstance().flush();
        super.onPause();
    }

    @Override
    protected void onSaveInstanceState(Bundle b) {
        super.onSaveInstanceState(b);
        if (web != null) web.saveState(b);
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            web.stopLoading();
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }

    /* Atrás: primero cierra la ventana emergente o la sección abierta en la página
       (GKApk.atras en js/app-apk.js); si no hay nada que cerrar, manda la app al fondo. */
    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (web == null) { super.onBackPressed(); return; }
        web.evaluateJavascript("(function(){try{return !!(window.GKApk&&GKApk.atras())}catch(e){return false}})()", v -> {
            if ("true".equals(v)) return;
            if (web != null && web.canGoBack()) web.goBack();
            else moveTaskToBack(true);
        });
    }

    /* ---------- Utilidades compartidas ---------- */

    Hoja hoja() { return new Hoja(this, oscuro); }

    void aviso(String texto) { runOnUiThread(() -> Toast.makeText(this, texto, Toast.LENGTH_LONG).show()); }

    void revisarActualizacion(boolean manual) {
        ultimaRevision = SystemClock.elapsedRealtime();
        actualizador.revisar(manual);
    }

    /* Barra de estado y de navegación del color de la barra superior / menú de la página. */
    @SuppressWarnings("deprecation")
    private void aplicarBarras() {
        Window w = getWindow();
        w.setStatusBarColor(oscuro ? Color.parseColor("#0F1430") : Color.WHITE);
        w.setNavigationBarColor(oscuro ? Color.parseColor("#0F1430") : Color.WHITE);
        View d = w.getDecorView();
        int f = d.getSystemUiVisibility();
        int claros = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        d.setSystemUiVisibility(oscuro ? (f & ~claros) : (f | claros));
    }

    private boolean esDeLaApp(Uri u) {
        return u != null && ("https".equals(u.getScheme()) || "http".equals(u.getScheme())) && hostApp.equalsIgnoreCase(u.getHost());
    }

    private void inyectar() {
        if (web != null && !puenteJs.isEmpty()) web.evaluateJavascript(puenteJs, null);
    }

    private String leerAsset(String nombre) {
        try (InputStream in = getAssets().open(nombre)) {
            ByteArrayOutputStream b = new ByteArrayOutputStream();
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) != -1) b.write(buf, 0, n);
            return new String(b.toByteArray(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            return "";
        }
    }

    private void abrirFuera(Uri u) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, u).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
        } catch (ActivityNotFoundException e) {
            aviso("No hay una app para abrir este enlace");
        }
    }

    private int dp(float v) { return Math.round(v * getResources().getDisplayMetrics().density); }

    /* ---------- Navegación ---------- */

    private final class Cliente extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
            Uri u = req.getUrl();
            String esquema = u.getScheme() == null ? "" : u.getScheme();
            if (!req.isForMainFrame()) return false;
            if (esquema.equals("blob") || esquema.equals("data") || esquema.equals("about") || esquema.equals("javascript")) return false;
            if (esDeLaApp(u)) return false;
            /* Enlaces externos (archivos de Supabase, correos, WhatsApp, mapas…): fuera de la app. */
            abrirFuera(u);
            return true;
        }

        @Override
        public void onPageStarted(WebView v, String url, android.graphics.Bitmap icono) {
            barra.setVisibility(View.VISIBLE);
            inyectar();
        }

        @Override
        public void onPageCommitVisible(WebView v, String url) { inyectar(); }

        @Override
        public void onPageFinished(WebView v, String url) {
            barra.setVisibility(View.GONE);
            inyectar();
            if (url != null && esDeLaApp(Uri.parse(url))) {
                /* Al abrir la app: revisar si hay una versión nueva en Supabase. */
                if (!paginaCargada) revisarActualizacion(false);
                paginaCargada = true;
            }
        }

        @Override
        public void onReceivedError(WebView v, WebResourceRequest req, WebResourceError err) {
            if (req.isForMainFrame()) v.loadDataWithBaseURL(null, PAGINA_SIN_CONEXION, "text/html", "UTF-8", null);
        }
    }

    private final class ClienteChrome extends WebChromeClient {
        @Override
        public void onProgressChanged(WebView v, int avance) {
            barra.setProgress(avance);
            barra.setVisibility(avance >= 100 ? View.GONE : View.VISIBLE);
        }

        @Override
        public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
            if (respuestaArchivo != null) respuestaArchivo.onReceiveValue(null);
            respuestaArchivo = cb;
            Intent i = new Intent(Intent.ACTION_GET_CONTENT);
            i.addCategory(Intent.CATEGORY_OPENABLE);
            i.setType("*/*");
            String[] tipos = tiposMime(p.getAcceptTypes());
            if (tipos.length > 0) i.putExtra(Intent.EXTRA_MIME_TYPES, tipos);
            if (p.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE) i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
            try {
                startActivityForResult(Intent.createChooser(i, "Seleccionar archivo"), REQ_ARCHIVO);
                return true;
            } catch (ActivityNotFoundException e) {
                respuestaArchivo = null;
                aviso("No hay una app para elegir archivos");
                return false;
            }
        }

        @Override
        public boolean onJsAlert(WebView v, String url, String msg, JsResult r) { return dialogoJs("alert", msg, null, r); }

        @Override
        public boolean onJsConfirm(WebView v, String url, String msg, JsResult r) { return dialogoJs("confirm", msg, null, r); }

        @Override
        public boolean onJsPrompt(WebView v, String url, String msg, String valor, JsPromptResult r) { return dialogoJs("prompt", msg, valor, r); }
    }

    /* accept="..xlsx,.xls,image/*" -> tipos MIME para el selector de Android. */
    private static String[] tiposMime(String[] acepta) {
        List<String> out = new ArrayList<>();
        if (acepta != null) for (String grupo : acepta) {
            if (grupo == null) continue;
            for (String t : grupo.split(",")) {
                t = t.trim().toLowerCase(Locale.ROOT);
                if (t.isEmpty()) continue;
                if (t.equals("*/*")) return new String[0];
                String m = t.startsWith(".") ? MimeTypeMap.getSingleton().getMimeTypeFromExtension(t.substring(1)) : t;
                if (t.equals(".csv")) { agregar(out, "text/csv"); agregar(out, "text/comma-separated-values"); }
                if (t.equals(".xls") || t.equals(".xlsx")) agregar(out, "application/octet-stream");
                if (m != null) agregar(out, m);
            }
        }
        return out.toArray(new String[0]);
    }

    private static void agregar(List<String> l, String s) { if (!l.contains(s)) l.add(s); }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        if (req != REQ_ARCHIVO) { super.onActivityResult(req, res, data); return; }
        if (respuestaArchivo == null) return;
        Uri[] r = null;
        if (res == RESULT_OK && data != null) {
            ClipData cd = data.getClipData();
            if (cd != null && cd.getItemCount() > 0) {
                r = new Uri[cd.getItemCount()];
                for (int i = 0; i < r.length; i++) r[i] = cd.getItemAt(i).getUri();
            } else if (data.getData() != null) {
                r = new Uri[]{data.getData()};
            }
        }
        respuestaArchivo.onReceiveValue(r);
        respuestaArchivo = null;
    }

    /* ---------- Avisos de la página (alert / confirm / prompt) ----------
       Mientras están abiertos la página queda en pausa, por eso se dibujan aquí (nativos)
       y no dentro de la página. */
    private boolean dialogoJs(String tipo, String msg, String valor, JsResult r) {
        if (isFinishing() || isDestroyed()) { r.cancel(); return true; }
        String m = msg == null ? "" : msg.trim();
        int salto = m.indexOf('\n');
        String primera = salto > 0 ? m.substring(0, salto).trim() : m;
        String titulo, cuerpo;
        if (primera.length() <= 90) {
            titulo = primera;
            cuerpo = salto > 0 ? m.substring(salto).trim() : "";
        } else {
            titulo = tipo.equals("alert") ? "Aviso" : tipo.equals("confirm") ? "Confirma la acción" : "Escribe la información";
            cuerpo = m;
        }
        String bajo = m.toLowerCase(Locale.ROOT);
        boolean peligro = tipo.equals("confirm") && (bajo.contains("eliminar") || bajo.contains("borrar")
                || bajo.contains("no se puede deshacer") || bajo.contains("sobrescribir"));
        final boolean[] respondido = {false};
        final Hoja h = hoja();
        h.etiqueta(tipo.equals("alert") ? "Aviso" : peligro ? "Atención" : "Monitor de Cumplimiento").titulo(titulo).mensaje(cuerpo);
        if (tipo.equals("alert")) {
            h.primario("Entendido", () -> { respondido[0] = true; r.confirm(); }, true);
            h.cancelable(true, () -> { if (!respondido[0]) { respondido[0] = true; r.confirm(); } });
        } else {
            if (tipo.equals("prompt")) h.campo(valor, bajo.contains("contraseña") || bajo.contains("password"));
            h.secundario("Cancelar", () -> { if (!respondido[0]) { respondido[0] = true; r.cancel(); } });
            h.primario(peligro ? "Sí, continuar" : "Aceptar", () -> {
                if (respondido[0]) return;
                respondido[0] = true;
                if (r instanceof JsPromptResult) ((JsPromptResult) r).confirm(h.textoCampo());
                else r.confirm();
            }, true, peligro);
            h.cancelable(true, () -> { if (!respondido[0]) { respondido[0] = true; r.cancel(); } });
        }
        h.mostrar();
        return true;
    }

    /* ---------- Descargas ---------- */

    /* Enlaces http(s) que el WebView manda descargar (p. ej. archivos firmados de Supabase). */
    private void descargarPorUrl(String url, String agente, String disposicion, String mime, long largo) {
        if (url == null || url.startsWith("blob:") || url.startsWith("data:")) return; /* los maneja puente.js */
        if (Build.VERSION.SDK_INT < 29 && !tienePermisoEscritura()) {
            pedirPermisoEscritura();
            aviso("Permite guardar archivos y vuelve a descargar");
            return;
        }
        String nombre = nombreSeguro(URLUtil.guessFileName(url, disposicion, mime));
        try {
            DownloadManager.Request r = new DownloadManager.Request(Uri.parse(url));
            if (mime != null) r.setMimeType(mime);
            String galleta = CookieManager.getInstance().getCookie(url);
            if (galleta != null) r.addRequestHeader("Cookie", galleta);
            r.addRequestHeader("User-Agent", agente);
            r.setTitle(nombre);
            r.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            r.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, nombre);
            ((DownloadManager) getSystemService(DOWNLOAD_SERVICE)).enqueue(r);
            aviso("Descargando " + nombre);
        } catch (Exception e) {
            aviso("No se pudo descargar el archivo");
        }
    }

    private boolean tienePermisoEscritura() {
        return Build.VERSION.SDK_INT >= 29 || checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED;
    }

    private void pedirPermisoEscritura() {
        requestPermissions(new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, REQ_PERMISO_ESCRITURA);
    }

    @Override
    public void onRequestPermissionsResult(int req, String[] permisos, int[] resultados) {
        super.onRequestPermissionsResult(req, permisos, resultados);
        if (req != REQ_PERMISO_ESCRITURA) return;
        boolean ok = resultados.length > 0 && resultados[0] == PackageManager.PERMISSION_GRANTED;
        final Recepcion r = pendienteDePermiso;
        pendienteDePermiso = null;
        if (r == null) return;
        if (ok) new Thread(() -> terminar(r), "gk-guardar").start();
        else { r.temporal.delete(); aviso("Sin permiso no se puede guardar en Descargas"); }
    }

    private static String nombreSeguro(String n) {
        String s = n == null ? "" : n.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "_").trim();
        return s.isEmpty() ? "descarga" : s;
    }

    private static String mimeDe(String nombre, String mime) {
        if (mime != null && !mime.isEmpty() && !mime.equals("application/octet-stream")) return mime;
        return ArchivoProvider.mime(nombre);
    }

    /* Copia el archivo recibido a Descargas y ofrece abrirlo o compartirlo. */
    private void terminar(Recepcion r) {
        String nombre = nombreSeguro(r.nombre);
        String mime = mimeDe(nombre, r.mime);
        File copia = new File(ArchivoProvider.carpeta(this, ArchivoProvider.ARCHIVOS), nombre);
        try {
            if (copia.exists()) copia.delete();
            if (!r.temporal.renameTo(copia)) throw new IOException("renombrar");
            if (Build.VERSION.SDK_INT >= 29) {
                ContentResolver cr = getContentResolver();
                ContentValues v = new ContentValues();
                v.put(MediaStore.MediaColumns.DISPLAY_NAME, nombre);
                v.put(MediaStore.MediaColumns.MIME_TYPE, mime);
                v.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                v.put(MediaStore.MediaColumns.IS_PENDING, 1);
                Uri u = cr.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
                if (u == null) throw new IOException("MediaStore");
                try (OutputStream o = cr.openOutputStream(u)) { copiar(copia, o); }
                v.clear();
                v.put(MediaStore.MediaColumns.IS_PENDING, 0);
                cr.update(u, v, null, null);
            } else {
                File dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                if (!dir.exists()) dir.mkdirs();
                File f = new File(dir, nombre);
                int i = 1;
                int punto = nombre.lastIndexOf('.');
                while (f.exists()) {
                    String base = punto > 0 ? nombre.substring(0, punto) : nombre;
                    String ext = punto > 0 ? nombre.substring(punto) : "";
                    f = new File(dir, base + " (" + (i++) + ")" + ext);
                }
                try (OutputStream o = new FileOutputStream(f)) { copiar(copia, o); }
                MediaScannerConnection.scanFile(this, new String[]{f.getAbsolutePath()}, new String[]{mime}, null);
            }
            runOnUiThread(() -> archivoGuardado(nombre, mime, copia));
        } catch (Exception e) {
            r.temporal.delete();
            aviso("No se pudo guardar el archivo");
        }
    }

    private static void copiar(File f, OutputStream o) throws IOException {
        if (o == null) throw new IOException("salida");
        try (InputStream in = new FileInputStream(f)) {
            byte[] buf = new byte[64 * 1024];
            int n;
            while ((n = in.read(buf)) != -1) o.write(buf, 0, n);
        }
    }

    private void archivoGuardado(String nombre, String mime, File copia) {
        hoja().etiqueta("Descarga").titulo("Archivo guardado")
                .mensaje(nombre + "\n\nSe guardó en la carpeta Descargas del teléfono.")
                .secundario("Compartir", () -> compartir(copia, mime))
                .primario("Abrir", () -> abrir(copia, mime), true)
                .cancelable(true, null)
                .mostrar();
    }

    private void abrir(File f, String mime) {
        Intent i = new Intent(Intent.ACTION_VIEW);
        i.setDataAndType(ArchivoProvider.uri(ArchivoProvider.ARCHIVOS, f), mime);
        i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        try { startActivity(i); } catch (ActivityNotFoundException e) { aviso("No hay una app para abrir este archivo"); }
    }

    private void compartir(File f, String mime) {
        Uri u = ArchivoProvider.uri(ArchivoProvider.ARCHIVOS, f);
        Intent i = new Intent(Intent.ACTION_SEND);
        i.setType(mime);
        i.putExtra(Intent.EXTRA_STREAM, u);
        i.setClipData(ClipData.newRawUri(f.getName(), u));
        i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        try {
            startActivity(Intent.createChooser(i, "Compartir archivo").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION));
        } catch (ActivityNotFoundException e) {
            aviso("No hay una app para compartir este archivo");
        }
    }

    /* Copias para Abrir/Compartir: se borran al día siguiente. */
    private void limpiarArchivosViejos() {
        File[] fs = ArchivoProvider.carpeta(this, ArchivoProvider.ARCHIVOS).listFiles();
        if (fs == null) return;
        long limite = System.currentTimeMillis() - 24L * 3600 * 1000;
        for (File f : fs) if (f.lastModified() < limite) f.delete();
    }

    /* ---------- Puente con la página: window.GKAndroid ---------- */
    private final class Puente {

        /* Descargas generadas en la página (assets/puente.js). */
        @JavascriptInterface
        public void inicio(String id, String nombre, String mime) {
            try {
                File t = File.createTempFile("rec", ".tmp", getCacheDir());
                synchronized (enCurso) { enCurso.put(id, new Recepcion(nombre, mime, t)); }
            } catch (IOException e) {
                aviso("No se pudo generar el archivo");
            }
        }

        @JavascriptInterface
        public void trozo(String id, String base64) {
            Recepcion r;
            synchronized (enCurso) { r = enCurso.get(id); }
            if (r == null) return;
            try {
                r.salida.write(Base64.decode(base64, Base64.DEFAULT));
            } catch (Exception e) {
                quitar(id);
                aviso("No se pudo generar el archivo");
            }
        }

        @JavascriptInterface
        public void fin(String id) {
            Recepcion r = quitar(id);
            if (r == null) return;
            if (Build.VERSION.SDK_INT < 29 && !tienePermisoEscritura()) {
                pendienteDePermiso = r;
                runOnUiThread(MainActivity.this::pedirPermisoEscritura);
                return;
            }
            terminar(r);
        }

        @JavascriptInterface
        public void error(String id) {
            Recepcion r = quitar(id);
            if (r != null) r.temporal.delete();
            aviso("No se pudo descargar el archivo");
        }

        private Recepcion quitar(String id) {
            Recepcion r;
            synchronized (enCurso) { r = enCurso.remove(id); }
            if (r != null) try { r.salida.close(); } catch (IOException ignorado) { }
            return r;
        }

        /* Información de la app para js/app-apk.js. */
        @JavascriptInterface
        public String version() { return BuildConfig.VERSION_NAME; }

        @JavascriptInterface
        public int versionCode() { return BuildConfig.VERSION_CODE; }

        /* La página avisa su tema (claro/oscuro) para pintar las barras y las ventanas igual. */
        @JavascriptInterface
        public void tema(boolean esOscuro) {
            if (oscuro == esOscuro) return;
            oscuro = esOscuro;
            runOnUiThread(MainActivity.this::aplicarBarras);
        }

        /* Botón "Buscar actualizaciones" del menú Más. */
        @JavascriptInterface
        public void buscarActualizacion() { runOnUiThread(() -> revisarActualizacion(true)); }
    }
}
