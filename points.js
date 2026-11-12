/* ================= POINTS (relier les points de même couleur) ================= */
const Dots=(()=>{
  const cv=$('#dot-cv'),ctx=cv.getContext('2d'),stage=$('#dot-stage'),goalsEl=$('#dot-goals'),movesEl=$('#dot-moves'),lvlSel=$('#dot-lvl');
  const C=6,Rw=7,COLS=['#ff5d5d','#ffc23d','#3fcf6e','#45a6ff','#b77bff'],CN=['rouges','jaunes','verts','bleus','violets'];
  const rng=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
  // Coups par niveau : calés par simulation (un robot joue 40 parties par niveau)
  const MOVES={1:12,2:13,3:15,4:29,5:35,6:25,7:33,8:34,9:20,10:35,11:13,12:17,13:27,14:27,15:16,16:33,17:37,18:24,19:20,20:36,21:18,22:30,23:15,24:19,25:34,26:39,27:26,28:42,29:38,30:21,31:23,32:37,33:21,34:42,35:19,36:28,37:47,38:45,39:20,40:36,41:41,42:23,43:20,44:42,45:25,46:44,47:17,48:30,49:41,50:45,51:27,52:48,53:48,54:25,55:18,56:47,57:27,58:53,59:20,60:21,61:37,62:44,63:24,64:47,65:44,66:21,67:19,68:53,69:24,70:44,71:22,72:21,73:45,74:48,75:24,76:44,77:52,78:26,79:16,80:45,81:22,82:45,83:18,84:26,85:45,86:46,87:30,88:52,89:41,90:23,91:19,92:43,93:25,94:51,95:16,96:30,97:49,98:52,99:26,100:50};
  let stars=store.get('bb.dotStars',[]);if(!Array.isArray(stars))stars=[];
  const unlocked=()=>{let n=1;while(stars[n-1])n++;return n};
  let cur=Math.min(store.get('bb.dotSel',1),unlocked())||1;
  let lv,g,ice,hole,moves,prog,path=[],loop=false,state='idle',fx=[],over=false,W=300,H=300,cell=40,ox=0,oy=0,flash=null,SIM=false;
  const id=(r,c)=>r*C+c,RC=i=>[i/C|0,i%C];
  function genLevel(n){const R=rng(n*9973+7),ri=k=>Math.floor(R()*k);
    const L={n,nCol:n<=3?4:5,goals:{},holes:[],ice:[],anchors:0};
    const tier=Math.min(1,(n-1)/60),saw=((n-1)%10)/9;
    if((n>=6&&n%3===0)||(n>=11&&n%4===3))L.nCol=4;
    const k=n<3?1:n<8?2:(R()<.5?2:3);const cols=[];while(cols.length<k){const c=ri(L.nCol);if(!cols.includes(c))cols.push(c)}
    L.goals.colors={};cols.forEach(c=>L.goals.colors[c]=Math.round((k===1?14:k===2?11:9)+tier*16+saw*6+ri(3)));
    if(n>=6&&n%3===0)L.anchors=Math.min(3,1+Math.floor(n/25));
    if(n>=11&&n%4===3){const m=Math.min(16,6+Math.floor(n/6));const s=new Set();while(s.size<m)s.add(ri(C*Rw));L.ice=[...s]}
    if(n>=16&&n%5!==0){const sh=[[[0,0],[0,5]],[[3,0],[3,5]],[[0,0],[0,5],[6,0],[6,5]],[[3,2],[3,3]],[[0,2],[0,3],[6,2],[6,3]],[[2,0],[4,0],[2,5],[4,5]]][ri(6)];L.holes=sh.map(([r,c])=>id(r,c));L.ice=L.ice.filter(i=>!L.holes.includes(i))}
    const need=Object.values(L.goals.colors).reduce((a,b)=>a+b,0);
    L.moves=MOVES[n]||Math.max(14,Math.round((.234*need+1.93*L.anchors+.047*L.ice.length-(L.nCol===4?23.2:0)+26.7)*(n%10===9?1:1.12)));
    return L}
  const isHole=i=>hole[i];
  const rndCol=ban=>{let c;do{c=rnd(lv.nCol)}while(c===ban&&lv.nCol>1);return c};
  function start(n){cur=n;store.set('bb.dotSel',n);lv=genLevel(n);moves=lv.moves;over=false;path=[];loop=false;fx=[];flash=null;
    hole=new Array(C*Rw).fill(false);lv.holes.forEach(i=>hole[i]=true);ice=new Array(C*Rw).fill(0);lv.ice.forEach(i=>ice[i]=1);
    prog={colors:{},anchors:0,ice:0};g=new Array(C*Rw).fill(null);
    let a=lv.anchors?1:0;for(let i=0;i<C*Rw;i++){if(hole[i])continue;const[r]=RC(i);g[i]={c:rndCol(-1),y:r-Rw-1}}
    let placed=0;if(lv.anchors){const cs=[...Array(C).keys()].filter(c=>!hole[c]).sort(()=>Math.random()-.5);for(const c of cs.slice(0,lv.anchors)){g[c]={a:1,y:-1};placed++}}
    anchorsOut=lv.anchors-placed;
    ensureMove();state='fall';hud();fillSel()}
  let anchorsOut=0;
  function lowest(c){let r=Rw-1;while(r>0&&hole[id(r,c)])r--;return r}
  function hasMove(){for(let i=0;i<C*Rw;i++){const k=g[i];if(!k||k.a)continue;const[r,c]=RC(i);
      if(c<C-1&&g[i+1]&&!g[i+1].a&&g[i+1].c===k.c)return true;if(r<Rw-1&&g[i+C]&&!g[i+C].a&&g[i+C].c===k.c)return true}return false}
  function ensureMove(){let t=0;while(!hasMove()&&t++<50){const ds=g.map((k,i)=>k&&!k.a?i:-1).filter(i=>i>=0),cs=ds.map(i=>g[i].c);for(let i=cs.length-1;i>0;i--){const j=rnd(i+1);[cs[i],cs[j]]=[cs[j],cs[i]]}ds.forEach((i,k)=>g[i].c=cs[k])}}
  const adj=(a,b)=>{const[r1,c1]=RC(a),[r2,c2]=RC(b);return Math.abs(r1-r2)+Math.abs(c1-c2)===1};
  function commit(){if(path.length<2){path=[];loop=false;return}
    const col=g[path[0]].c;let cl=loop?g.map((k,i)=>k&&!k.a&&k.c===col?i:-1).filter(i=>i>=0):path.slice();
    moves--;
    cl.forEach(i=>{if(ice[i]){ice[i]=0;prog.ice++}fx.push({t:'pop',i,c:col,age:-(loop?Math.random()*.15:path.indexOf(i)*.02)});g[i]=null});
    prog.colors[col]=(prog.colors[col]||0)+cl.length;
    if(loop){flash={c:col,age:0};snd(3)}else snd(2,path.length);
    path=[];const lc=loop?col:-1;loop=false;gravity(lc);hud()}
  function gravity(ban){for(let c=0;c<C;c++){const keep=[];for(let r=Rw-1;r>=0;r--){const i=id(r,c);if(hole[i])continue;if(g[i])keep.push(g[i]);g[i]=null}
      const slots=[];for(let r=Rw-1;r>=0;r--)if(!hole[id(r,c)])slots.push(r);
      let k2=0;for(const r of slots){if(k2<keep.length){g[id(r,c)]=keep[k2++]}else{
          let tok;if(anchorsOut>0&&Math.random()<.12&&!g.some(x=>x&&x.a&&false)){tok={a:1};anchorsOut--}else tok={c:rndCol(ban)};
          tok.y=-1-(k2-keep.length);g[id(r,c)]=tok;k2++}}}
    state='fall'}
  function settle(){let got=false;for(let c=0;c<C;c++){const r=lowest(c),i=id(r,c);if(g[i]&&g[i].a){fx.push({t:'anc',i,age:0});g[i]=null;prog.anchors++;got=true}}
    if(got){gravity(-1);snd(4);hud();return}
    state='idle';if(done())win();else if(moves<=0)lose();else if(!hasMove()){ensureMove();fx.push({t:'shuf',age:0})}hud()}
  function done(){const G=lv.goals;for(const c in G.colors)if((prog.colors[c]||0)<G.colors[c])return false;if(lv.anchors&&prog.anchors<lv.anchors)return false;if(lv.ice.length&&prog.ice<lv.ice.length)return false;return true}
  function win(){over=true;if(SIM)return;const st=moves>=lv.moves*.3?3:moves>=lv.moves*.15?2:1;const old=stars[cur-1]||0;if(st>old){stars[cur-1]=st;store.set('bb.dotStars',stars)}
    window._duel&&window._duel.report('dot',unlocked()-1,'hi');window._duel&&window._duel.report('dotS',stars.reduce((a,b)=>a+(b||0),0),'hi');
    store.set('bb.save.dot',null);
    Celebrate.run(st===3?'fireworks':'confetti','Niveau '+cur+' réussi !',()=>Celebrate.ask('★'.repeat(st)+'☆'.repeat(3-st),'Niveau '+cur+' réussi avec '+moves+' coup'+(moves>1?'s':'')+' d’avance.','Niveau suivant','Rejouer',()=>start(cur+1),()=>start(cur)))}
  function lose(){over=true;if(SIM)return;store.set('bb.save.dot',null);snd(5);Celebrate.ask('Plus de coups','Il te manquait '+missing()+'. On réessaie ?','Réessayer','Choisir un niveau',()=>start(cur),null)}
  function missing(){const G=lv.goals,out=[];for(const c in G.colors){const m=G.colors[c]-(prog.colors[c]||0);if(m>0)out.push(m+' '+CN[c])}
    if(lv.anchors&&prog.anchors<lv.anchors)out.push((lv.anchors-prog.anchors)+' ancre'+(lv.anchors-prog.anchors>1?'s':''));if(lv.ice.length&&prog.ice<lv.ice.length)out.push((lv.ice.length-prog.ice)+' glace'+(lv.ice.length-prog.ice>1?'s':''));return out.join(', ')}
  function hud(){if(SIM)return;movesEl.textContent=moves;const G=lv.goals;let h='';
    for(const c in G.colors){const left=Math.max(0,G.colors[c]-(prog.colors[c]||0));h+=`<span class="dg${left?'':' ok'}"><i style="background:${COLS[c]}"></i>${left||'✓'}</span>`}
    if(lv.anchors){const l=Math.max(0,lv.anchors-prog.anchors);h+=`<span class="dg${l?'':' ok'}">⚓ ${l||'✓'}</span>`}
    if(lv.ice.length){const l=Math.max(0,lv.ice.length-prog.ice);h+=`<span class="dg${l?'':' ok'}">❄ ${l||'✓'}</span>`}
    goalsEl.innerHTML=h}
  function fillSel(){if(SIM)return;const u=unlocked();let h='';for(let n=Math.max(u,cur);n>=1;n--)h+=`<option value="${n}">Niveau ${n}${stars[n-1]?' '+'★'.repeat(stars[n-1]):''}</option>`;lvlSel.innerHTML=h;lvlSel.value=String(cur)}

  /* ---------- Toucher ---------- */
  function cellAt(e,tol){const b=cv.getBoundingClientRect(),x=e.clientX-b.left-ox,y=e.clientY-b.top-oy,c=Math.floor(x/cell),r=Math.floor(y/cell);
    if(r<0||c<0||r>=Rw||c>=C)return-1;const dx=x-(c+.5)*cell,dy=y-(r+.5)*cell;if(Math.hypot(dx,dy)>cell*tol)return-1;return id(r,c)}
  let drag=false,pt=null;
  cv.addEventListener('pointerdown',e=>{if(state!=='idle'||over)return;const i=cellAt(e,.48);if(i<0||!g[i]||g[i].a)return;cv.setPointerCapture(e.pointerId);drag=true;path=[i];loop=false;pt=null;snd(0,1)});
  cv.addEventListener('pointermove',e=>{if(!drag)return;const b=cv.getBoundingClientRect();pt=[e.clientX-b.left,e.clientY-b.top];const i=cellAt(e,.38);if(i<0)return;const last=path[path.length-1];if(i===last)return;
    if(path.length>1&&i===path[path.length-2]){path.pop();if(loop)loop=false;snd(0,path.length);return}
    if(loop||!g[i]||g[i].a||g[i].c!==g[path[0]].c||!adj(i,last))return;
    if(path.includes(i)){if(path.length>=4){path.push(i);loop=true;snd(1)}return}
    path.push(i);snd(0,path.length)});
  const up=()=>{if(!drag)return;drag=false;pt=null;commit()};cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',()=>{drag=false;path=[];loop=false;pt=null});

  /* ---------- Dessin ---------- */
  const cx=i=>ox+(i%C+.5)*cell,cyR=r=>oy+(r+.5)*cell;
  function frame(dt){
    if(state==='fall'){let mv=false;for(let i=0;i<C*Rw;i++){const k=g[i];if(!k)continue;const r=i/C|0;if(k.y<r){k.v=(k.v||0)+dt*40;k.y=Math.min(r,k.y+k.v*dt);mv=true}else{k.y=r;k.v=0}}if(!mv)settle()}
    fx=fx.filter(f=>(f.age+=dt)<.5);if(flash&&(flash.age+=dt)>.6)flash=null;
    const k=DPR();ctx.setTransform(k,0,0,k,0,0);ctx.clearRect(0,0,W,H);
    if(flash){ctx.fillStyle=COLS[flash.c];ctx.globalAlpha=.22*(1-flash.age/.6);ctx.fillRect(0,0,W,H);ctx.globalAlpha=1}
    if(loop&&path.length){ctx.strokeStyle=COLS[g[path[0]].c];ctx.globalAlpha=.5+.2*Math.sin(performance.now()/120);ctx.lineWidth=6;ctx.strokeRect(3,3,W-6,H-6);ctx.globalAlpha=1}
    for(let i=0;i<C*Rw;i++){if(hole[i])continue;const[r,c]=RC(i);const x=ox+c*cell,y=oy+r*cell;
      if(ice[i]){ctx.fillStyle='rgba(170,220,255,.22)';ctx.strokeStyle='rgba(200,235,255,.5)';ctx.lineWidth=1.5;const p=cell*.08;ctx.beginPath();ctx.roundRect?ctx.roundRect(x+p,y+p,cell-2*p,cell-2*p,cell*.18):ctx.rect(x+p,y+p,cell-2*p,cell-2*p);ctx.fill();ctx.stroke()}
      else{ctx.fillStyle='rgba(255,255,255,.035)';ctx.beginPath();ctx.arc(x+cell/2,y+cell/2,cell*.12,0,7);ctx.fill()}}
    if(path.length){const col=COLS[g[path[0]].c];ctx.strokeStyle=col;ctx.lineWidth=cell*.16;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();
      path.forEach((i,k2)=>{const x=cx(i),y=cyR(i/C|0);k2?ctx.lineTo(x,y):ctx.moveTo(x,y)});if(pt&&!loop)ctx.lineTo(pt[0],pt[1]);ctx.stroke();ctx.lineCap='butt'}
    const t=performance.now()/1000;
    for(let i=0;i<C*Rw;i++){const k=g[i];if(!k)continue;const x=cx(i),y=oy+(k.y+.5)*cell;if(y<oy-cell*.5)continue;
      if(k.a){ctx.save();ctx.translate(x,y);ctx.fillStyle='#c9d2f0';ctx.strokeStyle='#5b6596';ctx.lineWidth=2;const s=cell*.3;
        ctx.beginPath();ctx.arc(0,-s*.75,s*.22,0,7);ctx.stroke();ctx.beginPath();ctx.moveTo(0,-s*.55);ctx.lineTo(0,s*.75);ctx.stroke();ctx.beginPath();ctx.moveTo(-s*.45,-s*.2);ctx.lineTo(s*.45,-s*.2);ctx.stroke();
        ctx.beginPath();ctx.arc(0,s*.15,s*.62,.25,Math.PI-.25);ctx.lineWidth=3;ctx.strokeStyle='#c9d2f0';ctx.stroke();ctx.restore();continue}
      const inP=path.includes(i),sel=inP||(loop&&k.c===g[path[0]].c);const rad=cell*(sel?.3+.03*Math.sin(t*10):.27);
      ctx.fillStyle=COLS[k.c];ctx.beginPath();ctx.arc(x,y,rad,0,7);ctx.fill();
      ctx.fillStyle='rgba(255,255,255,.28)';ctx.beginPath();ctx.arc(x-rad*.3,y-rad*.32,rad*.32,0,7);ctx.fill()}
    fx.forEach(f=>{if(f.age<0)return;if(f.t==='pop'){const x=cx(f.i),y=cyR(f.i/C|0),a=1-f.age/.5;ctx.strokeStyle=COLS[f.c];ctx.globalAlpha=a;ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,cell*(.27+f.age*.7),0,7);ctx.stroke();
        ctx.fillStyle=COLS[f.c];ctx.beginPath();ctx.arc(x,y,cell*.27*Math.max(0,1-f.age*4),0,7);ctx.fill();ctx.globalAlpha=1}
      else if(f.t==='anc'){const x=cx(f.i),y=cyR(f.i/C|0)+f.age*cell*1.5;ctx.globalAlpha=1-f.age/.5;ctx.fillStyle='#c9d2f0';ctx.font='700 '+Math.round(cell*.5)+'px Fredoka, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('⚓',x,y);ctx.globalAlpha=1}})}
  function resize(){const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;W=w;H=h;cell=Math.floor(Math.min((w-10)/C,(h-10)/Rw));ox=Math.floor((w-cell*C)/2);oy=Math.floor((h-cell*Rw)/2);
    cv.style.width=W+'px';cv.style.height=H+'px';cv.width=Math.round(W*DPR());cv.height=Math.round(H*DPR())}
  new ResizeObserver(resize).observe(stage);
  let AC=null;
  function snd(k,n=1){if(SIM||store.get('bb.mute',false))return;try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();const t0=AC.currentTime;
    const notes=k===0?[[330*Math.pow(2,Math.min(n,14)/12),0]]:k===1?[[660,0],[880,.06]]:k===2?[[520,0],[700,.05]]:k===3?[[523,0],[659,.06],[784,.12],[1047,.18]]:k===4?[[392,0],[523,.08]]:[[260,0],[200,.15]];
    notes.forEach(([f,d])=>{const o=AC.createOscillator(),v=AC.createGain(),s=t0+d;o.type='sine';o.frequency.value=f;v.gain.setValueAtTime(.0001,s);v.gain.exponentialRampToValueAtTime(.09,s+.008);v.gain.exponentialRampToValueAtTime(.0001,s+.16);o.connect(v).connect(AC.destination);o.start(s);o.stop(s+.2)})}catch(e){}}
  lvlSel.onchange=()=>{const n=+lvlSel.value;lvlSel.blur();start(n)};
  $('#dot-new').onclick=()=>{if(over||moves===lv.moves){start(cur);return}Celebrate.ask('Recommencer le niveau ?','Le niveau repart de zéro.','Recommencer','Continuer',()=>start(cur),null)};
  function save(){if(over)return null;if(state!=='idle'||drag)return undefined;if(moves===lv.moves)return null;return{n:cur,g:g.map(k=>k?(k.a?{a:1}:{c:k.c}):null),ice,moves,prog,anchorsOut}}
  function load(o){if(!(o.n>=1&&o.n<=unlocked())||!Array.isArray(o.g)||o.g.length!==C*Rw)return;cur=o.n;lv=genLevel(o.n);hole=new Array(C*Rw).fill(false);lv.holes.forEach(i=>hole[i]=true);
    g=o.g.map((k,i)=>k?{...k,y:i/C|0}:null);ice=o.ice;moves=o.moves;prog=o.prog;anchorsOut=o.anchorsOut||0;over=false;path=[];loop=false;fx=[];state='idle';hud();fillSel()}
  start(cur);
  return{frame,resize,save,load,pause(){},resume(){},sub:()=>'Niveau '+unlocked()+' · ★ '+stars.reduce((a,b)=>a+(b||0),0)}
})();
