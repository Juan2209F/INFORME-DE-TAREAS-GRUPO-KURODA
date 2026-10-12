/* App para iPhone / iPad (PWA instalada desde Safari) — Grupo Kuroda
   Usa el MISMO diseño de la app Android (css/apk.css + js/app-apk.js): barra superior fija,
   menú lateral ☰, ventanas que suben desde abajo y deslizar para recargar. Este archivo se
   carga ANTES de js/app-apk.js y le avisa (window.GKIos) que debe activarse también aquí.
   Agrega lo que el iPhone necesita y que en Android hace la app nativa:
   1) Detecta iPhone/iPad y si la app está instalada (abierta desde el ícono de inicio).
   2) En Safari (sin instalar): aviso con los pasos para instalarla. No cambia nada más.
   3) Instalada: pantalla completa con las áreas seguras del iPhone (css/ios.css).
   4) Archivos generados (Excel, PDF, PPTX, Word, imágenes): se entregan con la hoja
      "Compartir" de iOS para guardarlos en Archivos o enviarlos.
   5) Gesto "atrás" (deslizar desde el borde): cierra la ventana abierta o regresa a Inicio.
   6) Actualizaciones: revisa si Vercel tiene una versión nueva y ofrece recargar.
   7) Service worker (sw.js): la app abre aunque no haya conexión.
   En Android (APK) y en computadora no hace nada.
   Para probar el diseño en computadora: abrir index.html?ios=1 (se quita con ?ios=0). */
(function () {
  'use strict';

  var VERSION = '1.0';
  var ua = navigator.userAgent || '';
  if (window.GKAndroid || / GKApp\//.test(ua)) return;            /* app Android */

  var esIos = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var prueba = false;
  try {
    if (/[?&]ios=1(&|$)/.test(location.search)) sessionStorage.setItem('gk-ios-prueba', '1');
    if (/[?&]ios=0(&|$)/.test(location.search)) sessionStorage.removeItem('gk-ios-prueba');
    prueba = sessionStorage.getItem('gk-ios-prueba') === '1';
  } catch (e) {}
  if (!esIos && !prueba) return;

  var instalada = navigator.standalone === true ||
    !!(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  var html = document.documentElement;
  var $ = function (id) { return document.getElementById(id); };
  var alCargar = function (fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn();
  };
  var aviso = function (t) { if (typeof window.toast === 'function') window.toast(t); };

  /* ---------- 7) Service worker ---------- */
  var swListo = null;
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    swListo = navigator.serviceWorker.register('sw.js').catch(function () { return null; });
  }

  /* ---------- 2) Safari sin instalar: cómo instalar ---------- */
  if (!(esIos && instalada) && !prueba) {
    alCargar(avisoInstalar);
    return;
  }

  function avisoInstalar() {
    var CLAVE = 'gk-ios-instalar', DIAS = 14;
    try {
      var t = parseInt(localStorage.getItem(CLAVE) || '0', 10) || 0;
      if (t && Date.now() - t < DIAS * 864e5) return;
    } catch (e) {}
    var c = document.createElement('div');
    c.id = 'ios-instalar';
    c.className = 'ios-instalar';
    c.setAttribute('role', 'dialog');
    c.setAttribute('aria-label', 'Instalar la app');
    c.innerHTML =
      '<img src="icons/apple-touch-icon.png" alt="" width="46" height="46">' +
      '<div class="ios-instalar-txt"><b>Instala el Monitor en tu iPhone</b>' +
      '<span>Toca <i class="ios-compartir" aria-label="Compartir"></i> <u>Compartir</u> y luego ' +
      '<u>Agregar a inicio</u>. Se abre como app, a pantalla completa.</span></div>' +
      '<button type="button" aria-label="Cerrar">✕</button>';
    c.querySelector('button').addEventListener('click', function () {
      try { localStorage.setItem(CLAVE, String(Date.now())); } catch (e) {}
      c.remove();
    });
    document.body.appendChild(c);
  }

  /* ---------- 3) App instalada ---------- */
  html.classList.add('gk-ios');
  var VIEWPORT = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, viewport-fit=cover';
  var mv = document.querySelector('meta[name="viewport"]');
  if (mv) mv.setAttribute('content', VIEWPORT);

  function tema(oscuro) {
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', oscuro ? '#0a0e23' : '#5e72e4');
  }

  /* ---------- 4) Guardar archivos con la hoja "Compartir" ----------
     La página genera los archivos en memoria y los "descarga" con un enlace <a download>
     (blob: o data:). En una app instalada de iOS eso no deja guardar el archivo de forma
     confiable, así que se interceptan (también dentro de Generador, Documentos y Activos)
     y se entregan con navigator.share. Si iOS no permite compartir en ese momento (el archivo
     tardó en generarse y ya no cuenta como un toque del usuario), aparece una hoja con el
     botón "Guardar o compartir". */
  var puedeCompartir = typeof navigator.share === 'function' && typeof navigator.canShare === 'function';
  var TIPOS = { xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', xls: 'application/vnd.ms-excel',
    csv: 'text/csv', pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', json: 'application/json',
    txt: 'text/plain', zip: 'application/zip',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' };
  var pendientes = [], hoja = null;
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  function quitar(lista) {
    pendientes = pendientes.filter(function (f) { return lista.indexOf(f) < 0; });
    pintarHoja();
  }
  function compartir() {
    var lista = pendientes.slice();
    if (!lista.length) return;
    var datos = { files: lista };
    if (!navigator.canShare(datos)) datos = { files: [lista[0]] };   /* iOS antiguos: de uno en uno */
    navigator.share(datos).then(function () { quitar(datos.files); }, function () { pintarHoja(true); });
  }
  function pintarHoja(mostrar) {
    if (!pendientes.length) { if (hoja) hoja.classList.remove('abierta'); return; }
    if (!hoja) {
      hoja = document.createElement('div');
      hoja.id = 'ios-archivos';
      hoja.className = 'ios-archivos';
      hoja.innerHTML = '<div class="ios-archivos-txt"></div>' +
        '<button type="button" class="ios-archivos-ok">Guardar o compartir</button>' +
        '<button type="button" class="ios-archivos-x" aria-label="Descartar">✕</button>';
      hoja.querySelector('.ios-archivos-ok').addEventListener('click', compartir);
      hoja.querySelector('.ios-archivos-x').addEventListener('click', function () { pendientes = []; pintarHoja(); });
      document.body.appendChild(hoja);
    }
    hoja.querySelector('.ios-archivos-txt').innerHTML =
      '<b>' + (pendientes.length === 1 ? 'Archivo listo' : pendientes.length + ' archivos listos') + '</b>' +
      '<span>' + pendientes.map(function (f) { return esc(f.name); }).join(', ') + '</span>';
    if (mostrar) hoja.classList.add('abierta');
  }
  /* Devuelve false si este archivo no se puede compartir (se deja la descarga normal). */
  function entregar(blob, nombre) {
    var f, ext = (/\.([a-z0-9]+)$/i.exec(nombre) || [])[1];
    try { f = new File([blob], nombre, { type: blob.type || TIPOS[String(ext || '').toLowerCase()] || 'application/octet-stream' }); }
    catch (e) { return false; }
    if (!navigator.canShare({ files: [f] })) return false;
    pendientes.push(f);
    compartir();
    return true;
  }

  function instalarDescargas(win) {
    var Ancla;
    try {
      Ancla = win && win.HTMLAnchorElement && win.HTMLAnchorElement.prototype;
      if (!Ancla) return;
      if (Ancla.__gkIos) { vigilar(win); return; }
      Ancla.__gkIos = true;
    } catch (e) { return; }                       /* iframe de otro origen */

    var URL_ = win.URL, blobs = {};
    var crear = URL_.createObjectURL;
    /* Se guarda el Blob de cada URL: la página suele revocarla justo después del clic. */
    URL_.createObjectURL = function (o) {
      var u = crear.apply(URL_, arguments);
      if (o && typeof o.size === 'number' && typeof o.slice === 'function') {
        blobs[u] = o;
        win.setTimeout(function () { delete blobs[u]; }, 120000);
      }
      return u;
    };
    var clic = Ancla.click;
    function normal(h, nombre) {                  /* descarga normal del navegador */
      var a = win.document.createElement('a');
      a.href = h; a.setAttribute('download', nombre); a.__gkPasa = true;
      clic.call(a);
    }
    function interceptar(a) {
      if (!a || a.__gkPasa || !a.hasAttribute || !a.hasAttribute('download')) return false;
      var h = a.href || '';
      if (h.indexOf('blob:') !== 0 && h.indexOf('data:') !== 0) return false;
      var nombre = a.getAttribute('download') || 'descarga';
      if (blobs[h]) { if (!entregar(blobs[h], nombre)) return false; return true; }
      win.fetch(h).then(function (r) { return r.blob(); })
        .then(function (b) { if (!entregar(b, nombre)) normal(h, nombre); })
        .catch(function () { aviso('⚠ No se pudo preparar el archivo'); });
      return true;
    }
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
    win.addEventListener('click', function (e) {
      var a = e.target && e.target.closest && e.target.closest('a[download]');
      if (a && interceptar(a)) e.preventDefault();
    }, true);
    vigilar(win);
  }
  /* Iframes del mismo sitio: los que ya existen y los que se agreguen o recarguen después. */
  function revisarIframe(f) {
    try { instalarDescargas(f.contentWindow); } catch (e) {}
    if (!f.__gkIosCarga) {
      f.__gkIosCarga = true;
      f.addEventListener('load', function () { try { instalarDescargas(f.contentWindow); } catch (e) {} });
    }
  }
  function vigilar(win) {
    var doc;
    try { doc = win.document; } catch (e) { return; }
    var todos = function () { Array.prototype.forEach.call(doc.querySelectorAll('iframe'), revisarIframe); };
    todos();
    if (doc.__gkIosVigila) return;
    if (!doc.documentElement) { doc.addEventListener('DOMContentLoaded', function () { vigilar(win); }); return; }
    doc.__gkIosVigila = true;
    new win.MutationObserver(todos).observe(doc.documentElement, { childList: true, subtree: true });
  }
  if (puedeCompartir) instalarDescargas(window);

  /* ---------- 5) Gesto "atrás" ----------
     La app es una sola página: se deja una entrada en el historial para que el gesto de iOS
     no haga nada raro y, en su lugar, cierre la ventana abierta o regrese a Inicio. */
  function montarAtras() {
    try { history.pushState({ gk: 1 }, ''); } catch (e) { return; }
    window.addEventListener('popstate', function () {
      try { if (window.GKApk && window.GKApk.atras) window.GKApk.atras(); } catch (e) {}
      try { history.pushState({ gk: 1 }, ''); } catch (e) {}
    });
  }

  /* ---------- 6) Actualizaciones ----------
     iOS deja la app "dormida" por días, así que puede quedarse con una versión vieja. Se
     compara la huella (ETag) de los archivos principales en Vercel con la que tenían al abrir
     la app. Si cambió, se ofrece recargar (pide iniciar sesión otra vez). */
  var ARCHIVOS = ['index.html', 'js/app-core.js', 'js/app-usuarios.js', 'js/app-correos.js', 'js/app-archivero.js',
    'js/app-activos.js', 'js/app-sesion.js', 'js/app-movil.js', 'js/app-apk.js', 'js/app-ios.js',
    'css/main.css', 'css/movil.css', 'css/apk.css', 'css/ios.css',
    'assets/activos.html', 'assets/documentos.html', 'assets/generador.html'];
  var huellaInicial = null, ultimaRevision = 0, ofrecida = '';
  function huellas() {
    return Promise.all(ARCHIVOS.map(function (f) {
      return fetch(f, { method: 'HEAD', cache: 'no-store' }).then(function (r) {
        return r.ok ? (r.headers.get('etag') || r.headers.get('last-modified') || '') : '';
      });
    })).then(function (a) { return a.join('|'); }, function () { return null; });
  }
  function aplicarActualizacion() {
    var limpiar = window.caches ? caches.keys().then(function (ks) { return Promise.all(ks.map(function (k) { return caches.delete(k); })); }) : Promise.resolve();
    limpiar.catch(function () {}).then(function () { return swListo; })
      .then(function (reg) { return reg && reg.update ? reg.update() : null; })
      .catch(function () {}).then(function () { location.reload(); });
  }
  function ofrecer() {
    if (typeof window.openModal !== 'function') {
      if (window.confirm('Hay una versión nueva de la app. ¿Actualizar ahora? Tendrás que iniciar sesión otra vez.')) aplicarActualizacion();
      return;
    }
    window.openModal('⬆️ Nueva versión de la app',
      '<p style="font-size:13.5px;line-height:1.55">Hay una versión más reciente del Monitor. Al actualizar, la app se recarga y pide iniciar sesión otra vez.</p>',
      [{ label: 'Más tarde', cls: 'btn-ghost', fn: function () { window.closeModal(); } },
       { label: 'Actualizar ahora', cls: 'btn-blue', fn: function () { window.closeModal(); aplicarActualizacion(); } }],
      { maxWidth: '420px' });
  }
  function buscarActualizacion(manual) {
    ultimaRevision = Date.now();
    if (manual) aviso('⏳ Buscando actualizaciones…');
    huellas().then(function (h) {
      if (h === null) { if (manual) aviso('Sin conexión para revisar actualizaciones'); return; }
      if (huellaInicial === null) { huellaInicial = h; if (manual) aviso('✓ Ya tienes la versión más reciente'); return; }
      if (h === huellaInicial) { if (manual) aviso('✓ Ya tienes la versión más reciente'); return; }
      if (!manual && ofrecida === h) return;      /* ya se ofreció esta versión y eligió "Más tarde" */
      ofrecida = h;
      ofrecer();
    });
  }
  function vigilarVersion() {
    huellas().then(function (h) { huellaInicial = h; ultimaRevision = Date.now(); });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible' && Date.now() - ultimaRevision > 15 * 60 * 1000) buscarActualizacion(false);
    });
  }

  window.GKIos = { version: VERSION + ' iOS', viewport: VIEWPORT, instalada: instalada, tema: tema,
    buscarActualizacion: function () { buscarActualizacion(true); } };

  alCargar(function () {
    tema(html.getAttribute('data-theme') === 'dark');
    montarAtras();
    if (window.addEventListener) window.addEventListener('load', function () { setTimeout(vigilarVersion, 3000); });
  });
})();
