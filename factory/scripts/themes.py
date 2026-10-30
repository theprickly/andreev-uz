"""Цветовые темы книг. vs — по умолчанию (логотип VSplanet). Добавляйте тематические пресеты сюда."""
THEMES = {
    'vs':   {'accent': '#7fa6d4', 'accent_hi': '#a5c3e6', 'accent_deep': '#2f5b8f', 'accent_ink': '#06101f', 'bg': '#03060c', 'surface': '#0b111d', 'surface_2': '#121a2a', 'reader_bg': '#070b13'},
    'hart': {'accent': '#ff3d9a', 'accent_hi': '#ff6fb5', 'accent_deep': '#b0105e', 'accent_ink': '#ffffff', 'bg': '#050305', 'surface': '#120a10', 'surface_2': '#1c1019', 'reader_bg': '#0b070a'},
}


def resolve(cfg):
    th = cfg.get('theme', 'vs')
    return {**THEMES['vs'], **(THEMES.get(th, {}) if isinstance(th, str) else th)}
