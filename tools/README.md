# Сборка VSplanet Книги для books.vsplanet.net

    python3 tools/build-vsplanet.py                       # andreev.uz/books → books/
    python3 tools/build-vsplanet.py --vsplanet out/site   # books.vsplanet.net → out/site
    python3 tools/check.py out/site                       # автопроверки SEO и целостности (для books/: + https://andreev.uz/books/)
    python3 tools/serve.py out/site 8802 &                # локальный сервер, повторяет .htaccess
    python3 tools/e2e.py http://localhost:8802            # проверка в браузере (нужен playwright)

- `build-vsplanet.py` — копирует `books-src/`, меняет адреса и версию, вызывает `optimize.py`.
- `optimize.py` — SEO (JSON-LD, og-теги, sitemap с lastmod), вес (srcset обложек, подмножества шрифтов),
  доступность, баннер без сдвига вёрстки, чип «← VSplanet» и меню для компьютера, пересчёт хэшей и `files.json`.
- `lastmod-*.json` — даты изменения страниц для sitemap (отдельно для каждого домена); обновляются сами, их нужно коммитить.
- `vsplanet/` — файлы, которые кладутся в корень сайта (`.htaccess`, `404.html`).
- `nginx-books.conf`, `ДЛЯ-АДМИНА.md` — для администратора сервера.
- `andreev-uz-_redirects.txt` — переадресация со старых адресов, включать после запуска поддомена.
