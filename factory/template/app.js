'use strict';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const CFG=window.BOOK_CONFIG||{};
const KEY=CFG.storageKey, BOOK=CFG.id, TITLE=CFG.title, CREDIT=CFG.credit;
let N=Infinity,NUMBERED=0;
const SMALL=typeof matchMedia==='function'&&matchMedia('(max-width: 600px)').matches;
const DEFAULT={font:'serif',size:SMALL?18:20,line:SMALL?1.7:1.75,width:680,theme:'night'};
let book,chapters=[],searchIndex=[],snippets=[],active=-1,blocks=[],restoring=false,focused=false,timer,toastTimer,searchTimer,allShown=false;
let storageAvailable=true;
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const cleanNumber=(n,a,b,fallback)=>Number.isFinite(Number(n))?clamp(Number(n),a,b):fallback;
const validChapter=n=>Number.isInteger(n)&&n>=0&&n<N;
function settingsOf(s={}){return {font:['serif','sans','mono'].includes(s.font)?s.font:DEFAULT.font,size:cleanNumber(s.size,16,30,DEFAULT.size),line:cleanNumber(s.line,1.5,2.2,DEFAULT.line),width:[560,680,820].includes(Number(s.width))?Number(s.width):680,theme:['night','graphite','warm'].includes(s.theme)?s.theme:'night'};}
function positionOf(p){if(!p||!validChapter(p.chapter))return null;return {chapter:p.chapter,paragraph:Math.floor(cleanNumber(p.paragraph,0,10000,0)),offset:cleanNumber(p.offset,-2,1,0),fraction:cleanNumber(p.fraction,0,1,0)};}
function validateState(raw){
 if(!raw||typeof raw!=='object'||(raw.book&&raw.book!==BOOK))throw Error('Этот файл относится к другой книге');
 const positions={};for(const [k,v] of Object.entries(raw.positions||{})){const p=positionOf(v);if(p&&String(p.chapter)===k)positions[k]=p;}
 const bookmarks=Array.isArray(raw.bookmarks)?raw.bookmarks.slice(0,500).map((b,i)=>{const p=positionOf(b);return p?{...p,id:String(b.id||i).slice(0,80),excerpt:String(b.excerpt||'Закладка').slice(0,220),created:String(b.created||'').slice(0,40)}:null}).filter(Boolean):[];
 const started=typeof raw.started==='string'&&!isNaN(Date.parse(raw.started))?raw.started:new Date().toISOString();
 return {version:1,book:BOOK,started,settings:settingsOf(raw.settings),current:positionOf(raw.current),positions,bookmarks};
}
let state;
try{const stored=localStorage.getItem(KEY);state=validateState(stored?JSON.parse(stored):{});}catch{state=validateState({});}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch{storageAvailable=false;$('#save-status').textContent='Сохранение недоступно — экспортируйте прогресс';}}
function notify(text){const t=$('#toast');t.textContent=text;t.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('visible'),3500);}
function escapeText(s){const n=document.createElement('span');n.textContent=s;return n.innerHTML;}
function normalized(s){return s.toLocaleLowerCase('ru').replace(/ё/g,'е');}
function mins(c){return Math.max(1,Math.ceil(c.words/200));}
function parseChapter(c){const template=document.createElement('template');template.innerHTML=c.html;return template.content;}
function applySettings(){
 const s=state.settings,r=document.documentElement;
 r.style.setProperty('--font',{serif:"Literata,Georgia,serif",sans:"Geologica,-apple-system,BlinkMacSystemFont,system-ui,sans-serif",mono:"Menlo,Consolas,monospace"}[s.font]);
 r.style.setProperty('--size',s.size+'px');r.style.setProperty('--leading',s.line);r.style.setProperty('--measure',s.width+'px');
 document.body.classList.remove('theme-night','theme-graphite','theme-warm');document.body.classList.add('theme-'+s.theme);
 $('#font-setting').value=s.font;$('#size-setting').value=s.size;$('#line-setting').value=s.line;$('#width-setting').value=s.width;
 $('#size-output').value=s.size+' px';$('#line-output').value=Number(s.line).toFixed(2);
 $$('[data-theme]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.theme===s.theme)));
}
function applyAndKeepPosition(){const p=active>=0?capturePosition():null;applySettings();persist();if(p)requestAnimationFrame(()=>restorePosition(p));}
function chapterNum(i){const m=chapters[i]?.title.match(/^Глава\s+(\d+)/i);return m?+m[1]:0;}
function chapterMark(i){const n=chapterNum(i);return n?String(n).padStart(2,'0'):(chapters[i]?.title||'·').trim()[0].toUpperCase();}
function tocHTML(c,i){return '<span>'+chapterMark(i)+'</span><b>'+escapeText(c.title)+'</b><small>'+escapeText(snippets[i]||'')+'</small>';}
function buildLanding(){
 const words=chapters.reduce((s,c)=>s+c.words,0),hours=$('#stat-hours'),photos=$('#stat-photos');
 if(hours)hours.textContent='≈\u202f'+Math.round(words/200/60);
 if(photos)photos.textContent=chapters.reduce((s,c)=>s+(c.html.match(/<img/g)||[]).length,0);
 const card=$('#match-card');if(!card)return updateResume();
 card.replaceChildren();
 chapters.forEach((c,i)=>{
  const b=document.createElement('button');b.className='match'+(chapterNum(i)?'':' special');b.dataset.chapter=i;b.setAttribute('role','listitem');
  b.innerHTML='<b>'+chapterMark(i)+'</b>';
  b.setAttribute('aria-label',c.title+'. '+(snippets[i]||''));
  const show=()=>{const t=$('#match-ticker');if(t)t.innerHTML='<b>'+escapeText(c.title)+'</b> — '+escapeText(snippets[i]||'');};
  b.addEventListener('mouseenter',show);b.addEventListener('focus',show);
  b.addEventListener('click',()=>{const p=state.positions[String(i)];if(p)pendingPosition=p;goChapter(i);});
  card.append(b);
 });
 updateResume();
}
function updateMatchCard(){
 $$('.match').forEach(b=>{const i=Number(b.dataset.chapter),p=state.positions[String(i)],f=p?p.fraction:0;
  b.style.setProperty('--p',f.toFixed(3));b.classList.toggle('started',!!p&&f>0.02);b.classList.toggle('done',!!p&&f>0.95);b.classList.toggle('current',state.current?.chapter===i);});
}
function updateResume(){
 const p=state.current;
 $$('.continue-label').forEach(n=>n.textContent=p?'Продолжить чтение':'Читать книгу');
 const preview=$('#resume-preview');
 if(preview){preview.hidden=!p;if(p)preview.innerHTML='Вы остановились: <b>'+escapeText(chapters[p.chapter].title)+'</b> · '+Math.round(p.fraction*100)+'% главы';}
 updateMatchCard();
}
function buildSidebar(){
 const filter=normalized($('#toc-filter').value.trim()),nav=$('#sidebar-list');nav.replaceChildren();
 chapters.forEach((c,i)=>{
  if(filter&&!normalized(c.title+' '+(snippets[i]||'')).includes(filter))return;
  const b=document.createElement('button');b.className='toc-item'+(i===active?' active':'');b.dataset.chapter=i;b.innerHTML=tocHTML(c,i);
  if(i===active)b.setAttribute('aria-current','page');b.addEventListener('click',()=>goChapter(i));nav.append(b);
 });
 if(!nav.children.length){const p=document.createElement('p');p.className='empty-state';p.textContent='Такой главы нет';nav.append(p);}
}
function goChapter(i,paragraph=null){
 if(!validChapter(i))return;
 if(active>=0&&!restoring)savePosition();
 if($('#library-dialog').open)$('#library-dialog').close();
 const hash='#read/'+i;
 if(location.hash===hash){if(paragraph!==null)restorePosition({chapter:i,paragraph,offset:0,fraction:0});return;}
 pendingPosition=paragraph!==null?{chapter:i,paragraph,offset:0,fraction:0}:null;
 location.hash=hash;
}
let pendingPosition=null;
function showChapter(i){
 active=i;restoring=true;
 $('#landing').hidden=true;$('#page').hidden=true;$('#reader').hidden=false;
 const c=chapters[i];document.title=c.title+' — '+TITLE+' · VSplanet Книги';
 $('#chapter-title').textContent=c.title;$('#header-chapter').textContent=c.title;
 const num=chapterNum(i),firstNum=chapters.findIndex((_,k)=>chapterNum(k));$('#chapter-category').textContent=num?num+' из '+NUMBERED:i<firstNum?'Перед первой главой':'После последней главы';
  $('#reader').classList.toggle('is-extra',!num);document.body.classList.remove('bars-hidden');window.__quietBars=Date.now()+900;
 $('#reading-time').textContent='≈\u202f'+mins(c)+' мин чтения';
 $('#article').replaceChildren(parseChapter(c));
 blocks=$$('#article > p, #article > h2, #article > h3, #article > blockquote, #article > figure');
 if(!blocks.length)blocks=$$('#article > *');
 blocks.forEach((n,j)=>n.id='paragraph-'+j);
 $('#previous-chapter').disabled=i===0;$('#previous-label').textContent=i?chapters[i-1].title:'';
 $('#next-chapter').hidden=i===chapters.length-1;$('#next-label').textContent=i<chapters.length-1?chapters[i+1].title:'';$('#end-note').hidden=i!==chapters.length-1;if(i===chapters.length-1)fillFinale();
 buildSidebar();
 const position=pendingPosition||state.positions[String(i)]||{chapter:i,paragraph:0,offset:-1,fraction:0};pendingPosition=null;
 requestAnimationFrame(()=>requestAnimationFrame(()=>{restorePosition(position);restoring=false;savePosition();}));
 // Image dimensions may settle after the first layout. Restore once after they finish.
 const imgs=$$('#article img').filter(im=>!im.complete);
 if(imgs.length){const beforeScroll=window.scrollY;Promise.all(imgs.map(im=>new Promise(resolve=>{im.onload=resolve;im.onerror=resolve;}))).then(()=>{if(active===i&&Math.abs(window.scrollY-beforeScroll)<120)restorePosition(state.current||position);});}
 $('#reading-main').focus({preventScroll:true});
}
function capturePosition(){
 const threshold=focused?35:145;let index=0;
 for(let i=0;i<blocks.length;i++){if(blocks[i].getBoundingClientRect().top<=threshold)index=i;else break;}
 const block=blocks[index],rect=block?.getBoundingClientRect();
 const article=$('#article'),range=Math.max(1,article.scrollHeight-window.innerHeight+200);
 const fraction=clamp((window.scrollY-article.offsetTop+145)/range,0,1);
 return {chapter:active,paragraph:index,offset:rect?clamp((threshold-rect.top)/Math.max(rect.height,1),-2,1):0,fraction};
}
function restorePosition(p){
 if(p.paragraph===0&&(p.offset||0)<=0){window.scrollTo({top:0,behavior:'instant'});return;}
 const b=blocks[Math.min(p.paragraph,blocks.length-1)];if(!b)return;
 const y=b.getBoundingClientRect().top+window.scrollY+(p.offset||0)*b.getBoundingClientRect().height-(focused?35:145);
 window.scrollTo({top:Math.max(0,y),behavior:'instant'});
}
function savePosition(){
 if(active<0||restoring||$('#reader').hidden)return;
 const p=capturePosition();state.current=p;state.positions[String(active)]=p;persist();updateProgress(p);updateResume();
 if(storageAvailable)$('#save-status').textContent='✓ Место чтения сохранено';
}
function updateProgress(p){
 const total=chapters.reduce((s,c)=>s+c.words,0),before=chapters.slice(0,p.chapter).reduce((s,c)=>s+c.words,0);
 const pct=Math.round((before+chapters[p.chapter].words*p.fraction)/total*100);
 $('#book-percent').textContent=pct+'%';$('#sidebar-progress').style.width=pct+'%';$('#top-progress').style.width=pct+'%';$('#chapter-progress').textContent=Math.round(p.fraction*100)+'% главы';
 const exists=state.bookmarks.some(b=>b.chapter===p.chapter&&b.paragraph===p.paragraph);
 $('#add-bookmark').setAttribute('aria-pressed',String(exists));
}
function route(){
 const match=location.hash.match(/^#read\/(\d+)$/);
 if(match&&validChapter(Number(match[1]))){$('#page').hidden=true;showChapter(Number(match[1]));return;}
 const pg=location.hash.match(/^#(letter|album|about)$/);
 if(pg){if(active>=0)savePosition();active=-1;showPage(pg[1]);return;}
 $('#page').hidden=true;
 if(active>=0)savePosition();active=-1;
 $('#reader').hidden=true;$('#landing').hidden=false;document.body.classList.remove('focus-mode');focused=false;$('#exit-focus').hidden=true;
 document.title=CFG.pageTitle;updateResume();
 if(location.hash==='#chapters')openLibrary('contents');
 if(location.hash==='#formats')requestAnimationFrame(()=>$('#formats').scrollIntoView({behavior:'smooth'}));else window.scrollTo({top:0,behavior:'instant'});
}
function openLibrary(tab){if(!$('#library-dialog').open)$('#library-dialog').showModal();renderLibrary(tab);}
function renderLibrary(tab){
 $$('.dialog-tabs [data-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===tab)));
 $('#bookmark-count').textContent=state.bookmarks.length;
 const target=$('#library-content');target.replaceChildren();
 if(tab==='contents'){
  const list=document.createElement('div');list.className='library-chapters';
  chapters.forEach((c,i)=>{const b=document.createElement('button');b.className='toc-item'+(i===active?' active':'');b.innerHTML=tocHTML(c,i);b.addEventListener('click',()=>goChapter(i));list.append(b);});target.append(list);
 }else if(tab==='bookmarks'){
  if(!state.bookmarks.length){target.innerHTML='<p class="empty-state">Здесь будут ваши закладки.<br>Нажмите на значок закладки во время чтения — сохраним текущий абзац.</p>';return;}
  state.bookmarks.slice().reverse().forEach(b=>{
   const row=document.createElement('div');row.className='bookmark-row';
   const link=document.createElement('button');link.className='search-result';link.innerHTML='<b>'+escapeText(chapters[b.chapter].title)+'</b><p>'+escapeText(b.excerpt)+'</p>';
   link.addEventListener('click',()=>jumpTo(b));
   const del=document.createElement('button');del.className='delete-bookmark';del.textContent='×';del.setAttribute('aria-label','Удалить закладку: '+chapters[b.chapter].title);
   del.addEventListener('click',()=>{state.bookmarks=state.bookmarks.filter(x=>x.id!==b.id);persist();renderLibrary('bookmarks');if(active>=0)updateProgress(capturePosition());});row.append(link,del);target.append(row);
  });
 }else{
  const input=document.createElement('input');input.type='search';input.placeholder='Слово, имя или фраза…';input.className='search-input';input.setAttribute('aria-label','Поиск по всему тексту книги');input.id='book-search';
  const results=document.createElement('div');results.id='search-results';results.innerHTML='<p class="search-caption">Поиск по всем '+N+' разделам — введите хотя бы две буквы</p>';results.setAttribute('aria-live','polite');target.append(input,results);
  input.addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>searchBook(input.value,results),180);});input.focus();
 }
}
function searchBook(query,target){
 target.replaceChildren();const q=normalized(query.trim());if(q.length<2){target.innerHTML='<p class="search-caption">Введите хотя бы две буквы.</p>';return;}
 const found=[];let count=0;
 searchIndex.forEach((section,i)=>section.paragraphs.forEach(p=>{const at=p.normalized.indexOf(q);if(at>=0){count++;if(found.length<60)found.push({chapter:i,paragraph:p.paragraph,text:p.text,at});}}));
 const label=document.createElement('p');label.className='search-caption';label.textContent=count?('Найдено абзацев: '+count+(count>60?'. Показаны первые 60.':'')):'Ничего не найдено. Попробуйте другое слово или более короткую фразу.';target.append(label);
 found.forEach(f=>{const b=document.createElement('button');b.className='search-result';const start=Math.max(0,f.at-60),end=Math.min(f.text.length,f.at+q.length+100),snippet=(start?'…':'')+f.text.slice(start,end)+(end<f.text.length?'…':'');b.innerHTML='<b>'+escapeText(chapters[f.chapter].title)+'</b><p>'+escapeText(snippet)+'</p>';b.addEventListener('click',()=>jumpTo({...f,offset:0,fraction:0},query.trim()));target.append(b);});
}
function jumpTo(p,query=''){
 if(active>=0&&!restoring)savePosition();
 $('#library-dialog').close();
 if(active===p.chapter){restorePosition(p);savePosition();highlightBlock(p.paragraph,query);}
 else{pendingPosition=p;location.hash='#read/'+p.chapter;setTimeout(()=>{if(active===p.chapter)highlightBlock(p.paragraph,query);},120);}
}
function highlightBlock(index,query){
 const b=blocks[Math.min(index,blocks.length-1)];if(!b)return;
 b.classList.remove('jump-highlight');void b.offsetWidth;b.classList.add('jump-highlight');
 if(!query)return;
 const walker=document.createTreeWalker(b,NodeFilter.SHOW_TEXT),nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
 const q=normalized(query);
 nodes.forEach(node=>{const text=node.textContent,at=normalized(text).indexOf(q);if(at<0)return;const fragment=document.createDocumentFragment();fragment.append(document.createTextNode(text.slice(0,at)));const mark=document.createElement('mark');mark.textContent=text.slice(at,at+query.length);fragment.append(mark,document.createTextNode(text.slice(at+query.length)));node.replaceWith(fragment);});
}
function bookmark(){
 const p=capturePosition(),existing=state.bookmarks.find(b=>b.chapter===p.chapter&&b.paragraph===p.paragraph);
 if(existing){notify('Этот абзац уже в закладках');return;}
 const excerpt=(blocks[p.paragraph]?.textContent||chapters[active].title).trim().slice(0,160);
 state.bookmarks.push({...p,id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7),excerpt:excerpt+'…',created:new Date().toISOString()});persist();updateProgress(p);notify('Закладка сохранена · '+chapters[active].title);
}
function toggleFocus(value=!focused){const p=capturePosition();focused=value;document.body.classList.toggle('focus-mode',focused);$('#exit-focus').hidden=!focused;$('#focus-toggle').setAttribute('aria-pressed',String(focused));requestAnimationFrame(()=>restorePosition(p));if(focused)notify('Режим фокуса · Esc — выйти');}
function exportProgress(){savePosition();const blob=new Blob([JSON.stringify({...state,exportedAt:new Date().toISOString()},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=CFG.slug+'-reading-progress.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('Прогресс и закладки сохранены в файл');}
async function importProgress(file){
 if(!file)return;try{
  if(file.size>2*1024*1024)throw Error('Файл слишком большой — выберите файл экспорта прогресса');
  const raw=JSON.parse(await file.text());if(raw.book!==BOOK||raw.version!==1)throw Error('Нужен файл прогресса этой книги');
  const incoming=validateState(raw);state=incoming;persist();applySettings();updateResume();
  if($('#settings-dialog').open)$('#settings-dialog').close();
  if(state.current){const p=state.current;if(active===p.chapter){restorePosition(p);savePosition();}else{pendingPosition=p;location.hash='#read/'+p.chapter;}}
  notify('Прогресс, настройки и закладки восстановлены');
 }catch(e){notify(e instanceof SyntaxError?'Не удалось прочитать JSON — выберите файл экспорта':e.message);}finally{$('#import-file').value='';}
}
function bindEvents(){
 $$('[data-continue]').forEach(b=>b.addEventListener('click',()=>{if(state.current)pendingPosition=state.current;goChapter(state.current?.chapter||0);}));
 $('#landing-contents')?.addEventListener('click',()=>openLibrary('contents'));
 $$('[data-open-contents]').forEach(b=>b.addEventListener('click',()=>openLibrary('contents')));
 $('#previous-chapter').addEventListener('click',()=>goChapter(active-1));$('#next-chapter').addEventListener('click',()=>goChapter(active+1));
 $('#open-toc').addEventListener('click',()=>openLibrary('contents'));$('#open-search').addEventListener('click',()=>openLibrary('search'));$('#sidebar-bookmarks').addEventListener('click',()=>openLibrary('bookmarks'));$('#add-bookmark').addEventListener('click',bookmark);
 $('#open-settings').addEventListener('click',()=>$('#settings-dialog').showModal());$$('[data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
 $$('.dialog-tabs [data-tab]').forEach(b=>b.addEventListener('click',()=>renderLibrary(b.dataset.tab)));
 $$('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
 $('#toc-filter').addEventListener('input',buildSidebar);
 $('.reader-brand').addEventListener('click',()=>{savePosition();active=-1;});
 for(const [id,key] of [['font-setting','font'],['size-setting','size'],['line-setting','line'],['width-setting','width']])$('#'+id).addEventListener('input',e=>{state.settings[key]=key==='font'?e.target.value:Number(e.target.value);applyAndKeepPosition();});
 $$('[data-theme]').forEach(b=>b.addEventListener('click',()=>{state.settings.theme=b.dataset.theme;applyAndKeepPosition();}));
 $('#reset-settings').addEventListener('click',()=>{state.settings={...DEFAULT};applyAndKeepPosition();notify('Настройки чтения восстановлены');});
 $('#focus-toggle').addEventListener('click',()=>toggleFocus());$('#exit-focus').addEventListener('click',()=>toggleFocus(false));
 $('#back-top').addEventListener('click',()=>window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));
 $('#export-progress').addEventListener('click',exportProgress);$('#import-progress').addEventListener('click',()=>$('#import-file').click());$('#import-file').addEventListener('change',e=>importProgress(e.target.files[0]));
 window.addEventListener('hashchange',route);let lastY=0;window.addEventListener('scroll',()=>{const y=window.scrollY;if(active>=0&&!restoring&&Date.now()>(window.__quietBars||0)){const d=y-lastY;if(Math.abs(d)>6){document.body.classList.toggle('bars-hidden',d>0&&y>240&&!$$('dialog').some(x=>x.open));}}lastY=y;if(restoring)return;clearTimeout(timer);timer=setTimeout(savePosition,200);},{passive:true});
 bindTilt();
 window.addEventListener('pagehide',savePosition);document.addEventListener('visibilitychange',()=>{if(document.hidden)savePosition();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&focused&&!$$('dialog').some(d=>d.open))toggleFocus(false);if(active<0||$$('dialog').some(d=>d.open)||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;if(e.key==='ArrowRight'&&active<N-1)goChapter(active+1);if(e.key==='ArrowLeft'&&active>0)goChapter(active-1);});
}
function bindTilt(){
 const stage=$('.hero-book'),book=$('.book-tilt');if(!stage||!book||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const set=(x,y)=>{book.style.setProperty('--ry',(x*10).toFixed(2)+'deg');book.style.setProperty('--rx',(-y*7).toFixed(2)+'deg');book.style.setProperty('--gx',(50+x*60)+'%');book.style.setProperty('--gy',(40+y*60)+'%');};
 stage.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse')return;const r=stage.getBoundingClientRect();book.classList.add('is-tilting');set((e.clientX-r.left)/r.width-.5,(e.clientY-r.top)/r.height-.5);});
 stage.addEventListener('pointerleave',()=>{book.classList.remove('is-tilting');set(0,0);});
 window.addEventListener('deviceorientation',e=>{if(e.gamma==null||$('#landing').hidden)return;book.classList.add('is-tilting');set(clamp(e.gamma/40,-.5,.5),clamp((e.beta-45)/50,-.5,.5));},{passive:true});
}
function firstLine(section){const p=section.paragraphs.find(x=>x.text.length>12&&!/^…?в память/i.test(x.text))||section.paragraphs[0];if(!p)return '';const m=p.text.match(/^.{12,}?[.!?…](?=\s|$)/);let t=(m?m[0]:p.text).trim();if(t.length>90)t=t.slice(0,88).replace(/\s+\S*$/,'')+'…';return t;}
async function init(){
 try{
  const response=await fetch(CFG.bookFile);if(!response.ok)throw Error('book fetch');book=await response.json();chapters=book.chapters;if(!chapters.length)throw Error('chapter count');N=chapters.length;NUMBERED=chapters.filter((_,k)=>chapterNum(k)).length;
  searchIndex=chapters.map(c=>{const f=parseChapter(c);let els=[...f.children].filter(n=>['P','H2','H3','BLOCKQUOTE','FIGURE'].includes(n.tagName));if(!els.length)els=[...f.children];return {paragraphs:els.map((n,i)=>({paragraph:i,text:n.textContent.trim(),normalized:normalized(n.textContent.trim())}))};});
  snippets=searchIndex.map(firstLine);buildExtras();
  applySettings();buildLanding();bindEvents();route();persist();
 }catch(e){console.error(e);$('#load-error').hidden=false;$('#load-error').textContent='Не удалось загрузить книгу. Проверьте подключение и обновите страницу.';}
}
init();

/* ===== Extras: letter, album, about, footnotes, quote cards, typos, memorial, finale ===== */
let letterStart=-1,album=[],selTimer;
const plural=(k,a,b,c)=>k%10===1&&k%100!==11?a:k%10>=2&&k%10<=4&&(k%100<10||k%100>=20)?b:c;
const BLOCK_TAGS=['P','H2','H3','BLOCKQUOTE','FIGURE'];
function blocksOf(c){const f=parseChapter(c);let bl=[...f.children].filter(n=>BLOCK_TAGS.includes(n.tagName));if(!bl.length)bl=[...f.children];return bl;}
function buildExtras(){
 const L=CFG.letter;if(L){const last=blocksOf(chapters[L.chapter]);letterStart=last.findIndex(n=>n.textContent.trim().startsWith(L.marker));}
 if(letterStart<0)$$('[href="#letter"],.letter-teaser').forEach(n=>n.hidden=true);
 album=[];chapters.forEach((c,i)=>blocksOf(c).forEach((n,j)=>{const img=n.querySelector('img');if(img)album.push({chapter:i,paragraph:j,src:img.getAttribute('src'),alt:img.getAttribute('alt')||'',w:+img.getAttribute('width')||3,h:+img.getAttribute('height')||4});}));
 if(isMemorial()){document.body.classList.add('memorial');$$('.memorial-line').forEach(n=>n.hidden=false);}
 const photos=$('#stat-photos');if(photos)photos.textContent=album.length;
}
function isMemorial(){const m=CFG.memorial,d=new Date();return !!m&&((d.getMonth()+1===m.month&&d.getDate()===m.day)||/[?&]memorial\b/.test(location.search));}
function showPage(name){
 $('#landing').hidden=true;$('#reader').hidden=true;const page=$('#page');page.hidden=false;document.body.classList.remove('focus-mode','bars-hidden');focused=false;
 const main=$('#page-main');main.replaceChildren();main.className='page-main wrap page-'+name;
 if(name==='letter'){
  document.title='Письмо переводчика — '+TITLE+' · VSplanet Книги';
  const head=document.createElement('header');head.className='page-head';head.innerHTML='<p class="eyebrow">От переводчика · '+CFG.letter.year+'</p><h1>'+escapeText(CFG.letter.heading)+'</h1>';main.append(head);
  const art=document.createElement('article');art.className='letter book-prose';
  blocksOf(chapters[CFG.letter.chapter]).slice(letterStart+1).forEach(n=>{if(n.textContent.trim())art.append(n);});
  const sign=document.createElement('p');sign.className='letter-sign';sign.innerHTML=escapeText(CFG.translator)+'<span>переводчик, '+CFG.letter.year+'</span>';art.append(sign);main.append(art);
  const act=document.createElement('div');act.className='page-actions';act.innerHTML='<button class="btn btn-primary" data-continue>Читать книгу</button><button class="btn btn-ghost" id="letter-in-book">Открыть в книге</button>';main.append(act);
  act.querySelector('[data-continue]').addEventListener('click',()=>{if(state.current)pendingPosition=state.current;goChapter(state.current?.chapter||0);});
  $('#letter-in-book').addEventListener('click',()=>jumpTo({chapter:CFG.letter.chapter,paragraph:letterStart,offset:0,fraction:0}));
 }else if(name==='album'){
  document.title='Альбом — '+TITLE+' · VSplanet Книги';
  const head=document.createElement('header');head.className='page-head';head.innerHTML='<p class="eyebrow">Альбом · '+album.length+' '+plural(album.length,'фотография','фотографии','фотографий')+'</p><h1>Фотографии из книги</h1><p class="page-lead">Нажмите на снимок, чтобы открыть его в тексте</p>';main.append(head);
  const grid=document.createElement('div');grid.className='album-grid';
  album.forEach(a=>{const b=document.createElement('button');b.className='album-item';b.style.setProperty('--ar',(a.w/a.h).toFixed(3));b.innerHTML='<img loading="lazy" decoding="async" alt="" src="'+a.src+'"><span><b>'+escapeText(chapters[a.chapter].title)+'</b>'+escapeText(a.alt)+'</span>';b.addEventListener('click',()=>jumpTo({chapter:a.chapter,paragraph:a.paragraph,offset:0,fraction:0}));grid.append(b);});
  main.append(grid);
 }else{
  document.title='О сайте — '+TITLE+' · VSplanet Книги';
  main.innerHTML=$('#about-template').innerHTML;
 }
 window.scrollTo({top:0,behavior:'instant'});$('#page').focus?.({preventScroll:true});
}
function fillFinale(){
 const days=Math.max(1,Math.ceil((Date.now()-Date.parse(state.started))/864e5));
 const n=state.bookmarks.length;
 $('#end-stats').innerHTML='<div><b>'+days+'</b><span>'+plural(days,'день','дня','дней')+' с книгой</span></div><div><b>'+n+'</b><span>'+plural(n,'закладка','закладки','закладок')+'</span></div><div><b>'+($('#book-percent').textContent||'100%')+'</b><span>книги прочитано</span></div>';
}
async function shareBook(){
 const url=location.origin+location.pathname,data={title:TITLE,text:CFG.subtitle+'. '+CREDIT,url};
 try{if(navigator.share){await navigator.share(data);return;}await navigator.clipboard.writeText(url);notify('Ссылка на книгу скопирована');}catch(e){if(e?.name!=='AbortError')notify('Не удалось поделиться — скопируйте адрес страницы');}
}
/* footnotes */
function showFootnote(btn){
 const bub=$('#fn-bubble');bub.innerHTML='<b>'+(btn.dataset.kind==='ed'?'Примечание редакции':'Примечание переводчика')+'</b>'+escapeText(btn.dataset.note);bub.hidden=false;
 const r=btn.getBoundingClientRect(),w=Math.min(320,window.innerWidth-24);bub.style.width=w+'px';
 const left=clamp(r.left+r.width/2-w/2,12,window.innerWidth-w-12);bub.style.left=left+'px';
 const top=r.bottom+10+bub.offsetHeight>window.innerHeight?r.top-10-bub.offsetHeight:r.bottom+10;bub.style.top=top+'px';
 btn.setAttribute('aria-expanded','true');
}
function hideFootnote(){const b=$('#fn-bubble');if(!b.hidden){b.hidden=true;$$('.fn[aria-expanded]').forEach(x=>x.removeAttribute('aria-expanded'));}}
/* selection: quote card + typo */
function currentSelection(){
 const sel=window.getSelection();if(!sel||sel.isCollapsed||!sel.rangeCount)return null;
 const range=sel.getRangeAt(0),art=$('#article');if(!art||!art.contains(range.commonAncestorContainer))return null;
 const text=sel.toString().replace(/\s+/g,' ').trim();if(text.length<3)return null;
 let node=range.startContainer.nodeType===1?range.startContainer:range.startContainer.parentElement;const block=node.closest('#article > *');
 return {text,range,paragraph:Math.max(0,blocks.indexOf(block))};
}
function placeSelBar(){
 const s=currentSelection(),bar=$('#sel-bar');if(!s){bar.hidden=true;return;}
 const r=s.range.getBoundingClientRect();bar.hidden=false;
 const touch=matchMedia('(pointer: coarse)').matches,w=bar.offsetWidth,h=bar.offsetHeight;
 bar.style.left=clamp(r.left+r.width/2-w/2,10,window.innerWidth-w-10)+'px';
 let top=touch?r.bottom+14:r.top-h-10;if(top<64)top=r.bottom+14;if(top+h>window.innerHeight-10)top=Math.max(64,r.top-h-10);bar.style.top=top+'px';
}
function loadImg(src){return new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=src;});}
function wrapLines(ctx,text,max){const words=text.split(' '),lines=[];let line='';for(const w of words){const t=line?line+' '+w:w;if(ctx.measureText(t).width>max&&line){lines.push(line);line=w;}else line=t;}if(line)lines.push(line);return lines;}
async function makeQuoteCard(text,title){
 const W=1080,H=1920,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
 try{await Promise.all([document.fonts.load('56px Literata'),document.fonts.load('700 32px Geologica'),document.fonts.load('32px Geologica'),document.fonts.load('44px "GTA Russian"')]);}catch{}
 x.fillStyle='#000';x.fillRect(0,0,W,H);
 const g=x.createRadialGradient(W/2,H-520,40,W/2,H-520,760);g.addColorStop(0,'rgba(238,42,36,.42)');g.addColorStop(1,'rgba(238,42,36,0)');x.fillStyle=g;x.fillRect(0,0,W,H);
 try{const img=await loadImg(CFG.render);x.drawImage(img,W/2-360,H-1010,720,720);}catch{}
 let q='«'+(text.length>420?text.slice(0,text.lastIndexOf(' ',410))+'…':text.replace(/\.$/,''))+'»',size=64,lines,lh;
 const maxH=H-1010-260;
 do{x.font=size+'px Literata';lines=wrapLines(x,q,W-170);lh=size*1.36;size-=2;}while(lines.length*lh>maxH&&size>30);
 x.fillStyle='#f5f5f7';x.textBaseline='top';let y=200;
 x.font='700 30px Geologica';x.fillStyle='#ee2a24';x.fillText(title.toUpperCase(),85,y-70);
 x.font=(size+2)+'px Literata';x.fillStyle='#f5f5f7';lines.forEach((l,k)=>x.fillText(l,85,y+k*lh));
 x.textAlign='center';x.font='44px "GTA Russian"';x.fillStyle='#ee2a24';x.fillText(TITLE,W/2,H-232);
 x.font='30px Geologica';x.fillStyle='#b9b9bf';x.fillText(CREDIT,W/2,H-168);
 x.fillStyle='#ee2a24';x.fillText(location.host+location.pathname.replace(/\/$/,''),W/2,H-112);
 return await new Promise(r=>c.toBlob(r,'image/png'));
}
async function shareQuote(){
 const s=currentSelection();if(!s)return;const title=chapters[active].title;$('#sel-bar').hidden=true;
 notify('Готовим карточку…');
 const blob=await makeQuoteCard(s.text,title);if(!blob){notify('Не удалось создать карточку');return;}
 const file=new File([blob],CFG.slug+'-quote.png',{type:'image/png'});
 try{if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:TITLE});return;}}catch(e){if(e?.name==='AbortError')return;}
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=CFG.slug+'-quote.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);notify('Карточка сохранена');
}
async function reportTypo(){
 const s=currentSelection();if(!s)return;$('#sel-bar').hidden=true;
 const msg='Опечатка в книге «'+TITLE+'»\n'+chapters[active].title+', абзац '+(s.paragraph+1)+':\n«'+s.text+'»\nКак правильно: ';
 try{await navigator.clipboard.writeText(msg);notify('Скопировано с номером главы и абзаца — отправьте редакции VSplanet');}catch{notify(chapters[active].title+', абзац '+(s.paragraph+1));}
}
document.addEventListener('click',e=>{
 const fn=e.target.closest('.fn');if(fn){e.preventDefault();if(fn.getAttribute('aria-expanded'))hideFootnote();else{hideFootnote();showFootnote(fn);}return;}
 if(!e.target.closest('#fn-bubble'))hideFootnote();
 if(e.target.closest('#share-book'))shareBook();
});
document.addEventListener('selectionchange',()=>{clearTimeout(selTimer);selTimer=setTimeout(placeSelBar,active>=0?180:0);});
window.addEventListener('scroll',()=>{hideFootnote();if(!$('#sel-bar').hidden)placeSelBar();},{passive:true});
document.addEventListener('keydown',e=>{if(e.key==='Escape')hideFootnote();});
$('#sel-quote')?.addEventListener('click',shareQuote);$('#sel-typo')?.addEventListener('click',reportTypo);
$('#sel-bar')?.addEventListener('mousedown',e=>e.preventDefault());
