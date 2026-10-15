/* ASCII mouse path: the pointer leaves a fading wake on an ASCII surface. Characters
   in the wake swap, in place on the grid, to the Claude spinner glyphs (· ✢ ✳ ✶ ✻ ✽),
   growing with heat and gently pulsing. Shared by the moodboard globe and matrix art. */
(() => {
  'use strict';
  const GLYPHS='·✢✳✶✻✽';
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  function create(canvas,width,height,{life=900,radius=34,max=28}={}){
    const pts=[];let clicks=[];
    const local=e=>{const r=canvas.getBoundingClientRect();return [(e.clientX-r.left)/r.width*width,(e.clientY-r.top)/r.height*height];};
    canvas.addEventListener('pointermove',e=>{
      if(reduce.matches||document.documentElement.classList.contains('motion-paused'))return;
      const [x,y]=local(e);pts.push({x,y,t:performance.now()});if(pts.length>max)pts.shift();
    });
    canvas.addEventListener('pointerdown',e=>{const [x,y]=local(e);clicks.push({x,y,t:performance.now()});});
    return {
      // 0..1 heat at a point; the two trailing zeros keep the old [heat,dx,dy] shape with no displacement.
      heat(x,y,now){
        let h=0;
        for(let i=pts.length-1;i>=0;i--){const p=pts[i],age=(now-p.t)/life;if(age>=1)continue;
          const dx=x-p.x,dy=y-p.y,d2=dx*dx+dy*dy;if(d2>radius*radius*4)continue;
          h=Math.max(h,Math.exp(-d2/(2*radius*radius))*(1-age)*(1-age));}
        for(const c of clicks){const age=(now-c.t)/1100;if(age>=1)continue;const d=Math.hypot(x-c.x,y-c.y),front=age*Math.max(width,height)*.9;
          h=Math.max(h,Math.max(0,1-Math.abs(d-front)/22)*(1-age));}
        return [h,0,0];
      },
      // Hotter cells show larger stars; a slow pulse cycles the glyph like the spinner.
      glyph(x,y,now,h=1){
        const pulse=Math.sin(now/160+(x+y)*.05)*.5+.5;
        return GLYPHS[Math.min(GLYPHS.length-1,Math.floor((h*.8+pulse*.2)*GLYPHS.length))];
      },
      drawSparks(_ctx,now){
        while(pts.length&&now-pts[0].t>life)pts.shift();
        clicks=clicks.filter(c=>now-c.t<1100);
      },
      active(now){return clicks.length>0||(pts.length>0&&now-pts[pts.length-1].t<life);}
    };
  }
  window.BeyondTrail={create};
})();
