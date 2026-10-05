package com.grupokuroda.auditoria;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Build;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

/* Notificaciones de cambios en el Monitor (Firebase Cloud Messaging).
   La Edge Function de Supabase "notificar-push" manda mensajes de datos {titulo, texto, seccion}
   cuando se agregan o cambian tareas, auditorías, actividades, ajustes, mermas o activos.
   Llegan aunque la app esté cerrada; al tocarla se abre la app en esa sección. */
public class Avisos extends FirebaseMessagingService {

    static final String CANAL = "cambios";
    static final String PREFS = "gk";
    static final String TOKEN = "tokenPush";

    static void crearCanal(Context c) {
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm == null || nm.getNotificationChannel(CANAL) != null) return;
        NotificationChannel ch = new NotificationChannel(CANAL, "Cambios en el Monitor", NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription("Avisos cuando se agregan o cambian tareas, auditorías, actividades, ajustes, mermas o activos");
        ch.enableLights(true);
        ch.setLightColor(Color.parseColor("#5E72E4"));
        nm.createNotificationChannel(ch);
    }

    static void mostrar(Context c, String titulo, String texto, String seccion) {
        if (Build.VERSION.SDK_INT >= 33
                && c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return;
        crearCanal(c);
        Intent abrir = new Intent(c, MainActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        if (seccion != null) abrir.putExtra("seccion", seccion);
        PendingIntent pi = PendingIntent.getActivity(c, (int) (System.currentTimeMillis() & 0xfffffff), abrir,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        String cuerpo = texto == null ? "" : texto;
        Notification n = new Notification.Builder(c, CANAL)
                .setSmallIcon(R.drawable.ic_notificacion)
                .setColor(Color.parseColor("#5E72E4"))
                .setContentTitle(titulo)
                .setContentText(cuerpo)
                .setStyle(new Notification.BigTextStyle().bigText(cuerpo))
                .setAutoCancel(true)
                .setContentIntent(pi)
                .build();
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        /* Un aviso por sección: el nuevo reemplaza al anterior de la misma sección. */
        if (nm != null) nm.notify(seccion != null ? seccion.hashCode() : titulo.hashCode(), n);
    }

    @Override
    public void onMessageReceived(RemoteMessage m) {
        Map<String, String> d = m.getData();
        String titulo = d.get("titulo"), texto = d.get("texto");
        if (titulo == null && m.getNotification() != null) {
            titulo = m.getNotification().getTitle();
            texto = m.getNotification().getBody();
        }
        if (titulo != null) mostrar(this, titulo, texto, d.get("seccion"));
    }

    @Override
    public void onNewToken(String token) {
        getSharedPreferences(PREFS, MODE_PRIVATE).edit().putString(TOKEN, token).apply();
    }
}
