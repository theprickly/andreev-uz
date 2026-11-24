/* Каталог блоков: схема полей, варианты, примеры и рендер. Один рендер для конструктора и экспорта. */
(function (W) {
  'use strict';
  var ICONS = W.UZ_ICONS || {};

  /* ---------- утилиты ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function uid(p) { return (p || 'b') + Math.random().toString(36).slice(2, 9); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function getPath(o, p) { var k = String(p).split('.'); for (var i = 0; i < k.length; i++) { if (o == null) return undefined; o = o[k[i]]; } return o; }
  function setPath(o, p, v) { var k = String(p).split('.'); for (var i = 0; i < k.length - 1; i++) { if (o[k[i]] == null) o[k[i]] = /^\d+$/.test(k[i + 1]) ? [] : {}; o = o[k[i]]; } o[k[k.length - 1]] = v; }
  function icon(name, cls) {
    var ic = ICONS[name] || ICONS.check;
    return '<svg class="' + (cls || 'u-ic') + '" viewBox="' + ic.vb + '" fill="none" aria-hidden="true" focusable="false">' + ic.b + '</svg>';
  }
  var ARROW = function () { return icon('arrow-right', 'u-ic'); };

  /* атрибуты для правки на странице (только в редакторе) */
  function F(ctx, path, type) { return ctx.edit ? ' data-f="' + esc(path) + '" data-ft="' + (type || 'text') + '"' : ''; }
  function txt(ctx, d, path, tag, cls, extra) {
    var v = getPath(d, path) || '';
    if (!v && !ctx.edit) return '';
    return '<' + tag + (cls ? ' class="' + cls + '"' : '') + (extra || '') + F(ctx, path, 'text') + '>' + esc(v) + '</' + tag + '>';
  }
  function rich(ctx, d, path, cls, type) {
    var v = getPath(d, path) || '';
    if (!v && !ctx.edit) return '';
    return '<div class="u-rich' + (cls ? ' ' + cls : '') + '"' + F(ctx, path, type || 'rich') + '>' + (v || '<p></p>') + '</div>';
  }
  function inlineRich(ctx, d, path, tag, cls) {
    var v = getPath(d, path) || '';
    if (!v && !ctx.edit) return '';
    return '<' + tag + (cls ? ' class="' + cls + '"' : '') + F(ctx, path, 'inline') + '>' + v + '</' + tag + '>';
  }
  var LIB_SIZES = {"maint-sign.webp":[708,651],"ap-howtopay.webp":[769,1585],"ap-ipad.webp":[900,675],"ap-mac.webp":[900,675],"ap-step1.webp":[700,1444],"ap-watch.webp":[900,675],"applepay-hand.webp":[451,564],"card-uzum.webp":[1798,1303],"cards-flower.webp":[706,708],"couple-bags.webp":[1275,1296],"double-line.svg":[28,16],"korzinka.webp":[1200,805],"logo-purple.svg":[472,175],"logo-white.svg":[472,175],"man-card.webp":[966,513],"market-tezkor.webp":[1029,749],"qr-card.png":[600,600],"transfers-free.webp":[814,503],"uzumbank-logo-dark.svg":[472,175]};
  var A11Y = { flip: { ru: 'Перевернуть карту и показать QR-код', uz: 'Kartani aylantirib, QR-kodni ko‘rsatish', en: 'Flip the card to show the QR code' }, info: { ru: 'Информация', uz: 'Ma’lumot', en: 'Information' }, table: { ru: 'Таблица', uz: 'Jadval', en: 'Table' } };
  function a11y(ctx, k) { return A11Y[k][ctx.lang] || A11Y[k].ru; }
  function imgSize(ctx, src) { var s = ctx.size && ctx.size(src); if (s) return s; if (/^lib:/.test(src)) return LIB_SIZES[src.slice(4)]; return null; }
  function img(ctx, im, cls, extra) {
    im = im || {};
    if (!im.src) return ctx.edit ? '<span class="ed-imgph' + (cls ? ' ' + cls : '') + '">Изображение</span>' : '';
    return '<img' + (cls ? ' class="' + cls + '"' : '') + ' src="' + esc(ctx.img(im.src)) + '" alt="' + esc(im.alt || '') + '"' + (extra || '') + (function () { if (ctx.edit) return ''; var s = imgSize(ctx, im.src); return s ? ' width="' + s[0] + '" height="' + s[1] + '"' : ''; })() + (ctx.lcp ? (ctx.lcp = false, ' fetchpriority="high"') : ctx.eager ? '' : ' loading="lazy"') + ' decoding="async">';
  }
  function href(ctx, h) { return esc(ctx.href(h || '#')); }
  function btn(ctx, b, path) {
    if (!b || !b.label) return '';
    var st = b.style || 'primary', arrow = b.arrow;
    return '<a class="u-btn u-btn--' + st + (arrow ? ' u-btn--arrow' : '') + '" href="' + href(ctx, b.href) + '"' + ext(ctx, b.href) + '><span' + F(ctx, path + '.label', 'text') + '>' + esc(b.label) + '</span>' + (arrow ? '<span class="u-btn__ic">' + ARROW() + '</span>' : '') + '</a>';
  }
  function ext(ctx, h) { return /^https?:/.test(h || '') && !ctx.edit ? ' rel="noopener"' : ''; }
  function btns(ctx, list, path, center) {
    list = list || [];
    var out = list.map(function (b, i) { return btn(ctx, b, path + '.' + i); }).join('');
    return out ? '<div class="u-btns' + (center ? ' u-btns--center' : '') + '">' + out + '</div>' : '';
  }
  function note(ctx, d, path, ic) {
    var v = getPath(d, path);
    if (!v && !ctx.edit) return '';
    return '<p class="u-note">' + icon(ic || 'info') + '<span' + F(ctx, path, 'text') + '>' + esc(v || '') + '</span></p>';
  }
  function H(ctx, level) {
    if ((level === 1 || (level === 2 && ctx.promote)) && !ctx.h1) { ctx.h1 = true; return 'h1'; }
    return level === 1 ? 'h2' : 'h' + level;
  }
  function plate(v, inner, extraCls, attrs) {
    var bg = v.bg || 'white';
    return '<div class="u-c"><div class="u-plate' + (bg === 'purple' ? ' u-plate--purple' : bg === 'inner' ? ' u-plate--inner' : bg === 'none' ? ' u-plate--none' : ' u-plate--white') + (extraCls ? ' ' + extraCls : '') + '"' + (attrs || '') + '>' + inner + '</div></div>';
  }

  /* ---------- миниатюры ---------- */
  function thumb(parts) {
    var s = '<svg viewBox="0 0 120 72" aria-hidden="true">';
    parts.forEach(function (p) {
      var c = { y: '#FFBE2E', k: '#151515', p: '#7000FF', l: '#E8DCFF', g: '#E9E6F2', w: '#FFFFFF', d: '#B89CFF', t: '#202020' }[p[5] || 'g'];
      s += '<rect x="' + p[0] + '" y="' + p[1] + '" width="' + p[2] + '" height="' + p[3] + '" rx="' + (p[4] || 2) + '" fill="' + c + '"/>';
    });
    return s + '</svg>';
  }
  var P = 'p', L = 'l', G = 'g', Wt = 'w', D = 'd';

  /* ---------- блоки ---------- */
  var B = {};

  function chrome(part, ctx) {
    var all = W.UZ_CHROME || {}, C = all[ctx.lang || 'ru'] || all.ru || { h: '', f: '' };
    var html = C[part].replace(/\{\{IMG:([^}]+)\}\}/g, function (m, n) { return esc(ctx.img('lib:' + n)); });
    if (ctx.edit) html = html.replace(/<a /g, '<a tabindex="-1" ').replace(/<img[^>]*cnt0\.www\.uz[^>]*>/g, '');
    return '<div class="uz-app v-application v-application--is-ltr theme--light" data-app="true"><div class="v-application--wrap"><div data-v-f50fa9bc="">' + html + '</div></div></div>';
  }
  var HD_LOC = { a11y: { ru: 'Версия для слабовидящих', uz: 'Ko‘zi ojizlar uchun versiya', en: 'Accessibility mode' }, search: { ru: 'Поиск', uz: 'Qidiruv', en: 'Search' }, lang: { ru: 'Язык', uz: 'Til', en: 'Language' } };
  function hdl(ctx, k) { return HD_LOC[k][ctx.lang] || HD_LOC[k].ru; }
  B.header2 = {
    name: 'Шапка — новая', cat: 'Структура', bleed: 'top',
    variants: [{ key: 'aud', label: 'Активный раздел', options: [['private', 'Частным лицам'], ['business', 'Бизнесу'], ['off', 'Без переключателя']], def: 'private' }, { key: 'sticky', label: 'При прокрутке', options: [['on', 'Остаётся сверху'], ['off', 'Уезжает']], def: 'on' }, { key: 'lang', label: 'Выбор языка', options: [['on', 'Есть'], ['off', 'Нет']], def: 'on' }, { key: 'a11y', label: 'Версия для слабовидящих', options: [['on', 'Есть'], ['off', 'Нет']], def: 'on' }],
    fields: [{ key: 'audPrivate', label: 'Частным лицам — подпись', t: 'text', when: { aud: ['private', 'business'] } }, { key: 'audPrivateHref', label: 'Частным лицам — ссылка', t: 'link', when: { aud: ['private', 'business'] } }, { key: 'audBusiness', label: 'Бизнесу — подпись', t: 'text', when: { aud: ['private', 'business'] } }, { key: 'audBusinessHref', label: 'Бизнесу — ссылка', t: 'link', when: { aud: ['private', 'business'] } },
      { key: 'items', label: 'Меню', t: 'items', item: [{ key: 'label', label: 'Пункт', t: 'text' }, { key: 'href', label: 'Ссылка (если нет подпунктов)', t: 'link' }, { key: 'icon', label: 'Иконка в мобильном меню', t: 'icon' }, { key: 'children', label: 'Подпункты', t: 'items', item: [{ key: 'label', label: 'Подпункт', t: 'text' }, { key: 'href', label: 'Ссылка', t: 'link' }, { key: 'icon', label: 'Иконка', t: 'icon' }], add: { label: 'Подпункт', href: '', icon: 'check' } }], add: { label: 'Пункт', href: '', icon: '', children: [] } },
      { key: 'searchHref', label: 'Ссылка на поиск (пусто — без поиска)', t: 'link' }, { key: 'button', label: 'Главная кнопка', t: 'button' }, { key: 'ctaShort', label: 'Короткая подпись кнопки на телефоне', t: 'text' }, { key: 'menuLabel', label: 'Подпись кнопки меню (для скринридера)', t: 'text' }],
    example: function () { return { audPrivate: 'Частным лицам', audPrivateHref: 'https://uzumbank.uz/ru/', audBusiness: 'Бизнесу', audBusinessHref: '', items: [{"label": "Продукты", "href": "", "icon": "", "children": [{"label": "Карта Uzum", "icon": "card", "href": "https://uzumbank.uz/ru/card/"}, {"label": "Микрозайм", "icon": "coins", "href": ""}, {"label": "Вклады", "icon": "percent", "href": ""}, {"label": "Кредит", "icon": "bank", "href": ""}]}, {"label": "Сервисы", "href": "", "icon": "", "children": [{"label": "Денежные переводы", "icon": "send", "href": ""}, {"label": "Мой дом", "icon": "home", "href": ""}, {"label": "Оплата по реквизитам", "icon": "doc", "href": ""}, {"label": "Банкоматы", "icon": "pin", "href": ""}, {"label": "Картоматы", "icon": "scan", "href": ""}, {"label": "Обмен валют", "icon": "exchange", "href": ""}, {"label": "Apple Pay", "icon": "smartphone", "href": "https://uzumbank.uz/ru/apple-pay/"}]}, {"label": "О нас", "href": "", "icon": "", "children": [{"label": "Что такое Uzum?", "icon": "uzum", "href": ""}, {"label": "Вакансии", "icon": "users", "href": ""}, {"label": "Тендеры", "icon": "doc-check", "href": ""}]}, {"label": "Поддержка", "href": "", "icon": "chat", "children": []}], searchHref: '', button: { label: 'Скачать приложение', href: '', style: 'primary' }, ctaShort: 'Скачать', menuLabel: 'Меню' }; },
    t: {"uz": {"audPrivate": "Jismoniy shaxslarga", "audBusiness": "Biznesga", "items.0.label": "Mahsulotlar", "items.0.children.0.label": "Uzum karta", "items.0.children.1.label": "Mikroqarz", "items.0.children.2.label": "Omonatlar", "items.0.children.3.label": "Kredit", "items.1.label": "Xizmatlar", "items.1.children.0.label": "Pul o'tkazmalari", "items.1.children.1.label": "Mening uyim", "items.1.children.2.label": "Rekvizitlar bo‘yicha to‘lov", "items.1.children.3.label": "Bankomatlar", "items.1.children.4.label": "Kartomatlar", "items.1.children.5.label": "Valyuta ayirboshlash", "items.1.children.6.label": "Apple Pay", "items.2.label": "Biz haqimizda", "items.2.children.0.label": "Uzum nima?", "items.2.children.1.label": "Bo‘sh ish o‘rinlari", "items.2.children.2.label": "Tenderlar", "items.3.label": "Qoʻllab-quvvatlash"}, "en": {"audPrivate": "For individuals", "audBusiness": "For business", "items.0.label": "Products", "items.0.children.0.label": "Uzum Card", "items.0.children.1.label": "Microloan", "items.0.children.2.label": "Deposits", "items.0.children.3.label": "Loan", "items.1.label": "Services", "items.1.children.0.label": "Money transfers", "items.1.children.1.label": "My home", "items.1.children.2.label": "Payment by banking details", "items.1.children.3.label": "ATM", "items.1.children.4.label": "Card Kiosk", "items.1.children.5.label": "Currency Exchange", "items.1.children.6.label": "Apple Pay", "items.2.label": "About Us", "items.2.children.0.label": "What is Uzum?", "items.2.children.1.label": "Job openings", "items.2.children.2.label": "Tender", "items.3.label": "Support"}},
    thumb: thumb([[0, 0, 120, 72, 0, G], [6, 8, 108, 18, 9, Wt], [12, 13, 16, 8, 4, P], [32, 13, 24, 8, 4, L], [60, 15, 26, 4, 1, D], [92, 12, 18, 10, 5, P], [52, 30, 60, 30, 6, Wt], [56, 35, 8, 8, 2, L], [68, 36, 30, 4, 1, D], [56, 47, 8, 8, 2, L], [68, 48, 24, 4, 1, D]]),
    render: function (d, v, ctx) {
      var ed = ctx.edit, ti = ed ? ' tabindex="-1"' : '', id = 'hd-' + ctx.bid;
      var aud = v.aud !== 'off' ? '<nav class="u-hd__aud" aria-label="' + esc(d.audPrivate && d.audBusiness ? d.audPrivate + ' / ' + d.audBusiness : 'Раздел') + '">' +
        [['private', 'audPrivate'], ['business', 'audBusiness']].map(function (a) { var on = v.aud === a[0]; return '<a href="' + href(ctx, d[a[1] + 'Href']) + '"' + ti + (on ? ' aria-current="page"' : '') + '><span' + F(ctx, a[1], 'text') + '>' + esc(d[a[1]] || '') + '</span></a>'; }).join('') + '</nav>' : '';
      var items = d.items || [];
      var chev = '<svg class="u-hd__chev" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      function sub(it, i, pre) { return (it.children || []).map(function (c, j) { return '<li><a class="u-hd__di" href="' + href(ctx, c.href) + '"' + ti + (ctx.isCurrent(c.href) ? ' aria-current="page"' : '') + '><span class="u-hd__dic">' + icon(c.icon || 'check') + '</span><span' + F(ctx, pre + i + '.children.' + j + '.label', 'text') + '>' + esc(c.label || '') + '</span></a></li>'; }).join(''); }
      var nav = items.map(function (it, i) {
        var lab = '<span' + F(ctx, 'items.' + i + '.label', 'text') + '>' + esc(it.label || '') + '</span>';
        if ((it.children || []).length) return '<li class="u-hd__item"><button type="button" class="u-hd__top" aria-expanded="false" aria-controls="' + id + '-d' + i + '"' + ti + '>' + lab + chev + '</button><div class="u-hd__dd" id="' + id + '-d' + i + '" hidden><ul class="u-hd__dl">' + sub(it, i, 'items.') + '</ul></div></li>';
        return '<li class="u-hd__item"><a class="u-hd__top" href="' + href(ctx, it.href) + '"' + ti + (ctx.isCurrent(it.href) ? ' aria-current="page"' : '') + '>' + lab + '</a></li>';
      }).join('');
      var mnav = items.map(function (it, i) {
        if ((it.children || []).length) return '<details class="u-hd__grp"><summary' + ti + '>' + esc(it.label || '') + chev + '</summary><ul class="u-hd__dl">' + sub(it, i, 'items.') + '</ul></details>';
        return '<a class="u-hd__mlink" href="' + href(ctx, it.href) + '"' + ti + '>' + (it.icon ? '<span class="u-hd__dic">' + icon(it.icon) + '</span>' : '') + esc(it.label || '') + '</a>';
      }).join('');
      var code = (ctx.lang || 'ru').toUpperCase();
      var a11y = v.a11y !== 'off' ? '<button type="button" class="u-hd__icon u-hd__a11y" aria-pressed="false" aria-label="' + esc(hdl(ctx, 'a11y')) + '" title="' + esc(hdl(ctx, 'a11y')) + '"' + ti + '>' + icon('eye') + '</button>' : '';
      var search = d.searchHref ? '<a class="u-hd__icon" href="' + href(ctx, d.searchHref) + '" aria-label="' + esc(hdl(ctx, 'search')) + '"' + ti + '>' + icon('search') + '</a>' : '';
      var lang = v.lang !== 'off' ? '<button type="button" class="u-hd__lang"' + ti + ' aria-label="' + esc(hdl(ctx, 'lang')) + '">' + icon('globe') + '<span class="value">' + code + '</span></button>' : '';
      var cta = d.button && d.button.label ? '<a class="u-btn u-btn--primary u-hd__cta" href="' + href(ctx, d.button.href) + '"' + ti + '><span class="u-hd__cl"' + F(ctx, 'button.label', 'text') + '>' + esc(d.button.label) + '</span>' + (d.ctaShort ? '<span class="u-hd__cs" aria-hidden="true">' + esc(d.ctaShort) + '</span>' : '') + '</a>' : '';
      var logo = '<a class="u-hd__logo" href="' + href(ctx, ctx.homeHref()) + '"' + ti + '><img src="' + esc(ctx.img('lib:logo-purple.svg')) + '" alt="Uzum Bank" width="108" height="40"></a>';
      var burger = '<button type="button" class="u-burger u-hd__burger" aria-expanded="false" aria-controls="' + id + '-m" aria-label="' + esc(d.menuLabel || 'Меню') + '"' + ti + '><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>';
      var tools = '<div class="u-hd__mtools">' + (v.a11y !== 'off' ? '<button type="button" class="u-hd__a11y u-hd__mbtn" aria-pressed="false"' + ti + '>' + icon('eye') + esc(hdl(ctx, 'a11y')) + '</button>' : '') + (d.searchHref ? '<a class="u-hd__mbtn" href="' + href(ctx, d.searchHref) + '"' + ti + '>' + icon('search') + esc(hdl(ctx, 'search')) + '</a>' : '') + '</div>';
      var mob = '<div class="u-hd__panel" id="' + id + '-m">' + aud + '<nav class="u-hd__mnav" aria-label="' + esc(d.menuLabel || 'Меню') + '">' + mnav + '</nav>' + tools + (v.lang !== 'off' ? '<div class="u-hd__langs" data-langlinks></div>' : '') + (cta ? '<div class="u-hd__mcta">' + cta + '</div>' : '') + '</div>';
      return '<header class="u-hd' + (v.sticky !== 'off' && !ed ? ' u-hd--sticky' : '') + '"><div class="u-hd__bar">' + logo + aud + '<nav class="u-hd__navw" aria-label="' + esc(d.menuLabel || 'Меню') + '"><ul class="u-hd__nav">' + nav + '</ul></nav><span class="u-hd__sp"></span>' + search + a11y + lang + cta + burger + '</div>' + mob + '</header>';
    }
  };

  B.header = {
    name: 'Шапка сайта', cat: 'Структура', bleed: 'top', locked: true,
    note: 'Шапка uzumbank.uz без изменений. Её содержимое правится на основном сайте.',
    variants: [], fields: [],
    example: function () { return {}; },
    thumb: thumb([[0, 0, 120, 18, 0, Wt], [6, 6, 18, 6, 2, P], [34, 7, 14, 4], [52, 7, 14, 4], [70, 7, 14, 4], [96, 5, 20, 8, 4, P], [0, 22, 120, 50, 0, G]]),
    render: function (d, v, ctx) { return '<div class="uz-chrome uz-chrome--h">' + chrome('h', ctx) + '</div>'; }
  };

  B.hero = {
    name: 'Первый экран', cat: 'Структура',
    variants: [
      { key: 'media', label: 'Визуал', options: [['card', 'Карта с QR'], ['image', 'Изображение'], ['none', 'Без визуала']], def: 'card' },
      { key: 'bg', label: 'Фон', options: [['purple', 'Фиолетовый'], ['white', 'Белый']], def: 'purple' },
      { key: 'side', label: 'Визуал', options: [['right', 'Справа'], ['left', 'Слева']], def: 'right' },
      { key: 'fit', label: 'Изображение', options: [['center', 'По центру'], ['bottom', 'К низу']], def: 'center', when: { media: 'image' } }
    ],
    fields: [
      { key: 'eyebrow', label: 'Надзаголовок', t: 'text' },
      { key: 'title', label: 'Заголовок', t: 'text' },
      { key: 'lead', label: 'Подзаголовок', t: 'inline' },
      { key: 'buttons', label: 'Кнопки', t: 'buttons', max: 2 },
      { key: 'note', label: 'Сноска', t: 'text' },
      { key: 'image', label: 'Изображение', t: 'image', when: { media: 'image' } },
      { key: 'card', label: 'Карта (лицевая сторона)', t: 'image', when: { media: 'card' } },
      { key: 'qr', label: 'QR-код на обороте', t: 'image', when: { media: 'card' } },
      { key: 'qrText', label: 'Текст на обороте', t: 'text', when: { media: 'card' } }
    ],
    example: function () { return { eyebrow: 'Преимущества карты Uzum', title: 'Карта Uzum — деньги есть!', lead: 'Пополняйте и переводите деньги бесплатно. А если своих средств не хватает, получите на карту до 25 000 000 сум на 30 дней без переплат', buttons: [{ label: 'Оформить бесплатно', href: '#', style: 'light', arrow: true }], note: '', image: { src: 'lib:applepay-hand.webp', alt: 'Карта Uzum в Apple Pay на iPhone' }, card: { src: 'lib:card-uzum.webp', alt: 'Карта Uzum' }, qr: { src: 'lib:qr-card.png', alt: 'QR-код для оформления карты Uzum' }, qrText: 'Отсканируйте QR, всего пара минут, и карта будет готова' }; },
    thumb: thumb([[4, 4, 112, 64, 8, P], [12, 18, 46, 6, 2, Wt], [12, 27, 36, 6, 2, Wt], [12, 38, 40, 3, 1, D], [12, 50, 26, 8, 4, Wt], [70, 18, 40, 28, 4, D]]),
    render: function (d, v, ctx) {
      var purple = v.bg !== 'white';
      var h = H(ctx, 1);
      var media = '';
      if (v.media === 'card') {
        media = '<button type="button" class="u-flip" aria-pressed="false" aria-label="' + a11y(ctx, 'flip') + '"><span class="u-flip__inner">' +
          img(ctx, d.card || { src: 'lib:card-uzum.webp', alt: 'Карта Uzum' }, 'u-flip__front') +
          '<span class="u-flip__back"><span class="u-flip__qr">' + img(ctx, d.qr) + '</span><span' + F(ctx, 'qrText', 'text') + '>' + esc(d.qrText || '') + '</span></span></span></button>';
      } else if (v.media === 'image') {
        media = img(ctx, d.image, 'u-hero__img');
      }
      var text = '<div class="u-hero__text">' + txt(ctx, d, 'eyebrow', 'p', 'u-eyebrow') + '<' + h + ' class="u-h1' + (purple ? '' : ' u-grad') + '"' + F(ctx, 'title', 'text') + '>' + esc(d.title || '') + '</' + h + '>' +
        inlineRich(ctx, d, 'lead', 'p', 'u-lead') + btns(ctx, d.buttons, 'buttons') + note(ctx, d, 'note') + '</div>';
      var cls = 'u-hero' + (v.media === 'none' ? '' : '') + (v.media === 'image' && v.fit === 'bottom' ? ' u-hero--bleed' : '');
      var inner = '<div class="' + cls + '" style="' + (v.media === 'none' ? 'grid-template-columns:minmax(0,1fr);min-height:0' : '') + '">' + text + (v.media !== 'none' ? '<div class="u-hero__media">' + media + '</div>' : '') + '</div>';
      return plate({ bg: purple ? 'purple' : 'white' }, inner, v.side === 'left' ? 'u-hero--left' : '');
    }
  };

  B.heading = {
    name: 'Заголовок раздела', cat: 'Структура',
    variants: [{ key: 'align', label: 'Выравнивание', options: [['left', 'Слева'], ['center', 'По центру']], def: 'left' }, { key: 'level', label: 'Уровень', options: [['2', 'H2'], ['1', 'H1']], def: '2' }],
    fields: [{ key: 'eyebrow', label: 'Надзаголовок', t: 'text' }, { key: 'title', label: 'Заголовок', t: 'text' }, { key: 'lead', label: 'Подзаголовок', t: 'inline' }],
    example: function () { return { eyebrow: '', title: 'Как это работает', lead: 'Короткое пояснение к разделу — одно-два предложения.' }; },
    thumb: thumb([[10, 24, 70, 9, 2, P], [10, 38, 90, 4], [10, 46, 60, 4]]),
    render: function (d, v, ctx) {
      var h = H(ctx, v.level === '1' ? 1 : 2);
      return '<div class="u-c"><div class="u-heading' + (v.align === 'center' ? ' u-center' : '') + '">' + txt(ctx, d, 'eyebrow', 'p', 'u-eyebrow') +
        '<' + h + ' class="u-h2 u-grad"' + F(ctx, 'title', 'text') + '>' + esc(d.title || '') + '</' + h + '>' + inlineRich(ctx, d, 'lead', 'p', 'u-lead') + '</div></div>';
    }
  };

  B.footer = {
    name: 'Подвал сайта', cat: 'Структура', bleed: 'bottom', locked: true,
    note: 'Подвал uzumbank.uz без изменений. Форма подписки в нём работает так же, как на основном сайте.',
    variants: [], fields: [],
    example: function () { return {}; },
    thumb: thumb([[0, 34, 120, 38, 0, P], [6, 40, 40, 5, 2, Wt], [76, 40, 38, 7, 2, Wt], [6, 54, 16, 8, 2, D], [40, 54, 16, 3, 1, D], [62, 54, 16, 3, 1, D], [84, 54, 16, 3, 1, D]]),
    render: function (d, v, ctx) { return '<div class="uz-chrome uz-chrome--f">' + chrome('f', ctx) + '</div>'; }
  };

  B.divider = {
    name: 'Разделитель', cat: 'Структура',
    variants: [{ key: 'kind', label: 'Вид', options: [['line', 'Линия'], ['space', 'Отступ']], def: 'line' }, { key: 'size', label: 'Размер', options: [['s', 'S'], ['m', 'M'], ['l', 'L']], def: 'm' }],
    fields: [],
    example: function () { return {}; },
    thumb: thumb([[6, 20, 108, 12, 6, G], [6, 35, 108, 2, 1, D], [6, 40, 108, 12, 6, G]]),
    render: function (d, v) {
      var sz = { s: 8, m: 24, l: 56 }[v.size || 'm'];
      return '<div class="u-c" style="padding-top:' + sz + 'px;padding-bottom:' + sz + 'px">' + (v.kind === 'space' ? '<div aria-hidden="true"></div>' : '<hr class="u-divider">') + '</div>';
    }
  };

  B.text = {
    name: 'Текстовая секция', cat: 'Текст',
    variants: [{ key: 'bg', label: 'Фон', options: [['white', 'Плашка'], ['none', 'Без плашки'], ['purple', 'Фиолетовый']], def: 'white' }, { key: 'width', label: 'Ширина текста', options: [['narrow', 'Удобная'], ['wide', 'Во всю ширину']], def: 'narrow' }],
    fields: [{ key: 'title', label: 'Заголовок', t: 'text' }, { key: 'body', label: 'Текст', t: 'rich' }],
    example: function () { return { title: 'Как пользоваться картой', body: '<p>Карта Uzum работает в любом магазине, где принимают <strong>Visa</strong>. Оформить её можно в приложении Uzum Bank за пару минут.</p><h3>Что понадобится</h3><ul><li>Телефон с приложением Uzum Bank</li><li>Паспорт или ID-карта<ul><li>для резидентов Узбекистана</li></ul></li></ul><p>Подробные условия — в <a href="https://uzumbank.uz/ru/tariffs">тарифах</a>.</p>' }; },
    thumb: thumb([[4, 4, 112, 64, 8, Wt], [12, 12, 60, 7, 2, P], [12, 25, 96, 3], [12, 31, 90, 3], [12, 37, 80, 3], [16, 45, 3, 3, 1, P], [22, 45, 60, 3], [16, 52, 3, 3, 1, P], [22, 52, 50, 3]]),
    render: function (d, v, ctx) {
      var h = H(ctx, 2);
      var inner = '<div class="u-stack' + (v.width === 'wide' ? '' : ' u-measure') + '">' + (d.title || ctx.edit ? '<' + h + ' class="u-h2 u-grad"' + F(ctx, 'title', 'text') + '>' + esc(d.title || '') + '</' + h + '>' : '') + rich(ctx, d, 'body') + '</div>';
      return plate(v, inner);
    }
  };

  B.text2 = {
    name: 'Текст в две колонки', cat: 'Текст',
    variants: [{ key: 'bg', label: 'Фон', options: [['white', 'Плашка'], ['none', 'Без плашки']], def: 'white' }],
    fields: [{ key: 'title', label: 'Заголовок', t: 'text' }, { key: 'left', label: 'Левая колонка', t: 'rich' }, { key: 'right', label: 'Правая колонка', t: 'rich' }],
    example: function () { return { title: 'Карта и микрозайм', left: '<h3>Карта Uzum</h3><p>Бесплатный выпуск и обслуживание. Переводы между картами Uzum — без комиссии.</p>', right: '<h3>Микрозайм</h3><p>До 25 000 000 сум на карту. Первые 30 дней — без переплат при полном погашении.</p>' }; },
    thumb: thumb([[4, 4, 112, 64, 8, Wt], [12, 12, 50, 7, 2, P], [12, 26, 44, 3], [12, 32, 44, 3], [12, 38, 36, 3], [64, 26, 44, 3], [64, 32, 44, 3], [64, 38, 30, 3]]),
    render: function (d, v, ctx) {
      var h = H(ctx, 2);
      return plate(v, '<div class="u-stack">' + (d.title || ctx.edit ? '<' + h + ' class="u-h2 u-grad"' + F(ctx, 'title', 'text') + '>' + esc(d.title || '') + '</' + h + '>' : '') + '<div class="u-cols2">' + rich(ctx, d, 'left') + rich(ctx, d, 'right') + '</div></div>');
    }
  };

  B.quote = {
    name: 'Цитата', cat: 'Текст',
    variants: [{ key: 'bg', label: 'Фон', options: [['white', 'Белый'], ['purple', 'Фиолетовый']], def: 'white' }],
    fields: [{ key: 'text', label: 'Цитата', t: 'text' }, { key: 'author', label: 'Автор', t: 'text' }, { key: 'role', label: 'Должность', t: 'text' }],
    example: function () { return { text: 'Мы хотели, чтобы карта была бесплатной для всех — без условий и мелкого шрифта.', author: 'Команда Uzum Bank', role: '' }; },
    thumb: thumb([[4, 4, 112, 64, 8, Wt], [12, 16, 6, 8, 1, P], [22, 18, 80, 6, 2, 't'], [22, 28, 64, 6, 2, 't'], [22, 46, 30, 4], [22, 53, 20, 3]]),
    render: function (d, v, ctx) {
      return plate(v, '<figure class="u-quote u-measure"><blockquote><span' + F(ctx, 'text', 'text') + '>' + esc(d.text || '') + '</span></blockquote>' +
        (d.author || d.role || ctx.edit ? '<figcaption>' + txt(ctx, d, 'author', 'span', 'u-quote__a') + txt(ctx, d, 'role', 'span', 'u-quote__r') + '</figcaption>' : '') + '</figure>');
    }
  };

  /* ---------- общие помощники для новых блоков ---------- */
  var LOC = {
    until: { ru: function (s) { return 'до ' + s; }, uz: function (s) { return s + 'gacha'; }, en: function (s) { return 'until ' + s; } },
    left: { ru: 'Осталось', uz: 'Qoldi', en: 'Left' },
    dhm: { ru: ['дн', 'ч', 'мин'], uz: ['kun', 'soat', 'daq'], en: ['d', 'h', 'min'] },
    ended: { ru: 'Акция завершилась', uz: 'Aksiya yakunlandi', en: 'The promotion has ended' },
    terms: { ru: 'Условия акции', uz: 'Aksiya shartlari', en: 'Promotion terms' },
    cur: { ru: 'сум', uz: 'so‘m', en: 'UZS' },
    mo: { ru: 'мес.', uz: 'oy', en: 'mo' },
    rateY: { ru: '% годовых', uz: '% yillik', en: '% per year' },
    of5: { ru: 'из 5', uz: '5 dan', en: 'out of 5' },
    review: { ru: 'Отзыв', uz: 'Sharh', en: 'Review' },
    reviews: { ru: 'Отзывы клиентов', uz: 'Mijozlar sharhlari', en: 'Customer reviews' },
    open: { ru: 'открыть', uz: 'ochish', en: 'open' }
  };
  function loc(ctx, k) { var x = LOC[k]; return x[ctx.lang] || x.ru; }
  var MONTHS = { ru: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'], uz: ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'], en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] };
  function fmtDate(iso, lang) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); if (!m) return '';
    var day = +m[3], mon = (MONTHS[lang] || MONTHS.ru)[+m[2] - 1];
    return lang === 'uz' ? day + '-' + mon : lang === 'en' ? day + ' ' + mon : day + '\u00A0' + mon;
  }
  function deadline(iso) { return /^\d{4}-\d{2}-\d{2}$/.test(iso || '') ? iso + 'T23:59:59+05:00' : ''; }
  function money(n, ctx) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ' + loc(ctx, 'cur'); }
  function num(v, def) { var n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : def; }
  function calcResult(k, a, t, rate, cap, comp) {
    var r = rate / 100;
    if (k === 'loan') { var i = r / 12, pay = i ? a * i / (1 - Math.pow(1 + i, -t)) : a / t; return [pay, pay * t - a]; }
    if (k === 'cashback') { var cb = a * r; if (cap > 0) cb = Math.min(cb, cap); return [cb, cb * 12]; }
    var inc = comp ? a * (Math.pow(1 + r / 12, t) - 1) : a * r * t / 12; return [inc, a + inc];
  }
  function bytes(n, lang) { if (!n) return ''; var u = { ru: ['КБ', 'МБ'], uz: ['KB', 'MB'], en: ['KB', 'MB'] }[lang] || ['КБ', 'МБ']; return n < 1048576 ? Math.max(1, Math.round(n / 1024)) + ' ' + u[0] : (n / 1048576).toFixed(1).replace('.', lang === 'en' ? '.' : ',') + ' ' + u[1]; }

  /* ---------- Акция ---------- */
  B.promo = {
    name: 'Акция', cat: 'Действия',
    variants: [{ key: 'bg', label: 'Фон', options: [['purple', 'Фиолетовый'], ['white', 'Плашка']], def: 'purple' }, { key: 'cd', label: 'Обратный отсчёт', options: [['on', 'Показывать'], ['off', 'Нет']], def: 'on' }, { key: 'media', label: 'Картинка', options: [['image', 'Есть'], ['none', 'Нет']], def: 'image' }],
    fields: [{ key: 'eyebrow', label: 'Метка', t: 'text' }, { key: 'title', label: 'Заголовок', t: 'text' }, { key: 'lead', label: 'Подзаголовок', t: 'text' }, { key: 'end', label: 'Последний день акции', t: 'date', hint: 'Акция заканчивается в 23:59 по Ташкенту. После этого блок сам покажет «Акция завершилась» и спрячет кнопку.' },
      { key: 'prize', label: 'Приз или выгода крупно', t: 'text', when: { media: 'image' } }, { key: 'prizeLabel', label: 'Подпись к призу', t: 'text', when: { media: 'image' } },
      { key: 'steps', label: 'Как участвовать', t: 'items', item: [{ key: 'text', label: 'Шаг', t: 'text' }], add: { text: 'Новый шаг' } },
      { key: 'image', label: 'Изображение', t: 'image', when: { media: 'image' } }, { key: 'button', label: 'Кнопка', t: 'button' }, { key: 'terms', label: 'Полные условия', t: 'rich' }, { key: 'ended', label: 'Текст после окончания', t: 'text' }],
    example: function () { return { eyebrow: 'Акция', title: 'Кэшбэк 7% в Korzinka', lead: 'Платите картой Uzum в любом магазине сети и получайте часть денег обратно', end: '2026-12-31', prize: '7%', prizeLabel: 'кэшбэк с каждой покупки', steps: [{ text: 'Оформите карту Uzum в приложении' }, { text: 'Платите ей в Korzinka' }, { text: 'Кэшбэк придёт на карту в течение 3 дней' }], image: { src: 'lib:korzinka.webp', alt: 'Карта Uzum с корзиной продуктов' }, button: { label: 'Оформить карту', href: 'https://uzumbank.uz/ru/card/', style: 'primary' }, terms: '<p>Кэшбэк до 100 000 сум в месяц. Не начисляется на покупку алкоголя и табака. Организатор — АО «Uzum Bank».</p>', ended: 'Следите за новыми акциями в приложении Uzum Bank' }; },
    thumb: thumb([[4, 4, 112, 64, 8, P], [12, 12, 20, 6, 3, 'y'], [12, 22, 50, 7, 2, Wt], [12, 33, 40, 3, 1, D], [12, 42, 30, 6, 2, D], [12, 52, 26, 8, 4, Wt], [72, 14, 38, 40, 6, D], [78, 44, 26, 8, 3, 'y']]),
    render: function (d, v, ctx) {
      var purple = v.bg !== 'white', h = H(ctx, 2), dl = deadline(d.end), ended = dl && Date.now() > Date.parse(dl), date = fmtDate(d.end, ctx.lang);
      var meta = '<p class="u-promo__meta">' + (d.eyebrow || ctx.edit ? '<span class="u-promo__badge"' + F(ctx, 'eyebrow', 'text') + '>' + esc(d.eyebrow || '') + '</span>' : '') + (date ? '<span class="u-promo__until">' + icon('calendar') + esc(loc(ctx, 'until')(date)) + '</span>' : '') + '</p>';
      var u = loc(ctx, 'dhm'), mLeft = dl ? Math.max(0, Math.floor((Date.parse(dl) - Date.now()) / 60000)) : 0, cdv = [Math.floor(mLeft / 1440), Math.floor(mLeft % 1440 / 60), mLeft % 60];
      var cd = v.cd !== 'off' && dl ? '<p class="u-promo__cd" data-cd><span class="u-promo__cdl">' + loc(ctx, 'left') + '</span><span class="u-promo__cdn"><b data-cd-d>' + cdv[0] + '</b> ' + u[0] + '</span><span class="u-promo__cdn"><b data-cd-h>' + cdv[1] + '</b> ' + u[1] + '</span><span class="u-promo__cdn"><b data-cd-m>' + cdv[2] + '</b> ' + u[2] + '</span></p>' : '';
      var steps = (d.steps || []).length ? '<ol class="u-promo__steps">' + d.steps.map(function (s, i) { return '<li><span class="u-promo__sn" aria-hidden="true">' + (i + 1) + '</span><span' + F(ctx, 'steps.' + i + '.text', 'text') + '>' + esc(s.text || '') + '</span></li>'; }).join('') + '</ol>' : '';
      var endedP = '<p class="u-promo__ended"' + F(ctx, 'ended', 'text') + '>' + esc(d.ended || loc(ctx, 'ended')) + '</p>';
      var media = v.media !== 'none' ? '<div class="u-promo__media">' + img(ctx, d.image, 'u-promo__img') + (d.prize || ctx.edit ? '<p class="u-promo__prize"><b' + F(ctx, 'prize', 'text') + '>' + esc(d.prize || '') + '</b><span' + F(ctx, 'prizeLabel', 'text') + '>' + esc(d.prizeLabel || '') + '</span></p>' : '') + '</div>' : '';
      var terms = d.terms || ctx.edit ? (ctx.edit ? '<div class="u-promo__terms is-open"><div class="u-promo__tq">' + loc(ctx, 'terms') + '</div>' + rich(ctx, d, 'terms', 'u-promo__tb') + '</div>' : '<details class="u-promo__terms"><summary class="u-promo__tq">' + loc(ctx, 'terms') + '</summary>' + rich(ctx, d, 'terms', 'u-promo__tb') + '</details>') : '';
      return '<div class="u-c"><section class="u-plate ' + (purple ? 'u-plate--purple' : 'u-plate--white') + ' u-promo' + (ended ? ' is-ended' : '') + (v.media === 'none' ? ' u-promo--solo' : '') + '"' + (dl ? ' data-deadline="' + dl + '"' : '') + '><div class="u-promo__grid"><div class="u-promo__main">' + meta +
        txt(ctx, d, 'title', h, 'u-h2' + (purple ? '' : ' u-grad')) + txt(ctx, d, 'lead', 'p', 'u-lead') + cd + steps + '<div class="u-promo__act">' + btn(ctx, d.button, 'button') + '</div>' + endedP + '</div>' + media + '</div>' + terms + '</section></div>';
    }
  };

  /* ---------- Документы ---------- */
  B.docs = {
    name: 'Документы', cat: 'Карточки и данные',
    variants: [{ key: 'bg', label: 'Фон', options: [['white', 'Плашка'], ['none', 'Без плашки']], def: 'white' }],
    fields: [{ key: 'title', label: 'Заголовок', t: 'text' }, { key: 'items', label: 'Файлы', t: 'items', item: [{ key: 'title', label: 'Название', t: 'text' }, { key: 'file', label: 'Файл', t: 'file' }, { key: 'note', label: 'Пояснение', t: 'text' }], add: { title: 'Новый документ', file: '', note: '' } }],
    example: function () { return { title: 'Документы', items: [{ title: 'Тарифы по карте Uzum', file: '', note: 'Действуют с 16 ноября 2026' }, { title: 'Условия выпуска и обслуживания карт', file: '', note: '' }, { title: 'Публичная оферта', file: '', note: '' }] }; },
    thumb: thumb([[4, 4, 112, 64, 8, Wt], [12, 10, 40, 6, 2, P], [12, 22, 96, 12, 3, G], [12, 37, 96, 12, 3, G], [12, 52, 96, 12, 3, G], [16, 25, 6, 6, 1, P], [16, 40, 6, 6, 1, P], [16, 55, 6, 6, 1, P]]),
    render: function (d, v, ctx) {
      var h = H(ctx, 2);
      var items = (d.items || []).map(function (it, i) {
        var a = it.file && ctx.asset ? ctx.asset(it.file) : null, ext = a ? (a.ext || '').toUpperCase() : '', meta = [ext, bytes(a && a.size, ctx.lang)].filter(Boolean).join(' · ');
        var href = it.file && !ctx.edit ? esc(ctx.file ? ctx.file(it.file) : ctx.img(it.file)) : '#';
        if (!ctx.edit && !it.file) return '';
        return '<li><a class="u-doc" href="' + href + '"' + (ctx.edit ? ' tabindex="-1"' : ' target="_blank" rel="noopener"') + '><span class="u-doc__ic">' + icon('doc') + '</span><span class="u-doc__b"><span class="u-doc__t"' + F(ctx, 'items.' + i + '.title', 'text') + '>' + esc(it.title || '') + '</span>' +
          (it.note || ctx.edit ? '<span class="u-doc__n"' + F(ctx, 'items.' + i + '.note', 'text') + '>' + esc(it.note || '') + '</span>' : '') + '</span>' + (meta ? '<span class="u-doc__m">' + esc(meta) + '</span>' : ctx.edit ? '<span class="u-doc__m u-doc__m--miss">Нет файла</span>' : '') + '<span class="u-doc__go" aria-hidden="true">' + icon('external') + '</span></a></li>';
      }).join('');
      return plate(v, '<div class="u-stack">' + (d.title || ctx.edit ? '<' + h + ' class="u-h3"' + F(ctx, 'title', 'text') + '>' + esc(d.title || '') + '</' + h + '>' : '') + '<ul class="u-docs">' + items + '</ul></div>');
    }
  };

  /* ---------- Калькулятор ---------- */
  B.calc = {
    name: 'Калькулятор', cat: 'Действия',
    notice: 'Ставки и лимиты в примере условные. Перед публикацией подставьте действующие значения из тарифов и согласуйте лигал с юристами.',
    variants: [{ key: 'kind', label: 'Что считаем', options: [['deposit', 'Вклад'], ['loan', 'Кредит'], ['cashback', 'Кэшбэк']], def: 'deposit' }, { key: 'comp', label: 'Капитализация', options: [['on', 'Ежемесячная'], ['off', 'Нет']], def: 'on', when: { kind: 'deposit' } }, { key: 'bg', label: 'Фон', options: [['white', 'Плашка'], ['purple', 'Фиолетовый']], def: 'white' }],
    fields: [{ key: 'title', label: 'Заголовок', t: 'text' }, { key: 'lead', label: 'Подзаголовок', t: 'text' },
      { key: 'aLabel', label: 'Подпись суммы', t: 'text' }, { key: 'aMin', label: 'Сумма от, сум', t: 'num' }, { key: 'aMax', label: 'Сумма до, сум', t: 'num' }, { key: 'aStep', label: 'Шаг суммы, сум', t: 'num' }, { key: 'aDef', label: 'Сумма по умолчанию, сум', t: 'num' },
      { key: 'tLabel', label: 'Подпись срока', t: 'text', when: { kind: ['deposit', 'loan'] } }, { key: 'tMin', label: 'Срок от, мес.', t: 'num', when: { kind: ['deposit', 'loan'] } }, { key: 'tMax', label: 'Срок до, мес.', t: 'num', when: { kind: ['deposit', 'loan'] } }, { key: 'tDef', label: 'Срок по умолчанию, мес.', t: 'num', when: { kind: ['deposit', 'loan'] } },
      { key: 'rate', label: 'Ставка или кэшбэк, %', t: 'num', hint: 'Для вклада и кредита — % годовых, для кэшбэка — % от покупок' }, { key: 'cap', label: 'Лимит кэшбэка в месяц, сум (0 — без лимита)', t: 'num', when: { kind: 'cashback' } },
      { key: 'r1', label: 'Подпись главного результата', t: 'text' }, { key: 'r2', label: 'Подпись второго результата', t: 'text' }, { key: 'button', label: 'Кнопка', t: 'button' }, { key: 'legal', label: 'Примечание', t: 'rich' }],
    example: function () { return { title: 'Посчитайте доход по вкладу', lead: 'Двигайте ползунки — результат пересчитается сразу', aLabel: 'Сумма вклада', aMin: 1000000, aMax: 100000000, aStep: 500000, aDef: 10000000, tLabel: 'Срок', tMin: 3, tMax: 24, tDef: 12, rate: 20, cap: 100000, r1: 'Ваш доход', r2: 'Сумма в конце срока', button: { label: 'Открыть вклад', href: '#', style: 'primary' }, legal: '<p>Расчёт предварительный. Точная сумма зависит от условий вклада на дату открытия.</p>' }; },
    thumb: thumb([[4, 4, 112, 64, 8, Wt], [12, 10, 50, 6, 2, P], [12, 26, 50, 3, 1, G], [12, 25, 30, 5, 2, P], [12, 42, 50, 3, 1, G], [12, 41, 20, 5, 2, P], [70, 20, 40, 38, 6, P], [76, 30, 26, 8, 2, Wt]]),
    render: function (d, v, ctx) {
      var k = v.kind || 'deposit', purple = v.bg === 'purple', h = H(ctx, 2), hasT = k !== 'cashback';
      var aMin = num(d.aMin, 0), aMax = Math.max(num(d.aMax, 1), aMin + 1), aStep = Math.max(num(d.aStep, 1), 1), a = Math.min(Math.max(num(d.aDef, aMin), aMin), aMax);
      var tMin = Math.max(num(d.tMin, 1), 1), tMax = Math.max(num(d.tMax, 12), tMin), t = Math.min(Math.max(num(d.tDef, tMin), tMin), tMax);
      var rate = num(d.rate, 0), cap = num(d.cap, 0), res = calcResult(k, a, t, rate, cap, v.comp !== 'off');
      var cfg = { k: k, r: rate, c: cap, p: v.comp !== 'off' ? 1 : 0, cur: loc(ctx, 'cur'), mo: loc(ctx, 'mo') };
      function range(key, label, lp, min, max, step, val, out) {
        var id = 'c-' + ctx.bid + '-' + key;
        return '<div class="u-calc__f"><div class="u-calc__row"><label class="u-calc__l" for="' + id + '"' + F(ctx, lp, 'text') + '>' + esc(label || '') + '</label><output class="u-calc__v" for="' + id + '" data-out="' + key + '">' + out + '</output></div><input class="u-range" type="range" id="' + id + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + val + '" data-in="' + key + '"></div>';
      }
      var rateTxt = k === 'cashback' ? rate + '%' + (cap > 0 ? ' · ' + money(cap, ctx) : '') : rate + loc(ctx, 'rateY');
      var inputs = range('a', d.aLabel, 'aLabel', aMin, aMax, aStep, a, money(a, ctx)) + (hasT ? range('t', d.tLabel, 'tLabel', tMin, tMax, 1, t, t + ' ' + loc(ctx, 'mo')) : '') + '<p class="u-calc__rate">' + icon('percent') + esc(rateTxt) + '</p>';
      var out = '<div class="u-calc__res" aria-live="polite"><p class="u-calc__rl"' + F(ctx, 'r1', 'text') + '>' + esc(d.r1 || '') + '</p><p class="u-calc__rv" data-res="0">' + money(res[0], ctx) + '</p>' +
        (d.r2 || ctx.edit ? '<p class="u-calc__rl u-calc__rl--2"' + F(ctx, 'r2', 'text') + '>' + esc(d.r2 || '') + '</p><p class="u-calc__rv2" data-res="1">' + money(res[1], ctx) + '</p>' : '') + btn(ctx, d.button, 'button') + '</div>';
      return '<div class="u-c"><section class="u-plate ' + (purple ? 'u-plate--purple' : 'u-plate--white') + ' u-calc" data-calc="' + esc(JSON.stringify(cfg)) + '"><div class="u-stack u-stack--s">' + txt(ctx, d, 'title', h, 'u-h2' + (purple ? '' : ' u-grad')) + txt(ctx, d, 'lead', 'p', 'u-lead') + '</div>' +
        '<div class="u-calc__grid"><div class="u-calc__in">' + inputs + '</div>' + out + '</div>' + rich(ctx, d, 'legal', 'u-calc__legal') + '</section></div>';
    }
  };

  /* ---------- Совет от карты Uzum ---------- */
  B.tip = {
    name: 'Совет от карты Uzum', cat: 'Текст',
    variants: [{ key: 'bg', label: 'Фон', options: [['inner', 'Светлый'], ['white', 'Плашка'], ['purple', 'Фиолетовый']], def: 'inner' }, { key: 'side', label: 'Персонаж', options: [['left', 'Слева'], ['right', 'Справа']], def: 'left' }],
    fields: [{ key: 'label', label: 'Метка', t: 'text' }, { key: 'body', label: 'Совет', t: 'rich' }, { key: 'image', label: 'Персонаж', t: 'image' }, { key: 'button', label: 'Кнопка', t: 'button' }],
    example: function () { return { label: 'Совет от карты Uzum', body: '<p>Добавьте меня в Apple Pay — и платите телефоном, даже если забыли кошелёк дома.</p>', image: { src: 'lib:korzinka.webp', alt: '' }, button: { label: '', href: '#', style: 'soft' } }; },
    thumb: thumb([[4, 8, 112, 56, 8, L], [10, 18, 30, 40, 6, D], [48, 18, 62, 34, 8, Wt], [54, 24, 34, 4, 1, P], [54, 32, 48, 3, 1, G], [54, 38, 40, 3, 1, G]]),
    render: function (d, v, ctx) {
      var bg = v.bg || 'inner';
      return '<div class="u-c"><aside class="u-tip u-tip--' + bg + (v.side === 'right' ? ' u-tip--right' : '') + '"' + (d.label ? ' aria-label="' + esc(d.label) + '"' : '') + '><div class="u-tip__who">' + img(ctx, d.image, 'u-tip__img') + '</div><div class="u-tip__bubble">' +
        (d.label || ctx.edit ? '<p class="u-tip__label">' + icon('bulb') + '<span' + F(ctx, 'label', 'text') + '>' + esc(d.label || '') + '</span></p>' : '') + rich(ctx, d, 'body', 'u-tip__text') + btn(ctx, d.button, 'button') + '</div></aside></div>';
    }
  };

  /* ---------- Рейтинг в сторах ---------- */
  function stars(val, ctx) {
    var n = Math.max(0, Math.min(5, num(val, 0)));
    return '<span class="u-stars" style="--v:' + n + '" role="img" aria-label="' + String(n).replace('.', ctx.lang === 'en' ? '.' : ',') + ' ' + loc(ctx, 'of5') + '"></span>';
  }
  B.rating = {
    name: 'Рейтинг в сторах', cat: 'Карточки и данные',
    notice: 'Указывайте только настоящие оценки из App Store и Google Play и дату, на которую они взяты.',
    variants: [{ key: 'bg', label: 'Фон', options: [['white', 'Плашка'], ['purple', 'Фиолетовый']], def: 'white' }],
    fields: [{ key: 'title', label: 'Заголовок', t: 'text' }, { key: 'lead', label: 'Подзаголовок', t: 'text' }, { key: 'items', label: 'Сторы', t: 'items', item: [{ key: 'store', label: 'Магазин', t: 'text' }, { key: 'value', label: 'Оценка, например 4,8', t: 'text' }, { key: 'count', label: 'Сколько оценок', t: 'text' }, { key: 'href', label: 'Ссылка на приложение', t: 'link' }], add: { store: 'Магазин', value: '', count: '', href: '' } }, { key: 'note', label: 'Дата данных', t: 'text' }],
    example: function () { return { title: 'Нам доверяют', lead: 'Оценки приложения Uzum Bank', items: [{ store: 'App Store', value: '', count: '', href: 'https://apps.apple.com/app/id1492307726' }, { store: 'Google Play', value: '', count: '', href: '' }], note: '' }; },
    thumb: thumb([[4, 4, 112, 64, 8, Wt], [12, 10, 44, 6, 2, P], [12, 24, 46, 38, 6, G], [62, 24, 46, 38, 6, G], [18, 30, 20, 10, 2, P], [18, 44, 30, 4, 1, 'y'], [68, 30, 20, 10, 2, P], [68, 44, 30, 4, 1, 'y']]),
    render: function (d, v, ctx) {
      var purple = v.bg === 'purple', h = H(ctx, 2);
      var items = (d.items || []).map(function (it, i) {
        if (!ctx.edit && !it.value) return '';
        var inner = '<p class="u-rate__v"' + F(ctx, 'items.' + i + '.value', 'text') + '>' + esc(it.value || '') + '</p>' + stars(it.value, ctx) + '<p class="u-rate__s"' + F(ctx, 'items.' + i + '.store', 'text') + '>' + esc(it.store || '') + '</p>' + (it.count || ctx.edit ? '<p class="u-rate__c"' + F(ctx, 'items.' + i + '.count', 'text') + '>' + esc(it.count || '') + '</p>' : '');
        return it.href && !ctx.edit ? '<a class="u-rate" href="' + href(ctx, it.href) + '"' + ext(ctx, it.href) + '>' + inner + '</a>' : '<div class="u-rate">' + inner + '</div>';
      }).join('');
      if (!items && !ctx.edit) return '';
      return plate(v, '<div class="u-stack u-stack--l"><div class="u-stack u-stack--s">' + txt(ctx, d, 'title', h, 'u-h2' + (purple ? '' : ' u-grad')) + txt(ctx, d, 'lead', 'p', 'u-lead') + '</div><div class="u-rates">' + items + '</div>' + txt(ctx, d, 'note', 'p', 'u-small') + '</div>');
    }
  };

  /* ---------- Отзывы клиентов ---------- */
  function initials(name) { return (name || '').trim().split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0); }).join('').toUpperCase(); }
  B.reviews = {
    name: 'Отзывы клиентов', cat: 'Карточки и данные',
    notice: 'Только настоящие отзывы: дословно, с именем, как его подписал автор, и ссылкой на оригинал. Придуманные отзывы запрещены законом о рекламе.',
    variants: [{ key: 'layout', label: 'Раскладка', options: [['grid', 'Сетка'], ['scroll', 'Лента']], def: 'grid' }, { key: 'bg', label: 'Фон', options: [['none', 'Без плашки'], ['white', 'Плашка']], def: 'none' }],
    fields: [{ key: 'title', label: 'Заголовок', t: 'text' }, { key: 'items', label: 'Отзывы', t: 'items', item: [{ key: 'text', label: 'Текст отзыва', t: 'text' }, { key: 'name', label: 'Автор', t: 'text' }, { key: 'meta', label: 'Кто автор', t: 'text' }, { key: 'stars', label: 'Оценка, 0–5', t: 'num' }, { key: 'source', label: 'Где оставлен', t: 'text' }, { key: 'href', label: 'Ссылка на оригинал', t: 'link' }, { key: 'avatar', label: 'Фото', t: 'image' }], add: { text: 'Текст отзыва', name: '', meta: '', stars: 5, source: '', href: '' } }],
    example: function () { var it = function () { return { text: 'Сюда — настоящий отзыв клиента, дословно. Скопируйте его из App Store, Google Play или соцсетей и добавьте ссылку на оригинал.', name: 'Имя автора', meta: 'Клиент Uzum Bank', stars: 5, source: 'App Store', href: '' }; }; return { title: 'Что говорят клиенты', items: [it(), it(), it()] }; },
    thumb: thumb([[4, 14, 34, 46, 6, Wt], [43, 14, 34, 46, 6, Wt], [82, 14, 34, 46, 6, Wt], [9, 20, 20, 3, 1, 'y'], [9, 28, 24, 3, 1, G], [9, 34, 20, 3, 1, G], [9, 48, 8, 8, 4, D], [48, 20, 20, 3, 1, 'y'], [48, 48, 8, 8, 4, D], [87, 20, 20, 3, 1, 'y'], [87, 48, 8, 8, 4, D]]),
    render: function (d, v, ctx) {
      var h = H(ctx, 2), scroll = v.layout === 'scroll';
      var items = (d.items || []).map(function (it, i) {
        var p = 'items.' + i + '.', st = num(it.stars, 0);
        var ava = it.avatar && it.avatar.src ? img(ctx, { src: it.avatar.src, alt: '' }, 'u-review__ava') : '<span class="u-review__ava u-review__ava--i" aria-hidden="true">' + esc(initials(it.name)) + '</span>';
        var src = it.source || ctx.edit ? (it.href && !ctx.edit ? '<a class="u-review__src" href="' + href(ctx, it.href) + '"' + ext(ctx, it.href) + '>' + esc(it.source || loc(ctx, 'review')) + icon('external') + '</a>' : '<span class="u-review__src"' + F(ctx, p + 'source', 'text') + '>' + esc(it.source || '') + '</span>') : '';
        return '<figure class="u-review">' + (st > 0 ? stars(st, ctx) : '') + '<blockquote class="u-review__q"><p' + F(ctx, p + 'text', 'text') + '>' + esc(it.text || '') + '</p></blockquote><figcaption class="u-review__by">' + ava + '<span class="u-review__who"><span class="u-review__n"' + F(ctx, p + 'name', 'text') + '>' + esc(it.name || '') + '</span>' +
          (it.meta || ctx.edit ? '<span class="u-review__m"' + F(ctx, p + 'meta', 'text') + '>' + esc(it.meta || '') + '</span>' : '') + '</span>' + src + '</figcaption></figure>';
      }).join('');
      var list = scroll ? '<div class="u-reviews u-reviews--scroll" role="region" tabindex="0" aria-label="' + esc(d.title || loc(ctx, 'reviews')) + '">' + items + '</div>' : '<div class="u-reviews">' + items + '</div>';
      return plate(v, '<div class="u-stack u-stack--l">' + txt(ctx, d, 'title', h, 'u-h2 u-grad') + list + '</div>');
    }
  };

  /* ---------- Счётчик карт ---------- */
  B.counter = {
    name: 'Счётчик карт', cat: 'Карточки и данные',
    notice: 'Число должно совпадать с официальными данными банка. Укажите, на какую дату оно взято.',
    variants: [{ key: 'bg', label: 'Фон', options: [['purple', 'Фиолетовый'], ['white', 'Плашка']], def: 'purple' }, { key: 'visual', label: 'Карты', options: [['fan', 'Веером'], ['none', 'Без карт']], def: 'fan' }],
    fields: [{ key: 'eyebrow', label: 'Над числом', t: 'text' }, { key: 'value', label: 'Число', t: 'num' }, { key: 'suffix', label: 'После числа', t: 'text' }, { key: 'label', label: 'Под числом', t: 'text' }, { key: 'lead', label: 'Пояснение', t: 'text' }, { key: 'note', label: 'Дата данных', t: 'text' }, { key: 'button', label: 'Кнопка', t: 'button' }],
    example: function () { return { eyebrow: 'Уже выдали', value: 7000000, suffix: '+', label: 'карт Uzum', lead: 'Каждый день к ним добавляются тысячи новых — оформите свою за пару минут в приложении', note: 'Данные на ноябрь 2026', button: { label: 'Оформить карту', href: 'https://uzumbank.uz/ru/card/', style: 'primary' } }; },
    thumb: thumb([[4, 4, 112, 64, 8, P], [12, 14, 26, 4, 1, D], [12, 22, 56, 14, 3, Wt], [12, 40, 30, 4, 1, D], [12, 52, 26, 8, 4, Wt], [74, 18, 30, 20, 3, D], [80, 26, 30, 20, 3, 'l'], [86, 34, 26, 18, 3, Wt]]),
    render: function (d, v, ctx) {
      var purple = v.bg !== 'white', n = Math.max(0, Math.round(num(d.value, 0))), shown = String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
      var BURST = [[50, 50, -8, 1, 0], [85, 18, 16, .62, 0], [18, 22, -20, .55, 0], [88, 84, -12, .66, 0], [16, 80, 22, .5, 0], [50, 4, 10, .38, 1.5], [52, 98, -6, .4, 1.5], [102, 48, 28, .42, 1.5], [-2, 50, -26, .36, 2], [74, -4, -30, .3, 2.5]];
      var fan = v.visual !== 'none' ? '<div class="u-count__burst" aria-hidden="true">' + BURST.map(function (c, i) { return { c: c, i: i }; }).reverse().map(function (o) { var c = o.c; return '<img class="u-count__card' + (o.i ? '' : ' u-count__card--main') + '" style="--x:' + c[0] + ';--y:' + c[1] + ';--r:' + c[2] + 'deg;--s:' + c[3] + ';--b:' + c[4] + 'px;--i:' + o.i + '" src="' + esc(ctx.img('lib:card-uzum.webp')) + '" alt="" width="1798" height="1303"' + (ctx.eager || !o.i ? '' : ' loading="lazy"') + ' decoding="async">'; }).join('') + '</div>' : '';
      var big = '<p class="u-count__big"><span class="u-sr">' + esc((d.eyebrow ? d.eyebrow + ' ' : '') + shown + (d.suffix || '') + ' ' + (d.label || '')) + '</span><span aria-hidden="true"><span class="u-count__n"' + (ctx.edit ? '' : ' data-count="' + n + '"') + '>' + shown + '</span>' +
        (d.suffix || ctx.edit ? '<span class="u-count__suf"' + F(ctx, 'suffix', 'text') + '>' + esc(d.suffix || '') + '</span>' : '') + '</span></p>';
      return '<div class="u-c"><section class="u-plate ' + (purple ? 'u-plate--purple' : 'u-plate--white') + ' u-count' + (ctx.edit ? ' is-in' : '') + (v.visual === 'none' ? ' u-count--solo' : '') + '"><div class="u-count__grid"><div class="u-count__main">' +
        (d.eyebrow || ctx.edit ? '<p class="u-count__eye"><span class="u-count__dot" aria-hidden="true"></span><span' + F(ctx, 'eyebrow', 'text') + '>' + esc(d.eyebrow || '') + '</span></p>' : '') + big +
        txt(ctx, d, 'label', 'p', 'u-count__label') + txt(ctx, d, 'lead', 'p', 'u-count__lead') + btn(ctx, d.button, 'button') + txt(ctx, d, 'note', 'p', 'u-small') + '</div>' + fan + '</div></section></div>';
    }
  };

  /* ---------- Кэшбэк у партнёров ---------- */
  B.partners = {
    name: 'Кэшбэк у партнёров', cat: 'Карточки и данные',
    notice: 'Проценты, лимиты и сроки должны совпадать с договорами с партнёрами. Логотипы — только с разрешения партнёра.',
    variants: [{ key: 'cols', label: 'Колонки', options: [['2', '2'], ['3', '3'], ['4', '4']], def: '3' }, { key: 'filter', label: 'Фильтр по категориям', options: [['on', 'Показывать'], ['off', 'Нет']], def: 'on' }, { key: 'bg', label: 'Фон', options: [['none', 'Без плашки'], ['white', 'Плашка']], def: 'none' }],
    fields: [{ key: 'title', label: 'Заголовок', t: 'text' }, { key: 'lead', label: 'Подзаголовок', t: 'text' }, { key: 'all', label: 'Подпись фильтра «Все»', t: 'text', when: { filter: 'on' } },
      { key: 'items', label: 'Партнёры', t: 'items', item: [{ key: 'name', label: 'Партнёр', t: 'text' }, { key: 'value', label: 'Кэшбэк, например 7%', t: 'text' }, { key: 'cat', label: 'Категория', t: 'text' }, { key: 'note', label: 'Условие', t: 'text' }, { key: 'logo', label: 'Логотип', t: 'image' }, { key: 'href', label: 'Ссылка', t: 'link' }], add: { name: 'Партнёр', value: '5%', cat: 'Категория', note: '', href: '' } },
      { key: 'button', label: 'Кнопка под списком', t: 'button' }, { key: 'legal', label: 'Примечание', t: 'rich' }],
    example: function () {
      var ph = function (cat) { return { name: 'Название партнёра', value: '5%', cat: cat, note: 'Условие кэшбэка', href: '' }; };
      return { title: 'Кэшбэк у партнёров', lead: 'Платите картой Uzum — часть денег вернётся на карту', all: 'Все', items: [{ name: 'Korzinka', value: '7%', cat: 'Супермаркеты', note: 'до 100 000 сум в месяц', href: '' }, ph('Супермаркеты'), ph('Кафе и рестораны'), ph('Кафе и рестораны'), ph('Такси'), ph('Электроника')], button: { label: 'Все партнёры в приложении', href: '#', style: 'soft' }, legal: '<p>Кэшбэк начисляется в течение 3 рабочих дней после покупки. Полные условия — в приложении Uzum Bank.</p>' };
    },
    thumb: thumb([[4, 6, 50, 6, 2, P], [4, 16, 14, 6, 3, P], [20, 16, 18, 6, 3, G], [40, 16, 18, 6, 3, G], [4, 28, 36, 38, 6, Wt], [43, 28, 36, 38, 6, Wt], [82, 28, 34, 38, 6, Wt], [9, 33, 10, 10, 3, L], [48, 33, 10, 10, 3, L], [87, 33, 10, 10, 3, L], [24, 34, 12, 7, 2, P], [63, 34, 12, 7, 2, P], [102, 34, 10, 7, 2, P]]),
    render: function (d, v, ctx) {
      var h = H(ctx, 2), items = d.items || [], cats = [];
      items.forEach(function (it) { var c = (it.cat || '').trim(); if (c && cats.indexOf(c) < 0) cats.push(c); });
      var fid = 'pf-' + ctx.bid, filter = v.filter !== 'off' && cats.length > 1;
      var chips = filter ? '<div class="u-pchips" role="group" aria-label="' + esc(d.title || '') + '" data-pfilter="' + fid + '"><button type="button" class="u-pchip" aria-pressed="true" data-pcat=""' + (ctx.edit ? ' tabindex="-1"' : '') + '><span' + F(ctx, 'all', 'text') + '>' + esc(d.all || 'Все') + '</span></button>' + cats.map(function (c) { return '<button type="button" class="u-pchip" aria-pressed="false" data-pcat="' + esc(c) + '"' + (ctx.edit ? ' tabindex="-1"' : '') + '>' + esc(c) + '</button>'; }).join('') + '</div>' : '';
      var tiles = items.map(function (it, i) {
        var p = 'items.' + i + '.', logo = it.logo && it.logo.src ? img(ctx, { src: it.logo.src, alt: '' }, 'u-partner__logo') : '<span class="u-partner__logo u-partner__logo--i" aria-hidden="true">' + esc(initials(it.name)) + '</span>';
        var inner = '<span class="u-partner__top">' + logo + '<span class="u-partner__v"' + F(ctx, p + 'value', 'text') + '>' + esc(it.value || '') + '</span></span><span class="u-partner__n"' + F(ctx, p + 'name', 'text') + '>' + esc(it.name || '') + '</span>' +
          (it.cat || ctx.edit ? '<span class="u-partner__c"' + F(ctx, p + 'cat', 'text') + '>' + esc(it.cat || '') + '</span>' : '') + (it.note || ctx.edit ? '<span class="u-partner__note"' + F(ctx, p + 'note', 'text') + '>' + esc(it.note || '') + '</span>' : '');
        var tag = it.href && !ctx.edit ? 'a' : 'div';
        return '<li class="u-partner-li" data-pcat="' + esc((it.cat || '').trim()) + '"><' + tag + ' class="u-partner"' + (tag === 'a' ? ' href="' + href(ctx, it.href) + '"' + ext(ctx, it.href) : '') + '>' + inner + '</' + tag + '></li>';
      }).join('');
      return plate(v, '<div class="u-stack u-stack--l"><div class="u-stack u-stack--s">' + txt(ctx, d, 'title', h, 'u-h2 u-grad') + txt(ctx, d, 'lead', 'p', 'u-lead') + '</div>' + chips +
        '<ul class="u-partners u-partners--' + (v.cols || 3) + '" id="' + fid + '" aria-live="polite">' + tiles + '</ul>' + btn(ctx, d.button, 'button') + rich(ctx, d, 'legal', 'u-calc__legal') + '</div>');
    }
  };

  B.maint = {
    name: 'Технические работы', cat: 'Структура',
    variants: [{ key: 'layout', label: 'Вид', options: [['banner', 'Плашка'], ['page', 'Экран']], def: 'banner' }],
    fields: [{ key: 'title', label: 'Заголовок', t: 'text' }, { key: 'body', label: 'Текст', t: 'rich' }, { key: 'period', label: 'Когда', t: 'text' }],
    example: function () { return { title: 'Технические работы', body: '<p>Приложение и сайт могут работать с перебоями. Оплата картой Uzum в магазинах проходит как обычно.</p>', period: '25 ноября, с 02:00 до 05:00 по Ташкенту' }; },
    thumb: thumb([[4, 4, 112, 64, 8, 'y'], [12, 14, 22, 20, 3, 'k'], [42, 16, 50, 6, 2, 'k'], [42, 26, 40, 3, 1, 'k'], [4, 52, 112, 16, 0, 'k'], [12, 58, 50, 4, 1, Wt]]),
    render: function (d, v, ctx) {
      var page = v.layout === 'page', h = H(ctx, page ? 1 : 2);
      var sign = '<img class="u-maint__sign" src="' + esc(ctx.img('lib:maint-sign.webp')) + '" alt="" width="708" height="651"' + (ctx.lcp ? (ctx.lcp = false, ' fetchpriority="high"') : '') + ' decoding="async">';
      var period = d.period || ctx.edit ? '<p class="u-maint__period">' + icon('clock') + '<span' + F(ctx, 'period', 'text') + '>' + esc(d.period || '') + '</span></p>' : '';
      return '<div class="u-c"><section class="u-maint' + (page ? ' u-maint--page' : '') + '"' + (d.title ? ' aria-label="' + esc(d.title) + '"' : '') + '><div class="u-maint__top">' + sign + '<div class="u-maint__txt">' +
        txt(ctx, d, 'title', h, 'u-h2 u-maint__t') + rich(ctx, d, 'body', 'u-maint__body') + '</div></div>' + period + '</section></div>';
    }
  };

  B.note = {
    name: 'Заметка', cat: 'Текст',
    variants: [{ key: 'tone', label: 'Вид', options: [['info', 'Инфо'], ['warning', 'Важно'], ['legal', 'Юридический текст']], def: 'info' }, { key: 'cols', label: 'Колонки', options: [['1', '1'], ['2', '2'], ['3', '3']], def: '1', when: { tone: 'legal' } }],
    fields: [{ key: 'body', label: 'Текст', t: 'rich' }, { key: 'body2', label: 'Колонка 2', t: 'rich', when: { tone: 'legal', cols: ['2', '3'] } }, { key: 'body3', label: 'Колонка 3', t: 'rich', when: { tone: 'legal', cols: '3' } }],
    example: function () { return { body: '<p>Карта доступна для резидентов Узбекистана.</p>', body2: '', body3: '' }; },
    thumb: thumb([[6, 22, 108, 28, 8, L], [14, 30, 10, 10, 3, P], [30, 31, 70, 3], [30, 37, 56, 3]]),
    render: function (d, v, ctx) {
      if (v.tone === 'legal') {
        var n = +(v.cols || 1);
        var cols = rich(ctx, d, 'body') + (n > 1 ? rich(ctx, d, 'body2') : '') + (n > 2 ? rich(ctx, d, 'body3') : '');
        return '<div class="u-c"><div class="u-legal' + (n > 1 ? ' u-legal--' + n : '') + '">' + cols + '</div></div>';
      }
      var warn = v.tone === 'warning';
      return '<div class="u-c"><div class="u-callout' + (warn ? ' u-callout--warning' : '') + '" role="note"><span class="u-icbox">' + icon(warn ? 'warning' : 'info') + '</span>' + rich(ctx, d, 'body') + '</div></div>';
    }
  };

  B.list = {
    name: 'Список', cat: 'Списки',
    variants: [{ key: 'kind', label: 'Тип', options: [['ul', 'Маркированный'], ['ol', 'Нумерованный']], def: 'ul' }, { key: 'bg', label: 'Фон', options: [['white', 'Плашка'], ['none', 'Без плашки']], def: 'white' }],
    fields: [{ key: 'title', label: 'Заголовок', t: 'text' }, { key: 'body', label: 'Пункты', t: 'list' }, { key: 'start', label: 'Начать нумерацию с', t: 'number', when: { kind: 'ol' } }],
    example: function () { return { title: 'Что можно делать с картой', body: '<ul><li>Платить в магазинах и онлайн</li><li>Переводить деньги без комиссии<ul><li>между картами Uzum</li><li>на Uzcard и Humo до 2 млн сум</li></ul></li><li>Снимать наличные в банкоматах Uzum Bank</li></ul>', start: 1 }; },
    thumb: thumb([[4, 4, 112, 64, 8, Wt], [12, 12, 50, 7, 2, P], [14, 27, 4, 4, 2, P], [22, 27, 70, 4], [14, 37, 4, 4, 2, P], [22, 37, 60, 4], [26, 46, 4, 4, 2, D], [34, 46, 50, 4], [14, 56, 4, 4, 2, P], [22, 56, 66, 4]]),
    render: function (d, v, ctx) {
      var h = H(ctx, 2);
      var body = listAs(d.body || '<ul><li></li></ul>', v.kind === 'ol' ? 'ol' : 'ul', v.kind === 'ol' ? (+d.start || 1) : 0);
      return plate(v, '<div class="u-stack u-measure">' + (d.title || ctx.edit ? '<' + h + ' class="u-h2 u-grad"' + F(ctx, 'title', 'text') + '>' + esc(d.title || '') + '</' + h + '>' : '') +
        '<div class="u-rich u-list-host"' + F(ctx, 'body', 'list') + '>' + body.replace(/^<(ul|ol)/, '<$1 class="u-list"') + '</div></div>');
    }
  };
  function listAs(html, tag, start) {
    var m = /^\s*<(ul|ol)([^>]*)>/i.exec(html);
    if (!m) return '<' + tag + (start && start !== 1 ? ' start="' + start + '"' : '') + '><li>' + html + '</li></' + tag + '>';
    var rest = html.slice(m[0].length).replace(new RegExp('</' + m[1] + '>\\s*$', 'i'), '');
    return '<' + tag + (tag === 'ol' && start && start !== 1 ? ' start="' + start + '"' : '') + '>' + rest + '</' + tag + '>';
  }

  B.iconlist = {
    name: 'Список с иконками', cat: 'Списки',
    variants: [{ key: 'style', label: 'Вид', options: [['inline', 'Строки'], ['cards', 'Карточки']], def: 'inline' }, { key: 'cols', label: 'Колонки', options: [['1', '1'], ['2', '2'], ['3', '3']], def: '1' }, { key: 'bg', label: 'Фон', options: [['white', 'Плашка'], ['none', 'Без плашки']], def: 'white' }],
    fields: [{ key: 'title', label: 'Заголовок', t: 'text' }, { key: 'items', label: 'Пункты', t: 'items', item: [{ key: 'icon', label: 'Иконка', t: 'icon' }, { key: 'title', label: 'Заголовок', t: 'text' }, { key: 'text', label: 'Описание', t: 'text' }], add: { icon: 'check', title: 'Новый пункт', text: '' } }],
    example: function () { return { title: 'Почему карта Uzum', items: [{ icon: 'exchange', title: 'Переводы без комиссии', text: 'Между картами Uzum — бесплатно навсегда' }, { icon: 'coins', title: 'Бесплатное снятие наличных', text: 'В банкоматах Uzum Bank до 10 000 000 сум в месяц' }, { icon: 'percent', title: 'Скидки и кешбэк', text: 'До 30% в Uzum Market и Uzum Tezkor' }] }; },
    thumb: thumb([[4, 4, 112, 64, 8, Wt], [12, 12, 50, 7, 2, P], [12, 26, 10, 10, 3, P], [28, 27, 50, 4, 1, 't'], [28, 33, 40, 3], [12, 44, 10, 10, 3, P], [28, 45, 54, 4, 1, 't'], [28, 51, 36, 3]]),
    render: function (d, v, ctx) {
      var h = H(ctx, 2), hi = H(ctx, 3);
      var cards = v.style === 'cards';
      var items = (d.items || []).map(function (it, i) {
        return '<li class="u-iclist__i"><span class="u-icbox' + (cards ? '' : ' u-icbox--soft') + '">' + icon(it.icon) + '</span><div>' +
          '<' + hi + ' class="u-iclist__t"' + F(ctx, 'items.' + i + '.title', 'text') + '>' + esc(it.title || '') + '</' + hi + '>' + txt(ctx, it, 'text', 'p', 'u-text', '').replace('data-f="text"', 'data-f="items.' + i + '.text"') + '</div></li>';
      }).join('');
      return plate(v, '<div class="u-stack">' + (d.title || ctx.edit ? '<' + h + ' class="u-h2 u-grad"' + F(ctx, 'title', 'text') + '>' + esc(d.title || '') + '</' + h + '>' : '') +
        '<ul class="u-iclist u-iclist--' + (v.cols || 1) + (cards ? ' u-iclist--cards' : '') + '">' + items + '</ul></div>');
    }
  };

  B.steps = {
    name: 'Пошаговая инструкция', cat: 'Списки',
    variants: [{ key: 'layout', label: 'Вид', options: [['column', 'Столбиком'], ['cards', 'Карточками']], def: 'column' }, { key: 'bg', label: 'Фон', options: [['white', 'Плашка'], ['none', 'Без плашки']], def: 'white' }],
    fields: [{ key: 'title', label: 'Заголовок', t: 'text' }, { key: 'items', label: 'Шаги', t: 'items', item: [{ key: 'title', label: 'Заголовок шага', t: 'text' }, { key: 'text', label: 'Описание (необязательно)', t: 'text' }], add: { title: 'Новый шаг', text: '' } }, { key: 'note', label: 'Сноска', t: 'text' }],
    example: function () { return { title: 'Как оформить карту', items: [{ title: 'Установите приложение Uzum Bank', text: 'На iOS или Android' }, { title: 'Пройдите регистрацию', text: 'Понадобится паспорт или ID-карта' }, { title: 'Нажмите «Оформить карту»', text: 'Выпуск займёт пару минут' }], note: '' }; },
    thumb: thumb([[4, 4, 112, 64, 8, Wt], [12, 12, 50, 7, 2, P], [13, 26, 8, 8, 2, P], [26, 28, 60, 4, 1, 't'], [13, 40, 8, 8, 2, P], [26, 42, 54, 4, 1, 't'], [13, 54, 8, 8, 2, P], [26, 56, 64, 4, 1, 't']]),
    render: function (d, v, ctx) {
      var h = H(ctx, 2), hi = H(ctx, 3);
      var cards = v.layout === 'cards';
      var n = (d.items || []).length;
      var items = (d.items || []).map(function (it, i) {
        return '<li class="u-steps__i"><span class="u-num" aria-hidden="true">' + (i + 1) + '</span><div><' + hi + ' class="u-steps__t"' + F(ctx, 'items.' + i + '.title', 'text') + '>' + esc(it.title || '') + '</' + hi + '>' +
          (it.text || ctx.edit ? '<p class="u-text"' + F(ctx, 'items.' + i + '.text', 'text') + '>' + esc(it.text || '') + '</p>' : '') + '</div></li>';
      }).join('');
      return plate(v, '<div class="u-stack">' + (d.title || ctx.edit ? '<' + h + ' class="u-h2 u-grad"' + F(ctx, 'title', 'text') + '>' + esc(d.title || '') + '</' + h + '>' : '') +
        '<ol class="u-steps' + (cards ? ' u-steps--cards' : '') + '" style="--u-steps-cols:' + Math.min(4, Math.max(1, n)) + '">' + items + '</ol>' + note(ctx, d, 'note') + '</div>');
    }
  };

  B.cards = {
    name: 'Сетка карточек', cat: 'Карточки и данные',
    variants: [{ key: 'cols', label: 'Колонки', options: [['2', '2'], ['3', '3'], ['4', '4']], def: '3' }, { key: 'style', label: 'Вид', options: [['photo', 'С картинкой'], ['feature', 'Крупные'], ['simple', 'Без картинок']], def: 'photo' }, { key: 'media', label: 'Картинка', options: [['contain', 'Целиком'], ['bottom', 'К низу'], ['cover', 'Заполнить']], def: 'contain', when: { style: ['photo', 'feature'] } }],
    fields: [{ key: 'title', label: 'Заголовок секции', t: 'text' }, { key: 'items', label: 'Карточки', t: 'items', item: [{ key: 'image', label: 'Изображение', t: 'image' }, { key: 'title', label: 'Заголовок', t: 'text' }, { key: 'text', label: 'Текст', t: 'text' }, { key: 'note', label: 'Сноска', t: 'text' }, { key: 'link', label: 'Ссылка', t: 'button' }], add: { image: { src: '', alt: '' }, title: 'Заголовок', text: 'Короткое описание', note: '', link: { label: '', href: '' } } }],
    example: function () { return { title: '', items: [{ image: { src: 'lib:man-card.webp', alt: 'Мужчина с картой Uzum' }, title: 'Переводы без комиссии', text: 'Между картами Uzum — бесплатно навсегда' }, { image: { src: 'lib:cards-flower.webp', alt: 'Разноцветные карты Uzum' }, title: 'Бесплатное снятие наличных', text: 'В банкоматах Uzum Bank до 10 000 000 сум в месяц' }, { image: { src: 'lib:market-tezkor.webp', alt: 'Карта Uzum со значками Uzum Market и Uzum Tezkor' }, title: 'Скидки и кешбэк', text: 'До 30% в Uzum Market и Uzum Tezkor, кешбэк у партнёров до 10%' }] }; },
    thumb: thumb([[4, 14, 34, 52, 6, Wt], [43, 14, 34, 52, 6, Wt], [82, 14, 34, 52, 6, Wt], [8, 18, 26, 20, 4, L], [47, 18, 26, 20, 4, L], [86, 18, 26, 20, 4, L], [8, 44, 22, 5, 1, P], [47, 44, 22, 5, 1, P], [86, 44, 22, 5, 1, P]]),
    render: function (d, v, ctx) {
      var h = H(ctx, 2), hi = H(ctx, 3);
      var feature = v.style === 'feature', simple = v.style === 'simple';
      var items = (d.items || []).map(function (it, i) {
        var p = 'items.' + i;
        var media = simple ? '' : '<div class="u-card__media' + (v.media === 'bottom' ? ' u-card__media--bottom' : v.media === 'cover' ? ' u-card__media--cover' : '') + '">' + img(ctx, it.image) + '</div>';
        return '<article class="u-card' + (feature ? ' u-card--feature' : '') + (simple ? ' u-card--inner' : '') + '">' + media + '<div class="u-card__body">' +
          '<' + hi + ' class="' + (feature || !simple ? 'u-h3 u-grad' : 'u-sub') + '"' + F(ctx, p + '.title', 'text') + '>' + esc(it.title || '') + '</' + hi + '>' +
          (it.text || ctx.edit ? '<p class="u-lead" style="font-size:18px"' + F(ctx, p + '.text', 'text') + '>' + esc(it.text || '') + '</p>' : '') +
          (it.note ? '<p class="u-note">' + icon('info') + '<span' + F(ctx, p + '.note', 'text') + '>' + esc(it.note) + '</span></p>' : '') +
          (it.link && it.link.label ? '<a class="u-link" href="' + href(ctx, it.link.href) + '"><span' + F(ctx, p + '.link.label', 'text') + '>' + esc(it.link.label) + '</span>' + ARROW() + '</a>' : '') +
          '</div></article>';
      }).join('');
      var head = d.title || ctx.edit ? '<div class="u-heading"><' + h + ' class="u-h2 u-grad"' + F(ctx, 'title', 'text') + '>' + esc(d.title || '') + '</' + h + '></div>' : '';
      return '<div class="u-c"><div class="u-stack">' + head + '<div class="u-grid u-grid--' + (v.cols || 3) + '">' + items + '</div></div></div>';
    }
  };

  B.benefits = {
    name: 'Преимущества', cat: 'Карточки и данные',
    variants: [{ key: 'cols', label: 'Колонки', options: [['2', '2'], ['3', '3'], ['4', '4']], def: '3' }, { key: 'bg', label: 'Фон', options: [['white', 'Плашка'], ['purple', 'Фиолетовый']], def: 'white' }],
    fields: [{ key: 'title', label: 'Заголовок', t: 'text' }, { key: 'items', label: 'Преимущества', t: 'items', item: [{ key: 'icon', label: 'Иконка', t: 'icon' }, { key: 'title', label: 'Заголовок', t: 'text' }, { key: 'text', label: 'Текст', t: 'text' }], add: { icon: 'star', title: 'Преимущество', text: 'Короткое описание' } }],
    example: function () { return { title: 'Ваш iPhone — ваша карта Uzum', items: [{ icon: 'smartphone', title: 'Карта всегда с собой', text: 'Телефон и так всегда при вас. Пластиковую карту можно оставить дома: вы заплатите с iPhone.' }, { icon: 'bolt', title: 'Оплата за пару секунд', text: 'Дважды нажмите боковую кнопку, подтвердите Face ID и поднесите iPhone к терминалу.' }, { icon: 'monitor', title: 'Apple Pay на всех устройствах', text: 'Пользуйтесь картой Uzum на iPhone, Apple Watch, iPad и Mac.' }] }; },
    thumb: thumb([[4, 4, 112, 64, 8, Wt], [10, 10, 60, 7, 2, P], [10, 24, 32, 38, 5, L], [44, 24, 32, 38, 5, L], [78, 24, 32, 38, 5, L], [14, 28, 8, 8, 2, P], [48, 28, 8, 8, 2, P], [82, 28, 8, 8, 2, P], [14, 42, 22, 4, 1, 't'], [48, 42, 22, 4, 1, 't'], [82, 42, 22, 4, 1, 't']]),
    render: function (d, v, ctx) {
      var h = H(ctx, 2), hi = H(ctx, 3);
      var items = (d.items || []).map(function (it, i) {
        return '<li class="u-iclist__i"><span class="u-icbox">' + icon(it.icon) + '</span><div><' + hi + ' class="u-iclist__t"' + F(ctx, 'items.' + i + '.title', 'text') + '>' + esc(it.title || '') + '</' + hi + '>' +
          (it.text || ctx.edit ? '<p class="u-text"' + F(ctx, 'items.' + i + '.text', 'text') + '>' + esc(it.text || '') + '</p>' : '') + '</div></li>';
      }).join('');
      var cols = v.cols === '4' ? 'u-grid u-grid--4' : 'u-iclist--' + (v.cols || 3);
      return plate(v, '<div class="u-stack u-stack--l">' + (d.title || ctx.edit ? '<' + h + ' class="u-h2 u-grad"' + F(ctx, 'title', 'text') + '>' + esc(d.title || '') + '</' + h + '>' : '') +
        '<ul class="u-iclist u-iclist--cards ' + cols + '">' + items + '</ul></div>');
    }
  };

  B.table = {
    name: 'Таблица', cat: 'Карточки и данные',
    variants: [{ key: 'style', label: 'Вид', options: [['tariff', 'Тарифы'], ['grid', 'Обычная']], def: 'tariff' }, { key: 'head', label: 'Шапка таблицы', options: [['off', 'Нет'], ['on', 'Есть']], def: 'off' }, { key: 'bg', label: 'Фон', options: [['white', 'Плашка'], ['none', 'Без плашки']], def: 'white' }],
    fields: [{ key: 'title', label: 'Заголовок', t: 'text' }, { key: 'table', label: 'Таблица', t: 'table' }, { key: 'note', label: 'Сноска', t: 'text' }, { key: 'link', label: 'Ссылка под таблицей', t: 'button' }],
    example: function () { return { title: 'Тарифы', table: { head: ['Услуга', 'Стоимость', 'Условия'], rows: [['Выпуск и обслуживание', 'Бесплатно', ''], ['Переводы на карты Uzum', '0%', 'В приложении Uzum Bank'], ['Снятие наличных', '0%', 'В банкоматах Uzum Bank до 10 000 000 сум в месяц']] }, note: 'Тарифы могут быть изменены банком согласно условиям ДКБО', link: { label: 'Подробные условия', href: '#' } }; },
    thumb: thumb([[4, 4, 112, 64, 8, Wt], [12, 12, 40, 7, 2, P], [12, 26, 96, 1, 0, D], [12, 30, 30, 4, 1, 't'], [56, 30, 20, 4, 1, 't'], [12, 39, 96, 1, 0, D], [12, 43, 34, 4, 1, 't'], [56, 43, 14, 4, 1, 't'], [12, 52, 96, 1, 0, D], [12, 56, 26, 4, 1, 't'], [56, 56, 18, 4, 1, 't']]),
    render: function (d, v, ctx) {
      var h = H(ctx, 2);
      var inner = tableHTML(d, v, ctx, '');
      return plate(v, '<div class="u-stack">' + (d.title || ctx.edit ? '<' + h + ' class="u-h2 u-grad"' + F(ctx, 'title', 'text') + '>' + esc(d.title || '') + '</' + h + '>' : '') + inner + '</div>');
    }
  };
  function tableHTML(d, v, ctx, prefix) {
    var t = d.table || { head: [], rows: [] }, tariff = v.style !== 'grid', head = v.head === 'on';
    var hd = t.head || [];
    var rows = (t.rows || []).map(function (r, ri) {
      return '<tr>' + r.map(function (c, ci) {
        var path = prefix + 'table.rows.' + ri + '.' + ci;
        var html = c || '';
        if (tariff && ci > 0 && html) {
          var parts = html.split(/<br\s*\/?>/i);
          if (parts.length > 1 || /^[\d\s%,.сумБбесплатно—–-]+$/i.test(parts[0].replace(/<[^>]+>/g, ''))) html = '<span class="u-tv">' + parts[0] + '</span>' + parts.slice(1).join('<br>');
        }
        var lab = head && hd[ci] ? ' data-label="' + esc(String(hd[ci]).replace(/<[^>]+>/g, '')) + '"' : '';
        return ci === 0 ? '<th scope="row"' + F(ctx, path, 'cell') + '>' + (c || '') + '</th>' : '<td' + lab + F(ctx, path, 'cell') + '>' + html + '</td>';
      }).join('') + '</tr>';
    }).join('');
    var thead = head ? '<thead><tr>' + hd.map(function (c, ci) { return '<th scope="col"' + F(ctx, prefix + 'table.head.' + ci, 'cell') + '>' + (c || '') + '</th>'; }).join('') + '</tr></thead>' : '';
    var foot = (d.note || (d.link && d.link.label)) ? '<div class="u-table-foot">' + (d.note ? '<p class="u-note">' + icon('info') + '<span' + F(ctx, prefix + 'note', 'text') + '>' + esc(d.note) + '</span></p>' : '') + (d.link && d.link.label ? '<a class="u-link" href="' + href(ctx, d.link.href) + '"><span' + F(ctx, prefix + 'link.label', 'text') + '>' + esc(d.link.label) + '</span>' + ARROW() + '</a>' : '') + '</div>' : '';
    return '<div class="u-table-wrap" role="region" tabindex="0" aria-label="' + esc(d.title || a11y(ctx, 'table')) + '"><table class="u-table' + (tariff ? ' u-table--tariff' : '') + ' u-table--stack">' + thead + '<tbody>' + rows + '</tbody></table></div>' + foot;
  }

  B.stats = {
    name: 'Цифры и показатели', cat: 'Карточки и данные',
    variants: [{ key: 'cols', label: 'Колонки', options: [['2', '2'], ['3', '3'], ['4', '4']], def: '3' }, { key: 'bg', label: 'Фон', options: [['white', 'Плашка'], ['purple', 'Фиолетовый']], def: 'purple' }],
    fields: [{ key: 'title', label: 'Заголовок', t: 'text' }, { key: 'items', label: 'Показатели', t: 'items', item: [{ key: 'value', label: 'Число', t: 'text' }, { key: 'label', label: 'Подпись', t: 'text' }], add: { value: '100%', label: 'Подпись' } }],
    example: function () { return { title: 'Uzum Bank в цифрах', items: [{ value: '7 млн+', label: 'выпущенных карт Uzum' }, { value: '0%', label: 'комиссия за переводы между картами Uzum' }, { value: '2 мин', label: 'на оформление карты в приложении' }] }; },
    thumb: thumb([[4, 4, 112, 64, 8, P], [12, 12, 50, 6, 2, Wt], [12, 26, 30, 34, 5, D], [45, 26, 30, 34, 5, D], [78, 26, 30, 34, 5, D], [16, 32, 18, 9, 2, Wt], [49, 32, 18, 9, 2, Wt], [82, 32, 18, 9, 2, Wt]]),
    render: function (d, v, ctx) {
      var h = H(ctx, 2);
      var items = (d.items || []).map(function (it, i) { return '<div class="u-stat"><p class="u-stat__v"' + F(ctx, 'items.' + i + '.value', 'text') + '>' + esc(it.value || '') + '</p><p class="u-stat__l"' + F(ctx, 'items.' + i + '.label', 'text') + '>' + esc(it.label || '') + '</p></div>'; }).join('');
      return plate(v, '<div class="u-stack u-stack--l">' + (d.title || ctx.edit ? '<' + h + ' class="u-h2' + (v.bg === 'purple' ? '' : ' u-grad') + '"' + F(ctx, 'title', 'text') + '>' + esc(d.title || '') + '</' + h + '>' : '') + '<div class="u-grid u-grid--' + (v.cols || 3) + '">' + items + '</div></div>');
    }
  };

  B.image = {
    name: 'Изображение с подписью', cat: 'Медиа',
    variants: [{ key: 'width', label: 'Ширина', options: [['wide', 'Во всю ширину'], ['narrow', 'Узкая']], def: 'wide' }, { key: 'bg', label: 'Фон', options: [['none', 'Без плашки'], ['white', 'Плашка']], def: 'none' }],
    fields: [{ key: 'image', label: 'Изображение', t: 'image' }, { key: 'caption', label: 'Подпись', t: 'text' }],
    example: function () { return { image: { src: 'lib:couple-bags.webp', alt: 'Мужчина и женщина с фиолетовыми пакетами' }, caption: 'Карта Uzum — для покупок, переводов и снятия наличных' }; },
    thumb: thumb([[10, 6, 100, 50, 6, L], [40, 18, 40, 26, 4, D], [10, 60, 60, 4]]),
    render: function (d, v, ctx) {
      return plate(v, '<figure class="u-figure' + (v.width === 'narrow' ? ' u-figure--narrow' : '') + '">' + img(ctx, d.image) + (d.caption || ctx.edit ? '<figcaption' + F(ctx, 'caption', 'text') + '>' + esc(d.caption || '') + '</figcaption>' : '') + '</figure>');
    }
  };

  B.textimage = {
    name: 'Текст с изображением', cat: 'Медиа',
    variants: [{ key: 'side', label: 'Изображение', options: [['right', 'Справа'], ['left', 'Слева']], def: 'right' }, { key: 'bg', label: 'Фон', options: [['white', 'Белый'], ['purple', 'Фиолетовый']], def: 'white' }, { key: 'fit', label: 'Посадка', options: [['bleed', 'К нижнему краю'], ['center', 'По центру'], ['boxed', 'В рамке']], def: 'bleed' }, { key: 'ratio', label: 'Пропорции', options: [['7-5', '7 : 5'], ['half', '1 : 1']], def: '7-5' }],
    fields: [{ key: 'title', label: 'Заголовок', t: 'text' }, { key: 'body', label: 'Текст', t: 'rich' }, { key: 'buttons', label: 'Кнопки', t: 'buttons', max: 2 }, { key: 'note', label: 'Сноска', t: 'text' }, { key: 'image', label: 'Изображение', t: 'image' }, { key: 'anchor', label: 'Якорь секции (id)', t: 'text', hint: 'Для ссылок вида #id' }],
    example: function () { return { title: 'Добавьте карту Uzum в Apple Pay', body: '<p>Платите телефоном как картой — в магазинах, приложениях и в интернете</p>', buttons: [{ label: 'Подробнее об Apple Pay', href: 'https://uzumbank.uz/ru/apple-pay/', style: 'primary' }], note: '', image: { src: 'lib:applepay-hand.webp', alt: 'Карта Uzum в Apple Pay на iPhone' } }; },
    thumb: thumb([[4, 4, 112, 64, 8, Wt], [12, 16, 52, 7, 2, P], [12, 26, 44, 7, 2, P], [12, 39, 46, 3], [12, 45, 40, 3], [12, 54, 26, 8, 4, P], [76, 12, 32, 56, 4, L]]),
    render: function (d, v, ctx) {
      var h = H(ctx, 2);
      var lead = d.body || ctx.edit ? '<div class="u-rich u-lead"' + F(ctx, 'body', 'rich') + '>' + (d.body || '<p></p>') + '</div>' : '';
      var cls = 'u-ti u-ti--' + (v.fit || 'bleed') + (v.side === 'left' ? ' u-ti--left' : '') + (v.ratio === 'half' ? ' u-ti--half' : '');
      var inner = '<div class="' + cls + '"><div class="u-ti__text"><' + h + ' class="u-h2' + (v.bg === 'purple' ? '' : ' u-grad') + '"' + F(ctx, 'title', 'text') + '>' + esc(d.title || '') + '</' + h + '>' + lead +
        ((d.buttons && d.buttons.length) || d.note ? '<div class="u-ti__row">' + btns(ctx, d.buttons, 'buttons') + note(ctx, d, 'note') + '</div>' : (ctx.edit ? note(ctx, d, 'note') : '')) + '</div>' +
        '<div class="u-ti__media">' + img(ctx, d.image) + '</div></div>';
      return plate(v, inner, '', d.anchor ? ' id="' + esc(d.anchor) + '"' : '');
    }
  };

  B.gallery = {
    name: 'Галерея', cat: 'Медиа',
    variants: [{ key: 'cols', label: 'Колонки', options: [['2', '2'], ['3', '3'], ['4', '4']], def: '3' }, { key: 'fit', label: 'Кадрирование', options: [['cover', 'Заполнить'], ['contain', 'Целиком']], def: 'contain' }, { key: 'bg', label: 'Фон', options: [['white', 'Плашка'], ['none', 'Без плашки']], def: 'white' }],
    fields: [{ key: 'title', label: 'Заголовок', t: 'text' }, { key: 'items', label: 'Изображения', t: 'items', item: [{ key: 'image', label: 'Изображение', t: 'image' }, { key: 'caption', label: 'Подпись', t: 'text' }], add: { image: { src: '', alt: '' }, caption: '' } }],
    example: function () { return { title: 'Платите с любых устройств Apple', items: [{ image: { src: 'lib:ap-watch.webp', alt: 'Apple Watch' }, caption: 'Apple Watch' }, { image: { src: 'lib:ap-ipad.webp', alt: 'iPad' }, caption: 'iPad' }, { image: { src: 'lib:ap-mac.webp', alt: 'Mac' }, caption: 'Mac' }] }; },
    thumb: thumb([[4, 4, 112, 64, 8, Wt], [10, 10, 50, 6, 2, P], [10, 22, 31, 30, 4, L], [45, 22, 31, 30, 4, L], [80, 22, 31, 30, 4, L], [10, 56, 20, 3], [45, 56, 20, 3], [80, 56, 20, 3]]),
    render: function (d, v, ctx) {
      var h = H(ctx, 2);
      var items = (d.items || []).map(function (it, i) { return '<figure class="u-figure">' + img(ctx, it.image) + (it.caption || ctx.edit ? '<figcaption' + F(ctx, 'items.' + i + '.caption', 'text') + '>' + esc(it.caption || '') + '</figcaption>' : '') + '</figure>'; }).join('');
      return plate(v, '<div class="u-stack">' + (d.title || ctx.edit ? '<' + h + ' class="u-h2 u-grad"' + F(ctx, 'title', 'text') + '>' + esc(d.title || '') + '</' + h + '>' : '') + '<div class="u-grid u-grid--' + (v.cols || 3) + ' u-gallery' + (v.fit === 'contain' ? ' u-gallery--contain' : '') + '">' + items + '</div></div>');
    }
  };

  B.video = {
    name: 'Видео', cat: 'Медиа',
    variants: [{ key: 'bg', label: 'Фон', options: [['white', 'Плашка'], ['none', 'Без плашки']], def: 'white' }],
    fields: [{ key: 'title', label: 'Заголовок', t: 'text' }, { key: 'url', label: 'Ссылка на видео', t: 'url', hint: 'YouTube, Vimeo или прямая ссылка на .mp4' }, { key: 'caption', label: 'Подпись', t: 'text' }],
    example: function () { return { title: 'Как оформить карту за 2 минуты', url: '', caption: 'Видеоинструкция' }; },
    thumb: thumb([[4, 4, 112, 64, 8, Wt], [12, 10, 96, 50, 4, 't'], [54, 28, 12, 14, 2, Wt]]),
    render: function (d, v, ctx) {
      var h = H(ctx, 2), u = (d.url || '').trim(), m, frame;
      var title = esc(d.title || d.caption || 'Видео');
      if ((m = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/.exec(u))) frame = '<iframe src="https://www.youtube-nocookie.com/embed/' + m[1] + '" title="' + title + '" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
      else if ((m = /vimeo\.com\/(\d+)/.exec(u))) frame = '<iframe src="https://player.vimeo.com/video/' + m[1] + '" title="' + title + '" loading="lazy" allow="fullscreen; picture-in-picture" allowfullscreen></iframe>';
      else if (/\.(mp4|webm)(\?|$)/i.test(u)) frame = '<video controls preload="metadata" src="' + esc(u) + '"></video>';
      else frame = '<div class="u-video__empty">' + (ctx.edit ? 'Вставьте ссылку на YouTube, Vimeo или .mp4 в настройках справа' : '') + '</div>';
      if (ctx.edit && /iframe/.test(frame)) frame = frame.replace('<iframe', '<iframe style="pointer-events:none"');
      return plate(v, '<div class="u-stack">' + (d.title || ctx.edit ? '<' + h + ' class="u-h2 u-grad"' + F(ctx, 'title', 'text') + '>' + esc(d.title || '') + '</' + h + '>' : '') + '<figure class="u-figure"><div class="u-video">' + frame + '</div>' + (d.caption || ctx.edit ? '<figcaption' + F(ctx, 'caption', 'text') + '>' + esc(d.caption || '') + '</figcaption>' : '') + '</figure></div>');
    }
  };

  B.news = {
    name: 'Новости', cat: 'Карточки и данные',
    variants: [{ key: 'cols', label: 'Колонки', options: [['2', '2'], ['3', '3']], def: '3' }],
    fields: [{ key: 'title', label: 'Заголовок', t: 'text' }, { key: 'all', label: 'Ссылка «Все новости»', t: 'button' }, { key: 'items', label: 'Новости', t: 'items', item: [{ key: 'text', label: 'Текст', t: 'text' }, { key: 'date', label: 'Дата', t: 'text' }, { key: 'link', label: 'Ссылка', t: 'button' }], add: { text: 'Текст новости', date: 'Дата публикации: 01.01.2027', link: { label: 'Подробнее', href: '#' } } }],
    example: function () { return { title: 'Актуальное', all: { label: 'Все новости', href: 'https://uzumbank.uz/ru/news' }, items: [
      { text: 'АО «Uzum Bank» сообщает о вступлении в силу новой редакции Правил комплексного банковского обслуживания физических лиц с 5 декабря 2026', date: 'Дата публикации: 24.11.2026', link: { label: 'Подробнее', href: 'https://uzumbank.uz/ru/documents' } },
      { text: 'Уважаемые клиенты! Информируем вас, что акция «Кэшбэк 100% на первую оплату через Apple Pay» завершается 9 ноября 2026 года.', date: 'Дата публикации: 05.11.2026', link: { label: '', href: '' } },
      { text: 'Тарифы для физических лиц на банковское обслуживание в АО «Uzum Bank». Тарифы действительны с 16 ноября 2026 года', date: 'Дата публикации: 05.11.2026', link: { label: 'Подробнее', href: 'https://uzumbank.uz/ru/tariffs' } }] }; },
    thumb: thumb([[10, 8, 40, 7, 2, P], [88, 9, 22, 4, 1, P], [6, 22, 34, 44, 6, Wt], [43, 22, 34, 44, 6, Wt], [80, 22, 34, 44, 6, Wt], [10, 28, 26, 3, 1, 't'], [47, 28, 26, 3, 1, 't'], [84, 28, 26, 3, 1, 't'], [10, 56, 16, 3], [47, 56, 16, 3], [84, 56, 16, 3]]),
    render: function (d, v, ctx) {
      var h = H(ctx, 2);
      var items = (d.items || []).map(function (it, i) {
        var p = 'items.' + i;
        return '<article class="u-card u-news"><p class="u-news__t"' + F(ctx, p + '.text', 'text') + '>' + esc(it.text || '') + '</p><div class="u-news__f"><span class="u-small"' + F(ctx, p + '.date', 'text') + '>' + esc(it.date || '') + '</span>' +
          (it.link && it.link.label ? '<a class="u-link" href="' + href(ctx, it.link.href) + '"><span' + F(ctx, p + '.link.label', 'text') + '>' + esc(it.link.label) + '</span>' + ARROW() + '</a>' : '') + '</div></article>';
      }).join('');
      return '<div class="u-c"><div class="u-stack"><div class="u-news__head"><' + h + ' class="u-h2 u-grad"' + F(ctx, 'title', 'text') + '>' + esc(d.title || '') + '</' + h + '>' +
        (d.all && d.all.label ? '<a class="u-link" href="' + href(ctx, d.all.href) + '"><span' + F(ctx, 'all.label', 'text') + '>' + esc(d.all.label) + '</span>' + ARROW() + '</a>' : '') + '</div><div class="u-grid u-grid--' + (v.cols || 3) + '">' + items + '</div></div></div>';
    }
  };

  B.button = {
    name: 'Кнопка', cat: 'Действия',
    variants: [{ key: 'align', label: 'Выравнивание', options: [['left', 'Слева'], ['center', 'По центру']], def: 'center' }],
    fields: [{ key: 'button', label: 'Кнопка', t: 'button' }],
    example: function () { return { button: { label: 'Оформить бесплатно', href: '#', style: 'primary', arrow: true } }; },
    thumb: thumb([[34, 28, 52, 16, 8, P], [40, 34, 28, 4, 1, Wt]]),
    render: function (d, v, ctx) { return '<div class="u-c"><div class="u-btns' + (v.align === 'center' ? ' u-btns--center' : '') + '">' + btn(ctx, d.button || {}, 'button') + '</div></div>'; }
  };

  B.buttons = {
    name: 'Группа кнопок', cat: 'Действия',
    variants: [{ key: 'align', label: 'Выравнивание', options: [['left', 'Слева'], ['center', 'По центру']], def: 'center' }],
    fields: [{ key: 'buttons', label: 'Кнопки', t: 'buttons', max: 4 }],
    example: function () { return { buttons: [{ label: 'Оформить карту', href: '#', style: 'primary' }, { label: 'Тарифы', href: '#', style: 'soft' }] }; },
    thumb: thumb([[14, 28, 44, 16, 8, P], [62, 28, 44, 16, 8, L]]),
    render: function (d, v, ctx) { return '<div class="u-c">' + (btns(ctx, d.buttons, 'buttons', v.align === 'center') || (ctx.edit ? '<p class="u-small">Добавьте кнопки в настройках</p>' : '')) + '</div>'; }
  };

  B.cta = {
    name: 'Призыв к действию', cat: 'Действия',
    variants: [{ key: 'bg', label: 'Фон', options: [['purple', 'Фиолетовый'], ['white', 'Белый']], def: 'purple' }, { key: 'qr', label: 'QR-код', options: [['on', 'Показать'], ['off', 'Скрыть']], def: 'on' }, { key: 'align', label: 'Выравнивание', options: [['left', 'Слева'], ['center', 'По центру']], def: 'left', when: { qr: 'off' } }],
    fields: [{ key: 'title', label: 'Заголовок', t: 'text' }, { key: 'text', label: 'Текст', t: 'inline' }, { key: 'buttons', label: 'Кнопки (на телефоне вместо QR)', t: 'buttons', max: 2 }, { key: 'note', label: 'Сноска', t: 'text' }, { key: 'qrImage', label: 'QR-код', t: 'image', when: { qr: 'on' } }, { key: 'qrText', label: 'Подпись к QR', t: 'text', when: { qr: 'on' } }],
    example: function () { return { title: 'Оформите карту Uzum без посещения банка', text: 'Отсканируйте QR, всего пара минут, и карта будет готова', buttons: [{ label: 'Оформить бесплатно', href: '#', style: 'primary', arrow: true }], note: 'Карта доступна для резидентов Узбекистана', qrImage: { src: 'lib:qr-card.png', alt: 'QR-код для оформления карты Uzum' }, qrText: 'Наведите камеру телефона' }; },
    thumb: thumb([[4, 4, 112, 64, 8, P], [12, 16, 56, 7, 2, Wt], [12, 26, 46, 7, 2, Wt], [12, 40, 50, 3, 1, D], [84, 14, 26, 32, 6, Wt], [88, 18, 18, 18, 2, 't']]),
    render: function (d, v, ctx) {
      var h = H(ctx, 2), qr = v.qr !== 'off';
      var center = !qr && v.align === 'center';
      var b = btns(ctx, d.buttons, 'buttons', center);
      var inner = '<div class="u-cta' + (qr ? ' u-cta--qr' : '') + (center ? ' u-cta--center' : '') + '"><div class="u-cta__text"><' + h + ' class="u-h2' + (v.bg === 'white' ? ' u-grad' : '') + '"' + F(ctx, 'title', 'text') + '>' + esc(d.title || '') + '</' + h + '>' +
        inlineRich(ctx, d, 'text', 'p', 'u-lead') + (b ? '<div class="u-cta__mbtn">' + b + '</div>' : '') + note(ctx, d, 'note') + '</div>' +
        (qr ? '<div class="u-cta__qr">' + img(ctx, d.qrImage) + (d.qrText || ctx.edit ? '<p' + F(ctx, 'qrText', 'text') + '>' + esc(d.qrText || '') + '</p>' : '') + '</div>' : '') + '</div>';
      return plate({ bg: v.bg === 'white' ? 'white' : 'purple' }, inner);
    }
  };

  B.faq = {
    name: 'Вопросы и ответы', cat: 'Действия',
    variants: [{ key: 'layout', label: 'Заголовок', options: [['side', 'Сбоку'], ['top', 'Сверху']], def: 'side' }, { key: 'open', label: 'Первый ответ', options: [['first', 'Раскрыт'], ['none', 'Свёрнут']], def: 'first' }, { key: 'bg', label: 'Фон', options: [['white', 'Плашка'], ['none', 'Без плашки']], def: 'white' }],
    fields: [{ key: 'title', label: 'Заголовок', t: 'text' }, { key: 'items', label: 'Вопросы', t: 'items', item: [{ key: 'q', label: 'Вопрос', t: 'text' }, { key: 'a', label: 'Ответ', t: 'rich' }], add: { q: 'Новый вопрос', a: '<p>Ответ</p>' } }],
    example: function () { return { title: 'FAQ', items: [{ q: 'Сколько стоит карта?', a: '<p>0 сум за выпуск и обслуживание.</p>' }, { q: 'Где и как можно оформить карту?', a: '<p>В приложении Uzum Bank на iOS или Android. Выпуск карты займёт пару минут.</p>' }, { q: 'Как подключить оповещение по карте?', a: '<p>Подключены по умолчанию на номер, использованный для регистрации в приложении Uzum Bank.</p>' }] }; },
    thumb: thumb([[4, 4, 112, 64, 8, Wt], [10, 12, 24, 8, 2, P], [44, 12, 60, 4, 1, 't'], [44, 19, 50, 3], [44, 26, 66, 1, 0, D], [44, 31, 54, 4, 1, 't'], [44, 39, 66, 1, 0, D], [44, 44, 58, 4, 1, 't'], [44, 52, 66, 1, 0, D]]),
    render: function (d, v, ctx) {
      var h = H(ctx, 2);
      var list = faqList(d, v, ctx, '');
      return plate(v, '<div class="u-faq' + (v.layout !== 'top' ? ' u-faq--side' : '') + '">' + (d.title || ctx.edit ? '<' + h + ' class="u-h2 u-grad"' + F(ctx, 'title', 'text') + '>' + esc(d.title || '') + '</' + h + '>' : '<div></div>') + list + '</div>');
    }
  };
  function faqList(d, v, ctx, prefix) {
    return '<div class="u-faq__list">' + (d.items || []).map(function (it, i) {
      var p = prefix + 'items.' + i;
      var open = ctx.edit ? (ctx.faqOpen(ctx.bid + ':' + p, v.open !== 'none' && i === 0) ? ' open' : '') : (v.open !== 'none' && i === 0 ? ' open' : '');
      var q = ctx.edit ? '<div class="u-faq__q ed-faq-q" data-faq="' + p + '"><span' + F(ctx, p + '.q', 'text') + '>' + esc(it.q || '') + '</span><span class="u-faq__pm" aria-hidden="true"></span></div>'
        : '<summary class="u-faq__q"><span>' + esc(it.q || '') + '</span><span class="u-faq__pm" aria-hidden="true"></span></summary>';
      var ans = '<div class="u-faq__a"><div class="u-rich"' + F(ctx, p + '.a', 'rich') + '>' + (it.a || '') + '</div></div>';
      if (ctx.edit) return '<div class="u-faq__i' + (open ? ' is-open' : '') + '">' + q + ans + '</div>';
      return '<details class="u-faq__i"' + open + '>' + q + ans + '</details>';
    }).join('') + '</div>';
  }

  B.tabs = {
    name: 'Вкладки', cat: 'Действия',
    variants: [{ key: 'bg', label: 'Фон', options: [['white', 'Плашка'], ['none', 'Без плашки']], def: 'white' }],
    fields: [{ key: 'anchor', label: 'Якорь секции (id)', t: 'text' }, { key: 'tabs', label: 'Вкладки', t: 'tabs' }],
    example: function () {
      return { anchor: 'info', tabs: [
        { label: 'Тарифы и условия', id: 'tariffs', kind: 'table', d: B.table.example(), v: { style: 'tariff', head: 'off' } },
        { label: 'Как это работает', id: 'how', kind: 'steps', d: B.steps.example(), v: { layout: 'cards' } },
        { label: 'Вопросы и ответы', id: 'faq', kind: 'faq', d: B.faq.example(), v: { open: 'first' } }
      ] };
    },
    thumb: thumb([[4, 4, 112, 64, 8, Wt], [10, 10, 30, 9, 4, P], [42, 10, 30, 9, 4, G], [74, 10, 30, 9, 4, G], [10, 26, 100, 1, 0, D], [10, 30, 34, 4, 1, 't'], [60, 30, 20, 4, 1, 't'], [10, 40, 100, 1, 0, D], [10, 44, 30, 4, 1, 't'], [60, 44, 14, 4, 1, 't']]),
    render: function (d, v, ctx, id) {
      var tabs = d.tabs || [];
      var sel = ctx.edit ? Math.min(ctx.tabSel(id), tabs.length - 1) : 0;
      var list = tabs.map(function (t, i) {
        var tid = (t.id || 'tab' + i);
        return '<button class="u-tab" type="button" role="tab" id="t-' + esc(tid) + '" aria-controls="' + esc(tid) + '" aria-selected="' + (i === sel) + '"' + (i === sel ? '' : ' tabindex="-1"') + (ctx.edit ? ' data-tabi="' + i + '"' : '') + '>' + esc(t.label || '') + '</button>';
      }).join('');
      var panels = tabs.map(function (t, i) {
        var tid = (t.id || 'tab' + i), p = 'tabs.' + i + '.d.';
        return '<div class="u-tabpanel" role="tabpanel" id="' + esc(tid) + '" aria-labelledby="t-' + esc(tid) + '"' + (i === sel ? ' tabindex="0"' : ctx.edit ? ' hidden' : ' hidden="until-found"') + '>' + tabBody(t, ctx, p) + '</div>';
      }).join('');
      return plate(v, '<div class="u-tabs"><div class="u-tablist" role="tablist" aria-label="' + esc(d.title || a11y(ctx, 'info')) + '">' + list + '</div>' + panels + '</div>', '', d.anchor ? ' id="' + esc(d.anchor) + '"' : '');
    }
  };
  function tabBody(t, ctx, p) {
    var d = t.d || {}, v = t.v || {};
    if (t.kind === 'table') return tableHTML(d, v, ctx, p);
    if (t.kind === 'faq') return faqList(d, v, ctx, p);
    if (t.kind === 'steps') {
      var items = (d.items || []).map(function (it, i) {
        return '<li class="u-steps__i"><span class="u-num" aria-hidden="true">' + (i + 1) + '</span><div><h3 class="u-steps__t"' + F(ctx, p + 'items.' + i + '.title', 'text') + '>' + esc(it.title || '') + '</h3>' + (it.text || ctx.edit ? '<p class="u-text"' + F(ctx, p + 'items.' + i + '.text', 'text') + '>' + esc(it.text || '') + '</p>' : '') + '</div></li>';
      }).join('');
      return '<div class="u-stack"><ol class="u-steps' + (v.layout === 'column' ? '' : ' u-steps--cards') + '" style="--u-steps-cols:' + Math.min(4, Math.max(1, (d.items || []).length)) + '">' + items + '</ol>' + (d.note || ctx.edit ? '<p class="u-note">' + icon('info') + '<span' + F(ctx, p + 'note', 'text') + '>' + esc(d.note || '') + '</span></p>' : '') + '</div>';
    }
    return '<div class="u-rich"' + F(ctx, p + 'body', 'rich') + '>' + (d.body || '<p></p>') + '</div>';
  }

  /* ---------- каталог (с пресетами) ---------- */
  var CATALOG = [
    { id: 'header', type: 'header' }, { id: 'header2', type: 'header2' }, { id: 'hero', type: 'hero' }, { id: 'hero-image', type: 'hero', name: 'Первый экран с картинкой', v: { media: 'image', bg: 'white', fit: 'bottom' }, d: { eyebrow: '', title: 'Добавьте карту Uzum в Apple Pay', lead: 'Платите телефоном как картой — в магазинах, приложениях и в интернете', buttons: [{ label: 'Подробнее об Apple Pay', href: 'https://uzumbank.uz/ru/apple-pay/', style: 'primary' }] } },
    { id: 'heading', type: 'heading' }, { id: 'maint', type: 'maint' }, { id: 'promo', type: 'promo' }, { id: 'calc', type: 'calc' }, { id: 'calc-loan', type: 'calc', name: 'Кредитный калькулятор', v: { kind: 'loan', comp: 'on', bg: 'white' }, d: { title: 'Рассчитайте платёж', lead: 'Платёж одинаковый каждый месяц', aLabel: 'Сумма', aMin: 1000000, aMax: 50000000, aStep: 500000, aDef: 5000000, tLabel: 'Срок', tMin: 3, tMax: 36, tDef: 12, rate: 28, cap: 0, r1: 'Ежемесячный платёж', r2: 'Переплата за весь срок', button: { label: 'Оформить', href: '#', style: 'primary' }, legal: '<p>Расчёт предварительный. Ставка зависит от вашей кредитной истории.</p>' } }, { id: 'calc-cb', type: 'calc', name: 'Калькулятор кэшбэка', v: { kind: 'cashback', comp: 'on', bg: 'purple' }, d: { title: 'Сколько вернётся кэшбэком', lead: '', aLabel: 'Траты в месяц', aMin: 500000, aMax: 20000000, aStep: 100000, aDef: 3000000, tLabel: '', tMin: 1, tMax: 12, tDef: 12, rate: 7, cap: 100000, r1: 'Кэшбэк в месяц', r2: 'За год', button: { label: '', href: '#', style: 'primary' }, legal: '' } }, { id: 'docs', type: 'docs' }, { id: 'counter', type: 'counter' }, { id: 'partners', type: 'partners' }, { id: 'tip', type: 'tip' }, { id: 'rating', type: 'rating' }, { id: 'reviews', type: 'reviews' }, { id: 'footer', type: 'footer' }, { id: 'divider', type: 'divider' },
    { id: 'text', type: 'text' }, { id: 'text2', type: 'text2' }, { id: 'quote', type: 'quote' }, { id: 'note', type: 'note' }, { id: 'legal', type: 'note', name: 'Юридический текст', v: { tone: 'legal', cols: '1' }, d: { body: '<p>Микрозайм выдается Uzum Nasiya (ООО «UZUM FINTECH HUB» и МФО ООО «TEZCOIN»).</p>' } },
    { id: 'list-ul', type: 'list', name: 'Маркированный список', v: { kind: 'ul' } },
    { id: 'list-ol', type: 'list', name: 'Нумерованный список', v: { kind: 'ol' }, d: { title: 'Как перевести деньги', body: '<ol><li>Откройте приложение Uzum Bank</li><li>Выберите «Переводы»</li><li>Введите номер карты и сумму</li></ol>' } },
    { id: 'iconlist', type: 'iconlist' }, { id: 'steps', type: 'steps' },
    { id: 'cards', type: 'cards' }, { id: 'cards-feature', type: 'cards', name: 'Две крупные карточки', v: { cols: '2', style: 'feature' }, d: { title: '', items: [{ image: { src: 'lib:transfers-free.webp', alt: 'Бесплатно навсегда' }, title: 'Переводы без комиссии', text: 'Переводы между картами Uzum бесплатны навсегда. Оформите карты всей семье и друзьям' }, { image: { src: 'lib:korzinka.webp', alt: 'Карта Uzum с корзиной продуктов' }, title: 'Кешбэк 7% на всё в Корзинке', text: 'Платите в Корзинке только картой Uzum — так дешевле. Вернём 7% с каждой покупки', note: 'до 100 000 сум в месяц' }] } },
    { id: 'benefits', type: 'benefits' }, { id: 'table', type: 'table' }, { id: 'stats', type: 'stats' }, { id: 'news', type: 'news' },
    { id: 'image', type: 'image' }, { id: 'textimage', type: 'textimage' }, { id: 'gallery', type: 'gallery' }, { id: 'video', type: 'video' },
    { id: 'button', type: 'button' }, { id: 'buttons', type: 'buttons' }, { id: 'cta', type: 'cta' }, { id: 'faq', type: 'faq' }, { id: 'tabs', type: 'tabs' }
  ];
  var CATS = ['Структура', 'Текст', 'Списки', 'Карточки и данные', 'Медиа', 'Действия'];
  function catEntry(e) { var b = B[e.type]; return { id: e.id, type: e.type, name: e.name || b.name, cat: e.cat || b.cat, thumb: b.thumb, v: e.v || {} }; }

  function defaults(type) { var v = {}; (B[type].variants || []).forEach(function (x) { v[x.key] = x.def; }); return v; }
  function makeBlock(entryId) {
    var e = CATALOG.filter(function (c) { return c.id === entryId; })[0] || { id: entryId, type: entryId };
    var b = B[e.type];
    var d = b.example();
    if (e.d) Object.keys(e.d).forEach(function (k) { d[k] = clone(e.d[k]); });
    var v = defaults(e.type);
    if (e.v) Object.keys(e.v).forEach(function (k) { v[k] = e.v[k]; });
    var out = { id: uid('s'), type: e.type, v: v, d: d };
    if (b.t && !e.d) out.t = clone(b.t);
    return out;
  }
  function when(cond, v) {
    if (!cond) return true;
    return Object.keys(cond).every(function (k) { var c = cond[k]; return Array.isArray(c) ? c.indexOf(v[k]) >= 0 : v[k] === c; });
  }
  /* блоки одной категории, между которыми можно переключаться с сохранением совместимых полей */
  function convertTo(block, type) {
    var nb = { id: block.id, type: type, v: defaults(type), d: B[type].example() };
    Object.keys(block.d || {}).forEach(function (k) {
      var f = (B[type].fields || []).filter(function (x) { return x.key === k; })[0];
      var of = (B[block.type].fields || []).filter(function (x) { return x.key === k; })[0];
      if (f && of && (f.t === of.t || (f.t === 'rich' && of.t === 'list') || (f.t === 'list' && of.t === 'rich'))) nb.d[k] = clone(block.d[k]);
      if (f && of && f.t === 'items' && of.t === 'items') {
        nb.d[k] = block.d[k].map(function (it, i) { var base = clone(f.add || {}); Object.keys(it).forEach(function (ik) { if (base.hasOwnProperty(ik) || (f.item || []).some(function (x) { return x.key === ik; })) base[ik] = clone(it[ik]); }); return base; });
      }
    });
    Object.keys(block.v || {}).forEach(function (k) { if ((B[type].variants || []).some(function (x) { return x.key === k && x.options.some(function (o) { return o[0] === block.v[k]; }); })) nb.v[k] = block.v[k]; });
    return nb;
  }

  /* ---------- рендер страницы ---------- */
  function renderBlocks(blocks, ctx) {
    var out = '', inMain = false;
    ctx.h1 = false; ctx.lcpUsed = false;
    ctx.promote = !blocks.some(function (b) { return b.type === 'hero' || (b.type === 'heading' && (b.v || {}).level === '1'); });
    blocks.forEach(function (b, i) {
      var def = B[b.type];
      if (!def) return;
      var html;
      ctx.bid = b.id; ctx.eager = i < 3 || def.bleed; ctx.lcp = !ctx.edit && !ctx.lcpUsed && b.type !== 'header' && b.type !== 'header2' && (ctx.lcpUsed = true);
      try { html = def.render(b.d || {}, b.v || {}, ctx, b.id); } catch (e) { html = '<div class="u-c"><p class="u-small">Ошибка блока: ' + esc(e.message) + '</p></div>'; }
      if (ctx.edit) {
        out += '<div class="ed-ins" data-ins="' + i + '"><button type="button" tabindex="-1" aria-label="Вставить блок">+</button></div>';
        html = '<div class="ed-sec" data-b="' + b.id + '" data-type="' + b.type + '">' + html + '</div>';
        out += html;
        return;
      }
      if (def.bleed) { if (inMain) { out += '</main>'; inMain = false; } out += html; }
      else { if (!inMain) { out += '<main class="u-main" id="main">'; inMain = true; } out += html; }
    });
    if (ctx.edit) out += '<div class="ed-ins ed-ins--last" data-ins="' + blocks.length + '"><button type="button" tabindex="-1" aria-label="Вставить блок">+</button></div>';
    if (inMain) out += '</main>';
    return typo(out);
  }
  /* типографика: неразрывные пробелы после коротких слов, в числах и перед тире */
  var SHORT = /(^|[\s\u00a0(«"])(в|во|и|к|ко|с|со|у|о|об|а|на|по|за|от|до|из|не|ни|но|для|при|без|или|что|как|это|же|под|над|про|его|их|все|вас|вам|мы|вы|я)\s(?=[^\s<])/gi;
  function typo(html) {
    return html.split(/(<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>)/).map(function (part, i) {
      if (i % 2) return part;
      return part.replace(SHORT, '$1$2\u00a0').replace(SHORT, '$1$2\u00a0').replace(/(\d) (?=\d{3}(\D|$))/g, '$1\u00a0').replace(/(\d) (?=(сум|млн|тыс|минут|дней|дня|раз|%|₽|\$))/g, '$1\u00a0').replace(/ ([—–])/g, '\u00a0$1').replace(/(Uzum|Apple|Face|Touch|Uzum Bank|Visa) (Bank|Pay|ID|Market|Tezkor|Nasiya|Watch|Wallet)/g, '$1\u00a0$2');
    }).join('');
  }

  /* ---------- санитайзер текста (вставка из Word / Google Docs) ---------- */
  function safeHref(h) {
    h = (h || '').trim();
    if (/^(https?:|mailto:|tel:|#|page:|\.?\/|[\w-]+\.html)/i.test(h)) return h;
    if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(h)) return 'https://' + h;
    return '';
  }
  function sanitize(html, mode) {
    mode = mode || 'rich';
    var doc = new DOMParser().parseFromString('<body>' + (html || '') + '</body>', 'text/html');
    var root = doc.body;
    wordLists(root);
    var out = doc.createElement('div');
    walk(root, out, doc, mode, {});
    if (mode === 'inline' || mode === 'text' || mode === 'cell') return finishInline(out, mode);
    gdocsLevels(out, doc);
    normalizeBlocks(out, doc, mode);
    if (mode === 'list') {
      var first = out.querySelector('ul,ol');
      var root = doc.createElement(first ? first.tagName.toLowerCase() : 'ul');
      if (first && first.getAttribute('start')) root.setAttribute('start', first.getAttribute('start'));
      Array.prototype.slice.call(out.children).forEach(function (n) {
        if (n.tagName === 'UL' || n.tagName === 'OL') { while (n.firstChild) root.appendChild(n.firstChild); }
        else if (n.textContent.trim()) { var li = doc.createElement('li'); li.innerHTML = n.innerHTML; root.appendChild(li); }
      });
      if (!root.firstChild) root.appendChild(doc.createElement('li'));
      return root.outerHTML;
    }
    return out.innerHTML;
  }
  function styleOf(el) { return (el.getAttribute && el.getAttribute('style') || '').toLowerCase(); }
  function isBold(el) { var t = el.tagName, s = styleOf(el); if ((t === 'B' || t === 'STRONG') && !/font-weight:\s*(normal|400)/.test(s)) return true; var m = /font-weight:\s*(\d+|bold)/.exec(s); return !!m && (m[1] === 'bold' || +m[1] >= 600); }
  function isItalic(el) { var t = el.tagName, s = styleOf(el); return t === 'I' || t === 'EM' || /font-style:\s*italic/.test(s); }
  var BLOCK = { P: 1, DIV: 1, H1: 1, H2: 1, H3: 1, H4: 1, H5: 1, H6: 1, BLOCKQUOTE: 1, UL: 1, OL: 1, LI: 1, TABLE: 1, TR: 1, SECTION: 1, ARTICLE: 1, HEADER: 1, FOOTER: 1 };
  function walk(src, dst, doc, mode, st) {
    Array.prototype.slice.call(src.childNodes).forEach(function (n) {
      if (n.nodeType === 3) { dst.appendChild(doc.createTextNode(n.nodeValue.replace(/\u00a0/g, '\u00a0'))); return; }
      if (n.nodeType !== 1) return;
      var t = n.tagName;
      if (/^(SCRIPT|STYLE|META|TITLE|HEAD|LINK|XML|IMG|SVG|IFRAME|OBJECT|BUTTON|INPUT|SELECT|TEXTAREA|NOSCRIPT)$/.test(t) || /^O:|^W:|^V:/.test(t)) return;
      if (/mso-list:\s*ignore/i.test(styleOf(n))) return;
      var target = dst;
      var full = mode === 'rich' || mode === 'list';
      if (t === 'BR') { dst.appendChild(doc.createElement('br')); return; }
      if (full && BLOCK[t]) {
        var tag = { P: 'p', DIV: 'p', SECTION: 'p', ARTICLE: 'p', HEADER: 'p', FOOTER: 'p', H1: 'h3', H2: 'h3', H3: 'h3', H4: 'h4', H5: 'h4', H6: 'h4', BLOCKQUOTE: 'blockquote', UL: 'ul', OL: 'ol', LI: 'li', TABLE: 'p', TR: 'p' }[t];
        if (mode === 'list' && /^h/.test(tag)) tag = 'p';
        var el = doc.createElement(tag);
        if (tag === 'ol') { var s = parseInt(n.getAttribute('start'), 10); if (s && s !== 1) el.setAttribute('start', s); }
        if (tag === 'li' && n.getAttribute('aria-level')) el.setAttribute('data-level', n.getAttribute('aria-level'));
        if ((tag === 'ul' || tag === 'ol') && n.className && /lst-kix_[\w]+-(\d)/.test(n.className)) el.setAttribute('data-level', +/lst-kix_[\w]+-(\d)/.exec(n.className)[1] + 1);
        if (/^(UL|OL)$/.test(t) && n.querySelector('li[aria-level]') === null && /margin-left:\s*(\d+)/.test(styleOf(n))) { /* оставляем вложенность как есть */ }
        dst.appendChild(el); target = el;
        var inner = el;
        if (isBold(n) && /^h/.test(tag) === false && tag !== 'ul' && tag !== 'ol') { /* жирный абзац */ }
        walk(n, inner, doc, mode, st);
        return;
      }
      if (!full && BLOCK[t]) { if (dst.lastChild && dst.lastChild.nodeName !== 'BR' && dst.textContent.trim()) dst.appendChild(doc.createElement('br')); walk(n, dst, doc, mode, st); return; }
      if (t === 'A') {
        var h = safeHref(n.getAttribute('href'));
        if (h && mode !== 'text') { var a = doc.createElement('a'); a.setAttribute('href', h); dst.appendChild(a); target = a; }
        walk(n, target, doc, mode, st); return;
      }
      if (mode === 'text') { walk(n, dst, doc, mode, st); return; }
      var b = isBold(n) && !st.b, i = isItalic(n) && !st.i;
      if (b) { var sb = doc.createElement('strong'); target.appendChild(sb); target = sb; }
      if (i) { var si = doc.createElement('em'); target.appendChild(si); target = si; }
      walk(n, target, doc, mode, { b: st.b || b, i: st.i || i });
    });
  }
  function finishInline(out, mode) {
    var h = out.innerHTML.replace(/(<br>\s*)+$/, '').replace(/^(\s*<br>)+/, '');
    if (mode === 'text') return out.textContent.replace(/\s+/g, ' ').trim();
    return h.replace(/<(strong|em)><\/\1>/g, '').trim();
  }
  /* списки Word: <p class=MsoListParagraph style="mso-list:l0 level1 lfo1"> */
  function wordLists(root) {
    var ps = Array.prototype.slice.call(root.querySelectorAll('p,h1,h2,h3,h4'));
    var run = [];
    function flush() {
      if (!run.length) return;
      var doc = root.ownerDocument, items = run.map(function (p) {
        var s = styleOf(p), lv = +((/level(\d+)/.exec(s) || [0, 1])[1]);
        var marker = p.querySelector('[style*="mso-list"]');
        var mt = (marker ? marker.textContent : '').replace(/\s+/g, '');
        var ordered = /^(\(?\d+[.)]|[a-zA-Zа-яА-Я][.)]|[ivxIVX]+[.)])$/.test(mt);
        if (marker) marker.parentNode.removeChild(marker);
        Array.prototype.slice.call(p.querySelectorAll('span')).forEach(function (sp) { if (/mso-list:\s*ignore/i.test(styleOf(sp))) sp.parentNode.removeChild(sp); });
        var li = doc.createElement('li'); li.innerHTML = p.innerHTML;
        return { level: lv, tag: ordered ? 'ol' : 'ul', li: li };
      });
      var list = buildNested(doc, items);
      run[0].parentNode.insertBefore(list, run[0]);
      run.forEach(function (p) { p.parentNode.removeChild(p); });
      run = [];
    }
    var curId = null;
    ps.forEach(function (p) {
      var m = /mso-list:\s*(l\d+)/i.exec(styleOf(p));
      if (m) {
        if (run.length && (run[run.length - 1].nextElementSibling !== p || m[1] !== curId)) flush();
        curId = m[1]; run.push(p);
      } else flush();
    });
    flush();
  }
  function buildNested(doc, items) {
    var root = doc.createElement(items[0].tag), stack = [{ list: root, level: items[0].level }];
    items.forEach(function (it) {
      var top = stack[stack.length - 1];
      while (it.level < top.level && stack.length > 1) { stack.pop(); top = stack[stack.length - 1]; }
      if (it.level > top.level) {
        var parentLi = top.list.lastElementChild || top.list.appendChild(doc.createElement('li'));
        var sub = doc.createElement(it.tag); parentLi.appendChild(sub);
        stack.push({ list: sub, level: it.level }); top = stack[stack.length - 1];
      } else if (stack.length > 1 && top.list.nodeName.toLowerCase() !== it.tag && !top.list.children.length) {
        var nl = doc.createElement(it.tag); top.list.parentNode.replaceChild(nl, top.list); top.list = nl;
      }
      top.list.appendChild(it.li);
    });
    return root;
  }
  /* Google Docs: вложенность передаётся aria-level или классом lst-kix_*-N на соседних списках */
  function gdocsLevels(root, doc) {
    var lists = Array.prototype.slice.call(root.querySelectorAll('ul,ol')).filter(function (l) { return l.querySelector('li[data-level]') || l.hasAttribute('data-level'); });
    if (!lists.length) return;
    var groups = lists.map(function (l) { return [l]; });
    groups.forEach(function (g) {
      var items = [];
      g.forEach(function (l) {
        var lvl = +(l.getAttribute('data-level') || 0);
        Array.prototype.slice.call(l.children).forEach(function (li) { items.push({ level: +(li.getAttribute('data-level') || lvl || 1), tag: l.tagName.toLowerCase(), li: li }); li.removeAttribute('data-level'); });
      });
      if (!items.length) return;
      var start = g[0].getAttribute('start');
      var nl = buildNested(doc, items);
      if (start && nl.tagName === 'OL') nl.setAttribute('start', start);
      g[0].parentNode.insertBefore(nl, g[0]);
      g.forEach(function (l) { l.parentNode.removeChild(l); });
    });
    Array.prototype.slice.call(root.querySelectorAll('[data-level]')).forEach(function (n) { n.removeAttribute('data-level'); });
  }
  function normalizeBlocks(root, doc, mode) {
    /* li > p → содержимое */
    Array.prototype.slice.call(root.querySelectorAll('li > p')).forEach(function (p) { var li = p.parentNode; while (p.firstChild) li.insertBefore(p.firstChild, p); if (p.nextSibling && p.nextSibling.nodeName === 'P') li.insertBefore(doc.createElement('br'), p); li.removeChild(p); });
    /* вложенные абзацы в абзацах */
    Array.prototype.slice.call(root.querySelectorAll('p p, h3 p, h4 p, blockquote blockquote')).forEach(function (p) { var parent = p.parentNode; while (p.firstChild) parent.insertBefore(p.firstChild, p); parent.removeChild(p); });
    /* списки, прямые дети которых не li */
    Array.prototype.slice.call(root.querySelectorAll('ul,ol')).forEach(function (l) { Array.prototype.slice.call(l.childNodes).forEach(function (n) { if (n.nodeName === 'LI') return; if (n.nodeName === 'UL' || n.nodeName === 'OL') { var prev = n.previousElementSibling; if (prev && prev.nodeName === 'LI') prev.appendChild(n); else { var li = doc.createElement('li'); l.insertBefore(li, n); li.appendChild(n); } return; } if (n.nodeType === 3 && !n.nodeValue.trim()) { l.removeChild(n); return; } var li2 = doc.createElement('li'); l.insertBefore(li2, n); li2.appendChild(n); }); });
    /* текст на верхнем уровне → в абзацы */
    var cur = null;
    Array.prototype.slice.call(root.childNodes).forEach(function (n) {
      var block = n.nodeType === 1 && /^(P|H3|H4|BLOCKQUOTE|UL|OL)$/.test(n.nodeName);
      if (block) { cur = null; return; }
      if (n.nodeType === 3 && !n.nodeValue.trim() && !cur) { root.removeChild(n); return; }
      if (n.nodeName === 'BR' && !cur) { root.removeChild(n); return; }
      if (!cur) { cur = doc.createElement('p'); root.insertBefore(cur, n); }
      cur.appendChild(n);
    });
    /* пустые абзацы и лишние br */
    Array.prototype.slice.call(root.querySelectorAll('p,h3,h4,blockquote')).forEach(function (p) {
      while (p.lastChild && p.lastChild.nodeName === 'BR') p.removeChild(p.lastChild);
      if (!p.textContent.trim() && !p.querySelector('br')) p.parentNode.removeChild(p);
    });
    Array.prototype.slice.call(root.querySelectorAll('strong:empty,em:empty,a:empty')).forEach(function (n) { n.parentNode.removeChild(n); });
    Array.prototype.slice.call(root.querySelectorAll('*')).forEach(function (n) { Array.prototype.slice.call(n.attributes).forEach(function (a) { if (!(n.nodeName === 'A' && a.name === 'href') && !(n.nodeName === 'OL' && a.name === 'start')) n.removeAttribute(a.name); }); });
  }

  /* ---------- шаблон: страница карты Uzum ---------- */
  function cardTemplate() {
    var blk = function (type, v, d) { var b = { id: uid('s'), type: type, v: defaults(type), d: B[type].example() }; Object.keys(v || {}).forEach(function (k) { b.v[k] = v[k]; }); Object.keys(d || {}).forEach(function (k) { b.d[k] = d[k]; }); return b; };
    var ORDER = 'https://uzumbank.go.link/goto?action=promo_debit_card&adj_t=1h20ws66&adj_campaign=card&utm_source=Website&utm_campaign=card';
    var APP = 'https://uzumbank.go.link/goto?adj_t=1dio0ufx&action=promo_debit_card&utm_source=UzumPromo&utm_campaign=UzumCard';
    var BR = '<br>';
    var tariffs = { head: ['Услуга', 'Стоимость', 'Условия'], rows: [
      ['Выпуск пластиковой карты', 'Бесплатно', ''],
      ['Комиссия за переводы', '0%' + BR + 'На карты Uzum в приложении Uzum Bank', '0%' + BR + 'до 2 млн сум на Uzcard и Humo. От 2 до 100 млн сум — 0,2% при соблюдении условий акции. Без выполненных условий — 0,9%. Акция действует с 1 июня.'],
      ['Пополнение с карты другого банка', '0%' + BR + 'В приложении Uzum Bank', ''],
      ['Выпуск и обслуживание', 'Бесплатно', ''],
      ['Комиссия за блокировку карты с признаком «украдена или потеряна»', 'Бесплатно', ''],
      ['Комиссия за перевод микрозайма на карту', '5%' + BR + 'За перевод микрозайма на карту взимается комиссия согласно тарифам банка', ''],
      ['Снятие наличных', '0%' + BR + 'В банкоматах Uzum Bank — до 10 000 000 сум в месяц', 'В банкоматах других банков — до 2 000 000 сум при соблюдении условий акции. Комиссию вернём кешбэком в течение 15 минут. Акция действует с 1 июня.']
    ] };
    var faq = [
      { q: 'Сколько стоит карта?', a: '<p>0 сум за выпуск и обслуживание.</p>' },
      { q: 'Где и как можно оформить карту?', a: '<p>В <a href="' + APP + '">приложении Uzum Bank</a> на iOS или Android.</p><p>Если у вас еще нет приложения, установите его на телефон и пройдите регистрацию. После этого откройте виртуальную карту Uzum: перейдите на главную → «Оформить карту». Выпуск карты займет пару минут.</p>' },
      { q: 'Что делать, если потерял карту?', a: '<p>Виртуальную карту нельзя потерять — она всегда доступна в приложении. Когда заказ пластиковой карты Uzum станет доступен всем пользователям, при необходимости ее можно будет временно заморозить в приложении или заблокировать насовсем.</p><p>Если вы потеряете карту, ее можно будет заблокировать и выпустить новую. Для этого обратитесь в службу поддержки:</p><ul><li>В чате мобильного приложения Uzum Bank</li><li>В Telegram <a href="https://t.me/UzumBank_Robot">@UzumBank_Robot</a></li><li>По телефону <a href="tel:+998787770799">+998 78 777 07 99</a></li></ul>' },
      { q: 'Можно ли добавить карту в другие приложения?', a: '<p>Вы можете использовать виртуальную карту Uzum для оплаты покупок в магазинах и платежей в онлайн-сервисах, перевода денег на другие карты и снятия наличных. Клиенты Uzum Bank также могут получить доступ к специальным предложениям внутри экосистемы Uzum — в Uzum Market и Uzum Tezkor.</p><p>Добавление карты в некоторые платежные сервисы может быть ограничено в целях безопасности.</p>' },
      { q: 'Как подключить оповещение по карте?', a: '<p>Подключены по умолчанию на номер, использованный для регистрации в приложении Uzum Bank.</p>' },
      { q: 'Как можно снять деньги с карты?', a: '<p>Для снятия наличных с виртуальной карты Uzum вы можете перевести деньги на пластиковую карту любого банка и использовать доступный банкомат. Когда пластиковая карта Uzum станет доступна всем пользователям, вы сможете снимать деньги непосредственно с нее. Условия и тарифы <a href="https://uzumbank.uz/tariffs/">доступны</a> на сайте Uzum Bank.</p>' }
    ];
    var blocks = [
      blk('header', {}, {}),
      blk('hero', { media: 'card', bg: 'purple' }, { buttons: [{ label: 'Оформить бесплатно', href: ORDER, style: 'light', arrow: true }] }),
      blk('textimage', { side: 'right', bg: 'white', fit: 'bleed' }, { title: 'До 25 000 000 сум на 30 дней без переплат', body: '<p>Получите деньги на карту и делайте покупки, переводы или снимайте наличными</p>', buttons: [{ label: 'Как это работает', href: '#how', style: 'soft' }], note: 'Микрозайм выдается Uzum Nasiya', image: { src: 'lib:couple-bags.webp', alt: 'Мужчина и женщина с фиолетовыми пакетами' } }),
      blk('cards', { cols: '3', style: 'photo', media: 'contain' }, B.cards.example()),
      blk('textimage', { side: 'right', bg: 'white', fit: 'bleed', ratio: 'half' }, B.textimage.example()),
      blk('cta', { bg: 'purple', qr: 'on' }, B.cta.example()),
      blk('tabs', {}, { anchor: 'info', tabs: [
        { label: 'Тарифы и условия', id: 'tariffs', kind: 'table', v: { style: 'tariff', head: 'off' }, d: { table: tariffs, note: 'Тарифы могут быть изменены банком согласно условиям ДКБО', link: { label: 'Подробные условия', href: 'https://uzumbank.uz/documents/dkbo_annex_2_ru_27_10_2026.pdf' } } },
        { label: 'Как работает микрозайм?', id: 'how', kind: 'steps', v: { layout: 'cards' }, d: { items: [{ title: 'Получите микрозайм до 25 000 000 сум', text: 'Переведите нужную сумму с вашего лимита на карту Uzum. За перевод микрозайма на карту взимается комиссия Uzum Bank — 5%' }, { title: '30 дней — льготный период', text: 'Погасите микрозайм полностью в течение 30 дней и не платите комиссию Uzum Nasiya за выдачу микрозайма' }, { title: 'Ежемесячные платежи', text: 'Когда беспроцентный период кончится, мы разделим сумму долга на 12 равных платежей с учетом комиссии Uzum Nasiya за выдачу микрозайма и спишем первый платеж. График и сумма платежей всегда доступны в приложении' }], note: 'Микрозайм выдается Uzum Nasiya' } },
        { label: 'Вопросы и ответы', id: 'faq', kind: 'faq', v: { open: 'first' }, d: { items: faq } }
      ] }),
      blk('note', { tone: 'legal', cols: '3' }, { body: '<p>Микрозайм выдается Uzum Nasiya (ООО «UZUM FINTECH HUB» и МФО ООО «TEZCOIN»). Акция беспроцентного периода действует до 31.12.2026, <a href="https://uzumnasiya.uz/ru/legal?offer=marketing-promo">подробные условия</a>. За выдачу микрозайма взимается комиссия ООО «UZUM FINTECH HUB». При возврате полной суммы микрозайма в течение 30 дней, комиссия ООО «UZUM FINTECH HUB» учитывается в счет погашения задолженности.</p>', body2: '<p>Услугу микрозайма предоставляет МФО ООО «TEZCOIN». <a href="https://uzumbank.uz/docs/TEZCOIN_offer.pdf">Оферта</a></p>', body3: '<p>АО «UZUM BANK». <a href="https://uzumbank.uz/documents/dkbo_21-11-2026_ru_rules_of_comprehensive_banking_services_for_individuals_in_jsc_uzum_bank.pdf">Оферта</a><br>Республика Узбекистан, г. Ташкент, Яккасарайский район, улица Шота Руставели, дом 19, 100070<br><a href="tel:+998787770799">+998 78 777 07 99</a></p>' }),
      blk('footer', { form: 'on' }, {})
    ];
    blocks[6].d.tabs[2].d.title = '';
    return { name: 'Карта Uzum', slug: 'index', seoTitle: 'Карта Uzum: переводы без комиссии и 25 млн сум без процентов', seoDesc: 'Бесплатная карта Uzum: переводы без комиссии, снятие наличных в банкоматах Uzum Bank и микрозайм до 25 000 000 сум на 30 дней без переплат.', blocks: blocks };
  }


  /* ---------- языки ---------- */
  var LANGS = [['ru', 'Русский', 'RU'], ['uz', "O'zbekcha", 'UZ'], ['en', 'English', 'EN']];
  var NON_T = { file: 1, end: 1, href: 1, src: 1, icon: 1, id: 1, anchor: 1, style: 1, kind: 1, url: 1, formAction: 1, start: 1 };
  var LETTERS = /[A-Za-zА-Яа-яЁёЎўҚқҒғҲҳ]/;
  /* строковые поля блока, которые переводятся: путь → значение RU */
  function transPaths(d, prefix, out) {
    out = out || {};
    Object.keys(d || {}).forEach(function (k) {
      var v = d[k], p = prefix ? prefix + '.' + k : k;
      if (typeof v === 'string') { if (!NON_T[k] && LETTERS.test(v.replace(/<[^>]+>/g, ''))) out[p] = v; }
      else if (v && typeof v === 'object') transPaths(v, p, out);
    });
    return out;
  }
  function dataFor(b, lang) {
    if (!lang || lang === 'ru' || !b.t || !b.t[lang]) return b.d;
    var d = clone(b.d || {}), o = b.t[lang];
    Object.keys(o).forEach(function (p) { if (o[p] !== '' && o[p] != null) setPath(d, p, o[p]); });
    return d;
  }
  function missing(b, lang) {
    if (!lang || lang === 'ru' || B[b.type].locked) return [];
    var o = (b.t && b.t[lang]) || {}, def = B[b.type], v = b.v || {};
    var keys = {}; (def.fields || []).forEach(function (f) { if (when(f.when, v)) keys[f.key] = 1; });
    return Object.keys(transPaths(b.d)).filter(function (p) { return keys[p.split('.')[0]] && !o[p]; });
  }
  /* перестановка элементов массива — переносим переводы вслед за элементами */
  function remapT(b, arrPath, map) {
    if (!b.t) return;
    var pre = arrPath.replace(/^d\./, '') + '.';
    Object.keys(b.t).forEach(function (lang) {
      var o = b.t[lang], n = {};
      Object.keys(o).forEach(function (p) {
        if (p.indexOf(pre) !== 0) { n[p] = o[p]; return; }
        var rest = p.slice(pre.length), m = /^(\d+)(.*)$/.exec(rest);
        if (!m) { n[p] = o[p]; return; }
        var ni = map(+m[1]);
        if (ni != null && ni >= 0) n[pre + ni + m[2]] = o[p];
      });
      b.t[lang] = n;
    });
  }

  /* ---------- правила картинок: размер слота и как он заполняется ---------- */
  function imageRule(type, path, v) {
    var key = path.split('.').pop();
    var R = function (o) { return o; };
    if (type === 'hero' && key === 'card') return R({ fit: 'fixed', ratio: 1798 / 1303, ratioText: '1798 × 1303', min: 1200, alpha: true, size: '1798 × 1303', tips: ['Пропорции строго как у макета карты: другое соотношение растянет картинку', 'Карта целиком, без полей и без тени: тень блок добавляет сам', 'PNG или WebP с прозрачным фоном'] });
    if (key === 'qr' || key === 'qrImage') return R({ fit: 'fixed', ratio: 1, ratioText: '1 : 1', min: 600, alpha: false, size: '600 × 600', tips: ['Квадрат, QR без белых полей вокруг: поле добавляет блок', 'PNG или SVG, без сжатия в JPEG — иначе код может не считаться'] });
    if (type === 'hero') return R({ fit: v.fit === 'bottom' ? 'bottom' : 'contain', ratio: null, min: 1000, alpha: true, size: '1000 × 1000 (до 1000 × 1200)', tips: ['Блок показывает картинку целиком, ничего не обрезает', 'PNG или WebP с прозрачным фоном, без полей по краям', v.fit === 'bottom' ? 'Объект должен касаться нижнего края файла — он «встанет» на край плашки' : 'Объект по центру, вокруг 4–6% воздуха'] });
    if (type === 'textimage') return R({ fit: v.fit === 'bleed' ? 'bottom' : 'contain', ratio: null, min: 1000, alpha: v.fit !== 'boxed', size: '1200 × 1200', tips: ['Показывается целиком: до 440 px по высоте на десктопе, до 360 px на телефоне', 'PNG или WebP с прозрачным фоном', v.fit === 'bleed' ? 'Нижний край объекта — по нижнему краю файла, без отступа: картинка садится на край плашки' : 'Объект по центру, обрежьте пустые поля файла'] });
    if (type === 'cards' && /^items\.\d+\.image$/.test(path.replace(/\.(src|alt)$/, '')) || (type === 'cards' && key === 'image')) {
      var cols = +(v.cols || 3), feature = v.style === 'feature';
      var cw = (1216 - (cols - 1) * 20) / cols - (feature ? 64 : 48), ch = feature ? 300 : 260;
      if (v.media === 'cover') {
        var dr = cw / ch, mr = 318 / 200, tr = 312 / 200;
        var hi = Math.max(dr, mr, tr), lo = Math.min(dr, mr, tr);
        return R({ fit: 'cover', ratio: hi, ratioText: hi.toFixed(2) + ' : 1', min: 1200, alpha: false, size: Math.round(1200) + ' × ' + Math.round(1200 / hi), tips: ['Режим «Заполнить» обрезает края: на десктопе кадр ' + dr.toFixed(2) + ' : 1, на телефоне ' + mr.toFixed(2) + ' : 1', 'Держите важное в центральных ' + Math.round(lo / hi * 100) + '% ширины', 'Чтобы ничего не обрезалось, переключите вариант «Картинка» на «Целиком»'] });
      }
      return R({ fit: v.media === 'bottom' ? 'bottom' : 'contain', ratio: null, min: 800, alpha: true, size: Math.round(cw * 2) + ' × ' + Math.round(ch * 2) + ' (' + (cw / ch).toFixed(2) + ' : 1)', tips: ['Слот ' + Math.round(cw) + ' × ' + ch + ' px на десктопе, ' + (feature ? 220 : 200) + ' px высотой на телефоне. Картинка вписывается целиком', 'PNG или WebP с прозрачным фоном: фон слота светло-сиреневый', v.media === 'bottom' ? 'Нижний край объекта — по нижнему краю файла' : 'Обрежьте пустые поля: вокруг объекта блок оставит 6%'] });
    }
    if (type === 'gallery') return R({ fit: v.fit === 'cover' ? 'cover' : 'contain', ratio: 4 / 3, ratioText: '4 : 3', min: 1200, alpha: false, size: '1600 × 1200', tips: ['Ячейка галереи 4 : 3. В этих пропорциях картинка не обрезается и не получает полей', v.fit === 'cover' ? 'В режиме «Заполнить» другое соотношение обрежет края' : 'В режиме «Целиком» другое соотношение даст поля по краям'] });
    if (type === 'image') return R({ fit: 'auto', ratio: null, min: v.width === 'narrow' ? 1520 : 2400, alpha: false, size: v.width === 'narrow' ? '1520 px по ширине' : '2400 px по ширине', tips: ['Показывается целиком, высота по пропорциям файла', 'Скругление углов 24 px добавляет блок: не скругляйте в файле'] });
    return R({ fit: 'contain', ratio: null, min: 800, alpha: false, size: 'от 800 px по большей стороне', tips: ['Показывается целиком'] });
  }

  /* ---------- шаблон: главная uzumbank.uz ---------- */
  function homeTemplate() {
    var blk = function (type, v, d, t) { var b = { id: uid('s'), type: type, v: defaults(type), d: B[type].example() }; Object.keys(v || {}).forEach(function (k) { b.v[k] = v[k]; }); Object.keys(d || {}).forEach(function (k) { b.d[k] = d[k]; }); if (t) b.t = t; return b; };
    var blocks = [
      blk('header'),
      blk('hero', { media: 'card', bg: 'purple' }, { eyebrow: '', title: 'Карта Uzum — деньги есть', lead: 'Оформление, обслуживание и пополнение — бесплатно', buttons: [{ label: 'Подробнее о карте', href: 'https://uzumbank.uz/ru/card/', style: 'light', arrow: true }], note: '', qrText: 'Отсканируйте QR-код, чтобы оформить карту' },
        { uz: { title: 'Uzum karta bor — pul bor', lead: "Rasmiylashtirish, xizmat ko‘rsatish va hisobni to‘ldirish bepul", 'buttons.0.label': 'Batafsil' }, en: { title: 'Uzum card — money is here!', lead: 'Card opening, servicing, and top-ups are free of charge', 'buttons.0.label': 'Learn more' } }),
      blk('textimage', { side: 'right', bg: 'white', fit: 'bleed', ratio: 'half' }, { title: 'Добавьте карту Uzum в Apple Pay', body: '<p>Платите телефоном как картой — в магазинах, приложениях и в интернете</p>', buttons: [{ label: 'Подробнее об Apple Pay', href: 'https://uzumbank.uz/ru/apple-pay/', style: 'primary' }], note: '', image: { src: 'lib:applepay-hand.webp', alt: 'Карта Uzum в Apple Pay на iPhone' } },
        { uz: { title: "Uzum kartani Apple Pay’ga qo‘shing", body: '<p>Do‘konlar, ilovalar va internetda telefoningiz bilan kartadek to‘lang</p>', 'buttons.0.label': 'Apple Pay haqida batafsil' }, en: { title: 'Add your Uzum card to Apple Pay', body: '<p>Pay with your phone just like a card — in stores, apps, and online</p>', 'buttons.0.label': 'Learn more about Apple Pay' } }),
      blk('cards', { cols: '2', style: 'feature', media: 'contain' }, { title: '', items: [
        { image: { src: 'lib:transfers-free.webp', alt: 'Бесплатно навсегда' }, title: 'Переводы без комиссии', text: 'Переводы между картами Uzum бесплатны навсегда. Оформите карты всей семье и друзьям', note: '', link: { label: '', href: '' } },
        { image: { src: 'lib:korzinka.webp', alt: 'Карта Uzum с корзиной продуктов' }, title: 'Кешбэк 7% на всё в корзинке', text: 'Платите в корзинке только картой Uzum — так дешевле. Вернём 7% с каждой покупки', note: 'до 100 000 сум в месяц', link: { label: '', href: '' } }] }),
      blk('news', {}, {}, {
        uz: { title: 'Dolzarb', 'all.label': 'Barcha yangiliklar', 'items.0.text': '“Uzum Bank” AJ 2026-yil 5-dekabrdan boshlab jismoniy shaxslarga kompleks bank xizmatlari ko‘rsatish qoidalarining yangi tahriri kuchga kirishini ma’lum qiladi.', 'items.0.date': "E'lon qilingan sana: 24.11.2026", 'items.0.link.label': 'Batafsil', 'items.1.text': 'Hurmatli mijozlar! «Apple Pay orqali birinchi to‘lov uchun 100% keshbek» aksiyasi 2026-yil 9-noyabr kuni yakunlanishini ma’lum qilamiz.', 'items.1.date': "E'lon qilingan sana: 05.11.2026", 'items.2.date': "E'lon qilingan sana: 05.11.2026", 'items.2.link.label': 'Batafsil' },
        en: { title: 'Highlights', 'all.label': 'All news', 'items.0.text': 'JSC “Uzum Bank” announces that the new version of the Rules of Comprehensive Banking Services for individuals comes into force from December 5, 2026', 'items.0.date': 'Publication date: 24.11.2026', 'items.0.link.label': 'Learn more', 'items.1.text': 'Dear customers! We would like to inform you that the “100% Cashback on Your First Apple Pay Payment” promotion will end on November 9, 2026.', 'items.1.date': 'Publication date: 05.11.2026', 'items.2.date': 'Publication date: 05.11.2026', 'items.2.link.label': 'Learn more' } }),
      blk('footer')
    ];
    return { name: 'Главная', slug: 'index', seoTitle: 'Uzum Bank — надёжный цифровой банк Узбекистана', seoDesc: 'Карта Uzum: бесплатное оформление, обслуживание и пополнение. Переводы без комиссии, Apple Pay и кешбэк.', i18n: { uz: { seoTitle: "Uzum Bank — O'zbekistonning ishonchli raqamli banki" }, en: { seoTitle: 'Uzum Bank — Reliable Digital Bank of Uzbekistan' } }, blocks: blocks };
  }

  W.UZB = { B: B, CATALOG: CATALOG, CATS: CATS, catEntry: catEntry, makeBlock: makeBlock, defaults: defaults, when: when, convertTo: convertTo, renderBlocks: renderBlocks, sanitize: sanitize, safeHref: safeHref, esc: esc, uid: uid, clone: clone, getPath: getPath, setPath: setPath, icon: icon, cardTemplate: cardTemplate, homeTemplate: homeTemplate, listAs: listAs, typo: typo, LANGS: LANGS, transPaths: transPaths, dataFor: dataFor, missing: missing, remapT: remapT, imageRule: imageRule };
})(window);
