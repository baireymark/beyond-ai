/* ASCII mouse path: the pointer leaves a fading wake of heat on an ASCII surface
   and sheds loose glyphs that drift away. Shared by the moodboard globe and matrix art. */
(() => {
  'use strict';
  const GLYPHS='01<>/\\|#%&@$*+=~^';
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  function create(canvas,width,height,{life=900,radius=34,max=28,shed=.55}={}){
    const pts=[],sparks=[];let lx=null,ly=null,clicks=[];
    const local=e=>{const r=canvas.getBoundingClientRect();return [(e.clientX-r.left)/r.width*width,(e.clientY-r.top)/r.height*height];};
    canvas.addEventListener('pointermove',e=>{
      if(reduce.matches||document.documentElement.classList.contains('motion-paused'))return;
      const [x,y]=local(e),now=performance.now();
      const dx=lx==null?0:x-lx,dy=ly==null?0:y-ly,speed=Math.hypot(dx,dy);
      pts.push({x,y,t:now,s:Math.min(1,speed/14)});if(pts.length>max)pts.shift();
      // shed glyphs proportional to speed
      const n=Math.min(4,Math.floor(speed*shed*.25+Math.random()));
      for(let i=0;i<n;i++)sparks.push({x:x+(Math.random()-.5)*8,y:y+(Math.random()-.5)*8,vx:-dx*.04+(Math.random()-.5)*.9,vy:-dy*.04+(Math.random()-.5)*.9-.15,t:now,c:GLYPHS[Math.random()*GLYPHS.length|0],life:600+Math.random()*700});
      if(sparks.length>220)sparks.splice(0,sparks.length-220);
      lx=x;ly=y;
    });
    canvas.addEventListener('pointerleave',()=>{lx=ly=null;});
    canvas.addEventListener('pointerdown',e=>{const [x,y]=local(e);clicks.push({x,y,t:performance.now()});});
    return {
      // 0..1 heat at a point, plus a push direction away from the wake
      heat(x,y,now){
        let h=0,px=0,py=0;
        for(let i=pts.length-1;i>=0;i--){const p=pts[i],age=(now-p.t)/life;if(age>=1)continue;
          const dx=x-p.x,dy=y-p.y,d2=dx*dx+dy*dy,r=radius*(.6+p.s*.8);if(d2>r*r*4)continue;
          const k=Math.exp(-d2/(2*r*r))*(1-age)*(1-age);if(k>h){h=k;const d=Math.sqrt(d2)||1;px=dx/d;py=dy/d;}}
        for(const c of clicks){const age=(now-c.t)/1100;if(age>=1)continue;const d=Math.hypot(x-c.x,y-c.y),front=age*Math.max(width,height)*.9;
          const k=Math.max(0,1-Math.abs(d-front)/22)*(1-age);if(k>h){h=k;px=(x-c.x)/(d||1);py=(y-c.y)/(d||1);}}
        return [h,px,py];
      },
      glyph(x,y,now){return GLYPHS[(Math.abs(Math.sin(x*12.9898+y*78.233+Math.floor(now/70)*3.1))*43758.5453|0)%GLYPHS.length];},
      drawSparks(ctx,now,color='#ff5a1f'){
        ctx.save();ctx.fillStyle=color;
        for(let i=sparks.length-1;i>=0;i--){const s=sparks[i],age=(now-s.t)/s.life;if(age>=1){sparks.splice(i,1);continue;}
          s.x+=s.vx;s.y+=s.vy;s.vx*=.97;s.vy*=.97;ctx.globalAlpha=(1-age)*.9;
          if(Math.random()<.08)s.c=GLYPHS[Math.random()*GLYPHS.length|0];ctx.fillText(s.c,s.x,s.y);}
        ctx.restore();
        while(pts.length&&now-pts[0].t>life)pts.shift();
        clicks=clicks.filter(c=>now-c.t<1100);
      },
      active(now){return sparks.length>0||clicks.length>0||(pts.length&&now-pts[pts.length-1].t<life);}
    };
  }
  window.BeyondTrail={create};
})();
