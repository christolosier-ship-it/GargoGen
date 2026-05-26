const APP_VERSION = '0.2.0';
const CACHE_NAME = `gargogen-0.2.0`;
const ASSETS = ['./','./index.html','./styles/main.css','./main.js','./manifest.json','./version.json'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request, { cache: 'no-store' }).then((res) => {
    const cloned = res.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(e.request, cloned));
    return res;
  }).catch(() => caches.match(e.request)));
});
