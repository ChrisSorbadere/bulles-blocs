/* ================= 2048 ================= */
const Fusion=(()=>{
  const cv=$('#fus-cv'),ctx=cv.getContext('2d'),stage=$('#fus-stage'),undoBtn=$('#fus-undo');
  const N=4,UNDO=3;
  const TC={2:['#3b4a8f','#eef2ff'],4:['#4660b8','#eef2ff'],8:['#35a1d8','#fff'],16:['#2fb59a','#fff'],32:['#4cc06a','#fff'],64:['#9bc43a','#1a1300'],128:['#f2c230','#1a1300'],
    256:['#f59a2c','#fff'],512:['#f0603a','#fff'],1024:['#e8457a','#fff'],2048:['#b45cf0','#fff'],4096:['#7a4dff','#fff']};
  let tiles,score,best=store.get('bb.fusBest',0),hist,undoLeft,over,won,anim=0,uid=1,W=300,H=300,cell=70,gap=8,ox=0,oy=0,pops=[];
  const at=(r,c)=>tiles.find(t=>t.r===r&&t.c===c&&!t.dead);
  function spawn(){const free=[];for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(!at(r,c))free.push([r,c]);if(!free.length)return;
    const[r,c]=free[rnd(free.length)];const t={id:uid++,v:Math.random()<.9?2:4,r,c,pr:r,pc:c};tiles.push(t);pops.push({t,age:0,grow:1})}
  function newGame(){tiles=[];score=0;hist=[];undoLeft=UNDO;over=false;won=false;anim=0;pops=[];spawn();spawn();ui()}
  const snap=()=>({t:tiles.filter(t=>!t.dead).map(t=>[t.r,t.c,t.v]),s:score,w:won});
  function move(dir){if(over||Celebrate.active())return;tiles=tiles.filter(t=>!t.dead);tiles.forEach(t=>{t.pr=t.r;t.pc=t.c;t.n=0;t.m=0});
    const before=snap();let moved=false,gain=0;
    const dr=[-1,1,0,0][dir],dc=[0,0,-1,1][dir];
    const lines=[];for(let k=0;k<N;k++){const L=[];for(let j=0;j<N;j++){let r,c;if(dc===0){c=k;r=dr<0?j:N-1-j}else{r=k;c=dc<0?j:N-1-j}L.push([r,c])}lines.push(L)}
    for(const L of lines){const ts=L.map(([r,c])=>at(r,c)).filter(Boolean);let pos=0,lastT=null;
      for(const t of ts){if(lastT&&lastT.v===t.v&&!lastT.m){const[r,c]=L[pos-1];if(t.r!==r||t.c!==c)moved=true;t.r=r;t.c=c;t.dead=1;lastT.v*=2;lastT.m=1;gain+=lastT.v;pops.push({t:lastT,age:-.1})}
        else{const[r,c]=L[pos];if(t.r!==r||t.c!==c)moved=true;t.r=r;t.c=c;lastT=t;pos++}}}
    if(!moved){tiles.forEach(t=>{t.dead=0});return}
    hist.push(before);if(hist.length>UNDO)hist.shift();score+=gain;anim=.12;snd(gain?1:0,gain);
    setTimeout(()=>{spawn();if(score>best){best=score;store.set('bb.fusBest',best);window._duel&&window._duel.report('fusS',best,'hi')}
      const mx=Math.max(...tiles.filter(t=>!t.dead).map(t=>t.v));if(mx>store.get('bb.fusTop',0)){store.set('bb.fusTop',mx);window._duel&&window._duel.report('fusT',mx,'hi')}
      if(mx>=2048&&!won){won=true;Celebrate.run('fireworks','2048 !!',()=>Celebrate.ask('2048 atteint !','Bravo ! Tu peux continuer pour faire encore mieux.','Continuer','Nouvelle partie',null,newGame))}
      if(!canMove()){over=true;setTimeout(()=>Celebrate.ask(score>=best&&score>0?'Nouveau record !':'Plus de coups',score+' points · record '+best+'. Une nouvelle partie ?','Nouvelle partie','Revoir la grille',newGame,null),500)}
      ui()},120)}
  function canMove(){const live=tiles.filter(t=>!t.dead);if(live.length<N*N)return true;for(const t of live){const a=at(t.r,t.c+1),b=at(t.r+1,t.c);if(a&&a.v===t.v||b&&b.v===t.v)return true}return false}
  function undo(){if(!hist.length||!undoLeft)return;const h=hist.pop();undoLeft--;tiles=h.t.map(([r,c,v])=>({id:uid++,v,r,c,pr:r,pc:c}));score=h.s;won=h.w;over=false;anim=0;pops=[];ui()}
  function ui(){$('#fus-score').textContent=score.toLocaleString('fr-FR');$('#fus-best').textContent=best.toLocaleString('fr-FR');undoBtn.textContent='↶'+undoLeft;undoBtn.disabled=!hist.length||!undoLeft}
  /* entrées */
  let sw=null;
  stage.addEventListener('pointerdown',e=>{sw={x:e.clientX,y:e.clientY};try{stage.setPointerCapture(e.pointerId)}catch(_){}});
  stage.addEventListener('pointermove',e=>{if(!sw)return;const dx=e.clientX-sw.x,dy=e.clientY-sw.y;if(Math.max(Math.abs(dx),Math.abs(dy))>28){move(Math.abs(dx)>Math.abs(dy)?(dx<0?2:3):(dy<0?0:1));sw=null}});
  stage.addEventListener('pointerup',()=>{sw=null});stage.addEventListener('pointercancel',()=>{sw=null});
  addEventListener('keydown',e=>{if($('#g-fus').hidden||Celebrate.active())return;const k={ArrowUp:0,ArrowDown:1,ArrowLeft:2,ArrowRight:3}[e.key];if(k!=null){e.preventDefault();move(k)}});
  /* dessin */
  function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
  function frame(dt){if(anim>0)anim=Math.max(0,anim-dt);pops=pops.filter(p=>(p.age+=dt)<.2);
    const k=DPR();ctx.setTransform(k,0,0,k,0,0);ctx.clearRect(0,0,W,H);
    const S=cell*N+gap*(N+1);rr(ox,oy,S,S,14);ctx.fillStyle='#0e1530';ctx.fill();
    for(let r=0;r<N;r++)for(let c=0;c<N;c++){rr(ox+gap+c*(cell+gap),oy+gap+r*(cell+gap),cell,cell,10);ctx.fillStyle='#1b2550';ctx.fill()}
    const u=1-anim/.12,e=1-Math.pow(1-u,3);
    for(const t of tiles){if(t.dead&&anim<=0)continue;const r=t.pr+(t.r-t.pr)*e,c=t.pc+(t.c-t.pc)*e;let sc=1;
      if(t.n){sc=anim>0?0:1}const p=pops.find(q=>q.t===t);if(p&&p.grow)sc=.3+.7*Math.min(1,Math.max(0,p.age)/.15);else if(p&&p.age>0)sc=1+.12*Math.sin(p.age/.2*Math.PI);
      const v=t.dead||(t.m&&anim>0)?(t.m&&anim>0?t.v/2:t.v):t.v;const[bg,fg]=TC[v]||['#2a1c5c','#fff'];
      const s=cell*sc,x=ox+gap+c*(cell+gap)+(cell-s)/2,y=oy+gap+r*(cell+gap)+(cell-s)/2;if(s<=0)continue;
      rr(x,y,s,s,10*sc);ctx.fillStyle=bg;ctx.fill();if(v>=128){ctx.shadowColor=bg;ctx.shadowBlur=14;ctx.fill();ctx.shadowBlur=0}
      ctx.fillStyle='rgba(255,255,255,.12)';rr(x,y,s,s*.45,10*sc);ctx.fill();
      ctx.fillStyle=fg;const fs=cell*(v<100?.46:v<1000?.38:v<10000?.3:.24)*sc;ctx.font='700 '+Math.round(fs)+'px Fredoka, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(v,x+s/2,y+s/2+1)}
    if(anim<=0)tiles=tiles.filter(t=>!t.dead)}
  function resize(){const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;W=w;H=h;const S=Math.min(w-8,h-8,460);gap=Math.round(S*.025);cell=(S-gap*(N+1))/N;ox=(w-S)/2;oy=(h-S)/2;
    cv.style.width=W+'px';cv.style.height=H+'px';cv.width=Math.round(W*DPR());cv.height=Math.round(H*DPR())}
  new ResizeObserver(resize).observe(stage);
  let AC=null;
  function snd(k,g){if(store.get('bb.mute',false))return;try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();const t0=AC.currentTime;
    const o=AC.createOscillator(),v=AC.createGain();o.type=k?'triangle':'sine';o.frequency.value=k?Math.min(1400,300+Math.log2(g||2)*70):220;v.gain.setValueAtTime(.0001,t0);v.gain.exponentialRampToValueAtTime(k?.08:.03,t0+.01);v.gain.exponentialRampToValueAtTime(.0001,t0+.14);
    o.connect(v).connect(AC.destination);o.start(t0);o.stop(t0+.18)}catch(e){}}
  undoBtn.onclick=undo;
  $('#fus-new').onclick=()=>{if(over||score===0){newGame();return}Celebrate.ask('Nouvelle partie ?','La partie en cours sera abandonnée.','Nouvelle partie','Continuer',newGame,null)};
  function save(){if(over)return null;if(anim>0)return undefined;if(score===0)return null;return{t:tiles.filter(t=>!t.dead).map(t=>[t.r,t.c,t.v]),score,undoLeft,won,hist}}
  function load(o){if(!Array.isArray(o.t))return;tiles=o.t.map(([r,c,v])=>({id:uid++,v,r,c,pr:r,pc:c}));score=o.score||0;undoLeft=o.undoLeft??UNDO;won=!!o.won;hist=o.hist||[];over=false;anim=0;pops=[];ui()}
  newGame();
  return{frame,resize,save,load,pause(){},resume(){},sub:()=>'Record '+best.toLocaleString('fr-FR')+(store.get('bb.fusTop',0)?' · tuile '+store.get('bb.fusTop',0):'')}
})();
