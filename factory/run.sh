#!/usr/bin/env bash
# Полный прогон одной книги: нормализация → проверка + автоправки → обложка → сборка сайта и EPUB.
#   factory/run.sh <out-папка сборщика> <slug> "<Название>"
# Перед первым запуском положите books/<slug>/book.config.json (образец: books/jericho/book.config.json).
set -euo pipefail
cd "$(dirname "$0")"
OUT=$1; SLUG=$2; TITLE=$3
python3 scripts/normalize.py "out/$OUT" "books/$SLUG" --title "$TITLE" | tee "books/$SLUG/normalize.log"
cp "books/$SLUG/book.json" "books/$SLUG/book.raw.json"
python3 scripts/qa.py "books/$SLUG/book.raw.json" --fix "books/$SLUG/book.json" --report "books/$SLUG/qa-before.md"
python3 scripts/qa.py "books/$SLUG/book.json" --report "books/$SLUG/qa.md" --json "books/$SLUG/qa.json"
[ -f "books/$SLUG/assets/cover.jpg" ] || python3 scripts/cover.py "books/$SLUG/book.config.json" "books/$SLUG/assets"
python3 scripts/build_book.py "books/$SLUG" "../$SLUG"
python3 -m epubcheck ../$SLUG/assets/book-*.epub && echo "EPUB OK"
