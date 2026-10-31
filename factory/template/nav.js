'use strict';
/* Нижняя панель навигации (мобильная): активная вкладка, «стеклянный» индикатор, скролл к разделам, жест «назад» в установленном приложении. */
(()=>{
 /* ---- отклик на касание: iOS включает :active только если на документе есть touchstart ---- */
 document.addEventListener('touchstart',()=>{},{passive:true});
 /* лёгкая вибрация (Android) и тактильный отклик «переключателя» (iOS 18+) */
 let hsw;const vib='vibrate' in navigator;
 function haptic(){try{if(vib){navigator.vibrate(9);return;}
  if(!hsw){hsw=document.createElement('label');hsw.setAttribute('aria-hidden','true');hsw.style.cssText='position:fixed;left:-99px;top:0;width:1px;height:1px;opacity:0;pointer-events:none';hsw.innerHTML='<input type="checkbox" switch tabindex="-1">';document.body.append(hsw);}hsw.click();}catch{}}
 document.addEventListener('click',e=>{if(e.pointerType!=='touch')return;const t=e.target.closest('a[href],button,summary,[role=button],.tb-tab,.tb-fab');
  if(!t||t.disabled||t.closest('.book-prose')||t.closest('[data-no-haptic]'))return;haptic();
  /* переход на другую страницу: сразу показать, что тап принят */
  const a=t.closest('a[href]');
  if(a&&!e.defaultPrevented&&a.target!=='_blank'&&!a.hasAttribute('download')){try{const u=new URL(a.href,location.href);
   if(u.origin===location.origin&&(u.pathname!==location.pathname||u.search!==location.search)){document.documentElement.classList.add('navigating');a.classList.add('is-pending');}}catch{}}
 },true);
 addEventListener('pageshow',()=>{document.documentElement.classList.remove('navigating');document.querySelectorAll('.is-pending').forEach(n=>n.classList.remove('is-pending'));});
 /* шторки: потянуть за заголовок вниз — закрыть (как в iOS) */
 (()=>{let d=null,y0=0,dy=0;
  document.addEventListener('touchstart',e=>{const h=e.target.closest('dialog[open] .dialog-heading');if(!h)return;if(innerWidth>720)return;d=h.closest('dialog');y0=e.touches[0].clientY;dy=0;d.classList.remove('settling');d.classList.add('is-dragging');},{passive:true});
  document.addEventListener('touchmove',e=>{if(!d)return;dy=Math.max(0,e.touches[0].clientY-y0);if(dy>6)d.style.transform='translateY('+dy+'px)';},{passive:true});
  document.addEventListener('touchend',()=>{if(!d)return;const x=d;d=null;x.classList.remove('is-dragging');
   if(dy>110){x.close();x.style.transform='';}else{x.classList.add('settling');x.style.transform='';setTimeout(()=>x.classList.remove('settling'),320);}},{passive:true});
 })();
 const bar=document.querySelector('[data-tabbar]');if(!bar)return;
 const $=(s,r=document)=>r.querySelector(s),pill=$('.tb-pill',bar),ind=$('.tb-ind',bar),tabs=[...bar.querySelectorAll('.tb-tab')];
 const target=t=>t.dataset.scroll?$(t.dataset.scroll):null;
 function mark(a){tabs.forEach(t=>t.setAttribute('aria-current',t===a?'true':'false'));if(!a||!pill.offsetWidth){ind.classList.remove('on');return;}ind.style.width=a.offsetWidth+'px';ind.style.transform='translateX('+a.offsetLeft+'px)';ind.classList.add('on');}
 const sc=tabs.filter(t=>t.dataset.scroll);let cur=null;
 function update(){
  if(!pill.offsetWidth)return;
  if(!sc.length){const f=tabs.find(t=>t.hasAttribute('data-cur'));if(f&&cur!==f){cur=f;mark(f);}return;}
  const land=$('#landing'),pg=$('#page');
  if((land&&land.hidden)&&(pg&&!pg.hidden)){mark(null);return;}
  let a=sc[0]||null;const line=innerHeight*.45;
  for(const t of sc){const e=target(t);if(e&&e.getBoundingClientRect().top<=line)a=t;}
  if(scrollY<60)a=sc[0]||a;
  if(innerHeight+scrollY>=document.documentElement.scrollHeight-4)a=sc[sc.length-1]||a;
  if(a!==cur||!ind.classList.contains('on')){cur=a;mark(a);}
 }
 let raf=0;const tick=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(update);};
 addEventListener('scroll',tick,{passive:true});addEventListener('resize',()=>{cur=null;tick();});addEventListener('hashchange',()=>{cur=null;setTimeout(update,60);});
 new MutationObserver(()=>{cur=null;tick();}).observe(document.body,{subtree:true,attributes:true,attributeFilter:['hidden']});
 document.fonts&&document.fonts.ready.then(()=>{cur=null;tick();});
 bar.addEventListener('click',e=>{
  const t=e.target.closest('.tb-tab,.tb-fab');if(!t||!bar.contains(t))return;
  if(t.dataset.click){const el=$(t.dataset.click);if(el){e.preventDefault();el.click();}return;}
  if(t.dataset.scroll){const el=target(t);e.preventDefault();
   const land=$('#landing');if(land&&land.hidden){location.hash='';setTimeout(()=>{const x=target(t);x&&x.scrollIntoView({behavior:'smooth'});},120);return;}
   if(t===sc[0])scrollTo({top:0,behavior:'smooth'});else if(el)el.scrollIntoView({behavior:'smooth'});}
 });
 /* жест «назад» от левого края — только в установленном приложении (в Safari/Chrome он есть у самого браузера) */
 const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 if(standalone){
  let sx=0,sy=0,on=false;
  addEventListener('touchstart',e=>{const t=e.touches[0];on=t.clientX<24;sx=t.clientX;sy=t.clientY;},{passive:true});
  addEventListener('touchend',e=>{if(!on)return;on=false;const t=e.changedTouches[0],dx=t.clientX-sx,dy=Math.abs(t.clientY-sy);
   if(dx>80&&dy<50){const r=$('#reader'),p=$('#page');if((r&&!r.hidden)||(p&&!p.hidden))location.hash='';else if($('#landing')&&!document.querySelector('dialog[open]'))location.href=bar.dataset.home||'../';}},{passive:true});
 }
 tick();
})();
/* iOS 27: сворачивание заголовка, сжатие нижней панели при прокрутке */
(()=>{
 const root=document.documentElement;
 const nb=document.querySelector('[data-navbar]'),bar=document.querySelector('[data-tabbar]'),lt=document.querySelector('[data-ltitle]');
 if(nb&&lt&&'IntersectionObserver' in window){new IntersectionObserver(([e])=>nb.classList.toggle('on',!e.isIntersecting),{rootMargin:'-56px 0px 0px 0px'}).observe(lt);}
 else if(nb)nb.classList.add('on');
 if(!bar)return;
 let y=scrollY,min=document.body.classList.contains('q-body'),acc=0;
 const set=m=>{if(m===min&&bar.classList.contains('is-min')===m)return;min=m;bar.classList.toggle('is-min',m);clearTimeout(set.t);set.t=setTimeout(()=>dispatchEvent(new Event('resize')),480);};
 if(min)set(true);
 addEventListener('scroll',()=>{const n=scrollY,d=n-y;y=n;if(document.body.classList.contains('q-body'))return;
  if(n<40){set(false);acc=0;return;}
  acc=Math.sign(d)===Math.sign(acc)?acc+d:d;
  if(acc>28)set(true);else if(acc<-18)set(false);},{passive:true});
 bar.addEventListener('pointerdown',()=>{if(bar.classList.contains('is-min')&&!document.body.classList.contains('q-body'))set(false);},{passive:true});
 if(document.body.classList.contains('q-body'))bar.addEventListener('click',e=>{if(bar.classList.contains('is-min')&&!e.target.closest('.tb-tab,.tb-fab')){}},{passive:true});
})();
/* заставка при запуске установленного приложения: знак на тёмном фоне, один раз за сеанс */
(()=>{
 const sa=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;if(!sa)return;
 try{if(sessionStorage.getItem('vs-splash'))return;sessionStorage.setItem('vs-splash','1')}catch(e){}
 const SH='M-28 74L68 -22L351 -22L447 74L209.5 311.5Z',LT=['M77.5 0L134.069 0L60.5685 73.5L164.5 177.431L164.5 0L204.5 0L204.5 274L4 73.5Z','M214.5 0L343.8 0L416.5 72.7L388.216 100.984L327.231 40L270.82 40L359.66 128.84L214.5 274L214.5 103.27L254.5 103.27L254.5 177.431L303.091 128.84L214.5 40.2485Z'];
 const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches,d=document.createElement('div');d.setAttribute('aria-hidden','true');
 d.style.cssText='position:fixed;inset:0;z-index:9999;display:grid;place-items:center;background:radial-gradient(60% 40% at 50% 45%,#05246acc,#03060c 70%) #03060c;transition:opacity .45s ease;pointer-events:none';
 const N='http://www.w3.org/2000/svg';d.innerHTML='<svg xmlns="'+N+'" viewBox="-46 -35 512 366" style="width:min(62vw,340px);height:auto;overflow:visible"><defs><linearGradient id="sp-g" gradientUnits="userSpaceOnUse" x1="-40" y1="-30" x2="460" y2="330"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#a2dcff"/><stop offset="1" stop-color="#4699d5"/></linearGradient><linearGradient id="sp-l" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="130" y2="274"><stop offset="0" stop-color="#A2DCFF"/><stop offset=".45" stop-color="#4699D5"/><stop offset="1" stop-color="#266AA6"/></linearGradient></defs><path id="sp-s" d="'+SH+'" fill="#052464" fill-opacity="0" stroke="url(#sp-g)" stroke-width="9" stroke-linejoin="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>'+LT.map(p=>'<path class="sp-t" d="'+p+'" fill="url(#sp-l)" opacity="0"/>').join('')+'</svg>';
 document.documentElement.append(d);
 const sh=d.querySelector('#sp-s'),ls=[...d.querySelectorAll('.sp-t')],E='cubic-bezier(.3,.7,.2,1)';
 if(reduce){sh.style.strokeDashoffset=0;sh.style.fillOpacity=1;ls.forEach(l=>l.style.opacity=1);}
 else if(sh.animate){sh.animate([{strokeDashoffset:1},{strokeDashoffset:0}],{duration:800,easing:E,fill:'forwards'});
  sh.animate([{fillOpacity:0},{fillOpacity:1}],{duration:350,delay:650,fill:'forwards'});
  sh.animate([{stroke:'url(#sp-g)'},{stroke:'#68a0d9'}],{duration:350,delay:1000,fill:'forwards'});
  ls.forEach((l,i)=>l.animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'none'}],{duration:450,delay:900+i*120,easing:E,fill:'forwards'}));}
 else{sh.style.strokeDashoffset=0;sh.style.fillOpacity=1;ls.forEach(l=>l.style.opacity=1);}
 setTimeout(()=>{d.style.opacity='0';setTimeout(()=>d.remove(),500)},reduce?350:1750);
})();
