#!/usr/bin/env python3
"""Автопроверки собранного сайта. Запуск:  python3 tools/check.py <папка сборки> [https://books.vsplanet.net/]

Ничего не меняет. Код возврата 1, если найдена хотя бы одна ошибка.
Проверяет: уникальные title/description, один h1, canonical, JSON-LD, внутренние ссылки и ресурсы,
sitemap/robots, размеры картинок, files.json и оболочку service worker, отсутствие чужих доменов.
"""
import collections, html, json, pathlib, re, sys, urllib.parse
import xml.etree.ElementTree as ET

out = pathlib.Path(sys.argv[1]).resolve()
BASE = sys.argv[2] if len(sys.argv) > 2 else "https://books.vsplanet.net/"
BPATH = urllib.parse.urlparse(BASE).path          # "/" для поддомена, "/books/" для andreev.uz
ALLOWED = {"books.vsplanet.net", "andreev.uz", "mc.yandex.ru", "vsplanet.net", "schema.org", "www.w3.org", "t.me", "www.sitemaps.org"}
errors, warns = [], []
err, warn = errors.append, warns.append


def url_of(rel):
    return BASE + re.sub(r"(^|/)index\.html$", r"\1", rel)


pages, titles, descs, indexable = {}, collections.defaultdict(list), collections.defaultdict(list), set()
for f in sorted(out.rglob("*.html")):
    rel = f.relative_to(out).as_posix()
    s = f.read_text("utf-8")
    pages[rel] = s
    if rel == "404.html" or 'content="noindex"' in s[:4000]:
        continue
    indexable.add(url_of(rel))
    t = re.search(r"<title>(.*?)</title>", s, re.S)
    d = re.search(r'<meta name="description" content="([^"]*)"', s)
    if not t or not t.group(1).strip():
        err(f"{rel}: нет <title>")
    else:
        titles[t.group(1)].append(rel)
    if not d or len(d.group(1)) < 50:
        err(f"{rel}: нет или слишком короткий description")
    else:
        descs[d.group(1)].append(rel)
    if not re.search(r'<html lang="ru"', s):
        err(f"{rel}: нет lang")
    if 'name="viewport"' not in s:
        err(f"{rel}: нет viewport")
    visible = re.sub(r"<template\b.*?</template>", "", s, flags=re.S)
    h1 = re.findall(r"<h1\b[^>]*>(.*?)</h1>", visible, re.S)
    filled = [x for x in h1 if re.sub(r"<[^>]+>", "", x).strip()]
    if len(filled) != 1:
        err(f"{rel}: непустых h1 — {len(filled)}")
    c = re.search(r'<link rel="canonical" href="([^"]+)"', s)
    if not c or c.group(1) != url_of(rel):
        err(f"{rel}: canonical {c and c.group(1)} ≠ {url_of(rel)}")
    for prop in ("og:title", "og:description", "og:url", "og:image", "og:type"):
        if f'property="{prop}"' not in s:
            err(f"{rel}: нет {prop}")
    blocks = re.findall(r'<script type="application/ld\+json">(.*?)</script>', s, re.S)
    if not blocks:
        err(f"{rel}: нет JSON-LD")
    for b in blocks:
        try:
            j = json.loads(b)
        except Exception as e:
            err(f"{rel}: JSON-LD не разбирается: {e}")
            continue
        flat = json.dumps(j)
        for bad in ("aggregateRating", "review", "offers", "isbn"):
            if f'"{bad}"' in flat:
                err(f"{rel}: в JSON-LD есть непроверяемое поле {bad}")
        for u in re.findall(r'"(https?://[^"]+)"', flat):
            host = urllib.parse.urlparse(u).netloc
            if host not in ALLOWED:
                err(f"{rel}: JSON-LD ссылается на {host}")
    for tag in re.findall(r"<img\b[^>]*>", visible):
        if "${" in tag:
            continue
        if " alt=" not in tag:
            err(f"{rel}: img без alt")
        if " width=" not in tag or " height=" not in tag:
            err(f"{rel}: img без width/height: {tag[:80]}")

for k, v in titles.items():
    if len(v) > 1:
        err(f"одинаковый title у {len(v)} страниц: {v[:3]}")
for k, v in descs.items():
    if len(v) > 1:
        err(f"одинаковый description у {len(v)} страниц: {v[:3]}")

# ссылки и ресурсы
ext_hosts = collections.Counter()
main_links = 0
for rel, s in pages.items():
    base_dir = (out / rel).parent
    body = re.sub(r"<script\b.*?</script>", "", s, flags=re.S)
    refs = re.findall(r'(?:href|src)="([^"]+)"', body)
    for ss in re.findall(r'srcset="([^"]+)"', body):
        refs += [x.strip().split(" ")[0] for x in ss.split(",")]
    for r in refs:
        r = html.unescape(r)
        if r.startswith(("#", "data:", "mailto:", "tg:")) or "${" in r:
            continue
        if r.startswith("http"):
            host = urllib.parse.urlparse(r).netloc
            ext_hosts[host] += 1
            if host == "vsplanet.net":
                main_links += 1
            if host == urllib.parse.urlparse(BASE).netloc:
                p = out / urllib.parse.urlparse(r).path[len(BPATH):]
                if not (p.is_file() or (p / "index.html").is_file()):
                    err(f"{rel}: битая абсолютная ссылка {r}")
            elif host not in ALLOWED:
                err(f"{rel}: внешний адрес {host}")
            continue
        path = r.split("#")[0].split("?")[0]
        if not path:
            continue
        p = (out / path[len(BPATH):]) if path.startswith("/") else (base_dir / path)
        p = p.resolve()
        if not (p.is_file() or (p.is_dir() and (p / "index.html").is_file())):
            err(f"{rel}: битая ссылка {r}")
        elif p.is_dir() and not path.endswith("/"):
            warn(f"{rel}: ссылка на папку без завершающего «/»: {r} (лишний редирект)")
        if 'target="_blank"' in s and 'rel="noopener"' not in s:
            err(f"{rel}: target=_blank без rel=noopener")

for f in out.rglob("*"):
    if f.is_file() and f.suffix in {".css", ".js", ".json", ".webmanifest", ".xml", ".txt", ".html"} and f.parent.name != "text":
        s = f.read_text("utf-8")
        if (urllib.parse.urlparse(BASE).netloc != "andreev.uz" and "andreev.uz" in s) or "localhost" in s or "/home/" in s:
            err(f"{f.relative_to(out)}: остался andreev.uz / localhost / локальный путь")
        if f.suffix == ".css":
            for u in re.findall(r"url\(([^)]+)\)", s):
                u = u.strip("\"'")
                if u.startswith(("data:", "#")):
                    continue
                if not (f.parent / u).resolve().is_file() and "/" in u and "assets/" not in u:
                    err(f"{f.relative_to(out)}: нет файла {u}")

# sitemap / robots
robots = (out / "robots.txt" if (out / "robots.txt").exists() else out.parent / "robots.txt").read_text()
if f"Sitemap: {BASE}sitemap.xml" not in robots or "Disallow: /" in robots.replace("Disallow: /\n\n", "x") and "Disallow: /\n" in robots:
    err("robots.txt: нет ссылки на sitemap или сайт закрыт")
ns = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
locs = set()
for sm in ET.parse(out / "sitemap.xml").getroot().findall("s:sitemap/s:loc", ns):
    p = out / sm.text[len(BASE):]
    if not p.is_file():
        err(f"sitemap.xml: нет файла {sm.text}")
        continue
    for u in ET.parse(p).getroot().findall("s:url", ns):
        loc = u.find("s:loc", ns).text
        lm = u.find("s:lastmod", ns)
        if lm is None or not re.fullmatch(r"\d{4}-\d\d-\d\d", lm.text):
            err(f"sitemap: нет lastmod у {loc}")
        if loc in locs:
            err(f"sitemap: дубль {loc}")
        locs.add(loc)
if locs != indexable:
    err(f"sitemap ≠ индексируемые страницы: лишние {sorted(locs - indexable)[:3]}, пропущены {sorted(indexable - locs)[:3]}")

# офлайн-режим
sw = (out / "sw.js").read_text("utf-8")
for p in json.loads(re.search(r"const SHELL=(\[.*?\]);", sw, re.S).group(1)):
    q = out / p.split("?")[0]
    if not (q.is_file() or (q / "index.html").is_file()):
        err(f"sw.js: в оболочке нет {p}")
nbooks = 0
for fj in sorted(out.glob("*/files.json")):
    j = json.loads(fj.read_text())
    nbooks += 1
    total = 0
    for name, size in j["files"]:
        p = (fj.parent / ("index.html" if name == "./" else name)).resolve()
        if not p.is_file():
            err(f"{fj.parent.name}/files.json: нет {name}")
        elif p.stat().st_size != size:
            err(f"{fj.parent.name}/files.json: размер {name} не совпадает")
        total += size
    if total != j["bytes"]:
        err(f"{fj.parent.name}/files.json: сумма bytes не сходится")
man = json.loads((out / "manifest.webmanifest").read_text())
if man["start_url"] != BPATH or man["scope"] != BPATH:
    err(f"manifest: start_url/scope должны быть «{BPATH}»")
for must in ((".htaccess", "robots.txt") if BPATH == "/" else ()) + ("404.html", "sitemap.xml"):
    if not (out / must).is_file():
        err(f"нет файла {must}")
if main_links < len(indexable) * 2:
    warn(f"ссылка на vsplanet.net есть не на всех страницах ({main_links} ссылок на {len(indexable)} страниц)")

print(f"страниц: {len(pages)} (индексируемых {len(indexable)}), книг: {nbooks}, URL в sitemap: {len(locs)}")
print("внешние домены в ссылках:", dict(ext_hosts))
for w in warns[:10]:
    print("  предупреждение:", w)
if len(warns) > 10:
    print(f"  … и ещё {len(warns) - 10} предупреждений")
for e in errors[:40]:
    print("  ОШИБКА:", e)
print("ИТОГ:", "ошибок нет" if not errors else f"ошибок: {len(errors)}")
sys.exit(1 if errors else 0)
