/* Diseño de la app Android (APK) — Grupo Kuroda
   Solo actúa dentro de la app: la app inyecta window.GKAndroid (y desde la v1.1 agrega
   "GKApp/<versión>" al User-Agent). En el navegador no hace nada.
   Va en el <head> para poner la clase "gk-apk" en <html> antes de pintar; css/apk.css cuelga
   todo de esa clase. Funciona junto con css/movil.css y js/app-movil.js (menú inferior, hoja
   "Más", filtros plegables y tablas en tarjetas).
   1) Barra superior de app: logo, nombre de la sección abierta y botón de perfil.
   2) Menú inferior con indicador de sección (ícono en píldora).
   3) Hoja "Más": perfil, tema, buscar actualizaciones, versión y cerrar sesión.
   4) Botón Atrás de Android: cierra la ventana emergente abierta o regresa a Inicio (GKApk.atras).
   5) Tema claro/oscuro sincronizado con las barras del sistema (GKAndroid.tema).
   6) App v1.0 (sin actualizador propio): avisa si hay una versión nueva en Supabase. */
(function () {
  'use strict';

  var A = window.GKAndroid;
  var esApk = !!A || / GKApp\//.test(navigator.userAgent);
  if (!esApk) return;
  var html = document.documentElement;
  html.classList.add('gk-apk');

  var URL_INFO = 'https://xlygkolfmetytowixtnb.supabase.co/storage/v1/object/public/app-releases/latest.json';
  var tieneActualizador = !!(A && typeof A.buscarActualizacion === 'function');
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var versionApp = function () { try { return A && A.version ? A.version() : '1.0'; } catch (e) { return '1.0'; } };

  /* ---------- 5) Tema ---------- */
  function oscuro() { return html.getAttribute('data-theme') === 'dark'; }
  function avisarTema() { try { if (A && A.tema) A.tema(oscuro()); } catch (e) {} }
  new MutationObserver(avisarTema).observe(html, { attributes: true, attributeFilter: ['data-theme'] });

  /* ---------- 1) Barra superior ---------- */
  var NOMBRES = { dash: 'Inicio', tareas: 'Tareas', actividades: 'Actividades', auditorias: 'Auditorías', ajustes: 'Ajustes',
    mermas: 'Mermas', desempeno: 'Desempeño', generador: 'Generador', documentos: 'Documentos', activos: 'Activos' };
  function seccionActual() {
    var n = document.querySelector('nav.sidebar .nav-item.active:not(#nav-mas)');
    var l = n && n.querySelector('.nav-lbl');
    if (l) return l.textContent.trim();
    if ($('usr-overlay') && $('usr-overlay').classList.contains('show')) return 'Usuarios';
    return (typeof VIEW !== 'undefined' && NOMBRES[VIEW]) || 'Inicio';
  }
  function usuario() {
    var u = $('topbar-user'), sp = u ? u.querySelectorAll('span') : [];
    return { nombre: (sp[0] ? sp[0].textContent : (u ? u.textContent : '')).trim(), rol: (sp[1] ? sp[1].textContent : '').trim() };
  }
  function iniciales(n) {
    var p = String(n || '').replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ ]/g, ' ').trim().split(/\s+/);
    return ((p[0] || '?').charAt(0) + (p.length > 1 ? p[p.length - 1].charAt(0) : '')).toUpperCase();
  }
  function montarBarra() {
    var tb = document.querySelector('.topbar');
    if (!tb || $('apk-tit')) return;
    var logo = document.querySelector('nav.sidebar .logo img');
    var marca = document.createElement('div');
    marca.className = 'apk-marca';
    marca.innerHTML = (logo ? '<img src="' + logo.getAttribute('src') + '" alt="">' : '') +
      '<div id="apk-tit"><small>Monitor de Cumplimiento</small><b id="apk-seccion">Inicio</b></div>';
    tb.insertBefore(marca, tb.firstChild);
    var perfil = document.createElement('button');
    perfil.type = 'button';
    perfil.id = 'apk-perfil';
    perfil.setAttribute('aria-label', 'Mi cuenta y más opciones');
    perfil.addEventListener('click', function () { if (window.__kgMovil) window.__kgMovil.abrirHoja(); });
    tb.appendChild(perfil);
  }
  function actualizarBarra() {
    var s = $('apk-seccion'); if (s) { var t = seccionActual(); if (s.textContent !== t) s.textContent = t; }
    var p = $('apk-perfil'); if (p) { var i = iniciales(usuario().nombre); if (p.textContent !== i) p.textContent = i; }
  }

  /* ---------- 2) Menú inferior: ícono en su propio elemento para la píldora ---------- */
  function iconosMenu() {
    document.querySelectorAll('nav.sidebar .nav-item').forEach(function (n) {
      if (n.querySelector('.apk-ico')) return;
      for (var i = 0; i < n.childNodes.length; i++) {
        var c = n.childNodes[i];
        if (c.nodeType === 3 && c.textContent.trim()) {
          var s = document.createElement('span');
          s.className = 'apk-ico';
          s.textContent = c.textContent.trim();
          n.replaceChild(s, c);
          break;
        }
      }
    });
  }

  /* ---------- 3) Opciones extra en la hoja "Más" ---------- */
  function extrasHoja() {
    var caja = document.querySelector('.mv-hoja .mv-hoja-caja');
    if (!caja) return;
    var u = usuario(), usr = caja.querySelector('.mv-hoja-usr');
    if (usr) usr.innerHTML = '<span class="apk-avatar">' + esc(iniciales(u.nombre)) + '</span><div><b>' + esc(u.nombre || 'Mi cuenta') +
      '</b><small>' + esc(u.rol) + '</small></div>';
    var ex = caja.querySelector('.apk-opciones');
    if (!ex) {
      ex = document.createElement('div');
      ex.className = 'apk-opciones';
      caja.appendChild(ex);
      ex.addEventListener('click', function (e) {
        var b = e.target.closest('[data-apk]');
        if (!b) return;
        var q = b.getAttribute('data-apk');
        if (q === 'tema') { if (typeof toggleTheme === 'function') toggleTheme(); extrasHoja(); return; }
        if (window.__kgMovil) window.__kgMovil.cerrarHoja();
        if (q === 'act') buscarActualizacion();
        else if (q === 'salir' && typeof doLogout === 'function') doLogout();
      });
    }
    ex.innerHTML =
      '<button type="button" data-apk="tema"><span>' + (oscuro() ? '☀️' : '🌙') + '</span>' + (oscuro() ? 'Tema claro' : 'Tema oscuro') + '</button>' +
      '<button type="button" data-apk="act"><span>⬆️</span>Buscar actualizaciones</button>' +
      '<button type="button" data-apk="salir" class="apk-salir"><span>⏻</span>Cerrar sesión</button>' +
      '<div class="apk-version">Auditoría Kuroda · versión ' + esc(versionApp()) + '</div>';
  }
  function engancharHoja() {
    var m = window.__kgMovil;
    if (!m || m.__apk) return;
    var abrir = m.abrirHoja;
    m.abrirHoja = function () { abrir.apply(this, arguments); extrasHoja(); };
    m.__apk = true;
    /* Con menú "Más" en la barra superior (perfil), el botón "Más" del menú inferior sigue igual. */
  }

  /* ---------- 4) Botón Atrás de Android ---------- */
  function visible(el) { return !!el && el.offsetParent !== null; }
  function atras() {
    var hoja = document.querySelector('.mv-hoja.abierta');
    if (hoja) { window.__kgMovil.cerrarHoja(); return true; }
    var pl = $('plantilla-overlay');
    if (pl) { pl.remove(); return true; }
    if (document.querySelector('.kg-aviso-sesion') && visible(document.querySelector('.kg-aviso-sesion .caja'))) return true;
    /* Ventanas emergentes abiertas: se cierra la de más arriba. */
    var abiertas = Array.prototype.slice.call(document.querySelectorAll('.modal-overlay.show, .kpi-cfg-overlay.show, .usr-overlay.show'));
    if (abiertas.length) {
      abiertas.sort(function (a, b) { return (parseInt(getComputedStyle(b).zIndex, 10) || 0) - (parseInt(getComputedStyle(a).zIndex, 10) || 0); });
      var ov = abiertas[0], id = ov.id;
      var cerrar = { 'modal-overlay': 'closeModal', 'kpi-cfg-overlay': 'closeKpiCfg', 'aud-modal-overlay': 'closeNuevaAuditoria',
        'eu-overlay': 'closeEditUsuario', 'ar-overlay': 'closeAsignarRazonMasiva' }[id];
      if (cerrar && typeof window[cerrar] === 'function') window[cerrar]();
      else ov.classList.remove('show');
      return true;
    }
    var filtros = document.querySelector('.filters.mv-abierto');
    if (filtros) { filtros.classList.remove('mv-abierto'); return true; }
    /* Sesión iniciada y en otra sección: volver a Inicio. */
    var login = $('login-page');
    if (login && !login.classList.contains('hidden')) return false;
    var usr = $('usr-overlay');
    if ((typeof VIEW !== 'undefined' && VIEW !== 'dash') || (usr && usr.classList.contains('show'))) {
      var ini = $('nav-dash');
      if (ini && ini.style.display !== 'none') { ini.click(); window.scrollTo(0, 0); return true; }
    }
    if (window.scrollY > 200) { window.scrollTo({ top: 0, behavior: 'smooth' }); return true; }
    return false;
  }

  /* ---------- 6) Actualizaciones ---------- */
  function buscarActualizacion() {
    if (tieneActualizador) { try { A.buscarActualizacion(); } catch (e) {} return; }
    revisarLegado(true);
  }
  /* App v1.0: no sabe actualizarse sola. Se lee latest.json y se ofrece descargar el APK
     (lo baja el gestor de descargas de Android; al terminar se toca la notificación para instalar). */
  function revisarLegado(manual) {
    if (tieneActualizador) return;
    var hoy = new Date().toISOString().slice(0, 10);
    try { if (!manual && localStorage.getItem('gk-apk-aviso') === hoy) return; } catch (e) {}
    fetch(URL_INFO + '?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (!j || !j.url) { if (manual && typeof toast === 'function') toast('No se pudo revisar. Intenta más tarde.'); return; }
        if (String(j.versionName) === versionApp()) { if (manual && typeof toast === 'function') toast('✓ Ya tienes la versión más reciente'); return; }
        try { localStorage.setItem('gk-apk-aviso', hoy); } catch (e) {}
        hojaLegado(j);
      }).catch(function () { if (manual && typeof toast === 'function') toast('Sin conexión para revisar actualizaciones'); });
  }
  function hojaLegado(j) {
    if ($('apk-act')) return;
    var notas = Array.isArray(j.notas) ? j.notas : (j.notas ? [j.notas] : []);
    var d = document.createElement('div');
    d.id = 'apk-act';
    d.className = 'apk-ov';
    d.innerHTML = '<div class="apk-sheet" role="dialog" aria-modal="true"><div class="apk-asa"></div>' +
      '<div class="apk-sheet-hdr"><span class="apk-sheet-ico">⬆️</span><div><small>Actualización disponible</small>' +
      '<b>Versión ' + esc(j.versionName) + ' lista</b></div></div>' +
      '<p>Esta versión de la app ya no se actualiza sola. Descarga la nueva una sola vez; a partir de ella las actualizaciones se instalan desde la propia app.</p>' +
      (notas.length ? '<ul>' + notas.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>' : '') +
      '<p class="apk-nota">Al terminar la descarga toca la notificación para instalar. Si Android dice que «entra en conflicto con un paquete existente», desinstala la app anterior e instala la nueva.</p>' +
      '<div class="apk-sheet-bts"><button type="button" class="btn btn-ghost" data-x>Más tarde</button>' +
      '<button type="button" class="btn btn-blue" data-ok>Descargar</button></div></div>';
    d.addEventListener('click', function (e) {
      if (e.target === d || e.target.hasAttribute('data-x')) d.remove();
      else if (e.target.hasAttribute('data-ok')) { d.remove(); location.href = j.url; }
    });
    document.body.appendChild(d);
  }

  /* ---------- Iframes del mismo sitio (Generador, Documentos, Activos) ---------- */
  function estiloIframes() {
    document.querySelectorAll('iframe').forEach(function (f) {
      var doc;
      try { doc = f.contentDocument; } catch (e) { return; }
      if (!doc || !doc.head || doc.getElementById('apk-frame-css')) return;
      var l = doc.createElement('link');
      l.id = 'apk-frame-css';
      l.rel = 'stylesheet';
      l.href = new URL('css/apk-frame.css', location.href).href;
      doc.head.appendChild(l);
      doc.documentElement.classList.add('gk-apk');
    });
  }

  /* ---------- Coordinación ---------- */
  var pendiente = false;
  function programar() {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(function () {
      pendiente = false;
      iconosMenu();
      actualizarBarra();
      engancharHoja();
      estiloIframes();
    });
  }
  function init() {
    montarBarra();
    iconosMenu();
    engancharHoja();
    avisarTema();
    var obs = new MutationObserver(programar);
    obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
    document.addEventListener('load', function (e) { if (e.target && e.target.tagName === 'IFRAME') programar(); }, true);
    programar();
    /* v1.0: revisar al iniciar sesión (la página de login se oculta). */
    if (!tieneActualizador) {
      var login = $('login-page');
      var revisar = function () { if (login && login.classList.contains('hidden')) revisarLegado(false); };
      if (login) new MutationObserver(revisar).observe(login, { attributes: true, attributeFilter: ['class'] });
      setTimeout(revisar, 4000);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  window.GKApk = { atras: atras, buscarActualizacion: buscarActualizacion, version: versionApp };
})();
