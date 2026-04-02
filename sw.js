// Service Worker — Alerta Ambiental Agropecuario
const CACHE_NAME = 'alerta-agro-v10';

// Solo cachear assets estáticos que NO cambian con los datos
const ASSETS = [
  './index.html',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(ASSETS.map(url =>
        cache.add(url).catch(err => console.warn('[SW] No se pudo cachear:', url, err))
      ))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // NUNCA cachear: tiles de mapas, archivos de datos .geojson/.gz
  if (
    url.hostname.includes('basemaps.cartocdn') ||
    url.hostname.includes('tile.openstreetmap') ||
    url.pathname.includes('.geojson') ||
    url.pathname.includes('.gz')
  ) {
    // Siempre ir a la red para datos
    return;
  }

  // Para index.html: network-first (obtener siempre versión fresca si hay red)
  if (url.pathname.endsWith('/') || url.pathname.endsWith('index.html')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const toCache = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Para Leaflet JS/CSS: cache-first (no cambian)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        const toCache = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
        return response;
      });
    })
  );
});
