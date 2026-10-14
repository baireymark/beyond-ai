/* Bold Tech · the core's spectrum ring, redrawn live: lines near the pointer turn orange,
   stretch toward it and ripple; a click sends a wave round the ring. */
(() => {
  'use strict';
  if(document.body.dataset.study!=='bold-tech'||new URLSearchParams(location.search).has('preview'))return;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const paused=()=>reduce.matches||document.documentElement.classList.contains('motion-paused');
  const D=Math.min(devicePixelRatio||1,2),TAU=Math.PI*2,N=220;
  const lerp=(a,b,t)=>a+(b-a)*t;
  // smooth pseudo-random spectrum profile
  const base=Array.from({length:N},(_,i)=>{const a=i/N*TAU;return .45+.25*Math.sin(a*3+1)+.18*Math.sin(a*7+2)+.12*Math.sin(a*13)+(Math.random()-.5)*.25;});
  let mx=-1e5,my=-1e5,lastMove=0;
  addEventListener('pointermove',e=>{mx=e.clientX;my=e.clientY;lastMove=performance.now();},{passive:true});
  document.addEventListener('pointerleave',()=>{mx=my=-1e5;});

  function setup(core){
    const spec=core.querySelector('[data-name="Spectrum + ticks"]');if(!spec||core.querySelector('.bt-ring'))return;
    spec.style.opacity='0';
    const c=document.createElement('canvas');c.className='bt-ring';c.setAttribute('aria-hidden','true');core.prepend(c);
    const ctx=c.getContext('2d');
    const st={rot:0,heat:new Float32Array(N),len:new Float32Array(N).fill(0),waves:[],visible:true,hoverRing:[0,0,0]};
    new IntersectionObserver(([e])=>st.visible=e.isIntersecting).observe(core);
    core.addEventListener('click',e=>{const r=core.getBoundingClientRect(),s=940/r.width;const a=Math.atan2((e.clientY-r.top)*s-470,(e.clientX-r.left)*s-470);st.waves.push({a,t:0});window.BeyondMotion?.haptic('pulse');});
    function frame(t){
      requestAnimationFrame(frame);if(!st.visible||document.hidden)return;
      const r=core.getBoundingClientRect();if(!r.width)return;
      const w=Math.round(r.width*D),h=Math.round(r.height*D);if(c.width!==w||c.height!==h){c.width=w;c.height=h;}
      const k=w/940;ctx.setTransform(k,0,0,k,0,0);ctx.clearRect(0,0,940,940);
      const s=940/r.width,px=(mx-r.left)*s-470,py=(my-r.top)*s-470,pr=Math.hypot(px,py),pa=Math.atan2(py,px);
      const still=paused();if(!still)st.rot+=.0012;
      const time=t/1000;st.waves=st.waves.filter(wv=>(wv.t+=.016)<1.4);
      // concentric guide rings light up where the pointer is close
      [[228,1],[345,.6],[452,.45]].forEach(([R,a0],j)=>{
        const near=Math.max(0,1-Math.abs(pr-R)/70);st.hoverRing[j]=lerp(st.hoverRing[j],near,.15);
        ctx.lineWidth=1.2;ctx.strokeStyle=`rgba(23,23,20,${.12*a0})`;ctx.beginPath();ctx.arc(470,470,R,0,TAU);ctx.stroke();
        if(st.hoverRing[j]>.02){const span=.35+st.hoverRing[j]*.6;const g=ctx.createConicGradient(pa-span,470,470);
          g.addColorStop(0,'rgba(255,90,31,0)');g.addColorStop(span/TAU,`rgba(255,90,31,${st.hoverRing[j]})`);g.addColorStop(span*2/TAU,'rgba(255,90,31,0)');g.addColorStop(1,'rgba(255,90,31,0)');
          ctx.strokeStyle=g;ctx.lineWidth=2+st.hoverRing[j]*2;ctx.beginPath();ctx.arc(470,470,R,pa-span,pa+span);ctx.stroke();}
      });
      // tick marks inside the spectrum
      for(let i=0;i<120;i++){const a=i/120*TAU-st.rot*.5,d=Math.abs(Math.atan2(Math.sin(a-pa),Math.cos(a-pa)));const hot=Math.max(0,1-d/.35)*Math.max(0,1-Math.abs(pr-225)/120);
        const L=i%10?6:12;ctx.strokeStyle=hot>.05?`rgba(255,90,31,${.4+hot*.6})`:'rgba(23,23,20,.28)';ctx.lineWidth=1;
        ctx.beginPath();ctx.moveTo(470+Math.cos(a)*(220-L-hot*6),470+Math.sin(a)*(220-L-hot*6));ctx.lineTo(470+Math.cos(a)*220,470+Math.sin(a)*220);ctx.stroke();}
      // spectrum bars
      for(let i=0;i<N;i++){
        const a=i/N*TAU+st.rot,ca=Math.cos(a),sa=Math.sin(a);
        let L=26+base[i]*110+(still?0:Math.sin(time*2.2+i*.31)*8+Math.sin(time*3.7+i*.13)*5);
        // distance from pointer to this bar's segment
        const x0=ca*238,y0=sa*238,x1=ca*(238+L),y1=sa*(238+L);const vx=x1-x0,vy=y1-y0;const u=Math.max(0,Math.min(1,((px-x0)*vx+(py-y0)*vy)/(vx*vx+vy*vy)));
        const dist=Math.hypot(px-(x0+vx*u),py-(y0+vy*u));let heat=Math.max(0,1-dist/95);heat=heat*heat;
        for(const wv of st.waves){const d=Math.abs(Math.atan2(Math.sin(a-wv.a-wv.t*5),Math.cos(a-wv.a-wv.t*5)));const d2=Math.abs(Math.atan2(Math.sin(a-wv.a+wv.t*5),Math.cos(a-wv.a+wv.t*5)));heat=Math.max(heat,Math.max(0,1-Math.min(d,d2)/.18)*(1-wv.t/1.4));}
        st.heat[i]=lerp(st.heat[i],heat,heat>st.heat[i]?.35:.06);const hh=st.heat[i];
        st.len[i]=lerp(st.len[i]||L,L+hh*70,.2);const LL=st.len[i];
        // bars bend toward the pointer
        const bend=hh*.06*Math.sign(Math.sin(pa-a));const ea=a+bend;
        ctx.strokeStyle=hh>.04?`rgb(${lerp(185,255,hh)|0},${lerp(180,90,hh)|0},${lerp(171,31,hh)|0})`:'rgba(23,23,20,.26)';
        ctx.lineWidth=hh>.04?1.6+hh*1.4:1.1;
        ctx.beginPath();ctx.moveTo(470+ca*238,470+sa*238);ctx.lineTo(470+Math.cos(ea)*(238+LL),470+Math.sin(ea)*(238+LL));ctx.stroke();
        if(hh>.5){ctx.fillStyle=`rgba(255,90,31,${hh})`;ctx.fillRect(470+Math.cos(ea)*(238+LL+6)-1.5,470+Math.sin(ea)*(238+LL+6)-1.5,3,3);}
      }
      // pointer readout near the ring
      if(pr>180&&pr<520&&performance.now()-lastMove<2500){const deg=((pa*180/Math.PI)+450)%360;ctx.font='500 11px "Geist Mono",monospace';ctx.fillStyle='#c2400f';
        ctx.fillText(`${deg.toFixed(1).padStart(5,'0')}° · ${Math.round(pr)}`,470+Math.cos(pa)*(pr+18)+6,470+Math.sin(pa)*(pr+18));}
    }
    requestAnimationFrame(frame);
  }
  const run=()=>document.querySelectorAll('[data-name="Core instrument"]').forEach(setup);
  run();setTimeout(run,800);setTimeout(run,2500); // mobile layout clones the artwork later
})();
