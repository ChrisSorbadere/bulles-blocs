/* ================= MOTS (5 lettres, 6 essais · FR / ES / EN) ================= */
const Words=(()=>{
  const gridEl=$('#mot-grid'),kbEl=$('#mot-kb'),langSel=$('#mot-lang'),modeSel=$('#mot-mode'),msgEl=$('#mot-msg'),newBtn=$('#mot-new');
  const KB={fr:['azertyuiop','qsdfghjklm','⏎wxcvbn⌫'],es:['qwertyuiop','asdfghjklñ','⏎zxcvbnm⌫'],en:['qwertyuiop','asdfghjkl','⏎zxcvbnm⌫']};
  const LN={fr:'Français',es:'Español',en:'English'};
  let lang=store.get('bb.motLang',null);if(!KB[lang])lang=I18N.lang==='en'?'en':'fr';
  let mode=store.get('bb.motMode','day');if(mode!=='day'&&mode!=='free')mode='day';
  const DATA={};
  let D=null,target='',guesses=[],cur='',over=false,won=false,busy=false,loading=false,shakeRow=-1,revealRow=-1;
  async function data(l){if(DATA[l])return DATA[l];const r=await fetch('mots-'+l+'.json');const j=await r.json();return DATA[l]={s:j.s,v:new Set(j.v.split(' '))}}
  const dkey=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
  const dayNum=()=>{const d=new Date();return Math.floor((Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())-Date.UTC(2026,0,1))/864e5)};
  const dailyWord=()=>D.s[((dayNum()*7919+({fr:11,es:503,en:977})[lang])%D.s.length+D.s.length)%D.s.length];
  const dayState=()=>{const all=store.get('bb.motDay',{});const s=all[lang];return s&&s.d===dkey()?s:null};
  function saveDay(){const all=store.get('bb.motDay',{});all[lang]={d:dkey(),g:guesses,done:over,won};store.set('bb.motDay',all)}
  const stats=()=>{const all=store.get('bb.motStats',{});return all[lang]||{p:0,w:0,st:0,best:0,dist:[0,0,0,0,0,0],last:''}};
  function saveStats(s){const all=store.get('bb.motStats',{});all[lang]=s;store.set('bb.motStats',all)}
  function score(g,t){const r=[0,0,0,0,0],c={};for(let i=0;i<5;i++){if(g[i]===t[i])r[i]=2;else c[t[i]]=(c[t[i]]||0)+1}
    for(let i=0;i<5;i++)if(r[i]!==2&&c[g[i]]){r[i]=1;c[g[i]]--}return r}

  async function start(fresh){loading=true;msg('');try{D=await data(lang)}catch(e){loading=false;msg('Liste de mots indisponible hors ligne. Ouvre ce jeu une fois avec une connexion.');return}loading=false;
    cur='';busy=false;shakeRow=-1;revealRow=-1;
    if(mode==='day'){target=dailyWord();const s=dayState();guesses=s?s.g.slice():[];over=!!(s&&s.done);won=!!(s&&s.won)}
    else if(fresh||!target||over){let t;do{t=D.s[rnd(Math.min(D.s.length,1200))]}while(t===dailyWord());target=t;guesses=[];over=false;won=false}
    render();if(mode==='day'&&over)msg(won?'Mot du jour trouvé en '+guesses.length+' essai'+(guesses.length>1?'s':'')+' · prochain mot demain':'Le mot du jour était '+target.toUpperCase()+' · prochain mot demain');
    newBtn.disabled=mode==='day'}
  function msg(t){msgEl.textContent=t}
  function render(){let h='';
    for(let r=0;r<6;r++){const g=guesses[r],sc=g?score(g,target):null,typing=r===guesses.length&&!over;
      h+=`<div class="mrow${r===shakeRow?' shake':''}">`;
      for(let c=0;c<5;c++){const ch=g?g[c]:typing?cur[c]||'':'';const cls=g?' t'+sc[c]+(r===revealRow?' flip':''):ch?' fill':'';
        h+=`<div class="mt${cls}" style="${r===revealRow?'animation-delay:'+c*.28+'s':''}">${ch?ch.toUpperCase():''}</div>`}
      h+='</div>'}
    gridEl.innerHTML=h;
    const st={};guesses.forEach((g,ri)=>{if(ri===revealRow)return;const sc=score(g,target);for(let i=0;i<5;i++)st[g[i]]=Math.max(st[g[i]]??-1,sc[i])});
    kbEl.innerHTML=KB[lang].map(row=>'<div class="krow">'+[...row].map(k=>{const s=st[k];const wide=k==='⏎'||k==='⌫';
      return`<button class="key${wide?' wide':''}${s!=null?' k'+s:''}" data-k="${k}" aria-label="${k==='⏎'?'Valider':k==='⌫'?'Effacer':k}">${k==='⏎'?'OK':k.toUpperCase()}</button>`}).join('')+'</div>').join('')}
  function key(k){if(over||busy||loading||!D)return;
    if(k==='⌫'){cur=cur.slice(0,-1);render();return}
    if(k==='⏎'){submit();return}
    if(cur.length<5&&/^[a-zñ]$/.test(k)&&(k!=='ñ'||lang==='es')){cur+=k;render()}}
  function shake(t){msg(t);shakeRow=guesses.length;render();setTimeout(()=>{shakeRow=-1;render()},450);try{navigator.vibrate&&navigator.vibrate(40)}catch(e){}}
  function submit(){if(cur.length<5){shake('Il manque des lettres');return}
    if(!D.v.has(cur)){shake('Ce mot n’est pas dans la liste');return}
    guesses.push(cur);cur='';revealRow=guesses.length-1;busy=true;msg('');render();snd(0);
    const g=guesses[revealRow];won=g===target;over=won||guesses.length>=6;if(mode==='day')saveDay();
    setTimeout(()=>{revealRow=-1;busy=false;render();if(over)finish()},5*280+350)}
  function finish(){const n=guesses.length;
    if(mode==='day'){const s=stats();if(s.last!==dkey()){s.p++;if(won){s.w++;s.dist[n-1]++;s.st=(s.last===prevKey()?s.st:0)+1;s.best=Math.max(s.best,s.st)}else s.st=0;s.last=dkey();saveStats(s)}
      if(won)window._duel&&window._duel.report('motD',1,'inc')}
    else if(won)window._duel&&window._duel.report('motL',1,'inc');
    const s=stats();
    if(won){snd(2);Celebrate.run(n<=2?'fireworks':'confetti',n===1?'Incroyable !':n<=3?'Bravo !!':'Trouvé !',()=>{
        msg(mode==='day'?'Mot du jour trouvé en '+n+' essai'+(n>1?'s':'')+' · prochain mot demain':'Trouvé en '+n+' essai'+(n>1?'s':''));
        Celebrate.ask('Trouvé en '+n+' essai'+(n>1?'s':'')+' !',mode==='day'?'Série : '+s.st+' jour'+(s.st>1?'s':'')+' · '+s.w+' mot'+(s.w>1?'s':'')+' du jour trouvé'+(s.w>1?'s':'')+'. Une partie libre ?':'Un autre mot ?',
          mode==='day'?'Partie libre':'Nouveau mot','Fermer',()=>{setMode('free');start(true)},null)})}
    else{snd(1);msg('Le mot était '+target.toUpperCase());Celebrate.ask('Perdu','Le mot était '+target.toUpperCase()+'. '+(mode==='day'?'Un nouveau mot demain. Une partie libre ?':'Un autre mot ?'),
        mode==='day'?'Partie libre':'Nouveau mot','Fermer',()=>{setMode('free');start(true)},null)}}
  const prevKey=()=>{const d=new Date();d.setDate(d.getDate()-1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
  function setMode(m){mode=m;modeSel.value=m;store.set('bb.motMode',m)}
  kbEl.addEventListener('pointerdown',e=>{const b=e.target.closest('.key');if(!b)return;e.preventDefault();key(b.dataset.k)});
  addEventListener('keydown',e=>{if($('#g-mot').hidden||Celebrate.active()||e.ctrlKey||e.metaKey||e.altKey)return;
    if(e.key==='Enter'){e.preventDefault();key('⏎');return}if(e.key==='Backspace'){e.preventDefault();key('⌫');return}
    let k=(e.key||'').toLowerCase();if(k.length!==1)return;if(k!=='ñ')k=k.normalize('NFD').replace(/[̀-ͯ]/g,'');if(/^[a-zñ]$/.test(k)){e.preventDefault();key(k)}});
  let AC=null;
  function snd(k){if(store.get('bb.mute',false))return;try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();const t0=AC.currentTime;
    (k===0?[0,1,2,3,4].map(i=>[440+i*60,i*.28]):k===2?[[523,0],[659,.1],[784,.2]]:[[300,0],[220,.15]]).forEach(([f,d])=>{const o=AC.createOscillator(),v=AC.createGain(),s=t0+d;o.type='triangle';o.frequency.value=f;
      v.gain.setValueAtTime(.0001,s);v.gain.exponentialRampToValueAtTime(.06,s+.01);v.gain.exponentialRampToValueAtTime(.0001,s+.15);o.connect(v).connect(AC.destination);o.start(s);o.stop(s+.2)})}catch(e){}}
  langSel.innerHTML=Object.entries(LN).map(([k,v])=>`<option value="${k}">${v}</option>`).join('');langSel.value=lang;
  langSel.onchange=()=>{lang=langSel.value;store.set('bb.motLang',lang);langSel.blur();target='';start(true)};
  modeSel.value=mode;modeSel.onchange=()=>{setMode(modeSel.value);modeSel.blur();start(true)};
  newBtn.onclick=()=>{if(mode!=='free')return;if(over||!guesses.length){start(true);return}Celebrate.ask('Nouveau mot ?','Le mot en cours sera abandonné.','Nouveau mot','Continuer',()=>start(true),null)};
  function save(){if(mode!=='free'||over||!guesses.length||busy)return null;return{lang,target,guesses}}
  function load(o){if(!KB[o.lang]||typeof o.target!=='string'||!Array.isArray(o.guesses))return;lang=o.lang;langSel.value=lang;setMode('free');target=o.target;guesses=o.guesses;over=false;won=false;restored=true}
  let restored=false,started=false;
  return{frame(){},resize(){},save,load,pause(){},resume(){},
    enter(){if(!started||(mode==='day'&&target&&target!==(D&&D.s.length?dailyWord():target))){started=true;if(restored){restored=false;data(lang).then(d=>{D=d;render();newBtn.disabled=false}).catch(()=>start(false))}else start(false)}},
    sub:()=>{const s=stats(),d=dayState();return LN[lang]+(d&&d.done?(d.won?' · trouvé ✓':' · raté'):' · mot du jour')+(s.st?' · série '+s.st:'')}}
})();
