"""Общая полка «VSplanet Книги»: andreev.uz/books/.

  python3 build_shelf.py <корень сайта (папки книг)> [<slug> ...]

Читает уже собранные книги (index.html с BOOK_CONFIG, book-*.json, обложку, EPUB) и
создаёт <корень>/books/: страницу полки, уменьшенные обложки, og.jpg, sitemap.xml.
Прогресс чтения берётся из localStorage книг — домен общий, регистрация не нужна.
"""
import base64, html, json, pathlib, re, shutil, sys
from PIL import Image
sys.path.insert(0, str(pathlib.Path(__file__).parent)); import quotes as _q

ROOT = pathlib.Path(sys.argv[1]).resolve()
SLUGS = sys.argv[2:] or ['eddie', 'hart', 'jericho', 'wcw', 'heenan', 'lesnar', 'booker', 'flair', 'piper', 'holly', 'goldust', 'booker-royalty', 'copeland']
T = pathlib.Path(__file__).resolve().parents[1] / 'template'
OUT = ROOT / 'books'; (OUT / 'covers').mkdir(parents=True, exist_ok=True)
BASE = 'https://andreev.uz/books/'
E = lambda s: html.escape(str(s), quote=True)

# О каких годах рассказывает книга — для ленты эпох (приблизительно, по содержанию)
ERAS = {'heenan': (1944, 2002), 'hart': (1957, 2007), 'booker': (1965, 1993), 'eddie': (1967, 2005),
        'lesnar': (1977, 2010), 'wcw': (1988, 2001), 'jericho': (1999, 2008), 'flair': (1949, 1985),
        'piper': (1954, 2002), 'holly': (1970, 2012), 'goldust': (1969, 2010), 'booker-royalty': (2001, 2006), 'copeland': (1973, 1999)}
ERA_LABEL = {'booker': 'Букер Т (1-я книга)', 'booker-royalty': 'Букер Т (2-я книга)', 'goldust': 'Голдаст', 'copeland': 'Эдж (Коупленд)'}
TAGLINE = {
    'eddie': 'О семье Герреро, зависимости и пути к титулу чемпиона WWE.',
    'hart': 'Подземелье Стю, Монреальская подстава и жизнь, которую не придумать сценаристам.',
    'jericho': 'Чемпион мира, рок-звезда и уход из рестлинга — Джерико в лучшей форме.',
    'wcw': 'Как самая горячая компания мира за пару лет растеряла всё.',
    'heenan': 'Самый острый язык рестлинга — о AWA, WWF и Горилле Монсуне.',
    'lesnar': 'Ферма, WWE, NFL, UFC и болезнь, которая едва не закончила всё.',
    'flair': 'Усыновление в Мемфисе, первые бои и взлёт «Парня из природы».',
    'piper': 'Буян Родди: от трудного детства до звёздных лет — с предисловием Брета Харта.',
    'holly': 'Алабама, годы в WWF, травмы и жизнь после ринга — без прикрас.',
    'goldust': 'Сын «Американской мечты», болезнь и путь из тьмы к свету.',
    'copeland': 'Детство в Канаде, путь в рестлинг и первые годы Эджа в WWF.',
    'booker-royalty': 'От падения WCW до Зала славы WWE.',
    'booker': 'Улицы Хьюстона, тюрьма и первый шаг на ринг.',
}

books = []
for slug in SLUGS:
    d = OUT / slug
    page = (d / 'index.html').read_text()
    cfg = json.loads(re.search(r'window\.BOOK_CONFIG=(\{.*?\});?</script>', page, re.S)[1])
    data = json.loads((d / cfg.get('bookFile', 'book.json').split('?')[0]).read_text()) if (d / cfg.get('bookFile', '')).is_file() else \
        json.loads(sorted(d.glob('book-*.json'))[0].read_text())
    _fj = d / 'files.json'; offline_bytes = json.loads(_fj.read_text())['bytes'] if _fj.exists() else 0
    qs = _q.extract(slug, data)
    words = [c.get('words') or len(re.sub(r'<[^>]+>', ' ', c['html']).split()) for c in data['chapters']]
    m = re.search(r'<style id="theme">[^<]*--accent:(#[0-9a-fA-F]{6})', page)
    accent = '#7fa6d4'                                      # единый цвет интерфейса: цвет обложки не красит кнопки
    em = re.search(r'href="(assets/[^"]+\.epub)"', page); epub = em[1] if em else None
    with Image.open(d / 'assets' / 'cover.jpg') as im:
        im = im.convert('RGB'); im.thumbnail((480, 720), Image.LANCZOS)
        im.save(OUT / 'covers' / f'{slug}.jpg', quality=82, optimize=True, progressive=True)
        im.save(OUT / 'covers' / f'{slug}.webp', quality=78, method=6)
    books.append({'q': qs, 'slug': slug, 'key': cfg['storageKey'], 'title': cfg['title'], 'subtitle': cfg.get('subtitle', ''),
                  'author': cfg['author'], 'credit': cfg['credit'], 'translator': cfg.get('translator'), 'accent': accent, 'words': words,
                  'chapters': len(words), 'bytes': offline_bytes, 'epub': f'{slug}/{epub}' if epub else None, 'orig': cfg.get('original') or {}, 'inc': cfg.get('incomplete'), 'era': ERAS.get(slug), 'tag': TAGLINE.get(slug, '')})

books.sort(key=lambda b: ((b['orig'] or {}).get('year', 9999), b['slug']))
EAGER = {b['slug'] for b in books if not b['inc']}.intersection({b['slug'] for b in books[:4]})
full = [b for b in books if not b['inc']]; partial = [b for b in books if b['inc']]
total_words = sum(sum(b['words']) for b in books)
hours = round(total_words / 180 / 60)
import shared; SH = shared.build(OUT); VER = shared.version()     # общие шрифты и логотип — /books/shared/

def plural(n, a, b, c):
    n = abs(n) % 100; n1 = n % 10
    return c if 10 < n < 20 else a if n1 == 1 else b if 2 <= n1 <= 4 else c

def badge(b):
    if not b['inc']: return ''
    return '<span class="badge ' + b['inc']['kind'] + '">' + ('Переводится' if b['inc']['kind'] == 'ongoing' else 'Заброшено') + '</span>'


def offline_btn(b):
    if b['inc']: return ''
    return (f'<button class="off" data-offline="{b["slug"]}" aria-label="Скачать книгу для чтения без сети" title="Скачать для офлайн"><svg class="dl" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11m-4-4 4 4 4-4M5 20h14"/></svg>'
            '<svg class="ok" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg></button>')


def card(b):
    mins = round(sum(b['words']) / 180)
    return f'''<article class="book" data-slug="{b['slug']}">
 <a class="cover" href="{b['slug']}/" aria-label="{E(b['author'])} — {E(b['title'])}"><img src="covers/{b['slug']}.webp" alt="" width="480" height="720" decoding="async" loading="{'eager' if b['slug'] in EAGER else 'lazy'}"><span class="ring" hidden></span>{badge(b)}</a>
 <div class="meta"><p class="author">{E(b['author'])}</p><h3><a href="{b['slug']}/">{E(b['title'])}</a></h3>
 <p class="tag">{E(b['tag'])}</p>
 {f'<p class="orig"><i lang="en">{E(b["orig"]["title"])}</i> · {b["orig"]["year"]}</p>' if b['orig'] else ''}
 {f'<p class="inc {b["inc"]["kind"]}"><i></i>{E(b["inc"]["label"])}</p>' if b['inc'] else ''}
 <p class="facts">{b['chapters']} {plural(b['chapters'], 'раздел', 'раздела', 'разделов')} · ≈{max(1, round(mins / 60))} ч чтения</p>
 <div class="progress" hidden><span><i></i></span><b></b></div>
 <div class="actions"><a class="btn" href="{b['slug']}/">Читать</a>{offline_btn(b)}{f'<a class="ghost" href="{b["epub"]}" download>EPUB</a>' if b['epub'] else ''}</div></div>
</article>'''

y0, y1 = 1940, 2010
def era_row(b):
    s, e = b['era']; left = (s - y0) / (y1 - y0) * 100; width = (e - s) / (y1 - y0) * 100
    return (f'<a class="era" href="{b["slug"]}/" style="--l:{left:.2f}%;--w:{width:.2f}%">'
            f'<span class="era-name">{E(ERA_LABEL.get(b["slug"]) or ("Смерть WCW" if b["slug"] == "wcw" else b["author"]))}</span><span class="era-bar"><span>{s}–{e}</span></span></a>')

def eras(group, sub):
    rows = ''.join(era_row(b) for b in sorted(group, key=lambda b: b['era']) if b['era'])
    return (f'<section class="eras-sec" aria-labelledby="eras-h"><h2 class="sh" id="eras-h">Эпохи</h2><p class="sub">{sub}</p>'
            f'<div class="eras">{rows}<div class="axis"><span></span><div>{"".join(f"<span>{y}</span>" for y in range(y0, y1 + 1, 10))}</div></div></div></section>')

ld = {'@context': 'https://schema.org', '@type': 'CollectionPage', 'name': 'VSplanet Книги', 'url': BASE, 'inLanguage': 'ru',
      'description': 'Автобиографии звёзд рестлинга в переводах VSplanet.net: читать онлайн бесплатно или скачать EPUB.',
      'mainEntity': {'@type': 'ItemList', 'itemListElement': [
          {'@type': 'ListItem', 'position': i + 1, 'url': f'https://andreev.uz/books/{b["slug"]}/',
           'item': {'@type': 'Book', 'name': b['title'], 'author': {'@type': 'Person', 'name': b['author']}, 'inLanguage': 'ru',
                    'url': f'https://andreev.uz/books/{b["slug"]}/', 'image': f'{BASE}covers/{b["slug"]}.webp'}}
          for i, b in enumerate(books)]}}
QUOTES = [dict(s=b['slug'], **x) for b in books for x in b['q']]
js_books = [{k: b[k] for k in ('slug', 'key', 'title', 'author', 'accent', 'words')} for b in books]


# ---- единое PWA «VSplanet Книги» (scope /books/) ----
import hashlib, subprocess
(OUT / 'icons').mkdir(exist_ok=True)
_logo = Image.open(T / 'assets' / 'vsplanet-logo.png').convert('RGBA')
def _icon(size, frac, name):
    bg = Image.new('RGBA', (size, size), (3, 6, 12, 255)); w = round(size * frac); h = round(w * _logo.height / _logo.width)
    bg.alpha_composite(_logo.resize((w, h), Image.LANCZOS), ((size - w) // 2, (size - h) // 2)); bg.convert('RGB').save(OUT / 'icons' / name, optimize=True)
for _sz, _fr, _nm in [(512, .66, 'app-512.png'), (192, .66, 'app-192.png'), (512, .5, 'app-maskable-512.png'), (180, .66, 'app-180.png')]: _icon(_sz, _fr, _nm)
_pwa_src = (T / 'pwa.js').read_bytes(); PWA_V = hashlib.sha256(_pwa_src).hexdigest()[:12]
shutil.copy(T / 'pwa.js', OUT / 'pwa.js')
_ESB = pathlib.Path('/home/claude/tools/node_modules/.bin/esbuild')
if _ESB.exists(): subprocess.run([str(_ESB), str(OUT / 'pwa.js'), '--minify', '--allow-overwrite', f'--outfile={OUT / "pwa.js"}', '--log-level=error'], check=True)
(OUT / 'manifest.webmanifest').write_text(json.dumps({'id': '/books/', 'name': 'VSplanet Книги', 'short_name': 'Книги', 'description': 'Переводы автобиографий рестлеров: читалка с закладками и офлайн-режимом',
    'lang': 'ru', 'start_url': '/books/', 'scope': '/books/', 'display': 'standalone', 'background_color': '#03060c', 'theme_color': '#03060c',
    'icons': [{'src': 'icons/app-192.png', 'sizes': '192x192', 'type': 'image/png', 'purpose': 'any'}, {'src': 'icons/app-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'any'},
              {'src': 'icons/app-maskable-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'}]}, ensure_ascii=False, indent=1))
# ---- общий CSS полки: один файл на все страницы ----
_ESB = pathlib.Path('/home/claude/tools/node_modules/.bin/esbuild')
_css = (T / 'shelf.css').read_text()
if _ESB.exists():
    _css = subprocess.run([str(_ESB), '--minify', '--loader=css'], input=_css, capture_output=True, text=True, check=True).stdout
SHELF_CSS = 'shelf-' + hashlib.sha256(_css.encode()).hexdigest()[:12] + '.css'
(OUT / 'shared' / SHELF_CSS).write_text(_css)

def rel(h, P):
    """Страницы второго уровня (/books/shelf/…): относительные ссылки получают ../ """
    if not P: return h
    return re.sub(r'(?P<a>\b(?:href|src)=")(?!https?:|#|/|\.\./|data:|mailto:|tel:|javascript:)(?P<v>[^"]*)"',
                  lambda m: m['a'] + ('../' if m['v'] in ('./', '') else '../' + m['v']) + '"', h)

I_BOOKS = '<path d="M4.5 5.5C4.5 4.7 5.2 4 6 4h3.5v16H6c-.8 0-1.5-.7-1.5-1.5zM9.5 4h4v16h-4z"/><path d="m15.4 5.2 3.4-.9c.8-.2 1.6.3 1.8 1.1l2 11.4" transform="translate(-1 .6)"/>'
I_QUOTE = '<path d="M7 7h4v5c0 3-1.5 4.7-4 5.5M14 7h4v5c0 3-1.5 4.7-4 5.5"/>'
I_WORK = '<path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19z"/><path d="M14.5 6.5l3 3"/>'
I_SHUF = '<path d="M4 7h3.5c4 0 5 10 9 10H20M4 17h3.5c1.6 0 2.7-1.6 3.7-3.4M13.5 9.4C14.4 8 15.4 7 16.5 7H20M18 4.5 20.5 7 18 9.5M18 14.5l2.5 2.5-2.5 2.5"/>'
I_SHARE = '<path d="M12 15V4m-4 4 4-4 4 4M6 12v6.5c0 .8.7 1.5 1.5 1.5h9c.8 0 1.5-.7 1.5-1.5V12"/>'
I_TG = '<path d="M20.6 4.4 3.8 10.9c-.9.4-.9 1.1-.2 1.3l4.3 1.3 1.6 5c.2.6.4.8.8.8.4 0 .6-.2.9-.5l2.2-2.1 4.4 3.2c.8.5 1.4.2 1.7-.8l2.9-13.7c.3-1.2-.5-1.7-1.8-1.1zM8.7 13.2l8.6-5.4c.4-.3.8-.1.5.2l-7.1 6.4-.3 3z"/>'
FAB = '<button class="tb-fab install-trigger" type="button" data-install-auto hidden aria-label="Установить приложение"><svg viewBox="0 0 24 24" aria-hidden="true" style="fill:none"><path d="M12 4v11m-4.5-4.5L12 15l4.5-4.5M5 20h14"/></svg></button>'
TABS = [('shelf', './', 'Полка', I_BOOKS), ('unfinished', 'unfinished/', 'В работе', I_WORK), ('quotes', 'quotes/', 'Цитаты', I_QUOTE)]
def tabbar(cur):
    return ('<nav class="tabbar" data-tabbar data-home="./" aria-label="Разделы"><div class="tb-pill"><i class="tb-ind"></i>' + ''.join(
        f'<a class="tb-tab" href="{h}"{" data-cur" if k == cur else ""}><svg viewBox="0 0 24 24" aria-hidden="true">{ic}</svg><span>{t}</span></a>' for k, h, t, ic in TABS) + '</div>' + FAB + '</nav>')

TITLES = {'shelf': 'Полка', 'unfinished': 'В работе', 'quotes': 'Цитаты'}
def navbar(cur, act=''):
    return (f'<header class="navbar" data-navbar><a class="nb-brand" href="./" aria-label="VSplanet Книги"><img src="shared/vsplanet-logo.png" alt="" width="911" height="648"></a>'
            f'<span class="nb-title">{TITLES[cur]}</span><span class="nb-act">{act}</span></header>')

MINI_FOOT = f'<footer class="credits mini"><div class="cr-end"><span>Сайт собрал Никита Андреев, 2026</span><span class="app-ver">Версия {shared.version_label()}</span></div></footer>'

def page(path, title, desc, main, js, cur, extra='', act='', body_cls='shelf-body', foot=None):
    P = '../' if path else ''
    h = f"""<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{E(title)}</title><meta name="description" content="{E(desc)}">
<link rel="canonical" href="{BASE}{path}"><meta name="theme-color" content="#03060c"><link rel="manifest" href="manifest.webmanifest"><link rel="apple-touch-icon" href="icons/app-180.png"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="Книги"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta property="og:type" content="website"><meta property="og:url" content="{BASE}{path}"><meta property="og:title" content="{E(title)}"><meta property="og:description" content="{E(desc)}"><meta property="og:image" content="{BASE}og.jpg"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="shared/vsplanet-logo.png"><link rel="preload" href="shared/fonts/geologica-cyr.woff2" as="font" type="font/woff2" crossorigin>{extra}
<link rel="stylesheet" href="shared/{SHELF_CSS}"><link rel="stylesheet" href="shared/{SH[2]}"><script src="shared/{SH[3]}" defer></script></head><body class="{body_cls}" data-page="{cur}">
<div class="glow"></div>
{navbar(cur, act)}
{main}
{tabbar(cur)}
<script>
{js}
</script>
<script src="pwa.js?v={PWA_V}" defer></script>
</body></html>"""
    return rel(h, P)

def wrap(inner, foot):
    return f'<div class="wrap"><main>\n{inner}\n</main>\n{foot}</div>'

ABOUT = f"""<footer class="credits" id="about">
<div class="cr-brand"><img src="shared/vsplanet-logo.png" alt="" width="911" height="648" loading="lazy"><div><b>VSplanet Книги</b><p>Автобиографии рестлеров — в переводах, которые сделали фанаты для фанатов.</p></div></div>
<div class="cr-grid">
<div><h4>О проекте</h4><p>С 2011 года читатели VSplanet переводят книги звёзд рестлинга. Здесь они собраны в одной читалке: закладки, поиск по тексту, офлайн-режим и EPUB. Регистрации нет, а прогресс чтения хранится только в вашем браузере.</p></div>
<div><h4>Присоединяйтесь</h4><p>Недопереведённые книги ждут продолжения. Возьмите главу — и ваше имя появится в выходных данных книги.</p><p><a class="cr-link" href="https://vsplanet.net/" rel="noopener">Редакция VSplanet.net →</a></p></div>
</div>
<label class="cr-set"><span>Прозрачность стекла</span><input type="range" id="glass" min="0" max="100" step="5" value="55" aria-label="Прозрачность стекла"></label>
<div class="cr-end"><span>Сайт собрал Никита Андреев, 2026</span><span class="app-ver">Версия {shared.version_label()}</span></div>
</footer>"""

# ---- JS страниц ----
JS_COMMON = f"""const BOOKS={json.dumps(js_books, ensure_ascii=False)};
const st={{}};
for(const b of BOOKS){{
  let s=null;try{{s=JSON.parse(localStorage.getItem(b.key)||'null')}}catch(e){{}}
  const p=s&&s.current;if(!p||!(p.chapter>=0)||p.chapter>=b.words.length)continue;
  const total=b.words.reduce((a,c)=>a+c,0),before=b.words.slice(0,p.chapter).reduce((a,c)=>a+c,0);
  const pct=Math.min(100,Math.round((before+b.words[p.chapter]*(+p.fraction||0))/total*100));
  st[b.slug]={{pct,chapter:p.chapter,t:Date.parse(s.updated||s.started||0)||0}};
}}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}})[c]);
"""
JS_QUOTES = f"""const QUOTES={json.dumps(QUOTES, ensure_ascii=False)};
(()=>{{const by=Object.fromEntries(BOOKS.map(b=>[b.slug,b])),track=document.getElementById('qtrack'),cnt=document.getElementById('qcount'),bg=document.getElementById('qbg');
const shuf=a=>{{a=a.slice();for(let i=a.length-1;i>0;i--){{const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}}return a}};
function deck(){{const g={{}};shuf(QUOTES).forEach(q=>(g[q.s]=g[q.s]||[]).push(q));const keys=Object.keys(g),out=[];
 for(let r=0;;r++){{let any=false;for(const k of shuf(keys))if(g[k][r]){{out.push(g[k][r]);any=true}}if(!any)break}}return out}}
let list=[],cur=0,io=null;
const size=t=>t.length>230?'xs':t.length>150?'s':t.length>80?'m':'l';
function build(){{list=deck();
 track.innerHTML=list.map((q,i)=>{{const b=by[q.s];return `<article class="qs-slide" data-i="${{i}}" aria-label="Цитата ${{i+1}} из ${{list.length}}"><div class="qs-in"><blockquote class="${{size(q.t)}}"><p>${{esc(q.t)}}</p></blockquote>
<footer><img src="covers/${{q.s}}.webp" alt="" width="44" height="66" loading="lazy"><cite><b>${{esc(b.author)}}</b>«${{esc(b.title)}}»</cite></footer>
<div class="qs-act"><a class="btn big" href="${{q.s}}/#read/${{q.c}}/${{q.p}}">Читать в книге</a><button class="icon" data-share="${{i}}" aria-label="Поделиться цитатой"><svg viewBox="0 0 24 24" aria-hidden="true">{I_SHARE}</svg></button></div></div></article>`}}).join('');
 if(io)io.disconnect();io=new IntersectionObserver(es=>{{for(const e of es)if(e.isIntersecting&&e.intersectionRatio>.6)setCur(+e.target.dataset.i)}},{{root:track,threshold:[.6]}});
 track.querySelectorAll('.qs-slide').forEach(s=>io.observe(s));track.scrollTo({{left:0}});setCur(0)}}
function setCur(i){{cur=i;cnt.textContent=(i+1)+' / '+list.length;const q=list[i];if(q&&bg.dataset.s!==q.s){{bg.dataset.s=q.s;bg.style.backgroundImage=`url(../covers/${{q.s}}.webp)`}}
 try{{if(navigator.userActivation&&navigator.userActivation.hasBeenActive&&navigator.vibrate&&matchMedia('(pointer:coarse)').matches)navigator.vibrate(4)}}catch(e){{}}}}
const go=d=>{{const n=Math.max(0,Math.min(list.length-1,cur+d));track.children[n].scrollIntoView({{behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',inline:'center',block:'nearest'}})}};
document.getElementById('qprev').onclick=()=>go(-1);document.getElementById('qnext').onclick=()=>go(1);
document.getElementById('qshuf').onclick=()=>{{build();toast('Колода перемешана')}};
addEventListener('keydown',e=>{{if(e.key==='ArrowRight'||e.key==='ArrowDown'){{e.preventDefault();go(1)}}else if(e.key==='ArrowLeft'||e.key==='ArrowUp'){{e.preventDefault();go(-1)}}}});
function toast(t){{let n=document.getElementById('toast');if(!n){{n=document.createElement('div');n.id='toast';n.setAttribute('role','status');document.body.append(n)}}n.textContent=t;n.classList.add('on');clearTimeout(n._t);n._t=setTimeout(()=>n.classList.remove('on'),2200)}}
track.addEventListener('click',async e=>{{const b=e.target.closest('[data-share]');if(!b)return;const q=list[+b.dataset.share],a=by[q.s],url=location.origin+location.pathname.replace(/quotes\\/$/,'')+q.s+'/#read/'+q.c+'/'+q.p,text='«'+q.t+'» — '+a.author+', «'+a.title+'»';
 try{{if(navigator.share){{await navigator.share({{text,url}});return}}}}catch(err){{if(err&&err.name==='AbortError')return}}
 try{{await navigator.clipboard.writeText(text+'\\n'+url);toast('Цитата скопирована')}}catch(err){{toast('Не удалось скопировать')}}}});
build()}})();
"""
JS_SHELF = f"""document.querySelectorAll('.book').forEach(el=>{{
  const x=st[el.dataset.slug];el.dataset.state=!x?'new':x.pct>=98?'done':'reading';if(!x)return;
  const pr=el.querySelector('.progress');pr.hidden=false;pr.querySelector('i').style.width=x.pct+'%';pr.querySelector('b').textContent=x.pct>=98?'Прочитано':x.pct+'%';
  const r=el.querySelector('.ring');r.hidden=false;r.textContent=x.pct>=98?'✓':x.pct+'%';
  const btn=el.querySelector('.btn');btn.textContent=x.pct>=98?'Перечитать':'Продолжить';btn.href=el.dataset.slug+'/#read/'+x.chapter;
}});
const fl=document.getElementById('filters');
if(fl&&Object.keys(st).length){{fl.hidden=false;
  fl.addEventListener('click',e=>{{const k=e.target.dataset.f;if(!k)return;fl.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===e.target)));
    document.querySelectorAll('.book').forEach(el=>el.hidden=k!=='all'&&el.dataset.state!==k);}});}}
"""
JS_RESUME = f"""const reading=BOOKS.filter(b=>st[b.slug]&&st[b.slug].pct<98).sort((a,b)=>st[b.slug].t-st[a.slug].t||st[b.slug].pct-st[a.slug].pct);
if(reading.length){{const b=reading[0],x=st[b.slug];
  document.getElementById('resume').innerHTML=`<a class="resume" href="${{b.slug}}/#read/${{x.chapter}}"><img src="covers/${{b.slug}}.webp" alt=""><div><small>Продолжить чтение</small><strong>${{esc(b.title)}}</strong><p>${{esc(b.author)}} · прочитано ${{x.pct}}%</p></div><span class="btn">Продолжить</span></a>`;}}
"""

# ---- страницы ----
SHELF = f"""<div data-install-banner></div>
<h1 class="ltitle" data-ltitle>Полка</h1>
<p class="lsub">{len(full)} {plural(len(full), 'книга', 'книги', 'книг')} целиком · ≈{hours} ч чтения · EPUB для любой читалки</p>
<div id="resume"></div>
<section id="shelf" aria-label="Книги">
<div class="mylib" id="mylib"><span class="mylib-t" data-offline-sum data-empty="Нажмите ↓ на обложке — книга сохранится на устройстве и откроется без сети.">Нажмите ↓ на обложке — книга сохранится на устройстве и откроется без сети.</span><span class="mylib-b"><button class="ghost" data-offline-all>Скачать все · ≈{round(sum(b['bytes'] for b in full) / 1048576)} МБ</button><button class="ghost" data-offline-clear hidden>Удалить скачанное</button><button class="ghost install-trigger" data-install-auto hidden>Установить приложение</button></span></div>
<div class="seg" id="filters" hidden><button aria-pressed="true" data-f="all">Все</button><button aria-pressed="false" data-f="reading">Читаю</button><button aria-pressed="false" data-f="new">Не начато</button><button aria-pressed="false" data-f="done">Прочитано</button></div>
<div class="grid">
{chr(10).join(card(b) for b in full)}
</div></section>
{eras(full, 'О каких годах рассказывает каждая книга — читайте историю рестлинга по порядку.')}"""

UNF = f"""<h1 class="ltitle" data-ltitle>В работе</h1>
<p class="lsub">Книги, которые переведены не до конца или переводятся прямо сейчас. Читать можно уже то, что есть.</p>
<section class="help" aria-labelledby="help-h"><div class="help-in"><span class="help-ic" aria-hidden="true"><svg viewBox="0 0 24 24">{I_WORK}</svg></span><div><h2 id="help-h">Помогите дописать</h2>
<p>Знаете английский и любите рестлинг? Возьмите одну главу — и у книги появится продолжение. Идеальный литературный текст не нужен: вёрстку, проверку орфографии и EPUB берёт на себя сайт, а готовая глава сразу попадает в читалку.</p>
<ol><li>Выберите книгу ниже и посмотрите, чего не хватает.</li><li>Напишите мне, какую главу берёте.</li><li>Пришлите перевод — ваше имя появится в выходных данных книги.</li></ol></div></div>
<a class="btn big tg" href="https://t.me/andreev" rel="noopener" target="_blank"><svg viewBox="0 0 24 24" aria-hidden="true">{I_TG}</svg>Написать в Telegram</a></section>
<section id="unfinished" aria-label="Неполные книги"><div class="grid">
{chr(10).join(card(b) for b in partial)}
</div></section>
{eras(partial, 'О каких годах рассказывают эти книги — они ждут продолжения.')}"""

QPAGE = f"""<div class="qbg" id="qbg" aria-hidden="true"></div><div class="qshade" aria-hidden="true"></div>
<main class="qmain" aria-label="Карусель цитат"><div class="qtrack" id="qtrack" tabindex="0"></div>
<button class="qarrow l" id="qprev" aria-label="Предыдущая цитата"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button><button class="qarrow r" id="qnext" aria-label="Следующая цитата"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button></main>"""
QACT = f'<span class="qcount" id="qcount" aria-live="polite"></span><button class="icon" id="qshuf" aria-label="Перемешать"><svg viewBox="0 0 24 24" aria-hidden="true">{I_SHUF}</svg></button>'

_DESC = f'{len(books)} автобиографий звёзд рестлинга в переводах VSplanet.net: читать онлайн бесплатно, без регистрации, или скачать EPUB.'
_stub = f'''<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>VSplanet Книги</title><meta name="robots" content="noindex"><link rel="canonical" href="{BASE}"><meta http-equiv="refresh" content="0;url=../"><script>location.replace('../')</script></head><body><a href="../">Полка</a></body></html>'''
PAGES = {
    '': page('', 'VSplanet Книги — автобиографии рестлеров на русском', _DESC, wrap(SHELF, ABOUT), JS_COMMON + JS_RESUME + JS_SHELF, 'shelf', f'<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>'),
    'unfinished/': page('unfinished/', 'В работе — VSplanet Книги', 'Книги, которые переведены не до конца или переводятся сейчас. Можно читать уже готовое и помочь дописать.', wrap(UNF, MINI_FOOT), JS_COMMON + JS_SHELF, 'unfinished'),
    'quotes/': page('quotes/', 'Цитаты из книг — VSplanet Книги', 'Строки из автобиографий рестлеров: листайте и открывайте то самое место в книге.', QPAGE, JS_COMMON + JS_QUOTES, 'quotes', act=QACT, body_cls='shelf-body q-body'),
    'shelf/': _stub,
}

for _p, _h in PAGES.items():
    (OUT / _p).mkdir(parents=True, exist_ok=True); (OUT / _p / 'index.html').write_text(_h)
_shell = ['./', 'unfinished/', 'quotes/', f'shared/{SHELF_CSS}', f'pwa.js?v={PWA_V}', 'shared/vsplanet-logo.png', 'shared/fonts/geologica-cyr.woff2', 'shared/fonts/geologica-lat.woff2', 'shared/fonts/literata-cyrillic-normal.woff2', 'shared/fonts/literata-cyrillic-italic.woff2', 'shared/fonts/literata-latin-normal.woff2', 'shared/fonts/literata-latin-italic.woff2', f'shared/{SH[2]}', f'shared/{SH[3]}', 'icons/app-192.png'] + [f'covers/{b["slug"]}.webp' for b in books]
(OUT / 'version.json').write_text(json.dumps({'version': shared.version()[0], 'name': shared.version()[1], 'label': shared.version_label()}, ensure_ascii=False))
_seed = json.dumps(_shell) + PWA_V + (T / 'sw-app.js').read_text() + shared.version_label() + ''.join(hashlib.sha256(h.encode()).hexdigest()[:8] for h in PAGES.values())
(OUT / 'sw.js').write_text((T / 'sw-app.js').read_text().replace('%SHELL%', json.dumps(_shell)).replace('%SHELL_V%', hashlib.sha256(_seed.encode()).hexdigest()[:12]))
(OUT / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + ''.join(f'<url><loc>{BASE}{p}</loc></url>' for p in PAGES if p != 'shelf/') + '</urlset>\n')

# og.jpg — веер обложек
from playwright.sync_api import sync_playwright
uri = lambda p: 'data:image/jpeg;base64,' + base64.b64encode(p.read_bytes()).decode()
font = lambda f: 'url(data:font/woff2;base64,' + base64.b64encode((OUT / f).read_bytes()).decode() + ')'
n = len(full)
covers = ''.join(f'<img src="{uri(OUT / "covers" / (b["slug"] + ".jpg"))}" style="left:{560 + i * 82}px;transform:rotate({(i - (n - 1) / 2) * 3.2:.1f}deg);z-index:{i}">' for i, b in enumerate(full))
OG = f'''<html><head><style>@font-face{{font-family:G;src:{font("shared/fonts/geologica-cyr.woff2")};unicode-range:U+0400-045F}}@font-face{{font-family:G;src:{font("shared/fonts/geologica-lat.woff2")};unicode-range:U+0000-00FF,U+2000-206F}}
body{{margin:0;width:1200px;height:630px;background:radial-gradient(60% 80% at 75% 50%,#2f5b8f55,transparent),#03060c;color:#fff;font-family:G;position:relative;overflow:hidden}}
img.c{{}}img{{position:absolute;top:150px;width:220px;border-radius:4px 8px 8px 4px;box-shadow:0 30px 60px -10px #000,0 0 0 1px #ffffff18;transform-origin:50% 120%}}
.t{{position:absolute;left:64px;top:64px;width:470px}}.l{{display:flex;gap:14px;align-items:center}}.l img{{position:static;width:58px;box-shadow:none}}.l b{{font-size:26px;display:block;line-height:1}}.l small{{font-size:14px;letter-spacing:.14em;text-transform:uppercase;font-weight:600}}
h1{{font-size:62px;line-height:.98;letter-spacing:-.045em;margin:70px 0 0;font-weight:800}}p{{font-size:24px;color:#9fbcd4;margin:22px 0 0}}</style></head><body>
<div class="t"><div class="l"><img src="{uri(OUT / 'shared' / 'vsplanet-logo.png').replace('jpeg', 'png')}"><span><b>VSplanet</b><small>Книги</small></span></div><h1>Рестлинг, рассказанный изнутри</h1><p>{n} автобиографий · ≈{hours} часов чтения</p></div>{covers}</body></html>'''
with sync_playwright() as p:
    br = p.chromium.launch(); pg = br.new_page(viewport={'width': 1200, 'height': 630})
    pg.set_content(OG); pg.wait_for_timeout(500); pg.screenshot(path=str(OUT / 'og.jpg'), type='jpeg', quality=86); br.close()
print(f'shelf: {n} books, {total_words} words → {OUT}')
(OUT / 'shared' / '.names').unlink(missing_ok=True)
for _j in (OUT / 'covers').glob('*.jpg'): _j.unlink()     # jpg нужны только для og.jpg при сборке, на сайт не выкладываются
