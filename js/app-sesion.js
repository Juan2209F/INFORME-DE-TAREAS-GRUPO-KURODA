/* Seguridad de la sesión — Grupo Kuroda
   1) Cierre por inactividad: si en 10 minutos no hay actividad (mouse, teclado, toque o
      scroll) en NINGUNA pestaña del Monitor —incluidas Activos, Generador y Documentos,
      que van en iframes— la sesión se cierra. Al minuto 9 aparece un aviso con cuenta
      regresiva y el botón "Seguir conectado". La última actividad se comparte entre
      pestañas (localStorage), así que trabajar en una mantiene vivas las demás.
      Si la computadora se suspende, al volver se revisa el tiempo real transcurrido.
   2) Una sola sesión por cuenta: al iniciar sesión, la base de datos registra esta sesión
      como la vigente (sesion_monitor) y vence los tokens de las anteriores; además se
      revocan las otras sesiones de Supabase Auth. Cada 30 s (y al volver a la pestaña)
      se verifica con verificar_sesion_monitor(): si la cuenta se abrió en otro equipo o
      navegador, esta sesión se cierra con un aviso. Gana siempre el inicio más reciente,
      así nadie queda bloqueado si cerró el navegador sin "Salir".
   Depende de: js/app-core.js (_sb, _session, doLogout, showLoginErr, onLoginSuccess). */
(function () {
  'use strict';

  var LIMITE_MS = 10 * 60 * 1000;   // 10 minutos sin actividad
  var AVISO_MS = 60 * 1000;         // aviso 1 minuto antes
  var REVISAR_MS = 5000;            // revisión del temporizador
  var VERIFICAR_MS = 30000;         // verificación de sesión única
  var CLAVE = 'kg-ultima-actividad';
  var EVENTOS = ['mousedown', 'mousemove', 'keydown', 'wheel', 'touchstart', 'scroll', 'pointerdown'];

  var ultimaLocal = Date.now(), ultimoGuardado = 0, verificando = false, ultimaVerificacion = 0, aviso = null;

  var $ = function (id) { return document.getElementById(id); };
  function sesionAbierta() {
    var lp = $('login-page');
    return typeof _session !== 'undefined' && !!_session && !!lp && lp.classList.contains('hidden');
  }

  /* ---------- Actividad ---------- */
  function leerUltima() {
    var v = 0;
    try { v = parseInt(localStorage.getItem(CLAVE) || '0', 10) || 0; } catch (e) { /* sin almacenamiento */ }
    return Math.max(v, ultimaLocal);
  }
  function guardar(t) {
    ultimoGuardado = t;
    try { localStorage.setItem(CLAVE, String(t)); } catch (e) { /* sin almacenamiento */ }
  }
  function marcarActividad() {
    var t = Date.now();
    ultimaLocal = t;
    if (t - ultimoGuardado > 5000) guardar(t);    // no escribir en cada movimiento del mouse
    if (aviso && aviso.style.display !== 'none') ocultarAviso();
  }
  function escuchar(doc) { EVENTOS.forEach(function (ev) { doc.addEventListener(ev, marcarActividad, { capture: true, passive: true }); }); }
  escuchar(document);
  /* Iframes del mismo sitio (Activos, Generador, Documentos): sus eventos no llegan a esta
     página, así que se escuchan dentro de cada uno (se revisa seguido porque se recargan). */
  function engancharIframes() {
    var fs = document.querySelectorAll('iframe');
    for (var i = 0; i < fs.length; i++) {
      try {
        var w = fs[i].contentWindow;
        if (!w || w.__kgActividad || !w.document) continue;
        escuchar(w.document);
        w.__kgActividad = true;
      } catch (e) { /* iframe de otro sitio: no se puede escuchar */ }
    }
  }

  /* ---------- Aviso previo ---------- */
  function crearAviso() {
    if (aviso) return aviso;
    var css = document.createElement('style');
    css.textContent =
      '.kg-aviso-sesion{position:fixed;inset:0;z-index:100000;background:rgba(10,14,35,.55);display:flex;align-items:center;justify-content:center;padding:16px}' +
      '.kg-aviso-sesion .caja{background:var(--white,#fff);color:var(--txt,#344767);border-radius:16px;box-shadow:0 20px 50px rgba(0,0,0,.3);max-width:380px;width:100%;padding:22px 22px 18px;text-align:center;font-family:inherit}' +
      '.kg-aviso-sesion .ico{font-size:30px;margin-bottom:6px}' +
      '.kg-aviso-sesion h3{font-size:16px;margin:0 0 6px}' +
      '.kg-aviso-sesion p{font-size:13px;margin:0 0 14px;color:var(--muted,#8392ab)}' +
      '.kg-aviso-sesion b{color:var(--red,#f5365c);font-size:15px}' +
      '.kg-aviso-sesion .bts{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}' +
      '.kg-aviso-sesion button{border:0;border-radius:10px;padding:10px 16px;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit}' +
      '.kg-aviso-sesion .seguir{background:linear-gradient(135deg,var(--blue,#5e72e4),var(--blue2,#825ee4));color:#fff}' +
      '.kg-aviso-sesion .salir{background:var(--soft,#f8f9fc);color:var(--txt,#344767);border:1px solid var(--border,#eef1f7)}';
    document.head.appendChild(css);
    aviso = document.createElement('div');
    aviso.className = 'kg-aviso-sesion';
    aviso.style.display = 'none';
    aviso.setAttribute('role', 'alertdialog');
    aviso.setAttribute('aria-modal', 'true');
    aviso.innerHTML = '<div class="caja"><div class="ico">⏳</div><h3>¿Sigues ahí?</h3>' +
      '<p>Por seguridad, tu sesión se cerrará por inactividad en <b id="kg-aviso-seg">60</b> segundos.</p>' +
      '<div class="bts"><button type="button" class="seguir" id="kg-seguir">Seguir conectado</button>' +
      '<button type="button" class="salir" id="kg-salir">Cerrar sesión</button></div></div>';
    document.body.appendChild(aviso);
    $('kg-seguir').addEventListener('click', function () { guardar(Date.now()); marcarActividad(); });
    $('kg-salir').addEventListener('click', function () { cerrarSesion('manual'); });
    return aviso;
  }
  function mostrarAviso(seg) {
    crearAviso();
    $('kg-aviso-seg').textContent = Math.max(0, seg);
    if (aviso.style.display === 'none') { aviso.style.display = 'flex'; $('kg-seguir').focus(); }
  }
  function ocultarAviso() { if (aviso) aviso.style.display = 'none'; }

  /* ---------- Cierre ---------- */
  var MENSAJES = {
    inactividad: 'Tu sesión se cerró por 10 minutos de inactividad. Vuelve a ingresar.',
    otra: 'Tu cuenta se abrió en otro equipo o navegador, por eso se cerró esta sesión.',
    manual: ''
  };
  function cerrarSesion(motivo) {
    ocultarAviso();
    if (!sesionAbierta()) return;
    /* Si la cuenta se abrió en otro lado, solo se cierra AQUÍ (no se revoca la sesión nueva). */
    window.__kgSalidaLocal = (motivo === 'otra');
    try { if (typeof doLogout === 'function') doLogout(); } finally { window.__kgSalidaLocal = false; }
    var m = MENSAJES[motivo] || '';
    if (m && typeof showLoginErr === 'function') showLoginErr(m);
  }

  /* ---------- Sesión única ---------- */
  async function verificarSesionUnica(forzar) {
    if (!sesionAbierta() || verificando) return;
    if (!forzar && Date.now() - ultimaVerificacion < VERIFICAR_MS) return;
    if (typeof _sb === 'undefined' || !_sb || !_sb.rpc) return;
    verificando = true; ultimaVerificacion = Date.now();
    try {
      var r = await _sb.rpc('verificar_sesion_monitor');
      if (!r.error && r.data === 'otra') cerrarSesion('otra');
      /* Error de red o función no disponible: no se cierra nada (se reintenta luego). */
    } catch (e) { /* sin conexión: se reintenta */ }
    finally { verificando = false; }
  }

  /* ---------- Temporizador ---------- */
  function revisar() {
    engancharIframes();
    if (!sesionAbierta()) { ocultarAviso(); return; }
    var inactivo = Date.now() - leerUltima();
    if (inactivo >= LIMITE_MS) return cerrarSesion('inactividad');
    if (inactivo >= LIMITE_MS - AVISO_MS) mostrarAviso(Math.ceil((LIMITE_MS - inactivo) / 1000));
    else ocultarAviso();
    verificarSesionUnica(false);
  }
  setInterval(revisar, REVISAR_MS);
  /* Al volver a la pestaña o despertar el equipo: revisar de inmediato el tiempo real. */
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') { revisar(); verificarSesionUnica(true); }
  });
  window.addEventListener('focus', function () { verificarSesionUnica(true); });
  /* Otra pestaña cerró sesión o tuvo actividad: se refleja aquí. */
  window.addEventListener('storage', function (e) { if (e.key === CLAVE) revisar(); });

  /* ---------- Enganche al inicio de sesión ---------- */
  function enganchar() {
    if (typeof window.onLoginSuccess === 'function' && !window.onLoginSuccess._kg) {
      var orig = window.onLoginSuccess;
      window.onLoginSuccess = function () {
        guardar(Date.now()); ultimaLocal = Date.now();
        var r = orig.apply(this, arguments);
        /* Sesión única también en Supabase Auth: revoca las demás sesiones de esta cuenta. */
        try { if (_sb && _sb.auth) _sb.auth.signOut({ scope: 'others' }).catch(function () {}); } catch (e) { /* sin cliente */ }
        ultimaVerificacion = Date.now();
        return r;
      };
      window.onLoginSuccess._kg = true;
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', enganchar); else enganchar();

  /* Para pruebas y diagnóstico. */
  window.__kgSesion = { revisar: revisar, verificar: verificarSesionUnica, LIMITE_MS: LIMITE_MS, CLAVE: CLAVE };
})();
