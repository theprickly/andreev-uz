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
