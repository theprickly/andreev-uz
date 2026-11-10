#!/usr/bin/env python3
"""Сквозная проверка в настоящем браузере (нужен Playwright):

    python3 tools/serve.py <папка сборки> 8802 &
    python3 tools/e2e.py http://localhost:8802

Открывает полку, книгу, главу, цитаты и 404 на телефоне и на компьютере; проверяет, что нет ошибок в консоли,
нарушений Content-Security-Policy и битых запросов, что читалка открывает главу, что книга скачивается
для чтения без сети и открывается офлайн, и что вёрстка не прыгает (CLS).
"""
import asyncio, sys
from playwright.async_api import async_playwright

BASE = sys.argv[1].rstrip("/")
fails = []
CLS_JS = """() => new Promise(r => { let v = 0; new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) v += e.value })
  .observe({type: 'layout-shift', buffered: true}); setTimeout(() => r(v), 1200) })"""


def watch(page, tag, problems):
    page.on("console", lambda m: problems.append(f"{tag}: console {m.type}: {m.text[:160]}") if m.type == "error" else None)
    page.on("pageerror", lambda e: problems.append(f"{tag}: JS: {str(e)[:160]}"))
    page.on("response", lambda r: problems.append(f"{tag}: HTTP {r.status} {r.url}") if r.status >= 400 and not r.url.endswith("/nope") else None)


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        STUB = lambda r: r.fulfill(status=200, content_type='application/javascript', body='')   # Метрику в тестах не дёргаем
        for dev, opts in (("телефон", dict(viewport={"width": 390, "height": 844}, device_scale_factor=3, is_mobile=True, has_touch=True)),
                          ("компьютер", dict(viewport={"width": 1366, "height": 800}))):
            ctx = await b.new_context(**opts)
            await ctx.route('**://mc.yandex.ru/**', STUB)
            for path in ("/", "/unfinished/", "/quotes/", "/lesnar/", "/lesnar/chapters/", "/hart/chapters/10.html", "/nope"):
                pg = await ctx.new_page()
                probs = []
                watch(pg, f"{dev} {path}", probs)
                resp = await pg.goto(BASE + path, wait_until="networkidle")
                if (resp.status == 404) != (path == "/nope"):
                    probs.append(f"{dev} {path}: статус {resp.status}")
                cls = await pg.evaluate(CLS_JS)
                if cls > 0.05:
                    probs.append(f"{dev} {path}: CLS {cls:.3f}")
                h1 = await pg.locator("h1").first.text_content()
                if not (h1 or "").strip():
                    probs.append(f"{dev} {path}: пустой h1")
                broken = await pg.evaluate("[...document.images].filter(i => i.complete && !i.naturalWidth && i.getBoundingClientRect().width > 0).map(i => i.currentSrc || i.src)")
                if broken:
                    probs.append(f"{dev} {path}: не загрузились картинки {broken[:2]}")
                if path == "/" and dev == "телефон":
                    if await pg.locator("main > .ibanner").count() != 1:
                        probs.append("телефон /: баннер установки не заменён скриптом")
                    src = await pg.locator(".book .cover img").first.evaluate("i => i.currentSrc")
                    if not src.endswith(".webp"):
                        probs.append(f"телефон /: обложка {src}")
                if path == "/" and dev == "компьютер":
                    src = await pg.locator(".book .cover img").first.evaluate("i => i.currentSrc")
                    if "-360.webp" not in src and "-240.webp" not in src:
                        probs.append(f"компьютер /: обложка не из srcset: {src}")
                if path == "/quotes/":
                    if await pg.locator(".qs-slide").count() < 5:
                        probs.append(f"{dev} /quotes/: карусель пустая")
                if path == "/nope":
                    probs = [x for x in probs if "404" not in x]
                print(f"  {dev:10} {path:26} CLS {cls:.3f}  {'ok' if not probs else 'ПРОБЛЕМЫ'}")
                fails.extend(probs)
                await pg.close()

            # читалка: открыть главу по прямой ссылке и через кнопку
            pg = await ctx.new_page()
            probs = []
            watch(pg, f"{dev} читалка", probs)
            await pg.goto(BASE + "/lesnar/#read/3", wait_until="networkidle")
            await pg.wait_for_timeout(600)
            title = (await pg.locator("#chapter-title").text_content() or "").strip()
            paras = await pg.locator("#reader p").count()
            if not title or paras < 5:
                probs.append(f"{dev}: читалка не открыла главу (заголовок «{title}», абзацев {paras})")
            await pg.goto(BASE + "/lesnar/#read/999", wait_until="networkidle")
            await pg.wait_for_timeout(400)
            print(f"  {dev:10} читалка #read/3            {'ok' if not probs else 'ПРОБЛЕМЫ'}")
            fails.extend(probs)
            await pg.close()

            if dev == "телефон":
                # офлайн: скачать книгу с полки, отключить сеть, открыть книгу и главу
                pg = await ctx.new_page()
                probs = []
                watch(pg, "офлайн", probs)
                await pg.goto(BASE + "/", wait_until="networkidle")
                await pg.evaluate("navigator.serviceWorker.ready")
                # скачивание книги теперь живёт на её странице («Без сети → Скачать»), а не на карточке полки
                await pg.goto(BASE + "/lesnar/", wait_until="networkidle")
                await pg.locator('[data-offline="lesnar"]').click()
                st = ""
                for _ in range(60):            # опрос атрибута: wait_for_function упирается в CSP сайта (нет unsafe-eval)
                    st = await pg.locator('[data-offline="lesnar"]').get_attribute("data-st")
                    if st in ("ready", "error"):
                        break
                    await pg.wait_for_timeout(1000)
                if st != "ready":
                    probs.append(f"офлайн: книга не скачалась (состояние {st})")
                await ctx.set_offline(True)
                await pg.goto(BASE + "/", wait_until="load")
                n = await pg.locator(".book").count()
                bad = await pg.evaluate("[...document.images].filter(i => i.complete && !i.naturalWidth && i.getBoundingClientRect().width > 0).length")
                if n < 5 or bad:
                    probs.append(f"офлайн: полка без сети — книг {n}, битых обложек {bad}")
                await pg.goto(BASE + "/lesnar/#read/1", wait_until="load")
                await pg.wait_for_timeout(1200)
                paras = await pg.locator("#reader p").count()
                if paras < 5:
                    probs.append(f"офлайн: скачанная книга не открылась без сети (абзацев {paras})")
                await ctx.set_offline(False)
                probs = [x for x in probs if "ERR_INTERNET_DISCONNECTED" not in x and "Failed to load resource" not in x]
                print(f"  {'телефон':10} скачать и читать без сети  {'ok' if not probs else 'ПРОБЛЕМЫ'}")
                fails.extend(probs)
                await pg.close()
            await ctx.close()

        # без JavaScript: полка, книга и глава должны быть читаемы
        ctx = await b.new_context(java_script_enabled=False, viewport={"width": 390, "height": 844})
        pg = await ctx.new_page()
        await pg.goto(BASE + "/")
        if await pg.locator(".book h2 a").count() < 5:
            fails.append("без JS: на полке нет ссылок на книги")
        await pg.goto(BASE + "/lesnar/")
        if await pg.locator('noscript a[href="chapters/"], a[href="chapters/"]').count() < 1:
            fails.append("без JS: на странице книги нет ссылки на главы")
        await pg.goto(BASE + "/lesnar/chapters/03.html")
        if await pg.locator(".book-prose p").count() < 5:
            fails.append("без JS: текст главы не виден")
        print(f"  {'без JS':10} полка → книга → глава      {'ok' if not any(x.startswith('без JS') for x in fails) else 'ПРОБЛЕМЫ'}")
        await b.close()
    for f in fails:
        print("  ОШИБКА:", f)
    print("ИТОГ:", "ошибок нет" if not fails else f"ошибок: {len(fails)}")
    sys.exit(1 if fails else 0)

asyncio.run(main())
