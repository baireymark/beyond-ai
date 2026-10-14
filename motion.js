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
 let mx=-100,my=-100,rx=-100,ry=-100,rw=34,rh=34,tw=34,th=34,target=null,shown=false;
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
 document.addEventListener('pointerdown',()=>cur.classList.add('down'));addEventListener('pointerup',()=>cur.classList.remove('down'));
 (function loop(){
  const big=cur.classList.contains('has-label');tw=big?78:(target?52:34);th=tw;
  // snap the ring around small buttons for a "magnetic" outline
  if(target&&!big&&target.matches('button,a')&&!target.matches('.design-card,.tile,.pcard')){const r=target.getBoundingClientRect();if(r.width<260&&r.height<90){tw=r.width+14;th=r.height+14;rx=lerp(rx,r.left+r.width/2,.22);ry=lerp(ry,r.top+r.height/2,.22);}else{rx=lerp(rx,mx,.18);ry=lerp(ry,my,.18);}}
  else{rx=lerp(rx,mx,.18);ry=lerp(ry,my,.18);}
  rw=lerp(rw,tw,.2);rh=lerp(rh,th,.2);
  ring.style.transform=`translate(${rx-rw/2}px,${ry-rh/2}px)`;ring.style.width=rw+'px';ring.style.height=rh+'px';ring.style.borderRadius=Math.min(rw,rh)/2+'px';
  dot.style.transform=`translate(${mx-3}px,${my-3}px)`;requestAnimationFrame(loop);})();

 /* ---------- Magnetic pull on primary actions ---------- */
 $$('.p-cta,.resume-link,.tactile,.source-link,.p-menu,[data-magnetic]').forEach(el=>{
  el.addEventListener('pointermove',e=>{if(paused()||!fine.matches)return;const r=el.getBoundingClientRect();el.style.translate=`${((e.clientX-r.left)/r.width-.5)*12}px ${((e.clientY-r.top)/r.height-.5)*10}px`;});
  el.addEventListener('pointerleave',()=>el.style.translate='');});

 /* ---------- Text scramble on hover for small labels and links ---------- */
 const glyphs='░▒▓<>/\\|_-=+*#%01ABCDEF';
 function scramble(el){if(el._sc||paused())return;const orig=el.dataset.scrambleText||(el.dataset.scrambleText=el.textContent);el._sc=1;let f=0;const n=orig.length;
  const tick=()=>{f++;el.textContent=[...orig].map((c,i)=>c===' '||i<f/2?c:glyphs[Math.random()*glyphs.length|0]).join('');if(f/2<n)requestAnimationFrame(tick);else{el.textContent=orig;el._sc=0;}};tick();}
 const scrambleTargets=()=>$$('.source-link,.p-foot nav a,.p-drawer a small,.card-tags span,.study-title,.more .p-mono,[data-scramble]').filter(el=>el.children.length===0&&el.textContent.trim().length<60);
 scrambleTargets().forEach(el=>{el.addEventListener('pointerenter',()=>scramble(el));el.addEventListener('focus',()=>scramble(el));});

 /* ---------- Scroll progress ---------- */
 const bar=document.createElement('div');bar.className='bm-progress';bar.setAttribute('aria-hidden','true');document.body.append(bar);
 const prog=()=>{const h=document.documentElement.scrollHeight-innerHeight;bar.style.transform=`scaleX(${h>0?scrollY/h:0})`;};addEventListener('scroll',prog,{passive:true});prog();

 /* ---------- Page transitions: an ASCII curtain that decodes the destination ---------- */
 const curtain=document.createElement('div');curtain.className='bm-curtain';curtain.setAttribute('aria-hidden','true');curtain.innerHTML='<pre></pre><span></span>';document.body.append(curtain);
 const pre=$('pre',curtain),cap=$('span',curtain);
 const pageNames={'index':'THE DESIGN PLAYGROUND','bold-tech':'01 · BOLD TECH','moodboard':'02 · MOODBOARD','stack-builder':'03 · STACK BUILDER','particles':'04 · PARTICLES · LIGHT','portfolio':'APPS & WEBSITES'};
 function fill(density){const cols=Math.ceil(innerWidth/9),rows=Math.ceil(innerHeight/16);let s='';const ramp=' .:-=+*#%@';
  for(let y=0;y<rows;y++){for(let x=0;x<cols;x++){const v=Math.random()<density?ramp[1+(Math.random()*(ramp.length-1))|0]:' ';s+=v;}s+='\n';}pre.textContent=s;}
 function animateCurtain(from,to,ms,done){if(reduce.matches){done?.();return;}const t0=performance.now();const step=t=>{const k=Math.min(1,(t-t0)/ms);fill(from+(to-from)*k);if(k<1)requestAnimationFrame(step);else done?.();};requestAnimationFrame(step);}
 let entering=false;try{entering=sessionStorage.getItem('bm-transition')==='1';sessionStorage.removeItem('bm-transition');}catch{}
 if(entering&&!reduce.matches){curtain.classList.add('show','instant');cap.textContent=pageNames[study==='hub'?(/portfolio/.test(location.pathname)?'portfolio':'index'):study]||'';
  requestAnimationFrame(()=>{curtain.classList.remove('instant');animateCurtain(.5,0,520,()=>curtain.classList.remove('show'));});}
 document.addEventListener('click',e=>{
  const a=e.target.closest('a[href]');if(!a||e.defaultPrevented||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||a.target==='_blank'||a.hasAttribute('download'))return;
  const url=new URL(a.href,location.href);if(url.origin!==location.origin||!/\.html$/.test(url.pathname)||(url.pathname===location.pathname))return;
  if(reduce.matches)return;e.preventDefault();const slug=url.pathname.split('/').pop().replace('.html','');cap.textContent=pageNames[slug]||'';
  curtain.classList.add('show');haptic('soft');animateCurtain(0,.55,420,()=>{try{sessionStorage.setItem('bm-transition','1');}catch{}location.href=url.href;});
 });
 addEventListener('pageshow',e=>{if(e.persisted)curtain.classList.remove('show');});

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
 const RAMP='.:-=+*#%@&$';
 function asciiLens(host,img,opt={}){
  if(host._ascii)return host._ascii;const bg=opt.bg||'#0e0c0a',edge=opt.edge||'#ff6a2b';
  const c=document.createElement('canvas');c.className='bm-ascii';c.setAttribute('aria-hidden','true');host.append(c);
  const g=document.createElement('canvas'),gx=g.getContext('2d'),ctx=c.getContext('2d');
  const st={x:-999,y:-999,in:0,tin:0,wave:-1,wx:0,wy:0,dir:1,run:false,hover:false};
  const CW=7,CH=11;
  function cover(w,h){const iw=img.naturalWidth||1,ih=img.naturalHeight||1,fit=getComputedStyle(img).objectFit;const s=fit==='contain'?Math.min(w/iw,h/ih):Math.max(w/iw,h/ih);const ir=img.getBoundingClientRect(),hr=host.getBoundingClientRect();
   // draw where the <img> actually sits inside the host
   const bx=(ir.left-hr.left)*D,by=(ir.top-hr.top)*D,bw=ir.width*D,bh=ir.height*D;const dw=iw*s*(bw/w),dh=ih*s*(bh/h);return [bx+(bw-dw)/2,by+(bh-dh)/2,dw,dh];}
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
    const ci=(hash(x,y,m<.9?slice:slice>>3)*RAMP.length)|0;gx.fillText(RAMP[ci],x*cw+D,y*ch);
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
 function glitch(el){if(paused()||el._gl)return;el._gl=1;el.dataset.glitch=el.textContent.replace(/\s+/g,' ').trim();el.classList.add('bm-glitch');haptic('tick');setTimeout(()=>{el.classList.remove('bm-glitch');el._gl=0;},520);}
 setTimeout(()=>{const els=bigText();els.forEach(el=>{el.addEventListener('pointerenter',()=>glitch(el));});
  const gio=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){gio.unobserve(e.target);setTimeout(()=>glitch(e.target),300);}}),{threshold:.6});els.forEach(el=>gio.observe(el));},900);
 /* ---------- Generic reveal for pages that have none ---------- */
 if(study==='hub'||/portfolio\.html$/.test(location.pathname)){
  const items=$$('.design-card,.gallery-heading,.portfolio-invite,.hub-hero h1,.hub-hero .eyebrow,.hero-bottom');items.forEach((el,i)=>{el.classList.add('bm-rise');el.style.setProperty('--d',(i%6)*70+'ms');});
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}}),{threshold:.12});items.forEach(el=>io.observe(el));
 }
})();
