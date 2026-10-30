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
ap.add_argument('--skip-ids', default=''); ap.add_argument('--year', default='')
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

def chapter_no(title):
    m = re.search(r'(?i)глава\s+(\d+|[IVXLC]+)\b', title)
    if not m: return None
    return int(m[1]) if m[1].isdigit() else roman(m[1].upper())

SPECIAL = [(r'(?i)вступлени|предислови|введени|пролог', 'Вступление'), (r'(?i)эпилог', 'Эпилог'),
           (r'(?i)благодарност', 'Благодарности'), (r'(?i)послеслови', 'Послесловие')]

def section_title(t):
    n = chapter_no(t)
    if n is not None: return f'Глава {n}', n
    for rx, name in SPECIAL:
        if re.search(rx, t): return name, None
    return re.sub(r'^.*?[.:—–-]\s*', '', t).strip() or t, None

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
            if name and not name.startswith('ERROR'):
                shutil.copy(src / 'images' / name, dst / 'assets' / 'images' / name)
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
                img = re.search(r'<img[^>]+>', clean(c, []) if t != 'img' else clean_img(c))
                cap = next((x for x in c.iter() if isinstance(x.tag, str) and (x.tag == 'figcaption' or 'wp-caption-text' in (x.get('class') or ''))), None)
                if img: blocks.append(('p', img.group(0) + (f'<br>\n<i>{escape(plain(clean(cap, [])))}</i>' if cap is not None else '')))
                continue
            if t in ('div', 'section', 'article', 'span', 'center') and any(isinstance(x.tag, str) and x.tag.lower() in ('p', 'div', 'h1', 'h2', 'h3', 'h4', 'figure', 'blockquote', 'ul', 'ol', 'iframe') for x in c):
                walk(c); continue
            notes = []
            body = clean(c, notes).strip()
            body = re.sub(r'^(?:<br>\s*)+|(?:\s*<br>)+$', '', body)
            txt = plain(body)
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
    # примечания переводчика → сноски
    h = re.sub(r'\s?\(\s*(?:<i>)?\s*([^()<]*?)\s*[,–—-]?\s*прим\.\s*пер\.\s*(?:</i>)?\s*\)',
               lambda m: f'<button class="fn" type="button" data-note="{escape(m[1].strip()[:1].upper() + m[1].strip()[1:], {chr(34): "&quot;"})}" aria-label="Примечание переводчика">*</button>', h)
    return h

sections = []
for p in posts:
    title, n = section_title(plain(p['title']['rendered']))
    sections.append({'post': p['id'], 'date': p['date'], 'link': p['link'], 'title': title, 'n': n, 'html': chapter_html(p['content']['rendered'])})
from collections import Counter
rep_notes = Counter(n for s in sections for n in set(re.findall(r'<p class="archive-note">(.*?)</p>', s['html'])))
for s in sections:
    s['html'] = re.sub(r'<p class="archive-note">(.*?)</p>\n?', lambda m: '' if rep_notes[m[1]] >= 2 and 'видео' not in m[1] else m[0], s['html'])
order = {'Вступление': -1, 'Эпилог': 10**6, 'Послесловие': 10**6 + 1, 'Благодарности': 10**6 + 2}
sections.sort(key=lambda s: (s['n'] if s['n'] is not None else order.get(s['title'], 10**5), s['date']))
book = {'title': a.title, 'language': 'ru', 'chapters': []}
for i, s in enumerate(sections):
    words = len(re.findall(r'\w+', plain(s['html'])))
    book['chapters'].append({'id': f'c{i}', 'title': s['title'], 'html': s['html'], 'words': words, 'source': {'post': s['post'], 'date': s['date'], 'link': s['link']}})
(dst / 'book.json').write_text(json.dumps(book, ensure_ascii=False, separators=(',', ':')))
print(f'{len(sections)} sections → {dst / "book.json"}')
for s in sections: print(f'  {s["date"][:10]}  {s["title"]:<16} {len(plain(s["html"])):>7} зн.  post {s["post"]}')
