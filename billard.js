/* ================= BILLARD (8 billes) ================= */
const Pool=(()=>{
  const cv=$('#bil-cv'),ctx=cv.getContext('2d'),stage=$('#bil-stage'),modeSel=$('#bil-mode'),stEl=$('#bil-status'),pw=$('#bil-pow'),pwFill=$('#bil-powfill');
  const TW=500,TH=1000,R=11.5,RAIL=30,FR=60,DR=.9,EB=.95,EC=.75,VMAX=2600,DT=1/600;
  const LVN=['Facile','Moyen','Difficile'];
  const COL=['#ffffff','#f5c518','#2f5fd8','#d8342f','#7b3fb8','#f07c1e','#1f9a4c','#8a2b2b','#151515'];
  const colOf=n=>COL[n>8?n-8:n];
  const POCK=[[0,0,2.1*R],[TW,0,2.1*R],[0,TH,2.1*R],[TW,TH,2.1*R],[-.6*R,TH/2,1.75*R],[TW+.6*R,TH/2,1.75*R]];
  let mode=store.get('bb.bilMode',1);if(!(mode>=0&&mode<=3))mode=1;
  let balls,turn,groups,bih,kitchen,shotNo,phase,ang=-Math.PI/2,power=0,shot=null,over=false,winner=0,acc=0,cpuT=null,cpuPlan=null,msg='',msgT=0;
  let W=300,H=300,sc=.3,offX=0,offY=0,drag=null,fx=[];
  const vsCpu=()=>mode<3;
  const grp=n=>n===0||n===8?null:n<8?'S':'T';
  const GN={S:'pleines',T:'rayées'};
  const names=()=>vsCpu()?['Toi','Ordi']:[Duel.me()||'Joueur 1',(['Chris','Blanca'].find(p=>p!==Duel.me()))||'Joueur 2'];
  const cpuTurn=()=>vsCpu()&&turn===2;

  /* ---------- Mise en place ---------- */
  function rack(){const B=[{n:0,x:TW/2,y:TH*.78,vx:0,vy:0,in:false}];
    const sol=[2,3,4,5,6,7],str=[9,10,11,12,13,14,15];for(const a of[sol,str])for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]]}
    const pos=[];for(let r=0;r<5;r++)for(let j=0;j<=r;j++)pos.push([TW/2+(j-r/2)*(2*R+.3),TH*.25-r*(2*R+.3)*.866,r,j]);
    const order=new Array(15);order[0]=1;order[4]=8;
    const sCorner=Math.random()<.5;order[10]=sCorner?sol.pop():str.pop();order[14]=sCorner?str.pop():sol.pop();
    const rest=[...sol,...str];for(let i=rest.length-1;i>0;i--){const j=rnd(i+1);[rest[i],rest[j]]=[rest[j],rest[i]]}
    for(let k=0;k<15;k++)if(order[k]==null)order[k]=rest.pop();
    pos.forEach(([x,y],k)=>B.push({n:order[k],x,y,vx:0,vy:0,in:false}));return B}
  function newGame(){balls=rack();turn=1;groups={1:null,2:null};bih=true;kitchen=true;shotNo=0;phase='aim';ang=-Math.PI/2;power=0;shot=null;over=false;winner=0;
    fx=[];clearTimeout(cpuT);cpuPlan=null;say('');beginTurn()}
  const cue=()=>balls[0];
  const left=g=>balls.filter(b=>!b.in&&grp(b.n)===g).length;

  /* ---------- Physique ---------- */
  function gapY(y){return y<1.9*R||y>TH-1.9*R||Math.abs(y-TH/2)<1.5*R}
  function gapX(x){return x<1.9*R||x>TW-1.9*R}
  function step(B,ev){
    for(const b of B){if(b.in)continue;const sp=Math.hypot(b.vx,b.vy);if(sp>0){const d=(FR+sp*DR)*DT;if(d>=sp){b.vx=b.vy=0}else{const k=(sp-d)/sp;b.vx*=k;b.vy*=k}b.x+=b.vx*DT;b.y+=b.vy*DT}}
    for(let i=0;i<B.length;i++){const a=B[i];if(a.in)continue;for(let j=i+1;j<B.length;j++){const c=B[j];if(c.in)continue;
      const dx=c.x-a.x,dy=c.y-a.y,d2=dx*dx+dy*dy;if(d2>=4*R*R||d2===0)continue;const d=Math.sqrt(d2),nx=dx/d,ny=dy/d,ov=(2*R-d)/2;
      a.x-=nx*ov;a.y-=ny*ov;c.x+=nx*ov;c.y+=ny*ov;const vr=(a.vx-c.vx)*nx+(a.vy-c.vy)*ny;if(vr<=0)continue;const jj=(1+EB)/2*vr;
      a.vx-=jj*nx;a.vy-=jj*ny;c.vx+=jj*nx;c.vy+=jj*ny;ev&&ev.hit(a,c,vr)}}
    for(const b of B){if(b.in)continue;
      for(const[px,py,pr]of POCK)if((b.x-px)**2+(b.y-py)**2<pr*pr){b.in=true;b.vx=b.vy=0;b.px=px;b.py=py;ev&&ev.pot(b);break}
      if(b.in)continue;
      if(b.x<R&&!gapY(b.y)){b.x=R;if(b.vx<0){ev&&ev.rail(b,-b.vx);b.vx=-b.vx*EC;b.vy*=.97}}
      if(b.x>TW-R&&!gapY(b.y)){b.x=TW-R;if(b.vx>0){ev&&ev.rail(b,b.vx);b.vx=-b.vx*EC;b.vy*=.97}}
      if(b.y<R&&!gapX(b.x)){b.y=R;if(b.vy<0){ev&&ev.rail(b,-b.vy);b.vy=-b.vy*EC;b.vx*=.97}}
      if(b.y>TH-R&&!gapX(b.x)){b.y=TH-R;if(b.vy>0){ev&&ev.rail(b,b.vy);b.vy=-b.vy*EC;b.vx*=.97}}
      if(b.x<-2*R||b.x>TW+2*R||b.y<-2*R||b.y>TH+2*R){let best=POCK[0],bd=1e9;for(const p of POCK){const d=(b.x-p[0])**2+(b.y-p[1])**2;if(d<bd){bd=d;best=p}}
        b.in=true;b.vx=b.vy=0;b.px=best[0];b.py=best[1];ev&&ev.pot(b)}}
    let mv=false;for(const b of B)if(!b.in&&(b.vx||b.vy)){if(Math.abs(b.vx)+Math.abs(b.vy)<3){b.vx=b.vy=0}else mv=true}
    return mv}

  /* ---------- Tir et règles ---------- */
  function shoot(a,p){if(phase!=='aim'||over)return;const v=Math.max(.04,p)*VMAX;const c=cue();c.vx=Math.cos(a)*v;c.vy=Math.sin(a)*v;
    shot={first:null,pot:[],rails:0,start:{own:groups[turn]?left(groups[turn]):-1}};phase='moving';bih=false;kitchen=false;power=0;pwFill.style.width='0%';snd('cue',p);say('')}
  const EV={hit(a,c,vr){if(shot&&shot.first==null){if(a.n===0)shot.first=c.n;else if(c.n===0)shot.first=a.n}snd('ball',Math.min(1,vr/1500))},
    rail(b,v){if(shot)shot.rails++;if(v>120)snd('rail',Math.min(1,v/1500))},
    pot(b){if(shot)shot.pot.push(b.n);fx.push({x:b.px,y:b.py,age:0,c:colOf(b.n)});snd('pot')}};
  function resolve(){const me=turn,op=3-turn,g=groups[me],pot=shot.pot,brk=shotNo===0;shotNo++;
    let foul='';const cueIn=pot.includes(0);
    if(cueIn)foul='Bille blanche empochée';else if(shot.first==null)foul='Aucune bille touchée';
    else if(!brk){if(g){if(shot.start.own>0?grp(shot.first)!==g:shot.first!==8)foul='Mauvaise bille touchée en premier'}else if(shot.first===8)foul='La noire touchée en premier'}
    if(pot.includes(8)){
      if(brk){const e=balls.find(b=>b.n===8);e.in=false;spot(e,TW/2,TH*.25)}
      else{const ok=g&&shot.start.own===0&&!foul;return finish(ok?me:op,ok?'':(foul?foul+' en empochant la noire':'Noire empochée trop tôt'))}}
    if(!g&&!brk&&!foul){const f=pot.find(n=>n!==0&&n!==8);if(f!=null){groups[me]=grp(f);groups[op]=grp(f)==='S'?'T':'S';say(names()[me-1]+' : '+GN[groups[me]])}}
    if(cueIn){const c=cue();c.in=false;spot(c,TW/2,TH*.78)}
    let keep=false;if(!foul){const mg=groups[me];keep=pot.some(n=>n!==0&&n!==8&&(!mg||grp(n)===mg))}
    if(foul){turn=op;bih=true;say('Faute : '+foul.toLowerCase()+'. Bille en main pour '+names()[op-1]+'.')}
    else if(!keep)turn=op;
    shot=null;phase='aim';beginTurn()}
  function spot(b,x,y){b.vx=b.vy=0;for(let k=0;k<200;k++){const yy=y+(k%2?1:-1)*Math.ceil(k/2)*2.2*R*(k>40?.5:1),xx=k>40?x+(rnd(9)-4)*2.2*R:x;
      if(free(xx,yy,b)){b.x=xx;b.y=yy;return}}b.x=x;b.y=y}
  function free(x,y,self){if(x<R||x>TW-R||y<R||y>TH-R)return false;return balls.every(o=>o===self||o.in||(o.x-x)**2+(o.y-y)**2>=4*R*R*1.01)}
  function finish(w,why){over=true;winner=w;phase='over';shot=null;ui();const N=names();
    if(vsCpu()){if(w===1){const a=store.get('bb.bilWins',[0,0,0]);a[mode]=(a[mode]||0)+1;store.set('bb.bilWins',a);window._duel&&window._duel.report('bil'+mode,1,'inc');
        Celebrate.run('fireworks','Gagné !!',()=>Celebrate.ask('Victoire !',(why?why+'. ':'')+'Tu as battu l’ordinateur (niveau '+LVN[mode].toLowerCase()+'). On rejoue ?','Rejouer','Revoir la table',newGame,null))}
      else setTimeout(()=>Celebrate.ask('Perdu',(why?why+'. ':'L’ordinateur a empoché la noire. ')+'Une revanche ?','Revanche','Revoir la table',newGame,null),500)}
    else Celebrate.run('confetti',N[w-1]+' gagne !',()=>Celebrate.ask(N[w-1]+' a gagné !',(why?why+'. ':'')+'Une autre partie ?','Rejouer','Revoir la table',newGame,null))}
  function beginTurn(){ui();if(cpuTurn()&&!over){phase='cpu';cpuT=setTimeout(cpuThink,500)}}
  function say(t){msg=t;msgT=performance.now();ui()}

  /* ---------- Ordinateur ---------- */
  const solveV=(D,v1)=>{let lo=v1,hi=VMAX*1.5;for(let k=0;k<40;k++){const v0=(lo+hi)/2,d=(v0-v1)/DR-(FR/(DR*DR))*Math.log((FR+DR*v0)/(FR+DR*v1));if(d<D)lo=v0;else hi=v0}return(lo+hi)/2};
  function clearPath(ax,ay,bx,by,skip){const dx=bx-ax,dy=by-ay,L2=dx*dx+dy*dy||1;
    return balls.every(o=>{if(o.in||skip.includes(o))return true;let t=((o.x-ax)*dx+(o.y-ay)*dy)/L2;t=Math.max(0,Math.min(1,t));return(o.x-ax-dx*t)**2+(o.y-ay-dy*t)**2>=(2*R-.5)**2})}
  function targets(){const g=groups[turn];if(g)return left(g)?balls.filter(b=>!b.in&&grp(b.n)===g):balls.filter(b=>!b.in&&b.n===8);return balls.filter(b=>!b.in&&b.n!==0&&b.n!==8)}
  function candidates(cx,cy){const c=cue(),out=[];
    for(const t of targets())for(const[px,py]of POCK){let dx=px-t.x,dy=py-t.y;const L2=Math.hypot(dx,dy);dx/=L2;dy/=L2;
      if(py===TH/2&&Math.abs(dx)<.55)continue;
      const gx=t.x-dx*2*R,gy=t.y-dy*2*R;let ax=gx-cx,ay=gy-cy;const L1=Math.hypot(ax,ay);if(L1<1)continue;ax/=L1;ay/=L1;
      const cosc=ax*dx+ay*dy;if(cosc<.3)continue;
      if(!clearPath(cx,cy,gx,gy,[c,t])||!clearPath(t.x,t.y,px,py,[t,c]))continue;
      const vo=solveV(L2,90),vi=vo/(cosc*(1+EB)/2),v0=Math.min(VMAX,solveV(L1,vi)*1.12);
      out.push({a:Math.atan2(ay,ax),p:v0/VMAX,s:cosc*2-L1/1400-L2/1600-(v0>VMAX*.95?1:0),t})}
    return out.sort((a,b)=>b.s-a.s)}
  function simulate(a,p){const save=balls.map(b=>({...b}));const c=balls[0];const v=p*VMAX;c.vx=Math.cos(a)*v;c.vy=Math.sin(a)*v;
    const res={first:null,pot:[]};const ev={hit(x,y){if(res.first==null){if(x.n===0)res.first=y.n;else if(y.n===0)res.first=x.n}},rail(){},pot(b){res.pot.push(b.n)}};
    for(let k=0;k<6000&&step(balls,ev);k++);balls=save;return res}
  function cpuThink(){if(over||!cpuTurn())return;const c=cue();let plan=null;
    if(shotNo===0){if(bih){c.x=TW/2+(rnd(41)-20);c.y=TH*.8}const ap=balls.find(b=>b.n===1);plan={a:Math.atan2(ap.y-c.y,ap.x-c.x)+(Math.random()-.5)*.012,p:.9+Math.random()*.08}}
    else{const noise=[.045,.016,.006][mode];
      if(bih){let best=null;for(let i=0;i<7;i++)for(let j=0;j<14;j++){const x=R*2+i*(TW-4*R)/6,y=R*2+j*(TH-4*R)/13;if(!free(x,y,c))continue;const cs=candidates(x,y);
          const s=cs.length?cs[0].s+(mode===0?Math.random()*1.5:0):-9;if(!best||s>best.s)best={x,y,s}}
        if(best){c.x=best.x;c.y=best.y}}
      let cs=candidates(c.x,c.y);
      if(mode===2&&cs.length){const g=groups[turn];for(const k of cs.slice(0,6)){const r=simulate(k.a,k.p);const own=r.pot.filter(n=>n!==0&&(n===8?k.t.n===8:(!g||grp(n)===g)));
          if(own.length&&!r.pot.includes(0)&&r.first===k.t.n&&!(r.pot.includes(8)&&k.t.n!==8)){plan=k;break}}}
      if(!plan&&cs.length)plan=mode===0&&cs.length>1&&Math.random()<.35?cs[1]:cs[0];
      if(!plan){const ts=targets();const t=ts.sort((a,b)=>Math.hypot(a.x-c.x,a.y-c.y)-Math.hypot(b.x-c.x,b.y-c.y))[0];plan={a:Math.atan2(t.y-c.y,t.x-c.x),p:.35}}
      plan={a:plan.a+(Math.random()-.5)*2*noise,p:Math.min(1,plan.p*(1+(Math.random()-.5)*(mode===0?.25:.1)))}}
    cpuPlan={a0:ang,a:plan.a,p:plan.p,t:0}}

  /* ---------- Entrées ---------- */
  function toTable(e){const r=cv.getBoundingClientRect();return[(e.clientX-r.left-offX)/sc,(e.clientY-r.top-offY)/sc]}
  const canPlay=()=>phase==='aim'&&!over&&!cpuTurn();
  cv.addEventListener('pointerdown',e=>{if(!canPlay())return;const[x,y]=toTable(e),c=cue();cv.setPointerCapture(e.pointerId);
    if(bih&&Math.hypot(x-c.x,y-c.y)<Math.max(R*1.7,24/sc)){drag={k:'ball',dx:c.x-x,dy:c.y-y};return}
    // Toucher une bille : on vise dessus. Sinon la queue se place sous le doigt (la bille part à l'opposé).
    const hit=balls.find(o=>!o.in&&o.n!==0&&Math.hypot(x-o.x,y-o.y)<Math.max(R*1.25,13/sc));
    if(hit)ang=Math.atan2(hit.y-c.y,hit.x-c.x);else if(Math.hypot(x-c.x,y-c.y)>R*1.2)ang=Math.atan2(c.y-y,c.x-x);
    drag={k:'aim',lx:e.clientX,ly:e.clientY}});
  cv.addEventListener('pointermove',e=>{if(!drag||!canPlay())return;const c=cue();
    if(drag.k==='ball'){const[x,y]=toTable(e);let nx=Math.max(R,Math.min(TW-R,x+drag.dx)),ny=Math.max(kitchen?TH*.75:R,Math.min(TH-R,y+drag.dy));if(free(nx,ny,c)){c.x=nx;c.y=ny}return}
    // Glisser : la queue tourne lentement autour de la blanche (réglage fin)
    const mx=e.clientX-drag.lx,my=e.clientY-drag.ly;drag.lx=e.clientX;drag.ly=e.clientY;
    const r=cv.getBoundingClientRect(),fx=e.clientX-r.left-X(c.x),fy=e.clientY-r.top-Y(c.y),Ld=Math.hypot(fx,fy)||1;
    ang+=(mx*(-fy/Ld)+my*(fx/Ld))/260});
  const endDrag=()=>{drag=null};cv.addEventListener('pointerup',endDrag);cv.addEventListener('pointercancel',endDrag);
  const zb=$('#bil-zoom');let zoomOn=store.get('bb.bilZoom',true);const zUI=()=>{zb.classList.toggle('on',zoomOn);zb.setAttribute('aria-pressed',zoomOn)};zUI();
  zb.onclick=()=>{zoomOn=!zoomOn;store.set('bb.bilZoom',zoomOn);zUI()};
  let pdrag=false;
  const setPow=e=>{const r=pw.getBoundingClientRect();power=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));pwFill.style.width=(power*100)+'%'};
  pw.addEventListener('pointerdown',e=>{if(!canPlay())return;pdrag=true;pw.setPointerCapture(e.pointerId);setPow(e)});
  pw.addEventListener('pointermove',e=>{if(pdrag)setPow(e)});
  pw.addEventListener('pointerup',()=>{if(!pdrag)return;pdrag=false;if(power>.03&&canPlay())shoot(ang,power);else{power=0;pwFill.style.width='0%'}});
  pw.addEventListener('pointercancel',()=>{pdrag=false;power=0;pwFill.style.width='0%'});
  const nudge=d=>{if(canPlay())ang+=d};
  for(const[id,d]of[['#bil-l',-.004],['#bil-r',.004]]){const el=$(id);let tm=null,iv=null;
    el.addEventListener('pointerdown',e=>{e.preventDefault();nudge(d);tm=setTimeout(()=>{iv=setInterval(()=>nudge(d),40)},350)});
    const stop=()=>{clearTimeout(tm);clearInterval(iv)};el.addEventListener('pointerup',stop);el.addEventListener('pointerleave',stop);el.addEventListener('pointercancel',stop)}

  /* ---------- Interface ---------- */
  function ui(){const N=names(),g=groups;
    const side=p=>{const gg=g[p];return`<span class="${turn===p&&!over?'on':''}">${N[p-1]}${gg?' · '+GN[gg]+' ('+left(gg)+')':''}</span>`};
    $('#bil-info').innerHTML=side(1)+side(2);
    let t;if(over)t=winner?(vsCpu()&&winner===1?'Tu as gagné !':N[winner-1]+' a gagné !'):'';
    else if(msg&&performance.now()-msgT<6000)t=msg;
    else if(phase==='moving')t='';
    else if(cpuTurn())t='L’ordinateur joue…';
    else{const who=vsCpu()?'À toi':'À '+N[turn-1];const g2=groups[turn];const aim=g2&&!left(g2)?' · vise la noire':'';
      t=bih?who+' · bille en main : déplace la blanche'+(kitchen?' (derrière la ligne)':''):shotNo===0?who+' · casse !':who+aim}
    stEl.textContent=t}
  function rayHit(cx,cy,dx,dy){let best=Infinity,ball=null;
    for(const o of balls){if(o.in||o.n===0)continue;const fx2=cx-o.x,fy=cy-o.y,bq=fx2*dx+fy*dy,cq=fx2*fx2+fy*fy-4*R*R,disc=bq*bq-cq;if(disc<0)continue;const t=-bq-Math.sqrt(disc);if(t>0&&t<best){best=t;ball=o}}
    let wt=Infinity;if(dx<0)wt=Math.min(wt,(R-cx)/dx);if(dx>0)wt=Math.min(wt,(TW-R-cx)/dx);if(dy<0)wt=Math.min(wt,(R-cy)/dy);if(dy>0)wt=Math.min(wt,(TH-R-cy)/dy);
    return best<wt?{t:best,ball}:{t:wt,ball:null}}

  /* ---------- Dessin ---------- */
  const X=x=>offX+x*sc,Y=y=>offY+y*sc;
  function drawBall(b,x,y,r,a=1){ctx.globalAlpha=a;const n=b.n;
    ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.arc(x+r*.18,y+r*.22,r,0,7);ctx.fill();
    if(n>8){ctx.fillStyle='#f6f3ea';ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fill();ctx.save();ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.clip();ctx.fillStyle=colOf(n);ctx.fillRect(x-r,y-r*.55,2*r,r*1.1);ctx.restore()}
    else{ctx.fillStyle=colOf(n);ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fill()}
    if(n){ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x,y,r*.48,0,7);ctx.fill();ctx.fillStyle='#111';ctx.font='700 '+Math.round(r*.7)+'px Fredoka, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(n,x,y+r*.04)}
    const g=ctx.createRadialGradient(x-r*.4,y-r*.45,r*.05,x,y,r*1.05);g.addColorStop(0,'rgba(255,255,255,.75)');g.addColorStop(.25,'rgba(255,255,255,.12)');g.addColorStop(1,'rgba(0,0,0,.35)');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fill();ctx.globalAlpha=1}
  /* ---------- Caméra : zoom automatique pendant la visée ---------- */
  let base=.3,cam={x:TW/2,y:TH/2,z:1},camT={x:TW/2,y:TH/2,z:1};
  function camTarget(){const full={x:TW/2,y:TH/2,z:1};const c=cue();
    if(!zoomOn||phase!=='aim'||over||cpuTurn()||c.in||(drag&&drag.k==='ball'))return full;
    const dx=Math.cos(ang),dy=Math.sin(ang),h=rayHit(c.x,c.y,dx,dy),gx=c.x+dx*h.t,gy=c.y+dy*h.t;
    const pts=[[c.x,c.y],[gx,gy],[c.x-dx*R*5,c.y-dy*R*5]];if(h.ball){const nx=(h.ball.x-gx)/(2*R),ny=(h.ball.y-gy)/(2*R);pts.push([h.ball.x+nx*70,h.ball.y+ny*70])}
    let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const[x,y]of pts){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y)}
    x0-=R*4;y0-=R*4;x1+=R*4;y1+=R*4;
    let z=Math.min(W*.9/((x1-x0)*base),H*.9/((y1-y0)*base));z=Math.max(1,Math.min(2.4,z));
    const vw=W/(2*base*z),vh=H/(2*base*z),cl=(v,a,b)=>a>b?(a+b)/2:Math.max(a,Math.min(b,v));
    return{x:cl((x0+x1)/2,-RAIL+vw,TW+RAIL-vw),y:cl((y0+y1)/2,-RAIL+vh,TH+RAIL-vh),z}}
  function setView(v){sc=base*v.z;offX=W/2-v.x*sc;offY=H/2-v.y*sc}
  function frame(dt){
    if(phase==='moving'){acc+=Math.min(dt,.05);let mv=true;while(acc>=DT){acc-=DT;mv=step(balls,EV);if(!mv)break}if(!mv){acc=0;resolve()}}
    if(phase==='cpu'&&cpuPlan){const P=cpuPlan;P.t+=dt;let da=P.a-P.a0;while(da>Math.PI)da-=2*Math.PI;while(da<-Math.PI)da+=2*Math.PI;
      const u=Math.min(1,P.t/.8);ang=P.a0+da*(u<.5?2*u*u:1-Math.pow(-2*u+2,2)/2);power=P.t>.9?Math.min(P.p,(P.t-.9)/.7*P.p):0;pwFill.style.width=(power*100)+'%';
      if(P.t>1.9){cpuPlan=null;phase='aim';shoot(P.a,P.p)}}
    fx=fx.filter(f=>(f.age+=dt)<.6);
    if(!drag||drag.k==='ball')camT=camTarget();
    const kk=Math.min(1,dt*(phase==='moving'?3:5));cam.x+=(camT.x-cam.x)*kk;cam.y+=(camT.y-cam.y)*kk;cam.z+=(camT.z-cam.z)*kk;setView(cam);
    const k=DPR();ctx.setTransform(k,0,0,k,0,0);ctx.clearRect(0,0,W,H);
    const c=cue(),aiming=((phase==='aim'&&!over&&!cpuTurn())||phase==='cpu')&&!c.in;
    let A=null;if(aiming){const dx=Math.cos(ang),dy=Math.sin(ang),h=rayHit(c.x,c.y,dx,dy);A={dx,dy,h,gx:c.x+dx*h.t,gy:c.y+dy*h.t}}
    scene(A);
    // Loupe sur le point d'impact
    if(A&&A.h.ball&&phase==='aim'){const lr=Math.min(56,W*.15),gxs=X(A.gx),lx=gxs<W/2?W-lr-8:lr+8,ly=lr+8;
      const s0=sc,o0=offX,o1=offY;sc=Math.max(s0*2.2,base*6);offX=lx-A.gx*sc;offY=ly-A.gy*sc;
      ctx.save();ctx.beginPath();ctx.arc(lx,ly,lr,0,7);ctx.clip();ctx.fillStyle='#0b1a12';ctx.fillRect(lx-lr,ly-lr,2*lr,2*lr);scene(A,true);ctx.restore();
      ctx.strokeStyle='#ffc54d';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(lx,ly,lr,0,7);ctx.stroke();sc=s0;offX=o0;offY=o1}
    const pt=balls.filter(b=>b.in&&b.n),rs=Math.min(9,W*.022);pt.forEach((b,i)=>drawBall(b,rs+4,H-rs-4-i*rs*2.2,rs,.95));
    if(msg&&phase!=='moving'&&performance.now()-msgT>6000&&!over){msg='';ui()}}
  function scene(A,lens){const rr=RAIL*sc,c=cue();
    const wood=ctx.createLinearGradient(X(-RAIL),0,X(TW+RAIL),0);wood.addColorStop(0,'#5b3218');wood.addColorStop(.5,'#8a4f27');wood.addColorStop(1,'#5b3218');
    ctx.fillStyle=wood;ctx.beginPath();ctx.roundRect?ctx.roundRect(X(-RAIL),Y(-RAIL),(TW+2*RAIL)*sc,(TH+2*RAIL)*sc,rr*.6):ctx.rect(X(-RAIL),Y(-RAIL),(TW+2*RAIL)*sc,(TH+2*RAIL)*sc);ctx.fill();
    ctx.fillStyle='#0f5a37';ctx.fillRect(X(-R*.6),Y(-R*.6),(TW+1.2*R)*sc,(TH+1.2*R)*sc);
    const felt=ctx.createRadialGradient(X(TW/2),Y(TH/2),10,X(TW/2),Y(TH/2),TH*sc*.6);felt.addColorStop(0,'#1fa064');felt.addColorStop(1,'#137a49');
    ctx.fillStyle=felt;ctx.fillRect(X(0),Y(0),TW*sc,TH*sc);
    ctx.fillStyle='#f3e1b0';for(const f of[.125,.25,.375,.625,.75,.875]){for(const x of[-RAIL/2,TW+RAIL/2]){ctx.beginPath();ctx.arc(X(x),Y(TH*f),Math.max(1.5,2.5*sc),0,7);ctx.fill()}}
    for(const f of[.25,.5,.75]){for(const y of[-RAIL/2,TH+RAIL/2]){ctx.beginPath();ctx.arc(X(TW*f),Y(y),Math.max(1.5,2.5*sc),0,7);ctx.fill()}}
    ctx.strokeStyle='rgba(255,255,255,.12)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(X(0),Y(TH*.75));ctx.lineTo(X(TW),Y(TH*.75));ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,.25)';ctx.beginPath();ctx.arc(X(TW/2),Y(TH*.25),2,0,7);ctx.fill();
    for(const[px,py]of POCK){const mid=py===TH/2;ctx.fillStyle='#050505';ctx.beginPath();ctx.arc(X(mid?(px<0?-R*.5:TW+R*.5):px),Y(py),(mid?1.55:1.75)*R*sc,0,7);ctx.fill()}
    if(!lens)fx.forEach(f=>{ctx.strokeStyle=f.c;ctx.globalAlpha=1-f.age/.6;ctx.lineWidth=3;ctx.beginPath();ctx.arc(X(f.x),Y(f.y),R*sc*(1.2+f.age*2.5),0,7);ctx.stroke();ctx.globalAlpha=1});
    if(A){const{dx,dy,h,gx,gy}=A;
      ctx.setLineDash([6,6]);ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(X(c.x),Y(c.y));ctx.lineTo(X(gx),Y(gy));ctx.stroke();ctx.setLineDash([]);
      ctx.strokeStyle='rgba(255,255,255,.8)';ctx.lineWidth=lens?2:1.5;ctx.beginPath();ctx.arc(X(gx),Y(gy),R*sc,0,7);ctx.stroke();
      if(h.ball){const nx=(h.ball.x-gx)/(2*R),ny=(h.ball.y-gy)/(2*R),L=90;
        ctx.strokeStyle='rgba(255,230,120,.9)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(X(h.ball.x),Y(h.ball.y));ctx.lineTo(X(h.ball.x+nx*L),Y(h.ball.y+ny*L));ctx.stroke();
        const dot=dx*nx+dy*ny,tx=dx-dot*nx,ty=dy-dot*ny,tl=Math.hypot(tx,ty);if(tl>.05){ctx.strokeStyle='rgba(255,255,255,.4)';ctx.beginPath();ctx.moveTo(X(gx),Y(gy));ctx.lineTo(X(gx+tx/tl*55*tl),Y(gy+ty/tl*55*tl));ctx.stroke()}}
      else{let rx=dx,ry=dy;if(Math.abs(gx-R)<.5||Math.abs(gx-TW+R)<.5)rx=-rx;else ry=-ry;ctx.strokeStyle='rgba(255,255,255,.35)';ctx.beginPath();ctx.moveTo(X(gx),Y(gy));ctx.lineTo(X(gx+rx*70),Y(gy+ry*70));ctx.stroke()}}
    for(const b of balls){if(b.in)continue;drawBall(b,X(b.x),Y(b.y),R*sc)}
    if(A&&h_contact(A)){const{h,gx,gy}=A,mx=(gx+h.ball.x)/2,my=(gy+h.ball.y)/2;ctx.fillStyle='#ff4d5e';ctx.beginPath();ctx.arc(X(mx),Y(my),Math.max(2,R*sc*.16),0,7);ctx.fill()}
    if(!lens&&bih&&phase==='aim'&&!cpuTurn()&&!over){ctx.strokeStyle='rgba(255,197,77,'+(.5+.3*Math.sin(performance.now()/200))+')';ctx.lineWidth=2;ctx.beginPath();ctx.arc(X(c.x),Y(c.y),R*sc*1.8,0,7);ctx.stroke()}
    if(A&&!lens){const{dx,dy}=A,back=R*1.4+power*70,len=330;ctx.lineCap='round';
      const sx=c.x-dx*back,sy=c.y-dy*back,ex=c.x-dx*(back+len),ey=c.y-dy*(back+len);
      ctx.strokeStyle='rgba(0,0,0,.35)';ctx.lineWidth=7*sc+2;ctx.beginPath();ctx.moveTo(X(sx)+3,Y(sy)+4);ctx.lineTo(X(ex)+3,Y(ey)+4);ctx.stroke();
      const g=ctx.createLinearGradient(X(sx),Y(sy),X(ex),Y(ey));g.addColorStop(0,'#f3efe4');g.addColorStop(.03,'#f3efe4');g.addColorStop(.035,'#2a63c9');g.addColorStop(.06,'#2a63c9');g.addColorStop(.065,'#e8c98f');g.addColorStop(.7,'#c08b4e');g.addColorStop(.72,'#222');g.addColorStop(1,'#3b2414');
      ctx.strokeStyle=g;ctx.lineWidth=6*sc+2;ctx.beginPath();ctx.moveTo(X(sx),Y(sy));ctx.lineTo(X(ex),Y(ey));ctx.stroke();ctx.lineCap='butt'}}
  const h_contact=A=>A&&A.h.ball;
  function resize(){const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;W=w;H=h;base=Math.min(w/(TW+2*RAIL+4),h/(TH+2*RAIL+4));setView(cam);
    cv.style.width=W+'px';cv.style.height=H+'px';cv.width=Math.round(W*DPR());cv.height=Math.round(H*DPR())}
  new ResizeObserver(resize).observe(stage);

  /* ---------- Son ---------- */
  let AC=null;
  function snd(k,v=.5){if(store.get('bb.mute',false))return;try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();const t=AC.currentTime;
    const len=k==='pot'?.25:k==='rail'?.08:.05,b=AC.createBuffer(1,Math.ceil(AC.sampleRate*len),AC.sampleRate),d=b.getChannelData(0);
    for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,k==='pot'?2:6);
    const s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();s.buffer=b;
    if(k==='ball'){f.type='bandpass';f.frequency.value=2600;f.Q.value=2;g.gain.value=.1+v*.6}
    else if(k==='cue'){f.type='bandpass';f.frequency.value=1500;f.Q.value=1.5;g.gain.value=.15+v*.4}
    else if(k==='rail'){f.type='lowpass';f.frequency.value=500;g.gain.value=.2+v*.5}
    else{f.type='lowpass';f.frequency.value=320;g.gain.value=.7}
    s.connect(f).connect(g).connect(AC.destination);s.start(t)}catch(e){}}

  modeSel.value=String(mode);modeSel.onchange=()=>{mode=+modeSel.value;store.set('bb.bilMode',mode);modeSel.blur();newGame()};
  $('#bil-new').onclick=()=>{if(over||shotNo===0){newGame();return}Celebrate.ask('Nouvelle partie ?','La partie en cours sera abandonnée.','Nouvelle partie','Continuer',newGame,null)};
  function save(){if(over)return null;if(phase!=='aim'&&phase!=='cpu')return undefined;if(shotNo===0)return null;
    return{mode,b:balls.map(b=>[b.n,Math.round(b.x*10)/10,Math.round(b.y*10)/10,b.in?1:0]),turn,groups,bih,kitchen,shotNo,ang}}
  function load(o){if(!Array.isArray(o.b)||o.b.length!==16||!(o.mode>=0&&o.mode<=3))return;mode=o.mode;modeSel.value=String(mode);store.set('bb.bilMode',mode);
    balls=o.b.map(([n,x,y,i])=>({n,x,y,vx:0,vy:0,in:!!i}));turn=o.turn===2?2:1;groups=o.groups||{1:null,2:null};bih=!!o.bih;kitchen=!!o.kitchen;shotNo=o.shotNo||1;ang=o.ang||-Math.PI/2;
    phase='aim';over=false;winner=0;shot=null;fx=[];power=0;cpuPlan=null;clearTimeout(cpuT);say('');beginTurn()}
  newGame();
  return{frame,resize,save,load,pause(){},resume(){if(!over&&cpuTurn()&&phase==='cpu'&&!cpuPlan){clearTimeout(cpuT);cpuT=setTimeout(cpuThink,400)}},
    sub:()=>{const w=store.get('bb.bilWins',[0,0,0]);return mode<3?LVN[mode]+' · '+(w[mode]||0)+' victoire'+((w[mode]||0)>1?'s':''):'À deux'}}
})();
