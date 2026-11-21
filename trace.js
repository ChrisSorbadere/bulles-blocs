/* ================= TRACE (dessiner ce qui manque) =================
   Physique : Planck.js (MIT), chargé à la première ouverture du jeu. */
const Trace=(()=>{
  const cv=$('#trc-cv'),ctx=cv.getContext('2d'),stage=$('#trc-stage'),ov=$('#trc-ov'),lvlSel=$('#trc-lvl'),msgEl=$('#trc-msg'),goBtn=$('#trc-go');
  const FW=10,FH=15,PR=.09,TH=.15,DT=1/60;
  let P=null,loading=null;
  /* ---------- Niveaux ----------
     k : water | ball | meet | protect · m : s (trait fixe) / d (trait qui tombe)
     segs [x1,y1,x2,y2] · boxes [x,y,w,h] · nd zones interdites [x,y,w,h] · glass [x,y,w,h,inversé] · tap [x,y,n,kind]
     ball [x,y,r] · ball2 [x,y,r] · basket [x,y,w,h] · egg [x,y] · rocks [x0,x1,n,T] · springs [x,y,w] · fans [x,y,w,h] · saw [x,y,len] · portals [x1,y1,x2,y2] */
  const G=(x,y,w=1.6,h=1.8,inv=0)=>[x,y,w,h,inv];
  const LV=[
    {k:'water',m:'s',tap:[2,13.6,90,'water'],glass:G(6.6,1)},
    {k:'water',m:'s',tap:[8,13.6,90,'water'],glass:G(1.4,1.2)},
    {k:'ball',m:'s',ball:[2,13,.35],basket:[6.4,.8,2.2,1.4]},
    {k:'water',m:'s',tap:[6,13.6,90,'water'],glass:G(4.8,1),segs:[[3.3,5.4,6.7,5.4]]},
    {k:'meet',m:'s',ball:[1.6,13,.35],ball2:[7.6,1.6,.35],segs:[[6.6,1.1,8.6,1.1],[6.6,1.1,6.6,1.8],[8.6,1.1,8.6,1.8]]},
    {k:'water',m:'s',tap:[1.8,13.6,90,'water'],glass:G(7.2,1),nd:[[3.4,1.6,2.6,6]]},
    {k:'protect',m:'s',egg:[5,1.3],segs:[[0,.8,10,.8]],rocks:[3.6,6.4,9,4],nd:[[3.7,4.2,2.6,9]]},
    {k:'ball',m:'s',ball:[1.6,13,.35],springs:[[1.6,2.4,1.6]],basket:[7,6,2,1.4]},
    {k:'water',m:'s',tap:[2,1.6,80,'bubble'],glass:G(6.6,11.4,1.6,1.8,1)},
    {k:'water',m:'s',tap:[8.2,13.6,90,'sand'],glass:G(1.2,1),segs:[[4,9,6.5,7.5]]},
    {k:'ball',m:'d',ball:[2.2,8.4,.4],free:1,segs:[[1,7.9,3.4,7.9],[3.8,6.6,6.6,3.2]],basket:[6.8,.8,2.2,1.4]},
    {k:'meet',m:'s',ball:[8.4,13,.35],ball2:[1.6,1.6,.35],segs:[[.6,1.1,2.6,1.1],[.6,1.1,.6,1.8],[2.6,1.1,2.6,1.8],[4,8,6,8]]},
    {k:'water',m:'s',tap:[5,13.6,90,'water'],glass:G(8,1.2),segs:[[6.8,0,6.8,6]],nd:[[3,2,2,4]]},
    {k:'protect',m:'d',egg:[5,1.3],segs:[[0,.8,10,.8],[3,2.6,3.6,2.6],[6.4,2.6,7,2.6]],rocks:[3.4,6.6,10,4.5]},
    {k:'ball',m:'s',ball:[8.4,13,.35],basket:[.8,4.5,2,1.4],segs:[[4,3,7,3]],springs:[[5.5,3.1,1.8]]},
    {k:'water',m:'s',tap:[1.5,13.6,100,'water'],glass:G(4.2,1),saw:[[5,7,3.6]]},
    {k:'meet',m:'d',ball:[2,6.4,.4],free:1,ball2:[8,1.5,.35],segs:[[1,6,3,6],[3.4,4.6,6.8,1.6],[7,1,9,1],[7,1,7,1.7],[9,1,9,1.7]]},
    {k:'water',m:'s',tap:[8.4,1.6,90,'bubble'],glass:G(1.6,11.4,1.6,1.8,1),segs:[[4,6,6,8]]},
    {k:'ball',m:'s',ball:[5,13.4,.35],basket:[7.6,.8,1.8,1.4],segs:[[3,6.5,7,6.5]],nd:[[6.6,7,3.4,6]]},
    {k:'water',m:'s',tap:[2,13.6,90,'water'],glass:G(6.8,1),fans:[[3.6,1,2,3.6]]},
    {k:'protect',m:'s',egg:[2,1.3],segs:[[0,.8,10,.8]],rocks:[.6,4.4,12,5],nd:[[0,3.6,4.8,8]]},
    {k:'ball',m:'s',ball:[1.6,13,.35],portals:[[1.6,3.4,8,12]],basket:[.4,.8,2,1.4],nd:[[2.6,0,1.6,5]]},
    {k:'water',m:'s',tap:[2,13.6,100,'sand'],glass:G(7.2,5),segs:[[6.2,4.9,10,4.9]]},
    {k:'meet',m:'s',ball:[5,13.4,.35],ball2:[1,8.5,.35],segs:[[.2,8,1.8,8],[.2,8,.2,8.7]],nd:[[3,4,4,3]]},
    {k:'water',m:'s',tap:[5,13.6,100,'water'],glass:G(1,1),nd:[[0,3.6,4,3],[6,3.6,4,3]]},
    {k:'ball',m:'d',ball:[7.8,10.4,.4],free:1,segs:[[6.6,10,9,10],[6.4,7,3.4,3.4]],basket:[1,.8,2.2,1.4]},
    {k:'protect',m:'d',egg:[5,6.3],segs:[[3.8,5.8,6.2,5.8]],rocks:[3,7,10,5]},
    {k:'water',m:'s',tap:[8,13.6,90,'water'],glass:G(4.2,1),saw:[[5,6.5,3.2]],segs:[[2.6,9,4.2,9]]},
    {k:'ball',m:'s',ball:[1.4,13,.35],springs:[[1.4,3,1.4]],basket:[7.4,6,1.8,1.4],segs:[[7,5.9,10,5.9]]},
    {k:'water',m:'s',tap:[5,1.6,90,'bubble'],glass:G(1,11.6,1.6,1.8,1),nd:[[3,7,4,3]]},
    {k:'meet',m:'s',ball:[1.4,13,.35],ball2:[8.6,13,.35],segs:[]},
    {k:'water',m:'s',tap:[1.6,13.6,100,'water'],glass:G(7.6,8.2),segs:[[7.4,8.1,9.4,8.1]]},
    {k:'protect',m:'s',egg:[5,1.3],segs:[[0,.8,10,.8]],rocks:[.5,9.5,16,6],nd:[[3.4,2.2,3.2,12]]},
    {k:'meet',m:'d',ball:[7.8,9.4,.4],free:1,ball2:[4.6,1.5,.35],segs:[[6.8,9,9,9],[6.6,7.4,5,3],[3.6,1,5.6,1],[3.6,1,3.6,1.7],[5.6,1,5.6,1.7]]},
    {k:'ball',m:'s',ball:[1.4,13,.35],basket:[7.8,10,1.8,1.4],fans:[[4.2,.5,2.2,10]]},
    {k:'water',m:'s',tap:[1.6,13.6,110,'water'],glass:G(4.2,1),nd:[[3,3.2,4,1.4]],segs:[[0,6,3.4,6],[6.6,6,10,6]]},
    {k:'protect',m:'d',egg:[2,1.3],segs:[[0,.8,10,.8],[4.2,4,6,4]],rocks:[.4,4,12,5]},
    {k:'water',m:'s',tap:[2,13.6,110,'water'],glass:G(7.4,1.2),saw:[[4.6,8,3.4]]},
  ];
  // Solutions trouvées et vérifiées automatiquement (simulation déterministe) : servent d'indice et de référence pour l'encre et les étoiles
  const SOL={"1":{"len":3.02,"st":[[[4.47,5.33],[4.08,5.58],[3.68,5.82],[3.29,6.06],[2.89,6.31],[2.5,6.55],[2.1,6.79],[1.9,6.92]]]},"2":{"len":2.39,"st":[[[6.07,7.96],[6.49,8.19],[6.9,8.43],[7.32,8.67],[7.73,8.9],[8.15,9.14]]]},"3":{"len":1.97,"st":[[[3.61,6.77],[3.13,6.9],[2.66,7.04],[2.18,7.17],[1.71,7.3]]]},"4":{"len":3.6,"st":[[[3.8,4.2],[3.38,4.44],[2.97,4.68],[2.55,4.92],[2.14,5.16],[1.72,5.4],[1.31,5.64],[0.89,5.88],[0.68,6]]]},"5":{"len":1.71,"st":[[[3.16,10.89],[2.72,11.1],[2.28,11.3],[1.83,11.51],[1.61,11.61]]]},"6":{"len":1.38,"st":[[[3.04,9.78],[2.61,9.94],[2.18,10.11],[1.75,10.28]]]},"7":{"len":1.64,"st":[[[5.81,3.34],[5.37,3.48],[4.92,3.62],[4.48,3.76],[4.25,3.83]]]},"8":{"len":3.3,"st":[[[1.55,10.78],[2,10.66],[2.46,10.55],[2.92,10.43],[3.37,10.32],[3.83,10.2],[4.29,10.08],[4.75,9.97]]]},"9":{"len":4.21,"st":[[[5.76,6.63],[5.31,6.42],[4.87,6.21],[4.42,5.99],[3.97,5.78],[3.53,5.56],[3.08,5.35],[2.63,5.14],[2.18,4.92],[1.96,4.81]]]},"10":{"len":3.91,"st":[[[8.29,7.54],[7.87,7.29],[7.45,7.04],[7.03,6.79],[6.61,6.54],[6.19,6.29],[5.77,6.04],[5.35,5.79],[4.94,5.54]]]},"11":{"len":6.47,"st":[[[2.36,13.66],[2.81,13.47],[3.26,13.27],[3.7,13.08],[4.15,12.89],[4.6,12.69],[5.04,12.5],[5.49,12.3],[5.94,12.11],[6.39,11.92],[6.83,11.72],[6.39,11.61],[5.94,11.5],[5.5,11.39],[5.28,11.34]]]},"12":{"len":3.21,"st":[[[8.41,6.46],[7.93,6.35],[7.45,6.24],[6.97,6.13],[6.49,6.02],[6.01,5.91],[5.52,5.8],[5.28,5.75]]]},"13":{"len":0.59,"st":[[[4.68,11.56],[4.92,11.25],[5.04,11.1]]]},"14":{"len":1.84,"st":[[[4.83,3.53],[5.28,3.43],[5.73,3.33],[6.18,3.23],[6.63,3.13]]]},"15":{"len":0.43,"st":[[[8.64,9.71],[8.22,9.64]]]},"16":{"len":0.58,"st":[[[0.98,9.7],[1.3,9.49],[1.46,9.38]]]},"17":{"len":1.33,"st":[[[2.21,10.61],[2.41,10.21],[2.6,9.81],[2.79,9.42]]]},"18":{"len":4.26,"st":[[[8.56,2.35],[8.15,2.59],[7.75,2.84],[7.34,3.08],[6.93,3.32],[6.53,3.56],[6.12,3.81],[5.71,4.05],[5.31,4.29],[4.9,4.53]]]},"19":{"len":2.55,"st":[[[4.6,6.72],[4.55,7.18],[4.49,7.64],[4.43,8.1],[4.37,8.56],[4.31,9.02],[4.29,9.25]]]},"20":{"len":1.51,"st":[[[2.86,7.47],[2.44,7.57],[2.02,7.68],[1.61,7.78],[1.4,7.83]]]},"21":{"len":2.23,"st":[[[1.36,3.39],[1.83,3.23],[2.29,3.06],[2.76,2.89],[3.23,2.73],[3.46,2.64]]]},"22":{"len":2.52,"st":[[[9.1,10.24],[8.83,9.87],[8.55,9.51],[8.27,9.14],[8,8.78],[7.72,8.41],[7.58,8.23]]]},"23":{"len":4.8,"st":[[[1.74,10.66],[2.16,10.42],[2.58,10.19],[3,9.96],[3.42,9.73],[3.84,9.49],[4.26,9.26],[4.68,9.03],[5.1,8.79],[5.52,8.56],[5.94,8.33]]]},"24":{"len":1.83,"st":[[[3.44,9.63],[3.87,9.78],[4.3,9.93],[4.73,10.07],[5.17,10.22]]]},"25":{"len":2.74,"st":[[[4.92,8.47],[5.2,8.8],[5.48,9.12],[5.76,9.45],[6.15,9.64],[6.64,9.68],[7.13,9.73]]]},"26":{"len":7.9,"st":[[[1.44,7.15],[1.9,7.34],[2.36,7.52],[2.82,7.71],[3.27,7.9],[3.73,8.08],[4.19,8.27],[4.65,8.45],[5.1,8.64],[5.56,8.82],[6.02,9.01],[6.48,9.19],[6.94,9.38],[7.39,9.56],[7.85,9.75],[8.31,9.93],[8.77,10.12]]]},"27":{"len":2.66,"st":[[[6.58,10.27],[6.36,9.84],[6.14,9.41],[5.92,8.98],[5.7,8.55],[5.48,8.12],[5.37,7.91]]]},"28":{"len":0.51,"st":[[[7.82,6.68],[8.11,6.86],[8.25,6.95]]]},"29":{"len":5.1,"st":[[[1.43,9.03],[1.92,8.97],[2.4,8.91],[2.88,8.85],[3.36,8.79],[3.84,8.73],[4.33,8.66],[4.81,8.6],[5.29,8.54],[5.77,8.48],[6.25,8.42],[6.49,8.39]]]},"30":{"len":1.41,"st":[[[3.97,3.67],[4.37,3.42],[4.77,3.17],[5.16,2.92]]]},"31":{"len":9.56,"st":[[[0.59,7.59],[1.03,7.39],[1.48,7.19],[1.92,6.99],[2.37,6.78],[2.82,6.58],[3.26,6.38],[3.71,6.18],[4.15,5.98],[4.57,6.03],[4.95,6.34],[5.33,6.65],[5.72,6.96],[6.1,7.26],[6.48,7.57],[6.87,7.88],[7.25,8.19],[7.63,8.49],[8.02,8.8],[8.4,9.11],[8.59,9.26]]]},"32":{"len":4.33,"st":[[[5.37,11.88],[4.9,11.96],[4.43,12.04],[3.95,12.13],[3.48,12.21],[3.01,12.3],[2.53,12.38],[2.06,12.47],[1.58,12.55],[1.11,12.64]]]},"33":{"len":0.98,"st":[[[4.16,1.38],[4.46,1.77],[4.76,2.16]]]},"34":{"len":0.01,"st":[[[7.6,12.85],[7.6,12.85]]]},"35":{"len":1.52,"st":[[[2.95,9.45],[2.52,9.51],[2.09,9.57],[1.66,9.63],[1.45,9.66]]]},"36":{"len":2.08,"st":[[[1.54,10],[1.75,9.58],[1.96,9.17],[2.16,8.76],[2.37,8.34],[2.48,8.14]]]},"37":{"len":2.54,"st":[[[3.17,3.33],[3.16,2.87],[3.16,2.41],[3.15,1.95],[3.15,1.49],[3.14,1.02],[3.14,0.79]]]},"38":{"len":2.14,"st":[[[1.67,7.04],[2.13,6.92],[2.59,6.79],[3.05,6.66],[3.5,6.54],[3.73,6.48]]]}};
  const KIND={water:'Remplis le verre',ball:'Amène la balle dans le panier',meet:'Fais se toucher les deux balles',protect:'Protège l’œuf des cailloux'};
  const KIND2={water:'Remplis le récipient avec les bulles',sand:'Remplis le verre de sable'};

  /* ---------- Monde physique ---------- */
  const V=(x,y)=>P.Vec2(x,y);
  function seg(body,x1,y1,x2,y2,th,opt){const cx=(x1+x2)/2,cy=(y1+y2)/2,len=Math.hypot(x2-x1,y2-y1),a=Math.atan2(y2-y1,x2-x1);body.createFixture(new P.Box(len/2+th/2,th/2,V(cx,cy),a),opt||{friction:.35})}
  function glassWalls(g){const[x,y,w,h,inv]=g;return inv?[[x-.08,y+h,x+w+.08,y+h],[x,y,x,y+h],[x+w,y,x+w,y+h]]:[[x-.08,y,x+w+.08,y],[x,y,x,y+h],[x+w,y,x+w,y+h]]}
  const mul=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
  function build(lv,strokes,q){const w=new P.World({gravity:V(0,-10)}),S={w,lv,R:mul(LV.indexOf(lv)*977+5),t:0,parts:[],spawned:0,res:0,hold:0,met:0,broke:0,rocks:[],rockN:0,q,pcool:new Map(),saws:[]};
    const gnd=w.createBody();
    (lv.segs||[]).forEach(s=>seg(gnd,...s,TH));(lv.boxes||[]).forEach(([x,y,bw,bh])=>gnd.createFixture(new P.Box(bw/2,bh/2,V(x+bw/2,y+bh/2),0),{friction:.4}));
    if(lv.glass)glassWalls(lv.glass).forEach(s=>seg(gnd,...s,.12,{friction:.2}));
    if(lv.basket){const[x,y,bw,bh]=lv.basket;[[x,y,x+bw,y],[x,y,x,y+bh],[x+bw,y,x+bw,y+bh]].forEach(s=>seg(gnd,...s,.12))}
    (lv.springs||[]).forEach(([x,y,sw])=>gnd.createFixture(new P.Box(sw/2,.1,V(x,y),0),{restitution:1.05,friction:.2,userData:'spring'}));
    (lv.saw||[]).forEach(([x,y,len])=>{const b=w.createBody({type:'dynamic',position:V(x,y),angularDamping:.4});b.createFixture(new P.Box(len/2,.08),{density:1.2,friction:.4});
      w.createJoint(new P.RevoluteJoint({},gnd,b,V(x,y)));S.saws.push(b)});
    const mk=(x,y,r,ud)=>{const b=w.createBody({type:'dynamic',position:V(x,y),bullet:true});b.createFixture(new P.Circle(r),{density:1,friction:.35,restitution:.25,userData:ud});return b};
    if(lv.ball)S.ball=mk(...lv.ball,'ball');if(lv.ball2)S.ball2=mk(...lv.ball2,'ball2');
    if(lv.egg){const b=w.createBody({type:'dynamic',position:V(...lv.egg)});b.createFixture(new P.Circle(.42),{density:1,friction:.9,userData:'egg'});S.egg=b}
    for(const st of strokes){if(st.length<2)continue;const dyn=lv.m==='d';const b=w.createBody({type:dyn?'dynamic':'static'});
      for(let i=1;i<st.length;i++)seg(b,st[i-1][0],st[i-1][1],st[i][0],st[i][1],.14,{density:1,friction:.5});
      for(const p of st)b.createFixture(new P.Circle(.07,V(p[0],p[1])),{density:1,friction:.5})}
    w.on('begin-contact',c=>{const a=c.getFixtureA().getUserData(),b=c.getFixtureB().getUserData();
      if((a==='ball'&&b==='ball2')||(a==='ball2'&&b==='ball'))S.met=1;if((a==='egg'&&b==='rock')||(a==='rock'&&b==='egg'))S.broke=1});
    return S}
  function inGlass(g,x,y){const[gx,gy,w,h,inv]=g;return x>gx&&x<gx+w&&(inv?(y<gy+h&&y>gy-.1):(y>gy&&y<gy+h+.15))}
  function stepSim(S){const lv=S.lv,w=S.w;S.t+=DT;
    if(lv.tap){const[x,y,n0,kind]=lv.tap,n=S.q?Math.round(n0*.6):n0,dur=2.2;while(S.spawned<n&&S.spawned<n*S.t/dur){S.spawned++;
        const b=w.createBody({type:'dynamic',position:V(x+(S.R()-.5)*.25,y+(S.R()-.5)*.1),linearVelocity:V((S.R()-.5)*.3,kind==='bubble'?1.5:-1.5),gravityScale:kind==='bubble'?-.45:1,linearDamping:kind==='bubble'?1.2:0,fixedRotation:true});
        b.createFixture(new P.Circle(PR),{density:kind==='sand'?1.6:1,friction:kind==='sand'?.3:0,restitution:0,userData:'p'});S.parts.push(b)}}
    if(lv.rocks&&S.t>.8){const[x0,x1,n,T]=lv.rocks;while(S.rockN<n&&S.rockN<n*(S.t-.8)/(T-1.5)){S.rockN++;const b=w.createBody({type:'dynamic',position:V(x0+S.R()*(x1-x0),FH+.5),bullet:true});
        b.createFixture(new P.Circle(.22+S.R()*.1),{density:2.2,friction:.4,restitution:.2,userData:'rock'});S.rocks.push(b)}}
    if(lv.fans)for(const b of[...S.parts,S.ball,S.ball2].filter(Boolean)){const p=b.getPosition();for(const[fx,fy,fw,fh]of lv.fans)if(p.x>fx&&p.x<fx+fw&&p.y>fy&&p.y<fy+fh)b.applyForceToCenter(V(0,b.getMass()*22),true)}
    if(lv.portals)for(const b of[...S.parts,S.ball,S.ball2].filter(Boolean)){const p=b.getPosition();for(const[x1,y1,x2,y2]of lv.portals){if((p.x-x1)**2+(p.y-y1)**2<.25&&(S.pcool.get(b)||0)<S.t){b.setPosition(V(x2,y2));S.pcool.set(b,S.t+.5)}}}
    w.step(DT,S.q?4:8,S.q?2:3);
    // résultat
    if(S.res)return;const k=lv.k;
    if(k==='water'){const n=lv.tap[2]*(S.q?.6:1),endT=2.2+2.5;if(S.t>endT&&Math.round(S.t*4)!==Math.round((S.t-DT)*4)){const c=S.parts.filter(b=>{const p=b.getPosition();return inGlass(lv.glass,p.x,p.y)}).length;S.fill=c/n;if(c>=n*.5)S.res=1}
      if(S.t>endT+4)S.res=-1}
    else if(k==='ball'){const p=S.ball.getPosition(),[x,y,bw,bh]=lv.basket;if(p.x>x&&p.x<x+bw&&p.y>y&&p.y<y+bh){S.hold+=DT;if(S.hold>.5)S.res=1}else S.hold=0;if(p.y<-2||S.t>14)S.res=-1}
    else if(k==='meet'){if(S.met)S.res=1;else if(S.t>14||S.ball.getPosition().y<-2&&S.ball2.getPosition().y<-2)S.res=-1}
    else if(k==='protect'){if(S.broke||S.egg.getPosition().y<-1)S.res=-1;else if(S.t>=lv.rocks[3]+1.5)S.res=1}}
  function fillNow(S){const lv=S.lv;if(lv.k!=='water')return 0;const n=lv.tap[2]*(S.q?.6:1);return S.parts.filter(b=>{const p=b.getPosition();return inGlass(lv.glass,p.x,p.y)}).length/n}

  /* ---------- Dessin des traits ---------- */
  const inkLen=st=>{let L=0;for(let i=1;i<st.length;i++)L+=Math.hypot(st[i][0]-st[i-1][0],st[i][1]-st[i-1][1]);return L};
  function okPoint(lv,x,y){if(x<.1||x>FW-.1||y<.1||y>FH-.1)return false;for(const[nx,ny,nw,nh]of lv.nd||[])if(x>nx&&x<nx+nw&&y>ny&&y<ny+nh)return false;
    const objs=[lv.ball&&[lv.ball[0],lv.ball[1],lv.ball[2]+.2],lv.ball2&&[lv.ball2[0],lv.ball2[1],lv.ball2[2]+.2],lv.egg&&[lv.egg[0],lv.egg[1],.65],lv.tap&&[lv.tap[0],lv.tap[1],.5]].filter(Boolean);
    for(const[ox2,oy2,r]of objs)if((x-ox2)**2+(y-oy2)**2<r*r)return false;
    if(lv.glass){const[gx,gy,w,h]=lv.glass;if(x>gx-.15&&x<gx+w+.15&&y>gy-.15&&y<gy+h+.15)return false}
    if(lv.basket){const[bx,by,bw,bh]=lv.basket;if(x>bx-.1&&x<bx+bw+.1&&y>by-.1&&y<by+bh+.1)return false}
    return true}

  /* ---------- État du jeu ---------- */
  let stars=store.get('bb.trcStars',[]);if(!Array.isArray(stars))stars=[];
  const unlocked=()=>{let n=1;while(stars[n-1])n++;return Math.min(n,LV.length)};
  let cur=Math.min(store.get('bb.trcSel',1),unlocked())||1,lv=null,strokes=[],drawing=null,S=null,phase='draw',W=300,H=300,sc=20,ox=0,oy=0,acc=0,hintT=0,ready=false;
  const inkMax=()=>lv.ink||(SOL[cur]?Math.max(SOL[cur].len*2.2,SOL[cur].len+4,6):9);
  const inkUsed=()=>strokes.reduce((a,s)=>a+inkLen(s),0)+(drawing?inkLen(drawing):0);
  function start(n,keep){cur=n;store.set('bb.trcSel',n);lv=LV[n-1];if(!keep)strokes=[];drawing=null;S=null;phase='draw';ov.hidden=true;hintT=0;
    say(objective()+' · '+(lv.m==='d'?'tes traits tombent':'tes traits restent fixes'));fillSel();ui();if(!keep)store.set('bb.save.trc',null)}
  function objective(){if(lv.k==='water'&&lv.tap[3]!=='water')return KIND2[lv.tap[3]==='bubble'?'water':'sand'];return KIND[lv.k]}
  function say(t){msgEl.textContent=t}
  function ui(){const m=inkMax(),u=inkUsed();$('#trc-inkv').textContent=Math.max(0,Math.round((1-u/m)*100))+' %';$('#trc-inkbar').style.width=Math.max(0,(1-u/m)*100)+'%';
    goBtn.textContent=phase==='draw'?'▶ Lancer':phase==='run'?'⏹ Arrêter':'↻ Recommencer';goBtn.disabled=phase==='draw'&&!strokes.length&&lv.k!=='meet'}
  function fillSel(){const u=unlocked();let h='';for(let n=Math.max(u,cur);n>=1;n--)h+=`<option value="${n}">Niveau ${n}${stars[n-1]?' '+'★'.repeat(stars[n-1]):''}</option>`;lvlSel.innerHTML=h;lvlSel.value=String(cur)}
  function launch(){if(!P)return;S=build(lv,strokes,false);phase='run';acc=0;ui();snd(0);store.set('bb.save.trc',{n:cur,strokes})}
  function finish(win){phase='end';ui();
    if(win){const used=inkUsed(),best=SOL[cur]?SOL[cur].len:used,st=used<=Math.max(best*1.6,best+1.5)?3:used<=best*2.6+1?2:1,old=stars[cur-1]||0;if(st>old){stars[cur-1]=st;store.set('bb.trcStars',stars)}
      window._duel&&window._duel.report('trcL',unlocked()-(unlocked()===LV.length&&stars[LV.length-1]?0:1),'hi');window._duel&&window._duel.report('trcS',stars.reduce((a,b)=>a+(b||0),0),'hi');
      store.set('bb.save.trc',null);snd(1);
      Celebrate.run(st===3?'fireworks':'confetti','Réussi !',()=>{ov.innerHTML=`<div class="card bsum"><h2>Réussi !</h2><div class="bst">${'★'.repeat(st)}${'☆'.repeat(3-st)}</div><p>Encre utilisée : ${Math.round(used/inkMax()*100)} %${st<3?' · moins d’encre pour plus d’étoiles':''}</p>
        <div class="brow">${cur<LV.length?'<button class="btn" id="trc-next">Niveau suivant</button>':''}<button class="btn alt" id="trc-again">Rejouer</button></div></div>`;ov.hidden=false;
        const nx=$('#trc-next');if(nx)nx.onclick=()=>start(cur+1);$('#trc-again').onclick=()=>start(cur)})}
    else{snd(2);ov.innerHTML=`<div class="card bsum"><h2>Raté…</h2><p>${lv.k==='water'?'Le verre n’est pas assez rempli.':lv.k==='protect'?'L’œuf s’est cassé !':lv.k==='meet'?'Les balles ne se sont pas touchées.':'La balle n’est pas dans le panier.'}</p>
      <div class="brow"><button class="btn" id="trc-retry">Modifier mon dessin</button><button class="btn alt" id="trc-clear">Tout effacer</button></div></div>`;ov.hidden=false;
      $('#trc-retry').onclick=()=>{ov.hidden=true;S=null;phase='draw';ui()};$('#trc-clear').onclick=()=>start(cur)}}

  /* ---------- Entrées ---------- */
  const toW=e=>{const r=cv.getBoundingClientRect();return[(e.clientX-r.left-ox)/sc,FH-(e.clientY-r.top-oy)/sc]};
  cv.addEventListener('pointerdown',e=>{if(phase!=='draw'||!lv||!ready)return;const[x,y]=toW(e);if(inkUsed()>=inkMax()-.05){say('Plus d’encre : efface un trait ↶');return}
    if(!okPoint(lv,x,y)){say('On ne peut pas dessiner ici');return}cv.setPointerCapture(e.pointerId);drawing=[[x,y]];snd(3)});
  cv.addEventListener('pointermove',e=>{if(!drawing)return;const[x,y]=toW(e),l=drawing[drawing.length-1],d=Math.hypot(x-l[0],y-l[1]);if(d<.18)return;
    const left=inkMax()-inkUsed();if(left<=0)return;let px=x,py=y;if(d>left){px=l[0]+(x-l[0])*left/d;py=l[1]+(y-l[1])*left/d}
    if(!okPoint(lv,px,py)){endStroke();return}drawing.push([px,py]);ui()});
  function endStroke(){if(!drawing)return;if(drawing.length===1)drawing.push([drawing[0][0]+.05,drawing[0][1]]);strokes.push(drawing.map(p=>[Math.round(p[0]*100)/100,Math.round(p[1]*100)/100]));drawing=null;ui()}
  cv.addEventListener('pointerup',endStroke);cv.addEventListener('pointercancel',endStroke);
  goBtn.onclick=()=>{if(phase==='draw')launch();else if(phase==='run'){S=null;phase='draw';ui()}else{ov.hidden=true;S=null;phase='draw';ui()}};
  $('#trc-undo').onclick=()=>{if(phase!=='draw')return;strokes.pop();ui()};
  $('#trc-reset').onclick=()=>start(cur);
  $('#trc-hint').onclick=()=>{if(SOL[cur]){hintT=4;say('Indice : un début de solution en pointillés')}else say('Pas d’indice pour ce niveau')};
  lvlSel.onchange=()=>{lvlSel.blur();start(+lvlSel.value)};

  /* ---------- Rendu ---------- */
  const X=x=>ox+x*sc,Y=y=>oy+(FH-y)*sc;
  const COL={water:'#4aa8ff',bubble:'#a8e6ff',sand:'#e8c27a'};
  function line(x1,y1,x2,y2,w,c){ctx.strokeStyle=c;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(X(x1),Y(y1));ctx.lineTo(X(x2),Y(y2));ctx.stroke()}
  function drawStroke(st,c,dash){if(st.length<2)return;ctx.strokeStyle=c;ctx.lineWidth=Math.max(3,.16*sc);ctx.lineCap='round';ctx.lineJoin='round';if(dash)ctx.setLineDash([6,8]);ctx.beginPath();st.forEach((p,i)=>i?ctx.lineTo(X(p[0]),Y(p[1])):ctx.moveTo(X(p[0]),Y(p[1])));ctx.stroke();ctx.setLineDash([])}
  function bodyDraw(b,fill){const p=b.getPosition(),a=b.getAngle();for(let f=b.getFixtureList();f;f=f.getNext()){const sh=f.getShape();ctx.fillStyle=fill;
      if(sh.getType()==='circle'){const c=b.getWorldPoint(sh.getCenter());ctx.beginPath();ctx.arc(X(c.x),Y(c.y),sh.getRadius()*sc,0,7);ctx.fill()}
      else{const vs=sh.m_vertices;ctx.beginPath();vs.forEach((v,i)=>{const q=b.getWorldPoint(v);i?ctx.lineTo(X(q.x),Y(q.y)):ctx.moveTo(X(q.x),Y(q.y))});ctx.closePath();ctx.fill()}}}
  function frame(dt){const k=DPR();ctx.setTransform(k,0,0,k,0,0);ctx.clearRect(0,0,W,H);if(!lv)return;
    if(phase==='run'&&S){acc+=Math.min(dt,.05);let n=0;while(acc>=DT&&n++<4){acc-=DT;stepSim(S);if(S.res){finish(S.res>0);break}}}
    // papier
    ctx.fillStyle='#1a2140';ctx.fillRect(X(0),Y(FH),FW*sc,FH*sc);ctx.fillStyle='rgba(255,255,255,.05)';for(let x=.5;x<FW;x+=.5)for(let y=.5;y<FH;y+=.5){ctx.fillRect(X(x),Y(y),1.4,1.4)}
    for(const[nx,ny,nw,nh]of lv.nd||[]){ctx.fillStyle='rgba(255,90,90,.08)';ctx.fillRect(X(nx),Y(ny+nh),nw*sc,nh*sc);ctx.save();ctx.beginPath();ctx.rect(X(nx),Y(ny+nh),nw*sc,nh*sc);ctx.clip();ctx.strokeStyle='rgba(255,90,90,.18)';ctx.lineWidth=2;
      for(let t=-nh;t<nw;t+=.4){ctx.beginPath();ctx.moveTo(X(nx+t),Y(ny));ctx.lineTo(X(nx+t+nh),Y(ny+nh));ctx.stroke()}ctx.restore()}
    for(const[fx,fy,fw,fh]of lv.fans||[]){ctx.fillStyle='rgba(160,230,255,.07)';ctx.fillRect(X(fx),Y(fy+fh),fw*sc,fh*sc);ctx.strokeStyle='rgba(160,230,255,.4)';ctx.lineWidth=1.5;const t=performance.now()/400;
      for(let i=0;i<3;i++){const yy=fy+((t+i/3)%1)*fh,xx=fx+fw*(i+.5)/3;ctx.beginPath();ctx.moveTo(X(xx-.15),Y(yy-.2));ctx.lineTo(X(xx),Y(yy));ctx.lineTo(X(xx+.15),Y(yy-.2));ctx.stroke()}
      ctx.fillStyle='#8a94c8';ctx.fillRect(X(fx),Y(fy+.15),fw*sc,.15*sc)}
    for(const[x1,y1,x2,y2]of lv.portals||[]){for(const[x,y,c]of[[x1,y1,'#ff9a3c'],[x2,y2,'#3cc8ff']]){ctx.strokeStyle=c;ctx.lineWidth=3;ctx.beginPath();ctx.arc(X(x),Y(y),.5*sc,0,7);ctx.stroke();ctx.fillStyle=c+'33';ctx.fill()}}
    ctx.lineCap='round';
    for(const s of lv.segs||[])line(...s,TH*sc,'#c9d1f0');
    for(const[x,y,sw]of lv.springs||[]){ctx.fillStyle='#4fd67a';ctx.fillRect(X(x-sw/2),Y(y+.1),sw*sc,.2*sc);ctx.strokeStyle='#4fd67a';ctx.lineWidth=2;ctx.beginPath();for(let i=0;i<=8;i++){const xx=x-sw/2+sw*i/8;ctx.lineTo(X(xx),Y(y-.15-(i%2)*.25))}ctx.stroke()}
    if(lv.glass){glassWalls(lv.glass).forEach(s=>line(...s,.12*sc,'rgba(220,240,255,.85)'));const[gx,gy,gw,gh,inv]=lv.glass,fy=inv?gy+gh*.5:gy+gh*.5;ctx.setLineDash([4,4]);line(gx+.1,fy,gx+gw-.1,fy,1.5,'rgba(255,197,77,.8)');ctx.setLineDash([]);
      if(S&&lv.k==='water'){const f=fillNow(S);ctx.fillStyle='#ffc54d';ctx.font='700 13px Fredoka, sans-serif';ctx.textAlign='center';ctx.fillText(Math.min(100,Math.round(f/.5*100))+' %',X(gx+gw/2),Y(inv?gy-.3:gy+gh+.35))}}
    if(lv.basket){const[x,y,bw,bh]=lv.basket;[[x,y,x+bw,y],[x,y,x,y+bh],[x+bw,y,x+bw,y+bh]].forEach(s=>line(...s,.12*sc,'#ffc54d'));ctx.fillStyle='rgba(255,197,77,.12)';ctx.fillRect(X(x),Y(y+bh),bw*sc,bh*sc)}
    if(lv.tap){const[x,y,,kind]=lv.tap;ctx.fillStyle='#8a94c8';const up=kind==='bubble';ctx.fillRect(X(x-.35),Y(y+(up?-.1:.45)),.7*sc,.35*sc);ctx.fillRect(X(x-.15),Y(y+(up?.15:.1)),.3*sc,.25*sc)}
    if(lv.rocks&&!S){const[x0,x1]=lv.rocks;ctx.fillStyle='rgba(255,120,90,.25)';ctx.fillRect(X(x0),Y(FH),(x1-x0)*sc,.3*sc);ctx.fillStyle='#ff9a7a';ctx.font='700 12px Fredoka, sans-serif';ctx.textAlign='center';ctx.fillText('▼ ▼ ▼',X((x0+x1)/2),Y(FH-.8))}
    if(S){for(const b of S.saws)bodyDraw(b,'#c9d1f0');
      for(let b=S.w.getBodyList();b;b=b.getNext()){const f=b.getFixtureList();if(!f)continue;const ud=f.getUserData();if(b.isStatic()||ud==='p'||ud==='rock'||ud==='ball'||ud==='ball2'||ud==='egg'||S.saws.includes(b))continue;bodyDraw(b,'#ff9a3c')}
      if(S.parts.length){const kind=lv.tap[3];ctx.fillStyle=COL[kind];ctx.globalAlpha=kind==='bubble'?.75:.9;for(const b of S.parts){const p=b.getPosition();ctx.beginPath();ctx.arc(X(p.x),Y(p.y),PR*sc*(kind==='sand'?1.15:1.8),0,7);ctx.fill()}ctx.globalAlpha=1}
      for(const b of S.rocks){const p=b.getPosition(),r=b.getFixtureList().getShape().getRadius();ctx.fillStyle='#8b8f99';ctx.beginPath();ctx.arc(X(p.x),Y(p.y),r*sc,0,7);ctx.fill()}}
    else if(lv.saw)for(const[x,y,len]of lv.saw){line(x-len/2,y,x+len/2,y,.16*sc,'#c9d1f0');ctx.fillStyle='#ffc54d';ctx.beginPath();ctx.arc(X(x),Y(y),.12*sc,0,7);ctx.fill()}
    const ballAt=(def,b,c)=>{const p=b?b.getPosition():{x:def[0],y:def[1]};ctx.fillStyle=c;ctx.beginPath();ctx.arc(X(p.x),Y(p.y),def[2]*sc,0,7);ctx.fill();ctx.fillStyle='rgba(255,255,255,.35)';ctx.beginPath();ctx.arc(X(p.x-def[2]*.3),Y(p.y+def[2]*.3),def[2]*sc*.35,0,7);ctx.fill()};
    if(lv.ball)ballAt(lv.ball,S&&S.ball,'#ff5d8a');if(lv.ball2)ballAt(lv.ball2,S&&S.ball2,'#5dd6ff');
    if(lv.egg){const p=S?S.egg.getPosition():{x:lv.egg[0],y:lv.egg[1]};ctx.fillStyle=S&&S.broke?'#ffcc66':'#fff6e0';ctx.beginPath();ctx.ellipse(X(p.x),Y(p.y),.36*sc,.46*sc,0,0,7);ctx.fill()}
    // traits du joueur
    if(!S||lv.m==='s'){for(const st of strokes)drawStroke(st,lv.m==='d'?'#ff9a3c':'#7fc4ff')}
    if(drawing)drawStroke(drawing,lv.m==='d'?'#ffb56b':'#a8d8ff');
    if(hintT>0&&SOL[cur]){hintT-=dt;ctx.globalAlpha=Math.min(1,hintT);for(const st of SOL[cur].st)drawStroke(st.slice(0,Math.max(2,Math.ceil(st.length*.6))),'#ffc54d',true);ctx.globalAlpha=1}}
  function resize(){const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;W=w;H=h;sc=Math.min(w/FW,h/FH);ox=(w-FW*sc)/2;oy=(h-FH*sc)/2;
    cv.style.width=W+'px';cv.style.height=H+'px';cv.width=Math.round(W*DPR());cv.height=Math.round(H*DPR())}
  new ResizeObserver(resize).observe(stage);
  let AC=null;
  function snd(k){if(store.get('bb.mute',false))return;try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();const t0=AC.currentTime;
    const notes=k===0?[[440,0],[660,.08]]:k===1?[[523,0],[659,.08],[784,.16]]:k===2?[[260,0],[190,.15]]:[[880,0]];
    notes.forEach(([f,d])=>{const o=AC.createOscillator(),v=AC.createGain(),s=t0+d;o.type='triangle';o.frequency.value=f;v.gain.setValueAtTime(.0001,s);v.gain.exponentialRampToValueAtTime(k===3?.02:.07,s+.01);v.gain.exponentialRampToValueAtTime(.0001,s+.15);o.connect(v).connect(AC.destination);o.start(s);o.stop(s+.2)})}catch(e){}}
  function loadLib(){if(P)return Promise.resolve();if(loading)return loading;loading=new Promise((res,rej)=>{const s=document.createElement('script');s.src='planck.min.js';s.onload=()=>{P=window.planck;ready=true;res()};s.onerror=rej;document.head.appendChild(s)});return loading}
  let pend=null;
  function save(){if(phase!=='draw'||!strokes.length)return null;return{n:cur,strokes}}
  function load(o){if(!(o.n>=1&&o.n<=unlocked())||!Array.isArray(o.strokes))return;pend=o}
  start(cur);
  return{frame,resize,save,load,pause(){},resume(){},
    enter(){loadLib().then(()=>{if(pend){start(pend.n,true);strokes=pend.strokes;pend=null;ui()}}).catch(()=>say('Moteur physique indisponible hors ligne : ouvre ce jeu une fois avec une connexion.'))},
    sub:()=>'Niveau '+unlocked()+' · ★ '+stars.reduce((a,b)=>a+(b||0),0)}
})();
