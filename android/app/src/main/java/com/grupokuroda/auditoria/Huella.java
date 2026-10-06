package com.grupokuroda.auditoria;

import android.annotation.TargetApi;
import android.content.Context;
import android.content.SharedPreferences;
import android.hardware.biometrics.BiometricManager;
import android.hardware.biometrics.BiometricPrompt;
import android.hardware.fingerprint.FingerprintManager;
import android.os.Build;
import android.os.CancellationSignal;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyPermanentlyInvalidatedException;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import java.nio.charset.StandardCharsets;
import java.security.KeyStore;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/* Inicio de sesión con huella (Android 9 o más).
   La contraseña se guarda cifrada con una llave del almacén seguro de Android (AndroidKeyStore)
   que solo se puede usar después de poner la huella: sin huella no hay forma de leerla, ni
   siquiera para la propia app. Si en el teléfono se agrega o quita una huella, Android anula la
   llave y hay que volver a entrar con la contraseña. */
final class Huella {

    interface Resultado {
        void ok(String usuario, String clave);
        void error(String mensaje, boolean borrada);
    }

    private interface Paso { void con(Cipher c) throws Exception; }

    private static final String ALIAS = "gk-huella";
    private static final String PREFS = "gk-huella", USUARIO = "usuario", DATOS = "datos", IV = "iv";

    private final MainActivity act;

    Huella(MainActivity act) { this.act = act; }

    @SuppressWarnings("deprecation")
    boolean disponible() {
        if (Build.VERSION.SDK_INT < 28) return false;
        try {
            if (Build.VERSION.SDK_INT >= 30) {
                BiometricManager bm = act.getSystemService(BiometricManager.class);
                return bm != null && bm.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG) == BiometricManager.BIOMETRIC_SUCCESS;
            }
            if (Build.VERSION.SDK_INT == 29) {
                BiometricManager bm = act.getSystemService(BiometricManager.class);
                return bm != null && bm.canAuthenticate() == BiometricManager.BIOMETRIC_SUCCESS;
            }
            FingerprintManager fm = act.getSystemService(FingerprintManager.class);
            return fm != null && fm.isHardwareDetected() && fm.hasEnrolledFingerprints();
        } catch (Exception e) {
            return false;
        }
    }

    /* Cuenta con huella activada en este teléfono ("" si no hay). */
    String usuario() { return prefs().getString(DATOS, null) == null ? "" : prefs().getString(USUARIO, ""); }

    void quitar() {
        prefs().edit().clear().apply();
        try {
            KeyStore ks = KeyStore.getInstance("AndroidKeyStore");
            ks.load(null);
            ks.deleteEntry(ALIAS);
        } catch (Exception ignorado) { }
    }

    /* Guarda la cuenta: pide la huella y cifra la contraseña. */
    @TargetApi(28)
    void activar(String usuario, String clave, Resultado r) {
        if (!disponible()) { r.error("Este teléfono no tiene huella configurada", false); return; }
        final Cipher c;
        try {
            c = Cipher.getInstance("AES/GCM/NoPadding");
            c.init(Cipher.ENCRYPT_MODE, llave(true));
        } catch (Exception e) {
            r.error("No se pudo activar la huella", false);
            return;
        }
        pedir(c, "Activar inicio con huella", "Pon tu dedo para guardar tu acceso en este teléfono", cifrado -> {
            byte[] ct = cifrado.doFinal(clave.getBytes(StandardCharsets.UTF_8));
            prefs().edit()
                    .putString(USUARIO, usuario)
                    .putString(DATOS, Base64.encodeToString(ct, Base64.NO_WRAP))
                    .putString(IV, Base64.encodeToString(cifrado.getIV(), Base64.NO_WRAP))
                    .apply();
            r.ok(usuario, "");
        }, r);
    }

    /* Pide la huella y devuelve la cuenta guardada. */
    @TargetApi(28)
    void entrar(Resultado r) {
        SharedPreferences p = prefs();
        String datos = p.getString(DATOS, null), iv = p.getString(IV, null), u = p.getString(USUARIO, "");
        if (datos == null || iv == null || !disponible()) { r.error("", true); return; }
        final Cipher c;
        try {
            c = Cipher.getInstance("AES/GCM/NoPadding");
            c.init(Cipher.DECRYPT_MODE, llave(false), new GCMParameterSpec(128, Base64.decode(iv, Base64.NO_WRAP)));
        } catch (KeyPermanentlyInvalidatedException e) {
            quitar();
            r.error("Cambiaron las huellas del teléfono. Entra con tu contraseña y vuelve a activar la huella.", true);
            return;
        } catch (Exception e) {
            quitar();
            r.error("No se pudo leer el acceso guardado. Entra con tu contraseña.", true);
            return;
        }
        pedir(c, "Entrar con huella", u, cifrado -> {
            String clave = new String(cifrado.doFinal(Base64.decode(datos, Base64.NO_WRAP)), StandardCharsets.UTF_8);
            r.ok(u, clave);
        }, r);
    }

    private SharedPreferences prefs() { return act.getSharedPreferences(PREFS, Context.MODE_PRIVATE); }

    private SecretKey llave(boolean nueva) throws Exception {
        KeyStore ks = KeyStore.getInstance("AndroidKeyStore");
        ks.load(null);
        if (!nueva) {
            if (!ks.containsAlias(ALIAS)) throw new IllegalStateException("sin llave");
            return (SecretKey) ks.getKey(ALIAS, null);
        }
        if (ks.containsAlias(ALIAS)) ks.deleteEntry(ALIAS);
        KeyGenParameterSpec.Builder b = new KeyGenParameterSpec.Builder(ALIAS,
                KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .setUserAuthenticationRequired(true)
                .setInvalidatedByBiometricEnrollment(true);
        if (Build.VERSION.SDK_INT >= 30) b.setUserAuthenticationParameters(0, KeyProperties.AUTH_BIOMETRIC_STRONG);
        KeyGenerator kg = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        kg.init(b.build());
        return kg.generateKey();
    }

    @TargetApi(28)
    private void pedir(Cipher c, String titulo, String subtitulo, Paso paso, Resultado r) {
        BiometricPrompt.Builder b = new BiometricPrompt.Builder(act).setTitle(titulo);
        if (subtitulo != null && !subtitulo.isEmpty()) b.setSubtitle(subtitulo);
        /* "Usar contraseña": se cierra la ventana y queda el formulario normal. */
        b.setNegativeButton("Usar contraseña", act.getMainExecutor(), (d, w) -> { });
        if (Build.VERSION.SDK_INT >= 30) b.setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG);
        try {
            b.build().authenticate(new BiometricPrompt.CryptoObject(c), new CancellationSignal(), act.getMainExecutor(),
                    new BiometricPrompt.AuthenticationCallback() {
                        @Override
                        public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult res) {
                            try {
                                paso.con(res.getCryptoObject().getCipher());
                            } catch (Exception e) {
                                r.error("No se pudo usar la huella. Entra con tu contraseña.", false);
                            }
                        }

                        @Override
                        public void onAuthenticationError(int codigo, CharSequence msg) {
                            /* "Usar contraseña" lo atiende setNegativeButton; aquí solo cancelaciones y fallas. */
                            boolean cancelado = codigo == BiometricPrompt.BIOMETRIC_ERROR_USER_CANCELED
                                    || codigo == BiometricPrompt.BIOMETRIC_ERROR_CANCELED;
                            r.error(cancelado ? "" : String.valueOf(msg), false);
                        }
                    });
        } catch (Exception e) {
            r.error("No se pudo abrir la huella", false);
        }
    }
}
