/* Puente de descargas — Grupo Kuroda (lo inyecta la app Android).
   El WebView no sabe guardar los archivos que la página genera en memoria (PNG, CSV, Excel,
   PDF, PPTX: enlaces <a download> con blob: o data:). Aquí se interceptan y se pasan a
   Android (GKAndroid) en trozos para guardarlos en Descargas.
   Se instala también en los iframes del mismo origen (Generador, Documentos, Activos). */
(function () {
  'use strict';
  var TROZO = 3 * 256 * 1024; /* múltiplo de 3: los trozos en base64 se pueden concatenar */

  function enviar(blob, nombre) {
    var id = Date.now() + Math.random().toString(36).slice(2);
    var pos = 0;
    GKAndroid.inicio(id, nombre, blob.type || '');
    (function siguiente() {
      if (pos >= blob.size) { GKAndroid.fin(id); return; }
      var r = new FileReader();
      r.onload = function () {
        var s = r.result;
        GKAndroid.trozo(id, s.slice(s.indexOf(',') + 1));
        pos += TROZO;
        siguiente();
      };
      r.onerror = function () { GKAndroid.error(id); };
      r.readAsDataURL(blob.slice(pos, pos + TROZO));
    })();
  }

  /* window.print() no hace nada dentro del WebView de Android. Se manda el HTML de la página
     a la app, que lo abre en el diálogo de impresión de Android (ahí se elige "Guardar como PDF").
     Así funcionan "Imprimir / Guardar PDF" de Documentos y las etiquetas QR de Activos. */
  function imprimir(win) {
    try {
      if (!GKAndroid.imprimir) return; /* APK anterior sin impresión */
      var d = win.document;
      var html = '<!DOCTYPE html>' + d.documentElement.outerHTML;
      var titulo = d.title || (win.top && win.top.document.title) || 'Documento';
      GKAndroid.imprimir(html, d.baseURI || win.location.href, titulo);
    } catch (e) {}
  }

  /* Iframes (Documentos, Generador, Activos…): los que ya existen y los que se agreguen o
     recarguen después. Corre en cada inyección aunque el puente ya esté instalado: la app
     inyecta este archivo al empezar a cargar la página, cuando el documento aún está vacío
     y no hay dónde vigilar; las inyecciones siguientes deben completar la vigilancia. */
  function revisar(f) {
    try { instalar(f.contentWindow); } catch (e) {}
    if (!f.__gkCarga) {
      f.__gkCarga = true;
      f.addEventListener('load', function () { try { instalar(f.contentWindow); } catch (e) {} });
    }
  }

  function vigilar(win) {
    var doc = win.document;
    function revisarTodos() { Array.prototype.forEach.call(doc.querySelectorAll('iframe'), revisar); }
    revisarTodos();
    if (doc.__gkVigila) return;
    if (!doc.documentElement) {
      doc.addEventListener('DOMContentLoaded', function () { vigilar(win); });
      return;
    }
    doc.__gkVigila = true;
    new win.MutationObserver(revisarTodos).observe(doc.documentElement, { childList: true, subtree: true });
    /* Respaldo: el 'load' de cualquier iframe llega a la ventana en la fase de captura. */
    win.addEventListener('load', function (e) {
      var t = e.target;
      if (t && t.tagName === 'IFRAME') revisar(t);
    }, true);
  }

  function instalar(win) {
    var Ancla;
    try {
      /* La marca va en el prototipo (no en window): al cargar un iframe, su ventana inicial
         about:blank puede reutilizarse con prototipos nuevos y hay que volver a instalar. */
      Ancla = win && win.HTMLAnchorElement && win.HTMLAnchorElement.prototype;
      if (!Ancla) return;
      if (Ancla.__gkPuente) { vigilar(win); return; }
      Ancla.__gkPuente = true;
    } catch (e) { return; } /* iframe de otro origen */

    var URL_ = win.URL;
    var blobs = {};

    win.print = function () { imprimir(win); };

    /* Se guarda el Blob de cada URL: la página suele revocarla justo después del clic. */
    var crear = URL_.createObjectURL;
    URL_.createObjectURL = function (o) {
      var u = crear.apply(URL_, arguments);
      if (o && typeof o.size === 'number' && typeof o.slice === 'function') {
        blobs[u] = o;
        win.setTimeout(function () { delete blobs[u]; }, 120000);
      }
      return u;
    };

    function interceptar(a) {
      if (!a || !a.hasAttribute || !a.hasAttribute('download')) return false;
      var h = a.href || '';
      if (h.indexOf('blob:') !== 0 && h.indexOf('data:') !== 0) return false;
      var nombre = a.getAttribute('download') || 'descarga';
      if (blobs[h]) enviar(blobs[h], nombre);
      else win.fetch(h).then(function (r) { return r.blob(); })
        .then(function (b) { enviar(b, nombre); })
        .catch(function () { GKAndroid.error(''); });
      return true;
    }

    var clic = Ancla.click;
    Ancla.click = function () {
      if (interceptar(this)) return;
      return clic.apply(this, arguments);
    };
    /* jsPDF / FileSaver disparan el clic con dispatchEvent sobre un <a> fuera del documento. */
    var despachar = Ancla.dispatchEvent;
    Ancla.dispatchEvent = function (e) {
      if (e && e.type === 'click' && interceptar(this)) return true;
      return despachar.apply(this, arguments);
    };
    /* En la ventana (no en el documento): sigue funcionando si la página hace document.open(). */
    win.addEventListener('click', function (e) {
      var a = e.target && e.target.closest && e.target.closest('a[download]');
      if (a && interceptar(a)) e.preventDefault();
    }, true);

    vigilar(win);
  }

  instalar(window);
})();
