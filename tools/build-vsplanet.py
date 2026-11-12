#!/usr/bin/env python3
"""Собирает сайт VSplanet Книги из исходника books-src/.

  python3 tools/build-vsplanet.py                      # andreev.uz/books → папка books/ этого репозитория
  python3 tools/build-vsplanet.py --vsplanet <папка>   # books.vsplanet.net → отдельная папка для заливки на сервер
  python3 tools/build-vsplanet.py --vsplanet-path <папка>  # vsplanet.net/books/ → папка для заливки в <корень сайта>/books/

Исходник (books-src/) — результат prepare-release.py из архива проекта; его не трогаем.
Сборка переписывает абсолютные адреса, кладёт серверные файлы и запускает optimize.py.
"""
import json, pathlib, re, shutil, sys

TOOLS = pathlib.Path(__file__).resolve().parent
ROOT = TOOLS.parent
sys.path.insert(0, str(TOOLS))
import optimize

SRC = ROOT / "books-src"
OLD = "https://andreev.uz/books/"
VERSION = "1.28"
TEXT = {".html", ".xml", ".json", ".js", ".css", ".webmanifest", ".txt", ".svg"}

if "--vsplanet-path" in sys.argv:
    out = pathlib.Path(sys.argv[sys.argv.index("--vsplanet-path") + 1]).resolve()
    NEW, PREFIX, state = "https://vsplanet.net/books/", "/books/", TOOLS / "lastmod-vsplanet-books.json"
elif "--vsplanet" in sys.argv:
    out = pathlib.Path(sys.argv[sys.argv.index("--vsplanet") + 1]).resolve()
    NEW, PREFIX, state = "https://books.vsplanet.net/", "/", TOOLS / "lastmod-vsplanet.json"
else:
    out = ROOT / "books"
    NEW, PREFIX, state = OLD, "/books/", TOOLS / "lastmod-andreev.json"

PATH_MODE = "--vsplanet-path" in sys.argv
if out in (SRC, ROOT, TOOLS):
    raise SystemExit("нельзя собирать в эту папку")
if out.exists():
    shutil.rmtree(out)
shutil.copytree(SRC, out, ignore=shutil.ignore_patterns(".assetsignore", "_headers"))

old_ver = json.loads((out / "version.json").read_text("utf-8"))["label"]
changed = 0
for f in out.rglob("*"):
    if f.is_file() and f.suffix in TEXT and f.parent.name != "text":
        s = f.read_text("utf-8")
        t = s.replace(OLD, NEW).replace(OLD.rstrip("/"), NEW.rstrip("/"))
        if f.name == "manifest.webmanifest":
            m = json.loads(t.replace('"/books/"', f'"{PREFIX}"'))
            m["categories"] = ["books", "entertainment"]
            m["shortcuts"] = [{"name": "В работе", "url": PREFIX + "unfinished/"}, {"name": "Цитаты", "url": PREFIX + "quotes/"}]
            t = json.dumps(m, ensure_ascii=False, indent=1)
        if f.suffix == ".html":
            t = t.replace(f'<em class="ver">v {old_ver}</em>', f'<em class="ver">v {VERSION}</em>')
        if f.name == "version.json":
            t = json.dumps({"version": VERSION, "name": "", "label": VERSION})
        if t != s:
            f.write_text(t, "utf-8")
            changed += 1

for f in (TOOLS / "vsplanet").iterdir():
    if f.name == ".htaccess" and PREFIX != "/" and not PATH_MODE:
        continue                       # andreev.uz — Cloudflare, правила в /_headers
    s = f.read_text("utf-8")
    if f.name == ".htaccess" and PATH_MODE:   # vsplanet.net/books/: тот же файл, но для подпапки
        s = (s.replace("# books.vsplanet.net —", "# vsplanet.net/books/ —")
              .replace("ErrorDocument 404 /404.html", "ErrorDocument 404 /books/404.html")
              .replace("RewriteEngine On", "RewriteEngine On\n  RewriteBase /books/")
              .replace("https://books.vsplanet.net%{REQUEST_URI}", "https://vsplanet.net%{REQUEST_URI}")
              .replace("RewriteRule ^shelf/?$ / [R=301,L]", "RewriteRule ^shelf/?$ /books/ [R=301,L]"))
    if PREFIX != "/":                  # 404.html ссылается на ресурсы от корня сайта
        s = re.sub(r'(src|href)="/', rf'\1="{PREFIX}', s).replace("url(/", f"url({PREFIX}")
    (out / f.name).write_text(s, "utf-8")

print(f"сборка {NEW} → {out}")
print("оптимизация:")
optimize.run(out, NEW, state, SRC)

left = [str(f.relative_to(out)) for f in out.rglob("*")
        if f.is_file() and f.suffix in TEXT and f.parent.name != "text"
        and re.search(r"andreev\.uz" if PREFIX == "/" else r"books\.vsplanet\.net", f.read_text("utf-8"))]
print(f"файлов с новым адресом/версией: {changed}; ссылок на чужой домен: {len(left)}", left[:5])
