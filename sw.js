const CACHE='bulles-blocs-v13';
const FILES=['./','index.html','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET')return;
  const same=new URL(req.url).origin===self.location.origin;
  // Même origine : toujours redemander la dernière version au serveur (pas de copie du navigateur)
  const net=same?fetch(req.url,{cache:'no-cache'}):fetch(req);
  e.respondWith(net.then(r=>{if(r&&r.ok){const cp=r.clone();caches.open(CACHE).then(c=>c.put(req,cp))}return r})
    .catch(()=>caches.match(req).then(r=>r||caches.match('index.html'))));
});
