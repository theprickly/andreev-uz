#!/usr/bin/env python3
"""Слой 1: механические правки текста (безопасные, идемпотентные, без изменения числа/порядка абзацев).
python3 scripts/typo.py books/<slug> [--apply]   → печатает сводку; с --apply пишет book.json и changes.json.
Правит только текстовые узлы (и data-note сносок), теги и структура не меняются.
Не применяет, а только помечает: повторы слов, неоднозначную латиницу в кириллических словах, имена с точками, несбалансированные кавычки."""
import json, re, sys, pathlib, datetime

NB = ' '
HOMO = dict(zip('aceopxyABCEHKMOPTXy', 'асеорхуАВСЕНКМОРТХу'))          # латинские двойники кириллицы → кириллица
HOMO_BACK = {v: k for k, v in zip('aceopxyABCEHKMOPTX', 'асеорхуАВСЕНКМОРТХ')}  # и обратно, для латинских токенов
CYR = 'А-Яа-яЁё'
BLOCKS = {'p', 'h2', 'h3', 'blockquote', 'figure'}
VOID = {'br', 'img', 'hr', 'input', 'meta', 'link'}
NBSP_RE = re.compile(r'(?<![\wА-Яа-яЁё])((?:[вксуоиа]|на|но|по|за|из|от|до|во|со|ко|об|не|ни)) (?=[\wА-Яа-яЁё«„"(])', re.I)

GLOSS = []
_gp = pathlib.Path(__file__).resolve().parents[1] / 'glossary.json'
if _gp.exists():
    for e in json.loads(_gp.read_text())['entries']:
        pairs = [(v, e['canonical']) for v in e['variants']]
        if e.get('common'):   # нарицательное слово: правим и строчную, и заглавную форму
            pairs += [(v[0].upper() + v[1:], e['canonical'][0].upper() + e['canonical'][1:]) for v in e['variants']]
        for v, cn in pairs: GLOSS.append((re.compile(r'(?<![А-Яа-яЁёA-Za-z])' + re.escape(v) + r'(?=[а-яё]{0,4}(?![А-Яа-яЁёA-Za-z]))'), v, cn))

class Log:
    def __init__(self): self.items = []; self.flags = []; self.counts = {}
    def add(self, rule, ci, bi, before, after):
        self.counts[rule] = self.counts.get(rule, 0) + 1
        if rule != 'nbsp': self.items.append({'rule': rule, 'c': ci, 'p': bi, 'a': before, 'b': after})
    def flag(self, kind, ci, bi, text): self.flags.append({'kind': kind, 'c': ci, 'p': bi, 't': text})

def snip(t, s, e, pad=28):
    return t[max(0, s - pad):s] + '⟦' + t[s:e] + '⟧' + t[e:e + pad]

def sub_log(rx, repl, text, rule, ci, bi, log, flags=0):
    def f(m):
        new = m.expand(repl) if isinstance(repl, str) else repl(m)
        if new != m[0]: log.add(rule, ci, bi, snip(text, m.start(), m.end()), snip(text, m.start(), m.end()).replace('⟦' + m[0] + '⟧', '⟦' + new + '⟧', 1))
        return new
    return re.sub(rx, f, text, flags=flags)

def fix_homoglyphs(text, ci, bi, log):
    def word(m):
        w = m[0]
        lat = re.findall(r'[A-Za-z]', w); cyr = re.findall(r'[А-Яа-яЁё]', w)
        if not lat or not cyr: return w
        if all(c in HOMO for c in lat) and (len(cyr) > len(lat) or not any(c.isdigit() for c in w)) and not any(c in HOMO_BACK for c in cyr[:0]):
            # токен в основном кириллический → латиницу в кириллицу
            if len(cyr) >= len(lat) and not re.search(r'\d', w):
                new = ''.join(HOMO.get(c, c) for c in w)
                log.add('латиница в кириллице', ci, bi, snip(text, m.start(), m.end()), snip(text, m.start(), m.end()).replace('⟦' + w + '⟧', '⟦' + new + '⟧', 1)); return new
        if any(c not in HOMO for c in lat) and all(c in HOMO_BACK for c in cyr):
            # латинский токен (CD, CR500) с затесавшейся кириллицей → латиница
            new = ''.join(HOMO_BACK.get(c, c) for c in w)
            log.add('латиница в кириллице', ci, bi, snip(text, m.start(), m.end()), snip(text, m.start(), m.end()).replace('⟦' + w + '⟧', '⟦' + new + '⟧', 1)); return new
        if re.search(r'\d', w) and all(c in HOMO_BACK for c in cyr):
            new = ''.join(HOMO_BACK.get(c, c) for c in w)
            log.add('латиница в кириллице', ci, bi, snip(text, m.start(), m.end()), snip(text, m.start(), m.end()).replace('⟦' + w + '⟧', '⟦' + new + '⟧', 1)); return new
        log.flag('смесь латиницы и кириллицы', ci, bi, snip(text, m.start(), m.end())); return w
    return re.sub(r'[A-Za-zА-Яа-яЁё0-9]+', word, text)

def fix_text(text, ci, bi, log):
    t = text
    t = fix_homoglyphs(t, ci, bi, log)
    for rx, v, c in GLOSS: t = sub_log(rx, c, t, 'словарь', ci, bi, log)
    t = sub_log(r'(?<=\S)  +(?=\S)', ' ', t, 'двойные пробелы', ci, bi, log)
    t = sub_log(r'(?<=[a-zа-яё]),(?=[А-Яа-яЁё])', ', ', t, 'пробел после запятой', ci, bi, log)
    t = sub_log(r'(?<=[а-яё]{3})\.(?=[А-ЯЁ][а-яё])(?<![А-ЯЁ][а-яё]{2}\.)', lambda m: '. ', t, 'пробел после точки', ci, bi, log) if False else t
    t = sub_log(r'\b([а-яё]{3,})\.(?=[А-ЯЁ][а-яё])', lambda m: m[1] + '. ', t, 'пробел после точки', ci, bi, log)
    t = sub_log(r'(?<=[А-Яа-яЁё]) +(?=[,;:!?](?:\s|$))', '', t, 'пробел перед знаком', ci, bi, log)
    t = sub_log(r'\.\.\.', '…', t, 'многоточие', ci, bi, log)
    t = sub_log(r'(?<=\s)[-–](?=\s)', '—', t, 'тире', ci, bi, log)
    t = sub_log(r'\b((?:1[89]|20)\d\d)-((?:1[89]|20)?\d\d)\b', lambda m: m[1] + '–' + m[2], t, 'диапазон лет', ci, bi, log)
    t = sub_log(r'(?<=\S) —', NB + '—', t, 'тире', ci, bi, log) if False else t
    # неразрывные пробелы (считаем, но не перечисляем)
    t = re.sub(r'(?<=[^\s' + NB + r']) —(?=\s|' + NB + ')', lambda m: (log.add('nbsp', ci, bi, '', '') or NB + '—'), t)
    t = NBSP_RE.sub(lambda m: (log.add('nbsp', ci, bi, '', '') or m[1] + NB), t)
    return t

QUOTE_CH = '"“”„«»'
def fix_quotes(nodes, ci, bi, log):
    """nodes: список [текст,...] одного блока. Приводит "…", “…”, „…“ к «…» (вложенные — „…“). Нечётное — только флаг."""
    flat = ''.join(nodes)
    if not re.search(r'["“”„]', flat): return nodes
    ev = []   # (узел, смещение, символ)
    for ni, n in enumerate(nodes):
        for k, ch in enumerate(n):
            if ch in QUOTE_CH: ev.append((ni, k, ch))
    depth = 0; out = []
    for ni, k, ch in ev:
        full_before = ''.join(nodes[:ni]) + nodes[ni][:k]
        prev = full_before[-1:] if full_before else ''
        if ch in '«“„': op = True
        elif ch in '»”': op = False
        else: op = (not prev) or prev in '  ([—–-«„“\n'
        if ch == '“' and prev and prev.isalnum(): op = False   # “ после буквы — закрывающая (немецкий стиль „…“)
        if op: out.append((ni, k, ch, True, depth)); depth += 1
        else:
            depth -= 1
            if depth < 0: log.flag('несбалансированные кавычки', ci, bi, flat[:120]); return nodes
            out.append((ni, k, ch, False, depth))
    if depth != 0: log.flag('несбалансированные кавычки', ci, bi, flat[:120]); return nodes
    nodes = list(nodes)
    for ni, k, ch, op, d in reversed(out):
        if ch in '«»': continue
        new = ('«' if d == 0 else '„') if op else ('»' if d == 0 else '“')
        if new != ch:
            before = ''.join(nodes[:ni]) + nodes[ni]
            pos = len(''.join(nodes[:ni])) + k
            log.add('кавычки', ci, bi, snip(flat, pos, pos + 1), snip(flat, pos, pos + 1).replace('⟦' + ch + '⟧', '⟦' + new + '⟧', 1))
            nodes[ni] = nodes[ni][:k] + new + nodes[ni][k + 1:]
    return nodes

def repeats(text, ci, bi, log):
    for m in re.finditer(r'(?<=[а-яёА-ЯЁ])—(?=[а-яёА-ЯЁ])', text):
        log.flag('тире без пробелов', ci, bi, snip(text, m.start(), m.end()))
    for m in re.finditer(r'(?<![\wА-Яа-яЁё-])([а-яё]{2,})\s+\1(?![\wА-Яа-яЁё]|-)', text, re.I):
        log.flag('повтор слова', ci, bi, snip(text, m.start(), m.end()))
    for m in re.finditer(r'\b[А-ЯЁ][а-яё]{1,}\.[А-ЯЁ][а-яё]+', text):
        log.flag('точка вместо пробела в имени', ci, bi, snip(text, m.start(), m.end()))

def process_chapter(h, ci, log):
    parts = re.split(r'(<[^>]+>)', h)
    depth = 0; bi = -1; blocks = {}     # blocks[bi] = [индексы текстовых частей]
    cur = None
    meta = []
    for i, p in enumerate(parts):
        if p.startswith('<'):
            m = re.match(r'<(/?)([a-zA-Z0-9]+)', p)
            if not m: continue
            closing, tag = m[1] == '/', m[2].lower()
            if tag in VOID or p.endswith('/>'):
                if tag == 'img' and depth == 0 and not closing: bi += 1
                continue
            if not closing:
                if depth == 0 and tag in BLOCKS: bi += 1
                if tag == 'button' and 'data-note=' in p:
                    def fn(mm):
                        import html as H
                        note = H.unescape(mm[1]); nl = Log(); new = fix_text(note, ci, bi, nl)
                        for r, n in nl.counts.items(): log.counts[r] = log.counts.get(r, 0) + n
                        log.items += nl.items; log.flags += nl.flags
                        return mm[0] if new == note else 'data-note="' + H.escape(new, quote=True) + '"'
                    parts[i] = re.sub(r'data-note="([^"]*)"', fn, p)
                depth += 1
            else: depth -= 1
        else:
            if p.strip() or p: blocks.setdefault(max(bi, 0), []).append(i)
    for b, idxs in blocks.items():
        import html as H
        orig = [H.unescape(parts[i]) for i in idxs]
        nodes = fix_quotes(orig, ci, b, log)
        nodes = [fix_text(n, ci, b, log) for n in nodes]
        repeats(''.join(nodes), ci, b, log)
        for i, n, o in zip(idxs, nodes, orig):
            if n != o: parts[i] = H.escape(n, quote=False).replace('&#x27;', "'")
    return ''.join(parts)

def load_changes(bookdir):
    f = pathlib.Path(bookdir) / 'changes.json'
    if not f.exists(): return {'runs': [], 'flags': [], 'titles': []}
    c = json.loads(f.read_text())
    if 'runs' not in c:      # старый формат (один слой)
        c = {'runs': [{'name': 'Слой 1 · механические правки', 'date': c['date'], 'commit': c.get('commit'), 'counts': c['counts'], 'items': c['items']}], 'flags': c['flags'], 'titles': c['titles']}
    return c

def run(bookdir, apply=False, name='Слой 1 · механические правки'):
    bookdir = pathlib.Path(bookdir); data = json.loads((bookdir / 'book.json').read_text()); log = Log()
    for ci, ch in enumerate(data['chapters']):
        ch['html'] = process_chapter(ch['html'], ci, log)
    ch_ = load_changes(bookdir); ch_['flags'] = log.flags; ch_['titles'] = [c['title'] for c in data['chapters']]
    if log.counts:
        ch_['runs'].append({'name': name, 'date': datetime.date.today().isoformat(), 'commit': None, 'counts': log.counts, 'items': log.items})
    if apply:
        (bookdir / 'book.json').write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')))
        (bookdir / 'changes.json').write_text(json.dumps(ch_, ensure_ascii=False, indent=1))
    return ch_, log

if __name__ == '__main__':
    nm = sys.argv[sys.argv.index('--name') + 1] if '--name' in sys.argv else 'Слой 1 · механические правки'
    ch, lg = run(sys.argv[1], '--apply' in sys.argv, nm)
    print(sys.argv[1], lg.counts, 'flags:', len(ch['flags']))
