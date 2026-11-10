#!/usr/bin/env python3
"""Оптимизация собранного сайта VSplanet Книги (SEO, вес, доступность).

Вызывается из build-vsplanet.py уже после переписывания адресов:
    optimize.run(out_dir, base_url, state_file)

Работает поверх готовой статической сборки (исходников шаблонов в репозитории нет),
поэтому каждый шаг проверяет, что нашёл то, что ожидал: если вёрстка в books/
изменится, сборка остановится с понятной ошибкой, а не выдаст тихо сломанный сайт.
"""
import datetime, hashlib, html, io, json, pathlib, re, subprocess

from PIL import Image

MAIN = "https://vsplanet.net/"
ORG_ID = MAIN + "#organization"
TEXT = {".html", ".xml", ".json", ".js", ".css", ".webmanifest", ".txt", ".svg"}
BANNER_KEY = "vs-install-banner-off"
DEAD = ("assets/cover.jpg", "assets/icons/cover-icon-192.png")


class Ctx:
    def __init__(self, out, base, state, src):
        self.out, self.base, self.state_file, self.src = pathlib.Path(out), base, pathlib.Path(state), pathlib.Path(src)
        self.log = []

    def note(self, msg):
        self.log.append(msg)
        print("  ·", msg)


def rd(p):
    return p.read_text("utf-8")


def wr(p, s):
    p.write_text(s, "utf-8")


def sub1(s, old, new, what, count=1):
    """Строгая замена: падает, если образец не найден нужное число раз."""
    n = s.count(old)
    if (count is None and n == 0) or (count is not None and n != count):
        raise SystemExit(f"optimize: ожидал {count or '≥1'}× «{what}», нашёл {n}")
    return s.replace(old, new)


def h12(data):
    return hashlib.sha256(data).hexdigest()[:12]


def books(c):
    return sorted(p.parent.name for p in c.out.glob("*/files.json"))


def ld(obj):
    return '<script type="application/ld+json">' + json.dumps(obj, ensure_ascii=False, separators=(",", ":")) + "</script>"


def unesc_js(s):
    return re.sub(r"\\(?:u([0-9A-Fa-f]{4})|x([0-9A-Fa-f]{2}))", lambda m: chr(int(m.group(1) or m.group(2), 16)), s)


# ───────────────────────── 1. Шрифты: подмножество реально нужных знаков ─────────────────────────
def fonts(c):
    from fontTools import subset
    from fontTools.ttLib import TTFont

    used = set()
    for f in c.out.rglob("*"):
        if f.is_file() and f.suffix in TEXT and "OFL" not in f.name:
            used |= {ord(ch) for ch in unesc_js(rd(f))}
    # запас на будущие тексты: вся латиница ASCII, весь русский алфавит, типографика
    keep = used | set(range(0x20, 0x7F)) | set(range(0x410, 0x450)) | {
        0x401, 0x451, 0xA0, 0xAB, 0xBB, 0x2116, 0x20AC, 0x2212, 0x2013, 0x2014, 0x2018, 0x2019,
        0x201C, 0x201D, 0x201E, 0x2026, 0x202F, 0x2009, 0x301}
    fdir, before, after, ren = c.out / "shared/fonts", 0, 0, {}
    for f in sorted(fdir.glob("*.woff2")):
        before += f.stat().st_size
        o = subset.Options()
        o.flavor, o.layout_features = "woff2", ["*"]
        ft = TTFont(f)
        s = subset.Subsetter(o)
        s.populate(unicodes=keep)
        s.subset(ft)
        buf = io.BytesIO()
        ft.save(buf)
        data = buf.getvalue()
        if len(data) >= f.stat().st_size:
            data = f.read_bytes()
        new = f"{f.stem}-{h12(data)[:8]}.woff2"
        (fdir / new).write_bytes(data)
        f.unlink()
        ren[f.name] = new
        after += len(data)
    for f in c.out.rglob("*"):
        if f.is_file() and f.suffix in {".html", ".css", ".js"}:
            s = t = rd(f)
            for a, b in ren.items():
                t = t.replace("fonts/" + a, "fonts/" + b)
            if t != s:
                wr(f, t)
    c.note(f"шрифты: {before // 1024} → {after // 1024} КБ (подмножества, имена с хэшем)")


# ───────────────────────── 2. Картинки ─────────────────────────
def images(c):
    made = 0
    c.cover_w = {}
    for f in sorted((c.out / "covers").glob("*.webp")):
        im = Image.open(f).convert("RGB")
        c.cover_w[f.stem] = im.width
        for tag, w in (("240", 240), ("360", 360), ("s", 168)):
            r = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
            r.save(f.with_name(f"{f.stem}-{tag}.webp"), "WEBP", quality=70 if w > 300 else 74, method=6)
            made += 1
    ico = Image.open(c.out / "icons/app-192.png").convert("RGBA").resize((128, 128), Image.LANCZOS)
    ico.save(c.out / "icons/app-128.webp", "WEBP", quality=90, method=6)
    c.note(f"картинки: {made} уменьшенных вариантов обложек для srcset, значок баннера 18 → 2,5 КБ")


# ───────────────────────── 3. Баннер установки без сдвига вёрстки (CLS) ─────────────────────────
BANNER_ITEMS = [
    ('<path d="M12 4v11m-4.5-4.5L12 15l4.5-4.5M5 20h14"/>', "Без интернета", "Скачайте книгу — и читайте в метро, самолёте и на даче"),
    ('<rect x="6.5" y="2.5" width="11" height="19" rx="3"/><path d="M10 18.5h4"/>', "На весь экран", "Без адресной строки — как обычное приложение"),
    ('<path d="M5 4h4v16H5zM11 4h4v16h-4z"/><path d="m16.5 6 3.5-1 2.5 14.5-3.5 1z"/>', "Вся полка под рукой", "Значок на экране — одно касание, и вы в библиотеке"),
    ('<path d="M20 12a8 8 0 1 1-2.5-5.8M20 4v5h-5"/>', "Всегда свежее", "Новые главы и книги подтягиваются сами"),
]
BANNER_T = "Установите приложение — читать так удобнее всего"
BANNER_FREE = "Бесплатно \xb7 без App Store и Google Play \xb7 5 секунд"
HEAD_JS = ('<script>!function(d){try{var a=0,s=matchMedia("(display-mode: standalone)").matches||navigator.standalone===!0;'
           'try{a=+localStorage.getItem("' + BANNER_KEY + '")||0}catch(e){}'
           'if(!s&&!(a&&Date.now()-a<6048e5)){d.classList.add("ib-on");'
           'if(/iPhone|iPad|iPod/.test(navigator.userAgent)||navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1)d.classList.add("ib-ios")}'
           '}catch(e){}}(document.documentElement)</script>')


def banner_html(rel):
    li = "".join(f'<li><svg viewBox="0 0 24 24" aria-hidden="true">{p}</svg><b>{b}</b><span>{t}</span></li>' for p, b, t in BANNER_ITEMS)
    return ('<aside class="ibanner" role="region" aria-label="Установка приложения">'
            '<button class="ib-x" type="button" aria-label="Скрыть баннер">\xd7</button>'
            f'<div class="ib-head"><img class="ib-ico" src="{rel}icons/app-128.webp" width="58" height="58" alt="" loading="lazy">'
            f'<div><p class="ib-k">VSplanet Книги</p><h2 class="ib-t">{BANNER_T}</h2></div></div>'
            f'<ul class="ib-list">{li}</ul>'
            '<div class="ib-act"><button class="ib-go" type="button"><span class="ib-a">Установить</span><span class="ib-i">Как установить</span></button>'
            f'<span class="ib-free">{BANNER_FREE}</span></div></aside>')


def banner(c):
    pwa = c.out / "pwa.js"
    js = rd(pwa)
    dec = unesc_js(js)
    # статическая копия должна совпадать с тем, что рисует pwa.js, иначе высоты разойдутся
    for needle in [BANNER_T, BANNER_FREE, f'"{BANNER_KEY}"', "7*864e5", "t.replaceWith(r)"] + [x for it in BANNER_ITEMS for x in it]:
        if needle not in dec:
            raise SystemExit(f"optimize: баннер в pwa.js изменился (нет «{needle[:40]}») — обновите BANNER_* в tools/optimize.py")
    js = sub1(js, 'icons/app-192.png" width="58"', 'icons/app-128.webp" width="58"', "иконка баннера в pwa.js")
    wr(pwa, js)
    n = 0
    for f in c.out.rglob("*.html"):
        s = rd(f)
        if "<div data-install-banner></div>" not in s:
            continue
        rel = "../" * (len(f.relative_to(c.out).parts) - 1)
        s = sub1(s, "<div data-install-banner></div>", f"<div data-install-banner>{banner_html(rel)}</div>", "место под баннер")
        s = sub1(s, "</head>", HEAD_JS + "</head>", "</head>")
        wr(f, s)
        n += 1
    css = next((c.out / "shared").glob("nav-*.css"))
    wr(css, rd(css) + (
        "html:not(.ib-on) [data-install-banner]>.ibanner{display:none!important}"
        "main>.ibanner{animation:none}"
        ".ib-go .ib-i,.ib-ios .ib-go .ib-a{display:none}.ib-ios .ib-go .ib-i{display:inline}"
        ".ib-go{color:#06101f}"))
    c.note(f"баннер установки отрисован в HTML на {n} страницах — контент больше не прыгает (CLS)")


# ───────────────────────── 4. Полка, «В работе», «Цитаты» ─────────────────────────
VH = ".vh{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}"


def shelf_pages(c):
    css = next((c.out / "shared").glob("shelf-*.css"))
    s = rd(css)
    n = len(re.findall(r"(?<![\w.#-])h3\{", s))
    if n < 1 or re.search(r"(?<![\w.#-])h[23]\{", rd(next((c.out / "shared").glob("nav-*.css")))):
        raise SystemExit("optimize: правила заголовков в shelf/nav css изменились")
    s = re.sub(r"(?<![\w.#-])h3\{", ".bt{", s)
    s = sub1(s, ".cr-grid h4{", ".cr-grid h3{", "стиль заголовков подвала", None)
    wr(css, s + VH)

    for page, depth in (("index.html", ""), ("unfinished/index.html", "../"), ("quotes/index.html", "../")):
        f = c.out / page
        s = rd(f)
        # заголовки по порядку: h1 → h2 (книги) → h3 (подвал)
        s = re.sub(r"<h3>(<a href=\"[^\"]+\">.*?</a>)</h3>", r'<h2 class="bt">\1</h2>', s)
        s = s.replace("<h4>", "<h3>").replace("</h4>", "</h3>")
        # у ссылки-обложки имя берётся из alt картинки + видимого бейджа (раньше aria-label расходился с текстом)
        def cover(m):
            href, label, pre, slug = m.group(1), html.unescape(m.group(2)), m.group(3) or "", m.group(4)
            base_ = pre + "covers/" + slug
            srcset = f"{base_}-240.webp 240w, {base_}-360.webp 360w, {base_}.webp {c.cover_w[slug]}w"
            return (f'<a class="cover" href="{href}"><img src="{base_}.webp" srcset="{srcset}" '
                    f'sizes="(max-width:720px) calc(50vw - 21px), 280px" alt="{html.escape("Обложка книги: " + label)}"')
        s, k = re.subn(r'<a class="cover" href="([^"]+)" aria-label="([^"]+)"><img src="((?:\.\./)?)covers/([a-z-]+)\.webp" alt=""', cover, s)
        if page != "quotes/index.html" and k < 5:
            raise SystemExit(f"optimize: обложки на {page} не найдены")
        # вкладки: подпись скрывается при сворачивании панели — имя ссылки остаётся в aria-label
        s, t = re.subn(r'<a class="tb-tab" href="([^"]*)"((?: data-cur)?)>(<svg.*?</svg>)<span>([^<]+)</span></a>',
                       r'<a class="tb-tab" href="\1"\2 aria-label="\4">\3<span>\4</span></a>', s)
        if t != 3:
            raise SystemExit(f"optimize: вкладки на {page}: {t}")
        if page == "index.html":
            s = sub1(s, '<img src="covers/${b.slug}.webp" alt="">', '<img src="covers/${b.slug}-s.webp" alt="" width="56" height="84">', "обложка «Продолжить чтение»")
            graph = {"@context": "https://schema.org", "@graph": [
                {"@type": "WebSite", "@id": c.base + "#website", "url": c.base, "name": "VSplanet Книги",
                 "alternateName": "Книги VSplanet", "inLanguage": "ru", "publisher": {"@id": ORG_ID}},
                {"@type": "Organization", "@id": ORG_ID, "name": "VSplanet", "url": MAIN, "logo": c.base + "icons/app-512.png"}]}
            s = sub1(s, "</head>", ld(graph) + "</head>", "</head>")
            s = s.replace('"@type": "CollectionPage", "name"', '"@type": "CollectionPage", "isPartOf": {"@id": "' + c.base + '#website"}, "name"')
        if page == "quotes/index.html":
            s = sub1(s, '<main class="qmain" aria-label="Карусель цитат">', '<main class="qmain" aria-label="Карусель цитат"><h1 class="vh">Цитаты из автобиографий рестлеров</h1>', "main цитат")
            s = sub1(s, '"../covers/${q.s}.webp" alt="" width="44" height="66"', '"../covers/${q.s}-s.webp" alt="" width="44" height="66"', "миниатюра цитаты")
            s = sub1(s, "url(../covers/${q.s}.webp)", "url(../covers/${q.s}-240.webp)", "фон цитаты")
            if "application/ld+json" not in s:
                d = re.search(r'<meta name="description" content="([^"]*)"', s).group(1)
                s = sub1(s, "</head>", ld({"@context": "https://schema.org", "@graph": [
                    {"@type": "CollectionPage", "@id": c.base + "quotes/", "url": c.base + "quotes/", "name": "Цитаты из книг — VSplanet Книги",
                     "description": html.unescape(d), "inLanguage": "ru", "isPartOf": {"@id": c.base + "#website"}},
                    crumbs([("Книги", c.base), ("Цитаты", c.base + "quotes/")])]}) + "</head>", "</head>")
        if page == "unfinished/index.html" and "BreadcrumbList" not in s:
            s = sub1(s, "</head>", ld(crumbs([("Книги", c.base), ("В работе", c.base + "unfinished/")], True)) + "</head>", "</head>")
        wr(f, s)
    c.note("полка: порядок заголовков, alt обложек, srcset, подписи вкладок, WebSite/Organization в JSON-LD")


def crumbs(items, ctx=False):
    o = {"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": n, "item": u} for i, (n, u) in enumerate(items)]}
    if ctx:
        o = {"@context": "https://schema.org", **o}
    return o


# ───────────────────────── 5. Страницы книг и глав ─────────────────────────
def book_pages(c):
    nch = 0
    for b in books(c):
        url = c.base + b + "/"
        f = c.out / b / "index.html"
        s = rd(f)
        cfg = json.loads(re.search(r"window\.BOOK_CONFIG=(\{.*?\});?</script>", s, re.S).group(1))
        title, author = cfg["title"], cfg["author"]
        desc = html.unescape(re.search(r'<meta name="description" content="([^"]*)"', s).group(1))
        m = re.search(r'<script type="application/ld\+json">(\{.*?\})</script>', s, re.S)
        book = json.loads(m.group(1))
        book["@id"] = url + "#book"
        book["description"] = desc
        book["publisher"] = {"@id": ORG_ID}
        book["isPartOf"] = {"@id": c.base + "#website"}
        if cfg.get("translator"):
            book["translator"] = {"@type": "Person", "name": cfg["translator"]}
        if "isBasedOn" in book:                      # перевод → оригинал: точнее, чем isBasedOn
            orig = book.pop("isBasedOn")
            orig.setdefault("inLanguage", "en")
            book["translationOfWork"] = orig
        graph = {"@context": "https://schema.org", "@graph": [
            {k: v for k, v in book.items() if k != "@context"},
            {"@type": "Organization", "@id": ORG_ID, "name": "VSplanet", "url": MAIN},
            crumbs([("Книги", c.base), (title, url)])]}
        s = s.replace(m.group(0), ld(graph))
        # значок в закрытом окне установки: маленький и только по требованию
        s = s.replace('<img src="../icons/app-192.png" alt="Значок приложения VSplanet Книги" width="64" height="64">',
                      '<img src="../icons/app-128.webp" alt="Значок приложения VSplanet Книги" width="64" height="64" loading="lazy">')
        # без JavaScript кнопка «Читать» не работает — даём обычную ссылку на главы
        s = sub1(s, '<p id="resume-preview"', '<noscript><a class="btn btn-primary" href="chapters/">Читать по главам</a></noscript><p id="resume-preview"', "блок кнопок книги")
        # второй h1 лежит в шаблоне окна «О сайте» — это подзаголовок окна, а не страницы
        if '<template id="about-template"><header class="page-head"><p class="eyebrow">О сайте</p><h1>' in s:
            s = re.sub(r'(<template id="about-template"><header class="page-head"><p class="eyebrow">О сайте</p>)<h1>(.*?)</h1>', r'\1<h2 class="h1">\2</h2>', s, count=1)
        wr(f, s)

        book_ref = {"@type": "Book", "@id": url + "#book", "name": title, "url": url}
        theme = "#03060c"
        chs = sorted((c.out / b / "chapters").glob("*.html"))
        total = len([x for x in chs if x.name != "index.html"])
        for ch in chs:
            s = rd(ch)
            page = url + "chapters/" + ("" if ch.name == "index.html" else ch.name)
            t = html.unescape(re.search(r"<title>(.*?)</title>", s, re.S).group(1))
            if ch.name == "index.html":
                d = f"Оглавление книги «{title}» ({author}): {total} {plural(total, 'раздел', 'раздела', 'разделов')} в русском переводе VSplanet. Читайте онлайн по главам, без регистрации."
                s = re.sub(r'(<meta name="description" content=")[^"]*(")', lambda m: m.group(1) + html.escape(d) + m.group(2), s, count=1)
                extra = ld({"@context": "https://schema.org", **crumbs([("Книги", c.base), (title, url), ("Оглавление", page)])})
                ogt = "website"
            else:
                d = html.unescape(re.search(r'<meta name="description" content="([^"]*)"', s).group(1))
                name = html.unescape(re.search(r'<h1 id="chapter-title">(.*?)</h1>', s, re.S).group(1))
                extra = ld({"@context": "https://schema.org", "@graph": [
                    {"@type": "Chapter", "@id": page + "#chapter", "name": name, "url": page, "inLanguage": "ru",
                     "isAccessibleForFree": True, "isPartOf": book_ref, "publisher": {"@id": ORG_ID}},
                    crumbs([("Книги", c.base), (title, url), (name, page)])]})
                ogt = "article"
                s = chapter_images(c, ch, s)
            meta = (f'<meta name="theme-color" content="{theme}"><meta property="og:type" content="{ogt}">'
                    f'<meta property="og:site_name" content="VSplanet · Книги"><meta property="og:url" content="{page}">'
                    f'<meta property="og:description" content="{html.escape(d)}"><meta property="og:locale" content="ru_RU">'
                    f'<meta name="twitter:card" content="summary_large_image">')
            s = sub1(s, '<link rel="canonical"', meta + '<link rel="canonical"', "canonical главы")
            s = sub1(s, "</head>", extra + "</head>", "</head>")
            wr(ch, s)
            nch += 1
    css = next((c.out / "shared").glob("style-*.css"))
    s = rd(css)
    # номера глав в оглавлении: контраст 3,45 → 6,0 (WCAG AA)
    s = sub1(s, ".static-toc span{grid-row:span 2;font-weight:600;color:var(--dim);", ".static-toc span{grid-row:span 2;font-weight:600;color:#8d8d96;", "цвет номеров глав")
    m = re.search(r"\.page-head h1\{([^}]*)\}", s)
    s += ".page-head .h1{" + m.group(1) + "}"
    # статические страницы глав на телефоне были шире экрана (478 px при экране 390): шапка и кнопки
    # «предыдущая / следующая глава» не переносились. Разрешаем перенос — горизонтальная прокрутка исчезает.
    s += ("@media (max-width:600px){body.static header.top{flex-wrap:wrap;gap:8px 16px}body.static header.top nav{flex-wrap:wrap}"
          ".static-nav .btn{white-space:normal;height:auto;min-height:44px;padding-top:10px;padding-bottom:10px;max-width:100%}}")
    wr(css, s)
    c.note(f"книги: Book+Breadcrumb JSON-LD, noscript-ссылка; главы и оглавления ({nch}): og-теги, Chapter+Breadcrumb")


# ───────────────────────── 5b. Связь с VSplanet: чип в шапке, меню для компьютера, подпись ─────────────────────────
ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m6-6-6 6 6 6"/></svg>'
VS_BACK = f'<a class="vs-back" href="{MAIN}" aria-label="VSplanet — на главный сайт">{ARROW}<span>VSplanet</span></a>'
SIGN_OLD = "© VSplanet · <b>Никита Андреев</b> · 2026"
SIGN_NEW = f'© <a href="{MAIN}">VSplanet</a> · <small class="sign-a">Никита Андреев</small> · 2026'
SHELF_TABS = (("", "Полка"), ("unfinished/", "В работе"), ("quotes/", "Цитаты"))

CSS_CHIP = (
    ".vs-back{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:36px;padding:0 14px 0 11px;"
    "border-radius:999px;font-family:inherit;font-size:14px;font-weight:500;line-height:1;color:#e6ebf3;background:#ffffff0f;"
    "border:1px solid #ffffff1f;text-decoration:none;white-space:nowrap;flex:none;transition:background .2s,border-color .2s}"
    ".vs-back:hover{background:#ffffff1c;border-color:#ffffff33}"
    ".vs-back svg{width:16px;height:16px;flex:none;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}"
    ".vs-back:focus-visible{outline:2px solid #68a0d9;outline-offset:2px}"
    ".sign a{color:inherit;text-decoration:underline;text-decoration-color:#ffffff40;text-underline-offset:3px}"
    ".sign a:hover{color:#fff}"
    ".sign .sign-a{font-size:inherit;font-weight:400;color:#7a8290}")
CSS_SHELF = (
    ".navbar .vs-back{position:relative;z-index:1}"
    "@media (max-width:480px){.navbar .vs-back{width:36px;padding:0}.navbar .vs-back span{display:none}}"
    ".nb-nav{display:none}"
    # компьютер (мышь, широкий экран): обычное меню в шапке вместо нижней «таблетки» мобильного приложения
    "@media (min-width:721px) and (hover:hover) and (pointer:fine){"
    ".shelf-body .tabbar{display:none!important}"
    ".nb-nav{display:flex;align-items:center;gap:4px;margin-left:auto;position:relative;z-index:1}"
    ".nb-nav+.nb-act{margin-left:8px}"
    ".nb-nav a{display:inline-flex;align-items:center;height:36px;padding:0 15px;border-radius:999px;font-size:14px;font-weight:600;"
    "color:#aab1be;text-decoration:none;transition:color .2s,background .2s}"
    ".nb-nav a:hover{color:#fff;background:#ffffff12}"
    ".nb-nav a[aria-current=page]{color:#0b1b3f;background:#fff}"
    ".nb-nav a:focus-visible{outline:2px solid #68a0d9;outline-offset:2px}"
    ".shelf-body .navbar:before{display:block!important;background:#03060cd9;-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);"
    "box-shadow:0 1px 0 #ffffff14;opacity:0;transition:opacity .3s}"
    ".shelf-body .navbar.on:before{opacity:1}}")
CSS_TOP = "@media (max-width:600px){header.top .vs-back{width:36px;padding:0}header.top .vs-back span{display:none}}"
# телефон/планшет: исходная вёрстка прячет навигацию шапки книги (её заменяет нижняя панель) — оставляем в ней только чип
CSS_BOOK_MOBILE = ("@media (max-width:720px),(hover:none) and (pointer:coarse){#landing>.top nav{display:flex}"
                   "#landing>.top nav>:not(.vs-back){display:none}}")
# при прокрутке на телефоне шапка полки прозрачная: чип прячется вместе с логотипом, чтобы не лежать поверх обложек
CSS_SHELF_SCROLL = (".navbar .vs-back{transition:opacity .25s,background .2s,border-color .2s}"
                    ".navbar.on .vs-back{opacity:0;pointer-events:none}"
                    "@media (min-width:721px) and (hover:hover) and (pointer:fine){.navbar.on .vs-back{opacity:1;pointer-events:auto}}")


def vsplanet_links(c):
    n_shelf = n_book = n_ch = 0
    for page, depth in (("index.html", ""), ("unfinished/index.html", "../"), ("quotes/index.html", "../")):
        f = c.out / page
        s = rd(f)
        cur = page.replace("index.html", "")
        links = "".join(f'<a href="{(depth + h) or "./"}"' + (' aria-current="page"' if h == cur else "") + f">{t}</a>"
                        for h, t in SHELF_TABS)
        s = sub1(s, '<header class="navbar" data-navbar>', '<header class="navbar" data-navbar>' + VS_BACK, "шапка полки")
        s = re.sub(r'(<span class="nb-title">[^<]*</span>)', lambda m: m.group(1) + '<nav class="nb-nav" aria-label="Разделы">' + links + "</nav>", s, count=1)
        if 'class="nb-nav"' not in s:
            raise SystemExit(f"optimize: не нашёл nb-title на {page}")
        s = s.replace(SIGN_OLD, SIGN_NEW)
        wr(f, s)
        n_shelf += 1
    for b in books(c):
        f = c.out / b / "index.html"
        s = rd(f)
        s = sub1(s, '<nav aria-label="Навигация">', '<nav aria-label="Навигация">' + VS_BACK, f"шапка книги {b}", None)
        s = sub1(s, '<nav class="footer-nav" aria-label="Разделы">', f'<nav class="footer-nav" aria-label="Разделы"><a href="{MAIN}">VSplanet.net</a>', f"подвал книги {b}", None)
        s = s.replace(SIGN_OLD, SIGN_NEW)
        wr(f, s)
        n_book += 1
        for ch in (c.out / b / "chapters").glob("*.html"):
            s = rd(ch)
            s = sub1(s, '</a><nav><a class="chip" href="../">', '</a><nav aria-label="Навигация">' + VS_BACK + '<a class="chip" href="../">', f"шапка главы {ch.name}")
            s = sub1(s, '<nav class="footer-nav">', f'<nav class="footer-nav" aria-label="Разделы"><a href="{MAIN}">VSplanet.net</a>', f"подвал главы {ch.name}")
            wr(ch, s)
            n_ch += 1
    left = [str(f.relative_to(c.out)) for f in c.out.rglob("*.html") if SIGN_OLD in rd(f)]
    if left:
        raise SystemExit(f"optimize: подпись не заменена в {left[:3]}")
    nav = next((c.out / "shared").glob("nav-*.css"))
    wr(nav, rd(nav) + CSS_CHIP + CSS_SHELF + CSS_SHELF_SCROLL + CSS_TOP + CSS_BOOK_MOBILE)
    st = next((c.out / "shared").glob("style-*.css"))
    wr(st, rd(st) + CSS_CHIP + CSS_TOP)
    c.note(f"VSplanet: чип в шапке ({n_shelf} разделов, {n_book} книг, {n_ch} глав), меню для компьютера, ссылка в подвале, приглушённая подпись")


# ───────────────────────── 5c. Единый логотип «[знак] КНИГИ» и PWA без внешних ссылок ─────────────────────────
LOGO_TXT = '<span class="bk-t">Книги</span>'
CSS_LOGO = (
    # знак растёт вместе с размером шрифта надписи: так пропорция одинакова во всех шапках
    ".bk-t{font-family:var(--ui,inherit);font-weight:800;font-size:1em;line-height:1;letter-spacing:.02em;"
    "text-transform:uppercase;color:#fff;white-space:nowrap}"
    ".vs-brand{font-size:31px;gap:.32em}.vs-brand>img.lock.mk{height:1.8em;width:auto}"
    ".reader-header .vs-brand{font-size:21px}.reader-header .vs-brand .bk-t{display:inline}"
    "@media (max-width:600px){.vs-brand{font-size:26px}.reader-header .vs-brand{font-size:21px}}"
    ".nb-lock{display:flex;align-items:center;gap:.32em;font-size:29px}.nb-brand .nb-lock img{height:1.8em;width:auto}"
    "@media (max-width:640px){.nb-lock{font-size:24px}}@media (max-width:380px){.nb-lock{font-size:22px}}"
    # на компьютере у шапки есть подложка — логотип не нужно сворачивать до знака при прокрутке
    "@media (min-width:721px) and (hover:hover) and (pointer:fine){.navbar.on .nb-lock{opacity:1;transform:none;pointer-events:auto}"
    ".navbar.on .nb-mark{opacity:0}}")
# установленное приложение (display-mode: standalone) — без переходов на другие сайты
CSS_PWA = (
    "@media (display-mode:standalone){.vs-back,.footer-nav a[href^='http'],p:has(>.cr-link),.cr-link,a.btn[href^='http']{display:none!important}"
    "a[href^='http']{pointer-events:none;cursor:default;color:inherit!important;text-decoration:none!important}}")


def logo_and_pwa(c):
    n = 0
    for f in c.out.rglob("*.html"):
        s = t = rd(f)
        t = re.sub(r'<img class="lock" src="([^"]*)vsplanet-lockup\.svg" alt="VSplanet" width="1686" height="430"><small class="bk">Книги</small>',
                   r'<img class="lock mk" src="\1vsplanet-mark.svg" alt="VSplanet" width="512" height="366">' + LOGO_TXT, t)
        t = re.sub(r'<img class="nb-lock" src="([^"]*)vsplanet-lockup\.svg" alt="VSplanet" width="1686" height="430">',
                   r'<span class="nb-lock"><img src="\1vsplanet-mark.svg" alt="VSplanet" width="512" height="366">' + LOGO_TXT + "</span>", t)
        if t != s:
            wr(f, t)
            n += 1
    left = [str(f.relative_to(c.out)) for f in c.out.rglob("*.html") if "vsplanet-lockup.svg" in rd(f)]
    if left:
        raise SystemExit(f"optimize: старый логотип остался в {left[:3]}")
    for g in ("nav-*.css", "style-*.css"):
        css = next((c.out / "shared").glob(g))
        wr(css, rd(css) + CSS_LOGO + CSS_PWA)
    c.note(f"логотип «знак + КНИГИ» на {n} страницах; в установленном приложении внешние ссылки скрыты")


# ───────────────────────── 5d. Объёмные книги на стеклянной полке и единый вид страницы книги ─────────────────────────
CSS_SHELF_3D = (
    # книга — обычная ссылка; объём даёт поворот в перспективе, торец страниц (::before) и свет на обложке (::after)
    ".grid{--gx:26px}"
    ".stand{--ry:-21deg;--ryh:-4deg;--t:30px;position:relative;z-index:0;perspective:1400px;perspective-origin:50% 46%;margin:0 0 30px;padding:0 11% 0 7%}"
    ".stand .cover{display:block;position:relative;perspective:none;z-index:2;transform-style:preserve-3d;transform-origin:50% 100%;"
    "transform:rotateY(var(--ry)) translateZ(0);transition:transform .6s cubic-bezier(.2,.8,.2,1)}"
    ".stand .cover img{display:block;width:100%;height:auto;aspect-ratio:2/3;object-fit:cover;border-radius:2px 4px 4px 2px;box-shadow:none!important;transform:none!important;transition:none}"
    ".stand .cover::before{content:\"\";position:absolute;inset:.9% 0 .9% auto;width:var(--t);height:auto;opacity:1;filter:none;z-index:0;"
    "transform-origin:100% 50%;transform:rotateY(-90deg);border-radius:0 1px 1px 0;"
    "background:linear-gradient(90deg,#0003,#0000 18%,#0000 80%,#0002),repeating-linear-gradient(90deg,#f6f2e9 0 1px,#d9d3c5 1px 2px)}"
    ".stand .cover::after{content:\"\";position:absolute;inset:0;height:auto;opacity:1;filter:none;z-index:1;border-radius:2px 4px 4px 2px;pointer-events:none;"
    "background:linear-gradient(90deg,#0006 0,#fff3 1.1%,#0003 2.6%,#0000 5.5%),linear-gradient(105deg,#ffffff24 0,#fff0 34%,#0000 66%,#00000038 100%);"
    "box-shadow:inset 0 0 0 1px #ffffff14}"
    ".stand .ring,.stand .badge{z-index:3}"
    # контактная тень и стеклянная кромка полки; кромка шире карточки на половину зазора — у соседних книг она смыкается
    ".stand::before{content:\"\";position:absolute;z-index:1;left:6%;right:2%;bottom:-6px;height:22px;pointer-events:none;"
    "background:radial-gradient(50% 50% at 46% 50%,#000d,#0008 45%,#0000 72%);transition:transform .6s cubic-bezier(.2,.8,.2,1),opacity .6s}"
    ".stand::after{content:\"\";position:absolute;z-index:0;left:calc(var(--gx)/-2 - 1px);right:calc(var(--gx)/-2 - 1px);bottom:-9px;height:9px;border-radius:2px;pointer-events:none;"
    "background:linear-gradient(180deg,#cfe6ff 0,#6f97cf 1px,#2a426e 2px,#14203b 55%,#0a1226 100%);box-shadow:0 26px 38px -14px #000,0 0 34px -4px #68a0d94d}"
    ".book .meta{position:relative;z-index:1}"
    "@media (hover:hover){.book:hover .stand .cover,.stand .cover:focus-visible{transform:rotateY(var(--ryh)) translateY(-12px) translateZ(34px)}"
    ".book:hover .stand::before{transform:scale(.86) translateY(3px);opacity:.6}}"
    ".stand .cover:active{transform:rotateY(var(--ryh)) translateY(-3px) scale(.985)}"
    ".stand .cover:focus-visible{outline:2px solid #68a0d9;outline-offset:6px}"
    "@media (max-width:720px){.grid{--gx:14px}.stand{--ry:-17deg;--t:16px;margin-bottom:24px;perspective:900px;padding:0 9% 0 5%}.stand::after{height:6px;bottom:-6px}}"
    "@media (prefers-reduced-motion:reduce){.stand .cover,.stand::before{transition:none}}"
    # большие мониторы: пять книг в ряд вместо пустых полей
    "@media (min-width:1600px){.shelf-body .wrap{width:min(1480px,100% - 64px)}.shelf-body .navbar{padding-left:max(16px,calc((100% - 1480px)/2));padding-right:max(16px,calc((100% - 1480px)/2))}}"
    # пустой результат фильтра
    ".grid:not(:has(.book:not([hidden])))::after{content:\"Здесь пока пусто — откройте любую книгу, и она появится в этом списке.\";grid-column:1/-1;padding:28px 0;color:#8d95a3;font-size:15px}")
CSS_UI_COMMON = (
    "@view-transition{navigation:auto}"
    "@media (prefers-reduced-motion:reduce){::view-transition-group(*),::view-transition-old(*),::view-transition-new(*){animation:none!important}}"
    # зоны касания не меньше 44 px на сенсорных экранах
    "@media (pointer:coarse){.vs-back{height:44px;min-width:44px}header.top .chip{height:44px}"
    ".footer-nav a,.cr-link,.sign a{display:inline-block;padding-top:11px;padding-bottom:11px}}"
    "@media (pointer:coarse) and (max-width:600px){.navbar .vs-back,header.top .vs-back{width:44px}}")
CSS_BOOK_PAGE = (
    # шапка как на полке: чип слева, логотип по центру, действия справа
    "header.top>.vs-brand{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%)}"
    "header.top>nav{flex:1;justify-content:flex-end;min-height:36px}header.top>nav>.vs-back{margin-right:auto}"
    "@media (max-width:600px){body.static header.top>.vs-brand{top:34px}body.static header.top>nav{justify-content:center;row-gap:10px}"
    "body.static header.top>nav>.vs-back{margin-right:calc(100% - 44px)}}"
    "@media (display-mode:standalone) and (max-width:600px){body.static header.top>.vs-brand{position:static;transform:none;flex-basis:100%;justify-content:center}}"
    # книга стоит на той же стеклянной полке, что и в каталоге
    ".hero-book .book-tilt{z-index:1}"
    ".hero-book::after{content:\"\";position:absolute;z-index:0;left:calc(var(--bl,24%) - 9%);right:calc(100% - var(--br,75%) - 9%);top:calc(var(--bb,90%) - 1px);height:9px;border-radius:2px;pointer-events:none;"
    "background:linear-gradient(180deg,#cfe6ff 0,#6f97cf 1px,#2a426e 2px,#14203b 55%,#0a1226 100%);box-shadow:0 26px 38px -14px #000,0 0 34px -4px #68a0d94d}"
    ".hero-book .book-hint{bottom:auto;top:calc(var(--bb,90%) + 22px)}"
    # меньше пустоты между первым экраном и остальным
    "@media (min-width:861px){.hero{min-height:0;padding:28px 0 8px}.stats{margin-top:12px}}"
    # подвал как на полке: выходные данные, ссылки, подпись — последней и по центру
    ".site-footer{grid-template-columns:1fr;gap:20px}.site-footer .edition-credits{justify-content:flex-start;order:1}"
    ".site-footer .footer-nav{order:2}.site-footer .sign{order:3;margin-top:8px}")


def ui(c):
    for page in ("index.html", "unfinished/index.html"):
        f = c.out / page
        s, k = re.subn(r'(<a class="cover" href="[^"]+">.*?</a>)', r'<div class="stand">\1</div>', rd(f), flags=re.S)
        if k < 5:
            raise SystemExit(f"optimize: обложки для полки на {page}: {k}")
        wr(f, s)
    sh = next((c.out / "shared").glob("shelf-*.css"))
    wr(sh, rd(sh) + CSS_SHELF_3D)
    for g in ("nav-*.css", "style-*.css"):
        css = next((c.out / "shared").glob(g))
        wr(css, rd(css) + CSS_UI_COMMON)
    st = next((c.out / "shared").glob("style-*.css"))
    wr(st, rd(st) + CSS_BOOK_PAGE)
    for b in books(c):
        # где у рендера книги низ и бока: по непрозрачной области картинки
        im = Image.open(c.out / b / "assets/book-render.webp").convert("RGBA")
        l, t, r, bt = im.split()[3].point(lambda v: 255 if v > 40 else 0).getbbox()
        var = f"--bl:{l * 100 / im.width:.1f}%;--br:{r * 100 / im.width:.1f}%;--bb:{bt * 100 / im.height:.1f}%"
        f = c.out / b / "index.html"
        wr(f, sub1(rd(f), '<div class="hero-book">', f'<div class="hero-book" style="{var}">', f"рендер книги {b}"))
    c.note("полка: объёмные книги на стеклянной кромке (CSS), 5 колонок на больших экранах; страница книги приведена к виду полки")


# ───────────────────────── 5e. Яндекс Метрика ─────────────────────────
METRIKA_ID = 114175725
METRIKA = ('<!-- Yandex.Metrika counter --><script>(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};'
           'm[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}'
           'k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})'
           "(window,document,'script','https://mc.yandex.ru/metrika/tag.js?id=%d','ym');"
           "ym(%d,'init',{ssr:true,webvisor:true,clickmap:true,ecommerce:\"dataLayer\",referrer:document.referrer,url:location.href,"
           'accurateTrackBounce:true,trackLinks:true});</script>'
           '<noscript><div><img src="https://mc.yandex.ru/watch/%d" style="position:absolute;left:-9999px" alt="" width="1" height="1"></div></noscript>'
           '<!-- /Yandex.Metrika counter -->') % (METRIKA_ID, METRIKA_ID, METRIKA_ID)


def metrika(c):
    n = 0
    for f in c.out.rglob("*.html"):
        s = rd(f)
        if "mc.yandex.ru" in s or "</body>" not in s or 'http-equiv="refresh"' in s:
            continue
        wr(f, s.replace("</body>", METRIKA + "</body>", 1))
        n += 1
    c.note(f"Яндекс Метрика {METRIKA_ID}: счётчик на {n} страницах")


def plural(n, one, few, many):
    if n % 10 == 1 and n % 100 != 11:
        return one
    return few if 2 <= n % 10 <= 4 and not 12 <= n % 100 <= 14 else many


def chapter_images(c, ch, s):
    def fix(m):
        tag = m.group(0)
        if "width=" in tag:
            return tag
        src = re.search(r'src="([^"]+)"', tag).group(1)
        p = (ch.parent / src).resolve()
        if not p.exists():
            return tag
        w, h = Image.open(p).size
        return tag.replace(" loading=", f' width="{w}" height="{h}" loading=', 1) if " loading=" in tag else tag[:-1] + f' width="{w}" height="{h}">'
    return re.sub(r"<img\b[^>]*>", fix, s)


# ───────────────────────── 6. Service worker ─────────────────────────
def sw(c):
    f = c.out / "sw.js"
    s = rd(f)
    old = " e.respondWith((async()=>{const hit=await caches.match(r);return hit||fetch(r);})());"
    new = (" e.respondWith((async()=>{const hit=await caches.match(r);if(hit)return hit;\n"
           "  try{return await fetch(r);}catch(err){\n"
           "   // офлайн: уменьшенного варианта картинки в кэше нет — отдаём полноразмерный, он скачан вместе с книгой\n"
           "   const alt=r.url.replace(/-(?:s|240|360)\\.webp$/,'.webp');\n"
           "   const h2=alt!==r.url&&await caches.match(alt);if(h2)return h2;throw err;}\n"
           " })());")
    s = sub1(s, old, new, "обработчик fetch в sw.js")
    s = sub1(s, '"icons/app-192.png", ', '"icons/app-192.png", "icons/app-128.webp", ', "список оболочки в sw.js")
    wr(f, s)


# ───────────────────────── 7. Хэши в именах, files.json, версия оболочки ─────────────────────────
def rehash(c):
    ren = {}
    for f in sorted((c.out / "shared").iterdir()):
        m = re.fullmatch(r"(.+)-([0-9a-f]{12})\.(css|js)", f.name)
        if m and h12(f.read_bytes()) != m.group(2):
            new = f"{m.group(1)}-{h12(f.read_bytes())}.{m.group(3)}"
            f.rename(f.with_name(new))
            ren[f.name] = new
    pwa_v = h12((c.out / "pwa.js").read_bytes())
    for f in c.out.rglob("*"):
        if f.is_file() and f.suffix in {".html", ".js", ".json", ".css"}:
            s = t = rd(f)
            for a, b in ren.items():
                t = t.replace(a, b)
            t = re.sub(r"pwa\.js\?v=[0-9a-f]{12}", "pwa.js?v=" + pwa_v, t)
            if t != s:
                wr(f, t)
    # files.json каждой книги: размеры и версия должны соответствовать файлам на диске
    dropped = 0
    for b in books(c):
        f = c.out / b / "files.json"
        j = json.loads(rd(f))
        # cover.jpg и cover-icon-192.png не использует ни одна страница — незачем качать их в офлайн-копию книги
        refs = "".join(rd(x) for x in (c.out / b).rglob("*.html")) + "".join(rd(x) for x in (c.out / b).glob("book-*.json"))
        dropped += sum(x[1] for x in j["files"] if x[0] in DEAD and x[0] not in refs)
        j["files"] = [x for x in j["files"] if not (x[0] in DEAD and x[0] not in refs)]
        sig = hashlib.sha256()
        for item in j["files"]:
            p = c.out / b / ("index.html" if item[0] == "./" else item[0])
            p = p.resolve()
            if not p.exists():
                raise SystemExit(f"optimize: {b}/files.json ссылается на отсутствующий {item[0]}")
            data = p.read_bytes()
            item[1] = len(data)
            sig.update(item[0].encode() + b"\0" + hashlib.sha256(data).digest())
        j["bytes"] = sum(x[1] for x in j["files"])
        j["v"] = sig.hexdigest()[:12]
        wr(f, json.dumps(j, ensure_ascii=False, separators=(",", ":")))
    # оболочка service worker: новое имя кэша, если изменился любой файл оболочки
    f = c.out / "sw.js"
    s = rd(f)
    shell = json.loads(re.search(r"const SHELL=(\[.*?\]);", s, re.S).group(1))
    sig = hashlib.sha256()
    for p in shell:
        q = c.out / p.split("?")[0]
        q = q / "index.html" if q.is_dir() else q
        if not q.exists():
            raise SystemExit(f"optimize: в оболочке sw.js нет файла {p}")
        sig.update(p.encode() + hashlib.sha256(q.read_bytes()).digest())
    s = re.sub(r"const SHELL_CACHE='offline-shell-[0-9a-f]+'", f"const SHELL_CACHE='offline-shell-{sig.hexdigest()[:12]}'", s)
    wr(f, s)
    c.note(f"переименовано по новому хэшу: {len(ren)} файлов; files.json и кэш оболочки пересчитаны; "
           f"из офлайн-загрузок убрано {dropped // 1024} КБ неиспользуемых картинок")


# ───────────────────────── 8. Sitemap и robots.txt ─────────────────────────
def main_text(s):
    m = re.search(r"<main\b.*?</main>", s, re.S)
    body = m.group(0) if m else s
    body = re.sub(r"<(script|style)\b.*?</\1>", "", body, flags=re.S)
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", body)).strip()


def sitemaps(c):
    state = json.loads(rd(c.state_file)) if c.state_file.exists() else {}
    try:
        first = subprocess.run(["git", "log", "-1", "--format=%cs", "--", c.src.name], cwd=c.src.parent,
                               capture_output=True, text=True).stdout.strip()
    except Exception:
        first = ""
    today = datetime.date.today().isoformat()
    groups, new_state, seen = {"pages": []}, {}, 0
    for f in sorted(c.out.rglob("*.html")):
        s = rd(f)
        rel = f.relative_to(c.out).as_posix()
        if rel == "404.html" or 'content="noindex"' in s[:4000]:
            continue
        loc = c.base + re.sub(r"(^|/)index\.html$", r"\1", rel)
        canon = re.search(r'<link rel="canonical" href="([^"]+)"', s)
        if not canon or canon.group(1) != loc:
            raise SystemExit(f"optimize: canonical страницы {rel} не совпадает с её адресом ({canon and canon.group(1)})")
        hsh = h12(main_text(s).encode())
        old = state.get(loc)
        date = old[1] if old and old[0] == hsh else (today if state else (first or today))
        new_state[loc] = [hsh, date]
        top = rel.split("/")[0]
        groups.setdefault(top if (c.out / top / "files.json").exists() else "pages", []).append((loc, date))
        seen += 1
    wr(c.state_file, json.dumps(new_state, ensure_ascii=False, indent=0, sort_keys=True))
    head = '<?xml version="1.0" encoding="UTF-8"?>\n'
    idx = []
    for g, urls in sorted(groups.items()):
        path = "sitemap-pages.xml" if g == "pages" else f"{g}/sitemap.xml"
        body = "".join(f"<url><loc>{u}</loc><lastmod>{d}</lastmod></url>" for u, d in urls)
        wr(c.out / path, head + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + body + "</urlset>\n")
        idx.append((c.base + path, max(d for _, d in urls)))
    wr(c.out / "sitemap.xml", head + '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
       + "".join(f"<sitemap><loc>{u}</loc><lastmod>{d}</lastmod></sitemap>" for u, d in idx) + "</sitemapindex>\n")
    if c.base.count("/") == 3:          # сайт в корне домена (books.vsplanet.net)
        wr(c.out / "robots.txt", f"User-agent: *\nAllow: /\n\nSitemap: {c.base}sitemap.xml\n")
    c.note(f"sitemap: индекс + {len(idx)} карт, {seen} страниц с lastmod; robots.txt → один sitemap.xml")


def run(out, base, state, src):
    c = Ctx(out, base, state, src)
    images(c)
    banner(c)
    shelf_pages(c)
    book_pages(c)
    vsplanet_links(c)
    logo_and_pwa(c)
    ui(c)
    metrika(c)
    fonts(c)
    sw(c)
    rehash(c)
    sitemaps(c)
    return c
