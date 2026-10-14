/* Particles · Light — light tunnels, product light art, scroll-drawn path. No dependencies. */
(() => {
 'use strict';
 const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
 const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
 const preview=new URLSearchParams(location.search).has('preview');
 const fine=matchMedia('(pointer:fine)').matches;
 const DPR=Math.min(devicePixelRatio||1,preview?1:2);
 const paused=()=>document.documentElement.classList.contains('motion-paused');
 const lerp=(a,b,t)=>a+(b-a)*t,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const haptic=p=>window.BeyondMotion?.haptic(p);

 // Toast
 const toastEl=$('#toast');let toastT;
 function toast(msg){toastEl.textContent=msg;toastEl.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>toastEl.classList.remove('show'),2400);}
 $$('[data-toast]').forEach(el=>el.addEventListener('click',()=>toast(el.dataset.toast)));

 // Split headlines into words and characters for staggered reveals.
 $$('.split').forEach(root=>{let i=0;const walk=node=>{[...node.childNodes].forEach(n=>{
  if(n.nodeType===3){const frag=document.createDocumentFragment();n.textContent.split(/(\s+)/).forEach(part=>{if(!part)return;if(/^\s+$/.test(part)){frag.append(' ');return;}const w=document.createElement('span');w.className='w';[...part].forEach(c=>{const s=document.createElement('span');s.className='ch';s.textContent=c;s.style.setProperty('--i',i++);w.append(s);});frag.append(w);});n.replaceWith(frag);}
  else if(n.nodeType===1&&n.tagName!=='BR')walk(n);});};
  root.setAttribute('aria-label',root.textContent.replace(/\s+/g,' ').trim());walk(root);});

 // Reveal on scroll
 const io=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;e.target.classList.add('in');io.unobserve(e.target);
  if(e.target.classList.contains('count')){const to=+e.target.dataset.to,t0=performance.now();const step=t=>{const k=clamp((t-t0)/1400,0,1);e.target.textContent=Math.round(to*(1-Math.pow(1-k,3)));if(k<1)requestAnimationFrame(step);};requestAnimationFrame(step);}
 }),{threshold:.18,rootMargin:'0px 0px -6% 0px'});
 $$('.rv,.split,.why,.count').forEach((el,i)=>{if(el.classList.contains('rv'))el.style.transitionDelay=(i%4)*90+'ms';io.observe(el);});
 if(preview||reduce)$$('.rv,.split,.why').forEach(el=>el.classList.add('in'));

 // Nav + drawer
 const nav=$('#nav'),menu=$('.p-menu'),drawer=$('#drawer');
 addEventListener('scroll',()=>nav.classList.toggle('scrolled',scrollY>40),{passive:true});
 const setDrawer=open=>{drawer.classList.toggle('open',open);menu.setAttribute('aria-expanded',open);drawer.setAttribute('aria-hidden',!open);document.body.style.overflow=open?'hidden':'';if(open)$('a',drawer).focus();haptic('soft');};
 menu.addEventListener('click',()=>setDrawer(!drawer.classList.contains('open')));
 $$('a',drawer).forEach(a=>a.addEventListener('click',()=>setDrawer(false)));
 addEventListener('keydown',e=>{if(e.key==='Escape'&&drawer.classList.contains('open')){setDrawer(false);menu.focus();}});

 // Visibility-gated animation loop
 const loops=new Set();const visible=new WeakMap();
 const vis=new IntersectionObserver(es=>es.forEach(e=>visible.set(e.target,e.isIntersecting)),{rootMargin:'100px'});
 function addLoop(el,fn){vis.observe(el);loops.add({el,fn});}
 let last=performance.now();
 function frame(t){const dt=Math.min(.05,(t-last)/1000);last=t;if(!paused()&&!document.hidden)for(const l of loops)if(visible.get(l.el))l.fn(t/1000,dt);requestAnimationFrame(frame);}
 function fit(c){const r=c.getBoundingClientRect();const w=Math.max(1,r.width*DPR|0),h=Math.max(1,r.height*DPR|0);if(c.width!==w||c.height!==h){c.width=w;c.height=h;}return [w,h];}

 // Light tunnel: perspective rings flowing toward the viewer; the vanishing point follows the pointer.
 function tunnel(canvas,{rings=26,particles=260,cy=.6,interactive=true}={}){
  const ctx=canvas.getContext('2d');const host=canvas.parentElement;
  const st={vx:.5,vy:cy,tx:.5,ty:cy,speed:1,boost:0,pulses:[],z:0};
  const P=Array.from({length:particles},()=>({a:Math.random()*Math.PI*2,z:Math.random(),s:.4+Math.random()*1.4}));
  if(interactive){
   host.addEventListener('pointermove',e=>{const r=host.getBoundingClientRect();st.tx=.5+((e.clientX-r.left)/r.width-.5)*.36;st.ty=cy+((e.clientY-r.top)/r.height-.5)*.28;});
   host.addEventListener('pointerleave',()=>{st.tx=.5;st.ty=cy;});
   host.addEventListener('click',e=>{if(e.target.closest('a,button,input,form'))return;st.pulses.push(0);st.boost=2.4;haptic('pulse');
    const f=$('#ro-field');if(f)f.textContent=String(Math.random()*9999|0).padStart(4,'0');});
  }
  addLoop(host,(t,dt)=>{
   const [w,h]=fit(canvas);st.vx=lerp(st.vx,st.tx,.05);st.vy=lerp(st.vy,st.ty,.05);st.boost=lerp(st.boost,0,.04);
   st.z=(st.z+dt*(.09+st.boost*.25))%1;
   const cx=st.vx*w,cyy=st.vy*h,M=Math.max(w,h);
   ctx.globalCompositeOperation='source-over';ctx.fillStyle='rgba(10,8,7,.42)';ctx.fillRect(0,0,w,h);
   const core=ctx.createRadialGradient(cx,cyy,0,cx,cyy,M*.32);core.addColorStop(0,`rgba(255,${150+st.boost*30|0},90,${.55+st.boost*.15})`);core.addColorStop(.25,'rgba(255,66,0,.22)');core.addColorStop(1,'rgba(255,66,0,0)');
   ctx.globalCompositeOperation='lighter';ctx.fillStyle=core;ctx.fillRect(0,0,w,h);
   // rings: k in (0,1] -> exponential depth; they bend downward like the Figma tunnel
   for(let i=0;i<rings;i++){let k=((i/rings)+st.z)%1;const d=Math.pow(k,2.6);const rx=12*DPR+d*M*1.25,ry=rx*(.78+.22*k);
    const ox=cx+(.5*w-cx)*d*.9,oy=cyy+d*M*.55;const a=Math.sin(k*Math.PI)*(.55+st.boost*.2);
    ctx.strokeStyle=`rgba(255,${120+k*60|0},${50+k*40|0},${a*.55})`;ctx.lineWidth=(.6+d*2.4)*DPR;ctx.beginPath();ctx.ellipse(ox,oy,rx,ry,0,0,Math.PI*2);ctx.stroke();}
   // particles streaming out of the core
   for(const p of P){p.z+=dt*p.s*(.18+st.boost*.4);if(p.z>1){p.z=0;p.a=Math.random()*Math.PI*2;}
    const d=Math.pow(p.z,2.2),r=8*DPR+d*M*.9;const x=cx+Math.cos(p.a)*r,y=cyy+Math.sin(p.a)*r*.8+d*M*.25;
    const al=Math.sin(p.z*Math.PI);ctx.fillStyle=`rgba(255,${170+p.s*40|0},120,${al*.8})`;const sz=(.6+d*2.6)*DPR;ctx.fillRect(x,y,sz,sz);}
   // click pulses
   st.pulses=st.pulses.filter(p=>p<1.2);st.pulses.forEach((p,i)=>{st.pulses[i]=p+dt*.9;const r=p*M*.9;ctx.strokeStyle=`rgba(255,190,140,${(1-p/1.2)*.8})`;ctx.lineWidth=2*DPR;ctx.beginPath();ctx.ellipse(cx,cyy+p*M*.12,r,r*.8,0,0,Math.PI*2);ctx.stroke();});
   const dEl=$('#ro-depth');if(dEl&&canvas.id==='tunnel'){dEl.textContent=(26+st.boost*40|0);$('#ro-light').textContent=Math.round(90+st.boost*4)+'%';}
  });
 }
 tunnel($('#tunnel'),{cy:.66});
 tunnel($('#tunnel2'),{cy:.52,rings:22,particles:180});

 // Product light art
 $$('.pcard').forEach(card=>{
  const c=$('canvas',card),ctx=c.getContext('2d'),kind=card.dataset.art;let mx=.5,my=.45,hover=0,h0=0;
  card.addEventListener('pointermove',e=>{const r=card.getBoundingClientRect();mx=(e.clientX-r.left)/r.width;my=(e.clientY-r.top)/r.height;card.style.setProperty('--mx',mx*100+'%');card.style.setProperty('--my',my*100+'%');
   if(fine&&!paused())card.style.transform=`rotateY(${(mx-.5)*10}deg) rotateX(${(.5-my)*8}deg) translateZ(10px)`;});
  card.addEventListener('pointerenter',()=>h0=1);card.addEventListener('pointerleave',()=>{h0=0;mx=.5;my=.45;card.style.transform='';});
  const cols=Array.from({length:9},(_,i)=>({h:.3+Math.random()*.6,p:Math.random()*6}));
  const sparks=Array.from({length:7},(_,i)=>({a:i/7*Math.PI*2,r:.18+Math.random()*.22,s:.3+Math.random()*.5}));
  addLoop(card,(t)=>{
   const [w,h]=fit(c);hover=lerp(hover,h0,.08);ctx.clearRect(0,0,w,h);ctx.globalCompositeOperation='lighter';
   const cx=w/2,cy=h*.5,u=Math.min(w,h);
   const glow=(x,y,r,a)=>{const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(255,180,120,${a})`);g.addColorStop(.3,`rgba(255,66,0,${a*.5})`);g.addColorStop(1,'rgba(255,66,0,0)');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);};
   if(kind==='rings'){const px=cx+(mx-.5)*w*.5,py=cy+(my-.45)*h*.3;glow(px,py,u*.32,.7+hover*.3);
    for(let i=0;i<14;i++){const k=((i/14)+t*.08)%1,d=k*k;ctx.strokeStyle=`rgba(255,${130+k*80|0},80,${Math.sin(k*Math.PI)*.6})`;ctx.lineWidth=DPR*(.6+d*2);ctx.beginPath();ctx.ellipse(px+d*w*.6,py-d*h*.15,8*DPR+d*u*.9,6*DPR+d*u*1.05,0,0,Math.PI*2);ctx.stroke();}}
   if(kind==='columns'){glow(cx,cy+u*.15,u*.5,.5);const bw=w/14;cols.forEach((col,i)=>{const x=bw*(1.4+i*1.25),near=1-Math.min(1,Math.abs(mx*w-x)/(w*.3))*1;const target=clamp(col.h+Math.sin(t*1.4+col.p)*.12+near*hover*.35,.08,.98);col.cur=lerp(col.cur??target,target,.1);
    const top=h*.82-col.cur*h*.62;const g=ctx.createLinearGradient(0,top,0,h*.82);g.addColorStop(0,'rgba(255,220,180,.95)');g.addColorStop(.3,'rgba(255,110,40,.7)');g.addColorStop(1,'rgba(255,66,0,.05)');ctx.fillStyle=g;ctx.beginPath();ctx.roundRect(x,top,bw*.55,h*.82-top,bw*.3);ctx.fill();});}
   if(kind==='orb'){const r=u*(.16+hover*.03+Math.sin(t*2)*.006);glow(cx,cy,u*.55,.45+hover*.3);
    const g=ctx.createRadialGradient(cx-r*.3,cy-r*.35,0,cx,cy,r);g.addColorStop(0,'#fff');g.addColorStop(.35,'#ffb27a');g.addColorStop(1,'#ff4200');ctx.globalCompositeOperation='source-over';ctx.fillStyle=g;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill();ctx.globalCompositeOperation='lighter';
    for(let i=0;i<3;i++){ctx.strokeStyle=`rgba(255,170,110,${.5-i*.12})`;ctx.lineWidth=DPR;ctx.beginPath();ctx.ellipse(cx,cy,u*(.42+i*.05),u*(.18+i*.03),(mx-.5)*.8+i*.25+t*.15*(i%2?-1:1),0,Math.PI*2);ctx.stroke();}
    const a=t*1.2;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(cx+Math.cos(a)*u*.42,cy+Math.sin(a)*u*.18,2.5*DPR,0,Math.PI*2);ctx.fill();}
   if(kind==='waves'){glow(cx,cy,u*.45,.35+hover*.3);for(let L=0;L<5;L++){ctx.beginPath();for(let x=0;x<=w;x+=3*DPR){const n=x/w,env=Math.sin(n*Math.PI),dist=Math.exp(-Math.pow((n-mx)*3,2))*hover;
     const y=cy+Math.sin(n*14+t*(2+L*.5)+L)*env*u*(.08+L*.025)*(1+dist*1.6);x?ctx.lineTo(x,y):ctx.moveTo(x,y);}
     ctx.strokeStyle=`rgba(255,${120+L*25},${60+L*15},${.75-L*.12})`;ctx.lineWidth=DPR*(L?1:2);ctx.stroke();}}
   if(kind==='agents'){const px=cx+(mx-.5)*u*.3,py=cy+(my-.45)*u*.3;glow(px,py,u*.3,.6+hover*.3);const pts=sparks.map((s,i)=>{const a=s.a+t*s.s*(1+hover);return [cx+Math.cos(a)*u*(s.r+.12),cy+Math.sin(a*1.3)*u*(s.r+.08)];});
    pts.forEach(([x,y],i)=>{ctx.strokeStyle=`rgba(255,140,80,${.25+hover*.35})`;ctx.lineWidth=DPR;ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(x,y);ctx.stroke();const q=pts[(i+2)%pts.length];ctx.strokeStyle='rgba(255,120,60,.12)';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(q[0],q[1]);ctx.stroke();glow(x,y,u*.06,.8);});
    // packet travelling an edge
    const k=(t*.8)%1,j=(t*.8|0)%pts.length;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(lerp(px,pts[j][0],k),lerp(py,pts[j][1],k),2.2*DPR,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(px,py,u*.045,0,Math.PI*2);ctx.fill();}
  });
 });

 // Rail: drag with inertia, progress indicator
 const rail=$('#rail'),bar=$('#rail-bar');let down=false,sx=0,sl=0,v=0,lx=0,moved=0;
 rail.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse')return;down=true;moved=0;sx=lx=e.clientX;sl=rail.scrollLeft;v=0;});
 addEventListener('pointermove',e=>{if(!down)return;const dx=e.clientX-sx;moved=Math.max(moved,Math.abs(dx));if(moved>6)rail.classList.add('dragging');rail.scrollLeft=sl-dx;v=e.clientX-lx;lx=e.clientX;});
 addEventListener('pointerup',()=>{if(!down)return;down=false;rail.classList.remove('dragging');const glide=()=>{if(Math.abs(v)<.4)return;rail.scrollLeft-=v;v*=.93;requestAnimationFrame(glide);};glide();});
 rail.addEventListener('click',e=>{if(moved>6){e.preventDefault();e.stopPropagation();}},true);
 const railBar=()=>{const max=rail.scrollWidth-rail.clientWidth;const f=max>0?rail.scrollLeft/max:0;const vis=max>0?rail.clientWidth/rail.scrollWidth:1;bar.style.width=vis*100+'%';bar.style.left=f*(1-vis)*100+'%';};
 rail.addEventListener('scroll',railBar,{passive:true});addEventListener('resize',railBar);railBar();
 let lastSnap=0;rail.addEventListener('scroll',()=>{const i=Math.round(rail.scrollLeft/300);if(i!==lastSnap){lastSnap=i;haptic('tick');}},{passive:true});

 // Services: hover, focus, or scroll selects
 const items=$$('#svc li'),detail=$('#svc-detail'),beam=$('#beam');let hoverLock=0,cur=2;
 function activate(i,fromUser){if(i===cur&&!fromUser)return;cur=i;items.forEach((li,j)=>li.classList.toggle('active',j===i));
  const [t,p]=$('button',items[i]).dataset.d.split('|');const swap=$('.swap',detail);swap.remove();
  const n=document.createElement('div');n.className='swap';n.innerHTML=`<span class="p-mono">${String(i+1).padStart(2,'0')} / 06</span><h4>${t}</h4><p>${p}</p><a class="p-cta ghost" href="#contact">Explore →</a>`;detail.prepend(n);
  if(innerWidth>1000){const top=items[i].offsetTop+20;detail.style.top=top+'px';beam.style.translate=`0 ${(i-2.5)*60}px`;}haptic('tick');}
 items.forEach((li,i)=>{const b=$('button',li);b.addEventListener('pointerenter',()=>{hoverLock=performance.now();activate(i);});b.addEventListener('focus',()=>activate(i));b.addEventListener('click',()=>activate(i,true));});
 const svc=$('#services');addEventListener('scroll',()=>{if(performance.now()-hoverLock<1500)return;const r=svc.getBoundingClientRect();const f=clamp((innerHeight*.5-r.top)/(r.height*.8),0,.999);if(r.top<innerHeight&&r.bottom>0)activate(Math.floor(f*6));},{passive:true});

 // Portfolio tiles: spotlight + tilt
 $$('.tile').forEach(t=>{t.addEventListener('pointermove',e=>{const r=t.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;t.style.setProperty('--mx',x*100+'%');t.style.setProperty('--my',y*100+'%');if(fine&&!paused())t.style.transform=`translateY(-14px) rotateY(${(x-.5)*14}deg) rotateX(${(.5-y)*10}deg)`;});
  t.addEventListener('pointerleave',()=>t.style.transform='');});

 // Education: light path drawn by scroll; beads light as the comet passes
 const host=$('#path-host'),edu=$('#education');
 const beadsData=[[135,620,'M01'],[245,583,'M02',1],[356,555,'PROJECT · M03',1,1],[466,542,'M04',1],[576,544,'M05'],[687,564,'PROJECT · M06',1,1],[797,598,'M07'],[908,644,'PROJECT · M08',1,1],[1018,694,'M09'],[1128,742,'PROJECT · M10',1,1],[1239,784,'M11']];
 host.innerHTML=`<svg class="path-svg" viewBox="0 0 1440 900" preserveAspectRatio="none"><defs><linearGradient id="pathgrad" x1="0" x2="1"><stop offset="0" stop-color="#ff4200" stop-opacity=".2"/><stop offset=".6" stop-color="#ff9d58"/><stop offset="1" stop-color="#ffd2ae"/></linearGradient></defs><path class="ghost" id="pg"/><path class="glow" id="pglow"/><path class="line" id="pl"/></svg>`+
  beadsData.map(([x,y,l,up,big],i)=>`<button class="bead${big?' big':''}${up?' up':''}" style="left:${x/14.4}%;top:${y/9}%" aria-label="Module ${i+1}${big?' — project':''}" data-toast="Module ${String(i+1).padStart(2,'0')}${big?' · hands-on project':''}"><span>${l}</span></button>`).join('')+
  `<div class="cert" style="left:${1360/14.4}%;top:${814/9}%"></div><span class="cert-lbl" style="left:${1245/14.4}%;top:${744/9}%">★ CERTIFICATE</span><div class="comet" id="comet"></div>`;
 const d='M80 640 '+beadsData.map(([x,y])=>`L${x} ${y}`).join(' ')+' L1360 814';
 // smooth it with Catmull-Rom
 const pts=[[80,640],...beadsData.map(b=>[b[0],b[1]]),[1360,814]];
 let sd=`M${pts[0][0]} ${pts[0][1]}`;for(let i=0;i<pts.length-1;i++){const p0=pts[i-1]||pts[i],p1=pts[i],p2=pts[i+1],p3=pts[i+2]||p2;sd+=` C${p1[0]+(p2[0]-p0[0])/6} ${p1[1]+(p2[1]-p0[1])/6} ${p2[0]-(p3[0]-p1[0])/6} ${p2[1]-(p3[1]-p1[1])/6} ${p2[0]} ${p2[1]}`;}
 ['pg','pglow','pl'].forEach(id=>$('#'+id).setAttribute('d',sd||d));
 const pl=$('#pl'),pglow=$('#pglow'),len=pl.getTotalLength();[pl,pglow].forEach(p=>{p.style.strokeDasharray=len;p.style.strokeDashoffset=len;});
 const beads=$$('.bead',host),cert=$('.cert',host),comet=$('#comet');
 beads.forEach(b=>b.addEventListener('click',()=>toast(b.dataset.toast)));
 let eduP=0,eduT=0,lastLit=-1;
 function eduScroll(){const r=edu.getBoundingClientRect();eduT=clamp((innerHeight*.85-r.top)/(r.height*.9),0,1);}
 addEventListener('scroll',eduScroll,{passive:true});eduScroll();
 addLoop(edu,()=>{eduP=lerp(eduP,preview?1:eduT,.08);const L=len*eduP;[pl,pglow].forEach(p=>p.style.strokeDashoffset=len-L);
  const pt=pl.getPointAtLength(L);comet.style.left=pt.x/14.4+'%';comet.style.top=pt.y/9+'%';comet.style.opacity=eduP>.01&&eduP<.995?1:0;
  let lit=0;beadsData.forEach(([x],i)=>{const on=pt.x>=x-2;beads[i].classList.toggle('lit',on);if(on)lit=i+1;});cert.classList.toggle('lit',eduP>.98);
  if(lit!==lastLit){if(lit>lastLit&&lastLit>=0)haptic('tick');lastLit=lit;}});

 // Contact: local only
 $('#mail').addEventListener('submit',e=>{e.preventDefault();const v=$('#email').value;$('#mail-note').textContent=`NOTED · ${v.toUpperCase()} — PROTOTYPE ONLY, NOTHING WAS SENT`;haptic('success');});

 // Giant wordmark reacts to the pointer, letter by letter
 const giant=$('#giant');giant.innerHTML=[...'BEYONDAI'].map(c=>`<span>${c}</span>`).join('');const gl=$$('span',giant);let gx=-1e4,gy=-1e4;
 giant.parentElement.addEventListener('pointermove',e=>{gx=e.clientX;gy=e.clientY;});giant.parentElement.addEventListener('pointerleave',()=>{gx=gy=-1e4;});
 addLoop(giant,()=>{gl.forEach(s=>{const r=s.getBoundingClientRect(),dx=gx-(r.left+r.width/2),dy=gy-(r.top+r.height/2),dist=Math.hypot(dx,dy),f=Math.max(0,1-dist/320);
  s.cur=lerp(s.cur||0,f,.12);s.style.transform=`translateY(${-s.cur*38}px) scaleY(${1+s.cur*.08})`;s.classList.toggle('hot',s.cur>.25);});});

 requestAnimationFrame(frame);
 window.BeyondParticles={toast};
})();
/* Vaporwave horizon shader behind "Industry-leading": a scrolling ember grid, a banded sun and scanlines.
   The pointer steers the horizon and the sun; scrolling speeds the grid. */
(() => {
  const host=document.querySelector('#why');if(!host||new URLSearchParams(location.search).has('preview'))return;
  const c=document.createElement('canvas');c.className='vapor';c.setAttribute('aria-hidden','true');host.prepend(c);
  const gl=c.getContext('webgl',{premultipliedAlpha:false,alpha:true});if(!gl){c.remove();return;}
  const vs='attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const fs=`precision highp float;uniform vec2 r;uniform float t;uniform vec2 m;uniform float s;
  float line(float x,float w){float f=abs(fract(x)-.5);return smoothstep(w,0.,.5-f);}
  void main(){vec2 uv=(gl_FragCoord.xy-.5*r)/r.y;float hz=-.05+m.y*.08;vec3 col=vec3(0.);float a=0.;
    // sun
    vec2 sp=uv-vec2(m.x*.25,hz+.22);float d=length(sp);float sun=smoothstep(.24,.235,d);
    float bands=step(.0,sin((sp.y+t*.03)*90.)+ (sp.y+.05)*14.);sun*=mix(1.,bands,smoothstep(.06,-.2,sp.y));
    vec3 sunc=mix(vec3(1.,.27,0.),vec3(1.,.82,.55),smoothstep(-.24,.24,sp.y));col+=sunc*sun;a+=sun*.9;
    col+=vec3(1.,.3,.05)*.35*exp(-d*5.);a+=.25*exp(-d*5.);
    // grid floor
    if(uv.y<hz){float y=hz-uv.y;float z=.35/y;float x=(uv.x-m.x*.15)*z;float g=max(line(x*1.,.04*z),line(z+t*(.6+s*3.),.06*z));
      float fade=smoothstep(0.,.25,y)*smoothstep(1.2,.0,z*.12);vec3 gc=mix(vec3(1.,.35,.05),vec3(1.,.6,.3),g);col+=gc*g*fade*.9;a+=g*fade*.8;
      col+=vec3(.6,.12,0.)*.25*smoothstep(.12,0.,y);a+=.2*smoothstep(.12,0.,y);}
    // scanlines + chroma shimmer
    float sl=.85+.15*sin(gl_FragCoord.y*3.1416*.5);col*=sl;
    gl_FragColor=vec4(col,clamp(a,0.,1.)*.55);}`;
  const sh=(type,src)=>{const o=gl.createShader(type);gl.shaderSource(o,src);gl.compileShader(o);return o;};
  const pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,vs));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,fs));gl.linkProgram(pr);
  if(!gl.getProgramParameter(pr,gl.LINK_STATUS)){c.remove();return;}
  gl.useProgram(pr);const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  const loc=gl.getAttribLocation(pr,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  const U=n=>gl.getUniformLocation(pr,n),ur=U('r'),ut=U('t'),um=U('m'),us=U('s');
  let mx=0,my=0,tx=0,ty=0,vis=false,lastY=scrollY,speed=0;
  host.addEventListener('pointermove',e=>{const r=host.getBoundingClientRect();tx=(e.clientX-r.left)/r.width*2-1;ty=-((e.clientY-r.top)/r.height*2-1);});
  new IntersectionObserver(([e])=>vis=e.isIntersecting).observe(host);
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  const D=Math.min(devicePixelRatio||1,1.5);
  (function f(t){requestAnimationFrame(f);if(!vis||document.hidden||document.documentElement.classList.contains('motion-paused'))return;
    const w=host.clientWidth*D|0,h=host.clientHeight*D|0;if(c.width!==w||c.height!==h){c.width=w;c.height=h;gl.viewport(0,0,w,h);}
    mx+=(tx-mx)*.05;my+=(ty-my)*.05;speed=speed*.92+Math.min(1,Math.abs(scrollY-lastY)/40)*.08;lastY=scrollY;
    gl.uniform2f(ur,w,h);gl.uniform1f(ut,t/1000);gl.uniform2f(um,mx,my);gl.uniform1f(us,speed);gl.drawArrays(gl.TRIANGLES,0,3);})(0);
})();
