/* Arqueo de caja dentro del Monitor — Grupo Kuroda
   El botón "🧮 Arqueo" del menú lateral abre la vista "arqueo": la app assets/arqueo.html en un
   iframe a toda la altura disponible. La app usa la misma sesión de Supabase del Monitor
   (window.parent.getSbClient) y guarda el historial en las tablas arqueos / arqueo_apartados
   (migración supabase/migrations/20261124_arqueos.sql).

   Acceso: admin y admin_auditor siempre; auditor y viewer (viewer en SOLO CONSULTA) cuando
   tienen la razón social KNO o no tienen razones asignadas; cualquier otra cuenta solo si se le
   otorgó la vista "arqueo".
   Depende de: js/app-core.js (_session, VIEW, setView, applyVistasRestriction, doLogout,
   tieneVista, razKey). */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var oscuro = function () { return document.documentElement.getAttribute('data-theme') === 'dark'; };

  function razones() {
    var r = _session && _session.razones_permitidas;
    if (typeof r === 'string') { try { r = JSON.parse(r); } catch (e) { r = null; } }
    return Array.isArray(r) ? r : [];
  }
  function puedeVer() {
    if (typeof _session === 'undefined' || !_session) return false;
    var rol = _session.rol;
    if (rol === 'admin' || rol === 'admin_auditor') return true;
    if (typeof tieneVista === 'function' && tieneVista('arqueo')) return true;
    if (rol !== 'auditor' && rol !== 'viewer') return false;
    var r = razones();
    return !r.length || r.some(function (x) { return String(x).trim().toUpperCase() === 'KNO'; });
  }

  function iframe() { return $('iframe-arqueo'); }
  function enviar(msg) {
    var f = iframe();
    if (f && f.contentWindow) try { f.contentWindow.postMessage(msg, location.origin); } catch (e) {}
  }
  function ajustarAlto() {
    var f = iframe();
    if (!f || !f.offsetWidth) return;
    var r = f.getBoundingClientRect();
    var z = r.width / f.offsetWidth || 1;
    f.style.height = Math.max(480, Math.floor((window.innerHeight - r.top - 14) / z)) + 'px';
  }
  function cargar() {
    var f = iframe();
    if (!f.getAttribute('src')) f.src = 'assets/arqueo.html?embed=1&v=' + Date.now();
    setTimeout(ajustarAlto, 30);
  }
  function descargar() {
    var f = iframe();
    if (f && f.getAttribute('src')) { f.src = 'about:blank'; f.removeAttribute('src'); }
    /* El borrador se queda guardado por usuario (arqueo_monitor_borrador_<usuario>) para que, al
       volver a entrar, el arqueo siga donde se quedó. Se borra el formato anterior sin usuario. */
    try { localStorage.removeItem('arqueo_monitor_borrador'); } catch (e) {}
  }

  function mostrarVista(visible) {
    var v = $('view-arqueo');
    if (!v) return;
    var antes = v.style.display !== 'none';
    v.style.display = visible ? 'block' : 'none';
    var n = $('nav-arqueo'); if (n) n.classList.toggle('active', visible);
    if (visible) { if (!antes) cargar(); else setTimeout(ajustarAlto, 30); }
  }

  function montar() {
    if ($('view-arqueo')) return;
    var ref = $('view-documentos') || $('view-generador') || $('view-dash');
    var d = document.createElement('div');
    d.id = 'view-arqueo';
    d.style.display = 'none';
    d.innerHTML =
      '<div class="card kc-panel">' +
      '<div class="kc-hdr"><span style="font-size:18px">🧮</span><h3>Arqueo de caja</h3></div>' +
      '<iframe id="iframe-arqueo" title="Arqueo de caja" ' +
      'style="width:100%;height:640px;border:0;display:block;background:transparent"></iframe></div>';
    if (ref && ref.parentNode) ref.parentNode.insertBefore(d, ref.nextSibling);
    else document.body.appendChild(d);
    window.addEventListener('resize', function () { if (d.style.display !== 'none') ajustarAlto(); });

    /* Botón "Arqueo" en el menú lateral, después de Mermas. */
    var refNav = $('nav-mermas') || $('nav-auditorias') || $('nav-tareas');
    if (refNav && !$('nav-arqueo')) {
      var n = document.createElement('div');
      n.className = 'nav-item';
      n.id = 'nav-arqueo';
      n.title = 'Arqueo de caja';
      n.innerHTML = '🧮<span class="nav-lbl">Arqueo</span>';
      n.style.display = 'none';
      n.addEventListener('click', function () { setView('arqueo'); });
      refNav.parentNode.insertBefore(n, refNav.nextSibling);
    }
  }
  function actualizarMenu() {
    var n = $('nav-arqueo'); if (n) n.style.display = puedeVer() ? '' : 'none';
  }

  /* Mismo tema que el resto del Monitor. */
  new MutationObserver(function () { enviar({ type: 'theme', dark: oscuro() }); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  function enganchar() {
    if (typeof window.setView === 'function' && !window.setView._arq) {
      var sv = window.setView;
      window.setView = function (v) {
        if (v === 'arqueo' && !puedeVer()) v = 'dash';
        var r = sv.apply(this, [v].concat([].slice.call(arguments, 1)));
        mostrarVista(v === 'arqueo' && typeof VIEW !== 'undefined' && VIEW === 'arqueo');
        return r;
      };
      window.setView._arq = true;
    }
    /* "arqueo" no está en la lista de vistas de app-core: durante la restricción se usa Inicio
       para que no redirija, y después se regresa a Arqueo. */
    if (typeof window.applyVistasRestriction === 'function' && !window.applyVistasRestriction._arq) {
      var avr = window.applyVistasRestriction;
      window.applyVistasRestriction = function () {
        var enArq = typeof VIEW !== 'undefined' && VIEW === 'arqueo';
        if (enArq) VIEW = 'dash';
        var r = avr.apply(this, arguments);
        if (enArq) { VIEW = 'arqueo'; if (!puedeVer()) setView('dash'); }
        actualizarMenu();
        return r;
      };
      window.applyVistasRestriction._arq = true;
    }
    if (typeof window.doLogout === 'function' && !window.doLogout._arq) {
      var lo = window.doLogout;
      window.doLogout = function () {
        if (typeof VIEW !== 'undefined' && VIEW === 'arqueo') setView('dash');
        descargar();
        var r = lo.apply(this, arguments);
        actualizarMenu();
        return r;
      };
      window.doLogout._arq = true;
    }
  }

  function init() { montar(); enganchar(); actualizarMenu(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
