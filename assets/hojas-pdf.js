/* Hojas a PDF — Grupo Kuroda
   La app de Android imprime las páginas como si la hoja fuera horizontal: achica el contenido y
   corta los apartados en dos hojas. Dentro de la app, en vez de imprimir, cada documento arma un
   PDF con UNA hoja por apartado. La app lo guarda en Descargas y ofrece «Abrir»; desde el visor se
   imprime tal cual. En la computadora (navegador) no se usa: ahí se imprime normal.

   Reglas de cada hoja:
   - Si el apartado cabe, va a tamaño real con sus propios márgenes.
   - Si es más alto que la hoja, se reduce (márgenes y letra) lo justo para que quepa, hasta 55 %.
   - Si ni así cabe, sigue en la hoja siguiente; el corte se hace en un renglón en blanco para no
     partir texto, y esas hojas llevan margen arriba y abajo.
   Usa html2canvas 1.4.1 y jsPDF 2.5.1 (los mismos del Monitor), que se cargan solo al usarse. */
(function () {
  'use strict';
  var H2C = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
  var JSPDF = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  var PT_POR_MM = 72 / 25.4;
  var FORMATOS = { letter: [215.9, 279.4], a4: [210, 297] };

  function enAndroid() {
    try { if (window.GKAndroid) return true; } catch (e) {}
    try { var p = window.parent; if (p && p !== window && p.GKAndroid) return true; } catch (e) {}
    try { var t = window.top; if (t && t !== window && t.GKAndroid) return true; } catch (e) {}
    return / GKApp\//.test(navigator.userAgent);
  }

  function script(src, listo) {
    return new Promise(function (ok, mal) {
      if (listo()) return ok();
      var s = document.createElement('script');
      s.src = src;
      s.onload = function () { listo() ? ok() : mal(new Error('no cargó')); };
      s.onerror = function () { mal(new Error('sin conexión')); };
      document.head.appendChild(s);
    });
  }
  function cargar() {
    return script(H2C, function () { return !!window.html2canvas; })
      .then(function () { return script(JSPDF, function () { return !!(window.jspdf && window.jspdf.jsPDF); }); });
  }

  /* Pone el HTML en un contenedor fuera de la vista, con el ancho de la hoja y el CSS de impresión. */
  function montar(html, op) {
    op = op || {};
    var raiz = document.createElement('div');
    raiz.className = 'hpdf-raiz';
    raiz.style.cssText = 'position:absolute;left:-12000px;top:0;width:' + (op.ancho || 816) + 'px;background:#fff;color:#000';
    if (op.css) {
      var st = document.createElement('style');
      st.textContent = op.css;
      raiz.appendChild(st);
    }
    var cuerpo = document.createElement('div');
    if (typeof html === 'string') cuerpo.innerHTML = html; else cuerpo.appendChild(html);
    raiz.appendChild(cuerpo);
    document.body.appendChild(raiz);
    return { raiz: raiz, cuerpo: cuerpo, quitar: function () { raiz.remove(); } };
  }

  function guardar(blob, nombre) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 120000);
  }

  /* Renglón en blanco más cercano hacia arriba de "y" (en px del lienzo) para cortar sin partir texto. */
  function corteLimpio(cv, y, minY) {
    try {
      var g = cv.getContext('2d'), w = cv.width;
      var desde = Math.max(minY, Math.floor(y - (y - minY) * 0.25));
      var datos = g.getImageData(0, desde, w, y - desde).data;
      for (var fila = y - desde - 1; fila >= 0; fila--) {
        var limpio = true, i = fila * w * 4;
        for (var x = 0; x < w; x += 2) {
          var k = i + x * 4;
          if (datos[k] < 235 || datos[k + 1] < 235 || datos[k + 2] < 235) { limpio = false; break; }
        }
        if (limpio) return desde + fila;
      }
    } catch (e) {}
    return y;
  }

  /* hojas: elementos ya puestos en la página (montar()); cada uno es un apartado.
     op: formato ('letter' | 'a4' | [ancho_mm, alto_mm]), orientacion, margen (pt a los lados, para
     contenido sin márgenes propios), nombre, escala, minimo (reducción mínima), aviso(texto). */
  function generar(hojas, op) {
    op = op || {};
    var aviso = op.aviso || function () {};
    aviso('Generando PDF…');
    return cargar().then(function () {
      var mm = Array.isArray(op.formato) ? op.formato : (FORMATOS[op.formato] || FORMATOS.letter);
      var W = mm[0] * PT_POR_MM, H = mm[1] * PT_POR_MM;
      if (op.orientacion === 'landscape' && W < H) { var t = W; W = H; H = t; }
      var pdf = new window.jspdf.jsPDF({ orientation: W > H ? 'landscape' : 'portrait', unit: 'pt', format: [W, H] });
      var lados = op.margen || 0, minimo = op.minimo || 0.55, mCorte = op.margenCorte == null ? 30 : op.margenCorte;
      var primera = true;
      var nueva = function () { if (!primera) pdf.addPage([W, H], W > H ? 'landscape' : 'portrait'); primera = false; };
      var lista = Array.prototype.slice.call(hojas).filter(function (h) { return h && h.offsetHeight > 0; });
      return lista.reduce(function (cadena, el) {
        return cadena.then(function () {
          return window.html2canvas(el, { scale: op.escala || 2.5, backgroundColor: '#ffffff', useCORS: true, logging: false,
            windowWidth: op.ventana || Math.max(el.scrollWidth, 816) });
        }).then(function (cv) {
          /* Contenido sin márgenes propios (margen > 0): el mismo margen arriba y abajo. */
          var anchoUtil = W - 2 * lados, altoUtil = H - 2 * lados;
          var k = anchoUtil / cv.width;                 /* pt por px del lienzo a tamaño real */
          var alto = cv.height * k;
          if (alto <= altoUtil) {                       /* cabe tal cual */
            nueva();
            pdf.addImage(cv.toDataURL('image/jpeg', 0.92), 'JPEG', lados, lados, anchoUtil, alto);
            return;
          }
          var s = altoUtil / alto;
          if (s >= minimo) {                            /* se reduce para que quepa en una hoja */
            var w = anchoUtil * s;
            nueva();
            pdf.addImage(cv.toDataURL('image/jpeg', 0.92), 'JPEG', (W - w) / 2, lados, w, altoUtil);
            return;
          }
          /* Muy largo: varias hojas, cortando en renglones en blanco. */
          var porHoja = Math.floor((H - 2 * mCorte) / k), y = 0;
          while (y < cv.height - 2) {
            var fin = Math.min(cv.height, y + porHoja);
            if (fin < cv.height) fin = corteLimpio(cv, fin, y + Math.floor(porHoja * 0.5));
            var pedazo = document.createElement('canvas');
            pedazo.width = cv.width; pedazo.height = fin - y;
            var g = pedazo.getContext('2d');
            g.fillStyle = '#fff'; g.fillRect(0, 0, pedazo.width, pedazo.height);
            g.drawImage(cv, 0, y, cv.width, fin - y, 0, 0, cv.width, fin - y);
            nueva();
            pdf.addImage(pedazo.toDataURL('image/jpeg', 0.92), 'JPEG', lados, y === 0 ? 0 : mCorte, anchoUtil, (fin - y) * k);
            y = fin;
          }
        });
      }, Promise.resolve()).then(function () {
        if (primera) throw new Error('no hay nada que imprimir');
        var nombre = (op.nombre || 'Documento').replace(/[\\/:*?"<>|]+/g, '_');
        if (!/\.pdf$/i.test(nombre)) nombre += '.pdf';
        guardar(pdf.output('blob'), nombre);
        aviso('✓ PDF listo: ' + nombre + '. Toca «Abrir» y luego imprime desde el visor.');
        return nombre;
      });
    });
  }

  window.HojasPDF = { enAndroid: enAndroid, cargar: cargar, montar: montar, generar: generar, guardar: guardar };
})();
