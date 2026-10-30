"""Проверка качества перевода и безопасные автоправки для book.json.

  python3 qa.py book.json --report qa.md [--fix out.json]

Что проверяет:
  • орфография (словарь Hunspell ru через nspell, если доступен node), неизвестные слова с частотой
  • разнобой написаний имён (Шол/Шоул, Нобс/Ноббс) — кластеры похожих слов с заглавной
  • типографика: «–» вместо «—», дефис вместо тире, двойные пробелы, пробелы в скобках, «...»
  • следы веб-публикации: ссылки, «видео», «продолжение следует», YouTube, embed-хвосты
  • переводческие огрехи: кальки с английского, канцелярит, «является», лишние «свой/был»
  • непереведённые фрагменты латиницей, повторы слов, дубли абзацев, пропуски нумерации глав
Автоправки (--fix) трогают только типографику и согласованные написания; порядок абзацев не меняется.
"""
import json, re, sys, html, argparse, subprocess, pathlib
from collections import Counter, defaultdict

CALQUES = {
    r'\bв конце дня\b': 'калька «at the end of the day» → «в итоге»',
    r'\bделает смысл\b|\bимеет смысл\b(?= для)': 'калька «make sense»',
    r'\bэто не мое дело\b': 'проверить контекст',
    r'\bбыло сделано мной\b|\bмной было\b': 'пассив по-английски',
    r'\bзаймет место\b': 'калька «take place» → «пройдёт»',
    r'\bвзять перерыв\b': 'калька «take a break» → «сделать перерыв»',
    r'\bсделать разницу\b': 'калька «make a difference»',
    r'\bв любом случае\b': 'часто лишнее «anyway»',
    r'\bабсолютно\b': 'часто калька «absolutely»',
    r'\bреально\b': 'разговорное, проверить',
    r'\bдостаточно\s+(?:хорош|плох)': 'калька «pretty good»',
}
OFFICIALESE = [r'\bявляется\b', r'\bявляются\b', r'\bданн(?:ый|ая|ое|ые)\b', r'\bосуществля', r'\bв связи с тем\b', r'\bпо причине того\b', r'\bв рамках\b']
LEFTOVERS = [r'https?://', r'youtu', r'[Аа]льтернативная ссылка', r'[Пп]родолжение следует', r'[Сс]мотрите видео', r'[Вв]идео (?:выше|ниже)', r'\bна сайт[еу]?\b', r'[Пп]ерерыв.*перевод', r'\[embed', r'\bприм\.\s*ред\b']
TYPO = [(r'(?<=\S) – (?=\S)', ' — ', 'короткое тире «–» вместо длинного'),
        (r'(?<=[!?.,…]) – ', ' — ', 'короткое тире в диалоге'),
        (r'^\s*[–-] ', '— ', 'реплика с дефиса/короткого тире'),
        (r'(?<=[а-яё»)]) - (?=[а-яё«(])', ' — ', 'дефис вместо тире'),
        (r'\.\.\.', '…', 'три точки вместо многоточия'),
        (r'(?<=\S) {2,}(?=\S)', ' ', 'двойной пробел'),
        (r'\(\s+', '(', 'пробел после скобки'), (r'\s+\)', ')', 'пробел перед скобкой'),
        (r'\s+([,.;:!?])(?!\.)', r'\1', 'пробел перед знаком препинания')]


def text_of(h):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', h))).strip()


def edit1(a, b):
    if abs(len(a) - len(b)) > 1 or a == b: return False
    if len(a) == len(b): return sum(x != y for x, y in zip(a, b)) == 1
    if len(a) > len(b): a, b = b, a
    return any(b[:i] + b[i + 1:] == a for i in range(len(b)))


def spell_unknown(words):
    """Неизвестные словарю слова через nspell (если установлен рядом)."""
    js = r'''const fs=require('fs');const {createRequire}=require('module');const r=createRequire(process.env.NSPELL_DIR+'/x.js');
const nspell=r('nspell');const aff=fs.readFileSync(process.env.NSPELL_DIR+'/node_modules/dictionary-ru/index.aff'),dic=fs.readFileSync(process.env.NSPELL_DIR+'/node_modules/dictionary-ru/index.dic');
const sp=nspell(aff,dic);const ws=JSON.parse(fs.readFileSync(0,'utf8'));const ok=w=>sp.correct(w)||sp.correct(w.toLowerCase())||sp.correct(w.replace(/е/g,'ё'))||sp.correct(w.toLowerCase().replace(/е/g,'ё'));
console.log(JSON.stringify(ws.filter(w=>!(ok(w)||w.split('-').every(ok)))));'''
    import os
    d = os.environ.get('NSPELL_DIR', '/home/claude/fontpkgs')
    try:
        r = subprocess.run(['node', '-e', js], input=json.dumps(sorted(words)), capture_output=True, text=True, env={**os.environ, 'NSPELL_DIR': d}, timeout=120)
        return set(json.loads(r.stdout)) if r.returncode == 0 else None
    except Exception:
        return None


def analyze(book):
    ch = book['chapters']
    texts = [text_of(c['html']) for c in ch]
    allt = ' '.join(texts)
    words = re.findall(r'[А-Яа-яЁё]+(?:-[А-Яа-яЁё]+)*', allt)
    nwords = len(words)
    rep = {'chapters': len(ch), 'words': nwords}
    # нумерация глав
    nums = [int(m[1]) for c in ch if (m := re.match(r'^Глава\s+(\d+)', c['title']))]
    rep['numbering_gaps'] = sorted(set(range(1, max(nums) + 1)) - set(nums)) if nums else []
    rep['numbering_dupes'] = [n for n, k in Counter(nums).items() if k > 1]
    # дубли абзацев
    paras = Counter(p.strip() for c in ch for p in re.findall(r'<p[^>]*>(.*?)</p>', c['html'], re.S) if len(text_of(p)) > 60)
    rep['duplicate_paragraphs'] = [text_of(p)[:80] for p, k in paras.items() if k > 1][:20]
    # орфография
    freq = Counter(words)
    unk = spell_unknown(set(freq))
    rep['unknown_words'] = sorted(((w, freq[w]) for w in unk), key=lambda x: -x[1]) if unk is not None else 'nspell недоступен'
    # разнобой имён: слова с заглавной, редкий вариант рядом с частым
    lower = {w.lower() for w in freq if w[0].islower()}
    caps = {w: n for w, n in freq.items() if w[0].isupper() and len(w) >= 4 and w.lower() not in lower}
    stems = defaultdict(list)
    for w in caps: stems[w[:3]].append(w)
    variants = []
    for group in stems.values():
        for i, a in enumerate(group):
            for b in group[i + 1:]:
                if edit1(a, b) and min(caps[a], caps[b]) <= 3 and a[:-1] != b[:-1] and a.rstrip('аеуыиоюя') != b.rstrip('аеуыиоюя') and a[:-2] != b[:-2]:
                    variants.append((a, caps[a], b, caps[b]))
    rep['name_variants'] = sorted(variants, key=lambda v: -(v[1] + v[3]))[:60]
    # стиль и следы
    def hits(patterns, label_map=None):
        out = []
        for i, t in enumerate(texts):
            for pat in patterns:
                for m in re.finditer(pat, t, re.I):
                    out.append({'chapter': i, 'title': ch[i]['title'], 'match': m.group(0), 'note': (label_map or {}).get(pat, ''),
                                'context': t[max(0, m.start() - 60):m.end() + 60]})
        return out
    rep['calques'] = hits(list(CALQUES), CALQUES)
    rep['officialese_per_1000'] = round(sum(len(re.findall(p, allt, re.I)) for p in OFFICIALESE) / max(1, nwords) * 1000, 2)
    rep['leftovers'] = hits(LEFTOVERS)
    rep['latin_fragments'] = sorted(Counter(m for m in re.findall(r'\b[A-Za-z][A-Za-z\' ]{20,}[A-Za-z]\b', allt)).items(), key=lambda x: -x[1])[:30]
    rep['repeated_words'] = hits([r'\b([а-яё]{3,}) \1\b'])
    rep['typography'] = {label: sum(len(re.findall(p, t, re.M)) for t in texts) for p, _, label in TYPO}
    sents = re.split(r'(?<=[.!?…])\s+', allt)
    rep['long_sentences_over_60_words'] = sum(1 for s in sents if len(s.split()) > 60)
    # итоговая оценка (0–100), грубая
    unk_rate = (sum(n for _, n in rep['unknown_words']) / max(1, nwords) * 1000) if isinstance(rep['unknown_words'], list) else 0
    score = 100 - min(25, sum(rep['typography'].values()) / max(1, nwords) * 2000) - min(25, len(rep['leftovers']) * 2) \
            - min(15, len(rep['name_variants'])) - min(15, rep['officialese_per_1000'] * 3) - min(10, len(rep['calques'])) - min(10, len(rep['numbering_gaps']) * 5)
    rep['score'] = round(max(0, score))
    rep['unknown_per_1000'] = round(unk_rate, 1)
    return rep


def fix(book):
    log = []
    for i, c in enumerate(book['chapters']):
        parts = re.split(r'(<[^>]+>)', c['html'])
        for k, p in enumerate(parts):
            if p.startswith('<'): continue
            for pat, sub, label in TYPO:
                new = re.sub(pat, sub, p, flags=re.M)
                if new != p:
                    log.append(f'гл.{i}: {label} ×{len(re.findall(pat, p, re.M))}'); p = new
            parts[k] = p
        c['html'] = ''.join(parts)
    return log


def md(rep, title):
    L = [f'# Проверка качества: {title}', '', f'**Оценка: {rep["score"]}/100** · {rep["chapters"]} разделов · {rep["words"]:,} слов'.replace(',', ' '), '']
    L += ['## Структура', f'- Пропуски нумерации глав: {rep["numbering_gaps"] or "нет"}', f'- Повторы номеров: {rep["numbering_dupes"] or "нет"}',
          f'- Дубли абзацев: {len(rep["duplicate_paragraphs"])}'] + [f'  - {d}…' for d in rep['duplicate_paragraphs']]
    L += ['', '## Типографика (исправляется автоматически)'] + [f'- {k}: {v}' for k, v in rep['typography'].items() if v]
    L += ['', f'## Следы веб-публикации ({len(rep["leftovers"])})'] + [f'- {x["title"]}: «…{x["context"]}…»' for x in rep['leftovers'][:40]]
    L += ['', f'## Разнобой в именах ({len(rep["name_variants"])})'] + [f'- {a} ×{na} / {b} ×{nb}' for a, na, b, nb in rep['name_variants']]
    if isinstance(rep['unknown_words'], list):
        L += ['', f'## Орфография: неизвестные словарю слова ({len(rep["unknown_words"])}, {rep["unknown_per_1000"]} на 1000 слов)',
              'Большинство — имена и сленг; проверить редкие (×1–2):', '',
              ', '.join(f'{w}' for w, n in rep['unknown_words'] if n <= 2)[:6000]]
    L += ['', f'## Стиль перевода', f'- Канцелярит («является», «данный», «осуществлять»…): {rep["officialese_per_1000"]} на 1000 слов',
          f'- Предложения длиннее 60 слов: {rep["long_sentences_over_60_words"]}', f'- Возможные кальки ({len(rep["calques"])}):']
    L += [f'  - {x["title"]}: «{x["match"]}» — {x["note"]} · «…{x["context"]}…»' for x in rep['calques'][:40]]
    L += ['', f'## Повторы слов ({len(rep["repeated_words"])})'] + [f'- {x["title"]}: «…{x["context"]}…»' for x in rep['repeated_words'][:30]]
    L += ['', '## Фрагменты латиницей (возможно, не переведено)'] + [f'- {t} ×{n}' for t, n in rep['latin_fragments']]
    return '\n'.join(L) + '\n'


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('book'); ap.add_argument('--report'); ap.add_argument('--fix'); ap.add_argument('--json')
    a = ap.parse_args()
    book = json.loads(pathlib.Path(a.book).read_text())
    rep = analyze(book)
    if a.report: pathlib.Path(a.report).write_text(md(rep, book.get('title', '')))
    if a.json: pathlib.Path(a.json).write_text(json.dumps(rep, ensure_ascii=False, indent=1))
    if a.fix:
        log = fix(book); pathlib.Path(a.fix).write_text(json.dumps(book, ensure_ascii=False, separators=(',', ':')))
        print(len(log), 'typography fixes')
    print('score', rep['score'], '| leftovers', len(rep['leftovers']), '| name variants', len(rep['name_variants']), '| calques', len(rep['calques']))
