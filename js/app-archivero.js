/* Archivero de responsivas — Grupo Kuroda
   Sección "Archivero" del menú lateral (admin, admin_auditor, auditor y sistemas).
   Pestañas por apartado: vienen de la tabla archivo_categorias (nombre, ícono, quién ve/sube,
   quién borra y si requiere sucursal). Hoy: Celular y Equipo de cómputo (admin, admin_auditor,
   auditor y sistemas; borran admin, admin_auditor y auditor) y Vehículos (solo admin y
   admin_auditor, siempre con sucursal). Agregar un apartado = insertar una fila en esa tabla.
   Dividido por razón social: cada documento guarda su razón (KNO/KSC/KSA; en vehículos se
   toma de la sucursal) y cada usuario solo ve, sube y borra las de sus razones permitidas
   (lo valida la Edge Function; aquí solo se arma la pantalla con lo que ella devuelve).
   El PDF firmado NUNCA se sube: el navegador convierte cada página a WebP (calidad 65%) con
   pdf.js y sube cada imagen DIRECTO al bucket privado con una URL firmada que entrega la Edge
   Function "archivero" (preparar → subir páginas → confirmar).
   Para consultar se muestran las páginas y se puede descargar de nuevo como PDF (jsPDF).
   Acceso: mismo token de sesión que obtiene app-correos.js al iniciar sesión
   (localStorage "kc_token"). Si no hay o venció, se renueva solo con la sesión ya iniciada
   (RPC renovar_token_monitor, sin pedir contraseña; solo para la sesión vigente de la cuenta).
   Depende de: config/supabase-config.js (SB_URL, SB_KEY), js/app-core.js (_sb, _session,
   VIEW, setView, applyVistasRestriction, toast) y jsPDF (cargado en index.html). */
(function () {
  'use strict';

  var TOKEN_KEY = 'kc_token';
  var PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  var CALIDAD = 0.65; /* WebP al 65% (antes 85%): sigue legible para responsivas y pesa menos */
  var PCT = Math.round(CALIDAD * 100) + '%';
  var SUBIDAS_A_LA_VEZ = 3;
  var MAX_PDF = 50 * 1024 * 1024; /* tamaño máximo del PDF a convertir (no se sube, solo se lee en el navegador) */
  var ANCHO_PX = 1240; /* ≈150 ppp en tamaño carta/A4 */
  /* Apartados: se reemplazan con los de la tabla archivo_categorias al abrir el archivero
     (categorias_info de la acción "sesion"). Estos valores solo son el respaldo. */
  var CAT = {
    celular: { nombre: 'Celular', icono: '📱', requiere_tienda: false, puede_borrar: false },
    computo: { nombre: 'Equipo de cómputo', icono: '💻', requiere_tienda: false, puede_borrar: false },
    vehiculo: { nombre: 'Vehículos', icono: '🚗', requiere_tienda: true, puede_borrar: false }
  };
  var catDe = function (id) { return CAT[id] || { nombre: id || 'Documento', icono: '📄', requiere_tienda: false, puede_borrar: false }; };
  var conTienda = function () { return !!catDe(st.cat).requiere_tienda; };
  /* Borrar se decide por apartado (p. ej. Sistemas ve Celular pero no puede borrar). */
  var puedeBorrar = function () { return st.infoApartados ? !!catDe(st.cat).puede_borrar : st.puedeBorrarTodo; };
  var ROLES = ['admin', 'admin_auditor', 'auditor', 'sistemas'];

  var st = { token: null, categorias: [], razones: [], puedeBorrarTodo: false, infoApartados: false, cat: null, docs: [], tiendas: [], q: '', tiendaF: '', razonF: '', cargando: false, subiendo: '', visor: null,
    /* Caché de esta página: con qué token se armó la sesión y la última lista de cada categoría.
       Al volver al archivero se muestra al instante y se actualiza en segundo plano. */
    sesTok: null, cache: {} };
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var msg = function (t) { if (typeof toast === 'function') toast(t); else alert(t); };
  var puedeVer = function () { return typeof _session !== 'undefined' && _session && ROLES.indexOf(_session.rol) >= 0; };
  var kb = function (n) { return n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; };
  var fecha = function (s) { var d = new Date(s); return isNaN(d) ? '' : d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }); };

  /* ---------- Token ---------- */
  function leerToken() {
    try {
      var t = JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null');
      return t && _session && t.u === _session.username ? t.t : null;
    } catch (e) { return null; }
  }
  /* Token nuevo con la sesión de Supabase Auth ya iniciada (sin contraseña). Si varias
     llamadas lo piden a la vez, comparten la misma renovación. */
  var renovando = null;
  function pedirToken() {
    if (renovando) return renovando;
    renovando = (async function () {
      var c = _sb || (typeof initSupabase === 'function' ? initSupabase() : null);
      if (!c || !_session) return null;
      var r = await c.rpc('renovar_token_monitor');
      if (r.error || !r.data) return null;
      try { localStorage.setItem(TOKEN_KEY, JSON.stringify({ u: _session.username, t: r.data })); } catch (e) {}
      return r.data;
    })().catch(function () { return null; }).then(function (t) { renovando = null; return t; });
    return renovando;
  }
  var SIN_ACCESO = 'No se pudo activar el acceso al archivero. Pulsa "Reintentar" o cierra sesión y vuelve a entrar.';

  /* ---------- Edge Function ---------- */
  async function api(accion, datos, reintento) {
    var r = await fetch(SB_URL + '/functions/v1/archivero', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SB_KEY },
      body: JSON.stringify(Object.assign({ user: _session.username, token: st.token, accion: accion }, datos || {}))
    });
    var j = await r.json().catch(function () { return { error: 'Respuesta inválida (' + r.status + ')' }; });
    if (r.status === 401) {
      st.token = null;
      try { localStorage.removeItem(TOKEN_KEY); } catch (e) {}
      /* El acceso venció: se renueva solo una vez y se repite la acción. */
      if (!reintento) {
        var nuevo = await pedirToken();
        if (nuevo) { st.token = nuevo; st.sesTok = nuevo; return api(accion, datos, true); }
      }
      pintarAuth(SIN_ACCESO);
      throw new Error('No autorizado');
    }
    if (!r.ok || j.error) throw new Error(j.error || ('Error ' + r.status));
    return j;
  }

  /* ---------- PDF → WebP (65%) ---------- */
  function cargarScript(src) {
    return new Promise(function (ok, mal) {
      var s = document.createElement('script');
      s.src = src; s.onload = ok; s.onerror = function () { mal(new Error('No se pudo cargar ' + src)); };
      document.head.appendChild(s);
    });
  }
  async function pdfjs() {
    if (!window.pdfjsLib) await cargarScript(PDFJS + 'pdf.min.js');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js';
    return window.pdfjsLib;
  }
  function canvasABlob(canvas) {
    return new Promise(function (ok) {
      canvas.toBlob(function (b) {
        if (b && b.type === 'image/webp') return ok(b);
        /* Navegadores sin WebP (p. ej. Safari antiguo): JPEG con la misma calidad */
        canvas.toBlob(ok, 'image/jpeg', CALIDAD);
      }, 'image/webp', CALIDAD);
    });
  }
  async function pdfAPaginas(file, avance) {
    var lib = await pdfjs();
    var pdf = await lib.getDocument({ data: await file.arrayBuffer() }).promise;
    var out = [];
    for (var i = 1; i <= pdf.numPages; i++) {
      avance('Convirtiendo página ' + i + ' de ' + pdf.numPages + '…');
      var page = await pdf.getPage(i);
      var base = page.getViewport({ scale: 1 });
      var vp = page.getViewport({ scale: Math.min(3, Math.max(1, ANCHO_PX / base.width)) });
      var canvas = document.createElement('canvas');
      canvas.width = Math.round(vp.width); canvas.height = Math.round(vp.height);
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      /* intent 'print': no usa requestAnimationFrame, así la conversión no se detiene si la
         pestaña pasa a segundo plano mientras se sube el archivo. */
      await page.render({ canvasContext: ctx, viewport: vp, intent: 'print' }).promise;
      var blob = await canvasABlob(canvas);
      out.push({ blob: blob, mime: blob.type, bytes: blob.size });
      canvas.width = canvas.height = 0; /* libera la memoria del lienzo */
    }
    return out;
  }

  /* ---------- Descargar como PDF ---------- */
  function cargarImagen(url) {
    return new Promise(function (ok, mal) {
      var img = new Image(); img.crossOrigin = 'anonymous';
      img.onload = function () { ok(img); }; img.onerror = function () { mal(new Error('No se pudo leer una página')); };
      img.src = url;
    });
  }
  async function descargarPDF(doc, urls) {
    if (!window.jspdf || !window.jspdf.jsPDF) { msg('No está disponible el generador de PDF'); return; }
    var pdf = null;
    for (var i = 0; i < urls.length; i++) {
      var img = await cargarImagen(urls[i]);
      var c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      var orient = c.width > c.height ? 'l' : 'p';
      if (!pdf) pdf = new window.jspdf.jsPDF({ orientation: orient, unit: 'pt', format: 'letter' });
      else pdf.addPage('letter', orient);
      var W = pdf.internal.pageSize.getWidth(), H = pdf.internal.pageSize.getHeight();
      var k = Math.min(W / c.width, H / c.height), w = c.width * k, h = c.height * k;
      pdf.addImage(c.toDataURL('image/jpeg', 0.85), 'JPEG', (W - w) / 2, (H - h) / 2, w, h);
    }
    var nombre = (catDe(doc.categoria).nombre + '_' + doc.empleado).replace(/[^\wÁÉÍÓÚÑáéíóúñ-]+/g, '_') + '.pdf';
    pdf.save(nombre);
  }

  /* ---------- Vista ---------- */
  function filtrados() {
    var f = st.q.toLowerCase();
    return st.docs.filter(function (d) {
      if (st.razonF && d.razon !== st.razonF) return false;
      if (st.tiendaF && d.tienda_id !== st.tiendaF) return false;
      return !f || (d.empleado + ' ' + (d.tiendas ? d.tiendas.nombre : '') + ' ' + (d.nombre_original || '') + ' ' + (d.subido_por || ''))
        .toLowerCase().indexOf(f) >= 0;
    });
  }

  function htmlSubir() {
    var veh = conTienda();
    return '<div class="arch-subir"><div class="arch-sub-t">Subir responsiva firmada (PDF) — ' + esc(catDe(st.cat).nombre) + '</div>' +
      '<div class="arch-row">' +
      '<label class="arch-lbl">Nombre del empleado<input class="kc-in" id="arch-emp" placeholder="Nombre completo" style="min-width:240px"></label>' +
      (veh ? '<label class="arch-lbl">Sucursal<select class="kc-in" id="arch-tienda"><option value="">Selecciona…</option>' +
        st.tiendas.map(function (t) { return '<option value="' + t.id + '">' + esc(t.nombre) + (t.razon ? ' (' + esc(t.razon) + ')' : '') + '</option>'; }).join('') +
        '</select></label>'
        : '<label class="arch-lbl">Razón social<select class="kc-in" id="arch-razon">' +
          (st.razones.length > 1 ? '<option value="">Selecciona…</option>' : '') +
          st.razones.map(function (r) { return '<option value="' + r + '">' + r + '</option>'; }).join('') +
          '</select></label>') +
      '<label class="arch-lbl">Archivo PDF<input type="file" class="kc-in" id="arch-file" accept="application/pdf,.pdf"></label>' +
      '<button class="kc-btn kc-pri" data-ar="subir"' + (st.subiendo ? ' disabled' : '') + '>' + (st.subiendo ? 'Subiendo…' : 'Subir') + '</button>' +
      '</div>' + (st.subiendo ? '<div class="kc-sub" style="margin-top:6px">' + esc(st.subiendo) + '</div>' : '') +
      '<div class="kc-note" style="margin:8px 0 0">Cada página se guarda en Supabase Storage como imagen WebP al ' + PCT + ' (el PDF original no se sube). Al descargar, se vuelve a armar el PDF.</div></div>';
  }

  function htmlLista() {
    var veh = conTienda();
    var rows = filtrados();
    var filtros = '<div class="arch-row" style="margin:14px 0 10px">' +
      '<input class="kc-in" id="arch-q" placeholder="Buscar por empleado…" value="' + esc(st.q) + '" style="flex:1;min-width:200px">' +
      (st.razones.length > 1 ? '<select class="kc-in" id="arch-rf"><option value="">Todas las razones</option>' +
        st.razones.map(function (r) { return '<option value="' + r + '"' + (r === st.razonF ? ' selected' : '') + '>' + r + '</option>'; }).join('') +
        '</select>' : '') +
      (veh ? '<select class="kc-in" id="arch-tf"><option value="">Todas las sucursales</option>' +
        st.tiendas.map(function (t) { return '<option value="' + t.id + '"' + (t.id === st.tiendaF ? ' selected' : '') + '>' + esc(t.nombre) + '</option>'; }).join('') +
        '</select>' : '') +
      '<span class="kc-sub">' + rows.length + ' documento(s)</span></div>';
    if (st.cargando) return filtros + '<p class="kc-empty">Cargando…</p>';
    if (!rows.length) return filtros + '<p class="kc-empty">' + (st.docs.length ? 'Sin resultados' : 'Aún no hay documentos en este archivero') + '</p>';
    return filtros + '<div class="kc-wrap"><table class="kc-t"><thead><tr><th>Empleado</th><th>Razón social</th>' + (veh ? '<th>Sucursal</th>' : '') +
      '<th>Páginas</th><th>Tamaño</th><th>Subido por</th><th>Fecha</th><th></th></tr></thead><tbody>' +
      rows.map(function (d) {
        return '<tr data-id="' + d.id + '"><td><b>' + esc(d.empleado) + '</b><div class="kc-sub">' + esc(d.nombre_original || '') + '</div></td>' +
          '<td>' + esc(d.razon || '') + '</td>' +
          (veh ? '<td>' + esc(d.tiendas ? d.tiendas.nombre : '—') + '</td>' : '') +
          '<td>' + d.paginas + '</td><td>' + kb(d.tamano_bytes) + '</td><td>' + esc(d.subido_por || '') + '</td><td>' + fecha(d.created_at) + '</td>' +
          '<td style="white-space:nowrap"><button class="kc-btn" data-ar="ver">Ver</button> <button class="kc-btn" data-ar="pdf">PDF</button>' +
          (puedeBorrar() ? ' <button class="kc-btn arch-del" data-ar="borrar">Eliminar</button>' : '') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function htmlVisor() {
    var v = st.visor;
    return '<div class="arch-visor"><div class="arch-row" style="justify-content:space-between;margin-bottom:10px">' +
      '<div><b>' + esc(v.doc.empleado) + '</b> <span class="kc-sub">' + esc(catDe(v.doc.categoria).nombre) + ' · ' + esc(v.doc.razon || '') +
      (v.doc.tiendas ? ' · ' + esc(v.doc.tiendas.nombre) : '') + ' · ' + v.doc.paginas + ' página(s)</span></div>' +
      '<div class="arch-row"><button class="kc-btn" data-ar="pdf-visor">Descargar PDF</button><button class="kc-btn" data-ar="cerrar-visor">Volver a la lista</button></div></div>' +
      (v.urls ? v.urls.map(function (u, i) { return '<img class="arch-pag" src="' + esc(u) + '" alt="Página ' + (i + 1) + '">'; }).join('') : '<p class="kc-empty">Cargando páginas…</p>') +
      '</div>';
  }

  function pintar() {
    var body = $('arch-body');
    if (!body) return;
    $('arch-auth').style.display = 'none';
    $('arch-main').style.display = 'block';
    $('arch-tabs').innerHTML = st.categorias.map(function (c) {
      return '<button class="kc-tab' + (c === st.cat ? ' on' : '') + '" data-arch-cat="' + esc(c) + '">' + esc(catDe(c).icono) + ' ' + esc(catDe(c).nombre) + '</button>';
    }).join('');
    body.innerHTML = st.visor ? htmlVisor() : htmlSubir() + htmlLista();
  }

  function pintarAuth(err) {
    if (!$('arch-auth')) return;
    $('arch-main').style.display = 'none';
    $('arch-auth').style.display = 'block';
    $('arch-err').textContent = err || '';
  }

  /* ---------- Carga y acciones ---------- */
  async function iniciar() {
    $('arch-auth').style.display = 'none';
    $('arch-main').style.display = 'block';
    /* Ya se abrió antes en esta página con el mismo token: se pinta lo guardado y se refresca. */
    if (st.sesTok && st.sesTok === st.token) return cargarLista();
    st.cache = {};
    $('arch-body').innerHTML = '<p class="kc-empty">Cargando…</p>';
    try {
      /* Una sola llamada trae permisos, razones, tiendas y la lista de la categoría. */
      var s = await api('sesion', { categoria: st.cat });
      st.categorias = s.categorias || [];
      /* Sin categorias_info (Edge Function anterior) se usa el permiso general de borrar. */
      st.infoApartados = Array.isArray(s.categorias_info);
      (s.categorias_info || []).forEach(function (c) { CAT[c.id] = c; });
      st.razones = s.razones || [];
      st.puedeBorrarTodo = !!s.puede_borrar;
      st.tiendas = s.tiendas || [];
      st.cat = s.categoria || null;
      st.docs = s.documentos || [];
      if (st.cat) st.cache[st.cat] = st.docs;
      st.sesTok = st.token;
      pintar();
    } catch (e) { if (st.token) $('arch-body').innerHTML = '<p class="kc-empty kc-warn">Error: ' + esc(e.message) + '</p>'; }
  }

  /* Si ya hay lista guardada de la categoría se muestra de inmediato y se actualiza sin
     el aviso de "Cargando…". */
  async function cargarLista() {
    if (!st.cat) { pintar(); return; }
    var cat = st.cat, guardada = st.cache[cat];
    if (guardada) { st.docs = guardada; st.cargando = false; }
    else st.cargando = true;
    pintar();
    try {
      var docs = (await api('listar', { categoria: cat })).documentos || [];
      st.cache[cat] = docs;
      if (st.cat === cat) st.docs = docs;
    } catch (e) { if (!guardada) st.docs = []; if (st.token) msg('Error: ' + e.message); }
    st.cargando = false;
    if (st.token && st.cat === cat && !st.visor) pintar();
  }

  /* Activa el acceso sin contraseña (al abrir el archivero o con "Reintentar"). */
  async function entrar() {
    var b = $('arch-go');
    if (b) b.disabled = true;
    $('arch-auth').style.display = 'none';
    $('arch-main').style.display = 'block';
    $('arch-body').innerHTML = '<p class="kc-empty">Cargando…</p>';
    var tok = await pedirToken();
    if (b) b.disabled = false;
    if (!tok) { pintarAuth(SIN_ACCESO); return; }
    st.token = tok;
    await iniciar();
  }

  /* Sube las páginas directo al bucket con las URLs firmadas de "preparar" (sin pasar las
     imágenes por la Edge Function), de SUBIDAS_A_LA_VEZ en SUBIDAS_A_LA_VEZ. */
  async function subirPaginas(pags, subidas, aviso) {
    var c = (typeof _sb !== 'undefined' && _sb) || (typeof initSupabase === 'function' ? initSupabase() : null);
    if (!c) throw new Error('Sin conexión a Supabase');
    var bucket = c.storage.from('archivero'), hechas = 0, sig = 0;
    async function trabajador() {
      while (sig < subidas.length) {
        var i = sig++;
        var r = await bucket.uploadToSignedUrl(subidas[i].ruta, subidas[i].token, pags[i].blob, { contentType: pags[i].mime });
        if (r.error) throw new Error('Página ' + (i + 1) + ': ' + r.error.message);
        aviso('Subiendo páginas… ' + (++hechas) + ' de ' + subidas.length);
      }
    }
    var n = Math.min(SUBIDAS_A_LA_VEZ, subidas.length), ts = [];
    for (var k = 0; k < n; k++) ts.push(trabajador());
    await Promise.all(ts);
  }

  async function subir() {
    var emp = ($('arch-emp').value || '').trim();
    var file = $('arch-file').files[0];
    var veh = conTienda();
    var tienda = veh ? $('arch-tienda').value : null;
    var razon = veh ? null : $('arch-razon').value;
    if (!emp) { msg('Escribe el nombre del empleado'); return; }
    if (veh && !tienda) { msg('Selecciona la sucursal'); return; }
    if (!veh && !razon) { msg('Selecciona la razón social'); return; }
    if (!file) { msg('Selecciona el PDF'); return; }
    if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') { msg('El archivo debe ser PDF'); return; }
    if (file.size > MAX_PDF) { msg('El PDF pesa ' + kb(file.size) + '; el máximo es 50 MB'); return; }
    var cat = st.cat;
    var aviso = function (t) { st.subiendo = t; var s = document.querySelector('.arch-subir .kc-sub'); if (s) s.textContent = t; };
    st.subiendo = 'Leyendo PDF…'; pintar();
    try {
      var pags = await pdfAPaginas(file, aviso);
      var total = pags.reduce(function (a, p) { return a + p.bytes; }, 0);
      var datos = { categoria: cat, empleado: emp, razon: razon, tienda_id: tienda, nombre_original: file.name };
      /* 1) La Edge Function valida permisos y entrega una URL firmada por página. */
      aviso('Preparando ' + pags.length + ' página(s) (' + kb(total) + ')…');
      var prep = await api('preparar', Object.assign({ paginas: pags.map(function (p) { return { mime: p.mime }; }) }, datos));
      /* 2) Cada página sube directo al bucket. 3) Se confirma y queda registrado. */
      await subirPaginas(pags, prep.subidas, aviso);
      aviso('Registrando documento…');
      await api('confirmar', Object.assign({ id: prep.id, rutas: prep.subidas.map(function (x) { return x.ruta; }) }, datos));
      msg('✓ Guardado: ' + pags.length + ' página(s) WebP al ' + PCT + ' (' + kb(total) + '; el PDF pesaba ' + kb(file.size) + ')' +
        (pags[0] && pags[0].mime !== 'image/webp' ? ' (JPEG: este navegador no genera WebP)' : ''));
      st.subiendo = '';
      delete st.cache[cat];
      await cargarLista();
    } catch (e) {
      st.subiendo = '';
      if (st.token) { pintar(); msg('Error al subir: ' + e.message); }
    }
  }

  async function abrirVisor(doc, soloPDF) {
    try {
      if (!soloPDF) { st.visor = { doc: doc, urls: null }; pintar(); window.scrollTo(0, 0); }
      var v = await api('ver', { id: doc.id });
      var urls = v.paginas || [];
      /* Al descargar, el PDF se arma con las páginas WebP guardadas. */
      if (soloPDF) { msg('Generando PDF…'); await descargarPDF(doc, urls); return; }
      if (st.visor && st.visor.doc.id === doc.id) { st.visor.urls = urls; pintar(); }
    } catch (e) { if (st.token) msg('Error: ' + e.message); }
  }

  async function borrar(doc) {
    if (!confirm('¿Eliminar la responsiva de ' + doc.empleado + '? Esta acción no se puede deshacer.')) return;
    try { await api('borrar', { id: doc.id }); msg('Documento eliminado'); await cargarLista(); }
    catch (e) { if (st.token) msg('Error: ' + e.message); }
  }

  /* ---------- Sección y menú ---------- */
  function abrir() {
    if (!puedeVer()) { msg('Sin permisos'); return; }
    setView('archivero');
  }

  function mostrarVista(visible) {
    var v = $('view-archivero'), n = $('nav-archivero');
    if (!v) return;
    var antes = v.style.display !== 'none';
    v.style.display = visible ? 'block' : 'none';
    if (n) n.classList.toggle('active', visible);
    if (visible && !antes) {
      st.visor = null; st.q = ''; st.tiendaF = ''; st.razonF = ''; st.subiendo = '';
      st.token = leerToken();
      if (st.token) iniciar(); else entrar();
    }
    if (!visible && antes) { st.docs = []; st.visor = null; }
  }

  /* Encabezado de la app: el rol Sistemas ve "Monitor de Documentos"; los demás, el original. */
  var ENCABEZADO = null;
  function actualizarEncabezado() {
    var h = document.querySelector('.topbar-title h1'), p = $('topbar-sub');
    if (!h || !p) return;
    if (!ENCABEZADO) ENCABEZADO = { h: h.innerHTML, p: p.textContent, t: document.title };
    var sis = typeof _session !== 'undefined' && _session && _session.rol === 'sistemas';
    h.innerHTML = sis ? 'Monitor de <b>Documentos</b>' : ENCABEZADO.h;
    p.textContent = sis ? 'Grupo Kuroda · Sistema de documentos e inventarios de activos' : ENCABEZADO.p;
    document.title = sis ? 'Monitor de Documentos — Grupo Kuroda' : ENCABEZADO.t;
  }

  function actualizarMenu() {
    var n = $('nav-archivero');
    if (n) n.style.display = puedeVer() ? '' : 'none';
    actualizarEncabezado();
    if (!puedeVer() && typeof VIEW !== 'undefined' && VIEW === 'archivero') setView('dash');
  }

  function montar() {
    if ($('view-archivero')) return;
    var css = document.createElement('style');
    css.id = 'arch-style';
    css.textContent =
      '.arch-subir{border:1px dashed var(--border);border-radius:12px;padding:14px;background:var(--soft)}' +
      '.arch-sub-t{font-size:13px;font-weight:700;margin-bottom:10px}' +
      '.arch-row{display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap}' +
      '.arch-lbl{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:600;color:var(--muted)}' +
      '.arch-del{color:var(--red)}.arch-del:hover{border-color:var(--red);color:var(--red)}' +
      '.arch-visor{padding-bottom:10px}' +
      '.arch-pag{display:block;max-width:100%;margin:0 auto 14px;border:1px solid var(--border);border-radius:6px;background:#fff;box-shadow:var(--shadow)}';
    document.head.appendChild(css);

    var ref = $('view-correos') || $('view-generador') || $('view-dash');
    var d = document.createElement('div');
    d.id = 'view-archivero';
    d.style.display = 'none';
    d.innerHTML =
      '<div class="card kc-panel">' +
      '<div class="kc-hdr"><span style="font-size:18px">🗄️</span><h3>Archivero de responsivas</h3></div>' +
      '<div id="arch-auth" style="display:none;padding:22px 20px">' +
      '<div id="arch-err" style="font-size:13px;color:var(--red);min-height:18px;margin:0 0 10px"></div>' +
      '<div class="kc-row"><button id="arch-go" class="kc-btn kc-pri">Reintentar</button></div></div>' +
      '<div id="arch-main" style="display:none">' +
      '<div class="kc-bar"><div class="kc-tabs" id="arch-tabs"></div></div>' +
      '<div id="arch-body" class="kc-body" style="padding-top:14px"></div></div></div>';
    if (ref && ref.parentNode) ref.parentNode.insertBefore(d, ref.nextSibling);
    else document.body.appendChild(d);

    d.addEventListener('click', function (e) {
      if (e.target.id === 'arch-go') return entrar();
      var t = e.target.closest('[data-arch-cat]');
      if (t) { st.cat = t.getAttribute('data-arch-cat'); st.visor = null; st.q = ''; st.tiendaF = ''; st.razonF = ''; cargarLista(); return; }
      var b = e.target.closest('[data-ar]');
      if (!b) return;
      var a = b.getAttribute('data-ar');
      if (a === 'subir') return subir();
      if (a === 'cerrar-visor') { st.visor = null; pintar(); return; }
      if (a === 'pdf-visor' && st.visor) return abrirVisor(st.visor.doc, true);
      var tr = b.closest('tr'), id = tr && tr.getAttribute('data-id');
      var doc = st.docs.filter(function (x) { return x.id === id; })[0];
      if (!doc) return;
      if (a === 'ver') return abrirVisor(doc, false);
      if (a === 'pdf') return abrirVisor(doc, true);
      if (a === 'borrar') return borrar(doc);
    });
    d.addEventListener('input', function (e) {
      if (e.target.id === 'arch-q') {
        st.q = e.target.value;
        var pos = e.target.selectionStart;
        pintar();
        var q = $('arch-q'); if (q) { q.focus(); q.setSelectionRange(pos, pos); }
      }
    });
    d.addEventListener('change', function (e) {
      if (e.target.id === 'arch-tf') { st.tiendaF = e.target.value; pintar(); }
      if (e.target.id === 'arch-rf') { st.razonF = e.target.value; pintar(); }
    });
  }

  /* ---------- Enganches con app-core.js (encadenados con los de app-correos.js) ---------- */
  function enganchar() {
    if (typeof window.setView === 'function' && !window.setView._ar) {
      var sv = window.setView;
      window.setView = function (v) {
        var r = sv.apply(this, arguments);
        mostrarVista(v === 'archivero');
        return r;
      };
      window.setView._ar = true;
    }
    /* "archivero" no está en la lista de vistas de app-core: mientras corre la restricción se
       usa "documentos" (visible para todos los roles con archivero) para que no redirija. */
    if (typeof window.applyVistasRestriction === 'function' && !window.applyVistasRestriction._ar) {
      var avr = window.applyVistasRestriction;
      window.applyVistasRestriction = function () {
        var enArch = typeof VIEW !== 'undefined' && VIEW === 'archivero';
        if (enArch) VIEW = 'documentos';
        var r = avr.apply(this, arguments);
        if (enArch) VIEW = 'archivero';
        actualizarMenu();
        return r;
      };
      window.applyVistasRestriction._ar = true;
    }
    if (typeof window.doLogout === 'function' && !window.doLogout._ar) {
      var lo = window.doLogout;
      window.doLogout = function () {
        if (typeof VIEW !== 'undefined' && VIEW === 'archivero') setView('dash');
        var r = lo.apply(this, arguments);
        actualizarMenu();
        return r;
      };
      window.doLogout._ar = true;
    }
  }

  function init() { montar(); enganchar(); actualizarMenu(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  window.abrirArchivero = abrir;
})();
