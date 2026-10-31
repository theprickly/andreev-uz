"""Общие файлы всех книг → <корень>/books/shared/: шрифты, логотип, style-<хэш>.css, app-<хэш>.js.
Один экземпляр на весь сайт (раньше копия лежала в каждой книге). Идемпотентно: build_book вызывает, build_all предварительно чистит папку."""
import hashlib, pathlib, shutil, subprocess
T = pathlib.Path(__file__).resolve().parents[1] / 'template'
ESB = pathlib.Path('/home/claude/tools/node_modules/.bin/esbuild')
h12 = lambda b: hashlib.sha256(b).hexdigest()[:12]

def build(books_dir):
    d = pathlib.Path(books_dir) / 'shared'
    if (d / '.names').exists():
        names = (d / '.names').read_text().split()
        if len(names) == 4 and all((d / n).exists() for n in names): return tuple(names)
    (d / 'fonts').mkdir(parents=True, exist_ok=True)
    for f in (T / 'assets' / 'fonts').iterdir(): shutil.copy(f, d / 'fonts' / f.name)
    shutil.copy(T / 'assets' / 'vsplanet-mark.svg', d / 'vsplanet-mark-brand.svg'); shutil.copy(T / 'assets' / 'vsplanet-mark-ui.svg', d / 'vsplanet-mark.svg'); shutil.copy(T / 'assets' / 'vsplanet-wordmark.svg', d)
    names = []
    for f in ('style.css', 'app.js', 'nav.css', 'nav.js'):
        tmp = d / ('_' + f); shutil.copy(T / f, tmp)
        if ESB.exists(): subprocess.run([str(ESB), str(tmp), '--minify', '--allow-overwrite', f'--outfile={tmp}', '--log-level=error'], check=True)
        stem, suf = f.rsplit('.', 1); name = f'{stem}-{h12(tmp.read_bytes())}.{suf}'; tmp.rename(d / name); names.append(name)
    (d / '.names').write_text(' '.join(names))
    return tuple(names)


def version():
    import json
    v = json.loads((T.parent / 'VERSION.json').read_text())
    return v['version'], v.get('name', '')

def version_label():
    n, t = version()
    return n + (f' «{t}»' if t else '')
