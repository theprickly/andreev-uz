"""Собирает сайт книги + EPUB + SEO из папки books/<slug>/.

  python3 build_book.py factory/books/<slug> <куда_выложить>   (обычно корень сайта/<slug>)

books/<slug>/ содержит:
  book.config.json   — метаданные (см. books/_example/book.config.json)
  book.json          — главы после normalize.py и qa.py --fix
  assets/cover.jpg, assets/book-render.png (cover.py), assets/images/*
"""
import json, re, os, sys, shutil, hashlib, html, pathlib
from xml.sax.saxutils import escape
from PIL import Image
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import epub

src, dst = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
T = pathlib.Path(__file__).resolve().parents[1] / 'template'
cfg = json.loads((src / 'book.config.json').read_text())
if cfg.get('incomplete'):
    for k in ('description', 'og_title', 'lead'): 
        if cfg.get(k): cfg[k] = cfg[k].replace(', или скачайте EPUB', '').replace(' или скачайте EPUB', '').replace(' и скачать EPUB', '')
book = json.loads((src / 'book.json').read_text())
# адаптация: согласованные написания имён и правки редактора из конфига (только в тексте, не в разметке)
fix_log = []
for old, new in cfg.get('replacements', []):
    rx = re.compile(r'(?<![А-Яа-яЁёA-Za-z])' + re.escape(old) + r'(?![А-Яа-яЁёA-Za-z])')
    for c in book['chapters']:
        parts = re.split(r'(<[^>]+>)', c['html']); n = 0
        for k, part in enumerate(parts):
            if not part.startswith('<'): parts[k], m = rx.subn(new, part); n += m
        if n: c['html'] = ''.join(parts); fix_log.append(f'{c["title"]}: {old} → {new} ×{n}')
for old, new in cfg.get('html_patches', []):            # точечные правки разметки редактором
    hits = [c for c in book['chapters'] if old in c['html']]
    assert len(hits) == 1, f'html_patch не найден однозначно: {old[:60]}'
    hits[0]['html'] = hits[0]['html'].replace(old, new, 1); fix_log.append(f'{hits[0]["title"]}: правка разметки')
(src / 'adaptation.log').write_text('\n'.join(fix_log) + '\n')
BASE = cfg.get('base_url', f'https://andreev.uz/books/{cfg["slug"]}/')
import themes
TH = themes.resolve(cfg)
cfg['accent'] = TH['accent']; cfg.setdefault('cover_bg', TH['bg'])
theme_css = (f'<style id="theme">html:root{{--accent:{TH["accent"]};--accent-hi:{TH["accent_hi"]};--accent-deep:{TH["accent_deep"]};--accent-ink:{TH["accent_ink"]};'
             f'--bg:{TH["bg"]};--surface:{TH["surface"]};--surface-2:{TH["surface_2"]};--reader-bg-night:{TH["reader_bg"]}' + f';--accent-fill:{TH.get("accent_fill", "var(--accent)")}' + '}' + TH.get('extra_css', '') + '</style>')
E = lambda s: html.escape(str(s), quote=True)

shutil.rmtree(dst, ignore_errors=True)
(dst / 'assets' / 'icons').mkdir(parents=True)
PWA_V = hashlib.sha256((T / 'pwa.js').read_bytes()).hexdigest()[:12]      # общий /books/pwa.js; версия — в адресе
import shared
SH_CSS, SH_JS, SH_NCSS, SH_NJS = shared.build(dst.parent)     # общие шрифты, логотип, CSS и JS: /books/shared/
_cv0 = Image.open(src / 'assets' / 'cover.jpg').convert('RGB'); _cv0.thumbnail((800, 1200), Image.LANCZOS)
_cv0.save(dst / 'assets' / 'cover.jpg', quality=80, optimize=True, progressive=True)
Image.open(src / 'assets' / 'book-render.png').save(dst / 'assets' / 'book-render.webp', quality=88, method=6)
if (src / 'assets' / 'images').exists(): shutil.copytree(src / 'assets' / 'images', dst / 'assets' / 'images')
else: (dst / 'assets' / 'images').mkdir()

# значки из обложки
cov = Image.open(src / 'assets' / 'cover.jpg').convert('RGB')
def icon(size, frac, name):
    bg = Image.new('RGB', (size, size), (0, 0, 0)); h = round(size * frac); w = round(h * cov.width / cov.height)
    bg.paste(cov.resize((w, h), Image.LANCZOS), ((size - w) // 2, (size - h) // 2)); bg.save(dst / 'assets' / 'icons' / name, optimize=True)
for size, frac, name in [(192, 1, 'cover-icon-192.png'), (32, 1, 'cover-favicon-32.png')]:
    icon(size, frac, name)

# книга и EPUB
h12 = lambda b: hashlib.sha256(b).hexdigest()[:12]
bj = json.dumps(book, ensure_ascii=False, separators=(',', ':')).encode()
book_file = f'book-{h12(bj)}.json'; (dst / book_file).write_bytes(bj)
tmp_epub = dst / 'tmp.epub'
INC = bool(cfg.get('incomplete'))      # у неполных книг нет EPUB и PWA
if INC:
    epub_file, epub_mb = '', '0'
else:
    epub.build(cfg, book, str(src / 'assets' / 'images'), str(src / 'assets' / 'cover.jpg'), str(tmp_epub))
    epub_file = f'assets/book-{h12(tmp_epub.read_bytes())}.epub'; tmp_epub.rename(dst / epub_file)
    epub_mb = f'{(dst / epub_file).stat().st_size / 1048576:.1f}'.replace('.', ',')

# подсчёты
plain = lambda s: re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', s))).strip()
numbered = sum(1 for c in book['chapters'] if re.match(r'^Глава\s+\d+', c['title']))
words = sum(c['words'] for c in book['chapters'])
photos = sum(c['html'].count('<img') for c in book['chapters'])
plural = lambda k, a, b, c: a if k % 10 == 1 and k % 100 != 11 else b if 2 <= k % 10 <= 4 and not 12 <= k % 100 <= 14 else c

# конфиг для читалки
reader_cfg = {'id': cfg['id'], 'slug': cfg['slug'], 'storageKey': cfg['slug'] + '-reading-room-v1', 'title': cfg['title'], 'subtitle': cfg.get('subtitle', ''),
              'author': cfg['author'], 'translator': cfg.get('translator', ''), 'credit': cfg['credit'], 'pageTitle': cfg['page_title'],
              'bookFile': book_file, 'render': 'assets/book-render.webp', 'letter': cfg.get('letter'), 'memorial': cfg.get('memorial'), 'original': cfg.get('original'), 'incomplete': cfg.get('incomplete')}
orig = cfg.get('original') or {}
original_html = (f'<p class="orig"><span>Оригинал</span><i lang="en">{E(orig["title"])}</i><b>{E(orig["year"])}</b></p>' if orig else '')
inc = cfg.get('incomplete')
incomplete_html = (f'<p class="unfinished"><span>Перевод не закончен</span> {E(inc["label"])}. <a href="../#unfinished">Помочь закончить →</a></p>' if inc else '')
credit_html = E(cfg['credit']).replace('VSplanet.net', '<b>VSplanet.net</b>')
stats = [(numbered or len(book['chapters']), plural(numbered or len(book['chapters']), 'глава', 'главы', 'глав')), (f'≈&#8239;{max(1, round(words / 200 / 60))}', 'часов чтения')]
if photos: stats.append((photos, plural(photos, 'фотография', 'фотографии', 'фотографий')))
stats += [(E(s['value']), E(s['label'])) for s in cfg.get('extra_stats', [])]
stats_html = '<dl class="stats">' + ''.join(f'<div><dd>{v}</dd><dt>{l}</dt></div>' for v, l in stats[:4]) + '</dl>'
q = cfg.get('quote')
quote_section = (f'<section class="section" aria-labelledby="quote-heading"><p class="eyebrow" id="quote-heading">{E(q["source"])}</p>'
                 f'<blockquote class="pull-quote">{E(q["text"])}</blockquote>{stats_html}</section>') if q else f'<section class="section">{stats_html}</section>'
L = cfg.get('letter')
letter_section = (f'<section class="section letter-teaser" aria-labelledby="letter-heading"><p class="eyebrow" id="letter-heading">От переводчика · {E(L["year"])}</p>'
                  f'<blockquote class="pull-quote" id="letter-teaser">{E(L["quote"])}</blockquote><p class="sign">{E(cfg["translator"])}<span>переводчик</span></p>'
                  f'<a class="btn btn-ghost" href="#letter">Читать письмо целиком</a></section>') if L and L.get('quote') else ''
m = cfg.get('memorial')
memorial = f'<p class="memorial-line" hidden>{re.sub(r"[*][*](.+?)[*][*]", lambda x: "<b>" + x[1] + "</b>", E(m["text"]))}</p>' if m else ''
imprint = ''.join(f'<li><span>{E(y)}</span>{E(t)}</li>' for y, t in cfg['imprint'])
about = '<header class="page-head"><p class="eyebrow">О сайте</p><h1>Как сделана эта книга</h1></header><div class="about">' + ''.join(
    f'<section><h2>{E(h)}</h2><p>{t}</p></section>' for h, t in cfg['about']) + '</div>'
og = f'''<link rel="canonical" href="{BASE}"><meta property="og:type" content="book"><meta property="og:site_name" content="VSplanet · Книги"><meta property="og:title" content="{E(cfg["og_title"])}"><meta property="og:description" content="{E(cfg["description"])}"><meta property="og:url" content="{BASE}"><meta property="og:image" content="{BASE}assets/og.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:locale" content="ru_RU"><meta name="twitter:card" content="summary_large_image">'''
ld = {'@context': 'https://schema.org', '@type': 'Book', 'name': cfg['title'], 'author': [{'@type': 'Person', 'name': n} for n in [cfg['author']] + cfg.get('coauthors', [])],
      'inLanguage': 'ru', 'publisher': {'@type': 'Organization', 'name': 'VSplanet.net'}, 'bookFormat': 'https://schema.org/EBook', 'isAccessibleForFree': True,
      'image': BASE + 'assets/og.jpg', 'url': BASE}
if cfg.get('translator'): ld['translator'] = {'@type': 'Person', 'name': cfg['translator']}
if cfg.get('original'): ld['isBasedOn'] = {'@type': 'Book', 'name': cfg['original']['title'], 'datePublished': str(cfg['original']['year'])}
style_vars = theme_css + f'<style>html .glare{{-webkit-mask-image:url(assets/book-render.webp);mask-image:url(assets/book-render.webp)}}:root{{--archive-label:"Из архива VSplanet{(" · " + str(cfg["archive_year"])) if cfg.get("archive_year") else ""}"}}</style>'
R = {'JSONLD': '<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False) + '</script>',
     'CONFIG': '<script>window.BOOK_CONFIG=' + json.dumps(reader_cfg, ensure_ascii=False) + '</script>' + style_vars,
     'OGMETA': og, 'PAGE_TITLE': E(cfg['page_title']), 'DESCRIPTION': E(cfg['description']), 'SHORT_NAME': E(cfg['short_name']),
     'MEMORIAL': memorial, 'H1': E(cfg['title'] + ' — ' + cfg.get('subtitle', cfg['author'])), 'EYEBROW': E(cfg['eyebrow']), 'LEAD': E(cfg['lead']),
     'CREDIT_HTML': credit_html, 'ORIGINAL_HTML': original_html, 'INCOMPLETE_HTML': incomplete_html, 'RENDER_ALT': 'Книга «' + E(cfg['title']) + '»', 'TITLE': E(cfg['title']), 'QUOTE_SECTION': quote_section,
     'LETTER_SECTION': letter_section, 'IMPRINT': imprint, 'EPUB': epub_file, 'EPUB_NAME': E(f'{cfg["author"]} — {cfg["title"]}.epub'),
     'EPUB_META': f'{epub_mb} МБ' + (' · с иллюстрациями' if photos else ''), 'ABOUT': about, 'SLUG': cfg['slug'], 'PWA_V': PWA_V, 'VERSION': '{} «{}»'.format(*shared.version()),
     'OFFLINE_MB': f"{sum(f.stat().st_size for f in dst.rglob('*') if f.is_file() and f.suffix not in ('.epub', '.txt')) / 1048576:.1f}".replace('.', ',')}
page = (T / 'index.tpl.html').read_text()
for k, v in R.items(): page = page.replace('{{' + k + '}}', v)
assert '{{' not in page, re.findall(r'\{\{\w+\}\}', page)
if INC:
    n0 = len(page)
    page = re.sub(r'<link rel="manifest"[^>]*>|<link rel="apple-touch-icon"[^>]*>|<script src="\.\./pwa\.js[^"]*"[^>]*></script>', '', page)
    page = re.sub(r'<section id="formats".*?</section>\s*', '', page, flags=re.S)
    page = re.sub(r'<a class="tb-tab" href="#formats"[^>]*>.*?</a>', '', page, flags=re.S)
    page = re.sub(r'<div class="app-settings">.*?</p></div>', '', page, flags=re.S)
    page = re.sub(r'<dialog id="install-dialog".*?</dialog>\s*', '', page, flags=re.S)
    for w in (r'\.epub', 'rel="manifest"', 'pwa.js', 'install-dialog'):
        for m in re.finditer(w, page, re.I): print('REMNANT', w, page[max(0,m.start()-80):m.end()+60].replace('\n',' '))
if not photos: page = page.replace('<a href="#album">Альбом</a>', '')
(dst / 'index.html').write_text(page)
# превью для соцсетей
try:
    import base64
    from playwright.sync_api import sync_playwright
    b64 = lambda p: base64.b64encode(p.read_bytes()).decode()
    ogh = f'''<html><style>@font-face{{font-family:G;src:url(data:font/woff2;base64,{b64(T / "assets/fonts/geologica-cyr.woff2")});unicode-range:U+0400-045F}}@font-face{{font-family:G;src:url(data:font/woff2;base64,{b64(T / "assets/fonts/geologica-lat.woff2")})}}
body{{margin:0;width:1200px;height:630px;background:{TH["bg"]};color:#fff;font-family:G;position:relative;overflow:hidden}}.g{{position:absolute;right:-120px;top:-120px;width:900px;height:900px;background:radial-gradient(closest-side,{TH["accent"]}55,transparent)}}
img.r{{position:absolute;right:20px;top:-5px;width:640px}}.t{{position:absolute;left:72px;top:140px;width:560px}}.k{{font-size:24px;font-weight:600;color:{TH["accent"]}}}h1{{margin:16px 0 0;font-size:60px;line-height:1.02;letter-spacing:-2px;font-weight:800}}
p{{margin:22px 0 0;font-size:26px;color:#c9c9ce;line-height:1.35}}b{{color:#fff}}.br{{position:absolute;left:72px;bottom:56px;display:flex;align-items:center;gap:12px;font-size:24px;font-weight:700}}.br img{{width:54px}}.br small{{display:block;font-size:14px;color:#fff;letter-spacing:.08em;text-transform:uppercase}}</style>
<body><div class=g></div><img class=r src="data:image/png;base64,{b64(src / "assets/book-render.png")}"><div class=t><div class=k>{E(cfg["author"])}</div><h1>{E(cfg["title"])}</h1><p>{credit_html}</p></div>
<div class=br><img src="data:image/png;base64,{b64(T / "assets/vsplanet-logo.png")}"><span>VSplanet<small>Книги</small></span></div></body></html>'''
    with sync_playwright() as p:
        br = p.chromium.launch(); pg = br.new_page(viewport={'width': 1200, 'height': 630}); pg.set_content(ogh); pg.wait_for_timeout(400)
        pg.screenshot(path=str(dst / 'assets' / 'og.jpg'), type='jpeg', quality=88); br.close()
except Exception as e:
    print('og.jpg skipped:', e)

# версии файлов (кэш) + офлайн-список
page = (dst / 'index.html').read_text()
page = page.replace('href="style.css"', f'href="../shared/{SH_CSS}"').replace('src="app.js"', f'src="../shared/{SH_JS}"').replace('href="nav.css"', f'href="../shared/{SH_NCSS}"').replace('src="nav.js"', f'src="../shared/{SH_NJS}"')
(dst / 'index.html').write_text(page)
assets = ['./', book_file] + [f'../shared/{n}' for n in (SH_CSS, SH_JS, SH_NCSS, SH_NJS)]
for d in ('assets/icons', 'assets/images'):
    assets += sorted(f'{d}/{f}' for f in os.listdir(dst / d) if not f.endswith('.txt'))
assets += ['assets/cover.jpg', 'assets/book-render.webp']
sizes = [(a, os.path.getsize(dst / ('index.html' if a == './' else a))) for a in assets]
json.dump({'v': h12(page.encode() + bj), 'bytes': sum(x[1] for x in sizes), 'files': [[a, n] for a, n in sizes]}, open(dst / 'files.json', 'w'), ensure_ascii=False, separators=(',', ':'))
# сервис-воркер-«уборщик»: снимает кэши и регистрации прежних PWA отдельных книг (теперь одно приложение на /books/)
(dst / 'sw.js').write_text("self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k.startsWith('book-')||k.startsWith('eddie-book-'))await caches.delete(k);await self.registration.unregister();for(const c of await self.clients.matchAll())c.navigate(c.url)})()));\n")

# статические страницы глав и sitemap
ch = book['chapters']; css = SH_CSS
mark = lambda i, t: (f'{int(m[1]):02d}' if (m := re.match(r'^Глава\s+(\d+)', t)) else t.strip()[0].upper())
BRAND = '<a class="vs-brand" href="../../" aria-label="Все книги"><img src="../../shared/vsplanet-logo.png" alt="" width="911" height="648"><span><b>VSplanet</b><small>Книги</small></span></a>'
def spage(title, desc, canon, body, extra=''):
    return f'''<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{E(title)}</title><meta name="description" content="{E(desc)}"><link rel="canonical" href="{canon}"><meta property="og:title" content="{E(title)}"><meta property="og:image" content="{BASE}assets/og.jpg"><link rel="icon" href="../assets/icons/cover-favicon-32.png"><link rel="stylesheet" href="../../shared/{css}">{style_vars}{extra}</head>
<body class="static theme-night"><header class="top wrap">{BRAND}<nav><a class="chip" href="../">К книге</a><a class="chip" href="./">Все главы</a></nav></header>{body}<footer class="page-foot wrap"><nav class="footer-nav"><a href="../../">Все книги</a><a href="../">О книге</a><a href="../#about">О сайте</a></nav></footer></body></html>'''
(dst / 'chapters').mkdir()
urls, items = [BASE, BASE + 'chapters/'], []
for i, c in enumerate(ch):
    first = plain(c['html']); desc = (first[:150].rsplit(' ', 1)[0] + '…') if len(first) > 150 else first
    h = re.sub(r'<button class="fn"([^>]*)data-note="([^"]*)"[^>]*>\*</button>', lambda m: f'<small class="fn-inline"> [{"прим. ред." if "data-kind=\"ed\"" in m[1] else "прим. пер."}: {m[2][:1].lower() + m[2][1:]}]</small>', c['html'].replace('src="assets/', 'src="../assets/'))
    nav = (f'<a class="btn btn-ghost" href="{i-1:02d}.html">← {E(ch[i-1]["title"])}</a>' if i else '') + (f'<a class="btn btn-ghost" href="{i+1:02d}.html">{E(ch[i+1]["title"])} →</a>' if i < len(ch) - 1 else '')
    body = f'''<main class="reading-main static-main"><article class="reader-page"><header class="chapter-head"><div class="chapter-eyebrow"><span id="chapter-category">«{E(cfg["title"])}»</span><span>≈&#8239;{max(1, round(c["words"]/200))} мин чтения</span></div><h1 id="chapter-title">{E(c["title"])}</h1><p class="reader-credit credit">{credit_html}</p><p class="static-cta"><a class="btn btn-primary" href="../#read/{i}">Открыть в читалке</a></p></header><div class="book-prose">{h}</div><nav class="static-nav">{nav}</nav></article></main>'''
    (dst / 'chapters' / f'{i:02d}.html').write_text(spage(f'{c["title"]} — «{cfg["title"]}», {cfg["author"]}', desc, f'{BASE}chapters/{i:02d}.html', body))
    urls.append(f'{BASE}chapters/{i:02d}.html')
    items.append(f'<li><a href="{i:02d}.html"><span>{mark(i, c["title"])}</span><b>{E(c["title"])}</b><small>{E(desc)}</small></a></li>')
(dst / 'chapters' / 'index.html').write_text(spage(f'Оглавление — «{cfg["title"]}», {cfg["author"]}', cfg['description'], BASE + 'chapters/',
    f'<main class="page-main wrap"><header class="page-head"><p class="eyebrow">Оглавление</p><h1>{E(cfg["title"])}</h1><p class="page-lead">{credit_html}</p></header><ol class="static-toc">{"".join(items)}</ol></main>'))
(dst / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + ''.join(f'<url><loc>{u}</loc></url>' for u in urls) + '</urlset>\n')

# раздел «Правки»: что и где исправлено в тексте (changes.json пишет scripts/typo.py)
_chg = src / 'changes.json'
if _chg.exists():
    CH = json.loads(_chg.read_text())
    def _ctx(a, tag):
        return E(a).replace('⟦', f'<{tag}>').replace('⟧', f'</{tag}>')
    RULES = {'nbsp': 'Неразрывные пробелы', 'латиница в кириллице': 'Латинские буквы внутри кириллических слов', 'кавычки': 'Кавычки приведены к «ёлочкам»',
             'диапазон лет': 'Диапазоны лет — через короткое тире', 'пробел после запятой': 'Пропущенный пробел после запятой', 'пробел после точки': 'Пропущенный пробел после точки',
             'тире': 'Дефис и среднее тире в роли тире → «—»', 'многоточие': 'Три точки → «…»', 'двойные пробелы': 'Двойные пробелы', 'пробел перед знаком': 'Пробел перед знаком препинания',
             'пробелы у тире': 'Пробелы у тире', 'словарь': 'Единый словарь имён и терминов'}
    CH = {**CH, 'runs': CH['runs'] if 'runs' in CH else [{'name': 'Слой 1', 'date': CH['date'], 'commit': CH.get('commit'), 'counts': CH['counts'], 'items': CH['items']}]}
    titles = CH['titles']
    link = lambda c, p_: f'<a href="../#read/{c}/{p_}">{E(titles[c])} · абзац {p_ + 1}</a>'
    runs_html = ''
    for R_ in reversed(CH['runs']):
        cm = R_.get('commit')
        cm_html = f' · коммит <a href="https://github.com/theprickly/andreev-uz/commit/{cm}" rel="noopener">{cm[:7]}</a>' if cm else ''
        summ = ''.join(f'<tr><td>{E(RULES.get(r, r))}</td><td>{n:,}'.replace(',', ' ') + '</td></tr>' for r, n in sorted(R_['counts'].items(), key=lambda x: -x[1]))
        by = {}
        for it in R_['items']: by.setdefault(it['rule'], []).append(it)
        secs = ''
        for r, lst in sorted(by.items(), key=lambda x: -len(x[1])):
            secs += f'<details class="chg"><summary><b>{E(RULES.get(r, r))}</b> <span>{len(lst)}</span></summary><ol>' + ''.join(
                f'<li>{link(it["c"], it["p"])}<p class="diff"><span class="was">{_ctx(it["a"], "del")}</span><span class="now">{_ctx(it["b"], "ins")}</span></p></li>' for it in lst) + '</ol></details>'
        runs_html += f'<h2 class="chg-h">{E(R_["name"])}</h2><p class="chg-meta">{E(R_["date"])}{cm_html}</p><table class="chg-sum"><tbody>{summ}</tbody></table>{secs}'
    fl = {}
    for f in CH['flags']: fl.setdefault(f['kind'], []).append(f)
    FL = {'повтор слова': 'Повтор слова подряд (возможна опечатка — или так задумано)', 'точка вместо пробела в имени': 'Точка вместо пробела или дефиса в имени',
          'смесь латиницы и кириллицы': 'Смесь латиницы и кириллицы (нужен взгляд человека)', 'несбалансированные кавычки': 'Несбалансированные кавычки', 'тире без пробелов': 'Тире без пробелов вокруг'}
    fsec = ''.join(f'<details class="chg"><summary><b>{E(FL.get(k, k))}</b> <span>{len(v)}</span></summary><ol>' + ''.join(
        f'<li>{link(f["c"], f["p"])}<p class="diff"><span class="was">{_ctx(f["t"], "mark")}</span></p></li>' for f in v) + '</ol></details>' for k, v in fl.items())
    body = (f'<main class="page-main wrap"><header class="page-head"><p class="eyebrow">Правки текста</p><h1>{E(cfg["title"])}</h1>'
            f'<p class="page-lead">Что исправлено в тексте и когда. Смысл и порядок абзацев не менялись, закладки и прогресс читателей не пострадали. Каждая серия правок — отдельный коммит в Git, на него ведёт ссылка.</p></header>'
            f'{runs_html}'
            + (f'<h2 class="chg-h">На проверку: не исправлялось</h2><p class="page-lead">Спорные места: автоматическая правка могла бы испортить задуманное. Решает редактор.</p>{fsec}' if fsec else '') + '</main>')
    style = ('<style>.chg-sum{border-collapse:collapse;margin:0 0 28px;width:100%;max-width:560px}.chg-sum td{padding:8px 0;border-bottom:1px solid var(--line)}.chg-sum td+td{text-align:right;font-variant-numeric:tabular-nums;font-weight:600}'
             '.chg{margin:0 0 14px;border:1px solid var(--line);border-radius:14px;padding:0 16px;background:var(--surface)}.chg summary{cursor:pointer;padding:14px 0;list-style:none}.chg summary span{color:var(--muted);margin-left:8px}'
             '.chg ol{margin:0;padding:0 0 12px;list-style:none;display:grid;gap:12px}.chg li a{font-size:13px;color:var(--muted)}.chg .diff{margin:4px 0 0;display:grid;gap:2px;font-size:15px;line-height:1.5;word-break:break-word}'
             '.chg .was{color:#c9c9ce}.chg del{background:#ff5a5a30;color:inherit;text-decoration:none;padding:0 2px;border-radius:3px}.chg ins{background:#4ade8030;text-decoration:none;padding:0 2px;border-radius:3px}.chg mark{background:#facc1533;color:inherit;padding:0 2px;border-radius:3px}.chg-h{margin:36px 0 6px}.chg-meta{margin:0 0 14px;color:var(--muted);font-size:14px}</style>'
             '<meta name="robots" content="noindex">')
    page_ = spage(f'Правки текста — «{cfg["title"]}»', f'Что исправлено в тексте книги «{cfg["title"]}»', BASE + 'changes/', body, style)
    # страница правок НЕ публикуется: остаётся внутренним отчётом в factory (books/<slug>/changes.html)
    (src / 'changes.html').write_text(page_.replace('<a class="chip" href="./">Все главы</a>', ''))
print(f'built {cfg["slug"]}: {len(ch)} sections, {words} words, {photos} photos, EPUB {epub_mb} MB → {dst}')
