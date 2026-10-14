/* Fixed-grid ASCII: changing characters render moving light across the original artwork. */
(() => {
  const sources=[...document.querySelectorAll('.design-root [data-name="Dither"]')];
  if(!sources.length||!window.BEYOND_MATRIX)return;
  const captions=['Cloud-native platforms','Enterprise AI expertise','Vendor-neutral multi-cloud','Cloud modernization','Follow-the-sun delivery'];
  const originals=sources.map((host,index)=>({host,index}));
  // Keep every matrix illustration present in the responsive reading layout too.
  sources.forEach((host,index)=>{
    const id=host.closest('.design-section').id;
    const section=document.querySelector(`.mobile-section[data-id="${id}"]`);
    if(!section)return;
    let gallery=section.querySelector('.mobile-matrix-gallery');
    if(!gallery){gallery=document.createElement('div');gallery.className='mobile-matrix-gallery';section.append(gallery);}
    const figure=document.createElement('figure');
    const clone=host.cloneNode(true);clone.removeAttribute('id');clone.className='mobile-matrix-art';
    const caption=document.createElement('figcaption');caption.textContent=captions[index];
    if(index===4)figure.className='matrix-dark';
    figure.append(clone,caption);gallery.append(figure);originals.push({host:clone,index});
  });
  const grids=new Map();
  function characterGrid(data){
    if(grids.has(data))return grids.get(data);
    const ink=new Uint8Array(data.width*data.height);
    for(const [x,y,w,h] of data.points){
      for(let py=y;py<Math.min(y+h,data.height);py++)for(let px=x;px<Math.min(x+w,data.width);px++)ink[py*data.width+px]=1;
    }
    const cells=[];
    for(let y=0;y+10<=data.height;y+=10)for(let x=0;x+6<=data.width;x+=6){
      let coverage=0;
      for(let dy=0;dy<10;dy++)for(let dx=0;dx<6;dx++)coverage+=ink[(y+dy)*data.width+x+dx];
      if(coverage)cells.push({x:x+3,y:y+5,density:Math.min(1,coverage/38.4)});
    }
    grids.set(data,cells);return cells;
  }
  const surfaces=originals.map(({host,index})=>{
    const img=host.querySelector('img');
    const data=window.BEYOND_MATRIX[img?.getAttribute('src').split('/').pop()];
    if(!data)return null;
    const canvas=document.createElement('canvas');canvas.className='dot-matrix-canvas ascii-matrix-canvas';
    canvas.width=data.width*2;canvas.height=data.height*2;
    canvas.setAttribute('role','img');canvas.setAttribute('aria-label',captions[index]+' — animated ASCII artwork');
    const ctx=canvas.getContext('2d');if(!ctx)return null;
    ctx.scale(2,2);ctx.font='10px monospace';ctx.textAlign='center';ctx.textBaseline='middle';host.replaceChildren(canvas);
    if(host.classList.contains('mobile-matrix-art'))host.style.aspectRatio=`${data.width}/${data.height}`;
    const surface={host,canvas,ctx,data,cells:characterGrid(data),index,visible:false,pointer:null};
    canvas.addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();surface.pointer={x:(e.clientX-r.left)/r.width*data.width,y:(e.clientY-r.top)/r.height*data.height};});
    canvas.addEventListener('pointerleave',()=>surface.pointer=null);
    return surface;
  }).filter(Boolean);
  function render(s,time){
    const {ctx,data,cells,index,pointer}=s,{width:w,height:h}=data;
    ctx.clearRect(0,0,w,h);ctx.fillStyle=data.color;ctx.globalAlpha=1;
    const t=time*.001;
    // The grid and font size stay fixed; only the character density changes.
    const lightX=w*(.5+.42*Math.sin(t*.42+index*.9));
    const lightY=h*(.5+.42*Math.cos(t*.31+index*.7));
    const spreadX=w*.38,spreadY=h*.7;
    const ramp=' .:-=+*ox%#@';
    for(const {x:cx,y:cy,density} of cells){
      const light=Math.exp(-(((cx-lightX)/spreadX)**2+((cy-lightY)/spreadY)**2));
      const pointerLight=pointer ? .9*Math.exp(-((cx-pointer.x)**2+(cy-pointer.y)**2)/(2*55**2)) : 0;
      const illumination=Math.min(1,light*.86+pointerLight);
      const shade=index===4 ? .2+.8*illumination : 1-.85*illumination;
      const level=Math.max(1,Math.min(ramp.length-1,Math.round(Math.sqrt(density)*shade*(ramp.length-1))));
      ctx.fillText(ramp[level],cx,cy);
    }
    ctx.globalAlpha=1;s.canvas.dataset.phase=time.toFixed(1);
  }
  const observer=new IntersectionObserver(entries=>{
    entries.forEach(e=>{const s=surfaces.find(s=>s.canvas===e.target);s.visible=e.isIntersecting;});
  });
  surfaces.forEach(s=>{render(s,0);observer.observe(s.canvas);});
  let frame,last=0,paint=0,time=0;
  function tick(now){
    frame=requestAnimationFrame(tick);const delta=Math.min(60,now-last);last=now;
    if(document.hidden||document.documentElement.classList.contains('motion-paused')||!surfaces.some(s=>s.visible))return;
    time+=delta;if(now-paint<1000/24)return;
    surfaces.filter(s=>s.visible).forEach(s=>render(s,time));paint=now;
  }
  frame=requestAnimationFrame(tick);
  addEventListener('pagehide',()=>cancelAnimationFrame(frame));
  addEventListener('pageshow',e=>{if(e.persisted){last=performance.now();frame=requestAnimationFrame(tick);}});
})();
