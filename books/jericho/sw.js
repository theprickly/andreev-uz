/* Versioned, atomic offline copy. Only same-origin book files are cached. */
'use strict';
const CACHE='book-jericho-54306a7d673e';
const ASSETS=["./", "index.html", "book.json", "book-bd79ebcdea19.json", "assets/book-ef8e97556be3.epub", "style-22a24eeada28.css", "app-5961e069a494.js", "pwa-82be9cff5451.js", "manifest-91e8480e7f6c.webmanifest", "assets/fonts/geologica-cyr.woff2", "assets/fonts/geologica-lat.woff2", "assets/fonts/literata-cyrillic-italic.woff2", "assets/fonts/literata-cyrillic-normal.woff2", "assets/fonts/literata-latin-italic.woff2", "assets/fonts/literata-latin-normal.woff2", "assets/icons/cover-apple-touch.png", "assets/icons/cover-favicon-32.png", "assets/icons/cover-icon-192.png", "assets/icons/cover-icon-512.png", "assets/icons/cover-icon-maskable-512.png", "assets/cover.jpg", "assets/book-render.webp", "assets/vsplanet-logo.png"];
self.addEventListener('install',event=>{event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 try{
  await Promise.all(ASSETS.map(async path=>{
   const url=new URL(path,self.registration.scope);const response=await fetch(new Request(url,{cache:'reload',credentials:'same-origin'}));
   if(!response.ok||response.type==='opaque'||response.redirected)throw Error('Offline asset unavailable: '+path);
   const type=response.headers.get('content-type')||'';
   if(path==='book.json'&&!type.includes('json'))throw Error('Book response is not JSON');
   await cache.put(url,response);
  }));
 }catch(error){await caches.delete(CACHE);throw error;}
 await self.skipWaiting();
})());});
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const key of await caches.keys())if(key.startsWith('book-jericho-')&&key!==CACHE)await caches.delete(key);
 await self.clients.claim();
})()));
self.addEventListener('message',event=>{
 if(event.data?.type==='OFFLINE_STATUS')event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);const ready=!!(await cache.match(new URL('book.json',self.registration.scope)))&&!!(await cache.match(new URL('index.html',self.registration.scope)));
  event.ports[0]?.postMessage({type:'OFFLINE_STATUS',ready});
 })());
});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url);if(url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;
 const known=new Set(ASSETS.map(p=>new URL(p,self.registration.scope).href));
 if(event.request.mode==='navigate'){
  event.respondWith((async()=>{
   try{const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),2500);try{return await fetch(event.request,{signal:controller.signal});}finally{clearTimeout(timeout);}}
   catch{const cache=await caches.open(CACHE);return await cache.match(new URL('index.html',self.registration.scope))||Response.error();}
  })());return;
 }
 const assetUrl=new URL(url);assetUrl.search='';
 if(known.has(assetUrl.href))event.respondWith((async()=>{const cache=await caches.open(CACHE);return await cache.match(assetUrl.href)||fetch(event.request);})());
});
