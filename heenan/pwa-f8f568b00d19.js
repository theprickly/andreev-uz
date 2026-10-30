'use strict';
(() => {
 let installEvent=null,offlineReady=false;
 const buttons=[...document.querySelectorAll('.install-trigger')];
 const dialog=document.querySelector('#install-dialog');
 const nativeButton=document.querySelector('#native-install');
 setTimeout(()=>{if(!offlineReady)status('Офлайн-копия ещё не готова. Дождитесь загрузки; во встроенном просмотре откройте сайт в обычном браузере.');},15000);
 function status(text,ready=false){document.querySelectorAll('.offline-status').forEach(n=>{n.textContent=text;n.classList.toggle('ready',ready);});}
 function installed(){return window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;}
 function updateButtons(){buttons.forEach(b=>b.hidden=installed());}
 function instructions(){
  const ios=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const safari=/Safari/.test(navigator.userAgent)&&!/Chrome|Chromium|Edg|OPR/.test(navigator.userAgent);
  const target=document.querySelector('#install-instructions');
  const steps=ios?['Откройте эту страницу в браузере, если сейчас она открыта внутри другого приложения.','Нажмите «Поделиться» в меню браузера.','Выберите «На экран Домой», затем «Добавить».']:safari?['Откройте сайт в Safari.','В меню «Файл» выберите «Добавить в Dock».','Подтвердите добавление книги.']:['Откройте сайт в Chrome или Edge.','В меню браузера найдите «Установить приложение» или «Добавить на главный экран».','Подтвердите установку. Если такого пункта нет, откройте сайт в обычном браузере, а не во встроенном просмотре.'];
  target.replaceChildren();
  if(installEvent){const p=document.createElement('p');p.textContent='Нажмите «Установить» — браузер предложит добавить книгу на устройство.';target.append(p);}
  else{const ol=document.createElement('ol');steps.forEach(text=>{const li=document.createElement('li');li.textContent=text;ol.append(li);});target.append(ol);}
  nativeButton.hidden=!installEvent;
 }
 async function install(){
  if(!installEvent){instructions();if(!dialog.open)dialog.showModal();return;}
  const event=installEvent;installEvent=null;
  try{await event.prompt();const choice=await event.userChoice;if(choice.outcome==='accepted'&&dialog.open)dialog.close();}
  catch{instructions();if(!dialog.open)dialog.showModal();}
  nativeButton.hidden=true;
 }
 buttons.forEach(b=>b.addEventListener('click',()=>{instructions();if(!dialog.open)dialog.showModal();}));
 nativeButton.addEventListener('click',install);
 document.querySelector('[data-install-close]').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvent=e;if(dialog.open)instructions();});
 window.addEventListener('appinstalled',()=>{installEvent=null;buttons.forEach(b=>{b.textContent='Приложение установлено';b.disabled=true;});if(dialog.open)dialog.close();});
 updateButtons();
 async function checkOffline(registration){
  const worker=registration.active;if(!worker)return;
  const channel=new MessageChannel();
  channel.port1.onmessage=e=>{if(e.data?.type==='OFFLINE_STATUS'&&e.data.ready){offlineReady=true;status('Вся книга сохранена на устройстве. Можно читать без сети.',true);}};
  worker.postMessage({type:'OFFLINE_STATUS'},[channel.port2]);
 }
 if('serviceWorker' in navigator&&window.isSecureContext){
  navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).then(async reg=>{
   const ready=await navigator.serviceWorker.ready;await checkOffline(ready);
   reg.addEventListener('updatefound',()=>{const worker=reg.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='activated')checkOffline(reg);});});
   navigator.serviceWorker.addEventListener('controllerchange',()=>checkOffline(reg));
  }).catch(()=>status('Офлайн-копия пока недоступна. Для чтения нужно подключение к сети.'));
 }else status('Для чтения без сети откройте сайт по HTTPS в обычном браузере.');
 window.addEventListener('offline',()=>{if(!offlineReady)status('Нет сети. Если книга ещё не сохранена, подключитесь и откройте сайт снова.');});
})();
