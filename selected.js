/* Interaction layer for the three selected directions. All assets stay local. */
(() => {
 'use strict';
 const all=(s,r=document)=>[...r.querySelectorAll(s)],one=(s,r=document)=>r.querySelector(s);
 const text=el=>el.textContent.replace(/\s+/g,' ').trim();
 const study=document.body.dataset.study,preview=new URLSearchParams(location.search).has('preview');
 const reduced=matchMedia('(prefers-reduced-motion:reduce)'),fine=matchMedia('(pointer:fine)');
 const paused=()=>reduced.matches||document.documentElement.classList.contains('motion-paused');
 const api=()=>window.BeyondExperience;
 const byName=(re,root=document)=>all('[data-name]',root).filter(el=>re.test(el.dataset.name));
 const mark='<span class="brand-icon" aria-hidden="true"><img src="assets/beyondai-supplied.png" alt=""></span><span class="brand-word">Beyond<span>Ai</span></span>';
 all('.hub-nav .brand,.portfolio-nav .brand,.mobile-nav .brand,[data-name^="v3/Logo"],[data-name="Logo"],[data-name="Logo lockup"]').forEach(el=>{
  el.innerHTML=mark;el.classList.add('brand-lockup');el.setAttribute('aria-label','BeyondAi');
  el.querySelectorAll('[id]').forEach(c=>c.removeAttribute('id'));
 });
 all('.brand-lockup').forEach(el=>{if(el.closest('.dark')||el.closest('#products'))el.classList.add('brand-on-dark');});
 all('p').filter(el=>/^(BEYOND AI|Beyond AI)$/.test(text(el))&&parseFloat(getComputedStyle(el).fontSize)>65).forEach(el=>el.textContent='BeyondAi');

 // Pointer details enhance native controls and never replace their focus or keyboard state.
 if(!preview){
  const cards=all('.design-card,.interactive-card,.mobile-product-row,.mobile-work-grid button,[data-name^="Tile/"],[data-name^="Card/"]');
  cards.forEach(el=>{el.classList.add('pointer-card');el.addEventListener('pointermove',e=>{
   if(paused()||!fine.matches)return;const r=el.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
   el.style.setProperty('--px',x*100+'%');el.style.setProperty('--py',y*100+'%');el.style.rotate=`${.5-y} ${x-.5} 0 2.5deg`;
  });el.addEventListener('pointerleave',()=>el.style.removeProperty('rotate'));});
  all('.tactile,.resume-link,.mobile-actions a,.mobile-actions button').filter(el=>!el.querySelector('.tactile')).forEach(el=>{
   el.classList.add('magnetic-control');el.addEventListener('pointermove',e=>{if(paused()||!fine.matches)return;const r=el.getBoundingClientRect();el.style.translate=`${((e.clientX-r.left)/r.width-.5)*7}px ${((e.clientY-r.top)/r.height-.5)*7}px`;});el.addEventListener('pointerleave',()=>el.style.removeProperty('translate'));
  });
  const halo=document.createElement('div');halo.className='interaction-halo';halo.setAttribute('aria-hidden','true');document.body.append(halo);
  document.addEventListener('pointermove',e=>{if(!fine.matches||paused())return;halo.style.left=e.clientX+'px';halo.style.top=e.clientY+'px';halo.style.opacity=e.target.closest('a,button,[role="button"],[role="switch"],canvas')?'.6':'0';halo.classList.toggle('over-control',!!e.target.closest('a,button,[role="button"]'));},{passive:true});
  document.addEventListener('pointerout',e=>{if(!e.relatedTarget)halo.style.opacity=0;});
  byName(/^Core instrument/).forEach(el=>{
   el.classList.add('core-interactive');el.tabIndex=0;el.setAttribute('role','button');el.setAttribute('aria-label','Pulse the BeyondAi core');
   const output=document.createElement('span');output.className='core-readout';output.textContent='CORE ONLINE · MOVE TO EXPLORE';el.append(output);
   el.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect();output.textContent=`SIGNAL ${Math.round((e.clientX-r.left)/r.width*100)} · CORE ONLINE`;});
   function pulse(e){if(paused())return;const r=el.getBoundingClientRect(),b=document.createElement('i');b.className='tap-burst';b.style.left=((e.clientX?r.width?(e.clientX-r.left)/r.width:.5:.5)*100)+'%';b.style.top=((e.clientY?(e.clientY-r.top)/r.height:.5)*100)+'%';el.append(b);b.addEventListener('animationend',()=>b.remove(),{once:true});output.textContent='PULSE SENT · SYSTEM RESPONSIVE';}
   el.addEventListener('click',pulse);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pulse(e);}});
  });
 }

 function bind(el,fn,label){if(!el)return;el.setAttribute('role','button');el.tabIndex=0;if(label)el.setAttribute('aria-label',label);el.style.cursor='pointer';
  el.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();fn();},true);
  el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopImmediatePropagation();fn();}},true);
 }
 if(study==='stack-builder'&&!preview){
  const mobileHome=one('.mobile-section[data-id="home"]');
  if(mobileHome){const titles=all('h1,h2',mobileHome);if(titles.length){titles[0].textContent=titles.map(text).join(' ');titles.slice(1).forEach(el=>el.remove());}}
  const mobileWork=one('.mobile-section[data-id="work"]');if(mobileWork){all(':scope > p,:scope > h2,:scope > h3',mobileWork).forEach(el=>el.remove());const h=document.createElement('h2');h.textContent='32 things we’ve shipped.';mobileWork.children[0].after(h);}
  const mobileProducts=one('.mobile-section[data-id="products"]');if(mobileProducts){all(':scope > p,:scope > h2,:scope > h3',mobileProducts).forEach(el=>el.remove());const h=document.createElement('h2');h.textContent='An intelligent product ecosystem.';mobileProducts.children[0].after(h);}
  let chosen=['AI & automation','Cloud','Cybersecurity'];
  document.addEventListener('stackchange',e=>{chosen=['AI & automation','Cloud','Cybersecurity','Endpoint','Products'].filter((_,i)=>e.detail.enabled[i]);const count=one('[data-name="Get stack"] p:last-child');if(count)count.textContent=chosen.length+' / 5';});
  byName(/^(Primary|CTA|Get stack)$/ ,one('#home')).forEach(el=>bind(el,()=>api()?.contact('My production stack: '+(chosen.join(', ')||'Help me choose the right stack')+'.'), 'Discuss my selected stack'));
  byName(/^Secondary$/,one('#home')).forEach(el=>bind(el,()=>api()?.jump('work'),'See what we have shipped'));
  const cards=byName(/^Card\//,one('#services'));
  cards.forEach((el,i)=>{el.setAttribute('aria-pressed','false');bind(el,()=>{cards.forEach(c=>{c.classList.toggle('delivery-active',c===el);c.setAttribute('aria-pressed',String(c===el));});const station=byName(new RegExp('^Station '+(i+1)),one('#services'))[0];if(station&&!paused())station.animate([{filter:'drop-shadow(0 0 0px #ff8a50)'},{filter:'drop-shadow(0 0 24px #ff8a50)'},{filter:'drop-shadow(0 0 0px #ff8a50)'}],{duration:1000});api()?.toast(text(el));},'Explore '+el.dataset.name.slice(5)+' delivery stage');});
  const products=[
   {key:'HRM',title:'HRM Software',body:'People operations, employee records, attendance and payroll readiness in one secure system.',features:['Employee records','Attendance & leave','Payroll readiness']},
   {key:'ERP',title:'BeyondAi ERP',body:'Connect finance, inventory and everyday business workflows with shared visibility.',features:['Finance & accounting','Inventory management','Business workflows']},
   {key:'Count Trust',title:'Count Trust',body:'A secure voting platform for organisations and their communities.',features:['Election setup','Secure ballots','Results & reporting']},
   {key:'Talkora AI',title:'Talkora AI',body:'AI voice agents that connect customer calls to your business context.',features:['Customer calls','Business context','Human handover']},
   {key:'Agentic AI',title:'Agentic AI',body:'AI agents that support sales, customer engagement and conversation workflows.',features:['Sales support','Customer engagement','Workflow assistance']}
  ];
  const detail=byName(/^Detail —/,one('#products'))[0],planets=byName(/^Planet\//,one('#products'));
  function selectProduct(i){const p=products[i];if(!p||!detail)return;
   detail.innerHTML=`<p class="orbit-kicker">SELECTED · 0${i+1} / 05</p><h3>${p.title}</h3><p class="orbit-description">${p.body}</p><ul class="orbit-features">${p.features.map(t=>`<li>${t}<span>↗</span></li>`).join('')}</ul><button class="orbit-explore">Explore ${p.title} →</button>`;
   one('button',detail).addEventListener('click',()=>api()?.product(p.key));planets.forEach((el,j)=>el.setAttribute('aria-pressed',String(i===j)));
   if(!paused())detail.animate([{opacity:.3,translate:'0 6px'},{opacity:1,translate:'0 0'}],{duration:260});
  }
  planets.forEach((el,i)=>{el.classList.add('orbit-hotspot');bind(el,()=>selectProduct(i),'Select '+products[i].title);});selectProduct(0);
  // Elliptical orbits move the sphere, its glow and its label as one system.
  const orbit=one('#products'),ring=one('[data-name="Selected ring"]',orbit);if(ring)ring.hidden=true;
  let orbitAngle=0,orbitDrag=false,orbitX=0,orbitHover=false,orbitVisible=false,lastOrbit=0;
  const bodies=planets.map((el,i)=>{const s=getComputedStyle(el),x=parseFloat(s.left)+parseFloat(s.width)/2-760,y=(parseFloat(s.top)+parseFloat(s.height)/2-590)/.44;
   const suffix=el.dataset.name.slice(7),members=[el,one(`[data-name="Planet glow/${suffix}"]`,orbit),one(`[data-name="Label/${suffix}"]`,orbit)].filter(Boolean);return {members,x,y};});
  planets.forEach((el,i)=>{const label=bodies[i].members.at(-1);all('[data-wired]',label).forEach(c=>{c.removeAttribute('role');c.removeAttribute('tabindex');});bind(label,()=>selectProduct(i),'Select '+products[i].title);});
  new IntersectionObserver(e=>orbitVisible=e[0].isIntersecting).observe(orbit);
  // Scrolling through the section turns the orbit; no drag, so nothing gets text-selected.
  let orbitScroll=0;const spin=()=>{const r=orbit.getBoundingClientRect();orbitScroll=(innerHeight-r.top)/(innerHeight+r.height)*Math.PI*1.2;};addEventListener('scroll',spin,{passive:true});spin();
  orbit.addEventListener('pointermove',e=>{orbitHover=!!e.target.closest('[role="button"],button,[data-name^="Detail"]');});orbit.addEventListener('pointerleave',()=>orbitHover=false);
  let orbitFrame;function drawOrbit(t){orbitFrame=requestAnimationFrame(drawOrbit);if(!orbitVisible||document.hidden||t-lastOrbit<33)return;const dt=Math.min(t-lastOrbit,50);lastOrbit=t;if(!paused()&&!orbitDrag&&!orbitHover&&!orbit.contains(document.activeElement))orbitAngle+=dt*.000025;
   const a=orbitAngle+(paused()?0:orbitScroll);for(const b of bodies){const dx=b.x*Math.cos(a)-b.y*Math.sin(a)-b.x,dy=(b.x*Math.sin(a)+b.y*Math.cos(a)-b.y)*.44;b.members.forEach(el=>el.style.translate=`${dx}px ${dy}px`);}}
  orbitFrame=requestAnimationFrame(drawOrbit);addEventListener('pagehide',()=>cancelAnimationFrame(orbitFrame));addEventListener('pageshow',e=>{if(e.persisted)orbitFrame=requestAnimationFrame(drawOrbit);});
  const portfolio=window.BEYOND_PORTFOLIO||[],norm=s=>s.toLowerCase().replace(/[^a-z0-9]/g,''),wallItems=new WeakMap(),originalItems=[];
  function fillTile(el,item){wallItems.set(el,item);el.innerHTML=`<img class="stack-work-image" src="${item.image}" alt="${item.name}" loading="lazy"><span class="stack-tile-caption">${item.name} ↗</span>`;el.setAttribute('aria-label','View '+item.name);el.dataset.type=item.type;}
  byName(/^Tile\//,one('#work')).forEach((el,i)=>{
   const name=el.dataset.name.slice(5),item=portfolio.find(p=>norm(p.name)===norm(name))||portfolio.find(p=>norm(p.name).includes(norm(name))||norm(name).includes(norm(p.name)))||portfolio[i%portfolio.length];if(!item)return;
   el.style.opacity='1';originalItems.push(item);fillTile(el,item);bind(el,()=>api()?.project(wallItems.get(el)),'View '+item.name);
  });
  byName(/^(Lifted tile \(hover\)|Hover caption)$/,one('#work')).forEach(el=>el.style.display='none');
  const workFilters=byName(/^Chip$/,one('#work'));workFilters.forEach(el=>{all('[data-wired]',el).forEach(c=>{c.removeAttribute('tabindex');c.removeAttribute('role');c.removeAttribute('aria-pressed');});el.setAttribute('aria-pressed',String(/All/i.test(text(el))));bind(el,()=>{const filter=/apps/i.test(text(el))?'app':/web/i.test(text(el))?'website':'all',items=filter==='all'?originalItems:portfolio.filter(p=>p.type===filter);workFilters.forEach(c=>c.setAttribute('aria-pressed',String(c===el)));byName(/^Tile\//,one('#work')).forEach((tile,i)=>fillTile(tile,items[i%items.length]));api()?.toast(filter==='all'?'Showing selected work':filter==='app'?'Showing app projects':'Showing website projects');});});
  const wall=one('[data-name="Wall plane (iso transform)"]'),work=one('#work');
  if(wall){let visible=false;new IntersectionObserver(e=>visible=e[0].isIntersecting).observe(work);const pan=()=>{if(!visible||paused())return;const r=work.getBoundingClientRect(),progress=Math.max(-1,Math.min(1,-r.top/r.height));wall.style.translate=`0 ${-progress*160}px`;};addEventListener('scroll',pan,{passive:true});}
  all('#footer p').filter(el=>/^BACK TO TOP/.test(text(el))).forEach(el=>bind(el,()=>api()?.jump('home'),'Back to top'));
  const input=one('#contact [data-name="Input"]');let field,route;
  if(input){field=document.createElement('textarea');field.className='stack-prompt-input';field.rows=2;field.placeholder='What would you like to make work better?';field.setAttribute('aria-label','Describe your project');field.value=text(one('p',input));input.replaceChildren(field);}
  const routeHost=one('#contact [data-name="Route select"]');if(routeHost){route=document.createElement('select');route.setAttribute('aria-label','Choose a product or service');products.forEach(p=>{const option=document.createElement('option');option.textContent=p.title;option.value=p.key;route.append(option);});['AI & automation','Cloud','Cybersecurity','Endpoint'].forEach(s=>{const option=document.createElement('option');option.textContent=option.value=s;route.append(option);});routeHost.replaceChildren(route);}
  byName(/^Chip$/,one('#contact')).forEach(chip=>{chip.setAttribute('aria-pressed','false');bind(chip,()=>{const on=chip.getAttribute('aria-pressed')!=='true';chip.setAttribute('aria-pressed',String(on));});});
  bind(one('#contact [data-name="Send"]'),()=>{const extras=byName(/^Chip$/,one('#contact')).filter(c=>c.getAttribute('aria-pressed')==='true').map(text);api()?.contact((field?.value||'Help me plan my project.')+'\n\nFocus: '+(route?.value||'My stack')+(extras.length?' · '+extras.join(', '):''));},'Prepare a project brief');
 }

 // Correct low-contrast source text against its painted solid surface.
 // Background imagery and gradients are reviewed separately; this is not a full WCAG audit.
 const rgba=s=>{const a=s.match(/[\d.]+/g)?.map(Number);return a?.length>=3?[a[0],a[1],a[2],a[3]??1]:[0,0,0,0];};
 const mix=(f,b)=>f.slice(0,3).map((v,i)=>v*f[3]+b[i]*(1-f[3]));
 const lum=c=>c.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
 const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
 function background(el){const chain=[];for(let p=el;p;p=p.parentElement)chain.push(p);let bg=[244,241,236];for(const p of chain.reverse()){const c=getComputedStyle(p);bg=mix(rgba(c.backgroundColor),bg);}return bg;}
 function fixColours(scope=document){const rows=[];all('p,span,a,h1,h2,h3,h4,button,label,li,summary,input,textarea,select',scope).forEach(el=>{
   if(el.children.length&&!Array.from(el.childNodes).some(n=>n.nodeType===3&&n.textContent.trim()))return;
   if(!text(el)&&!el.matches('input,textarea,select'))return;
   if(el.closest('.brand-icon,.ascii-globe,.moodboard-matrix,[aria-hidden="true"],.stack-tile-caption'))return;
   const s=getComputedStyle(el),bg=background(el),fg=rgba(s.color),target=parseFloat(s.fontSize)>=24||parseFloat(s.fontSize)>=18.66&&parseFloat(s.fontWeight)>=700?3:4.5;
   const before=ratio(mix(fg,bg),bg);if(before<target){const accent=fg[0]>fg[1]*1.4&&fg[0]>fg[2]*1.3;const color=lum(bg)>.3?(accent?'#a92e08':'#37322e'):(accent?'#ffaf82':'#fffefa');el.style.color=color;if(ratio(rgba(getComputedStyle(el).color),bg)<target)el.style.color=ratio([23,23,20],bg)>ratio([255,254,250],bg)?'#171714':'#fffefa';}
   if(parseFloat(s.opacity)<1)el.style.opacity='1';
   rows.push({text:text(el).slice(0,60),ratio:Number(ratio(rgba(getComputedStyle(el).color),bg).toFixed(2)),required:target});
  });return rows;}
 window.BeyondColourAudit=()=>fixColours();fixColours();
 // Newly opened dialogs and changed product cards use the same text palette.
 const dialog=one('.dialog-content'),detail=one('[data-name^="Detail —"]');
 [dialog,detail].filter(Boolean).forEach(el=>new MutationObserver(()=>fixColours(el)).observe(el,{childList:true,subtree:true}));
})();
