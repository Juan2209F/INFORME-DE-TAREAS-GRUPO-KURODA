/* Integración de "Inventarios de activos" (ACTIVOS-GRUPOKURODA) dentro del Monitor — Grupo Kuroda
   Solo actúa cuando activos.html se abre dentro del Monitor (activos.html?embed=1 en un iframe):
   - Sin pantalla de login: pide al Monitor su token ('activos-ready' → 'activos-auth') y la
     Edge Function "activos-sesion" devuelve un acceso de un solo uso que se canjea con
     supabase.auth.verifyOtp(). La sesión se guarda aparte (storageKey "kuroda-activos-auth").
   - Mismo aspecto que el Monitor: el menú lateral pasa a pestañas arriba, sin tarjeta de usuario
     (ya la muestra el Monitor), sin "Salir", "Usuarios" ni selector de tema (sigue el del Monitor).
   Abierto directo (sin embed) la app funciona igual que el proyecto original. */
(function () {
  'use strict';
  var EMBED = /[?&]embed=1(&|$)/.test(location.search) && window.parent !== window;
  window.ACTIVOS_EMBED = EMBED;
  if (!EMBED) return;

  var FN = 'https://xlygkolfmetytowixtnb.supabase.co/functions/v1/activos-sesion';
  var USER_KEY = 'kuroda-activos-user'; /* usuario del Monitor dueño de la sesión guardada */
  var oscuro = false, entrando = false;
  document.documentElement.classList.add('act-embed');

  var E = 'html.act-embed ';
  var css = document.createElement('style');
  css.textContent =
    E + 'body{--text-main:#344767;background:transparent!important}' +
    E + 'body.dark-mode{--card-bg:#1a1f3c;--active-bg:#4318ff;--active-bg2:#9f7aea;--text-main:#f1f2f8;--input-bg:rgba(255,255,255,.05);--border-color:rgba(255,255,255,.12)}' +
    E + '#login-screen{display:none!important}' +
    E + '#dashboard{height:100vh!important;min-height:0!important}' +
    E + '#dashboard.active{flex-direction:column}' +
    /* Menú lateral → pestañas arriba (como las pestañas de Correos / Archivero del Monitor) */
    E + '.sidebar{position:static!important;width:auto!important;flex-direction:row!important;flex-wrap:wrap;align-items:center;gap:6px;' +
      'padding:10px 14px!important;margin:0 0 12px!important;background:var(--card-bg)!important;color:var(--text-main)!important;' +
      'border:1px solid var(--border-color);border-radius:var(--border-radius);box-shadow:var(--shadow);overflow:visible!important;flex-shrink:0;font-size:.8rem!important}' +
    E + '.sidebar .brand,' + E + '.sidebar .supabase-status,' + E + '.sidebar .dark-toggle,' + E + '.nav-item.logout,' + E + '#nav-usuarios{display:none!important}' +
    E + '.sidebar-separator{flex:1}' +
    E + '.nav-item{margin:0!important;padding:6px 12px!important;border:1px solid var(--border-color);border-radius:10px;color:var(--text-main);font-size:12px;font-weight:600;gap:7px}' +
    E + '.nav-item:hover{background:transparent;border-color:var(--active-bg);color:var(--active-bg)}' +
    E + '.nav-item.active{background:var(--active-bg);border-color:var(--active-bg);color:#fff;box-shadow:none}' +
    E + '.nav-item span{display:inline!important}' +
    E + '.nav-item i{width:auto;font-size:.9rem}' +
    E + '.nav-item .badge{background:rgba(94,114,228,.15);color:var(--active-bg)}' +
    E + '.nav-item.active .badge{background:rgba(255,255,255,.25);color:#fff}' +
    E + '.main-content{margin-left:0!important;width:100%!important;height:auto!important;flex:1;min-height:0;padding:0 2px 16px!important;background:transparent!important}' +
    E + '.topbar-user{display:none!important}' +
    E + '.sidebar .topbar-actions{position:relative}' +
    E + '.sidebar .notif-panel{top:46px}' +
    E + '#ajustes .settings-group:has(.theme-selector){display:none}' +
    E + '#act-estado{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:10000;font-family:Poppins,sans-serif}' +
    E + '#act-estado div{background:var(--card-bg);color:var(--text-main);border:1px solid var(--border-color);border-radius:18px;padding:22px 26px;font-size:13px;max-width:420px;text-align:center;box-shadow:var(--shadow)}' +
    E + '#act-estado.err div{color:var(--danger-color)}' +
    '@media(max-width:768px){' + E + '.nav-item span:not(.badge){display:none!important}}';
  document.head.appendChild(css);

  function estado(txt, error) {
    var el = document.getElementById('act-estado');
    if (!txt) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('div'); el.id = 'act-estado'; el.appendChild(document.createElement('div')); document.body.appendChild(el); }
    el.className = error ? 'err' : '';
    el.firstChild.textContent = txt;
  }
  function aplicarTema(dark) {
    oscuro = !!dark;
    if (typeof setTheme === 'function') setTheme(oscuro ? 'dark' : 'light');
    else document.body.classList.toggle('dark-mode', oscuro);
  }
  function aPadre(msg) { try { window.parent.postMessage(msg, location.origin); } catch (e) {} }

  /* La campana de notificaciones pasa a la barra de pestañas (la tarjeta de usuario se oculta). */
  function moverCampana() {
    var a = document.querySelector('.topbar-actions'), s = document.querySelector('.sidebar');
    if (a && s && a.parentNode !== s) s.appendChild(a);
  }

  async function entrar(m) {
    if (entrando) return;
    entrando = true;
    aplicarTema(m.dark);
    estado('Conectando con Inventarios de activos…');
    try {
      /* Si ya hay sesión de activos de este mismo usuario (se abrió antes y no ha cerrado
         sesión en el Monitor) se reutiliza: sin llamar a la Edge Function ni a verify. */
      var s = (await supabaseClient.auth.getSession()).data.session;
      var dueno = null;
      try { dueno = localStorage.getItem(USER_KEY); } catch (e) {}
      if (!s || dueno !== m.user) {
        var r = await fetch(FN, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY },
          body: JSON.stringify({ user: m.user, token: m.token })
        });
        var d = await r.json().catch(function () { return {}; });
        if (r.status === 401) { aPadre({ type: 'activos-no-auth' }); return; }
        if (!r.ok || d.error) throw new Error(d.error || ('Error ' + r.status));
        if (!s || s.user.id !== d.user_id) {
          if (s) await supabaseClient.auth.signOut({ scope: 'local' });
          var v = await supabaseClient.auth.verifyOtp({ token_hash: d.token_hash, type: 'magiclink' });
          if (v.error) v = await supabaseClient.auth.verifyOtp({ token_hash: d.token_hash, type: 'email' });
          if (v.error) throw v.error;
        }
        try { localStorage.setItem(USER_KEY, m.user); } catch (e) {}
      }
      var perfil = await cargarPerfilActual();
      if (!perfil && !d) {
        /* La sesión reutilizada ya no sirve (venció): se descarta y se pide una nueva. */
        try { localStorage.removeItem(USER_KEY); } catch (e) {}
        await supabaseClient.auth.signOut({ scope: 'local' });
        entrando = false;
        return entrar(m);
      }
      if (!perfil) throw new Error('No se encontró tu perfil de activos');
      currentUser = perfilAAppUser(perfil);
      await showDashboard();
      moverCampana();
      aplicarTema(oscuro);
      estado(null);
    } catch (e) {
      estado('No se pudo abrir Inventarios de activos: ' + (e && e.message ? e.message : e), true);
    } finally {
      entrando = false;
    }
  }

  window.addEventListener('message', function (ev) {
    var m = ev.data;
    if (ev.origin !== location.origin || ev.source !== window.parent || !m || typeof m !== 'object') return;
    if (m.type === 'activos-auth') entrar(m);
    else if (m.type === 'theme') aplicarTema(m.dark);
  });

  /* Lo llama el arranque de activos.html en lugar de revisar la sesión guardada. */
  window.activosIntegradoIniciar = function () {
    estado('Conectando con Inventarios de activos…');
    aPadre({ type: 'activos-ready' });
  };
})();
