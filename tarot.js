/* ================= TAROT (4 joueurs) ================= */
const Tarot=(()=>{
  const cv=$('#tar-cv'),ctx=cv.getContext('2d'),stage=$('#tar-stage'),panel=$('#tar-panel'),msgEl=$('#tar-msg'),lvlSel=$('#tar-lvl'),sumEl=$('#tar-sum');
  const DEALS=5,EXC=77,CONTRACTS=['Passe','Petite','Garde','Garde sans','Garde contre'],MULT=[0,1,2,4,6],NEED=[112,102,82,72];
  const SUITS=['♠','♥','♦','♣'],RED=[false,true,true,false];
  const isT=c=>c>=56&&c<=76,tv=c=>c-55,suit=c=>c<56?Math.floor(c/14):c===EXC?5:4,rank=c=>c<56?c%14+1:isT(c)?tv(c):0;
  const isBout=c=>c===56||c===76||c===EXC;
  const pts=c=>isBout(c)?9:c<56?[0,1,1,1,1,1,1,1,1,1,1,3,5,7,9][rank(c)]:1;
  const sortKey=c=>c===EXC?999:isT(c)?500+tv(c):[0,2,1,3].indexOf(suit(c))*20+rank(c);
  const names=()=>['Toi','Jeanne','Paul','Lucie'];
  let level=store.get('bb.tarLvl',1);if(level!==0&&level!==1)level=1;
  let SIM=false,G=null,D=null,timer=null,W=300,H=400,cw=44,ch=68,rects=[],sel=new Set(),anim=null,flyOut=null,busy=false;
  const camp=p=>p===D.taker?0:1;
  const rndShuffle=a=>{for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]]}return a};

  /* ---------- Règles ---------- */
  function legal(hand,trick){if(!trick.length)return hand.slice();const lead=trick.find(x=>x.c!==EXC);if(!lead)return hand.slice();
    const ls=suit(lead.c),maxT=Math.max(0,...trick.filter(x=>isT(x.c)).map(x=>tv(x.c)));let res;
    const trumps=()=>{const t=hand.filter(isT);if(!t.length)return null;const up=t.filter(c=>tv(c)>maxT);return up.length?up:t};
    if(ls<4){const f=hand.filter(c=>suit(c)===ls);res=f.length?f:(trumps()||hand.filter(c=>c!==EXC))}else res=trumps()||hand.filter(c=>c!==EXC);
    if(hand.includes(EXC)&&!res.includes(EXC))res.push(EXC);return res.length?res:hand.slice()}
  function winnerOf(trick){let best=null;for(const x of trick){if(x.c===EXC)continue;if(!best){best=x;continue}
      if(isT(x.c)){if(!isT(best.c)||tv(x.c)>tv(best.c))best=x}else if(!isT(best.c)&&suit(x.c)===suit(best.c)&&rank(x.c)>rank(best.c))best=x}
    return best?best.p:trick[0].p}
  const beats=(c,b,ls)=>isT(c)?(!isT(b)||tv(c)>tv(b)):(!isT(b)&&suit(c)===suit(b)&&rank(c)>rank(b));

  /* ---------- Donne ---------- */
  function newGame(){G={deal:0,dealer:3,scores:[0,0,0,0],hist:[]};store.set('bb.save.tar',null);nextDeal()}
  function nextDeal(){clearTimeout(timer);G.deal++;G.dealer=(G.dealer+1)%4;let hands,chien;
    for(let t=0;t<50;t++){const d=rndShuffle([...Array(78).keys()]);hands=[0,1,2,3].map(p=>d.slice(p*18,p*18+18));chien=d.slice(72);
      if(!hands.some(h=>h.includes(56)&&h.filter(isT).length===1&&!h.includes(EXC)))break}
    hands.forEach(h=>h.sort((a,b)=>sortKey(a)-sortKey(b)));
    D={hands,chien,bids:[null,null,null,null],bidTurn:(G.dealer+1)%4,best:0,taker:-1,contract:0,pts:[0,0],bouts:[0,0],trick:[],leader:(G.dealer+1)%4,turn:-1,trickNo:0,
      poig:{},asked:{},played:[],voids:[[],[],[],[]],petit:-1,tricksWon:[0,0],phase:'bid',ecart:[],last:null};
    sel.clear();sumEl.hidden=true;say('Donne '+G.deal+' sur '+DEALS);ui();step()}
  function step(){clearTimeout(timer);if(!D)return;
    if(D.phase==='bid'){const p=D.bidTurn;if(p===0){ui();return}timer=setTimeout(()=>{bid(p,aiBid(p))},700);return}
    if(D.phase==='play'){const p=D.turn;if(D.trick.length===4)return;if(p===0){ui();return}timer=setTimeout(()=>play(p,aiPlay(p)),650);return}}
  function bid(p,c){if(D.phase!=='bid'||p!==D.bidTurn)return;D.bids[p]=c;if(c>D.best){D.best=c;D.taker=p}snd(0);
    say(names()[p]+(p===0?' : ':' : ')+CONTRACTS[c]);
    if(D.bids.every(b=>b!=null)){if(!D.best){say('Tout le monde passe : on redistribue.');D.phase='redeal';ui();timer=setTimeout(()=>{G.deal--;nextDeal()},1800);return}
      D.contract=D.best;startChien();return}
    D.bidTurn=(p+1)%4;ui();step()}
  function startChien(){const t=D.taker,N=names();
    if(D.contract<=2){D.phase='chien';say(N[t]+' prend une '+CONTRACTS[D.contract]+' · voici le chien');ui();
      timer=setTimeout(()=>{D.hands[t].push(...D.chien);D.hands[t].sort((a,b)=>sortKey(a)-sortKey(b));
        if(t===0){D.phase='ecart';sel.clear();say('Choisis 6 cartes pour ton écart (ni roi, ni bout)');ui()}
        else{const e=aiEcart(t);doEcart(t,e)}},2400)}
    else{D.phase='play';if(D.contract===3){D.chien.forEach(c=>{D.pts[0]+=pts(c);if(isBout(c))D.bouts[0]++})}else{D.chien.forEach(c=>{D.pts[1]+=pts(c);if(isBout(c))D.bouts[1]++})}
      say(N[t]+' prend une '+CONTRACTS[D.contract]+(D.contract===3?' · le chien reste au preneur':' · le chien va à la défense'));D.turn=D.leader;ui();timer=setTimeout(step,1200)}}
  function ecartOk(hand,e){if(e.length!==6)return false;const bad=c=>c===EXC||isBout(c)||rank(c)===14&&c<56;if(e.some(bad))return false;
    const nonT=hand.filter(c=>!isT(c)&&!bad(c));if(e.some(isT)&&nonT.filter(c=>!e.includes(c)).length>0)return false;return true}
  function doEcart(t,e){D.hands[t]=D.hands[t].filter(c=>!e.includes(c));D.ecart=e;e.forEach(c=>{D.pts[0]+=pts(c)});D.phase='play';D.turn=D.leader;sel.clear();
    say(t===0?'Écart fait · à toi de jouer'+(D.turn===0?'':' après les autres'):names()[t]+' a fait son écart');ui();timer=setTimeout(step,900)}
  function play(p,c){if(D.phase!=='play'||p!==D.turn||!D.hands[p].includes(c))return;
    if(!legal(D.hands[p],D.trick).includes(c))return;
    if(!D.asked[p]){D.asked[p]=1;const n=D.hands[p].filter(x=>isT(x)||x===EXC).length;const k=n>=15?3:n>=13?2:n>=10?1:0;
      if(k){if(p===0){D.asked[p]=1;busy=true;Celebrate.ask('Poignée '+['','simple','double','triple'][k]+' ?','Tu as '+n+' atouts : tu peux annoncer une poignée ('+[0,20,30,40][k]+' points pour le camp gagnant).','Annoncer','Non merci',()=>{D.poig[p]=k;busy=false;say('Tu annonces une poignée '+['','simple','double','triple'][k]);play2(p,c)},()=>{busy=false;play2(p,c)});return}
        if(p===D.taker||level===0||n>=13){D.poig[p]=k;say(names()[p]+' annonce une poignée '+['','simple','double','triple'][k])}}}
    play2(p,c)}
  function play2(p,c){D.hands[p]=D.hands[p].filter(x=>x!==c);
    const lead=D.trick.find(x=>x.c!==EXC);if(lead&&c!==EXC){const ls=suit(lead.c);if(ls<4&&suit(c)!==ls){if(!D.voids[p].includes(ls))D.voids[p].push(ls);if(!isT(c)&&!D.voids[p].includes(4))D.voids[p].push(4)}
      if(ls===4&&!isT(c)&&!D.voids[p].includes(4))D.voids[p].push(4)}
    D.trick.push({p,c});D.played.push(c);anim={c,p,t:0};snd(1);
    if(D.trick.length===4){ui();timer=setTimeout(endTrick,1100);return}
    D.turn=(p+1)%4;ui();step()}
  function endTrick(){const tr=D.trick,w=winnerOf(tr),wc=camp(w),last=D.trickNo===17;
    for(const x of tr){if(x.c===EXC&&!last){const oc=camp(x.p);D.pts[oc]+=9;D.bouts[oc]++;if(oc!==wc){D.pts[oc]-=1;D.pts[wc]+=1}continue}
      D.pts[wc]+=pts(x.c);if(isBout(x.c))D.bouts[wc]++}
    if(last&&tr.some(x=>x.c===56))D.petit=wc;
    D.tricksWon[wc]++;D.last={trick:tr.slice(),w};flyOut={w,t:0,cards:tr.slice()};D.trick=[];D.trickNo++;D.leader=w;D.turn=w;snd(2);
    if(D.trickNo===18){ui();timer=setTimeout(endDeal,800);return}
    ui();timer=setTimeout(step,450)}
  function endDeal(){const t=D.taker,m=MULT[D.contract],need=NEED[D.bouts[0]],diff=D.pts[0]-need,won=diff>=0,ec=Math.round(Math.abs(diff)/2+.001);
    let s=(25+ec)*m*(won?1:-1);const pab=D.petit<0?0:(D.petit===0?1:-1)*10*m;s+=pab;
    const P=Object.values(D.poig).reduce((a,k)=>a+[0,20,30,40][k],0);s+=won?P:-P;
    let chelem=0;if(D.tricksWon[0]===18)chelem=200;else if(D.tricksWon[1]===18)chelem=-200;s+=chelem;
    const delta=[0,1,2,3].map(p=>p===t?3*s:-s);delta.forEach((v,p)=>G.scores[p]+=v);
    G.hist.push({taker:t,contract:D.contract,pts:D.pts[0]/2,need:need/2,bouts:D.bouts[0],won,delta});
    if(t===0&&won){window._duel&&window._duel.report('tarT',1,'inc')}
    D.phase='end';ui();summary({t,won,diff,ec,m,pab,P,chelem,delta,need});if(t===0&&!SIM)(won?Celebrate.run('confetti','Réussi !',null):snd(3))}
  function summary(r){const N=names(),f=v=>(v>0?'+':'')+v;
    let h=`<div class="card tsum"><h2>${r.won?(r.t===0?'Contrat réussi !':N[r.t]+' réussit son contrat'):(r.t===0?'Contrat chuté':N[r.t]+' chute')}</h2>
      <p>${N[r.t]} · ${CONTRACTS[D.contract]} · ${D.bouts[0]} bout${D.bouts[0]>1?'s':''} · ${fmtP(D.pts[0])} points (il en fallait ${r.need/2})</p>
      <table>${[0,1,2,3].map(p=>`<tr class="${p===0?'me':''}"><td>${N[p]}${p===r.t?' ★':''}</td><td>${f(r.delta[p])}</td><td><b>${G.scores[p]}</b></td></tr>`).join('')}</table>
      <p class="tdet">Base ${25+r.ec} × ${r.m}${r.pab?' · petit au bout '+f(r.pab):''}${r.P?' · poignée '+r.P:''}${r.chelem?' · chelem '+f(r.chelem):''}</p>
      <button class="btn" id="tar-next">${G.deal>=DEALS?'Voir le classement':'Donne suivante'}</button></div>`;
    lastSum=h;showSum()};
  let lastSum='';
  function showSum(){sumEl.innerHTML=lastSum;sumEl.hidden=false;$('#tar-next').onclick=()=>{sumEl.hidden=true;if(G.deal>=DEALS)endGame();else nextDeal()};
  }
  const fmtP=v=>(v/2).toLocaleString('fr-FR');
  function endGame(){const N=names(),order=[0,1,2,3].sort((a,b)=>G.scores[b]-G.scores[a]),place=order.indexOf(0)+1,my=G.scores[0];
    const best=store.get('bb.tarBest',null);if(best==null||my>best){store.set('bb.tarBest',my)}window._duel&&window._duel.report('tarB',my,'hi');
    if(place===1){store.set('bb.tarWins',store.get('bb.tarWins',0)+1);window._duel&&window._duel.report('tarP',1,'inc')}
    D=null;store.set('bb.save.tar',null);
    const go=()=>{sumEl.innerHTML=`<div class="card tsum"><h2>${place===1?'Tu gagnes la partie !':'Tu finis '+place+'ᵉ'}</h2><table>${order.map((p,i)=>`<tr class="${p===0?'me':''}"><td>${i+1}. ${N[p]}</td><td></td><td><b>${G.scores[p]}</b></td></tr>`).join('')}</table>
      <button class="btn" id="tar-again">Nouvelle partie</button></div>`;sumEl.hidden=false;$('#tar-again').onclick=()=>{sumEl.hidden=true;newGame()}};
    if(place===1)Celebrate.run('fireworks','Victoire !!',go);else go();ui()}

  /* ---------- Ordinateur ---------- */
  function handValue(h){const T=h.filter(isT),n=T.length;let s=n*2+T.filter(c=>tv(c)>=16).length*1.5;
    if(h.includes(76))s+=10;if(h.includes(EXC))s+=8;if(h.includes(56))s+=n>=6?9:n>=5?7:n>=4?4:1;
    for(let su=0;su<4;su++){const cs=h.filter(c=>c<56&&suit(c)===su),r=cs.map(rank),k=cs.length;if(r.includes(14))s+=6;if(r.includes(13))s+=r.includes(14)?4:2;if(r.includes(12))s+=1.5;if(r.includes(11))s+=.5;
      if(k>=5)s+=(k-4)*2;if(k===0)s+=6;else if(k===1)s+=3}
    return s}
  let TH=[43,52,63,72];
  function aiBid(p){const v=handValue(D.hands[p])+(level?0:(Math.random()-.5)*8);const want=v>=TH[3]?4:v>=TH[2]?3:v>=TH[1]?2:v>=TH[0]?1:0;return want>D.best?want:0}
  function aiEcart(t){const h=D.hands[t],ok=c=>!isT(c)&&c!==EXC&&!(c<56&&rank(c)===14);
    const len=su=>h.filter(c=>c<56&&suit(c)===su).length,hasK=su=>h.some(c=>c<56&&suit(c)===su&&rank(c)===14);
    const cand=h.filter(ok).map(c=>({c,s:(hasK(suit(c))?0:20-len(suit(c))*2.5)+pts(c)*1.2+(rank(c)>=11?1:0)}));cand.sort((a,b)=>b.s-a.s);
    let e=cand.slice(0,6).map(x=>x.c);if(e.length<6){const tr=h.filter(c=>isT(c)&&!isBout(c)).sort((a,b)=>tv(a)-tv(b));e=e.concat(tr.slice(0,6-e.length))}return e}
  const outstanding=(p,f)=>{const seen=new Set([...D.played,...D.hands[p],...(p===D.taker?D.ecart:[])]);const out=[];for(let c=0;c<78;c++)if(!seen.has(c)&&f(c))out.push(c);return out};
  function risky(p,card,ls,after){if(!after.length)return false;const opp=after.filter(q=>camp(q)!==camp(p));if(!opp.length)return false;
    if(isT(card)){const hi=outstanding(p,c=>isT(c)&&tv(c)>tv(card));if(!hi.length)return false;if(level&&opp.every(q=>D.voids[q].includes(4)))return false;return true}
    const hi=outstanding(p,c=>c<56&&suit(c)===suit(card)&&rank(c)>rank(card));if(hi.length&&(!level||opp.some(q=>!D.voids[q].includes(suit(card)))))return true;
    if(level)return opp.some(q=>D.voids[q].includes(suit(card))&&!D.voids[q].includes(4));
    const timesLed=D.played.filter(c=>c<56&&suit(c)===suit(card)).length;return timesLed>=6}
  function aiPlay(p){const h=D.hands[p],L=legal(h,D.trick),tr=D.trick;if(L.length===1)return L[0];
    const noEx=L.filter(c=>c!==EXC);if(!noEx.length)return EXC;
    if(h.includes(EXC)&&h.length<=2)return EXC;
    const low=arr=>arr.slice().sort((a,b)=>(pts(a)-pts(b))||((isT(a)?100+tv(a):rank(a))-(isT(b)?100+tv(b):rank(b))))[0];
    const keepPetit=arr=>{const o=arr.filter(c=>c!==56);return o.length?o:arr};
    const after=[1,2,3].map(k=>(p+k)%4).filter(q=>!tr.some(x=>x.p===q)).slice(0,3-tr.length);
    if(!tr.length){// entame
      const T=h.filter(isT),out=outstanding(p,isT);
      if(p===D.taker){if(T.length>=out.length&&T.length>=5){const top=T.filter(c=>c!==56).sort((a,b)=>tv(b)-tv(a))[0];if(top&&!outstanding(p,c=>isT(c)&&tv(c)>tv(top)).length)return top;const l=T.filter(c=>c!==56).sort((a,b)=>tv(a)-tv(b))[0];if(l)return l}
        for(const c of noEx)if(c<56&&!risky(p,c,suit(c),after)&&rank(c)>=13)return c}
      else{const kings=noEx.filter(c=>c<56&&rank(c)===14&&D.played.filter(x=>x<56&&suit(x)===suit(c)).length<2);if(kings.length)return kings[0];
        if(level){const cutSuits=[0,1,2,3].filter(su=>D.voids[D.taker].includes(su)&&!D.voids[D.taker].includes(4));const cs=noEx.filter(c=>c<56&&cutSuits.includes(suit(c)));if(cs.length)return low(cs)}
        if(!D.played.includes(56)&&T.length>=7){const l=T.filter(c=>c!==56).sort((a,b)=>tv(a)-tv(b))[0];if(l)return l}}
      const suitsCards=noEx.filter(c=>c<56);if(suitsCards.length){const bySuit=[0,1,2,3].map(su=>suitsCards.filter(c=>suit(c)===su)).filter(a=>a.length).sort((a,b)=>b.length-a.length);
        const pick=bySuit[0].filter(c=>rank(c)<11);return pick.length?low(pick):low(bySuit[0])}
      return low(keepPetit(noEx))}
    const lead=tr.find(x=>x.c!==EXC),ls=lead?suit(lead.c):4,wp=winnerOf(tr),wcard=tr.find(x=>x.p===wp).c,mine=camp(wp)===camp(p);
    const trickPts=tr.reduce((a,x)=>a+pts(x.c),0);
    const winners=noEx.filter(c=>beats(c,wcard));
    if(mine&&!risky(p,wcard,ls,after)){// partenaire maître : on charge
      if(noEx.includes(56)&&noEx.every(isT))return 56;
      const nonT=noEx.filter(c=>!isT(c));if(nonT.length)return nonT.sort((a,b)=>pts(b)-pts(a)||rank(b)-rank(a))[0];
      return low(keepPetit(noEx))}
    if(winners.length){const ord=winners.slice().sort((a,b)=>(isT(a)?100+tv(a):rank(a))-(isT(b)?100+tv(b):rank(b)));
      const safe=ord.filter(c=>!risky(p,c,ls,after));
      if(safe.length){if(safe.includes(56)&&isT(safe[0])&&safe[0]===56)return 56;const nonPetit=safe.filter(c=>c!==56);return nonPetit[0]??safe[0]}
      if(trickPts>=6||!after.length){const w=ord.filter(c=>c!==56);if(w.length)return w[0]}
      if(ord.length&&!ord.every(isT)&&!after.length)return ord[0]}
    if(h.includes(EXC)&&trickPts+Math.min(...noEx.map(pts))>=8&&!mine)return EXC;
    if(mine){const nonT=noEx.filter(c=>!isT(c));if(nonT.length)return nonT.sort((a,b)=>pts(b)-pts(a))[0]}
    return low(keepPetit(noEx))}

  /* ---------- Interface ---------- */
  function say(t){msgEl.textContent=t}
  function ui(){$('#tar-deal').textContent=G?Math.min(G.deal,DEALS)+'/'+DEALS:'–';$('#tar-score').textContent=G?G.scores[0]:0;
    let h='';
    if(D&&D.phase==='bid'&&D.bidTurn===0){h='<div class="tbids">'+CONTRACTS.map((n,i)=>`<button class="btn${i?'':' alt'}" data-b="${i}"${i&&i<=D.best?' disabled':''}>${n}</button>`).join('')+'</div>'}
    else if(D&&D.phase==='ecart'){h=`<div class="tbids"><button class="btn" id="tar-ok"${ecartOk(D.hands[0],[...sel])?'':' disabled'}>Valider l’écart (${sel.size}/6)</button></div>`}
    panel.innerHTML=h;panel.hidden=!h;
    panel.querySelectorAll('[data-b]').forEach(b=>b.onclick=()=>bid(0,+b.dataset.b));
    const ok=$('#tar-ok');if(ok)ok.onclick=()=>{if(ecartOk(D.hands[0],[...sel]))doEcart(0,[...sel])};
    if(D&&D.phase==='play'&&D.turn===0&&D.trick.length<4&&!busy)msgEl.textContent=D.trick.length?'À toi de jouer':'À toi d’entamer'}
  panel.addEventListener('pointerdown',e=>e.stopPropagation());
  cv.addEventListener('pointerdown',e=>{if(!D)return;const b=cv.getBoundingClientRect(),x=e.clientX-b.left,y=e.clientY-b.top;
    let hit=null;for(let i=rects.length-1;i>=0;i--){const r=rects[i];if(x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h){hit=r;break}}if(!hit)return;
    if(D.phase==='ecart'){const c=hit.c;if(sel.has(c))sel.delete(c);else if(sel.size<6){const bad=c===EXC||isBout(c)||(c<56&&rank(c)===14);if(bad){say('Interdit : on ne peut pas écarter un roi ni un bout');return}
        if(isT(c)&&D.hands[0].filter(x=>!isT(x)&&x!==EXC&&!(x<56&&rank(x)===14)&&!sel.has(x)).length){say('Écarte d’abord tes cartes de couleur (atouts seulement si nécessaire)');return}sel.add(c)}snd(0);ui();return}
    if(D.phase==='play'&&D.turn===0&&D.trick.length<4&&!busy){if(!legal(D.hands[0],D.trick).includes(hit.c)){say(D.trick.length?'Carte interdite : il faut fournir, couper ou monter':'');snd(3);return}play(0,hit.c)}});

  /* ---------- Dessin ---------- */
  function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
  const EN=()=>I18N.lang==='en';
  function rankTxt(c){const r=rank(c);if(r<=10)return String(r);return(EN()?['J','Kn','Q','K']:['V','C','D','R'])[r-11]}
  function card(c,x,y,w,h,opt={}){ctx.save();if(opt.dim)ctx.globalAlpha=.45;
    ctx.shadowColor='rgba(0,0,0,.35)';ctx.shadowBlur=4;ctx.shadowOffsetY=1;rr(x,y,w,h,w*.1);
    if(c<0){const g=ctx.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,'#3a4fb3');g.addColorStop(1,'#22306e');ctx.fillStyle=g;ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='rgba(255,255,255,.35)';ctx.lineWidth=1;rr(x+3,y+3,w-6,h-6,w*.07);ctx.stroke();ctx.restore();return}
    ctx.fillStyle=isT(c)||c===EXC?'#fff7e6':'#fffdf7';ctx.fill();ctx.shadowBlur=0;ctx.shadowOffsetY=0;
    if(opt.hi){ctx.strokeStyle='#ffc54d';ctx.lineWidth=2.5;rr(x,y,w,h,w*.1);ctx.stroke()}else{ctx.strokeStyle='rgba(0,0,0,.18)';ctx.lineWidth=1;ctx.stroke()}
    const fs=Math.round(w*.34);ctx.textAlign='left';ctx.textBaseline='top';
    if(c===EXC){ctx.fillStyle='#7b3fb8';ctx.font='700 '+Math.round(w*.5)+'px Fredoka, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('★',x+w/2,y+h*.52);
      ctx.font='700 '+Math.round(w*.2)+'px Fredoka, sans-serif';ctx.fillText(EN()?'Excuse':'Excuse',x+w/2,y+h*.84);ctx.textAlign='left';ctx.textBaseline='top';ctx.font='700 '+fs+'px Fredoka, sans-serif';ctx.fillText('★',x+w*.08,y+h*.04)}
    else if(isT(c)){const v=tv(c);ctx.fillStyle=isBout(c)?'#c0392b':'#2a3f8f';ctx.font='700 '+fs+'px Fredoka, sans-serif';ctx.fillText(v,x+w*.08,y+h*.04);
      const g=ctx.createLinearGradient(x,y+h*.3,x,y+h*.95);g.addColorStop(0,isBout(c)?'#ffe0d6':'#e3e9ff');g.addColorStop(1,isBout(c)?'#ffc2ad':'#c6d1ff');ctx.fillStyle=g;rr(x+w*.12,y+h*.34,w*.76,h*.58,w*.08);ctx.fill();
      ctx.fillStyle=isBout(c)?'#c0392b':'#2a3f8f';ctx.font='700 '+Math.round(w*.42)+'px Fredoka, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(v,x+w/2,y+h*.64)}
    else{const s=suit(c);ctx.fillStyle=RED[s]?'#d23a3a':'#1d2340';ctx.font='700 '+fs+'px Fredoka, sans-serif';ctx.fillText(rankTxt(c),x+w*.08,y+h*.04);
      ctx.font=Math.round(w*.3)+'px sans-serif';ctx.fillText(SUITS[s],x+w*.08,y+h*.04+fs*.95);
      ctx.textAlign='center';ctx.textBaseline='middle';
      if(rank(c)>10){ctx.fillStyle=RED[s]?'rgba(210,58,58,.12)':'rgba(29,35,64,.1)';rr(x+w*.24,y+h*.36,w*.62,h*.54,w*.08);ctx.fill();ctx.fillStyle=RED[s]?'#d23a3a':'#1d2340';
        ctx.font='700 '+Math.round(w*.36)+'px Fredoka, sans-serif';ctx.fillText(rankTxt(c),x+w*.55,y+h*.56);ctx.font=Math.round(w*.24)+'px sans-serif';ctx.fillText(SUITS[s],x+w*.55,y+h*.78)}
      else{ctx.font=Math.round(w*.48)+'px sans-serif';ctx.fillText(SUITS[s],x+w*.56,y+h*.62)}}
    ctx.restore()}
  const seatPos=p=>[[W/2,H-ch*1.05],[W-cw*.75,H*.36],[W/2,ch*.62],[cw*.75,H*.36]][p];
  const trickPos=p=>{const cx=W/2,cy=H*.4;return[[cx-cw/2,cy+ch*.18],[cx+cw*.62,cy-ch*.42],[cx-cw/2,cy-ch*1.02],[cx-cw*1.62,cy-ch*.42]][p]};
  function frame(dt){if(anim){anim.t+=dt;if(anim.t>.18)anim=null}if(flyOut){flyOut.t+=dt;if(flyOut.t>.35)flyOut=null}
    const k=DPR();ctx.setTransform(k,0,0,k,0,0);ctx.clearRect(0,0,W,H);
    const g=ctx.createRadialGradient(W/2,H*.4,20,W/2,H*.4,Math.max(W,H)*.7);g.addColorStop(0,'#1d7a52');g.addColorStop(1,'#0f4a33');ctx.fillStyle=g;rr(0,0,W,H,14);ctx.fill();
    rects=[];if(!D&&!G)return;const N=names();
    // adversaires
    for(const p of[1,2,3]){const[x,y]=seatPos(p),n=D?D.hands[p].length:0,ox=p===2?-cw*.6:0;
      for(let i=0;i<Math.min(n,5);i++){const dx=p===2?i*5:0,dy=p===2?0:i*4;card(-1,x-cw*.35+dx+ox+(p===2?-10:0),y-ch*.35+dy-(p===2?ch*.1:0),cw*.7,ch*.7)}
      ctx.fillStyle='#fff';ctx.font='700 13px Fredoka, sans-serif';ctx.textAlign='center';ctx.textBaseline='top';
      const ly=p===2?y+ch*.32:y+ch*.42;let label=N[p]+(D&&D.taker===p?' ★':'');ctx.fillText(label,x,ly);
      if(D&&D.phase==='bid'&&D.bids[p]!=null){ctx.fillStyle=D.bids[p]?'#ffc54d':'rgba(255,255,255,.6)';ctx.font='600 12px Fredoka, sans-serif';ctx.fillText(CONTRACTS[D.bids[p]],x,ly+16)}
      else if(D&&D.taker===p&&D.phase!=='bid'){ctx.fillStyle='#ffc54d';ctx.font='600 11px Fredoka, sans-serif';ctx.fillText(CONTRACTS[D.contract],x,ly+16)}
      if(D&&D.phase==='play'&&D.turn===p&&D.trick.length<4){ctx.strokeStyle='#ffc54d';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,ly+7,Math.max(28,ctx.measureText(label).width*.7),0,7);ctx.stroke()}}
    if(!D)return;
    // chien
    if(D.phase==='chien'||(D.phase==='bid'&&false)){const w=cw*.9,h=ch*.9,x0=W/2-(w*6+5*4)/2;D.chien.forEach((c,i)=>card(c,x0+i*(w+4),H*.38-h/2,w,h))}
    // pli
    for(const x of D.trick){let[tx,ty]=trickPos(x.p);if(anim&&anim.c===x.c){const[sx,sy]=seatPos(x.p),u=anim.t/.18;tx=sx-cw/2+(tx-sx+cw/2)*u;ty=sy-ch/2+(ty-sy+ch/2)*u}card(x.c,tx,ty,cw,ch,{hi:D.trick.length===4&&x.p===winnerOf(D.trick)})}
    if(flyOut){const[wx,wy]=seatPos(flyOut.w),u=flyOut.t/.35;for(const x of flyOut.cards){const[tx,ty]=trickPos(x.p);ctx.globalAlpha=1-u;card(x.c,tx+(wx-cw/2-tx)*u,ty+(wy-ch/2-ty)*u,cw,ch);ctx.globalAlpha=1}}
    // ma main
    const h=D.hands[0],L=D.phase==='play'&&D.turn===0&&D.trick.length<4?legal(h,D.trick):null;const n=h.length;if(!n)return;
    const rows=n>12?2:1,per=Math.ceil(n/rows),hw=cw*1.08,hh=ch*1.08,yb=H-hh-6;
    for(let r=0;r<rows;r++){const cs=h.slice(r*per,(r+1)*per),m=cs.length,step=Math.min(hw+3,(W-12-hw)/Math.max(1,m-1)),x0=(W-(step*(m-1)+hw))/2,y0=rows===2&&r===0?yb-hh*.5:yb;
      cs.forEach((c,i)=>{const x=x0+i*step,y=y0-(sel.has(c)?14:0)-(L&&L.includes(c)?6:0);card(c,x,y,hw,hh,{dim:(L&&!L.includes(c))||(D.phase==='ecart'&&(c===EXC||isBout(c)||(c<56&&rank(c)===14))),hi:sel.has(c)});rects.push({x,y,w:i===m-1?hw:step,h:hh,c})})}
    ctx.fillStyle='#fff';ctx.font='700 13px Fredoka, sans-serif';ctx.textAlign='left';ctx.textBaseline='top';
    if(D.taker===0&&D.phase!=='bid'){ctx.fillStyle='#ffc54d';ctx.fillText('★ '+CONTRACTS[D.contract],8,8)}
    if(D.phase==='play'||D.phase==='end'){ctx.fillStyle='rgba(255,255,255,.75)';ctx.font='600 11px Fredoka, sans-serif';ctx.textAlign='right';ctx.fillText((EN()?'Taker: ':'Preneur : ')+fmtP(D.pts[0])+' pts',W-8,8)}}
  function resize(){const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;W=w;H=h;cw=Math.min(54,Math.floor(w/8.2),Math.floor(h/12));ch=Math.round(cw*1.5);
    cv.style.width=W+'px';cv.style.height=H+'px';cv.width=Math.round(W*DPR());cv.height=Math.round(H*DPR())}
  new ResizeObserver(resize).observe(stage);
  let AC=null;
  function snd(k){if(store.get('bb.mute',false))return;try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();const t0=AC.currentTime;
    const len=k===2?.12:.05,b=AC.createBuffer(1,Math.ceil(AC.sampleRate*len),AC.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,3);
    const s=AC.createBufferSource(),f=AC.createBiquadFilter(),v=AC.createGain();s.buffer=b;f.type=k===3?'lowpass':'bandpass';f.frequency.value=k===3?300:k===2?900:2200;v.gain.value=k===3?.4:.25;s.connect(f).connect(v).connect(AC.destination);s.start(t0)}catch(e){}}
  lvlSel.value=String(level);lvlSel.onchange=()=>{level=+lvlSel.value;store.set('bb.tarLvl',level);lvlSel.blur()};
  $('#tar-new').onclick=()=>{if(!G||!D&&!G.hist.length){newGame();return}Celebrate.ask('Nouvelle partie ?','La partie en cours sera abandonnée.','Nouvelle partie','Continuer',newGame,null)};
  $('#tar-board').onclick=()=>{if(!G)return;const N=names();sumEl.innerHTML=`<div class="card tsum"><h2>Feuille de marque</h2><table><tr><td></td>${N.map(n=>`<td><b>${n}</b></td>`).join('')}</tr>
      ${G.hist.map((r,i)=>`<tr><td>${i+1}. ${N[r.taker][0]} ${['','P','G','GS','GC'][r.contract]}${r.won?' ✓':' ✗'}</td>${r.delta.map(v=>`<td>${v>0?'+':''}${v}</td>`).join('')}</tr>`).join('')}
      <tr class="me"><td>Total</td>${G.scores.map(v=>`<td><b>${v}</b></td>`).join('')}</tr></table><button class="btn" id="tar-close">Fermer</button></div>`;sumEl.hidden=false;
    $('#tar-close').onclick=()=>{sumEl.hidden=true;if(D&&D.phase==='end')showSum()}};
  function save(){if(!G)return null;if(!D)return null;if(busy||anim||flyOut||D.trick.length===4||D.phase==='chien'||D.phase==='redeal')return undefined;return{G,D,level}}
  function load(o){if(!o||!o.G||!o.D)return;G=o.G;D=o.D;sel.clear();busy=false;sumEl.hidden=true;
    if(D.phase==='end'){summaryReplay();return}ui();say(D.phase==='ecart'?'Choisis 6 cartes pour ton écart (ni roi, ni bout)':'Partie reprise');step()}
  function summaryReplay(){if(G.deal>=DEALS)endGame();else nextDeal()}
  let started=false;
  return{frame,resize,save,load,pause(){clearTimeout(timer)},resume(){if(D&&!busy)step()},
    enter(){if(!G){newGame()}else if(D)step()},
    sub:()=>{const w=store.get('bb.tarWins',0);return(level?'Fort':'Normal')+(w?' · '+w+' partie'+(w>1?'s':'')+' gagnée'+(w>1?'s':''):'')}}
})();
