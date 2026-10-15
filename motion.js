/* Motion layer shared by the hub and all four directions:
   cursor, haptics, press feedback, page transitions, text scramble, scroll progress and ASCII image lenses. */
(() => {
 'use strict';
 const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
 const params=new URLSearchParams(location.search),preview=params.has('preview');
 const reduce=matchMedia('(prefers-reduced-motion:reduce)'),fine=matchMedia('(pointer:fine)');
 const paused=()=>reduce.matches||document.documentElement.classList.contains('motion-paused');
 const lerp=(a,b,t)=>a+(b-a)*t;
 const study=document.body.dataset.study||'hub';
 const dark=document.body.dataset.theme==='dark';
 document.documentElement.classList.add('bm',dark?'bm-dark':'bm-light');
 // The hub and portfolio pages are static: no motion outside the four designs.
 const staticPage=study==='hub'||/portfolio\.html$/.test(location.pathname);
 if(staticPage)document.documentElement.classList.add('bm-static','motion-paused');

 /* ---------- Haptics: Vibration API on Android, the switch-input tick on iOS 18+, visual everywhere ---------- */
 const patterns={tick:6,tap:10,soft:[4,30,4],pulse:[12,40,18],success:[10,60,10,60,24],error:[40,40,40]};
 let iosSwitch=null;
 if(!('vibrate' in navigator)&&matchMedia('(pointer:coarse)').matches){
  const l=document.createElement('label');l.className='bm-ios-haptic';l.setAttribute('aria-hidden','true');
  l.innerHTML='<input type="checkbox" switch tabindex="-1">';document.body.append(l);iosSwitch=l;
 }
 let lastBuzz=0;
 function haptic(kind='tap'){
  const now=performance.now();if(now-lastBuzz<35)return;lastBuzz=now;
  try{if('vibrate' in navigator&&navigator.userActivation?.hasBeenActive!==false)navigator.vibrate(patterns[kind]??10);else if(iosSwitch&&kind!=='tick')iosSwitch.click();}catch{}
 }
 window.BeyondMotion={haptic};
 if(preview)return; // previews in the hub stay lightweight

 const interactive='a,button,[role="button"],[role="switch"],[role="tab"],input,textarea,select,label,summary,.interactive-card,.pcard,.tile,.design-card';
 document.addEventListener('pointerdown',e=>{
  const el=e.target.closest(interactive);if(!el)return;
  el.classList.add('bm-press');haptic(el.dataset.haptic||'tap');
  if(!paused())burst(e.clientX,e.clientY,el.matches('.pcard,.tile,.design-card,.interactive-card')?14:8);
 },{passive:true});
 const unpress=()=>$$('.bm-press').forEach(el=>el.classList.remove('bm-press'));
 addEventListener('pointerup',unpress);addEventListener('pointercancel',unpress);

 /* ---------- Click sparks (one shared canvas) ---------- */
 const fx=document.createElement('canvas');fx.className='bm-fx';fx.setAttribute('aria-hidden','true');document.body.append(fx);
 const fxc=fx.getContext('2d');let sparks=[],fxRun=false;const D=Math.min(devicePixelRatio||1,2);
 function sizeFx(){fx.width=innerWidth*D;fx.height=innerHeight*D;}sizeFx();addEventListener('resize',sizeFx);
 function burst(x,y,n){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=1.5+Math.random()*3.5;sparks.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,l:1,r:1+Math.random()*1.6});}
  sparks.push({x,y,ring:0,l:1});if(!fxRun){fxRun=true;requestAnimationFrame(fxLoop);}}
 function fxLoop(){fxc.clearRect(0,0,fx.width,fx.height);sparks=sparks.filter(p=>p.l>0);
  for(const p of sparks){if('ring' in p){p.ring+=2.6;p.l-=.045;fxc.strokeStyle=`rgba(255,110,40,${p.l*.7})`;fxc.lineWidth=1.2*D;fxc.beginPath();fxc.arc(p.x*D,p.y*D,p.ring*D,0,Math.PI*2);fxc.stroke();continue;}
   p.x+=p.vx;p.y+=p.vy;p.vx*=.9;p.vy=p.vy*.9+.06;p.l-=.035;fxc.fillStyle=`rgba(255,${130+p.l*90|0},70,${p.l})`;fxc.beginPath();fxc.arc(p.x*D,p.y*D,Math.max(0,p.r*D*p.l),0,Math.PI*2);fxc.fill();}
  if(sparks.length)requestAnimationFrame(fxLoop);else{fxRun=false;fxc.clearRect(0,0,fx.width,fx.height);}}

 /* ---------- Cursor: dot + lagging ring that morphs over targets and shows context ---------- */
 const cur=document.createElement('div');cur.className='bm-cursor';cur.setAttribute('aria-hidden','true');cur.innerHTML='<i class="ring"><b></b></i><i class="dot"></i>';document.body.append(cur);
 const ring=$('.ring',cur),dot=$('.dot',cur),label=$('b',cur);
 let rk=1,mx=-100,my=-100,rx=-100,ry=-100,rw=34,rh=34,tw=34,th=34,target=null,shown=false;
 const labelFor=(el,raw)=>{
  if(el?.dataset.cursor)return el.dataset.cursor;
  if(el&&el.tagName!=='CANVAS'){if(el.matches('.rail,.rail *'))return'DRAG';if(el.matches('.design-card'))return'ENTER';
   if(el.matches('.tile,.project-card,.interactive-card,[data-portfolio-name]'))return'VIEW';if(el.matches('a[target="_blank"]'))return'OPEN ↗';return'';}
  if(raw?.closest?.('[data-name="Dither globe"]')||(study==='stack-builder'&&raw?.tagName==='CANVAS'))return'DRAG';
  return raw?.closest?.('[data-cursor]')?.dataset.cursor||'';};
 document.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse')return;mx=e.clientX;my=e.clientY;if(!shown){rx=mx;ry=my;shown=true;}
  const el=e.target.closest(interactive+',canvas,.rail');target=el;const lab=labelFor(el,e.target);label.textContent=lab;
  cur.classList.toggle('on-control',!!el);cur.classList.toggle('has-label',!!lab);cur.classList.toggle('on-text',!!e.target.closest('input,textarea'));
  cur.classList.add('visible');},{passive:true});
 document.addEventListener('pointerleave',()=>cur.classList.remove('visible'));
 // keep the cursor above modal dialogs (top layer) by moving it into the open one
 const home=()=>{const d=[...document.querySelectorAll('dialog[open]')].pop();const host=d||document.body;if(cur.parentElement!==host)host.append(cur);};
 new MutationObserver(home).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
 document.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'){mx=e.clientX;my=e.clientY;}cur.classList.add('down');});const release=()=>cur.classList.remove('down');['pointerup','pointercancel','dragend','blur','lostpointercapture'].forEach(t=>addEventListener(t,release,true));
 document.addEventListener('pointermove',e=>{if(!e.buttons)release();},{passive:true}); document.addEventListener('dragstart',e=>{if(e.target.closest?.('a,img'))e.preventDefault();});
 (function loop(){
  const big=cur.classList.contains('has-label');tw=big?78:(target?52:34);th=tw;
  // the ring always trails the pointer itself; no snapping to stale targets after clicks
  rx=lerp(rx,mx,.18);ry=lerp(ry,my,.18);
  rw=lerp(rw,tw,.2);rh=lerp(rh,th,.2);rk=lerp(rk,cur.classList.contains('down')?.82:1,.3);
  ring.style.transform=`translate(${rx-rw/2}px,${ry-rh/2}px) scale(${rk})`;ring.style.width=rw+'px';ring.style.height=rh+'px';ring.style.borderRadius='50%';
  dot.style.transform=`translate(${mx-3}px,${my-3}px)`;requestAnimationFrame(loop);})();

 /* ---------- Magnetic pull on primary actions ---------- */
 $$('.p-cta,.resume-link,.tactile,.source-link,.p-menu,[data-magnetic]').forEach(el=>{
  el.addEventListener('pointermove',e=>{if(paused()||!fine.matches)return;const r=el.getBoundingClientRect();el.style.translate=`${((e.clientX-r.left)/r.width-.5)*12}px ${((e.clientY-r.top)/r.height-.5)*10}px`;});
  el.addEventListener('pointerleave',()=>el.style.translate='');});

 /* ---------- Text scramble on hover for small labels and links ---------- */
 const glyphs='·✢✳✶✻✽';
 function scramble(el){if(el._sc||paused())return;const orig=el.dataset.scrambleText||(el.dataset.scrambleText=el.textContent);el._sc=1;let f=0;const n=orig.length;
  const tick=()=>{f++;el.textContent=[...orig].map((c,i)=>c===' '||i<f/2?c:glyphs[Math.random()*glyphs.length|0]).join('');if(f/2<n)requestAnimationFrame(tick);else{el.textContent=orig;el._sc=0;}};tick();}
 const scrambleTargets=()=>$$('.source-link,.p-foot nav a,.p-drawer a small,.card-tags span,.study-title,.more .p-mono,[data-scramble]').filter(el=>el.children.length===0&&el.textContent.trim().length<60);
 scrambleTargets().forEach(el=>{el.addEventListener('pointerenter',()=>scramble(el));el.addEventListener('focus',()=>scramble(el));});

 /* ---------- Scroll progress ---------- */
 const bar=document.createElement('div');bar.className='bm-progress';bar.setAttribute('aria-hidden','true');document.body.append(bar);
 const prog=()=>{const h=document.documentElement.scrollHeight-innerHeight;bar.style.transform=`scaleX(${h>0?scrollY/h:0})`;};addEventListener('scroll',prog,{passive:true});prog();

 /* Page transitions: no loading curtain — links navigate straight away. */
 const curtain=document.createElement('div');curtain.className='bm-curtain';curtain.hidden=true;
 try{sessionStorage.removeItem('bm-transition');}catch{}

 /* ---------- Particles page has no experience dock; give it the same four-way switcher ---------- */
 if(study==='particles'){
  const slugs=['bold-tech','moodboard','stack-builder','particles'],names=['Bold Tech · Study B','Moodboard','Stack Builder','Particles · Light'];const i=3;
  const dock=document.createElement('nav');dock.className='bm-dock';dock.setAttribute('aria-label','Design studies');
  dock.innerHTML=`<a href="index.html" aria-label="All four designs">▦</a><a href="${slugs[2]}.html" aria-label="Previous design">←</a><span data-scramble>04 / ${names[i]}</span><a href="${slugs[0]}.html" aria-label="Next design">→</a><button aria-label="Pause animations" aria-pressed="false">Ⅱ</button>`;
  document.body.append(dock);const b=$('button',dock);
  let p=false;try{p=localStorage.getItem('beyond-motion')==='paused';}catch{}
  const set=()=>{document.documentElement.classList.toggle('motion-paused',p);b.textContent=p?'▶':'Ⅱ';b.setAttribute('aria-pressed',p);b.setAttribute('aria-label',p?'Play animations':'Pause animations');};set();
  b.addEventListener('click',()=>{p=!p;set();try{localStorage.setItem('beyond-motion',p?'paused':'playing');}catch{}});
  $('[data-scramble]',dock).addEventListener('pointerenter',e=>scramble(e.target));
 }

 /* ---------- ASCII lens on project imagery ----------
    Glyphs are coloured by the image itself (drawn with source-in), so this works from file:// without reading pixels. */
 const RAMP='·✢✳✶✻✽';
 function asciiLens(host,img,opt={}){
  if(host._ascii)return host._ascii;const bg=opt.bg||'#0e0c0a',edge=opt.edge||'#ff6a2b';
  const c=document.createElement('canvas');c.className='bm-ascii';c.setAttribute('aria-hidden','true');host.append(c);
  const g=document.createElement('canvas'),gx=g.getContext('2d'),ctx=c.getContext('2d');
  const st={x:-999,y:-999,in:0,tin:0,wave:-1,wx:0,wy:0,dir:1,run:false,hover:false};
  const CW=7,CH=11;
  function cover(w,h){const iw=img.naturalWidth||1,ih=img.naturalHeight||1,fit=getComputedStyle(img).objectFit;const ir=img.getBoundingClientRect(),hr=host.getBoundingClientRect();
   // draw where the <img> actually sits inside the host
   const bx=(ir.left-hr.left)*D,by=(ir.top-hr.top)*D,bw=ir.width*D,bh=ir.height*D;const s=fit==='contain'?Math.min(bw/iw,bh/ih):Math.max(bw/iw,bh/ih),dw=iw*s,dh=ih*s;return [bx+(bw-dw)/2,by+(bh-dh)/2,dw,dh];}
  const hash=(x,y,t)=>{const n=Math.sin(x*127.1+y*311.7+t*74.7)*43758.5453;return n-Math.floor(n);};
  function draw(t){
   const r=host.getBoundingClientRect(),w=Math.max(1,r.width*D|0),h=Math.max(1,r.height*D|0);
   if(c.width!==w||c.height!==h){c.width=g.width=w;c.height=g.height=h;}
   st.in=lerp(st.in,st.tin,.12);
   ctx.clearRect(0,0,w,h);gx.clearRect(0,0,w,h);
   if(!img.complete||!img.naturalWidth)return true;
   const cw=CW*D,ch=CH*D,cols=Math.ceil(w/cw),rows=Math.ceil(h/ch),R=(opt.radius||110)*D*st.in,slice=Math.floor(t*14);
   gx.font=`${10*D}px "IBM Plex Mono","Geist Mono",monospace`;gx.textBaseline='top';gx.fillStyle='#fff';
   const waveR=st.wave>=0?st.wave*Math.hypot(w,h):-1,band=90*D;const edges=[];let any=false;
   ctx.fillStyle=bg;
   for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
    const px=x*cw+cw/2,py=y*ch+ch/2;let m=0;
    if(R>1){const d=Math.hypot(px-st.x*D,py-st.y*D);m=Math.max(m,(R-d)/(40*D));}
    if(waveR>=0){const d=Math.hypot(px-st.wx*D,py-st.wy*D);m=Math.max(m,Math.min(1,(d-waveR)/band+1));}
    if(m<=0||hash(x,y,0)>m*1.6)continue;any=true;
    ctx.fillRect(x*cw,y*ch,cw,ch);
    const ci=Math.min(RAMP.length-1,(Math.min(1,m)*(RAMP.length-1)+hash(x,y,0)*.99)|0);gx.fillText(RAMP[ci],x*cw+D,y*ch);
    if(m<.6)edges.push([x*cw+D,y*ch,RAMP[ci]]);
   }
   if(!any&&st.wave<0&&st.tin===0&&st.in<.01)return false;
   gx.globalCompositeOperation='source-in';const [dx,dy,dw,dh]=cover(w,h);
   gx.filter='saturate(1.6) brightness(1.5) contrast(1.15)';gx.drawImage(img,dx,dy,dw,dh);gx.filter='none';gx.globalCompositeOperation='source-over';
   ctx.drawImage(g,0,0);
   ctx.font=gx.font;ctx.textBaseline='top';ctx.fillStyle=edge;edges.forEach(([x,y,ch2])=>ctx.fillText(ch2,x,y));
   return true;}
  function run(){if(st.run)return;st.run=true;const step=t=>{let alive=draw(t/1000);
    if(st.wave>=0){st.wave+=.022;if(st.wave>1.5){st.wave=-1;}}
    if(alive||st.hover||st.wave>=0)requestAnimationFrame(step);else{st.run=false;ctx.clearRect(0,0,c.width,c.height);}};requestAnimationFrame(step);}
  const pos=e=>{const r=host.getBoundingClientRect();st.x=e.clientX-r.left;st.y=e.clientY-r.top;};
  host.addEventListener('pointerenter',e=>{if(paused())return;pos(e);st.hover=true;st.tin=1;run();});
  host.addEventListener('pointermove',e=>{pos(e);});
  host.addEventListener('pointerleave',()=>{st.hover=false;st.tin=0;});
  const api={decode(x,y){if(paused())return;const r=host.getBoundingClientRect();st.wx=x??r.width/2;st.wy=y??r.height/2;st.wave=0;st.dir=1;run();}};
  // re-decode whenever the image is swapped (moodboard Apps/Websites toggle)
  new MutationObserver(()=>{const go=()=>api.decode(0,0);img.complete?go():img.addEventListener('load',go,{once:true});}).observe(img,{attributes:true,attributeFilter:['src']});
  host._ascii=api;return api;
 }
 const lensTargets=[];
 if(study==='moodboard')$$('#work .portfolio-slot').forEach(h=>{const img=$('img',h);if(img)lensTargets.push(asciiLens(h,img,{bg:'#14120f',radius:120}));});
 if(study==='particles')$$('.tile .img').forEach(h=>lensTargets.push(asciiLens(h,$('img',h),{bg:'#0a0807',radius:100})));
 if(/portfolio\.html$/.test(location.pathname))$$('.project-art').forEach(h=>{const img=$('img',h);if(img)lensTargets.push(asciiLens(h,img,{bg:'#141210',radius:110}));});
 // first time a tile scrolls into view it decodes from glyphs into the picture
 if(lensTargets.length&&!reduce.matches){const seen=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){const h=e.target;seen.unobserve(h);setTimeout(()=>h._ascii?.decode(0,0),(Math.random()*240)|0);}}),{threshold:.35});
  $$('.bm-ascii').forEach(c=>seen.observe(c.parentElement));}
 // portfolio filter buttons re-decode visible art
 $$('button[data-type],[data-filter]').forEach(b=>b.addEventListener('click',()=>setTimeout(()=>$$('.bm-ascii').forEach((c,i)=>{const h=c.parentElement;if(h.offsetParent)setTimeout(()=>h._ascii?.decode(0,0),i*40);}),30)));


 /* ---------- Glitch: big headlines split into RGB and slice on hover, and once as they arrive ---------- */
 const bigText=()=>$$('h1,h2,p,span,.p-display').filter(el=>{if(el.closest('.bm-cursor,.bm-curtain,canvas,.giant')||!el.textContent.trim())return false;const fs=parseFloat(getComputedStyle(el).fontSize);return fs>=54&&(el.classList.contains('p-display')||[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()));});
 function glitch(el){return;el._gl=1;el.dataset.glitch=el.textContent.replace(/\s+/g,' ').trim();el.classList.add('bm-glitch');haptic('tick');setTimeout(()=>{el.classList.remove('bm-glitch');el._gl=0;},520);}
 setTimeout(()=>{const els=bigText();els.forEach(el=>{el.addEventListener('pointerenter',()=>glitch(el));});
  const gio=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){gio.unobserve(e.target);setTimeout(()=>glitch(e.target),300);}}),{threshold:.6});els.forEach(el=>gio.observe(el));},900);
 /* ---------- Ember trail on dark text: the pointer lights the letters orange and leaves a fading tail.
    Driven by one page-level pointer listener, so overlays above the text cannot block it. ---------- */
 setTimeout(()=>{
  const lum=c=>{const m=c.match(/[\d.]+/g);if(!m)return 1;const [r,g,b,al]=m.map(Number);if(al===0)return 1;return (.2126*r+.7152*g+.0722*b)/255;};
  const ownText=el=>[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());
  const targets=$$('body *').filter(el=>{
   if(!ownText(el)||el.closest('.bm-cursor,.bm-curtain,canvas,svg,.giant,.why,dialog,.mobile-view,script,style,textarea,select,option'))return false;
   const cs=getComputedStyle(el);el._baseColor=cs.color;el._baseSize=parseFloat(cs.fontSize);return lum(cs.color)<.3&&cs.backgroundClip!=='text'&&!/text/.test(cs.webkitBackgroundClip||'');});
  const visible=new Set();const io=new IntersectionObserver(es=>es.forEach(e=>e.isIntersecting?visible.add(e.target):visible.delete(e.target)));targets.forEach(el=>io.observe(el));
  const active=new Set();let running=false,mx=-1e5,my=-1e5;const N=7;
  function start(el){el._ember={pts:Array.from({length:N},()=>({x:0,y:0})),a:0,on:true,size:Math.max(14,el._baseSize),fresh:true};
   el.style.backgroundColor=el._baseColor;el.style.webkitBackgroundClip='text';el.style.backgroundClip='text';el.style.color='transparent';active.add(el);}
  function stop(el){['background-image','background-color','color','-webkit-background-clip','background-clip'].forEach(p=>el.style.removeProperty(p));el._ember=null;active.delete(el);}
  function paint(el){const s=el._ember,r=el.getBoundingClientRect(),z=r.width/(el.offsetWidth||r.width)||1,m={x:(mx-r.left)/z,y:(my-r.top)/z};
   if(s.fresh){s.pts.forEach(p=>{p.x=m.x;p.y=m.y;});s.fresh=false;}
   s.pts.forEach((p,i)=>{const to=i?s.pts[i-1]:m,k=i?.32:.45;p.x+=(to.x-p.x)*k;p.y+=(to.y-p.y)*k;});
   s.a+=((s.on?1:0)-s.a)*(s.on?.2:.08);
   el.style.backgroundImage=s.pts.map((p,i)=>{const f=1-i/N,R=s.size*(1.1+f*.9),al=(s.a*(.25+.75*f)).toFixed(3);return `radial-gradient(circle ${R}px at ${p.x}px ${p.y}px,rgba(255,${80+i*6},31,${al}),rgba(255,90,31,0) 70%)`;}).join(',');
   if(!s.on&&s.a<.01)stop(el);}
  function loop(){active.forEach(paint);if(active.size)requestAnimationFrame(loop);else running=false;}
  function check(){visible.forEach(el=>{const r=el.getBoundingClientRect(),pad=el._ember?el._ember.size:0,inside=mx>=r.left-pad&&mx<=r.right+pad&&my>=r.top-pad&&my<=r.bottom+pad;
    if(inside&&!el._ember)start(el);if(el._ember)el._ember.on=inside;});
   if(active.size&&!running){running=true;requestAnimationFrame(loop);}}
  document.addEventListener('pointermove',e=>{if(paused()||e.pointerType!=='mouse')return;mx=e.clientX;my=e.clientY;check();},{passive:true});
  addEventListener('scroll',()=>{if(active.size)check();},{passive:true});
  document.addEventListener('pointerleave',()=>{mx=my=-1e5;check();});
 },700);
 /* ---------- List focus (from the Particles services list): hover one item, the rest dim,
    it slides in and an ember bar draws beneath it ---------- */
 setTimeout(()=>{const groups=new Set();
  $$('[data-name^="Tile/"],[data-name^="Card/"],.design-card,.why').forEach(el=>{if(el.parentElement&&el.parentElement.children.length>1)groups.add(el.parentElement);});
  $$('#services [data-name="Accordion"]').forEach(g=>groups.add(g));
  groups.forEach(g=>{if(g.closest('.mobile-view'))return;g.classList.add('bm-focus');[...g.children].forEach(it=>{if(getComputedStyle(it).position==='static')it.style.position='relative';const bar=document.createElement('i');bar.className='bm-focus-bar';bar.setAttribute('aria-hidden','true');it.append(bar);});});},600);
 /* ---------- Generic reveal for pages that have none ---------- */
 if(study==='hub'||/portfolio\.html$/.test(location.pathname)){
  const items=$$('.design-card,.gallery-heading,.portfolio-invite,.hub-hero h1,.hub-hero .eyebrow,.hero-bottom');items.forEach((el,i)=>{el.classList.add('bm-rise');el.style.setProperty('--d',(i%6)*70+'ms');});
  const io=new IntersectionObserver(es=>es.forEach(e=>e.target.classList.toggle('in',e.isIntersecting)),{threshold:.12});items.forEach(el=>io.observe(el));
 }
})();
