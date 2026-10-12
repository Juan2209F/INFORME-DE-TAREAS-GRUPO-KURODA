/* Notificaciones de movimientos (campanita) — web y app
   Cada alta, cambio o eliminación en tareas, auditorías, actividades, ajustes, mermas,
   finalizadas, archivero o activos queda registrada en Supabase (tabla notificaciones, ver
   supabase/migrations/20261012_notificaciones_bandeja.sql). Este archivo:
   1) Registra el perfil del usuario al iniciar sesión (rol, razones sociales y vistas): con él la
      base decide qué movimientos le tocan, tanto aquí como en el push de la app Android.
   2) Pone la campanita en la barra superior con el contador de avisos sin ver.
   3) Muestra la bandeja; al tocar un aviso se abre su sección.
   4) Revisa cada minuto si hay avisos nuevos y, en el navegador, puede mostrarlos como
      notificación del sistema mientras el Monitor esté abierto (en la app Android eso lo hace
      el push de Firebase, aunque la app esté cerrada).
   Nunca se avisa a quien hizo el movimiento. */
(function () {
  'use strict';

  var REVISAR_MS = 60000;
  var $ = function (id) { return document.getElementById(id); };
  var html = document.documentElement;
  var sbCliente = function () { return typeof _sb !== 'undefined' ? _sb : null; };
  var sesion = function () { return typeof _session !== 'undefined' ? _session : null; };
  var limpio = function (s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };
  function sesionAbierta() {
    var login = $('login-page');
    return !!(login && login.classList.contains('hidden') && sesion());
  }

  /* módulo -> [icono, título, singular, plural, género, opción del menú] */
  var MODULOS = {
    tareas: ['📝', 'Tareas', 'tarea', 'tareas', 'f', 'nav-tareas'],
    finalizadas: ['✅', 'Tareas finalizadas', 'tarea finalizada', 'tareas finalizadas', 'f', 'nav-finalizadas'],
    auditorias: ['🔍', 'Auditorías', 'auditoría', 'auditorías', 'f', 'nav-auditorias'],
    actividades: ['📋', 'Actividades', 'actividad', 'actividades', 'f', 'nav-actividades'],
    ajustes: ['⚖️', 'Ajustes', 'ajuste', 'ajustes', 'm', 'nav-ajustes'],
    mermas: ['🗂️', 'Mermas', 'merma', 'mermas', 'f', 'nav-mermas'],
    archivero: ['🗄️', 'Archivero', 'documento', 'documentos', 'm', 'nav-archivero'],
    activos: ['📦', 'Activos', 'movimiento de activos', 'movimientos de activos', 'm', 'nav-activos']
  };
  /* operación -> [con autor, sin autor (singular), sin autor (plural)] */
  var VERBOS = {
    INSERT: ['registró', 'Se registró', 'Se registraron'],
    UPDATE: ['actualizó', 'Se actualizó', 'Se actualizaron'],
    DELETE: ['eliminó', 'Se eliminó', 'Se eliminaron']
  };

  /* En Activos el texto depende de la tabla del movimiento: tabla -> [singular, plural, género] */
  var TABLAS_ACTIVOS = {
    activos: ['activo', 'activos', 'm'],
    movimientos: ['movimiento de activos', 'movimientos de activos', 'm'],
    inventarios: ['inventario de activos', 'inventarios de activos', 'm'],
    solicitudes_baja: ['solicitud de baja', 'solicitudes de baja', 'f']
  };

  function textoDe(a) {
    var m = MODULOS[a.modulo], v = VERBOS[a.operacion];
    if (!m || !v) return '';
    var t = TABLAS_ACTIVOS[a.tabla];
    if (t) m = [m[0], m[1], t[0], t[1], t[2], m[5]];
    var n = Number(a.n) || 1;
    var cuanto = n === 1 ? (m[4] === 'f' ? 'una ' : 'un ') + m[2] : n + ' ' + m[3];
    return a.actor_nombre ? a.actor_nombre + ' ' + v[0] + ' ' + cuanto : (n === 1 ? v[1] : v[2]) + ' ' + cuanto;
  }
  function hace(fecha) {
    var d = new Date(fecha), min = Math.floor((Date.now() - d.getTime()) / 60000);
    if (isNaN(min)) return '';
    if (min < 1) return 'ahora';
    if (min < 60) return 'hace ' + min + ' min';
    if (min < 1440) return 'hace ' + Math.floor(min / 60) + ' h';
    if (min < 2880) return 'ayer';
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  }

  /* ---------- 1) Perfil del usuario ---------- */
  function lista(v) {
    if (typeof v === 'string') {
      try { v = JSON.parse(v); } catch (e) { v = v.split(/[,;\s]+/); }
    }
    return Array.isArray(v) ? v.map(function (x) { return String(x).trim(); }).filter(Boolean) : [];
  }
  var perfilDe = '';
  async function registrarPerfil() {
    var sb = sbCliente(), ses = sesion();
    if (!sb || !ses) return false;
    var firma = [ses.username, ses.rol, JSON.stringify(ses.razones_permitidas), JSON.stringify(ses.vistas_permitidas)].join('|');
    if (perfilDe === firma) return true;
    var datos = {
      p_usuario: ses.nombre || ses.username || null,
      p_rol: ses.rol || '',
      p_razones: lista(ses.razones_permitidas),
      p_vistas: lista(ses.vistas_permitidas)
    };
    /* El nombre de usuario enlaza con la cuenta de Activos (para no avisarle de lo que él mismo
       hizo ahí). Si la base aún no acepta ese dato, se registra sin él. */
    var r = await sb.rpc('notif_perfil', Object.assign({ p_username: ses.username || null }, datos));
    if (r.error) r = await sb.rpc('notif_perfil', datos);
    if (r.error) return false;       /* migración sin aplicar o sin conexión: se reintenta */
    perfilDe = firma;
    /* La función existe = la migración está aplicada: ya se puede guardar razon_aviso (app-core.js). */
    window._razonAvisoOk = true;
    return true;
  }

  /* ---------- 2) Campanita ---------- */
  var boton = null, globo = null, panel = null;
  function montarCampana() {
    if (boton) return;
    var ref = $('topbar-user');
    if (!ref || !ref.parentNode) return;
    boton = document.createElement('button');
    boton.type = 'button';
    boton.id = 'notif-btn';
    boton.className = 'notif-btn';
    boton.title = 'Notificaciones';
    boton.setAttribute('aria-label', 'Notificaciones');
    boton.innerHTML = '🔔<span class="notif-globo" id="notif-globo" style="display:none"></span>';
    boton.style.display = 'none';
    ref.parentNode.insertBefore(boton, ref);
    globo = $('notif-globo');
    boton.addEventListener('click', function (e) { e.stopPropagation(); if (panelAbierto()) cerrarPanel(); else abrirPanel(); });
    document.addEventListener('click', function (e) {
      if (panelAbierto() && !panel.contains(e.target)) cerrarPanel();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') cerrarPanel(); });
  }
  function pintarGlobo(n) {
    if (!globo) return;
    globo.textContent = n > 99 ? '99+' : String(n);
    globo.style.display = n > 0 ? '' : 'none';
  }

  /* ---------- 3) Bandeja ---------- */
  var avisos = [];
  function panelAbierto() { return !!(panel && panel.style.display !== 'none'); }
  function crearPanel() {
    if (panel) return;
    panel = document.createElement('div');
    panel.id = 'notif-panel';
    panel.className = 'notif-panel';
    panel.style.display = 'none';
    /* Dentro de la barra superior: queda pegada debajo de ella sin calcular coordenadas (la página
       usa zoom en escritorio) y en el teléfono ocupa todo el ancho (css/notificaciones.css). */
    var barra = boton.closest ? boton.closest('.topbar') : null;
    (barra || document.body).appendChild(panel);
    panel.addEventListener('click', function (e) {
      var fila = e.target.closest ? e.target.closest('[data-aviso]') : null;
      if (fila) {
        var id = fila.getAttribute('data-aviso');
        var aviso = avisos.filter(function (a) { return String(a.id) === id; })[0];
        if (aviso) irA(aviso);
        return;
      }
      if (e.target.id === 'notif-permiso') pedirPermiso();
    });
  }
  function puedePedirPermiso() {
    return !html.classList.contains('gk-apk') && 'Notification' in window && Notification.permission === 'default';
  }
  function pintarPanel() {
    if (!panel) return;
    var filas = avisos.map(function (a) {
      var m = MODULOS[a.modulo];
      if (!m) return '';
      var razones = Array.isArray(a.razones) && a.razones.length ? ' · ' + limpio(a.razones.join(', ')) : '';
      return '<button type="button" class="notif-fila' + (a.nueva ? ' nueva' : '') + '" data-aviso="' + limpio(a.id) + '">' +
        '<span class="notif-ico">' + m[0] + '</span>' +
        '<span class="notif-txt"><b>' + limpio(textoDe(a)) + '</b>' +
        '<small>' + limpio(m[1]) + razones + ' · ' + limpio(hace(a.fecha)) + '</small></span></button>';
    }).join('');
    panel.innerHTML = '<div class="notif-cab">Notificaciones</div>' +
      (puedePedirPermiso() ? '<button type="button" class="notif-permiso" id="notif-permiso">Activar avisos en este navegador</button>' : '') +
      '<div class="notif-lista">' + (filas || '<div class="notif-vacio">Sin movimientos recientes</div>') + '</div>';
  }
  function abrirPanel() {
    crearPanel();
    pintarPanel();
    panel.style.display = '';
    /* Al abrir la bandeja todo queda visto (lo nuevo sigue resaltado hasta cerrarla). */
    pintarGlobo(0);
    var sb = sbCliente();
    if (sb) sb.rpc('notif_marcar_vistas').then(function () {}, function () {});
  }
  function cerrarPanel() {
    if (!panelAbierto()) return;
    panel.style.display = 'none';
    avisos.forEach(function (a) { a.nueva = false; });
  }
  /* Al tocar un aviso: abre su sección, vuelve a cargar los datos, deja a la vista el registro
     que cambió y lo remarca en ámbar unos segundos. */
  function irA(a) {
    cerrarPanel();
    var m = MODULOS[a.modulo], n = m ? $(m[5]) : null;
    if (!n || n.style.display === 'none') return;
    n.click();
    window.scrollTo(0, 0);
    var ids = Array.isArray(a.ids) ? a.ids.map(String).filter(Boolean) : [];
    if (a.operacion === 'DELETE') { aviso('El registro de este aviso fue eliminado'); return; }
    if (!ids.length) return;
    if (a.modulo === 'activos') enfocarActivos(a.tabla, ids);
    else enfocar(a.modulo, ids);
  }
  function aviso(texto) { if (typeof toast === 'function') toast('🔔 ' + texto); }
  var espera = function (t) { return new Promise(function (r) { setTimeout(r, t); }); };

  /* Cómo ubicar un registro en cada sección: función que recarga los datos, lista en memoria,
     filtros que hay que mover para que el registro quede a la vista y función que redibuja.
     Las filas llevan data-nid con el id del registro (js/app-core.js). */
  function elegir(id, valor) {
    var s = $(id);
    if (!s || !s.options) return;
    var igual = function (x) { return String(x == null ? '' : x).trim().toUpperCase(); };
    var op = valor == null ? null : Array.prototype.filter.call(s.options, function (o) { return igual(o.value) === igual(valor); })[0];
    if (!op) op = Array.prototype.filter.call(s.options, function (o) { return o.value === 'ALL'; })[0];
    if (op) s.value = op.value;
  }
  var SECCIONES = {
    ajustes: {
      cargar: 'loadAjustes', pintar: 'renderAjustes',
      lista: function () { return typeof AJUSTES !== 'undefined' ? AJUSTES : []; },
      filtros: function (r) { try { _ajPerManual = true; } catch (e) {} elegir('aj-f-mes', r.mes); elegir('aj-f-año', r.año); elegir('aj-f-tienda', null); }
    },
    mermas: {
      cargar: 'loadMermas', pintar: 'renderMermas',
      lista: function () { return typeof MERMAS !== 'undefined' ? MERMAS : []; },
      filtros: function (r) { try { _mrPerManual = true; } catch (e) {} elegir('mr-f-mes', r.mes); elegir('mr-f-año', r.año); elegir('mr-f-tienda', null); }
    },
    finalizadas: {
      cargar: 'loadFinalizadas', pintar: 'renderFinalizadas',
      lista: function () { return typeof FINALIZADAS !== 'undefined' ? FINALIZADAS : []; },
      filtros: function () { elegir('fin-f-mes', null); elegir('fin-f-año', null); elegir('fin-f-tienda', null); }
    },
    actividades: {
      cargar: 'loadActividades', pintar: 'renderActividades',
      lista: function () { return typeof ACTIVIDADES !== 'undefined' ? ACTIVIDADES : []; },
      filtros: function (r) {
        try { _actMesManual = true; } catch (e) {}
        elegir('act-f-mes', r.mes);
        ['act-f-estado', 'act-f-categoria', 'act-f-asignado', 'act-f-razon'].forEach(function (f) { elegir(f, null); });
      }
    },
    tareas: { cargar: 'loadDataFromSupabase' },
    auditorias: { cargar: 'loadDataFromSupabase' }
  };
  function filasDe(ids) {
    return Array.prototype.filter.call(document.querySelectorAll('tr[data-nid]'), function (tr) {
      return ids.indexOf(tr.getAttribute('data-nid')) >= 0 && tr.offsetParent !== null;
    });
  }
  function remarcar(filas) {
    filas.forEach(function (tr) {
      tr.classList.remove('notif-resalta');
      void tr.offsetWidth;                 /* reinicia la animación si ya estaba remarcada */
      tr.classList.add('notif-resalta');
    });
    if (filas[0] && filas[0].scrollIntoView) filas[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
    setTimeout(function () { filas.forEach(function (tr) { tr.classList.remove('notif-resalta'); }); }, 5200);
  }
  var enfoque = 0;           /* si se toca otro aviso, el anterior deja de buscar su registro */
  async function enfocar(modulo, ids) {
    var s = SECCIONES[modulo], turno = ++enfoque;
    if (!s) return;
    try {
      if (typeof window[s.cargar] === 'function') await window[s.cargar]();
    } catch (e) { /* sin conexión: se busca en lo que ya está cargado */ }
    /* La sección puede tardar en dibujarse (y redibujarse) después de cargar. */
    for (var i = 0; i < 12; i++) {
      if (turno !== enfoque || !sesionAbierta()) return;
      var filas = filasDe(ids);
      if (!filas.length && i === 2 && s.filtros) {
        /* No está a la vista: se mueven los filtros al periodo del registro. */
        var reg = s.lista().filter(function (r) { return ids.indexOf(String(r.id)) >= 0; })[0];
        if (reg) {
          try { s.filtros(reg); if (typeof window[s.pintar] === 'function') window[s.pintar](); } catch (e) {}
          filas = filasDe(ids);
        }
      }
      if (filas.length) {
        remarcar(filas);
        /* Si la tabla se vuelve a dibujar enseguida, se remarca otra vez. */
        await espera(1200);
        if (turno === enfoque && !document.querySelector('tr.notif-resalta')) remarcar(filasDe(ids));
        return;
      }
      await espera(500);
    }
    if (turno === enfoque) aviso('El registro no está a la vista con los filtros actuales o ya no existe');
  }
  /* Activos vive en un iframe: se le pide que muestre el registro (assets/activos-integracion.js).
     Se repite unos segundos por si la app de Activos todavía está cargando. */
  function enfocarActivos(tabla, ids) {
    var turno = ++enfoque, intentos = 0, listo = false;
    var oir = function (ev) {
      if (ev.origin === location.origin && ev.data && ev.data.type === 'activos-enfocado') { listo = true; window.removeEventListener('message', oir); }
    };
    window.addEventListener('message', oir);
    (function pedir() {
      if (listo || turno !== enfoque || ++intentos > 15) { window.removeEventListener('message', oir); return; }
      var f = $('iframe-activos');
      try { if (f && f.contentWindow) f.contentWindow.postMessage({ type: 'activos-enfocar', tabla: tabla, ids: ids }, location.origin); } catch (e) {}
      setTimeout(pedir, 1500);
    })();
  }

  /* ---------- 4) Revisión periódica ---------- */
  var ultimaFecha = 0;       /* fecha del aviso más reciente ya conocido en esta sesión */
  var primera = true, revisando = false;
  var ms = function (f) { return new Date(f).getTime() || 0; };
  function pedirPermiso() {
    try {
      var p = Notification.requestPermission(function () { pintarPanel(); });
      if (p && p.then) p.then(pintarPanel, function () {});
    } catch (e) { /* navegador sin notificaciones */ }
  }
  function avisarNuevos(nuevos) {
    if (!nuevos.length) return;
    var a = nuevos[0], m = MODULOS[a.modulo];
    var texto = nuevos.length === 1 ? textoDe(a) : nuevos.length + ' movimientos nuevos';
    if (typeof toast === 'function') toast('🔔 ' + texto);
    /* En la app Android el aviso del sistema lo manda Firebase. */
    if (html.classList.contains('gk-apk') || !('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      var n = new Notification(nuevos.length === 1 && m ? m[0] + ' ' + m[1] : 'Monitor de Cumplimiento',
        { body: texto, tag: 'gk-movimientos', icon: 'icons/icon-192.png' });
      n.onclick = function () { window.focus(); if (nuevos.length === 1) irA(a); n.close(); };
    } catch (e) { /* iPhone / navegadores que solo permiten avisos desde un service worker */ }
  }
  async function revisar() {
    if (revisando || !sesionAbierta() || document.visibilityState === 'hidden') return;
    var sb = sbCliente();
    if (!sb) return;
    revisando = true;
    try {
      if (!(await registrarPerfil())) return;
      var r = await sb.rpc('mis_notificaciones', { p_limite: 40 });
      if (r.error || !Array.isArray(r.data) || !sesionAbierta()) return;
      var abierto = panelAbierto();
      var nuevos = r.data.filter(function (a) { return a.nueva && ms(a.fecha) > ultimaFecha; });
      /* Con la bandeja abierta se conserva el resaltado de lo que ya se estaba viendo. */
      var resaltados = {};
      if (abierto) avisos.forEach(function (a) { if (a.nueva) resaltados[a.id] = 1; });
      avisos = r.data;
      if (abierto) avisos.forEach(function (a) { if (resaltados[a.id]) a.nueva = true; });
      if (avisos.length && ms(avisos[0].fecha) > ultimaFecha) ultimaFecha = ms(avisos[0].fecha);
      if (boton) boton.style.display = '';
      if (abierto) {
        pintarPanel();
        if (nuevos.length) sb.rpc('notif_marcar_vistas').then(function () {}, function () {});
      } else {
        pintarGlobo(avisos.filter(function (a) { return a.nueva; }).length);
        if (!primera) avisarNuevos(nuevos);
      }
      primera = false;
    } catch (e) { /* sin conexión: se reintenta */ }
    finally { revisando = false; }
  }
  function alCambiarSesion() {
    engancharPush();
    if (sesionAbierta()) { setTimeout(revisar, 1500); return; }
    /* Sesión cerrada: se limpia todo para el siguiente usuario. */
    cerrarPanel();
    avisos = []; ultimaFecha = 0; primera = true; perfilDe = '';
    pintarGlobo(0);
    if (boton) boton.style.display = 'none';
  }

  /* App Android: al tocar la notificación del sistema, la app abre la sección (GKApk.ir, en
     js/app-apk.js). Aquí se completa llevando al registro del aviso más reciente de esa sección. */
  function engancharPush() {
    var g = window.GKApk;
    if (!g || typeof g.ir !== 'function' || g.ir.__notif) return;
    var ir = g.ir;
    g.ir = function (sec) {
      var r = ir.apply(this, arguments);
      if (r) setTimeout(function () { alAbrirPorPush(sec); }, 600);
      return r;
    };
    g.ir.__notif = true;
  }
  async function alAbrirPorPush(sec) {
    await revisar();
    /* El push de finalizadas abre la sección de auditorías. */
    var a = avisos.filter(function (x) { return x.modulo === sec || (sec === 'auditorias' && x.modulo === 'finalizadas'); })[0];
    if (a && Date.now() - ms(a.fecha) < 15 * 60000) irA(a);
  }

  function init() {
    montarCampana();
    engancharPush();
    var login = $('login-page');
    if (login) new MutationObserver(alCambiarSesion).observe(login, { attributes: true, attributeFilter: ['class'] });
    setTimeout(alCambiarSesion, 3000);
    setInterval(revisar, REVISAR_MS);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') revisar(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
