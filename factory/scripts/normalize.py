"""Посты WordPress (factory/out/<fetch>/posts/*.json) → book.json в формате читалки.

  python3 normalize.py factory/out/<fetch> books/<slug> [--title "…"] [--skip-ids 1,2]

• порядок глав: по номеру «Глава N» в заголовке, иначе по дате;
• чистка разметки WordPress: классы/стили, пустые абзацы, span/div, шорткоды;
• видео/iframe/ссылки на YouTube → «Из архива VSplanet» (архивная заметка), сами ссылки не публикуются;
• вступления/концовки вида «Продолжаем публиковать перевод…» → архивная заметка;
• «(… — прим. пер.)» → сноска; картинки → assets/images/ (уже скачаны сборщиком).
"""
import json, re, sys, html, shutil, argparse, pathlib
import html5lib
from xml.sax.saxutils import escape

ap = argparse.ArgumentParser(); ap.add_argument('src'); ap.add_argument('dst'); ap.add_argument('--title', default='')
ap.add_argument('--skip-ids', default=''); ap.add_argument('--split-h1', action='store_true'); ap.add_argument('--prefix', default=''); ap.add_argument('--year', default='')
a = ap.parse_args()
src, dst = pathlib.Path(a.src), pathlib.Path(a.dst)
(dst / 'assets' / 'images').mkdir(parents=True, exist_ok=True)
images = json.loads((src / 'images.json').read_text()) if (src / 'images.json').exists() else {}
skip = {int(x) for x in a.skip_ids.split(',') if x.strip()}
posts = [json.loads(p.read_text()) for p in (src / 'posts').glob('*.json')]
posts = [p for p in posts if p['id'] not in skip]
plain = lambda s: re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', s or ''))).strip()

ROMAN = {'I': 1, 'V': 5, 'X': 10, 'L': 50, 'C': 100}
def roman(s):
    t = 0
    for i, ch in enumerate(s):
        v = ROMAN[ch]; t += -v if i + 1 < len(s) and ROMAN[s[i + 1]] > v else v
    return t

NUM = re.compile(r'(?i)(?:глава\s*#?\s*|^#\s*|(?<=\s)#\s*)(\d+|[IVXLC]+)(?:\.(\d+))?(?=$|[\s.:—–-])')
PART = re.compile(r'(?i)\(\s*ч\.?\s*(\d+)\s*\)')

def parse_title(raw):
    """→ (тип, номер, часть, название). Тип: 'ch' — глава, 'extra' — прочий раздел."""
    t = re.sub(r'^\s*\[[^\]]*\]\s*[:.]?\s*', '', raw).strip()
    part = None
    if (pm := PART.search(t)): part = int(pm[1]); t = PART.sub('', t).strip()
    m = NUM.search(t)
    if m:
        n = int(m[1]) if m[1].isdigit() else roman(m[1].upper())
        if m[2]: part = int(m[2])
        name = re.sub(r'^[\s.:—–-]+', '', t[m.end():]).strip()
        return 'ch', n, part, name
    name = t.strip(' .:—–-')
    if ':' in name and re.match(r'(?i)\s*(от (?:автора|переводчика)|предислов|вступлен|введени|пролог|эпилог|благодарн|послеслов)', name.split(':', 1)[1]):
        name = name.split(':', 1)[1].strip()
    name = re.sub(r'^(Эпилог)[,.:]\s*', r'\1: ', name)
    name = name[:1].upper() + name[1:]
    if re.fullmatch(r'(?i)от (переводчика|автора|редакции)', name): name = name[:3] + name[3:].lower()
    return 'extra', None, part, name

ARCHIVE_HINT = re.compile(r'(?i)(продолжаем (?:публик|перевод)|публикуем (?:перевод|продолжение)|предыдущ\w+ глав|следующ\w+ глав|читайте (?:в|на)|все главы|начало (?:перевода|книги)|перевод книги|продолжение следует|альтернативная ссылка)')
VIDEO = re.compile(r'(?i)youtu|vimeo|rutube|video|видео')

def clean(el, notes):
    """Рекурсивно чистит html5lib-элемент, возвращает XHTML-строку содержимого."""
    out = ''
    if el.text: out += escape(el.text)
    for c in el:
        if not isinstance(c.tag, str):
            if c.tail: out += escape(c.tail)
            continue
        t = c.tag.lower()
        inner = clean(c, notes)
        if t in ('script', 'style', 'noscript', 'iframe', 'object', 'embed', 'video', 'audio'):
            notes.append('video'); inner = ''
        elif t in ('strong', 'b'): inner = f'<b>{inner}</b>' if inner.strip() else inner
        elif t in ('em', 'i'): inner = f'<i>{inner}</i>' if inner.strip() else inner
        elif t == 'br': inner = '<br>'
        elif t == 'img':
            u = c.get('src', ''); name = images.get(u)
            if not valid_image(name):
                LOST.append(u); inner = '\x00LOST\x00'
            elif name and not name.startswith('ERROR'):
                if not re.search(r'(?i)\.(jpe?g|png|gif|webp)$', name):       # без расширения EPUB не знает тип файла
                    with _PIL.open(src / 'images' / name) as im: name += {'JPEG': '.jpg', 'PNG': '.png', 'GIF': '.gif', 'WEBP': '.webp'}.get(im.format, '.jpg')
                shutil.copy(src / 'images' / (name.rsplit('.', 1)[0] if name not in images.values() else name), dst / 'assets' / 'images' / name)
                alt = escape(c.get('alt', ''), {'"': '&quot;'})
                inner = f'<img src="assets/images/{name}" alt="{alt}" loading="lazy" decoding="async">'
            else: inner = ''
        elif t == 'a':
            href = c.get('href', '')
            if VIDEO.search(href): notes.append('video'); inner = '' if plain(inner).startswith('http') else inner
            elif plain(inner).startswith('http'): inner = ''
        out += inner
        if c.tail: out += escape(c.tail)
    return out

def clean_img(c):
    wrap = html5lib.parseFragment('<span></span>', namespaceHTMLElements=False)[0]; wrap.append(c)
    return clean(wrap, [])

CREDITS, LOST = [], []
from PIL import Image as _PIL
def valid_image(name):
    if not name or name.startswith('ERROR'): return False
    try:
        with _PIL.open(src / 'images' / name) as im: im.verify()
        return True
    except Exception: return False
NAV = re.compile(r'(?i)продолжение следует|предыдущ\w+ глав|следующ\w+ глав|читайте (?:в|на)|все главы|по ссылк')

def chapter_html(raw):
    raw = re.sub(r'\[/?[a-z_]+[^\]]*\]', '', raw)            # шорткоды WP
    frag = html5lib.parseFragment(raw, namespaceHTMLElements=False)
    blocks = []
    def walk(node):
        for c in node:
            if not isinstance(c.tag, str): continue
            t = c.tag.lower()
            cls = c.get('class') or ''
            if t == 'img' or 'wp-caption' in cls or t == 'figure':
                img = re.search(r'<img[^>]+>', clean(c, []) if t != 'img' else clean_img(c))  # утраченные дают None
                cap = next((x for x in c.iter() if isinstance(x.tag, str) and (x.tag == 'figcaption' or 'wp-caption-text' in (x.get('class') or ''))), None)
                if img: blocks.append(('p', img.group(0) + (f'<br>\n<i>{escape(plain(clean(cap, [])))}</i>' if cap is not None else '')))
                continue
            if t in ('div', 'section', 'article', 'span', 'center') and any(isinstance(x.tag, str) and x.tag.lower() in ('p', 'div', 'h1', 'h2', 'h3', 'h4', 'figure', 'blockquote', 'ul', 'ol', 'iframe') for x in c):
                walk(c); continue
            notes = []
            body = clean(c, notes).strip()
            if '\x00LOST\x00' in body:
                rest = plain(body.replace('\x00LOST\x00', ''))
                if len(rest) < 250: continue          # утраченное фото с подписью
                body = body.replace('\x00LOST\x00', '')
            body = re.sub(r'^(?:<br>\s*)+|(?:\s*<br>)+$', '', body)
            txt = plain(body)
            if len(txt) < 300 and re.match(r'(?i)(?:альтернативн\w+ ссылк\w*|обсуждение(?: на)? VS)\b', txt): continue   # ссылки на зеркала видео
            if t in ('h1', 'h2', 'h3', 'h4'):
                if txt: blocks.append(('h3', body)); continue
            if t in ('ul', 'ol'):
                for li in c.findall('.//li'):
                    tx = clean(li, notes).strip()
                    if plain(tx): blocks.append(('p', '— ' + tx))
                continue
            if t == 'hr': blocks.append(('hr', '')); continue
            if 'video' in notes and not txt:
                blocks.append(('archive', 'В публикации на VSplanet здесь было видео.')); continue
            if not txt and '<img' not in body: continue
            if t == 'blockquote': blocks.append(('blockquote', body)); continue
            blocks.append(('p', body))
    walk(frag)
    # служебные вступления/концовки публикации
    for k in list(range(min(2, len(blocks)))) + list(range(max(0, len(blocks) - 2), len(blocks))):
        kind, b = blocks[k]
        if kind == 'p' and ARCHIVE_HINT.search(plain(b)) and len(plain(b)) < 400:
            blocks[k] = ('archive', plain(b))
    out, prev = [], None
    for kind, b in blocks:
        if kind == 'archive' and (NAV.search(b) or prev == b): continue
        prev = b if kind == 'archive' else None
        if kind == 'archive': out.append(f'<p class="archive-note">{escape(b)}</p>')
        elif kind == 'hr': out.append('<hr>')
        elif kind == 'h3': out.append(f'<h3>{b}</h3>')
        elif kind == 'blockquote': out.append(f'<blockquote>{b}</blockquote>')
        else: out.append(f'<p>{b}</p>')
    h = '\n'.join(out)
    # абзацы-примечания редакции целиком курсивом: «<i>… — прим.ред.</i>»
    h = re.sub(r'<p>\s*<i>\s*(.+?)\s*[—–-]?\s*прим\.\s*ред(?:\.|акции)?\s*</i>\s*</p>', lambda m: f'<p class="ed-note">{m[1].strip(" .—–-")}.</p>' if not m[1].strip().endswith(('.', '!', '?', '…')) else f'<p class="ed-note">{m[1].strip(" —–-")}</p>', h)
    h = re.sub(r'<p>\s*<i>\s*((?:Заранее )?[Пп]редупреждение от редакции[^<]*)</i>\s*</p>', r'<p class="ed-note">\1</p>', h)
    h = re.sub(r'<p>\s*<i>\s*([^<]*(?:YouTube|Youtube|youtube|ролик|видео)[^<]*)</i>\s*</p>', r'<p class="archive-note">\1</p>', h)
    # подписи переводчиков/помощников → в метаданные книги, из текста убираем
    def take_credit(m):
        CREDITS.append(plain(m[1])); return ''
    h = re.sub(r'<p>((?:<[^>]+>)*\s*(?:Перевод(?:ы)?\s*[:—–-]\s*[А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+(?:,\s*[А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+)*|(?:Отдельное спасибо|За помощь (?:с|в|при) перевод\w*|Спасибо за помощь (?:с|в|при) перевод\w*)[^<]{0,120})(?:<[^>]+>)*\s*)</p>\n?', take_credit, h)
    # примечания переводчика → сноски
    h = re.sub(r'\s?\(\s*(?:<i>)?\s*([^()<]*?)\s*[,–—-]?\s*прим\.\s*ред(?:\.|акции)?\s*(?:</i>)?\s*\)',
               lambda m: f'<button class="fn" type="button" data-kind="ed" data-note="{escape(m[1].strip()[:1].upper() + m[1].strip()[1:], {chr(34): "&quot;"})}" aria-label="Примечание редакции">*</button>', h)
    h = re.sub(r'\s?\(\s*(?:<i>)?\s*([^()<]*?)\s*[,–—-]?\s*прим\.\s*пер\.\s*(?:</i>)?\s*\)',
               lambda m: f'<button class="fn" type="button" data-note="{escape(m[1].strip()[:1].upper() + m[1].strip()[1:], {chr(34): "&quot;"})}" aria-label="Примечание переводчика">*</button>', h)
    return h

sections = []
for p in posts:
    raw_title = plain(p['title']['rendered'])
    if '[' in raw_title and not raw_title.lstrip().startswith('['):
        print('  пропуск (не часть книги):', raw_title); continue
    if a.prefix and not raw_title.lstrip().startswith(a.prefix):
        print('  пропуск (не из серии):', raw_title[:50]); continue
    if a.split_h1 and len(re.findall(r'<h1', p['content']['rendered'])) >= 2:
        # в одной публикации несколько глав/разделов, каждый под своим <h1>: «ГЛАВА 7», «ПРОЛОГ»…
        pieces = re.split(r'(?=<h1[^>]*>)', p['content']['rendered'])
        for piece in pieces:
            hm = re.match(r'<h1[^>]*>(.*?)</h1>', piece, re.S)
            if not hm: continue
            head = plain(hm[1]); body = chapter_html(piece[hm.end():])
            nm = re.fullmatch(r'(?i)глава\s+(\d+)', head)
            if nm: kind, n, name = 'ch', int(nm[1]), ''
            else:
                kind, n = 'extra', None
                name = re.sub(r'\s*\(от ([^)]*)\)', lambda m: ' ' + m[1].replace('Мика Фоли', 'Мика Фоли'), head.lower()).strip().capitalize()
                name = re.sub(r'(?<=\s)(мика|фоли)', lambda m: m[1].capitalize(), name)
            sections.append({'post': p['id'], 'date': p['date'], 'link': p['link'], 'kind': kind, 'n': n, 'part': 1, 'name': name, 'html': body})
        continue
    kind, n, part, name = parse_title(raw_title)
    if kind == 'extra' and a.title and name.lower().replace('ё', 'е') == a.title.lower().replace('ё', 'е'): name = 'Вступление'
    h = chapter_html(p['content']['rendered'])
    if kind == 'extra' and len(plain(h)) < 600 and '<img' not in h:
        print('  пропуск (анонс/пусто):', raw_title); continue
    sections.append({'post': p['id'], 'date': p['date'], 'link': p['link'], 'kind': kind, 'n': n, 'part': part or 1, 'name': name, 'html': h})

from collections import Counter
rep_notes = Counter(nt for x in sections for nt in set(re.findall(r'<p class="archive-note">(.*?)</p>', x['html'])))
for x in sections:
    x['html'] = re.sub(r'<p class="archive-note">(.*?)</p>\n?', lambda m: '' if rep_notes[m[1]] >= 2 and 'видео' not in m[1] else m[0], x['html'])

chapters = {}
for x in sorted((x for x in sections if x['kind'] == 'ch'), key=lambda x: (x['n'], x['part'], x['date'])):
    if x['n'] in chapters:
        c = chapters[x['n']]; c['html'] += '\n' + x['html']; c['posts'].append(x['post']); c['name'] = c['name'] or x['name']
    else:
        chapters[x['n']] = {**x, 'posts': [x['post']]}
first_date = min((c['date'] for c in chapters.values()), default='9999')
extras = sorted((x for x in sections if x['kind'] == 'extra'), key=lambda x: x['date'])
ordered = [{**x, 'title': x['name'], 'posts': [x['post']]} for x in extras if x['date'] < first_date]
ordered += [{**c, 'title': f'Глава {c["n"]}' + (f'. {c["name"]}' if c['name'] else '')} for _, c in sorted(chapters.items())]
ordered += [{**x, 'title': x['name'], 'posts': [x['post']]} for x in extras if x['date'] >= first_date]
nums = sorted(chapters)
missing = sorted(set(range(1, nums[-1] + 1)) - set(nums)) if nums else []

book = {'title': a.title, 'language': 'ru', 'credits': sorted(set(CREDITS)), 'chapters': []}
for i, x in enumerate(ordered):
    words = len(re.findall(r'\w+', plain(x['html'])))
    book['chapters'].append({'id': f'c{i}', 'title': x['title'], 'html': x['html'], 'words': words, 'source': {'posts': x['posts'], 'date': x['date'], 'link': x['link']}})
(dst / 'book.json').write_text(json.dumps(book, ensure_ascii=False, separators=(',', ':')))
print(f'{len(ordered)} разделов → {dst / "book.json"}' + (f'  ⚠ нет глав: {missing}' if missing else ''))
if LOST: print(f'  ⚠ утрачено фото (битые ссылки): {len(set(LOST))}')
book['lost_images'] = len(set(LOST))
if CREDITS: print('  подписи переводчиков (убраны из текста):', sorted(set(CREDITS)))
for x in ordered: print(f'  {x["date"][:10]}  {x["title"][:62]:<62} {len(plain(x["html"])):>7} зн.  посты {x["posts"]}')
