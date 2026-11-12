/* ================= DAMES (internationales 10×10) ================= */
const Dames=(()=>{
  const cv=$('#dam-cv'),ctx=cv.getContext('2d'),stage=$('#dam-stage'),modeSel=$('#dam-mode'),stEl=$('#dam-status'),undoBtn=$('#dam-undo');
  const N=10,DIRS=[[-1,-1],[-1,1],[1,-1],[1,1]],LVN=['Facile','Moyen','Difficile'];
  let mode=store.get('bb.damMode',1);if(!(mode>=0&&mode<=3))mode=1;
  let b,turn,quiet,hist,over,winner,legal,sel=-1,partial=[],thinking=false,anim=null,lastMv=null,W=300,H=300,cell=30,ox=0,oy=0,fx=[];
  const on=(r,c)=>r>=0&&c>=0&&r<N&&c<N;
  const vsCpu=()=>mode<3;

  /* ---------- Règles ---------- */
  function capFrom(B,from,king,s,cur,caps,path,out){const r=cur/10|0,c=cur%10;let ext=false;
    for(const[dr,dc]of DIRS){
      if(!king){const r2=r+2*dr,c2=c+2*dc;if(!on(r2,c2))continue;const j1=(r+dr)*10+c+dc,j2=r2*10+c2;
        if(B[j1]*s<0&&!caps.includes(j1)&&(B[j2]===0||j2===from)){ext=true;capFrom(B,from,king,s,j2,[...caps,j1],[...path,j2],out)}}
      else{let rr=r+dr,cc=c+dc;while(on(rr,cc)&&(B[rr*10+cc]===0||rr*10+cc===from)){rr+=dr;cc+=dc}
        if(!on(rr,cc))continue;const j1=rr*10+cc;if(B[j1]*s>=0||caps.includes(j1))continue;
        rr+=dr;cc+=dc;while(on(rr,cc)&&(B[rr*10+cc]===0||rr*10+cc===from)){ext=true;const j2=rr*10+cc;capFrom(B,from,king,s,j2,[...caps,j1],[...path,j2],out);rr+=dr;cc+=dc}}}
    if(!ext&&caps.length)out.push({from,path,caps})}
  function gen(B,s){let caps=[],max=0;
    for(let i=0;i<100;i++){const p=B[i];if(p*s<=0)continue;const f=[];capFrom(B,i,Math.abs(p)===2,s,i,[],[i],f);
      for(const m of f){if(m.caps.length>max){max=m.caps.length;caps=[m]}else if(m.caps.length===max)caps.push(m)}}
    let mv;
    if(max){const seen=new Set();mv=caps.filter(m=>{const k=m.path.join(',')+'|'+[...m.caps].sort().join(',');if(seen.has(k))return false;seen.add(k);return true})}
    else{mv=[];for(let i=0;i<100;i++){const p=B[i];if(p*s<=0)continue;const r=i/10|0,c=i%10;
        if(Math.abs(p)===2){for(const[dr,dc]of DIRS){let rr=r+dr,cc=c+dc;while(on(rr,cc)&&B[rr*10+cc]===0){mv.push({from:i,path:[i,rr*10+cc],caps:[]});rr+=dr;cc+=dc}}}
        else{const dr=s===1?-1:1;for(const dc of[-1,1]){const rr=r+dr,cc=c+dc;if(on(rr,cc)&&B[rr*10+cc]===0)mv.push({from:i,path:[i,rr*10+cc],caps:[]})}}}}
    for(const m of mv){const to=m.path[m.path.length-1],tr=to/10|0;m.to=to;m.promo=Math.abs(B[m.from])===1&&(s===1?tr===0:tr===9)}
    return mv}
  function apply(B,m){const n=B.slice(),p=n[m.from],s=Math.sign(p);n[m.from]=0;for(const j of m.caps)n[j]=0;n[m.to]=m.promo?2*s:p;return n}

  /* ---------- Ordinateur ---------- */
  function evalB(B){let v=0,wm=0,bm=0;
    for(let i=0;i<100;i++){const p=B[i];if(!p)continue;const r=i/10|0,c=i%10,ctr=(c>=2&&c<=7?3:0)+(r>=3&&r<=6?2:0);
      if(p===1){wm++;v+=100+(9-r)*2.5+ctr+(r===9?5:0)}else if(p===-1){bm++;v-=100+r*2.5+ctr+(r===0?5:0)}
      else if(p===2)v+=310;else v-=310}
    return v}
  let deadline=Infinity,nodes=0;
  function order(B,ms){return ms.sort((a,b)=>(b.caps.length-a.caps.length)||((b.promo?1:0)-(a.promo?1:0)))}
  function nega(B,s,d,al,be,ply){if((++nodes&1023)===0&&performance.now()>deadline)throw 'time';
    const ms=gen(B,s);if(!ms.length)return -100000+ply;
    if(d<=0&&(!ms[0].caps.length||ply>d+14))return s*evalB(B);
    let best=-Infinity;for(const m of order(B,ms)){const v=-nega(apply(B,m),-s,d-1,-be,-al,ply+1);if(v>best)best=v;if(v>al)al=v;if(al>=be)break}
    return best}
  function rootScores(B,s,d){const ms=order(B,gen(B,s));return ms.map(m=>({m,v:-nega(apply(B,m),-s,d-1,-Infinity,Infinity,1)}))}
  function aiPick(){const s=turn,ms=gen(b,s);if(ms.length===1)return ms[0];nodes=0;
    if(mode===0){deadline=performance.now()+400;let sc;try{sc=rootScores(b,s,2)}catch(e){return ms[rnd(ms.length)]}
      sc.sort((a,c)=>c.v-a.v);if(Math.random()<.3)return sc[rnd(sc.length)].m;const ok=sc.filter(x=>x.v>=sc[0].v-60);return ok[rnd(ok.length)].m}
    if(mode===1){deadline=performance.now()+900;let sc;try{sc=rootScores(b,s,4)}catch(e){try{sc=rootScores(b,s,2)}catch(e2){return ms[rnd(ms.length)]}}
      sc.sort((a,c)=>c.v-a.v);const ok=sc.filter(x=>x.v>=sc[0].v-8);return ok[rnd(ok.length)].m}
    deadline=performance.now()+1300;let best=null;
    for(let d=2;d<=12;d++){try{const sc=rootScores(b,s,d);sc.sort((a,c)=>c.v-a.v);const ok=sc.filter(x=>x.v>=sc[0].v-2);best=ok[rnd(ok.length)].m;if(sc[0].v>50000)break}catch(e){break}}
    return best||ms[0]}

  /* ---------- Partie ---------- */
  function newGame(){b=new Array(100).fill(0);for(let i=0;i<100;i++){const r=i/10|0,c=i%10;if((r+c)%2===1){if(r<=3)b[i]=-1;else if(r>=6)b[i]=1}}
    turn=1;quiet=0;hist=[];over=false;winner=0;sel=-1;partial=[];thinking=false;anim=null;lastMv=null;fx=[];startTurn()}
  function startTurn(){legal=gen(b,turn);sel=-1;partial=[];
    if(!legal.length){end(-turn);return}
    if(quiet>=50){end(0);return}
    ui();if(vsCpu()&&turn===-1){thinking=true;ui();setTimeout(()=>{if(!thinking)return;const m=aiPick();thinking=false;play(m)},350)}}
  function play(m){hist.push({b:b.slice(),turn,quiet,lastMv});if(hist.length>80)hist.shift();
    anim={m,t:0,dur:Math.max(.22,(m.path.length-1)*.2)};snd(m.caps.length?2:1);ui()}
  function finishMove(m){const man=Math.abs(b[m.from])===1;b=apply(b,m);quiet=(m.caps.length||man)?0:quiet+1;lastMv=m;
    m.caps.forEach(j=>fx.push({i:j,age:0}));if(m.promo)snd(3);turn=-turn;startTurn()}
  function end(w){over=true;winner=w;sel=-1;ui();
    if(w===0){Celebrate.ask('Partie nulle','25 coups de dames sans prise : match nul. On rejoue ?','Rejouer','Revoir le jeu',newGame,null);return}
    if(vsCpu()){if(w===1){const k='bb.damWins',a=store.get(k,[0,0,0]);a[mode]=(a[mode]||0)+1;store.set(k,a);window._duel&&window._duel.report('dam'+mode,1,'inc');
        Celebrate.run('fireworks','Gagné !!',()=>Celebrate.ask('Victoire !','Tu as battu l’ordinateur (niveau '+LVN[mode].toLowerCase()+'). On rejoue ?','Rejouer','Revoir le jeu',newGame,null))}
      else setTimeout(()=>Celebrate.ask('Perdu','L’ordinateur a gagné cette fois. Une revanche ?','Revanche','Revoir le jeu',newGame,null),600)}
    else Celebrate.run('confetti',(w===1?'Blancs':'Noirs')+' gagnent !',()=>Celebrate.ask((w===1?'Les blancs':'Les noirs')+' ont gagné !','Une autre partie ?','Rejouer','Revoir le jeu',newGame,null))}
  function undo(){if(anim||over&&!hist.length)return;thinking=false;
    if(vsCpu()){while(hist.length){const h=hist.pop();b=h.b;turn=h.turn;quiet=h.quiet;lastMv=h.lastMv;if(turn===1)break}}
    else if(hist.length){const h=hist.pop();b=h.b;turn=h.turn;quiet=h.quiet;lastMv=h.lastMv}
    over=false;winner=0;fx=[];startTurn()}
  function ui(){const caps=legal&&legal.length&&legal[0].caps.length;
    let t;if(over)t=winner===0?'Partie nulle':vsCpu()?(winner===1?'Tu as gagné !':'L’ordinateur a gagné'):(winner===1?'Les blancs ont gagné':'Les noirs ont gagné');
    else if(thinking||anim&&vsCpu()&&turn===-1)t='L’ordinateur réfléchit…';
    else if(vsCpu())t=caps?'À toi · prise obligatoire'+(caps>1?' (la plus grande : '+caps+' pions)':''):'À toi de jouer';
    else t=(turn===1?'Blancs':'Noirs')+' à jouer'+(caps?' · prise obligatoire':'');
    stEl.textContent=t;undoBtn.disabled=!hist.length;
    const cnt=s=>b.filter(p=>p*s>0).length;$('#dam-w').textContent=cnt(1);$('#dam-b').textContent=cnt(-1)}

  /* ---------- Toucher ---------- */
  const cands=()=>legal.filter(m=>m.from===sel&&partial.every((q,k)=>m.path[k]===q));
  const nextSq=()=>[...new Set(cands().map(m=>m.path[partial.length]).filter(x=>x!=null))];
  function tap(i){if(over||anim||thinking||(vsCpu()&&turn===-1))return;
    if(sel>=0&&nextSq().includes(i)){partial.push(i);const cs=cands();const done=cs.find(m=>m.path.length===partial.length);
      if(done&&cs.every(m=>m.path.length===partial.length)){sel=-1;partial=[];play(done)}else snd(0);return}
    if(b[i]*turn>0&&legal.some(m=>m.from===i)){sel=i;partial=[i];snd(0);return}
    if(b[i]*turn>0&&legal.length){shake=performance.now()}
    sel=-1;partial=[]}
  let shake=0;
  cv.addEventListener('pointerdown',e=>{const r=cv.getBoundingClientRect(),c=Math.floor((e.clientX-r.left-ox)/cell),rw=Math.floor((e.clientY-r.top-oy)/cell);if(on(rw,c))tap(rw*10+c)});

  /* ---------- Dessin ---------- */
  const xy=i=>[ox+(i%10)*cell+cell/2,oy+(i/10|0)*cell+cell/2];
  function piece(x,y,p,a=1,sc=1){const s=Math.sign(p),r=cell*.4*sc;ctx.globalAlpha=a;
    const disc=(yy)=>{const g=ctx.createRadialGradient(x-r*.3,yy-r*.35,r*.1,x,yy,r);
      if(s>0){g.addColorStop(0,'#fffaf0');g.addColorStop(.7,'#efe2c6');g.addColorStop(1,'#bba77f')}else{g.addColorStop(0,'#6b5a52');g.addColorStop(.6,'#2b211d');g.addColorStop(1,'#120c0a')}
      ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.arc(x+r*.06,yy+r*.12,r,0,7);ctx.fill();
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,yy,r,0,7);ctx.fill();
      ctx.strokeStyle=s>0?'rgba(140,110,60,.55)':'rgba(255,255,255,.18)';ctx.lineWidth=Math.max(1,r*.09);ctx.beginPath();ctx.arc(x,yy,r*.66,0,7);ctx.stroke();ctx.beginPath();ctx.arc(x,yy,r*.36,0,7);ctx.stroke()};
    disc(y);if(Math.abs(p)===2){disc(y-r*.28);const cy=y-r*.3,w=r*.62,h=r*.42;ctx.fillStyle='#ffc54d';ctx.strokeStyle='#8a5a00';ctx.lineWidth=1;ctx.beginPath();
      ctx.moveTo(x-w/2,cy+h/2);ctx.lineTo(x-w/2,cy-h/3);ctx.lineTo(x-w/4,cy);ctx.lineTo(x,cy-h/2);ctx.lineTo(x+w/4,cy);ctx.lineTo(x+w/2,cy-h/3);ctx.lineTo(x+w/2,cy+h/2);ctx.closePath();ctx.fill();ctx.stroke()}
    ctx.globalAlpha=1}
  function frame(dt){const k=DPR();ctx.setTransform(k,0,0,k,0,0);ctx.clearRect(0,0,W,H);
    if(anim){anim.t+=dt;if(anim.t>=anim.dur){const m=anim.m;anim=null;finishMove(m)}}
    fx=fx.filter(f=>(f.age+=dt)<.45);
    const S=cell*10;ctx.fillStyle='#5a3a22';ctx.fillRect(ox-6,oy-6,S+12,S+12);
    for(let r=0;r<N;r++)for(let c=0;c<N;c++){const i=r*10+c;ctx.fillStyle=(r+c)%2?'#9b6a43':'#ecd6ad';ctx.fillRect(ox+c*cell,oy+r*cell,cell,cell);
      if(lastMv&&(i===lastMv.from||i===lastMv.to)&&(r+c)%2){ctx.fillStyle='rgba(255,214,90,.28)';ctx.fillRect(ox+c*cell,oy+r*cell,cell,cell)}}
    const myTurn=!over&&!anim&&!thinking&&!(vsCpu()&&turn===-1);
    if(myTurn&&sel<0){const fr=new Set(legal.map(m=>m.from));const pulse=.45+.25*Math.sin(performance.now()/260);
      fr.forEach(i=>{const[x,y]=xy(i);ctx.strokeStyle=legal[0].caps.length?'rgba(255,120,90,'+pulse+')':'rgba(120,200,255,'+(pulse*.6)+')';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,cell*.46,0,7);ctx.stroke()})}
    for(let i=0;i<100;i++){const p=b[i];if(!p)continue;if(anim&&i===anim.m.from)continue;
      let a=1;if(anim&&anim.m.caps.includes(i)){const k2=anim.m.caps.indexOf(i),steps=anim.m.path.length-1,tp=(k2+1)/steps*anim.dur;if(anim.t>tp-.05)a=Math.max(.15,1-(anim.t-tp+.05)/.2)}
      const[x,y]=xy(i);piece(x,y,p,a)}
    fx.forEach(f=>{const[x,y]=xy(f.i);ctx.strokeStyle='rgba(255,220,120,'+(1-f.age/.45)+')';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,cell*(.3+f.age),0,7);ctx.stroke()});
    if(sel>=0){const path=partial.map(xy);ctx.strokeStyle='rgba(255,197,77,.9)';ctx.lineWidth=3;ctx.beginPath();path.forEach(([x,y],k)=>k?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();
      const[x,y]=xy(sel);ctx.strokeStyle='#ffc54d';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,cell*.46,0,7);ctx.stroke();
      if(partial.length>1){const[x2,y2]=xy(partial[partial.length-1]);piece(x2,y2,b[sel],.55)}
      nextSq().forEach(j=>{const[x2,y2]=xy(j);ctx.fillStyle='rgba(255,197,77,.85)';ctx.beginPath();ctx.arc(x2,y2,cell*.16,0,7);ctx.fill()})}
    if(anim){const m=anim.m,steps=m.path.length-1,u=Math.min(1,anim.t/anim.dur)*steps,k2=Math.min(steps-1,Math.floor(u)),f=u-k2,e=f<.5?2*f*f:1-Math.pow(-2*f+2,2)/2;
      const[x1,y1]=xy(m.path[k2]),[x2,y2]=xy(m.path[k2+1]);piece(x1+(x2-x1)*e,y1+(y2-y1)*e-Math.sin(e*Math.PI)*cell*.25,b[m.from],1,1+Math.sin(e*Math.PI)*.08)}
    if(shake&&performance.now()-shake<500){ctx.fillStyle='rgba(255,90,90,.12)';ctx.fillRect(ox,oy,S,S)}}
  function resize(){const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;W=w;H=h;cell=Math.floor(Math.min(w-14,h-14)/10);ox=Math.floor((w-cell*10)/2);oy=Math.floor((h-cell*10)/2);
    cv.style.width=W+'px';cv.style.height=H+'px';cv.width=Math.round(W*DPR());cv.height=Math.round(H*DPR())}
  new ResizeObserver(resize).observe(stage);

  /* ---------- Son ---------- */
  let AC=null;
  function snd(k){if(store.get('bb.mute',false))return;try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();const t=AC.currentTime;
    const o=AC.createOscillator(),v=AC.createGain(),f=AC.createBiquadFilter();f.type='lowpass';f.frequency.value=k===3?3000:1400;
    o.type=k===3?'triangle':'square';o.frequency.setValueAtTime(k===0?700:k===2?260:k===3?660:330,t);if(k===3)o.frequency.exponentialRampToValueAtTime(1320,t+.25);
    v.gain.setValueAtTime(.0001,t);v.gain.exponentialRampToValueAtTime(k===0?.04:.12,t+.004);v.gain.exponentialRampToValueAtTime(.0001,t+(k===3?.3:.08));
    o.connect(f).connect(v).connect(AC.destination);o.start(t);o.stop(t+.32)}catch(e){}}

  modeSel.value=String(mode);modeSel.onchange=()=>{mode=+modeSel.value;store.set('bb.damMode',mode);modeSel.blur();newGame()};
  $('#dam-new').onclick=()=>{if(over||!hist.length){newGame();return}Celebrate.ask('Nouvelle partie ?','La partie en cours sera abandonnée.','Nouvelle partie','Continuer',newGame,null)};
  undoBtn.onclick=undo;
  function save(){if(over)return null;if(anim||thinking)return undefined;if(!hist.length)return null;return{mode,b,turn,quiet,hist:hist.slice(-40),lastMv}}
  function load(o){if(!Array.isArray(o.b)||o.b.length!==100||!(o.mode>=0&&o.mode<=3))return;mode=o.mode;modeSel.value=String(mode);store.set('bb.damMode',mode);
    b=o.b;turn=o.turn===-1?-1:1;quiet=o.quiet||0;hist=o.hist||[];lastMv=o.lastMv||null;over=false;winner=0;anim=null;thinking=false;fx=[];startTurn()}
  newGame();
  return{frame,resize,save,load,pause(){},resume(){if(!over&&vsCpu()&&turn===-1&&!thinking&&!anim)startTurn()},
    sub:()=>{const w=store.get('bb.damWins',[0,0,0]);return mode<3?LVN[mode]+' · '+(w[mode]||0)+' victoire'+((w[mode]||0)>1?'s':''):'À deux'}}
})();
