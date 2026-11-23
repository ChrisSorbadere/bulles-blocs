/* ================= MOTS CROISÉS (mode du jeu Mots · FR / ES / EN) =================
   Grille générée à partir d'une banque de mots avec définitions (cw-xx.json) ; on touche une case et on tape. */
const Cross=(()=>{
  const wrap=$('#crx-wrap'),gridEl=$('#crx-grid'),clueEl=$('#crx-clue'),kbEl=$('#crx-kb'),ov=$('#crx-ov');
  const KB={fr:['azertyuiop','qsdfghjklm','wxcvbn⌫'],es:['qwertyuiop','asdfghjklñ','zxcvbnm⌫'],en:['qwertyuiop','asdfghjkl','zxcvbnm⌫']};
  const SZ=[7,9,11],TGT=[9,15,24];
  const mul=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
  const BANK={};
  async function data(l){if(BANK[l])return BANK[l];const r=await fetch('cw-'+l+'.json');const j=await r.json();
    const cnt={};j.w.forEach(e=>{if(e[2])cnt[e[2]]=(cnt[e[2]]||0)+1});
    return BANK[l]=j.w.map(([w,c,e])=>({w,c,e,ue:!!e&&cnt[e]===1}))}
  let G=null,onDone=null,onTk=null,tick=null,cur=-1,dir=0,badShown='';
  // ---------- génération ----------
  function build(bank,seed,di,cm){const R=mul(seed),N=SZ[di],tgt=TGT[di];
    const pool0=bank.filter(e=>e.w.length<=N&&(cm!=='emoji'||e.ue)&&(di>0||e.w.length<=7));
    let best=null,bs=-1;
    for(let at=0;at<36;at++){const g=Array(N*N).fill(''),du=Array(N*N).fill(0),pl=[],used=new Set();let cross=0;
      const pool=pool0.slice().sort(()=>R()-.5);
      const fits=(w,x0,y0,d)=>{const L=w.length,dx=d?0:1,dy=d?1:0,x1=x0+dx*(L-1),y1=y0+dy*(L-1);if(x0<0||y0<0||x1>=N||y1>=N)return -1;
        const bx=x0-dx,by=y0-dy,ax=x1+dx,ay=y1+dy;if(bx>=0&&by>=0&&g[by*N+bx])return -1;if(ax<N&&ay<N&&g[ay*N+ax])return -1;let c=0;
        for(let k=0;k<L;k++){const x=x0+dx*k,y=y0+dy*k,i=y*N+x;if(g[i]){if(g[i]!==w[k]||du[i]&(1<<d))return -1;c++}
          else{if(d){if(x>0&&g[i-1]||x<N-1&&g[i+1])return -1}else{if(y>0&&g[i-N]||y<N-1&&g[i+N])return -1}}}
        return c<L?c:-1};
      const put=(e,x0,y0,d,c)=>{const dx=d?0:1,dy=d?1:0;for(let k=0;k<e.w.length;k++){const i=(y0+dy*k)*N+x0+dx*k;g[i]=e.w[k];du[i]|=1<<d}pl.push({e,x:x0,y:y0,d});used.add(e.w);cross+=c};
      const first=pool.filter(e=>e.w.length>=N-2);const f=first.length?first[0]:pool[0];
      const fd=R()<.5?0:1,off=Math.floor(R()*(N-f.w.length+1)),mid=Math.floor(N/2)+(R()<.5?-1:0)*(N>7?Math.floor(R()*2):0);
      put(f,fd?mid:off,fd?off:mid,fd,0);
      for(let pass=0;pass<3&&pl.length<tgt;pass++)for(const e of pool){if(pl.length>=tgt)break;if(used.has(e.w))continue;const w=e.w;let opts=[],bc=0;
        for(let i=0;i<N*N;i++){const ch=g[i];if(!ch)continue;const px=i%N,py=i/N|0;for(let k=0;k<w.length;k++)if(w[k]===ch)for(let d=0;d<2;d++){if(du[i]&(1<<d))continue;
          const x0=px-(d?0:k),y0=py-(d?k:0),c=fits(w,x0,y0,d);if(c<1)continue;if(c>bc){bc=c;opts=[]}if(c===bc)opts.push([x0,y0,d])}}
        if(opts.length){const o=opts[Math.floor(R()*opts.length)];put(e,o[0],o[1],o[2],bc)}}
      const filled=g.filter(Boolean).length,sc=pl.length*12+cross*3+filled;if(sc>bs){bs=sc;best={g,pl}}}
    const {g,pl}=best;const starts={};pl.forEach(p=>{const i=p.y*N+p.x;starts[i]=1});let num=0;const nums={};Object.keys(starts).map(Number).sort((a,b)=>a-b).forEach(i=>nums[i]=++num);
    const words=pl.map(p=>({w:p.e.w,c:p.e.c,em:p.e.e,x:p.x,y:p.y,d:p.d,n:nums[p.y*N+p.x],cells:[...p.e.w].map((_,k)=>(p.y+(p.d?k:0))*N+p.x+(p.d?0:k))})).sort((a,b)=>a.d-b.d||a.n-b.n);
    return{N,sol:g,words,nums}}
  // ---------- état ----------
  const wordsAt=i=>G.words.filter(w=>w.cells.includes(i));
  const curWord=()=>{const ws=wordsAt(cur);return ws.find(w=>w.d===dir)||ws[0]};
  function select(i,d){cur=i;const ws=wordsAt(i);if(d!=null)dir=d;if(!ws.some(w=>w.d===dir))dir=ws[0].d;render()}
  function selWord(w){const i=w.cells.find(c=>!G.fill[c])??w.cells[0];dir=w.d;cur=i;render()}
  function render(){if(!G)return;const N=G.N,w=curWord(),hl=new Set(w?w.cells:[]);
    gridEl.style.gridTemplateColumns=`repeat(${N},1fr)`;
    gridEl.innerHTML=G.sol.map((s,i)=>s?`<div class="cc${hl.has(i)?' hl':''}${i===cur?' cur':''}${G.rv[i]?' rv':''}${G.bad[i]?' bad':''}${G.done?' ok':''}" data-i="${i}">${G.nums[i]?'<small>'+G.nums[i]+'</small>':''}${G.fill[i].toUpperCase()}</div>`:'<div class="cx"></div>').join('');
    fitFont();
    if(w){const t=G.cm==='emoji'&&w.em?'<i class="cem">'+w.em+'</i>':w.c;clueEl.querySelector('span').innerHTML=`<b>${w.n}${w.d?'↓':'→'}</b>&nbsp;${t} <small>(${w.w.length})</small>`}
    kbEl.innerHTML=KB[G.lang].map(r=>'<div class="krow">'+[...r].map(k=>`<button class="key${k==='⌫'?' wide':''}" data-k="${k}" aria-label="${k==='⌫'?'Effacer':k}">${k==='⌫'?'⌫':k.toUpperCase()}</button>`).join('')+'</div>').join('')}
  function fitFont(){const W=gridEl.clientWidth;if(W)gridEl.style.fontSize=(W/G.N*.52)+'px'}
  function nextWord(step){const ws=G.words,k=ws.indexOf(curWord());for(let s=1;s<=ws.length;s++){const w=ws[(k+step*s+ws.length*s)%ws.length];if(w.cells.some(c=>!G.fill[c])||s===ws.length){selWord(w);return}}}
  function key(k){if(!G||G.done||cur<0)return;const w=curWord(),p=w.cells.indexOf(cur);
    if(k==='⌫'){if(G.fill[cur]&&!G.rv[cur]){G.fill[cur]='';G.bad[cur]=0}else if(p>0){cur=w.cells[p-1];if(!G.rv[cur]){G.fill[cur]='';G.bad[cur]=0}}changed();return}
    if(!/^[a-zñ]$/.test(k)||k==='ñ'&&G.lang!=='es')return;
    if(!G.rv[cur]){G.fill[cur]=k;G.bad[cur]=0}
    let q=p+1;while(q<w.cells.length&&G.rv[w.cells[q]])q++;
    if(q<w.cells.length)cur=w.cells[q];else if(w.cells.every(c=>G.fill[c]))nextWord(1);changed()}
  function changed(){render();check();onTk&&onTk(G)}
  function check(){if(G.done)return;const cells=G.sol.map((s,i)=>s?i:-1).filter(i=>i>=0);if(!cells.every(i=>G.fill[i]))return;
    if(cells.every(i=>G.fill[i]===G.sol[i])){G.done=true;clearInterval(tick);snd(1);render();onDone&&onDone(G);return}
    const sig=G.fill.join('');if(sig!==badShown){badShown=sig;snd(0);onTk&&onTk(G,'Grille remplie, mais il reste des erreurs')}}
  // ---------- aides ----------
  function help(k){if(!G||G.done)return;const w=curWord();
    if(k==='letter'){let i=G.fill[cur]!==G.sol[cur]?cur:w.cells.find(c=>G.fill[c]!==G.sol[c]);if(i==null)return;G.fill[i]=G.sol[i];G.rv[i]=1;G.bad[i]=0;G.helps++}
    else if(k==='word'){if(w.cells.every(c=>G.fill[c]===G.sol[c]))return;w.cells.forEach(c=>{G.fill[c]=G.sol[c];G.rv[c]=1;G.bad[c]=0});G.helps++;nextWord(1)}
    else if(k==='check'){let n=0;G.sol.forEach((s,i)=>{if(s&&G.fill[i]&&G.fill[i]!==s){G.bad[i]=1;n++}});G.helps++;onTk&&onTk(G,n?n+' lettre'+(n>1?'s':'')+' fausse'+(n>1?'s':''):'Aucune erreur pour l’instant')}
    changed()}
  function helpMenu(){if(!G||G.done)return;const st=Math.max(1,3-G.helps);
    ov.innerHTML=`<div class="card bsum"><h2>Aide</h2><p class="tdet">Chaque aide coûte une étoile (minimum ★). Actuellement : ${'★'.repeat(st)}</p><div class="brow col"><button class="btn" data-h="letter">💡 Révéler une lettre</button><button class="btn" data-h="word">🔤 Révéler le mot</button><button class="btn" data-h="check">✓ Vérifier la grille</button><button class="btn alt" data-h="">Fermer</button></div></div>`;ov.hidden=false;
    ov.querySelectorAll('[data-h]').forEach(b=>b.onclick=()=>{ov.hidden=true;if(b.dataset.h)help(b.dataset.h)})}
  function listView(){if(!G)return;const sec=(d,t)=>`<p class="tdet">${t}</p>`+G.words.filter(w=>w.d===d).map(w=>{const ok=w.cells.every(c=>G.fill[c]);return`<button class="cli${ok?' ok':''}" data-w="${G.words.indexOf(w)}"><b>${w.n}</b> ${G.cm==='emoji'&&w.em?w.em:w.c} <small>(${w.w.length})</small></button>`}).join('');
    ov.innerHTML=`<div class="card bsum cwl"><h2>Définitions</h2>${sec(0,'Horizontalement →')}${sec(1,'Verticalement ↓')}<div class="brow"><button class="btn alt" data-w="-1">Fermer</button></div></div>`;ov.hidden=false;
    ov.querySelectorAll('[data-w]').forEach(b=>b.onclick=()=>{ov.hidden=true;const k=+b.dataset.w;if(k>=0)selWord(G.words[k])})}
  // ---------- saisie ----------
  gridEl.addEventListener('pointerdown',e=>{const c=e.target.closest('.cc');if(!c||!G)return;e.preventDefault();const i=+c.dataset.i;if(i===cur&&wordsAt(i).length>1)select(i,1-dir);else select(i)});
  kbEl.addEventListener('pointerdown',e=>{const b=e.target.closest('.key');if(!b)return;e.preventDefault();key(b.dataset.k)});
  clueEl.addEventListener('click',e=>{const b=e.target.closest('button');if(b){nextWord(+b.dataset.s);return}listView()});
  new ResizeObserver(()=>{if(G)fitFont()}).observe(wrap);
  let AC=null;function snd(k){if(store.get('bb.mute',false))return;try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();const t0=AC.currentTime;
    (k?[[523,0],[659,.1],[784,.2]]:[[300,0],[220,.15]]).forEach(([f,d])=>{const o=AC.createOscillator(),v=AC.createGain(),s=t0+d;o.type='triangle';o.frequency.value=f;v.gain.setValueAtTime(.0001,s);v.gain.exponentialRampToValueAtTime(.06,s+.01);v.gain.exponentialRampToValueAtTime(.0001,s+.15);o.connect(v).connect(AC.destination);o.start(s);o.stop(s+.2)})}catch(e){}}
  // ---------- API ----------
  function start(bank,lang,seed,di,cm,cb,state,onTick){const b=build(bank,seed,di,cm),M=b.N*b.N;
    G={lang,seed,di,cm,...b,fill:Array(M).fill(''),rv:Array(M).fill(0),bad:Array(M).fill(0),helps:0,t:0,done:false};
    if(state){if(Array.isArray(state.fill)&&state.fill.length===M)G.fill=state.fill.slice();if(Array.isArray(state.rv)&&state.rv.length===M)G.rv=state.rv.slice();G.helps=state.helps||0;G.t=state.t||0;G.done=!!state.done}
    onDone=cb;onTk=onTick;badShown='';dir=0;cur=-1;ov.hidden=true;const w=G.words.find(w=>w.cells.some(c=>!G.fill[c]))||G.words[0];selWord(w);
    clearInterval(tick);tick=setInterval(()=>{if(!G||G.done||wrap.offsetParent===null||document.hidden||Celebrate.active()||!ov.hidden)return;G.t++;onTick&&onTick(G)},1000);onTick&&onTick(G);return G}
  function stop(){clearInterval(tick)}
  const stars=g=>Math.max(1,3-g.helps);
  return{data,start,stop,get:()=>G,key,help:helpMenu,list:listView,render,stars,_build:build}
})();
