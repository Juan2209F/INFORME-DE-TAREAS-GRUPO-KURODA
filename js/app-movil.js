/* Vista para teléfonos — Grupo Kuroda
   Complementa css/movil.css. Solo actúa en teléfonos y tabletas chicas (ver MEDIA); en computadora no
   cambia nada (lo que agrega queda oculto por CSS).
   1) Menú inferior: muestra los primeros 4 accesos visibles para el rol y un botón "Más"
      que abre una hoja con el resto (respeta las vistas permitidas de cada usuario).
   2) Filtros del tablero plegables, con el número de filtros activos.
   3) Tablas en tarjetas: cada celda lleva el nombre de su columna (data-label) para leerse
      sin desplazarse a los lados. Se aplica a las tablas de 4 columnas o más, también a las
      que se vuelven a dibujar al filtrar.
   Depende de: index.html (nav.sidebar, .filters, #topbar-user). */
(function () {
  'use strict';

  /* Misma condición que css/movil.css: teléfonos, tabletas chicas y teléfono acostado. */
  var MEDIA = '(max-width: 768px), (max-height: 500px) and (max-width: 1024px)';
  var mq = window.matchMedia(MEDIA);
  var PRINCIPALES = 4;
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  /* ---------- 1) Menú inferior con "Más" ---------- */
  var nav, mas, hoja;
  function itemsMenu() {
    return Array.prototype.filter.call(nav.querySelectorAll('.nav-item'), function (n) { return n.id !== 'nav-mas'; });
  }
  /* Visible para el rol: app-core y los módulos lo ocultan con style.display = 'none'. */
  function permitido(n) { return n.style.display !== 'none'; }
  function partes(n) {
    var lbl = n.querySelector('.nav-lbl');
    var ico = '';
    for (var i = 0; i < n.childNodes.length; i++) {
      if (n.childNodes[i].nodeType === 3 && n.childNodes[i].textContent.trim()) { ico = n.childNodes[i].textContent.trim(); break; }
    }
    return { ico: ico || '•', lbl: lbl ? lbl.textContent.trim() : (n.title || '') };
  }
  function organizarMenu() {
    if (!nav) return;
    var vis = itemsMenu().filter(permitido);
    /* Si caben todos (5 o menos) no hace falta "Más". */
    var limite = vis.length <= PRINCIPALES + 1 ? vis.length : PRINCIPALES;
    var hayExtra = false, extraActivo = false;
    itemsMenu().forEach(function (n) {
      var extra = vis.indexOf(n) >= limite;
      n.classList.toggle('nav-extra', extra);
      if (extra) { hayExtra = true; if (n.classList.contains('active')) extraActivo = true; }
    });
    mas.classList.toggle('mv-oculto', !hayExtra);
    mas.classList.toggle('active', extraActivo);
  }
  function abrirHoja() {
    var u = $('topbar-user');
    var spans = u ? u.querySelectorAll('span') : [];
    var nombre = spans[0] ? spans[0].textContent : (u ? u.textContent : '');
    var rol = spans[1] ? spans[1].textContent : '';
    var extras = itemsMenu().filter(function (n) { return permitido(n) && n.classList.contains('nav-extra'); });
    hoja.querySelector('.mv-hoja-usr').innerHTML = '<div><b>' + esc(nombre) + '</b><small>' + esc(rol) + '</small></div>';
    hoja.querySelector('.mv-hoja-grid').innerHTML = extras.map(function (n) {
      var p = partes(n);
      return '<button type="button" data-mv-ir="' + esc(n.id) + '"' + (n.classList.contains('active') ? ' class="activo"' : '') +
        '><span>' + esc(p.ico) + '</span>' + esc(p.lbl) + '</button>';
    }).join('');
    hoja.classList.add('abierta');
  }
  function cerrarHoja() { if (hoja) hoja.classList.remove('abierta'); }
  function montarMenu() {
    nav = document.querySelector('nav.sidebar');
    if (!nav || $('nav-mas')) return;
    mas = document.createElement('div');
    mas.className = 'nav-item';
    mas.id = 'nav-mas';
    mas.title = 'Más secciones';
    mas.innerHTML = '☰<span class="nav-lbl">Más</span>';
    mas.addEventListener('click', abrirHoja);
    nav.appendChild(mas);

    hoja = document.createElement('div');
    hoja.className = 'mv-hoja';
    hoja.innerHTML = '<div class="mv-hoja-caja" role="dialog" aria-label="Más secciones"><div class="mv-hoja-asa"></div>' +
      '<div class="mv-hoja-usr"></div><div class="mv-hoja-grid"></div></div>';
    hoja.addEventListener('click', function (e) {
      var b = e.target.closest('[data-mv-ir]');
      if (b) { cerrarHoja(); var n = $(b.getAttribute('data-mv-ir')); if (n) n.click(); return; }
      if (e.target === hoja) cerrarHoja();
    });
    document.body.appendChild(hoja);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') cerrarHoja(); });

    /* Los módulos muestran/ocultan accesos y cambian el activo: se reorganiza al momento. */
    new MutationObserver(programar).observe(nav, { subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
  }

  /* ---------- 2) Filtros plegables ---------- */
  function filtrosActivos(f) {
    var n = 0;
    f.querySelectorAll('select, input').forEach(function (c) {
      if (c.type === 'file' || c.type === 'checkbox') return;
      var v = c.value;
      if (v && v !== 'ALL' && v !== 'all' && v !== 'Todas' && v !== 'Todos') n++;
    });
    return n;
  }
  function contarFiltros(f) {
    var b = f.querySelector('.mv-filtros-btn .mv-n');
    if (!b) return;
    var n = filtrosActivos(f);
    b.textContent = n ? n + ' activo' + (n > 1 ? 's' : '') : '';
    b.style.display = n ? '' : 'none';
  }
  function montarFiltros() {
    document.querySelectorAll('.filters').forEach(function (f) {
      if (f.querySelector('.mv-filtros-btn')) return;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'mv-filtros-btn';
      b.innerHTML = '<span>🔎 Filtros<span class="mv-n"></span></span><span class="mv-flecha">▾</span>';
      b.addEventListener('click', function () { f.classList.toggle('mv-abierto'); });
      f.insertBefore(b, f.firstChild);
      f.addEventListener('change', function () { contarFiltros(f); });
      contarFiltros(f);
    });
  }

  /* ---------- 3) Tablas en tarjetas ---------- */
  var TITULO = /tarea|nombre|actividad|descripci|usuario|sucursal|tienda/i;
  function etiquetas(tabla) {
    var filas = tabla.tHead ? tabla.tHead.rows : null;
    if (!filas || !filas.length) return null;
    var ths = filas[filas.length - 1].cells, out = [];
    for (var i = 0; i < ths.length; i++) {
      if ((ths[i].colSpan || 1) > 1) return null;   /* encabezados combinados: se deja como tabla */
      out.push(ths[i].textContent.replace(/\s+/g, ' ').trim());
    }
    return out;
  }
  function tarjetas(tabla) {
    if (tabla.closest('iframe, .mv-sin-tarjetas')) return;
    var eti = etiquetas(tabla);
    if (!eti || eti.length < 4) { tabla.dataset.mv = 'no'; return; }
    var cuerpos = tabla.tBodies;
    for (var b = 0; b < cuerpos.length; b++) {
      var filas = cuerpos[b].rows;
      for (var r = 0; r < filas.length; r++) {
        var tr = filas[r];
        if (tr.dataset.mv) continue;
        tr.dataset.mv = '1';
        var cs = tr.cells, titulo = false;
        for (var c = 0; c < cs.length; c++) {
          var td = cs[c];
          if (cs.length !== eti.length || (td.colSpan || 1) > 1) { td.classList.add('mv-completa'); continue; }
          td.setAttribute('data-label', eti[c] === '✎' ? '' : eti[c]);
          if (!titulo && TITULO.test(eti[c]) && td.textContent.trim().length > 12) { td.classList.add('mv-titulo'); titulo = true; }
        }
      }
    }
    tabla.classList.add('mv-tarjetas');
    tabla.dataset.mv = '1';
  }
  function revisarTablas() {
    document.querySelectorAll('.content table, .modal table, .kpi-cfg-modal table').forEach(function (t) {
      if (t.dataset.mv === 'no') return;
      tarjetas(t);   /* también procesa filas nuevas de una tabla ya convertida */
    });
  }

  /* ---------- 4) Filtros de cada sección en renglón ----------
     Cuadrículas cuyos hijos son solo campos de filtro (.fg con un select): en vez de uno
     debajo de otro (regla general de main.css) se acomodan lado a lado. */
  function filtrosEnRenglon() {
    document.querySelectorAll('.content [style*="grid-template-columns"]:not(.mv-filtros-fila)').forEach(function (g) {
      var hijos = g.children;
      if (hijos.length < 2) return;
      for (var i = 0; i < hijos.length; i++) {
        if (!hijos[i].classList.contains('fg') || !hijos[i].querySelector('select')) return;
      }
      g.classList.add('mv-filtros-fila');
    });
  }

  /* ---------- Coordinación ---------- */
  var pendiente = false;
  function programar() {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(function () {
      pendiente = false;
      if (!mq.matches) return;
      organizarMenu();
      montarFiltros();
      revisarTablas();
      filtrosEnRenglon();
    });
  }
  function init() {
    montarMenu();
    var contenido = document.querySelector('.content');
    var obs = new MutationObserver(programar);
    if (contenido) obs.observe(contenido, { childList: true, subtree: true });
    document.querySelectorAll('.modal-body, .kpi-cfg-modal').forEach(function (m) { obs.observe(m, { childList: true, subtree: true }); });
    if (mq.addEventListener) mq.addEventListener('change', programar); else if (mq.addListener) mq.addListener(programar);
    programar();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  window.__kgMovil = { organizarMenu: organizarMenu, revisarTablas: revisarTablas, abrirHoja: abrirHoja, cerrarHoja: cerrarHoja };
})();
