/* Stack Builder · scroll-driven explode, pointer-steered light, magnetic planets and a real globe. */
(() => {
  'use strict';
  if(document.body.dataset.study!=='stack-builder'||new URLSearchParams(location.search).has('preview'))return;
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const paused=()=>reduce.matches||document.documentElement.classList.contains('motion-paused');
  const lerp=(a,b,t)=>a+(b-a)*t,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),TAU=Math.PI*2,D=Math.min(devicePixelRatio||1,2);

  /* ---- 3D stack: explode on scroll, pointer parallax, chromatic split while flying apart ---- */
  const home=$('.design-root #home');let mxT=0,myT=0;window.__stackM={x:0,y:0};window.__stackX=0;
  addEventListener('pointermove',e=>{mxT=e.clientX/innerWidth*2-1;myT=e.clientY/innerHeight*2-1;},{passive:true});
  let lastX=0;
  (function tick(){
    const r=home?.getBoundingClientRect();const p=r?clamp(scrollY/(innerHeight*.75),0,1):0;
    const eased=p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;window.__stackX=paused()?0:eased;
    window.__stackM.x=lerp(window.__stackM.x,mxT,.06);window.__stackM.y=lerp(window.__stackM.y,myT,.06);
    $$('.stack-canvas').forEach(c=>{const k=eased;c.style.filter=k>.02?`drop-shadow(${k*5}px 0 0 rgba(255,40,120,.28)) drop-shadow(${-k*5}px 0 0 rgba(0,190,255,.28))`:'';
      if((lastX<.5)!==(k<.5)&&!paused()){c.classList.remove('sf-glitch');void c.offsetWidth;c.classList.add('sf-glitch');window.BeyondMotion?.haptic('pulse');}});
    lastX=eased;requestAnimationFrame(tick);})();

  /* ---- Planets: softer colour, magnetic pull toward the pointer, glow follows ---- */
  const products=$('.design-root #products');
  if(products){
    const planets=$$('[data-name^="Planet/"]',products).map(el=>({el,glow:$(`[data-name="Planet glow/${el.dataset.name.slice(7)}"]`,products),x:0,y:0,s:1}));
    let px=-1e5,py=-1e5;products.addEventListener('pointermove',e=>{px=e.clientX;py=e.clientY;});products.addEventListener('pointerleave',()=>{px=py=-1e5;});
    (function pull(){requestAnimationFrame(pull);if(document.hidden)return;
      for(const p of planets){const r=p.el.getBoundingClientRect(),cx=r.left+r.width/2-p.x,cy=r.top+r.height/2-p.y,dx=px-cx,dy=py-cy,d=Math.hypot(dx,dy),f=paused()?0:Math.max(0,1-d/260);
        p.x=lerp(p.x,dx*f*.22,.12);p.y=lerp(p.y,dy*f*.22,.12);p.s=lerp(p.s,1+f*.18,.12);
        p.el.style.transform=`translate(${p.x}px,${p.y}px) scale(${p.s})`;p.el.style.setProperty('--near',f.toFixed(3));
        if(p.glow){p.glow.style.transform=`translate(${p.x}px,${p.y}px) scale(${1+f*.5})`;p.glow.style.opacity=String(.38+f*.45);}}})();
    // cursor-lit nebula
    const neb=document.createElement('div');neb.className='sf-cursor-light';products.append(neb);
    products.addEventListener('pointermove',e=>{const r=products.getBoundingClientRect(),z=r.width/products.offsetWidth;neb.style.left=(e.clientX-r.left)/z+'px';neb.style.top=(e.clientY-r.top)/z+'px';neb.style.opacity=1;});
    products.addEventListener('pointerleave',()=>neb.style.opacity=0);
  }

  /* ---- Globe: an orthographic Earth with dotted land, graticule, offices and live arcs ---- */
  const section=$('.design-root #offices'),body=section&&$('[data-name="Globe body"]',section);
  if(body){
    const hideRe=/^(Atmosphere|Globe body|Wireframe globe|Rim light|Arc glow|Office arcs|Pulse\/.*|Office\/.*)$/;
    const box={x:body.offsetLeft,y:body.offsetTop,w:body.offsetWidth,h:body.offsetHeight};
    for(let p=body.offsetParent;p&&p!==section;p=p.offsetParent){box.x+=p.offsetLeft;box.y+=p.offsetTop;}
    $$('[data-name]',section).filter(el=>hideRe.test(el.dataset.name)).forEach(el=>el.style.visibility='hidden');
    // loose office labels that sat on the old artwork
    $$(':scope > p',section).filter(p=>/^(MANILA|DHAKA|SWITZERLAND|NEW YORK|AUSTIN)$/i.test(p.textContent.trim())).forEach(p=>p.style.visibility='hidden');
    const pad=box.w*.22,size=box.w+pad*2;
    const c=document.createElement('canvas');c.className='sf-globe';c.tabIndex=0;c.setAttribute('role','img');
    c.setAttribute('aria-label','Interactive globe showing Beyond AI offices in Manila, Dhaka, Switzerland, New York and Austin. Drag or use arrow keys to rotate.');
    Object.assign(c.style,{left:box.x-pad+'px',top:box.y-pad+'px',width:size+'px',height:size+'px'});section.append(c);
    const ctx=c.getContext('2d');
    const continents=[[[-168,70],[-145,72],[-126,61],[-110,70],[-85,72],[-54,51],[-66,44],[-81,25],[-97,17],[-106,24],[-118,33],[-129,53],[-166,59]],[[-82,13],[-69,10],[-50,0],[-35,-7],[-42,-23],[-55,-35],[-69,-55],[-76,-40],[-80,-10]],[[-54,60],[-42,61],[-20,77],[-42,83],[-64,75]],[[-17,36],[10,37],[34,30],[44,12],[51,11],[40,-12],[30,-34],[17,-35],[10,-5],[-6,5],[-17,16]],[[-10,36],[-10,44],[3,51],[9,57],[5,70],[25,71],[35,60],[60,69],[95,76],[140,71],[179,65],[170,51],[145,49],[132,33],[120,23],[108,4],[99,10],[94,23],[79,8],[69,24],[51,26],[36,39],[28,41],[20,35],[10,44]],[[112,-11],[132,-12],[142,-10],[153,-25],[145,-39],[116,-34]],[[47,-13],[50,-17],[47,-26],[44,-23]],[[129,31],[141,46],[145,43],[137,34]],[[119,19],[125,18],[127,6],[121,8]],[[96,5],[106,-6],[119,-9],[131,-4],[141,-6],[148,-10],[139,-11],[123,-7],[109,-9]],[[166,-34],[179,-39],[171,-47],[166,-44]],[[-6,50],[2,51],[-3,59],[-6,56]]];
    const inside=(x,y,poly)=>{let o=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [a,b]=poly[i],[cc,d]=poly[j];if((b>y)!==(d>y)&&x<(cc-a)*(y-b)/(d-b)+a)o=!o;}return o;};
    // Fibonacci-sphere dots, kept where there is land
    const dots=[];const M=9000;for(let i=0;i<M;i++){const y=1-2*(i+.5)/M,r=Math.sqrt(1-y*y),phi=i*2.399963;const lat=Math.asin(y)*180/Math.PI,lon=((Math.atan2(Math.sin(phi)*r,Math.cos(phi)*r)*180/Math.PI)+540)%360-180;
      if(continents.some(p=>inside(lon,lat,p)))dots.push([lat*Math.PI/180,lon*Math.PI/180]);}
    const offices=[['Manila',14.6,121],['Dhaka',23.8,90.4],['Switzerland',47.4,8.5],['New York',40.7,-74],['Austin',30.3,-97.7]].map(([n,la,lo])=>({n,lat:la*Math.PI/180,lon:lo*Math.PI/180}));
    const routes=[[0,1],[1,2],[2,3],[3,4],[0,3],[2,4]];
    let rot=-1.6,tilt=.32,vel=0,drag=false,lx=0,ly=0,hover=-1,mx=-1,my=-1,lightX=-.4,lightY=-.5;
    const proj=(lat,lon)=>{const cl=Math.cos(lat),x=cl*Math.sin(lon+rot),y=Math.sin(lat),z=cl*Math.cos(lon+rot);const y2=y*Math.cos(tilt)-z*Math.sin(tilt),z2=y*Math.sin(tilt)+z*Math.cos(tilt);return [x,-y2,z2];};
    c.addEventListener('pointerdown',e=>{drag=true;lx=e.clientX;ly=e.clientY;c.setPointerCapture(e.pointerId);});
    c.addEventListener('pointermove',e=>{const r=c.getBoundingClientRect();mx=(e.clientX-r.left)/r.width;my=(e.clientY-r.top)/r.height;
      if(drag){vel=(e.clientX-lx)*.006;rot+=vel;tilt=clamp(tilt+(e.clientY-ly)*.004,-.9,.9);lx=e.clientX;ly=e.clientY;}});
    const up=()=>drag=false;c.addEventListener('pointerup',up);c.addEventListener('pointercancel',up);c.addEventListener('pointerleave',()=>{mx=my=-1;hover=-1;});
    c.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){rot-=.2;e.preventDefault();}if(e.key==='ArrowRight'){rot+=.2;e.preventDefault();}});
    c.addEventListener('click',()=>{if(hover>=0){window.BeyondExperience?.toast?.(`${offices[hover].n} — on shift now`);window.BeyondMotion?.haptic('soft');}});
    let vis=false;new IntersectionObserver(([e])=>vis=e.isIntersecting).observe(c);
    function draw(t){
      requestAnimationFrame(draw);if(!vis||document.hidden)return;
      const r=c.getBoundingClientRect();const W=Math.round(r.width*D);if(c.width!==W){c.width=c.height=W;}
      const k=W/1000;ctx.setTransform(k,0,0,k,0,0);ctx.clearRect(0,0,1000,1000);
      const cx=500,cy=500,R=500/(1+.44)*.995;
      if(!drag&&!paused()){rot+=.0016+vel;vel*=.94;}
      if(mx>=0){lightX=lerp(lightX,(mx-.5)*1.6,.08);lightY=lerp(lightY,(my-.5)*1.6,.08);}
      // atmosphere
      const atm=ctx.createRadialGradient(cx,cy,R*.92,cx,cy,R*1.32);atm.addColorStop(0,'rgba(255,150,90,.35)');atm.addColorStop(.35,'rgba(255,120,60,.12)');atm.addColorStop(1,'rgba(255,120,60,0)');
      ctx.fillStyle=atm;ctx.fillRect(0,0,1000,1000);
      // ocean body, lit from the pointer side
      const lx2=cx+lightX*R*.6,ly2=cy+lightY*R*.6;const ocean=ctx.createRadialGradient(lx2,ly2,R*.05,cx,cy,R);
      ocean.addColorStop(0,'#3a4250');ocean.addColorStop(.45,'#1b2029');ocean.addColorStop(1,'#0b0d12');
      ctx.fillStyle=ocean;ctx.beginPath();ctx.arc(cx,cy,R,0,TAU);ctx.fill();
      ctx.save();ctx.beginPath();ctx.arc(cx,cy,R,0,TAU);ctx.clip();
      // graticule
      ctx.lineWidth=1;
      for(let la=-60;la<=60;la+=30){ctx.beginPath();let first=true;for(let lo=-180;lo<=180;lo+=4){const [x,y,z]=proj(la*Math.PI/180,lo*Math.PI/180);if(z<0){first=true;continue;}first?ctx.moveTo(cx+x*R,cy+y*R):ctx.lineTo(cx+x*R,cy+y*R);first=false;}ctx.strokeStyle='rgba(180,200,230,.12)';ctx.stroke();}
      for(let lo=-180;lo<180;lo+=30){ctx.beginPath();let first=true;for(let la=-88;la<=88;la+=4){const [x,y,z]=proj(la*Math.PI/180,lo*Math.PI/180);if(z<0){first=true;continue;}first?ctx.moveTo(cx+x*R,cy+y*R):ctx.lineTo(cx+x*R,cy+y*R);first=false;}ctx.strokeStyle='rgba(180,200,230,.1)';ctx.stroke();}
      // land dots, shaded by facing and lit near the pointer
      const pX=mx>=0?(mx*1000-cx)/R:9,pY=my>=0?(my*1000-cy)/R:9;
      for(const [la,lo] of dots){const [x,y,z]=proj(la,lo);if(z<=0)continue;const near=Math.max(0,1-Math.hypot(x-pX,y-pY)/.28);
        const shade=.35+.65*z*Math.max(.25,1-Math.hypot(x-lightX*.6,y-lightY*.6)*.55);
        ctx.fillStyle=near>.05?`rgba(255,${150-near*60|0},${90-near*50|0},${.6+near*.4})`:`rgba(225,232,240,${shade*.85})`;
        const s=(2.1+near*2.2)*(.6+z*.4);ctx.fillRect(cx+x*R-s/2,cy+y*R-s/2,s,s);}
      // terminator shading
      const shadow=ctx.createRadialGradient(cx+lightX*R*.7,cy+lightY*R*.7,R*.2,cx,cy,R*1.25);shadow.addColorStop(0,'rgba(0,0,0,0)');shadow.addColorStop(1,'rgba(0,0,0,.55)');ctx.fillStyle=shadow;ctx.fillRect(0,0,1000,1000);
      ctx.restore();
      // rim light
      ctx.strokeStyle='rgba(255,170,120,.55)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(cx,cy,R,0,TAU);ctx.stroke();
      // arcs between offices (great circles lifted off the surface), with travelling packets
      const time=t/1000;
      routes.forEach(([a,b],ri)=>{const A=offices[a],B=offices[b];const va=[Math.cos(A.lat)*Math.cos(A.lon),Math.sin(A.lat),Math.cos(A.lat)*Math.sin(A.lon)],vb=[Math.cos(B.lat)*Math.cos(B.lon),Math.sin(B.lat),Math.cos(B.lat)*Math.sin(B.lon)];
        const om=Math.acos(clamp(va[0]*vb[0]+va[1]*vb[1]+va[2]*vb[2],-1,1));const pts=[];
        for(let i=0;i<=48;i++){const f=i/48,s1=Math.sin((1-f)*om)/Math.sin(om),s2=Math.sin(f*om)/Math.sin(om);const v=[va[0]*s1+vb[0]*s2,va[1]*s1+vb[1]*s2,va[2]*s1+vb[2]*s2];const lift=1+Math.sin(f*Math.PI)*.09*om;
          const la=Math.asin(v[1]/Math.hypot(...v)),lo=Math.atan2(v[2],v[0]);const [x,y,z]=proj(la,lo);pts.push([cx+x*R*lift,cy+y*R*lift,z]);}
        const lit=hover===a||hover===b;
        for(let i=1;i<pts.length;i++){const z=pts[i][2];if(z<-.15)continue;ctx.strokeStyle=`rgba(255,${lit?120:100},${lit?50:40},${(z<0?.15:.65)*(lit?1.4:1)})`;ctx.lineWidth=lit?2.6:1.6;ctx.beginPath();ctx.moveTo(pts[i-1][0],pts[i-1][1]);ctx.lineTo(pts[i][0],pts[i][1]);ctx.stroke();}
        const f=((time*.35+ri*.21)%1),q=pts[Math.floor(f*48)];if(q[2]>0){ctx.fillStyle='#fff';ctx.shadowColor='#ff6a2b';ctx.shadowBlur=14;ctx.beginPath();ctx.arc(q[0],q[1],3.2,0,TAU);ctx.fill();ctx.shadowBlur=0;}
      });
      // offices
      hover=-1;offices.forEach((o,i)=>{const [x,y,z]=proj(o.lat,o.lon);o.sx=cx+x*R;o.sy=cy+y*R;o.z=z;if(z>0&&mx>=0&&Math.hypot(o.sx-mx*1000,o.sy-my*1000)<34)hover=i;});
      c.style.cursor=hover>=0?'pointer':drag?'grabbing':'grab';
      offices.forEach((o,i)=>{if(o.z<=0)return;const a=Math.min(1,o.z*3),pulse=(time*.8+i*.2)%1,h=i===hover;
        ctx.strokeStyle=`rgba(255,110,50,${(1-pulse)*a})`;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(o.sx,o.sy,6+pulse*(h?34:22),0,TAU);ctx.stroke();
        ctx.fillStyle=`rgba(255,106,43,${a})`;ctx.beginPath();ctx.arc(o.sx,o.sy,h?7:5,0,TAU);ctx.fill();
        ctx.font=`500 ${h?17:14}px "JetBrains Mono","Geist Mono",monospace`;const label=o.n.toUpperCase();const tw=ctx.measureText(label).width;
        ctx.fillStyle=`rgba(10,10,12,${.75*a})`;ctx.fillRect(o.sx+14,o.sy-13,tw+16,26);ctx.strokeStyle=`rgba(255,120,60,${.6*a})`;ctx.strokeRect(o.sx+14,o.sy-13,tw+16,26);
        ctx.fillStyle=`rgba(255,240,230,${a})`;ctx.fillText(label,o.sx+22,o.sy+5);});
    }
    requestAnimationFrame(draw);
  }
})();
