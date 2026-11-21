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
  const ENEMY_K={1:0.871,2:0.951,3:0.791,4:0.845,5:1.084,6:0.924,7:0.924,8:0.738,9:0.871,10:0.898,11:1.137,12:0.765,13:0.871,14:0.659,15:0.818,16:0.951,17:0.924,18:1.349,19:0.845,20:0.632,21:1.057,22:0.765,23:0.845,24:1.004,25:1.004,26:1.349,27:0.818,28:1.004,29:0.924,30:0.765,31:1.296,32:0.632,33:0.977,34:0.738,35:0.924,36:1.057,37:0.499,38:1.376,39:0.712,40:1.482};
  const DOC={drums:['🥁','Tambours','Les pertes de moral sont réduites d’un tiers',60],lances:['🐎','Lances de charge','La charge des cavaliers fait ×2,6 au lieu de ×2',50],
    fire:['🔥','Flèches enflammées','Archers +20 % de dégâts',70],tortue:['🐢','Tortue','Les boucliers protègent plus loin et mieux',60],
    eng:['⚙️','Ingénieurs','Les catapultes tirent 25 % plus vite',70],banner:['🚩','Étendard','Aura du général +50 %, ralliement plus long',80],second:['📯','Second ralliement','Deux ralliements par bataille',120]};
  const SHAPES=['Ligne','Carré','Coin'];
  const rng=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
  const dayNum=()=>{const d=new Date();return Math.floor((Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())-Date.UTC(2026,0,1))/864e5)};
  const dkey=()=>{const d=new Date();return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()};
  let prog=store.get('bb.batProg',null);
  const fresh=()=>({stars:[],coins:0,vet:[0,0,0,0,0,0,0],bud:0,doc:{},med:[],army:{},daily:''});
  if(!prog||!Array.isArray(prog.stars))prog=fresh();prog={...fresh(),...prog};while(prog.vet.length<7)prog.vet.push(0);
  const saveProg=()=>store.set('bb.batProg',prog);
  const unlocked=()=>{let n=1;while(prog.stars[n-1])n++;return n};
  let cur=store.get('bb.batSel',1);if(cur!=='D')cur=Math.min(+cur||1,unlocked());
  let L,mine=[],phase='place',tool=0,mode='brush',shape=0,erase=false,order=0,speed=1,B=null,W=300,H=300,sc=2,ox=0,oy=0,acc=0,painting=false,lastPaint=null,gid=1,bg=null,shake=0,intro=0,lastEnd=null;

  /* ---------- Niveaux ---------- */
  function genLevel(seed,eq,daily){const R=rng(seed*7919+13),ri=k=>Math.floor(R()*k);
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
    // armée ennemie
    const k=ENEMY_K[eq]||(1+Math.min(.3,(eq-40)*.01));let bud=Math.round(PLAYER_BUDGET(eq)*k*(daily?1.05:1));
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
    // défi du niveau
    const D=['keep','nocav','budget','time','general'];let d=D[seed%5];if(d==='nocav'&&eq<UNLOCK[3]+1)d='budget';if(d==='general'&&eq<UNLOCK[6]+1)d='time';if(boss)d='keep';L.defi=d;
    return L}
  const DEFI={keep:'Gagner en gardant 70 % de ton armée',nocav:'Gagner sans cavaliers',budget:'Gagner en utilisant au plus 80 % du budget',time:'Gagner en moins de 50 secondes de combat',general:'Gagner avec ton général encore en vie'};
  function levelFor(n){if(n==='D'){const dn=dayNum();return genLevel(100000+dn,14+dn%22,true)}return genLevel(n,n,false)}
  function startLevel(n,keep){cur=n;store.set('bb.batSel',n);L=levelFor(n);phase='place';B=null;ov.hidden=true;erase=false;painting=false;
    if(!keep){const a=prog.army[n];mine=a?validArmy(a):[]}
    bg=null;const nt=[0,1,2,3,4,5,6].find(t=>UNLOCK[t]===n);
    if(nt!=null&&nt>0)say('Nouvelle unité : '+T[nt].n+' '+T[nt].s+' · '+HELP[nt]);
    else if(L.boss)say('Niveau de boss : un Géant ⬟ mène l’armée ennemie !');
    else if(L.daily)say('Défi du jour · '+(prog.daily===dkey()?'déjà gagné aujourd’hui':'récompense : 30 pièces'));
    else say('Défi 🎖 : '+DEFI[L.defi]);
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
  function newBattle(lv,enemy,mineList,P){P=P||{vet:[0,0,0,0,0,0,0],doc:{}};const units=[...makeArmy(mineList,0,P),...makeArmy(enemy,1,null)];
    // vitesse de groupe : un groupe marche au pas de son unité la plus lente
    const gs={};for(const u of units){const k=u.side+':'+u.g;gs[k]=Math.min(gs[k]??99,T[u.t].spd)}for(const u of units)u.gs=u.g?gs[u.side+':'+u.g]:T[u.t].spd;
    return{units,proj:[],fx:[],t:0,over:0,P,rally:P.doc&&P.doc.second?2:1,rallyT:0,start:[mineList.length,enemy.length],val:[used(mineList),used(enemy)],
      kills:[new Array(8).fill(0),new Array(8).fill(0)],lost:[new Array(8).fill(0),new Array(8).fill(0)],fledN:[0,0]}}
  const CS=4,GX=Math.ceil(FW/CS)+1,GY=Math.ceil(FH/CS)+1;
  function simStep(b,lv,dt){b.t+=dt;const U=b.units,grid=new Array(GX*GY),P=b.P,doc=P.doc||{};
    for(const u of U){if(u.dead)continue;const k=Math.max(0,Math.min(GX-1,u.x/CS|0))+Math.max(0,Math.min(GY-1,u.y/CS|0))*GX;(grid[k]||(grid[k]=[])).push(u)}
    const near=(x,y,rad,f)=>{const x0=Math.max(0,(x-rad)/CS|0),x1=Math.min(GX-1,(x+rad)/CS|0),y0=Math.max(0,(y-rad)/CS|0),y1=Math.min(GY-1,(y+rad)/CS|0);
      for(let gy=y0;gy<=y1;gy++)for(let gx=x0;gx<=x1;gx++){const c=grid[gx+gy*GX];if(c)for(const o of c)f(o)}};
    const alive=[[],[]];for(const u of U)if(!u.dead)alive[u.side].push(u);
    if(!alive[0].length||!alive[1].length||b.t>150){b.over=1;return}
    const gens=[alive[0].filter(u=>u.t===6),alive[1].filter(u=>u.t===6)];
    const auraR=s=>T[6].aura*(s===0&&doc.banner?1.5:1);
    const nearGen=u=>gens[u.side].some(g=>(g.x-u.x)**2+(g.y-u.y)**2<auraR(u.side)**2);
    const morLoss=(u,v)=>{u.mor-=v*(u.side===0&&doc.drums?.65:1)};
    function kill(u,by){if(u.dead)return;u.dead=1;b.lost[u.side][u.t]++;if(by)b.kills[by.side][u.t]++;
      for(let i=0;i<3;i++)b.fx.push({k:'p',x:u.x,y:u.y,vx:(Math.random()-.5)*14,vy:(Math.random()-.5)*14,t:0,c:u.side});
      const rad=u.t===6?25:8,loss=u.t===6?30:u.t===7?20:6;near(u.x,u.y,rad,o=>{if(o.side===u.side&&!o.dead)morLoss(o,loss)});
      if(u.t===7||u.t===6)b.fx.push({k:'ring',x:u.x,y:u.y,t:0,r:8,c:u.side})}
    function hurt(g,dm,by,ranged){if(g.dead)return;if(ranged){if(inTerrain(lv.forest,g.x,g.y))dm*=.5;if(by.t===2){if(g.t===4)dm*=1;else{let prot=false;const pr=g.side===0&&doc.tortue?5:3.5;near(g.x,g.y,pr,o=>{if(!prot&&o.t===4&&o.side===g.side&&!o.dead&&o!==g&&(o.x-g.x)**2+(o.y-g.y)**2<pr*pr)prot=true});if(prot)dm*=g.side===0&&doc.tortue?.45:.6}}}
      if(g.rout)dm*=1.4;if(onHill(lv,g.x,g.y)&&!ranged&&!onHill(lv,by.x,by.y))dm*=.85;
      g.hp-=dm;g.flash=.1;b.lastHit=b.t;if(g.hp<=0)kill(g,by)}
    for(const u of U){if(u.dead){u.fade+=dt;continue}const ty=T[u.t];u.flash=Math.max(0,u.flash-dt);u.cd-=dt;u.rt-=dt;u.buff=Math.max(0,u.buff-dt);
      // moral
      const ng=nearGen(u);if(u.hp<u.max*.35)morLoss(u,dt*2);u.mor=Math.min(100,u.mor+dt*(ng?7:2));
      if(u.t===7||u.t===6)u.mor=100;
      if(!u.rout&&u.mor<20){u.rout=1;u.tg=null}
      if(u.rout){let close=false;near(u.x,u.y,8,o=>{if(o.side!==u.side&&!o.dead)close=true});if(!close)u.mor+=dt*10;if(u.mor>=45){u.rout=0}
        else{const ey=u.side===0?FH-.5:.5;u.y+=(ey>u.y?1:-1)*ty.spd*1.1*dt;u.fx=0;u.fy=ey>u.y?1:-1;if(Math.abs(u.y-ey)<1.5){u.dead=1;u.fled=1;b.fledN[u.side]++;b.lost[u.side][u.t]++}continue}}
      // cible
      if(!u.tg||u.tg.dead||u.rt<=0){u.rt=.35+Math.random()*.2;let best=null,bd=1e9;const minr=ty.min||0;
        near(u.x,u.y,u.t===5?44:18,o=>{if(o.side!==u.side&&!o.dead){const d=(o.x-u.x)**2+(o.y-u.y)**2;if(d<bd&&d>=minr*minr){bd=d;best=o}}});
        if(!best)for(const o of alive[1-u.side]){const d=(o.x-u.x)**2+(o.y-u.y)**2;if(d<bd){bd=d;best=o}}
        u.tg=best}
      const g=u.tg;if(!g)continue;let dx=g.x-u.x,dy=g.y-u.y,d=Math.hypot(dx,dy)||.01;
      // ordres
      if(u.ord===1&&(d<22||b.t>30||(b.lastHit!=null&&b.t-b.lastHit>6)))u.ord=0;
      if(u.ord===4&&(b.t>15||(b.lastHit!=null&&b.t-b.lastHit>6)||alive[u.side].length<b.start[u.side]*.6||d<16))u.ord=0;
      if((u.ord===2||u.ord===3)&&d<12)u.ord=0;
      const range=ty.rng*(onHill(lv,u.x,u.y)?1.3:1),meleeR=ty.r+T[g.t].r+.6;
      const k=(ng?1.2:1)*(u.buff>0?1.25:1)*u.dk;
      if(ty.rng&&d<=range&&d>meleeR){u.mv=0;if(u.cd<=0){u.cd=ty.cd*(u.t===5&&u.side===0&&doc.eng?.75:1)*(.9+Math.random()*.2);
          let dm=ty.dmg*k*(u.t===2&&u.side===0&&doc.fire?1.2:1);
          if(u.t===5)b.proj.push({k:'stone',x:u.x,y:u.y,sx:u.x,sy:u.y,tx:g.x+(Math.random()-.5)*3,ty:g.y+(Math.random()-.5)*3,t:0,dur:Math.max(.6,d/30),dmg:dm,by:u});
          else b.proj.push({k:'arrow',x:u.x,y:u.y,tg:g,dmg:dm*MUL[2][g.t],by:u})}
        u.fx=dx/d;u.fy=dy/d;continue}
      if(d<=meleeR){if(u.cd<=0){u.cd=ty.cd*(.85+Math.random()*.3);let dm=(ty.rng?.5:ty.dmg)*MUL[u.t][g.t]*k;
          if(u.t===3&&u.mv>1)dm*=u.side===0&&doc.lances?2.6:2;u.mv=0;
          // flanc et dos
          const ax=(u.x-g.x)/d,ay=(u.y-g.y)/d,dot=ax*g.fx+ay*g.fy;if(dot<-.5){dm*=1.5;morLoss(g,3)}else if(dot<.3)dm*=1.2;
          if(g.t===1&&u.t===3)u.hp-=1.5;
          if(ty.splash){near(g.x,g.y,ty.splash,o=>{if(o.side!==u.side&&!o.dead&&o!==g&&(o.x-g.x)**2+(o.y-g.y)**2<ty.splash**2)hurt(o,dm*.6,u,false)});b.fx.push({k:'ring',x:g.x,y:g.y,t:0,r:ty.splash,c:u.side});b.shake=Math.max(b.shake||0,.15)}
          hurt(g,dm,u,false)}
        u.fx=-(u.x-g.x)/d;u.fy=-(u.y-g.y)/d;if(u.hp<=0)kill(u,g);continue}
      if(u.ord===1||u.ord===4)continue;
      // destination : cible, point de contournement ou pont
      let tx=g.x,ty2=g.y;
      if(u.ord===2||u.ord===3){const sx=(u.ord===2)!==(u.side===1)?6:FW-6,path=u.side===0?[[sx,80],[sx,EZ-8]]:[[sx,70],[sx,ZY+8]];
        if(u.wp<2){[tx,ty2]=path[u.wp];if(Math.hypot(tx-u.x,ty2-u.y)<4)u.wp++}else u.ord=0}
      if(lv.river){const ry=lv.river.y,side=Math.sign(u.y-ry),dest=Math.sign(ty2-ry);if(side&&dest&&side!==dest){const onBr=lv.river.br.some(br=>Math.abs(u.x-br.x)<br.w/2-1);
          if(!onBr){let bb=lv.river.br[0];for(const br of lv.river.br)if(Math.abs(br.x-u.x)+Math.abs(br.x-tx)<Math.abs(bb.x-u.x)+Math.abs(bb.x-tx))bb=br;tx=bb.x;ty2=ry}}}
      dx=tx-u.x;dy=ty2-u.y;d=Math.hypot(dx,dy)||.01;
      let sp=(Math.hypot(g.x-u.x,g.y-u.y)>14?u.gs:ty.spd)*(u.buff>0?1.25:1);if(inWater(lv,u.x,u.y))sp*=.45;if(inTerrain(lv.forest,u.x,u.y))sp*=.75;
      u.x+=dx/d*sp*dt;u.y+=dy/d*sp*dt;u.fx=dx/d;u.fy=dy/d;u.mv+=dt}
    // séparation, obstacles, rivière
    for(const u of U){if(u.dead)continue;const ru=T[u.t].r;
      near(u.x,u.y,3+ru,o=>{if(o===u||o.dead)return;const dx=u.x-o.x,dy=u.y-o.y,d2=dx*dx+dy*dy,m=ru+T[o.t].r;if(d2<m*m&&d2>1e-6){const d=Math.sqrt(d2),w=T[o.t].r>2?.9:.5,p=(m-d)*w;u.x+=dx/d*p;u.y+=dy/d*p}});
      for(const r of lv.rocks){const dx=u.x-r.x,dy=u.y-r.y,d=Math.hypot(dx,dy),m=r.r+ru;if(d<m&&d>1e-6){u.x+=dx/d*(m-d);u.y+=dy/d*(m-d);
          if(u.tg){const tx=-dy/d,tyy=dx/d,s=Math.sign((u.tg.x-u.x)*tx+(u.tg.y-u.y)*tyy)||1;u.x+=tx*s*T[u.t].spd*dt*.8;u.y+=tyy*s*T[u.t].spd*dt*.8}}}
      if(lv.river){const rv=lv.river;if(Math.abs(u.y-rv.y)<rv.h+ru&&!rv.br.some(br=>Math.abs(u.x-br.x)<br.w/2-ru*.5)){u.y=rv.y+(u.y>=rv.y?1:-1)*(rv.h+ru)}}
      u.x=Math.max(1,Math.min(FW-1,u.x));u.y=Math.max(.6,Math.min(FH-.6,u.y))}
    for(const p of b.proj){if(p.done)continue;
      if(p.k==='arrow'){const g=p.tg,dx=g.x-p.x,dy=g.y-p.y,d=Math.hypot(dx,dy),s=48*dt;if(d<=s){p.done=1;hurt(g,p.dmg,p.by,true)}else{p.x+=dx/d*s;p.y+=dy/d*s}}
      else{p.t+=dt;const u=Math.min(1,p.t/p.dur);p.x=p.sx+(p.tx-p.sx)*u;p.y=p.sy+(p.ty-p.sy)*u;p.h=Math.sin(u*Math.PI)*Math.min(14,p.dur*9);
        if(u>=1){p.done=1;const R2=T[5].splash;near(p.tx,p.ty,R2,o=>{if(o.side!==p.by.side&&!o.dead){const dd=Math.hypot(o.x-p.tx,o.y-p.ty);if(dd<R2)hurt(o,p.dmg*MUL[5][o.t]*(1-dd/R2*.5),p.by,true)}});
          b.fx.push({k:'ring',x:p.tx,y:p.ty,t:0,r:R2,c:2});b.shake=Math.max(b.shake||0,.12)}}}
    b.proj=b.proj.filter(p=>!p.done);
    for(const f of b.fx){f.t+=dt;if(f.k==='p'){f.x+=f.vx*dt;f.y+=f.vy*dt;f.vx*=.9;f.vy*=.9}}b.fx=b.fx.filter(f=>f.t<.6);
    if(b.shake)b.shake=Math.max(0,b.shake-dt)}
  function rally(b){if(!b||b.rally<=0)return false;b.rally--;const dur=(b.P.doc&&b.P.doc.banner)?9:6;for(const u of b.units)if(u.side===0&&!u.dead){u.mor=100;u.rout=0;u.buff=dur}
    b.fx.push({k:'rally',t:0});return true}
  function result(b){const a=b.units.filter(u=>!u.dead&&u.side===0),e=b.units.filter(u=>!u.dead&&u.side===1);
    const val=arr=>arr.reduce((x,u)=>x+T[u.t].cost*(u.hp/u.max)*(u.rout?.5:1),0);
    const win=e.length===0?true:a.length===0?false:val(a)>val(e);
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
  function eraseAt(x,y){const n=mine.length;mine=mine.filter(u=>(u.x-x)**2+(u.y-y)**2>9);if(mine.length!==n)tools()}
  const toField=e=>{const r=cv.getBoundingClientRect();return[(e.clientX-r.left-ox)/sc,(e.clientY-r.top-oy)/sc]};
  cv.addEventListener('pointerdown',e=>{if(phase!=='place'||!ov.hidden)return;const[x,y]=toField(e);cv.setPointerCapture(e.pointerId);
    if(erase){painting=true;eraseAt(x,y);return}
    if(mode==='block'){block(x,y);return}
    painting=true;lastPaint=[x,y];if(addUnit(x,y)){snd(0);tools()}});
  cv.addEventListener('pointermove',e=>{if(!painting||phase!=='place')return;const[x,y]=toField(e);if(erase){eraseAt(x,y);return}
    const[lx,ly]=lastPaint,d=Math.hypot(x-lx,y-ly);if(d<1.2)return;const st=Math.ceil(d/1.2);let any=false;const sp=T[tool].r*2+.4;for(let i=1;i<=st;i++){const px=lx+(x-lx)*i/st,py=ly+(y-ly)*i/st;
      if(addUnit(px,py))any=true;else{for(const[ax,ay]of[[sp,0],[-sp,0],[0,sp],[0,-sp]])if(addUnit(px+ax,py+ay)){any=true;break}}}
    lastPaint=[x,y];if(any)tools()});
  const endPaint=()=>{if(painting&&!erase)gid++;painting=false};cv.addEventListener('pointerup',endPaint);cv.addEventListener('pointercancel',endPaint);

  /* ---------- Combat ---------- */
  function fight(){if(!mine.length){say('Place au moins une unité');return}prog.army[cur]=mine.map(u=>({...u}));prog.lastArmy=prog.army[cur];saveProg();store.set('bb.save.bat',{n:cur,units:mine});
    B=newBattle(L,L.enemy,mine,prog);phase='fight';acc=0;intro=1.3;say('');tools();snd(2)}
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
  function tips(){const e=B.start[1],cnt=t=>L.enemy.filter(u=>u.t===t).length,my=t=>mine.filter(u=>u.t===t).length,N=mine.length||1,out=[];
    if(L.enemy.some(u=>u.t===7))out.push('Le Géant écrase tout au corps à corps : harcèle-le avec archers et catapultes, et retiens-le avec des piquiers.');
    if(cnt(3)>=e*.15&&my(1)<N*.15)out.push('Beaucoup de cavaliers en face : place des piquiers devant.');
    if(cnt(2)>=e*.25&&!my(3)&&!my(4))out.push('Leurs archers te déciment : envoie des cavaliers par un flanc ou avance derrière des boucliers.');
    if(cnt(1)>=e*.3&&my(3)>=N*.3)out.push('Tes cavaliers s’empalent sur les piquiers : utilise soldats et archers contre eux.');
    if(B.fledN[0]>=B.start[0]*.15)out.push('Ton armée a fui : garde ton général près du front, ou utilise le Ralliement 📯 au bon moment.');
    if(!mine.some(u=>u.o>=2))out.push('Essaie de prendre l’ennemi de flanc (ordres ↖️ ↗️) : les attaques de côté et de dos font bien plus mal.');
    if(mine.every(u=>u.g===mine[0].g)&&mine.some(u=>u.t===3))out.push('Un groupe avance au pas de son unité la plus lente : place tes cavaliers à part pour qu’ils chargent vite.');
    return out.slice(0,2)}
  function showEnd(win,st,gain,r,med){lastEnd=[win,st,gain,r,med];const rows=[0,1,2,3,4,5,6,7].filter(t=>B.lost[0][t]||B.lost[1][t]||mine.some(u=>u.t===t)||L.enemy.some(u=>u.t===t));
    const rep=`<table class="bshop brep"><tr><td></td><td>Tes pertes</td><td>Ennemis tués</td></tr>${rows.map(t=>`<tr><td>${T[t].s} ${T[t].n}</td><td>${B.lost[0][t]}/${mine.filter(u=>u.t===t).length}</td><td>${B.kills[0][t]}/${L.enemy.filter(u=>u.t===t).length}</td></tr>`).join('')}</table>`;
    ov.innerHTML=`<div class="card bsum"><h2>${win?'Victoire !':'Défaite'}</h2>${win&&!L.daily?`<div class="bst">${'★'.repeat(st)}${'☆'.repeat(3-st)}${med?' 🎖':''}</div>`:''}
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
    h+=`</table><button class="btn" id="bat-close">Fermer</button></div>`;
    ov.innerHTML=h;ov.hidden=false;
    ov.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{const i=+b.dataset.v,l=prog.vet[i]||0;if(prog.coins<vetCost(l))return;prog.coins-=vetCost(l);prog.vet[i]=l+1;saveProg();snd(1);shop()});
    const bb=ov.querySelector('[data-b]');if(bb)bb.onclick=()=>{const l=prog.bud||0;if(prog.coins<budCost(l))return;prog.coins-=budCost(l);prog.bud=l+1;saveProg();snd(1);shop()};
    ov.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>{const k=b.dataset.d,c=DOC[k][3];if(prog.coins<c)return;prog.coins-=c;prog.doc[k]=1;saveProg();snd(1);shop()});
    $('#bat-close').onclick=()=>{ov.hidden=true;if(phase==='done'&&lastEnd)showEnd(...lastEnd);tools()};hud()}

  /* ---------- Interface ---------- */
  function say(t){msgEl.textContent=t}
  function hud(){$('#bat-bud').textContent=L?used()+'/'+budget():'';$('#bat-coins').textContent=prog.coins}
  function fillSel(){const u=unlocked();let h=`<option value="D">📅 Défi du jour${prog.daily===dkey()?' ✓':''}</option>`;
    for(let n=Math.max(u,cur==='D'?1:cur);n>=1;n--)h+=`<option value="${n}">${n%10===0?'⬟ ':''}Niveau ${n}${prog.stars[n-1]?' '+'★'.repeat(prog.stars[n-1]):''}${prog.med[n-1]?' 🎖':''}</option>`;lvlSel.innerHTML=h;lvlSel.value=String(cur)}
  function tools(){hud();let h='';
    if(phase==='place'){const vis=[0,1,2,3,4,5,6].filter(t=>canUse(t)||t===[0,1,2,3,4,5,6].find(x=>!canUse(x)));
      h+='<div class="brow">'+vis.map(i=>{const t=T[i],ok=canUse(i);return`<button class="btn bt${tool===i&&!erase?' on':''}" data-t="${i}"${ok?'':' disabled'}><b>${t.s}</b><small>${ok?t.n+' · '+t.cost:'niv. '+UNLOCK[i]}</small></button>`}).join('')+'</div>';
      h+=`<div class="brow"><button class="btn bt${mode==='brush'&&!erase?' on':''}" data-m="brush">✏️<small>Pinceau</small></button><button class="btn bt${mode==='block'&&!erase?' on':''}" data-m="block">▦<small>${SHAPES[shape]}</small></button>
        <button class="btn bt${erase?' on':''}" data-e="1">🧽<small>Gomme</small></button><button class="btn bt on2" data-o="1">${ORD[order][0]}<small>${ORD[order][1]}</small></button>
        <button class="btn bt" data-l="1"${prog.lastArmy?'':' disabled'}>↺<small>Dernière</small></button><button class="btn bt" data-c="1">🗑️<small>Vider</small></button><button class="btn bfight" data-f="1"${mine.length?'':' disabled'}>Combat !</button></div>`}
    else if(phase==='fight'){h+=`<div class="brow">${[1,2,3].map(s=>`<button class="btn bt${speed===s?' on':''}" data-s="${s}">×${s}</button>`).join('')}<button class="btn bt brally" data-r="1"${B&&B.rally>0?'':' disabled'}>📯<small>Ralliement${B&&B.rally>1?' ×'+B.rally:''}</small></button><button class="btn bt" data-q="1">🏳️<small>Abandonner</small></button></div>`}
    toolsEl.innerHTML=h;
    toolsEl.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{tool=+b.dataset.t;erase=false;say(T[tool].s+' '+T[tool].n+' : '+HELP[tool]);tools()});
    toolsEl.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{if(b.dataset.m==='block'&&mode==='block'&&!erase)shape=(shape+1)%3;mode=b.dataset.m;erase=false;tools()});
    const q=s=>toolsEl.querySelector(s);
    if(q('[data-e]'))q('[data-e]').onclick=()=>{erase=!erase;tools()};
    if(q('[data-o]'))q('[data-o]').onclick=()=>{order=(order+1)%5;say(['Les prochaines unités avanceront vers l’ennemi','Les prochaines unités tiendront leur position jusqu’à l’arrivée de l’ennemi','Les prochaines unités contourneront par la gauche avant d’attaquer','Les prochaines unités contourneront par la droite avant d’attaquer','Les prochaines unités attendront 15 secondes en réserve'][order]);tools()};
    if(q('[data-l]'))q('[data-l]').onclick=()=>{mine=validArmy(prog.lastArmy||[]);say(mine.length?'Dernière armée replacée (ce qui rentre dans le budget et le terrain)':'Rien à replacer ici');tools()};
    if(q('[data-c]'))q('[data-c]').onclick=()=>{mine=[];tools()};
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
    const[ ,c1,c2]=WORLDS[L.w];g.fillStyle=c1;g.fillRect(X(0),Y(0),FW*sc,FH*sc);const R=rng(L.n*31+7);
    for(let i=0;i<260;i++){g.fillStyle=c2;g.globalAlpha=.35+R()*.4;g.beginPath();g.ellipse(X(R()*FW),Y(R()*FH),(1+R()*3)*sc,(.6+R()*1.6)*sc,R()*3,0,7);g.fill()}g.globalAlpha=1;
    for(const h of L.hills){for(let i=4;i>=1;i--){g.fillStyle=`rgba(210,200,150,${.05+.03*(4-i)})`;g.beginPath();g.ellipse(X(h.x),Y(h.y),h.rx*sc*i/4,h.ry*sc*i/4,0,0,7);g.fill()}
      g.strokeStyle='rgba(230,220,170,.18)';g.lineWidth=1;g.beginPath();g.ellipse(X(h.x),Y(h.y),h.rx*sc,h.ry*sc,0,0,7);g.stroke()}
    for(const w of L.water){g.fillStyle='#2f4a66';g.beginPath();g.ellipse(X(w.x),Y(w.y),w.rx*sc,w.ry*sc,0,0,7);g.fill();g.strokeStyle='rgba(160,205,245,.3)';g.lineWidth=2;g.stroke()}
    if(L.river){const rv=L.river;g.fillStyle='#2c5677';g.fillRect(X(0),Y(rv.y-rv.h),FW*sc,rv.h*2*sc);g.fillStyle='rgba(170,215,250,.18)';for(let i=0;i<30;i++)g.fillRect(X(R()*FW),Y(rv.y-rv.h+R()*rv.h*2),4*sc,.3*sc);
      for(const br of rv.br){g.fillStyle='#7a5a3a';g.fillRect(X(br.x-br.w/2),Y(rv.y-rv.h-1),br.w*sc,(rv.h*2+2)*sc);g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=1;for(let y=rv.y-rv.h-1;y<rv.y+rv.h+1;y+=1.2){g.beginPath();g.moveTo(X(br.x-br.w/2),Y(y));g.lineTo(X(br.x+br.w/2),Y(y));g.stroke()}}}
    for(const r of L.rocks){g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.arc(X(r.x+.5),Y(r.y+.7),r.r*sc,0,7);g.fill();g.fillStyle='#575c55';g.beginPath();g.arc(X(r.x),Y(r.y),r.r*sc,0,7);g.fill();g.fillStyle='rgba(255,255,255,.09)';g.beginPath();g.arc(X(r.x-r.r*.25),Y(r.y-r.r*.3),r.r*sc*.55,0,7);g.fill()}
    for(const f of L.forest){g.fillStyle='rgba(20,40,20,.35)';g.beginPath();g.arc(X(f.x),Y(f.y),f.r*sc,0,7);g.fill();for(const[x,y,r]of f.trees){g.fillStyle='#1f3d24';g.beginPath();g.arc(X(x),Y(y),r*sc,0,7);g.fill();g.fillStyle='#2e5a33';g.beginPath();g.arc(X(x-r*.25),Y(y-r*.3),r*sc*.6,0,7);g.fill()}}
    bg=c}
  const COL=['#4aa8ff','#ff5d5d','#ffd27a'],COLD=['#1d4f80','#802a2a'];
  function frame(dt){
    if(phase==='fight'&&B){if(intro>0)intro-=dt;else{acc+=Math.min(dt,.1)*speed;let n=0;while(acc>=STEP&&n++<12){acc-=STEP;simStep(B,L,STEP);if(B.over){endBattle();break}}}
      if(B.rally<=0&&toolsEl.querySelector('[data-r]:not([disabled])'))tools()}
    const k=DPR();ctx.setTransform(k,0,0,k,0,0);ctx.clearRect(0,0,W,H);if(!L)return;
    let sx=0,sy=0;if(B&&B.shake){sx=(Math.random()-.5)*6*B.shake/.15;sy=(Math.random()-.5)*6*B.shake/.15}ctx.translate(sx,sy);
    if(!bg)drawBg();ctx.drawImage(bg,0,0,W,H);
    if(phase==='place'){ctx.fillStyle='rgba(74,168,255,.08)';ctx.fillRect(X(0),Y(ZY),FW*sc,(FH-ZY)*sc);ctx.strokeStyle='rgba(74,168,255,.4)';ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(X(0),Y(ZY));ctx.lineTo(X(FW),Y(ZY));ctx.stroke();ctx.setLineDash([])}
    const s=Math.max(1.8,sc*1.05);
    if(phase==='place'||!B){for(const u of L.enemy){ctx.fillStyle='rgba(0,0,0,.3)';shapeAt(ctx,u.t,X(u.x)+1,Y(u.y)+1.5,s*T[u.t].r);ctx.fillStyle=COL[1];shapeAt(ctx,u.t,X(u.x),Y(u.y),s*T[u.t].r)}
      const OC=['#4aa8ff','#9fd0ff','#5fd6c2','#5fd6c2','#9a8cff'];
      for(const u of mine){ctx.fillStyle='rgba(0,0,0,.3)';shapeAt(ctx,u.t,X(u.x)+1,Y(u.y)+1.5,s*T[u.t].r);ctx.fillStyle=OC[u.o||0];shapeAt(ctx,u.t,X(u.x),Y(u.y),s*T[u.t].r)}
      // flèches d'ordres : une par groupe
      const gs={};for(const u of mine)if(u.o>=2)(gs[u.g]||(gs[u.g]=[])).push(u);ctx.strokeStyle='rgba(95,214,194,.7)';ctx.lineWidth=2;ctx.setLineDash([4,4]);
      for(const g in gs){const a=gs[g],cx=a.reduce((x,u)=>x+u.x,0)/a.length,cy=a.reduce((x,u)=>x+u.y,0)/a.length,side=a[0].o===2?6:FW-6;ctx.beginPath();ctx.moveTo(X(cx),Y(cy));ctx.lineTo(X(side),Y(80));ctx.lineTo(X(side),Y(EZ-4));ctx.stroke()}ctx.setLineDash([]);
      // composition ennemie
      const cnt={};for(const u of L.enemy)cnt[u.t]=(cnt[u.t]||0)+1;ctx.font='700 12px Fredoka, sans-serif';ctx.textAlign='left';ctx.textBaseline='top';ctx.fillStyle='rgba(10,12,20,.55)';
      const txt=Object.keys(cnt).map(t=>T[t].s+' '+cnt[t]).join('   ');ctx.fillRect(X(0),Y(0),FW*sc,18);ctx.fillStyle='#ffb3b3';ctx.fillText((I18N.lang==='en'?'Enemy: ':'Ennemi : ')+txt,X(2),Y(0)+3)}
    else{for(const u of B.units){if(u.dead){if(u.fade<1.2&&!u.fled){ctx.globalAlpha=.4*(1-u.fade/1.2);ctx.fillStyle=COLD[u.side];shapeAt(ctx,u.t,X(u.x),Y(u.y),s*T[u.t].r*.9);ctx.globalAlpha=1}continue}
        ctx.fillStyle='rgba(0,0,0,.3)';shapeAt(ctx,u.t,X(u.x)+1,Y(u.y)+1.5,s*T[u.t].r);
        if(u.rout)ctx.globalAlpha=.45+.3*Math.sin(B.t*20);ctx.fillStyle=u.flash>0?'#fff':u.buff>0&&u.side===0?'#8fe3ff':COL[u.side];shapeAt(ctx,u.t,X(u.x),Y(u.y),s*T[u.t].r);ctx.globalAlpha=1;
        if(u.t===3&&u.mv>1){ctx.strokeStyle='rgba(255,255,255,.25)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(X(u.x),Y(u.y));ctx.lineTo(X(u.x-u.fx*3),Y(u.y-u.fy*3));ctx.stroke()}
        if(u.t===7){ctx.fillStyle='rgba(0,0,0,.5)';ctx.fillRect(X(u.x-3),Y(u.y-4.6),6*sc,.8*sc);ctx.fillStyle='#ff5d5d';ctx.fillRect(X(u.x-3),Y(u.y-4.6),6*sc*Math.max(0,u.hp/u.max),.8*sc)}}
      ctx.strokeStyle='rgba(255,240,200,.85)';ctx.lineWidth=1;for(const p of B.proj){if(p.k==='arrow'){const g=p.tg,dx=g.x-p.x,dy=g.y-p.y,d=Math.hypot(dx,dy)||1;ctx.beginPath();ctx.moveTo(X(p.x),Y(p.y));ctx.lineTo(X(p.x+dx/d*1.8),Y(p.y+dy/d*1.8));ctx.stroke()}
        else{ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.arc(X(p.x),Y(p.y),sc*.7,0,7);ctx.fill();ctx.fillStyle='#d9cdb8';ctx.beginPath();ctx.arc(X(p.x),Y(p.y-p.h),sc*.8,0,7);ctx.fill()}}
      for(const f of B.fx){if(f.k==='p'){ctx.globalAlpha=1-f.t/.6;ctx.fillStyle=f.c?'#c94a4a':'#3f7fc0';ctx.fillRect(X(f.x),Y(f.y),2,2)}
        else if(f.k==='ring'){ctx.globalAlpha=1-f.t/.6;ctx.strokeStyle=f.c===2?'#ffd27a':COL[f.c];ctx.lineWidth=2;ctx.beginPath();ctx.arc(X(f.x),Y(f.y),f.r*sc*(.5+f.t),0,7);ctx.stroke()}
        else if(f.k==='rally'){ctx.globalAlpha=Math.max(0,.35-f.t*.6);ctx.fillStyle='#8fe3ff';ctx.fillRect(X(0),Y(0),FW*sc,FH*sc)}}ctx.globalAlpha=1;
      const al=[0,1].map(sd=>B.units.filter(u=>!u.dead&&u.side===sd).length);ctx.font='700 13px Fredoka, sans-serif';ctx.textBaseline='top';ctx.textAlign='left';ctx.fillStyle=COL[0];ctx.fillText('● '+al[0],X(2),Y(FH)-18);ctx.textAlign='right';ctx.fillStyle=COL[1];ctx.fillText(al[1]+' ●',X(FW-2),Y(0)+4);
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
  function save(){if(phase!=='place'||!mine.length)return null;return{n:cur,units:mine}}
  function load(o){if(!(o.n==='D'||o.n>=1&&o.n<=unlocked())||!Array.isArray(o.units))return;startLevel(o.n,true);mine=validArmy(o.units);tools()}
  startLevel(cur);
  return{frame,resize,save,load,pause(){},resume(){},sub:()=>'Niveau '+unlocked()+' · ★ '+prog.stars.reduce((a,b)=>a+(b||0),0)+(prog.daily===dkey()?' · défi ✓':'')}
})();
