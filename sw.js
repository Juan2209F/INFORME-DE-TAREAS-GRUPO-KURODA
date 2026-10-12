/* Service worker de la app para iPhone / iPad (PWA) — Grupo Kuroda
   Lo registra js/app-ios.js solo en iPhone y iPad.
   Estrategia "primero la red": cada archivo del Monitor se pide siempre a Vercel, así la app
   usa la versión publicada más reciente. La copia guardada solo se usa cuando no hay conexión,
   para que la app abra y muestre el inicio de sesión en vez de una pantalla en blanco.
   No toca nada de otros sitios (Supabase, librerías de CDN) ni peticiones que no sean GET. */
'use strict';

var CACHE = 'gk-monitor-v1';
var NUCLEO = [
  './', 'index.html', 'manifest.webmanifest',
  'css/main.css', 'css/movil.css', 'css/apk.css', 'css/ios.css',
  'js/app-ios.js', 'js/app-apk.js', 'js/theme-init.js', 'config/supabase-config.js',
  'js/app-core.js', 'js/app-usuarios.js', 'js/app-correos.js', 'js/app-archivero.js',
  'js/app-activos.js', 'js/app-sesion.js', 'js/app-movil.js',
  'icons/apple-touch-icon.png', 'icons/icon-192.png'
];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  /* Si algún archivo falla no se bloquea la instalación: se guardará al usarse. */
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(NUCLEO.map(function (u) { return c.add(u).catch(function () {}); }));
  }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.status === 200 && res.type === 'basic') {
        var copia = res.clone();
        caches.open(CACHE).then(function (c) { return c.put(req, copia); }).catch(function () {});
      }
      return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (r) {
        if (r) return r;
        if (req.mode === 'navigate') return caches.match('index.html');
        return Response.error();
      });
    })
  );
});
