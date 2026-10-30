"""Автоподбор цитат: фраза из абзаца + индекс блока в главе (для ссылки #read/<глава>/<абзац>)."""
import html, re, random
from html.parser import HTMLParser

BLOCKS = {'p', 'h2', 'h3', 'blockquote', 'figure'}
KEY = re.compile(r'никогда|всегда|жизн|смерт|правд|боль|мечт|страх|силь|любо|деньг|побед|пораж|семь|бог|верил|ошибк|гордост|одиночеств|сердц|слёз|слез|уважен|судьб|шанс|ради|предател|ненавид|счастл|выбор|настоящ', re.I)
BAD = re.compile(r'https?:|www\.|\bглав[аеы]\b|прим\.|\bстр\.|©|\d{4,}|[A-Za-z]{4,}.*[A-Za-z]{4,}.*[A-Za-z]{4,}')


class Top(HTMLParser):
    def __init__(self):
        super().__init__(); self.depth = 0; self.items = []; self.cur = None
    def handle_starttag(self, tag, attrs):
        if self.depth == 0 and tag in BLOCKS: self.cur = [tag, []]
        if tag not in ('br', 'img', 'hr', 'input'): self.depth += 1
    def handle_endtag(self, tag):
        if tag in ('br', 'img', 'hr', 'input'): return
        self.depth -= 1
        if self.depth == 0 and self.cur: self.items.append(self.cur); self.cur = None
    def handle_data(self, d):
        if self.cur is not None: self.cur[1].append(d)


def blocks(h):
    h = re.sub(r'<button class="fn"[^>]*>\*</button>', '<sup>⁣</sup>', h)
    t = Top(); t.feed(h); return t.items


def sentences(text):
    return [s.strip() for s in re.split(r'(?<=[.!?…»])\s+(?=[«"—A-ZА-ЯЁ])', text) if s.strip()]


def extract(slug, data, n=14, seed=7):
    cands = []
    nch = len(data['chapters'])
    for ci, ch in enumerate(data['chapters']):
        for bi, (tag, parts) in enumerate(blocks(ch['html'])):
            if tag != 'p': continue
            text = re.sub(r'\s+', ' ', html.unescape(''.join(parts).replace('⁣', ''))).strip()
            if len(text) < 90: continue
            for s in sentences(text):
                if not 85 <= len(s) <= 200 or BAD.search(s) or not re.search(r'[.!?…»]$', s) or not re.match(r'[«"—A-ZА-ЯЁ]', s): continue
                if s.count('—') > 3 or s.count(',') > 5: continue
                sc = len(KEY.findall(s)) * 2 + (1 if 100 <= len(s) <= 180 else 0) + (1 if s.startswith('—') is False else 0) + (1 if ',' in s or '—' in s else 0)
                cands.append((sc, ci, bi, s))
    if not cands: return []
    rnd = random.Random(f'{slug}{seed}')
    cands.sort(key=lambda c: -c[0]); top = [c for c in cands if c[0] >= max(2, cands[min(len(cands) - 1, 80)][0])]
    rnd.shuffle(top); out, used = [], {}
    for sc, ci, bi, s in top:                    # не больше 2 цитат из одной главы
        if used.get(ci, 0) >= 2: continue
        used[ci] = used.get(ci, 0) + 1; out.append({'t': s, 'c': ci, 'p': bi, 'ch': data['chapters'][ci]['title']})
        if len(out) >= n: break
    return out
