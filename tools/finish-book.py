#!/usr/bin/env python3
"""Перевод книги завершён: переносит её из «В работе» на основную полку.

    python3 tools/finish-book.py holly          # правит books-src/
    python3 tools/build-vsplanet.py             # затем обычная сборка → books/

Что делает (всё — в books-src/, как если бы фабрика собрала книгу без пометки incomplete):
  1. EPUB из текущего текста глав (tools/epub.py — копия factory/scripts/epub.py с ветки book-factory);
  2. страница книги: манифест PWA, pwa.js, блок «Читайте где удобно» (офлайн, приложение, EPUB),
     вкладка «Без сети», кнопка установки в настройках и диалог установки — образец берётся у готовой книги;
  3. тексты: убирает «перевод не закончен / продолжается / неполный», incomplete в BOOK_CONFIG → null;
  4. полка: карточка уходит из unfinished/ в конец основной полки, с кнопкой офлайна и ссылкой на EPUB.

Недостающие для EPUB поля (соавторы, выходные данные, источник) берутся из book.config.json книги
на ветке book-factory (git show origin/book-factory:…), тексты «не закончен» в них исправляются.
"""
import json, pathlib, re, subprocess, sys, tempfile

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import epub  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "books-src"
DONOR = "heenan"      # готовая книга без писем и альбома — образец блоков, которых нет у неполных


def need(cond, what):
    if not cond:
        raise SystemExit(f"finish-book: {what}")


def sub1(s, old, new, what):
    need(s.count(old) == 1, f"ожидал 1× «{what}», нашёл {s.count(old)}")
    return s.replace(old, new)


def block(s, pat, what):
    m = re.search(pat, s, re.S)
    need(m, f"не нашёл у {DONOR}: {what}")
    return m.group(0)


def h12(b):
    import hashlib
    return hashlib.sha256(b).hexdigest()[:12]


def mb(n):
    return f"{n / 1048576:.1f}".replace(".", ",")


def finished_text(t):
    t = re.sub(r"\s*\(перевод не закончен\)", "", t)
    t = re.sub(r"\s*\(не закончен\)", "", t)
    t = t.replace(" — неполный перевод для VSplanet.net.", ". Перевод для VSplanet.net.")
    return t


def main(slug):
    bdir = SRC / slug
    page_f = bdir / "index.html"
    page = page_f.read_text("utf-8")
    m = re.search(r"window\.BOOK_CONFIG=(\{.*?\});?\s*(?=window\.|</script>)", page, re.S)
    need(m, "нет BOOK_CONFIG на странице книги")
    cfg = json.loads(m.group(1))
    need(cfg.get("incomplete"), f"{slug} уже не отмечена как неполная")
    unf_f = SRC / "unfinished/index.html"
    unf = unf_f.read_text("utf-8")
    need(f'data-slug="{slug}"' in unf, f"{slug} нет на странице «В работе»")

    # ── 1. EPUB ──
    try:
        fc = json.loads(subprocess.run(["git", "show", f"origin/book-factory:factory/books/{slug}/book.config.json"],
                                       cwd=ROOT, capture_output=True, check=True).stdout)
    except subprocess.CalledProcessError:
        raise SystemExit("finish-book: нет конфига на ветке book-factory — выполните git fetch origin book-factory")
    for k in ("coauthors", "coauthor_line", "archive_year", "source"):
        if fc.get(k) and not cfg.get(k):
            cfg[k] = fc[k]
    cfg["imprint_epub"] = [finished_text(x) for x in fc.get("imprint_epub", [])]
    desc = re.search(r'<meta name="description" content="([^"]*)"', page).group(1)
    cfg["description"] = finished_text(desc).replace("Читайте онлайн, без регистрации.", "Читайте онлайн, без регистрации, или скачайте EPUB.")
    data = json.loads((bdir / cfg["bookFile"]).read_text("utf-8"))
    book = {"chapters": [{"title": c["title"], "html": (bdir / c["f"]).read_text("utf-8")} for c in data["chapters"]]}
    with tempfile.TemporaryDirectory() as tmp:
        target = pathlib.Path(tmp) / "book.epub"
        epub.build(cfg, book, str(bdir / "assets/images"), str(bdir / "assets/cover.jpg"), str(target))
        raw = target.read_bytes()
    epub_rel = f"assets/book-{h12(raw)}.epub"
    for old in (bdir / "assets").glob("book-*.epub"):
        old.unlink()
    (bdir / epub_rel).write_bytes(raw)
    epub_name = f'{cfg["author"]} — {cfg["title"]}.epub'

    # ── 2. Страница книги: блоки готовой книги ──
    donor = (SRC / DONOR / "index.html").read_text("utf-8")
    offline_mb = mb(json.loads((bdir / "files.json").read_text("utf-8"))["bytes"])
    formats = block(donor, r'<section id="formats".*?</section>\s*', "блок форматов")
    formats = re.sub(r'data-offline="[^"]+"', f'data-offline="{slug}"', formats)
    formats = re.sub(r"Сохранить книгу на устройство · [\d,]+ МБ", f"Сохранить книгу на устройство · {offline_mb} МБ", formats)
    formats = re.sub(r'<p id="epub-meta">[^<]*</p>', f'<p id="epub-meta">{mb(len(raw))} МБ</p>', formats)
    formats = re.sub(r'href="assets/book-[0-9a-f]+\.epub" download="[^"]*"', f'href="{epub_rel}" download="{epub_name}"', formats)
    pwa = block(donor, r'<script src="\.\./pwa\.js[^"]*"[^>]*></script>', "pwa.js")
    page = sub1(page, f'<meta name="apple-mobile-web-app-title" content="{cfg.get("short_name") or fc.get("short_name") or cfg["author"]}">',
                f'<meta name="apple-mobile-web-app-title" content="{fc.get("short_name") or cfg["author"]}">'
                '<link rel="manifest" href="../manifest.webmanifest"><link rel="apple-touch-icon" href="../icons/app-180.png">', "apple-mobile-web-app-title")
    page = sub1(page, '<script src="../shared/nav-', pwa + '<script src="../shared/nav-', "nav.js")
    page = sub1(page, "</section>\n  <footer class=\"site-footer\">", "</section>\n  " + formats + "<footer class=\"site-footer\">", "конец лендинга")
    page = sub1(page, '<span>Главы</span></button>', '<span>Главы</span></button>' + block(donor, r'<a class="tb-tab" href="#formats"[^>]*>.*?</a>', "вкладка «Без сети»"), "вкладка «Главы»")
    page = sub1(page, '<div class="settings-export">', block(donor, r'<div class="app-settings">.*?</p></div>', "кнопка установки") + '<div class="settings-export">', "настройки")
    page = sub1(page, '<div id="toast"', block(donor, r'<dialog id="install-dialog".*?</dialog>\s*', "диалог установки") + '<div id="toast"', "toast")

    # ── 3. Тексты ──
    page = re.sub(r'\s*<p class="unfinished">.*?</p>', "", page, count=1, flags=re.S)
    page = re.sub(r"\s*Перевод ещё идёт — [^<]*?\.(?=</p>)", "", page)
    page = page.replace('"incomplete": ' + json.dumps(cfg["incomplete"], ensure_ascii=False), '"incomplete": null')
    page = re.sub(r"(Перевод [^<]{0,80}?) публикуется на VSplanet\.net с ([^;<]+); на сегодня вышли главы до (\d+)-й\. Сайт собирает опубликованное, и страница пополняется по мере выхода новых глав\.",
                  r"\1 выходил на VSplanet.net с \2 и завершён: переведены все \3 глав.", page)
    page = finished_text(page).replace("Читайте онлайн, без регистрации.", "Читайте онлайн, без регистрации, или скачайте EPUB.")
    for bad in ("не закончен", "(перевод", "продолжается", "неполный", '"kind": "ongoing"', "#unfinished"):
        need(bad not in page, f"на странице книги осталось «{bad}»")
    page_f.write_text(page, "utf-8")
    for f in (bdir / "chapters").glob("*.html"):
        t = f.read_text("utf-8")
        t2 = finished_text(t).replace("Читайте онлайн, без регистрации.", "Читайте онлайн, без регистрации, или скачайте EPUB.")
        if t2 != t:
            f.write_text(t2, "utf-8")

    # ── 4. Полка ──
    card = re.search(rf'<article class="book" data-slug="{re.escape(slug)}">.*?</article>\n', unf, re.S).group(0)
    unf = unf.replace(card, "", 1)
    unf_f.write_text(unf, "utf-8")
    card = card.replace('href="../', 'href="').replace('src="../', 'src="')
    card = re.sub(r'<span class="badge [^"]*">[^<]*</span>', "", card)
    card = re.sub(r'\s*<p class="inc [^"]*">.*?</p>', "", card, flags=re.S)
    shelf_f = SRC / "index.html"
    shelf = shelf_f.read_text("utf-8")
    actions = block(shelf, r'<div class="actions"><a class="btn" href="booker/">.*?</div>', "кнопки карточки на полке")
    actions = re.sub(r'href="booker/assets/book-[0-9a-f]+\.epub"', f'href="{slug}/{epub_rel}"', actions).replace('"booker', '"' + slug)
    need(f'href="{slug}/{epub_rel}"' in actions and "booker" not in actions, "кнопки карточки не перенастроились")
    card = re.sub(r'<div class="actions">.*?</div>', actions, card, flags=re.S)
    m = list(re.finditer(r"</article>\n</div></section>", shelf))
    need(len(m) == 1, "не нашёл конец сетки на полке")
    shelf = shelf[:m[0].start()] + "</article>\n" + card.rstrip("\n").replace("\n</article>", "\n</article>", 1) + "\n</div></section>" + shelf[m[0].end():]
    shelf_f.write_text(shelf, "utf-8")
    print(f"{slug}: EPUB {mb(len(raw))} МБ ({epub_rel}), страница книги без пометок «не закончен», карточка перенесена на полку")


if __name__ == "__main__":
    need(len(sys.argv) == 2, "укажите slug книги, например: holly")
    main(sys.argv[1])
