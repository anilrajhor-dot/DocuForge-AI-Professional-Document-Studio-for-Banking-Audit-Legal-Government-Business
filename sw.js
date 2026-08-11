/* DocuForge AI — merged application service worker
   Version 1.2.2
   DocuForge AI + InstantDash + StampIt
*/

const CACHE_NAME = 'docuforge-merged-v1.2.2';

const OLD_CACHES = [
  'stampit-v2.2.1-cache-v1',
  'docuforge-merged-v1.2.1',
  'docuforge-v1.2.0',
  'docuforge-v1.1.9'
];

const APP_SHELL = [
  './',
  './index.html'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key =>
              key !== CACHE_NAME &&
              OLD_CACHES.includes(key)
            )
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Do not interfere with external CDN/API requests.
  if (url.origin !== self.location.origin) return;

  // Main HTML: network first so GitHub receives new versions promptly.
  if (
    request.mode === 'navigate' ||
    url.pathname.endsWith('/index.html') ||
    url.pathname.endsWith('/')
  ) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => cache.put(request, copy));

          return response;
        })
        .catch(() =>
          caches.match(request)
            .then(cached =>
              cached || caches.match('./index.html')
            )
        )
    );

    return;
  }

  // Same-origin resources: cache first.
  event.respondWith(
    caches.match(request)
      .then(cached => {
        if (cached) return cached;

        return fetch(request)
          .then(response => {
            if (response.ok) {
              const copy = response.clone();

              caches.open(CACHE_NAME)
                .then(cache => cache.put(request, copy));
            }

            return response;
          });
      })
  );
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});