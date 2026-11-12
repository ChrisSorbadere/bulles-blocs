const CACHE='bulles-blocs-v40';
const FILES=['./','index.html','dames.js','billard.js','manifest.json','icon-192.png','icon-512.png','icon-maskable-192.png','icon-maskable-512.png','gems/g0.png','gems/g1.png','gems/g2.png','gems/g3.png','gems/g4.png','gems/g5.png','gems/w0.png','gems/w1.png','gems/w2.png','gems/w3.png','gems/w4.png','gems/w5.png','gems/bomb.png','gems/lava.png','gems/shadow.png','gems/stone.png','gems/h0.png','gems/h1.png','gems/h2.png','gems/h3.png','gems/h4.png','gems/h5.png','gems/v0.png','gems/v1.png','gems/v2.png','gems/v3.png','gems/v4.png','gems/v5.png','gems/f0.png','gems/f1.png','gems/f2.png','gems/f3.png','gems/f4.png','gems/f5.png','gems/cherry.png','gems/nut.png','gems/swirl.png','gems/chest.png','gems/key.png'];
const FONTS='bulles-blocs-fonts';
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)));self.skipWaiting()});
// Ne supprime que ses propres caches : toutes les applis partagent chrissorbadere.github.io.
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('bulles-blocs-')&&k!==CACHE&&k!==FONTS).map(k=>caches.delete(k)))));self.clients.claim()});
// Recomplète le cache s'il a été vidé (par une autre appli, par exemple)
let healing=null;
function heal(){if(healing)return healing;healing=caches.open(CACHE).then(async c=>{const have=new Set((await c.keys()).map(r=>r.url));
  const miss=FILES.filter(f=>!have.has(new URL(f,self.registration.scope).href));
  await Promise.all(miss.map(f=>fetch(f,{cache:'no-cache'}).then(r=>r.ok&&c.put(f,r)).catch(()=>{})))}).finally(()=>{healing=null});return healing}
const timeout=(p,ms)=>new Promise(res=>{const t=setTimeout(()=>res(null),ms);p.then(r=>{clearTimeout(t);res(r)},()=>{clearTimeout(t);res(null)})});
self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET')return;
  const url=new URL(req.url);
  // Police du jeu : gardée en cache pour le hors-ligne
  if(url.host==='fonts.googleapis.com'||url.host==='fonts.gstatic.com'){
    e.respondWith(caches.open(FONTS).then(c=>c.match(req).then(hit=>{const net=fetch(req).then(r=>{if(r&&(r.ok||r.type==='opaque'))c.put(req,r.clone());return r});return hit||net})));return}
  if(url.origin!==self.location.origin)return;
  // Toujours la dernière version du serveur ; si le réseau ne répond pas en 3 s, la copie en cache
  const net=fetch(req.url,{cache:'no-cache'}).then(r=>{if(r&&r.ok){const cp=r.clone();caches.open(CACHE).then(c=>c.put(req,cp))}return r});
  const cached=()=>caches.match(req,{ignoreSearch:req.mode==='navigate'}).then(r=>r||caches.match('index.html'));
  if(req.mode==='navigate')e.waitUntil(net.then(()=>heal()).catch(()=>{}));
  e.respondWith(timeout(net,3000).then(r=>r||cached().then(c=>c||net)).catch(()=>cached()));
});
