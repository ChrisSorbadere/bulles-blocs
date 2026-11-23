/* ================= POINTS (relier les points de même couleur) =================
   6 mondes de 20 niveaux · obstacles : ancres, glace, pierres, feu, bulles · spéciaux : bombes (boucle), éclair (ligne ≥ 7), joker */
const Dots=(()=>{
  const cv=$('#dot-cv'),ctx=cv.getContext('2d'),stage=$('#dot-stage'),goalsEl=$('#dot-goals'),movesEl=$('#dot-moves'),lvlBtn=$('#dot-lvl'),ov=$('#dot-ov');
  const C=6,Rw=7,COLS=['#ff5d5d','#ffc23d','#3fcf6e','#45a6ff','#b77bff'],CN=['rouges','jaunes','verts','bleus','violets'];
  const rng=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
  const WORLDS=[
    {n:'Plage',e:'🏖️',bg:['#16324a','#1d2850'],tip:'Relie les points de même couleur. Une ligne de 7 points ou plus crée un ⚡ éclair : utilisé dans une ligne suivante, il efface sa rangée et sa colonne.'},
    {n:'Forêt',e:'🌲',bg:['#143524','#1b2a3c'],tip:'Ferme une boucle autour d’autres points : ceux du milieu deviennent des 💣 bombes qui explosent tout autour. Fais tomber les ⚓ ancres au fond.'},
    {n:'Glacier',e:'🧊',bg:['#1b3550','#232c4e'],tip:'La ❄ glace se brise quand tu effaces le point posé dessus. Les 🪨 pierres se fendent quand tu effaces un point juste à côté.'},
    {n:'Volcan',e:'🌋',bg:['#3a1c1c','#2a1d34'],tip:'Le 🔥 feu s’étend à chaque coup où tu n’en éteins aucun ! Efface les points posés sur le feu pour l’éteindre.'},
    {n:'Lagon',e:'🫧',bg:['#123a40','#1b2a48'],tip:'Les 🫧 bulles emprisonnent un point : efface un point voisin pour la faire éclater. Le 🌈 joker se relie à toutes les couleurs.'},
    {n:'Espace',e:'🚀',bg:['#0e0f2a','#1d1238'],tip:'Tout se mélange dans l’espace : à toi de trouver le bon ordre !'}];
  const NLV=WORLDS.length*20,wOf=n=>Math.min(WORLDS.length-1,Math.floor((n-1)/20));
  // coups par niveau : calés par simulation (un robot joue 40 parties par niveau)
  const MOVES={1:11,2:11,3:10,4:20,5:25,6:23,7:24,8:23,9:26,10:18,11:22,12:25,13:25,14:19,15:23,16:27,17:70,18:70,19:47,20:35,21:60,22:63,23:70,24:64,25:69,26:32,27:45,28:34,29:56,30:53,31:59,32:51,33:70,34:62,35:70,36:55,37:70,38:70,39:70,40:70,41:38,42:31,43:32,44:37,45:58,46:52,47:40,48:33,49:38,50:23,51:37,52:42,53:36,54:57,55:35,56:44,57:55,58:33,59:38,60:34,61:70,62:31,63:70,64:70,65:54,66:41,67:70,68:70,69:70,70:39,71:49,72:31,73:70,74:35,75:38,76:70,77:44,78:70,79:43,80:50,81:41,82:34,83:41,84:41,85:50,86:41,87:70,88:70,89:64,90:33,91:34,92:39,93:70,94:34,95:36,96:62,97:32,98:39,99:39,100:45,101:67,102:28,103:36,104:35,105:48,106:43,107:47,108:62,109:42,110:55,111:48,112:48,113:37,114:37,115:70,116:70,117:70,118:52,119:47,120:61};
  let stars=store.get('bb.dotStars',[]);if(!Array.isArray(stars))stars=[];
  const unlocked=()=>{let n=1;while(stars[n-1])n++;return Math.min(n,NLV)};
  let cur=Math.min(store.get('bb.dotSel',1),unlocked())||1;
  let lv,g,ice,fire,hole,moves,prog,path=[],loop=false,state='idle',fx=[],over=false,W=300,H=300,cell=40,ox=0,oy=0,flash=null,SIM=false,anchorsOut=0;
  const id=(r,c)=>r*C+c,RC=i=>[i/C|0,i%C];
  const nb4=i=>{const[r,c]=RC(i),o=[];if(c>0)o.push(i-1);if(c<C-1)o.push(i+1);if(r>0)o.push(i-C);if(r<Rw-1)o.push(i+C);return o};
  /* ---------- niveaux ---------- */
  function genLevel(n){const R=rng(n*9973+7),ri=k=>Math.floor(R()*k),w=wOf(n),k10=(n-1)%20,tier=Math.min(1,(n-1)/100),saw=(k10%10)/9;
    const L={n,w,nCol:n<=3?4:5,goals:{},holes:[],ice:[],anchors:0,stones:[],fire:[],bub:[],joker:0};
    const pick=(m,ban)=>{const s=new Set();let t=0;while(s.size<m&&t++<400){const i=ri(C*Rw);if(!ban.includes(i))s.add(i)}return[...s]};
    // couleurs à collecter
    const k=n<3?1:n<8?2:(R()<.5?2:3),cols=[];while(cols.length<k){const c=ri(L.nCol);if(!cols.includes(c))cols.push(c)}
    L.goals.colors={};cols.forEach(c=>L.goals.colors[c]=Math.round((k===1?14:k===2?11:9)+tier*14+saw*6+ri(3)));
    // trous (formes) à partir du niveau 11
    if(n>=11&&R()<.55){const sh=[[[0,0],[0,5]],[[3,0],[3,5]],[[0,0],[0,5],[6,0],[6,5]],[[3,2],[3,3]],[[0,2],[0,3],[6,2],[6,3]],[[2,0],[4,0],[2,5],[4,5]]][ri(6)];L.holes=sh.map(([r,c])=>id(r,c))}
    // obstacles selon le monde (introduits en douceur, puis mélangés)
    const feats=[];if(w===1||w>=3&&R()<.35)feats.push('anchors');if(w===2||w===4&&R()<.5||w===5&&R()<.4)feats.push('ice');if(w===2&&k10>=5||w===3&&R()<.5||w===5&&R()<.4)feats.push('stones');
    if(w===3||w===5&&R()<.45)feats.push('fire');if(w===4||w===5&&R()<.45)feats.push('bub');if(w===0&&k10>=12&&R()<.5)feats.push('anchors');
    const lvl=k10/19;
    if(feats.includes('anchors'))L.anchors=Math.min(4,1+Math.floor(lvl*2.5)+(w>=3?1:0));
    if(feats.includes('ice'))L.ice=pick(Math.min(16,6+Math.round(lvl*8)+w),L.holes);
    if(feats.includes('stones'))L.stones=pick(Math.min(9,3+Math.round(lvl*4)),[...L.holes,...[0,1,2,3,4,5]]);
    if(feats.includes('fire'))L.fire=pick(Math.min(6,2+Math.round(lvl*3)),[...L.holes,...L.stones,...[0,1,2,3,4,5,6,7,8,9,10,11]]);
    if(feats.includes('bub'))L.bub=pick(Math.min(10,4+Math.round(lvl*5)),[...L.holes,...L.stones]);
    if(w>=4)L.joker=w===4?.03:.02;
    // moins de couleurs à collecter quand il y a beaucoup d'obstacles
    const nf=feats.length;if(nf>=2)for(const c in L.goals.colors)L.goals.colors[c]=Math.round(L.goals.colors[c]*.7);
    const need=Object.values(L.goals.colors).reduce((a,b)=>a+b,0);
    L.moves=MOVES[n]||Math.max(12,Math.round(.25*need+2*L.anchors+.5*L.ice.length+1.2*L.stones.length+2.5*L.fire.length+.9*L.bub.length+18));
    return L}
  /* ---------- défi du jour ---------- */
  const dkey=(o=0)=>{const d=new Date(Date.now()-o*864e5);return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()};
  let daily=null;
  const dayS=()=>{const o=store.get('bb.dotDay',{last:'',n:0});if(o.last!==dkey()&&o.last!==dkey(1))o.n=0;return o};
  function dailyPick(){const k=dkey();let o=store.get('bb.dotDaily',null);if(o&&o.d===k)return o;let h=0;for(const ch of k)h=(h*31+ch.charCodeAt(0))>>>0;
    const u=unlocked(),n=1+h%Math.max(1,u),cs=[{k:'moves',t:'coups réduits'},{k:'noloop',t:'boucles interdites'},{k:'bonus',t:'objectif bonus'}];o={d:k,n,c:cs[(h>>>7)%3]};store.set('bb.dotDaily',o);return o}
  const isHole=i=>hole[i];
  const rndCol=ban=>{let c;do{c=rnd(lv.nCol)}while(c===ban&&lv.nCol>1);return c};
  const newDot=ban=>lv.joker&&Math.random()<lv.joker?{j:1}:{c:rndCol(ban)};
  const isDot=k=>k&&!k.a&&!k.s;            // point (couleur ou joker), libre ou en bulle
  const free=k=>isDot(k)&&!k.b;             // utilisable dans un chemin
  const match=(k,col)=>free(k)&&(k.j||k.c===col);
  function start(n,dc){daily=dc||null;cur=n;if(!SIM&&!daily)store.set('bb.dotSel',n);lv=genLevel(n);
    if(daily){if(daily.k==='moves')lv.moves=Math.max(8,Math.round(lv.moves*.85));else if(daily.k==='noloop')lv.moves=Math.round(lv.moves*1.2);else{const free=[...Array(lv.nCol).keys()].filter(c=>lv.goals.colors[c]==null);if(free.length){lv.goals.colors[free[0]]=10;lv.moves+=5}}}
    moves=lv.moves;over=false;path=[];loop=false;fx=[];flash=null;
    hole=new Array(C*Rw).fill(false);lv.holes.forEach(i=>hole[i]=true);ice=new Array(C*Rw).fill(0);lv.ice.forEach(i=>ice[i]=1);fire=new Array(C*Rw).fill(0);lv.fire.forEach(i=>fire[i]=1);
    prog={colors:{},anchors:0,ice:0,stones:0,bub:0,fire:0};g=new Array(C*Rw).fill(null);
    for(let i=0;i<C*Rw;i++){if(hole[i])continue;const[r]=RC(i);g[i]={c:rndCol(-1),y:r-Rw-1}}
    lv.stones.forEach(i=>{if(!hole[i])g[i]={s:2,y:(i/C|0)-Rw-1}});lv.bub.forEach(i=>{if(!hole[i]&&g[i]&&!g[i].s)g[i].b=1});
    let placed=0;if(lv.anchors){const cs=[...Array(C).keys()].filter(c=>!hole[c]&&!g[c].s).sort(()=>Math.random()-.5);for(const c of cs.slice(0,lv.anchors)){g[c]={a:1,y:-1};placed++}}
    anchorsOut=lv.anchors-placed;lv.bubN=g.filter(k=>k&&k.b).length;lv.stN=g.filter(k=>k&&k.s).length;
    ensureMove();state='fall';hud();fillSel();if(!SIM){if(daily)dailyCard();else tip()}}
  function lowest(c){let r=Rw-1;while(r>0&&hole[id(r,c)])r--;return r}
  function hasMove(){for(let i=0;i<C*Rw;i++){const k=g[i];if(!free(k))continue;const[r,c]=RC(i);
      for(const j of[c<C-1?i+1:-1,r<Rw-1?i+C:-1]){if(j<0)continue;const o=g[j];if(!free(o))continue;if(k.j||o.j||k.c===o.c)return true}}return false}
  function ensureMove(){let t=0;while(!hasMove()&&t++<50){const ds=g.map((k,i)=>free(k)&&!k.j?i:-1).filter(i=>i>=0),cs=ds.map(i=>g[i].c);for(let i=cs.length-1;i>0;i--){const j=rnd(i+1);[cs[i],cs[j]]=[cs[j],cs[i]]}ds.forEach((i,k)=>g[i].c=cs[k])}}
  const adj=(a,b)=>{const[r1,c1]=RC(a),[r2,c2]=RC(b);return Math.abs(r1-r2)+Math.abs(c1-c2)===1};
  const pathCol=p=>{for(const i of p)if(g[i]&&!g[i].j)return g[i].c;return 0};
  // cellules entourées par une boucle (centre dans le polygone du chemin)
  function enclosed(p){const poly=p.map(i=>RC(i)),out=[];for(let i=0;i<C*Rw;i++){if(p.includes(i))continue;const[r,c]=RC(i);let ins=false;
      for(let a=0,b=poly.length-1;a<poly.length;b=a++){const[ra,ca]=poly[a],[rb,cb]=poly[b];if((ra>r)!==(rb>r)&&c<(cb-ca)*(r-ra)/(rb-ra)+ca)ins=!ins}if(ins)out.push(i)}return out}
  function commit(){if(path.length<2){path=[];loop=false;return}
    const col=pathCol(path);moves--;const clr=new Set(loop?g.map((k,i)=>match(k,col)?i:-1).filter(i=>i>=0):path);path.forEach(i=>clr.add(i));
    let bolt=-1;if(!loop&&path.length>=7){bolt=path[path.length-1];clr.delete(bolt)}
    // éclairs utilisés : rangée + colonne
    const zs=[...clr].filter(i=>g[i]&&g[i].z);const seen=new Set();while(zs.length){const z=zs.pop();if(seen.has(z))continue;seen.add(z);const[r,c]=RC(z);fx.push({t:'bolt',i:z,age:0});
      for(let j=0;j<C*Rw;j++){const[r2,c2]=RC(j);if((r2===r||c2===c)&&!hole[j]){if(isDot(g[j])){clr.add(j);if(g[j].z)zs.push(j)}else if(g[j]&&g[j].s)hitStone(j)}}}
    // bombes : points entourés par la boucle
    if(loop){const enc=enclosed(path);for(const e of enc){fx.push({t:'boom',i:e,age:0});const[r,c]=RC(e);for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){const rr=r+dr,cc=c+dc;if(rr<0||cc<0||rr>=Rw||cc>=C)continue;const j=id(rr,cc);if(hole[j])continue;
        if(isDot(g[j]))clr.add(j);else if(g[j]&&g[j].s){hitStone(j);hitStone(j)}else if(!g[j])fire[j]&&(fire[j]=0,prog.fire++)}}if(enc.length)snd(6)}
    // effets sur les voisins : pierres fendues, bulles éclatées
    const hit=new Set();clr.forEach(i=>nb4(i).forEach(j=>{if(clr.has(j)||hit.has(j))return;const k=g[j];if(!k)return;if(k.s){hit.add(j);hitStone(j)}else if(k.b){hit.add(j);k.b=0;prog.bub++;fx.push({t:'bub',i:j,age:0})}}));
    let ext=0;clr.forEach(i=>{const k=g[i];if(!k)return;if(k.b){k.b=0;prog.bub++;fx.push({t:'bub',i,age:0});return}
      if(ice[i]){ice[i]=0;prog.ice++}if(fire[i]){fire[i]=0;prog.fire++;ext++}if(!k.j)prog.colors[k.c]=(prog.colors[k.c]||0)+1;
      fx.push({t:'pop',i,c:k.j?-1:k.c,age:-(loop?Math.random()*.15:Math.max(0,path.indexOf(i))*.02)});g[i]=null});
    if(bolt>=0&&g[bolt]){g[bolt]={c:g[bolt].j?col:g[bolt].c,z:1,y:g[bolt].y};fx.push({t:'bolt',i:bolt,age:0});snd(6)}
    // le feu s'étend si aucun n'a été éteint
    if(lv.fire.length){if(ext)prog.calm=0;else prog.calm=(prog.calm||0)+1}
    if(lv.fire.length&&!ext&&prog.calm%2===0){const fs=fire.map((f,i)=>f?i:-1).filter(i=>i>=0);if(fs.length&&fs.length<lv.fire.length+3){const opts=[];fs.forEach(i=>nb4(i).forEach(j=>{if(!fire[j]&&!hole[j]&&!(g[j]&&g[j].s))opts.push(j)}));if(opts.length){const j=opts[rnd(opts.length)];fire[j]=1;fx.push({t:'fire',i:j,age:0})}}}
    if(loop){flash={c:col,age:0};snd(3)}else snd(2,path.length);
    path=[];const lc=loop?col:-1;loop=false;gravity(lc);hud()}
  function hitStone(j){const k=g[j];if(!k||!k.s)return;k.s--;fx.push({t:'crack',i:j,age:0});if(k.s<=0){g[j]=null;prog.stones++}}
  function gravity(ban){for(let c=0;c<C;c++){const keep=[];for(let r=Rw-1;r>=0;r--){const i=id(r,c);if(hole[i])continue;if(g[i])keep.push(g[i]);g[i]=null}
      const slots=[];for(let r=Rw-1;r>=0;r--)if(!hole[id(r,c)])slots.push(r);
      let k2=0;for(const r of slots){if(k2<keep.length){g[id(r,c)]=keep[k2++]}else{
          let tok;if(anchorsOut>0&&Math.random()<.12){tok={a:1};anchorsOut--}else tok=newDot(ban);
          tok.y=-1-(k2-keep.length);g[id(r,c)]=tok;k2++}}}
    state='fall'}
  function settle(){let got=false;for(let c=0;c<C;c++){const r=lowest(c),i=id(r,c);if(g[i]&&g[i].a){fx.push({t:'anc',i,age:0});g[i]=null;prog.anchors++;got=true}}
    if(got){gravity(-1);snd(4);hud();return}
    state='idle';if(done())win();else if(moves<=0)lose();else if(!hasMove()){ensureMove();fx.push({t:'shuf',age:0})}hud()}
  const fireLeft=()=>fire?fire.reduce((a,b)=>a+b,0):0;
  function done(){const G=lv.goals;for(const c in G.colors)if((prog.colors[c]||0)<G.colors[c])return false;if(lv.anchors&&prog.anchors<lv.anchors)return false;if(lv.ice.length&&prog.ice<lv.ice.length)return false;
    if(lv.stN&&prog.stones<lv.stN)return false;if(lv.bubN&&prog.bub<lv.bubN)return false;if(lv.fire.length&&fireLeft()>0)return false;return true}
  function win(){over=true;if(SIM)return;const st=moves>=lv.moves*.3?3:moves>=lv.moves*.15?2:1;const old=stars[cur-1]||0;if(st>old){stars[cur-1]=st;store.set('bb.dotStars',stars)}
    window._duel&&window._duel.report('dot',stars.filter(Boolean).length,'hi');window._duel&&window._duel.report('dotS',stars.reduce((a,b)=>a+(b||0),0),'hi');
    store.set('bb.save.dot',null);
    if(daily){const ds=dayS(),first=ds.won!==dkey();if(first){ds.n++;ds.last=dkey();ds.won=dkey();store.set('bb.dotDay',ds);window._duel&&window._duel.report('dotD',1,'inc')}
      Celebrate.run('fireworks','Défi du jour réussi !',()=>Celebrate.ask('📅 Défi du jour réussi !','🔥 '+ds.n+' jour'+(ds.n>1?'s':'')+' de suite · '+'★'.repeat(st)+' au niveau '+cur+'. Reviens demain pour un nouveau défi.','Carte','Rejouer',()=>mapView(wOf(unlocked())),()=>start(cur,daily)));return}
    const nx=cur<NLV,newW=nx&&wOf(cur+1)!==wOf(cur);
    Celebrate.run(st===3||newW?'fireworks':'confetti',newW?WORLDS[wOf(cur)].e+' '+WORLDS[wOf(cur)].n+' terminé !':'Niveau '+cur+' réussi !',()=>Celebrate.ask('★'.repeat(st)+'☆'.repeat(3-st),'Niveau '+cur+' réussi avec '+moves+' coup'+(moves>1?'s':'')+' d’avance.'+(newW?' Nouveau monde : '+WORLDS[wOf(cur+1)].e+' '+WORLDS[wOf(cur+1)].n+' !':''),nx?'Niveau suivant':'Rejouer','Carte',()=>start(nx?cur+1:cur),()=>mapView(wOf(cur))))}
  function lose(){over=true;if(SIM)return;store.set('bb.save.dot',null);snd(5);Celebrate.ask('Plus de coups','Il te manquait '+missing()+'. On réessaie ?','Réessayer','Carte',()=>start(cur,daily),()=>mapView(wOf(cur)))}
  function missing(){const G=lv.goals,out=[];for(const c in G.colors){const m=G.colors[c]-(prog.colors[c]||0);if(m>0)out.push(m+' '+CN[c])}
    const add=(a,b,s)=>{const m=a-b;if(m>0)out.push(m+' '+s+(m>1?'s':''))};
    if(lv.anchors)add(lv.anchors,prog.anchors,'ancre');if(lv.ice.length)add(lv.ice.length,prog.ice,'glace');if(lv.stN)add(lv.stN,prog.stones,'pierre');if(lv.bubN)add(lv.bubN,prog.bub,'bulle');if(lv.fire.length&&fireLeft())out.push(fireLeft()+' feu'+(fireLeft()>1?'x':''));return out.join(', ')}
  function hud(){if(SIM)return;movesEl.textContent=moves;const G=lv.goals;let h='';const chip=(ic,l)=>`<span class="dg${l?'':' ok'}">${ic} ${l||'✓'}</span>`;
    for(const c in G.colors){const left=Math.max(0,G.colors[c]-(prog.colors[c]||0));h+=`<span class="dg${left?'':' ok'}"><i style="background:${COLS[c]}"></i>${left||'✓'}</span>`}
    if(lv.anchors)h+=chip('⚓',Math.max(0,lv.anchors-prog.anchors));if(lv.ice.length)h+=chip('❄',Math.max(0,lv.ice.length-prog.ice));if(lv.stN)h+=chip('🪨',Math.max(0,lv.stN-prog.stones));
    if(lv.bubN)h+=chip('🫧',Math.max(0,lv.bubN-prog.bub));if(lv.fire.length)h+=chip('🔥',fireLeft());goalsEl.innerHTML=h}
  function fillSel(){if(SIM)return;const w=WORLDS[wOf(cur)];lvlBtn.textContent=daily?'📅 '+cur:w.e+' '+cur}
  function dailyCard(){const ds=dayS(),done=ds.won===dkey();const txt={moves:'Moins de coups que d’habitude : chaque coup compte !',noloop:'Les boucles sont interdites aujourd’hui : seulement des lignes (et des éclairs ⚡).',bonus:'Un objectif de couleur en plus, avec quelques coups de plus.'}[daily.k];
    ov.innerHTML=`<div class="card bsum"><h2>📅 Défi du jour</h2><p>Niveau ${cur} · ${daily.t}</p><p>${txt}</p>${done?'<p class="tdet">✓ Déjà réussi aujourd’hui</p>':''}${ds.n?`<p class="tdet">🔥 Série : ${ds.n} jour${ds.n>1?'s':''}</p>`:''}<div class="brow"><button class="btn" id="dot-tipok">C’est parti !</button></div></div>`;ov.hidden=false;$('#dot-tipok').onclick=()=>{ov.hidden=true}}
  function tip(){const w=wOf(cur),k='bb.dotTip'+w;if(store.get(k,false)||(cur-1)%20!==0)return;store.set(k,true);const W2=WORLDS[w];
    ov.innerHTML=`<div class="card bsum"><h2>${W2.e} ${W2.n}</h2><p>${W2.tip}</p><div class="brow"><button class="btn" id="dot-tipok">C’est parti !</button></div></div>`;ov.hidden=false;$('#dot-tipok').onclick=()=>{ov.hidden=true}}
  function mapView(w){w=Math.max(0,Math.min(WORLDS.length-1,w));const u=unlocked(),W2=WORLDS[w];let h=`<div class="card bsum twv"><div class="bmh"><button class="btn ico" id="dm-prev"${w?'':' disabled'}>◀</button><h2>${W2.e} ${W2.n}</h2><button class="btn ico" id="dm-next"${w<WORLDS.length-1&&u>(w+1)*20?'':' disabled'}>▶</button></div><div class="tlg">`;
    for(let n=w*20+1;n<=w*20+20;n++){const st=stars[n-1]||0,op=n<=u;h+=`<button class="tlc${n===cur?' cur':''}${st?' ok':''}" data-n="${n}"${op?'':' disabled'}><b>${op?n:'🔒'}</b><small>${st?'★'.repeat(st):''}</small></button>`}
    const got=stars.slice(w*20,w*20+20).reduce((a,b)=>a+(b||0),0),dp=dailyPick(),ds=dayS();h+=`</div><p class="tdet">★ ${got} / 60</p><div class="brow"><button class="btn" id="dm-daily">📅 Défi du jour${ds.won===dkey()?' ✓':''}${ds.n?' · 🔥'+ds.n:''}</button><button class="btn alt" id="dm-close">Fermer</button></div></div>`;ov.innerHTML=h;ov.hidden=false;
    ov.querySelectorAll('[data-n]').forEach(b=>b.onclick=()=>{ov.hidden=true;start(+b.dataset.n)});$('#dm-prev').onclick=()=>mapView(w-1);$('#dm-next').onclick=()=>mapView(w+1);$('#dm-close').onclick=()=>{ov.hidden=true};$('#dm-daily').onclick=()=>{ov.hidden=true;const d=dailyPick();start(d.n,d.c)}}

  /* ---------- Toucher ---------- */
  function cellAt(e,tol){const b=cv.getBoundingClientRect(),x=e.clientX-b.left-ox,y=e.clientY-b.top-oy,c=Math.floor(x/cell),r=Math.floor(y/cell);
    if(r<0||c<0||r>=Rw||c>=C)return-1;const dx=x-(c+.5)*cell,dy=y-(r+.5)*cell;if(Math.hypot(dx,dy)>cell*tol)return-1;return id(r,c)}
  let drag=false,pt=null;
  cv.addEventListener('pointerdown',e=>{if(state!=='idle'||over||!ov.hidden)return;const i=cellAt(e,.48);if(i<0||!free(g[i]))return;cv.setPointerCapture(e.pointerId);drag=true;path=[i];loop=false;pt=null;snd(0,1)});
  cv.addEventListener('pointermove',e=>{if(!drag)return;const b=cv.getBoundingClientRect();pt=[e.clientX-b.left,e.clientY-b.top];const i=cellAt(e,.38);if(i<0)return;const last=path[path.length-1];if(i===last)return;
    if(path.length>1&&i===path[path.length-2]){path.pop();if(loop)loop=false;snd(0,path.length);return}
    const col=pathCol(path),allJ=path.every(j=>g[j].j);
    if(loop||!free(g[i])||!adj(i,last))return;if(!(g[i].j||allJ||g[i].c===col))return;
    if(path.includes(i)){if(path.length>=4&&!(daily&&daily.k==='noloop')){path.push(i);loop=true;snd(1)}return}
    path.push(i);snd(0,path.length)});
  const up=()=>{if(!drag)return;drag=false;pt=null;commit()};cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',()=>{drag=false;path=[];loop=false;pt=null});

  /* ---------- Dessin ---------- */
  const cx=i=>ox+(i%C+.5)*cell,cyR=r=>oy+(r+.5)*cell;
  function drawBg(t){const w=wOf(cur),B=WORLDS[w].bg,gr=ctx.createLinearGradient(0,0,0,H);gr.addColorStop(0,B[0]);gr.addColorStop(1,B[1]);ctx.fillStyle=gr;ctx.fillRect(0,0,W,H);
    ctx.save();if(w===0){ctx.fillStyle='rgba(255,220,150,.06)';ctx.beginPath();ctx.ellipse(W/2,H+20,W*.7,60,0,0,7);ctx.fill();ctx.strokeStyle='rgba(255,255,255,.05)';ctx.lineWidth=2;for(let k=0;k<3;k++){ctx.beginPath();for(let x=0;x<=W;x+=10)ctx.lineTo(x,40+k*18+Math.sin(x/30+t+k)*4);ctx.stroke()}}
    else if(w===1){ctx.fillStyle='rgba(90,200,120,.06)';for(let k=0;k<7;k++){const x=k*W/6;ctx.beginPath();ctx.moveTo(x-25,H);ctx.lineTo(x,H-70-(k%3)*20);ctx.lineTo(x+25,H);ctx.fill()}}
    else if(w===2){ctx.fillStyle='rgba(200,235,255,.05)';ctx.beginPath();ctx.moveTo(0,H);ctx.lineTo(W*.3,H-90);ctx.lineTo(W*.55,H-40);ctx.lineTo(W*.8,H-110);ctx.lineTo(W,H-50);ctx.lineTo(W,H);ctx.fill()}
    else if(w===3){ctx.fillStyle='rgba(255,90,40,.07)';ctx.beginPath();ctx.moveTo(W*.2,H);ctx.lineTo(W*.45,H-120);ctx.lineTo(W*.55,H-120);ctx.lineTo(W*.8,H);ctx.fill();for(let k=0;k<8;k++){ctx.fillStyle='rgba(255,150,60,'+(.08+.06*Math.sin(t*2+k))+')';ctx.beginPath();ctx.arc((k*73)%W,H-((t*30+k*50)%H),2,0,7);ctx.fill()}}
    else if(w===4){for(let k=0;k<10;k++){ctx.strokeStyle='rgba(180,240,255,.08)';ctx.beginPath();ctx.arc((k*61)%W,H-((t*20+k*70)%(H+20)),4+(k%3)*3,0,7);ctx.stroke()}}
    else{for(let k=0;k<50;k++){ctx.fillStyle='rgba(255,255,255,'+(.15+.15*Math.sin(t+k))+')';ctx.fillRect((k*37)%W,(k*71)%H,1.5,1.5)}}
    ctx.restore()}
  function frame(dt){
    if(state==='fall'){let mv=false;for(let i=0;i<C*Rw;i++){const k=g[i];if(!k)continue;const r=i/C|0;if(k.y<r){k.v=(k.v||0)+dt*40;k.y=Math.min(r,k.y+k.v*dt);mv=true}else{k.y=r;k.v=0}}if(!mv)settle()}
    if(SIM)return;
    fx=fx.filter(f=>(f.age+=dt)<.5);if(flash&&(flash.age+=dt)>.6)flash=null;
    const k=DPR();ctx.setTransform(k,0,0,k,0,0);ctx.clearRect(0,0,W,H);const t=performance.now()/1000;drawBg(t);
    if(flash){ctx.fillStyle=COLS[flash.c];ctx.globalAlpha=.22*(1-flash.age/.6);ctx.fillRect(0,0,W,H);ctx.globalAlpha=1}
    if(loop&&path.length){ctx.strokeStyle=COLS[pathCol(path)];ctx.globalAlpha=.5+.2*Math.sin(performance.now()/120);ctx.lineWidth=6;ctx.strokeRect(3,3,W-6,H-6);ctx.globalAlpha=1}
    for(let i=0;i<C*Rw;i++){if(hole[i])continue;const[r,c]=RC(i);const x=ox+c*cell,y=oy+r*cell;
      if(fire[i]){const p=cell*.06,gr=ctx.createRadialGradient(x+cell/2,y+cell*.65,2,x+cell/2,y+cell/2,cell*.6);gr.addColorStop(0,'rgba(255,200,80,'+(.55+.15*Math.sin(t*8+i))+')');gr.addColorStop(1,'rgba(255,70,30,.12)');ctx.fillStyle=gr;ctx.beginPath();ctx.roundRect?ctx.roundRect(x+p,y+p,cell-2*p,cell-2*p,cell*.2):ctx.rect(x+p,y+p,cell-2*p,cell-2*p);ctx.fill()}
      else if(ice[i]){ctx.fillStyle='rgba(170,220,255,.22)';ctx.strokeStyle='rgba(200,235,255,.5)';ctx.lineWidth=1.5;const p=cell*.08;ctx.beginPath();ctx.roundRect?ctx.roundRect(x+p,y+p,cell-2*p,cell-2*p,cell*.18):ctx.rect(x+p,y+p,cell-2*p,cell-2*p);ctx.fill();ctx.stroke()}
      else{ctx.fillStyle='rgba(255,255,255,.035)';ctx.beginPath();ctx.arc(x+cell/2,y+cell/2,cell*.12,0,7);ctx.fill()}}
    if(path.length){const col=COLS[pathCol(path)];ctx.strokeStyle=col;ctx.lineWidth=cell*.16;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();
      path.forEach((i,k2)=>{const x=cx(i),y=cyR(i/C|0);k2?ctx.lineTo(x,y):ctx.moveTo(x,y)});if(pt&&!loop)ctx.lineTo(pt[0],pt[1]);ctx.stroke();ctx.lineCap='butt';
      if(!loop&&path.length>=7){ctx.fillStyle='#fff';ctx.font='700 '+Math.round(cell*.4)+'px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('⚡',cx(path[path.length-1]),cyR(path[path.length-1]/C|0)-cell*.45)}}
    for(let i=0;i<C*Rw;i++){const k=g[i];if(!k)continue;const x=cx(i),y=oy+(k.y+.5)*cell;if(y<oy-cell*.5)continue;
      if(k.a){ctx.save();ctx.translate(x,y);ctx.fillStyle='#c9d2f0';ctx.strokeStyle='#5b6596';ctx.lineWidth=2;const s=cell*.3;
        ctx.beginPath();ctx.arc(0,-s*.75,s*.22,0,7);ctx.stroke();ctx.beginPath();ctx.moveTo(0,-s*.55);ctx.lineTo(0,s*.75);ctx.stroke();ctx.beginPath();ctx.moveTo(-s*.45,-s*.2);ctx.lineTo(s*.45,-s*.2);ctx.stroke();
        ctx.beginPath();ctx.arc(0,s*.15,s*.62,.25,Math.PI-.25);ctx.lineWidth=3;ctx.strokeStyle='#c9d2f0';ctx.stroke();ctx.restore();continue}
      if(k.s){const s=cell*.36;ctx.fillStyle=k.s>1?'#8a8f9e':'#a3a8b6';ctx.beginPath();ctx.roundRect?ctx.roundRect(x-s,y-s,2*s,2*s,cell*.12):ctx.rect(x-s,y-s,2*s,2*s);ctx.fill();ctx.strokeStyle='rgba(0,0,0,.35)';ctx.lineWidth=2;
        if(k.s===1){ctx.beginPath();ctx.moveTo(x-s*.6,y-s*.5);ctx.lineTo(x-s*.1,y);ctx.lineTo(x-s*.4,y+s*.6);ctx.moveTo(x-s*.1,y);ctx.lineTo(x+s*.6,y-s*.2);ctx.stroke()}continue}
      const inP=path.includes(i),pc=path.length?pathCol(path):-1,sel=inP||(loop&&match(k,pc));const rad=cell*(sel?.3+.03*Math.sin(t*10):.27);
      if(k.j){const gr=ctx.createConicGradient?ctx.createConicGradient(t,x,y):null;if(gr){COLS.forEach((c2,q)=>gr.addColorStop(q/COLS.length,c2));gr.addColorStop(1,COLS[0]);ctx.fillStyle=gr}else ctx.fillStyle='#fff'}else ctx.fillStyle=COLS[k.c];
      ctx.beginPath();ctx.arc(x,y,rad,0,7);ctx.fill();ctx.fillStyle='rgba(255,255,255,.28)';ctx.beginPath();ctx.arc(x-rad*.3,y-rad*.32,rad*.32,0,7);ctx.fill();
      if(k.z){ctx.fillStyle='#fff';ctx.font='700 '+Math.round(cell*.34)+'px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('⚡',x,y+1)}
      if(k.b){ctx.strokeStyle='rgba(200,245,255,.85)';ctx.lineWidth=2;ctx.fillStyle='rgba(200,245,255,.18)';ctx.beginPath();ctx.arc(x,y,cell*.42,0,7);ctx.fill();ctx.stroke();ctx.fillStyle='rgba(255,255,255,.7)';ctx.beginPath();ctx.arc(x-cell*.18,y-cell*.2,cell*.06,0,7);ctx.fill()}}
    fx.forEach(f=>{if(f.age<0)return;const x=f.i!=null?cx(f.i):0,y=f.i!=null?cyR(f.i/C|0):0,a=1-f.age/.5;
      if(f.t==='pop'){const c2=f.c<0?'#ffffff':COLS[f.c];ctx.strokeStyle=c2;ctx.globalAlpha=a;ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,cell*(.27+f.age*.7),0,7);ctx.stroke();
        ctx.fillStyle=c2;ctx.beginPath();ctx.arc(x,y,cell*.27*Math.max(0,1-f.age*4),0,7);ctx.fill();ctx.globalAlpha=1}
      else if(f.t==='anc'){ctx.globalAlpha=a;ctx.fillStyle='#c9d2f0';ctx.font='700 '+Math.round(cell*.5)+'px Fredoka, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('⚓',x,y+f.age*cell*1.5);ctx.globalAlpha=1}
      else if(f.t==='boom'){ctx.globalAlpha=a;ctx.fillStyle='rgba(255,200,90,.5)';ctx.beginPath();ctx.arc(x,y,cell*(.5+f.age*3),0,7);ctx.fill();ctx.globalAlpha=1}
      else if(f.t==='bolt'){ctx.globalAlpha=a;ctx.fillStyle='rgba(255,255,200,.35)';ctx.fillRect(ox,y-cell*.2,cell*C,cell*.4);ctx.fillRect(x-cell*.2,oy,cell*.4,cell*Rw);ctx.globalAlpha=1}
      else if(f.t==='crack'||f.t==='bub'||f.t==='fire'){ctx.globalAlpha=a;ctx.strokeStyle=f.t==='fire'?'#ff8a3c':f.t==='bub'?'#c8f5ff':'#c0c4d0';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,cell*(.3+f.age),0,7);ctx.stroke();ctx.globalAlpha=1}})}
  function resize(){const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;W=w;H=h;cell=Math.floor(Math.min((w-10)/C,(h-10)/Rw));ox=Math.floor((w-cell*C)/2);oy=Math.floor((h-cell*Rw)/2);
    cv.style.width=W+'px';cv.style.height=H+'px';cv.width=Math.round(W*DPR());cv.height=Math.round(H*DPR())}
  new ResizeObserver(resize).observe(stage);
  let AC=null;
  function snd(k,n=1){if(SIM||store.get('bb.mute',false))return;try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();const t0=AC.currentTime;
    const notes=k===0?[[330*Math.pow(2,Math.min(n,14)/12),0]]:k===1?[[660,0],[880,.06]]:k===2?[[520,0],[700,.05]]:k===3?[[523,0],[659,.06],[784,.12],[1047,.18]]:k===4?[[392,0],[523,.08]]:k===6?[[180,0],[120,.05],[90,.1]]:[[260,0],[200,.15]];
    notes.forEach(([f,d])=>{const o=AC.createOscillator(),v=AC.createGain(),s=t0+d;o.type=k===6?'sawtooth':'sine';o.frequency.value=f;v.gain.setValueAtTime(.0001,s);v.gain.exponentialRampToValueAtTime(.09,s+.008);v.gain.exponentialRampToValueAtTime(.0001,s+.16);o.connect(v).connect(AC.destination);o.start(s);o.stop(s+.2)})}catch(e){}}
  lvlBtn.onclick=()=>mapView(wOf(cur));
  $('#dot-new').onclick=()=>{if(over||moves===lv.moves){start(cur,daily);return}Celebrate.ask('Recommencer le niveau ?','Le niveau repart de zéro.','Recommencer','Continuer',()=>start(cur,daily),null)};
  const tok=k=>k?(k.a?{a:1}:k.s?{s:k.s}:{c:k.c,j:k.j||0,z:k.z||0,b:k.b||0}):null;
  function save(){if(over||daily)return null;if(state!=='idle'||drag)return undefined;if(moves===lv.moves)return null;return{v:2,n:cur,g:g.map(tok),ice,fire,moves,prog,anchorsOut,bubN:lv.bubN,stN:lv.stN}}
  function load(o){if(o.v!==2||!(o.n>=1&&o.n<=unlocked())||!Array.isArray(o.g)||o.g.length!==C*Rw)return;cur=o.n;lv=genLevel(o.n);hole=new Array(C*Rw).fill(false);lv.holes.forEach(i=>hole[i]=true);
    g=o.g.map((k,i)=>k?{...k,y:i/C|0}:null);ice=o.ice;fire=o.fire||new Array(C*Rw).fill(0);moves=o.moves;prog=o.prog;anchorsOut=o.anchorsOut||0;lv.bubN=o.bubN||0;lv.stN=o.stN||0;over=false;path=[];loop=false;fx=[];state='idle';hud();fillSel()}
  start(cur);
  return{frame,resize,save,load,pause(){},resume(){},sub:()=>WORLDS[wOf(unlocked())].e+' Niveau '+unlocked()+' · ★ '+stars.reduce((a,b)=>a+(b||0),0)+(dayS().won===dkey()?' · 📅 ✓':''),
    _sim:{genLevel,start:n=>start(n),setMoves:m=>{moves=m},tick:()=>{let t=0;while(state==='fall'&&t++<400)frame(.05)},get:()=>({g,lv,prog,ice,fire,over,moves}),commitPath:(p,l)=>{path=p;loop=l;commit()},set SIM(v){SIM=v},get SIM(){return SIM}}}
})();
