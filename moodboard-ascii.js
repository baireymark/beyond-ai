/* Original ASCII globe: rotate surface coordinates on a stationary 3D sphere. */
(() => {
  'use strict';
  const hosts = [...document.querySelectorAll('[data-name="Dither globe"]')];
  if (!hosts.length) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const preview = new URLSearchParams(location.search).has('preview');
  // Deliberately simplified land silhouettes, expressed in longitude / latitude.
  const continents = [
    [[-168,70],[-145,72],[-126,61],[-110,70],[-85,72],[-54,51],[-66,44],[-81,25],[-97,17],[-106,24],[-118,33],[-129,53],[-166,59]],
    [[-82,13],[-69,10],[-50,0],[-35,-7],[-42,-23],[-55,-35],[-69,-55],[-76,-40],[-80,-10]],
    [[-54,60],[-42,61],[-20,77],[-42,83],[-64,75]],
    [[-17,36],[10,37],[34,30],[44,12],[51,11],[40,-12],[30,-34],[17,-35],[10,-5],[-6,5],[-17,16]],
    [[-10,36],[-10,44],[3,51],[9,57],[5,70],[25,71],[35,60],[60,69],[95,76],[140,71],[179,65],[170,51],[145,49],[132,33],[120,23],[108,4],[99,10],[94,23],[79,8],[69,24],[51,26],[36,39],[28,41],[20,35],[10,44]],
    [[112,-11],[132,-12],[142,-10],[153,-25],[145,-39],[116,-34]],
    [[47,-13],[50,-17],[47,-26],[44,-23]],
    [[129,31],[141,46],[145,43],[137,34]],
    [[119,19],[125,18],[127,6],[121,8]],
    [[96,5],[106,-6],[119,-9],[131,-4],[141,-6],[148,-10],[139,-11],[123,-7],[109,-9]],
    [[166,-34],[179,-39],[171,-47],[166,-44]]
  ];
  function contains(x, y, polygon) {
    let inside = false;
    for (let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
      const [a,b]=polygon[i], [c,d]=polygon[j];
      if ((b>y)!==(d>y) && x<(c-a)*(y-b)/(d-b)+a) inside=!inside;
    }
    return inside;
  }
  const map = new Uint8Array(360*180);
  for(let y=0;y<180;y++) for(let x=0;x<360;x++) {
    map[y*360+x] = continents.some(p=>contains(x-180,90-y,p)) ? 1 : 0;
  }
  // Project once; animation only samples the rotating surface texture.
  const samples=[];
  for(let y=15;y<510;y+=10) for(let x=11;x<510;x+=6) {
    const nx=(x-260)/244, ny=(y-260)/244, r=nx*nx+ny*ny;
    if(r>1)continue;
    const z=Math.sqrt(1-r);
    const tilt=.14, sy=ny*Math.cos(tilt)+z*Math.sin(tilt), sz=z*Math.cos(tilt)-ny*Math.sin(tilt);
    samples.push({x,y,longitude:Math.atan2(nx,sz),latitude:Math.asin(-sy),
      shade:Math.max(0,Math.min(1,.38+.43*z+.31*nx+.19*ny))});
  }
  const cities=[
    {name:'Switzerland',lat:47.3769,lon:8.5417,dx:-106,dy:-38,width:96},
    {name:'Dhaka',lat:23.8103,lon:90.4125,dx:-90,dy:36,width:58},
    {name:'Manila',lat:14.5995,lon:120.9842,dx:22,dy:-30,width:64}
  ];
  // Remove the original stationary callouts, including those in hub previews.
  document.querySelectorAll('[data-name]').forEach(el=>{
    if(/^(Marker|Ring|Leader|Label)\/(Manila|Dhaka|Switzerland)$/.test(el.dataset.name))el.remove();
  });
  let angle=70*Math.PI/180, dragging=false, lastX=0, frame=0, lastTime=0, lastPaint=0;
  let dirty=true;
  const surfaces=hosts.map(host=>{
    const canvas=document.createElement('canvas');
    canvas.width=canvas.height=1040;
    canvas.className='ascii-globe';
    canvas.setAttribute('role','img');
    canvas.setAttribute('aria-label','Rotating ASCII globe. Drag horizontally or use left and right arrow keys to turn it.');
    if(!preview)canvas.tabIndex=0;
    canvas.title='Drag to rotate · ← / → to turn';
    const context=canvas.getContext('2d');
    if(!context)return null;
    context.scale(2,2);
    context.font='10px monospace';
    context.textAlign='center';
    context.textBaseline='middle';
    host.classList.remove('wireframe-drift');
    host.classList.add('ascii-globe-host');
    const overlay=document.createElementNS('http://www.w3.org/2000/svg','svg');
    overlay.setAttribute('viewBox','0 0 520 520');
    overlay.setAttribute('aria-hidden','true');
    overlay.classList.add('ascii-locations');
    const markers=cities.map(city=>{
      const group=document.createElementNS(overlay.namespaceURI,'g');
      group.dataset.city=city.name;
      group.innerHTML=`<path fill="none" stroke="#ff5a1f" stroke-width=".8"/><rect class="location-ring" x="-9" y="-9" width="18" height="18" fill="none" stroke="#ff5a1f" stroke-width=".7"/><rect class="location-dot" x="-4" y="-4" width="8" height="8" fill="#ff5a1f"/><g class="location-label"><rect width="${city.width}" height="22" fill="#fffefa" stroke="#ff5a1f" stroke-width=".7"/><text x="7" y="14" fill="#172f33" font-size="10" font-family="Geist Mono, monospace">${city.name.toUpperCase()}</text></g>`;
      overlay.append(group);
      return {city,group,path:group.querySelector('path'),ring:group.querySelector('.location-ring'),dot:group.querySelector('.location-dot'),label:group.querySelector('.location-label')};
    });
    host.replaceChildren(canvas,overlay);
    const surface={canvas,context,markers,visible:false,trail:!preview&&window.BeyondTrail?window.BeyondTrail.create(canvas,520,520,{radius:30}):null};
    if(!preview){
      canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;dragging=true;lastX=e.clientX;canvas.setPointerCapture(e.pointerId);});
      canvas.addEventListener('pointermove',e=>{if(!dragging||!canvas.hasPointerCapture(e.pointerId))return;angle+=(e.clientX-lastX)*.008;lastX=e.clientX;dirty=true;});
      const release=()=>{dragging=false;};
      canvas.addEventListener('pointerup',release);
      canvas.addEventListener('pointercancel',release);
      canvas.addEventListener('lostpointercapture',release);
      canvas.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();angle+=e.key==='ArrowLeft'?-.16:.16;dirty=true;}});
    }
    return surface;
  }).filter(Boolean);
  function draw({context,canvas,markers,trail}) {
    const now=performance.now();
    context.clearRect(0,0,520,520);
    for(const p of samples){
      const lon=((p.longitude+angle)*180/Math.PI+540)%360;
      const lat=90-p.latitude*180/Math.PI;
      const land=map[Math.min(179,Math.floor(lat))*360+Math.floor(lon)];
      // The texture is anchored to the sphere, so characters travel around its curved surface.
      const grain=(Math.sin(Math.floor(lon*1.4)*127.1+Math.floor(lat*1.4)*311.7)*43758.5453)%1;
      const ramp=land?'=+*oO#@':' .,:;+';
      const density=Math.max(0,Math.min(.999,p.shade+(Math.abs(grain)-.5)*.24));
      const glyph=ramp[Math.floor(density*ramp.length)];
      const [heat,hx,hy]=trail?trail.heat(p.x,p.y,now):[0,0,0];
      if(heat>.12){context.fillStyle=heat>.55?'#ff5a1f':land?'#c2400f':'rgba(255,90,31,.75)';context.fillText(trail.glyph(p.x,p.y,now,heat),p.x,p.y);}
      else{context.fillStyle=land?'#0b0b0b':'rgba(11,11,11,.46)';context.fillText(glyph,p.x,p.y);}
    }
    if(trail)trail.drawSparks(context,now);
    canvas.dataset.angle=angle.toFixed(4);
    // Apply the inverse of the renderer's longitude and axial tilt to geographic points.
    // Occlusion follows the sphere depth, so markers never float over the back hemisphere.
    for(const {city,group,path,ring,dot,label} of markers){
      const lat=city.lat*Math.PI/180, lon=city.lon*Math.PI/180-angle;
      const nx=Math.cos(lat)*Math.sin(lon), sy=-Math.sin(lat), sz=Math.cos(lat)*Math.cos(lon);
      const ny=sy*Math.cos(.14)-sz*Math.sin(.14), depth=sy*Math.sin(.14)+sz*Math.cos(.14);
      const x=260+nx*244, y=260+ny*244;
      group.style.opacity=String(Math.max(0,Math.min(1,depth/.14)));
      group.dataset.depth=depth.toFixed(4);
      const lx=Math.max(4,Math.min(516-city.width,x+city.dx));
      const ly=Math.max(4,Math.min(494,y+city.dy));
      const endX=city.dx<0?lx+city.width:lx;
      path.setAttribute('d',`M${x},${y} L${endX},${y} L${endX},${ly+11}`);
      ring.setAttribute('transform',`translate(${x} ${y})`);
      dot.setAttribute('transform',`translate(${x} ${y})`);
      label.setAttribute('transform',`translate(${lx} ${ly})`);
    }
  }
  const observer=new IntersectionObserver(entries=>{
    for(const entry of entries){const surface=surfaces.find(s=>s.canvas===entry.target);surface.visible=entry.isIntersecting;}
    dirty=true;
  });
  surfaces.forEach(s=>{draw(s);observer.observe(s.canvas);});
  function tick(now){
    frame=requestAnimationFrame(tick);
    const delta=Math.min(now-lastTime,60);lastTime=now;
    if(document.hidden||!surfaces.some(s=>s.visible))return;
    let storedPause=false;
    if(preview){try{storedPause=localStorage.getItem('beyond-motion')==='paused';}catch{}}
    const paused=document.documentElement.classList.contains('motion-paused')||(preview&&(reduce.matches||storedPause));
    if(!paused&&!dragging){angle=(angle+delta*.00018)%(Math.PI*2);dirty=true;}
    const hot=surfaces.some(s=>s.trail&&s.trail.active(now));if(hot)dirty=true;
    if(!dirty||now-lastPaint<1000/(hot?60:24))return;
    surfaces.filter(s=>s.visible).forEach(draw);lastPaint=now;dirty=false;
  }
  frame=requestAnimationFrame(tick);
  addEventListener('pagehide',()=>cancelAnimationFrame(frame));
  addEventListener('pageshow',e=>{if(e.persisted){lastTime=performance.now();frame=requestAnimationFrame(tick);}});
})();
