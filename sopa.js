/* ================= SOUPE DE LETTRES (mode du jeu Mots · FR / ES / EN) =================
   Grille de lettres, mots d'un thème cachés dans 8 directions ; on glisse le doigt pour les entourer. */
const Sopa=(()=>{
  const wrap=$('#sop-wrap'),gridEl=$('#sop-grid'),svg=$('#sop-svg'),listEl=$('#sop-list'),diffSel=$('#sop-diff');
  // 12 thèmes · mêmes thèmes dans les 3 langues (même ordre) pour le duel
  const TH={
    fr:[['Animaux','chat chien lapin cheval vache mouton cochon poule canard lion tigre girafe zebre singe'],['Cuisine','four poele casserole couteau fourchette cuillere assiette verre tasse bol evier frigo plat louche'],
      ['Fruits','pomme poire banane orange citron fraise cerise raisin peche abricot melon ananas kiwi mangue'],['Voyage','avion train valise billet hotel plage carte passeport bateau gare musee voyage guide photo'],
      ['Maison','porte fenetre table chaise lit canape lampe miroir tapis toit mur escalier jardin cle'],['Couleurs','rouge bleu vert jaune noir blanc gris rose violet orange marron beige turquoise dore'],
      ['Corps','tete main pied bras jambe oeil nez bouche oreille dos genou coude doigt coeur'],['Météo','soleil pluie nuage neige vent orage brume gel chaleur froid eclair tempete grele brise'],
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
  const FILL={fr:'eeeeaaaiiissnnrrttuuoollcdmpvgbfhqjxyzk',es:'eeeaaaooossnnrrlliiddttuucmpbgvyqhfzjñx',en:'eeeettaaoiinnsshrrdlucmwfgypbvkjxqz'};
  const DIFF=[{n:'Facile',sz:8,w:6,dirs:[[1,0],[0,1]]},{n:'Moyen',sz:10,w:8,dirs:[[1,0],[0,1],[1,1],[1,-1]]},{n:'Difficile',sz:12,w:10,dirs:[[1,0],[0,1],[1,1],[1,-1],[-1,0],[0,-1],[-1,-1],[-1,1]]}];
  const COLS=['#ff5d8a','#ffc54d','#5dd6ff','#4fd67a','#b78cff','#ff9a3c','#7fe3d0','#f28cd0','#9fd36b','#6fa8ff'];
  const mul=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
  let G=null,sel=null,onDone=null,timer=0,tick=null;
  // ---------- génération ----------
  function gen(lang,seed,di){const R=mul(seed),D=DIFF[di],sz=D.sz,ti=Math.floor(R()*TH[lang].length),[tn,ws]=TH[lang][ti];
    const words=ws.split(' ').filter(w=>w.length<=sz&&w.length>=3).sort(()=>R()-.5).slice(0,D.w+3).sort((a,b)=>b.length-a.length);
    const g=[...Array(sz)].map(()=>Array(sz).fill('')),placed=[];
    for(const w of words){if(placed.length>=D.w)break;for(let t=0;t<300;t++){const[dx,dy]=D.dirs[Math.floor(R()*D.dirs.length)],x0=Math.floor(R()*sz),y0=Math.floor(R()*sz),x1=x0+dx*(w.length-1),y1=y0+dy*(w.length-1);
        if(x1<0||x1>=sz||y1<0||y1>=sz)continue;let ok=true;for(let i=0;i<w.length;i++){const c=g[y0+dy*i][x0+dx*i];if(c&&c!==w[i]){ok=false;break}}if(!ok)continue;
        for(let i=0;i<w.length;i++)g[y0+dy*i][x0+dx*i]=w[i];placed.push({w,x0,y0,dx,dy});break}}
    const F=FILL[lang];for(let y=0;y<sz;y++)for(let x=0;x<sz;x++)if(!g[y][x])g[y][x]=F[Math.floor(R()*F.length)];
    return{lang,seed,di,ti,tn,sz,g,words:placed.sort((a,b)=>a.w.localeCompare(b.w)),found:[],t:0}}
  // ---------- rendu ----------
  function render(){if(!G)return;const sz=G.sz;gridEl.style.gridTemplateColumns=`repeat(${sz},1fr)`;
    gridEl.innerHTML=G.g.map((r,y)=>r.map((c,x)=>`<div class="sc" data-x="${x}" data-y="${y}">${c.toUpperCase()}</div>`).join('')).join('');
    listEl.innerHTML=G.words.map((w,i)=>`<span class="sw${G.found.includes(i)?' ok':''}" style="${G.found.includes(i)?'--c:'+COLS[i%COLS.length]:''}">${w.w.toUpperCase()}</span>`).join('');draw()}
  function cellBox(){const r=gridEl.getBoundingClientRect(),wr=wrap.getBoundingClientRect();return{x:r.left-wr.left,y:r.top-wr.top,c:r.width/G.sz}}
  function draw(){if(!G)return;const b=cellBox(),line=(x0,y0,x1,y1,col,op)=>`<line x1="${b.x+(x0+.5)*b.c}" y1="${b.y+(y0+.5)*b.c}" x2="${b.x+(x1+.5)*b.c}" y2="${b.y+(y1+.5)*b.c}" stroke="${col}" stroke-opacity="${op}" stroke-width="${b.c*.78}" stroke-linecap="round"/>`;
    let h='';G.found.forEach(i=>{const w=G.words[i];h+=line(w.x0,w.y0,w.x0+w.dx*(w.w.length-1),w.y0+w.dy*(w.w.length-1),COLS[i%COLS.length],.45)});
    if(sel&&sel.e)h+=line(sel.s[0],sel.s[1],sel.e[0],sel.e[1],'#ffffff',.35);svg.innerHTML=h}
  // ---------- saisie ----------
  function cellAt(e){const b=cellBox(),wr=wrap.getBoundingClientRect(),x=Math.floor((e.clientX-wr.left-b.x)/b.c),y=Math.floor((e.clientY-wr.top-b.y)/b.c);return x>=0&&y>=0&&x<G.sz&&y<G.sz?[x,y]:null}
  function snap(s,c){let dx=c[0]-s[0],dy=c[1]-s[1];if(!dx&&!dy)return s;const a=Math.round(Math.atan2(dy,dx)/(Math.PI/4)),ux=Math.round(Math.cos(a*Math.PI/4)),uy=Math.round(Math.sin(a*Math.PI/4)),n=Math.max(Math.abs(dx),Math.abs(dy));
    let e=[s[0]+ux*n,s[1]+uy*n];e=[Math.max(0,Math.min(G.sz-1,e[0])),Math.max(0,Math.min(G.sz-1,e[1]))];const m=Math.min(ux?Math.abs(e[0]-s[0]):99,uy?Math.abs(e[1]-s[1]):99);return[s[0]+ux*m,s[1]+uy*m]}
  wrap.addEventListener('pointerdown',e=>{if(!G||G.done)return;const c=cellAt(e);if(!c)return;sel={s:c,e:c};try{wrap.setPointerCapture(e.pointerId)}catch(_){}draw()});
  wrap.addEventListener('pointermove',e=>{if(!sel)return;const c=cellAt(e);if(!c)return;sel.e=snap(sel.s,c);draw()});
  const endSel=()=>{if(!sel)return;const{s,e}=sel;sel=null;const dx=Math.sign(e[0]-s[0]),dy=Math.sign(e[1]-s[1]),n=Math.max(Math.abs(e[0]-s[0]),Math.abs(e[1]-s[1]))+1;
    let str='';for(let i=0;i<n;i++)str+=G.g[s[1]+dy*i][s[0]+dx*i];const rev=[...str].reverse().join('');
    const i=G.words.findIndex((w,k)=>!G.found.includes(k)&&(w.w===str||w.w===rev));
    if(i>=0&&n>1){G.found.push(i);snd(1);if(navigator.vibrate)try{navigator.vibrate(15)}catch(_){}render();if(G.found.length===G.words.length)finish()}else{if(n>1)snd(0);draw()}};
  wrap.addEventListener('pointerup',endSel);wrap.addEventListener('pointercancel',()=>{sel=null;draw()});
  function finish(){G.done=true;clearInterval(tick);onDone&&onDone(G)}
  let AC=null;function snd(k){if(store.get('bb.mute',false))return;try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();const t0=AC.currentTime,o=AC.createOscillator(),v=AC.createGain();
    o.type='triangle';o.frequency.value=k?660:200;v.gain.setValueAtTime(.0001,t0);v.gain.exponentialRampToValueAtTime(.06,t0+.01);v.gain.exponentialRampToValueAtTime(.0001,t0+.18);o.connect(v).connect(AC.destination);o.start(t0);o.stop(t0+.2)}catch(e){}}
  new ResizeObserver(()=>draw()).observe(wrap);
  // ---------- API ----------
  function start(lang,seed,di,cb,state,onTick){G=gen(lang,seed,di);if(state){G.found=state.found||[];G.t=state.t||0;G.done=!!state.done}onDone=cb;sel=null;render();clearInterval(tick);
    tick=setInterval(()=>{if(!G||G.done||wrap.hidden||document.hidden)return;G.t++;onTick&&onTick(G)},1000);onTick&&onTick(G);return G}
  function stop(){clearInterval(tick)}
  return{start,stop,get:()=>G,DIFF,TH,render}
})();
