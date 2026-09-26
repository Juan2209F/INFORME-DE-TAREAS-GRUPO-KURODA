/* Inventarios de activos dentro del Monitor — Grupo Kuroda
   El botón "📦 Activos" del menú lateral abre la vista "activos": la app del proyecto
   ACTIVOS-GRUPOKURODA (assets/activos.html?embed=1) en un iframe a toda la altura disponible.
   Se precarga oculta poco después de iniciar sesión para que abra al instante.

   Sesión única: ACTIVOS usa la misma sesión de Supabase Auth del Monitor; no tiene cuentas
   propias. Su perfil lo genera el Monitor según el rol.

   Acceso: admin, admin_auditor, auditor, sistemas y viewer (viewer en SOLO CONSULTA).
   Depende de: js/app-core.js (_sb, _session, VIEW, setView, applyVistasRestriction, doLogout). */
(function () {
  'use strict';

  var TOKEN_KEY = 'kc_token';
  var AUTH_KEY = 'kuroda-activos-auth'; /* sesión de Supabase Auth de la app de activos */
  var ROLES = ['admin', 'admin_auditor', 'auditor', 'sistemas', 'viewer'];
  var $ = function (id) { return document.getElementById(id); };
  var puedeVer = function () { return typeof _session !== 'undefined' && _session && ROLES.indexOf(_session.rol) >= 0; };
  var oscuro = function () { return document.documentElement.getAttribute('data-theme') === 'dark'; };

  function leerToken() {
    try {
      var t = JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null');
      return t && _session && t.u === _session.username ? t.t : null;
    } catch (e) { return null; }
  }
  /* El token se pide al iniciar sesión (app-correos.js, envoltura de doLogin) justo después
     de entrar; si Activos se abre en ese instante se espera a que llegue en vez de pedir
     la contraseña otra vez. */
  async function esperarToken(ms) {
    for (var t = 0; t < ms; t += 250) {
      var tok = leerToken();
      if (tok) return tok;
      await new Promise(function (ok) { setTimeout(ok, 250); });
    }
    return leerToken();
  }
  async function pedirToken(pass) {
    var c = _sb || (typeof initSupabase === 'function' ? initSupabase() : null);
    if (!c) return null;
    var r = await c.rpc('crear_token_correos', { p_user: _session.username, p_pass: pass });
    if (r.error || !r.data) return null;
    try { localStorage.setItem(TOKEN_KEY, JSON.stringify({ u: _session.username, t: r.data })); } catch (e) {}
    return r.data;
  }

  function iframe() { return $('iframe-activos'); }
  function enviar(msg) {
    var f = iframe();
    if (f && f.contentWindow) try { f.contentWindow.postMessage(msg, location.origin); } catch (e) {}
  }

  /* Alto: del borde superior del iframe al final de la ventana (html/body tienen zoom). */
  function ajustarAlto() {
    var f = iframe();
    if (!f || !f.offsetWidth) return;
    var r = f.getBoundingClientRect();
    var z = r.width / f.offsetWidth || 1;
    f.style.height = Math.max(420, Math.floor((window.innerHeight - r.top - 14) / z)) + 'px';
  }

  function pintarAuth(err) {
    var fila = $('act-pass') && $('act-pass').parentNode; if (fila) fila.style.display = '';
    $('act-auth').style.display = 'block';
    $('act-frame').style.display = 'none';
    $('act-err').textContent = err || '';
    var p = $('act-pass'); if (p) { p.value = ''; p.focus(); }
  }
  function cargar() {
    $('act-auth').style.display = 'none';
    $('act-frame').style.display = 'block';
    var f = iframe();
    if (!f.getAttribute('src')) f.src = 'assets/activos.html?embed=1&v=' + Date.now();
    setTimeout(ajustarAlto, 30);
  }
  async function entrar() {
    var p = $('act-pass'), pass = p ? p.value : '';
    if (!pass) return;
    $('act-err').textContent = 'Verificando…';
    var t = await pedirToken(pass);
    if (!t) { $('act-err').textContent = 'Contraseña incorrecta o sin permiso.'; return; }
    cargar();
  }
  /* Descarga la app de activos y su sesión (al salir o cambiar de usuario). */
  function descargar() {
    var f = iframe();
    if (f && f.getAttribute('src')) { f.src = 'about:blank'; f.removeAttribute('src'); }
    try { localStorage.removeItem(AUTH_KEY); localStorage.removeItem('kuroda-activos-user'); } catch (e) {}
  }
  /* Precarga: después de iniciar sesión la app de activos se va cargando oculta, para que al
     dar clic en "Activos" ya esté lista. */
  function precargar() {
    var f = iframe();
    if (!f || f.getAttribute('src') || !puedeVer() || !leerToken()) return;
    cargar();
  }

  function mostrarVista(visible) {
    var v = $('view-activos');
    if (!v) return;
    var antes = v.style.display !== 'none';
    v.style.display = visible ? 'block' : 'none';
    var na = $('nav-activos'); if (na) na.classList.toggle('active', visible);
    if (visible) {
      if (!antes) {
        $('act-auth').style.display = 'none';
        esperarToken(8000).then(function (t) {
          if ($('view-activos').style.display === 'none') return;
          if (t) cargar(); else pintarAuth('');
        });
      }
      else setTimeout(ajustarAlto, 30);
    }
  }

  function montar() {
    if ($('view-activos')) return;
    var ref = $('view-documentos') || $('view-generador') || $('view-dash');
    var d = document.createElement('div');
    d.id = 'view-activos';
    d.style.display = 'none';
    d.innerHTML =
      '<div class="card kc-panel">' +
      '<div class="kc-hdr"><span style="font-size:18px">📦</span><h3>Inventarios de activos</h3></div>' +
      '<div id="act-auth" style="display:none;padding:22px 20px">' +
      '<p style="font-size:13px;color:var(--muted);margin:0 0 10px">Confirma tu contraseña una sola vez para activar el acceso a Inventarios de activos en este navegador.</p>' +
      '<div class="kc-row"><input type="password" id="act-pass" class="kc-in" placeholder="Contraseña" autocomplete="current-password" style="width:240px">' +
      '<button id="act-go" class="kc-btn kc-pri">Continuar</button></div>' +
      '<div id="act-err" style="font-size:12px;color:var(--red);min-height:18px;margin-top:8px"></div></div>' +
      '<div id="act-frame" style="display:none"><iframe id="iframe-activos" title="Inventarios de activos" ' +
      'style="width:100%;height:640px;border:0;display:block;background:transparent"></iframe></div></div>';
    if (ref && ref.parentNode) ref.parentNode.insertBefore(d, ref.nextSibling);
    else document.body.appendChild(d);

    d.addEventListener('click', function (e) {
      if (e.target.id === 'act-go') return entrar();
    });
    d.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.id === 'act-pass') entrar(); });
    window.addEventListener('resize', function () { if (d.style.display !== 'none') ajustarAlto(); });

    /* Botón "Activos" en el menú lateral (junto a Documentos / Archivero). */
    var refNav = $('nav-archivero') || $('nav-documentos');
    if (refNav && !$('nav-activos')) {
      var n = document.createElement('div');
      n.className = 'nav-item';
      n.id = 'nav-activos';
      n.title = 'Inventarios de activos';
      n.innerHTML = '📦<span class="nav-lbl">Activos</span>';
      n.style.display = 'none';
      n.addEventListener('click', function () { setView('activos'); });
      refNav.parentNode.insertBefore(n, refNav.nextSibling);
    }
  }
  function actualizarMenu() {
    var n = $('nav-activos'); if (n) n.style.display = puedeVer() ? '' : 'none';
  }

  window.addEventListener('message', function (ev) {
    var m = ev.data;
    if (ev.origin !== location.origin || !m || typeof m !== 'object') return;
    if (m.type === 'abrir-activos') {
      if (puedeVer()) setView('activos');
    } else if (m.type === 'activos-ready' && ev.source === (iframe() || {}).contentWindow) {
      esperarToken(8000).then(function (t) {
        if (t && puedeVer()) enviar({ type: 'activos-auth', user: _session.username, token: t, dark: oscuro() });
        else pintarAuth('');
      });
    } else if (m.type === 'activos-no-auth') {
      descargar();
      if (m.relogin) {
        /* Sin sesión de Supabase Auth: la contraseña sola no la recupera, hay que volver a entrar. */
        pintarAuth(m.error);
        var fila = $('act-pass') && $('act-pass').parentNode; if (fila) fila.style.display = 'none';
        return;
      }
      try { localStorage.removeItem(TOKEN_KEY); } catch (e) {}
      pintarAuth(m.error || 'Tu acceso venció. Confirma tu contraseña para continuar.');
    }
  });

  /* Mismo tema que el resto del Monitor. */
  new MutationObserver(function () { enviar({ type: 'theme', dark: oscuro() }); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  /* ---------- Enganches con app-core.js (encadenados con correos/archivero) ---------- */
  function enganchar() {
    if (typeof window.setView === 'function' && !window.setView._act) {
      var sv = window.setView;
      window.setView = function (v) {
        if (v === 'activos' && !puedeVer()) v = 'documentos';
        var r = sv.apply(this, [v].concat([].slice.call(arguments, 1)));
        mostrarVista(v === 'activos');
        return r;
      };
      window.setView._act = true;
    }
    /* "activos" no está en la lista de vistas de app-core: durante la restricción se usa una
       vista que ese rol sí tiene (sistemas: documentos; los demás: inicio) para que no redirija. */
    if (typeof window.applyVistasRestriction === 'function' && !window.applyVistasRestriction._act) {
      var avr = window.applyVistasRestriction;
      window.applyVistasRestriction = function () {
        var enAct = typeof VIEW !== 'undefined' && VIEW === 'activos';
        if (enAct) VIEW = _session && _session.rol === 'sistemas' ? 'documentos' : 'dash';
        var r = avr.apply(this, arguments);
        if (enAct) { VIEW = 'activos'; if (!puedeVer()) setView('dash'); }
        actualizarMenu();
        /* Tras entrar, Activos se va cargando oculto para que al dar clic ya esté listo. */
        setTimeout(precargar, 2500);
        return r;
      };
      window.applyVistasRestriction._act = true;
    }
    if (typeof window.doLogout === 'function' && !window.doLogout._act) {
      var lo = window.doLogout;
      window.doLogout = function () {
        if (typeof VIEW !== 'undefined' && VIEW === 'activos') setView('dash');
        descargar();
        var r = lo.apply(this, arguments);
        actualizarMenu();
        return r;
      };
      window.doLogout._act = true;
    }
  }

  function init() { montar(); enganchar(); actualizarMenu(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
