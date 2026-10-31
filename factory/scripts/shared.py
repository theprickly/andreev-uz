"""Общие файлы всех книг → <корень>/books/shared/: шрифты, логотип, style-<хэш>.css, app-<хэш>.js.
Один экземпляр на весь сайт (раньше копия лежала в каждой книге). Идемпотентно: build_book вызывает, build_all предварительно чистит папку."""
import hashlib, pathlib, shutil, subprocess
T = pathlib.Path(__file__).resolve().parents[1] / 'template'
ESB = pathlib.Path('/home/claude/tools/node_modules/.bin/esbuild')
h12 = lambda b: hashlib.sha256(b).hexdigest()[:12]

def build(books_dir):
    d = pathlib.Path(books_dir) / 'shared'
    if (d / '.names').exists():
        css, js = (d / '.names').read_text().split()
        if (d / css).exists() and (d / js).exists(): return css, js
    (d / 'fonts').mkdir(parents=True, exist_ok=True)
    for f in (T / 'assets' / 'fonts').iterdir(): shutil.copy(f, d / 'fonts' / f.name)
    shutil.copy(T / 'assets' / 'vsplanet-logo.png', d)
    names = []
    for f in ('style.css', 'app.js'):
        tmp = d / ('_' + f); shutil.copy(T / f, tmp)
        if ESB.exists(): subprocess.run([str(ESB), str(tmp), '--minify', '--allow-overwrite', f'--outfile={tmp}', '--log-level=error'], check=True)
        stem, suf = f.rsplit('.', 1); name = f'{stem}-{h12(tmp.read_bytes())}.{suf}'; tmp.rename(d / name); names.append(name)
    (d / '.names').write_text(' '.join(names))
    return tuple(names)
