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
  $$('[data-offline-clear]').forEach(el=>el.hidden=!ready.length);
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
 function steps(){return ios?['Откройте страницу в Safari.','Нажмите «Поделиться».','Выберите «На экран Домой» и «Добавить».']:['Откройте меню браузера (⋮).','Выберите «Установить приложение» или «Добавить на главный экран».'];}
 function instructions(){
  const t=document.querySelector('#install-instructions');if(!t)return;t.replaceChildren();
  if(installEvent){const p=document.createElement('p');p.textContent='Нажмите «Установить» — браузер добавит приложение «VSplanet Книги» на устройство.';t.append(p);}
  else{const ol=document.createElement('ol');steps().forEach(x=>{const li=document.createElement('li');li.textContent=x;ol.append(li);});t.append(ol);}
  if(nativeButton)nativeButton.hidden=!installEvent;
 }
 async function install(){
  if(installEvent){const ev=installEvent;installEvent=null;try{await ev.prompt();const c=await ev.userChoice;if(c.outcome==='accepted'&&dialog&&dialog.open)dialog.close();}catch{}if(nativeButton)nativeButton.hidden=true;return;}
  if(dialog){instructions();if(!dialog.open)dialog.showModal();}else toast('Установка: '+steps().join(' '));
 }
 const trig=()=>$$('.install-trigger');
 function triggers(){trig().forEach(b=>{b.hidden=standalone()||(b.hasAttribute('data-install-auto')&&!installEvent&&!ios);});}
 document.addEventListener('click',e=>{if(e.target.closest('.install-trigger')){e.preventDefault();install();}});
 if(nativeButton)nativeButton.addEventListener('click',install);
 const ic=document.querySelector('[data-install-close]');if(ic)ic.addEventListener('click',()=>dialog.close());
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvent=e;triggers();if(dialog&&dialog.open)instructions();});
 window.addEventListener('appinstalled',()=>{installEvent=null;trig().forEach(b=>{b.textContent='Приложение установлено';b.disabled=true;});if(dialog&&dialog.open)dialog.close();});
 triggers();
 /* ---- запуск ---- */
 if('serviceWorker' in navigator&&window.isSecureContext)navigator.serviceWorker.register(ROOT+'sw.js',{scope:ROOT,updateViaCache:'none'}).catch(()=>{});
 if('caches' in window){const l=slugs();l.forEach(s=>S[s]={st:'idle'});const cur=location.pathname.split('/').filter(Boolean).pop();if(!l.includes(cur)&&location.pathname.split('/').filter(Boolean).length>1)S[cur]={st:'idle'};Object.keys(S).forEach(refresh);}
 render();
})();
