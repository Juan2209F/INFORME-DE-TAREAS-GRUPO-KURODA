package com.grupokuroda.auditoria;

import android.app.Activity;
import android.app.Dialog;
import android.content.res.ColorStateList;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.ColorDrawable;
import android.graphics.drawable.GradientDrawable;
import android.text.InputType;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.TextView;

/* Ventana emergente de la app: hoja que sube desde abajo, con los colores del Monitor
   (claro / oscuro). La usan las actualizaciones, los archivos guardados y los avisos de la
   página (alert / confirm / prompt), para que todo se vea igual que el resto de la app. */
final class Hoja {

    interface AlCerrar { void listo(); }

    private final Activity act;
    private final Dialog dialogo;
    private final boolean oscuro;
    private final LinearLayout caja, encabezado, botones;
    private final TextView tEtiqueta, tTitulo, tMensaje, tProgreso;
    private final ScrollView desplazar;
    private final ProgressBar barra;
    private EditText campo;
    private Button bPrimario, bSecundario;
    private AlCerrar alCancelar;

    /* Paleta: la misma de css/main.css. */
    private final int cFondo, cTexto, cTenue, cSuave, cBorde, cAzul1, cAzul2;
    static final int ROJO = Color.parseColor("#F5365C");

    Hoja(Activity a, boolean oscuro) {
        this.act = a;
        this.oscuro = oscuro;
        cFondo = Color.parseColor(oscuro ? "#161B38" : "#FFFFFF");
        cTexto = Color.parseColor(oscuro ? "#F1F2F8" : "#344767");
        cTenue = Color.parseColor(oscuro ? "#BCC4D6" : "#8392AB");
        cSuave = Color.parseColor(oscuro ? "#232948" : "#F4F6FB");
        cBorde = Color.parseColor(oscuro ? "#2E3557" : "#E4E8F2");
        cAzul1 = Color.parseColor(oscuro ? "#4318FF" : "#5E72E4");
        cAzul2 = Color.parseColor(oscuro ? "#9F7AEA" : "#825EE4");

        dialogo = new Dialog(a);
        dialogo.requestWindowFeature(Window.FEATURE_NO_TITLE);

        caja = new LinearLayout(a);
        caja.setOrientation(LinearLayout.VERTICAL);
        caja.setPadding(dp(22), dp(10), dp(22), dp(20));
        GradientDrawable fondo = new GradientDrawable();
        fondo.setColor(cFondo);
        float r = dp(26);
        fondo.setCornerRadii(new float[]{r, r, r, r, 0, 0, 0, 0});
        caja.setBackground(fondo);

        /* Asa */
        View asa = new View(a);
        GradientDrawable fAsa = new GradientDrawable();
        fAsa.setColor(cBorde);
        fAsa.setCornerRadius(dp(4));
        asa.setBackground(fAsa);
        LinearLayout.LayoutParams pAsa = new LinearLayout.LayoutParams(dp(40), dp(4));
        pAsa.gravity = Gravity.CENTER_HORIZONTAL;
        pAsa.bottomMargin = dp(18);
        caja.addView(asa, pAsa);

        /* Encabezado: logo + etiqueta + título */
        encabezado = new LinearLayout(a);
        encabezado.setOrientation(LinearLayout.HORIZONTAL);
        encabezado.setGravity(Gravity.CENTER_VERTICAL);
        LinearLayout textos = new LinearLayout(a);
        textos.setOrientation(LinearLayout.VERTICAL);
        tEtiqueta = texto(11, cAzul1, true);
        tEtiqueta.setAllCaps(true);
        tEtiqueta.setLetterSpacing(0.08f);
        tEtiqueta.setVisibility(View.GONE);
        tTitulo = texto(19, cTexto, true);
        tTitulo.setVisibility(View.GONE);
        textos.addView(tEtiqueta);
        textos.addView(tTitulo);
        encabezado.addView(textos, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
        caja.addView(encabezado);

        /* Mensaje (con desplazamiento si es largo) */
        tMensaje = texto(14.5f, cTenue, false);
        tMensaje.setLineSpacing(0, 1.25f);
        tMensaje.setVisibility(View.GONE);
        tMensaje.setTextIsSelectable(true);
        desplazar = new ScrollView(a);
        desplazar.addView(tMensaje);
        LinearLayout.LayoutParams pDesp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        pDesp.topMargin = dp(10);
        caja.addView(desplazar, pDesp);

        /* Progreso de descarga */
        barra = new ProgressBar(a, null, android.R.attr.progressBarStyleHorizontal);
        barra.setMax(100);
        barra.setProgressTintList(ColorStateList.valueOf(cAzul1));
        barra.setProgressBackgroundTintList(ColorStateList.valueOf(cBorde));
        barra.setVisibility(View.GONE);
        LinearLayout.LayoutParams pBarra = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(8));
        pBarra.topMargin = dp(18);
        caja.addView(barra, pBarra);
        tProgreso = texto(12.5f, cTenue, true);
        tProgreso.setVisibility(View.GONE);
        LinearLayout.LayoutParams pProg = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        pProg.topMargin = dp(8);
        caja.addView(tProgreso, pProg);

        /* Botones */
        botones = new LinearLayout(a);
        botones.setOrientation(LinearLayout.HORIZONTAL);
        LinearLayout.LayoutParams pBot = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        pBot.topMargin = dp(22);
        caja.addView(botones, pBot);

        dialogo.setContentView(caja);
        dialogo.setOnCancelListener(d -> { if (alCancelar != null) alCancelar.listo(); });
        Window w = dialogo.getWindow();
        if (w != null) {
            w.setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
            w.setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            w.setGravity(Gravity.BOTTOM);
            /* Animación de entrada/salida desde abajo (la del teclado). */
            w.setWindowAnimations(android.R.style.Animation_InputMethod);
            w.addFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND);
            w.setDimAmount(0.55f);
            w.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
            w.setNavigationBarColor(cFondo);
        }
    }

    /* ---------- Contenido ---------- */

    Hoja logo() {
        ImageView img = new ImageView(act);
        img.setImageResource(R.drawable.logo_kuroda);
        GradientDrawable f = new GradientDrawable();
        f.setShape(GradientDrawable.OVAL);
        f.setColor(Color.WHITE);
        img.setBackground(f);
        img.setPadding(dp(7), dp(7), dp(7), dp(7));
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(dp(50), dp(50));
        p.rightMargin = dp(14);
        encabezado.addView(img, 0, p);
        return this;
    }

    Hoja etiqueta(String s) { tEtiqueta.setText(s); tEtiqueta.setVisibility(vacio(s) ? View.GONE : View.VISIBLE); return this; }

    Hoja titulo(String s) { tTitulo.setText(s); tTitulo.setVisibility(vacio(s) ? View.GONE : View.VISIBLE); return this; }

    Hoja mensaje(CharSequence s) {
        tMensaje.setText(s);
        tMensaje.setVisibility(s == null || s.length() == 0 ? View.GONE : View.VISIBLE);
        /* Mensajes largos: alto máximo de 45% de la pantalla y se desplazan. */
        int alto = act.getResources().getDisplayMetrics().heightPixels;
        ViewGroup.LayoutParams p = desplazar.getLayoutParams();
        p.height = (s != null && s.length() > 380) ? (int) (alto * 0.45f) : ViewGroup.LayoutParams.WRAP_CONTENT;
        desplazar.setLayoutParams(p);
        return this;
    }

    Hoja campo(String valor, boolean clave) {
        campo = new EditText(act);
        campo.setSingleLine(true);
        campo.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
        campo.setTextColor(cTexto);
        campo.setHintTextColor(cTenue);
        campo.setPadding(dp(16), dp(14), dp(16), dp(14));
        campo.setInputType(clave ? InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD : InputType.TYPE_CLASS_TEXT);
        if (valor != null) campo.setText(valor);
        GradientDrawable f = new GradientDrawable();
        f.setColor(cSuave);
        f.setCornerRadius(dp(14));
        f.setStroke(dp(1), cBorde);
        campo.setBackground(f);
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        p.topMargin = dp(16);
        caja.addView(campo, caja.indexOfChild(botones), p);
        Window w = dialogo.getWindow();
        if (w != null) w.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE | WindowManager.LayoutParams.SOFT_INPUT_STATE_VISIBLE);
        campo.requestFocus();
        return this;
    }

    String textoCampo() { return campo == null ? "" : campo.getText().toString(); }

    /* Botón principal. cierra = false lo deja abierto (p. ej. al empezar una descarga). */
    Hoja primario(String texto, Runnable accion, boolean cierra) { return primario(texto, accion, cierra, false); }

    Hoja primario(String texto, Runnable accion, boolean cierra, boolean peligro) {
        if (bPrimario == null) {
            bPrimario = boton(true);
            botones.addView(bPrimario);
            acomodarBotones();
        }
        GradientDrawable f = peligro
                ? new GradientDrawable(GradientDrawable.Orientation.TL_BR, new int[]{ROJO, Color.parseColor("#F56036")})
                : new GradientDrawable(GradientDrawable.Orientation.TL_BR, new int[]{cAzul1, cAzul2});
        f.setCornerRadius(dp(16));
        bPrimario.setBackground(f);
        bPrimario.setText(texto);
        bPrimario.setOnClickListener(v -> { if (cierra) cerrar(); if (accion != null) accion.run(); });
        bPrimario.setVisibility(View.VISIBLE);
        return this;
    }

    Hoja secundario(String texto, Runnable accion) {
        if (texto == null) {
            if (bSecundario != null) bSecundario.setVisibility(View.GONE);
            acomodarBotones();
            return this;
        }
        if (bSecundario == null) {
            bSecundario = boton(false);
            botones.addView(bSecundario, 0);
        }
        bSecundario.setText(texto);
        bSecundario.setVisibility(View.VISIBLE);
        bSecundario.setOnClickListener(v -> { cerrar(); if (accion != null) accion.run(); });
        acomodarBotones();
        return this;
    }

    Hoja sinPrimario() { if (bPrimario != null) bPrimario.setVisibility(View.GONE); acomodarBotones(); return this; }

    /* Tocar fuera o el botón Atrás: se cierra y llama alCancelar (null = no se puede cerrar). */
    Hoja cancelable(boolean si, AlCerrar alCancelar) {
        this.alCancelar = alCancelar;
        dialogo.setCancelable(si);
        dialogo.setCanceledOnTouchOutside(si);
        return this;
    }

    /* Barra de progreso (pct < 0 = indeterminado). */
    void progreso(int pct, String texto) {
        barra.setVisibility(View.VISIBLE);
        barra.setIndeterminate(pct < 0);
        if (pct >= 0) barra.setProgress(pct);
        tProgreso.setVisibility(vacio(texto) ? View.GONE : View.VISIBLE);
        tProgreso.setText(texto);
    }

    void sinProgreso() { barra.setVisibility(View.GONE); tProgreso.setVisibility(View.GONE); }

    void mostrar() {
        if (act.isFinishing() || act.isDestroyed()) return;
        try { dialogo.show(); } catch (RuntimeException ignorado) { }
    }

    void cerrar() { try { if (dialogo.isShowing()) dialogo.dismiss(); } catch (RuntimeException ignorado) { } }

    boolean visible() { return dialogo.isShowing(); }

    /* ---------- Auxiliares ---------- */

    private void acomodarBotones() {
        int n = 0;
        for (int i = 0; i < botones.getChildCount(); i++) if (botones.getChildAt(i).getVisibility() == View.VISIBLE) n++;
        boolean primero = true;
        for (int i = 0; i < botones.getChildCount(); i++) {
            View b = botones.getChildAt(i);
            LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(0, dp(52), 1);
            if (!primero && b.getVisibility() == View.VISIBLE) p.leftMargin = dp(10);
            if (b.getVisibility() == View.VISIBLE) primero = false;
            b.setLayoutParams(p);
        }
        botones.setVisibility(n == 0 ? View.GONE : View.VISIBLE);
    }

    private Button boton(boolean principal) {
        Button b = new Button(act);
        b.setAllCaps(false);
        b.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
        b.setTypeface(Typeface.DEFAULT_BOLD);
        b.setStateListAnimator(null);
        b.setElevation(0);
        b.setTextColor(principal ? Color.WHITE : cTexto);
        if (!principal) {
            GradientDrawable f = new GradientDrawable();
            f.setColor(cSuave);
            f.setCornerRadius(dp(16));
            f.setStroke(dp(1), cBorde);
            b.setBackground(f);
        }
        return b;
    }

    private TextView texto(float sp, int color, boolean negrita) {
        TextView t = new TextView(act);
        t.setTextSize(TypedValue.COMPLEX_UNIT_SP, sp);
        t.setTextColor(color);
        if (negrita) t.setTypeface(Typeface.DEFAULT_BOLD);
        return t;
    }

    private int dp(float v) { return Math.round(v * act.getResources().getDisplayMetrics().density); }

    private static boolean vacio(String s) { return s == null || s.trim().isEmpty(); }

    boolean esOscuro() { return oscuro; }
}
