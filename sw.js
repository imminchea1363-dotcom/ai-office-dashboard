/* Build replaces the cache suffix with a content hash. */
const ROOT = new URL('./', self.location.href);
const PREFIX = 'dongbaek-pwa-' + encodeURIComponent(ROOT.pathname) + '-';
const CACHE = PREFIX + '270d05de20174165';
const ASSETS = [
  './', './index.html', './pixel-mode.js', './v3.js', './pwa.js', './radio.js',
  './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png',
  './icons/maskable-512.png', './assets/office-pixel.png', './assets/office-background.png'
];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS.map(path => new URL(path, ROOT).href));
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== ROOT.origin || !url.pathname.startsWith(ROOT.pathname)) return;
  const shell = ASSETS.map(path => new URL(path, ROOT));
  const known = shell.some(asset => asset.pathname === url.pathname);
  const appNavigation = event.request.mode === 'navigate' &&
    (url.pathname === ROOT.pathname || url.pathname === new URL('index.html', ROOT).pathname);
  if (!known && !appNavigation) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const key = appNavigation ? new URL('index.html', ROOT).href : url.origin + url.pathname;
    const stored = await cache.match(key);
    return stored || fetch(event.request);
  })());
});
