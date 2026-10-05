#!/usr/bin/env bash
# Prueba de desplazamiento en el emulador (la llama .github/workflows/android-prueba.yml).
# Usa la depuración del WebView (solo existe en el APK de prueba) para ocultar el inicio de sesión
# y medir window.scrollY antes y después de deslizar con el dedo.
set -u
APK=android/app/build/outputs/apk/debug/app-debug.apk
PKG=com.grupokuroda.auditoria
mkdir -p capturas
cap() { adb exec-out screencap -p > "capturas/$1.png"; }
js() { node .github/scripts/cdp.mjs "$1"; }
deslizar() { adb shell input swipe 540 1900 540 700 500; sleep 2; }

adb install -r "$APK"
adb shell am start -n "$PKG/.MainActivity"
sleep 30
cap 1-abre
PID=$(adb shell pidof "$PKG" | tr -d '\r')
adb forward tcp:9222 "localabstract:webview_devtools_remote_$PID"
sleep 2

MEDIR='({ancho:innerWidth, alto:innerHeight, scrollY:Math.round(scrollY), largo:document.scrollingElement.scrollHeight, apk:document.documentElement.className, zoom:getComputedStyle(document.body).zoom, html:getComputedStyle(document.documentElement).overflowY, body:getComputedStyle(document.body).overflowY})'
ENTRAR="document.getElementById('login-page').classList.add('hidden'); scrollTo(0,0); 'ok'"

echo "== A) Como está publicado hoy =="
js "$ENTRAR"
js "$MEDIR"
cap 2-inicio
deslizar
echo "RESULTADO A:"; js "$MEDIR"
cap 3-tras-deslizar
deslizar
js "$MEDIR"
cap 4-tras-deslizar-2

echo "== B) Página web tal cual, sin el diseño de la app =="
js "document.documentElement.classList.remove('gk-apk'); document.querySelectorAll('link[href*=\"apk.css\"]').forEach(l=>l.remove()); scrollTo(0,0); 'ok'"
sleep 2
js "$MEDIR"
deslizar
echo "RESULTADO B:"; js "$MEDIR"
cap 5-web-tras-deslizar

echo "== C) Página web con el arreglo de desplazamiento =="
js "var s=document.createElement('style'); s.textContent='html,body{zoom:1!important;height:auto!important;overflow-x:clip!important;overflow-y:visible!important}'; document.head.appendChild(s); scrollTo(0,0); 'ok'"
sleep 2
js "$MEDIR"
deslizar
echo "RESULTADO C:"; js "$MEDIR"
cap 6-arreglo-tras-deslizar
exit 0
