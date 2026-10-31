#!/usr/bin/env python3
"""Собирает весь сайт книг в <корень>/books/: каждая книга из books/<папка>/ → <корень>/books/<slug>/, затем полка.
Использование: python3 scripts/build_all.py <корень сайта> [slug ...]
Эдди теперь собирается так же, как остальные (тема eddie в themes.py)."""
import json, pathlib, shutil, subprocess, sys
F = pathlib.Path(__file__).resolve().parents[1]
root = pathlib.Path(sys.argv[1]).resolve(); only = set(sys.argv[2:])
shutil.rmtree(root / 'books' / 'shared', ignore_errors=True)     # общие файлы пересобираются начисто
for cfgp in sorted((F / 'books').glob('*/book.config.json')):
    slug = json.loads(cfgp.read_text())['slug']
    if only and slug not in only: continue
    out = root / 'books' / slug
    subprocess.run([sys.executable, str(F / 'scripts' / 'build_book.py'), str(cfgp.parent), str(out)], check=True)
subprocess.run([sys.executable, str(F / 'scripts' / 'build_shelf.py'), str(root)], check=True)
