const APP_VERSION = '0.3.2';
const CACHE_NAME = `gargogen-${APP_VERSION}`;
const ASSETS = [
  "./",
  "./index.html",
  "./styles/main.css",
  "./main.js",
  "./manifest.json",
  "./version.json",
  "./assets/logo.png",
  "./data/bastognac.js",
  "./data/entityTypes.js",
  "./data/generationRules.js",
  "./data/tileTypes.js",
  "./core/balanceEngine.js",
  "./core/corridorGenerator.js",
  "./core/dungeonGenerator.js",
  "./core/entityPlacer.js",
  "./core/floorGenerator.js",
  "./core/roomGenerator.js",
  "./core/validator.js",
  "./render/mapRenderer.js",
  "./ui/appController.js",
  "./ui/editTools.js",
  "./ui/floorNavigation.js",
  "./ui/printManager.js",
  "./ui/settingsPanel.js",
  "./ui/summaryPanel.js",
  "./storage/storageManager.js",
  "./update/versionManager.js",
  "./utils/grid.js",
  "./utils/ids.js",
  "./utils/random.js"
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('gargogen-') && k !== CACHE_NAME).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then((cached)=> cached || fetch(e.request).then((res)=>{const cloned=res.clone(); caches.open(CACHE_NAME).then((cache)=>cache.put(e.request,cloned)); return res;}).catch(()=>caches.match('./index.html'))));
});
