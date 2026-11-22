/* Offline-Speicher für „Englisch für unterwegs“ – automatisch erzeugt von tools/build_sw.py */
const VERSION = '5b1ca487';
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
  './audio/apotheke-40f950a6ea.mp3',
  './audio/arzt-bc709b6e53.mp3',
  './audio/ausflug-a32a4165a9.mp3',
  './audio/britisch-aad20b56cb.mp3',
  './audio/edinburgh-7bdf18f964.mp3',
  './audio/einkaufen-07ce7f83e6.mp3',
  './audio/einladung-75db5ccf80.mp3',
  './audio/enkel-5762a01e39.mp3',
  './audio/erinnerungen-817b143c93.mp3',
  './audio/essengehen-84bdfe224e.mp3',
  './audio/flughafen-367717fbf5.mp3',
  './audio/garten-4eb9ad0e2d.mp3',
  './audio/hotel-f6ca960c93.mp3',
  './audio/hotelproblem-1570666cb9.mp3',
  './audio/index.json',
  './audio/kennenlernen-81ff51cbf0.mp3',
  './audio/kopffit-09daf97694.mp3',
  './audio/meinung-7ad6058e51.mp3',
  './audio/nachrichten-63f31b247d.mp3',
  './audio/redewendungen-23fc1ed6bd.mp3',
  './audio/reisebekannte-e4bea29c24.mp3',
  './audio/reklamation-7cc3f3f0e7.mp3',
  './audio/restaurant-ad89b4ab42.mp3',
  './audio/smalltalk-51820eef72.mp3',
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
  './audio/unterwegs-374fc5b9b8.mp3',
  './audio/weg-c27d0bbf38.mp3',
  './audio/wennich-8495bc8e7f.mp3',
  './audio/woerter-72c19ffb0c.mp3',
  './audio/wohlbefinden-6bf2463e8a.mp3',
  './audio/zugausfall-de4eb80556.mp3',
  './audio/zukunft-fff7e6bf68.mp3',
  './audio/native/native.json',
  './audio/native/tatoeba-10098.mp3',
  './audio/native/tatoeba-1011527.mp3',
  './audio/native/tatoeba-1039569.mp3',
  './audio/native/tatoeba-104544.mp3',
  './audio/native/tatoeba-1054.mp3',
  './audio/native/tatoeba-106012.mp3',
  './audio/native/tatoeba-10709.mp3',
  './audio/native/tatoeba-1079.mp3',
  './audio/native/tatoeba-1081.mp3',
  './audio/native/tatoeba-10860.mp3',
  './audio/native/tatoeba-122546.mp3',
  './audio/native/tatoeba-1280.mp3',
  './audio/native/tatoeba-130496.mp3',
  './audio/native/tatoeba-13453.mp3',
  './audio/native/tatoeba-139645.mp3',
  './audio/native/tatoeba-140224.mp3',
  './audio/native/tatoeba-142687.mp3',
  './audio/native/tatoeba-143005.mp3',
  './audio/native/tatoeba-146181.mp3',
  './audio/native/tatoeba-150886.mp3',
  './audio/native/tatoeba-158871.mp3',
  './audio/native/tatoeba-161431.mp3',
  './audio/native/tatoeba-16217.mp3',
  './audio/native/tatoeba-162195.mp3',
  './audio/native/tatoeba-16535.mp3',
  './audio/native/tatoeba-168695.mp3',
  './audio/native/tatoeba-17667.mp3',
  './audio/native/tatoeba-179498.mp3',
  './audio/native/tatoeba-18004.mp3',
  './audio/native/tatoeba-18139.mp3',
  './audio/native/tatoeba-18396.mp3',
  './audio/native/tatoeba-185881.mp3',
  './audio/native/tatoeba-18770.mp3',
  './audio/native/tatoeba-18823.mp3',
  './audio/native/tatoeba-195467.mp3',
  './audio/native/tatoeba-199857.mp3',
  './audio/native/tatoeba-229221.mp3',
  './audio/native/tatoeba-230086.mp3',
  './audio/native/tatoeba-235615.mp3',
  './audio/native/tatoeba-243007.mp3',
  './audio/native/tatoeba-243920.mp3',
  './audio/native/tatoeba-24628.mp3',
  './audio/native/tatoeba-285746.mp3',
  './audio/native/tatoeba-29135.mp3',
  './audio/native/tatoeba-32183.mp3',
  './audio/native/tatoeba-32708.mp3',
  './audio/native/tatoeba-332534.mp3',
  './audio/native/tatoeba-34010.mp3',
  './audio/native/tatoeba-340898.mp3',
  './audio/native/tatoeba-34098.mp3',
  './audio/native/tatoeba-341318.mp3',
  './audio/native/tatoeba-34167.mp3',
  './audio/native/tatoeba-345540.mp3',
  './audio/native/tatoeba-347773.mp3',
  './audio/native/tatoeba-349091.mp3',
  './audio/native/tatoeba-35134.mp3',
  './audio/native/tatoeba-35552.mp3',
  './audio/native/tatoeba-35553.mp3',
  './audio/native/tatoeba-36734.mp3',
  './audio/native/tatoeba-38065.mp3',
  './audio/native/tatoeba-38275.mp3',
  './audio/native/tatoeba-4144.mp3',
  './audio/native/tatoeba-41873.mp3',
  './audio/native/tatoeba-43123.mp3',
  './audio/native/tatoeba-43269.mp3',
  './audio/native/tatoeba-4429.mp3',
  './audio/native/tatoeba-4444.mp3',
  './audio/native/tatoeba-48301.mp3',
  './audio/native/tatoeba-48469.mp3',
  './audio/native/tatoeba-5428.mp3',
  './audio/native/tatoeba-5476.mp3',
  './audio/native/tatoeba-5500.mp3',
  './audio/native/tatoeba-57542.mp3',
  './audio/native/tatoeba-596014.mp3',
  './audio/native/tatoeba-601308.mp3',
  './audio/native/tatoeba-615080.mp3',
  './audio/native/tatoeba-624574.mp3',
  './audio/native/tatoeba-6253.mp3',
  './audio/native/tatoeba-64028.mp3',
  './audio/native/tatoeba-641043.mp3',
  './audio/native/tatoeba-662154.mp3',
  './audio/native/tatoeba-6687.mp3',
  './audio/native/tatoeba-6742.mp3',
  './audio/native/tatoeba-6873.mp3',
  './audio/native/tatoeba-696599.mp3',
  './audio/native/tatoeba-72945.mp3',
  './audio/native/tatoeba-7695.mp3',
  './audio/native/tatoeba-769977.mp3',
  './audio/native/tatoeba-7806.mp3',
  './audio/native/tatoeba-797466.mp3',
  './audio/native/tatoeba-80868.mp3',
  './audio/native/tatoeba-810390.mp3',
  './audio/native/tatoeba-810421.mp3',
  './audio/native/tatoeba-810733.mp3',
  './audio/native/tatoeba-828292.mp3',
  './audio/native/tatoeba-84739.mp3',
  './audio/native/tatoeba-855237.mp3',
  './audio/native/tatoeba-8560.mp3',
  './audio/native/tatoeba-865599.mp3',
  './audio/native/tatoeba-8846.mp3',
  './audio/native/tatoeba-8857.mp3',
  './audio/native/tatoeba-8885.mp3',
  './audio/native/tatoeba-8944.mp3',
  './audio/native/tatoeba-896048.mp3',
  './audio/native/tatoeba-908408.mp3',
  './audio/native/tatoeba-929294.mp3',
  './audio/native/tatoeba-9535.mp3',
  './audio/native/tatoeba-976257.mp3',
  './audio/native/tatoeba-989495.mp3',
  './audio/native/tatoeba-993312.mp3'
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
