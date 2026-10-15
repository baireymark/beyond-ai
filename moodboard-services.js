/* Moodboard · Services accordion: any row opens into the full layout of row 01
   (number, title, tags, ASCII visual, description, link); one row is open at a time. */
(() => {
  'use strict';
  if(document.body.dataset.study!=='moodboard'||new URLSearchParams(location.search).has('preview'))return;
  const acc=document.querySelector('.design-root #services [data-name="Accordion"]');
  const open0=acc?.querySelector(':scope > [data-name="Row 01 (expanded)"]');
  const closedRows=acc?[...acc.querySelectorAll(':scope > [data-name="v2/Service row"]')]:[];
  if(!open0||!closedRows.length)return;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const tagsFor={
    '/02':['#Machine learning','#Dashboards','#Forecasting'],
    '/03':['#SOC 24/7','#Pen testing','#Compliance'],
    '/04':['#Web apps','#Mobile','#Integrations'],
    '/05':['#Monitoring','#Support','#Uptime'],
    '/06':['#Engineers','#Flexible','#Embedded']
  };
  const ps=el=>[...el.querySelectorAll(':scope > p')];
  const visual=open0.querySelector('[data-name="Visual"]');
  const dither=visual?.querySelector('[data-name="Dither"]');

  // Collapsed version of row 01, built from a collapsed row's markup.
  const closed0=closedRows[0].cloneNode(true);
  const [n0,t0,d0]=ps(closed0),openPs=[...open0.querySelectorAll('p')];
  n0.textContent=openPs[0].textContent;t0.textContent=openPs[1].textContent;
  d0.textContent=open0.querySelector('[data-name="Col 4"] > p').textContent;
  acc.insertBefore(closed0,open0);

  // Expanded versions of rows 02–06, built from row 01's markup.
  const items=[{open:open0,closed:closed0}];
  for(const row of closedRows){
    const [n,t,d]=ps(row),open=open0.cloneNode(true);
    open.querySelector('[data-name="Col 1"] p').textContent=n.textContent;
    open.querySelector('[data-name="Col 2"] > p').textContent=t.textContent;
    open.querySelector('[data-name="Col 4"] > p').textContent=d.textContent;
    const tags=tagsFor[n.textContent.trim()]||[];
    open.querySelectorAll('[data-name="Tag"] p').forEach((p,i)=>{p.textContent=tags[i]||'';p.parentElement.style.display=tags[i]?'':'none';});
    open.querySelector('[data-name="Dither"]')?.remove();
    acc.insertBefore(open,row);items.push({open,closed:row});
  }

  let current=-1;
  function set(i){
    current=i;
    items.forEach((it,j)=>{
      const on=j===i;it.open.style.display=on?'':'none';it.closed.style.display=on?'none':'';
      it.closed.setAttribute('aria-expanded','false');it.open.setAttribute('aria-expanded',String(on));
    });
    if(i<0)return;
    const target=items[i].open.querySelector('[data-name="Visual"]');
    if(dither&&target&&dither.parentElement!==target)target.append(dither);
    if(!reduce.matches&&!document.documentElement.classList.contains('motion-paused'))
      items[i].open.animate([{opacity:0,transform:'translateY(-6px)'},{opacity:1,transform:'none'}],{duration:320,easing:'cubic-bezier(.16,1,.3,1)'});
  }
  const wire=(el,fn,label)=>{
    el.setAttribute('role','button');el.tabIndex=0;el.setAttribute('aria-label',label);el.style.cursor='pointer';
    el.addEventListener('click',e=>{if(e.target.closest('[data-name="Link"]'))return;fn();});
    el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();fn();}});
  };
  items.forEach((it,i)=>{
    const title=it.closed.querySelectorAll(':scope > p')[1].textContent.trim();
    wire(it.closed,()=>{set(i);window.BeyondMotion?.haptic?.('soft');},'Expand '+title);
    wire(it.open,()=>set(-1),'Collapse '+title);
    const link=it.open.querySelector('[data-name="Link"]');
    if(link&&i>0){link.style.cursor='pointer';link.addEventListener('click',()=>window.BeyondExperience?.contact?.(`I’m interested in ${title}.`));}
  });
  set(0);
})();
