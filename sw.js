// Service Worker — Alerta Ambiental Agropecuario
// Versión del cache: incrementar para forzar actualización
const CACHE_NAME = 'alerta-agro-v7';  // incrementar al actualizar datos

const ASSETS = [
  './',
  './index.html',
  './data/distritos_riesgo.geojson.gz',
  './data/oficinas.geojson.gz',
  './data/inund_web.geojson.gz',
  './data/mm_web.geojson.gz',
  './data/sequia_web.geojson.gz',
  // Leaflet CDN
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  // Tiles no se cachean (son demasiados) — el mapa base requiere conexión
];

// Instalación: guardar todos los assets en cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        ASSETS.map(url =>
          cache.add(url).catch(err => {
            console.warn('[SW] No se pudo cachear:', url, err);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// Activación: limpiar caches viejos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first para assets locales, network-first para tiles
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Tiles de OpenStreetMap/CARTO — siempre red (no cachear)
  if (
    url.hostname.includes('tile.openstreetmap') ||
    url.hostname.includes('basemaps.cartocdn') ||
    url.hostname.includes('tiles.stadiamaps')
  ) {
    return; // dejar que el navegador lo maneje normalmente
  }

  // Todo lo demás: cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      // No está en cache → intentar red y guardar
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const toCache = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
        return response;
      }).catch(() => {
        // Sin red y sin cache → sin respuesta (el navegador mostrará error)
        console.warn('[SW] Sin red y sin cache para:', event.request.url);
      });
    })
  );
});
