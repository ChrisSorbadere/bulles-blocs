const CACHE='bulles-blocs-v34';
const FILES=['./','index.html','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','gems/g0.png','gems/g1.png','gems/g2.png','gems/g3.png','gems/g4.png','gems/g5.png','gems/w0.png','gems/w1.png','gems/w2.png','gems/w3.png','gems/w4.png','gems/w5.png','gems/bomb.png','gems/lava.png','gems/shadow.png','gems/stone.png','gems/h0.png','gems/h1.png','gems/h2.png','gems/h3.png','gems/h4.png','gems/h5.png','gems/v0.png','gems/v1.png','gems/v2.png','gems/v3.png','gems/v4.png','gems/v5.png','gems/f0.png','gems/f1.png','gems/f2.png','gems/f3.png','gems/f4.png','gems/f5.png','gems/cherry.png','gems/nut.png','gems/swirl.png','gems/chest.png','gems/key.png'];
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
