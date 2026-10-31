'use strict';
/* Общий модуль приложения «VSplanet Книги»: service worker, установка, офлайн-копии книг. */
(()=>{
 const ROOT=new URL('./',document.currentScript.src).href;
 const NS='offline-book-',META='__offline';
 const $$=s=>[...document.querySelectorAll(s)];
 const mb=b=>(b/1048576).toFixed(b<10485760?1:0).replace('.',',')+' МБ';
 const S={};let installEvent=null;
 const ios=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 function toast(t){let n=document.getElementById('toast');if(!n){n=document.createElement('div');n.id='toast';n.setAttribute('role','status');document.body.append(n);}n.textContent=t;n.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>n.classList.remove('show'),6000);}
 /* ---- офлайн-копии ---- */
 const LBL={idle:'Скачать',busy:'Скачивание…',ready:'Сохранено',update:'Обновить',error:'Повторить'};
 const TIP={idle:'Скачать книгу для чтения без сети',busy:'Скачивание…',ready:'Книга на устройстве. Нажмите, чтобы удалить',update:'Есть новая версия — обновить',error:'Не удалось скачать — повторить'};
 function set(slug,v){S[slug]={...S[slug],...v};render();}
 function render(){
  $$('[data-offline]').forEach(el=>{const s=S[el.dataset.offline]||{st:'idle'};el.dataset.st=s.st;el.style.setProperty('--p',Math.round((s.p||0)*100)+'%');
   el.title=TIP[s.st];el.setAttribute('aria-label',TIP[s.st]);const t=el.querySelector('.off-t');if(t)t.textContent=s.st==='busy'?'Скачивание '+Math.round((s.p||0)*100)+'%':LBL[s.st];});
  const ready=Object.entries(S).filter(([,v])=>v.st==='ready'||v.st==='update');
  $$('[data-offline-sum]').forEach(el=>{el.textContent=ready.length?'На устройстве: '+ready.length+' '+(ready.length%10===1&&ready.length!==11?'книга':ready.length%10>1&&ready.length%10<5&&(ready.length<10||ready.length>20)?'книги':'книг')+' · '+mb(ready.reduce((a,[,v])=>a+(v.bytes||0),0)):el.dataset.empty||'';});
  $$('[data-offline-clear]').forEach(el=>el.hidden=!ready.length);$$('.mylib').forEach(m=>m.hidden=ready.length>0);
  $$('[data-offline-all]').forEach(el=>{const n=$$('[data-offline]').filter(b=>(S[b.dataset.offline]||{st:'idle'}).st!=='ready').length;el.hidden=!n;});
  $$('.offline-status').forEach(n=>{const s=S[location.pathname.split('/').filter(Boolean).pop()];const ok=s&&(s.st==='ready'||s.st==='update');n.textContent=ok?'Книга сохранена на устройстве. Можно читать без сети.':'Книга не сохранена для чтения без сети: нажмите «Скачать» на её главной странице или на полке.';n.classList.toggle('ready',!!ok);});
 }
 async function refresh(slug){
  const name=(await caches.keys()).filter(k=>k.startsWith(NS+slug+'@')).sort().pop();
  if(!name){set(slug,{st:'idle'});return;}
  const m=await(await caches.open(name)).match(ROOT+slug+'/'+META);
  if(!m){set(slug,{st:'idle'});return;}
  const meta=await m.json();set(slug,{st:'ready',bytes:meta.bytes,v:meta.v});
  try{const r=await fetch(ROOT+slug+'/files.json',{cache:'no-store'});if(r.ok){const man=await r.json();if(man.v!==meta.v)set(slug,{st:'update'});}}catch{}
 }
 async function download(slug){
  if(S[slug]&&S[slug].st==='busy')return;set(slug,{st:'busy',p:0});
  try{
   const b=ROOT+slug+'/',man=await(await fetch(b+'files.json',{cache:'no-store'})).json();
   const name=NS+slug+'@'+man.v,old=(await caches.keys()).filter(k=>k.startsWith(NS+slug+'@')&&k!==name);
   const cache=await caches.open(name),q=man.files.slice();let done=0;
   const w=async()=>{for(let f;(f=q.shift());){const u=f[0]==='./'?b:b+f[0],r=await fetch(u,{cache:'reload'});if(!r.ok||r.redirected)throw Error(f[0]);await cache.put(u,r);done+=f[1];set(slug,{st:'busy',p:Math.min(.99,done/man.bytes)});}};
   await Promise.all([w(),w(),w(),w()]);
   await cache.put(b+META,new Response(JSON.stringify({v:man.v,bytes:man.bytes}),{headers:{'content-type':'application/json'}}));
   await Promise.all(old.map(k=>caches.delete(k)));
   if(navigator.storage&&navigator.storage.persist)navigator.storage.persist();
   set(slug,{st:'ready',p:1,bytes:man.bytes,v:man.v});
  }catch(e){await Promise.all((await caches.keys()).filter(k=>k.startsWith(NS+slug+'@')).map(async k=>{const c=await caches.open(k);if(!await c.match(ROOT+slug+'/'+META))await caches.delete(k);}));set(slug,{st:'error'});}
 }
 async function remove(slug){await Promise.all((await caches.keys()).filter(k=>k.startsWith(NS+slug+'@')).map(k=>caches.delete(k)));set(slug,{st:'idle',bytes:0});}
 const slugs=()=>$$('[data-offline]').map(b=>b.dataset.offline);
 document.addEventListener('click',async e=>{
  const o=e.target.closest('[data-offline]');
  if(o){e.preventDefault();const s=o.dataset.offline,st=(S[s]||{}).st;
   if(st==='ready'){if(confirm('Удалить книгу с устройства? Закладки и прогресс чтения сохранятся.'))remove(s);}
   else if(st!=='busy'){if(!('caches' in window)){toast('Браузер не поддерживает офлайн-режим.');return;}download(s);}
   return;}
  if(e.target.closest('[data-offline-all]')){e.preventDefault();for(const s of slugs())if((S[s]||{st:'idle'}).st!=='ready')await download(s);return;}
  if(e.target.closest('[data-offline-clear]')){e.preventDefault();if(confirm('Удалить все скачанные книги с устройства?'))for(const s of slugs())await remove(s);return;}
 });
 /* ---- установка приложения ---- */
 const dialog=document.querySelector('#install-dialog'),nativeButton=document.querySelector('#native-install');
 function steps_(){return steps();}
 function steps(){return ios?['Откройте страницу в Safari.','Нажмите «Поделиться».','Выберите «На экран Домой» и «Добавить».']:['Откройте меню браузера (⋮).','Выберите «Установить приложение» или «Добавить на главный экран».'];}
 function instructions(){
  const t=document.querySelector('#install-instructions');if(!t)return;t.replaceChildren();
  if(installEvent){const p=document.createElement('p');p.textContent='Нажмите «Установить» — браузер добавит приложение «VSplanet Книги» на устройство.';t.append(p);}
  else{const ol=document.createElement('ol');steps().forEach(x=>{const li=document.createElement('li');li.textContent=x;ol.append(li);});t.append(ol);}
  if(nativeButton)nativeButton.hidden=!installEvent;
 }
 async function install(){
  if(installEvent){const ev=installEvent;installEvent=null;try{await ev.prompt();const c=await ev.userChoice;if(c.outcome==='accepted'&&dialog&&dialog.open)dialog.close();}catch{}if(nativeButton)nativeButton.hidden=true;return;}
  const ib=document.querySelector('.ibanner');
  if(!dialog&&ib){const st=ib.querySelector('.ib-steps');if(st)st.hidden=false;ib.scrollIntoView({behavior:'smooth',block:'center'});return;}
  if(dialog){instructions();if(!dialog.open)dialog.showModal();}else toast('Установка: '+steps().join(' '));
 }
 const trig=()=>$$('.install-trigger');
 function triggers(){trig().forEach(b=>{b.hidden=standalone()||(b.hasAttribute('data-install-auto')&&!installEvent&&!ios);});}
 document.addEventListener('click',e=>{if(e.target.closest('.install-trigger')){e.preventDefault();install();}});
 if(nativeButton)nativeButton.addEventListener('click',install);
 const ic=document.querySelector('[data-install-close]');if(ic)ic.addEventListener('click',()=>dialog.close());
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvent=e;triggers();if(dialog&&dialog.open)instructions();});
 window.addEventListener('appinstalled',()=>{installEvent=null;trig().forEach(b=>{if(b.classList.contains('tb-fab')){b.hidden=true;return;}b.textContent='Приложение установлено';b.disabled=true;});document.querySelectorAll('.ibanner').forEach(n=>n.remove());if(dialog&&dialog.open)dialog.close();});
 triggers();
 /* ---- баннер «Установите приложение» (мобильные; не в установленном приложении) ---- */
 (()=>{
  const slot=document.querySelector('[data-install-banner]');if(!slot||standalone())return;
  const KEY='vs-install-banner-off';let off=0;try{off=+localStorage.getItem(KEY)||0;}catch{}
  if(off&&Date.now()-off<7*864e5)return;
  const ic=d=>`<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const share='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V4m-4 4 4-4 4 4M6 11H5v9h14v-9h-1"/></svg>';
  const items=[['<path d="M12 4v11m-4.5-4.5L12 15l4.5-4.5M5 20h14"/>','Без интернета','Скачайте книгу — и читайте в метро, самолёте и на даче'],
   ['<rect x="6.5" y="2.5" width="11" height="19" rx="3"/><path d="M10 18.5h4"/>','На весь экран','Без адресной строки — как обычное приложение'],
   ['<path d="M5 4h4v16H5zM11 4h4v16h-4z"/><path d="m16.5 6 3.5-1 2.5 14.5-3.5 1z"/>','Вся полка под рукой','Значок на экране — одно касание, и вы в библиотеке'],
   ['<path d="M20 12a8 8 0 1 1-2.5-5.8M20 4v5h-5"/>','Всегда свежее','Новые главы и книги подтягиваются сами']];
  const steps=ios?`<li>Откройте страницу в Safari.</li><li>Нажмите «Поделиться» ${share}</li><li>Выберите «На экран Домой» и нажмите «Добавить».</li>`:steps_().map(x=>`<li>${x}</li>`).join('');
  const n=document.createElement('aside');n.className='ibanner';n.setAttribute('role','region');n.setAttribute('aria-label','Установка приложения');
  n.innerHTML=`<button class="ib-x" type="button" aria-label="Скрыть баннер">×</button>
   <div class="ib-head"><img class="ib-ico" src="${ROOT}icons/app-192.png" width="58" height="58" alt=""><div><p class="ib-k">VSplanet Книги</p><h2 class="ib-t">Установите приложение — читать так удобнее всего</h2></div></div>
   <ul class="ib-list">${items.map(i=>`<li>${ic(i[0])}<b>${i[1]}</b><span>${i[2]}</span></li>`).join('')}</ul>
   <div class="ib-act"><button class="ib-go" type="button">${ios?'Как установить':'Установить'}</button><span class="ib-free">Бесплатно · без App Store и Google Play · 5 секунд</span></div>
   <ol class="ib-steps" hidden>${steps}</ol>`;
  slot.replaceWith(n);
  n.querySelector('.ib-x').addEventListener('click',()=>{try{localStorage.setItem(KEY,String(Date.now()));}catch{}n.remove();});
  n.querySelector('.ib-go').addEventListener('click',()=>{if(installEvent){install();return;}const st=n.querySelector('.ib-steps');st.hidden=!st.hidden;});
 })();
 /* ---- запуск ---- */
 if('serviceWorker' in navigator&&window.isSecureContext){
  const had=!!navigator.serviceWorker.controller;let shown=false;
  async function updated(){
   if(shown)return;shown=true;let v='';try{const r=await fetch(ROOT+'version.json',{cache:'no-store'});if(r.ok)v=(await r.json()).label||'';}catch{}
   const n=document.createElement('div');n.className='upd';n.setAttribute('role','status');
   n.innerHTML='<span>'+(v?'Вышла версия <b>'+v+'</b>':'Вышла новая версия приложения')+'</span><button type="button" class="upd-go">Обновить</button><button type="button" class="upd-x" aria-label="Позже">×</button>';
   document.body.append(n);n.querySelector('.upd-go').onclick=()=>location.reload();n.querySelector('.upd-x').onclick=()=>n.remove();
  }
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(had)updated();});
  navigator.serviceWorker.register(ROOT+'sw.js',{scope:ROOT,updateViaCache:'none'}).then(reg=>{
   const chk=()=>reg.update().catch(()=>{});
   document.addEventListener('visibilitychange',()=>{if(!document.hidden)chk();});setInterval(chk,30*60*1000);
  }).catch(()=>{});
 }
 if('caches' in window){const l=slugs();l.forEach(s=>S[s]={st:'idle'});const cur=location.pathname.split('/').filter(Boolean).pop();if(window.BOOK_CONFIG&&!l.includes(cur))S[cur]={st:'idle'};Object.keys(S).forEach(refresh);}
 render();
})();
