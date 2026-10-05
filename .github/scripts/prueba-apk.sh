#!/usr/bin/env bash
# Prueba de desplazamiento en el emulador (la llama .github/workflows/android-prueba.yml).
# Usa la depuración del WebView (solo existe en el APK de prueba) para ocultar el inicio de sesión
# y medir window.scrollY antes y después de deslizar con el dedo.
set -u
APK=android/app/build/outputs/apk/debug/app-debug.apk
PKG=com.grupokuroda.auditoria
mkdir -p capturas
cap() { adb exec-out screencap -p > "capturas/$1.png"; }
conectar() {
  PID=$(adb shell pidof "$PKG" | tr -d '\r')
  echo "pid app: ${PID:-NO CORRE}"
  adb forward --remove-all >/dev/null 2>&1
  [ -n "$PID" ] && adb forward tcp:9222 "localabstract:webview_devtools_remote_$PID" >/dev/null
}
js() { # reintenta si la conexión con el WebView se cae
  local r=""
  for i in 1 2 3; do
    conectar >/dev/null
    r=$(node .github/scripts/cdp.mjs "$1" 2>/dev/null) && [ -n "$r" ] && { echo "$r"; return; }
    sleep 3
  done
  echo "SIN RESPUESTA"
}
deslizar() { adb shell input swipe 540 1700 540 600 400; sleep 2; }
abrir() { # espera a que cargue el Monitor (no la pantalla "Sin conexión")
  adb shell am force-stop "$PKG"; adb shell am start -n "$PKG/.MainActivity" >/dev/null; sleep 15
  for i in $(seq 1 12); do
    [ "$(js "!!document.getElementById('login-page')")" = "true" ] && { echo "Monitor cargado"; sleep 3; return; }
    js "if(!document.getElementById('login-page')) location.href='https://informe-de-tareas-grupo-kuroda.vercel.app/'; 'recargando'" >/dev/null
    sleep 8
  done
  echo "NO CARGÓ EL MONITOR"
}

MEDIR='({ancho:innerWidth, alto:innerHeight, scrollY:Math.round(scrollY), largo:document.scrollingElement.scrollHeight, apk:document.documentElement.className, zoom:getComputedStyle(document.body).zoom, html:getComputedStyle(document.documentElement).overflowY, body:getComputedStyle(document.body).overflowY, bajoDedo:(function(){var e=document.elementFromPoint(innerWidth/2, innerHeight*0.55);return e?e.tagName+"."+String(e.className).slice(0,40):null})(), ventanas:document.querySelectorAll(".modal-overlay.show,.kpi-cfg-overlay.show,.usr-overlay.show,.mv-hoja.abierta,.apk-ov,#plantilla-overlay").length})'
ENTRAR="document.getElementById('login-page').classList.add('hidden'); scrollTo(0,0); 'ok'"

prueba() { # $1 nombre, $2 js de preparación
  echo "== $1 =="
  abrir
  js "$ENTRAR"
  [ -n "$2" ] && js "$2"
  sleep 1
  echo "antes:";  js "$MEDIR"
  cap "$1-antes"
  deslizar
  echo "RESULTADO $1 (después de deslizar):"; js "$MEDIR"
  cap "$1-despues"
}

adb install -r "$APK"
prueba A-publicado ""
prueba B-web-sin-diseno "document.documentElement.classList.remove('gk-apk'); var l=document.querySelector('link[href*=\"apk.css\"]'); if(l) l.disabled=true; scrollTo(0,0); 'ok'"
prueba C-arreglo-clip "var s=document.createElement('style'); s.textContent='html,body{zoom:1!important;height:auto!important;overflow-x:clip!important;overflow-y:visible!important}'; document.head.appendChild(s); scrollTo(0,0); 'ok'"
prueba D-web-con-arreglo "document.documentElement.classList.remove('gk-apk'); var l=document.querySelector('link[href*=\"apk.css\"]'); if(l) l.disabled=true; var s=document.createElement('style'); s.textContent='html,body{zoom:1!important;height:auto!important;overflow-x:clip!important;overflow-y:visible!important}'; document.head.appendChild(s); scrollTo(0,0); 'ok'"
echo "== errores de la app =="
adb logcat -d -s AndroidRuntime:E | tail -n 30
exit 0
