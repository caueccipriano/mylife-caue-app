/* Cauê Trader PWA: cache only the shell, never financial simulation reports. */
const CACHE = 'caue-trader-shell-v5';
const SHELL = ['./','./index.html','./minute-lab.html','./forward-hourly.html','./hourly-lab.html','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(names=>Promise.all(names.filter(n=>n!==CACHE).map(n=>caches.delete(n)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
  if(url.pathname.endsWith('.json'))return; // Never serve stale report or backtest
  if(event.request.mode==='navigate'){
    event.respondWith(fetch(event.request).catch(()=>caches.match('./index.html')));
    return;
  }
  if(SHELL.some(x=>url.pathname.endsWith(x.replace(/^\.\//,''))) ){
    event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
  }
});
