/* Inventarios de activos dentro del Monitor — Grupo Kuroda
   La tarjeta "Inventarios de Activos" de Documentos (assets/documentos.html) avisa con
   postMessage({type:'abrir-activos'}) y aquí se abre la vista "activos": la app del proyecto
   ACTIVOS-GRUPOKURODA (assets/activos.html?embed=1) en un iframe a toda la altura disponible.

   Sesión única: el iframe pide el acceso ('activos-ready') y se le entrega el token de sesión del
   Monitor (localStorage "kc_token", el mismo del archivero). Con él, la Edge Function
   "activos-sesion" abre su sesión de Supabase Auth sin volver a pedir contraseña.
   Si no hay token, se pide la contraseña una sola vez (igual que en el archivero).

   Acceso: admin, admin_auditor, auditor y sistemas.
   Depende de: js/app-core.js (_sb, _session, VIEW, setView, applyVistasRestriction, doLogout). */
(function () {
  'use strict';

  var TOKEN_KEY = 'kc_token';
  var AUTH_KEY = 'kuroda-activos-auth'; /* sesión de Supabase Auth de la app de activos */
  var ROLES = ['admin', 'admin_auditor', 'auditor', 'sistemas'];
  var $ = function (id) { return document.getElementById(id); };
  var puedeVer = function () { return typeof _session !== 'undefined' && _session && ROLES.indexOf(_session.rol) >= 0; };
  var oscuro = function () { return document.documentElement.getAttribute('data-theme') === 'dark'; };

  function leerToken() {
    try {
      var t = JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null');
      return t && _session && t.u === _session.username ? t.t : null;
    } catch (e) { return null; }
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
    try { localStorage.removeItem(AUTH_KEY); } catch (e) {}
  }

  function mostrarVista(visible) {
    var v = $('view-activos');
    if (!v) return;
    var antes = v.style.display !== 'none';
    v.style.display = visible ? 'block' : 'none';
    if (visible) {
      /* Es parte de Documentos: se queda marcado ese botón del menú. */
      var nd = $('nav-documentos'); if (nd) nd.classList.add('active');
      if (!antes) { if (leerToken()) cargar(); else pintarAuth(''); }
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
      '<div class="kc-hdr"><button type="button" class="kc-btn" id="act-volver">← Documentos</button>' +
      '<span style="font-size:18px">📦</span><h3>Inventarios de activos</h3></div>' +
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
      if (e.target.id === 'act-volver') return setView('documentos');
    });
    d.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.id === 'act-pass') entrar(); });
    window.addEventListener('resize', function () { if (d.style.display !== 'none') ajustarAlto(); });
  }

  window.addEventListener('message', function (ev) {
    var m = ev.data;
    if (ev.origin !== location.origin || !m || typeof m !== 'object') return;
    if (m.type === 'abrir-activos') {
      if (puedeVer()) setView('activos');
    } else if (m.type === 'activos-ready' && ev.source === (iframe() || {}).contentWindow) {
      var t = leerToken();
      if (t && puedeVer()) enviar({ type: 'activos-auth', user: _session.username, token: t, dark: oscuro() });
      else pintarAuth('');
    } else if (m.type === 'activos-no-auth') {
      try { localStorage.removeItem(TOKEN_KEY); } catch (e) {}
      descargar();
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
    /* "activos" no está en la lista de vistas de app-core: durante la restricción se usa
       "documentos" (de donde se abre) para que no redirija. */
    if (typeof window.applyVistasRestriction === 'function' && !window.applyVistasRestriction._act) {
      var avr = window.applyVistasRestriction;
      window.applyVistasRestriction = function () {
        var enAct = typeof VIEW !== 'undefined' && VIEW === 'activos';
        if (enAct) VIEW = 'documentos';
        var r = avr.apply(this, arguments);
        if (enAct) { VIEW = 'activos'; if (!puedeVer()) setView('dash'); }
        return r;
      };
      window.applyVistasRestriction._act = true;
    }
    if (typeof window.doLogout === 'function' && !window.doLogout._act) {
      var lo = window.doLogout;
      window.doLogout = function () {
        if (typeof VIEW !== 'undefined' && VIEW === 'activos') setView('dash');
        descargar();
        return lo.apply(this, arguments);
      };
      window.doLogout._act = true;
    }
  }

  function init() { montar(); enganchar(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
