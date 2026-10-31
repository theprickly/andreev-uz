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
    accent = m[1] if m else '#ee2a24'                       # у Эдди своя красная тема
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
    return f'''<article class="book" data-slug="{b['slug']}" style="--a:{b['accent']}">
 <a class="cover" href="{b['slug']}/" aria-label="{E(b['author'])} — {E(b['title'])}"><img src="covers/{b['slug']}.webp" alt="" width="480" height="720" decoding="async" loading="{'eager' if b['slug'] in EAGER else 'lazy'}"><span class="ring" hidden></span>{badge(b)}</a>
 <div class="meta"><p class="author">{E(b['author'])}</p><h3><a href="{b['slug']}/">{E(b['title'])}</a></h3>
 <p class="tag">{E(b['tag'])}</p>
 {f'<p class="orig"><i lang="en">{E(b["orig"]["title"])}</i> · {b["orig"]["year"]}</p>' if b['orig'] else ''}
 {f'<p class="inc {b["inc"]["kind"]}"><i></i>{E(b["inc"]["label"])}</p>' if b['inc'] else ''}
 <p class="facts">{b['chapters']} {plural(b['chapters'], 'раздел', 'раздела', 'разделов')} · ≈{round(mins / 60)} ч чтения</p>
 <div class="progress" hidden><span><i></i></span><b></b></div>
 <div class="actions"><a class="btn" href="{b['slug']}/">Читать</a>{offline_btn(b)}{f'<a class="ghost" href="{b["epub"]}" download>EPUB</a>' if b['epub'] else ''}</div></div>
</article>'''

y0, y1 = 1940, 2010
def era_row(b):
    s, e = b['era']; left = (s - y0) / (y1 - y0) * 100; width = (e - s) / (y1 - y0) * 100
    return (f'<a class="era" href="{b["slug"]}/" style="--a:{b["accent"]};--l:{left:.2f}%;--w:{width:.2f}%">'
            f'<span class="era-name">{E(ERA_LABEL.get(b["slug"]) or ("Смерть WCW" if b["slug"] == "wcw" else b["author"]))}</span><span class="era-bar"><span>{s}–{e}</span></span></a>')

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

I_HOME = '<path d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4v-5h-6v5H5a1 1 0 0 1-1-1z"/>'
I_BOOKS = '<path d="M5 4h4v16H5zM11 4h4v16h-4z"/><path d="m17 6.5 3.7-1 2 14-3.7 1z" transform="translate(-1.5 0)"/>'
I_QUOTE = '<path d="M7 7h4v5c0 3-1.5 4.7-4 5.5M14 7h4v5c0 3-1.5 4.7-4 5.5"/>'
I_WORK = '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'
FAB = '<button class="tb-fab install-trigger" type="button" data-install-auto hidden aria-label="Установить приложение"><svg viewBox="0 0 24 24" aria-hidden="true" style="fill:none"><path d="M12 4v11m-4.5-4.5L12 15l4.5-4.5M5 20h14"/></svg></button>'
def tabbar(cur):
    tabs = [('home', './', 'Главная', I_HOME), ('shelf', 'shelf/', 'Полка', I_BOOKS), ('quotes', 'quotes/', 'Цитаты', I_QUOTE), ('unfinished', 'unfinished/', 'В работе', I_WORK)]
    return ('<nav class="tabbar" data-tabbar data-home="./" aria-label="Разделы"><div class="tb-pill"><i class="tb-ind"></i>' + ''.join(
        f'<a class="tb-tab" href="{h}"{" data-cur" if k == cur else ""}><svg viewBox="0 0 24 24" aria-hidden="true">{ic}</svg><span>{t}</span></a>' for k, h, t, ic in tabs) + '</div>' + FAB + '</nav>')

def header(cur):
    chips = ''.join(f'<a class="chip" href="{h}"{" aria-current=page" if k == cur else ""}>{t}</a>' for k, h, t in [('shelf', 'shelf/', 'Полка'), ('quotes', 'quotes/', 'Цитаты'), ('unfinished', 'unfinished/', 'Неполные')])
    return ('<header class="top"><a class="brand" href="./"><img src="shared/vsplanet-logo.png" alt="" width="911" height="648"><span><b>VSplanet</b><small>Книги</small></span></a>'
            f'<span class="nav">{chips}</span></header>')

BACK = '<a class="back" href="./"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>Главная</a>'
MINI_FOOT = f'<footer class="credits mini"><div class="cr-end"><span>Сайт собрал Никита Андреев, 2026</span><span class="app-ver">Версия {shared.version_label()}</span></div></footer>'

def page(path, title, desc, main, js, cur, extra=''):
    P = '../' if path else ''
    h = f"""<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{E(title)}</title><meta name="description" content="{E(desc)}">
<link rel="canonical" href="{BASE}{path}"><meta name="theme-color" content="#03060c"><link rel="manifest" href="manifest.webmanifest"><link rel="apple-touch-icon" href="icons/app-180.png"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="Книги"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta property="og:type" content="website"><meta property="og:url" content="{BASE}{path}"><meta property="og:title" content="{E(title)}"><meta property="og:description" content="{E(desc)}"><meta property="og:image" content="{BASE}og.jpg"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="shared/vsplanet-logo.png"><link rel="preload" href="shared/fonts/geologica-cyr.woff2" as="font" type="font/woff2" crossorigin>{extra}
<link rel="stylesheet" href="shared/{SHELF_CSS}"><link rel="stylesheet" href="shared/{SH[2]}"><script src="shared/{SH[3]}" defer></script></head><body class="shelf-body" data-page="{cur}">
<div class="glow"></div>
<div class="wrap">
{header(cur)}
<main>
{main}
</main>
{tabbar(cur)}
{MINI_FOOT if cur != 'home' else ABOUT}
</div>
<script>
{js}
</script>
<script src="pwa.js?v={PWA_V}" defer></script>
</body></html>"""
    return rel(h, P)

ABOUT = f"""<footer class="credits" id="about">
<div class="cr-brand"><img src="shared/vsplanet-logo.png" alt="" width="911" height="648" loading="lazy"><div><b>VSplanet Книги</b><p>Автобиографии рестлеров — в переводах, которые сделали фанаты для фанатов.</p></div></div>
<div class="cr-grid">
<div><h4>О проекте</h4><p>С 2011 года читатели VSplanet переводят книги звёзд рестлинга. Здесь они собраны в одной читалке: закладки, поиск по тексту, офлайн-режим и EPUB. Регистрации нет, а прогресс чтения хранится только в вашем браузере.</p></div>
<div><h4>Присоединяйтесь</h4><p>Недопереведённые книги ждут продолжения. Возьмите главу — и ваше имя появится в выходных данных книги.</p><p><a class="cr-link" href="https://vsplanet.net/" rel="noopener">Редакция VSplanet.net →</a></p></div>
</div>
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
(()=>{{const by=Object.fromEntries(BOOKS.map(b=>[b.slug,b])),el=document.getElementById('qband'),cnt=document.getElementById('qcount');
const shuf=a=>{{a=a.slice();for(let i=a.length-1;i>0;i--){{const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}}return a}};
let list=[],i=0,timer=null,paused=false;
function mix(){{const g={{}};shuf(QUOTES).forEach(q=>(g[q.s]=g[q.s]||[]).push(q));const keys=shuf(Object.keys(g)),out=[];
 for(let r=0;out.length<12&&r<3;r++)for(const k of keys){{if(g[k][r]&&out.length<12)out.push(g[k][r]);}}list=shuf(out);i=0}}
function show(n,anim=true){{i=(n+list.length)%list.length;const q=list[i],b=by[q.s];
 const html=`<blockquote>${{esc(q.t)}}</blockquote><figcaption><img src="covers/${{q.s}}.webp" alt="" loading="lazy" width="42" height="63"><cite><b>${{esc(b.author)}}</b>«${{esc(b.title)}}»</cite><a class="go" href="${{q.s}}/#read/${{q.c}}/${{q.p}}">Открыть в книге →</a></figcaption>`;
 cnt.textContent=(i+1)+' / '+list.length;if(!anim||matchMedia('(prefers-reduced-motion:reduce)').matches){{el.innerHTML=html;return}}
 el.classList.add('out');setTimeout(()=>{{el.innerHTML=html;el.classList.remove('out')}},180)}}
function auto(){{clearInterval(timer);if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;timer=setInterval(()=>{{if(!paused&&!document.hidden)show(i+1)}},14000)}}
const go=d=>{{show(i+d);auto()}};
document.getElementById('qnext').onclick=()=>go(1);document.getElementById('qprev').onclick=()=>go(-1);
document.getElementById('qshuf').onclick=()=>{{mix();show(0);auto()}};
const sec=document.getElementById('quotes');sec.addEventListener('mouseenter',()=>paused=true);sec.addEventListener('mouseleave',()=>paused=false);sec.addEventListener('focusin',()=>paused=true);sec.addEventListener('focusout',()=>paused=false);
mix();show(0,false);auto()}})();
(()=>{{const by=Object.fromEntries(BOOKS.map(b=>[b.slug,b]));
document.getElementById('qlist').innerHTML=QUOTES.map(q=>{{const b=by[q.s];return `<article class="qitem" style="--a:${{b.accent}}"><blockquote>${{esc(q.t)}}</blockquote><footer><img src="covers/${{q.s}}.webp" alt="" loading="lazy" width="32" height="48"><span><b>${{esc(b.author)}}</b><br>«${{esc(b.title)}}»</span><a href="${{q.s}}/#read/${{q.c}}/${{q.p}}">В книге →</a></footer></article>`}}).join('')}})();
"""
JS_SHELF = f"""document.querySelectorAll('.book').forEach(el=>{{
  const x=st[el.dataset.slug];el.dataset.state=!x?'new':x.pct>=98?'done':'reading';if(!x)return;
  const pr=el.querySelector('.progress');pr.hidden=false;pr.querySelector('i').style.width=x.pct+'%';pr.querySelector('b').textContent=x.pct>=98?'Прочитано':x.pct+'%';
  const r=el.querySelector('.ring');r.hidden=false;r.textContent=x.pct>=98?'✓':x.pct+'%';
  const btn=el.querySelector('.btn');btn.textContent=x.pct>=98?'Перечитать':'Продолжить';btn.href=el.dataset.slug+'/#read/'+x.chapter;
}});
if(Object.keys(st).length){{const f=document.getElementById('filters');f.hidden=false;
  f.addEventListener('click',e=>{{const k=e.target.dataset.f;if(!k)return;f.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===e.target)));
    document.querySelectorAll('.book').forEach(el=>el.hidden=k!=='all'&&el.dataset.state!==k);}});}}
"""
JS_RESUME = f"""const reading=BOOKS.filter(b=>st[b.slug]&&st[b.slug].pct<98).sort((a,b)=>st[b.slug].t-st[a.slug].t||st[b.slug].pct-st[a.slug].pct);
if(reading.length){{const b=reading[0],x=st[b.slug];
  document.getElementById('resume').innerHTML=`<a class="resume" style="--a:${{b.accent}}" href="${{b.slug}}/#read/${{x.chapter}}"><img src="covers/${{b.slug}}.webp" alt=""><div><small>Продолжить чтение</small><strong>${{esc(b.title)}}</strong><p>${{esc(b.author)}} · прочитано ${{x.pct}}%</p></div><span class="btn">Продолжить</span></a>`;}}
"""

# ---- страницы ----
_sample = sorted((q for q in QUOTES if 60 < len(q['t']) < 150), key=lambda q: len(q['t']))
_sample = _sample[len(_sample) // 2]['t'] if _sample else QUOTES[0]['t']
_fan = ''.join(f'<img src="covers/{b["slug"]}.webp" alt="" loading="lazy" width="160" height="240" style="left:{i * 15}%;transform:rotate({(i - 2) * 4}deg);z-index:{i}">' for i, b in enumerate(full[:5]))
_mini = ''.join(f'<img src="covers/{b["slug"]}.webp" alt="" loading="lazy" width="46" height="69">' for b in partial)
HERO = f"""<div class="hero"><h1>Рестлинг, рассказанный изнутри</h1>

<ul class="stats"><li><b>{len(full)}</b><span>{plural(len(full), 'книга', 'книги', 'книг')} целиком</span></li><li><b>{len(partial)}</b><span>{plural(len(partial), 'неполная', 'неполные', 'неполных')}</span></li><li><b>{sum(b['chapters'] for b in books)}</b><span>глав и разделов</span></li><li><b>≈{hours} ч</b><span>чтения</span></li><li><b>EPUB</b><span>для любой читалки</span></li></ul>
<div id="resume"></div></div>"""
MAIN = f"""<div data-install-banner></div>
{HERO}
<section class="doors" aria-label="Разделы">
<a class="door door-shelf" href="shelf/"><div><span class="eyebrow">Читать · скачивать</span><h2>Полка</h2><p>{len(full)} {plural(len(full), 'книга', 'книги', 'книг')} целиком: читайте онлайн, сохраняйте для чтения без сети или скачивайте EPUB. Прогресс запоминается.</p><span class="door-go">Открыть полку →</span></div><div class="fan" aria-hidden="true">{_fan}</div></a>
<a class="door door-quotes" href="quotes/"><span class="eyebrow">Строка из книги</span><blockquote>{E(_sample)}</blockquote><span class="door-go">Все цитаты →</span></a>
<a class="door door-unf" href="unfinished/"><span class="badge ongoing">Переводятся</span><div><h2>Неполные переводы</h2><p>{len(partial)} {plural(len(partial), 'книга', 'книги', 'книг')} ждут продолжения. Можно читать уже переведённое — и помочь дописать.</p></div><div class="mini" aria-hidden="true">{_mini}</div><span class="door-go">Посмотреть →</span></a>
</section>"""
SHELF = f"""{BACK}<div class="phead"><h1 class="pt">Полка</h1><p class="sub">Прогресс сохраняется в вашем браузере и подтягивается сюда сам.</p></div>
<section id="shelf" aria-label="Книги">
<div class="mylib" id="mylib"><span class="mylib-t" data-offline-sum data-empty="Нажмите ↓ на обложке — книга сохранится на устройстве и откроется без сети.">Нажмите ↓ на обложке — книга сохранится на устройстве и откроется без сети.</span><span class="mylib-b"><button class="ghost" data-offline-all>Скачать все полные · ≈{round(sum(b['bytes'] for b in full) / 1048576)} МБ</button><button class="ghost" data-offline-clear hidden>Удалить скачанное</button><button class="ghost install-trigger" data-install-auto hidden>Установить приложение</button></span></div>
<div class="filters" id="filters" hidden><button aria-pressed="true" data-f="all">Все</button><button aria-pressed="false" data-f="reading">Читаю</button><button aria-pressed="false" data-f="new">Не начато</button><button aria-pressed="false" data-f="done">Прочитано</button></div>
<div class="grid">
{chr(10).join(card(b) for b in full)}
</div></section>
<section id="eras" aria-labelledby="eras-h"><h2 id="eras-h">Эпохи</h2><p class="sub">О каких годах рассказывает каждая книга — читайте историю рестлинга по порядку.</p>
<div class="eras">
{chr(10).join(era_row(b) for b in sorted(books, key=lambda b: b['era']) if b['era'])}
<div class="axis"><span></span><div>{''.join(f'<span>{y}</span>' for y in range(y0, y1 + 1, 10))}</div></div>
</div></section>"""

UNF = f"""{BACK}<section id="unfinished" aria-labelledby="unf-h"><h1 class="pt" id="unf-h">Неполные переводы</h1>
<p class="sub">Эти книги начали переводить, но не довели до конца, или переводят прямо сейчас. Читать можно уже то, что есть.</p>
<div class="help"><div><h3>Помогите дописать</h3>
<p>Знаете английский и любите рестлинг? Возьмите одну главу — и у книги появится продолжение. Идеальный литературный текст не нужен: вёрстку, проверку орфографии и EPUB берёт на себя сайт, готовая глава сразу попадает в читалку.</p>
<ol><li>Выберите книгу ниже и посмотрите, чего не хватает.</li><li>Напишите в редакцию VSplanet.net, какую главу берёте.</li><li>Пришлите перевод — и ваше имя появится в выходных данных книги.</li></ol></div>
<a class="btn" href="https://vsplanet.net/" rel="noopener">Предложить помощь</a></div>
<div class="grid">
{chr(10).join(card(b) for b in partial)}
</div></section>"""
QPAGE = f"""{BACK}<div class="phead"><h1 class="pt">Цитаты</h1><p class="sub">Строки из книг. Нажмите «В книге» — и откроется то самое место.</p></div>
<section id="quotes" class="qs" aria-label="Цитата из книги"><div class="qhead"><span class="eyebrow">Случайная строка</span><span class="qctl"><button id="qprev" aria-label="Предыдущая">←</button><span id="qcount" aria-hidden="true"></span><button id="qnext" aria-label="Следующая">→</button><button id="qshuf" class="qshuf">Другая</button></span></div>
<figure class="qband" id="qband" aria-live="polite"></figure></section>
<section aria-labelledby="ql-h"><h2 id="ql-h">Все цитаты</h2><div class="qlist" id="qlist"></div></section>"""

_DESC = f'{len(books)} автобиографий звёзд рестлинга в переводах VSplanet.net: читать онлайн бесплатно, без регистрации, или скачать EPUB.'
PAGES = {
    '': page('', 'VSplanet Книги — автобиографии рестлеров на русском', _DESC, MAIN, JS_COMMON + JS_RESUME, 'home', f'<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>'),
    'shelf/': page('shelf/', 'Полка — VSplanet Книги', f'{len(full)} книг целиком: читать онлайн, сохранять для чтения без сети, скачивать EPUB.', SHELF, JS_COMMON + JS_SHELF, 'shelf'),
    'quotes/': page('quotes/', 'Цитаты из книг — VSplanet Книги', 'Строки из автобиографий рестлеров: нажмите, чтобы открыть то самое место в книге.', QPAGE, JS_COMMON + JS_QUOTES, 'quotes'),
    'unfinished/': page('unfinished/', 'Неполные переводы — VSplanet Книги', 'Книги, которые переведены не до конца или переводятся сейчас. Можно читать уже готовое и помочь дописать.', UNF, JS_COMMON + JS_SHELF, 'unfinished'),
}
for _p, _h in PAGES.items():
    (OUT / _p).mkdir(parents=True, exist_ok=True); (OUT / _p / 'index.html').write_text(_h)
_shell = ['./', 'shelf/', 'quotes/', 'unfinished/', f'shared/{SHELF_CSS}', f'pwa.js?v={PWA_V}', 'shared/vsplanet-logo.png', 'shared/fonts/geologica-cyr.woff2', 'shared/fonts/geologica-lat.woff2', 'shared/fonts/literata-cyrillic-normal.woff2', 'shared/fonts/literata-cyrillic-italic.woff2', 'shared/fonts/literata-latin-normal.woff2', 'shared/fonts/literata-latin-italic.woff2', f'shared/{SH[2]}', f'shared/{SH[3]}', 'icons/app-192.png'] + [f'covers/{b["slug"]}.webp' for b in books]
(OUT / 'version.json').write_text(json.dumps({'version': shared.version()[0], 'name': shared.version()[1], 'label': shared.version_label()}, ensure_ascii=False))
_seed = json.dumps(_shell) + PWA_V + (T / 'sw-app.js').read_text() + shared.version_label() + ''.join(hashlib.sha256(h.encode()).hexdigest()[:8] for h in PAGES.values())
(OUT / 'sw.js').write_text((T / 'sw-app.js').read_text().replace('%SHELL%', json.dumps(_shell)).replace('%SHELL_V%', hashlib.sha256(_seed.encode()).hexdigest()[:12]))
(OUT / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + ''.join(f'<url><loc>{BASE}{p}</loc></url>' for p in PAGES) + '</urlset>\n')

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
