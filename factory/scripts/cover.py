"""Серийная обложка «VSplanet Книги» и объёмный рендер для главной.

  python3 cover.py books/<slug>/book.config.json books/<slug>/assets/

Создаёт cover.jpg (1024×1536, плоская — для EPUB, значков, анимаций) и
book-render.png (1024×1024, прозрачный фон — главный кадр лендинга).
Если в config есть "cover_image" (готовая русская обложка), берёт её вместо генерации.
"""
import json, sys, base64, pathlib
from playwright.sync_api import sync_playwright

T = pathlib.Path(__file__).resolve().parents[1] / 'template' / 'assets'
cfg = json.loads(pathlib.Path(sys.argv[1]).read_text())
out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
font = lambda f: f'url(data:font/woff2;base64,{base64.b64encode((T / "fonts" / f).read_bytes()).decode()})'
logo = 'data:image/png;base64,' + base64.b64encode((T / 'vsplanet-logo.png').read_bytes()).decode()
accent = cfg.get('accent', '#ee2a24')

COVER = f'''<html><head><style>
@font-face{{font-family:G;src:{font("geologica-cyr.woff2")};font-weight:100 900;unicode-range:U+0400-045F}}
@font-face{{font-family:G;src:{font("geologica-lat.woff2")};font-weight:100 900;unicode-range:U+0000-00FF,U+2000-206F}}
html,body{{margin:0}}body{{width:1024px;height:1536px;background:#0a0a0a;color:#fff;font-family:G;position:relative;overflow:hidden}}
.glow{{position:absolute;left:-30%;top:38%;width:160%;height:80%;background:radial-gradient(closest-side,{accent}55,{accent}10 60%,transparent)}}
.grain{{position:absolute;inset:0;opacity:.06;background:repeating-linear-gradient(0deg,#fff 0 1px,transparent 1px 3px)}}
.top{{position:absolute;left:84px;top:84px;display:flex;align-items:center;gap:18px}}
.top img{{width:84px}}.top b{{display:block;font-size:36px;font-weight:700;letter-spacing:-.02em;line-height:1}}.top small{{display:block;font-size:22px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;margin-top:4px}}
.author{{position:absolute;left:84px;right:84px;top:420px;font-size:52px;font-weight:500;letter-spacing:-.02em;color:#d8d8dc}}
.title{{position:absolute;left:80px;right:70px;top:500px;font-size:{cfg.get("cover_title_size", 150)}px;font-weight:800;line-height:.92;letter-spacing:-.05em;color:#fff;text-wrap:balance}}
.bar{{position:absolute;left:84px;width:120px;height:10px;background:{accent};top:390px}}
.sub{{position:absolute;left:84px;right:84px;bottom:230px;font-size:38px;font-weight:500;color:#cfcfd4;line-height:1.25}}
.credit{{position:absolute;left:84px;right:84px;bottom:96px;font-size:30px;font-weight:600;color:{accent}}}
</style></head><body><div class="glow"></div><div class="grain"></div>
<div class="top"><img src="{logo}"><span><b>VSplanet</b><small>Книги</small></span></div>
<div class="bar"></div><div class="author">{cfg["author"]}</div><div class="title">{cfg["title"]}</div>
<div class="sub">{cfg.get("subtitle", "")}</div><div class="credit">{cfg["credit"]}</div>
<script>document.fonts.ready.then(()=>{{const t=document.querySelector('.title');let s=parseFloat(getComputedStyle(t).fontSize);
while((t.scrollWidth>t.clientWidth+2||t.offsetHeight>520)&&s>56){{s-=4;t.style.fontSize=s+'px';}}document.body.dataset.ready=1;}});</script></body></html>'''


def render_html(cover_uri):
    return f'''<html><head><style>html,body{{margin:0;background:transparent}}
body{{width:1024px;height:1024px;display:grid;place-items:center;perspective:2400px}}
.book{{position:relative;width:520px;height:780px;transform-style:preserve-3d;transform:rotateY(-24deg) rotateX(4deg) translateX(-30px)}}
.front{{position:absolute;inset:0;background:url({cover_uri}) center/cover;border-radius:3px 8px 8px 3px;box-shadow:inset 6px 0 10px #0006,inset -1px 0 0 #fff2}}
.front::after{{content:"";position:absolute;inset:0;border-radius:inherit;background:linear-gradient(100deg,#ffffff22 0%,transparent 22%,transparent 70%,#00000033)}}
.pages{{position:absolute;top:8px;bottom:8px;left:calc(100% - 2px);width:70px;transform-origin:left center;transform:rotateY(90deg);
background:repeating-linear-gradient(90deg,#efe9dc 0 2px,#d9d2c3 2px 3px);border-radius:0 3px 3px 0}}
.back{{position:absolute;inset:0;transform:translateZ(-70px);background:#111;border-radius:3px 8px 8px 3px}}
.shadow{{position:absolute;left:-40px;right:-120px;bottom:-60px;height:90px;background:radial-gradient(closest-side,#000c,transparent);transform:translateZ(-80px) rotateX(90deg)}}
</style></head><body><div class="book"><div class="back"></div><div class="pages"></div><div class="front"></div></div></body></html>'''


with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 1024, 'height': 1536})
    if cfg.get('cover_image'):
        (out / 'cover.jpg').write_bytes(pathlib.Path(cfg['cover_image']).read_bytes())
    else:
        pg.set_content(COVER); pg.wait_for_selector('body[data-ready]'); pg.wait_for_timeout(100)
        pg.screenshot(path=str(out / 'cover.jpg'), type='jpeg', quality=90)
    uri = 'data:image/jpeg;base64,' + base64.b64encode((out / 'cover.jpg').read_bytes()).decode()
    pg = b.new_page(viewport={'width': 1024, 'height': 1024})
    pg.set_content(render_html(uri)); pg.wait_for_timeout(300)
    pg.screenshot(path=str(out / 'book-render.png'), omit_background=True)
    b.close()
print('cover + render →', out)
