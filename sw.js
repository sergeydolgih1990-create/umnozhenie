/* Работа без интернета: файлы тренажёра и шрифт хранятся в кеше браузера.
   Сначала отдаём из кеша, а в фоне обновляем — новая версия появится со следующего открытия. */
const CACHE = 'umnozhenie-v4';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/themes.js', 'js/art.js', 'js/store.js', 'js/gen.js', 'js/packages.js', 'js/engine.js', 'js/scoring.js', 'js/levels.js',
  'js/sound.js', 'js/charts.js', 'js/ui.js', 'js/screens.js', 'js/play.js', 'js/help.js', 'js/demo.js', 'js/app.js',
  'icons/icon-192.png', 'icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('umnozhenie') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const font = /(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  const own = url.origin === self.location.origin;
  if (!own && !font) return;
  e.respondWith(caches.open(CACHE).then(async (cache) => {
    const hit = await cache.match(req, { ignoreSearch: own });
    const net = fetch(req).then((res) => {
      if (res && (res.ok || res.type === 'opaque')) cache.put(own ? url.pathname : req, res.clone());
      return res;
    }).catch(() => hit);
    if (hit) { e.waitUntil(net); return hit; }
    return net;
  }));
});
