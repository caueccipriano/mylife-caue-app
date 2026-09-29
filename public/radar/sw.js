/* Editalume-specific app-shell worker. Never intercept Supabase or PNCP data. */
const PREFIX="editalume-shell-";
const VERSION=PREFIX+"br-20260929-4";
const SHELL=["./","./index.html","./style.css?v=br-20260929-2",
"./national.css?v=br-20260929-1","./app.js?v=br-20260929-2",
"./national.js?v=br-20260929-3","./icon.svg",
"./manifest.webmanifest?v=br-20260929-4"];
self.addEventListener("install",event=>{
 event.waitUntil(caches.open(VERSION).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==VERSION).map(k=>caches.delete(k))))
  .then(()=>self.clients.claim()));
});
self.addEventListener("fetch",event=>{
 const req=event.request;
 if(req.method!=="GET")return;
 const target=new URL(req.url),scope=new URL(self.registration.scope);
 if(target.origin!==scope.origin||!target.pathname.startsWith(scope.pathname))return;
 // PNCP snapshots / status must be fetched fresh; never imply an old snapshot is today's.
 if(/\/(?:opportunities|search-index|refresh-status)\.json$/.test(target.pathname))return;
 if(!req.mode.startsWith("navigate")&&!/\.(?:css|js|svg|webmanifest)$/.test(target.pathname))return;
 event.respondWith(fetch(req).then(response=>{
   if(response.ok){const copy=response.clone();event.waitUntil(caches.open(VERSION).then(c=>c.put(req,copy)));}
   return response;
 }).catch(async()=>{
   const cache=await caches.open(VERSION);
   const cached=await cache.match(req,{ignoreSearch:true});
   if(cached)return cached;
   if(req.mode==="navigate")return cache.match("./index.html",{ignoreSearch:true});
   return new Response("Offline",{status:503});
 }));
});
