/* ================= BATAILLES (armées de points) ================= */
const Battle=(()=>{
  const cv=$('#bat-cv'),ctx=cv.getContext('2d'),stage=$('#bat-stage'),toolsEl=$('#bat-tools'),ov=$('#bat-ov'),lvlSel=$('#bat-lvl'),msgEl=$('#bat-msg');
  const FW=100,FH=150,ZY=98,EZ=58,STEP=1/30;
  // types : 0 soldat, 1 piquier, 2 archer, 3 cavalier
  const T=[
    {n:'Soldat',s:'●',cost:1,hp:10,dmg:2,rng:2.4,spd:6,cd:.8,r:1},
    {n:'Piquier',s:'■',cost:2,hp:15,dmg:2,rng:2.6,spd:4.2,cd:.9,r:1.05},
    {n:'Archer',s:'▲',cost:2,hp:6,dmg:1.6,rng:24,spd:5.5,cd:1.4,r:1},
    {n:'Cavalier',s:'◆',cost:3,hp:13,dmg:3,rng:2.6,spd:12,cd:.9,r:1.2}];
  const MUL=[[1,1,1,1],[1,1,1,3],[1.5,.7,1,1.1],[1.3,.45,2.5,1]];
  const UNLOCK=[1,3,5,8];
  const PLAYER_BUDGET=n=>Math.round(24+n*4.2);
  // Force de l'armée ennemie par niveau : calée par simulation (un robot joue des dizaines de batailles par niveau)
  const ENEMY_K={1:0.948,2:0.948,3:0.836,4:1.089,5:1.061,6:1.061,7:0.977,8:0.78,9:1.033,10:1.398,11:0.892,12:1.145,13:0.723,14:0.864,15:0.78,16:0.78,17:0.836,18:1.061,19:0.78,20:1.089,21:0.752,22:1.173,23:1.173,24:0.808,25:1.005,26:0.892,27:0.948,28:1.23,29:0.78,30:0.808,31:0.864,32:0.892,33:0.78,34:1.314,35:1.117,36:0.808,37:1.117,38:1.314,39:1.23,40:1.145};
  const SHAPES=['Ligne','Carré','Coin'];
  const rng=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
  let prog=store.get('bb.batProg',{stars:[],coins:0,vet:[0,0,0,0],bud:0});
  if(!prog||!Array.isArray(prog.stars))prog={stars:[],coins:0,vet:[0,0,0,0],bud:0};
  const saveProg=()=>store.set('bb.batProg',prog);
  const unlocked=()=>{let n=1;while(prog.stars[n-1])n++;return n};
  let cur=Math.min(store.get('bb.batSel',1),unlocked())||1;
  let L,mine=[],phase='place',tool=0,mode='brush',shape=0,erase=false,order=0,speed=1,B=null,W=300,H=300,sc=2,ox=0,oy=0,acc=0,painting=false,lastPaint=null,intro=null;

  /* ---------- Niveaux ---------- */
  function genLevel(n){const R=rng(n*7919+13),ri=k=>Math.floor(R()*k);
    const L={n,rocks:[],water:[],enemy:[],budget:PLAYER_BUDGET(n)+(prog.bud||0)*0};
    const types=[0,1,2,3].filter(t=>n>=UNLOCK[t]);
    // terrain
    const nr=n<3?0:Math.min(7,1+ri(2+Math.floor(n/6)));
    for(let i=0;i<nr;i++){const cx=8+R()*84,cy=EZ+6+R()*(ZY-EZ-12);const k=2+ri(4);for(let j=0;j<k;j++)L.rocks.push({x:cx+(R()-.5)*10,y:cy+(R()-.5)*7,r:1.8+R()*2.6})}
    if(n>=6&&R()<.55){const k=1+(n>=15&&R()<.5?1:0);for(let i=0;i<k;i++)L.water.push({x:12+R()*76,y:EZ+8+R()*(ZY-EZ-16),rx:8+R()*9,ry:4+R()*4})}
    // armée ennemie
    const k=ENEMY_K[n]||(1+Math.min(.3,(n-40)*.01));let bud=Math.round(PLAYER_BUDGET(n)*k);
    const tpl=ri(5),place=(t,cx,cy,cols,rows)=>{const sp=2.6;for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){if(bud<T[t].cost)return;const x=cx+(c-(cols-1)/2)*sp,y=cy-(r)*sp;if(x<2||x>FW-2||y<3)continue;L.enemy.push({t,x,y});bud-=T[t].cost}};
    const share=t=>types.includes(t);
    const plan=[];
    if(tpl===0||types.length===1)plan.push([0,1]);
    else if(tpl===1)plan.push([share(1)?1:0,.5],[0,.5]);
    else if(tpl===2)plan.push([0,.55],[share(2)?2:0,.45]);
    else if(tpl===3)plan.push([share(1)?1:0,.4],[share(3)?3:0,.3],[share(2)?2:0,.3]);
    else plan.push([0,.4],[share(3)?3:1,.3],[share(1)?1:0,.3]);
    const total=bud;
    plan.forEach(([t,f],i)=>{let b=Math.round(total*f);const cnt=Math.max(1,Math.floor(b/T[t].cost));
      if(t===3&&plan.length>1){const half=Math.ceil(cnt/2),cols=Math.min(6,half),rows=Math.ceil(half/cols);place(3,14,EZ-4,cols,rows);place(3,FW-14,EZ-4,cols,rows);return}
      const cols=Math.min(t===2?18:16,Math.max(4,Math.ceil(Math.sqrt(cnt*3)))),rows=Math.ceil(cnt/cols);const cy=t===2?EZ-14-i*2:EZ-2-i*(rows*2.6+2);place(t,FW/2+(ri(11)-5),Math.max(rows*2.6+4,cy),cols,rows)});
    return L}
  function startLevel(n,keep){cur=n;store.set('bb.batSel',n);L=genLevel(n);if(!keep)mine=[];phase='place';B=null;ov.hidden=true;erase=false;
    const nt=[0,1,2,3].find(t=>UNLOCK[t]===n&&n>1);intro=nt!=null?nt:null;
    if(intro!=null){const t=T[intro];say('Nouvelle unité : '+t.n+' '+t.s)}else say('Place ton armée dans la zone bleue, puis lance le combat');
    fillSel();tools();if(!keep)store.set('bb.save.bat',null)}
  const budget=()=>Math.round(L.budget*(1+.1*(prog.bud||0)));
  const used=()=>mine.reduce((a,u)=>a+T[u.t].cost,0);

  /* ---------- Simulation ---------- */
  function makeArmy(list,side,vet){return list.map(u=>{const t=T[u.t],v=1+.12*(vet?vet[u.t]:0);return{t:u.t,side,x:u.x,y:u.y,hp:t.hp*v,max:t.hp*v,dmgK:v,cd:Math.random()*t.cd,tg:null,rt:0,hold:u.o===1&&side===0,mv:0,dead:0,fade:0,flash:0}})}
  function newBattle(enemy,mineList,vet){const units=[...makeArmy(mineList,0,vet),...makeArmy(enemy,1,null)];return{units,proj:[],t:0,over:0,start:[mineList.length,enemy.length],val:[mineList.reduce((a,u)=>a+T[u.t].cost,0),enemy.reduce((a,u)=>a+T[u.t].cost,0)]}}
  const CS=4,GX=Math.ceil(FW/CS)+1,GY=Math.ceil(FH/CS)+1;
  function simStep(b,lv,dt){b.t+=dt;const U=b.units,grid=new Array(GX*GY);
    for(const u of U){if(u.dead)continue;const k=Math.max(0,Math.min(GX-1,u.x/CS|0))+Math.max(0,Math.min(GY-1,u.y/CS|0))*GX;(grid[k]||(grid[k]=[])).push(u)}
    const near=(u,rad,f)=>{const x0=Math.max(0,(u.x-rad)/CS|0),x1=Math.min(GX-1,(u.x+rad)/CS|0),y0=Math.max(0,(u.y-rad)/CS|0),y1=Math.min(GY-1,(u.y+rad)/CS|0);
      for(let gy=y0;gy<=y1;gy++)for(let gx=x0;gx<=x1;gx++){const c=grid[gx+gy*GX];if(c)for(const o of c)f(o)}};
    const alive=[U.filter(u=>!u.dead&&u.side===0),U.filter(u=>!u.dead&&u.side===1)];
    if(!alive[0].length||!alive[1].length||b.t>150){b.over=1;return}
    for(const u of U){if(u.dead){u.fade+=dt;continue}const ty=T[u.t];u.flash=Math.max(0,u.flash-dt);u.cd-=dt;u.rt-=dt;
      if(!u.tg||u.tg.dead||u.rt<=0){u.rt=.4+Math.random()*.2;let best=null,bd=1e9;
        near(u,18,o=>{if(o.side!==u.side&&!o.dead){const d=(o.x-u.x)**2+(o.y-u.y)**2;if(d<bd){bd=d;best=o}}});
        if(!best)for(const o of alive[1-u.side]){const d=(o.x-u.x)**2+(o.y-u.y)**2;if(d<bd){bd=d;best=o}}
        u.tg=best}
      const g=u.tg;if(!g)continue;const dx=g.x-u.x,dy=g.y-u.y,d=Math.hypot(dx,dy)||.01;
      if(u.hold&&d<20)u.hold=false;
      const meleeR=ty.r+T[g.t].r+.6;
      if(u.t===2&&d<=ty.rng&&d>meleeR){u.mv=0;if(u.cd<=0){u.cd=ty.cd*(.9+Math.random()*.2);b.proj.push({x:u.x,y:u.y,tg:g,dmg:ty.dmg*MUL[2][g.t]*u.dmgK,side:u.side})}}
      else if(d<=meleeR){if(u.cd<=0){u.cd=ty.cd*(.85+Math.random()*.3);let dm=(u.t===2?.6:ty.dmg)*MUL[u.t][g.t]*u.dmgK;if(u.t===3&&u.mv>1){dm*=2}u.mv=0;
          if(g.t===1&&u.t===3)u.hp-=1.5;g.hp-=dm;g.flash=.12;if(g.hp<=0&&!g.dead){g.dead=1}}}
      else if(!u.hold){let sp=ty.spd;for(const w of lv.water)if(((u.x-w.x)/w.rx)**2+((u.y-w.y)/w.ry)**2<1){sp*=.45;break}
        u.x+=dx/d*sp*dt;u.y+=dy/d*sp*dt;u.mv+=dt}
      if(u.hp<=0)u.dead=1}
    // séparation et obstacles
    for(const u of U){if(u.dead)continue;const ru=T[u.t].r;
      near(u,3,o=>{if(o===u||o.dead)return;const dx=u.x-o.x,dy=u.y-o.y,d2=dx*dx+dy*dy,m=ru+T[o.t].r;if(d2<m*m&&d2>1e-6){const d=Math.sqrt(d2),p=(m-d)*.5;u.x+=dx/d*p;u.y+=dy/d*p}});
      for(const r of lv.rocks){const dx=u.x-r.x,dy=u.y-r.y,d=Math.hypot(dx,dy),m=r.r+ru;if(d<m&&d>1e-6){u.x+=dx/d*(m-d);u.y+=dy/d*(m-d);
          if(u.tg){const tx=-dy/d,tyy=dx/d,s=Math.sign((u.tg.x-u.x)*tx+(u.tg.y-u.y)*tyy)||1;u.x+=tx*s*T[u.t].spd*dt*.8;u.y+=tyy*s*T[u.t].spd*dt*.8}}}
      u.x=Math.max(1,Math.min(FW-1,u.x));u.y=Math.max(1,Math.min(FH-1,u.y))}
    for(const p of b.proj){if(p.done)continue;const g=p.tg,dx=g.x-p.x,dy=g.y-p.y,d=Math.hypot(dx,dy);const s=48*dt;
      if(d<=s){p.done=1;if(!g.dead){g.hp-=p.dmg;g.flash=.12;if(g.hp<=0)g.dead=1}}else{p.x+=dx/d*s;p.y+=dy/d*s}}
    b.proj=b.proj.filter(p=>!p.done)}
  function result(b){const alive=s=>b.units.filter(u=>!u.dead&&u.side===s);const a=alive(0),e=alive(1);
    const valA=a.reduce((x,u)=>x+T[u.t].cost*(u.hp/u.max),0),valE=e.reduce((x,u)=>x+T[u.t].cost*(u.hp/u.max),0);
    const win=e.length===0?true:a.length===0?false:valA>valE;
    const keep=a.reduce((x,u)=>x+T[u.t].cost,0)/Math.max(1,b.val[0]),kills=1-e.length/Math.max(1,b.start[1]);return{win,keep,kills}}

  /* ---------- Placement ---------- */
  function inZone(x,y){if(y<ZY+1||y>FH-2||x<2||x>FW-2)return false;for(const r of L.rocks)if(Math.hypot(x-r.x,y-r.y)<r.r+1.2)return false;
    for(const w of L.water)if(((x-w.x)/w.rx)**2+((y-w.y)/w.ry)**2<1)return false;return true}
  const freeAt=(x,y,m=2.3)=>mine.every(u=>(u.x-x)**2+(u.y-y)**2>=m*m);
  function addUnit(x,y){const t=tool;if(!(cur>=UNLOCK[t]))return false;if(used()+T[t].cost>budget())return false;if(!inZone(x,y)||!freeAt(x,y))return false;mine.push({t,x,y,o:order});return true}
  function block(x,y){const sp=2.5,left=Math.floor((budget()-used())/T[tool].cost);let N=Math.min(left,[12,16,15][shape]);if(N<=0){say('Budget épuisé');return}
    const pts=[];if(shape===0){const cols=Math.ceil(N/2);for(let i=0;i<N;i++)pts.push([(i%cols-(cols-1)/2)*sp,Math.floor(i/cols)*sp])}
    else if(shape===1){const c=Math.ceil(Math.sqrt(N));for(let i=0;i<N;i++)pts.push([(i%c-(c-1)/2)*sp,Math.floor(i/c)*sp])}
    else{let i=0;for(let r=0;i<N;r++)for(let c=0;c<=r&&i<N;c++,i++)pts.push([(c-r/2)*sp,r*sp])}
    let k=0;for(const[dx,dy]of pts)if(addUnit(x+dx,y+dy))k++;if(!k)say('Pas de place ici');snd(0);tools()}
  function eraseAt(x,y){const n=mine.length;mine=mine.filter(u=>(u.x-x)**2+(u.y-y)**2>9);if(mine.length!==n)tools()}
  const toField=e=>{const r=cv.getBoundingClientRect();return[(e.clientX-r.left-ox)/sc,(e.clientY-r.top-oy)/sc]};
  cv.addEventListener('pointerdown',e=>{if(phase!=='place')return;const[x,y]=toField(e);cv.setPointerCapture(e.pointerId);
    if(erase){painting=true;eraseAt(x,y);return}
    if(mode==='block'){block(x,y);return}
    painting=true;lastPaint=[x,y];if(addUnit(x,y)){snd(0);tools()}});
  cv.addEventListener('pointermove',e=>{if(!painting||phase!=='place')return;const[x,y]=toField(e);if(erase){eraseAt(x,y);return}
    const[lx,ly]=lastPaint,d=Math.hypot(x-lx,y-ly);if(d<1.2)return;const st=Math.ceil(d/1.2);let any=false;for(let i=1;i<=st;i++){const px=lx+(x-lx)*i/st,py=ly+(y-ly)*i/st;
      if(addUnit(px,py))any=true;else{for(const[ax,ay]of[[2.4,0],[-2.4,0],[0,2.4],[0,-2.4]])if(addUnit(px+ax,py+ay)){any=true;break}}}
    lastPaint=[x,y];if(any)tools()});
  const endPaint=()=>{painting=false};cv.addEventListener('pointerup',endPaint);cv.addEventListener('pointercancel',endPaint);

  /* ---------- Combat ---------- */
  function fight(){if(!mine.length){say('Place au moins une unité');return}store.set('bb.save.bat',{n:cur,units:mine});
    B=newBattle(L.enemy,mine,prog.vet);phase='fight';acc=0;say('');tools();snd(2)}
  function endBattle(){phase='done';const r=result(B);const n=cur;
    if(r.win){const st=r.keep>=.6?3:r.keep>=.3?2:1,old=prog.stars[n-1]||0,gain=6+st*4+Math.floor(n/2)+(st>old?(st-old)*3:0);if(st>old)prog.stars[n-1]=st;prog.coins+=gain;saveProg();
      window._duel&&window._duel.report('batL',unlocked()-1,'hi');window._duel&&window._duel.report('batS',prog.stars.reduce((a,b)=>a+(b||0),0),'hi');
      store.set('bb.save.bat',null);
      Celebrate.run(st===3?'fireworks':'confetti','Victoire !',()=>showEnd(true,st,gain,r))}
    else{const gain=2+Math.round(r.kills*6);prog.coins+=gain;saveProg();snd(3);setTimeout(()=>showEnd(false,0,gain,r),500)}
    tools()}
  function showEnd(win,st,gain,r){lastEnd=[win,st,gain,r];ov.innerHTML=`<div class="card bsum"><h2>${win?'Victoire !':'Défaite'}</h2>${win?`<div class="bst">${'★'.repeat(st)}${'☆'.repeat(3-st)}</div>`:''}
      <p>Ennemis éliminés : ${Math.round(r.kills*100)} % · Armée conservée : ${Math.round(r.keep*100)} %</p><p class="bcoin">🪙 +${gain}</p>
      <div class="brow">${win?`<button class="btn" id="bat-next">Niveau suivant</button>`:`<button class="btn" id="bat-retry">Réessayer</button>`}<button class="btn alt" id="bat-up">Améliorations</button></div></div>`;
    ov.hidden=false;const nx=$('#bat-next');if(nx)nx.onclick=()=>startLevel(cur+1);const rt=$('#bat-retry');if(rt)rt.onclick=()=>{startLevel(cur,true);tools()};$('#bat-up').onclick=shop;hud()}
  function shop(){const vetCost=l=>[15,30,55][l],budCost=l=>[25,50,90][l];
    let h=`<div class="card bsum"><h2>Améliorations</h2><p class="bcoin">🪙 ${prog.coins}</p><table class="bshop">`;
    T.forEach((t,i)=>{const l=prog.vet[i]||0,ok=cur>=UNLOCK[i]||unlocked()>=UNLOCK[i];h+=`<tr><td>${t.s} ${t.n}${ok?'':' 🔒'}</td><td>${'●'.repeat(l)}${'○'.repeat(3-l)}</td><td>${l<3&&ok?`<button class="btn" data-v="${i}"${prog.coins<vetCost(l)?' disabled':''}>Vétérans · ${vetCost(l)} 🪙</button>`:l>=3?'max':''}</td></tr>`});
    const bl=prog.bud||0;h+=`<tr><td>📯 Recrutement</td><td>${'●'.repeat(bl)}${'○'.repeat(3-bl)}</td><td>${bl<3?`<button class="btn" data-b="1"${prog.coins<budCost(bl)?' disabled':''}>+10 % · ${budCost(bl)} 🪙</button>`:'max'}</td></tr></table>
      <p class="tdet">Vétérans : +12 % de vie et de dégâts par niveau · Recrutement : +10 % de budget d’armée</p><button class="btn" id="bat-close">Fermer</button></div>`;
    ov.innerHTML=h;ov.hidden=false;
    ov.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{const i=+b.dataset.v,l=prog.vet[i]||0;if(prog.coins<vetCost(l))return;prog.coins-=vetCost(l);prog.vet[i]=l+1;saveProg();snd(1);shop()});
    const bb=ov.querySelector('[data-b]');if(bb)bb.onclick=()=>{const l=prog.bud||0;if(prog.coins<budCost(l))return;prog.coins-=budCost(l);prog.bud=l+1;saveProg();snd(1);shop()};
    $('#bat-close').onclick=()=>{ov.hidden=true;if(phase==='done'&&lastEnd)showEnd(...lastEnd);tools()};hud()}
  let lastEnd=null;

  /* ---------- Interface ---------- */
  function say(t){msgEl.textContent=t}
  function hud(){$('#bat-bud').textContent=L?used()+'/'+budget():'';$('#bat-coins').textContent=prog.coins}
  function fillSel(){const u=unlocked();let h='';for(let n=Math.max(u,cur);n>=1;n--)h+=`<option value="${n}">Niveau ${n}${prog.stars[n-1]?' '+'★'.repeat(prog.stars[n-1]):''}</option>`;lvlSel.innerHTML=h;lvlSel.value=String(cur)}
  function tools(){hud();let h='';
    if(phase==='place'){h+='<div class="brow">'+T.map((t,i)=>{const ok=cur>=UNLOCK[i];return`<button class="btn bt${tool===i&&!erase?' on':''}" data-t="${i}"${ok?'':' disabled'}><b>${t.s}</b><small>${ok?t.n+' · '+t.cost:'niv. '+UNLOCK[i]}</small></button>`}).join('')+'</div>';
      h+=`<div class="brow"><button class="btn bt${mode==='brush'&&!erase?' on':''}" data-m="brush">✏️<small>Pinceau</small></button><button class="btn bt${mode==='block'&&!erase?' on':''}" data-m="block">▦<small>${SHAPES[shape]}</small></button>
        <button class="btn bt${erase?' on':''}" data-e="1">🧽<small>Gomme</small></button><button class="btn bt${order?' on':''}" data-o="1">${order?'🛡️':'➡️'}<small>${order?'Tenir':'Avancer'}</small></button>
        <button class="btn bt" data-c="1">🗑️<small>Vider</small></button><button class="btn bfight" data-f="1"${mine.length?'':' disabled'}>Combat !</button></div>`}
    else if(phase==='fight'){h+=`<div class="brow">${[1,2,3].map(s=>`<button class="btn bt${speed===s?' on':''}" data-s="${s}">×${s}</button>`).join('')}<button class="btn bt" data-q="1">🏳️<small>Abandonner</small></button></div>`}
    toolsEl.innerHTML=h;
    toolsEl.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{tool=+b.dataset.t;erase=false;tools()});
    toolsEl.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{if(b.dataset.m==='block'&&mode==='block'&&!erase)shape=(shape+1)%3;mode=b.dataset.m;erase=false;tools()});
    const q=s=>toolsEl.querySelector(s);
    if(q('[data-e]'))q('[data-e]').onclick=()=>{erase=!erase;tools()};
    if(q('[data-o]'))q('[data-o]').onclick=()=>{order=order?0:1;say(order?'Les prochaines unités tiendront leur position jusqu’à l’arrivée de l’ennemi':'Les prochaines unités avanceront vers l’ennemi');tools()};
    if(q('[data-c]'))q('[data-c]').onclick=()=>{mine=[];tools()};
    if(q('[data-f]'))q('[data-f]').onclick=fight;
    toolsEl.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{speed=+b.dataset.s;tools()});
    if(q('[data-q]'))q('[data-q]').onclick=()=>{if(B){B.units.forEach(u=>{if(u.side===0)u.dead=1});}}}

  /* ---------- Dessin ---------- */
  const X=x=>ox+x*sc,Y=y=>oy+y*sc;
  function shapeAt(t,x,y,s){ctx.beginPath();if(t===0)ctx.arc(x,y,s,0,7);else if(t===1)ctx.rect(x-s*.9,y-s*.9,s*1.8,s*1.8);else if(t===2){ctx.moveTo(x,y-s*1.15);ctx.lineTo(x+s,y+s*.75);ctx.lineTo(x-s,y+s*.75);ctx.closePath()}
    else{ctx.moveTo(x,y-s*1.25);ctx.lineTo(x+s*1.05,y);ctx.lineTo(x,y+s*1.25);ctx.lineTo(x-s*1.05,y);ctx.closePath()}ctx.fill()}
  const COL=['#4aa8ff','#ff5d5d'];
  function frame(dt){
    if(phase==='fight'&&B){acc+=Math.min(dt,.1)*speed;while(acc>=STEP){acc-=STEP;simStep(B,L,STEP);if(B.over){endBattle();break}}}
    const k=DPR();ctx.setTransform(k,0,0,k,0,0);ctx.clearRect(0,0,W,H);
    ctx.fillStyle='#22262f';ctx.fillRect(X(0),Y(0),FW*sc,FH*sc);
    if(!L)return;
    if(phase==='place'){ctx.fillStyle='rgba(74,168,255,.08)';ctx.fillRect(X(0),Y(ZY),FW*sc,(FH-ZY)*sc);ctx.strokeStyle='rgba(74,168,255,.35)';ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(X(0),Y(ZY));ctx.lineTo(X(FW),Y(ZY));ctx.stroke();ctx.setLineDash([])}
    for(const w of L.water){ctx.fillStyle='#2f4a66';ctx.beginPath();ctx.ellipse(X(w.x),Y(w.y),w.rx*sc,w.ry*sc,0,0,7);ctx.fill();ctx.strokeStyle='rgba(140,190,240,.25)';ctx.lineWidth=2;ctx.stroke()}
    for(const r of L.rocks){ctx.fillStyle='#4a5048';ctx.beginPath();ctx.arc(X(r.x),Y(r.y),r.r*sc,0,7);ctx.fill();ctx.fillStyle='rgba(255,255,255,.06)';ctx.beginPath();ctx.arc(X(r.x-r.r*.25),Y(r.y-r.r*.3),r.r*sc*.55,0,7);ctx.fill()}
    const s=Math.max(1.8,sc*1.05);
    if(phase==='place'||!B){ctx.fillStyle=COL[1];for(const u of L.enemy)shapeAt(u.t,X(u.x),Y(u.y),s*T[u.t].r);
      for(const u of mine){ctx.fillStyle=u.o?'#9fd0ff':COL[0];shapeAt(u.t,X(u.x),Y(u.y),s*T[u.t].r)}}
    else{for(const u of B.units){if(u.dead){if(u.fade<.6){ctx.globalAlpha=.35*(1-u.fade/.6);ctx.fillStyle=COL[u.side];shapeAt(u.t,X(u.x),Y(u.y),s*T[u.t].r);ctx.globalAlpha=1}continue}
        ctx.fillStyle=u.flash>0?'#fff':COL[u.side];shapeAt(u.t,X(u.x),Y(u.y),s*T[u.t].r)}
      ctx.strokeStyle='rgba(255,240,200,.8)';ctx.lineWidth=1;for(const p of B.proj){const g=p.tg,dx=g.x-p.x,dy=g.y-p.y,d=Math.hypot(dx,dy)||1;ctx.beginPath();ctx.moveTo(X(p.x),Y(p.y));ctx.lineTo(X(p.x+dx/d*1.6),Y(p.y+dy/d*1.6));ctx.stroke()}
      const al=[0,1].map(sd=>B.units.filter(u=>!u.dead&&u.side===sd).length);ctx.font='700 13px Fredoka, sans-serif';ctx.textBaseline='top';ctx.textAlign='left';ctx.fillStyle=COL[0];ctx.fillText('● '+al[0],X(2),Y(FH)-18);ctx.textAlign='right';ctx.fillStyle=COL[1];ctx.fillText(al[1]+' ●',X(FW-2),Y(0)+4)}}
  function resize(){const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;W=w;H=h;sc=Math.min(w/FW,h/FH);ox=(w-FW*sc)/2;oy=(h-FH*sc)/2;
    cv.style.width=W+'px';cv.style.height=H+'px';cv.width=Math.round(W*DPR());cv.height=Math.round(H*DPR())}
  new ResizeObserver(resize).observe(stage);
  let AC=null;
  function snd(k){if(store.get('bb.mute',false))return;try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();const t0=AC.currentTime;
    const notes=k===0?[[520,0]]:k===1?[[660,0],[880,.07]]:k===2?[[220,0],[330,.1],[440,.2]]:[[260,0],[180,.18]];
    notes.forEach(([f,d])=>{const o=AC.createOscillator(),v=AC.createGain(),s=t0+d;o.type=k===2?'sawtooth':'triangle';o.frequency.value=f;v.gain.setValueAtTime(.0001,s);v.gain.exponentialRampToValueAtTime(k===0?.03:.07,s+.01);v.gain.exponentialRampToValueAtTime(.0001,s+.18);o.connect(v).connect(AC.destination);o.start(s);o.stop(s+.22)})}catch(e){}}
  lvlSel.onchange=()=>{const n=+lvlSel.value;lvlSel.blur();startLevel(n)};
  $('#bat-shop').onclick=()=>{if(phase==='fight')return;shop()};
  function save(){if(phase!=='place'||!mine.length)return null;return{n:cur,units:mine}}
  function load(o){if(!(o.n>=1&&o.n<=unlocked())||!Array.isArray(o.units))return;startLevel(o.n,true);mine=o.units;tools()}
  startLevel(cur);
  return{frame,resize,save,load,pause(){},resume(){},sub:()=>'Niveau '+unlocked()+' · ★ '+prog.stars.reduce((a,b)=>a+(b||0),0)}
})();
