/* DocuForge AI — service worker for offline library resilience.

   Scope, deliberately narrow: this ONLY caches the third-party library
   scripts loaded from cdnjs.cloudflare.com (Tesseract, XLSX, mammoth,
   Chart.js, jsQR, QRCode, JsBarcode, forge, pdf-lib, pdf.js, JSZip,
   Sortable, etc). Every one of those is fetched from a version-pinned
   URL (e.g. .../tesseract.js/4.1.1/tesseract.min.js) — the content at
   that exact URL never changes, so caching it aggressively is fully
   safe: once a tool has been used successfully with a network
   connection, it keeps working offline afterward, even in a later
   session.

   This deliberately does NOT cache the app's own HTML/navigation
   request, or anything outside the cacheable-hosts list (translation
   API calls, AI provider calls, etc — those need to stay live). Caching
   the app shell itself would risk making it harder to tell whether
   you're on the latest version after an update, which has already been
   a real, hard-won problem in this app's history — this worker is
   intentionally scoped to avoid ever reintroducing that. */

const CACHE_NAME = 'docuforge-libs-v1';
const CACHEABLE_HOSTS = ['cdnjs.cloudflare.com'];

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Never intercept navigation (the HTML page itself) or anything
  // outside the explicit allowlist — those always go straight to the
  // network, unmodified, exactly as if this worker didn't exist.
  if (event.request.mode === 'navigate') return;
  let url;
  try { url = new URL(event.request.url); } catch (e) { return; }
  if (!CACHEABLE_HOSTS.includes(url.hostname)) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      try {
        const response = await fetch(event.request);
        if (response && response.ok) cache.put(event.request, response.clone());
        return response;
      } catch (err) {
        if (cached) return cached;
        throw err;
      }
    })
  );
});
