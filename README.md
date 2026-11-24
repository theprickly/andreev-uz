# andreev.uz

Главная страница andreev.uz.

- Хостинг: Cloudflare Workers (static assets), Worker `andreev`
- Деплой: автоматически при пуше в `main`
- Домен: andreev.uz (www → редирект на корень)

## VSplanet Книги — /books/

- `books-src/` — исходник: результат `prepare-release.py` из архива проекта. Новые релизы класть сюда.
- `books/` — **собранный** сайт, который отдаётся по andreev.uz/books/. Руками не править.
- Сборка после любого изменения `books-src/` или `tools/`:

      python3 tools/build-vsplanet.py                                  # → books/
      python3 tools/check.py books https://andreev.uz/books/           # автопроверки
      python3 tools/build-vsplanet.py --vsplanet ../out/site           # пакет для books.vsplanet.net

  Подробности — `tools/README.md`. Нужны Python-пакеты pillow, fonttools, brotli (`pip install pillow fonttools brotli`).
- Старые адреса `/eddie/`, `/hart/`… в корне — страницы-переадресации на `/books/…`.

## Перенос подкаста MAVE → Internet Archive — /mave/

- `mave/index.html` — интерфейс: читает RSS, ведёт очередь выпусков, хранит прогресс в localStorage браузера.
- `worker.js` — Worker-обработчик только для `/mave/api/*` (`run_worker_first`), всё остальное — статика как раньше.
  Перекачивает выпуск потоком `api.mave.digital` → `s3.us.archive.org`; источники ограничены `*.mave.digital`, ключи IA не сохраняются.
- Перенос идёт, пока открыта вкладка andreev.uz/mave/.

## Конструктор страниц Uzum Bank — /ubweb/

- `ubweb/` — статическое приложение без сборки: `index.html`, `app.js`, `blocks.js`, `chrome.js`, `icons.js`, `app.css` и `site/` (CSS, JS, шрифты и картинки, которые попадают в выгружаемый сайт).
- Проекты хранятся в браузере (IndexedDB), сервер не нужен. Закрыт от поисковиков (`X-Robots-Tag: noindex`).
- Закрыт паролем (HTTP Basic) в `worker.js`: в коде хранится только SHA-256 от «логин:пароль». Сменить пароль — секрет `UBWEB_AUTH_SHA256` у Worker (`printf 'логин:пароль' | sha256sum`).
