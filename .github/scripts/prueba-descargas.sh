#!/usr/bin/env bash
# Prueba de descargas en el emulador (la llama .github/workflows/android-prueba-descargas.yml).
# Abre el módulo Documentos dentro de la app, genera cada carta (Word y PDF) y revisa que el
# archivo llegue a Descargas del teléfono / que se abra el diálogo de impresión.
set -u
APK=android/app/build/outputs/apk/debug/app-debug.apk
PKG=com.grupokuroda.auditoria
mkdir -p capturas
cap() { adb exec-out screencap -p > "capturas/$1.png"; }
conectar() {
  PID=$(adb shell pidof "$PKG" | tr -d '\r')
  adb forward --remove-all >/dev/null 2>&1
  [ -n "$PID" ] && adb forward tcp:9222 "localabstract:webview_devtools_remote_$PID" >/dev/null
}
js() {
  local r=""
  for i in 1 2 3; do
    conectar >/dev/null
    r=$(node .github/scripts/cdp.mjs "$1" 2>/dev/null) && [ -n "$r" ] && { echo "$r"; return; }
    sleep 3
  done
  echo "SIN RESPUESTA"
}
abrir() {
  adb shell am force-stop "$PKG"; adb shell am start -n "$PKG/.MainActivity" >/dev/null; sleep 15
  for i in $(seq 1 12); do
    [ "$(js "!!document.getElementById('login-page')")" = "true" ] && { echo "Monitor cargado"; sleep 3; return; }
    js "if(!document.getElementById('login-page')) location.href='https://informe-de-tareas-grupo-kuroda.vercel.app/'; 'recargando'" >/dev/null
    sleep 8
  done
  echo "NO CARGÓ EL MONITOR"
}
descargas() { adb shell ls -la /sdcard/Download/ 2>&1 | tail -n +2; }
# Cierra la ventana abierta (aviso de la app o impresión) y vuelve a traer la app al frente
# (si no había nada abierto, Atrás manda la app al fondo).
cerrar() { adb shell input keyevent 4; sleep 2; adb shell am start -n "$PKG/.MainActivity" >/dev/null; sleep 2; }

adb install -r "$APK"
adb shell pm grant "$PKG" android.permission.POST_NOTIFICATIONS >/dev/null 2>&1
adb logcat -c
abrir
js "document.getElementById('login-page').classList.add('hidden'); 'ok'"
echo "puente en la página: $(js "!!HTMLAnchorElement.prototype.__gkPuente + ' imprimir:' + (typeof GKAndroid.imprimir)")"

CARGAR="(async()=>{window.__errores=[];const f=document.getElementById('iframe-documentos');f.src='assets/documentos.html?v='+Date.now();await new Promise(r=>f.addEventListener('load',r,{once:true}));await new Promise(r=>setTimeout(r,4000));const w=f.contentWindow;w.addEventListener('error',e=>__errores.push(e.message));w.addEventListener('unhandledrejection',e=>__errores.push(String(e.reason)));return 'documentos cargado, puente en iframe: '+!!w.HTMLAnchorElement.prototype.__gkPuente+', docx: '+typeof w.docx+', saveAs: '+typeof w.saveAs})()"
echo "$(js "$CARGAR")"

generar() { # $1 vista, $2 función
  local r
  r=$(js "(async()=>{const w=document.getElementById('iframe-documentos').contentWindow;w.showView('$1');await new Promise(r=>setTimeout(r,500));try{w.$2()}catch(e){return 'EXCEPCION '+e.message}await new Promise(r=>setTimeout(r,6000));return [...w.document.querySelectorAll('#view-$1 .status, .status')].map(s=>s.textContent.trim()).filter(Boolean).slice(0,2).join(' | ')+' errores:'+JSON.stringify(__errores)})()")
  echo "RESULTADO $2: $r"
  cap "$2"
  echo "  pantalla: $(adb shell dumpsys activity activities | grep -m1 -E 'topResumedActivity|mResumedActivity' | tr -s ' ')"
  cerrar
}

for p in "veh generarDocx" "fon fonDocx" "ent entDocx" "cel celDocx" "pc pcDocx"; do generar $p; done
echo "== Descargas después de los Word =="; descargas

for p in "veh imprimirPDF" "fon fonPDF" "pc pcPDF"; do generar $p; done

echo "== logcat (app / WebView) =="
adb logcat -d | grep -iE "AndroidRuntime|chromium|PrintSpooler|$PKG|Console" | tail -n 80
exit 0
