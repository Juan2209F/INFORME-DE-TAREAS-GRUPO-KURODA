/* Correos y tiendas — Grupo Kuroda
   Agrega en Gestión de Usuarios el botón "Correos y tiendas": captura el correo de cada
   usuario y asigna usuarios a tiendas (quién recibe los avisos de tareas pendientes).
   Depende de: config/supabase-config.js y js/app-core.js (_sb, _session, STORE, toast,
   razKey, _razonesAsignadas, filtrarUsuariosPorRazonSesion, pareceCifrado).
   Las funciones RPC piden usuario y contraseña de un admin: la contraseña solo vive en
   memoria mientras el panel está abierto. */
(function () {
  'use strict';

  var pass = null, U = [], T = [], tab = 'usuarios', q = '';
  var EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var msg = function (t) { if (typeof toast === 'function') toast(t); else alert(t); };
  var limpia = function (s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); };
  var clave = function (s) { return limpia(s).toUpperCase(); };
  var cifrado = function (s) { return typeof pareceCifrado === 'function' && pareceCifrado(s); };

  function esAdmin() {
    return typeof _session !== 'undefined' && _session && ['admin', 'admin_auditor'].indexOf(_session.rol) >= 0;
  }
  function propias() { return typeof _razonesAsignadas === 'function' ? _razonesAsignadas() : null; }
  function razOk(r) {
    var p = propias();
    if (!p || !r) return true;
    return p.map(razKey).indexOf(razKey(r)) >= 0;
  }

  /* ---------- Supabase ---------- */
  async function rpc(fn, args) {
    var c = _sb || (typeof initSupabase === 'function' ? initSupabase() : null);
    if (!c) throw new Error('Sin conexión a Supabase');
    var r = await c.rpc(fn, Object.assign({ p_admin: _session.username, p_pass: pass }, args || {}));
    if (r.error) {
      if (r.error.code === '42501' || /No autorizado/.test(r.error.message || '')) {
        pass = null;
        pintarAuth('Contraseña incorrecta');
      }
      throw r.error;
    }
    return r.data;
  }

  async function cargar() {
    var res = await Promise.all([
      rpc('listar_usuarios_correos'),
      rpc('listar_tiendas_correos'),
      _sb.rpc('listar_usuarios')
    ]);
    var vis = null;
    if (res[2] && !res[2].error && typeof filtrarUsuariosPorRazonSesion === 'function') {
      vis = {};
      filtrarUsuariosPorRazonSesion(res[2].data || []).forEach(function (u) { vis[u.id] = 1; });
    }
    U = (res[0] || []).filter(function (u) { return !vis || vis[u.id]; });
    T = (res[1] || []).filter(function (t) { return razOk(t.razon); });
    T.forEach(function (t) {
      t.usuarios = (t.usuarios || []).filter(function (u) { return !vis || vis[u.id]; });
    });
  }

  /* ---------- Vistas ---------- */
  function chip(uid, tid, label, recibe, title) {
    return '<span class="kc-chip"><label title="' + esc(title || 'Recibe correos') + '">' +
      '<input type="checkbox" data-act="toggle" data-uid="' + uid + '" data-tid="' + tid + '"' + (recibe ? ' checked' : '') + '> ' +
      esc(label) + '</label>' +
      '<button class="kc-x" data-act="del" data-uid="' + uid + '" data-tid="' + tid + '" title="Quitar">×</button></span>';
  }

  function vistaUsuarios() {
    var f = q.toLowerCase();
    var rows = U.filter(function (u) {
      return !f || (u.username + ' ' + (u.nombre || '') + ' ' + (u.email || '')).toLowerCase().indexOf(f) >= 0;
    });
    if (!rows.length) return '<p class="kc-empty">Sin usuarios</p>';
    return '<div class="kc-wrap"><table class="kc-t"><thead><tr><th>Usuario</th><th>Correo</th><th>Tiendas</th></tr></thead><tbody>' +
      rows.map(function (u) {
        var asign = {};
        (u.tiendas || []).forEach(function (t) { asign[t.id] = 1; });
        var libres = T.filter(function (t) { return !asign[t.id] && t.activa !== false; });
        return '<tr data-uid="' + u.id + '">' +
          '<td><b class="kc-mono">' + esc(u.username) + '</b><div class="kc-sub">' + esc(u.nombre || '') + (u.activo ? '' : ' · inactivo') + '</div></td>' +
          '<td><div class="kc-row"><input type="email" class="kc-in" data-act="email" value="' + esc(u.email || '') + '" placeholder="correo@empresa.com">' +
          '<button class="kc-btn" data-act="save-email">Guardar</button></div></td>' +
          '<td>' + (u.tiendas || []).map(function (t) { return chip(u.id, t.id, t.nombre, t.recibe_correos); }).join('') +
          '<select class="kc-in kc-sel" data-act="add-tienda"><option value="">+ Tienda</option>' +
          libres.map(function (t) { return '<option value="' + t.id + '">' + esc(t.nombre) + '</option>'; }).join('') +
          '</select></td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function vistaTiendas() {
    var f = q.toLowerCase();
    var rows = T.filter(function (t) {
      return !f || (t.nombre + ' ' + (t.razon || '') + ' ' + (t.centro || '')).toLowerCase().indexOf(f) >= 0;
    });
    var top = '<div class="kc-row kc-top">' +
      '<input class="kc-in" id="kc-nt" placeholder="Nueva tienda">' +
      '<select class="kc-in" id="kc-nr"><option value="">Razón</option><option>KNO</option><option>KSC</option><option>KSA</option></select>' +
      '<button class="kc-btn kc-pri" data-act="crear-tienda">Crear</button>' +
      '<button class="kc-btn" data-act="importar" title="Registra las tiendas que ya existen en tus tareas y auditorías">Importar de la app</button></div>';
    if (!rows.length) return top + '<p class="kc-empty">Sin tiendas. Usa "Importar de la app" para cargarlas.</p>';
    return top + '<div class="kc-wrap"><table class="kc-t"><thead><tr><th>Tienda</th><th>Usuarios</th></tr></thead><tbody>' +
      rows.map(function (t) {
        var asign = {};
        (t.usuarios || []).forEach(function (u) { asign[u.id] = 1; });
        var libres = U.filter(function (u) { return !asign[u.id] && u.activo; });
        return '<tr data-tid="' + t.id + '">' +
          '<td><b>' + esc(t.nombre) + '</b><div class="kc-sub">' + esc([t.razon, t.centro].filter(Boolean).join(' · ')) + '</div></td>' +
          '<td>' + (t.usuarios || []).map(function (u) {
            return chip(u.id, t.id, u.username + (u.email ? '' : ' (sin correo)'), u.recibe_correos, u.email || 'Sin correo');
          }).join('') +
          '<select class="kc-in kc-sel" data-act="add-usuario"><option value="">+ Usuario</option>' +
          libres.map(function (u) { return '<option value="' + u.id + '">' + esc(u.username) + '</option>'; }).join('') +
          '</select></td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function pintar() {
    if (!pass) return pintarAuth('');
    $('kc-auth').style.display = 'none';
    $('kc-main').style.display = 'block';
    var conCorreo = U.filter(function (u) { return u.email; }).length;
    var sinDest = T.filter(function (t) {
      return t.activa !== false && !(t.usuarios || []).some(function (u) { return u.recibe_correos && u.email; });
    }).length;
    $('kc-sum').textContent = T.length + ' tiendas · ' + conCorreo + ' de ' + U.length + ' usuarios con correo · ' + sinDest + ' tiendas sin destinatario';
    document.querySelectorAll('[data-kc-tab]').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-kc-tab') === tab);
    });
    $('kc-body').innerHTML = tab === 'usuarios' ? vistaUsuarios() : vistaTiendas();
  }

  function pintarAuth(err) {
    $('kc-main').style.display = 'none';
    $('kc-auth').style.display = 'block';
    $('kc-err').textContent = err || '';
    $('kc-pass').value = '';
    setTimeout(function () { $('kc-pass').focus(); }, 30);
  }

  /* ---------- Acciones ---------- */
  async function entrar() {
    var p = $('kc-pass').value;
    if (!p) { $('kc-err').textContent = 'Escribe tu contraseña'; return; }
    pass = p;
    $('kc-go').disabled = true;
    try { await cargar(); pintar(); }
    catch (e) { if (pass) { pass = null; pintarAuth(e.message || 'Error'); } }
    $('kc-go').disabled = false;
  }

  async function correr(fn, ok) {
    try {
      await fn();
      await cargar();
      pintar();
      if (ok) msg(ok);
    } catch (e) {
      if (pass) msg('Error: ' + (e.message || e));
    }
  }

  async function importar() {
    if (typeof STORE === 'undefined') { msg('Aún no hay datos cargados'); return; }
    var have = {}, vistos = {}, nuevos = [];
    T.forEach(function (t) { have[clave(t.nombre)] = 1; });
    (STORE.tareas || []).concat(STORE.auditorias || []).forEach(function (r) {
      var n = limpia(r.tienda);
      if (!n || cifrado(n) || !razOk(r.razon)) return;
      var k = clave(n);
      if (have[k] || vistos[k]) return;
      vistos[k] = 1;
      var c = limpia(r.centro);
      nuevos.push({ nombre: n, razon: limpia(r.razon) || null, centro: c && !cifrado(c) ? c : null });
    });
    if (!nuevos.length) { msg('Todas las tiendas ya están registradas'); return; }
    if (!confirm('Se van a registrar ' + nuevos.length + ' tiendas nuevas. ¿Continuar?')) return;
    var ok = 0;
    for (var i = 0; i < nuevos.length; i++) {
      try {
        await rpc('guardar_tienda', { p_nombre: nuevos[i].nombre, p_razon: nuevos[i].razon, p_centro: nuevos[i].centro });
        ok++;
      } catch (e) { if (!pass) return; }
    }
    await cargar();
    pintar();
    msg(ok + ' tiendas registradas');
  }

  function act(el) {
    var a = el.getAttribute('data-act');
    var row = el.closest('tr');
    var uid = el.getAttribute('data-uid') || (row && row.getAttribute('data-uid'));
    var tid = el.getAttribute('data-tid') || (row && row.getAttribute('data-tid'));

    if (a === 'save-email') {
      var v = row.querySelector('[data-act="email"]').value.trim();
      if (v && !EMAIL_RE.test(v)) { msg('Correo no válido'); return; }
      return correr(function () { return rpc('guardar_correo_usuario', { p_usuario_id: uid, p_email: v }); }, v ? 'Correo guardado' : 'Correo quitado');
    }
    if (a === 'toggle') {
      return correr(function () { return rpc('asignar_usuario_tienda', { p_usuario_id: uid, p_tienda_id: tid, p_recibe: el.checked }); }, 'Listo');
    }
    if (a === 'del') {
      return correr(function () { return rpc('quitar_usuario_tienda', { p_usuario_id: uid, p_tienda_id: tid }); }, 'Quitado');
    }
    if (a === 'add-tienda' && el.value) {
      return correr(function () { return rpc('asignar_usuario_tienda', { p_usuario_id: uid, p_tienda_id: el.value, p_recibe: true }); }, 'Tienda agregada');
    }
    if (a === 'add-usuario' && el.value) {
      return correr(function () { return rpc('asignar_usuario_tienda', { p_usuario_id: el.value, p_tienda_id: tid, p_recibe: true }); }, 'Usuario agregado');
    }
    if (a === 'crear-tienda') {
      var n = limpia($('kc-nt').value);
      if (!n) { msg('Escribe el nombre de la tienda'); return; }
      var r = $('kc-nr').value || null;
      if (r && !razOk(r)) { msg('Esa razón está fuera de tu alcance'); return; }
      return correr(function () { return rpc('guardar_tienda', { p_nombre: n, p_razon: r, p_centro: null }); }, 'Tienda guardada');
    }
    if (a === 'importar') return importar();
  }

  /* ---------- Modal ---------- */
  function abrir() {
    if (!esAdmin()) { msg('Sin permisos'); return; }
    pass = null; tab = 'usuarios'; q = '';
    $('kc-q').value = '';
    $('kc-overlay').classList.add('show');
    pintarAuth('');
  }
  function cerrar() {
    pass = null; U = []; T = [];
    $('kc-overlay').classList.remove('show');
  }

  function montar() {
    if ($('kc-overlay')) return;
    var st = document.createElement('style');
    st.id = 'kc-style';
    st.textContent =
      '.kc-modal{max-width:980px;width:96vw;max-height:90vh}' +
      '.kc-bar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:12px 20px;border-bottom:1px solid var(--border)}' +
      '.kc-tabs{display:flex;gap:4px}' +
      '.kc-tab{border:1px solid var(--border);background:transparent;color:var(--txt);padding:6px 12px;border-radius:10px;font-size:12px;font-weight:600;font-family:inherit;cursor:pointer}' +
      '.kc-tab.on{background:var(--blue);border-color:var(--blue);color:#fff}' +
      '.kc-in{border:1px solid var(--border);background:var(--white);color:var(--txt);border-radius:10px;padding:7px 10px;font-size:13px;font-family:inherit;min-width:0}' +
      '.kc-btn{border:1px solid var(--border);background:transparent;color:var(--txt);border-radius:10px;padding:7px 12px;font-size:12px;font-weight:700;font-family:inherit;cursor:pointer;white-space:nowrap}' +
      '.kc-btn:hover{border-color:var(--blue);color:var(--blue)}' +
      '.kc-pri{background:var(--blue);border-color:var(--blue);color:#fff}.kc-pri:hover{color:#fff;opacity:.9}' +
      '.kc-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}' +
      '.kc-top{margin-bottom:12px}' +
      '.kc-sum{font-size:12px;color:var(--muted);padding:8px 20px;font-weight:600}' +
      '.kc-body{padding:0 20px 18px;overflow:auto;max-height:58vh}' +
      '.kc-wrap{overflow-x:auto}' +
      '.kc-t{width:100%;border-collapse:collapse;font-size:13px}' +
      '.kc-t th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);padding:8px;border-bottom:1px solid var(--border)}' +
      '.kc-t td{padding:8px;border-bottom:1px solid var(--border);vertical-align:top}' +
      '.kc-mono{font-family:monospace}.kc-sub{font-size:11px;color:var(--muted)}' +
      '.kc-chip{display:inline-flex;align-items:center;gap:2px;border:1px solid var(--border);background:var(--soft);border-radius:999px;padding:2px 4px 2px 8px;margin:0 6px 6px 0;font-size:12px}' +
      '.kc-chip label{cursor:pointer;display:inline-flex;align-items:center;gap:4px}' +
      '.kc-x{border:none;background:transparent;color:var(--muted);cursor:pointer;font-size:15px;line-height:1;padding:0 4px}.kc-x:hover{color:var(--red)}' +
      '.kc-sel{max-width:170px;padding:4px 8px;font-size:12px}' +
      '.kc-empty{text-align:center;color:var(--muted);padding:24px 0;font-size:13px}' +
      '#kc-auth{padding:22px 20px}';
    document.head.appendChild(st);

    var d = document.createElement('div');
    d.className = 'usr-overlay';
    d.id = 'kc-overlay';
    d.style.zIndex = '3100';
    d.innerHTML =
      '<div class="kpi-cfg-modal kc-modal">' +
      '<div class="kpi-cfg-hdr"><h3>Correos y tiendas</h3>' +
      '<button class="btn btn-ghost" style="padding:5px 10px;font-size:12px" data-kc="close" aria-label="Cerrar">✕</button></div>' +
      '<div id="kc-auth" style="display:none">' +
      '<p style="font-size:13px;color:var(--muted);margin:0 0 10px">Confirma tu contraseña para administrar correos y tiendas.</p>' +
      '<div class="kc-row"><input type="password" id="kc-pass" class="kc-in" placeholder="Contraseña" autocomplete="current-password" style="width:240px">' +
      '<button id="kc-go" class="kc-btn kc-pri">Continuar</button></div>' +
      '<div id="kc-err" style="font-size:12px;color:var(--red);min-height:18px;margin-top:8px"></div></div>' +
      '<div id="kc-main" style="display:none">' +
      '<div class="kc-bar"><div class="kc-tabs">' +
      '<button class="kc-tab" data-kc-tab="usuarios">Usuarios</button>' +
      '<button class="kc-tab" data-kc-tab="tiendas">Tiendas</button></div>' +
      '<input id="kc-q" class="kc-in" placeholder="Buscar" style="flex:1;min-width:140px">' +
      '<button class="kc-btn" data-kc="refresh">Actualizar</button></div>' +
      '<div id="kc-sum" class="kc-sum"></div>' +
      '<div id="kc-body" class="kc-body"></div></div></div>';
    document.body.appendChild(d);

    d.addEventListener('click', function (e) {
      if (e.target === d) return cerrar();
      var k = e.target.closest('[data-kc]');
      if (k) {
        if (k.getAttribute('data-kc') === 'close') cerrar();
        else correr(function () { return Promise.resolve(); }, 'Listo');
        return;
      }
      var t = e.target.closest('[data-kc-tab]');
      if (t) { tab = t.getAttribute('data-kc-tab'); pintar(); return; }
      if (e.target.id === 'kc-go') return entrar();
      var b = e.target.closest('button[data-act]');
      if (b) act(b);
    });
    d.addEventListener('change', function (e) {
      var el = e.target.closest('[data-act]');
      if (el && ['toggle', 'add-tienda', 'add-usuario'].indexOf(el.getAttribute('data-act')) >= 0) act(el);
    });
    d.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') return cerrar();
      if (e.key !== 'Enter') return;
      if (e.target.id === 'kc-pass') return entrar();
      if (e.target.getAttribute && e.target.getAttribute('data-act') === 'email') {
        var btn = e.target.closest('tr').querySelector('[data-act="save-email"]');
        if (btn) act(btn);
      }
    });
    $('kc-q').addEventListener('input', function () { q = this.value.trim(); if (pass) pintar(); });
  }

  function inyectarBoton() {
    var t = $('usr-table-body');
    if (!t || $('kc-open')) return;
    var w = t.closest('.table-wrap') || t;
    var d = document.createElement('div');
    d.style.cssText = 'margin:0 0 12px;display:flex;justify-content:flex-end';
    d.innerHTML = '<button id="kc-open" class="btn btn-ghost" style="font-size:12px;padding:6px 12px;color:var(--blue)">Correos y tiendas</button>';
    w.parentNode.insertBefore(d, w);
    $('kc-open').addEventListener('click', abrir);
  }

  function init() { montar(); inyectarBoton(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  window.abrirCorreosTiendas = abrir;
})();
