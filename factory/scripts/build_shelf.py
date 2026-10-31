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
                  'chapters': len(words), 'epub': f'{slug}/{epub}' if epub else None, 'orig': cfg.get('original') or {}, 'inc': cfg.get('incomplete'), 'era': ERAS.get(slug), 'tag': TAGLINE.get(slug, '')})

books.sort(key=lambda b: ((b['orig'] or {}).get('year', 9999), b['slug']))
EAGER = {b['slug'] for b in books if not b['inc']}.intersection({b['slug'] for b in books[:4]})
full = [b for b in books if not b['inc']]; partial = [b for b in books if b['inc']]
total_words = sum(sum(b['words']) for b in books)
hours = round(total_words / 180 / 60)
shutil.copy(T / 'assets' / 'vsplanet-logo.png', OUT / 'vsplanet-logo.png')
for f in ('geologica-cyr.woff2', 'geologica-lat.woff2'):
    shutil.copy(T / 'assets' / 'fonts' / f, OUT / f)

def plural(n, a, b, c):
    n = abs(n) % 100; n1 = n % 10
    return c if 10 < n < 20 else a if n1 == 1 else b if 2 <= n1 <= 4 else c

def card(b):
    mins = round(sum(b['words']) / 180)
    return f'''<article class="book" data-slug="{b['slug']}" style="--a:{b['accent']}">
 <a class="cover" href="{b['slug']}/" aria-label="{E(b['author'])} — {E(b['title'])}"><img src="covers/{b['slug']}.webp" alt="" width="480" height="720" decoding="async" loading="{'eager' if b['slug'] in EAGER else 'lazy'}"><span class="ring" hidden></span></a>
 <div class="meta"><p class="author">{E(b['author'])}</p><h3><a href="{b['slug']}/">{E(b['title'])}</a></h3>
 <p class="tag">{E(b['tag'])}</p>
 {f'<p class="orig"><i lang="en">{E(b["orig"]["title"])}</i> · {b["orig"]["year"]}</p>' if b['orig'] else ''}
 {f'<p class="inc {b["inc"]["kind"]}"><i></i>{E(b["inc"]["label"])}</p>' if b['inc'] else ''}
 <p class="facts">{b['chapters']} {plural(b['chapters'], 'раздел', 'раздела', 'разделов')} · ≈{round(mins / 60)} ч чтения</p>
 <div class="progress" hidden><span><i></i></span><b></b></div>
 <div class="actions"><a class="btn" href="{b['slug']}/">Читать</a>{f'<a class="ghost" href="{b["epub"]}" download>EPUB</a>' if b['epub'] else ''}</div></div>
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
                    'url': f'https://andreev.uz/books/{b["slug"]}/', 'image': f'{BASE}covers/{b["slug"]}.jpg'}}
          for i, b in enumerate(books)]}}
QUOTES = [dict(s=b['slug'], **x) for b in books for x in b['q']]
_tr = {}
for _b in books:
    if _b.get('translator'): _tr.setdefault(_b['translator'], []).append(_b['title'])
credits_html = ''.join(f'<dt>{n}</dt><dd>{" · ".join(t)}</dd>' for n, t in _tr.items())
_rest = [b['title'] for b in books if not b.get('translator')]
if _rest: credits_html += '<dt>Читатели VSplanet.net</dt><dd>' + ' · '.join(_rest) + '</dd>'
js_books = [{k: b[k] for k in ('slug', 'key', 'title', 'author', 'accent', 'words')} for b in books]

PAGE = f'''<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>VSplanet Книги — автобиографии рестлеров на русском</title>
<meta name="description" content="{len(books)} автобиографий звёзд рестлинга в переводах VSplanet.net: Эдди Герреро, Брет Харт, Крис Джерико, Брок Леснар и другие. Читайте онлайн без регистрации или скачайте EPUB.">
<link rel="canonical" href="{BASE}"><meta name="theme-color" content="#03060c">
<meta property="og:type" content="website"><meta property="og:url" content="{BASE}"><meta property="og:title" content="VSplanet Книги — автобиографии рестлеров на русском">
<meta property="og:description" content="{len(books)} книг, ≈{hours} часов чтения. Онлайн и в EPUB."><meta property="og:image" content="{BASE}og.jpg"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="vsplanet-logo.png"><link rel="preload" href="geologica-cyr.woff2" as="font" type="font/woff2" crossorigin>
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
<style>
@font-face{{font-family:G;src:url(geologica-cyr.woff2) format("woff2");font-weight:100 900;font-display:swap;unicode-range:U+0400-045F,U+2116}}
@font-face{{font-family:G;src:url(geologica-lat.woff2) format("woff2");font-weight:100 900;font-display:swap;unicode-range:U+0000-00FF,U+2000-206F,U+20AC}}
:root{{--bg:#03060c;--s1:#0b111d;--s2:#121a2a;--line:#ffffff14;--text:#f2f4f8;--mute:#8e98a8;--steel:#7fa6d4;--fill:linear-gradient(180deg,#c3d8ef 0%,#8fb2db 45%,#5f87b9 100%);color-scheme:dark}}
*{{box-sizing:border-box}}[hidden]{{display:none!important}}html{{-webkit-text-size-adjust:100%}}
body{{margin:0;background:var(--bg);color:var(--text);font:400 16px/1.5 G,system-ui,sans-serif;-webkit-font-smoothing:antialiased;overflow-x:hidden}}
a{{color:inherit;text-decoration:none}}img{{display:block;max-width:100%}}
.wrap{{width:min(1180px,100% - 32px);margin:0 auto}}
.glow{{position:absolute;inset:-20% 0 auto;height:720px;background:radial-gradient(60% 60% at 70% 30%,#2f5b8f40,transparent 70%);pointer-events:none;z-index:-1}}
header.top{{display:flex;align-items:center;justify-content:space-between;padding:22px 0}}
.brand{{display:flex;align-items:center;gap:12px}}.brand img{{width:46px;height:auto}}.brand b{{display:block;font-size:19px;font-weight:700;letter-spacing:-.02em;line-height:1}}.brand small{{display:block;font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;margin-top:3px}}
.chip{{display:inline-flex;align-items:center;height:36px;padding:0 15px;border-radius:999px;font-size:14px;font-weight:500;background:#ffffff0f;border:1px solid var(--line)}}
.hero{{padding:56px 0 28px}}
.eyebrow{{color:var(--steel);font-weight:600;font-size:14px;letter-spacing:.02em;margin:0 0 14px}}
h1{{font-size:clamp(36px,6vw,72px);line-height:.98;letter-spacing:-.045em;font-weight:800;margin:0;max-width:13ch}}
.lead{{color:#c9d0db;font-size:clamp(17px,2vw,20px);max-width:56ch;margin:20px 0 0}}
.stats{{display:flex;flex-wrap:wrap;gap:10px 28px;margin:28px 0 0;padding:0;list-style:none}}.stats b{{display:block;font-size:28px;font-weight:700;letter-spacing:-.03em}}.stats span{{color:var(--mute);font-size:14px}}
.resume{{display:grid;grid-template-columns:auto 1fr auto;gap:20px;align-items:center;margin:36px 0 0;padding:16px 20px 16px 16px;border-radius:22px;background:linear-gradient(110deg,color-mix(in srgb,var(--a) 22%,var(--s1)),var(--s1) 60%);border:1px solid color-mix(in srgb,var(--a) 35%,transparent)}}
.resume img{{width:64px;border-radius:6px;box-shadow:0 10px 30px #0008}}.resume small{{color:var(--mute);font-size:13px}}.resume strong{{display:block;font-size:19px;letter-spacing:-.02em;line-height:1.2;margin:2px 0}}.resume p{{margin:0;color:#c9d0db;font-size:14px}}
.btn{{display:inline-flex;align-items:center;justify-content:center;height:40px;padding:0 18px;border-radius:999px;font-weight:600;font-size:14px;color:#06101f;background:var(--fill);white-space:nowrap}}
.book .btn{{background:var(--a);color:#fff;text-shadow:0 1px 1px #0004}}.ghost{{display:inline-flex;align-items:center;height:40px;padding:0 14px;border-radius:999px;font-size:14px;font-weight:500;color:var(--mute);border:1px solid var(--line)}}.ghost:hover{{color:var(--text)}}
section{{padding:48px 0 0}}h2{{font-size:clamp(24px,3vw,32px);letter-spacing:-.03em;margin:0 0 6px}}.sub{{color:var(--mute);margin:0 0 24px;font-size:15px}}
.filters{{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 24px}}.filters button{{font:inherit;font-size:14px;height:34px;padding:0 14px;border-radius:999px;border:1px solid var(--line);background:transparent;color:var(--mute);cursor:pointer}}.filters button[aria-pressed=true]{{background:#ffffff14;color:var(--text);border-color:#ffffff30}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:40px 28px}}
.book{{display:flex;flex-direction:column;gap:16px}}.book[hidden]{{display:none}}
.cover{{position:relative;display:block;perspective:900px}}.cover img{{width:100%;height:auto;aspect-ratio:2/3;object-fit:cover;border-radius:4px 10px 10px 4px;box-shadow:0 24px 50px -18px #000,0 0 0 1px #ffffff12,inset 0 0 0 1px #fff2;transition:transform .5s cubic-bezier(.2,.7,.2,1),box-shadow .5s}}
.cover::after{{content:"";position:absolute;inset:auto 10% -10px;height:40px;background:radial-gradient(closest-side,color-mix(in srgb,var(--a) 55%,transparent),transparent);filter:blur(10px);opacity:0;transition:opacity .5s;z-index:-1}}
.book:hover .cover img{{transform:rotateY(-10deg) translateY(-6px);box-shadow:20px 34px 60px -20px #000,0 0 0 1px #ffffff18}}.book:hover .cover::after{{opacity:1}}
.ring{{position:absolute;top:10px;right:10px;padding:4px 9px;border-radius:999px;font-size:12px;font-weight:700;background:#000b;backdrop-filter:blur(6px);color:#fff;border:1px solid color-mix(in srgb,var(--a) 60%,transparent)}}
.meta{{display:flex;flex-direction:column;gap:6px;flex:1}}.author{{margin:0;color:var(--a);font-size:13px;font-weight:600;filter:brightness(1.25)}}
h3{{margin:0;font-size:22px;line-height:1.1;letter-spacing:-.03em}}.tag{{margin:0;color:#c3cad5;font-size:14.5px;line-height:1.45}}.nav{{display:flex;gap:8px}}
.inc{{margin:0;display:flex;gap:8px;align-items:flex-start;font-size:13px;line-height:1.35;color:#d7c9a3}}.inc i{{flex:none;width:8px;height:8px;margin-top:5px;border-radius:50%;background:#e8b84a}}.inc.ongoing{{color:#a9d8b8}}.inc.ongoing i{{background:#4fcf86;box-shadow:0 0 0 3px #4fcf8633}}
.help{{display:grid;grid-template-columns:1fr auto;gap:20px 32px;align-items:center;margin:0 0 36px;padding:24px;border-radius:22px;background:linear-gradient(115deg,#2f5b8f33,var(--s1) 70%);border:1px solid #7fa6d433}}.help h3{{font-size:24px;margin:0 0 8px}}.help p{{margin:0 0 12px;color:#c9d0db;max-width:62ch}}.help ol{{margin:0;padding-left:20px;color:#c9d0db;font-size:15px}}.help li+li{{margin-top:4px}}
@media (max-width:640px){{.help{{grid-template-columns:1fr}}}}
.orig{{margin:0;color:#aab3c0;font-size:13px;line-height:1.4}}.orig i{{font-style:italic}}.facts{{margin:0;color:var(--mute);font-size:13px}}
.progress{{display:flex;align-items:center;gap:10px;font-size:13px;color:var(--mute)}}.progress span{{flex:1;height:4px;border-radius:9px;background:#ffffff14;overflow:hidden}}.progress i{{display:block;height:100%;background:var(--a);border-radius:inherit}}
.actions{{display:flex;gap:8px;margin-top:auto;padding-top:8px}}
.eras{{display:flex;flex-direction:column;gap:10px;padding:22px;border-radius:22px;background:var(--s1);border:1px solid var(--line)}}
.era{{display:grid;grid-template-columns:150px 1fr;gap:14px;align-items:center;font-size:14px}}.era-name{{color:#c9d0db;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
.era-bar{{position:relative;height:26px;border-radius:8px;background:repeating-linear-gradient(90deg,#ffffff08 0 1px,transparent 1px calc(100%/7))}}
.era-bar span{{position:absolute;left:var(--l);width:var(--w);top:0;bottom:0;border-radius:8px;background:linear-gradient(90deg,color-mix(in srgb,var(--a) 85%,#fff 0%),color-mix(in srgb,var(--a) 50%,transparent));display:flex;align-items:center;padding:0 9px;font-size:12px;font-weight:600;color:#fff;white-space:nowrap;text-shadow:0 1px 2px #0008;transition:filter .2s}}
.era:hover .era-bar span{{filter:brightness(1.25)}}
.axis{{display:grid;grid-template-columns:150px 1fr;gap:14px;color:var(--mute);font-size:12px}}.axis div{{display:flex;justify-content:space-between}}
footer{{margin:72px 0 0;padding:28px 0 40px;border-top:1px solid var(--line);color:var(--mute);font-size:14px;display:flex;flex-wrap:wrap;gap:8px 24px;justify-content:space-between}}
@media (max-width:640px){{.hero{{padding-top:28px}}.resume{{grid-template-columns:auto 1fr}}.resume .btn{{grid-column:1/-1}}.grid{{grid-template-columns:repeat(2,1fr);gap:32px 16px}}h3{{font-size:18px}}.tag{{display:none}}.actions .ghost{{display:none}}.era,.axis{{grid-template-columns:96px 1fr;gap:10px}}.era-bar span{{font-size:0;padding:0}}.axis div span:nth-child(even){{visibility:hidden}}}}
.qwrap{{position:relative}}.qtrack{{display:flex;gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;padding:4px 2px 18px;scrollbar-width:none;outline:none}}.qtrack::-webkit-scrollbar{{display:none}}
.qcard{{flex:0 0 min(420px,86%);scroll-snap-align:start;display:flex;flex-direction:column;justify-content:space-between;gap:22px;min-height:250px;padding:26px 24px 22px;border-radius:22px;background:linear-gradient(160deg,color-mix(in srgb,var(--a) 22%,#0a0e16),#0a0e16 70%);border:1px solid color-mix(in srgb,var(--a) 35%,transparent);position:relative;overflow:hidden}}
.qcard::before{{content:"«";position:absolute;right:14px;bottom:-34px;font-size:140px;font-weight:800;line-height:1;color:color-mix(in srgb,var(--a) 16%,transparent);pointer-events:none;z-index:0}}
.qcard blockquote{{margin:0;position:relative;font-size:clamp(18px,2.1vw,21px);line-height:1.42;letter-spacing:-.01em;font-weight:500;text-wrap:pretty}}
.qcard footer{{position:relative;z-index:1;display:flex;align-items:center;gap:12px}}.qcard img{{width:42px;height:63px;object-fit:cover;border-radius:3px 6px 6px 3px;box-shadow:0 8px 18px -6px #000,0 0 0 1px #fff1}}
.qcard cite{{display:block;font-style:normal;font-size:13.5px;line-height:1.35;color:#c3cad5;flex:1}}.qcard cite b{{display:block;color:#fff;font-weight:600}}
.qcard .go{{flex:none;display:inline-flex;align-items:center;height:36px;padding:0 14px;border-radius:999px;background:var(--a);color:var(--ink,#fff);font-size:13.5px;font-weight:600}}
/* спокойная палитра: интерфейс полки — один фирменный акцент; цвет книги — только точка у автора и обложка */
.book .btn,.qcard .go{{background:#7fa6d4;color:#06101f;text-shadow:none}}.book .btn:hover,.qcard .go:hover{{background:#a5c3e6}}
.author{{color:var(--mute);filter:none;display:flex;align-items:center;gap:7px}}.author::before{{content:"";flex:none;width:7px;height:7px;border-radius:50%;background:var(--a)}}
.cover::after{{background:radial-gradient(closest-side,#7fa6d455,transparent)}}
.ring{{border-color:#ffffff26}}.progress i{{background:#7fa6d4}}
.resume{{background:var(--s1);border-color:var(--line)}}
.qcard{{background:linear-gradient(160deg,#121a2a,#0a0e16 70%);border-color:var(--line)}}.qcard::before{{color:#7fa6d414}}
.era-bar span{{background:#2f4d78;color:#e6eefa;text-shadow:none}}.era:hover .era-bar span{{background:#7fa6d4;color:#06101f;filter:none}}.era:hover .era-name{{color:#fff}}
.qctl{{display:flex;gap:8px;align-items:center}}.qctl button{{font:inherit;font-size:16px;height:38px;min-width:38px;padding:0 12px;border-radius:999px;border:1px solid var(--line);background:transparent;color:var(--text,#fff);cursor:pointer}}.qctl button:hover{{border-color:#fff6}}.qctl .qshuf{{font-size:14px;color:var(--mute);margin-left:auto}}
@media (max-width:640px){{.qcard{{min-height:280px;padding:22px 18px 18px}}.qcard footer{{flex-wrap:wrap}}.qcard cite{{flex-basis:calc(100% - 56px)}}.qcard .go{{width:100%;justify-content:center}}}}
html,body{{overflow-x:clip}}.manifest p{{margin:0 0 14px}}.manifest p:last-child{{margin:0}}@media (max-width:480px){{.nav{{gap:6px}}.nav .chip{{padding:0 11px;font-size:13px}}.brand span{{display:none}}}}
@media (prefers-reduced-motion:no-preference){{.qtrack{{scroll-behavior:smooth}}}}
/* — компактная цитата, канаты между секциями, титры — */
main>section{{position:relative}}main>section+section{{margin-top:64px;padding-top:44px}}
main>section+section::before{{content:"";position:absolute;left:0;right:0;top:0;height:10px;border-top:1px solid #ffffff1c;border-bottom:1px solid #ffffff1c;background:linear-gradient(#ffffff1c,#ffffff1c) 0 50%/100% 1px no-repeat}}
main>section+section::after{{content:"";position:absolute;left:-3px;right:-3px;top:-2px;height:14px;background:radial-gradient(circle,#7fa6d4 0 2.5px,transparent 3px) 0 50%/14px 14px no-repeat,radial-gradient(circle,#7fa6d4 0 2.5px,transparent 3px) 100% 50%/14px 14px no-repeat;opacity:.55}}
.qs{{margin-top:56px}}.qhead{{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 14px}}.qhead .eyebrow{{margin:0}}
.qctl{{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--mute)}}#qcount{{min-width:46px;text-align:center;font-variant-numeric:tabular-nums}}
.qband{{margin:0;display:grid;grid-template-columns:1fr auto;gap:18px 36px;align-items:end;padding:22px 26px;border-radius:18px;background:var(--s1);border:1px solid var(--line);position:relative;overflow:hidden;transition:opacity .18s}}
.qband.out{{opacity:0}}.qband::before{{content:"«";position:absolute;left:14px;top:-26px;font-size:120px;font-weight:800;line-height:1;color:#7fa6d414;pointer-events:none}}
.qband blockquote{{margin:0;position:relative;font-size:clamp(17px,2vw,22px);line-height:1.45;font-weight:500;letter-spacing:-.01em;text-wrap:pretty;padding-left:8px}}
.qband figcaption{{display:flex;align-items:center;gap:12px}}.qband img{{width:42px;height:63px;object-fit:cover;border-radius:3px 6px 6px 3px;box-shadow:0 8px 18px -6px #000,0 0 0 1px #fff1}}
.qband cite{{font-style:normal;font-size:13.5px;line-height:1.35;color:#c3cad5;max-width:200px}}.qband cite b{{display:block;color:#fff;font-weight:600}}
.qband .go{{flex:none;display:inline-flex;align-items:center;height:36px;padding:0 14px;border-radius:999px;background:#7fa6d4;color:#06101f;font-size:13.5px;font-weight:600;white-space:nowrap}}.qband .go:hover{{background:#a5c3e6}}
footer.credits{{display:block;margin:88px 0 0;padding:44px 0 36px;border-top:1px solid var(--line);color:var(--mute);font-size:14px}}
.cr-brand{{display:flex;align-items:center;gap:14px;margin-bottom:34px}}.cr-brand img{{width:46px;height:auto}}.cr-brand b{{display:block;color:var(--text);font-size:18px;letter-spacing:-.01em}}.cr-brand p{{margin:2px 0 0;max-width:44ch}}
.cr-grid{{display:grid;grid-template-columns:1.1fr 1.2fr 1fr;gap:34px 48px}}.cr-grid h4{{margin:0 0 12px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#7fa6d4;font-weight:600}}.cr-grid p{{margin:0 0 10px;line-height:1.6}}
.cr-list{{margin:0;display:grid;gap:10px}}.cr-list dt{{color:var(--text);font-weight:600;line-height:1.3}}.cr-list dd{{margin:2px 0 0;font-size:13px;line-height:1.5}}
.cr-link{{color:var(--text);border-bottom:1px solid #7fa6d480;padding-bottom:1px}}.cr-link:hover{{border-color:#a5c3e6}}
.cr-end{{display:flex;flex-wrap:wrap;gap:8px 28px;justify-content:space-between;margin-top:40px;padding-top:20px;border-top:1px solid var(--line);font-size:13px}}.cr-fin{{color:#7fa6d4;font-style:italic}}
@media (max-width:860px){{.cr-grid{{grid-template-columns:1fr;gap:28px}}}}
@media (max-width:640px){{.qband{{grid-template-columns:1fr;padding:20px 18px}}.qband figcaption{{flex-wrap:wrap}}.qband cite{{max-width:none;flex:1}}.qband .go{{width:100%;justify-content:center}}.qshuf{{display:none}}}}
@media (prefers-reduced-motion:reduce){{*{{transition:none!important}}}}
</style></head><body>
<div class="glow"></div>
<div class="wrap">
<header class="top"><a class="brand" href="./"><img src="vsplanet-logo.png" alt="" width="911" height="648"><span><b>VSplanet</b><small>Книги</small></span></a><span class="nav"><a class="chip" href="#quotes">Цитаты</a><a class="chip" href="#unfinished">Неполные</a><a class="chip" href="#eras">Эпохи</a></span></header>
<main>
<div class="hero"><p class="eyebrow">Библиотека переводов VSplanet.net</p>
<h1>Рестлинг, рассказанный изнутри</h1>
<div class="lead manifest"><p>С 2011 года читатели VSplanet переводят автобиографии звёзд рестлинга для таких же фанатов, как они сами. Из любви к рестлингу и желания делиться историями, которые заслуживают быть услышанными.</p>
<p>Теперь все эти переводы собраны в одном месте — в удобной читалке с закладками и офлайн-режимом. Без регистрации и лишних сложностей.</p>
<p>Некоторые книги так и остались недопереведёнными. Но мы верим, что вместе сможем довести их до конца.</p></div>
<ul class="stats"><li><b>{len(full)}</b><span>{plural(len(full), 'книга', 'книги', 'книг')} целиком</span></li><li><b>{len(partial)}</b><span>{plural(len(partial), 'неполная', 'неполные', 'неполных')}</span></li><li><b>{sum(b['chapters'] for b in books)}</b><span>глав и разделов</span></li><li><b>≈{hours} ч</b><span>чтения</span></li><li><b>EPUB</b><span>для любой читалки</span></li></ul>
<div id="resume"></div></div>
<section id="shelf" aria-labelledby="shelf-h"><h2 id="shelf-h">Полка</h2><p class="sub">Прогресс сохраняется в вашем браузере и подтягивается сюда сам.</p>
<div class="filters" id="filters" hidden><button aria-pressed="true" data-f="all">Все</button><button aria-pressed="false" data-f="reading">Читаю</button><button aria-pressed="false" data-f="new">Не начато</button><button aria-pressed="false" data-f="done">Прочитано</button></div>
<div class="grid">
{chr(10).join(card(b) for b in full)}
</div></section>
<section id="quotes" class="qs" aria-label="Цитата из книги"><div class="qhead"><span class="eyebrow">Строка из книги</span><span class="qctl"><button id="qprev" aria-label="Предыдущая">←</button><span id="qcount" aria-hidden="true"></span><button id="qnext" aria-label="Следующая">→</button><button id="qshuf" class="qshuf">Другая</button></span></div>
<figure class="qband" id="qband" aria-live="polite"></figure></section>
<section id="unfinished" aria-labelledby="unf-h"><h2 id="unf-h">Неполные переводы</h2>
<p class="sub">Эти книги начали переводить, но не довели до конца, или переводят прямо сейчас. Читать можно уже то, что есть.</p>
<div class="help"><div><h3>Помогите дописать</h3>
<p>Знаете английский и любите рестлинг? Возьмите одну главу — и у книги появится продолжение. Идеальный литературный текст не нужен: вёрстку, проверку орфографии и EPUB берёт на себя сайт, готовая глава сразу попадает в читалку.</p>
<ol><li>Выберите книгу ниже и посмотрите, чего не хватает.</li><li>Напишите в редакцию VSplanet.net, какую главу берёте.</li><li>Пришлите перевод — и ваше имя появится в выходных данных книги.</li></ol></div>
<a class="btn" href="https://vsplanet.net/" rel="noopener">Предложить помощь</a></div>
<div class="grid">
{chr(10).join(card(b) for b in partial)}
</div></section>
<section id="eras" aria-labelledby="eras-h"><h2 id="eras-h">Эпохи</h2><p class="sub">О каких годах рассказывает каждая книга — читайте историю рестлинга по порядку.</p>
<div class="eras">
{chr(10).join(era_row(b) for b in sorted(books, key=lambda b: b['era']) if b['era'])}
<div class="axis"><span></span><div>{''.join(f'<span>{y}</span>' for y in range(y0, y1 + 1, 10))}</div></div>
</div></section>
</main>
<footer class="credits">
<div class="cr-brand"><img src="vsplanet-logo.png" alt="" width="911" height="648" loading="lazy"><div><b>VSplanet Книги</b><p>Автобиографии рестлеров — в переводах, которые сделали фанаты для фанатов.</p></div></div>
<div class="cr-grid">
<div><h4>О проекте</h4><p>С 2011 года читатели VSplanet переводят книги звёзд рестлинга. Здесь они собраны в одной читалке: закладки, поиск по тексту, офлайн-режим и EPUB. Регистрации нет, а прогресс чтения хранится только в вашем браузере.</p></div>
<div><h4>В титрах</h4><dl class="cr-list">{credits_html}</dl></div>
<div><h4>Присоединяйтесь</h4><p>Недопереведённые книги ждут продолжения. Возьмите главу — и ваше имя появится в выходных данных книги.</p><p><a class="cr-link" href="https://vsplanet.net/" rel="noopener">Редакция VSplanet.net →</a></p></div>
</div>
<div class="cr-end"><span>Сайт собрал Никита Андреев, 2026</span><span>Некоммерческий проект читателей. Права на оригинальные тексты принадлежат авторам и издателям.</span><span class="cr-fin">Занавес. Кейфейб сохранён.</span></div>
</footer>
</div>
<script>
const BOOKS={json.dumps(js_books, ensure_ascii=False)};
const st={{}};
for(const b of BOOKS){{
  let s=null;try{{s=JSON.parse(localStorage.getItem(b.key)||'null')}}catch(e){{}}
  const p=s&&s.current;if(!p||!(p.chapter>=0)||p.chapter>=b.words.length)continue;
  const total=b.words.reduce((a,c)=>a+c,0),before=b.words.slice(0,p.chapter).reduce((a,c)=>a+c,0);
  const pct=Math.min(100,Math.round((before+b.words[p.chapter]*(+p.fraction||0))/total*100));
  st[b.slug]={{pct,chapter:p.chapter,t:Date.parse(s.updated||s.started||0)||0}};
}}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}})[c]);
const QUOTES={json.dumps(QUOTES, ensure_ascii=False)};
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
document.querySelectorAll('.book').forEach(el=>{{
  const x=st[el.dataset.slug];el.dataset.state=!x?'new':x.pct>=98?'done':'reading';if(!x)return;
  const pr=el.querySelector('.progress');pr.hidden=false;pr.querySelector('i').style.width=x.pct+'%';pr.querySelector('b').textContent=x.pct>=98?'Прочитано':x.pct+'%';
  const r=el.querySelector('.ring');r.hidden=false;r.textContent=x.pct>=98?'✓':x.pct+'%';
  const btn=el.querySelector('.btn');btn.textContent=x.pct>=98?'Перечитать':'Продолжить';btn.href=el.dataset.slug+'/#read/'+x.chapter;
}});
const reading=BOOKS.filter(b=>st[b.slug]&&st[b.slug].pct<98).sort((a,b)=>st[b.slug].t-st[a.slug].t||st[b.slug].pct-st[a.slug].pct);
if(reading.length){{const b=reading[0],x=st[b.slug];
  document.getElementById('resume').innerHTML=`<a class="resume" style="--a:${{b.accent}}" href="${{b.slug}}/#read/${{x.chapter}}"><img src="covers/${{b.slug}}.webp" alt=""><div><small>Продолжить чтение</small><strong>${{esc(b.title)}}</strong><p>${{esc(b.author)}} · прочитано ${{x.pct}}%</p></div><span class="btn">Продолжить</span></a>`;}}
if(Object.keys(st).length){{const f=document.getElementById('filters');f.hidden=false;
  f.addEventListener('click',e=>{{const k=e.target.dataset.f;if(!k)return;f.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===e.target)));
    document.querySelectorAll('.book').forEach(el=>el.hidden=k!=='all'&&el.dataset.state!==k);}});}}
</script>
</body></html>'''
(OUT / 'index.html').write_text(PAGE)
(OUT / 'sitemap.xml').write_text(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>{BASE}</loc></url></urlset>\n')

# og.jpg — веер обложек
from playwright.sync_api import sync_playwright
uri = lambda p: 'data:image/jpeg;base64,' + base64.b64encode(p.read_bytes()).decode()
font = lambda f: 'url(data:font/woff2;base64,' + base64.b64encode((OUT / f).read_bytes()).decode() + ')'
n = len(full)
covers = ''.join(f'<img src="{uri(OUT / "covers" / (b["slug"] + ".jpg"))}" style="left:{560 + i * 82}px;transform:rotate({(i - (n - 1) / 2) * 3.2:.1f}deg);z-index:{i}">' for i, b in enumerate(full))
OG = f'''<html><head><style>@font-face{{font-family:G;src:{font("geologica-cyr.woff2")};unicode-range:U+0400-045F}}@font-face{{font-family:G;src:{font("geologica-lat.woff2")};unicode-range:U+0000-00FF,U+2000-206F}}
body{{margin:0;width:1200px;height:630px;background:radial-gradient(60% 80% at 75% 50%,#2f5b8f55,transparent),#03060c;color:#fff;font-family:G;position:relative;overflow:hidden}}
img.c{{}}img{{position:absolute;top:150px;width:220px;border-radius:4px 8px 8px 4px;box-shadow:0 30px 60px -10px #000,0 0 0 1px #ffffff18;transform-origin:50% 120%}}
.t{{position:absolute;left:64px;top:64px;width:470px}}.l{{display:flex;gap:14px;align-items:center}}.l img{{position:static;width:58px;box-shadow:none}}.l b{{font-size:26px;display:block;line-height:1}}.l small{{font-size:14px;letter-spacing:.14em;text-transform:uppercase;font-weight:600}}
h1{{font-size:62px;line-height:.98;letter-spacing:-.045em;margin:70px 0 0;font-weight:800}}p{{font-size:24px;color:#9fbcd4;margin:22px 0 0}}</style></head><body>
<div class="t"><div class="l"><img src="{uri(OUT / 'vsplanet-logo.png').replace('jpeg', 'png')}"><span><b>VSplanet</b><small>Книги</small></span></div><h1>Рестлинг, рассказанный изнутри</h1><p>{n} автобиографий · ≈{hours} часов чтения</p></div>{covers}</body></html>'''
with sync_playwright() as p:
    br = p.chromium.launch(); pg = br.new_page(viewport={'width': 1200, 'height': 630})
    pg.set_content(OG); pg.wait_for_timeout(500); pg.screenshot(path=str(OUT / 'og.jpg'), type='jpeg', quality=86); br.close()
print(f'shelf: {n} books, {total_words} words → {OUT}')
