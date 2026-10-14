(() => {
  const cards=[...document.querySelectorAll('.design-card')];
  const buttons=[...document.querySelectorAll('[data-filter]')];
  buttons.forEach(button=>button.addEventListener('click',()=>{
    buttons.forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});
    let count=0;cards.forEach(card=>{card.hidden=button.dataset.filter!=='all'&&!card.dataset.theme.split(' ').includes(button.dataset.filter);if(!card.hidden)count++;});
    document.querySelector('#filter-status').textContent=`Showing ${count} ${button.dataset.filter==='all'?'':button.dataset.filter+' '}designs.`;
    scale();
  }));
  function scale(){document.querySelectorAll('.card-preview').forEach(p=>{p.querySelector('iframe').style.transform=`scale(${p.clientWidth/1440})`;});}
  new ResizeObserver(scale).observe(document.querySelector('.design-grid'));scale();
  cards.forEach(card=>card.addEventListener('click',()=>{try{localStorage.setItem('beyond-last',card.getAttribute('href'));}catch{}}));
  try{const last=localStorage.getItem('beyond-last');const card=cards.find(c=>c.getAttribute('href')===last);if(card){const resume=document.querySelector('#resume');if(resume)resume.href=last;if(resume)resume.innerHTML=`Continue exploring <span>↗</span>`;}}catch{}
})();
// Hub field: a dot lattice that swells and warms around the pointer; click sends a ripple.
(() => {
  const c=document.querySelector('#hub-field');if(!c)return;const ctx=c.getContext('2d'),host=c.parentElement;
  const D=Math.min(devicePixelRatio||1,2),reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
  let mx=-1e4,my=-1e4,sx=-1e4,sy=-1e4,ripples=[],vis=true;
  host.addEventListener('pointermove',e=>{const r=host.getBoundingClientRect();mx=e.clientX-r.left;my=e.clientY-r.top;});
  host.addEventListener('pointerleave',()=>{mx=my=-1e4;});
  host.addEventListener('click',e=>{if(e.target.closest('a'))return;const r=host.getBoundingClientRect();ripples.push({x:e.clientX-r.left,y:e.clientY-r.top,t:0});});
  new IntersectionObserver(([e])=>vis=e.isIntersecting).observe(host);
  const G=22;
  function draw(t){
    if(vis&&!document.documentElement.classList.contains('motion-paused')){
    const w=host.clientWidth,h=host.clientHeight;if(c.width!==w*D||c.height!==h*D){c.width=w*D;c.height=h*D;}
    ctx.setTransform(D,0,0,D,0,0);ctx.clearRect(0,0,w,h);
    sx+=(mx-sx)*.12;sy+=(my-sy)*.12;if(mx<-1e3){sx=mx;sy=my;}
    ripples=ripples.filter(r=>(r.t+=.016)<1.6);
    for(let y=G/2;y<h;y+=G)for(let x=G/2;x<w;x+=G){
      const dx=x-sx,dy=y-sy,d=Math.hypot(dx,dy),f=Math.max(0,1-d/220);
      let rp=0;for(const r of ripples){const rd=Math.hypot(x-r.x,y-r.y),front=r.t*700;rp+=Math.max(0,1-Math.abs(rd-front)/50)*(1-r.t/1.6);}
      const wave=reduce?0:Math.sin(x*.012+y*.018+t*.0009)*.5+.5;
      const k=Math.min(1,f+rp);const push=f*14+rp*10;const px=x+(d?dx/d:0)*-push,py=y+(d?dy/d:0)*-push;
      const s=.8+wave*.5+k*3.2;
      ctx.fillStyle=k>.02?`rgba(${200+k*55|0},${80+(1-k)*60|0},${30},${.25+k*.75})`:`rgba(23,23,20,${.10+wave*.08})`;
      ctx.fillRect(px-s/2,py-s/2,s,s);
    }}
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
  document.querySelectorAll('.design-card').forEach(card=>card.addEventListener('pointermove',e=>{const p=card.querySelector('.card-preview'),r=p.getBoundingClientRect();p.style.setProperty('--px',(e.clientX-r.left)+'px');p.style.setProperty('--py',(e.clientY-r.top)+'px');}));
})();
