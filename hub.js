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
  try{const last=localStorage.getItem('beyond-last');const card=cards.find(c=>c.getAttribute('href')===last);if(card){const resume=document.querySelector('#resume');resume.href=last;resume.innerHTML=`Continue exploring <span>↗</span>`;}}catch{}
})();
