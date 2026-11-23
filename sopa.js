/* ================= SOUPE DE LETTRES (mode du jeu Mots · FR / ES / EN) =================
   Grille de lettres, mots d'un thème cachés dans 8 directions ; on glisse le doigt pour les entourer. */
const Sopa=(()=>{
  const wrap=$('#sop-wrap'),gridEl=$('#sop-grid'),svg=$('#sop-svg'),listEl=$('#sop-list'),diffSel=$('#sop-diff');
  // 12 thèmes · mêmes thèmes dans les 3 langues (même ordre) pour le duel
  const TH={
    fr:[['Animaux','chat chien lapin cheval vache mouton cochon poule canard lion tigre girafe zebre singe'],['Cuisine','four poele casserole couteau fourchette cuillere assiette verre tasse bol evier frigo plat louche'],
      ['Fruits','pomme poire banane orange citron fraise cerise raisin peche abricot melon ananas kiwi mangue'],['Voyage','avion train valise billet hotel plage carte passeport bateau gare musee voyage guide photo'],
      ['Maison','porte fenetre table chaise lit canape lampe miroir tapis toit mur escalier jardin cle'],['Couleurs','rouge bleu vert jaune noir blanc gris rose violet orange marron beige turquoise dore'],
      ['Corps','tete main pied bras jambe oeil nez bouche oreille dos genou coude doigt coeur'],['Météo','soleil pluie nuage neige vent orage brume gel chaleur froid arcenciel eclair grele brise'],
      ['Sports','football tennis rugby golf natation ski velo boxe judo course danse voile basket escalade'],['Métiers','medecin professeur pompier boulanger cuisinier pilote avocat juge peintre facteur fermier dentiste policier artiste'],
      ['Nature','arbre fleur riviere montagne foret lac mer ile desert volcan prairie colline rocher sable'],['École','livre cahier stylo crayon gomme regle classe eleve tableau cartable craie lecon devoir examen']],
    es:[['Animales','gato perro conejo caballo vaca oveja cerdo gallina pato leon tigre jirafa cebra mono'],['Cocina','horno sarten olla cuchillo tenedor cuchara plato vaso taza cuenco fregadero nevera bandeja cazo'],
      ['Frutas','manzana pera platano naranja limon fresa cereza uva melocoton albaricoque melon piña kiwi mango'],['Viaje','avion tren maleta billete hotel playa mapa pasaporte barco estacion museo viaje guia foto'],
      ['Casa','puerta ventana mesa silla cama sofa lampara espejo alfombra techo pared escalera jardin llave'],['Colores','rojo azul verde amarillo negro blanco gris rosa morado naranja marron beis turquesa dorado'],
      ['Cuerpo','cabeza mano pie brazo pierna ojo nariz boca oreja espalda rodilla codo dedo corazon'],['Tiempo','sol lluvia nube nieve viento tormenta niebla hielo calor frio arcoiris rayo granizo brisa'],
      ['Deportes','futbol tenis rugby golf natacion esqui ciclismo boxeo judo carrera baile vela baloncesto escalada'],['Oficios','medico profesor bombero panadero cocinero piloto abogado juez pintor cartero granjero dentista policia artista'],
      ['Naturaleza','arbol flor rio montaña bosque lago mar isla desierto volcan prado colina roca arena'],['Escuela','libro cuaderno boligrafo lapiz goma regla clase alumno pizarra mochila tiza leccion deberes examen']],
    en:[['Animals','cat dog rabbit horse cow sheep pig hen duck lion tiger giraffe zebra monkey'],['Kitchen','oven pan pot knife fork spoon plate glass cup bowl sink fridge tray ladle'],
      ['Fruits','apple pear banana orange lemon strawberry cherry grape peach apricot melon pineapple kiwi mango'],['Travel','plane train suitcase ticket hotel beach map passport boat station museum trip guide photo'],
      ['Home','door window table chair bed sofa lamp mirror rug roof wall stairs garden key'],['Colours','red blue green yellow black white grey pink purple orange brown beige turquoise gold'],
      ['Body','head hand foot arm leg eye nose mouth ear back knee elbow finger heart'],['Weather','sun rain cloud snow wind storm fog frost heat cold rainbow thunder hail breeze'],
      ['Sports','football tennis rugby golf swimming skiing cycling boxing judo running dance sailing basketball climbing'],['Jobs','doctor teacher firefighter baker cook pilot lawyer judge painter postman farmer dentist police artist'],
      ['Nature','tree flower river mountain forest lake sea island desert volcano meadow hill rock sand'],['School','book notebook pen pencil eraser ruler class pupil board schoolbag chalk lesson homework exam']]};
  // mots mystères (lettres restantes de la grille), par thème
  const MY={fr:['ferme savane jungle','recette menu repas','verger panier jus','vacances valise route','maison salon foyer','arcenciel peinture palette','sante muscle squelette','climat saison ciel','stade match equipe','travail metier bureau','paysage planete terre','lecture rentree cartable'],
    es:['granja sabana selva','receta menu comida','huerto cesta zumo','vacaciones ruta mapa','hogar salon piso','pintura paleta matiz','salud musculo hueso','clima estacion cielo','estadio partido equipo','trabajo oficio empleo','paisaje planeta tierra','lectura curso aula'],
    en:['farm savanna jungle','recipe menu meal','orchard basket juice','holiday journey road','house living cosy','rainbow paint palette','health muscle skeleton','climate season sky','stadium match team','work career office','landscape planet earth','reading term classroom']};
  // indices en emoji (même ordre que les mots de chaque thème, communs aux 3 langues)
  const EMO=['🐱|🐶|🐰|🐴|🐮|🐑|🐷|🐔|🦆|🦁|🐯|🦒|🦓|🐒','🔥|🍳|🍲|🔪|🍴|🥄|🍽️|🥛|☕|🥣|🚰|🧊|🍱|🍲🥄','🍎|🍐|🍌|🍊|🍋|🍓|🍒|🍇|🍑|🟠🍑|🍈|🍍|🥝|🥭',
    '✈️|🚆|🧳|🎫|🏨|🏖️|🗺️|🛂|⛵|🚉|🏛️|🌍|🧭|📷','🚪|🪟|🍽️🪵|🪑|🛏️|🛋️|💡|🪞|🧶|🏠⬆️|🧱|🪜|🌷|🔑','🔴|🔵|🟢|🟡|⚫|⚪|🩶|🩷|🟣|🟠|🟤|🏜️|🩵|🥇',
    '🙂|✋|🦶|💪|🦵|👁️|👃|👄|👂|🔙|🧎|💪📐|☝️|❤️','☀️|🌧️|☁️|❄️|💨|⛈️|🌫️|🧊|🥵|🥶|🌈|⚡|🌨️|🍃','⚽|🎾|🏉|⛳|🏊|⛷️|🚴|🥊|🥋|🏃|💃|⛵|🏀|🧗',
    '🩺|🧑‍🏫|🧑‍🚒|🥖|🧑‍🍳|🧑‍✈️|💼⚖️|🧑‍⚖️|🎨|📮|🧑‍🌾|🦷|👮|🎭','🌳|🌸|🏞️|⛰️|🌲|🛶|🌊|🏝️|🏜️|🌋|🌾|🌄|🪨|🏖️','📖|📓|🖊️|✏️|🧽|📏|🏫|🧒|⬛✍️|🎒|🖍️|📚|📝|💯'].map(x=>x.split('|'));
  const LN={fr:'français',es:'espagnol',en:'anglais'};
  const norm=t=>t.toLowerCase().replace(/ñ/g,'\u0001').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\u0001/g,'ñ').replace(/[^a-zñ]/g,'');
  const FILL={fr:'eeeeaaaiiissnnrrttuuoollcdmpvgbfhqjxyzk',es:'eeeaaaooossnnrrlliiddttuucmpbgvyqhfzjñx',en:'eeeettaaoiinnsshrrdlucmwfgypbvkjxqz'};
  const DIFF=[{n:'Facile',sz:7,dirs:[[1,0],[0,1]]},{n:'Moyen',sz:8,dirs:[[1,0],[0,1],[1,1],[1,-1]]},{n:'Difficile',sz:9,dirs:[[1,0],[0,1],[1,1],[1,-1],[-1,0],[0,-1],[-1,-1],[-1,1]]}];
  const COLS=['#ff5d8a','#ffc54d','#5dd6ff','#4fd67a','#b78cff','#ff9a3c','#7fe3d0','#f28cd0','#9fd36b','#6fa8ff'];
  const mul=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
  let G=null,sel=null,onDone=null,timer=0,tick=null,onTk=null;
  // ---------- génération ----------
  function gen(lang,seed,di,fti){const R=mul(seed),D=DIFF[di],r0=Math.floor(R()*TH[lang].length),ti=fti!=null?fti:r0,[tn,ws0]=TH[lang][ti],ws=ws0.split(' ');
    const my0=MY[lang][ti].split(' '),my=[...my0];for(const a of my0)for(const b of my0)if(a!==b)my.push(a+' '+b);const LS=new Set(my.map(x=>x.replace(' ','').length)),minL=Math.min(...LS);
    for(let sz=D.sz;sz>=6;sz--)for(let a=0;a<900;a++){const g=[...Array(sz)].map(()=>Array(sz).fill(''));let free=sz*sz;const pl=[];
      const order=ws.map((w,idx)=>({w,idx})).filter(o=>o.w.length<=sz).sort(()=>R()-.5);
      for(const o of order){if(LS.has(free)&&pl.length>=5&&R()<.5)break;const w=o.w;for(let t=0;t<80;t++){const[dx,dy]=D.dirs[Math.floor(R()*D.dirs.length)],x0=Math.floor(R()*sz),y0=Math.floor(R()*sz),x1=x0+dx*(w.length-1),y1=y0+dy*(w.length-1);
          if(x1<0||x1>=sz||y1<0||y1>=sz)continue;let ok=true,nw=0;for(let k=0;k<w.length;k++){const c=g[y0+dy*k][x0+dx*k];if(c&&c!==w[k]){ok=false;break}if(!c)nw++}if(!ok||!nw||free-nw<minL)continue;
          for(let k=0;k<w.length;k++)g[y0+dy*k][x0+dx*k]=w[k];free-=nw;pl.push({w,idx:o.idx,x0,y0,dx,dy});break}}
      if(!LS.has(free)||pl.length<5)continue;const c=my.filter(x=>x.replace(' ','').length===free),m=c[Math.floor(R()*c.length)],ml=m.replace(' ','');let q=0;
      for(let y=0;y<sz;y++)for(let x=0;x<sz;x++)if(!g[y][x])g[y][x]=ml[q++];
      const nb=pl.length>=9?2:pl.length>=6?1:0,bon=[];for(let k=0;k<nb;k++)bon.push(pl.splice(Math.floor(R()*pl.length),1)[0]);
      return{lang,seed,di,ti,tn,sz,g,mys:m,words:pl.sort((a,b)=>a.w.localeCompare(b.w)),bonus:bon,bf:[],found:[],t:0}}
    return null}
  // ---------- rendu ----------
  function render(){if(!G)return;const sz=G.sz;gridEl.style.gridTemplateColumns=`repeat(${sz},1fr)`;
    gridEl.innerHTML=G.g.map((r,y)=>r.map((c,x)=>`<div class="sc" data-x="${x}" data-y="${y}">${c.toUpperCase()}</div>`).join('')).join('');
    const cl=G.clue||'words';listEl.innerHTML=G.words.map((w,i)=>{const f=G.found.includes(i),W=w.w.toUpperCase();let t;
        if(cl==='emoji')t=EMO[G.ti][w.idx]+' '+(f?W:'·'.repeat(w.w.length));else if(cl.startsWith('tr:')){const tr=TH[cl.slice(3)][G.ti][1].split(' ')[w.idx].toUpperCase();t=f?tr+' → '+W:tr}else t=W;
        return`<span class="sw${f?' ok':''}" style="${f?'--c:'+COLS[i%COLS.length]:''}">${t}</span>`}).join('')+
      (G.bonus.length?`<div class="sbon">⭐ Mots bonus cachés : ${G.bf.length}/${G.bonus.length}${G.bf.length?' · '+G.bf.map(i=>G.bonus[i].w.toUpperCase()).join(', '):''}</div>`:'')+`<div class="smys">🔎 ${G.mok?'Mot mystère : <b>'+G.mys.toUpperCase()+'</b>'+(G.early?' ⭐':''):`Mot mystère : ${G.mys.split(' ').map(x=>'_'.repeat(x.length)).join(' ')} <small>(${G.mys.replace(' ','').length} lettres)</small><span class="sgi"><input id="sop-in" autocomplete="off" autocapitalize="characters" placeholder="?"><button class="btn sbtn" id="sop-guess">OK</button></span>`+(G.found.length===G.words.length?' <button class="btn sbtn alt" id="sop-reveal">Révéler</button>':'')}</div>`;
    const gb=$('#sop-guess');if(gb)gb.onclick=guess;const ib=$('#sop-in');if(ib)ib.onkeydown=e=>{if(e.key==='Enter')guess()};const rb=$('#sop-reveal');if(rb)rb.onclick=()=>{G.mok=1;G.early=0;G.rev=1;render();check()};draw()}
  function guess(){const inp=$('#sop-in'),v=inp?inp.value:'';if(!v.trim())return;if(norm(v)===norm(G.mys)){G.mok=1;G.early=G.found.length<G.words.length?1:0;snd(1);render();onTk&&onTk(G,null,{k:'mys'});check()}else{snd(0);inp.value='';onTk&&onTk(G,'Ce n’est pas le mot mystère')}}
  function check(){if(G.found.length===G.words.length&&G.mok&&!G.done)finish()}
  function cellBox(){const r=gridEl.getBoundingClientRect(),wr=wrap.getBoundingClientRect();return{x:r.left-wr.left,y:r.top-wr.top,c:r.width/G.sz}}
  function draw(){if(!G)return;const b=cellBox(),line=(x0,y0,x1,y1,col,op)=>`<line x1="${b.x+(x0+.5)*b.c}" y1="${b.y+(y0+.5)*b.c}" x2="${b.x+(x1+.5)*b.c}" y2="${b.y+(y1+.5)*b.c}" stroke="${col}" stroke-opacity="${op}" stroke-width="${b.c*.78}" stroke-linecap="round"/>`;
    let h='';G.found.forEach(i=>{const w=G.words[i];h+=line(w.x0,w.y0,w.x0+w.dx*(w.w.length-1),w.y0+w.dy*(w.w.length-1),COLS[i%COLS.length],.45)});
    G.bf.forEach(i=>{const w=G.bonus[i];h+=line(w.x0,w.y0,w.x0+w.dx*(w.w.length-1),w.y0+w.dy*(w.w.length-1),'#ffd27a',.5)});
    if(G.found.length===G.words.length){const used=new Set();[...G.words,...G.bonus].forEach(w=>{for(let k=0;k<w.w.length;k++)used.add((w.x0+w.dx*k)+','+(w.y0+w.dy*k))});for(let y=0;y<G.sz;y++)for(let x=0;x<G.sz;x++)if(!used.has(x+','+y))h+=`<circle cx="${b.x+(x+.5)*b.c}" cy="${b.y+(y+.5)*b.c}" r="${b.c*.42}" fill="#ffd27a" fill-opacity=".55"/>`}
    if(sel&&sel.e)h+=line(sel.s[0],sel.s[1],sel.e[0],sel.e[1],'#ffffff',.35);svg.innerHTML=h}
  // ---------- saisie ----------
  function cellAt(e){const b=cellBox(),wr=wrap.getBoundingClientRect(),x=Math.floor((e.clientX-wr.left-b.x)/b.c),y=Math.floor((e.clientY-wr.top-b.y)/b.c);return x>=0&&y>=0&&x<G.sz&&y<G.sz?[x,y]:null}
  function snap(s,c){let dx=c[0]-s[0],dy=c[1]-s[1];if(!dx&&!dy)return s;const a=Math.round(Math.atan2(dy,dx)/(Math.PI/4)),ux=Math.round(Math.cos(a*Math.PI/4)),uy=Math.round(Math.sin(a*Math.PI/4)),n=Math.max(Math.abs(dx),Math.abs(dy));
    let e=[s[0]+ux*n,s[1]+uy*n];e=[Math.max(0,Math.min(G.sz-1,e[0])),Math.max(0,Math.min(G.sz-1,e[1]))];const m=Math.min(ux?Math.abs(e[0]-s[0]):99,uy?Math.abs(e[1]-s[1]):99);return[s[0]+ux*m,s[1]+uy*m]}
  wrap.addEventListener('pointerdown',e=>{if(!G||G.done)return;const c=cellAt(e);if(!c)return;sel={s:c,e:c};try{wrap.setPointerCapture(e.pointerId)}catch(_){}draw()});
  wrap.addEventListener('pointermove',e=>{if(!sel)return;const c=cellAt(e);if(!c)return;sel.e=snap(sel.s,c);draw()});
  const endSel=()=>{if(!sel)return;const{s,e}=sel;sel=null;const dx=Math.sign(e[0]-s[0]),dy=Math.sign(e[1]-s[1]),n=Math.max(Math.abs(e[0]-s[0]),Math.abs(e[1]-s[1]))+1;
    let str='';for(let i=0;i<n;i++)str+=G.g[s[1]+dy*i][s[0]+dx*i];const rev=[...str].reverse().join('');
    const i=G.words.findIndex((w,k)=>!G.found.includes(k)&&(w.w===str||w.w===rev)),bi=i<0?G.bonus.findIndex((w,k)=>!G.bf.includes(k)&&(w.w===str||w.w===rev)):-1;
    if(bi>=0&&n>1){G.bf.push(bi);snd(1);render();onTk&&onTk(G,'⭐ Mot bonus : '+G.bonus[bi].w.toUpperCase()+' !',{k:'bonus',w:G.bonus[bi].w});return}
    if(i>=0&&n>1){G.found.push(i);snd(1);if(navigator.vibrate)try{navigator.vibrate(15)}catch(_){}render();onTk&&onTk(G,null,{k:'word',w:G.words[i].w});if(G.found.length===G.words.length){onTk&&onTk(G,G.mok?'':'Tous les mots trouvés ! Les lettres restantes forment le mot mystère 🔎');check()}}else{if(n>1)snd(0);draw()}};
  wrap.addEventListener('pointerup',endSel);wrap.addEventListener('pointercancel',()=>{sel=null;draw()});
  function finish(){G.done=true;clearInterval(tick);onDone&&onDone(G)}
  let AC=null;function snd(k){if(store.get('bb.mute',false))return;try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();const t0=AC.currentTime,o=AC.createOscillator(),v=AC.createGain();
    o.type='triangle';o.frequency.value=k?660:200;v.gain.setValueAtTime(.0001,t0);v.gain.exponentialRampToValueAtTime(.06,t0+.01);v.gain.exponentialRampToValueAtTime(.0001,t0+.18);o.connect(v).connect(AC.destination);o.start(t0);o.stop(t0+.2)}catch(e){}}
  new ResizeObserver(()=>draw()).observe(wrap);
  // ---------- API ----------
  function start(lang,seed,di,cb,state,onTick,clue,ti){G=gen(lang,seed,di,ti);G.clue=clue||'words';if(state){G.found=state.found||[];G.t=state.t||0;G.done=!!state.done;G.mok=state.mok||0;G.early=state.early||0;G.bf=state.bf||[]}onDone=cb;onTk=onTick;sel=null;render();clearInterval(tick);
    tick=setInterval(()=>{if(!G||G.done||wrap.offsetParent===null||document.hidden||Celebrate.active())return;G.t++;onTick&&onTick(G)},1000);onTick&&onTick(G);return G}
  function stop(){clearInterval(tick)}
  return{start,stop,get:()=>G,DIFF,TH,render,LN,EMO}
})();
