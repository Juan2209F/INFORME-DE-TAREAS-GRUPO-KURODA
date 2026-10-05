
/* Integración de "Inventarios de activos" (ACTIVOS-GRUPOKURODA) dentro del Monitor — Grupo Kuroda
   Solo actúa cuando activos.html se abre dentro del Monitor (activos.html?embed=1 en un iframe):
   - Sin pantalla de login: usa la MISMA sesión de Supabase Auth del Monitor (storageKey
     "kuroda-monitor-auth"; solo el Monitor la renueva). ACTIVOS ya no tiene cuentas propias:
     el perfil de ACTIVOS de cada usuario lo genera el Monitor según su rol.
   - Mismo aspecto que el Monitor: el menú lateral pasa a pestañas arriba, sin tarjeta de usuario
     (ya la muestra el Monitor), sin "Salir", "Usuarios" ni selector de tema (sigue el del Monitor).
   Abierto directo (sin embed) la app funciona igual que el proyecto original. */
(function () {
  'use strict';
  var EMBED = /[?&]embed=1(&|$)/.test(location.search) && window.parent !== window;
  window.ACTIVOS_EMBED = EMBED;
  if (!EMBED) return;

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
    E + 'body.dark-mode .nav-item:not(.active) .badge{background:rgba(140,160,255,.22);color:#d3daff}' +
    E + '.main-content{margin-left:0!important;width:100%!important;height:auto!important;flex:1;min-height:0;padding:0 2px 16px!important;background:transparent!important}' +
    E + '.topbar-user{display:none!important}' +
    E + '.sidebar .topbar-actions{position:relative}' +
    E + '.sidebar .notif-panel{top:46px}' +
    E + '#ajustes .settings-group:has(.theme-selector){display:none}' +
    E + '#act-estado{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:10000;font-family:Poppins,sans-serif}' +
    E + '#act-estado div{background:var(--card-bg);color:var(--text-main);border:1px solid var(--border-color);border-radius:18px;padding:22px 26px;font-size:13px;max-width:420px;text-align:center;box-shadow:var(--shadow)}' +
    E + '#act-estado.err div{color:var(--danger-color)}' +
    '@media(max-width:768px){' + E + '.nav-item span:not(.badge){display:none!important}}' +
    /* Solo consulta (viewer del Monitor): sin controles que crean, modifican o borran. La base de
       datos también lo impide (RLS es_editor_activos), esto solo evita botones que fallarían. */
    [ '[onclick^="resetAssetForm"]', '#btnNuevoLevantamiento', '[onclick^="finalizarInventario"]', '[onclick^="cancelarInventario"]',
      '[onclick^="registrarScanManual"]', '[onclick^="abrirCamaraScan"]', '[onclick^="abrirModalCentro"]', '[onclick^="abrirModalMovimiento"]',
      '[onclick^="guardarRazonSocial"]', '[onclick^="editAsset"]', '[onclick^="solicitarBajaActivo"]', '[onclick^="deleteAsset"]',
      '.file-upload-wrapper', '.file-input-wrapper', '[onclick^="aprobarBaja"]', '[onclick^="rechazarBaja"]', '[onclick^="editarCentro"]',
      '[onclick^="eliminarCentro"]', '[onclick^="eliminarInventario"]', '[onclick^="abrirInventario"]',
      '#ajustes .settings-group:has(#razon-social)', '.asset-menu' ]
      .map(function (s) { return 'html.act-solo-lectura ' + s; }).join(',') + '{display:none!important}';
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
    /* Mismo esquema de color que el Monitor: si no coinciden, el navegador pinta un fondo
       blanco opaco detrás del iframe y en modo oscuro el texto claro quedaba sobre blanco. */
    document.documentElement.style.colorScheme = oscuro ? 'dark' : 'light';
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
      /* Misma sesión de Supabase Auth del Monitor (storageKey "kuroda-monitor-auth"): no hay
         cuentas propias de ACTIVOS. El perfil de ACTIVOS (usuarios2) lo genera el Monitor según
         el rol del usuario. */
      var s = (await supabaseClient.auth.getSession()).data.session;
      if (!s) {
        aPadre({ type: 'activos-no-auth', relogin: true,
                 error: 'Tu sesión venció. Cierra sesión en el Monitor y vuelve a entrar.' });
        estado(null);
        return;
      }
      var perfil = await cargarPerfilActual();
      if (!perfil || !perfil.activo) throw new Error('Tu usuario no tiene acceso a Inventarios de activos');
      document.documentElement.classList.toggle('act-solo-lectura', perfil.role === 'viewer');
      currentUser = perfilAAppUser(perfil);
      await showDashboard();
      if (perfil.role === 'viewer') {
        var sr = document.getElementById('session-rol'); if (sr) sr.textContent = 'Consulta';
      }
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
