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
   8) Pantallas anchas y teléfono girado: siempre el diseño de teléfono, escalado a la pantalla.
   9) Entrar con huella.  10) Menú lateral con todas las secciones.
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
    if (menu && menu.classList.contains('abierto')) { cerrarMenu(); return true; }
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
      if (document.querySelector('.modal-overlay.show, .kpi-cfg-overlay.show, .usr-overlay.show, .mv-hoja.abierta, #plantilla-overlay, .apk-menu.abierto')) return true;
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
      if (dy >= UMBRAL) {
        ind.classList.add('cargando');
        setTimeout(function () { recargar(function () { ind.classList.remove('cargando'); ocultar(); }); }, 150);
      }
      else ocultar();
    }, { passive: true });
  }

  /* Recargar sin salir de la sección. Recargar la página completa cerraba la sesión (al abrir,
     el Monitor pide otra vez la contraseña para descifrar los datos) y todo volvía al inicio.
     Con la sesión abierta se traen los datos nuevos de Supabase (recargarDatos de app-core.js)
     y se vuelve a dibujar la misma sección. */
  function recargar(listo) {
    var act = document.querySelector('nav.sidebar .nav-item.active:not(#nav-mas)');
    if (sesion() && typeof window.recargarDatos === 'function') {
      Promise.resolve().then(function () { return window.recargarDatos(); })
        .catch(function () { if (typeof toast === 'function') toast('⚠ No se pudo recargar. Revisa tu conexión.'); })
        .then(function () {
          /* Inicio ya se redibuja con los datos nuevos; las demás secciones cargan los suyos al abrirse. */
          if (act && act.id !== 'nav-dash') act.click();
          listo();
        });
      return;
    }
    recargarPagina();
  }

  /* Sin sesión abierta (o Monitor sin recargarDatos): recarga completa; se guarda la sección
     abierta y se vuelve a abrir cuando la sesión esté iniciada otra vez. */
  var VOLVER = 'gk-apk-volver';
  function recargarPagina() {
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
      if (++intentos > 1200) return;                     /* ~10 min esperando a que se inicie sesión */
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

  /* ---------- 8) Pantallas anchas (tabletas, plegables, teléfonos acostados muy anchos) ----------
     La app siempre usa el menú y las tablas de teléfono (js/app-movil.js), pero el diseño de
     teléfono (css/movil.css) solo aplica hasta 768 px, o 1024 px acostado. En pantallas más
     anchas se mezclaban los dos diseños. Ahí se fija la página en 768 px de ancho y Android
     la escala para llenar la pantalla; se vuelve a revisar al girar el teléfono. */
  var MEDIA_MOVIL = '(max-width: 768px), (max-height: 500px) and (max-width: 1024px)';
  var ANCHO_MAX = 768, NORMAL = 'width=device-width, initial-scale=1.0';
  function ajustarAncho() {
    var m = document.querySelector('meta[name="viewport"]');
    if (!m || !window.matchMedia) return;
    if (m.getAttribute('content') !== NORMAL) {
      m.setAttribute('content', NORMAL);
      setTimeout(ajustarAncho, 250);   /* medir con el ancho real del dispositivo */
      return;
    }
    if (!window.matchMedia(MEDIA_MOVIL).matches) m.setAttribute('content', 'width=' + ANCHO_MAX);
  }
  function vigilarGiro() {
    ajustarAncho();
    var alGirar = function () { setTimeout(ajustarAncho, 300); };
    if (window.screen && screen.orientation && screen.orientation.addEventListener) screen.orientation.addEventListener('change', alGirar);
    else window.addEventListener('orientationchange', alGirar);
  }

  /* ---------- 9) Entrar con huella ----------
     La app (Huella.java) guarda la contraseña cifrada con una llave del teléfono que solo se abre
     con la huella. Al entrar con contraseña se ofrece activarla; después, al abrir la app se pide
     la huella y se entra con el mismo inicio de sesión normal (doLogin). */
  var aviso = function (t) { if (typeof toast === 'function') toast(t); };
  var conHuella = function () { return !!(A && typeof A.huellaDisponible === 'function'); };
  var huellaDisp = function () { try { return conHuella() && A.huellaDisponible(); } catch (e) { return false; } };
  /* La app no entrega el usuario guardado (va cifrado); solo dice si hay uno y si es el de esta cuenta. */
  var hayHuella = function () {
    try {
      if (!conHuella()) return false;
      return typeof A.huellaGuardada === 'function' ? !!A.huellaGuardada() : !!A.huellaUsuario();
    } catch (e) { return false; }
  };
  var huellaEsDe = function (u) {
    try { return typeof A.huellaEsDe === 'function' ? !!A.huellaEsDe(u) : A.huellaUsuario() === u; } catch (e) { return false; }
  };
  var entrandoConHuella = false;
  var entro = function () { var l = $('login-page'); return !!(l && l.classList.contains('hidden')); };

  function engancharLogin() {
    if (!conHuella() || typeof window.doLogin !== 'function' || window.doLogin.__huella) return;
    var entrar = window.doLogin;
    window.doLogin = function () {
      var u = (($('lp-user') || {}).value || '').trim(), p = ($('lp-pass') || {}).value || '';
      var r = entrar.apply(this, arguments);
      Promise.resolve(r).then(function () { alTerminarLogin(u, p); p = null; });
      return r;
    };
    window.doLogin.__huella = true;
  }
  function alTerminarLogin(u, p) {
    var porHuella = entrandoConHuella;
    entrandoConHuella = false;
    if (!entro()) {
      /* La contraseña guardada ya no sirve (se cambió): se borra y se entra con la nueva. */
      if (porHuella && /incorrect/i.test(($('lp-err') || {}).textContent || '')) {
        try { A.quitarHuella(); } catch (e) {}
        var err = $('lp-err');
        if (err) err.textContent = 'Tu contraseña cambió: entra con la nueva y vuelve a activar la huella.';
        botonHuella();
      }
      return;
    }
    if (porHuella || !u || !p || !huellaDisp() || huellaEsDe(u)) return;
    try { if (localStorage.getItem('gk-huella-no') === u) return; } catch (e) {}
    ofrecerHuella(u, p);
  }
  function ofrecerHuella(u, p) {
    if (typeof openModal !== 'function') return;
    setTimeout(function () {
      openModal('👆 Entrar con huella',
        '<p style="font-size:13.5px;line-height:1.55">¿Quieres entrar con tu huella las próximas veces, sin escribir la contraseña?</p>' +
        '<p style="font-size:12.5px;color:var(--muted);margin-top:8px;line-height:1.5">Tu contraseña se guarda cifrada en este teléfono y solo se abre con tu huella. Puedes quitarla cuando quieras desde el menú.</p>',
        [{ label: 'Ahora no', cls: 'btn-ghost', fn: function () { closeModal(); try { localStorage.setItem('gk-huella-no', u); } catch (e) {} p = null; } },
         { label: 'Activar', cls: 'btn-blue', fn: function () { closeModal(); try { A.activarHuella(u, p); } catch (e) {} p = null; } }],
        { maxWidth: '420px' });
    }, 1500);
  }
  function pedirHuella() { try { A.entrarConHuella(); } catch (e) {} }
  /* Botón "Entrar con huella" debajo de "Ingresar". */
  function botonHuella() {
    var btn = $('lp-btn'), h = $('apk-huella');
    if (!btn || !hayHuella() || !huellaDisp()) { if (h) h.remove(); return; }
    if (!h) {
      h = document.createElement('button');
      h.type = 'button';
      h.id = 'apk-huella';
      h.className = 'lp-btn apk-huella-btn';
      h.innerHTML = '<span aria-hidden="true">👆</span> Entrar con huella';
      h.addEventListener('click', function (e) { e.stopPropagation(); pedirHuella(); });
      btn.parentNode.insertBefore(h, btn.nextSibling);
    }
  }
  /* Respuesta de la app: accion 'activar' | 'entrar'. */
  function huella(accion, ok, usuario, valor, borrada) {
    if (accion === 'activar') {
      if (ok) { aviso('✓ Inicio con huella activado'); try { localStorage.removeItem('gk-huella-no'); } catch (e) {} }
      else if (valor) aviso('⚠ ' + valor);
      return;
    }
    if (!ok) {
      var err = $('lp-err');
      if (valor && err) err.textContent = valor;
      if (borrada) botonHuella();
      return;
    }
    var lu = $('lp-user'), lp = $('lp-pass');
    if (!lu || !lp || entro() || typeof window.doLogin !== 'function') return;
    lu.value = usuario;
    lp.value = valor;
    entrandoConHuella = true;
    Promise.resolve(window.doLogin()).then(function () { lp.value = ''; }, function () { lp.value = ''; });
  }
  function alternarHuella() {
    if (hayHuella()) { try { A.quitarHuella(); } catch (e) {} aviso('Inicio con huella desactivado'); return; }
    var ses = sesion(), u = ses && ses.username ? ses.username : '';
    var p = window.prompt('Escribe tu contraseña para activar el inicio con huella');
    if (u && p) try { A.activarHuella(u, p); } catch (e) {}
  }
  function montarHuella() {
    if (!conHuella()) return;
    engancharLogin();
    botonHuella();
    var login = $('login-page');
    if (login) new MutationObserver(botonHuella).observe(login, { attributes: true, attributeFilter: ['class'] });
    /* Al abrir la app con huella guardada: se pide de una vez. */
    if (!entro() && hayHuella() && huellaDisp()) setTimeout(pedirHuella, 700);
  }

  /* ---------- 10) Menú lateral ----------
     Se abre con el botón ☰ de la barra superior o con "Más" del menú inferior. Lista todas las
     secciones que la cuenta puede ver, con los colores del Monitor. */
  var menu = null;
  var itemsNav = function () {
    return Array.prototype.filter.call(document.querySelectorAll('nav.sidebar .nav-item'), function (n) {
      return n.id && n.id !== 'nav-mas' && n.style.display !== 'none';
    });
  };
  function icono(n) {
    var ap = n.querySelector('.apk-ico');
    if (ap) return ap.textContent.trim();
    for (var i = 0; i < n.childNodes.length; i++) {
      var c = n.childNodes[i];
      if (c.nodeType === 3 && c.textContent.trim()) return c.textContent.trim();
    }
    return '•';
  }
  function etiqueta(n) { var l = n.querySelector('.nav-lbl'); return l ? l.textContent.trim() : (n.title || ''); }
  function abrirMenu() {
    if (!menu || !entro()) return;
    var u = $('topbar-user'), sp = u ? u.querySelectorAll('span') : [];
    var nombre = (sp[0] ? sp[0].textContent : (u ? u.textContent : '')).trim();
    var rol = sp[1] ? sp[1].textContent.trim() : '';
    var ses = sesion(), correo = ses && (ses.email || ses.correo) ? (ses.email || ses.correo) : '';
    var oscuro = html.getAttribute('data-theme') === 'dark';
    menu.querySelector('.apk-menu-hdr').innerHTML =
      '<div class="apk-menu-av">' + esc((nombre || '?').charAt(0).toUpperCase()) + '</div>' +
      '<div class="apk-menu-quien"><b>' + esc(nombre) + '</b>' + (rol ? '<small>' + esc(rol) + '</small>' : '') +
      (correo ? '<span>' + esc(correo) + '</span>' : '') + '</div>' +
      '<button type="button" class="apk-menu-cerrar" aria-label="Cerrar menú">‹</button>';
    var lista = itemsNav().map(function (n) {
      return '<button type="button" data-ir="' + esc(n.id) + '"' + (n.classList.contains('active') ? ' class="activo"' : '') +
        '><i>' + esc(icono(n)) + '</i><span>' + esc(etiqueta(n)) + '</span></button>';
    }).join('');
    /* Opciones de la app al final de la lista; abajo fijo solo "Cerrar sesión" (como en la foto). */
    lista += '<div class="apk-menu-sep">Ajustes de la app</div>';
    if (huellaDisp()) lista += '<button type="button" data-ir="huella"><i>👆</i><span>' + (hayHuella() ? 'Quitar inicio con huella' : 'Activar inicio con huella') + '</span></button>';
    lista += '<button type="button" data-ir="tema"><i>' + (oscuro ? '☀️' : '🌙') + '</i><span>' + (oscuro ? 'Modo claro' : 'Modo oscuro') + '</span></button>';
    lista += '<button type="button" data-ir="actualizar"><i>⬆️</i><span>Buscar actualizaciones</span></button>';
    menu.querySelector('.apk-menu-lista').innerHTML = lista;
    menu.querySelector('.apk-menu-pie').innerHTML =
      '<button type="button" data-ir="salir" class="apk-menu-salir"><i>🚪</i><span>Cerrar sesión</span><small>v' + esc(versionApp()) + '</small></button>';
    menu.classList.add('abierto');
  }
  function cerrarMenu() { if (menu) menu.classList.remove('abierto'); }
  function accionMenu(ir) {
    if (ir === 'salir') { if (typeof window.doLogout === 'function') window.doLogout(); return; }
    if (ir === 'tema') { var t = document.querySelector('.theme-toggle'); if (t) t.click(); return; }
    if (ir === 'actualizar') { buscarActualizacion(); return; }
    if (ir === 'huella') { alternarHuella(); return; }
    var n = $(ir);
    if (n) { n.click(); window.scrollTo(0, 0); }
  }
  function montarMenuLateral() {
    menu = document.createElement('div');
    menu.id = 'apk-menu';
    menu.className = 'apk-menu';
    menu.innerHTML = '<div class="apk-menu-fondo"></div><aside class="apk-menu-panel" role="dialog" aria-label="Menú">' +
      '<div class="apk-menu-hdr"></div><nav class="apk-menu-lista"></nav><div class="apk-menu-pie"></div></aside>';
    document.body.appendChild(menu);
    menu.addEventListener('click', function (e) {
      var t = e.target;
      if (t.classList.contains('apk-menu-fondo') || t.closest('.apk-menu-cerrar')) { cerrarMenu(); return; }
      var b = t.closest('[data-ir]');
      if (!b) return;
      var ir = b.getAttribute('data-ir');
      cerrarMenu();
      setTimeout(function () { accionMenu(ir); }, 200);   /* después de la animación de cierre */
    });
    var barra = document.querySelector('.topbar');
    if (barra && !$('apk-hamb')) {
      var h = document.createElement('button');
      h.type = 'button';
      h.id = 'apk-hamb';
      h.className = 'apk-hamb';
      h.setAttribute('aria-label', 'Abrir menú');
      h.innerHTML = '<span></span><span></span><span></span>';
      h.addEventListener('click', abrirMenu);
      barra.insertBefore(h, barra.firstChild);
    }
    /* "Más" del menú inferior abre este menú (en vez de la hoja de js/app-movil.js). */
    document.addEventListener('click', function (e) {
      if (!e.target.closest || !e.target.closest('#nav-mas')) return;
      e.preventDefault();
      e.stopPropagation();
      abrirMenu();
    }, true);
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
    vigilarGiro();
    montarMenuLateral();
    montarHuella();
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

  window.GKApk = { atras: atras, buscarActualizacion: buscarActualizacion, version: versionApp, ir: ir,
    huella: huella, abrirMenu: abrirMenu, cerrarMenu: cerrarMenu };
})();
