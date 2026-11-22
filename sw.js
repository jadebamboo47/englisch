/* Offline-Speicher für „Englisch für unterwegs“ – automatisch erzeugt von tools/build_sw.py */
const VERSION = 'aec5944d';
const CACHE = 'englisch-' + VERSION;
const ASSETS = [
  './',
  './index.html',
  './app.js',
  './content.js',
  './manifest.webmanifest',
  './fonts/atkinson-hyperlegible-latin-400-normal.woff2',
  './fonts/atkinson-hyperlegible-latin-700-normal.woff2',
  './fonts/fraunces-latin-600-normal.woff2',
  './icons/apple-touch-icon.png',
  './icons/favicon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './audio/arzt-bc709b6e53.mp3',
  './audio/britisch-aad20b56cb.mp3',
  './audio/edinburgh-7bdf18f964.mp3',
  './audio/einladung-75db5ccf80.mp3',
  './audio/enkel-5762a01e39.mp3',
  './audio/erinnerungen-817b143c93.mp3',
  './audio/essengehen-84bdfe224e.mp3',
  './audio/garten-4eb9ad0e2d.mp3',
  './audio/hotelproblem-1570666cb9.mp3',
  './audio/index.json',
  './audio/meinung-7ad6058e51.mp3',
  './audio/nachrichten-63f31b247d.mp3',
  './audio/redewendungen-23fc1ed6bd.mp3',
  './audio/reisebekannte-e4bea29c24.mp3',
  './audio/reklamation-7cc3f3f0e7.mp3',
  './audio/tagestour-bdb91fa466.mp3',
  './audio/technik-10f68b7d31.mp3',
  './audio/tee-ef1e7ff326.mp3',
  './audio/telefonieren-49652601a3.mp3',
  './audio/test-a2.mp3',
  './audio/test-b1.mp3',
  './audio/test-b2.mp3',
  './audio/test-c1.mp3',
  './audio/umbuchen-caec4b6cd0.mp3',
  './audio/umtausch-6f2ff6ff4e.mp3',
  './audio/wennich-8495bc8e7f.mp3',
  './audio/wohlbefinden-6bf2463e8a.mp3',
  './audio/zugausfall-de4eb80556.mp3',
  './audio/zukunft-fff7e6bf68.mp3'
];

self.addEventListener('install', event => {
  // Audiodateien tragen eine Prüfsumme im Namen: Was schon da ist, wird übernommen statt neu geladen.
  event.waitUntil(caches.open(CACHE).then(async c => {
    await Promise.all(ASSETS.map(async a => {
      const old = a.startsWith('./audio/') && !a.endsWith('.json') ? await caches.match(a) : null;
      if (old) return c.put(a, old);
      return c.add(new Request(a, { cache: 'no-cache' }));
    }));
  }).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('englisch-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Selbstheilung: Andere Apps auf derselben Domain könnten Caches löschen.
self.addEventListener('message', event => {
  if (event.data === 'warm') {
    event.waitUntil(caches.open(CACHE).then(async c => {
      for (const a of ASSETS) { if (!(await c.match(a))) { try { await c.add(a); } catch (e) {} } }
    }));
  }
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => req.mode === 'navigate' ? caches.match('./index.html') : Response.error());
    })
  );
});
