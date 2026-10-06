/* App Android (APK) — Grupo Kuroda
   Mismo estilo que el Monitor (css/movil.css + js/app-movil.js), acomodado como app (css/apk.css).
   Este archivo agrega lo que necesita la app:
   1) Marca <html class="gk-apk"> para que js/app-movil.js use siempre la vista de teléfono.
   2) Botón Atrás de Android: cierra la ventana abierta o regresa a Inicio (GKApk.atras).
   3) Tema claro/oscuro: avisa a la app para pintar las barras del sistema igual (GKAndroid.tema).
   4) "Buscar actualizaciones" (GKApk.buscarActualizacion) y, para la app v1.0 que no se actualiza
      sola, un aviso con la ventana normal del Monitor para descargar la versión nueva.
   5) Nombre de la sección en la barra superior.  6) Deslizar hacia abajo para recargar.
   7) Notificaciones: registra el teléfono en Supabase al iniciar sesión y abre la sección avisada.
   En el navegador no hace nada. */
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

  /* ---------- 3) Tema ---------- */
  function avisarTema() { try { if (A && A.tema) A.tema(html.getAttribute('data-theme') === 'dark'); } catch (e) {} }
  new MutationObserver(avisarTema).observe(html, { attributes: true, attributeFilter: ['data-theme'] });

  /* ---------- 2) Botón Atrás ---------- */
  function atras() {
    if (document.querySelector('.mv-hoja.abierta') && window.__kgMovil) { window.__kgMovil.cerrarHoja(); return true; }
    var pl = $('plantilla-overlay');
    if (pl) { pl.remove(); return true; }
    var abiertas = Array.prototype.slice.call(document.querySelectorAll('.modal-overlay.show, .kpi-cfg-overlay.show, .usr-overlay.show'));
    if (abiertas.length) {
      abiertas.sort(function (a, b) { return (parseInt(getComputedStyle(b).zIndex, 10) || 0) - (parseInt(getComputedStyle(a).zIndex, 10) || 0); });
      var ov = abiertas[0];
      var cerrar = { 'modal-overlay': 'closeModal', 'kpi-cfg-overlay': 'closeKpiCfg', 'aud-modal-overlay': 'closeNuevaAuditoria',
        'eu-overlay': 'closeEditUsuario', 'ar-overlay': 'closeAsignarRazonMasiva' }[ov.id];
      if (cerrar && typeof window[cerrar] === 'function') window[cerrar]();
      else ov.classList.remove('show');
      return true;
    }
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

  /* ---------- 4) Actualizaciones ---------- */
  function buscarActualizacion() {
    if (tieneActualizador) { try { A.buscarActualizacion(); } catch (e) {} return; }
    revisarLegado(true);
  }
  /* App v1.0: lee latest.json y ofrece descargar el APK nuevo con la ventana normal del Monitor. */
  function revisarLegado(manual) {
    if (tieneActualizador) return;
    var hoy = new Date().toISOString().slice(0, 10);
    try { if (!manual && localStorage.getItem('gk-apk-aviso') === hoy) return; } catch (e) {}
    fetch(URL_INFO + '?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (!j || !j.url || String(j.versionName) === versionApp()) {
          if (manual && typeof toast === 'function') toast(j ? '✓ Ya tienes la versión más reciente' : 'No se pudo revisar. Intenta más tarde.');
          return;
        }
        try { localStorage.setItem('gk-apk-aviso', hoy); } catch (e) {}
        if (typeof openModal !== 'function') return;
        var notas = Array.isArray(j.notas) ? j.notas : (j.notas ? [j.notas] : []);
        openModal('⬆️ Nueva versión <b>' + esc(j.versionName) + '</b> de la app',
          '<p style="font-size:13.5px;line-height:1.55">Esta versión de la app no se actualiza sola. Descarga la nueva una sola vez; ' +
          'a partir de ella las actualizaciones se instalan desde la propia app.</p>' +
          (notas.length ? '<ul style="margin:10px 0 0 18px;font-size:13.5px;line-height:1.6">' +
            notas.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>' : '') +
          '<p style="font-size:12.5px;color:var(--muted);margin-top:12px;line-height:1.5">Al terminar la descarga toca la notificación para instalar. ' +
          'Si Android dice que «entra en conflicto con un paquete existente», desinstala la app anterior e instala la nueva.</p>',
          [{ label: 'Más tarde', cls: 'btn-ghost', fn: function () { closeModal(); } },
           { label: 'Descargar', cls: 'btn-blue', fn: function () { closeModal(); location.href = j.url; } }],
          { maxWidth: '480px' });
      }).catch(function () { if (manual && typeof toast === 'function') toast('Sin conexión para revisar actualizaciones'); });
  }

  /* ---------- 5) Barra superior: nombre de la sección abierta ---------- */
  function seccion() {
    var tit = document.querySelector('.topbar-title');
    if (!tit) return;
    var s = $('apk-seccion');
    if (!s) { s = document.createElement('small'); s.id = 'apk-seccion'; tit.appendChild(s); }
    var n = document.querySelector('nav.sidebar .nav-item.active:not(#nav-mas) .nav-lbl');
    var usr = $('usr-overlay');
    var t = usr && usr.classList.contains('show') ? 'Usuarios' : (n ? n.textContent.trim() : 'Inicio');
    if (s.textContent !== t) s.textContent = t;
  }

  /* ---------- 6) Deslizar hacia abajo para recargar ----------
     Solo desde el tope de la página y sin ventanas abiertas. Los eventos son "passive": nunca
     bloquean el desplazamiento normal. */
  function montarRecarga() {
    var UMBRAL = 90, ind = document.createElement('div'), y0 = null, dy = 0;
    ind.className = 'apk-ptr';
    ind.innerHTML = '<span>↻</span>';
    document.body.appendChild(ind);
    var bloqueado = function (t) {
      if (window.scrollY > 0) return true;
      if (document.querySelector('.modal-overlay.show, .kpi-cfg-overlay.show, .usr-overlay.show, .mv-hoja.abierta, #plantilla-overlay')) return true;
      var login = $('login-page');
      if (login && !login.classList.contains('hidden')) return true;
      return !!(t && t.closest && t.closest('iframe, textarea, select, input, .tbl-scroll, .ajustes-table-wrap'));
    };
    var ocultar = function () {
      ind.style.transition = 'transform .25s ease, opacity .25s ease';
      ind.style.opacity = '0';
      ind.style.transform = 'translateY(-60px)';
      ind.classList.remove('listo');
    };
    document.addEventListener('touchstart', function (e) {
      y0 = (e.touches.length === 1 && !bloqueado(e.target)) ? e.touches[0].clientY : null;
      dy = 0;
    }, { passive: true });
    document.addEventListener('touchmove', function (e) {
      if (y0 === null) return;
      dy = e.touches[0].clientY - y0;
      if (dy <= 0 || window.scrollY > 0) { y0 = null; ocultar(); return; }
      var p = Math.min(dy, UMBRAL * 1.4);
      ind.style.transition = 'none';
      ind.style.opacity = String(Math.min(1, p / UMBRAL));
      ind.style.transform = 'translateY(' + (p - 40) + 'px)';
      ind.firstChild.style.transform = 'rotate(' + (p * 3) + 'deg)';
      ind.classList.toggle('listo', dy >= UMBRAL);
    }, { passive: true });
    document.addEventListener('touchend', function () {
      if (y0 === null) return;
      y0 = null;
      if (dy >= UMBRAL) { ind.classList.add('cargando'); setTimeout(recargar, 150); }
      else ocultar();
    }, { passive: true });
  }

  /* Recargar sin perder el lugar: se guarda la sección abierta y, al volver a cargar (cuando la
     sesión ya está restaurada), se abre la misma sección en vez de Inicio. */
  var VOLVER = 'gk-apk-volver';
  function recargar() {
    try {
      var usr = $('usr-overlay');
      var n = document.querySelector('nav.sidebar .nav-item.active:not(#nav-mas)');
      var sec = usr && usr.classList.contains('show') ? 'usuarios' : (n && n.id ? n.id : '');
      sessionStorage.setItem(VOLVER, sec);
    } catch (e) {}
    location.reload();
  }
  function volverASeccion() {
    var sec = '';
    try { sec = sessionStorage.getItem(VOLVER) || ''; sessionStorage.removeItem(VOLVER); } catch (e) {}
    if (!sec || sec === 'nav-dash') return;
    var intentos = 0, abierta = 0;
    (function probar() {
      if (++intentos > 60) return;                       /* ~30 s: sesión no restaurada, se queda en Inicio */
      var login = $('login-page');
      var n = sec === 'usuarios' ? $('nav-dash') : $(sec);
      if ((login && !login.classList.contains('hidden')) || !n || n.style.display === 'none') { setTimeout(probar, 500); return; }
      if (sec === 'usuarios') {
        if (typeof window.openUsuarios === 'function') window.openUsuarios();
        return;
      }
      /* Al terminar de entrar, el Monitor abre Inicio: se insiste unos segundos hasta que la
         sección quede abierta. */
      var act = document.querySelector('nav.sidebar .nav-item.active:not(#nav-mas)');
      if (!act || act.id === 'nav-dash') { n.click(); window.scrollTo(0, 0); abierta = 0; }
      if (++abierta < 6) setTimeout(probar, 500);
    })();
  }

  /* ---------- 7) Notificaciones de cambios ----------
     Al iniciar sesión se registra este teléfono en Supabase (función registrar_dispositivo) con el
     usuario y sus razones sociales; al cerrar sesión se quita. La Edge Function notificar-push avisa
     a todos los teléfonos registrados menos al de quien hizo el cambio. */
  var sbCliente = function () { return typeof _sb !== 'undefined' ? _sb : null; };
  var sesion = function () { return typeof _session !== 'undefined' ? _session : null; };
  var tokenPush = function () { try { return A && A.tokenPush ? A.tokenPush() : ''; } catch (e) { return ''; } };
  var registrado = '';
  function registrarAvisos() {
    if (!A || typeof A.tokenPush !== 'function') return;     /* app sin notificaciones (v1.1.0 o anterior) */
    var sb = sbCliente(), ses = sesion();
    if (!sb || !ses) return;
    var intentos = 0;
    (function probar() {
      var t = tokenPush();
      /* Sin Firebase configurado no hay token: no se pide permiso ni se registra nada. */
      if (!t) { if (++intentos < 15) setTimeout(probar, 3000); return; }
      try { A.pedirPermisoAvisos(); } catch (e) {}
      if (registrado === t + '|' + ses.username) return;
      var raz = ses.razones_permitidas;
      if (typeof raz === 'string') raz = raz.split(/[,;\s]+/);
      raz = Array.isArray(raz) ? raz.map(function (x) { return String(x).trim(); }).filter(Boolean) : [];
      sb.rpc('registrar_dispositivo', { p_token: t, p_usuario: ses.username || null, p_razones: raz })
        .then(function (r) { if (!r.error) registrado = t + '|' + ses.username; });
    })();
  }
  function quitarAvisos() {
    var sb = sbCliente(), t = tokenPush();
    registrado = '';
    if (sb && t) try { sb.rpc('quitar_dispositivo', { p_token: t }); } catch (e) {}
  }
  function engancharSalida() {
    if (typeof window.doLogout !== 'function' || window.doLogout.__apk) return;
    var salir = window.doLogout;
    window.doLogout = function () { quitarAvisos(); return salir.apply(this, arguments); };
    window.doLogout.__apk = true;
  }
  /* Al tocar una notificación: ir a su sección (la llama la app). */
  function ir(sec) {
    var login = $('login-page');
    if (!login || !login.classList.contains('hidden')) return false;
    var mapa = { tareas: 'nav-tareas', auditorias: 'nav-auditorias', actividades: 'nav-actividades',
      ajustes: 'nav-ajustes', mermas: 'nav-mermas', activos: 'nav-activos' };
    var n = $(mapa[sec] || '');
    if (!n || n.style.display === 'none') return true;
    n.click();
    window.scrollTo(0, 0);
    return true;
  }

  function init() {
    avisarTema();
    seccion();
    montarRecarga();
    volverASeccion();
    engancharSalida();
    var loginAv = $('login-page');
    var alEntrar = function () { if (loginAv && loginAv.classList.contains('hidden')) setTimeout(registrarAvisos, 1500); };
    if (loginAv) new MutationObserver(alEntrar).observe(loginAv, { attributes: true, attributeFilter: ['class'] });
    setTimeout(alEntrar, 3000);
    var nav = document.querySelector('nav.sidebar');
    if (nav) new MutationObserver(seccion).observe(nav, { subtree: true, attributes: true, attributeFilter: ['class'] });
    var usr = $('usr-overlay');
    if (usr) new MutationObserver(seccion).observe(usr, { attributes: true, attributeFilter: ['class'] });
    if (!tieneActualizador) {
      var login = $('login-page');
      var revisar = function () { if (login && login.classList.contains('hidden')) revisarLegado(false); };
      if (login) new MutationObserver(revisar).observe(login, { attributes: true, attributeFilter: ['class'] });
      setTimeout(revisar, 4000);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  window.GKApk = { atras: atras, buscarActualizacion: buscarActualizacion, version: versionApp, ir: ir };
})();
