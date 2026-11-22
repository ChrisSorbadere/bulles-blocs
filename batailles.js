/* ================= BATAILLES (armées de points) =================
   Placement au pinceau ou en blocs, ordres par groupe, moral et déroute,
   attaques de flanc et de dos, terrains (rochers, étangs, forêts, collines, rivière et ponts),
   7 unités + géant ennemi, améliorations, défis de niveau et défi du jour. */
const Battle=(()=>{
  const cv=$('#bat-cv'),ctx=cv.getContext('2d'),stage=$('#bat-stage'),toolsEl=$('#bat-tools'),ov=$('#bat-ov'),lvlSel=$('#bat-lvl'),msgEl=$('#bat-msg');
  const FW=100,FH=150,ZY=98,EZ=58,STEP=1/30;
  // 0 soldat, 1 piquier, 2 archer, 3 cavalier, 4 bouclier, 5 catapulte, 6 général, 7 géant (ennemi)
  const T=[
    {n:'Soldat',s:'●',cost:1,hp:10,dmg:2,rng:0,spd:6,cd:.8,r:1},
    {n:'Piquier',s:'■',cost:2,hp:15,dmg:2,rng:0,spd:4.2,cd:.9,r:1.05},
    {n:'Archer',s:'▲',cost:2,hp:6,dmg:1.6,rng:24,spd:5.5,cd:1.4,r:1},
    {n:'Cavalier',s:'◆',cost:3,hp:13,dmg:3,rng:0,spd:12,cd:.9,r:1.2},
    {n:'Bouclier',s:'⬢',cost:2,hp:20,dmg:1.4,rng:0,spd:4.5,cd:.9,r:1.1},
    {n:'Catapulte',s:'✚',cost:5,hp:10,dmg:6,rng:42,spd:2.6,cd:3.8,r:1.4,min:8,splash:4},
    {n:'Général',s:'★',cost:6,hp:36,dmg:3,rng:0,spd:5.5,cd:.8,r:1.5,aura:14},
    {n:'Géant',s:'⬟',cost:30,hp:260,dmg:10,rng:0,spd:3.2,cd:1.4,r:3,splash:2.6}];
  const MUL=[[1,1,1,1,1,1.5,1,1],[1,1,1,3,1,1.2,1,1.5],[1.5,.7,1,1.1,.3,1.2,1,1],[1.3,.45,2.5,1,.7,2.5,1.2,.8],[.9,.9,.9,.9,.9,1.2,.9,.9],[1,1.3,1,1,1.3,1,1,1],[1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1]];
  const UNLOCK=[1,3,5,8,12,16,20,999];
  const ORD=[['➡️','Avancer'],['🛡️','Tenir'],['↖️','Flanc gauche'],['↗️','Flanc droit'],['⏳','Réserve']];
  const WORLDS=[['Plaines','#2a3326','#33402e'],['Forêts','#1f2c22','#28382b'],['Collines','#2f2f26','#3a3a2d'],['Rivières','#22303a','#2b3a44'],['Marches','#2c2a33','#36333f']];
  const PLAYER_BUDGET=n=>Math.round(24+n*4.2);
  // Force de l'armée ennemie par niveau : calée par simulation (un robot joue des dizaines de batailles par niveau)
  const ENEMY_K={1:0.898,2:0.871,3:0.738,4:0.791,5:1.11,6:0.924,7:0.632,8:0.791,9:0.712,10:1.11,11:1.323,12:0.738,13:0.712,14:0.818,15:0.818,16:0.951,17:1.19,18:1.509,19:0.951,20:0.579,21:0.765,22:0.765,23:1.03,24:1.057,25:0.924,26:1.349,27:0.924,28:1.057,29:0.977,30:0.712,31:1.03,32:0.738,33:0.951,34:0.765,35:0.977,36:0.951,37:1.004,38:1.03,39:0.818,40:1.455,41:1.455,42:0.924,43:0.659,44:1.057,45:1.349};
  const DOC={drums:['🥁','Tambours','Les pertes de moral sont réduites d’un tiers',60],lances:['🐎','Lances de charge','La charge des cavaliers fait ×2,6 au lieu de ×2',50],
    fire:['🔥','Flèches enflammées','Archers +20 % de dégâts',70],tortue:['🐢','Tortue','Les boucliers protègent plus loin et mieux',60],
    eng:['⚙️','Ingénieurs','Les catapultes tirent 25 % plus vite',70],banner:['🚩','Étendard','Aura du général +50 %, ralliement plus long',80],second:['📯','Second ralliement','Deux ralliements par bataille',120]};
  const SHAPES=['Ligne','Carré','Coin'];
  // missions et environnements
  const MIS={rout:['⚔️','Bataille','Mets l’armée ennemie en déroute'],hill:['⛰️','Tenir la colline','Occupe le cercle 20 s sans ennemi dedans'],general:['👑','Abattre le général','Élimine le général ennemi'],
    cata:['💥','Détruire les catapultes','Détruis toutes les catapultes ennemies'],defend:['🚩','Défendre le drapeau','Tiens 75 s : l’ennemi arrive par vagues et vise ton drapeau'],
    escort:['🛒','Escorter le chariot','Le chariot doit traverser le champ de bataille'],survive:['⏳','Survivre','Tiens 60 s face à une armée bien plus grande, qui arrive par vagues']};
  const ENV={clear:['☀️','Beau temps',''],snow:['❄️','Neige','tout le monde avance moins vite'],rain:['🌧️','Pluie','archers et catapultes moins précis'],night:['🌙','Nuit','on ne voit l’ennemi que de près'],
    fog:['🌫️','Brouillard','on voit l’ennemi d’un peu plus loin qu’en pleine nuit'],desert:['🏜️','Désert','la chaleur fatigue les troupes'],fort:['🏰','Forteresse','l’ennemi est derrière un mur : enfonce la porte'],bridge:['🌉','Pont unique','un seul pont pour traverser la rivière']};
  const MK={rout:1,hill:1.65,general:.95,cata:.8,defend:1.22,escort:.98,survive:1.3};
  const EK={clear:1,snow:1.04,rain:.95,night:.93,fog:1,desert:.95,fort:.87,bridge:.9};
  const rng=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
  const dayNum=()=>{const d=new Date();return Math.floor((Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())-Date.UTC(2026,0,1))/864e5)};
  const dkey=()=>{const d=new Date();return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()};
  let prog=store.get('bb.batProg',null);
  const fresh=()=>({stars:[],coins:0,vet:[0,0,0,0,0,0,0],bud:0,doc:{},med:[],army:{},daily:''});
  if(!prog||!Array.isArray(prog.stars))prog=fresh();prog={...fresh(),...prog};while(prog.vet.length<7)prog.vet.push(0);
  const saveProg=()=>store.set('bb.batProg',prog);
  const unlocked=()=>{let n=1;while(prog.stars[n-1])n++;return n};
  let cur=store.get('bb.batSel',1);if(cur!=='D')cur=Math.min(+cur||1,unlocked());
  let plans={},planMode=false,selG=null,L,mine=[],phase='place',tool=0,mode='brush',shape=0,erase=false,order=0,speed=1,B=null,W=300,H=300,sc=2,ox=0,oy=0,acc=0,painting=false,lastPaint=null,gid=1,bg=null,shake=0,intro=0,lastEnd=null;

  /* ---------- Niveaux ---------- */
  function genLevel(seed,eq,daily,force){const R=rng(seed*7919+13),ri=k=>Math.floor(R()*k);
    const w=Math.floor((eq-1)/10)%5,boss=!daily&&eq%10===0;
    const L={n:seed,eq,w,boss,daily,rocks:[],water:[],forest:[],hills:[],river:null,enemy:[],budget:PLAYER_BUDGET(eq)};
    const types=[0,1,2,3,4,5,6].filter(t=>eq>=UNLOCK[t]+(t>=4?2:0));
    // terrain selon le monde
    const mid=()=>EZ+6+R()*(ZY-EZ-12);
    const nr=eq<3?0:Math.min(6,1+ri(2+Math.floor(eq/8)));
    for(let i=0;i<nr;i++){const cx=8+R()*84,cy=mid(),k=2+ri(4);for(let j=0;j<k;j++)L.rocks.push({x:cx+(R()-.5)*10,y:cy+(R()-.5)*7,r:1.8+R()*2.4})}
    if(eq>=6&&R()<(w===0?.5:.3))L.water.push({x:12+R()*76,y:mid(),rx:8+R()*8,ry:4+R()*3});
    const nf=w===1?2+ri(3):eq>=9&&R()<.5?1+ri(2):0;for(let i=0;i<nf;i++){const cx=10+R()*80,cy=EZ+R()*(ZY-EZ+6),k=4+ri(5);const f={x:cx,y:cy,r:6+R()*5,trees:[]};for(let j=0;j<k*3;j++)f.trees.push([cx+(R()-.5)*f.r*1.7,cy+(R()-.5)*f.r*1.7,1.2+R()*1.3]);L.forest.push(f)}
    const nh=w===2?1+ri(2):eq>=11&&R()<.45?1:0;for(let i=0;i<nh;i++)L.hills.push({x:15+R()*70,y:R()<.5?EZ-6-R()*14:ZY+8+R()*14,rx:10+R()*6,ry:7+R()*4});
    if((w===3||w===4&&R()<.4)&&eq>=31){const y=74+R()*8,nb=1+ri(2),br=[];for(let i=0;i<nb;i++)br.push({x:nb===1?25+R()*50:i?62+R()*22:16+R()*22,w:9});L.river={y,h:3,br};
      L.rocks=L.rocks.filter(r=>Math.abs(r.y-y)>r.r+4);L.water=L.water.filter(p=>Math.abs(p.y-y)>p.ry+4)}
    // mission et environnement
    const R2=rng(seed*104729+7),pick=a=>a[Math.floor(R2()*a.length)];
    const mp=['hill','general','cata','defend','escort','survive'].filter((m,i)=>eq>=[6,7,9,11,13,16][i]);
    let mis=boss||!mp.length||R2()<.35?'rout':pick(mp);
    const ep=['snow','rain','night','fog','desert','fort','bridge'].filter((e,i)=>eq>=[5,7,9,11,13,15,18][i]).filter(e=>!(['fort','bridge'].includes(e)&&['defend','escort','survive','hill'].includes(mis)));
    let env=!ep.length||R2()<.4?'clear':pick(ep);if(env==='fort'&&mis==='cata')mis='rout';if(force){mis=force.mis||mis;env=force.env||env}L.mis=mis;L.env=env;
    const clearAround=(x,y,r)=>{L.rocks=L.rocks.filter(k=>Math.hypot(k.x-x,k.y-y)>k.r+r);L.water=L.water.filter(w=>Math.hypot(w.x-x,w.y-y)>Math.max(w.rx,w.ry)+r);L.forest=L.forest.filter(f=>Math.hypot(f.x-x,f.y-y)>f.r+r-2)};
    if(env==='bridge'){const y=76+R2()*6;L.river={y,h:3,br:[{x:22+R2()*56,w:7}]};L.rocks=L.rocks.filter(r=>Math.abs(r.y-y)>r.r+4);L.water=L.water.filter(p=>Math.abs(p.y-y)>p.ry+4)}
    if(env==='fort'){const wy=EZ+5,gx=30+R2()*40;L.wall={y:wy,h:1.4,gx,gw:8,hp:140+eq*4};L.river=null;L.rocks=L.rocks.filter(r=>Math.abs(r.y-wy)>r.r+3);L.water=L.water.filter(p=>Math.abs(p.y-wy)>p.ry+3);L.forest=L.forest.filter(f=>Math.abs(f.y-wy)>f.r+1)}
    if(mis==='hill'){const zy=L.river?(L.river.y<80?L.river.y-15:L.river.y+15):78;L.zone={x:30+R2()*40,y:zy,r:11};clearAround(L.zone.x,L.zone.y,L.zone.r+2)}
    if(mis==='defend'){L.flag={x:50,y:ZY+18};clearAround(50,ZY+18,6)}
    if(mis==='escort'){L.wagon={x:20+R2()*60,y:FH-6};L.rocks=L.rocks.filter(k=>Math.abs(k.x-L.wagon.x)>k.r+4);L.water=L.water.filter(w=>Math.abs(w.x-L.wagon.x)>w.rx+4);if(L.river&&!L.river.br.some(b=>Math.abs(b.x-L.wagon.x)<3))L.river.br.push({x:L.wagon.x,w:9})}
    // armée ennemie
    const k=ENEMY_K[eq]||(1+Math.min(.3,(eq-45)*.01));let bud=Math.round(PLAYER_BUDGET(eq)*k*(daily?1.05:1)*MK[mis]*EK[env]);
    const add=(t,x,y,o=0)=>{if(bud<T[t].cost||x<2||x>FW-2||y<3)return;for(const r of L.rocks)if(Math.hypot(x-r.x,y-r.y)<r.r+1.3)return;L.enemy.push({t,x,y,o});bud-=T[t].cost};
    const block=(t,cx,cy,n,cols,o=0)=>{const sp=2.6,c=cols||Math.min(16,Math.max(3,Math.ceil(Math.sqrt(n*2.5))));for(let i=0;i<n;i++)add(t,cx+(i%c-(c-1)/2)*sp,cy-Math.floor(i/c)*sp,o)};
    if(boss){const g=Math.max(1,Math.floor(eq/10));for(let i=0;i<g;i++){L.enemy.push({t:7,x:FW/2+(i-(g-1)/2)*16,y:EZ-6,o:0});bud-=T[7].cost*.6}}
    const has=t=>types.includes(t),TPL=[
      ()=>[[0,1,'front']],
      ()=>[[has(1)?1:0,.5,'front'],[0,.5,'second']],
      ()=>[[0,.55,'front'],[has(2)?2:0,.45,'back',1]],
      ()=>[[has(1)?1:0,.4,'front'],[has(3)?3:0,.3,'wings'],[has(2)?2:0,.3,'back',1]],
      ()=>[[0,.35,'front'],[has(3)?3:1,.35,'flankL',2],[has(1)?1:0,.3,'second']],
      ()=>[[has(4)?4:1,.35,'front'],[has(2)?2:0,.4,'back',1],[has(3)?3:0,.25,'wings']],
      ()=>[[has(4)?4:0,.3,'front'],[has(5)?5:2,.3,'back',1],[has(1)?1:0,.25,'second'],[has(3)?3:0,.15,'flankR',3]],
      ()=>[[0,.3,'front'],[has(2)?2:0,.25,'back',1],[has(3)?3:0,.25,'reserve',4],[has(1)?1:0,.2,'second']]];
    const tpl=TPL[Math.min(TPL.length-1,ri(Math.min(TPL.length,2+Math.floor(eq/4))))]();
    if(has(6)&&R()<.6)add(6,FW/2,EZ-24);
    const total=bud;const cx0=FW/2+(ri(11)-5);
    tpl.forEach(([t,f,pos,o])=>{const n=Math.max(1,Math.floor(total*f/T[t].cost));const hill=L.hills.find(h=>h.y<EZ);
      if(pos==='front')block(t,cx0,EZ-2,n,0,o||0);else if(pos==='second')block(t,cx0,EZ-12,n,0,o||0);
      else if(pos==='back'){if(hill&&(t===2||t===5))block(t,hill.x,hill.y+2,n,8,1);else block(t,cx0,EZ-20,n,t===5?6:16,o||0)}
      else if(pos==='wings'){block(t,13,EZ-6,Math.ceil(n/2),5,o||0);block(t,FW-13,EZ-6,Math.floor(n/2),5,o||0)}
      else if(pos==='flankL')block(t,12,EZ-10,n,5,2);else if(pos==='flankR')block(t,FW-12,EZ-10,n,5,3);
      else block(t,cx0,EZ-28,n,0,4)});
    // objectifs de mission dans l'armée ennemie
    if(mis==='general'){L.enemy.push({t:6,x:L.wall?L.wall.gx:FW/2,y:EZ-26,o:4,boss:1});for(const[dx,dy]of[[-3,1],[3,1],[-3,-2],[3,-2]])L.enemy.push({t:4,x:(L.wall?L.wall.gx:FW/2)+dx,y:EZ-26+dy,o:4})}
    if(mis==='cata'){L.enemy=L.enemy.filter(u=>u.t!==5);for(const x of[22,50,78])L.enemy.push({t:5,x:x+(R2()-.5)*8,y:EZ-24-R2()*6,o:1})}
    if(env==='fort')L.enemy=L.enemy.map(u=>({...u,y:Math.min(u.y,L.wall.y-4),o:u.o===4?4:1}));
    if(mis==='defend'||mis==='survive'){const all=L.enemy.filter(u=>u.t!==7).sort(()=>R2()-.5),n0=Math.ceil(all.length*.45),rest=all.slice(n0),half=Math.ceil(rest.length/2);
      L.enemy=[...L.enemy.filter(u=>u.t===7),...all.slice(0,n0)];const wave=(arr)=>arr.map((u,i)=>({t:u.t,x:6+((i*37)%88)+R2()*2,y:3+Math.floor(i/22)*2.6,o:0}));
      L.waves=[{t:22,list:wave(rest.slice(0,half))},{t:42,list:wave(rest.slice(half))}]}
    // défi du niveau
    const D=['keep','nocav','budget','time','general'];let d=D[seed%5];if(d==='nocav'&&eq<UNLOCK[3]+1)d='budget';if(d==='general'&&eq<UNLOCK[6]+1)d='time';if(boss||['hill','defend','survive','escort'].includes(mis))d=d==='time'?'keep':d;if(boss)d='keep';L.defi=d;
    return L}
  function misLine(){const m=MIS[L.mis||'rout'],e=ENV[L.env||'clear'];return m[0]+' '+m[1]+' : '+m[2]+(L.env&&L.env!=='clear'?' · '+e[0]+' '+e[1]+' : '+e[2]:'')}
  const DEFI={keep:'Gagner en gardant 70 % de ton armée',nocav:'Gagner sans cavaliers',budget:'Gagner en utilisant au plus 80 % du budget',time:'Gagner en moins de 50 secondes de combat',general:'Gagner avec ton général encore en vie'};
  function levelFor(n){if(n==='D'){const dn=dayNum();return genLevel(100000+dn,14+dn%22,true)}return genLevel(n,n,false)}
  function startLevel(n,keep){cur=n;store.set('bb.batSel',n);L=levelFor(n);phase='place';B=null;ov.hidden=true;erase=false;painting=false;
    if(!keep){const a=prog.army[n];mine=a?validArmy(a):[];plans=JSON.parse(JSON.stringify((prog.plans||{})[n]||{}))}planMode=false;selG=null;
    bg=null;const nt=[0,1,2,3,4,5,6].find(t=>UNLOCK[t]===n);
    if(nt!=null&&nt>0)say('Nouvelle unité : '+T[nt].n+' '+T[nt].s+' · '+HELP[nt]+(L.mis!=='rout'||L.env!=='clear'?' — '+misLine():''));
    else if(L.boss)say('Niveau de boss : un Géant ⬟ mène l’armée ennemie !');
    else if(L.daily)say('Défi du jour · '+misLine());
    else say(misLine());
    fillSel();tools();if(!keep)store.set('bb.save.bat',null)}
  const HELP=['polyvalent','solide, il écrase les cavaliers','tire de loin, fragile au contact','rapide, charge les archers','résiste aux flèches et protège ses voisins','tir lointain qui touche une zone','renforce les unités proches ; sa mort démoralise'];
  const budget=()=>Math.round(L.budget*(1+.1*(prog.bud||0)));
  const used=(a=mine)=>a.reduce((s,u)=>s+T[u.t].cost,0);
  const canUse=t=>(L.daily?L.eq:cur)>=UNLOCK[t]||unlocked()>UNLOCK[t]&&L.daily;

  /* ---------- Simulation ---------- */
  function inTerrain(list,x,y,k='r'){for(const f of list)if(Math.hypot(x-f.x,y-f.y)<f.r)return f;return null}
  const onHill=(lv,x,y)=>lv.hills.some(h=>((x-h.x)/h.rx)**2+((y-h.y)/h.ry)**2<1);
  const inWater=(lv,x,y)=>lv.water.some(w=>((x-w.x)/w.rx)**2+((y-w.y)/w.ry)**2<1);
  function makeArmy(list,side,P){return list.map(u=>{const t=T[u.t],v=1+.12*(P?(P.vet[u.t]||0):0);
    return{t:u.t,side,x:u.x,y:u.y,hp:t.hp*v,max:t.hp*v,dk:v,cd:Math.random()*t.cd,tg:null,rt:0,ord:u.o||0,g:u.g||0,wp:0,mor:100,rout:0,fx:0,fy:side?1:-1,mv:0,dead:0,fade:0,flash:0,fled:0,buff:0}})}
  function newBattle(lv,enemy,mineList,P,PL){P=P||{vet:[0,0,0,0,0,0,0],doc:{}};const units=[...makeArmy(mineList,0,P),...makeArmy(enemy,1,null)];
    // plans de mission : chaque groupe suit ses étapes en gardant sa formation
    const bp={};if(PL)for(const g in PL){const pl=PL[g];if(!pl||!pl.steps||!pl.steps.length)continue;const mem=units.filter(u=>u.side===0&&String(u.g)===String(g));if(!mem.length)continue;
      const cx=mem.reduce((a,u)=>a+u.x,0)/mem.length,cy=mem.reduce((a,u)=>a+u.y,0)/mem.length;
      for(const u of mem){let ox=u.x-cx,oy=u.y-cy;const l=Math.hypot(ox,oy);if(l>9){ox*=9/l;oy*=9/l}u.off=[ox,oy];u.pk='0:'+g;u.ord=0}
      bp['0:'+g]={steps:pl.steps,march:!!pl.march,si:0,t:0}}
    // chariot à escorter
    if(lv.wagon)units.push({t:4,side:0,x:lv.wagon.x,y:lv.wagon.y,hp:110,max:110,dk:1,cd:0,tg:null,rt:0,ord:0,g:-1,wp:0,mor:100,rout:0,fx:0,fy:-1,mv:0,dead:0,fade:0,flash:0,fled:0,buff:0,wag:1});
    // vitesse de groupe : un groupe marche au pas de son unité la plus lente
    const gs={};for(const u of units){const k=u.side+':'+u.g;gs[k]=Math.min(gs[k]??99,T[u.t].spd)}for(const u of units)u.gs=u.g?gs[u.side+':'+u.g]:T[u.t].spd;
    return{units,plans:bp,waves:(lv.waves||[]).map(w=>({t:w.t,list:w.list,done:0})),hold:0,cap:0,gate:lv.wall?lv.wall.hp:0,mwin:null,proj:[],fx:[],t:0,over:0,P,rally:P.doc&&P.doc.second?2:1,rallyT:0,start:[mineList.length,enemy.length],val:[used(mineList),used(enemy)],
      kills:[new Array(8).fill(0),new Array(8).fill(0)],lost:[new Array(8).fill(0),new Array(8).fill(0)],fledN:[0,0]}}
  // franchir une rivière (par un pont) ou un mur (par la porte)
  let XL=null,XB=null;
  function cross(u,tx,ty2){const lv=XL,b=XB;if(lv.river){const ry=lv.river.y,sd=Math.sign(u.y-ry),de=Math.sign(ty2-ry);if(sd&&de&&sd!==de&&!lv.river.br.some(br=>Math.abs(u.x-br.x)<br.w/2-1)){let bb=lv.river.br[0];for(const br of lv.river.br)if(Math.abs(br.x-u.x)+Math.abs(br.x-tx)<Math.abs(bb.x-u.x)+Math.abs(bb.x-tx))bb=br;return[bb.x,ry]}}
    if(lv.wall){const wl=lv.wall,sd=Math.sign(u.y-wl.y),de=Math.sign(ty2-wl.y);if(sd&&de&&sd!==de){const open=b&&b.gate<=0;if(!open)return[wl.gx,wl.y+sd*(wl.h+2)];if(Math.abs(u.x-wl.gx)>wl.gw/2-1.2)return[wl.gx,wl.y+sd*(wl.h+.5)]}}
    return[tx,ty2]}
  const CS=4,GX=Math.ceil(FW/CS)+1,GY=Math.ceil(FH/CS)+1;
  function simStep(b,lv,dt){b.t+=dt;XL=lv;XB=b;const U=b.units,grid=new Array(GX*GY),P=b.P,doc=P.doc||{};
    for(const u of U){if(u.dead)continue;const k=Math.max(0,Math.min(GX-1,u.x/CS|0))+Math.max(0,Math.min(GY-1,u.y/CS|0))*GX;(grid[k]||(grid[k]=[])).push(u)}
    const near=(x,y,rad,f)=>{const x0=Math.max(0,(x-rad)/CS|0),x1=Math.min(GX-1,(x+rad)/CS|0),y0=Math.max(0,(y-rad)/CS|0),y1=Math.min(GY-1,(y+rad)/CS|0);
      for(let gy=y0;gy<=y1;gy++)for(let gx=x0;gx<=x1;gx++){const c=grid[gx+gy*GX];if(c)for(const o of c)f(o)}};
    const alive=[[],[]];for(const u of U)if(!u.dead)alive[u.side].push(u);
    // vagues de renfort
    for(const wv of b.waves)if(!wv.done&&b.t>=wv.t){wv.done=1;const nu=makeArmy(wv.list,1,null);for(const u of nu)u.gs=T[u.t].spd;U.push(...nu);alive[1].push(...nu);b.fx.push({k:'wave',t:0})}
    const mine0=alive[0].filter(u=>!u.wag),wag=U.find(u=>u.wag),pend=b.waves.some(w=>!w.done),mis=lv.mis||'rout';
    const end=w=>{b.mwin=w;b.over=1};
    if(mis==='general'&&!U.some(u=>u.side===1&&u.t===6&&!u.dead)){end(true);return}
    if(mis==='cata'&&!U.some(u=>u.side===1&&u.t===5&&!u.dead)){end(true);return}
    if(mis==='escort'){if(!wag||wag.dead){end(false);return}if(wag.y<5){end(true);return}}
    if(mis==='hill'){const z=lv.zone,inZ=u=>(u.x-z.x)**2+(u.y-z.y)**2<z.r*z.r&&!u.rout;if(mine0.some(inZ)&&!alive[1].some(inZ))b.hold+=dt;if(b.hold>=20){end(true);return}}
    if(mis==='defend'){const f=lv.flag,nf=u=>(u.x-f.x)**2+(u.y-f.y)**2<36&&!u.rout;if(alive[1].some(nf)&&!mine0.some(nf))b.cap+=dt;else b.cap=Math.max(0,b.cap-dt*.5);if(b.cap>=6){end(false);return}if(b.t>=75){end(true);return}}
    if(mis==='survive'&&b.t>=60&&mine0.length){end(true);return}
    if(!mine0.length){end(false);return}
    if(!alive[1].length&&!pend){if(mis==='escort'){}else{end(true);return}}
    if(b.t>150){if(mis!=='rout')end(false);else b.over=1;return}
    for(const key in b.plans){const pl=b.plans[key];if(pl.si>=pl.steps.length)continue;const mem=alive[0].filter(u=>u.pk===key&&!u.rout);if(!mem.length){pl.si=pl.steps.length;continue}
      const st=pl.steps[pl.si];let foe=false;const rad=st.k==='hold'?22:9;
      if(!pl.march||st.k==='hold')for(const u of mem){near(u.x,u.y,rad,o=>{if(!foe&&o.side===1&&!o.dead&&(o.x-u.x)**2+(o.y-u.y)**2<rad*rad)foe=true});if(foe)break}
      if(foe){pl.si=pl.steps.length;continue}
      if(st.k==='go'){const ok=mem.filter(u=>Math.hypot(st.x+u.off[0]-u.x,st.y+u.off[1]-u.y)<2.2).length;if(ok>=mem.length*.7){pl.si++;pl.t=0}}
      else if(st.k==='wait'){pl.t+=dt;if(pl.t>=st.s){pl.si++;pl.t=0}}}
    const gens=[alive[0].filter(u=>u.t===6),alive[1].filter(u=>u.t===6)];
    const auraR=s=>T[6].aura*(s===0&&doc.banner?1.5:1);
    const nearGen=u=>gens[u.side].some(g=>(g.x-u.x)**2+(g.y-u.y)**2<auraR(u.side)**2);
    const morLoss=(u,v)=>{u.mor-=v*(u.side===0&&doc.drums?.65:1)};
    function kill(u,by){if(u.dead)return;u.dead=1;if(u.wag){b.fx.push({k:'ring',x:u.x,y:u.y,t:0,r:6,c:0});return}b.lost[u.side][u.t]++;if(by)b.kills[by.side][u.t]++;
      for(let i=0;i<3;i++)b.fx.push({k:'p',x:u.x,y:u.y,vx:(Math.random()-.5)*14,vy:(Math.random()-.5)*14,t:0,c:u.side});
      const rad=u.t===6?25:8,loss=u.t===6?30:u.t===7?20:6;near(u.x,u.y,rad,o=>{if(o.side===u.side&&!o.dead)morLoss(o,loss)});
      if(u.t===7||u.t===6)b.fx.push({k:'ring',x:u.x,y:u.y,t:0,r:8,c:u.side})}
    function hurt(g,dm,by,ranged){if(g.dead)return;if(ranged){if(inTerrain(lv.forest,g.x,g.y))dm*=.5;if(by.t===2){if(g.t===4)dm*=1;else{let prot=false;const pr=g.side===0&&doc.tortue?5:3.5;near(g.x,g.y,pr,o=>{if(!prot&&o.t===4&&o.side===g.side&&!o.dead&&o!==g&&(o.x-g.x)**2+(o.y-g.y)**2<pr*pr)prot=true});if(prot)dm*=g.side===0&&doc.tortue?.45:.6}}}
      if(g.rout)dm*=1.4;if(onHill(lv,g.x,g.y)&&!ranged&&!onHill(lv,by.x,by.y))dm*=.85;
      g.hp-=dm;g.flash=.1;b.lastHit=b.t;if(g.hp<=0)kill(g,by)}
    const env=lv.env||'clear',ES=env==='snow'?.78:env==='desert'?1-Math.min(.3,b.t/200):1,VIS=env==='night'?20:env==='fog'?30:0;
    for(const u of U){if(u.dead){u.fade+=dt;continue}const ty=T[u.t];
      if(u.wag){let blk=false;near(u.x,u.y,3.5,o=>{if(o.side===1&&!o.dead)blk=true});u.flash=Math.max(0,u.flash-dt);if(!blk){const sp=2.4*ES*(inWater(lv,u.x,u.y)?.45:1);let tx=lv.wagon.x,ty3=2;[tx,ty3]=cross(u,tx,ty3);const dx=tx-u.x,dy=ty3-u.y,d=Math.hypot(dx,dy)||1;u.x+=dx/d*sp*dt;u.y+=dy/d*sp*dt}continue}u.flash=Math.max(0,u.flash-dt);u.cd-=dt;u.rt-=dt;u.buff=Math.max(0,u.buff-dt);
      // moral
      const ng=nearGen(u);if(u.hp<u.max*.35)morLoss(u,dt*2);if(env==='desert'&&!ng&&b.t>20)morLoss(u,dt*.6);u.mor=Math.min(100,u.mor+dt*(ng?7:2));
      if(u.t===7||u.t===6)u.mor=100;
      if(!u.rout&&u.mor<20){u.rout=1;u.tg=null}
      if(u.rout){let close=false;near(u.x,u.y,8,o=>{if(o.side!==u.side&&!o.dead)close=true});if(!close)u.mor+=dt*10;if(u.mor>=45){u.rout=0}
        else{const ey=u.side===0?FH-.5:.5;u.y+=(ey>u.y?1:-1)*ty.spd*1.1*ES*dt;u.fx=0;u.fy=ey>u.y?1:-1;if(Math.abs(u.y-ey)<1.5){u.dead=1;u.fled=1;b.fledN[u.side]++;b.lost[u.side][u.t]++}continue}}
      // cible
      if(!u.tg||u.tg.dead||u.rt<=0){u.rt=.35+Math.random()*.2;let best=null,bd=1e9;const minr=ty.min||0;
        const sr=VIS?Math.min(VIS*(u.t===5?1.5:1),u.t===5?44:18):u.t===5?44:18;
        near(u.x,u.y,sr,o=>{if(o.side!==u.side&&!o.dead){const d=(o.x-u.x)**2+(o.y-u.y)**2;if(d<bd&&d>=minr*minr){bd=d;best=o}}});
        if(u.side===1&&wag&&!wag.dead&&(wag.x-u.x)**2+(wag.y-u.y)**2<484&&(!best||bd>36))best=wag;
        if(!best&&!VIS&&!(mis==='defend'&&u.side===1))for(const o of alive[1-u.side]){const d=(o.x-u.x)**2+(o.y-u.y)**2;if(d<bd){bd=d;best=o}}
        u.tg=best}
      const g=u.tg;
      if(!g){if(u.ord===1||u.ord===4){if(b.t>(VIS?12:30))u.ord=0;else continue}
        let tx=u.x,ty2=u.side===0?2:FH-2;if(mis==='defend'&&u.side===1){tx=lv.flag.x;ty2=lv.flag.y}else if(mis==='hill'&&u.side===0&&b.t>3){tx=lv.zone.x;ty2=lv.zone.y}
        [tx,ty2]=cross(u,tx,ty2);const ddx=tx-u.x,ddy=ty2-u.y,dd=Math.hypot(ddx,ddy);if(dd>1){let sp=u.gs*ES;if(inWater(lv,u.x,u.y))sp*=.45;if(inTerrain(lv.forest,u.x,u.y))sp*=.75;u.x+=ddx/dd*sp*dt;u.y+=ddy/dd*sp*dt;u.fx=ddx/dd;u.fy=ddy/dd;u.mv+=dt}continue}
      let dx=g.x-u.x,dy=g.y-u.y,d=Math.hypot(dx,dy)||.01;
      // plan de mission
      const pl=u.pk&&b.plans[u.pk];let stay=false;
      if(pl&&pl.si<pl.steps.length){const st=pl.steps[pl.si];
        if(st.k==='go'){let tx=st.x+u.off[0],ty2=st.y+u.off[1];[tx,ty2]=cross(u,tx,ty2);
          const ddx=tx-u.x,ddy=ty2-u.y,dd=Math.hypot(ddx,ddy);if(dd>.4){let sp=u.gs*ES*(u.buff>0?1.25:1);if(inWater(lv,u.x,u.y))sp*=.45;if(inTerrain(lv.forest,u.x,u.y))sp*=.75;const m=Math.min(dd,sp*dt);u.x+=ddx/dd*m;u.y+=ddy/dd*m;u.fx=ddx/dd;u.fy=ddy/dd;u.mv+=dt}
          continue}
        stay=true}
      if(mis==='hill'&&u.side===1&&d>16&&!u.ord&&(u.x-lv.zone.x)**2+(u.y-lv.zone.y)**2>(lv.zone.r*.6)**2){let [tx,ty2]=cross(u,lv.zone.x,lv.zone.y);const ddx=tx-u.x,ddy=ty2-u.y,dd=Math.hypot(ddx,ddy)||1;const sp=u.gs*ES;u.x+=ddx/dd*sp*dt;u.y+=ddy/dd*sp*dt;u.fx=ddx/dd;u.fy=ddy/dd;u.mv+=dt;continue}
      if(mis==='defend'&&u.side===1&&d>14&&!u.ord){let [tx,ty2]=cross(u,lv.flag.x,lv.flag.y);const ddx=tx-u.x,ddy=ty2-u.y,dd=Math.hypot(ddx,ddy);if(dd>1.5){const sp=u.gs*ES;u.x+=ddx/dd*sp*dt;u.y+=ddy/dd*sp*dt;u.fx=ddx/dd;u.fy=ddy/dd;u.mv+=dt}continue}
      // ordres
      if(u.ord===1&&(d<22||b.t>30||(b.lastHit!=null&&b.t-b.lastHit>6)))u.ord=0;
      if(u.ord===4&&(b.t>15||(b.lastHit!=null&&b.t-b.lastHit>6)||alive[u.side].length<b.start[u.side]*.6||d<16))u.ord=0;
      if((u.ord===2||u.ord===3)&&d<12)u.ord=0;
      const range=ty.rng*(onHill(lv,u.x,u.y)?1.3:1)*(env==='rain'?.8:1),meleeR=ty.r+T[g.t].r+.6;
      const k=(ng?1.2:1)*(u.buff>0?1.25:1)*u.dk;
      if(ty.rng&&d<=range&&d>meleeR){u.mv=0;if(u.cd<=0){u.cd=ty.cd*(u.t===5&&u.side===0&&doc.eng?.75:1)*(.9+Math.random()*.2);
          let dm=ty.dmg*k*(u.t===2&&u.side===0&&doc.fire?1.2:1)*(env==='rain'&&u.t===2?.6:1);const sc2=env==='rain'?6:3;
          if(u.t===5)b.proj.push({k:'stone',x:u.x,y:u.y,sx:u.x,sy:u.y,tx:g.x+(Math.random()-.5)*sc2,ty:g.y+(Math.random()-.5)*sc2,t:0,dur:Math.max(.6,d/30),dmg:dm,by:u});
          else b.proj.push({k:'arrow',x:u.x,y:u.y,tg:g,dmg:dm*MUL[2][g.t],by:u})}
        u.fx=dx/d;u.fy=dy/d;continue}
      if(d<=meleeR){if(u.cd<=0){u.cd=ty.cd*(.85+Math.random()*.3);let dm=(ty.rng?.5:ty.dmg)*MUL[u.t][g.t]*k;
          if(u.t===3&&u.mv>1)dm*=(u.side===0&&doc.lances?2.6:2)*(env==='snow'?.8:1);u.mv=0;
          // flanc et dos
          const ax=(u.x-g.x)/d,ay=(u.y-g.y)/d,dot=ax*g.fx+ay*g.fy;if(dot<-.5){dm*=1.5;morLoss(g,3)}else if(dot<.3)dm*=1.2;
          if(g.t===1&&u.t===3)u.hp-=1.5;
          if(ty.splash){near(g.x,g.y,ty.splash,o=>{if(o.side!==u.side&&!o.dead&&o!==g&&(o.x-g.x)**2+(o.y-g.y)**2<ty.splash**2)hurt(o,dm*.6,u,false)});b.fx.push({k:'ring',x:g.x,y:g.y,t:0,r:ty.splash,c:u.side});b.shake=Math.max(b.shake||0,.15)}
          hurt(g,dm,u,false)}
        u.fx=-(u.x-g.x)/d;u.fy=-(u.y-g.y)/d;if(u.hp<=0)kill(u,g);continue}
      if(stay||u.ord===1||u.ord===4)continue;
      // destination : cible, point de contournement ou pont
      let tx=g.x,ty2=g.y;
      if(u.ord===2||u.ord===3){const sx=(u.ord===2)!==(u.side===1)?6:FW-6,path=u.side===0?[[sx,80],[sx,EZ-8]]:[[sx,70],[sx,ZY+8]];
        if(u.wp<2){[tx,ty2]=path[u.wp];if(Math.hypot(tx-u.x,ty2-u.y)<4)u.wp++}else u.ord=0}
      [tx,ty2]=cross(u,tx,ty2);
      // porte de la forteresse : les attaquants au contact la frappent
      if(lv.wall&&b.gate>0&&u.side===0&&!ty.rng&&Math.hypot(u.x-lv.wall.gx,u.y-(lv.wall.y+lv.wall.h+2))<3.5&&Math.sign(g.y-lv.wall.y)!==Math.sign(u.y-lv.wall.y)){
        if(u.cd<=0){u.cd=ty.cd;b.gate-=ty.dmg*k*(u.t===7?3:1);b.fx.push({k:'p',x:lv.wall.gx+(Math.random()-.5)*6,y:lv.wall.y,vx:(Math.random()-.5)*10,vy:Math.random()*8,t:0,c:2});if(b.gate<=0){b.fx.push({k:'ring',x:lv.wall.gx,y:lv.wall.y,t:0,r:8,c:2});b.shake=.2}}u.fx=0;u.fy=-1;continue}
      dx=tx-u.x;dy=ty2-u.y;d=Math.hypot(dx,dy)||.01;
      let sp=(Math.hypot(g.x-u.x,g.y-u.y)>14?u.gs:ty.spd)*ES*(u.buff>0?1.25:1);if(inWater(lv,u.x,u.y))sp*=.45;if(inTerrain(lv.forest,u.x,u.y))sp*=.75;
      u.x+=dx/d*sp*dt;u.y+=dy/d*sp*dt;u.fx=dx/d;u.fy=dy/d;u.mv+=dt}
    // séparation, obstacles, rivière
    for(const u of U){if(u.dead)continue;const ru=T[u.t].r;
      near(u.x,u.y,3+ru,o=>{if(o===u||o.dead)return;const dx=u.x-o.x,dy=u.y-o.y,d2=dx*dx+dy*dy,m=ru+T[o.t].r;if(d2<m*m&&d2>1e-6){const d=Math.sqrt(d2),w=T[o.t].r>2?.9:.5,p=(m-d)*w;u.x+=dx/d*p;u.y+=dy/d*p}});
      for(const r of lv.rocks){const dx=u.x-r.x,dy=u.y-r.y,d=Math.hypot(dx,dy),m=r.r+ru;if(d<m&&d>1e-6){u.x+=dx/d*(m-d);u.y+=dy/d*(m-d);
          if(u.tg){const tx=-dy/d,tyy=dx/d,s=Math.sign((u.tg.x-u.x)*tx+(u.tg.y-u.y)*tyy)||1;u.x+=tx*s*T[u.t].spd*dt*.8;u.y+=tyy*s*T[u.t].spd*dt*.8}}}
      if(lv.wall){const wl=lv.wall;if(Math.abs(u.y-wl.y)<wl.h+ru&&!(b.gate<=0&&Math.abs(u.x-wl.gx)<wl.gw/2-ru*.5))u.y=wl.y+(u.y>=wl.y?1:-1)*(wl.h+ru)}
      if(lv.river){const rv=lv.river;if(Math.abs(u.y-rv.y)<rv.h+ru&&!rv.br.some(br=>Math.abs(u.x-br.x)<br.w/2-ru*.5)){u.y=rv.y+(u.y>=rv.y?1:-1)*(rv.h+ru)}}
      u.x=Math.max(1,Math.min(FW-1,u.x));u.y=Math.max(.6,Math.min(FH-.6,u.y))}
    for(const p of b.proj){if(p.done)continue;
      if(p.k==='arrow'){const g=p.tg,dx=g.x-p.x,dy=g.y-p.y,d=Math.hypot(dx,dy),s=48*dt;if(d<=s){p.done=1;hurt(g,p.dmg,p.by,true)}else{p.x+=dx/d*s;p.y+=dy/d*s}}
      else{p.t+=dt;const u=Math.min(1,p.t/p.dur);p.x=p.sx+(p.tx-p.sx)*u;p.y=p.sy+(p.ty-p.sy)*u;p.h=Math.sin(u*Math.PI)*Math.min(14,p.dur*9);
        if(u>=1){p.done=1;const R2=T[5].splash;if(lv.wall&&b.gate>0&&p.by.side===0&&Math.abs(p.tx-lv.wall.gx)<lv.wall.gw&&Math.abs(p.ty-lv.wall.y)<5){b.gate-=p.dmg*3;if(b.gate<=0){b.fx.push({k:'ring',x:lv.wall.gx,y:lv.wall.y,t:0,r:8,c:2});b.shake=.2}}near(p.tx,p.ty,R2,o=>{if(o.side!==p.by.side&&!o.dead){const dd=Math.hypot(o.x-p.tx,o.y-p.ty);if(dd<R2)hurt(o,p.dmg*MUL[5][o.t]*(1-dd/R2*.5),p.by,true)}});
          b.fx.push({k:'ring',x:p.tx,y:p.ty,t:0,r:R2,c:2});b.shake=Math.max(b.shake||0,.12)}}}
    b.proj=b.proj.filter(p=>!p.done);
    for(const f of b.fx){f.t+=dt;if(f.k==='p'){f.x+=f.vx*dt;f.y+=f.vy*dt;f.vx*=.9;f.vy*=.9}}b.fx=b.fx.filter(f=>f.t<.6);
    if(b.shake)b.shake=Math.max(0,b.shake-dt)}
  function rally(b){if(!b||b.rally<=0)return false;b.rally--;const dur=(b.P.doc&&b.P.doc.banner)?9:6;for(const u of b.units)if(u.side===0&&!u.dead){u.mor=100;u.rout=0;u.buff=dur}
    b.fx.push({k:'rally',t:0});return true}
  function result(b){const a=b.units.filter(u=>!u.dead&&u.side===0&&!u.wag),e=b.units.filter(u=>!u.dead&&u.side===1);
    const val=arr=>arr.reduce((x,u)=>x+T[u.t].cost*(u.hp/u.max)*(u.rout?.5:1),0);
    const win=b.mwin!=null?b.mwin:e.length===0?true:a.length===0?false:val(a)>val(e);
    return{win,keep:a.reduce((x,u)=>x+T[u.t].cost,0)/Math.max(1,b.val[0]),kills:1-e.length/Math.max(1,b.start[1]),t:b.t,genAlive:a.some(u=>u.t===6)}}

  /* ---------- Placement ---------- */
  function inZone(x,y,t){const r=T[t].r;if(y<ZY+1||y>FH-2||x<2||x>FW-2)return false;for(const k of L.rocks)if(Math.hypot(x-k.x,y-k.y)<k.r+r+.2)return false;
    if(inWater(L,x,y))return false;return true}
  const freeAt=(x,y,t,arr=mine)=>arr.every(u=>(u.x-x)**2+(u.y-y)**2>=(T[u.t].r+T[t].r+.3)**2);
  function addUnit(x,y,t=tool,g=gid){if(!canUse(t))return false;if(used()+T[t].cost>budget())return false;if(t===6&&mine.some(u=>u.t===6))return false;
    if(!inZone(x,y,t)||!freeAt(x,y,t))return false;mine.push({t,x:Math.round(x*10)/10,y:Math.round(y*10)/10,o:order,g});return true}
  function validArmy(a){const out=[],keep=mine;mine=out;for(const u of a){if(used()+T[u.t].cost>budget()||!canUse(u.t))continue;if(inZone(u.x,u.y,u.t)&&freeAt(u.x,u.y,u.t)&&!(u.t===6&&out.some(v=>v.t===6)))out.push({...u})}mine=keep;
    gid=Math.max(1,...out.map(u=>u.g||0))+1;return out}
  function block(x,y){const sp=T[tool].r*2+.5,left=Math.floor((budget()-used())/T[tool].cost);let N=Math.min(left,tool===6?1:tool===5?4:[12,16,15][shape]);if(N<=0){say('Budget épuisé');return}
    const pts=[];if(shape===0){const cols=Math.ceil(N/2);for(let i=0;i<N;i++)pts.push([(i%cols-(cols-1)/2)*sp,Math.floor(i/cols)*sp])}
    else if(shape===1){const c=Math.ceil(Math.sqrt(N));for(let i=0;i<N;i++)pts.push([(i%c-(c-1)/2)*sp,Math.floor(i/c)*sp])}
    else{let i=0;for(let r=0;i<N;r++)for(let c=0;c<=r&&i<N;c++,i++)pts.push([(c-r/2)*sp,r*sp])}
    let k=0;for(const[dx,dy]of pts)if(addUnit(x+dx,y+dy))k++;if(!k)say('Pas de place ici');else gid++;snd(0);tools()}
  function cleanPlans(){for(const g in plans)if(!mine.some(u=>String(u.g)===String(g))||!plans[g].steps.length)delete plans[g]}
  function eraseAt(x,y){const n=mine.length;mine=mine.filter(u=>(u.x-x)**2+(u.y-y)**2>9);if(mine.length!==n)tools()}
  const toField=e=>{const r=cv.getBoundingClientRect();return[(e.clientX-r.left-ox)/sc,(e.clientY-r.top-oy)/sc]};
  cv.addEventListener('pointerdown',e=>{if(phase!=='place'||!ov.hidden)return;const[x,y]=toField(e);cv.setPointerCapture(e.pointerId);
    if(planMode){let best=null,bd=25;for(const u of mine){const d=(u.x-x)**2+(u.y-y)**2;if(d<bd){bd=d;best=u}}
      if(best&&String(best.g)!==String(selG)){selG=best.g;const n=mine.filter(u=>String(u.g)===String(selG)).length;say('Groupe choisi ('+n+' unité'+(n>1?'s':'')+') : touche la carte pour ajouter une étape');snd(0);tools();return}
      if(selG==null){say('Touche d’abord une de tes unités pour choisir son groupe');return}
      if(x<1||x>FW-1||y<1||y>FH-1||L.rocks.some(r=>Math.hypot(x-r.x,y-r.y)<r.r)){say('Pas d’étape ici');return}
      const pl=plans[selG]||(plans[selG]={steps:[],march:false});if(pl.steps.length>=8){say('8 étapes au maximum');return}pl.steps.push({k:'go',x:Math.round(x*10)/10,y:Math.round(y*10)/10});snd(0);tools();return}
    if(erase){painting=true;eraseAt(x,y);return}
    if(mode==='block'){block(x,y);return}
    painting=true;lastPaint=[x,y];if(addUnit(x,y)){snd(0);tools()}});
  cv.addEventListener('pointermove',e=>{if(!painting||phase!=='place')return;const[x,y]=toField(e);if(erase){eraseAt(x,y);return}
    const[lx,ly]=lastPaint,d=Math.hypot(x-lx,y-ly);if(d<1.2)return;const st=Math.ceil(d/1.2);let any=false;const sp=T[tool].r*2+.4;for(let i=1;i<=st;i++){const px=lx+(x-lx)*i/st,py=ly+(y-ly)*i/st;
      if(addUnit(px,py))any=true;else{for(const[ax,ay]of[[sp,0],[-sp,0],[0,sp],[0,-sp]])if(addUnit(px+ax,py+ay)){any=true;break}}}
    lastPaint=[x,y];if(any)tools()});
  const endPaint=()=>{if(painting&&!erase)gid++;painting=false};cv.addEventListener('pointerup',endPaint);cv.addEventListener('pointercancel',endPaint);

  /* ---------- Combat ---------- */
  function fight(){if(!mine.length){say('Place au moins une unité');return}cleanPlans();prog.army[cur]=mine.map(u=>({...u}));prog.lastArmy=prog.army[cur];prog.plans=prog.plans||{};prog.plans[cur]=JSON.parse(JSON.stringify(plans));prog.lastPlans=prog.plans[cur];saveProg();store.set('bb.save.bat',{n:cur,units:mine,plans});planMode=false;selG=null;
    cleanPlans();B=newBattle(L,L.enemy,mine,prog,plans);phase='fight';acc=0;intro=1.3;say('');tools();snd(2)}
  function endBattle(){phase='done';const r=result(B),n=cur;let gain=0,st=0,med=false;
    if(r.win){st=r.keep>=.6?3:r.keep>=.3?2:1;
      const d=L.defi;med=d==='keep'?r.keep>=.7:d==='nocav'?!mine.some(u=>u.t===3):d==='budget'?used()<=budget()*.8:d==='time'?r.t<=50:d==='general'?r.genAlive:false;
      if(L.daily){gain=prog.daily===dkey()?8:30;if(prog.daily!==dkey()){prog.daily=dkey();window._duel&&window._duel.report('batD',1,'inc')}}
      else{const old=prog.stars[n-1]||0;gain=6+st*4+Math.floor(n/2)+(st>old?(st-old)*3:0);if(st>old)prog.stars[n-1]=st;if(med&&!prog.med[n-1]){prog.med[n-1]=1;gain+=12}}
      prog.coins+=gain;saveProg();
      window._duel&&window._duel.report('batL',unlocked()-1,'hi');window._duel&&window._duel.report('batS',prog.stars.reduce((a,b)=>a+(b||0),0),'hi');
      store.set('bb.save.bat',null);Celebrate.run(st===3?'fireworks':'confetti','Victoire !',()=>showEnd(true,st,gain,r,med))}
    else{gain=2+Math.round(r.kills*6);prog.coins+=gain;saveProg();snd(3);setTimeout(()=>showEnd(false,0,gain,r,false),500)}
    tools()}
  function failWhy(){const m=L.mis||'rout';if(m==='defend'&&B.cap>=6)return 'le drapeau est tombé';if(m==='escort'){const w=B.units.find(u=>u.wag);if(!w||w.dead)return 'le chariot est détruit'}
    if(B.t>150)return 'temps écoulé';if(!B.units.some(u=>u.side===0&&!u.dead&&!u.wag))return 'ton armée est tombée';return 'l’ennemi a gardé l’avantage'}
  function tips(){const e=B.start[1],cnt=t=>L.enemy.filter(u=>u.t===t).length,my=t=>mine.filter(u=>u.t===t).length,N=mine.length||1,out=[];
    const m=L.mis;if(m==='hill')out.push('Garde un groupe sur la colline avec l’ordre 🛡️ Tenir ou l’outil 🗺️ Plan, et occupe l’ennemi ailleurs.');
    if(m==='defend')out.push('Reste groupé autour du drapeau : l’ennemi arrive en 3 vagues, garde des réserves pour les dernières.');
    if(m==='escort')out.push('Le chariot s’arrête dès qu’un ennemi le touche : dégage sa route avec des cavaliers et escorte-le de boucliers.');
    if(m==='general')out.push('Seul le général compte : envoie des cavaliers le chercher par un flanc avec l’outil 🗺️ Plan.');
    if(m==='cata')out.push('Les catapultes sont loin derrière : contourne la ligne ennemie avec des cavaliers.');
    if(m==='survive')out.push('Inutile de gagner : tiens 60 s. Boucliers et piquiers en ligne serrée, archers derrière.');
    if(L.env==='fort')out.push('Seule la porte s’ouvre : frappe-la au corps à corps ou avec des catapultes.');
    if(L.env==='night')out.push('De nuit, tes troupes ne voient pas loin : avance groupé pour ne pas être surpris.');
    if(L.enemy.some(u=>u.t===7))out.push('Le Géant écrase tout au corps à corps : harcèle-le avec archers et catapultes, et retiens-le avec des piquiers.');
    if(cnt(3)>=e*.15&&my(1)<N*.15)out.push('Beaucoup de cavaliers en face : place des piquiers devant.');
    if(cnt(2)>=e*.25&&!my(3)&&!my(4))out.push('Leurs archers te déciment : envoie des cavaliers par un flanc ou avance derrière des boucliers.');
    if(cnt(1)>=e*.3&&my(3)>=N*.3)out.push('Tes cavaliers s’empalent sur les piquiers : utilise soldats et archers contre eux.');
    if(B.fledN[0]>=B.start[0]*.15)out.push('Ton armée a fui : garde ton général près du front, ou utilise le Ralliement 📯 au bon moment.');
    if(!mine.some(u=>u.o>=2)&&!Object.keys(plans).length)out.push('Essaie l’outil 🗺️ Plan : envoie un groupe contourner l’ennemi, attends le bon moment, puis frappe de flanc ou de dos.');
    if(mine.every(u=>u.g===mine[0].g)&&mine.some(u=>u.t===3))out.push('Un groupe avance au pas de son unité la plus lente : place tes cavaliers à part pour qu’ils chargent vite.');
    return out.slice(0,3)}
  function showEnd(win,st,gain,r,med){lastEnd=[win,st,gain,r,med];const rows=[0,1,2,3,4,5,6,7].filter(t=>B.lost[0][t]||B.lost[1][t]||mine.some(u=>u.t===t)||L.enemy.some(u=>u.t===t));
    const rep=`<table class="bshop brep"><tr><td></td><td>Tes pertes</td><td>Ennemis tués</td></tr>${rows.map(t=>`<tr><td>${T[t].s} ${T[t].n}</td><td>${B.lost[0][t]}/${mine.filter(u=>u.t===t).length}</td><td>${B.kills[0][t]}/${L.enemy.filter(u=>u.t===t).length}</td></tr>`).join('')}</table>`;
    ov.innerHTML=`<div class="card bsum"><h2>${win?'Victoire !':'Défaite'}</h2>${win&&!L.daily?`<div class="bst">${'★'.repeat(st)}${'☆'.repeat(3-st)}${med?' 🎖':''}</div>`:''}
      <p class="tdet">${MIS[L.mis||'rout'][0]} ${MIS[L.mis||'rout'][1]}${L.env&&L.env!=='clear'?' · '+ENV[L.env][0]+' '+ENV[L.env][1]:''}${win?'':' — '+failWhy()}</p>
      <p>Armée conservée : ${Math.round(r.keep*100)} % · ${Math.round(r.t)} s${B.fledN[0]?' · '+B.fledN[0]+' en fuite':''}</p>${rep}
      ${win?(L.daily?'':`<p class="tdet">Défi 🎖 : ${DEFI[L.defi]} — ${med?'réussi !':prog.med[cur-1]?'déjà obtenu':'raté'}</p>`):tips().map(t=>`<p class="btip">💡 ${t}</p>`).join('')}
      <p class="bcoin">🪙 +${gain}</p>
      <div class="brow">${win&&!L.daily?`<button class="btn" id="bat-next">Niveau suivant</button>`:`<button class="btn" id="bat-retry">${win?'Rejouer':'Réessayer'}</button>`}<button class="btn alt" id="bat-up">Améliorations</button></div></div>`;
    ov.hidden=false;const nx=$('#bat-next');if(nx)nx.onclick=()=>startLevel(cur+1);const rt=$('#bat-retry');if(rt)rt.onclick=()=>startLevel(cur);$('#bat-up').onclick=shop;hud()}
  function shop(){const vetCost=l=>[15,30,55][l],budCost=l=>[25,50,90][l],U=unlocked();
    let h=`<div class="card bsum"><h2>Améliorations</h2><p class="bcoin">🪙 ${prog.coins}</p><table class="bshop"><tr><td colspan="3"><b>Vétérans</b> · +12 % de vie et de dégâts</td></tr>`;
    T.slice(0,7).forEach((t,i)=>{const l=prog.vet[i]||0,ok=U>=UNLOCK[i];if(!ok)return;h+=`<tr><td>${t.s} ${t.n}</td><td>${'●'.repeat(l)}${'○'.repeat(3-l)}</td><td>${l<3?`<button class="btn" data-v="${i}"${prog.coins<vetCost(l)?' disabled':''}>${vetCost(l)} 🪙</button>`:'max'}</td></tr>`});
    const bl=prog.bud||0;h+=`<tr><td colspan="3"><b>Armée</b></td></tr><tr><td>📯 Recrutement +10 %</td><td>${'●'.repeat(bl)}${'○'.repeat(3-bl)}</td><td>${bl<3?`<button class="btn" data-b="1"${prog.coins<budCost(bl)?' disabled':''}>${budCost(bl)} 🪙</button>`:'max'}</td></tr>`;
    h+=`<tr><td colspan="3"><b>Doctrines</b></td></tr>`+Object.entries(DOC).map(([k,[ic,nm,ds,c]])=>`<tr><td>${ic} ${nm}<small>${ds}</small></td><td>${prog.doc[k]?'✓':''}</td><td>${prog.doc[k]?'':`<button class="btn" data-d="${k}"${prog.coins<c?' disabled':''}>${c} 🪙</button>`}</td></tr>`).join('');
    h+=`</table><div class="brow"><button class="btn" id="bat-close">Fermer</button></div></div>`;
    ov.innerHTML=h;ov.hidden=false;
    ov.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{const i=+b.dataset.v,l=prog.vet[i]||0;if(prog.coins<vetCost(l))return;prog.coins-=vetCost(l);prog.vet[i]=l+1;saveProg();snd(1);shop()});
    const bb=ov.querySelector('[data-b]');if(bb)bb.onclick=()=>{const l=prog.bud||0;if(prog.coins<budCost(l))return;prog.coins-=budCost(l);prog.bud=l+1;saveProg();snd(1);shop()};
    ov.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>{const k=b.dataset.d,c=DOC[k][3];if(prog.coins<c)return;prog.coins-=c;prog.doc[k]=1;saveProg();snd(1);shop()});
    $('#bat-close').onclick=()=>{ov.hidden=true;if(phase==='done'&&lastEnd)showEnd(...lastEnd);tools()};hud()}

  /* ---------- Interface ---------- */
  function say(t){msgEl.textContent=t}
  function hud(){$('#bat-bud').textContent=L?used()+'/'+budget():'';$('#bat-coins').textContent=prog.coins}
  function fillSel(){const u=unlocked();let h=`<option value="D">📅 Défi du jour${prog.daily===dkey()?' ✓':''}</option>`;
    for(let n=Math.max(u,cur==='D'?1:cur);n>=1;n--)h+=`<option value="${n}">${n%10===0?'⬟':(()=>{const l=genLevel(n,n,false);return MIS[l.mis][0]+(l.env!=='clear'?ENV[l.env][0]:'')})()} Niveau ${n}${prog.stars[n-1]?' '+'★'.repeat(prog.stars[n-1]):''}${prog.med[n-1]?' 🎖':''}</option>`;lvlSel.innerHTML=h;lvlSel.value=String(cur)}
  function tools(){hud();let h='';
    if(phase==='place'&&planMode){const pl=selG!=null&&plans[selG],has=pl&&pl.steps.length,last=has&&pl.steps[pl.steps.length-1];
      h+=`<div class="brow"><button class="btn bt" data-w="1"${selG==null?' disabled':''}>⏳<small>Attendre ${last&&last.k==='wait'?last.s+5:5} s</small></button><button class="btn bt" data-h="1"${selG==null||last&&last.k==='hold'?' disabled':''}>🛡️<small>Tenir</small></button>
        <button class="btn bt${pl&&pl.march?' on':''}" data-mf="1"${selG==null?' disabled':''}>🏃<small>Marche forcée</small></button></div>
        <div class="brow"><button class="btn bt" data-u="1"${has?'':' disabled'}>↩️<small>Retirer</small></button><button class="btn bt" data-x="1"${has?'':' disabled'}>🧹<small>Effacer</small></button><button class="btn bfight" data-done="1">✅ Terminé</button></div>`}
    else if(phase==='place'){const vis=[0,1,2,3,4,5,6].filter(t=>canUse(t)||t===[0,1,2,3,4,5,6].find(x=>!canUse(x)));
      h+='<div class="brow">'+vis.map(i=>{const t=T[i],ok=canUse(i);return`<button class="btn bt${tool===i&&!erase?' on':''}" data-t="${i}"${ok?'':' disabled'}><b>${t.s}</b><small>${ok?t.n+' · '+t.cost:'niv. '+UNLOCK[i]}</small></button>`}).join('')+'</div>';
      h+=`<div class="brow"><button class="btn bt${mode==='brush'&&!erase?' on':''}" data-m="brush">✏️<small>Pinceau</small></button><button class="btn bt${mode==='block'&&!erase?' on':''}" data-m="block">▦<small>${SHAPES[shape]}</small></button>
        <button class="btn bt${erase?' on':''}" data-e="1">🧽<small>Gomme</small></button><button class="btn bt on2" data-o="1">${ORD[order][0]}<small>${ORD[order][1]}</small></button>
        <button class="btn bt" data-l="1"${prog.lastArmy?'':' disabled'}>↺<small>Dernière</small></button><button class="btn bt${planMode?' on':''}" data-p="1">🗺️<small>Plan</small></button><button class="btn bfight" data-f="1"${mine.length?'':' disabled'}>Combat !</button></div>`}
    else if(phase==='fight'){h+=`<div class="brow">${[1,2,3].map(s=>`<button class="btn bt${speed===s?' on':''}" data-s="${s}">×${s}</button>`).join('')}<button class="btn bt brally" data-r="1"${B&&B.rally>0?'':' disabled'}>📯<small>Ralliement${B&&B.rally>1?' ×'+B.rally:''}</small></button><button class="btn bt" data-q="1">🏳️<small>Abandonner</small></button></div>`}
    toolsEl.innerHTML=h;
    toolsEl.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{tool=+b.dataset.t;erase=false;say(T[tool].s+' '+T[tool].n+' : '+HELP[tool]);tools()});
    toolsEl.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{if(b.dataset.m==='block'&&mode==='block'&&!erase)shape=(shape+1)%3;mode=b.dataset.m;erase=false;tools()});
    const q=s=>toolsEl.querySelector(s);
    if(q('[data-e]'))q('[data-e]').onclick=()=>{erase=!erase;tools()};
    if(q('[data-o]'))q('[data-o]').onclick=()=>{order=(order+1)%5;say(['Les prochaines unités avanceront vers l’ennemi','Les prochaines unités tiendront leur position jusqu’à l’arrivée de l’ennemi','Les prochaines unités contourneront par la gauche avant d’attaquer','Les prochaines unités contourneront par la droite avant d’attaquer','Les prochaines unités attendront 15 secondes en réserve'][order]);tools()};
    if(q('[data-l]'))q('[data-l]').onclick=()=>{mine=validArmy(prog.lastArmy||[]);plans=JSON.parse(JSON.stringify(prog.lastPlans||{}));say(mine.length?'Dernière armée replacée (ce qui rentre dans le budget et le terrain)':'Rien à replacer ici');tools()};
    if(q('[data-p]'))q('[data-p]').onclick=()=>{planMode=true;erase=false;selG=null;say('Plan : touche une de tes unités pour choisir son groupe, puis la carte pour ses étapes');tools()};
    if(q('[data-done]'))q('[data-done]').onclick=()=>{planMode=false;selG=null;cleanPlans();say('Plans enregistrés : '+Object.keys(plans).length+' groupe'+(Object.keys(plans).length>1?'s':'')+' avec une mission');tools()};
    const cp=()=>plans[selG]||(plans[selG]={steps:[],march:false});
    if(q('[data-w]'))q('[data-w]').onclick=()=>{const pl=cp(),l=pl.steps[pl.steps.length-1];if(l&&l.k==='wait'){l.s=Math.min(60,l.s+5)}else if(pl.steps.length<8)pl.steps.push({k:'wait',s:5});tools()};
    if(q('[data-h]'))q('[data-h]').onclick=()=>{const pl=cp();if(pl.steps.length<8)pl.steps.push({k:'hold'});say('Le groupe tiendra cette position jusqu’à l’arrivée de l’ennemi, puis attaquera');tools()};
    if(q('[data-mf]'))q('[data-mf]').onclick=()=>{const pl=cp();pl.march=!pl.march;say(pl.march?'Marche forcée : le groupe ignore l’ennemi jusqu’à la fin de son chemin':'Le groupe se battra s’il croise l’ennemi en chemin');tools()};
    if(q('[data-u]'))q('[data-u]').onclick=()=>{const pl=cp();pl.steps.pop();tools()};
    if(q('[data-x]'))q('[data-x]').onclick=()=>{delete plans[selG];tools()};
    if(q('[data-f]'))q('[data-f]').onclick=fight;
    toolsEl.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{speed=+b.dataset.s;tools()});
    if(q('[data-r]'))q('[data-r]').onclick=()=>{if(rally(B)){snd(1);say('Ralliement ! Ton armée reprend courage');tools()}};
    if(q('[data-q]'))q('[data-q]').onclick=()=>{if(B){B.units.forEach(u=>{if(u.side===0&&!u.dead){u.dead=1;B.lost[0][u.t]++}})}}}

  /* ---------- Dessin ---------- */
  const X=x=>ox+x*sc,Y=y=>oy+y*sc;
  function shapeAt(c,t,x,y,s){c.beginPath();if(t===0||t===6)c.arc(x,y,s,0,7);else if(t===1)c.rect(x-s*.9,y-s*.9,s*1.8,s*1.8);else if(t===2){c.moveTo(x,y-s*1.15);c.lineTo(x+s,y+s*.75);c.lineTo(x-s,y+s*.75);c.closePath()}
    else if(t===3){c.moveTo(x,y-s*1.25);c.lineTo(x+s*1.05,y);c.lineTo(x,y+s*1.25);c.lineTo(x-s*1.05,y);c.closePath()}
    else if(t===4||t===7){for(let i=0;i<6;i++){const a=i*Math.PI/3+Math.PI/6;i?c.lineTo(x+Math.cos(a)*s,y+Math.sin(a)*s):c.moveTo(x+Math.cos(a)*s,y+Math.sin(a)*s)}c.closePath()}
    else{const w=s*.42;c.rect(x-s,y-w,s*2,w*2);c.rect(x-w,y-s,w*2,s*2)}c.fill();
    if(t===6){c.save();c.strokeStyle='#ffc54d';c.lineWidth=Math.max(1.2,s*.35);c.beginPath();c.arc(x,y,s*1.35,0,7);c.stroke();c.restore()}}
  function drawBg(){const c=document.createElement('canvas'),k=DPR();c.width=Math.round(W*k);c.height=Math.round(H*k);const g=c.getContext('2d');g.setTransform(k,0,0,k,0,0);
    let[ ,c1,c2]=WORLDS[L.w];if(L.env==='snow'){c1='#9fb0c0';c2='#b9c7d4'}else if(L.env==='desert'){c1='#6e5a36';c2='#7d6840'}g.fillStyle=c1;g.fillRect(X(0),Y(0),FW*sc,FH*sc);const R=rng(L.n*31+7);
    for(let i=0;i<260;i++){g.fillStyle=c2;g.globalAlpha=.35+R()*.4;g.beginPath();g.ellipse(X(R()*FW),Y(R()*FH),(1+R()*3)*sc,(.6+R()*1.6)*sc,R()*3,0,7);g.fill()}g.globalAlpha=1;
    for(const h of L.hills){for(let i=4;i>=1;i--){g.fillStyle=`rgba(210,200,150,${.05+.03*(4-i)})`;g.beginPath();g.ellipse(X(h.x),Y(h.y),h.rx*sc*i/4,h.ry*sc*i/4,0,0,7);g.fill()}
      g.strokeStyle='rgba(230,220,170,.18)';g.lineWidth=1;g.beginPath();g.ellipse(X(h.x),Y(h.y),h.rx*sc,h.ry*sc,0,0,7);g.stroke()}
    for(const w of L.water){g.fillStyle='#2f4a66';g.beginPath();g.ellipse(X(w.x),Y(w.y),w.rx*sc,w.ry*sc,0,0,7);g.fill();g.strokeStyle='rgba(160,205,245,.3)';g.lineWidth=2;g.stroke()}
    if(L.river){const rv=L.river;g.fillStyle='#2c5677';g.fillRect(X(0),Y(rv.y-rv.h),FW*sc,rv.h*2*sc);g.fillStyle='rgba(170,215,250,.18)';for(let i=0;i<30;i++)g.fillRect(X(R()*FW),Y(rv.y-rv.h+R()*rv.h*2),4*sc,.3*sc);
      for(const br of rv.br){g.fillStyle='#7a5a3a';g.fillRect(X(br.x-br.w/2),Y(rv.y-rv.h-1),br.w*sc,(rv.h*2+2)*sc);g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=1;for(let y=rv.y-rv.h-1;y<rv.y+rv.h+1;y+=1.2){g.beginPath();g.moveTo(X(br.x-br.w/2),Y(y));g.lineTo(X(br.x+br.w/2),Y(y));g.stroke()}}}
    for(const r of L.rocks){g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.arc(X(r.x+.5),Y(r.y+.7),r.r*sc,0,7);g.fill();g.fillStyle='#575c55';g.beginPath();g.arc(X(r.x),Y(r.y),r.r*sc,0,7);g.fill();g.fillStyle='rgba(255,255,255,.09)';g.beginPath();g.arc(X(r.x-r.r*.25),Y(r.y-r.r*.3),r.r*sc*.55,0,7);g.fill()}
    for(const f of L.forest){g.fillStyle='rgba(20,40,20,.35)';g.beginPath();g.arc(X(f.x),Y(f.y),f.r*sc,0,7);g.fill();for(const[x,y,r]of f.trees){g.fillStyle='#1f3d24';g.beginPath();g.arc(X(x),Y(y),r*sc,0,7);g.fill();g.fillStyle='#2e5a33';g.beginPath();g.arc(X(x-r*.25),Y(y-r*.3),r*sc*.6,0,7);g.fill()}}
    if(L.wall){const wl=L.wall;g.fillStyle='#6d6a66';g.fillRect(X(0),Y(wl.y-wl.h),FW*sc,wl.h*2*sc);g.fillStyle='#86827c';for(let x=0;x<FW;x+=3)g.fillRect(X(x),Y(wl.y-wl.h-.9),1.6*sc,.9*sc);
      g.strokeStyle='rgba(0,0,0,.3)';g.lineWidth=1;for(let x=0;x<FW;x+=2.4){g.beginPath();g.moveTo(X(x),Y(wl.y-wl.h));g.lineTo(X(x),Y(wl.y+wl.h));g.stroke()}}
    if(L.zone){const z=L.zone;g.fillStyle='rgba(255,210,120,.08)';g.beginPath();g.arc(X(z.x),Y(z.y),z.r*sc,0,7);g.fill()}
    bg=c}
  const COL=['#4aa8ff','#ff5d5d','#ffd27a'],COLD=['#1d4f80','#802a2a'];
  function drawMission(){const t=performance.now()/1000;
    if(L.zone){const z=L.zone,h=B?Math.min(1,B.hold/20):0;ctx.strokeStyle='rgba(255,210,120,.75)';ctx.lineWidth=2;ctx.setLineDash([6,5]);ctx.beginPath();ctx.arc(X(z.x),Y(z.y),z.r*sc,0,7);ctx.stroke();ctx.setLineDash([]);
      if(h>0){ctx.strokeStyle='#ffd27a';ctx.lineWidth=4;ctx.beginPath();ctx.arc(X(z.x),Y(z.y),z.r*sc+3,-Math.PI/2,-Math.PI/2+h*Math.PI*2);ctx.stroke()}ctx.font='16px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('⛰️',X(z.x),Y(z.y))}
    if(L.flag){const f=L.flag;ctx.strokeStyle='#ddd';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(X(f.x),Y(f.y+2));ctx.lineTo(X(f.x),Y(f.y-4));ctx.stroke();ctx.fillStyle=B&&B.cap>0?'#ff8a5d':'#4aa8ff';ctx.beginPath();ctx.moveTo(X(f.x),Y(f.y-4));ctx.lineTo(X(f.x+3.4+Math.sin(t*4)*.3),Y(f.y-3));ctx.lineTo(X(f.x),Y(f.y-2));ctx.fill();
      ctx.strokeStyle='rgba(74,168,255,.35)';ctx.setLineDash([3,4]);ctx.beginPath();ctx.arc(X(f.x),Y(f.y),6*sc,0,7);ctx.stroke();ctx.setLineDash([]);if(B&&B.cap>0){ctx.strokeStyle='#ff5d5d';ctx.lineWidth=3;ctx.beginPath();ctx.arc(X(f.x),Y(f.y),6*sc+2,-Math.PI/2,-Math.PI/2+B.cap/6*Math.PI*2);ctx.stroke()}}
    if(L.wagon){const w=B?B.units.find(u=>u.wag):null,x=w?w.x:L.wagon.x,y=w?w.y:L.wagon.y;if(!B||!w.dead){ctx.strokeStyle='rgba(255,210,120,.35)';ctx.setLineDash([4,6]);ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(X(x),Y(y));ctx.lineTo(X(L.wagon.x),Y(2));ctx.stroke();ctx.setLineDash([]);
        ctx.fillStyle='#8a5a2e';ctx.fillRect(X(x-2.2),Y(y-1.6),4.4*sc,3.2*sc);ctx.fillStyle='#ffd27a';ctx.fillRect(X(x-1.6),Y(y-1.2),3.2*sc,1.4*sc);ctx.fillStyle='#222';for(const dx of[-1.6,1.6])for(const dy of[-1.5,1.5]){ctx.beginPath();ctx.arc(X(x+dx),Y(y+dy),.55*sc,0,7);ctx.fill()}
        if(w){ctx.fillStyle='rgba(0,0,0,.5)';ctx.fillRect(X(x-3),Y(y-3.4),6*sc,.7*sc);ctx.fillStyle='#4fd67a';ctx.fillRect(X(x-3),Y(y-3.4),6*sc*Math.max(0,w.hp/w.max),.7*sc)}}
      ctx.font='14px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('🏁',X(L.wagon.x),Y(3))}
    if(L.wall){const wl=L.wall,gh=B?B.gate:wl.hp;if(gh>0){ctx.fillStyle='#7a5230';ctx.fillRect(X(wl.gx-wl.gw/2),Y(wl.y-wl.h-.3),wl.gw*sc,(wl.h*2+.6)*sc);ctx.strokeStyle='#3d2814';ctx.lineWidth=1;for(let x=wl.gx-wl.gw/2+1;x<wl.gx+wl.gw/2;x+=1.6){ctx.beginPath();ctx.moveTo(X(x),Y(wl.y-wl.h));ctx.lineTo(X(x),Y(wl.y+wl.h));ctx.stroke()}
        ctx.fillStyle='rgba(0,0,0,.5)';ctx.fillRect(X(wl.gx-4),Y(wl.y+wl.h+.8),8*sc,.7*sc);ctx.fillStyle='#ffb347';ctx.fillRect(X(wl.gx-4),Y(wl.y+wl.h+.8),8*sc*gh/wl.hp,.7*sc)}
      else{ctx.fillStyle='#3a3530';ctx.fillRect(X(wl.gx-wl.gw/2),Y(wl.y-wl.h),wl.gw*sc,wl.h*2*sc)}}}
  // météo et obscurité (au-dessus des unités)
  const fl=[...Array(70)].map((_,i)=>[Math.random()*100,Math.random()*150,.5+Math.random()]);let darkC=null;
  function drawEnv(fight){const e=L.env,t=performance.now()/1000;
    if(e==='snow'){ctx.fillStyle='rgba(255,255,255,.8)';for(const f of fl){const y=(f[1]+t*6*f[2])%FH,x=(f[0]+Math.sin(t+f[1])*2+100)%FW;ctx.beginPath();ctx.arc(X(x),Y(y),f[2]*1.4,0,7);ctx.fill()}}
    else if(e==='rain'){ctx.strokeStyle='rgba(180,210,255,.35)';ctx.lineWidth=1;ctx.beginPath();for(const f of fl){const y=(f[1]+t*70*f[2])%FH,x=(f[0]+y*.15)%FW;ctx.moveTo(X(x),Y(y));ctx.lineTo(X(x+.6),Y(y+3))}ctx.stroke()}
    else if(e==='desert'){ctx.fillStyle='rgba(255,200,120,'+(.05+.03*Math.sin(t*2))+')';ctx.fillRect(X(0),Y(0),FW*sc,FH*sc)}
    else if(e==='night'||e==='fog'){const k=DPR();if(!darkC||darkC.width!==cv.width||darkC.height!==cv.height){darkC=document.createElement('canvas');darkC.width=cv.width;darkC.height=cv.height}
      const g=darkC.getContext('2d');g.setTransform(k,0,0,k,0,0);g.globalCompositeOperation='source-over';g.clearRect(0,0,W,H);g.fillStyle=e==='night'?'rgba(5,8,20,.86)':'rgba(150,160,170,.7)';g.fillRect(X(0),Y(0),FW*sc,FH*sc);
      g.globalCompositeOperation='destination-out';const R=(e==='night'?20:30)*sc;g.fillStyle='rgba(0,0,0,.85)';g.beginPath();
      const pts=fight&&B?B.units.filter(u=>u.side===0&&!u.dead):mine;for(const u of pts){g.moveTo(X(u.x)+R,Y(u.y));g.arc(X(u.x),Y(u.y),R,0,7)}if(!fight){g.rect(X(0),Y(ZY),FW*sc,(FH-ZY)*sc)}g.fill();
      ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(darkC,0,0);ctx.restore()}}
  function misHud(){const m=L.mis||'rout';let txt='';
    if(m==='hill')txt='⛰️ '+Math.floor(B.hold)+' / 20 s';else if(m==='defend')txt='🚩 '+Math.max(0,Math.ceil(75-B.t))+' s';else if(m==='survive')txt='⏳ '+Math.max(0,Math.ceil(60-B.t))+' s';
    else if(m==='escort'){const w=B.units.find(u=>u.wag);txt='🛒 '+Math.round(Math.max(0,Math.min(1,(L.wagon.y-w.y)/(L.wagon.y-5)))*100)+' %'}
    else if(m==='general')txt='👑 '+(B.units.some(u=>u.side===1&&u.t===6&&!u.dead)?'en vie':'abattu');else if(m==='cata')txt='💥 '+B.units.filter(u=>u.side===1&&u.t===5&&!u.dead).length+' catapulte(s)';
    const nw=B.waves.find(w=>!w.done);if(nw)txt+=(txt?' · ':'')+'renforts dans '+Math.max(0,Math.ceil(nw.t-B.t))+' s';
    if(!txt)return;ctx.font='700 13px Fredoka, sans-serif';ctx.textAlign='center';ctx.textBaseline='top';const w=ctx.measureText(txt).width+14;ctx.fillStyle='rgba(10,12,20,.6)';ctx.fillRect(W/2-w/2,Y(0)+22,w,20);ctx.fillStyle='#ffd27a';ctx.fillText(txt,W/2,Y(0)+25)}
  function frame(dt){
    if(phase==='fight'&&B){if(intro>0)intro-=dt;else{acc+=Math.min(dt,.1)*speed;let n=0;while(acc>=STEP&&n++<12){acc-=STEP;simStep(B,L,STEP);if(B.over){endBattle();break}}}
      if(B.rally<=0&&toolsEl.querySelector('[data-r]:not([disabled])'))tools()}
    const k=DPR();ctx.setTransform(k,0,0,k,0,0);ctx.clearRect(0,0,W,H);if(!L)return;
    let sx=0,sy=0;if(B&&B.shake){sx=(Math.random()-.5)*6*B.shake/.15;sy=(Math.random()-.5)*6*B.shake/.15}ctx.translate(sx,sy);
    if(!bg)drawBg();ctx.drawImage(bg,0,0,W,H);
    if(phase==='place'){ctx.fillStyle='rgba(74,168,255,.08)';ctx.fillRect(X(0),Y(ZY),FW*sc,(FH-ZY)*sc);ctx.strokeStyle='rgba(74,168,255,.4)';ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(X(0),Y(ZY));ctx.lineTo(X(FW),Y(ZY));ctx.stroke();ctx.setLineDash([])}
    const s=Math.max(1.8,sc*1.05);
    drawMission();
    if(phase==='place'||!B){const ea=L.env==='night'?.12:L.env==='fog'?.3:1;ctx.globalAlpha=ea;for(const u of L.enemy){ctx.fillStyle='rgba(0,0,0,.3)';shapeAt(ctx,u.t,X(u.x)+1,Y(u.y)+1.5,s*T[u.t].r);ctx.fillStyle=COL[1];shapeAt(ctx,u.t,X(u.x),Y(u.y),s*T[u.t].r)}ctx.globalAlpha=1;
      for(const u of L.enemy)if(u.boss||(L.mis==='cata'&&u.t===5)){ctx.strokeStyle='#ffd27a';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(X(u.x),Y(u.y),s*T[u.t].r+3,0,7);ctx.stroke()}
      const OC=['#4aa8ff','#9fd0ff','#5fd6c2','#5fd6c2','#9a8cff'];
      for(const u of mine){ctx.fillStyle='rgba(0,0,0,.3)';shapeAt(ctx,u.t,X(u.x)+1,Y(u.y)+1.5,s*T[u.t].r);ctx.fillStyle=OC[u.o||0];shapeAt(ctx,u.t,X(u.x),Y(u.y),s*T[u.t].r)}
      // plans de mission
      for(const g in plans){const mem=mine.filter(u=>String(u.g)===String(g));const pl=plans[g];if(!mem.length||!pl.steps.length)continue;const sel=String(g)===String(selG);
        let px=mem.reduce((a,u)=>a+u.x,0)/mem.length,py=mem.reduce((a,u)=>a+u.y,0)/mem.length,n=0;ctx.strokeStyle=sel?'#ffc54d':'rgba(255,197,77,.55)';ctx.lineWidth=sel?2.5:2;ctx.setLineDash(pl.march?[]:[6,5]);
        const lab=(x,y,t)=>{ctx.font='700 11px Fredoka, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';const w=ctx.measureText(t).width+8;ctx.fillStyle='rgba(20,24,40,.85)';ctx.fillRect(X(x)-w/2,Y(y)-26,w,14);ctx.fillStyle='#ffc54d';ctx.fillText(t,X(x),Y(y)-19)};
        for(const st of pl.steps){if(st.k==='go'){n++;ctx.beginPath();ctx.moveTo(X(px),Y(py));ctx.lineTo(X(st.x),Y(st.y));ctx.stroke();const a=Math.atan2(st.y-py,st.x-px);ctx.save();ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(X(st.x),Y(st.y));ctx.lineTo(X(st.x)-Math.cos(a-.4)*9,Y(st.y)-Math.sin(a-.4)*9);ctx.moveTo(X(st.x),Y(st.y));ctx.lineTo(X(st.x)-Math.cos(a+.4)*9,Y(st.y)-Math.sin(a+.4)*9);ctx.stroke();
            ctx.fillStyle=sel?'#ffc54d':'rgba(255,197,77,.75)';ctx.beginPath();ctx.arc(X(st.x),Y(st.y),7,0,7);ctx.fill();ctx.fillStyle='#1a1300';ctx.font='700 10px Fredoka, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(n,X(st.x),Y(st.y)+.5);ctx.restore();px=st.x;py=st.y}
          else lab(px,py-(st.k==='hold'?0:0),st.k==='wait'?'⏳ '+st.s+' s':'🛡️')}ctx.setLineDash([])}
      if(planMode&&selG!=null)for(const u of mine)if(String(u.g)===String(selG)){ctx.strokeStyle='#ffc54d';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(X(u.x),Y(u.y),s*T[u.t].r+3,0,7);ctx.stroke()}
      // flèches d'ordres : une par groupe
      const gs={};for(const u of mine)if(u.o>=2)(gs[u.g]||(gs[u.g]=[])).push(u);ctx.strokeStyle='rgba(95,214,194,.7)';ctx.lineWidth=2;ctx.setLineDash([4,4]);
      for(const g in gs){const a=gs[g],cx=a.reduce((x,u)=>x+u.x,0)/a.length,cy=a.reduce((x,u)=>x+u.y,0)/a.length,side=a[0].o===2?6:FW-6;ctx.beginPath();ctx.moveTo(X(cx),Y(cy));ctx.lineTo(X(side),Y(80));ctx.lineTo(X(side),Y(EZ-4));ctx.stroke()}ctx.setLineDash([]);
      drawEnv(false);
      // composition ennemie
      const cnt={};for(const u of L.enemy)cnt[u.t]=(cnt[u.t]||0)+1;ctx.font='700 12px Fredoka, sans-serif';ctx.textAlign='left';ctx.textBaseline='top';ctx.fillStyle='rgba(10,12,20,.55)';
      for(const w of L.waves||[])for(const u of w.list)cnt[u.t]=(cnt[u.t]||0)+1;const txt=Object.keys(cnt).map(t=>T[t].s+' '+cnt[t]).join('   ')+(L.waves?'  (en 3 vagues)':'');ctx.fillRect(X(0),Y(0),FW*sc,18);ctx.fillStyle='#ffb3b3';ctx.fillText((I18N.lang==='en'?'Enemy: ':'Ennemi : ')+txt,X(2),Y(0)+3)}
    else{for(const u of B.units){if(u.wag)continue;if(u.dead){if(u.fade<1.2&&!u.fled){ctx.globalAlpha=.4*(1-u.fade/1.2);ctx.fillStyle=COLD[u.side];shapeAt(ctx,u.t,X(u.x),Y(u.y),s*T[u.t].r*.9);ctx.globalAlpha=1}continue}
        ctx.fillStyle='rgba(0,0,0,.3)';shapeAt(ctx,u.t,X(u.x)+1,Y(u.y)+1.5,s*T[u.t].r);
        if(u.rout)ctx.globalAlpha=.45+.3*Math.sin(B.t*20);ctx.fillStyle=u.flash>0?'#fff':u.buff>0&&u.side===0?'#8fe3ff':COL[u.side];shapeAt(ctx,u.t,X(u.x),Y(u.y),s*T[u.t].r);ctx.globalAlpha=1;
        if(u.t===3&&u.mv>1){ctx.strokeStyle='rgba(255,255,255,.25)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(X(u.x),Y(u.y));ctx.lineTo(X(u.x-u.fx*3),Y(u.y-u.fy*3));ctx.stroke()}
        if(u.side===1&&((L.mis==='general'&&u.t===6)||(L.mis==='cata'&&u.t===5))){ctx.strokeStyle='#ffd27a';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(X(u.x),Y(u.y),s*T[u.t].r+3,0,7);ctx.stroke()}
        if(u.t===7){ctx.fillStyle='rgba(0,0,0,.5)';ctx.fillRect(X(u.x-3),Y(u.y-4.6),6*sc,.8*sc);ctx.fillStyle='#ff5d5d';ctx.fillRect(X(u.x-3),Y(u.y-4.6),6*sc*Math.max(0,u.hp/u.max),.8*sc)}}
      ctx.strokeStyle='rgba(255,240,200,.85)';ctx.lineWidth=1;for(const p of B.proj){if(p.k==='arrow'){const g=p.tg,dx=g.x-p.x,dy=g.y-p.y,d=Math.hypot(dx,dy)||1;ctx.beginPath();ctx.moveTo(X(p.x),Y(p.y));ctx.lineTo(X(p.x+dx/d*1.8),Y(p.y+dy/d*1.8));ctx.stroke()}
        else{ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.arc(X(p.x),Y(p.y),sc*.7,0,7);ctx.fill();ctx.fillStyle='#d9cdb8';ctx.beginPath();ctx.arc(X(p.x),Y(p.y-p.h),sc*.8,0,7);ctx.fill()}}
      for(const f of B.fx){if(f.k==='p'){ctx.globalAlpha=1-f.t/.6;ctx.fillStyle=f.c?'#c94a4a':'#3f7fc0';ctx.fillRect(X(f.x),Y(f.y),2,2)}
        else if(f.k==='ring'){ctx.globalAlpha=1-f.t/.6;ctx.strokeStyle=f.c===2?'#ffd27a':COL[f.c];ctx.lineWidth=2;ctx.beginPath();ctx.arc(X(f.x),Y(f.y),f.r*sc*(.5+f.t),0,7);ctx.stroke()}
        else if(f.k==='rally'){ctx.globalAlpha=Math.max(0,.35-f.t*.6);ctx.fillStyle='#8fe3ff';ctx.fillRect(X(0),Y(0),FW*sc,FH*sc)}}ctx.globalAlpha=1;
      drawEnv(true);misHud();
      const al=[0,1].map(sd=>B.units.filter(u=>!u.dead&&u.side===sd&&!u.wag).length);ctx.font='700 13px Fredoka, sans-serif';ctx.textBaseline='top';ctx.textAlign='left';ctx.fillStyle=COL[0];ctx.fillText('● '+al[0],X(2),Y(FH)-18);ctx.textAlign='right';ctx.fillStyle=COL[1];ctx.fillText(al[1]+' ●',X(FW-2),Y(0)+4);
      if(intro>0){ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='700 '+Math.round(W*.09)+'px Fredoka, sans-serif';ctx.fillStyle='rgba(255,255,255,'+Math.min(1,intro*1.5)+')';ctx.fillText(I18N.lang==='en'?'Charge!':'À l’attaque !',W/2,H*.45)}}
    ctx.setTransform(k,0,0,k,0,0)}
  function resize(){const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;W=w;H=h;sc=Math.min(w/FW,h/FH);ox=(w-FW*sc)/2;oy=(h-FH*sc)/2;bg=null;
    cv.style.width=W+'px';cv.style.height=H+'px';cv.width=Math.round(W*DPR());cv.height=Math.round(H*DPR())}
  new ResizeObserver(resize).observe(stage);
  let AC=null;
  function snd(k){if(store.get('bb.mute',false))return;try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();const t0=AC.currentTime;
    const notes=k===0?[[520,0]]:k===1?[[660,0],[880,.07]]:k===2?[[220,0],[330,.1],[440,.2]]:[[260,0],[180,.18]];
    notes.forEach(([f,d])=>{const o=AC.createOscillator(),v=AC.createGain(),s=t0+d;o.type=k===2?'sawtooth':'triangle';o.frequency.value=f;v.gain.setValueAtTime(.0001,s);v.gain.exponentialRampToValueAtTime(k===0?.03:.07,s+.01);v.gain.exponentialRampToValueAtTime(.0001,s+.18);o.connect(v).connect(AC.destination);o.start(s);o.stop(s+.22)})}catch(e){}}
  lvlSel.onchange=()=>{const v=lvlSel.value;lvlSel.blur();startLevel(v==='D'?'D':+v)};
  $('#bat-shop').onclick=()=>{if(phase==='fight')return;shop()};
  $('#bat-clear').onclick=()=>{if(phase!=='place')return;if(!mine.length)return;Celebrate.ask('Tout effacer ?','Ton armée et ses plans seront retirés du terrain.','Effacer','Annuler',()=>{mine=[];plans={};selG=null;tools()},null)};
  function save(){if(phase!=='place'||!mine.length)return null;return{n:cur,units:mine,plans}}
  function load(o){if(!(o.n==='D'||o.n>=1&&o.n<=unlocked())||!Array.isArray(o.units))return;startLevel(o.n,true);mine=validArmy(o.units);plans=o.plans||{};tools()}
  startLevel(cur);
  return{frame,resize,save,load,pause(){},resume(){},sub:()=>'Niveau '+unlocked()+' · ★ '+prog.stars.reduce((a,b)=>a+(b||0),0)+(prog.daily===dkey()?' · défi ✓':'')}
})();
