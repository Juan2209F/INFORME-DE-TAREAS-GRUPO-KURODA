/* ════════════════════════════════════════════════════════════════════
   INFORME EJECUTIVO DE CUMPLIMIENTO — módulo de "Generador de Documentos"
   ────────────────────────────────────────────────────────────────────
   Lee dos archivos y arma la vista del informe ejecutivo:
     • Excel (.xlsx)  → AUDITORÍA DE COLABORACIÓN (hoja "INFORME EJECUTIVO":
                        columna A = punto, columna E = VERDADERO/FALSO).
     • PDF            → AUDITORÍA DE ORDEN Y LIMPIEZA (reporte de la app de
                        auditoría: preguntas Sí/No; la opción marcada en verde
                        cumple y la marcada en rojo es hallazgo).
   Todo se procesa en el navegador; nada se sube a ningún servidor.
   Antes de descargar se puede corregir cualquier punto a mano.

   Depende de: XLSX (ya lo carga documentos.html: xlsx-js-style).
   Carga bajo demanda: pdf.js 3.11.174 (mismo que app-archivero.js) y
   html2canvas 1.4.1 (mismo que generador.html).
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  var H2C = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
  var UMBRAL_OK = 90, UMBRAL_SEG = 70;

  /* Estado del informe */
  var S = {
    empresa: 'Kuroda',
    titulo: 'Informe ejecutivo de cumplimiento',
    colab: null,   /* {archivo, hojas:[], hoja, tienda, periodo, puntos:[{area,proceso,punto,cumple}], sinEvaluar:[]} */
    ol: null       /* {archivo, tienda, fecha, auditor, preguntas:[{grupo,pregunta,respuesta,cumple}]} */
  };
  var XLSX_WB = null;

  /* ───────────────────────── utilidades ───────────────────────── */
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }
  var MINUS = ['de', 'del', 'la', 'las', 'los', 'y', 'e', 'o', 'u', 'a', 'en', 'con', 'para', 'por', 'sin'];
  function titulo(s) {
    s = String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
    return s.split(' ').map(function (w, i) {
      if (i > 0 && MINUS.indexOf(w) >= 0) return w;
      if (/^(kn|ks|kno|ksc|ksa|ii|iii)$/.test(w)) return w.toUpperCase();
      return w.charAt(0).toUpperCase() + w.slice(1);
    }).join(' ');
  }
  function frase(s) {
    s = String(s || '').replace(/\s+/g, ' ').trim();
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  }
  function limpiaPunto(s) { return String(s || '').replace(/[\uE000-\uF8FF]/g, '').replace(/\s+/g, ' ').trim().replace(/[.:]\s*$/, ''); }
  function pct(n, d) { return d ? (n / d) * 100 : 0; }
  function fmtPct(p) { return (Math.round(p * 10) / 10).toFixed(1).replace(/\.0$/, '') + '%'; }
  function estado(p) {
    if (p >= UMBRAL_OK) return { k: 'ok', t: 'Cumple' };
    if (p >= UMBRAL_SEG) return { k: 'seg', t: 'En seguimiento' };
    return { k: 'bad', t: 'Requiere atención' };
  }
  function cargarScript(src) {
    return new Promise(function (ok, mal) {
      var s = document.createElement('script');
      s.src = src; s.onload = ok;
      s.onerror = function () { mal(new Error('No se pudo cargar ' + src)); };
      document.head.appendChild(s);
    });
  }
  function esperar(fn, ms) {
    return new Promise(function (ok, mal) {
      var t0 = Date.now();
      (function poll() {
        var v = fn(); if (v) return ok(v);
        if (Date.now() - t0 > ms) return mal(new Error('Tiempo de espera agotado'));
        setTimeout(poll, 50);
      })();
    });
  }
  async function pdfjs() {
    if (!window.pdfjsLib) await cargarScript(PDFJS + 'pdf.min.js');
    var lib = await esperar(function () { return window.pdfjsLib; }, 8000);
    if (lib.GlobalWorkerOptions && !lib.GlobalWorkerOptions.workerSrc) lib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js';
    return lib;
  }
  function estadoMsg(id, txt, tipo) {
    var e = $(id); if (!e) return;
    e.textContent = txt || '';
    e.className = 'ie-msg' + (tipo ? ' ie-msg-' + tipo : '');
  }

  /* ───────────────── EXCEL: auditoría de colaboración ─────────────────
     Recorre la hoja fila por fila:
       - Fila de título ("INFORME EJECUTIVO DE …") → tienda y periodo.
       - Texto en MAYÚSCULAS sin casilla → área (EFECTIVO, VEHICULOS, …).
       - Fila con VERDADERO/FALSO en la columna E → punto auditado.
       - Texto sin casilla y sin valor en D → encabezado de proceso
         ("Picking:", "Mercancía en resguardo.").
       - Texto sin casilla pero con valor en D → punto sin evaluar (no cuenta).
       - "NIVEL DE CUMPLIMIENTO TOTAL" → fin. */
  var AREAS_BONITAS = {
    'EFECTIVO': 'Efectivo',
    'FONDO (S) REVOLVENTE Y CAJA CHICA': 'Fondo revolvente y caja chica',
    'FONDO(S) REVOLVENTE Y CAJA CHICA': 'Fondo revolvente y caja chica',
    'FONDOS REVOLVENTES Y CAJA CHICA': 'Fondo revolvente y caja chica',
    'ENTRADAS Y SALIDAS': 'Entradas y salidas',
    'VEHICULOS': 'Vehículos', 'VEHÍCULOS': 'Vehículos'
  };
  function esMayus(s) { return /[A-ZÁÉÍÓÚÑ]/.test(s) && s === s.toUpperCase(); }
  function esBool(v) { return v === true || v === false || v === 'TRUE' || v === 'FALSE' || v === 'VERDADERO' || v === 'FALSO'; }
  function aBool(v) { return v === true || v === 'TRUE' || v === 'VERDADERO'; }

  function parseColaboracion(filas) {
    var r = { tienda: '', periodo: '', puntos: [], sinEvaluar: [] };
    var area = null, proc = '';
    for (var i = 0; i < filas.length; i++) {
      var f = filas[i] || [];
      var a = f[0] == null ? '' : String(f[0]).replace(/\s+/g, ' ').trim();
      var d = f[3], e = f[4];
      if (!a) continue;
      if (/^NIVEL DE CUMPLIMIENTO/i.test(a)) break;
      if (/^INFORME EJECUTIVO/i.test(a)) {
        var t = a.replace(/^INFORME EJECUTIVO\s*(DE\s+)?/i, '');
        var m = t.match(/\s*[-–]?\s*([A-ZÁÉÍÓÚa-záéíóú]+)\s*[-–\/ ]\s*(\d{4})\s*$/);
        if (m) { r.periodo = titulo(m[1]) + ' ' + m[2]; t = t.slice(0, m.index); }
        r.tienda = titulo(t);
        continue;
      }
      if (/^[ÁA]REAS AUDITADAS/i.test(a)) continue;
      if (esBool(e)) {
        if (!area) area = 'General';
        r.puntos.push({ area: area, proceso: proc || area, punto: limpiaPunto(a), cumple: aBool(e) });
        continue;
      }
      if (esMayus(a)) { area = AREAS_BONITAS[a.toUpperCase()] || frase(a); proc = ''; continue; }
      if (d == null || d === '') { proc = frase(limpiaPunto(a)); continue; }
      r.sinEvaluar.push({ area: area || 'General', proceso: proc || area, punto: limpiaPunto(a) });
    }
    return r;
  }
  function hojaAFilas(ws) {
    return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null, blankrows: false });
  }
  function hojasValidas(wb) {
    var out = [];
    wb.SheetNames.forEach(function (n) {
      var p = parseColaboracion(hojaAFilas(wb.Sheets[n]));
      if (p.puntos.length) out.push(n);
    });
    /* La hoja "INFORME EJECUTIVO" va primero si existe */
    out.sort(function (a, b) { return (/informe ejecutivo/i.test(b) ? 1 : 0) - (/informe ejecutivo/i.test(a) ? 1 : 0); });
    return out;
  }
  async function leerExcel(file) {
    if (typeof XLSX === 'undefined') throw new Error('No se cargó la librería de Excel. Revisa tu conexión y recarga.');
    var buf = await file.arrayBuffer();
    XLSX_WB = XLSX.read(buf, { type: 'array' });
    var hojas = hojasValidas(XLSX_WB);
    if (!hojas.length) throw new Error('No encontré puntos con VERDADERO/FALSO en la columna E de ninguna hoja.');
    S.colab = Object.assign({ archivo: file.name, hojas: hojas, hoja: hojas[0] }, parseColaboracion(hojaAFilas(XLSX_WB.Sheets[hojas[0]])));
  }
  function cambiarHoja(n) {
    if (!XLSX_WB || !S.colab) return;
    var p = parseColaboracion(hojaAFilas(XLSX_WB.Sheets[n]));
    S.colab.hoja = n; S.colab.tienda = p.tienda; S.colab.periodo = p.periodo;
    S.colab.puntos = p.puntos; S.colab.sinEvaluar = p.sinEvaluar;
  }

  /* ───────────────── PDF: auditoría de orden y limpieza ─────────────────
     Cada pregunta del PDF es una tarjeta con su texto arriba y dos
     opciones "Si"/"No" debajo. La opción elegida se dibuja como un círculo
     de color (verde = cumple, rojo = no cumple); la otra queda gris. Se
     lee el texto con pdf.js y se mira el color del círculo en la página
     renderizada. */
  function colorRadio(ctx, vp, it) {
    /* Caja a la izquierda del texto "Si"/"No", donde va el círculo */
    var x = it.x, y = it.y, h = it.h || 7;
    var p1 = vp.convertToViewportPoint(x - 12, y + h * 1.1);
    var p2 = vp.convertToViewportPoint(x - 1, y - h * 0.35);
    var x0 = Math.max(0, Math.floor(Math.min(p1[0], p2[0]))), x1 = Math.ceil(Math.max(p1[0], p2[0]));
    var y0 = Math.max(0, Math.floor(Math.min(p1[1], p2[1]))), y1 = Math.ceil(Math.max(p1[1], p2[1]));
    var w = Math.max(1, x1 - x0), hh = Math.max(1, y1 - y0);
    var d = ctx.getImageData(x0, y0, w, hh).data;
    var rojo = 0, verde = 0;
    for (var i = 0; i < d.length; i += 4) {
      var r = d[i], g = d[i + 1], b = d[i + 2];
      var mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      if (mx < 70 || (mx - mn) / mx < 0.35) continue;
      if (r === mx && g < r * 0.75) rojo++;
      else if (g === mx && r < g * 0.85) verde++;
    }
    var min = 4;
    if (rojo >= min && rojo > verde) return 'rojo';
    if (verde >= min && verde >= rojo) return 'verde';
    return null;
  }
  function juntaLinea(items) {
    items.sort(function (a, b) { return Math.abs(b.y - a.y) > 2 ? b.y - a.y : a.x - b.x; });
    return items.map(function (t) { return t.s; }).join(' ').replace(/\s+/g, ' ').trim();
  }
  async function leerPDF(file) {
    var lib = await pdfjs();
    var pdf = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    var info = { archivo: file.name, tienda: '', fecha: '', auditor: '', actividad: '', preguntas: [] };
    var grupo = '';
    for (var pn = 1; pn <= pdf.numPages; pn++) {
      estadoMsg('ie-pdf-msg', 'Leyendo página ' + pn + ' de ' + pdf.numPages + '…');
      var page = await pdf.getPage(pn);
      var tc = await page.getTextContent();
      var its = tc.items.map(function (t) {
        return { s: String(t.str || ''), x: t.transform[4], y: t.transform[5], h: t.height || Math.abs(t.transform[3]) || 7 };
      }).filter(function (t) { return t.s.trim(); });

      /* Encabezado */
      its.forEach(function (t) {
        var m;
        if ((m = t.s.match(/Nombre Local:\s*(.+)$/i))) info.tienda = info.tienda || m[1].trim();
        if ((m = t.s.match(/Fecha de Inicio:\s*([\d\/\-]+)/i))) info.fecha = info.fecha || m[1].trim();
        if ((m = t.s.match(/Nombre Usuario:\s*(.+)$/i))) info.auditor = info.auditor || m[1].trim();
        if ((m = t.s.match(/^\s*(AUDITOR[IÍ]A .+)$/i))) info.actividad = info.actividad || m[1].trim();
      });

      /* Se renderiza la página para ver qué círculo está coloreado */
      var vp = page.getViewport({ scale: 2 });
      var cv = document.createElement('canvas');
      cv.width = Math.ceil(vp.width); cv.height = Math.ceil(vp.height);
      var ctx = cv.getContext('2d', { willReadFrequently: true });
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
      await page.render({ canvasContext: ctx, canvas: cv, viewport: vp, intent: 'print' }).promise;

      /* Eventos de la página en orden de lectura: grupos y preguntas */
      var eventos = [];
      its.forEach(function (t) {
        if (/^Grupo de preguntas:?$/i.test(t.s.trim())) {
          var sig = its.filter(function (o) { return o !== t && Math.abs(o.x - t.x) < 6 && o.y < t.y && t.y - o.y < 16; })
            .sort(function (a, b) { return b.y - a.y; })[0];
          if (sig) eventos.push({ tipo: 'grupo', y: t.y, x: t.x, nombre: sig.s.trim() });
        }
      });
      var SIs = its.filter(function (t) { return /^s[ií]$/i.test(t.s.trim()); });
      SIs.forEach(function (si) {
        var no = its.filter(function (t) { return /^no$/i.test(t.s.trim()) && Math.abs(t.x - si.x) < 4 && t.y < si.y && si.y - t.y < 30; })[0];
        if (!no) return;
        var txt = its.filter(function (t) {
          return t.y > si.y + 6 && t.y < si.y + 58 && t.x > si.x - 16 && t.x < si.x + 160 &&
            !/^(s[ií]|no|im[aá]genes|:)$/i.test(t.s.trim()) && !/^Comentario/i.test(t.s.trim()) &&
            !/^Grupo de preguntas/i.test(t.s.trim());
        });
        /* Solo el bloque de texto pegado a la tarjeta (el de más abajo) */
        txt.sort(function (a, b) { return a.y - b.y; });
        var bloque = [], ultimo = null;
        txt.forEach(function (t) { if (ultimo === null || t.y - ultimo < 14) { bloque.push(t); ultimo = t.y; } });
        var pregunta = limpiaPunto(juntaLinea(bloque));
        if (!pregunta) return;
        var cSi = colorRadio(ctx, vp, si), cNo = colorRadio(ctx, vp, no);
        var resp = cSi ? 'Sí' : (cNo ? 'No' : '');
        var color = cSi || cNo;
        var top = bloque.length ? Math.max.apply(null, bloque.map(function (b) { return b.y; })) : si.y + 30;
        eventos.push({ tipo: 'pregunta', y: top, x: si.x, pregunta: pregunta, respuesta: resp, cumple: color ? color === 'verde' : null });
      });
      /* Orden de lectura: por filas (de arriba hacia abajo) y luego columnas */
      eventos.sort(function (a, b) { return Math.abs(b.y - a.y) > 6 ? b.y - a.y : a.x - b.x; });
      eventos.forEach(function (ev) {
        if (ev.tipo === 'grupo') { grupo = ev.nombre; return; }
        info.preguntas.push({ grupo: frase(grupo || 'General'), pregunta: ev.pregunta, respuesta: ev.respuesta, cumple: ev.cumple });
      });
    }
    info.preguntas = info.preguntas.filter(function (p) { return !/^firmas?$/i.test(p.grupo); });
    if (!info.preguntas.length) throw new Error('No encontré preguntas Sí/No en el PDF. ¿Es el reporte de Auditoría de Orden y Limpieza?');
    S.ol = info;
  }

  /* ───────────────────────── cálculos ───────────────────────── */
  function agrupa(lista, clave) {
    var orden = [], m = {};
    lista.forEach(function (x) {
      var k = x[clave];
      if (!m[k]) { m[k] = { nombre: k, total: 0, ok: 0, items: [] }; orden.push(m[k]); }
      if (x.cumple === true || x.cumple === false) { m[k].total++; if (x.cumple) m[k].ok++; }
      m[k].items.push(x);
    });
    orden.forEach(function (g) { g.pct = pct(g.ok, g.total); });
    return orden;
  }
  function resumen(lista) {
    var ev = lista.filter(function (x) { return x.cumple === true || x.cumple === false; });
    var ok = ev.filter(function (x) { return x.cumple; }).length;
    return { total: ev.length, ok: ok, hall: ev.length - ok, pct: pct(ok, ev.length) };
  }

  /* ───────────────────────── vista del informe ───────────────────────── */
  function donut(p, k) {
    var r = 50, c = 2 * Math.PI * r, v = Math.max(0, Math.min(100, p)) / 100 * c;
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 140 140'); svg.setAttribute('class', 'ier-donut');
    svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Cumplimiento ' + fmtPct(p));
    function circ(cls, dash) {
      var ci = document.createElementNS(ns, 'circle');
      ci.setAttribute('cx', 70); ci.setAttribute('cy', 70); ci.setAttribute('r', r);
      ci.setAttribute('fill', 'none'); ci.setAttribute('stroke-width', 16); ci.setAttribute('class', cls);
      if (dash) { ci.setAttribute('stroke-dasharray', dash); ci.setAttribute('transform', 'rotate(-90 70 70)'); }
      svg.appendChild(ci);
    }
    circ('ier-donut-bg');
    if (v > 0) circ('ier-donut-fg ier-s-' + k, v + ' ' + c);
    return svg;
  }
  function barra(p, k) {
    var b = el('div', 'ier-bar'); var f = el('div', 'ier-bar-f ier-bg-' + k);
    f.style.width = Math.max(0, Math.min(100, p)) + '%'; b.appendChild(f); return b;
  }
  function tarjetaTotal(res, pie) {
    var st = estado(res.pct);
    var c = el('div', 'ier-card ier-total');
    c.appendChild(el('div', 'ier-card-t', 'Nivel de cumplimiento total'));
    var w = el('div', 'ier-donut-w'); w.appendChild(donut(res.pct, st.k));
    var lab = el('div', 'ier-donut-l');
    lab.appendChild(el('div', 'ier-donut-n', fmtPct(res.pct)));
    lab.appendChild(el('div', 'ier-donut-s', 'cumplimiento'));
    w.appendChild(lab); c.appendChild(w);
    var l1 = el('div', 'ier-total-l');
    var b = el('b', null, res.ok + ' de ' + res.total); l1.appendChild(b);
    l1.appendChild(document.createTextNode(' ' + pie + ' cumplen'));
    c.appendChild(l1);
    c.appendChild(el('div', 'ier-total-l', res.hall + (res.hall === 1 ? ' hallazgo por atender' : ' hallazgos por atender')));
    c.appendChild(el('span', 'ier-pill ier-pill-' + st.k, st.t));
    return c;
  }
  function tarjetaArea(g, unidad) {
    var st = estado(g.pct);
    var c = el('div', 'ier-card ier-area');
    var h = el('div', 'ier-area-h');
    h.appendChild(el('div', 'ier-area-t', g.nombre));
    h.appendChild(el('span', 'ier-chip ier-chip-' + st.k, st.t));
    c.appendChild(h);
    c.appendChild(el('div', 'ier-area-n ier-s-' + st.k, fmtPct(g.pct)));
    c.appendChild(barra(g.pct, st.k));
    c.appendChild(el('div', 'ier-area-f', g.ok + ' de ' + g.total + ' ' + unidad + (g.total === 1 ? '' : 's') + ' cumplido' + (g.total === 1 ? '' : 's')));
    return c;
  }
  function tarjetaDetalle(titulo, sub, grupos) {
    var c = el('div', 'ier-card');
    c.appendChild(el('div', 'ier-sec-t', titulo));
    if (sub) c.appendChild(el('div', 'ier-sec-s', sub));
    var lst = el('div', 'ier-det');
    grupos.forEach(function (g) {
      var st = estado(g.pct);
      var row = el('div', 'ier-det-r');
      row.appendChild(el('div', 'ier-det-n', g.nombre));
      row.appendChild(barra(g.pct, st.k === 'ok' ? 'ok' : 'bad'));
      row.appendChild(el('div', 'ier-det-v ier-s-' + (st.k === 'ok' ? 'ok' : 'bad'), g.ok + '/' + g.total));
      lst.appendChild(row);
    });
    c.appendChild(lst);
    return c;
  }
  function tarjetaHallazgos(items, campoTxt, campoSub) {
    var c = el('div', 'ier-card');
    c.appendChild(el('div', 'ier-sec-t', 'Hallazgos por atender'));
    c.appendChild(el('div', 'ier-sec-s', items.length ? 'Puntos que no cumplieron en la auditoría' : 'Todos los puntos auditados cumplieron'));
    var ul = el('ul', 'ier-hall' + (items.length > 8 ? ' ier-hall-2' : ''));
    items.forEach(function (x) {
      var li = el('li');
      li.appendChild(el('div', 'ier-hall-t', x[campoTxt]));
      li.appendChild(el('div', 'ier-hall-s', x[campoSub]));
      ul.appendChild(li);
    });
    c.appendChild(ul);
    return c;
  }
  function encabezadoSeccion(num, nombre, fuente, meta) {
    var h = el('div', 'ier-sh');
    var l = el('div', 'ier-sh-l');
    l.appendChild(el('span', 'ier-sh-n', num));
    var tx = el('div');
    tx.appendChild(el('div', 'ier-sh-t', nombre));
    tx.appendChild(el('div', 'ier-sh-m', meta));
    l.appendChild(tx);
    h.appendChild(l);
    h.appendChild(el('span', 'ier-sh-f', fuente));
    return h;
  }
  function mosaico() {
    var m = el('div', 'ier-mos');
    [3, 2, 1, 3, 2, 4, 1, 2, 3, 1, 2, 2].forEach(function (k) { m.appendChild(el('span', 'ier-mos-' + k)); });
    return m;
  }
  function v(id) { var e = $(id); return e ? e.value.trim() : ''; }

  function render() {
    var R = $('ie-report'); if (!R) return;
    R.replaceChildren();
    var hayC = S.colab && S.colab.puntos.length, hayO = S.ol && S.ol.preguntas.length;
    $('ie-acciones').style.display = (hayC || hayO) ? 'flex' : 'none';
    if (!hayC && !hayO) {
      R.appendChild(el('div', 'ie-vacio', 'Sube el Excel de Auditoría de colaboración y/o el PDF de Auditoría de orden y limpieza para ver el informe.'));
      return;
    }
    var paper = el('div', 'ier'); paper.id = 'ie-paper';
    /* Encabezado */
    var hd = el('div', 'ier-hd');
    var ht = el('div');
    ht.appendChild(el('div', 'ier-hd-t', v('ie-titulo') || 'Informe ejecutivo de cumplimiento'));
    var sub = [v('ie-empresa'), v('ie-periodo')].filter(Boolean);
    var hs = el('div', 'ier-hd-s');
    sub.forEach(function (s, i) { if (i) hs.appendChild(el('span', 'ier-hd-sep', '|')); hs.appendChild(el('span', null, s)); });
    ht.appendChild(hs);
    hd.appendChild(ht); hd.appendChild(mosaico());
    paper.appendChild(hd);
    var body = el('div', 'ier-body');
    var n = 0;

    /* 1. Auditoría de colaboración (Excel) */
    if (hayC) {
      var C = S.colab, resC = resumen(C.puntos), areas = agrupa(C.puntos, 'area');
      var metaC = [v('ie-c-tienda'), v('ie-c-periodo')].filter(Boolean).join(' · ');
      body.appendChild(encabezadoSeccion(String(++n), 'Auditoría de colaboración', 'Fuente: Excel', metaC));
      var g1 = el('div', 'ier-g1');
      g1.appendChild(tarjetaTotal(resC, 'puntos auditados'));
      var ga = el('div', 'ier-areas');
      areas.forEach(function (a) { ga.appendChild(tarjetaArea(a, 'punto')); });
      g1.appendChild(ga); body.appendChild(g1);

      var g2 = el('div', 'ier-g2');
      /* Detalle: el área con subprocesos de menor cumplimiento */
      var conProc = areas.map(function (a) { return { a: a, procs: agrupa(a.items, 'proceso') }; })
        .filter(function (x) { return x.procs.length > 1; })
        .sort(function (x, y) { return x.a.pct - y.a.pct; })[0];
      if (conProc) {
        g2.appendChild(tarjetaDetalle(conProc.a.nombre + ': detalle por proceso',
          'Área con subprocesos de menor cumplimiento (' + fmtPct(conProc.a.pct) + ')', conProc.procs));
      } else {
        g2.appendChild(tarjetaDetalle('Cumplimiento por área', 'Puntos cumplidos de cada área auditada', areas));
      }
      var hallC = C.puntos.filter(function (x) { return x.cumple === false; })
        .map(function (x) { return { t: x.punto, s: x.proceso === x.area ? x.area : x.area + ' · ' + x.proceso }; });
      if (hallC.length > 12) {
        /* Muchos hallazgos: van en su propia fila a lo ancho, en 3 columnas */
        g2.classList.add('ier-g2-1'); g2.style.marginBottom = '14px'; body.appendChild(g2);
        var g3 = el('div', 'ier-g2 ier-g2-1');
        var th = tarjetaHallazgos(hallC, 't', 's');
        th.querySelector('ul').classList.add('ier-hall-3');
        g3.appendChild(th); body.appendChild(g3);
      } else {
        g2.appendChild(tarjetaHallazgos(hallC, 't', 's'));
        body.appendChild(g2);
      }
    }

    /* 2. Auditoría de orden y limpieza (PDF) */
    if (hayO) {
      var O = S.ol, resO = resumen(O.preguntas), grupos = agrupa(O.preguntas, 'grupo');
      var metaO = [v('ie-o-tienda'), v('ie-o-fecha'), v('ie-o-auditor') ? 'Auditó: ' + v('ie-o-auditor') : ''].filter(Boolean).join(' · ');
      body.appendChild(encabezadoSeccion(String(++n), 'Auditoría de orden y limpieza', 'Fuente: PDF', metaO));
      var h1 = el('div', 'ier-g1');
      h1.appendChild(tarjetaTotal(resO, 'preguntas'));
      var gb = el('div', 'ier-areas ier-areas-3');
      grupos.forEach(function (g) { gb.appendChild(tarjetaArea(g, 'punto')); });
      h1.appendChild(gb); body.appendChild(h1);
      var hallO = O.preguntas.filter(function (x) { return x.cumple === false; })
        .map(function (x) { return { t: x.pregunta + (x.respuesta ? ' (' + x.respuesta + ')' : ''), s: x.grupo }; });
      var h2 = el('div', 'ier-g2 ier-g2-1');
      h2.appendChild(tarjetaHallazgos(hallO, 't', 's'));
      body.appendChild(h2);
    }
    paper.appendChild(body);

    /* Pie */
    var ft = el('div', 'ier-ft');
    var lg = el('div', 'ier-lg');
    [['ok', 'Cumple (' + UMBRAL_OK + '% o más)'], ['seg', 'En seguimiento (' + UMBRAL_SEG + '% a ' + (UMBRAL_OK - 1) + '%)'], ['bad', 'Requiere atención (menos de ' + UMBRAL_SEG + '%)']]
      .forEach(function (x) { var s = el('span'); s.appendChild(el('i', 'ier-bg-' + x[0])); s.appendChild(document.createTextNode(x[1])); lg.appendChild(s); });
    ft.appendChild(lg);
    var fu = [];
    if (hayC) fu.push('Colaboración: ' + S.colab.archivo + (S.colab.hojas.length > 1 ? ' (hoja ' + S.colab.hoja + ')' : ''));
    if (hayO) fu.push('Orden y limpieza: ' + S.ol.archivo);
    ft.appendChild(el('div', 'ier-fu', 'Fuente: ' + fu.join(' · ')));
    paper.appendChild(ft);
    R.appendChild(paper);
  }

  /* ───────────────────────── revisión manual ───────────────────────── */
  function renderRevision() {
    var box = $('ie-rev'); if (!box) return;
    box.replaceChildren();
    function bloque(tit, lista, campoGrupo, campoTxt) {
      if (!lista || !lista.length) return;
      var d = el('details', 'ie-rev-b');
      var s = el('summary', null, tit + ' — ' + lista.length + ' puntos');
      d.appendChild(s);
      var tb = el('table', 'ie-rev-t');
      var th = el('tr');
      ['Grupo / área', 'Punto', 'Cumple'].forEach(function (h) { th.appendChild(el('th', null, h)); });
      tb.appendChild(th);
      lista.forEach(function (x) {
        var tr = el('tr');
        tr.appendChild(el('td', 'ie-rev-g', x[campoGrupo] + (x.proceso && x.proceso !== x.area ? ' · ' + x.proceso : '')));
        tr.appendChild(el('td', null, x[campoTxt] + (x.respuesta ? ' (' + x.respuesta + ')' : '')));
        var td = el('td', 'ie-rev-c');
        var sel = el('select');
        [['1', 'Sí'], ['0', 'No'], ['', 'Sin evaluar']].forEach(function (o) { sel.appendChild(new Option(o[1], o[0])); });
        sel.value = x.cumple === true ? '1' : (x.cumple === false ? '0' : '');
        sel.className = 'ie-sel-' + sel.value;
        sel.onchange = function () {
          x.cumple = sel.value === '1' ? true : (sel.value === '0' ? false : null);
          sel.className = 'ie-sel-' + sel.value; render();
        };
        td.appendChild(sel); tr.appendChild(td); tb.appendChild(tr);
      });
      var wrap = el('div', 'ie-rev-w'); wrap.appendChild(tb); d.appendChild(wrap);
      box.appendChild(d);
    }
    bloque('Auditoría de colaboración (Excel)', S.colab && S.colab.puntos, 'area', 'punto');
    bloque('Auditoría de orden y limpieza (PDF)', S.ol && S.ol.preguntas, 'grupo', 'pregunta');
    var sinResp = S.ol ? S.ol.preguntas.filter(function (p) { return p.cumple == null; }).length : 0;
    if (sinResp) box.appendChild(el('div', 'ie-msg ie-msg-warn', '⚠ ' + sinResp + ' pregunta(s) del PDF no tienen respuesta marcada; revísalas arriba.'));
    $('ie-rev-card').style.display = box.children.length ? '' : 'none';
  }

  function llenarCampos() {
    var per = (S.colab && S.colab.periodo) || '';
    if (S.ol && S.ol.fecha && !per) {
      var p = S.ol.fecha.split(/[-\/]/);
      var MES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      if (p.length === 3) per = MES[parseInt(p[1], 10) - 1] + ' ' + p[2];
    }
    if (per && !$('ie-periodo').dataset.tocado) $('ie-periodo').value = 'Auditoría de ' + per.toLowerCase().replace(/^\w/, function (c) { return c; });
    if (S.colab) {
      if (!$('ie-c-tienda').dataset.tocado) $('ie-c-tienda').value = S.colab.tienda || '';
      if (!$('ie-c-periodo').dataset.tocado) $('ie-c-periodo').value = S.colab.periodo || '';
      var hs = $('ie-c-hoja');
      hs.replaceChildren();
      S.colab.hojas.forEach(function (h) { hs.appendChild(new Option(h, h)); });
      hs.value = S.colab.hoja;
      $('ie-c-hoja-w').style.display = S.colab.hojas.length > 1 ? '' : 'none';
    }
    if (S.ol) {
      if (!$('ie-o-tienda').dataset.tocado) $('ie-o-tienda').value = titulo(S.ol.tienda);
      if (!$('ie-o-fecha').dataset.tocado) $('ie-o-fecha').value = S.ol.fecha || '';
      if (!$('ie-o-auditor').dataset.tocado) $('ie-o-auditor').value = S.ol.auditor || '';
    }
    $('ie-c-campos').style.display = S.colab ? '' : 'none';
    $('ie-o-campos').style.display = S.ol ? '' : 'none';
  }

  /* ───────────────────────── exportar ───────────────────────── */
  async function descargarPNG() {
    var btn = $('ie-btn-png'); var paper = $('ie-paper'); if (!paper) return;
    btn.disabled = true; var t0 = btn.textContent; btn.textContent = 'Generando imagen…';
    try {
      if (!window.html2canvas) await cargarScript(H2C);
      paper.classList.add('ier-export');
      var canvas = await window.html2canvas(paper, { scale: 2, backgroundColor: '#f3f5f9', useCORS: true, windowWidth: 1200 });
      paper.classList.remove('ier-export');
      var nombre = 'Informe_ejecutivo_' + (v('ie-periodo') || 'cumplimiento').replace(/[^\wáéíóúñÁÉÍÓÚÑ]+/g, '_') + '.png';
      canvas.toBlob(function (b) {
        if (window.saveAs) { window.saveAs(b, nombre); return; }
        var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = nombre;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
      }, 'image/png');
    } catch (e) {
      paper.classList.remove('ier-export');
      estadoMsg('ie-out-msg', '⚠ No se pudo generar la imagen: ' + e.message, 'err');
    }
    btn.disabled = false; btn.textContent = t0;
  }
  function imprimir() { document.body.classList.add('ie-printing'); window.print(); setTimeout(function () { document.body.classList.remove('ie-printing'); }, 500); }

  /* ───────────────────────── interfaz ───────────────────────── */
  var CSS = [
    /* Formulario (usa las variables de Documentos para respetar el tema) */
    '.ie-drops{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}',
    '.ie-drop{position:relative;border:2px dashed var(--border);border-radius:14px;padding:18px;text-align:center;cursor:pointer;background:var(--input-bg);transition:.15s}',
    '.ie-drop:hover,.ie-drop.over{border-color:var(--blue);background:var(--blue-soft)}',
    '.ie-drop input{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%}',
    '.ie-drop .ie-drop-i{font-size:26px}',
    '.ie-drop .ie-drop-t{font-weight:700;font-size:14px;margin-top:4px}',
    '.ie-drop .ie-drop-s{font-size:12px;color:var(--muted)}',
    '.ie-drop .ie-drop-f{font-size:12.5px;font-weight:600;color:var(--green);margin-top:6px;word-break:break-all}',
    '.ie-msg{font-size:12.5px;margin-top:6px;color:var(--muted);min-height:1em}',
    '.ie-msg-err{color:var(--red)}.ie-msg-ok{color:var(--green)}.ie-msg-warn{color:var(--amber);margin-top:10px}',
    '.ie-sub{font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin:14px 0 6px;grid-column:1/-1}',
    '.ie-rev-b{border:1px solid var(--border);border-radius:12px;margin-bottom:10px;overflow:hidden}',
    '.ie-rev-b summary{cursor:pointer;padding:11px 14px;font-weight:600;font-size:13.5px;background:var(--bg)}',
    '.ie-rev-w{max-height:420px;overflow:auto}',
    '.ie-rev-t{width:100%;border-collapse:collapse;font-size:12.5px}',
    '.ie-rev-t th{position:sticky;top:0;background:var(--white);text-align:left;padding:7px 10px;font-size:11px;color:var(--muted);text-transform:uppercase;border-bottom:1px solid var(--border)}',
    '.ie-rev-t td{padding:5px 10px;border-bottom:1px solid var(--border);vertical-align:middle}',
    '.ie-rev-g{color:var(--muted);white-space:nowrap}',
    '.ie-rev-c select{padding:4px 8px;font-size:12.5px;width:auto;min-width:96px}',
    '.ie-sel-1{color:var(--green)!important;font-weight:600}.ie-sel-0{color:var(--red)!important;font-weight:600}',
    '#ie-acciones{display:none;gap:10px;flex-wrap:wrap;margin:4px 0 14px}',
    '.ie-btn{border:none;border-radius:12px;padding:11px 18px;font-weight:700;font-size:13.5px;cursor:pointer;font-family:inherit;background:linear-gradient(135deg,var(--blue),var(--blue2));color:#fff}',
    '.ie-btn.sec{background:var(--white);color:var(--txt);border:1px solid var(--border)}',
    '.ie-btn:disabled{opacity:.6;cursor:wait}',
    '.ie-vacio{padding:28px;text-align:center;color:var(--muted);border:1px dashed var(--border);border-radius:14px;font-size:13.5px}',
    '#ie-report{overflow-x:auto}',

    /* Informe (siempre claro: es un documento) */
    '.ier{--n:#16213e;--t:#1d2433;--m:#6b7385;--l:#e6e9f0;--ok:#1e7b4f;--seg:#c88a12;--bad:#c23b32;--okb:#e5f4ec;--segb:#fdf3df;--badb:#fbe7e5;',
    '  font-family:"Poppins",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:#f3f5f9;color:var(--t);border-radius:14px;overflow:hidden;border:1px solid #dfe3eb;min-width:320px}',
    '.ier-hd{background:var(--n);color:#fff;padding:26px 30px;display:flex;justify-content:space-between;align-items:center;gap:16px}',
    '.ier-hd-t{font-size:28px;font-weight:700;line-height:1.15}',
    '.ier-hd-s{font-size:14.5px;color:#c4cbe0;margin-top:6px;display:flex;gap:10px;flex-wrap:wrap}',
    '.ier-hd-sep{opacity:.5}',
    '.ier-mos{display:grid;grid-template-columns:repeat(4,16px);gap:4px;flex-shrink:0}',
    '.ier-mos span{width:16px;height:16px;border-radius:3px;background:#2b4a85}',
    '.ier-mos .ier-mos-1{background:#3a5c9e}.ier-mos .ier-mos-2{background:#2b4a85}.ier-mos .ier-mos-3{background:#1f3866}.ier-mos .ier-mos-4{background:#6d8cc7}',
    '.ier-body{padding:20px 22px 6px}',
    '.ier-sh{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:6px 0 12px;flex-wrap:wrap}',
    '.ier-sh-l{display:flex;align-items:center;gap:12px}',
    '.ier-sh-n{width:30px;height:30px;border-radius:9px;background:var(--n);color:#fff;font-weight:700;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}',
    '.ier-sh-t{font-size:19px;font-weight:700;line-height:1.2}',
    '.ier-sh-m{font-size:12.5px;color:var(--m)}',
    '.ier-sh-f{font-size:11.5px;font-weight:600;color:var(--n);background:#e4e9f4;border-radius:20px;padding:4px 12px}',
    '.ier-card{background:#fff;border:1px solid var(--l);border-radius:10px;padding:18px 20px;box-shadow:0 1px 2px rgba(20,30,60,.04)}',
    '.ier-g1{display:grid;grid-template-columns:minmax(230px,320px) 1fr;gap:14px;margin-bottom:14px}',
    '.ier-g2{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:22px}',
    '.ier-g2-1{grid-template-columns:1fr}',
    '.ier-areas{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}',
    '.ier-areas-3{grid-template-columns:repeat(3,1fr)}',
    '.ier-total{text-align:center;display:flex;flex-direction:column;align-items:center}',
    '.ier-card-t{font-weight:600;font-size:15px;align-self:flex-start;margin-bottom:10px}',
    '.ier-donut-w{position:relative;width:150px;height:150px;margin:4px 0 12px}',
    '.ier-donut{width:100%;height:100%}',
    '.ier-donut-bg{stroke:#e3e6ec}.ier-donut-fg{stroke-linecap:butt}',
    '.ier-donut-fg.ier-s-ok{stroke:var(--ok)}.ier-donut-fg.ier-s-seg{stroke:var(--seg)}.ier-donut-fg.ier-s-bad{stroke:var(--bad)}',
    '.ier-donut-l{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}',
    '.ier-donut-n{font-size:26px;font-weight:700;color:var(--n);line-height:1}',
    '.ier-donut-s{font-size:11.5px;color:var(--m)}',
    '.ier-total-l{font-size:13.5px;color:var(--m)}.ier-total-l b{color:var(--t)}',
    '.ier-pill{margin-top:10px;font-size:12px;font-weight:600;border-radius:20px;padding:3px 12px}',
    '.ier-pill-ok,.ier-chip-ok{background:var(--okb);color:var(--ok)}.ier-pill-seg,.ier-chip-seg{background:var(--segb);color:var(--seg)}.ier-pill-bad,.ier-chip-bad{background:var(--badb);color:var(--bad)}',
    '.ier-area-h{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}',
    '.ier-area-t{font-weight:600;font-size:14.5px;line-height:1.25}',
    '.ier-chip{font-size:10.5px;font-weight:600;border-radius:20px;padding:2px 9px;white-space:nowrap}',
    '.ier-area-n{font-size:38px;font-weight:700;line-height:1.1;margin:8px 0 10px}',
    '.ier-s-ok{color:var(--ok)}.ier-s-seg{color:var(--seg)}.ier-s-bad{color:var(--bad)}',
    '.ier-bar{height:7px;background:#e6e9ef;border-radius:7px;overflow:hidden}',
    '.ier-bar-f{height:100%;border-radius:7px}',
    '.ier-bg-ok{background:var(--ok)}.ier-bg-seg{background:var(--seg)}.ier-bg-bad{background:var(--bad)}',
    '.ier-area-f{font-size:12px;color:var(--m);margin-top:8px}',
    '.ier-sec-t{font-weight:700;font-size:16px}',
    '.ier-sec-s{font-size:12px;color:var(--m);margin-bottom:12px}',
    '.ier-det-r{display:grid;grid-template-columns:minmax(120px,1.2fr) 1fr 40px;gap:14px;align-items:center;padding:8px 0;font-size:13px}',
    '.ier-det-v{text-align:right;font-weight:700}',
    '.ier-hall{list-style:none;margin:0;padding:0}',
    '.ier-hall li{position:relative;padding:8px 0 8px 16px;border-top:1px solid var(--l);break-inside:avoid}',
    '.ier-hall li:before{content:"";position:absolute;left:2px;top:15px;width:6px;height:6px;border-radius:50%;background:var(--bad)}',
    '.ier-hall-2{columns:2;column-gap:24px}.ier-hall-2.ier-hall-3{columns:3}',
    '.ier-hall-t{font-size:13px;font-weight:500;line-height:1.3}',
    '.ier-hall-s{font-size:11.5px;color:var(--m)}',
    '.ier-ft{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:12px 22px 18px;font-size:11.5px;color:var(--m)}',
    '.ier-lg{display:flex;gap:16px;flex-wrap:wrap}',
    '.ier-lg i{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px}',
    '@media (max-width:820px){.ier-g1,.ier-g2{grid-template-columns:1fr}.ier-areas-3{grid-template-columns:repeat(2,1fr)}.ier-hall-2,.ier-hall-2.ier-hall-3{columns:1}.ier-hd-t{font-size:22px}}',
    '@media (max-width:480px){.ier-areas,.ier-areas-3{grid-template-columns:1fr}.ier-hd{padding:20px}.ier-body{padding:14px 12px 4px}}',
    /* Exportar: ancho fijo de escritorio aunque el panel sea angosto */
    '.ier.ier-export{width:1160px}',
    '.ier.ier-export .ier-g1{grid-template-columns:320px 1fr}.ier.ier-export .ier-g2{grid-template-columns:1fr 1fr}.ier.ier-export .ier-g2-1{grid-template-columns:1fr}',
    '.ier.ier-export .ier-areas{grid-template-columns:repeat(2,1fr)}.ier.ier-export .ier-areas-3{grid-template-columns:repeat(3,1fr)}.ier.ier-export .ier-hall-2{columns:2}.ier.ier-export .ier-hall-2.ier-hall-3{columns:3}',
    /* Imprimir / guardar como PDF: solo el informe */
    '@media print{body.ie-printing header,body.ie-printing #view-inf>*:not(#ie-out),body.ie-printing #ie-acciones,body.ie-printing #ie-out-msg{display:none!important}',
    '  body.ie-printing main{padding:0!important;max-width:none!important}body.ie-printing{background:#fff!important}',
    '  body.ie-printing .ier{border:none;-webkit-print-color-adjust:exact;print-color-adjust:exact}',
    '  body.ie-printing .ier-card{break-inside:avoid}@page{size:A4 landscape;margin:8mm}}'
  ].join('\n');

  function construir() {
    var V = $('view-inf'); if (!V || V.dataset.listo) return;
    V.dataset.listo = '1';
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

    V.innerHTML =
      '<div class="badge">📋 Informe ejecutivo · Colaboración (Excel) + Orden y limpieza (PDF)</div>' +
      '<div class="card"><div class="card-header"><span class="card-icon icon-blue">📂</span><h2>Archivos de auditoría</h2></div><div class="card-body">' +
      '  <div class="ie-drops">' +
      '    <label class="ie-drop" id="ie-drop-x"><input type="file" id="ie-file-x" accept=".xlsx,.xlsm,.xls">' +
      '      <div class="ie-drop-i">📊</div><div class="ie-drop-t">Auditoría de colaboración</div>' +
      '      <div class="ie-drop-s">Excel del informe ejecutivo (.xlsx)</div><div class="ie-drop-f" id="ie-x-name"></div></label>' +
      '    <label class="ie-drop" id="ie-drop-p"><input type="file" id="ie-file-p" accept=".pdf,application/pdf">' +
      '      <div class="ie-drop-i">🧹</div><div class="ie-drop-t">Auditoría de orden y limpieza</div>' +
      '      <div class="ie-drop-s">Reporte PDF de la app de auditoría</div><div class="ie-drop-f" id="ie-p-name"></div></label>' +
      '  </div>' +
      '  <div class="ie-msg" id="ie-x-msg"></div><div class="ie-msg" id="ie-pdf-msg"></div>' +
      '</div></div>' +

      '<div class="card"><div class="card-header"><span class="card-icon icon-amber">✏️</span><h2>Datos del informe</h2></div><div class="card-body"><div class="grid">' +
      '  <div class="span2"><label>Título</label><input id="ie-titulo" value="Informe ejecutivo de cumplimiento"></div>' +
      '  <div><label>Empresa</label><input id="ie-empresa" value="Kuroda"></div>' +
      '  <div><label>Periodo (encabezado)</label><input id="ie-periodo" placeholder="Ej. Auditoría de octubre 2026"></div>' +
      '  <div id="ie-c-campos" style="display:none;grid-column:1/-1"><div class="grid">' +
      '    <div class="ie-sub">Auditoría de colaboración</div>' +
      '    <div><label>Tienda / sucursal</label><input id="ie-c-tienda"></div>' +
      '    <div><label>Periodo</label><input id="ie-c-periodo"></div>' +
      '    <div id="ie-c-hoja-w" style="display:none"><label>Hoja del Excel</label><select id="ie-c-hoja"></select></div>' +
      '  </div></div>' +
      '  <div id="ie-o-campos" style="display:none;grid-column:1/-1"><div class="grid">' +
      '    <div class="ie-sub">Auditoría de orden y limpieza</div>' +
      '    <div><label>Tienda / sucursal</label><input id="ie-o-tienda"></div>' +
      '    <div><label>Fecha</label><input id="ie-o-fecha"></div>' +
      '    <div><label>Auditor</label><input id="ie-o-auditor"></div>' +
      '  </div></div>' +
      '</div></div></div>' +

      '<div class="card" id="ie-rev-card" style="display:none"><div class="card-header"><span class="card-icon icon-green">✅</span><h2>Revisión de puntos</h2></div><div class="card-body">' +
      '  <div class="ie-msg" style="margin:0 0 10px">Se llenó automáticamente desde los archivos. Corrige cualquier punto y el informe se actualiza al instante.</div>' +
      '  <div id="ie-rev"></div>' +
      '</div></div>' +

      '<div id="ie-out">' +
      '  <div id="ie-acciones"><button class="ie-btn" id="ie-btn-png">🖼️ Descargar imagen (.png)</button>' +
      '  <button class="ie-btn sec" id="ie-btn-pdf">🖨️ Imprimir / guardar PDF</button></div>' +
      '  <div class="ie-msg" id="ie-out-msg"></div>' +
      '  <div id="ie-report"></div>' +
      '</div>';

    function engancharDrop(dropId, inputId, fn) {
      var d = $(dropId), inp = $(inputId);
      ['dragenter', 'dragover'].forEach(function (e) { d.addEventListener(e, function (ev) { ev.preventDefault(); d.classList.add('over'); }); });
      ['dragleave', 'drop'].forEach(function (e) { d.addEventListener(e, function () { d.classList.remove('over'); }); });
      d.addEventListener('drop', function (ev) { ev.preventDefault(); var f = ev.dataTransfer.files[0]; if (f) fn(f); });
      inp.addEventListener('change', function () { var f = inp.files[0]; if (f) fn(f); inp.value = ''; });
    }
    engancharDrop('ie-drop-x', 'ie-file-x', async function (f) {
      estadoMsg('ie-x-msg', 'Leyendo Excel…');
      try {
        await leerExcel(f);
        $('ie-x-name').textContent = '✓ ' + f.name;
        var r = resumen(S.colab.puntos);
        estadoMsg('ie-x-msg', 'Colaboración: ' + r.total + ' puntos leídos (' + r.ok + ' cumplen) de la hoja "' + S.colab.hoja + '".', 'ok');
        llenarCampos(); renderRevision(); render();
      } catch (e) { estadoMsg('ie-x-msg', '⚠ ' + e.message, 'err'); }
    });
    engancharDrop('ie-drop-p', 'ie-file-p', async function (f) {
      estadoMsg('ie-pdf-msg', 'Leyendo PDF…');
      try {
        await leerPDF(f);
        $('ie-p-name').textContent = '✓ ' + f.name;
        var r = resumen(S.ol.preguntas);
        estadoMsg('ie-pdf-msg', 'Orden y limpieza: ' + S.ol.preguntas.length + ' preguntas leídas (' + r.ok + ' cumplen).', 'ok');
        llenarCampos(); renderRevision(); render();
      } catch (e) { estadoMsg('ie-pdf-msg', '⚠ ' + e.message, 'err'); }
    });
    V.querySelectorAll('input:not([type=file])').forEach(function (i) {
      i.addEventListener('input', function () { i.dataset.tocado = '1'; render(); });
    });
    $('ie-c-hoja').addEventListener('change', function () {
      cambiarHoja(this.value);
      ['ie-c-tienda', 'ie-c-periodo', 'ie-periodo'].forEach(function (id) { delete $(id).dataset.tocado; });
      llenarCampos(); renderRevision(); render();
    });
    $('ie-btn-png').addEventListener('click', descargarPNG);
    $('ie-btn-pdf').addEventListener('click', imprimir);
    render();
  }

  window.InformeEjecutivo = { construir: construir, _parseColaboracion: parseColaboracion, _estado: S, _render: render, _renderRevision: renderRevision, _llenarCampos: llenarCampos };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', construir); else construir();
})();
