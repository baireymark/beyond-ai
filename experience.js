/* Portable enhancement layer. Pages and their original artwork also work offline. */
(() => {
  'use strict';
  const $ = (s,r=document) => r.querySelector(s);
  const $$ = (s,r=document) => [...r.querySelectorAll(s)];
  const study = document.body.dataset.study;
  const root = $('.design-root');
  if (!root) return;
  const names = ['Bold Tech · Study B','Moodboard','Particles · Light','Clear Plan · Refined','Big Ideas, Real Systems','Work, Rewired','Connected Terrain','Systems · Refined'];
  const slugs = ['bold-tech','moodboard','particles','clear-plan','big-ideas','work-rewired','connected-terrain','systems'];
  const index = slugs.indexOf(study);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const preview = new URLSearchParams(location.search).has('preview');
  const sections = $$('.design-section',root);
  const txt = el => (el?.textContent || '').replace(/\s+/g,' ').trim();
  const name = el => el.getAttribute('data-name') || '';
  const escape = text => String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const byName = (re, scope=root) => $$('[data-name]',scope).filter(el=>re.test(name(el)));
  const dims = el => {const c=getComputedStyle(el);return {w:parseFloat(c.width)||0,h:parseFloat(c.height)||0};};
  if(preview) {
    root.style.zoom='1'; root.style.width='1440px';
    sections.filter(s=>s.id!=='home'&&s.id!=='navigation').forEach(s=>s.remove());
    document.body.style.width='1440px';
    return;
  }
  let paused=reduced.matches;
  try {paused=paused||localStorage.getItem('beyond-motion')==='paused';} catch {}
  const ui=$('#experience-ui');
  ui.innerHTML=`<div class="study-progress" aria-hidden="true"></div><nav class="study-dock" aria-label="Design studies"><a href="index.html" aria-label="All eight designs" title="All eight designs">▦</a><a href="${slugs[(index+7)%8]}.html" aria-label="Previous design">←</a><span class="study-title">${String(index+1).padStart(2,'0')} / ${names[index]}</span><a href="${slugs[(index+1)%8]}.html" aria-label="Next design">→</a><button id="motion-toggle" aria-label="Pause animations" aria-pressed="false" title="Pause animations">Ⅱ</button></nav><dialog class="experience-dialog" aria-labelledby="dialog-title"><button class="dialog-close" aria-label="Close dialog">×</button><div class="dialog-content"></div></dialog><div class="toast" role="status" hidden></div>`;
  const dialog=$('dialog',ui),content=$('.dialog-content',dialog);
  let returnFocus=null,toastTimer;
  function toast(message){const t=$('.toast');t.textContent=message;t.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.hidden=true,4200);}
  function show(html){returnFocus=document.activeElement;content.innerHTML=html;if(!dialog.open)dialog.showModal();}
  function close(){dialog.close();returnFocus?.focus?.();}
  $('.dialog-close',dialog).addEventListener('click',close);
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});
  dialog.addEventListener('close',()=>returnFocus?.focus?.());
  function motionState(){document.documentElement.classList.toggle('motion-paused',paused);const b=$('#motion-toggle');b.textContent=paused?'▶':'Ⅱ';b.setAttribute('aria-pressed',String(paused));b.setAttribute('aria-label',paused?'Play animations':'Pause animations');b.title=b.getAttribute('aria-label');}
  $('#motion-toggle').addEventListener('click',()=>{paused=!paused;motionState();try{localStorage.setItem('beyond-motion',paused?'paused':'playing');}catch{}});
  reduced.addEventListener('change',e=>{paused=e.matches;motionState();});motionState();
  const productData={
    'HRM':{title:'Beyond AI HRM',headline:'People, in one place.',description:'Bring people operations together with HR and payroll software.',items:['People operations','Employee records','Payroll and attendance']},
    'ERP':{title:'Beyond AI ERP',headline:'Operations, connected.',description:'Connect the moving parts of your business in one enterprise resource planning system.',items:['Connected operations','Business workflows','Shared visibility']},
    'Count Trust':{title:'Count Trust',headline:'Every vote counts.',description:'A secure voting platform for organisations and their communities.',items:['Create an election','Collect votes','Review results']},
    'Talkora AI':{title:'Talkora AI',headline:'A voice for your business.',description:'AI voice agents to support customer conversations and contact workflows.',items:['Answer customer calls','Connect to business context','Hand over when needed']},
    'Agentic AI':{title:'Agentic AI',headline:'Move the conversation forward.',description:'Support sales, engagement and negotiation with AI agents.',items:['Sales support','Customer engagement','Conversation workflows']}
  };
  const portfolio=window.BEYOND_PORTFOLIO||[];
  function project(item){if(!item)return;show(`<div class="dialog-kicker">BEYOND AI / ${item.type==='app'?'APP':'WEBSITE'} PORTFOLIO</div><h2 id="dialog-title">${escape(item.name)}</h2><img class="project-preview ${item.type}" src="${item.image}" alt="${escape(item.name)} preview from Beyond AI"><div class="dialog-actions"><a class="dialog-action" href="${escape(item.url)}" target="_blank" rel="noopener noreferrer">${item.type==='app'?'View app listing':'Visit website'} ↗</a><a class="dialog-action dialog-secondary" href="portfolio.html">All 32 projects →</a></div>`);}
  function productKey(text){return Object.keys(productData).find(k=>text.toLowerCase().includes(k.toLowerCase()));}
  let brief='';
  function contact(seed='') {
    brief=seed||brief;
    show(`<div class="dialog-kicker">START A CONVERSATION</div><h2 id="dialog-title">What do you want<br>to make work better?</h2><p>Put a few details together. You can save your brief or open it in your email app.</p><form class="dialog-form" id="brief-form"><label>Your name<input name="name" autocomplete="name" required placeholder="Alex Santos"></label><label>Email address<input name="email" type="email" autocomplete="email" required placeholder="alex@company.com"></label><label>Project brief<textarea name="brief" required placeholder="The challenge, your goals, and where you are today…">${escape(brief)}</textarea></label><div class="dialog-actions"><button class="dialog-action" type="submit">Prepare project brief <span>↗</span></button></div><p class="form-note">This is a local prototype. Nothing is sent or uploaded.</p></form>`);
    $('#brief-form').addEventListener('submit',e=>{
      e.preventDefault();const f=e.currentTarget;if(!f.reportValidity())return;
      const data=Object.fromEntries(new FormData(f));brief=data.brief;
      const body=`Beyond AI project enquiry\n\nName: ${data.name}\nEmail: ${data.email}\n\nProject brief:\n${data.brief}`;
      show(`<div class="dialog-kicker">BRIEF READY</div><h2 id="dialog-title">A good place to start.</h2><p>Your brief is ready. Choose how you’d like to keep it or share it.</p><div class="dialog-actions"><button id="download-brief" class="dialog-action">Download brief ↓</button><a class="dialog-action dialog-secondary" href="mailto:sakib@beyondai.ph?subject=Beyond%20AI%20project%20enquiry&body=${encodeURIComponent(body)}">Open email draft ↗</a></div><p class="form-note" style="margin-top:20px!important">No message has been sent. Your email app will open a draft for you to review.</p>`);
      $('#download-brief').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([body],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='beyond-ai-project-brief.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Project brief downloaded.');});
    });
  }
  function product(key){const p=productData[key];if(!p)return;show(`<div class="dialog-kicker">PRODUCT EXPLORER / ${escape(p.title)}</div><h2 id="dialog-title">${escape(p.headline)}</h2><p>${escape(p.description)}</p><ul class="detail-list">${p.items.map(t=>`<li>${escape(t)}</li>`).join('')}</ul><button class="dialog-action" id="ask-product">Discuss ${escape(p.title)} ↗</button>`);$('#ask-product').addEventListener('click',()=>contact(`I’d like to discuss ${p.title}.`));}
  function makeButton(el,fn,label){if(el.closest('[data-wired]'))return;el.dataset.wired='true';if(el.tagName!=='A'&&el.tagName!=='BUTTON'){el.setAttribute('role','button');el.tabIndex=0;el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();fn(e);}});}if(label)el.setAttribute('aria-label',label);el.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();fn(e);});el.classList.add('tactile');}
  function jump(key){const mobile=$(`.mobile-section[data-id="${key}"]`);const target=matchMedia('(max-width:900px)').matches?mobile:document.getElementById(key);if(target)target.scrollIntoView({behavior:paused?'instant':'smooth',block:'start'});else if(key==='work')jump('products');else contact();}
  document.addEventListener('click',e=>{const a=e.target.closest('a[href^="#"]');if(!a)return;const key=a.getAttribute('href').slice(1);e.preventDefault();if(a.hasAttribute('data-contact')||key==='contact'){contact();}else jump(key);});
  // Keep the design's existing CTA shapes while making the whole control operable.
  for(const el of byName(/^(Primary|Secondary|Contact|Nav CTA|Button|CTA|Enter key|Submit|Split submit|Start learning|Course CTA|Discuss your project|Talk to our team|Let’s talk|Start a conversation|Explore (the )?course)$|^(Pill\/|Bar\/|v2\/Bar button)/i)) {
    if(txt(el).length>100||!txt(el)||el.closest('a'))continue;
    const label=txt(el);
    if(/product/i.test(label))makeButton(el,()=>jump('products'));
    else if(/work/i.test(label)&&!/together|needs|better/i.test(label))makeButton(el,()=>jump('work'));
    else if(/course|learn|education/i.test(label))makeButton(el,()=>course());
    else makeButton(el,()=>contact());
  }
  // Product cards and directory entries are local, useful previews.
  const productScope=$('#products');
  if(productScope){
    for(const el of byName(/^(Card\/|Chip\/|Beyond AI HRM$|Beyond AI ERP$|Count Trust$|Talkora AI$|Agentic AI$|Explore (Beyond AI |Talkora|product))/i,productScope)){
      if(el.closest('[data-name^="Select "]'))continue;
      const key=productKey(name(el)+' '+txt(el));if(key){makeButton(el,()=>product(key));el.classList.add('interactive-card');}
    }
    for(const el of $$('p,a',productScope))if(txt(el).length<28&&productKey(txt(el))&&!el.closest('[data-wired],[data-name^="Select "]'))makeButton(el,()=>product(productKey(txt(el))));
  }
  // Big Ideas' product selector changes the featured product in place.
  const choices=byName(/^Select /);
  if(choices.length){
    const panel=byName(/^Selected product$/)[0],original=panel?.innerHTML;
    const illustrations={
      HRM:{category:'WORKFORCE',heading:'People operations',cards:['Employee records','Attendance & leave','Payroll preparation','Performance & analytics']},
      ERP:{category:'OPERATIONS',heading:'Connected operations',cards:['Finance & accounting','Inventory management','Business workflows','Shared reporting']},
      'Count Trust':{category:'DIGITAL VOTING',heading:'Every vote, accounted for.',cards:['Election setup','Voter participation','Secure ballot collection','Results & reporting']},
      'Talkora AI':{category:'VOICE AUTOMATION',heading:'Conversations that connect.',cards:['Incoming calls','Business context','Customer responses','Team handover']},
      'Agentic AI':{category:'AI AGENTS',heading:'From conversation to action.',cards:['Sales conversations','Customer engagement','Negotiation support','Workflow assistance']}
    };
    panel.id='selected-product-panel';panel.setAttribute('role','tabpanel');
    const tablist=choices[0].parentElement;tablist.setAttribute('role','tablist');tablist.setAttribute('aria-label','Choose a product');
    function selectProduct(choice,i,animate=true){
      const key=productKey(txt(choice)),p=productData[key],visual=illustrations[key];
      if(!p||!visual)return;
      choices.forEach(c=>{const active=c===choice;c.setAttribute('aria-selected',String(active));c.tabIndex=active?0:-1;c.classList.remove('filter-active');});
      // Restore both columns, then populate the existing Figma illustration for this product.
      panel.innerHTML=original;
      panel.setAttribute('aria-labelledby',choice.id);panel.dataset.productKey=key;
      $$('[data-wired]',panel).forEach(node=>delete node.dataset.wired);
      const explanation=$('[data-name="Product explanation"]',panel);
      $('[data-name="Section identifier"] p',explanation).textContent=`0${i+1} / ${visual.category}`;
      $('p[data-font="28"]',explanation).textContent=p.title;
      if(key!=='HRM')$('p[data-font="16"]',explanation).textContent=p.description;
      const illustration=$('[data-name^="Product illustration / "]',panel);
      illustration.dataset.name=`Product illustration / ${key}`;
      $('[data-name="Illustration caption"] p',illustration).textContent=`BEYOND AI / ${key.toUpperCase()}`;
      $('p[data-font="28"]',illustration).textContent=visual.heading;
      $$('[data-name="Capability pair"] > div',illustration).forEach((card,j)=>{
        card.dataset.name=visual.cards[j];$('p[data-font="16"]',card).textContent=visual.cards[j];
      });
      const demo=$('p[data-font="15"]',explanation)?.parentElement;
      if(demo)makeButton(demo,()=>contact(`I’d like a demo of ${p.title}.`),'Request a product demo');
      if(animate)panel.animate([{opacity:.3,transform:'translateY(8px)'},{opacity:1,transform:'none'}],{duration:paused?0:300});
    }
    choices.forEach((choice,i)=>{
      choice.id=`product-tab-${i}`;choice.setAttribute('role','tab');choice.setAttribute('aria-controls',panel.id);choice.dataset.wired='true';
      choice.addEventListener('click',()=>selectProduct(choice,i));
      choice.addEventListener('keydown',e=>{
        if(['ArrowRight','ArrowLeft','Home','End'].includes(e.key)){
          e.preventDefault();const j=e.key==='Home'?0:e.key==='End'?choices.length-1:(i+(e.key==='ArrowRight'?1:choices.length-1))%choices.length;
          choices[j].focus();choices[j].click();
        }
        if(e.key==='Enter'||e.key===' '){e.preventDefault();selectProduct(choice,i);}
      });
    });
    selectProduct(choices[0],0,false);
  }

  document.addEventListener('click',e=>{const el=e.target.closest('[data-product]');if(el)product(el.dataset.product);});
  // Service rows reveal the description already present in the design.
  const serviceScope=$('#services');
  if(serviceScope){for(const el of byName(/^(Row\/|Service\/|Cloud modernization|AI analytics|AI &|Cybersecurity|Software development|Managed services|Resource augmentation)/i,serviceScope)){
    if(el.parentElement.closest('[data-service]')||txt(el).length<8)continue;el.dataset.service='';el.classList.add('service-row');makeButton(el,()=>{const paragraphs=$$('p',el).map(txt).filter(Boolean);show(`<div class="dialog-kicker">BEYOND AI / SERVICES</div><h2 id="dialog-title">${escape(paragraphs.find(t=>t.length>5&&t.length<80)||name(el).replace(/^.*\//,''))}</h2><p>${escape(paragraphs.filter(t=>t.length>60).join(' ')||'Start with your business challenge. We’ll discuss the right scope, priorities and next steps together.')}</p><button class="dialog-action" id="service-contact">Discuss your project ↗</button>`);$('#service-contact').addEventListener('click',()=>contact(`I’m interested in ${name(el).replace(/^.*\//,'')}.`));});
  }}
  function course(){show('<div class="dialog-kicker">AI EDUCATION</div><h2 id="dialog-title">Less theory.<br>More try it.</h2><p>Practical AI learning through guided modules and projects. No coding experience required.</p><ul class="detail-list"><li>11 guided modules</li><li>4 practical projects</li><li>1 certificate</li></ul><button class="dialog-action" id="course-contact">Ask about the course ↗</button>');$('#course-contact').addEventListener('click',()=>contact('I’d like to learn more about the AI education course.'));}
  // Real app and website imagery comes from the supplied Beyond AI website.
  const work=$('#work');
  if(work){
    const cards=$$('[data-portfolio-name]',work).filter(el=>name(el)!=='Reflection');
    cards.forEach(card=>{card.classList.add('interactive-card');makeButton(card,()=>project(portfolio.find(p=>card.dataset.portfolioUrl?p.url===card.dataset.portfolioUrl:p.name===card.dataset.portfolioName)),`Explore ${card.dataset.portfolioName}`);});
    const tabs=$$('p,button',work).filter(el=>/^(APPS|WEBSITES)\s*[·.]?\s*(22|10)?$/i.test(txt(el)));
    const snapshots=cards.map(card=>({card,image:$('.portfolio-image',card),label:(name(card).startsWith('v2/')?$('p',byName(/^Text$/,card)[0]||card):card.nextElementSibling?.tagName==='P'?card.nextElementSibling:$$('p',card)[0]),original:card.dataset.portfolioName}));
    tabs.forEach(tab=>{tab.setAttribute('aria-pressed',String(/^apps/i.test(txt(tab))));makeButton(tab,()=>{
      const type=/^apps/i.test(txt(tab))?'app':'website';const list=portfolio.filter(p=>p.type===type);
      tabs.forEach(t=>{t.classList.toggle('filter-active',t===tab);t.setAttribute('aria-pressed',String(t===tab));});
      snapshots.forEach(({card,image,label,original},i)=>{const item=type==='app'?portfolio.find(p=>p.name===original):list[i%list.length];if(!item||!image)return;image.src=item.image;image.alt=item.name+' '+type+' preview';image.classList.toggle('website',type==='website');card.dataset.portfolioName=item.name;card.dataset.portfolioUrl=item.url;card.setAttribute('aria-label',`Explore ${item.name}`);if(label)label.textContent=item.name;});
      toast(type==='app'?'Showing app projects':'Showing website projects');
    });});
    for(const el of $$('p,a',work)){if(/^(view all|see all|all apps|all work)/i.test(txt(el))&&txt(el).length<45){makeButton(el,()=>location.href='portfolio.html');}}
    for(const el of byName(/^Websites preview$/,work))makeButton(el,()=>location.href='portfolio.html?type=website');
  }
  // Service cards in the bold study use concise names; their whole surfaces work.
  if(study==='bold-tech'&&serviceScope){for(const el of byName(/^Card\//,serviceScope)){makeButton(el,()=>contact(`I’m interested in ${txt(el)}.`));}}
  // Turn existing form-shaped regions into editable fields without changing their layout.
  for(const field of byName(/^Field\/(Name|Work email|Company|Message)$/)){
    const slot=byName(/^Input$/,field)[0];if(!slot)continue;const old=$('p',slot),multiline=/Message/.test(name(field));const input=document.createElement(multiline?'textarea':'input');input.className=(old?.className||'')+' live-field';input.style.cssText='width:100%;height:100%;padding:0;resize:none';input.placeholder=old?txt(old):name(field).split('/')[1];input.setAttribute('aria-label',name(field).split('/')[1]);input.name=name(field).split('/')[1];if(!multiline)input.type=/email/i.test(name(field))?'email':'text';slot.replaceChildren(input);
  }
  for(const el of $$('a',root)){if(/^(Start learning|Explore (the )?course)$/i.test(txt(el))&&!el.closest('[data-wired]'))makeButton(el,course);}
  function wireLoose(scope=root){for(const el of $$('div,button',scope)){
    if(el.closest('[data-wired],[role=tablist]')||el.querySelector('[data-wired],a')||txt(el).length>65||!txt(el))continue;
    if(getComputedStyle(el).cursor!=='pointer'||getComputedStyle(el.parentElement).cursor==='pointer')continue;
    const label=txt(el);
    if(/product/i.test(label)&&!/demo|request|discuss/i.test(label))makeButton(el,()=>jump('products'));
    else if(/learn|course|education/i.test(label))makeButton(el,course);
    else if(/let.s|talk|project|build|demo|contact|brief|send|message|consult|start|discuss/i.test(label))makeButton(el,()=>contact());
  }}
  wireLoose();
  for(const el of byName(/Menu( button)?$/i))makeButton(el,()=>{show(`<div class="dialog-kicker">EXPLORE BEYOND AI</div><h2 id="dialog-title">Where next?</h2><nav class="mobile-menu">${['services','products','work','education','contact'].filter(k=>$('#'+k)).map(k=>`<a href="#${k}">${k[0].toUpperCase()+k.slice(1)} ↗</a>`).join('')}</nav>`);$$('a',content).forEach(a=>a.addEventListener('click',()=>dialog.close()));},'Open navigation');
  for(const el of byName(/Question and answer/)){
    const children=[...el.children].filter(c=>txt(c));if(children.length<2)continue;const q=children[0],a=children[1];q.classList.add('faq-question');a.classList.add('faq-answer');a.id=`answer-${Math.random().toString(36).slice(2,9)}`;q.setAttribute('aria-expanded','true');q.setAttribute('aria-controls',a.id);makeButton(q,()=>{a.hidden=!a.hidden;q.setAttribute('aria-expanded',String(!a.hidden));});
  }
  // Contact mock fields become real local form fields.
  for(const el of byName(/^(Email input|Command input)$/i)){
    const placeholder=$$('p',el).find(p=>/email|describe|project|@/i.test(txt(p)));
    if(placeholder){const input=document.createElement('input');input.className=placeholder.className+' live-field';input.placeholder=txt(placeholder);input.setAttribute('aria-label',/email/i.test(name(el))?'Your email':'Describe your project');input.type=/email/i.test(name(el))?'email':'text';placeholder.replaceWith(input);input.addEventListener('input',()=>{brief=input.value;});input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();contact(input.value);}});}
  }
  const quickPicks=byName(/^Quick picks$/)[0];if(quickPicks){quickPicks.classList.add('brief-chips');for(const chip of [...quickPicks.children]){chip.setAttribute('aria-pressed','false');makeButton(chip,()=>{const yes=chip.getAttribute('aria-pressed')!=='true';chip.setAttribute('aria-pressed',String(yes));brief=[...quickPicks.children].filter(c=>c.getAttribute('aria-pressed')==='true').map(txt).join(', ');const input=$('.live-field');if(input)input.value=brief;});}}
  // Animate the source artwork; Moodboard's globe has its own ASCII surface renderer.
  byName(/^Spectrum \+ ticks$/).forEach(el=>el.classList.add('rotate-slow'));
  byName(/^Radar sweep$/).forEach(el=>el.classList.add('rotate-reverse'));
  byName(/^(Active glow|Glow|Core glow|Floor glow|Light tunnel)$/).forEach(el=>el.classList.add('breathe-art'));
  byName(/^(Wireframe sphere|Wireframe torus|Wireframe ring|Chromatic wireform)/).forEach(el=>el.classList.add('wireframe-drift'));
  byName(/^(Topographic map|Cartographic terrain|Routing field|Connected field)/).forEach(el=>el.classList.add('terrain-drift'));
  byName(/^(Status|Peak ring|Ring\/|Marker\/|Pin\/)/).forEach(el=>el.classList.add('signal-pulse'));
  byName(/^(Pillar\/|Pillar ·|Pillar )/).forEach((el,i)=>{el.classList.add('float-art');el.style.animationDelay=`${-i*1.2}s`;});
  byName(/Ticker \(marquee\)/).forEach(el=>{const c=[...el.children].find(c=>dims(c).w>900);if(c)c.classList.add('marquee-motion');});
  // Stagger visible editorial headings without hiding content when JavaScript fails.
  const reveal=$$('h1,h2',root);reveal.forEach((el,i)=>{el.classList.add('motion-reveal');el.style.transitionDelay=`${(i%3)*60}ms`;});
  const revealObserver=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');revealObserver.unobserve(e.target);}}),{threshold:.08,rootMargin:'0px 0px 40px 0px'});
  reveal.forEach(el=>revealObserver.observe(el));document.documentElement.classList.add('motion-ready');
  const animated=$$('.rotate-slow,.rotate-reverse,.float-art,.breathe-art,.terrain-drift,.wireframe-drift,.signal-pulse');
  const motionObserver=new IntersectionObserver(entries=>entries.forEach(e=>e.target.style.animationPlayState=e.isIntersecting?'running':'paused'),{rootMargin:'120px'});animated.forEach(el=>motionObserver.observe(el));
  function particles(section){if(!section)return;const canvas=document.createElement('canvas');canvas.className='particle-canvas';canvas.setAttribute('aria-hidden','true');section.prepend(canvas);const ctx=canvas.getContext('2d');const w=1440,h=dims(section).h||900;canvas.width=w;canvas.height=h;let t=0;const dots=Array.from({length:60},(_,i)=>({x:(i*151.37)%w,y:(i*87.79)%h,r:.6+(i%3)*.45,v:.08+(i%5)*.035}));let visible=true;new IntersectionObserver(e=>visible=e[0].isIntersecting).observe(section);let frame;const draw=()=>{frame=requestAnimationFrame(draw);if(paused||!visible||document.hidden)return;if(++t%2)return;ctx.clearRect(0,0,w,h);for(const dot of dots){dot.y-=dot.v*2;if(dot.y<0)dot.y=h;ctx.beginPath();ctx.fillStyle=`rgba(255,138,61,${.15+.35*(.5+.5*Math.sin(t*.008+dot.x))})`;ctx.arc(dot.x+Math.sin(t*.002+dot.y)*8,dot.y,dot.r,0,Math.PI*2);ctx.fill();}};draw();window.addEventListener('pagehide',()=>cancelAnimationFrame(frame),{once:true});}
  if(study==='particles'){particles($('#home'));particles($('#contact'));}
  // Time labels update only where the original design contains a clock value.
  const zones={Manila:'Asia/Manila',Dhaka:'Asia/Dhaka',Switzerland:'Europe/Zurich','New York':'America/New_York',Austin:'America/Chicago'};
  const clockNodes=[];for(const el of $$('p',root)){if(/^\d{1,2}:\d{2}(?::\d{2})?\s*(AM|PM)?$/i.test(txt(el))){let parent=el.parentElement;for(let depth=0;depth<3&&parent&&!parent.classList.contains('design-section')&&txt(parent).length<110;depth++,parent=parent.parentElement){const city=Object.keys(zones).find(c=>txt(parent).toLowerCase().includes(c.toLowerCase()));if(city){clockNodes.push([el,zones[city]]);el.setAttribute('aria-label',`${city} local time`);break;}}}}
  function clocks(){clockNodes.forEach(([el,timeZone])=>el.textContent=new Intl.DateTimeFormat('en-GB',{timeZone,hour:'2-digit',minute:'2-digit'}).format(new Date()));}clocks();if(clockNodes.length)setInterval(clocks,30000);
  function progress(){const max=document.documentElement.scrollHeight-innerHeight;$('.study-progress').style.transform=`scaleX(${max>0?scrollY/max:0})`;}
  addEventListener('scroll',progress,{passive:true});
  // Responsive reading layout built from the same source copy, with the exact hero artwork.
  function mobileView(){
    const mobile=document.createElement('div');mobile.className='mobile-view';
    const mark=$('img[src*="8daf3"]',root)||$('img',root);
    const nav=document.createElement('header');nav.className='mobile-nav';nav.innerHTML=`<a href="#home" class="brand">${mark?`<img src="${mark.getAttribute('src')}" alt="">`:''}Beyond <span style="color:#ff5a1f">Ai</span></a><button aria-label="Open navigation">☰</button>`;nav.querySelector('button').addEventListener('click',()=>{show(`<div class="dialog-kicker">EXPLORE</div><h2 id="dialog-title">Beyond AI</h2><nav class="mobile-menu">${['services','products','work','education','contact'].filter(k=>$('#'+k)).map(k=>`<a href="#${k}">${k[0].toUpperCase()+k.slice(1)} ↗</a>`).join('')}</nav>`);$$('a',content).forEach(a=>a.addEventListener('click',()=>dialog.close()));});mobile.append(nav);
    for(const section of sections){
      if(section.id.startsWith('navigation'))continue;
      const s=document.createElement('section');s.className='mobile-section';s.dataset.id=section.id;
      const bg=getComputedStyle(section).backgroundColor;const rgb=bg.match(/\d+/g)?.map(Number)||[];
      if(rgb.length>=3&&rgb.slice(0,3).every(v=>v<45))s.classList.add('dark');
      else if(rgb[0]>230&&rgb[1]<130)s.classList.add('orange');
      else if(rgb[2]>230&&rgb[0]<245&&rgb[1]<235)s.classList.add('lilac');
      if(section.id==='footer')s.classList.add('mobile-footer');
      const label=document.createElement('div');label.className='mobile-label';label.textContent=section.dataset.section.replace(/^\d+\s*[—/]\s*/,'');s.append(label);
      const candidates=$$('p,h1,h2,a',section).filter(el=>!el.querySelector('p,h1,h2')&&!el.closest('[data-name*="Logo"]')&&!el.closest('[data-name*="Nav"]')&&!el.closest('[data-name*="Links"]'));
      const seen=new Set();
      if(section.id==='faq'){
        for(const row of byName(/Question and answer/,section)){const texts=$$('p,[role=button]',row).map(txt).filter(Boolean);if(texts.length>=2){const d=document.createElement('details');d.className='mobile-faq';d.innerHTML=`<summary>${escape(texts[0])}</summary><p>${escape(texts.at(-1))}</p>`;s.append(d);}}
      }else{
        for(const el of candidates){const t=txt(el),font=parseFloat(getComputedStyle(el).fontSize);if(!t||seen.has(t)||t.length<3||/^[↗→+—\/\d°:.\s-]{1,8}$/.test(t))continue;
          let artwork=false;for(let p=el.parentElement;p&&p!==section;p=p.parentElement){if(/^(Wireframe|Core instrument|Light tunnel|Dither globe|Cartographic terrain|Routing field|Logo hub|Satellite\/|Micro chart|Readout)/.test(name(p))){artwork=true;break;}}if(artwork)continue;
          if(font<14&&t.length<65)continue;
          if(/^(Services|Products|Education|Work|Contact|LinkedIn|Facebook|Home|Board|Explore product|LET.S TALK|Start a project)$/i.test(t))continue;
          if(el.closest('a')||el.tagName==='A')continue;
          if(section.id==='home'&&font<24&&t.length<40)continue;
          const p=document.createElement(font>=48?(section.id==='home'&&!$('h1',s)?'h1':'h2'):font>=24?'h3':'p');p.textContent=t;
          if(/^[\d,.+%]+$/.test(t)){p.className='mobile-stat';}
          s.append(p);seen.add(t);
        }
      }
      if(section.id==='home'){
        const art=byName(/^(Core instrument|Dither globe|Light tunnel|Wireframe ring|Chromatic wireform|Cartographic terrain|Routing field|Topographic map)/,section)[0];
        if(art){const d=dims(art);const wrapper=document.createElement('div');wrapper.className='mobile-art';const clone=art.cloneNode(true);clone.removeAttribute('id');$$('[id]',clone).forEach(el=>el.removeAttribute('id'));clone.style.width=d.w+'px';clone.style.height=d.h+'px';clone.style.zoom='1';wrapper.dataset.artWidth=d.w;wrapper.dataset.artHeight=d.h;wrapper.append(clone);s.append(wrapper);}
        const actions=document.createElement('div');actions.className='mobile-actions';actions.innerHTML='<a href="#contact" class="primary">Start a project ↗</a><a href="#products">Explore products →</a>';s.append(actions);
      }
      if(section.id==='products'){const products=document.createElement('div');products.innerHTML=Object.entries(productData).map(([key,p])=>`<button class="mobile-product-row" data-product="${key}"><span>${p.title}</span><span>Explore ↗</span></button>`).join('');s.append(products);}
      if(section.id==='work'){const previews=document.createElement('div');previews.className='mobile-work-grid';portfolio.filter(p=>p.type==='app').slice(0,4).forEach(item=>{const button=document.createElement('button');button.innerHTML=`<img src="${item.image}" alt="${escape(item.name)}" loading="lazy"><span>${escape(item.name)} ↗</span>`;button.addEventListener('click',()=>project(item));previews.append(button);});s.append(previews);const more=document.createElement('div');more.className='mobile-actions';more.innerHTML='<a href="portfolio.html" class="primary">All 22 apps + 10 websites ↗</a>';s.append(more);}
      if(section.id==='contact'||section.id==='education'){const actions=document.createElement('div');actions.className='mobile-actions';const b=document.createElement('button');b.className='primary';b.textContent=section.id==='contact'?'Discuss your project ↗':'Explore the course ↗';b.addEventListener('click',()=>section.id==='contact'?contact():course());actions.append(b);s.append(actions);}
      if(s.children.length>1)mobile.append(s);
    }
    $('#study').append(mobile);
    function resizeArt(){for(const el of $$('.mobile-art')){const w=el.clientWidth,h=Number(el.dataset.artHeight),scale=w/Number(el.dataset.artWidth);el.style.height=Math.max(120,h*scale)+'px';el.firstElementChild.style.transform=`scale(${scale})`;}}
    resizeArt();addEventListener('resize',resizeArt,{passive:true});
  }
  // Measure source artwork at its natural width before the mobile view is created.
  const small=matchMedia('(max-width:900px)');
  if(small.matches){root.style.display='block';root.style.position='absolute';root.style.visibility='hidden';root.style.zoom='1';}
  mobileView();
  if(small.matches){root.style.removeProperty('display');root.style.removeProperty('position');root.style.removeProperty('visibility');root.style.removeProperty('zoom');}
  function scale(){if(innerWidth>900)root.style.zoom=innerWidth/1440;else root.style.removeProperty('zoom');progress();}
  scale();addEventListener('resize',scale,{passive:true});
})();
