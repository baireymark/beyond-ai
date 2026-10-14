/* Moodboard · Apps & websites grid: paged, full-bleed cards with an ambient colour field,
   cascading page changes and the ASCII lens from motion.js. */
(() => {
  'use strict';
  if(document.body.dataset.study!=='moodboard'||new URLSearchParams(location.search).has('preview'))return;
  const work=document.querySelector('.design-root #work'),all=window.BEYOND_PORTFOLIO||[];
  if(!work||!all.length)return;
  const rows=[...work.children].filter(el=>/^(Tiles row 1|Tiles row 2|Websites preview)$/.test(el.dataset.name));
  if(!rows.length)return;
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const store=u=>/testflight/.test(u)?'TestFlight':/apple\.com/.test(u)?'App Store':/play\.google/.test(u)?'Play Store':new URL(u).hostname.replace(/^www\./,'');
  const PER=8;let type='app',page=0;

  const grid=document.createElement('div');grid.className='mw-grid';grid.setAttribute('aria-live','polite');
  const slots=Array.from({length:PER},(_,i)=>{
    const b=document.createElement('button');b.type='button';b.className='mw-card';
    b.innerHTML=`<span class="mw-art portfolio-slot"><span class="mw-field"></span><img class="mw-img" alt="" loading="lazy"></span><span class="mw-meta"><span class="mw-n"></span><span class="mw-name"></span><span class="mw-store"></span><span class="mw-arrow" aria-hidden="true">↗</span></span>`;
    b.addEventListener('pointermove',e=>{const r=b.getBoundingClientRect();b.style.setProperty('--x',(e.clientX-r.left)/r.width);b.style.setProperty('--y',(e.clientY-r.top)/r.height);});
    b.addEventListener('pointerleave',()=>{b.style.removeProperty('--x');b.style.removeProperty('--y');});
    b.addEventListener('click',()=>{const item=b._item;if(!item)return;window.BeyondExperience?.project?window.BeyondExperience.project(item):window.open(item.url,'_blank','noopener');});
    grid.append(b);return b;});
  rows[0].before(grid);rows.forEach(r=>r.hidden=true);

  // pager lives in the existing Controls row, beside "Showing x of y"
  const controls=[...work.children].find(el=>el.dataset.name==='Controls');
  const count=[...controls.querySelectorAll('p')].find(p=>/^Showing/i.test(p.textContent.trim()));
  const pager=document.createElement('div');pager.className='mw-pager';
  pager.innerHTML='<button type="button" aria-label="Previous page">←</button><span class="mw-dots"></span><button type="button" aria-label="Next page">→</button>';
  (count||controls).after?.(pager);if(count)count.parentElement.insertBefore(pager,count.nextSibling);
  const [prev,next]=pager.querySelectorAll('button'),dots=pager.querySelector('.mw-dots');

  function list(){return all.filter(p=>p.type===type);}
  function render(dir=1){
    const items=list(),pages=Math.ceil(items.length/PER);page=(page+pages)%pages;
    const shown=items.slice(page*PER,page*PER+PER);
    slots.forEach((b,i)=>{
      const item=shown[i];b.hidden=!item;if(!item)return;
      b.style.setProperty('--d',(dir>0?i:PER-1-i)*45+'ms');b.classList.remove('mw-in');b.classList.add('mw-out');
      setTimeout(()=>{
        b._item=item;const n=page*PER+i+1;
        b.querySelector('.mw-n').textContent=String(n).padStart(2,'0');
        b.querySelector('.mw-name').textContent=item.name;
        b.querySelector('.mw-store').textContent=store(item.url);
        const img=b.querySelector('.mw-img');img.src=item.image;img.alt=`${item.name} ${type} preview`;
        b.querySelector('.mw-field').style.backgroundImage=`url("${item.image}")`;
        b.classList.toggle('mw-site',type==='website');b.setAttribute('aria-label',`Explore ${item.name}`);
        b.classList.remove('mw-out');void b.offsetWidth;b.classList.add('mw-in');
      },220+(dir>0?i:PER-1-i)*45);
    });
    if(count)count.textContent=`${String(page*PER+1).padStart(2,'0')}–${String(page*PER+shown.length).padStart(2,'0')} of ${items.length}`;
    dots.innerHTML=Array.from({length:pages},(_,i)=>`<i class="${i===page?'on':''}"></i>`).join('');
    prev.disabled=next.disabled=pages<2;
  }
  prev.addEventListener('click',()=>{page--;render(-1);});
  next.addEventListener('click',()=>{page++;render(1);});
  work.addEventListener('keydown',e=>{if(e.target.closest('input,textarea'))return;if(e.key==='ArrowRight'&&grid.contains(document.activeElement)){page++;render(1);}if(e.key==='ArrowLeft'&&grid.contains(document.activeElement)){page--;render(-1);}});
  // reuse the Figma segmented control (Apps · 22 / Websites · 10)
  [...controls.querySelectorAll('p')].filter(p=>/^(Apps|Websites)\s*·/i.test(p.textContent.trim())).forEach(tab=>{
    const host=tab.closest('[data-name="Apps (selected)"],[data-name="Websites"]')||tab;
    host.addEventListener('click',()=>{const t=/^apps/i.test(tab.textContent.trim())?'app':'website';if(t===type)return;type=t;page=0;render(1);
      controls.querySelectorAll('[data-name="Apps (selected)"],[data-name="Websites"]').forEach(h=>h.classList.toggle('mw-tab-on',h===host));});
  });
  controls.querySelector('[data-name="Apps (selected)"]')?.classList.add('mw-tab-on');
  // swipe on touch
  let sx=null;grid.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse')sx=e.clientX;});
  grid.addEventListener('pointerup',e=>{if(sx==null)return;const dx=e.clientX-sx;sx=null;if(Math.abs(dx)>50){page+=dx<0?1:-1;render(dx<0?1:-1);}});
  render(1);
})();
