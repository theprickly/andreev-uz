"""Цветовые темы книг. vs — по умолчанию (логотип VSplanet). Добавляйте тематические пресеты сюда."""
THEMES = {
    'vs':   {'accent_fill': 'linear-gradient(180deg,#c3d8ef 0%,#8fb2db 45%,#5f87b9 100%)', 'accent': '#7fa6d4', 'accent_hi': '#a5c3e6', 'accent_deep': '#2f5b8f', 'accent_ink': '#06101f', 'bg': '#03060c', 'surface': '#0b111d', 'surface_2': '#121a2a', 'reader_bg': '#070b13'},
    'hart': {'accent': '#ef2a95', 'accent_hi': '#ff62b6', 'accent_deep': '#a1105f', 'accent_ink': '#ffffff', 'bg': '#0a0605', 'surface': '#17100d', 'surface_2': '#221813', 'reader_bg': '#0e0908'},
    'booker_prison': {'accent': '#f2994a', 'accent_hi': '#ffbf85', 'accent_deep': '#a85a14', 'accent_ink': '#140a00', 'bg': '#060505', 'surface': '#131110', 'surface_2': '#1d1a18', 'reader_bg': '#0b0a09'},
    'royalty': {'accent': '#f5b638', 'accent_hi': '#ffd77a', 'accent_deep': '#6a2f9a', 'accent_ink': '#150b00', 'bg': '#07040b', 'surface': '#130c1c', 'surface_2': '#1d1329', 'reader_bg': '#0b0710'},
    'holly': {'accent': '#c8442f', 'accent_hi': '#ec6a52', 'accent_deep': '#7e2418', 'accent_ink': '#ffffff', 'bg': '#050607', 'surface': '#111314', 'surface_2': '#1b1e20', 'reader_bg': '#0a0c0d'},
    'heenan': {'accent': '#f5d30f', 'accent_hi': '#ffe95c', 'accent_deep': '#b3141c', 'accent_ink': '#171100', 'bg': '#080606', 'surface': '#151211', 'surface_2': '#1f1a19', 'reader_bg': '#0c0a09'},
    'wcw': {'accent': '#e9e6df', 'accent_hi': '#ffffff', 'accent_deep': '#c4161c', 'accent_ink': '#0b0b0d', 'bg': '#050507', 'surface': '#101014', 'surface_2': '#19191f', 'reader_bg': '#09090c'},
    'jericho': {'accent': '#ffe11a', 'accent_hi': '#fff06b', 'accent_deep': '#cb0e27', 'accent_ink': '#1a1500', 'bg': '#0a0304', 'surface': '#170709', 'surface_2': '#220b0e', 'reader_bg': '#0e0506'},
    'lesnar': {'accent': '#e5212b', 'accent_hi': '#ff5961', 'accent_deep': '#a3121a', 'accent_ink': '#ffffff', 'bg': '#050505', 'surface': '#111111', 'surface_2': '#1a1a1a', 'reader_bg': '#0a0a0a'},
    'copeland': {'accent': '#f6e7a6', 'accent_hi': '#fff3c4', 'accent_deep': '#b8142a', 'accent_ink': '#1a0507', 'bg': '#090304', 'surface': '#160a0c', 'surface_2': '#210f12', 'reader_bg': '#0e0506'},
    'goldust': {'accent': '#d9ac3c', 'accent_hi': '#f3d27a', 'accent_deep': '#7a5a14', 'accent_ink': '#150f00', 'bg': '#070502', 'surface': '#13100a', 'surface_2': '#1e1910', 'reader_bg': '#0b0905'},
    'eddie': {'accent': '#ee2a24', 'accent_hi': '#ff4a43', 'accent_deep': '#b01914', 'accent_ink': '#ffffff', 'bg': '#000000', 'surface': '#0f0f10', 'surface_2': '#18181a', 'reader_bg': '#0b0b0c',
              'extra_css': "@font-face{font-family:'GTA Russian';src:url('assets/fonts/gta-russian.woff2') format('woff2');font-weight:400;font-display:swap}html:root{--display:'GTA Russian',var(--ui);--display-weight:400;--display-tracking:.005em;--display-leading:.95}", 'fonts': ['gta-russian.woff2', 'GTA-Russian-LICENSE.txt']},
    'flair': {'accent': '#ffcf1f', 'accent_hi': '#ffe36b', 'accent_deep': '#1d4fb8', 'accent_ink': '#161000', 'bg': '#04070f', 'surface': '#0b1222', 'surface_2': '#121b31', 'reader_bg': '#070b16'},
    'piper': {'accent': '#ffc61a', 'accent_hi': '#ffdf6b', 'accent_deep': '#c8101a', 'accent_ink': '#1a1000', 'bg': '#0b0405', 'surface': '#190809', 'surface_2': '#250d0f', 'reader_bg': '#0f0607'},
}


def resolve(cfg):
    th = cfg.get('theme', 'vs')
    own = THEMES.get(th, {}) if isinstance(th, str) else th
    res = {**THEMES['vs'], **own}
    if own is not THEMES['vs'] and 'accent_fill' not in own: res.pop('accent_fill', None)   # градиент — только у своей темы
    return res
