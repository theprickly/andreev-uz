/* Конструктор страниц Uzum Bank: проекты, редактор, экспорт */
(function () {
  'use strict';
  var U = window.UZB, B = U.B, esc = U.esc, clone = U.clone, getPath = U.getPath, setPath = U.setPath;
  var BASE = new URL('.', location.href).href;
  var $app = document.getElementById('app');

  var LIB = [
    ['card-uzum.webp', 'Карта Uzum'], ['qr-card.png', 'QR-код для оформления карты Uzum'], ['applepay-hand.webp', 'Карта Uzum в Apple Pay на iPhone'],
    ['transfers-free.webp', 'Бесплатно навсегда'], ['korzinka.webp', 'Карта Uzum с корзиной продуктов'], ['couple-bags.webp', 'Мужчина и женщина с фиолетовыми пакетами'],
    ['man-card.webp', 'Мужчина с картой Uzum'], ['cards-flower.webp', 'Разноцветные карты Uzum'], ['market-tezkor.webp', 'Карта Uzum со значками Uzum Market и Uzum Tezkor'],
    ['ap-step1.webp', 'Экран приложения Uzum Bank с картой'], ['ap-howtopay.webp', 'iPhone с картой Uzum: оплата прошла'], ['ap-watch.webp', 'Apple Watch'], ['ap-ipad.webp', 'iPad'], ['ap-mac.webp', 'Mac'],
    ['logo-purple.svg', 'Uzum Bank'], ['logo-white.svg', 'Uzum Bank']
  ];
  var FONTS_BRAND = ['DOTSpektraTekstMod-Bold.woff2', 'DOTSpektraTekst-Medium.woff2', 'TTUzum-Regular.woff2', 'TTUzum-Medium.woff2', 'TTUzum-DemiBold.woff2'];
  var FONTS_BASE = ['roboto-cyrillic-ext-400.woff2', 'roboto-cyrillic-400.woff2', 'roboto-latin-ext-400.woff2', 'roboto-latin-400.woff2'];
  var CHROME_FILES = ['DOTSpektraTekst-Medium.woff2', 'DOTSpektraTekstMod-Bold.woff2', 'Rubik-Regular.ttf', 'TT-Uzum-DemiBold.ttf', 'TT-Uzum-Medium.ttf', 'TT-Uzum-Regular.ttf', 'icomoon.woff', 'roboto-cyrillic-400-normal.woff2', 'roboto-cyrillic-ext-400-normal.woff2', 'roboto-latin-400-normal.woff2', 'roboto-latin-ext-400-normal.woff2', 'uzumbank-logo-light.svg'];
  var VPS = [[390, 'Телефон', 'smartphone'], [768, 'Планшет', 'tablet'], [1440, 'Десктоп', 'monitor']];

  /* ---------- иконки интерфейса ---------- */
  var UI_IC = {
    copy: '<rect x="8" y="8" width="12" height="12" rx="3"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>', redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>',
    drag: '<circle cx="9" cy="6" r="1.4"/><circle cx="15" cy="6" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="18" r="1.4"/>',
    tablet: '<rect x="5" y="2.5" width="14" height="19" rx="2.5"/><path d="M11 18h2"/>', back: '<path d="M15 18 9 12l6-6"/>',
    download: '<path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/>', upload: '<path d="M12 16V5"/><path d="m7 10 5-5 5 5"/><path d="M5 20h14"/>',
    blocks: '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><path d="M17 13.5v7M13.5 17h7"/>',
    sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
    bold: '<path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z"/>', italic: '<path d="M14 5h-4M14 19h-4M14 5l-4 14"/>', link: '<path d="M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1"/><path d="M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1"/>',
    h: '<path d="M6 5v14M16 5v14M6 12h10"/><path d="M19 13l2-1v7"/>', quote: '<path d="M5 17V12a5 5 0 0 1 5-5M14 17V12a5 5 0 0 1 5-5"/>',
    ul: '<circle cx="5" cy="7" r="1.2"/><circle cx="5" cy="12" r="1.2"/><circle cx="5" cy="17" r="1.2"/><path d="M9 7h11M9 12h11M9 17h11"/>',
    ol: '<path d="M4 5h1.5v4M4 9h3M4 14.5c0-1 2.5-1 2.5.3 0 .8-2.5 2.2-2.5 2.2h3"/><path d="M10 7h10M10 12h10M10 17h10"/>',
    indent: '<path d="M4 6h16M10 12h10M10 18h10"/><path d="m4 10 3 2-3 2"/>', outdent: '<path d="M4 6h16M10 12h10M10 18h10"/><path d="m7 10-3 2 3 2"/>',
    clear: '<path d="M6 5h12M12 5l-3 14"/><path d="m15 15 5 5M20 15l-5 5"/>',
    image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="m20 16-4.5-4.5L7 19.5"/>'
  };
  function ui(name) {
    if (UI_IC[name]) return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + UI_IC[name] + '</svg>';
    return U.icon(name, '');
  }

  /* ---------- хранилище: IndexedDB с запасным localStorage ---------- */
  var DB = (function () {
    var db = null, useLS = false;
    function open() {
      return new Promise(function (res) {
        try {
          var r = indexedDB.open('uzum-builder', 1);
          r.onupgradeneeded = function () { var d = r.result; if (!d.objectStoreNames.contains('projects')) d.createObjectStore('projects', { keyPath: 'id' }); if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta'); };
          r.onsuccess = function () { db = r.result; res(); };
          r.onerror = function () { useLS = true; res(); };
          r.onblocked = function () { useLS = true; res(); };
        } catch (e) { useLS = true; res(); }
      });
    }
    function tx(store, mode, fn) {
      return new Promise(function (res, rej) {
        var t = db.transaction(store, mode), s = t.objectStore(store), out;
        out = fn(s);
        t.oncomplete = function () { res(out && out.result !== undefined ? out.result : undefined); };
        t.onerror = function () { rej(t.error); };
        t.onabort = function () { rej(t.error || new Error('abort')); };
      });
    }
    var mem = { projects: [], meta: {} };
    function lsOk() { try { localStorage.setItem('uzb-t', '1'); localStorage.removeItem('uzb-t'); return true; } catch (e) { return false; } }
    function lsAll() { if (!lsOk()) return mem.projects; try { return JSON.parse(localStorage.getItem('uzb-projects') || '[]'); } catch (e) { return []; } }
    function lsSet(a) { if (!lsOk()) { mem.projects = a; return; } localStorage.setItem('uzb-projects', JSON.stringify(a)); }
    return {
      open: open,
      all: function () { return useLS ? Promise.resolve(lsAll()) : tx('projects', 'readonly', function (s) { return s.getAll(); }); },
      put: function (p) { if (useLS) { var a = lsAll().filter(function (x) { return x.id !== p.id; }); a.push(p); try { lsSet(a); } catch (e) { return Promise.reject(e); } return Promise.resolve(); } return tx('projects', 'readwrite', function (s) { s.put(p); }); },
      del: function (id) { if (useLS) { lsSet(lsAll().filter(function (x) { return x.id !== id; })); return Promise.resolve(); } return tx('projects', 'readwrite', function (s) { s.delete(id); }); },
      getMeta: function (k) { if (useLS) { try { return Promise.resolve(localStorage.getItem('uzb-' + k)); } catch (e) { return Promise.resolve(mem.meta[k]); } } return tx('meta', 'readonly', function (s) { return s.get(k); }); },
      setMeta: function (k, v) { if (useLS) { try { localStorage.setItem('uzb-' + k, v); } catch (e) { mem.meta[k] = v; } return Promise.resolve(); } return tx('meta', 'readwrite', function (s) { s.put(v, k); }); }
    };
  })();

  /* ---------- состояние ---------- */
  var S = {
    projects: [], p: null, pageId: null, sel: null, doc: null, frame: null,
    ui: { lang: 'ru', vp: 1440, mode: 'edit', left: 'blocks', insertAt: null, tabSel: {}, faqOpen: {}, itemOpen: {}, libOpen: null, iconOpen: null, panel: null, q: '', exportScope: 'site' },
    hist: [], fut: [], lastSnap: null, histT: 0, saveT: 0, status: 'Сохранено'
  };
  var blobCache = {};

  function now() { return Date.now(); }
  function newProject(name, pages) {
    return { id: U.uid('p'), name: name || 'Новый проект', created: now(), updated: now(), pages: pages || [newPage('Главная', 'index')], assets: {}, settings: { brandFonts: true } };
  }
  function newPage(name, slug, blocks) { return { id: U.uid('pg'), name: name, slug: slug, seoTitle: name, seoDesc: '', blocks: blocks || [] }; }
  function page() { return S.p && (S.p.pages.filter(function (x) { return x.id === S.pageId; })[0] || S.p.pages[0]); }
  var NON_T = { file: 1, end: 1, href: 1, src: 1, icon: 1, id: 1, anchor: 1, style: 1, kind: 1, url: 1, formAction: 1, start: 1 };
  function L() { return S.ui.lang || 'ru'; }
  function getV(b, path) { if (L() === 'ru') return getPath(b.d, path); var o = b.t && b.t[L()]; return o && o[path] != null ? o[path] : undefined; }
  function setV(b, path, v) {
    if (L() === 'ru') { setPath(b.d, path, v); return; }
    b.t = b.t || {}; b.t[L()] = b.t[L()] || {};
    if (v === '' || v == null) delete b.t[L()][path]; else b.t[L()][path] = v;
  }
  function langable(path, val) { var k = path.split('.').pop(); return typeof val === 'string' && (!NON_T[k] || k === 'src' || k === 'href' || k === 'file'); }
  function panelData(b) {
    if (L() === 'ru') return b.d;
    var d = clone(b.d || {}), o = (b.t && b.t[L()]) || {};
    Object.keys(U.transPaths(b.d)).forEach(function (p) { setPath(d, p, o[p] || ''); });
    Object.keys(o).forEach(function (p) { if (/(^|\.)(src|href)$/.test(p)) setPath(d, p, o[p]); });
    return d;
  }
  function langName(l) { return { ru: 'RU', uz: 'UZ', en: 'EN' }[l]; }
  function pageMissing(pg, l) { return pg.blocks.reduce(function (n, b) { return n + U.missing(b, l).length; }, 0); }
  function blockById(id) { var pg = page(); return pg && pg.blocks.filter(function (b) { return b.id === id; })[0]; }
  function blockIndex(id) { var pg = page(); for (var i = 0; i < pg.blocks.length; i++) if (pg.blocks[i].id === id) return i; return -1; }
  function homePage(p) { p = p || S.p; return p.pages.filter(function (x) { return x.slug === 'index'; })[0] || p.pages[0]; }
  function fileOf(pg, p) { return (pg === homePage(p) ? 'index' : (pg.slug || 'page')) + '.html'; }
  function fmtDate(t) { try { return new Date(t).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
  function plural(n, a, b, c) { var m = n % 10, h = n % 100; return n + ' ' + (m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 10 || h >= 20) ? b : c); }

  function toast(msg, action) {
    var t = document.getElementById('toast');
    t.innerHTML = esc(msg) + (action ? ' <button class="btn btn--s" style="margin-left:10px;background:#F4F4F5;color:#18181B" id="toast-a">' + esc(action.label) + '</button>' : '');
    t.classList.add('is-on'); t.style.pointerEvents = action ? 'auto' : 'none';
    if (action) document.getElementById('toast-a').onclick = function () { action.fn(); t.classList.remove('is-on'); };
    clearTimeout(t._t); t._t = setTimeout(function () { t.classList.remove('is-on'); }, action ? 6000 : 2600);
  }
  function confirmDlg(title, text, ok, extraHTML) {
    return new Promise(function (res) {
      var d = document.getElementById('dlg');
      document.getElementById('dlg-t').textContent = title;
      document.getElementById('dlg-p').textContent = text || '';
      document.getElementById('dlg-x').innerHTML = extraHTML || '';
      var okb = document.getElementById('dlg-ok'); okb.textContent = ok || 'Ок';
      okb.className = 'btn ' + (/Удалить/.test(ok) ? 'btn--danger' : 'btn--primary');
      d.onclose = function () { var inp = d.querySelector('#dlg-x input'); res(d.returnValue === 'ok' ? (inp ? inp.value : true) : false); };
      d.showModal();
      var inp = d.querySelector('#dlg-x input'); if (inp) { inp.focus(); inp.select(); }
    });
  }

  /* ---------- сохранение и история ---------- */
  function touch(opts) {
    opts = opts || {};
    if (!S.p) return;
    S.p.updated = now();
    var snap = JSON.stringify(S.p);
    if (S.lastSnap && snap !== S.lastSnap) {
      if (now() - S.histT > 800 || opts.hard) { S.hist.push(S.lastSnap); if (S.hist.length > 80) S.hist.shift(); S.fut = []; }
      S.histT = now();
    }
    S.lastSnap = snap;
    setStatus('Сохраняю…');
    clearTimeout(S.saveT); S.saveT = setTimeout(save, 400);
    if (!opts.noPreview) renderPreview();
    if (!opts.noPanels) { renderLeft(); renderRight(); }
    renderBarState();
  }
  function save() {
    if (!S.p) return Promise.resolve();
    var p = S.p;
    return DB.put(JSON.parse(JSON.stringify(p))).then(function () {
      var i = S.projects.findIndex(function (x) { return x.id === p.id; });
      if (i >= 0) S.projects[i] = p; else S.projects.push(p);
      setStatus('Сохранено');
    }).catch(function (e) { setStatus('Не сохранено: ' + (e && e.name === 'QuotaExceededError' ? 'нет места в браузере' : 'ошибка'), true); });
  }
  function setStatus(t, err) { S.status = t; var el = document.getElementById('st'); if (el) { el.textContent = t; el.classList.toggle('is-err', !!err); } }
  function undo() { if (!S.hist.length) return; S.fut.push(JSON.stringify(S.p)); restore(S.hist.pop()); }
  function redo() { if (!S.fut.length) return; S.hist.push(JSON.stringify(S.p)); restore(S.fut.pop()); }
  function restore(snap) {
    S.p = JSON.parse(snap); S.lastSnap = snap;
    if (!S.p.pages.some(function (x) { return x.id === S.pageId; })) S.pageId = S.p.pages[0].id;
    if (S.sel && !blockById(S.sel)) S.sel = null;
    renderEditor(); clearTimeout(S.saveT); S.saveT = setTimeout(save, 200);
  }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden' && S.p) { clearTimeout(S.saveT); save(); } });

  /* ---------- изображения ---------- */
  function imgURL(ref) {
    if (!ref) return '';
    if (ref.indexOf('lib:') === 0) return BASE + 'site/lib/' + ref.slice(4);
    if (ref.indexOf('up:') === 0) {
      var id = ref.slice(3), a = S.p && S.p.assets[id];
      if (!a) return '';
      if (!blobCache[id]) { try { blobCache[id] = URL.createObjectURL(dataToBlob(a.data)); } catch (e) { return a.data; } }
      return blobCache[id];
    }
    return ref;
  }
  function dataToBlob(data) {
    var m = /^data:([^;,]+)(;base64)?,(.*)$/.exec(data);
    var bytes = m[2] ? Uint8Array.from(atob(m[3]), function (c) { return c.charCodeAt(0); }) : new TextEncoder().encode(decodeURIComponent(m[3]));
    return new Blob([bytes], { type: m[1] });
  }
  function readFile(file, as) { return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(r.result); }; r.onerror = rej; r[as || 'readAsDataURL'](file); }); }
  function processImage(file) {
    if (/svg/.test(file.type)) return readFile(file).then(function (d) { return { data: d, type: 'image/svg+xml', w: 0, h: 0, alpha: true }; });
    return readFile(file).then(function (src) {
      return new Promise(function (res, rej) {
        var im = new Image();
        im.onload = function () {
          var max = 2400, w = im.naturalWidth, h = im.naturalHeight, k = Math.min(1, max / Math.max(w, h));
          var c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
          var cx = c.getContext('2d'); cx.drawImage(im, 0, 0, c.width, c.height);
          var alpha = false;
          try { var px = cx.getImageData(0, 0, c.width, c.height).data, step = Math.max(4, Math.floor(px.length / 4 / 4000)) * 4; for (var q = 3; q < px.length; q += step) if (px[q] < 250) { alpha = true; break; } } catch (e) { }
          if (k === 1 && file.size < 600000) return res({ data: src, type: file.type, w: w, h: h, alpha: alpha });
          var d = c.toDataURL('image/webp', 0.86);
          if (d.indexOf('data:image/webp') !== 0) d = c.toDataURL('image/jpeg', 0.88);
          res({ data: d, type: /webp/.test(d.slice(0, 20)) ? 'image/webp' : 'image/jpeg', w: c.width, h: c.height, alpha: alpha && /webp/.test(d.slice(0, 20)) });
        };
        im.onerror = function () { rej(new Error('Не удалось прочитать изображение')); };
        im.src = src;
      });
    });
  }

  /* ---------- контекст рендера ---------- */
  function editCtx(pg, edit) {
    return {
      edit: edit, h1: false, img: imgURL, lang: L(), asset: assetInfo,
      href: function (h) { return h || '#'; },
      isCurrent: function (h) { return h === 'page:' + pg.id; },
      homeHref: function () { return 'page:' + homePage().id; },
      tabSel: function (id) { return S.ui.tabSel[id] || 0; },
      faqOpen: function (k, def) { return S.ui.faqOpen[k] === undefined ? def : S.ui.faqOpen[k]; }
    };
  }

  /* ================= ЭКРАН «ПРОЕКТЫ» ================= */
  function renderProjects() {
    S.p = null; S.doc = null;
    var list = S.projects.slice().sort(function (a, b) { return b.updated - a.updated; });
    var cards = list.map(function (p) {
      var first = (p.pages[0] && p.pages[0].blocks) || [];
      var hero = first.some(function (b) { return b.type === 'hero' && (b.v || {}).bg !== 'white'; });
      return '<article class="pj"><button class="pj__thumb" data-act="open" data-id="' + p.id + '" aria-label="Открыть ' + esc(p.name) + '"><span class="' + (hero ? '' : 'w') + '"></span></button>' +
        '<div><h2 class="pj__name">' + esc(p.name) + '</h2><p class="pj__meta">' + plural(p.pages.length, 'страница', 'страницы', 'страниц') + ' · изменён ' + esc(fmtDate(p.updated)) + '</p></div>' +
        '<div class="pj__row"><button class="btn btn--primary" data-act="open" data-id="' + p.id + '">Открыть</button>' +
        '<button class="ibtn" data-act="rename" data-id="' + p.id + '" aria-label="Переименовать" title="Переименовать">' + ui('pencil') + '</button>' +
        '<button class="ibtn" data-act="dup" data-id="' + p.id + '" aria-label="Дублировать" title="Дублировать">' + ui('copy') + '</button>' +
        '<button class="ibtn" data-act="json" data-id="' + p.id + '" aria-label="Скачать JSON" title="Скачать JSON">' + ui('download') + '</button>' +
        '<button class="ibtn ibtn--danger" data-act="del" data-id="' + p.id + '" aria-label="Удалить" title="Удалить">' + ui('trash') + '</button></div></article>';
    }).join('');
    $app.innerHTML = '<header class="top"><img class="top__logo" src="site/lib/logo-white.svg" alt="Uzum Bank"><span class="top__title">Конструктор страниц</span></header>' +
      '<main class="wrap"><div class="pj-head"><h1 class="h1">Ваши проекты</h1><div class="pj-actions"><label class="btn btn--l">' + ui('upload') + 'Импорт JSON<input type="file" accept="application/json,.json" class="sr" data-act="import"></label></div></div>' +
      '<h2 class="h2" style="margin-bottom:14px">Создать</h2><div class="tpl-row">' +
      '<button class="tpl" data-act="new-home"><span class="tpl__ic tpl__ic--p">' + ui('home') + '</span><span><b>Главная uzumbank.uz</b><small>Шаблон и тестовая страница, RU · UZ · EN</small></span></button>' +
      '<button class="tpl" data-act="new-tpl"><span class="tpl__ic">' + ui('card') + '</span><span><b>Страница карты Uzum</b><small>uzumbank.uz/ru/card из 9 блоков</small></span></button>' +
      '<button class="tpl" data-act="new-empty"><span class="tpl__ic">' + ui('plus') + '</span><span><b>Пустой проект</b><small>Одна пустая страница</small></span></button>' +
      '<button class="tpl" data-act="new-starter"><span class="tpl__ic">' + ui('file') + '</span><span><b>Шапка, первый экран и подвал</b><small>Заготовка для новой страницы</small></span></button></div>' +
      (cards ? '<h2 class="h2" style="margin-bottom:14px">Сохранённые</h2><div class="pj-grid">' + cards + '</div>' : '<div class="empty"><h2 class="h2">Начните с первого проекта</h2><p class="pj__meta">Проекты сохраняются в этом браузере автоматически. Чтобы перенести проект в другой браузер, скачайте его JSON и импортируйте там.</p></div>') +
      '</main>';
  }
  function createProject(kind) {
    var p;
    if (kind === 'home') { var th = U.homeTemplate(); p = newProject('Сайт Uzum Bank', [newPage('Главная', 'index', th.blocks)]); p.pages[0].seoTitle = th.seoTitle; p.pages[0].seoDesc = th.seoDesc; p.pages[0].i18n = th.i18n; }
    else if (kind === 'tpl') { var t = U.cardTemplate(); p = newProject('Карта Uzum', [newPage(t.name, 'index', t.blocks)]); p.pages[0].seoTitle = t.seoTitle; p.pages[0].seoDesc = t.seoDesc; }
    else if (kind === 'starter') { p = newProject('Новый сайт', [newPage('Главная', 'index', [U.makeBlock('header'), U.makeBlock('hero'), U.makeBlock('footer')])]); }
    else p = newProject('Новый проект');
    S.projects.push(p);
    DB.put(p).then(function () { location.hash = '#/p/' + p.id; });
  }
  function exportJSON(p) {
    var data = JSON.stringify({ format: 'uzum-builder', version: 1, exported: new Date().toISOString(), project: p });
    download(new Blob([data], { type: 'application/json' }), slugify(p.name) + '.uzum.json');
  }
  function importJSON(file) {
    readFile(file, 'readAsText').then(function (t) {
      var j = JSON.parse(t), p = j.project || j;
      if (!p || !Array.isArray(p.pages)) throw new Error('В файле нет проекта конструктора');
      p.id = U.uid('p'); p.updated = now(); p.assets = p.assets || {}; p.settings = p.settings || { brandFonts: true };
      if (S.projects.some(function (x) { return x.name === p.name; })) p.name += ' (импорт)';
      p.pages.forEach(function (pg) { pg.blocks = (pg.blocks || []).filter(function (b) { return B[b.type]; }); });
      S.projects.push(p);
      return DB.put(p).then(function () { toast('Проект «' + p.name + '» импортирован'); renderProjects(); });
    }).catch(function (e) { toast('Не удалось импортировать: ' + e.message); });
  }

  /* ================= РЕДАКТОР ================= */
  function openEditor(id, sub) {
    var p = S.projects.filter(function (x) { return x.id === id; })[0];
    if (!p) { location.hash = '#/'; return; }
    S.p = p; S.hist = []; S.fut = []; S.lastSnap = JSON.stringify(p); S.sel = null; S.ui.insertAt = null;
    if (!S.pageId || !p.pages.some(function (x) { return x.id === S.pageId; })) S.pageId = p.pages[0].id;
    DB.setMeta('last', p.id);
    if (sub === 'export') return renderExport();
    renderEditor();
  }
  function renderEditor() {
    if (!S.ui.vpSet) { S.ui.vpSet = true; if (window.innerWidth < 720) S.ui.vp = 390; else if (window.innerWidth < 1180) S.ui.vp = 768; }
    var vp = VPS.map(function (v) { return '<button type="button" data-act="vp" data-vp="' + v[0] + '" aria-pressed="' + (S.ui.vp === v[0]) + '" title="' + v[1] + ' — ' + v[0] + ' px">' + ui(v[2]) + '<span>' + v[0] + '</span></button>'; }).join('');
    $app.innerHTML = '<div class="ed" id="ed">' +
      '<header class="bar"><a class="ibtn" href="#/" aria-label="К проектам" title="К проектам">' + ui('back') + '</a>' +
      '<input class="bar__name" id="pname" value="' + esc(S.p.name) + '" aria-label="Название проекта">' +
      '<select class="inp bar__page" id="psel" aria-label="Страница"></select>' +
      '<div class="bar__mid"><div class="vp" role="group" aria-label="Ширина предпросмотра">' + vp + '</div>' +
      '<div class="seg" id="langseg" role="group" aria-label="Язык страницы"></div>' +
      '<div class="seg bar__wide" role="group" aria-label="Режим"><button type="button" data-act="mode" data-mode="edit" aria-pressed="' + (S.ui.mode === 'edit') + '">Правка</button><button type="button" data-act="mode" data-mode="preview" aria-pressed="' + (S.ui.mode === 'preview') + '">Просмотр</button></div></div>' +
      '<button class="ibtn mnav-in" data-act="panel" data-panel="l" aria-label="Блоки и страницы" title="Блоки и страницы">' + ui('blocks') + '</button>' +
      '<button class="ibtn mnav-in" data-act="panel" data-panel="r" aria-label="Настройки" title="Настройки">' + ui('sliders') + '</button>' +
      '<button class="ibtn bar__wide" data-act="imghelp" aria-label="Как готовить картинки" title="Как готовить картинки">' + ui('image') + '</button>' +
      '<button class="ibtn bar__wide" data-act="undo" id="b-undo" aria-label="Отменить" title="Отменить (Ctrl+Z)">' + ui('undo') + '</button>' +
      '<button class="ibtn bar__wide" data-act="redo" id="b-redo" aria-label="Повторить" title="Повторить (Ctrl+Shift+Z)">' + ui('redo') + '</button>' +
      '<span class="bar__status bar__wide" id="st" role="status">' + esc(S.status) + '</span>' +
      '<a class="btn btn--primary" href="#/p/' + S.p.id + '/export" aria-label="Скачать вёрстку">' + ui('download') + '<span class="btn-txt" aria-hidden="true">Скачать вёрстку</span></a></header>' +
      '<div class="body"><aside class="pane pane--l" id="left" aria-label="Блоки, структура и страницы"></aside>' +
      '<div class="stage" id="stage"><div id="fwrap" style="position:relative"><div class="frame" id="frame"><iframe id="pv" title="Предпросмотр страницы"></iframe></div></div></div>' +
      '<aside class="pane pane--r" id="right" aria-label="Настройки"></aside></div>' +
      '<nav class="mnav mnav-b" aria-label="Панели"><button class="btn" data-act="panel" data-panel="l">' + ui('blocks') + 'Блоки</button><button class="btn" data-act="panel" data-panel="">Страница</button><button class="btn" data-act="panel" data-panel="r">' + ui('sliders') + 'Настройки</button></nav></div>';
    setupFrame();
    renderBarState(); renderLeft(); renderRight();
  }
  function renderBarState() {
    var sel = document.getElementById('psel');
    if (sel) sel.innerHTML = S.p.pages.map(function (pg) { return '<option value="' + pg.id + '"' + (pg.id === S.pageId ? ' selected' : '') + '>' + esc(pg.name) + '</option>'; }).join('');
    var ls = document.getElementById('langseg');
    if (ls) ls.innerHTML = U.LANGS.map(function (l) { var n = l[0] === 'ru' ? 0 : pageMissing(page(), l[0]); return '<button type="button" data-act="lang" data-lang="' + l[0] + '" aria-pressed="' + (L() === l[0]) + '" title="' + l[1] + (n ? ' — без перевода: ' + n : '') + '">' + l[2] + (n ? '<span class="lcount">' + n + '</span>' : '') + '</button>'; }).join('');
    var u = document.getElementById('b-undo'), r = document.getElementById('b-redo');
    if (u) u.disabled = !S.hist.length; if (r) r.disabled = !S.fut.length;
  }
  function setPanel(p) { var ed = document.getElementById('ed'); if (ed) { if (p) ed.setAttribute('data-panel', p); else ed.removeAttribute('data-panel'); } }

  /* ---------- предпросмотр ---------- */
  var ED_CSS = '.ed-sec{position:relative}.ed-sec:hover{outline:2px dashed rgba(37,99,235,.45);outline-offset:-2px}.ed-sec.is-sel{outline:2px solid #2563EB;outline-offset:-2px}' +
    '.ed-ins{position:relative;height:0;z-index:15}.ed-ins::before{content:"";position:absolute;left:0;right:0;top:-14px;height:28px}.ed-ins button{position:absolute;left:50%;top:-16px;margin-left:-16px;width:32px;height:32px;border-radius:16px;border:0;background:#2563EB;color:#fff;font:600 20px/32px Arial,sans-serif;opacity:0;cursor:pointer;box-shadow:0 6px 16px -6px rgba(0,0,0,.35);transition:opacity .15s}' +
    '.ed-ins:hover button,.ed-ins.is-target button,.is-drag .ed-ins button{opacity:1}.ed-ins.is-target::after,.ed-ins.is-over::after{content:"";position:absolute;left:24px;right:24px;top:-2px;height:4px;border-radius:2px;background:#2563EB}.is-drag .ed-ins::before{top:-24px;height:48px}.ed-ins--last{height:48px}.ed-ins--last button{top:8px;opacity:.6}' +
    '.ed-sec:not(.is-sel) [data-f]:empty:not(:focus),.ed-sec:not(.is-sel) .u-note:has(> [data-f]:empty){display:none}[data-f]{outline:none;cursor:text;border-radius:4px;transition:box-shadow .12s}[data-f]:hover{box-shadow:0 0 0 2px rgba(37,99,235,.25)}[data-f]:focus{box-shadow:0 0 0 2px #2563EB}[data-f]:empty::before{content:attr(data-ph);color:rgba(32,32,32,.35);pointer-events:none}.u-plate--purple [data-f]:empty::before,.u-footer [data-f]:empty::before{color:rgba(255,255,255,.5)}' +
    '.ed-imgph{display:flex;align-items:center;justify-content:center;min-height:140px;width:100%;border:2px dashed #93B4F5;border-radius:16px;color:#2563EB;font:600 14px system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;background:rgba(238,243,255,.7)}' +
    '.ed-chip{position:absolute;top:0;left:0;z-index:16;display:flex;align-items:center;gap:2px;padding:2px 2px 2px 10px;border-radius:0 0 6px 0;background:#2563EB;color:#fff;font:600 12px system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;box-shadow:0 6px 16px -6px rgba(0,0,0,.35)}.ed-chip button{width:26px;height:26px;border:0;border-radius:13px;background:transparent;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center}.ed-chip button:hover{background:rgba(255,255,255,.2)}.ed-chip svg{width:16px;height:16px}' +
    '.ed-tb{position:absolute;z-index:60;display:none;align-items:center;gap:2px;padding:4px;border-radius:14px;background:#202020;color:#fff;box-shadow:0 12px 32px -8px rgba(0,0,0,.4);font:600 12px system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}.ed-tb.is-on{display:flex}.ed-tb button{width:30px;height:30px;border:0;border-radius:9px;background:transparent;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center}.ed-tb button:hover,.ed-tb button[aria-pressed=true]{background:rgba(255,255,255,.18)}.ed-tb svg{width:17px;height:17px}.ed-tb i{width:1px;height:18px;background:rgba(255,255,255,.2);margin:0 3px}.ed-tb input{height:28px;border:0;border-radius:8px;padding:0 8px;font:13px Roboto,Arial,sans-serif;color:#202020}.ed-tb label{display:flex;align-items:center;gap:6px;padding:0 4px}.ed-tb .w48{width:52px}.ed-tb .w220{width:220px}' +
    '.u-faq__i:not(.is-open):not([open]) .u-faq__a{display:none}.u-faq__i.is-open .u-faq__pm::after{transform:rotate(0)}.ed-miss{outline:2px dashed rgba(245,158,11,.95)!important;outline-offset:3px}.ed-miss:focus{outline-style:solid!important}.ed-faq-q{cursor:default}.ed-faq-q .u-faq__pm{cursor:pointer}.ed-empty{max-width:560px;margin:80px auto;padding:32px;border-radius:12px;border:2px dashed #A1A1AA;background:#fff;text-align:center;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}.ed-empty h2{margin:0 0 8px;font:500 22px system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}.ed-empty p{margin:0 0 20px;color:#6E6E7A}';

  function setupFrame() {
    var ifr = document.getElementById('pv');
    S.frame = ifr;
    var doc = ifr.contentDocument;
    doc.open();
    doc.write('<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><base href="' + BASE + 'site/"><link rel="stylesheet" href="chrome.css"><link rel="stylesheet" href="site.css"><style>' + ED_CSS + '</style></head><body class="u-body"></body></html>');
    doc.close();
    var sc = doc.createElement('script'); sc.src = BASE + 'site/site.js'; doc.head.appendChild(sc);
    try { doc.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) { }
    S.doc = doc;
    var tb = doc.createElement('div'); tb.className = 'ed-tb'; tb.id = 'ed-tb'; doc.documentElement.appendChild(tb);
    bindFrame(doc);
    fitFrame(); renderPreview();
    window.onresize = fitFrame;
  }
  function fitFrame() {
    var st = document.getElementById('stage'), fr = document.getElementById('frame'), wr = document.getElementById('fwrap');
    if (!st || !fr) return;
    var vw = S.ui.vp, avail = st.clientWidth - 48, s = Math.min(1, avail / vw);
    var h = (st.clientHeight - 48) / s;
    fr.style.width = vw + 'px'; fr.style.height = h + 'px'; fr.style.transform = 'scale(' + s + ')'; fr.style.transformOrigin = 'top left';
    wr.style.width = (vw * s) + 'px'; wr.style.height = (h * s) + 'px';
  }
  function renderPreview() {
    var doc = S.doc; if (!doc || !doc.body) return;
    var pg = page(), edit = S.ui.mode === 'edit';
    var y = doc.scrollingElement ? doc.scrollingElement.scrollTop : 0;
    var view = L() === 'ru' ? pg.blocks : pg.blocks.map(function (b) { return { id: b.id, type: b.type, v: b.v, d: U.dataFor(b, L()) }; });
    doc.documentElement.lang = L();
    var html = pg.blocks.length ? U.renderBlocks(view, editCtx(pg, edit)) : (edit ? '<div class="ed-empty"><h2>Пустая страница</h2><p>Добавьте блоки из каталога слева или начните с готового набора.</p><button data-ed="starter" type="button" style="min-height:36px;padding:0 14px;border:0;border-radius:8px;background:#2563EB;color:#fff;font:600 14px system-ui,sans-serif;cursor:pointer">Шапка, первый экран и подвал</button></div><div class="ed-ins ed-ins--last" data-ins="0"><button type="button" aria-label="Вставить блок">+</button></div>' : '');
    doc.body.innerHTML = html;
    if (edit) decorate(doc);
    if (doc.scrollingElement) doc.scrollingElement.scrollTop = y;
    hideToolbar();
  }
  function decorate(doc) {
    Array.prototype.forEach.call(doc.querySelectorAll('[data-f]'), function (el) {
      var t = el.getAttribute('data-ft');
      el.setAttribute('contenteditable', t === 'text' ? 'plaintext-only' : 'true');
      el.setAttribute('spellcheck', 'true');
      if (!el.getAttribute('data-ph')) el.setAttribute('data-ph', phFor(el.getAttribute('data-f')));
    });
    Array.prototype.forEach.call(doc.querySelectorAll('.u-plate--purple .u-plate, .u-tabpanel'), function () { });
    if (L() !== 'ru') {
      Array.prototype.forEach.call(doc.querySelectorAll('.ed-sec'), function (sec) {
        var b = blockById(sec.getAttribute('data-b')); if (!b) return;
        var miss = {}; U.missing(b, L()).forEach(function (p) { miss[p] = 1; });
        Array.prototype.forEach.call(sec.querySelectorAll('[data-f]'), function (el) { if (miss[el.getAttribute('data-f')]) { el.classList.add('ed-miss'); el.title = 'Нет перевода на ' + langName(L()) + ': показан русский текст'; } });
      });
    }
    if (S.ui.insertAt != null) { var ins = doc.querySelector('[data-ins="' + S.ui.insertAt + '"]'); if (ins) ins.classList.add('is-target'); }
    markSelected();
  }
  function phFor(path) {
    var k = path.split('.').pop();
    return { title: 'Заголовок', eyebrow: 'Надзаголовок', lead: 'Подзаголовок', text: 'Текст', note: 'Сноска', caption: 'Подпись', label: 'Текст кнопки', q: 'Вопрос', a: 'Ответ', body: 'Текст', author: 'Автор', role: 'Должность', value: 'Число', qrText: 'Подпись' }[k] || 'Текст';
  }
  function markSelected() {
    var doc = S.doc; if (!doc) return;
    Array.prototype.forEach.call(doc.querySelectorAll('.ed-sec.is-sel'), function (s) { s.classList.remove('is-sel'); });
    Array.prototype.forEach.call(doc.querySelectorAll('.ed-chip'), function (c) { c.remove(); });
    if (!S.sel) return;
    var sec = doc.querySelector('.ed-sec[data-b="' + S.sel + '"]');
    if (!sec) return;
    sec.classList.add('is-sel');
    var b = blockById(S.sel), i = blockIndex(S.sel), n = page().blocks.length;
    var chip = doc.createElement('div'); chip.className = 'ed-chip';
    chip.innerHTML = '<span>' + esc(blockName(b)) + '</span><button type="button" data-ed="up" title="Выше" aria-label="Выше"' + (i === 0 ? ' disabled' : '') + '>' + ui('arrow-up') + '</button><button type="button" data-ed="down" title="Ниже" aria-label="Ниже"' + (i === n - 1 ? ' disabled' : '') + '>' + ui('arrow-down') + '</button><button type="button" data-ed="dup" title="Дублировать" aria-label="Дублировать">' + ui('copy') + '</button><button type="button" data-ed="del" title="Удалить" aria-label="Удалить">' + ui('trash') + '</button>';
    sec.appendChild(chip);
  }
  function blockName(b) { var e = U.CATALOG.filter(function (c) { return c.type === b.type && c.v && Object.keys(c.v).every(function (k) { return b.v[k] === c.v[k]; }) && c.name; })[0]; return (e && e.name) || B[b.type].name; }
  function select(id, scroll) {
    S.sel = id; S.ui.insertAt = null;
    if (S.doc) { Array.prototype.forEach.call(S.doc.querySelectorAll('.ed-ins.is-target'), function (x) { x.classList.remove('is-target'); }); markSelected(); }
    renderLeft(); renderRight();
    if (scroll && S.doc) { var sec = S.doc.querySelector('.ed-sec[data-b="' + id + '"]'); if (sec) sec.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    if (id && window.innerWidth <= 1180) setPanel('r');
  }

  /* ---------- события в предпросмотре ---------- */
  function bindFrame(doc) {
    doc.addEventListener('click', function (e) {
      var t = e.target;
      if (t.closest('.ed-tb')) return;
      var a = t.closest('a[href]');
      if (S.ui.mode === 'preview') {
        if (a) {
          var h = a.getAttribute('href');
          if (h.indexOf('page:') === 0) { e.preventDefault(); var pid = h.slice(5); if (S.p.pages.some(function (x) { return x.id === pid; })) { S.pageId = pid; renderBarState(); renderLeft(); renderRight(); renderPreview(); } }
          else if (h.charAt(0) !== '#') { e.preventDefault(); toast('Внешние ссылки откроются в готовом сайте'); }
        }
        return;
      }
      var ed = t.closest('[data-ed]');
      if (ed) { e.preventDefault(); e.stopPropagation(); var act = ed.getAttribute('data-ed'); if (act === 'starter') { page().blocks = [U.makeBlock('header'), U.makeBlock('hero'), U.makeBlock('footer')]; touch(); } else blockAct(act, S.sel); return; }
      var ins = t.closest('.ed-ins');
      if (ins) { e.preventDefault(); setInsert(+ins.getAttribute('data-ins')); return; }
      if (a) e.preventDefault();
      var inField = t.closest('[data-f]');
      if (inField) e.stopPropagation();
      var tabb = t.closest('[data-tabi]');
      if (tabb) { var secT = tabb.closest('.ed-sec'); S.ui.tabSel[secT.getAttribute('data-b')] = +tabb.getAttribute('data-tabi'); e.stopPropagation(); S.sel = secT.getAttribute('data-b'); renderPreview(); renderRight(); renderLeft(); return; }
      var q = t.closest('.ed-faq-q');
      if (q && !inField) { var secF = q.closest('.ed-sec'), k = secF.getAttribute('data-b') + ':' + q.getAttribute('data-faq'); var det = q.closest('.u-faq__i'), on = !det.classList.contains('is-open'); S.ui.faqOpen[k] = on; det.classList.toggle('is-open', on); return; }
      if (t.closest('.u-flip') && inField) return;
      if (t.closest('.u-burger')) return;
      var sec = t.closest('.ed-sec');
      if (sec && sec.getAttribute('data-b') !== S.sel) select(sec.getAttribute('data-b'));
      if (!sec) { S.sel = null; markSelected(); renderRight(); renderLeft(); }
      if (t.closest('.ed-imgph, img') && sec && !inField) { renderRight(); focusImageField(); }
    }, true);
    doc.addEventListener('submit', function (e) { e.preventDefault(); }, true);
    doc.addEventListener('focusin', function (e) {
      var el = e.target.closest && e.target.closest('[data-f]');
      if (!el) return;
      var sec = el.closest('.ed-sec');
      if (sec && sec.getAttribute('data-b') !== S.sel) { S.sel = sec.getAttribute('data-b'); markSelected(); renderLeft(); renderRight(); }
      var t = el.getAttribute('data-ft');
      if (t !== 'text') showToolbar(el); else hideToolbar();
    });
    doc.addEventListener('focusout', function (e) {
      var el = e.target.closest && e.target.closest('[data-f]');
      if (!el) return;
      commit(el, true);
      setTimeout(function () { var ae = doc.activeElement; if (!ae || !(ae.closest && (ae.closest('.ed-tb') || ae.closest('[data-f]')))) hideToolbar(); }, 0);
    });
    var it = 0;
    doc.addEventListener('input', function (e) {
      var el = e.target.closest && e.target.closest('[data-f]');
      if (!el) return;
      el._typed = true;
      clearTimeout(it); it = setTimeout(function () { commit(el, false); }, 250);
      positionToolbar();
    });
    doc.addEventListener('keydown', onKey);
    doc.addEventListener('paste', onPaste);
    doc.addEventListener('selectionchange', function () { if (TB.host) updateToolbar(); });
    doc.addEventListener('scroll', positionToolbar);
    doc.addEventListener('dragover', function (e) {
      if (!S.dragEntry) return;
      var ins = e.target.closest && e.target.closest('.ed-ins');
      Array.prototype.forEach.call(doc.querySelectorAll('.ed-ins.is-over'), function (x) { if (x !== ins) x.classList.remove('is-over'); });
      if (ins) { e.preventDefault(); ins.classList.add('is-over'); }
      else { var sec = e.target.closest && e.target.closest('.ed-sec'); if (sec) { e.preventDefault(); var r = sec.getBoundingClientRect(), before = e.clientY < r.top + r.height / 2; var tgt = before ? sec.previousElementSibling : sec.nextElementSibling; if (tgt && tgt.classList.contains('ed-ins')) tgt.classList.add('is-over'); } }
    });
    doc.addEventListener('drop', function (e) {
      if (!S.dragEntry) return;
      e.preventDefault();
      var ins = doc.querySelector('.ed-ins.is-over');
      var at = ins ? +ins.getAttribute('data-ins') : page().blocks.length;
      insertBlock(S.dragEntry, at); S.dragEntry = null; doc.body.classList.remove('is-drag');
    });
    doc.addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && !e.target.closest('[data-f]')) { if (e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); } } });
  }
  function setInsert(i) {
    S.ui.insertAt = i; S.ui.left = 'blocks';
    if (S.doc) { Array.prototype.forEach.call(S.doc.querySelectorAll('.ed-ins'), function (x) { x.classList.toggle('is-target', +x.getAttribute('data-ins') === i); }); }
    renderLeft(); setPanel('l');
    var s = document.getElementById('bq'); if (s) s.focus();
  }
  function focusImageField() { setTimeout(function () { var f = document.querySelector('#right .img-f'); if (f) f.scrollIntoView({ block: 'center' }); }, 30); }

  /* ---------- запись изменений из правки на странице ---------- */
  function commit(el, final) {
    var sec = el.closest('.ed-sec'); if (!sec) return;
    var b = blockById(sec.getAttribute('data-b')); if (!b) return;
    var path = el.getAttribute('data-f'), t = el.getAttribute('data-ft'), v;
    if (t === 'text') v = el.textContent.replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
    else if (t === 'cell') {
      var c = el.cloneNode(true);
      Array.prototype.forEach.call(c.querySelectorAll('.u-tv'), function (s) { var rest = s.nextSibling; s.insertAdjacentHTML('afterend', rest ? '<br>' : ''); while (s.firstChild) s.parentNode.insertBefore(s.firstChild, s); s.parentNode.removeChild(s); });
      v = U.sanitize(c.innerHTML, 'cell');
    }
    else v = U.sanitize(el.innerHTML, t);
    var cur = getV(b, path);
    var changed = cur !== v;
    if (L() !== 'ru' && cur === undefined && v === getPath(b.d, path) && !el._typed) changed = false;
    if (changed) { setV(b, path, v); if (L() !== 'ru') el.classList.remove('ed-miss'); }
    if (b.type === 'list' && path === 'body' && L() === 'ru') {
      var m = /^<(ul|ol)(?:\s+start="(\d+)")?/i.exec(v);
      if (m) { if (b.v.kind !== m[1].toLowerCase()) { b.v.kind = m[1].toLowerCase(); changed = true; } var st = m[2] ? +m[2] : 1; if (b.v.kind === 'ol' && (+b.d.start || 1) !== st) { b.d.start = st; changed = true; } }
    }
    if (changed) touch({ noPreview: true, noPanels: true });
    if (final) {
      if (t === 'rich' || t === 'inline') { if (el.innerHTML !== v) el.innerHTML = v; }
      if (t === 'list' && b.type === 'list') { var html = U.listAs(v, b.v.kind === 'ol' ? 'ol' : 'ul', b.v.kind === 'ol' ? (+b.d.start || 1) : 0).replace(/^<(ul|ol)/, '<$1 class="u-list"'); if (el.innerHTML !== html) el.innerHTML = html; }
      if (changed) { renderLeft(); if (!document.activeElement || !document.getElementById('right').contains(document.activeElement)) renderRight(); }
    }
  }

  /* ---------- клавиатура: списки ---------- */
  function sel() { return S.doc.getSelection(); }
  function curLi(host) {
    var s = sel(); if (!s || !s.anchorNode) return null;
    var n = s.anchorNode.nodeType === 1 ? s.anchorNode : s.anchorNode.parentNode;
    var li = n.closest && n.closest('li');
    return li && host.contains(li) ? li : null;
  }
  function saveCaret() { var s = sel(); return s && s.rangeCount ? { n: s.anchorNode, o: s.anchorOffset } : null; }
  function restoreCaret(c) { if (!c || !c.n || !c.n.isConnected) return; try { sel().collapse(c.n, Math.min(c.o, c.n.nodeType === 3 ? c.n.length : c.n.childNodes.length)); } catch (e) { } }
  function liEmpty(li) { var c = li.cloneNode(true); Array.prototype.forEach.call(c.querySelectorAll('ul,ol'), function (l) { l.remove(); }); return !c.textContent.replace(/​/g, '').trim() && !li.querySelector('ul,ol'); }
  function indent(li) {
    var prev = li.previousElementSibling; if (!prev) return false;
    var c = saveCaret(), list = li.parentNode, sub = prev.lastElementChild;
    if (!sub || !/^(UL|OL)$/.test(sub.nodeName)) { sub = S.doc.createElement(list.nodeName.toLowerCase()); prev.appendChild(sub); }
    sub.appendChild(li); restoreCaret(c); return true;
  }
  function outdent(li) {
    var list = li.parentNode, parentLi = list.parentNode;
    if (!parentLi || parentLi.nodeName !== 'LI') return false;
    var c = saveCaret();
    var rest = []; var n = li.nextElementSibling; while (n) { rest.push(n); n = n.nextElementSibling; }
    if (rest.length) { var sub = li.querySelector(':scope > ul, :scope > ol'); if (!sub) { sub = S.doc.createElement(list.nodeName.toLowerCase()); li.appendChild(sub); } rest.forEach(function (r) { sub.appendChild(r); }); }
    parentLi.parentNode.insertBefore(li, parentLi.nextSibling);
    if (!list.children.length) list.remove();
    restoreCaret(c); return true;
  }
  function moveLi(li, dir) {
    var c = saveCaret();
    if (dir < 0 && li.previousElementSibling) li.parentNode.insertBefore(li, li.previousElementSibling);
    else if (dir > 0 && li.nextElementSibling) li.parentNode.insertBefore(li.nextElementSibling, li);
    else return false;
    restoreCaret(c); return true;
  }
  function emptyEnter(li, host) {
    if (outdent(li)) return;
    var list = li.parentNode, doc = S.doc;
    var rest = []; var n = li.nextElementSibling; while (n) { rest.push(n); n = n.nextElementSibling; }
    li.remove();
    if (host.getAttribute('data-ft') === 'list') { if (!list.children.length) list.appendChild(doc.createElement('li')); host.blur(); return; }
    var p = doc.createElement('p'); p.innerHTML = '<br>';
    list.parentNode.insertBefore(p, list.nextSibling);
    if (rest.length) { var nl = doc.createElement(list.nodeName.toLowerCase()); rest.forEach(function (r) { nl.appendChild(r); }); if (list.nodeName === 'OL') nl.setAttribute('start', (+(list.getAttribute('start') || 1)) + list.children.length); p.parentNode.insertBefore(nl, p.nextSibling); }
    if (!list.children.length) list.remove();
    sel().collapse(p, 0);
  }
  function onKey(e) {
    var host = e.target.closest && e.target.closest('[data-f]'); if (!host) return;
    var t = host.getAttribute('data-ft');
    if (t === 'text') { if (e.key === 'Enter') { e.preventDefault(); host.blur(); } if (e.key === 'Escape') host.blur(); return; }
    if (e.key === 'Escape') { host.blur(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); tbAction('link'); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); commit(host, true); host.blur(); e.shiftKey ? redo() : undo(); return; }
    if (t === 'inline' || t === 'cell') { if (e.key === 'Enter') { e.preventDefault(); if (e.shiftKey) S.doc.execCommand('insertLineBreak'); else host.blur(); } return; }
    var li = curLi(host);
    if (e.key === 'Tab' && li) { e.preventDefault(); if (e.shiftKey) outdent(li); else indent(li); commit(host, false); updateToolbar(); return; }
    if (e.key === 'Enter' && !e.shiftKey && li && liEmpty(li)) { e.preventDefault(); emptyEnter(li, host); commit(host, false); updateToolbar(); return; }
    if (e.altKey && e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && li) { e.preventDefault(); moveLi(li, e.key === 'ArrowUp' ? -1 : 1); commit(host, false); return; }
  }
  function onPaste(e) {
    var host = e.target.closest && e.target.closest('[data-f]'); if (!host) return;
    e.preventDefault();
    var cd = e.clipboardData, html = cd.getData('text/html'), text = cd.getData('text/plain'), t = host.getAttribute('data-ft');
    if (t === 'text') { S.doc.execCommand('insertText', false, text.replace(/\s+/g, ' ')); return; }
    var mode = t === 'list' ? 'rich' : t;
    var clean = html ? U.sanitize(html, mode) : textToHTML(text, mode);
    if (t === 'list' && !/<(ul|ol)/.test(clean)) clean = clean.replace(/<p>/g, '<li>').replace(/<\/p>/g, '</li>');
    S.doc.execCommand('insertHTML', false, clean || esc(text));
    commit(host, false);
  }
  function textToHTML(text, mode) {
    if (mode === 'inline' || mode === 'cell') return esc(text).replace(/\r?\n/g, '<br>');
    var lines = text.replace(/\r/g, '').split('\n'), out = '', list = null;
    lines.forEach(function (l) {
      var m = /^\s*([-•*–]|\d+[.)])\s+(.*)$/.exec(l);
      if (m) { var tag = /\d/.test(m[1]) ? 'ol' : 'ul'; if (list !== tag) { if (list) out += '</' + list + '>'; out += '<' + tag + '>'; list = tag; } out += '<li>' + esc(m[2]) + '</li>'; return; }
      if (list) { out += '</' + list + '>'; list = null; }
      if (l.trim()) out += '<p>' + esc(l.trim()) + '</p>';
    });
    if (list) out += '</' + list + '>';
    return out;
  }

  /* ---------- панель форматирования ---------- */
  var TB = { host: null, range: null, linkMode: false };
  function tbHTML(host) {
    var t = host.getAttribute('data-ft'), rich = t === 'rich', list = t === 'list';
    var bt = function (a, ic, title) { return '<button type="button" data-tb="' + a + '" title="' + title + '" aria-label="' + title + '">' + ui(ic) + '</button>'; };
    if (TB.linkMode) return '<label>' + ui('link') + '<input class="w220" id="tb-url" placeholder="https://… или #якорь" aria-label="Адрес ссылки"></label><select id="tb-page" aria-label="Страница проекта" style="height:28px;border:0;border-radius:8px;max-width:130px"><option value="">Страница…</option>' + S.p.pages.map(function (pg) { return '<option value="page:' + pg.id + '">' + esc(pg.name) + '</option>'; }).join('') + '</select>' + bt('link-ok', 'check', 'Применить') + bt('link-rm', 'close', 'Убрать ссылку');
    var s = bt('bold', 'bold', 'Жирный (Ctrl+B)') + bt('italic', 'italic', 'Курсив (Ctrl+I)') + bt('link', 'link', 'Ссылка (Ctrl+K)');
    if (rich) s += '<i></i>' + bt('h3', 'h', 'Подзаголовок') + bt('quote', 'quote', 'Цитата');
    if (rich || list) s += '<i></i>' + bt('ul', 'ul', 'Маркированный список') + bt('ol', 'ol', 'Нумерованный список') + bt('outdent', 'outdent', 'Уровень выше (Shift+Tab)') + bt('indent', 'indent', 'Вложить (Tab)') + bt('up', 'arrow-up', 'Пункт выше (Alt+Shift+↑)') + bt('down', 'arrow-down', 'Пункт ниже (Alt+Shift+↓)') + '<label id="tb-start" style="display:none">с №<input class="w48" type="number" min="0" id="tb-n" aria-label="Начальный номер списка"></label>';
    s += '<i></i>' + bt('clear', 'clear', 'Убрать оформление');
    return s;
  }
  function showToolbar(host) {
    var tb = S.doc.getElementById('ed-tb'); if (!tb) return;
    if (TB.host !== host) TB.linkMode = false;
    TB.host = host; tb.innerHTML = tbHTML(host); tb.classList.add('is-on');
    tb.onmousedown = function (e) { if (!e.target.closest('input,select')) e.preventDefault(); };
    tb.onclick = function (e) { var b = e.target.closest('[data-tb]'); if (b) tbAction(b.getAttribute('data-tb')); };
    var n = S.doc.getElementById('tb-n');
    if (n) n.oninput = function () { var li = curLi(TB.host) || TB.lastLi; var ol = li && li.closest('ol'); if (!ol) return; var v = parseInt(n.value, 10); if (v && v !== 1) ol.setAttribute('start', v); else ol.removeAttribute('start'); commit(TB.host, false); };
    if (n) n.onfocus = function () { TB.lastLi = curLi(TB.host) || TB.lastLi; };
    var pg = S.doc.getElementById('tb-page'); if (pg) pg.onchange = function () { S.doc.getElementById('tb-url').value = pg.value; };
    var url = S.doc.getElementById('tb-url'); if (url) { url.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); tbAction('link-ok'); } if (e.key === 'Escape') { TB.linkMode = false; showToolbar(TB.host); restoreRange(); } }; setTimeout(function () { url.focus(); var a = rangeLink(); if (a) url.value = a.getAttribute('href'); }, 0); }
    positionToolbar(); updateToolbar();
  }
  function hideToolbar() { var tb = S.doc && S.doc.getElementById('ed-tb'); if (tb) tb.classList.remove('is-on'); TB.host = null; TB.linkMode = false; }
  function positionToolbar() {
    var tb = S.doc && S.doc.getElementById('ed-tb'); if (!tb || !TB.host || !tb.classList.contains('is-on')) return;
    var r = TB.host.getBoundingClientRect(), sy = S.doc.scrollingElement.scrollTop, vw = S.doc.documentElement.clientWidth;
    var top = Math.max(r.top + sy - tb.offsetHeight - 8, sy + 8);
    if (r.bottom < 60) top = r.bottom + sy + 8;
    tb.style.top = top + 'px'; tb.style.left = Math.max(8, Math.min(r.left, vw - tb.offsetWidth - 8)) + 'px';
  }
  function updateToolbar() {
    var tb = S.doc.getElementById('ed-tb'); if (!tb || !TB.host) return;
    var li = curLi(TB.host), st = S.doc.getElementById('tb-start');
    if (li) TB.lastLi = li;
    if (st) { var ol = li && li.closest('ol'); st.style.display = ol ? 'flex' : 'none'; if (ol && S.doc.activeElement !== S.doc.getElementById('tb-n')) S.doc.getElementById('tb-n').value = ol.getAttribute('start') || 1; }
    ['bold', 'italic'].forEach(function (c) { var b = tb.querySelector('[data-tb="' + c + '"]'); if (b) { var on = false; try { on = S.doc.queryCommandState(c); } catch (e) { } b.setAttribute('aria-pressed', on); } });
    var ul = tb.querySelector('[data-tb="ul"]'), ol2 = tb.querySelector('[data-tb="ol"]');
    if (ul) ul.setAttribute('aria-pressed', !!(li && li.parentNode.nodeName === 'UL'));
    if (ol2) ol2.setAttribute('aria-pressed', !!(li && li.parentNode.nodeName === 'OL'));
  }
  function saveRange() { var s = sel(); TB.range = s && s.rangeCount ? s.getRangeAt(0).cloneRange() : null; }
  function restoreRange() { if (!TB.range) return; TB.host.focus(); var s = sel(); s.removeAllRanges(); s.addRange(TB.range); }
  function rangeLink() { if (!TB.range) return null; var n = TB.range.startContainer; n = n.nodeType === 1 ? n : n.parentNode; return n.closest && n.closest('a'); }
  function blockTag(tag) {
    var s = sel(); if (!s.anchorNode) return;
    var n = s.anchorNode.nodeType === 1 ? s.anchorNode : s.anchorNode.parentNode;
    var cur = n.closest('p,h3,h4,blockquote,li');
    S.doc.execCommand('formatBlock', false, cur && cur.nodeName.toLowerCase() === tag ? 'p' : tag);
  }
  function toggleList(tag) {
    var host = TB.host, li = curLi(host);
    if (!li) { S.doc.execCommand(tag === 'ul' ? 'insertUnorderedList' : 'insertOrderedList'); return; }
    var list = li.parentNode, c = saveCaret();
    if (list.nodeName.toLowerCase() === tag) {
      if (host.getAttribute('data-ft') === 'list') return;
      S.doc.execCommand(tag === 'ul' ? 'insertUnorderedList' : 'insertOrderedList'); return;
    }
    var nl = S.doc.createElement(tag);
    while (list.firstChild) nl.appendChild(list.firstChild);
    if (tag === 'ol' && list.getAttribute('start')) nl.setAttribute('start', list.getAttribute('start'));
    list.parentNode.replaceChild(nl, list);
    restoreCaret(c);
  }
  function tbAction(a) {
    var host = TB.host; if (!host) return;
    var li = curLi(host) || TB.lastLi;
    switch (a) {
      case 'bold': case 'italic': S.doc.execCommand(a); break;
      case 'clear': S.doc.execCommand('removeFormat'); S.doc.execCommand('unlink'); break;
      case 'link': saveRange(); TB.linkMode = true; showToolbar(host); return;
      case 'link-ok': var u = U.safeHref(S.doc.getElementById('tb-url').value); TB.linkMode = false; showToolbar(host); restoreRange(); if (u) { var al = rangeLink(); if (al) al.setAttribute('href', u); else if (!sel().isCollapsed) S.doc.execCommand('createLink', false, u); else S.doc.execCommand('insertHTML', false, '<a href="' + esc(u) + '">' + esc(u.replace(/^page:.*/, 'ссылка')) + '</a>'); } break;
      case 'link-rm': TB.linkMode = false; showToolbar(host); restoreRange(); var a2 = rangeLink(); if (a2) { while (a2.firstChild) a2.parentNode.insertBefore(a2.firstChild, a2); a2.remove(); } else S.doc.execCommand('unlink'); break;
      case 'h3': blockTag('h3'); break;
      case 'quote': blockTag('blockquote'); break;
      case 'ul': case 'ol': toggleList(a); break;
      case 'indent': if (li) indent(li); break;
      case 'outdent': if (li) outdent(li); break;
      case 'up': if (li) moveLi(li, -1); break;
      case 'down': if (li) moveLi(li, 1); break;
    }
    commit(host, false); updateToolbar(); positionToolbar();
  }

  /* ---------- операции с блоками ---------- */
  function insertBlock(entryId, at) {
    var pg = page(), b = U.makeBlock(entryId);
    if (at == null) at = S.ui.insertAt != null ? S.ui.insertAt : (S.sel ? blockIndex(S.sel) + 1 : pg.blocks.length);
    if (S.ui.insertAt == null && !S.sel) {
      if (b.type === 'header') at = 0;
      else if (b.type !== 'footer') { for (var k = pg.blocks.length - 1; k >= 0; k--) if (pg.blocks[k].type === 'footer') { at = k; break; } }
    }
    if (S.sel && S.ui.insertAt == null && b.type !== 'footer') { var si = blockIndex(S.sel); if (pg.blocks[si] && pg.blocks[si].type === 'footer') at = si; }
    pg.blocks.splice(at, 0, b);
    S.sel = b.id; S.ui.insertAt = null;
    touch({ hard: true });
    setTimeout(function () { var sec = S.doc && S.doc.querySelector('.ed-sec[data-b="' + b.id + '"]'); if (sec) sec.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 60);
    toast('Добавлен блок «' + blockName(b) + '»');
  }
  function blockAct(act, id) {
    var pg = page(), i = blockIndex(id); if (i < 0) return;
    var b = pg.blocks[i];
    if (act === 'up' && i > 0) { pg.blocks.splice(i, 1); pg.blocks.splice(i - 1, 0, b); }
    else if (act === 'down' && i < pg.blocks.length - 1) { pg.blocks.splice(i, 1); pg.blocks.splice(i + 1, 0, b); }
    else if (act === 'dup') { var c = clone(b); c.id = U.uid('s'); if (c.type === 'tabs') { (c.d.tabs || []).forEach(function (t) { t.id = (t.id || 'tab') + '-' + c.id.slice(-3); }); if (c.d.anchor) c.d.anchor += '-2'; } pg.blocks.splice(i + 1, 0, c); S.sel = c.id; }
    else if (act === 'del') { pg.blocks.splice(i, 1); S.sel = null; touch({ hard: true }); toast('Блок «' + blockName(b) + '» удалён', { label: 'Вернуть', fn: undo }); return; }
    else return;
    touch({ hard: true });
    if (act === 'up' || act === 'down') { var btn = document.querySelector('[data-oact="' + act + '"][data-id="' + id + '"]'); if (btn && !btn.disabled) btn.focus(); }
  }

  /* ---------- левая панель ---------- */
  function renderLeft() {
    var el = document.getElementById('left'); if (!el) return;
    var tab = S.ui.left, active = document.activeElement, keepId = active && active.id;
    var head = '<div class="pane__head"><div style="display:flex;align-items:center;gap:6px"><div class="tabs" role="tablist" aria-label="Левая панель" style="flex:1">' +
      [['blocks', 'Блоки'], ['outline', 'Структура'], ['pages', 'Страницы']].map(function (t) { return '<button type="button" role="tab" data-act="ltab" data-tab="' + t[0] + '" aria-selected="' + (tab === t[0]) + '">' + t[1] + '</button>'; }).join('') +
      '</div><button class="ibtn pane__close" data-act="panel" data-panel="" aria-label="Закрыть панель">' + ui('close') + '</button></div>';
    var body = '';
    if (tab === 'blocks') {
      head += '<input class="inp" id="bq" type="search" placeholder="Найти блок" aria-label="Поиск блока" value="' + esc(S.ui.q) + '">';
      if (S.ui.insertAt != null) { var pb = page().blocks[S.ui.insertAt - 1]; head += '<div class="insert-note">Вставка ' + (pb ? 'после «' + esc(blockName(pb)) + '»' : 'в начало страницы') + '<button class="ibtn" data-act="cancel-insert" aria-label="Отменить вставку" style="color:inherit">' + ui('close') + '</button></div>'; }
      var q = S.ui.q.trim().toLowerCase();
      body = U.CATS.map(function (cat) {
        var items = U.CATALOG.map(U.catEntry).filter(function (e) { return e.cat === cat && (!q || e.name.toLowerCase().indexOf(q) >= 0 || cat.toLowerCase().indexOf(q) >= 0); });
        if (!items.length) return '';
        return '<section class="cat"><h3 class="cat__t">' + cat + '</h3><div class="cat__g">' + items.map(function (e) { return '<button type="button" class="blk" draggable="true" data-act="add" data-entry="' + e.id + '" title="Добавить «' + esc(e.name) + '»">' + e.thumb + '<b>' + esc(e.name) + '</b></button>'; }).join('') + '</div></section>';
      }).join('') || '<p class="hint">Ничего не найдено</p>';
    } else if (tab === 'outline') {
      var bl = page().blocks;
      body = bl.length ? '<ol class="outline" aria-label="Секции страницы">' + bl.map(function (b, i) {
        return '<li class="ol-i' + (b.id === S.sel ? ' is-sel' : '') + '" draggable="true" data-drag="' + b.id + '"><span class="ol-i__drag" aria-hidden="true">' + ui('drag') + '</span>' +
          '<button class="ol-i__main" data-act="sel" data-id="' + b.id + '"><b>' + (i + 1) + '. ' + esc(blockName(b)) + (L() !== 'ru' && U.missing(b, L()).length ? ' <span class="badge badge--warn" title="Без перевода">' + U.missing(b, L()).length + '</span>' : '') + '</b><small>' + esc(snippet(b) || '—') + '</small></button>' +
          '<button class="ibtn" data-oact="up" data-id="' + b.id + '" aria-label="Выше: ' + esc(blockName(b)) + '" title="Выше"' + (i === 0 ? ' disabled' : '') + '>' + ui('arrow-up') + '</button>' +
          '<button class="ibtn" data-oact="down" data-id="' + b.id + '" aria-label="Ниже: ' + esc(blockName(b)) + '" title="Ниже"' + (i === bl.length - 1 ? ' disabled' : '') + '>' + ui('arrow-down') + '</button>' +
          '<button class="ibtn" data-oact="dup" data-id="' + b.id + '" aria-label="Дублировать" title="Дублировать">' + ui('copy') + '</button>' +
          '<button class="ibtn ibtn--danger" data-oact="del" data-id="' + b.id + '" aria-label="Удалить" title="Удалить">' + ui('trash') + '</button></li>';
      }).join('') + '</ol>' : '<p class="hint">На странице пока нет блоков.</p>';
    } else {
      body = S.p.pages.map(function (pg) {
        var home = pg === homePage();
        return '<div class="pg' + (pg.id === S.pageId ? ' is-sel' : '') + '"><button class="pg__main" data-act="page" data-id="' + pg.id + '"><b>' + esc(pg.name) + (home ? '<span class="badge">Главная</span>' : '') + '</b><small>/' + esc(fileOf(pg)) + ' · ' + plural(pg.blocks.length, 'блок', 'блока', 'блоков') + U.LANGS.slice(1).map(function (l) { var n = pageMissing(pg, l[0]); return n ? ' · ' + l[2] + ' без перевода: ' + n : ''; }).join('') + '</small></button>' +
          '<button class="ibtn" data-pact="rename" data-id="' + pg.id + '" aria-label="Переименовать" title="Переименовать">' + ui('pencil') + '</button>' +
          '<button class="ibtn" data-pact="dup" data-id="' + pg.id + '" aria-label="Дублировать" title="Дублировать">' + ui('copy') + '</button>' +
          '<button class="ibtn ibtn--danger" data-pact="del" data-id="' + pg.id + '" aria-label="Удалить" title="Удалить"' + (S.p.pages.length < 2 ? ' disabled' : '') + '>' + ui('trash') + '</button></div>';
      }).join('') + '<div style="display:flex;flex-direction:column;gap:8px;margin-top:12px"><button class="btn" data-act="page-new">' + ui('plus') + 'Новая страница</button><button class="btn btn--ghost" data-act="page-home">Страница из шаблона «Главная»</button><button class="btn btn--ghost" data-act="page-tpl">Страница из шаблона «Карта Uzum»</button></div>';
    }
    el.innerHTML = head + '</div><div class="pane__scroll">' + body + '</div>';
    if (keepId === 'bq') { var bq = document.getElementById('bq'); bq.focus(); bq.setSelectionRange(bq.value.length, bq.value.length); }
  }
  function snippet(b) {
    var d = b.d || {}, s = d.title || d.q || d.text || (d.items && d.items[0] && (d.items[0].title || d.items[0].q)) || (d.tabs && d.tabs.map(function (t) { return t.label; }).join(' · ')) || (d.links && d.links.map(function (l) { return l.label; }).join(' · ')) || (d.body || '').replace(/<[^>]+>/g, ' ') || (d.button && d.button.label) || (d.phone || '');
    return String(s).replace(/\s+/g, ' ').trim().slice(0, 60);
  }

  /* ---------- правая панель ---------- */
  function renderRight() {
    var el = document.getElementById('right'); if (!el) return;
    var ae = document.activeElement, keep = ae && el.contains(ae) && ae.getAttribute('data-bind'), caret = keep && ae.selectionStart;
    var b = S.sel && blockById(S.sel);
    var html = '<div class="pane__head" style="flex-direction:row;align-items:center"><b style="flex:1">' + (b ? 'Настройки блока' : 'Настройки страницы') + '</b><button class="ibtn pane__close" data-act="panel" data-panel="" aria-label="Закрыть панель">' + ui('close') + '</button></div><div class="pane__scroll"><div class="set">';
    html += b ? blockPanel(b) : pagePanel(page());
    el.innerHTML = html + '</div></div>';
    if (keep) { var n = el.querySelector('[data-bind="' + keep + '"]'); if (n) { n.focus(); try { n.setSelectionRange(caret, caret); } catch (e) { } } }
  }
  function pagePanel(pg) {
    var home = pg === homePage(), tr = L() !== 'ru' ? ((pg.i18n || {})[L()] || {}) : pg;
    return '<div class="set__head"><h2>' + esc(pg.name) + '</h2></div>' + langNote(pageMissing(pg, L())) +
      fieldInput('Название страницы', 'pg.name', pg.name) +
      '<label class="fld"><span>Адрес внутри сайта</span><input class="inp" data-bind="pg.slug" value="' + esc(home ? 'index' : pg.slug) + '"' + (home ? ' disabled' : '') + ' pattern="[a-z0-9-]+"><small>' + (home ? 'Главная страница всегда открывается как index.html.' : 'Латиница, цифры и дефис. Файл: ' + esc(fileOf(pg))) + '</small></label>' +
      (!home ? '<button class="btn btn--ghost" data-act="make-home" style="align-self:flex-start">Сделать главной</button>' : '') +
      '<div class="set__sec"><h3>SEO · ' + langName(L()) + '</h3>' + counterInput('SEO-заголовок', 'pg.seoTitle', tr.seoTitle, 60, false) + counterInput('Метаописание', 'pg.seoDesc', tr.seoDesc, 160, true) + '</div>' +
      '<div class="info">Выберите секцию на странице, чтобы изменить её текст, варианты и картинки. Текст правится прямо в предпросмотре.</div>';
  }
  function counterInput(label, bind, v, max, area) {
    v = v || ''; var over = v.length > max, ph = phOf(bind), pa = ph ? ' placeholder="' + esc(ph) + '"' : '';
    return '<label class="fld"><span>' + label + (ph && !v ? ' <span class="badge badge--warn">нет перевода</span>' : '') + '</span>' + (area ? '<textarea class="inp" data-bind="' + bind + '" rows="3"' + pa + '>' + esc(v) + '</textarea>' : '<input class="inp" data-bind="' + bind + '" value="' + esc(v) + '"' + pa + '>') + '<span class="counter' + (over ? ' is-over' : '') + '" data-counter="' + max + '">' + v.length + ' / ' + max + '</span></label>';
  }
  function fieldInput(label, bind, v, hint, area) {
    var ph = phOf(bind), pa = ph ? ' placeholder="' + esc(ph) + '"' : '';
    return '<label class="fld"><span>' + esc(label) + (ph && !v ? ' <span class="badge badge--warn">нет перевода</span>' : '') + '</span>' + (area ? '<textarea class="inp" data-bind="' + bind + '" rows="2"' + pa + '>' + esc(v || '') + '</textarea>' : '<input class="inp" data-bind="' + bind + '" value="' + esc(v || '') + '"' + pa + '>') + (hint ? '<small>' + esc(hint) + '</small>' : '') + '</label>';
  }
  function blockPanel(b) {
    var def = B[b.type], i = blockIndex(b.id), n = page().blocks.length;
    var s = '<div class="set__head"><h2>' + esc(blockName(b)) + '</h2></div>' +
      '<div class="set__acts"><button class="btn btn--s btn--ghost" data-oact="up" data-id="' + b.id + '"' + (i === 0 ? ' disabled' : '') + '>' + ui('arrow-up') + 'Выше</button><button class="btn btn--s btn--ghost" data-oact="down" data-id="' + b.id + '"' + (i === n - 1 ? ' disabled' : '') + '>' + ui('arrow-down') + 'Ниже</button><button class="btn btn--s btn--ghost" data-oact="dup" data-id="' + b.id + '">' + ui('copy') + 'Копия</button><button class="btn btn--s btn--ghost" data-oact="del" data-id="' + b.id + '" style="color:var(--danger)">' + ui('trash') + 'Удалить</button>' +
      '<button class="btn btn--s btn--ghost" data-act="ins-before">' + ui('plus') + 'Блок выше</button><button class="btn btn--s btn--ghost" data-act="ins-after">' + ui('plus') + 'Блок ниже</button></div>';
    var conv = U.CATALOG.map(U.catEntry).filter(function (e) { return e.cat === def.cat && e.type !== b.type && !B[e.type].bleed && !def.bleed; }).filter(function (e, k, a) { return a.findIndex(function (x) { return x.type === e.type; }) === k; });
    if (def.notice) s += '<div class="warn" style="margin-bottom:12px"><span>' + esc(def.notice) + '</span></div>';
    if (def.locked) return s + '<div class="info">' + esc(def.note) + ' Язык шапки и подвала переключается вместе со страницей.</div>';
    s += langNote(U.missing(b, L()).length);
    var vs = variantsHTML(def.variants, b.v, 'v.');
    if (vs) s += '<div class="set__sec"><h3>Варианты</h3>' + vs + '</div>';
    s += '<div class="set__sec"><h3>Содержимое' + (L() !== 'ru' ? ' · ' + langName(L()) : '') + '</h3>' + fieldsHTML(def.fields, panelData(b), b.v, 'd.', b) + '</div>';
    if (conv.length) s += '<div class="set__sec"><h3>Сменить тип блока</h3><select class="inp" data-act-change="convert" aria-label="Сменить тип блока"><option value="">Выбрать…</option>' + conv.map(function (e) { return '<option value="' + e.type + '">' + esc(B[e.type].name) + '</option>'; }).join('') + '</select><small class="hint">Совместимые поля — заголовок, текст, пункты — сохранятся.</small></div>';
    return s;
  }
  function langNote(n) {
    if (L() === 'ru') return '';
    return '<div class="info">Вы редактируете версию <b>' + langName(L()) + '</b>. Тексты, описания картинок и ссылки у каждого языка свои; порядок блоков, варианты и картинки общие. Пустое поле — на сайте останется русский текст.' +
      (n ? '<div style="display:flex;align-items:center;gap:8px;margin-top:8px"><span class="badge badge--warn">без перевода: ' + n + '</span><button class="btn btn--s" data-act="next-miss">К следующему</button></div>' : '<div style="margin-top:6px">Всё переведено.</div>') + '</div>';
  }
  function nextMissing() {
    var doc = S.doc; if (!doc) return;
    if (S.ui.mode !== 'edit') { S.ui.mode = 'edit'; renderPreview(); }
    var all = Array.prototype.slice.call(doc.querySelectorAll('.ed-miss'));
    if (!all.length) { toast('На этой странице всё переведено'); return; }
    var cur = doc.activeElement, i = all.indexOf(cur), el = all[(i + 1) % all.length];
    el.scrollIntoView({ block: 'center' }); el.focus();
  }
  function variantsHTML(vars, v, prefix) {
    return (vars || []).filter(function (x) { return U.when(x.when, v); }).map(function (x) {
      return '<div class="fld"><span>' + esc(x.label) + '</span><div class="seg" role="group" aria-label="' + esc(x.label) + '">' + x.options.map(function (o) { return '<button type="button" data-setv="' + prefix + x.key + '" data-val="' + o[0] + '" aria-pressed="' + (v[x.key] === o[0]) + '">' + esc(o[1]) + '</button>'; }).join('') + '</div></div>';
    }).join('');
  }
  function fieldsHTML(fields, d, v, prefix, b) {
    return (fields || []).filter(function (f) { return U.when(f.when, v); }).map(function (f) { return fieldHTML(f, getPath(d, f.key), prefix + f.key, b, v); }).join('');
  }
  function fieldHTML(f, val, bind, b, v) {
    var t = f.t;
    if (t === 'text') return fieldInput(f.label, bind, val, f.hint, /text|lead|caption|note|qrText|a$/.test(f.key) && !/title/.test(f.key));
    if (t === 'url') return '<label class="fld"><span>' + esc(f.label) + '</span><input class="inp" type="url" data-bind="' + bind + '" value="' + esc(val || '') + '" placeholder="https://">' + (f.hint ? '<small>' + esc(f.hint) + '</small>' : '') + '</label>';
    if (t === 'number') return '<label class="fld"><span>' + esc(f.label) + '</span><input class="inp" type="number" min="0" data-bind="' + bind + '" data-num="1" value="' + esc(val || 1) + '"></label>';
    if (t === 'rich' || t === 'inline' || t === 'list') return '<div class="fld"><span>' + esc(f.label) + '</span><button class="btn btn--s" data-act="focus-field" data-path="' + bind.replace(/^d\./, '') + '" style="align-self:flex-start">' + ui('pencil') + 'Править на странице</button>' + (t === 'list' ? '<small>Enter — новый пункт, Enter на пустом — завершить, Tab — вложить, Alt+Shift+↑↓ — переставить.</small>' : '<small>Жирный, курсив, ссылки' + (t === 'rich' ? ', подзаголовки, цитаты и списки' : '') + ' — в панели над текстом.</small>') + '</div>';
    if (t === 'num') return '<label class="fld"><span>' + esc(f.label) + '</span><input class="inp" type="number" step="any" inputmode="decimal" data-bind="' + bind + '" data-dec="1" value="' + esc(val == null ? '' : val) + '">' + (f.hint ? '<small>' + esc(f.hint) + '</small>' : '') + '</label>';
    if (t === 'date') return '<label class="fld"><span>' + esc(f.label) + '</span><input class="inp" type="date" data-bind="' + bind + '" value="' + esc(val || '') + '">' + (f.hint ? '<small>' + esc(f.hint) + '</small>' : '') + '</label>';
    if (t === 'file') return fileField(f, val, bind);
    if (t === 'image') return imageField(f, val || {}, bind);
    if (t === 'link') return linkField(f.label, val, bind);
    if (t === 'button') return buttonField(f.label, val || {}, bind, true);
    if (t === 'buttons') {
      var list = val || [];
      return '<div class="fld"><span>' + esc(f.label) + '</span>' + list.map(function (bt, i) { return itemWrap(bind, i, list.length, bt.label || 'Кнопка', buttonField('', bt, bind + '.' + i, false)); }).join('') + (list.length < (f.max || 3) ? '<button class="btn btn--s" data-iact="add" data-path="' + bind + '" data-tpl=\'' + esc(JSON.stringify({ label: 'Кнопка', href: '#', style: list.length ? 'soft' : 'primary' })) + '\' style="align-self:flex-start">' + ui('plus') + 'Добавить кнопку</button>' : '') + '</div>';
    }
    if (t === 'icon') return iconField(f.label, val, bind);
    if (t === 'items') {
      var arr = val || [];
      return '<div class="fld"><span>' + esc(f.label) + ' · ' + arr.length + '</span>' + arr.map(function (it, i) {
        var title = it.title || it.label || it.q || it.value || it.caption || (it.image && it.image.alt) || ('Пункт ' + (i + 1));
        return itemWrap(bind, i, arr.length, title, f.item.map(function (sf) { return fieldHTML(sf, it[sf.key], bind + '.' + i + '.' + sf.key, b, v); }).join(''));
      }).join('') + '<button class="btn btn--s" data-iact="add" data-path="' + bind + '" data-tpl=\'' + esc(JSON.stringify(f.add || {})) + '\' style="align-self:flex-start">' + ui('plus') + 'Добавить</button></div>';
    }
    if (t === 'table') return tableField(val || { head: [], rows: [] }, bind, v);
    if (t === 'tabs') return tabsField(val || [], bind, b);
    return '';
  }
  function itemWrap(bind, i, n, title, inner) {
    var key = S.sel + ':' + bind + '.' + i, open = !!S.ui.itemOpen[key];
    return '<div class="item"><div class="item__h"><button class="item__t" data-iact="toggle" data-key="' + esc(key) + '" aria-expanded="' + open + '">' + esc(String(title).replace(/<[^>]+>/g, '').slice(0, 48)) + '</button>' +
      '<button class="ibtn" data-iact="up" data-path="' + bind + '" data-i="' + i + '" aria-label="Выше" title="Выше"' + (i === 0 ? ' disabled' : '') + '>' + ui('arrow-up') + '</button>' +
      '<button class="ibtn" data-iact="down" data-path="' + bind + '" data-i="' + i + '" aria-label="Ниже" title="Ниже"' + (i === n - 1 ? ' disabled' : '') + '>' + ui('arrow-down') + '</button>' +
      '<button class="ibtn" data-iact="dup" data-path="' + bind + '" data-i="' + i + '" aria-label="Дублировать" title="Дублировать">' + ui('copy') + '</button>' +
      '<button class="ibtn ibtn--danger" data-iact="del" data-path="' + bind + '" data-i="' + i + '" aria-label="Удалить" title="Удалить">' + ui('trash') + '</button></div>' +
      (open ? '<div class="item__b">' + inner + '</div>' : '') + '</div>';
  }
  var DOC_TYPES = { 'application/pdf': 'pdf', 'application/msword': 'doc', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx', 'application/vnd.ms-excel': 'xls', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx' };
  function assetInfo(ref) {
    if (!ref || ref.indexOf('up:') !== 0) return null;
    var a = S.p.assets[ref.slice(3)]; if (!a) return null;
    return { name: a.name, type: a.type, ext: a.ext || DOC_TYPES[a.type] || ((a.name || '').split('.').pop() || '').toLowerCase(), size: a.size || Math.round((a.data || '').length * 0.75) };
  }
  function fileField(f, ref, bind) {
    var b0 = curBlock(), own = L() !== 'ru' && b0 && b0.t && b0.t[L()] && b0.t[L()][bind.replace(/^d\./, '')];
    var info = assetInfo(ref);
    return '<div class="fld"><span>' + esc(f.label) + '</span>' + (info ? '<div class="filebox">' + ui('doc') + '<span><b>' + esc(info.name) + '</b><small>' + esc((info.ext || '').toUpperCase() + ' · ' + Math.max(1, Math.round(info.size / 1024)) + ' КБ') + '</small></span><button class="btn btn--s btn--ghost" data-act="file-clear" data-path="' + bind + '">Убрать</button></div>' : '') +
      '<label class="btn btn--s" style="align-self:flex-start">' + ui('upload') + (info ? 'Заменить' : 'Загрузить') + '<input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,application/pdf" class="sr" data-docup="' + bind + '"></label>' +
      '<small>PDF, Word или Excel до 10 МБ. Файл попадёт в архив сайта.' + (L() !== 'ru' ? (own ? ' Для этого языка загружен свой файл.' : ' Сейчас общий файл со всеми языками — загрузите здесь версию для ' + langName(L()) + ', если она есть.') : '') + '</small></div>';
  }
  function setFile(bind, ref) {
    var b = curBlock(); if (!b) return;
    var p = bind.replace(/^d\./, '');
    if (L() === 'ru') { setPath(b.d, p, ref); return; }
    setV(b, p, ref === getPath(b.d, p) ? '' : ref);
  }
  function imageField(f, im, bind) {
    var url = imgURL(im.src), libOpen = S.ui.libOpen === bind;
    var lib = libOpen ? '<div class="lib">' + LIB.map(function (l) { return '<button type="button" data-img="lib:' + l[0] + '" data-alt="' + esc(l[1]) + '" data-path="' + bind + '" style="background-image:url(\'' + BASE + 'site/lib/' + l[0] + '\')" aria-label="' + esc(l[1]) + '" title="' + esc(l[1]) + '"></button>'; }).join('') +
      Object.keys(S.p.assets).filter(function (id) { return /^image\//.test(S.p.assets[id].type || ''); }).map(function (id) { var a = S.p.assets[id]; return '<button type="button" data-img="up:' + id + '" data-alt="' + esc(a.alt || '') + '" data-path="' + bind + '" style="background-image:url(\'' + imgURL('up:' + id) + '\')" aria-label="' + esc(a.name) + '" title="' + esc(a.name) + '"></button>'; }).join('') + '</div>' : '';
    var noAlt = im.src && !im.alt && !/logo/.test(im.src) && L() === 'ru';
    var b0 = curBlock(), own = L() !== 'ru' && b0 && b0.t && b0.t[L()] && b0.t[L()][bind.replace(/^d\./, '') + '.src'];
    var warns = imgWarnings(bind, im.src).map(function (w) { return '<div class="warn"><span>' + esc(w.t) + (w.fix ? '<br><button class="btn btn--s" style="margin-top:6px" data-act="img-fit" data-path="' + bind + '" data-ratio="' + w.fix + '" data-anchor="' + w.anchor + '">Вписать без обрезки</button>' : '') + '</span></div>'; }).join('');
    return '<div class="fld img-f-wrap"><span>' + esc(f.label) + '</span><div class="img-f"><div class="img-f__pv" style="' + (url ? 'background-image:url(\'' + url + '\')' : '') + '"></div><div class="img-f__b"><div class="row">' +
      '<label class="btn btn--s">' + ui('upload') + 'Загрузить<input type="file" accept="image/*" class="sr" data-upload="' + bind + '"></label>' +
      '<button class="btn btn--s btn--ghost" data-act="lib" data-path="' + bind + '" aria-expanded="' + libOpen + '">Библиотека</button>' + (im.src ? '<button class="btn btn--s btn--ghost" data-act="img-rm" data-path="' + bind + '">Убрать</button>' : '') + '</div>' +
      '<input class="inp' + (noAlt ? ' inp--err' : '') + '" data-bind="' + bind + '.alt" value="' + esc(im.alt || '') + '" placeholder="' + esc(phOf(bind + '.alt') || 'Что изображено') + '" aria-label="Альтернативный текст">' +
      '<small class="hint">' + (noAlt ? 'Опишите картинку для незрячих и поисковиков. Для декоративной оставьте пустым.' : 'Альтернативный текст' + (L() !== 'ru' ? ' на ' + langName(L()) : '')) + '</small>' +
      (L() !== 'ru' ? '<small class="hint">' + (own ? 'Своя картинка для ' + langName(L()) + '. «Убрать» вернёт общую.' : 'Картинка общая со всеми языками. Загрузите свою, если на ней есть текст.') + '</small>' : '') + '</div></div>' + ruleHTML(bind) + warns + lib + '</div>';
  }
  function linkField(label, href, bind) {
    href = href || '';
    var isPage = href.indexOf('page:') === 0;
    var opts = '<option value="__url"' + (!isPage ? ' selected' : '') + '>Свой адрес</option>' + S.p.pages.map(function (pg) { return '<option value="page:' + pg.id + '"' + (href === 'page:' + pg.id ? ' selected' : '') + '>Страница: ' + esc(pg.name) + '</option>'; }).join('');
    return '<div class="fld">' + (label ? '<span>' + esc(label) + '</span>' : '') + '<select class="inp" data-linksel="' + bind + '" aria-label="Куда ведёт ссылка">' + opts + '</select>' + (!isPage ? '<input class="inp" data-bind="' + bind + '" value="' + esc(href) + '" placeholder="https://… или #якорь" aria-label="Адрес ссылки">' : '') + '</div>';
  }
  function buttonField(label, bt, bind, wrap) {
    var styles = [['primary', 'Основная'], ['light', 'Белая'], ['soft', 'Мягкая']];
    var inner = fieldInput('Текст кнопки', bind + '.label', bt.label) + linkField('Ссылка', bt.href, bind + '.href') +
      '<div class="fld"><span>Стиль</span><div class="seg">' + styles.map(function (s) { return '<button type="button" data-setv="' + bind + '.style" data-val="' + s[0] + '" aria-pressed="' + ((bt.style || 'primary') === s[0]) + '">' + s[1] + '</button>'; }).join('') + '</div></div>' +
      '<label class="chk"><input type="checkbox" data-bind="' + bind + '.arrow" data-bool="1"' + (bt.arrow ? ' checked' : '') + '>Стрелка в кружке</label>';
    return wrap ? '<div class="fld"><span>' + esc(label) + '</span><div class="item"><div class="item__b" style="padding-top:12px">' + inner + '</div></div></div>' : inner;
  }
  function iconField(label, name, bind) {
    var open = S.ui.iconOpen === bind, IC = window.UZ_ICONS;
    var grid = open ? '<div class="icons" role="listbox" aria-label="Иконки дизайн-системы">' + Object.keys(IC).filter(function (k) { return !/^n\d$/.test(k); }).map(function (k) { return '<button type="button" data-icon="' + k + '" data-path="' + bind + '" aria-pressed="' + (k === name) + '" title="' + esc(IC[k].l) + '" aria-label="' + esc(IC[k].l) + '">' + U.icon(k, '') + '</button>'; }).join('') + '</div>' : '';
    return '<div class="fld"><span>' + esc(label) + '</span><button class="icon-pick" data-act="icons" data-path="' + bind + '" aria-expanded="' + open + '"><span>' + U.icon(name || 'check', '') + '</span>' + esc((IC[name] || IC.check).l) + '</button>' + grid + '</div>';
  }
  function tableField(t, bind, v) {
    var cols = Math.max(1, (t.rows[0] || t.head || ['']).length);
    var head = v.head === 'on' ? '<div class="fld"><span>Заголовки столбцов</span>' + Array.from({ length: cols }, function (_, ci) { return '<input class="inp" data-bind="' + bind + '.head.' + ci + '" value="' + esc(String((t.head || [])[ci] || '').replace(/<[^>]+>/g, '')) + '" aria-label="Столбец ' + (ci + 1) + '">'; }).join('') + '</div>' : '';
    var rows = (t.rows || []).map(function (r, i) {
      return '<div class="item"><div class="item__h"><span class="item__t" style="padding:6px 0;font-weight:600;font-size:13px;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(String(r[0] || 'Строка ' + (i + 1)).replace(/<[^>]+>/g, '')) + '</span>' +
        '<button class="ibtn" data-tact="up" data-path="' + bind + '" data-i="' + i + '" aria-label="Строка выше"' + (i === 0 ? ' disabled' : '') + '>' + ui('arrow-up') + '</button><button class="ibtn" data-tact="down" data-path="' + bind + '" data-i="' + i + '" aria-label="Строка ниже"' + (i === t.rows.length - 1 ? ' disabled' : '') + '>' + ui('arrow-down') + '</button><button class="ibtn ibtn--danger" data-tact="del" data-path="' + bind + '" data-i="' + i + '" aria-label="Удалить строку">' + ui('trash') + '</button></div></div>';
    }).join('');
    return head + '<div class="fld"><span>Строки · ' + t.rows.length + ', столбцы · ' + cols + '</span>' + rows + '<div class="row" style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn btn--s" data-tact="add-row" data-path="' + bind + '">' + ui('plus') + 'Строка</button><button class="btn btn--s" data-tact="add-col" data-path="' + bind + '">' + ui('plus') + 'Столбец</button>' + (cols > 1 ? '<button class="btn btn--s btn--ghost" data-tact="del-col" data-path="' + bind + '">Убрать последний столбец</button>' : '') + '</div><small>Текст ячеек правится прямо в таблице. В тарифах первая строка ячейки до переноса (Shift+Enter) становится крупной цифрой.</small></div>';
  }
  function tabsField(tabs, bind, b) {
    var selI = Math.min(S.ui.tabSel[b.id] || 0, tabs.length - 1);
    var kinds = [['table', 'Таблица'], ['steps', 'Шаги'], ['faq', 'Вопросы'], ['text', 'Текст']];
    var list = tabs.map(function (t, i) {
      return '<div class="item"' + (i === selI ? ' style="box-shadow:0 0 0 2px var(--purple)"' : '') + '><div class="item__h"><button class="item__t" data-act="tabsel" data-i="' + i + '">' + esc(t.label || 'Вкладка') + '</button>' +
        '<button class="ibtn" data-iact="up" data-path="' + bind + '" data-i="' + i + '" aria-label="Выше"' + (i === 0 ? ' disabled' : '') + '>' + ui('arrow-up') + '</button><button class="ibtn" data-iact="down" data-path="' + bind + '" data-i="' + i + '" aria-label="Ниже"' + (i === tabs.length - 1 ? ' disabled' : '') + '>' + ui('arrow-down') + '</button><button class="ibtn ibtn--danger" data-iact="del" data-path="' + bind + '" data-i="' + i + '" aria-label="Удалить вкладку">' + ui('trash') + '</button></div>' +
        (i === selI ? '<div class="item__b">' + fieldInput('Название вкладки', bind + '.' + i + '.label', t.label) + fieldInput('Якорь (id)', bind + '.' + i + '.id', t.id, 'Ссылка #' + (t.id || '') + ' откроет эту вкладку') +
          '<label class="fld"><span>Содержимое</span><select class="inp" data-tabkind="' + bind + '.' + i + '">' + kinds.map(function (k) { return '<option value="' + k[0] + '"' + (t.kind === k[0] ? ' selected' : '') + '>' + k[1] + '</option>'; }).join('') + '</select></label>' + nestedFields(t, bind + '.' + i, b) + '</div>' : '') + '</div>';
    }).join('');
    return '<div class="fld"><span>Вкладки</span>' + list + '<button class="btn btn--s" data-iact="add" data-path="' + bind + '" data-tpl=\'' + esc(JSON.stringify({ label: 'Новая вкладка', id: 'tab-' + Math.random().toString(36).slice(2, 6), kind: 'text', v: {}, d: { body: '<p>Текст вкладки</p>' } })) + '\' style="align-self:flex-start">' + ui('plus') + 'Вкладка</button></div>';
  }
  function nestedFields(t, bind, b) {
    if (t.kind === 'text') return fieldHTML({ key: 'body', label: 'Текст', t: 'rich' }, '', 'd.' + bind.replace(/^d\./, '') + '.d.body', b, {});
    var def = B[t.kind], keep = { table: ['style', 'head'], steps: ['layout'], faq: ['open'] }[t.kind];
    var fv = def.fields.filter(function (f) { return t.kind === 'table' ? /table|note|link/.test(f.key) : t.kind === 'steps' ? /items|note/.test(f.key) : f.key === 'items'; });
    var vars = def.variants.filter(function (x) { return keep.indexOf(x.key) >= 0; });
    var v = Object.assign(U.defaults(t.kind), t.v || {});
    return variantsHTML(vars, v, bind + '.v.') + fieldsHTML(fv, t.d || {}, v, bind + '.d.', b);
  }

  /* ---------- события интерфейса (делегирование) ---------- */
  function curBlock() { return S.sel && blockById(S.sel); }
  function target(bind) {
    if (bind.indexOf('pg.') === 0) {
      var pg = page(), k = bind.slice(3);
      if (L() !== 'ru' && (k === 'seoTitle' || k === 'seoDesc')) { pg.i18n = pg.i18n || {}; pg.i18n[L()] = pg.i18n[L()] || {}; return { obj: pg.i18n[L()], path: k }; }
      return { obj: pg, path: k };
    }
    var b = curBlock(); return b ? { obj: b, path: bind, block: b } : null;
  }
  function writeT(tg, val) {
    if (tg.block && L() !== 'ru' && tg.path.indexOf('d.') === 0 && langable(tg.path, val)) { setV(tg.block, tg.path.slice(2), val); return; }
    setPath(tg.obj, tg.path, val);
  }
  function phOf(bind) {
    if (L() === 'ru') return '';
    if (bind.indexOf('d.') === 0) { var b = curBlock(); var v = b && getPath(b.d, bind.slice(2)); return typeof v === 'string' ? v.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : ''; }
    if (bind === 'pg.seoTitle' || bind === 'pg.seoDesc') return page()[bind.slice(3)] || '';
    return '';
  }
  function setBind(bind, val, opts) {
    var tg = target(bind); if (!tg) return;
    if (tg.obj === page() && tg.path === 'slug') val = slugify(val) || 'page';
    writeT(tg, val);
    touch(Object.assign({ noPanels: true }, opts || {}));
    renderLeft();
  }
  function slugify(s) {
    var map = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya', ў: 'o', қ: 'q', ғ: 'g', ҳ: 'h' };
    return String(s || '').toLowerCase().split('').map(function (c) { return map[c] !== undefined ? map[c] : c; }).join('').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
  }
  var inputT = 0;
  $app.addEventListener('input', function (e) {
    var t = e.target;
    if (t.id === 'pname') { S.p.name = t.value; touch({ noPreview: true, noPanels: true }); return; }
    if (t.id === 'bq') { S.ui.q = t.value; renderLeft(); return; }
    var bind = t.getAttribute('data-bind');
    if (bind && !t.getAttribute('data-bool')) {
      var c = t.parentNode.querySelector('[data-counter]');
      if (c) { var max = +c.getAttribute('data-counter'); c.textContent = t.value.length + ' / ' + max; c.classList.toggle('is-over', t.value.length > max); }
      var val = t.getAttribute('data-num') ? (parseInt(t.value, 10) || 1) : t.getAttribute('data-dec') ? (t.value === '' ? '' : parseFloat(t.value)) : t.value;
      if (val !== val) return;
      if (bind === 'pg.slug') return;
      var tg = target(bind); if (!tg) return;
      writeT(tg, val);
      clearTimeout(inputT); inputT = setTimeout(function () { touch({ noPanels: true }); if (/^pg\.name$/.test(bind)) { renderBarState(); renderLeft(); } }, 220);
    }
  });
  $app.addEventListener('change', function (e) {
    var t = e.target, bind = t.getAttribute('data-bind');
    if (t.getAttribute('data-act') === 'import') { if (t.files[0]) importJSON(t.files[0]); t.value = ''; return; }
    if (t.id === 'psel') { switchPage(t.value); return; }
    if (bind && t.getAttribute('data-bool')) { setBind(bind, t.checked); return; }
    if (bind === 'pg.slug') { var v = slugify(t.value) || 'page'; if (S.p.pages.some(function (p) { return p !== page() && p.slug === v; })) v += '-2'; if (v === 'index') v = 'index-2'; page().slug = v; t.value = v; touch(); return; }
    if (bind) { touch({ noPanels: true }); return; }
    if (t.getAttribute('data-act-change') === 'convert' && t.value) { var b = curBlock(), i = blockIndex(b.id); page().blocks[i] = U.convertTo(b, t.value); touch({ hard: true }); return; }
    var ls = t.getAttribute('data-linksel');
    if (ls) { setBind(ls, t.value === '__url' ? '' : t.value); renderRight(); return; }
    var tk = t.getAttribute('data-tabkind');
    if (tk) { var tb = getPath(curBlock(), tk); tb.kind = t.value; tb.v = {}; tb.d = t.value === 'text' ? { body: '<p>Текст вкладки</p>' } : B[t.value].example(); if (t.value === 'faq') tb.d.title = ''; touch(); return; }
    var du = t.getAttribute('data-docup');
    if (du && t.files[0]) {
      var df = t.files[0], ext = (df.name.split('.').pop() || '').toLowerCase();
      if (!/^(pdf|docx?|xlsx?)$/.test(ext)) { toast('Нужен PDF, Word или Excel'); t.value = ''; return; }
      if (df.size > 10 * 1048576) { toast('Файл больше 10 МБ — сожмите его или разделите'); t.value = ''; return; }
      readFile(df).then(function (data) {
        var id = U.uid('doc'); S.p.assets[id] = { name: df.name, type: df.type || 'application/octet-stream', ext: ext, size: df.size, data: data };
        setFile(du, 'up:' + id); touch(); toast('Файл загружен: ' + df.name);
      }).catch(function (err) { toast(err.message); });
      return;
    }
    var up = t.getAttribute('data-upload');
    if (up && t.files[0]) {
      var file = t.files[0];
      processImage(file).then(function (r) {
        var id = U.uid('img'); S.p.assets[id] = { name: file.name, type: r.type, data: r.data, w: r.w, h: r.h, alpha: r.alpha };
        setImg(up, 'up:' + id, null);
        touch();
        var w = imgWarnings(up, 'up:' + id);
        toast(w.length ? 'Загружено, но есть замечания — см. справа' : 'Изображение загружено. Добавьте описание.');
      }).catch(function (err) { toast(err.message); });
    }
  });
  $app.addEventListener('click', function (e) {
    var t = e.target.closest('button, a, [data-act]'); if (!t) return;
    var act = t.getAttribute('data-act'), id = t.getAttribute('data-id');
    if (act === 'open') { location.hash = '#/p/' + id; return; }
    if (act === 'new-empty') return createProject('empty');
    if (act === 'new-home') return createProject('home');
    if (act === 'new-tpl') return createProject('tpl');
    if (act === 'new-starter') return createProject('starter');
    if (act === 'file-clear') { setFile(t.getAttribute('data-path'), ''); touch(); return; }
    if (act === 'rename') { var p = S.projects.filter(function (x) { return x.id === id; })[0]; confirmDlg('Переименовать проект', '', 'Сохранить', '<input class="inp" value="' + esc(p.name) + '" aria-label="Название">').then(function (v) { if (v && v.trim()) { p.name = v.trim(); p.updated = now(); DB.put(p).then(renderProjects); } }); return; }
    if (act === 'dup') { var p2 = clone(S.projects.filter(function (x) { return x.id === id; })[0]); p2.id = U.uid('p'); p2.name += ' — копия'; p2.updated = now(); S.projects.push(p2); DB.put(p2).then(renderProjects); return; }
    if (act === 'json') { exportJSON(S.projects.filter(function (x) { return x.id === id; })[0]); return; }
    if (act === 'del') { var p3 = S.projects.filter(function (x) { return x.id === id; })[0]; confirmDlg('Удалить проект?', '«' + p3.name + '» будет удалён из этого браузера. Если нужен, сначала скачайте JSON.', 'Удалить').then(function (ok) { if (ok) DB.del(id).then(function () { S.projects = S.projects.filter(function (x) { return x.id !== id; }); renderProjects(); }); }); return; }
    if (!S.p) return;
    var oact = t.getAttribute('data-oact');
    if (oact) { blockAct(oact, id); return; }
    if (act === 'vp') { S.ui.vp = +t.getAttribute('data-vp'); Array.prototype.forEach.call(document.querySelectorAll('[data-act=vp]'), function (b) { b.setAttribute('aria-pressed', +b.getAttribute('data-vp') === S.ui.vp); }); fitFrame(); return; }
    if (act === 'mode') { S.ui.mode = t.getAttribute('data-mode'); Array.prototype.forEach.call(document.querySelectorAll('[data-act=mode]'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-mode') === S.ui.mode); }); renderPreview(); return; }
    if (act === 'lang') { S.ui.lang = t.getAttribute('data-lang'); renderBarState(); renderPreview(); renderLeft(); renderRight(); return; }
    if (act === 'imghelp') { imageHelp(); return; }
    if (act === 'next-miss') { nextMissing(); return; }
    if (act === 'img-fit') { fitImage(t.getAttribute('data-path'), +t.getAttribute('data-ratio'), t.getAttribute('data-anchor')); return; }
    if (act === 'undo') return undo();
    if (act === 'redo') return redo();
    if (act === 'panel') { setPanel(t.getAttribute('data-panel')); return; }
    if (act === 'ltab') { S.ui.left = t.getAttribute('data-tab'); renderLeft(); return; }
    if (act === 'add') { if (S.dragged) { S.dragged = false; return; } insertBlock(t.getAttribute('data-entry')); if (window.innerWidth <= 1180) setPanel(''); return; }
    if (act === 'cancel-insert') { S.ui.insertAt = null; renderLeft(); renderPreview(); return; }
    if (act === 'ins-before' || act === 'ins-after') { setInsert(blockIndex(S.sel) + (act === 'ins-after' ? 1 : 0)); return; }
    if (act === 'sel') { select(id, true); return; }
    if (act === 'page') { switchPage(id); return; }
    if (act === 'page-new' || act === 'page-tpl' || act === 'page-home') {
      var n = S.p.pages.length + 1, pg;
      if (act === 'page-tpl') { var tp = U.cardTemplate(); pg = newPage('Карта Uzum', uniqueSlug('card'), tp.blocks); pg.seoTitle = tp.seoTitle; pg.seoDesc = tp.seoDesc; }
      else if (act === 'page-home') { var tph = U.homeTemplate(); pg = newPage('Главная (копия)', uniqueSlug('home'), tph.blocks); pg.seoTitle = tph.seoTitle; pg.seoDesc = tph.seoDesc; pg.i18n = tph.i18n; }
      else { pg = newPage('Страница ' + n, uniqueSlug('page-' + n)); var hd = homePage().blocks.filter(function (b) { return b.type === 'header' || b.type === 'footer'; }).map(function (b) { var c = clone(b); c.id = U.uid('s'); return c; }); pg.blocks = hd; }
      S.p.pages.push(pg); S.pageId = pg.id; S.sel = null; touch({ hard: true }); renderBarState(); toast('Страница «' + pg.name + '» добавлена'); return;
    }
    var pact = t.getAttribute('data-pact');
    if (pact) {
      var pgx = S.p.pages.filter(function (x) { return x.id === id; })[0];
      if (pact === 'rename') { confirmDlg('Переименовать страницу', '', 'Сохранить', '<input class="inp" value="' + esc(pgx.name) + '" aria-label="Название страницы">').then(function (v) { if (v && v.trim()) { pgx.name = v.trim(); if (pgx.seoTitle === '' || !pgx.seoTitle) pgx.seoTitle = pgx.name; touch(); renderBarState(); } }); }
      if (pact === 'dup') { var c = clone(pgx); c.id = U.uid('pg'); c.name += ' — копия'; c.slug = uniqueSlug((pgx.slug === 'index' ? 'home' : pgx.slug) + '-copy'); c.blocks.forEach(function (b) { b.id = U.uid('s'); }); S.p.pages.splice(S.p.pages.indexOf(pgx) + 1, 0, c); S.pageId = c.id; touch({ hard: true }); renderBarState(); }
      if (pact === 'del') { confirmDlg('Удалить страницу?', '«' + pgx.name + '» и все её блоки будут удалены.', 'Удалить').then(function (ok) { if (!ok) return; var wasHome = pgx === homePage(); S.p.pages = S.p.pages.filter(function (x) { return x !== pgx; }); if (wasHome) S.p.pages[0].slug = 'index'; if (S.pageId === pgx.id) S.pageId = S.p.pages[0].id; S.sel = null; touch({ hard: true }); renderBarState(); }); }
      return;
    }
    if (act === 'make-home') { var old = homePage(); old.slug = uniqueSlug(slugify(old.name) || 'page'); page().slug = 'index'; touch(); return; }
    var setv = t.getAttribute('data-setv');
    if (setv) { setBind(setv, t.getAttribute('data-val')); renderRight(); return; }
    var iact = t.getAttribute('data-iact');
    if (iact) {
      if (iact === 'toggle') { var k = t.getAttribute('data-key'); S.ui.itemOpen[k] = !S.ui.itemOpen[k]; renderRight(); return; }
      var tg = target(t.getAttribute('data-path')), arr = getPath(tg.obj, tg.path), i = +t.getAttribute('data-i');
      if (!arr) { arr = []; setPath(tg.obj, tg.path, arr); }
      if (tg.block) remapItems(tg.block, tg.path, iact, i, arr.length);
      if (iact === 'add') { var item = JSON.parse(t.getAttribute('data-tpl') || '{}'); arr.push(item); S.ui.itemOpen[S.sel + ':' + t.getAttribute('data-path') + '.' + (arr.length - 1)] = true; if (/tabs$/.test(tg.path)) S.ui.tabSel[S.sel] = arr.length - 1; }
      if (iact === 'up' && i > 0) arr.splice(i - 1, 0, arr.splice(i, 1)[0]);
      if (iact === 'down' && i < arr.length - 1) arr.splice(i + 1, 0, arr.splice(i, 1)[0]);
      if (iact === 'dup') arr.splice(i + 1, 0, clone(arr[i]));
      if (iact === 'del') arr.splice(i, 1);
      touch({ hard: true }); return;
    }
    var tact = t.getAttribute('data-tact');
    if (tact) {
      var tg2 = target(t.getAttribute('data-path')), tbl = getPath(tg2.obj, tg2.path), j = +t.getAttribute('data-i');
      if (tg2.block && /^(up|down|del)$/.test(tact)) remapItems(tg2.block, tg2.path + '.rows', tact, j, tbl.rows.length);
      var cols = Math.max(1, (tbl.rows[0] || tbl.head || ['']).length);
      if (tact === 'add-row') tbl.rows.push(Array.from({ length: cols }, function (_, ci) { return ci === 0 ? 'Новая строка' : ''; }));
      if (tact === 'add-col') { tbl.rows.forEach(function (r) { r.push(''); }); (tbl.head = tbl.head || []).push('Столбец ' + (cols + 1)); }
      if (tact === 'del-col') { tbl.rows.forEach(function (r) { r.pop(); }); if (tbl.head) tbl.head.pop(); }
      if (tact === 'up' && j > 0) tbl.rows.splice(j - 1, 0, tbl.rows.splice(j, 1)[0]);
      if (tact === 'down' && j < tbl.rows.length - 1) tbl.rows.splice(j + 1, 0, tbl.rows.splice(j, 1)[0]);
      if (tact === 'del') tbl.rows.splice(j, 1);
      touch({ hard: true }); return;
    }
    if (act === 'tabsel') { S.ui.tabSel[S.sel] = +t.getAttribute('data-i'); renderPreview(); renderRight(); return; }
    if (act === 'lib') { var pth = t.getAttribute('data-path'); S.ui.libOpen = S.ui.libOpen === pth ? null : pth; renderRight(); return; }
    if (act === 'icons') { var pth2 = t.getAttribute('data-path'); S.ui.iconOpen = S.ui.iconOpen === pth2 ? null : pth2; renderRight(); return; }
    if (t.getAttribute('data-img')) { setImg(t.getAttribute('data-path'), t.getAttribute('data-img'), t.getAttribute('data-alt')); S.ui.libOpen = null; touch(); return; }
    if (act === 'img-rm') { setImg(t.getAttribute('data-path'), '', ''); touch(); return; }
    if (t.getAttribute('data-icon')) { setBind(t.getAttribute('data-path'), t.getAttribute('data-icon')); S.ui.iconOpen = null; renderRight(); return; }
    if (act === 'focus-field') { focusField(t.getAttribute('data-path')); return; }
  });
  /* картинка: в RU меняется общая, в других языках — своя для языка */
  function setImg(bind, src, alt) {
    var b = curBlock(); if (!b) return;
    var p = bind.replace(/^d\./, '');
    if (L() === 'ru') { var cur = getPath(b.d, p) || {}; setPath(b.d, p, { src: src, alt: alt != null && alt !== '' ? alt : (src ? cur.alt || '' : '') }); return; }
    setV(b, p + '.src', src === getPath(b.d, p + '.src') ? '' : src);
    if (alt) setV(b, p + '.alt', alt);
  }
  function imgWarnings(bind, src) {
    var b = curBlock(), out = []; if (!b || !src || src.indexOf('up:') !== 0) return out;
    var a = S.p.assets[src.slice(3)]; if (!a || !a.w) return out;
    var r = U.imageRule(b.type, bind.replace(/^d\./, ''), b.v), ratio = a.w / a.h;
    if (r.ratio && Math.abs(ratio - r.ratio) / r.ratio > 0.03) out.push({ t: 'Пропорции файла ' + ratio.toFixed(2) + ' : 1, а слоту нужно ' + (r.ratioText || r.ratio.toFixed(2) + ' : 1') + (r.fit === 'fixed' ? ' — картинка исказится.' : ' — края обрежутся.'), fix: r.ratio, anchor: r.fit === 'bottom' ? 'bottom' : 'center' });
    if (Math.max(a.w, a.h) < r.min) out.push({ t: 'Мало пикселей: ' + a.w + ' × ' + a.h + '. Нужно от ' + r.min + ' px по большей стороне, иначе на ретине будет мыльно.' });
    if (r.alpha && a.alpha === false && !/svg/.test(a.type)) out.push({ t: 'Нет прозрачного фона: на светло-сиреневой подложке будет виден прямоугольник. Нужен PNG или WebP с прозрачностью.' });
    return out;
  }
  function fitImage(bind, ratio, anchor) {
    var b = curBlock(); if (!b) return;
    var p = bind.replace(/^d\./, ''), src = L() === 'ru' ? getPath(b.d, p + '.src') : (getV(b, p + '.src') || getPath(b.d, p + '.src'));
    var a = src && S.p.assets[src.slice(3)]; if (!a) return;
    var im = new Image();
    im.onload = function () {
      var w = im.naturalWidth, h = im.naturalHeight, W = w, Hh = h;
      if (w / h > ratio) Hh = Math.round(w / ratio); else W = Math.round(h * ratio);
      var c = document.createElement('canvas'); c.width = W; c.height = Hh;
      c.getContext('2d').drawImage(im, Math.round((W - w) / 2), anchor === 'bottom' ? Hh - h : Math.round((Hh - h) / 2));
      var id = U.uid('img'), d = c.toDataURL('image/webp', 0.9);
      S.p.assets[id] = { name: a.name.replace(/(\.[a-z0-9]+)?$/i, '-fit.webp'), type: 'image/webp', data: d, w: W, h: Hh, alpha: true };
      setImg(bind, 'up:' + id, null); touch(); toast('Картинка вписана в пропорции слота: добавлены прозрачные поля');
    };
    im.src = a.data;
  }
  function ruleHTML(bind) {
    var b = curBlock(); if (!b) return '';
    var r = U.imageRule(b.type, bind.replace(/^d\./, ''), b.v);
    var fit = { fixed: 'строгие пропорции', cover: 'заполняет слот, края обрезаются', contain: 'целиком, без обрезки', bottom: 'целиком, стоит на нижнем крае', auto: 'целиком, высота по файлу' }[r.fit];
    return '<details class="rule"><summary>Как подготовить: <b>' + esc(r.size) + '</b> · ' + fit + '</summary><ul>' + r.tips.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '<li>Формат: ' + (r.alpha ? 'PNG или WebP с прозрачным фоном' : 'WebP, PNG или JPEG') + '. Готовьте в 2× от размера на экране, конструктор сам сожмёт до 2400 px.</li></ul></details>';
  }
  function imageHelp() {
    var rows = [['Первый экран · карта', 'hero', 'card', { media: 'card' }], ['Первый экран · картинка', 'hero', 'image', { media: 'image', fit: 'bottom' }], ['Текст с изображением', 'textimage', 'image', { fit: 'bleed' }], ['Карточки, 3 колонки', 'cards', 'items.0.image', { cols: '3', media: 'contain' }], ['Крупные карточки, 2 колонки', 'cards', 'items.0.image', { cols: '2', style: 'feature', media: 'contain' }], ['Карточки «Заполнить»', 'cards', 'items.0.image', { cols: '3', media: 'cover' }], ['Галерея', 'gallery', 'items.0.image', { fit: 'contain' }], ['Изображение с подписью', 'image', 'image', { width: 'wide' }], ['QR-код', 'cta', 'qrImage', {}]];
    var html = '<div class="help"><p><b>Чтобы картинка не обрезалась:</b></p><ol><li>Объект на прозрачном фоне (PNG или WebP), без пустых полей по краям файла.</li><li>Для режимов «К нижнему краю» объект касается нижней границы файла.</li><li>Где у слота строгие пропорции (карта, QR, галерея, «Заполнить»), режьте файл точно в них. Если не совпало, конструктор предложит «Вписать без обрезки».</li><li>Размер — в 2× от слота на экране. Тени, скругления и подложки не рисуйте: их добавляет блок.</li></ol><table>' +
      rows.map(function (r) { var x = U.imageRule(r[1], r[2], r[3]); return '<tr><td>' + esc(r[0]) + '</td><td><b>' + esc(x.size) + '</b><br><small>' + esc(x.tips[0]) + '</small></td></tr>'; }).join('') + '</table></div>';
    confirmDlg('Как готовить картинки', '', 'Понятно', html);
  }
  function remapItems(b, path, op, i, n) {
    var map = null;
    if (op === 'up' && i > 0) map = function (j) { return j === i ? i - 1 : j === i - 1 ? i : j; };
    if (op === 'down' && i < n - 1) map = function (j) { return j === i ? i + 1 : j === i + 1 ? i : j; };
    if (op === 'del') map = function (j) { return j === i ? null : j > i ? j - 1 : j; };
    if (op === 'dup') map = function (j) { return j > i ? j + 1 : j; };
    if (!map) return;
    U.remapT(b, path, map);
    if (op === 'dup' && b.t) { var pre = path.replace(/^d\./, '') + '.' + i + '.', pre2 = path.replace(/^d\./, '') + '.' + (i + 1) + '.'; Object.keys(b.t).forEach(function (l) { Object.keys(b.t[l]).forEach(function (p) { if (p.indexOf(pre) === 0) b.t[l][pre2 + p.slice(pre.length)] = b.t[l][p]; }); }); }
  }
  function focusField(path) {
    var doc = S.doc; if (!doc) return;
    if (S.ui.mode !== 'edit') { S.ui.mode = 'edit'; renderPreview(); }
    var el = doc.querySelector('.ed-sec[data-b="' + S.sel + '"] [data-f="' + path + '"]');
    if (!el) { toast('Это поле сейчас скрыто: переключите вкладку или раскройте ответ'); return; }
    if (window.innerWidth <= 1180) setPanel('');
    el.scrollIntoView({ block: 'center' }); el.focus();
    var r = doc.createRange(); r.selectNodeContents(el); r.collapse(false); var s = doc.getSelection(); s.removeAllRanges(); s.addRange(r);
  }
  function switchPage(id) { S.pageId = id; S.sel = null; S.ui.insertAt = null; renderBarState(); renderLeft(); renderRight(); renderPreview(); }
  function uniqueSlug(base) { var s = slugify(base) || 'page', k = s, n = 2; while (S.p.pages.some(function (p) { return p.slug === k; }) || k === 'index') k = s + '-' + n++; return k; }

  /* перетаскивание: каталог → страница, порядок в структуре */
  $app.addEventListener('dragstart', function (e) {
    var blk = e.target.closest && e.target.closest('.blk');
    if (blk) { S.dragEntry = blk.getAttribute('data-entry'); S.dragged = true; e.dataTransfer.effectAllowed = 'copy'; e.dataTransfer.setData('text/plain', S.dragEntry); if (S.doc) S.doc.body.classList.add('is-drag'); return; }
    var row = e.target.closest && e.target.closest('[data-drag]');
    if (row) { S.dragRow = row.getAttribute('data-drag'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', S.dragRow); }
  });
  $app.addEventListener('dragend', function () { S.dragEntry = null; setTimeout(function () { S.dragged = false; }, 50); S.dragRow = null; if (S.doc) { S.doc.body.classList.remove('is-drag'); Array.prototype.forEach.call(S.doc.querySelectorAll('.is-over'), function (x) { x.classList.remove('is-over'); }); } Array.prototype.forEach.call(document.querySelectorAll('.is-drop'), function (x) { x.classList.remove('is-drop'); }); });
  $app.addEventListener('dragover', function (e) { if (!S.dragRow) return; var row = e.target.closest('[data-drag]'); if (!row) return; e.preventDefault(); Array.prototype.forEach.call(document.querySelectorAll('.is-drop'), function (x) { x.classList.remove('is-drop'); }); row.classList.add('is-drop'); });
  $app.addEventListener('drop', function (e) {
    if (!S.dragRow) return; var row = e.target.closest('[data-drag]'); if (!row) return; e.preventDefault();
    var bl = page().blocks, from = blockIndex(S.dragRow), to = blockIndex(row.getAttribute('data-drag'));
    if (from < 0 || to < 0 || from === to) return; var b = bl.splice(from, 1)[0]; bl.splice(from < to ? to - 1 : to, 0, b); touch({ hard: true });
  });
  document.addEventListener('keydown', function (e) {
    if (!S.p || !document.getElementById('ed')) return;
    var inField = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !inField) { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    if (e.key === 'Escape' && document.getElementById('ed').hasAttribute('data-panel')) setPanel('');
  });

  /* ================= ЭКСПОРТ ================= */
  var SKIP = { ru: 'Перейти к содержимому', uz: 'Asosiy qismga o‘tish', en: 'Skip to content' };
  function exportLangs() { var l = S.ui.exportLangs || ['ru', 'uz', 'en']; return U.LANGS.map(function (x) { return x[0]; }).filter(function (x) { return l.indexOf(x) >= 0; }); }
  function renderExport() {
    var p = S.p, pg = page(), pages = S.ui.exportScope === 'page' ? [pg] : p.pages, langs = exportLangs();
    var issues = checkIssues(p, pages, langs), tree = exportTree(p, pages, langs);
    $app.innerHTML = '<header class="top"><a class="ibtn" href="#/p/' + p.id + '" aria-label="Назад в редактор">' + ui('back') + '</a><img class="top__logo" src="site/lib/logo-white.svg" alt="Uzum Bank"><span class="top__title">Экспорт · ' + esc(p.name) + '</span></header>' +
      '<main class="wrap"><div class="pj-head"><h1 class="h1">Скачать вёрстку</h1><a class="btn btn--l" href="#/p/' + p.id + '">Вернуться в редактор</a></div><div class="ex"><section class="card" aria-labelledby="ex-z"><h2 class="h2" id="ex-z">Готовый сайт (ZIP)</h2>' +
      '<label class="opt"><input type="radio" name="scope" value="site"' + (S.ui.exportScope === 'site' ? ' checked' : '') + '><span><b>Весь сайт</b><small>' + plural(p.pages.length, 'страница', 'страницы', 'страниц') + ' × ' + plural(langs.length, 'язык', 'языка', 'языков') + ', ссылки между ними работают</small></span></label>' +
      '<label class="opt"><input type="radio" name="scope" value="page"' + (S.ui.exportScope === 'page' ? ' checked' : '') + '><span><b>Текущая страница</b><small>«' + esc(pg.name) + '» как index.html в папке каждого языка</small></span></label>' +
      '<div class="fld"><span>Языки</span><div style="display:flex;gap:16px;flex-wrap:wrap">' + U.LANGS.map(function (l) { return '<label class="chk"><input type="checkbox" data-exlang="' + l[0] + '"' + (langs.indexOf(l[0]) >= 0 ? ' checked' : '') + (l[0] === 'ru' && langs.length === 1 && langs[0] === 'ru' ? ' disabled' : '') + '>' + l[1] + '</label>'; }).join('') + '</div><small class="hint">Каждый язык — своя папка: ru/, uz/, en/. Переключатель языка в шапке ведёт на ту же страницу на другом языке.</small></div>' +
      '<label class="chk"><input type="checkbox" id="ex-brand"' + (p.settings.brandFonts !== false ? ' checked' : '') + '><span>Фирменные шрифты DOT Spektra и TT Uzum<br><small class="hint">Веб-лицензия подтверждена. Без них заголовки уйдут на системный шрифт.</small></span></label>' +
      (issues.length ? '<div style="display:flex;flex-direction:column;gap:8px">' + issues.map(function (x) { return '<div class="warn"><span>' + x + '</span></div>'; }).join('') + '</div>' : '<div class="info">Проблем не найдено: всё переведено, у картинок есть описания, ссылки ведут на существующие страницы.</div>') +
      '<button class="btn btn--primary btn--l" id="ex-go" style="align-self:flex-start">' + ui('download') + 'Скачать вёрстку</button><p class="hint" style="margin:0">Распакуйте архив и откройте index.html — он отправит на русскую версию. Для публикации загрузите содержимое папки на статический хостинг: сборка не нужна.</p></section>' +
      '<div style="display:flex;flex-direction:column;gap:24px"><section class="card" aria-labelledby="ex-t"><h2 class="h2" id="ex-t">Состав архива</h2><pre class="tree">' + esc(tree) + '</pre></section>' +
      '<section class="card" aria-labelledby="ex-j"><h2 class="h2" id="ex-j">Проект для переноса</h2><p class="hint" style="margin:0;font-size:14px">JSON со всеми страницами, переводами, блоками и загруженными картинками. Откройте его на экране проектов в другом браузере.</p><button class="btn btn--l" id="ex-json" style="align-self:flex-start">' + ui('download') + 'Скачать JSON</button></section></div></div></main>';
    Array.prototype.forEach.call(document.querySelectorAll('[name=scope]'), function (r) { r.onchange = function () { S.ui.exportScope = r.value; renderExport(); }; });
    Array.prototype.forEach.call(document.querySelectorAll('[data-exlang]'), function (c) { c.onchange = function () { var l = exportLangs(), k = c.getAttribute('data-exlang'); l = c.checked ? l.concat([k]) : l.filter(function (x) { return x !== k; }); if (!l.length) l = ['ru']; S.ui.exportLangs = l; renderExport(); }; });
    document.getElementById('ex-brand').onchange = function (e) { p.settings.brandFonts = e.target.checked; save(); renderExport(); };
    document.getElementById('ex-json').onclick = function () { exportJSON(p); };
    document.getElementById('ex-go').onclick = function () {
      var btn = this; btn.disabled = true; btn.textContent = 'Собираю архив…';
      buildSite(p, pages, { brand: p.settings.brandFonts !== false, single: S.ui.exportScope === 'page', langs: langs }).then(function (files) {
        download(zip(files), slugify(p.name || 'site') + (S.ui.exportScope === 'page' ? '-' + (pg.slug || 'page') : '') + '.zip');
        btn.disabled = false; btn.innerHTML = ui('download') + 'Скачать вёрстку'; toast('Архив готов: ' + files.length + ' файлов');
      }).catch(function (err) { btn.disabled = false; btn.innerHTML = ui('download') + 'Скачать вёрстку'; toast('Не удалось собрать архив: ' + err.message); });
    };
  }
  function checkIssues(p, pages, langs) {
    var out = [], ids = pages.map(function (x) { return x.id; });
    pages.forEach(function (pg) {
      langs.filter(function (l) { return l !== 'ru'; }).forEach(function (l) {
        var n = pageMissing(pg, l);
        if (n) out.push('<b>' + langName(l) + ': ' + plural(n, 'текст', 'текста', 'текстов') + ' без перевода</b> на странице «' + esc(pg.name) + '». В экспорт попадёт русский вариант. Найти их можно кнопкой «К следующему» в редакторе на языке ' + langName(l) + '.');
        if (!((pg.i18n || {})[l] || {}).seoTitle) out.push('<b>' + langName(l) + ': нет SEO-заголовка</b> у страницы «' + esc(pg.name) + '» — возьмётся русский.');
      });
      pg.blocks.forEach(function (b) {
        JSON.stringify(b.d).replace(/"src":"([^"]+)","alt":""/g, function (m, src) { if (!/logo/.test(src)) out.push('<b>Нет описания картинки</b> в блоке «' + esc(blockName(b)) + '» на странице «' + esc(pg.name) + '»'); });
        JSON.stringify(b.d).replace(/page:([\w]+)/g, function (m, id) { if (ids.indexOf(id) < 0) { var tp = p.pages.filter(function (x) { return x.id === id; })[0]; out.push(tp ? '<b>Ссылка на страницу «' + esc(tp.name) + '»</b> из блока «' + esc(blockName(b)) + '» ведёт на файл ' + esc(fileOf(tp, p)) + ', которого не будет в архиве текущей страницы.' : '<b>Ссылка на удалённую страницу</b> в блоке «' + esc(blockName(b)) + '»'); } });
        if (b.type === 'footer') out.push('<b>Форма подписки в подвале</b> перенесена с uzumbank.uz как есть и сама данные не отправляет: подключите её к обработчику основного сайта при публикации.');
      });
      if (!pg.blocks.length) out.push('<b>Пустая страница</b> «' + esc(pg.name) + '»');
      if (!pg.seoDesc) out.push('<b>Нет метаописания</b> у страницы «' + esc(pg.name) + '»');
    });
    return out.filter(function (x, i) { return out.indexOf(x) === i; });
  }
  function exportTree(p, pages, langs) {
    var single = S.ui.exportScope === 'page';
    var files = pages.map(function (pg) { return single ? 'index.html' : fileOf(pg, p); });
    var imgs = {};
    pages.forEach(function (pg) { JSON.stringify(pg.blocks).replace(/"(lib:[^"]+|up:[^"]+)"/g, function (m, r) { imgs[assetDir(r, p) + '/' + imgName(r, p)] = 1; }); pg.blocks.forEach(function (b) { if (b.type === 'header') imgs['img/double-line.svg'] = 1; if (b.type === 'footer') imgs['img/uzumbank-logo-dark.svg'] = 1; }); });
    var fonts = (p.settings.brandFonts !== false ? FONTS_BRAND : []).concat(FONTS_BASE);
    var chromeOn = pages.some(function (pg) { return pg.blocks.some(function (b) { return b.type === 'header' || b.type === 'footer'; }); });
    return 'index.html  → ' + (langs[0] || 'ru') + '/index.html\n' + langs.map(function (l) { return l + '/\n' + files.map(function (f) { return '  ' + f; }).join('\n'); }).join('\n') +
      '\nassets/\n' + (chromeOn ? '  chrome.css\n  chrome/ (' + CHROME_FILES.length + ' файлов: шрифты и логотип шапки)\n' : '') + '  site.css\n  site.js\n  fonts/\n' + fonts.map(function (f) { return '    ' + f; }).join('\n') + '\n' + Object.keys(imgs).sort().map(function (f) { return '  ' + f; }).join('\n');
  }
  function assetDir(ref, p) { if (ref.indexOf('lib:') === 0) return 'img'; var a = (p || S.p).assets[ref.slice(3)]; return a && !/^image\//.test(a.type || '') ? 'docs' : 'img'; }
  function imgName(ref, p) {
    if (ref.indexOf('lib:') === 0) return ref.slice(4);
    var id = ref.slice(3), a = (p || S.p).assets[id]; if (!a) return id;
    if (!/^image\//.test(a.type || '')) return (slugify((a.name || '').replace(/\.[a-z0-9]+$/i, '')) || 'file') + '-' + id.slice(-5) + '.' + (a.ext || DOC_TYPES[a.type] || 'bin');
    var ext = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/svg+xml': 'svg', 'image/gif': 'gif' }[a.type] || 'img';
    return (slugify((a.name || '').replace(/\.[a-z0-9]+$/i, '')) || 'image') + '-' + id.slice(-5) + '.' + ext;
  }
  function pageHTML(p, pg, opts, used, lang) {
    var single = opts.single, P = '../';
    var fname = function (t) { return single && t === pg ? 'index.html' : fileOf(t, p); };
    var ctx = {
      edit: false, h1: false, lang: lang,
      img: function (ref) { if (!ref) return ''; if (/^(lib:|up:)/.test(ref)) { var n = imgName(ref, p); used[ref] = n; return P + 'assets/' + assetDir(ref, p) + '/' + n; } return ref; },
      asset: function (ref) { var a = /^up:/.test(ref || '') && p.assets[ref.slice(3)]; return a ? { ext: a.ext || DOC_TYPES[a.type] || '', size: a.size || Math.round((a.data || '').length * 0.75) } : null; },
      href: function (h) {
        if (!h) return '#';
        if (h.indexOf('page:') === 0) { var t = p.pages.filter(function (x) { return x.id === h.slice(5); })[0]; return t ? fname(t) : '#'; }
        if (lang !== 'ru') h = h.replace(/(uzumbank\.uz\/)ru(\/|$)/, '$1' + lang + '$2');
        return h;
      },
      isCurrent: function (h) { return h === 'page:' + pg.id; },
      homeHref: function () { return 'page:' + homePage(p).id; },
      tabSel: function () { return 0; }, faqOpen: function () { return false; },
      size: function (ref) { var a = /^up:/.test(ref || '') && p.assets[ref.slice(3)]; return a && a.w ? [a.w, a.h] : null; }
    };
    var view = pg.blocks.map(function (b) { return { id: b.id, type: b.type, v: b.v, d: U.dataFor(b, lang) }; });
    var body = U.renderBlocks(view, ctx);
    var tr = lang === 'ru' ? {} : ((pg.i18n || {})[lang] || {});
    var title = tr.seoTitle || pg.seoTitle || pg.name, desc = tr.seoDesc || pg.seoDesc || '';
    var alts = opts.langs.map(function (l) { return '<link rel="alternate" hreflang="' + l + '" href="' + P + l + '/' + fname(pg) + '">'; }).join('\n') + '\n<link rel="alternate" hreflang="x-default" href="' + P + opts.langs[0] + '/' + fname(pg) + '">';
    var chrome = pg.blocks.some(function (b) { return b.type === 'header' || b.type === 'footer'; });
    return '<!doctype html>\n<html lang="' + lang + '">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>' + esc(title) + '</title>\n' +
      (desc ? '<meta name="description" content="' + esc(desc) + '">\n' : '') + '<meta property="og:title" content="' + esc(title) + '">\n' + (desc ? '<meta property="og:description" content="' + esc(desc) + '">\n' : '') +
      '<meta property="og:locale" content="' + { ru: 'ru_RU', uz: 'uz_UZ', en: 'en_US' }[lang] + '">\n<meta property="og:type" content="website">\n' + alts + '\n' +
      '<script>document.documentElement.classList.add("u-js")</script>\n' + (chrome ? '<link rel="stylesheet" href="' + P + 'assets/chrome.css">\n' : '') + '<link rel="stylesheet" href="' + P + 'assets/site.css">\n</head>\n<body class="u-body">\n<a class="u-skip" href="#main">' + SKIP[lang] + '</a>\n' + body + '\n<script src="' + P + 'assets/site.js" defer></script>\n</body>\n</html>\n';
  }
  function fetchBytes(url) { return fetch(url).then(function (r) { if (!r.ok) throw new Error('нет файла ' + url); return r.arrayBuffer(); }).then(function (b) { return new Uint8Array(b); }); }
  function buildSite(p, pages, opts) {
    var files = [], used = {}, enc = new TextEncoder(), langs = opts.langs && opts.langs.length ? opts.langs : ['ru'];
    opts.langs = langs;
    langs.forEach(function (l) { pages.forEach(function (pg) { files.push({ name: l + '/' + (opts.single ? 'index.html' : fileOf(pg, p)), data: enc.encode(pageHTML(p, pg, opts, used, l)) }); }); });
    var first = langs[0], names = { ru: 'Русский', uz: "O'zbekcha", en: 'English' };
    files.push({ name: 'index.html', data: enc.encode('<!doctype html>\n<html lang="' + first + '">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>' + esc(p.name) + '</title>\n<meta http-equiv="refresh" content="0; url=' + first + '/index.html">\n' + langs.map(function (l) { return '<link rel="alternate" hreflang="' + l + '" href="' + l + '/index.html">'; }).join('\n') + '\n</head>\n<body>\n<p>' + langs.map(function (l) { return '<a href="' + l + '/index.html" lang="' + l + '">' + names[l] + '</a>'; }).join(' · ') + '</p>\n</body>\n</html>\n') });
    var jobs = [];
    jobs.push(fetch(BASE + 'site/site.css').then(function (r) { return r.text(); }).then(function (css) { if (!opts.brand) css = css.replace(/\/\*@brand-fonts-start\*\/[\s\S]*?\/\*@brand-fonts-end\*\//, ''); files.push({ name: 'assets/site.css', data: enc.encode(css) }); }));
    var hasChrome = pages.some(function (pg) { return pg.blocks.some(function (b) { return b.type === 'header' || b.type === 'footer'; }); });
    if (hasChrome) {
      jobs.push(fetchBytes(BASE + 'site/chrome.css').then(function (d) { files.push({ name: 'assets/chrome.css', data: d }); }));
      CHROME_FILES.forEach(function (f) { jobs.push(fetchBytes(BASE + 'site/chrome/' + f).then(function (d) { files.push({ name: 'assets/chrome/' + f, data: d }); })); });
    }
    jobs.push(fetchBytes(BASE + 'site/site.js').then(function (d) { files.push({ name: 'assets/site.js', data: d }); }));
    (opts.brand ? FONTS_BRAND : []).concat(FONTS_BASE).forEach(function (f) { jobs.push(fetchBytes(BASE + 'site/fonts/' + f).then(function (d) { files.push({ name: 'assets/fonts/' + f, data: d }); })); });
    Object.keys(used).forEach(function (ref) {
      var name = 'assets/' + assetDir(ref, p) + '/' + used[ref];
      if (ref.indexOf('lib:') === 0) jobs.push(fetchBytes(BASE + 'site/lib/' + ref.slice(4)).then(function (d) { files.push({ name: name, data: d }); }));
      else { var a = p.assets[ref.slice(3)]; if (a) jobs.push(dataToBlob(a.data).arrayBuffer().then(function (b) { files.push({ name: name, data: new Uint8Array(b) }); })); }
    });
    return Promise.all(jobs).then(function () { files.sort(function (a, b) { return a.name.localeCompare(b.name); }); return files; });
  }

  /* ---------- ZIP (без сжатия, UTF-8 имена) ---------- */
  var CRC = (function () { var t = new Uint32Array(256); for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(d) { var c = 0xFFFFFFFF; for (var i = 0; i < d.length; i++) c = CRC[(c ^ d[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function zip(files) {
    var enc = new TextEncoder(), parts = [], central = [], off = 0, dt = new Date();
    var time = (dt.getHours() << 11) | (dt.getMinutes() << 5) | (dt.getSeconds() >> 1), date = ((dt.getFullYear() - 1980) << 9) | ((dt.getMonth() + 1) << 5) | dt.getDate();
    files.forEach(function (f) {
      var name = enc.encode(f.name), crc = crc32(f.data), size = f.data.length;
      var h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true); h.setUint16(10, time, true); h.setUint16(12, date, true);
      h.setUint32(14, crc, true); h.setUint32(18, size, true); h.setUint32(22, size, true); h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
      parts.push(new Uint8Array(h.buffer), name, f.data);
      var c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true); c.setUint16(12, time, true); c.setUint16(14, date, true);
      c.setUint32(16, crc, true); c.setUint32(20, size, true); c.setUint32(24, size, true); c.setUint16(28, name.length, true); c.setUint32(38, 0, true); c.setUint32(42, off, true);
      central.push(new Uint8Array(c.buffer), name);
      off += 30 + name.length + size;
    });
    var csize = central.reduce(function (s, x) { return s + x.length; }, 0);
    var e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, csize, true); e.setUint32(16, off, true);
    return new Blob(parts.concat(central, [new Uint8Array(e.buffer)]), { type: 'application/zip' });
  }
  var DL = null;
  if (window.claude && window.claude.use) window.claude.use('downloads').then(function (d) { DL = d; }).catch(function () { });
  function download(blob, name) {
    if (!DL && window.claude && window.claude.use) { window.claude.use('downloads').then(function (d) { DL = d; if (d) download(blob, name); else fallbackDl(blob, name); }).catch(function () { fallbackDl(blob, name); }); return; }
    if (DL) { DL.save({ filename: name, data: blob }).then(function () { toast('Файл сохранён: ' + name); }).catch(function (e) { if (e && e.code !== 'declined') toast('Не удалось сохранить файл' + (e && e.code === 'host_unavailable' ? ': откройте конструктор в браузере на компьютере' : '')); }); return; }
    fallbackDl(blob, name);
  }
  function fallbackDl(blob, name) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000); }

  /* ================= маршрутизация ================= */
  function route() {
    var h = location.hash.replace(/^#/, '');
    var m = /^\/p\/([\w]+)(?:\/(export))?/.exec(h);
    if (S.p && (!m || m[1] !== S.p.id)) { clearTimeout(S.saveT); save(); }
    if (m) { if (S.p && S.p.id === m[1]) { if (m[2]) renderExport(); else renderEditor(); } else openEditor(m[1], m[2]); }
    else { S.p = null; renderProjects(); }
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);
  DB.open().then(function () { return DB.all(); }).then(function (all) {
    S.projects = all || [];
    if (!location.hash || location.hash === '#') {
      return DB.getMeta('last').then(function (last) { if (last && S.projects.some(function (p) { return p.id === last; })) location.hash = '#/p/' + last; else route(); });
    }
    route();
  }).catch(function (e) { $app.innerHTML = '<main class="wrap"><div class="warn">Не удалось открыть хранилище браузера: ' + esc(e.message) + '</div></main>'; });
  window.UZAPP = { S: S, zip: zip, buildSite: buildSite, crc32: crc32, save: save };
})();
