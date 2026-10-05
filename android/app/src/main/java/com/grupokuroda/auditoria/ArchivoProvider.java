package com.grupokuroda.auditoria;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;
import android.webkit.MimeTypeMap;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.IOException;

/* Comparte con otras apps (instalador de Android, visor de PDF/Excel, WhatsApp…) solo los
   archivos de dos carpetas del caché de la app:
     content://com.grupokuroda.auditoria.archivos/act/<apk>   -> cache/actualizacion
     content://com.grupokuroda.auditoria.archivos/arc/<nombre> -> cache/archivos
   Es de solo lectura y no se exporta: cada app recibe permiso solo para el archivo que se le pasa. */
public class ArchivoProvider extends ContentProvider {

    static final String AUTORIDAD = "com.grupokuroda.auditoria.archivos";
    static final String ACTUALIZACION = "act";
    static final String ARCHIVOS = "arc";

    static File carpeta(Context c, String tipo) {
        File d = new File(c.getCacheDir(), ACTUALIZACION.equals(tipo) ? "actualizacion" : "archivos");
        if (!d.exists()) d.mkdirs();
        return d;
    }

    static Uri uri(String tipo, File f) {
        return new Uri.Builder().scheme("content").authority(AUTORIDAD).appendPath(tipo).appendPath(f.getName()).build();
    }

    static String mime(String nombre) {
        String n = nombre.toLowerCase();
        if (n.endsWith(".apk")) return "application/vnd.android.package-archive";
        int p = n.lastIndexOf('.');
        String m = p >= 0 ? MimeTypeMap.getSingleton().getMimeTypeFromExtension(n.substring(p + 1)) : null;
        return m != null ? m : "application/octet-stream";
    }

    private File archivo(Uri u) throws FileNotFoundException {
        if (getContext() == null || u.getPathSegments().size() != 2) throw new FileNotFoundException();
        String tipo = u.getPathSegments().get(0);
        if (!ACTUALIZACION.equals(tipo) && !ARCHIVOS.equals(tipo)) throw new FileNotFoundException();
        File base = carpeta(getContext(), tipo);
        File f = new File(base, u.getPathSegments().get(1));
        try {
            /* Evita salir de la carpeta con "../". */
            if (!f.getCanonicalFile().getParentFile().equals(base.getCanonicalFile())) throw new FileNotFoundException();
        } catch (IOException e) {
            throw new FileNotFoundException();
        }
        if (!f.isFile()) throw new FileNotFoundException();
        return f;
    }

    @Override public boolean onCreate() { return true; }

    @Override public String getType(Uri u) { return mime(u.getLastPathSegment() == null ? "" : u.getLastPathSegment()); }

    @Override
    public ParcelFileDescriptor openFile(Uri u, String modo) throws FileNotFoundException {
        if (modo != null && modo.contains("w")) throw new FileNotFoundException("Solo lectura");
        return ParcelFileDescriptor.open(archivo(u), ParcelFileDescriptor.MODE_READ_ONLY);
    }

    @Override
    public Cursor query(Uri u, String[] columnas, String sel, String[] args, String orden) {
        File f;
        try { f = archivo(u); } catch (FileNotFoundException e) { return null; }
        String[] cols = columnas != null ? columnas : new String[]{OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE};
        MatrixCursor c = new MatrixCursor(cols, 1);
        Object[] fila = new Object[cols.length];
        for (int i = 0; i < cols.length; i++) {
            if (OpenableColumns.DISPLAY_NAME.equals(cols[i])) fila[i] = f.getName();
            else if (OpenableColumns.SIZE.equals(cols[i])) fila[i] = f.length();
        }
        c.addRow(fila);
        return c;
    }

    @Override public Uri insert(Uri u, ContentValues v) { throw new UnsupportedOperationException(); }

    @Override public int delete(Uri u, String s, String[] a) { throw new UnsupportedOperationException(); }

    @Override public int update(Uri u, ContentValues v, String s, String[] a) { throw new UnsupportedOperationException(); }
}
