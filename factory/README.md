# VSplanet · Книжная фабрика

Ветка `book-factory`. Сбор текстов с vsplanet.net идёт в GitHub Actions: положите JSON-запрос в `factory/requests/`, запушьте — workflow скачает посты и закоммитит результат в `factory/out/<имя запроса>/`.

Запросы: `{"type":"discover"}` — найти серии-книги; `{"type":"fetch","search":"…","title_regex":"…"}` или `{"type":"fetch","category":ID}` — скачать посты и картинки.
