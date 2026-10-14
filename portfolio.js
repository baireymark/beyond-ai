(() => {
 const cards=[...document.querySelectorAll('.project-card')],buttons=[...document.querySelectorAll('button[data-type]')],search=document.querySelector('#search');
 let type=new URLSearchParams(location.search).get('type')||'all';if(!['all','app','website'].includes(type))type='all';
 function filter(){let count=0;for(const card of cards){card.hidden=!(type==='all'||card.dataset.type===type)||!card.dataset.title.includes(search.value.toLowerCase().trim());if(!card.hidden)count++;}buttons.forEach(b=>{b.classList.toggle('active',b.dataset.type===type);b.setAttribute('aria-pressed',String(b.dataset.type===type));});document.querySelector('#count').textContent=`${count} project${count===1?'':'s'}`;document.querySelector('#empty').hidden=count>0;}
 buttons.forEach(b=>b.addEventListener('click',()=>{type=b.dataset.type;filter();}));search.addEventListener('input',filter);filter();
})();
