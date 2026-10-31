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
