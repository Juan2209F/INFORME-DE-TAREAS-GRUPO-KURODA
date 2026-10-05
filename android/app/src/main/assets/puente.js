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

  function instalar(win) {
    try {
      if (!win || win.__gkPuente) return;
      win.__gkPuente = true;
    } catch (e) { return; } /* iframe de otro origen */

    var doc = win.document, URL_ = win.URL, Ancla = win.HTMLAnchorElement.prototype;
    var blobs = {};

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
    doc.addEventListener('click', function (e) {
      var a = e.target && e.target.closest && e.target.closest('a[download]');
      if (a && interceptar(a)) e.preventDefault();
    }, true);

    /* Iframes: los que ya existen y los que se agreguen o recarguen después. */
    function revisar(f) {
      try { instalar(f.contentWindow); } catch (e) {}
      if (!f.__gkCarga) {
        f.__gkCarga = true;
        f.addEventListener('load', function () { try { instalar(f.contentWindow); } catch (e) {} });
      }
    }
    function revisarTodos() { Array.prototype.forEach.call(doc.querySelectorAll('iframe'), revisar); }
    revisarTodos();
    if (doc.documentElement) {
      new win.MutationObserver(revisarTodos).observe(doc.documentElement, { childList: true, subtree: true });
    }
  }

  instalar(window);
})();
