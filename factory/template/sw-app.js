/* VSplanet Книги — единый service worker. Оболочка (полка) кэшируется сразу,
   книги — по кнопке «Скачать» (страница сама кладёт файлы в offline-book-<slug>@<версия>). */
'use strict';
const SHELL_CACHE='offline-shell-%SHELL_V%';
const SHELL=%SHELL%;
const BOOKS='offline-book-';
const base=new URL('./',self.registration.scope);
self.addEventListener('install',e=>e.waitUntil((async()=>{
 const c=await caches.open(SHELL_CACHE);
 await Promise.all(SHELL.map(async p=>{const u=new URL(p,base);const r=await fetch(u,{cache:'reload'});if(!r.ok||r.redirected)throw Error('shell '+p);await c.put(u,r);}));
 await self.skipWaiting();
})()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{
 for(const k of await caches.keys())if(k.startsWith('offline-shell-')&&k!==SHELL_CACHE)await caches.delete(k);
 await self.clients.claim();
})()));
const OFFLINE_PAGE='<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>Нет сети</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#03060c;color:#f2f4f8;font:16px/1.5 system-ui,sans-serif;text-align:center;padding:24px"><div><h1 style="font-size:24px;margin:0 0 10px">Этой книги нет на устройстве</h1><p style="color:#8e98a8;margin:0 0 22px">Пока есть сеть, скачайте её кнопкой ↓ на полке или на странице книги.</p><a href="%ROOT%" style="color:#06101f;background:#7fa6d4;padding:11px 20px;border-radius:99px;text-decoration:none;font-weight:600">К полке</a></div>';
async function nav(req){
 try{
  const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),3000);
  try{return await fetch(req,{signal:ctl.signal});}finally{clearTimeout(t);}
 }catch{
  const u=new URL(req.url);u.search='';u.hash='';
  const hit=await caches.match(u.href);if(hit)return hit;
  if(u.pathname===base.pathname||u.pathname===base.pathname+'index.html')return await caches.match(base.href)||Response.error();
  return new Response(OFFLINE_PAGE.replace('%ROOT%',base.href),{status:200,headers:{'content-type':'text/html; charset=utf-8'}});
 }
}
self.addEventListener('fetch',e=>{
 const r=e.request;if(r.method!=='GET')return;
 const u=new URL(r.url);if(u.origin!==location.origin||!u.pathname.startsWith(base.pathname))return;
 if(/\/(sw\.js|files\.json|version\.json|manifest\.webmanifest)$/.test(u.pathname))return;      // всегда из сети
 if(r.mode==='navigate'){e.respondWith(nav(r));return;}
 e.respondWith((async()=>{const hit=await caches.match(r);return hit||fetch(r);})());
});
