"""Цветовые темы книг. vs — по умолчанию (логотип VSplanet). Добавляйте тематические пресеты сюда."""
THEMES = {
    'vs':   {'accent_fill': 'linear-gradient(180deg,#c3d8ef 0%,#8fb2db 45%,#5f87b9 100%)', 'accent': '#7fa6d4', 'accent_hi': '#a5c3e6', 'accent_deep': '#2f5b8f', 'accent_ink': '#06101f', 'bg': '#03060c', 'surface': '#0b111d', 'surface_2': '#121a2a', 'reader_bg': '#070b13'},
    'hart': {'accent': '#ff3d9a', 'accent_hi': '#ff6fb5', 'accent_deep': '#b0105e', 'accent_ink': '#ffffff', 'bg': '#050305', 'surface': '#120a10', 'surface_2': '#1c1019', 'reader_bg': '#0b070a'},
    'booker': {'accent': '#f2b632', 'accent_hi': '#ffd36b', 'accent_deep': '#a8740a', 'accent_ink': '#140c00', 'bg': '#060503', 'surface': '#13100a', 'surface_2': '#1d1810', 'reader_bg': '#0b0906'},
    'jericho': {'accent': '#ffe11a', 'accent_hi': '#fff06b', 'accent_deep': '#b89a00', 'accent_ink': '#1a1500', 'bg': '#060503', 'surface': '#13110a', 'surface_2': '#1d1a10', 'reader_bg': '#0b0a06'},
    'lesnar': {'accent': '#e5212b', 'accent_hi': '#ff5961', 'accent_deep': '#a3121a', 'accent_ink': '#ffffff', 'bg': '#050505', 'surface': '#111111', 'surface_2': '#1a1a1a', 'reader_bg': '#0a0a0a'},
    'copeland': {'accent': '#f6e7a6', 'accent_hi': '#fff3c4', 'accent_deep': '#b8142a', 'accent_ink': '#1a0507', 'bg': '#090304', 'surface': '#160a0c', 'surface_2': '#210f12', 'reader_bg': '#0e0506'},
    'flair': {'accent': '#a98bff', 'accent_hi': '#c6b2ff', 'accent_deep': '#5b3bb8', 'accent_ink': '#0d0620', 'bg': '#06040c', 'surface': '#100c1b', 'surface_2': '#191328', 'reader_bg': '#0a0711'},
}


def resolve(cfg):
    th = cfg.get('theme', 'vs')
    own = THEMES.get(th, {}) if isinstance(th, str) else th
    res = {**THEMES['vs'], **own}
    if own is not THEMES['vs'] and 'accent_fill' not in own: res.pop('accent_fill', None)   # градиент — только у своей темы
    return res
