"""EPUB 3 (+ NCX для старых читалок) из book.json и конфига книги. Используется build_book.py."""
import json, re, os, shutil, zipfile, html, uuid, tempfile
import html5lib
from xml.sax.saxutils import escape

def ser(el):
    """Serialize an html5lib etree element as XHTML."""
    tag = el.tag
    attrs = ''.join(f' {k}="{escape(v, {chr(34): "&quot;"})}"' for k, v in el.attrib.items())
    void = tag in ('br', 'img', 'hr')
    s = f'<{tag}{attrs}' + ('/>' if void else '>')
    if el.text: s += escape(el.text)
    for ch in el:
        if isinstance(ch.tag, str): s += ser(ch)
        if ch.tail: s += escape(ch.tail)
    if not void: s += f'</{tag}>'
    return s

ARCHIVE_YEAR = ''

def chapter_body(i, c):
    frag = html5lib.parseFragment(c['html'], namespaceHTMLElements=False)
    out, notes = [], []
    images = []
    for el in frag:
        if not isinstance(el.tag, str): continue
        # drop browser-only attrs
        for e in el.iter():
            if not isinstance(e.tag, str): continue
            for a in ('loading', 'decoding'): e.attrib.pop(a, None)
            if e.tag == 'img':
                src = e.get('src', '').replace('assets/images/', 'images/')
                e.set('src', src); images.append(src.split('/')[-1])
        if el.tag == 'p' and el.find('img') is not None:
            img = el.find('img'); cap = el.find('i')
            fig = f'<figure>{ser(img)}'
            if cap is not None: fig += f'<figcaption>{escape("".join(cap.itertext()).strip())}</figcaption>'
            out.append(fig + '</figure>'); continue
        if el.tag == 'p' and not ''.join(el.itertext()).strip() and len(el) == 0:
            continue  # empty spacer kept on the site only for bookmark indices
        cls = el.get('class', '')
        if cls == 'archive-note':
            out.append(f'<aside class="note"><p class="note-label">Из архива VSplanet{ARCHIVE_YEAR}</p><p>{escape("".join(el.itertext()).strip())}</p></aside>'); continue
        if cls == 'ed-note':
            out.append(f'<aside class="note"><p class="note-label">Примечание редакции</p><p>{escape("".join(el.itertext()).strip())}</p></aside>'); continue
        if cls == 'tr-note':
            out.append(f'<aside class="note"><p class="note-label">Примечание переводчика</p><p>{escape("".join(el.itertext()).strip())}</p></aside>'); continue
        if el.tag == 'aside':
            label = el.find('b'); txt = ''.join(el.itertext()).replace(''.join(label.itertext()), '', 1).strip()
            out.append(f'<aside class="note"><p class="note-label">Примечание редакции</p><p>{escape(txt)}</p></aside>'); continue
        # footnotes
        for btn in list(el.iter('button')):
            n = len(notes) + 1
            notes.append((btn.get('data-note'), 'Прим. ред.' if btn.get('data-kind') == 'ed' else 'Прим. пер.'))
            btn.tag = 'a'; btn.attrib.clear()
            btn.set('epub:type', 'noteref'); btn.set('href', f'#fn{n}'); btn.set('id', f'fnref{n}'); btn.set('class', 'noteref')
            btn.text = str(n) if False else '*' * n
        s = ser(el)
        if el.tag == 'p' and all(ch.tag == 'br' for ch in el if isinstance(ch.tag, str)): s = re.sub(r'<br/>\s*(?=[—–-]\s)', '</p>\n<p>', s)
        if i in (0,) or out:
            pass
        out.append(s)
    # first text paragraph has no indent
    for k, s in enumerate(out):
        if s.startswith('<p>') or s.startswith('<p '):
            out[k] = s.replace('<p', '<p class="first"', 1) if s.startswith('<p>') else s; break
    body = '\n'.join(out)
    if notes:
        body += '\n<section class="footnotes">' + ''.join(
            f'<aside epub:type="footnote" id="fn{n}"><p><a href="#fnref{n}">{"*" * n}</a> {escape(t)}. <i>— {k}</i></p></aside>'
            for n, (t, k) in enumerate(notes, 1)) + '</section>'
    return body, images

def page(title, body, epub_type='chapter', extra_head=''):
    return f'''<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="ru" xml:lang="ru">
<head><meta charset="utf-8"/><title>{escape(title)}</title><link rel="stylesheet" type="text/css" href="style.css"/>{extra_head}</head>
<body epub:type="{epub_type}">
{body}
</body>
</html>'''


def build(cfg, b, images_dir, cover_path, target):
    TITLE, SUB, CREDIT = cfg['title'], cfg.get('subtitle', ''), cfg['credit']
    global ARCHIVE_YEAR
    ARCHIVE_YEAR = ' · ' + str(cfg['archive_year']) if cfg.get('archive_year') else ''
    OUT = tempfile.mkdtemp()
    os.makedirs(f'{OUT}/META-INF'); os.makedirs(f'{OUT}/OEBPS/images')
    CO = f'<p class="tp-co">{escape(cfg["coauthor_line"])}</p>' if cfg.get('coauthor_line') else ''
    IMPRINT = '<br/>'.join(escape(x) for x in cfg.get('imprint_epub', []))
    people = [(cfg['author'], 'aut')] + [(x, 'aut') for x in cfg.get('coauthors', [])]
    PEOPLE = ''.join(f'<dc:creator id="a{k}">{escape(n)}</dc:creator><meta refines="#a{k}" property="role" scheme="marc:relators">aut</meta>' for k, (n, _) in enumerate(people))
    if cfg.get('translator'): PEOPLE += f'<dc:contributor id="tr">{escape(cfg["translator"])}</dc:contributor><meta refines="#tr" property="role" scheme="marc:relators">trl</meta>'
    PEOPLE += '<dc:contributor id="bk">Никита Андреев</dc:contributor><meta refines="#bk" property="role" scheme="marc:relators">bkd</meta>'
    css = '''@charset "utf-8";
    html,body{margin:0;padding:0}
    body{font-family:serif;line-height:1.5;text-align:justify;hyphens:auto;-webkit-hyphens:auto;-epub-hyphens:auto;widows:2;orphans:2}
    h1{font-size:1.5em;line-height:1.2;text-align:center;font-weight:bold;margin:2.5em 0 1.6em;page-break-after:avoid;break-after:avoid}
    p{margin:0;text-indent:1.4em}
    p.first,figure+p,aside+p,h1+p,section.footnotes p{text-indent:0}
    figure{margin:1.4em 0;text-align:center;page-break-inside:avoid;break-inside:avoid}
    figure img{max-width:100%;max-height:88vh;height:auto}
    figcaption{font-size:.85em;line-height:1.35;font-style:italic;text-align:center;margin-top:.5em;text-indent:0}
    aside.note{margin:1.2em 0;padding:.6em .9em;border-left:3px solid #999;font-size:.9em}
    aside.note p{text-indent:0}
    p.note-label{font-family:sans-serif;font-size:.75em;text-transform:uppercase;letter-spacing:.06em;opacity:.7;margin-bottom:.25em}
    a.noteref{text-decoration:none;vertical-align:super;font-size:.75em;line-height:0}
    section.footnotes{margin-top:2em;padding-top:.5em;border-top:1px solid #999;font-size:.85em}
    hr{border:0;margin:1.2em 0;text-align:center}
    hr:after{content:"* * *"}
    .cover{margin:0;padding:0;text-align:center;page-break-after:always}
    .cover img{max-width:100%;max-height:100vh;height:auto}
    .title-page{text-align:center;page-break-after:always}
    .title-page p{text-indent:0;text-align:center}
    .tp-author{font-size:1.1em;margin-top:3em}
    .tp-co{font-size:.9em;opacity:.8}
    .tp-title{font-size:1.9em;font-weight:bold;line-height:1.15;margin:1.6em 0 .4em}
    .tp-sub{font-size:1.1em;font-style:italic}
    .tp-credit{margin-top:3em;font-size:1.05em;font-weight:bold}
    .tp-imprint{margin-top:3em;font-size:.8em;line-height:1.6;opacity:.8}
    nav ol{list-style:none;padding-left:0}nav li{margin:.3em 0}nav p,nav li{text-indent:0;text-align:left}
    '''
    open(f'{OUT}/OEBPS/style.css', 'w').write(css)

    files, all_imgs = [], set()
    # cover
    shutil.copy(cover_path, f'{OUT}/OEBPS/images/cover.jpg')
    open(f'{OUT}/OEBPS/cover.xhtml', 'w').write(page('Обложка', f'<section class="cover" epub:type="cover"><img src="images/cover.jpg" alt="Обложка книги «{escape(TITLE)}»"/></section>', 'cover'))
    # title page
    tp = f'''<section class="title-page" epub:type="titlepage">
    <p class="tp-author">{escape(cfg["author"])}</p>{CO}
    <p class="tp-title">{TITLE}</p><p class="tp-sub">{SUB}</p>
    <p class="tp-credit">{CREDIT}</p>
    <p class="tp-imprint">{IMPRINT}</p>
    </section>'''
    open(f'{OUT}/OEBPS/title.xhtml', 'w').write(page(TITLE, tp, 'frontmatter'))

    for i, c in enumerate(b['chapters']):
        body, imgs = chapter_body(i, c)
        all_imgs.update(imgs)
        open(f'{OUT}/OEBPS/c{i}.xhtml', 'w').write(page(c['title'], f'<section epub:type="chapter" aria-label="{escape(c["title"])}"><h1>{escape(c["title"])}</h1>\n{body}</section>', 'bodymatter'))
    for im in all_imgs:
        shutil.copy(f'{images_dir}/{im}', f'{OUT}/OEBPS/images/{im}')

    toc_items = ''.join(f'<li><a href="c{i}.xhtml">{escape(c["title"])}</a></li>' for i, c in enumerate(b['chapters']))
    nav = f'''<nav epub:type="toc" id="toc"><h1>Оглавление</h1><ol>{toc_items}</ol></nav>
    <nav epub:type="landmarks" hidden=""><ol><li><a epub:type="cover" href="cover.xhtml">Обложка</a></li><li><a epub:type="titlepage" href="title.xhtml">Титульный лист</a></li><li><a epub:type="toc" href="nav.xhtml">Оглавление</a></li><li><a epub:type="bodymatter" href="c0.xhtml">Начало</a></li></ol></nav>'''
    open(f'{OUT}/OEBPS/nav.xhtml', 'w').write(page('Оглавление', nav, 'frontmatter'))

    uid = 'urn:uuid:' + str(uuid.uuid5(uuid.NAMESPACE_URL, 'vsplanet.net/' + cfg['id']))
    ncx_points = ''.join(f'<navPoint id="np{i}" playOrder="{i+1}"><navLabel><text>{escape(c["title"])}</text></navLabel><content src="c{i}.xhtml"/></navPoint>' for i, c in enumerate(b['chapters']))
    open(f'{OUT}/OEBPS/toc.ncx', 'w').write(f'''<?xml version="1.0" encoding="utf-8"?>
    <ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><head><meta name="dtb:uid" content="{uid}"/><meta name="dtb:depth" content="1"/><meta name="dtb:totalPageCount" content="0"/><meta name="dtb:maxPageNumber" content="0"/></head><docTitle><text>{TITLE}</text></docTitle><navMap>{ncx_points}</navMap></ncx>''')

    def mt(f): return 'image/png' if f.endswith('.png') else 'image/jpeg'
    manifest = ['<item id="css" href="style.css" media-type="text/css"/>',
                '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
                '<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>',
                '<item id="cover-image" href="images/cover.jpg" media-type="image/jpeg" properties="cover-image"/>',
                '<item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>',
                '<item id="title" href="title.xhtml" media-type="application/xhtml+xml"/>']
    manifest += [f'<item id="c{i}" href="c{i}.xhtml" media-type="application/xhtml+xml"/>' for i in range(len(b['chapters']))]
    manifest += [f'<item id="img{k}" href="images/{im}" media-type="{mt(im)}"/>' for k, im in enumerate(sorted(all_imgs))]
    spine = ['<itemref idref="cover" linear="yes"/>', '<itemref idref="title"/>', '<itemref idref="nav"/>'] + [f'<itemref idref="c{i}"/>' for i in range(len(b['chapters']))]
    desc = cfg['description']
    opf = f'''<?xml version="1.0" encoding="utf-8"?>
    <package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="ru">
    <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">{uid}</dc:identifier>
    <dc:title id="t1">{TITLE}</dc:title><meta refines="#t1" property="title-type">main</meta>
    <dc:title id="t2">{SUB}</dc:title><meta refines="#t2" property="title-type">subtitle</meta>
    {PEOPLE}
    <dc:publisher>VSplanet.net</dc:publisher>
    <dc:language>ru</dc:language>
    <dc:date>2026</dc:date>
    <dc:subject>Рестлинг</dc:subject><dc:subject>Биография</dc:subject>
    <dc:description>{escape(desc)}</dc:description>
    <dc:source>{escape(cfg.get("source",""))}</dc:source>
    <meta property="dcterms:modified">2026-10-30T12:00:00Z</meta>
    <meta name="cover" content="cover-image"/>
    </metadata>
    <manifest>{''.join(manifest)}</manifest>
    <spine toc="ncx">{''.join(spine)}</spine>
    </package>'''
    open(f'{OUT}/OEBPS/content.opf', 'w').write(opf)
    open(f'{OUT}/META-INF/container.xml', 'w').write('<?xml version="1.0" encoding="utf-8"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>')

    with zipfile.ZipFile(target, 'w') as z:
        z.writestr(zipfile.ZipInfo('mimetype'), 'application/epub+zip', compress_type=zipfile.ZIP_STORED)
        for root, _, fs in os.walk(OUT):
            for f in sorted(fs):
                p = os.path.join(root, f); arc = os.path.relpath(p, OUT)
                z.write(p, arc, compress_type=zipfile.ZIP_STORED if f.endswith(('.jpg', '.png')) else zipfile.ZIP_DEFLATED)
    print('ok', os.path.getsize(target), len(all_imgs), 'images')
    shutil.rmtree(OUT, ignore_errors=True)
    return target
