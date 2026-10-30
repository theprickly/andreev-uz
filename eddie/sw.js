/* Versioned, atomic offline copy. Only same-origin book files are cached. */
'use strict';
const CACHE='eddie-book-vsplanet-a325aae33597';
const ASSETS=["./", "index.html", "book.json", "assets/cover.png", "assets/fonts/golos-text.ttf", "assets/fonts/literata.ttf", "assets/images/22315aa492bfcb2b.jpg", "assets/images/84df5a3900e55789.jpg", "assets/images/af37d9b3d5f25dea.jpg", "assets/images/db63022d4d1722c8.jpg", "assets/images/f0acbf7bbfb3a3e8.jpg", "assets/title-logo.png", "assets/book.epub", "assets/book-render-v4.png", "assets/vsplanet-logo.png", "assets/icons/vs-icon-192.png", "assets/icons/vs-icon-512.png", "assets/icons/vs-icon-maskable-512.png", "assets/icons/vs-apple-touch-icon.png", "book-illustrated-a477de166ee3.json", "assets/book-illustrated-2bbc1cfedb2d.epub", "assets/images/original-page-011.jpg", "assets/images/original-page-015.jpg", "assets/images/original-page-018.jpg", "assets/images/original-page-027.jpg", "assets/images/original-page-028.jpg", "assets/images/original-page-031.jpg", "assets/images/original-page-049.jpg", "assets/images/original-page-059.jpg", "assets/images/original-page-061.jpg", "assets/images/original-page-065.jpg", "assets/images/original-page-070.jpg", "assets/images/original-page-075.jpg", "assets/images/original-page-076.jpg", "assets/images/original-page-077.jpg", "assets/images/original-page-097.jpg", "assets/images/original-page-103.jpg", "assets/images/original-page-111.jpg", "assets/images/original-page-250.jpg", "assets/images/original-page-285.jpg", "assets/images/original-page-286.jpg", "assets/images/original-page-288.jpg", "assets/images/original-page-292.jpg", "assets/images/original-page-294.jpg", "assets/images/original-page-304.jpg", "assets/images/original-page-312.jpg", "assets/images/original-page-313.jpg", "assets/images/original-page-314.jpg", "assets/images/original-page-318.jpg", "assets/images/original-page-346.jpg", "assets/images/original-page-347.jpg", "assets/images/original-page-348.jpg", "assets/images/original-page-350.jpg", "assets/images/original-page-351.jpg", "assets/images/original-page-352.jpg", "style-8560e051a086.css", "app-fef5fcf4b430.js", "pwa-f8f568b00d19.js", "manifest-88f210435c52.webmanifest"];
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
 for(const key of await caches.keys())if(key.startsWith('eddie-book-')&&key!==CACHE)await caches.delete(key);
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
