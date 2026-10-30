'use strict';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const KEY='eddie-reading-room-v1', BOOK='eddie-guerrero-vsplanet-ru';
const SMALL=typeof matchMedia==='function'&&matchMedia('(max-width: 600px)').matches;
const DEFAULT={font:'serif',size:SMALL?18:20,line:SMALL?1.7:1.75,width:680,theme:'night'};
let book,chapters=[],searchIndex=[],snippets=[],active=-1,blocks=[],restoring=false,focused=false,timer,toastTimer,searchTimer,allShown=false;
let storageAvailable=true;
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const cleanNumber=(n,a,b,fallback)=>Number.isFinite(Number(n))?clamp(Number(n),a,b):fallback;
const validChapter=n=>Number.isInteger(n)&&n>=0&&n<46;
function settingsOf(s={}){return {font:['serif','sans','mono'].includes(s.font)?s.font:DEFAULT.font,size:cleanNumber(s.size,16,30,DEFAULT.size),line:cleanNumber(s.line,1.5,2.2,DEFAULT.line),width:[560,680,820].includes(Number(s.width))?Number(s.width):680,theme:['night','graphite','warm'].includes(s.theme)?s.theme:'night'};}
function positionOf(p){if(!p||!validChapter(p.chapter))return null;return {chapter:p.chapter,paragraph:Math.floor(cleanNumber(p.paragraph,0,10000,0)),offset:cleanNumber(p.offset,-2,1,0),fraction:cleanNumber(p.fraction,0,1,0)};}
function validateState(raw){
 if(!raw||typeof raw!=='object'||(raw.book&&raw.book!==BOOK))throw Error('Этот файл относится к другой книге.');
 const positions={};for(const [k,v] of Object.entries(raw.positions||{})){const p=positionOf(v);if(p&&String(p.chapter)===k)positions[k]=p;}
 const bookmarks=Array.isArray(raw.bookmarks)?raw.bookmarks.slice(0,500).map((b,i)=>{const p=positionOf(b);return p?{...p,id:String(b.id||i).slice(0,80),excerpt:String(b.excerpt||'Закладка').slice(0,220),created:String(b.created||'').slice(0,40)}:null}).filter(Boolean):[];
 return {version:1,book:BOOK,settings:settingsOf(raw.settings),current:positionOf(raw.current),positions,bookmarks};
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
 r.style.setProperty('--font',{serif:"Literata,Georgia,serif",sans:"-apple-system,BlinkMacSystemFont,'Golos Text',system-ui,sans-serif",mono:"Menlo,Consolas,monospace"}[s.font]);
 r.style.setProperty('--size',s.size+'px');r.style.setProperty('--leading',s.line);r.style.setProperty('--measure',s.width+'px');
 document.body.classList.remove('theme-night','theme-graphite','theme-warm');document.body.classList.add('theme-'+s.theme);
 $('#font-setting').value=s.font;$('#size-setting').value=s.size;$('#line-setting').value=s.line;$('#width-setting').value=s.width;
 $('#size-output').value=s.size+' px';$('#line-output').value=Number(s.line).toFixed(2);
 $$('[data-theme]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.theme===s.theme)));
}
function applyAndKeepPosition(){const p=active>=0?capturePosition():null;applySettings();persist();if(p)requestAnimationFrame(()=>restorePosition(p));}
function chapterMark(i){return i===0?'—':i>43?'✦':String(i).padStart(2,'0');}
function tocHTML(c,i){return '<span>'+chapterMark(i)+'</span><b>'+escapeText(c.title)+'</b><small>'+escapeText(snippets[i]||'')+'</small>';}
function buildLanding(){
 const words=chapters.reduce((s,c)=>s+c.words,0),hours=$('#stat-hours'),photos=$('#stat-photos');
 if(hours)hours.textContent='≈'+Math.round(words/200/60);
 if(photos)photos.textContent=chapters.reduce((s,c)=>s+(c.html.match(/<img/g)||[]).length,0);
 const card=$('#match-card');if(!card)return updateResume();
 card.replaceChildren();
 chapters.forEach((c,i)=>{
  const b=document.createElement('button');b.className='match'+(i===0||i>43?' special':'');b.dataset.chapter=i;b.setAttribute('role','listitem');
  b.innerHTML='<small>'+(i===0?'Вступ.':i===44?'Эпилог':i===45?'Финал':'Глава')+'</small><b>'+(i===0?'00':i===44?'EP':i===45?'✦':String(i).padStart(2,'0'))+'</b>';
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
 $('#landing').hidden=true;$('#reader').hidden=false;
 const c=chapters[i];document.title=c.title+' — Обмани смерть. Укради жизнь · VSplanet';
 $('#chapter-title').textContent=c.title;$('#header-chapter').textContent=c.title;
 $('#chapter-category').textContent=i===0?'До первого гонга':i<=43?String(i).padStart(2,'0')+' / 43 · Эдди Герреро':'После финального гонга';
 $('#chapter-number').textContent=i===0?'00':i<=43?String(i).padStart(2,'0'):i===44?'EP':'✦';
 $('#reader').classList.toggle('is-extra',i===0||i>43);document.body.classList.remove('bars-hidden');window.__quietBars=Date.now()+900;
 $('#reading-time').textContent='≈ '+mins(c)+' мин чтения';
 $('#article').replaceChildren(parseChapter(c));
 blocks=$$('#article > p, #article > h2, #article > h3, #article > blockquote, #article > figure');
 if(!blocks.length)blocks=$$('#article > *');
 blocks.forEach((n,j)=>n.id='paragraph-'+j);
 $('#previous-chapter').disabled=i===0;$('#previous-label').textContent=i?chapters[i-1].title:'';
 $('#next-chapter').hidden=i===chapters.length-1;$('#next-label').textContent=i<chapters.length-1?chapters[i+1].title:'';$('#end-note').hidden=i!==chapters.length-1;
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
 if(match&&validChapter(Number(match[1]))){showChapter(Number(match[1]));return;}
 if(active>=0)savePosition();active=-1;
 $('#reader').hidden=true;$('#landing').hidden=false;document.body.classList.remove('focus-mode');focused=false;$('#exit-focus').hidden=true;
 document.title='Обмани смерть. Укради жизнь — VSplanet';updateResume();
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
  const results=document.createElement('div');results.id='search-results';results.innerHTML='<p class="search-caption">Поиск по всем 46 разделам. Введите хотя бы две буквы.</p>';results.setAttribute('aria-live','polite');target.append(input,results);
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
function toggleFocus(value=!focused){const p=capturePosition();focused=value;document.body.classList.toggle('focus-mode',focused);$('#exit-focus').hidden=!focused;$('#focus-toggle').setAttribute('aria-pressed',String(focused));requestAnimationFrame(()=>restorePosition(p));if(focused)notify('Только вы и книга. Esc — выйти из фокуса.');}
function exportProgress(){savePosition();const blob=new Blob([JSON.stringify({...state,exportedAt:new Date().toISOString()},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='eddie-reading-progress.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('Прогресс и закладки сохранены в файл');}
async function importProgress(file){
 if(!file)return;try{
  if(file.size>2*1024*1024)throw Error('Файл слишком большой. Выберите файл экспорта прогресса.');
  const raw=JSON.parse(await file.text());if(raw.book!==BOOK||raw.version!==1)throw Error('Нужен файл прогресса этой книги.');
  const incoming=validateState(raw);state=incoming;persist();applySettings();updateResume();
  if($('#settings-dialog').open)$('#settings-dialog').close();
  if(state.current){const p=state.current;if(active===p.chapter){restorePosition(p);savePosition();}else{pendingPosition=p;location.hash='#read/'+p.chapter;}}
  notify('Прогресс, настройки и закладки восстановлены');
 }catch(e){notify(e instanceof SyntaxError?'Не удалось прочитать JSON. Выберите файл экспорта.':e.message);}finally{$('#import-file').value='';}
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
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&focused&&!$$('dialog').some(d=>d.open))toggleFocus(false);if(active<0||$$('dialog').some(d=>d.open)||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;if(e.key==='ArrowRight'&&active<45)goChapter(active+1);if(e.key==='ArrowLeft'&&active>0)goChapter(active-1);});
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
  const response=await fetch('book-illustrated-a477de166ee3.json');if(!response.ok)throw Error('book fetch');book=await response.json();chapters=book.chapters;if(chapters.length!==46)throw Error('chapter count');
  searchIndex=chapters.map(c=>{const f=parseChapter(c);let els=[...f.children].filter(n=>['P','H2','H3','BLOCKQUOTE','FIGURE'].includes(n.tagName));if(!els.length)els=[...f.children];return {paragraphs:els.map((n,i)=>({paragraph:i,text:n.textContent.trim(),normalized:normalized(n.textContent.trim())}))};});
  snippets=searchIndex.map(firstLine);
  applySettings();buildLanding();bindEvents();route();persist();
 }catch(e){console.error(e);$('#load-error').hidden=false;$('#load-error').textContent='Не удалось загрузить книгу. Проверьте подключение и обновите страницу.';}
}
init();
