'use strict';
/* Нижняя панель навигации (мобильная): активная вкладка, «стеклянный» индикатор, скролл к разделам, жест «назад» в установленном приложении. */
(()=>{
 const bar=document.querySelector('[data-tabbar]');if(!bar)return;
 const $=(s,r=document)=>r.querySelector(s),pill=$('.tb-pill',bar),ind=$('.tb-ind',bar),tabs=[...bar.querySelectorAll('.tb-tab')];
 const target=t=>t.dataset.scroll?$(t.dataset.scroll):null;
 function mark(a){tabs.forEach(t=>t.setAttribute('aria-current',t===a?'true':'false'));if(!a||!pill.offsetWidth){ind.classList.remove('on');return;}ind.style.width=a.offsetWidth+'px';ind.style.transform='translateX('+a.offsetLeft+'px)';ind.classList.add('on');}
 const sc=tabs.filter(t=>t.dataset.scroll);let cur=null;
 function update(){
  if(!pill.offsetWidth)return;
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
