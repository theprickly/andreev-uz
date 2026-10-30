"""VSplanet → книжная фабрика: сбор данных с vsplanet.net (WordPress).

Запускается в GitHub Actions (там есть доступ к сайту). Обрабатывает все файлы
factory/requests/*.json, у которых ещё нет результата в factory/out/<имя>/.

Типы запросов:
  {"type": "discover"}                         — найти книги/серии на сайте
  {"type": "fetch", "search": "Эдди Герреро"}   — скачать посты по поиску
  {"type": "fetch", "category": 123}            — или по рубрике / {"tag": 45} / {"ids": [..]}
"""
import json, os, re, sys, time, pathlib, html
from collections import defaultdict
import requests

SITE = os.environ.get('VS_SITE', 'https://vsplanet.net')
ROOT = pathlib.Path(__file__).resolve().parents[1]
REQ, OUT = ROOT / 'requests', ROOT / 'out'
S = requests.Session()
S.headers['User-Agent'] = 'VSplanet-Books-Factory/1.0 (+https://andreev.uz/eddie/)'


def get(path, **params):
    for attempt in range(4):
        try:
            r = S.get(SITE + path, params=params, timeout=40)
            if r.status_code == 400 and 'rest_post_invalid_page_number' in r.text:
                return [], {}
            r.raise_for_status()
            return r.json(), r.headers
        except Exception as e:
            if attempt == 3:
                raise
            time.sleep(3 * (attempt + 1))


def paged(path, **params):
    out, page = [], 1
    while True:
        data, h = get(path, per_page=100, page=page, **params)
        if not data:
            break
        out += data
        total = int(h.get('X-WP-TotalPages', page)) if h else page
        if page >= total:
            break
        page += 1
        time.sleep(.4)
    return out


def plain(s):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', s or ''))).strip()


SERIES = re.compile(r'(?i)^(.*?)(?:[\s.,:—–-]*(?:(?:глава|часть|chapter|ч\.)\s*#?\s*[\dIVXLC]+|#\s*\d+).*)$')


def discover(req, out):
    report = {'site': SITE}
    try:
        report['categories'] = [{k: c[k] for k in ('id', 'name', 'slug', 'count')} for c in paged('/wp-json/wp/v2/categories')]
    except Exception as e:
        report['categories_error'] = str(e)
    terms = req.get('terms') or ['глава', 'книга', 'автобиография', 'перевод книги', 'часть', '#1:', '#10', 'перевод']
    seen, posts = set(), []
    for t in terms:
        try:
            for p in paged('/wp-json/wp/v2/posts', search=t, _fields='id,date,link,title,categories,tags'):
                if p['id'] not in seen:
                    seen.add(p['id'])
                    posts.append({'id': p['id'], 'date': p['date'], 'link': p['link'], 'title': plain(p['title']['rendered']),
                                  'categories': p.get('categories', []), 'tags': p.get('tags', [])})
        except Exception as e:
            report.setdefault('search_errors', {})[t] = str(e)
    groups = defaultdict(list)
    for p in posts:
        m = SERIES.match(p['title'])
        if m and m.group(1).strip():
            groups[m.group(1).strip(' .:—–-').lower()].append(p)
    series = sorted(({'series': k, 'posts': len(v), 'first': min(x['date'] for x in v)[:10], 'last': max(x['date'] for x in v)[:10],
                      'sample': sorted(x['title'] for x in v)[:3]} for k, v in groups.items() if len(v) >= 3),
                    key=lambda g: -g['posts'])
    report['series'] = series
    report['posts_found'] = len(posts)
    (out / 'discover.json').write_text(json.dumps(report, ensure_ascii=False, indent=1))
    (out / 'posts.json').write_text(json.dumps(posts, ensure_ascii=False, indent=1))
    lines = [f'# Разведка {SITE}', f'Найдено постов: {len(posts)}; серий (3+ части): {len(series)}', '']
    lines += [f'- **{g["series"]}** — {g["posts"]} постов, {g["first"]} … {g["last"]}; напр. {"; ".join(g["sample"])}' for g in series]
    (out / 'README.md').write_text('\n'.join(lines) + '\n')


def fetch(req, out):
    params = {'_fields': 'id,date,modified,link,slug,title,content,excerpt,categories,tags,featured_media'}
    if req.get('ids'):
        posts = []
        for i in req['ids']:
            p, _ = get(f'/wp-json/wp/v2/posts/{i}', **params)
            posts.append(p)
    else:
        if req.get('search'): params['search'] = req['search']
        if req.get('category'): params['categories'] = req['category']
        if req.get('tag'): params['tags'] = req['tag']
        posts = paged('/wp-json/wp/v2/posts', orderby='date', order='asc', **params)
    if req.get('title_regex'):
        rx = re.compile(req['title_regex'], re.I)
        posts = [p for p in posts if rx.search(plain(p['title']['rendered']))]
    (out / 'posts').mkdir(exist_ok=True)
    index = []
    for p in posts:
        (out / 'posts' / f'{p["id"]}.json').write_text(json.dumps(p, ensure_ascii=False, indent=1))
        index.append({'id': p['id'], 'date': p['date'], 'title': plain(p['title']['rendered']), 'link': p['link'],
                      'chars': len(plain(p['content']['rendered']))})
    # картинки из постов — скачиваем, чтобы не зависеть от сайта
    imgs = set()
    for p in posts:
        imgs.update(re.findall(r'<img[^>]+src="([^"]+)"', p['content']['rendered']))
    (out / 'images').mkdir(exist_ok=True)
    manifest = {}
    for u in sorted(imgs):
        try:
            r = S.get(u, timeout=40); r.raise_for_status()
            name = re.sub(r'[^A-Za-z0-9._-]', '_', u.split('?')[0].split('/')[-1])[-80:]
            (out / 'images' / name).write_bytes(r.content); manifest[u] = name
        except Exception as e:
            manifest[u] = 'ERROR: ' + str(e)
    (out / 'images.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=1))
    (out / 'index.json').write_text(json.dumps(index, ensure_ascii=False, indent=1))
    (out / 'README.md').write_text(f'# {req.get("name", out.name)}\nПостов: {len(index)}, картинок: {len(manifest)}\n\n' +
                                   '\n'.join(f'- {x["date"][:10]} · {x["title"]} · {x["chars"]} зн.' for x in index) + '\n')


def authors(req, out):
    """Авторы публикаций (обычно переводчики) для уже скачанных книг."""
    res = {}
    for name in req['books']:
        idx = json.loads((OUT / name / 'index.json').read_text())
        ids = [x['id'] for x in idx]; book = {}
        for k in range(0, len(ids), 50):
            data, _ = get('/wp-json/wp/v2/posts', include=','.join(map(str, ids[k:k + 50])), per_page=50, _embed='author', _fields='id,author,_links,_embedded')
            for p in data:
                emb = (p.get('_embedded') or {}).get('author') or [{}]
                book[p['id']] = {'author_id': p.get('author'), 'name': emb[0].get('name'), 'slug': emb[0].get('slug')}
        res[name] = book
    (out / 'authors.json').write_text(json.dumps(res, ensure_ascii=False, indent=1))
    from collections import Counter
    lines = ['# Авторы публикаций', '']
    for name, book in res.items():
        c = Counter(v['name'] for v in book.values())
        lines.append(f'- **{name}**: ' + ', '.join(f'{n} ×{k}' for n, k in c.most_common()))
    (out / 'README.md').write_text('\n'.join(lines) + '\n')


def main():
    done = 0
    for f in sorted(REQ.glob('*.json')):
        out = OUT / f.stem
        if (out / 'README.md').exists():
            continue
        out.mkdir(parents=True, exist_ok=True)
        req = json.loads(f.read_text())
        try:
            {'discover': discover, 'fetch': fetch, 'authors': authors}[req['type']](req, out)
        except Exception as e:
            (out / 'README.md').write_text(f'# Ошибка\n{type(e).__name__}: {e}\n')
        done += 1
    print('processed', done)


if __name__ == '__main__':
    main()
