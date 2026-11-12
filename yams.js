/* ================= YAMS ================= */
const Yams=(()=>{
  const sheetEl=$('#yam-sheet'),diceEl=$('#yam-dice'),rollBtn=$('#yam-roll'),modeSel=$('#yam-mode'),stEl=$('#yam-status');
  const CATS=['As','Deux','Trois','Quatre','Cinq','Six','Brelan','Carré','Full','Petite suite','Grande suite','Yams','Chance'];
  const HELP=['Total des 1','Total des 2','Total des 3','Total des 4','Total des 5','Total des 6','3 dés identiques : total des dés','4 dés identiques : total des dés','3 + 2 identiques : 25 points',
    '4 dés qui se suivent : 30 points','5 dés qui se suivent : 40 points','5 dés identiques : 50 points','Total des dés'];
  const PAR=[3,6,9,12,15,18,17,9,17,22,16,10,22];
  let mode=store.get('bb.yamMode',0);if(!(mode>=0&&mode<=2))mode=0; // 0 solo, 1 contre l'ordi, 2 à deux
  let sheets,turn,dice,held,rolls,over,rolling=0,cpuBusy=false,timer=null,lastCat=null;
  const players=()=>mode===0?1:2;
  const names=()=>mode===0?['Toi']:mode===1?['Toi','Ordi']:[Duel.me()||'Joueur 1',(['Chris','Blanca'].find(p=>p!==Duel.me()))||'Joueur 2'];
  const cpuTurn=()=>mode===1&&turn===1;
  function scoreCat(c,d){const n=[0,0,0,0,0,0,0];let s=0;for(const v of d){n[v]++;s+=v}
    if(c<6)return n[c+1]*(c+1);const mx=Math.max(...n);
    const run=k=>{for(let a=1;a+k-1<=6;a++){let ok=true;for(let b=a;b<a+k;b++)if(!n[b]){ok=false;break}if(ok)return true}return false};
    switch(c){case 6:return mx>=3?s:0;case 7:return mx>=4?s:0;case 8:return(n.includes(3)&&n.includes(2))||mx===5?25:0;
      case 9:return run(4)?30:0;case 10:return run(5)?40:0;case 11:return mx===5?50:0;default:return s}}
  const upper=sh=>sh.slice(0,6).reduce((a,v)=>a+(v||0),0);
  const bonus=sh=>upper(sh)>=63?35:0;
  const total=sh=>sh.reduce((a,v)=>a+(v||0),0)+bonus(sh);
  function newGame(){clearTimeout(timer);sheets=[...Array(players())].map(()=>new Array(13).fill(null));turn=0;dice=[1,2,3,4,5];held=[0,0,0,0,0];rolls=3;over=false;rolling=0;cpuBusy=false;lastCat=null;render();maybeCpu()}
  function roll(){if(over||rolls<=0||rolling)return;rolls--;rolling=.55;held=held.map((h,i)=>rolls===2?0:h);snd(0);
    const fin=dice.map((v,i)=>held[i]?v:1+rnd(6));const t0=performance.now();
    const tick=()=>{const t=(performance.now()-t0)/1000;if(t<.55){dice=dice.map((v,i)=>held[i]?v:1+rnd(6));renderDice(true);requestAnimationFrame(tick)}else{dice=fin;rolling=0;render();if(cpuTurn())timer=setTimeout(cpuStep,650)}};tick()}
  function toggle(i){if(over||rolls===3||rolling||cpuTurn())return;held[i]=held[i]?0:1;snd(1);renderDice()}
  function pick(c){if(over||rolls===3||rolling||sheets[turn][c]!=null)return;const v=scoreCat(c,dice);
    if(v===0&&!cpuTurn()){Celebrate.ask('Barrer « '+CATS[c]+' » ?','Cette case vaudra 0 point.','Barrer','Annuler',()=>commit(c),null);return}commit(c)}
  function commit(c){sheets[turn][c]=scoreCat(c,dice);lastCat=[turn,c];snd(sheets[turn][c]?2:1);
    if(c===11&&sheets[turn][c]===50)Celebrate.run('fireworks','Yams !',null);
    if(sheets.every(sh=>sh.every(v=>v!=null))){end();return}
    turn=(turn+1)%players();rolls=3;held=[0,0,0,0,0];render();maybeCpu()}
  function end(){over=true;render();const T=sheets.map(total),N=names();
    if(mode===0){const b=store.get('bb.yamBest',0),rec=T[0]>b;if(rec)store.set('bb.yamBest',T[0]);window._duel&&window._duel.report('yamS',T[0],'hi');
      Celebrate.run(rec?'fireworks':'confetti',rec?'Nouveau record !':'Partie finie !',()=>Celebrate.ask(rec?'Nouveau record : '+T[0]+' points !':T[0]+' points','Record : '+Math.max(b,T[0])+' points. Une autre partie ?','Rejouer','Revoir la feuille',newGame,null))}
    else if(mode===1){const b=store.get('bb.yamBest',0);if(T[0]>b)store.set('bb.yamBest',T[0]);window._duel&&window._duel.report('yamS',T[0],'hi');
      if(T[0]>T[1]){store.set('bb.yamWins',store.get('bb.yamWins',0)+1);window._duel&&window._duel.report('yamW',1,'inc');
        Celebrate.run('fireworks','Gagné !!',()=>Celebrate.ask('Victoire !',T[0]+' à '+T[1]+' contre l’ordinateur. Une revanche ?','Rejouer','Revoir la feuille',newGame,null))}
      else setTimeout(()=>Celebrate.ask(T[0]===T[1]?'Égalité':'Perdu',T[0]+' à '+T[1]+(T[0]===T[1]?'.':' pour l’ordinateur.')+' Une revanche ?','Revanche','Revoir la feuille',newGame,null),400)}
    else{const w=T[0]===T[1]?-1:T[0]>T[1]?0:1;Celebrate.run('confetti',w<0?'Égalité !':N[w]+' gagne !',()=>Celebrate.ask(w<0?'Égalité !':N[w]+' a gagné !',T[0]+' à '+T[1]+'. Une autre partie ?','Rejouer','Revoir la feuille',newGame,null))}}

  /* ---------- Ordinateur ---------- */
  function bestCat(d,sh){let best=-1,bv=-1e9;for(let c=0;c<13;c++){if(sh[c]!=null)continue;let v=scoreCat(c,d)-PAR[c];
      if(c<6){const u=upper(sh);if(u<63&&u+scoreCat(c,d)>=63)v+=20}
      if(c===12)v-=4;if(scoreCat(c,d)===0)v-=(c===11?2:c<6?(c+1)*.6:PAR[c]*.4);if(v>bv){bv=v;best=c}}return[best,bv]}
  function evalHold(mask,sh,left){let tot=0;const N=left>1?90:140;
    for(let k=0;k<N;k++){const d=dice.map((v,i)=>mask&(1<<i)?v:1+rnd(6));let v=bestCat(d,sh)[1];
      if(left>1){const d2=d.map(x=>x);const n=[0,0,0,0,0,0,0];d2.forEach(x=>n[x]++);const mx=Math.max(...n),face=n.indexOf(mx);
        const d3=d2.map(x=>x===face?x:1+rnd(6));v=Math.max(v,bestCat(d3,sh)[1]*.9+v*.1)}
      tot+=v}return tot/N}
  function cpuStep(){if(over||!cpuTurn())return;const sh=sheets[turn];
    if(rolls===3){roll();return}
    if(rolls>0){const[,now]=bestCat(dice,sh);let bm=31,bv=now;for(let m=0;m<31;m++){const v=evalHold(m,sh,rolls);if(v>bv+.5){bv=v;bm=m}}
      if(bm!==31){held=[0,1,2,3,4].map(i=>bm&(1<<i)?1:0);renderDice();timer=setTimeout(roll,700);return}}
    const[c]=bestCat(dice,sh);timer=setTimeout(()=>commit(c),500)}
  function maybeCpu(){if(cpuTurn()&&!over)timer=setTimeout(cpuStep,700)}

  /* ---------- Affichage ---------- */
  const PIPS={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
  function renderDice(spin){diceEl.innerHTML=dice.map((v,i)=>`<button class="die${held[i]?' held':''}${spin&&!held[i]?' spin':''}${rolls===3&&!over?' idle':''}" data-i="${i}" aria-label="Dé ${v}${held[i]?' (gardé)':''}">${[...Array(9)].map((_,k)=>`<i${PIPS[v].includes(k)?' class="p"':''}></i>`).join('')}</button>`).join('');
    rollBtn.disabled=over||rolls<=0||!!rolling||cpuTurn();rollBtn.textContent=rolls===3?'🎲 Lancer':rolls>0?'🎲 Relancer ('+rolls+')':'Choisis une case';}
  function render(){const N=names(),P=players();
    let h=`<div class="yrow yhead"><span></span>${N.map((n,p)=>`<b class="${p===turn&&!over?'on':''}">${n}</b>`).join('')}</div>`;
    const cell=(p,c)=>{const v=sheets[p][c];if(v!=null)return`<span class="yv${lastCat&&lastCat[0]===p&&lastCat[1]===c?' last':''}">${v}</span>`;
      if(p===turn&&!over&&rolls<3&&!rolling&&!cpuTurn()){const s=scoreCat(c,dice);return`<button class="yp${s?'':' zero'}" data-c="${c}">${s||'–'}</button>`}return'<span class="ye"></span>'};
    for(let c=0;c<13;c++){if(c===6){h+=`<div class="yrow ysub"><span>Bonus (63 → +35)</span>${sheets.map(sh=>`<span>${bonus(sh)?'+35':upper(sh)+'/63'}</span>`).join('')}</div>`}
      h+=`<div class="yrow"><span title="${HELP[c]}">${CATS[c]}<small>${HELP[c]}</small></span>${[...Array(P)].map((_,p)=>cell(p,c)).join('')}</div>`}
    h+=`<div class="yrow ytot"><span>Total</span>${sheets.map(sh=>`<b>${total(sh)}</b>`).join('')}</div>`;
    sheetEl.innerHTML=h;sheetEl.style.setProperty('--cols',P);
    $('#yam-tot').textContent=total(sheets[0]);
    stEl.textContent=over?'Partie terminée':cpuTurn()?'L’ordinateur joue…':(mode===2?'À '+N[turn]+' · ':mode===1?'À toi · ':'')+(rolls===3?'lance les dés':rolls>0?'touche les dés à garder, puis relance ou choisis une case':'choisis une case');
    renderDice()}
  diceEl.addEventListener('click',e=>{const b=e.target.closest('.die');if(b)toggle(+b.dataset.i)});
  sheetEl.addEventListener('click',e=>{const b=e.target.closest('.yp');if(b)pick(+b.dataset.c)});
  rollBtn.onclick=()=>{if(!cpuTurn())roll()};
  let AC=null;
  function snd(k){if(store.get('bb.mute',false))return;try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();const t0=AC.currentTime;
    if(k===0){for(let i=0;i<6;i++){const s=t0+i*.07+Math.random()*.03,len=.04,b=AC.createBuffer(1,Math.ceil(AC.sampleRate*len),AC.sampleRate),d=b.getChannelData(0);for(let j=0;j<d.length;j++)d[j]=(Math.random()*2-1)*Math.pow(1-j/d.length,4);
        const src=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();f.type='bandpass';f.frequency.value=1800+Math.random()*900;g.gain.value=.25;src.buffer=b;src.connect(f).connect(g).connect(AC.destination);src.start(s)}return}
    const o=AC.createOscillator(),v=AC.createGain();o.type='triangle';o.frequency.value=k===1?600:880;v.gain.setValueAtTime(.0001,t0);v.gain.exponentialRampToValueAtTime(.07,t0+.01);v.gain.exponentialRampToValueAtTime(.0001,t0+.15);
    o.connect(v).connect(AC.destination);o.start(t0);o.stop(t0+.2)}catch(e){}}
  modeSel.value=String(mode);modeSel.onchange=()=>{mode=+modeSel.value;store.set('bb.yamMode',mode);modeSel.blur();newGame()};
  $('#yam-new').onclick=()=>{if(over||sheets.every(sh=>sh.every(v=>v==null))){newGame();return}Celebrate.ask('Nouvelle partie ?','La partie en cours sera abandonnée.','Nouvelle partie','Continuer',newGame,null)};
  function save(){if(over)return null;if(rolling)return undefined;if(sheets.every(sh=>sh.every(v=>v==null))&&rolls===3)return null;return{mode,sheets,turn,dice,held,rolls}}
  function load(o){if(!(o.mode>=0&&o.mode<=2)||!Array.isArray(o.sheets))return;mode=o.mode;modeSel.value=String(mode);store.set('bb.yamMode',mode);
    sheets=o.sheets;turn=o.turn||0;dice=o.dice;held=o.held||[0,0,0,0,0];rolls=o.rolls;over=false;rolling=0;lastCat=null;clearTimeout(timer);render()}
  newGame();
  return{frame(){},resize(){},save,load,pause(){clearTimeout(timer)},resume(){clearTimeout(timer);if(cpuTurn()&&!over&&!rolling)timer=setTimeout(cpuStep,600)},
    sub:()=>{const b=store.get('bb.yamBest',0);return['Solo','Contre l’ordi','À deux'][mode]+(b?' · record '+b:'')}}
})();
