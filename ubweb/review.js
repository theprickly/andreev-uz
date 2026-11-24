/* Ревью блоков конструктора дизайнерами. Комментарии хранятся на сервере: /ubweb/api/* */
(function () {
  'use strict';
  var U = window.UZB, BASE = new URL('.', location.href).href;
  var API = BASE + 'api/';
  var WIDTHS = [390, 768, 1440];
  var DATA = { comments: [], status: [] }, FILTER = 'all';
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var $rows = document.getElementById('rows'), $me = document.getElementById('me');
  try { $me.value = localStorage.getItem('ubreview-author') || ''; } catch (e) {}
  $me.addEventListener('change', function () { try { localStorage.setItem('ubreview-author', $me.value.trim()); } catch (e) {} });

  function toast(t) { var el = document.getElementById('toast'); el.textContent = t; el.classList.add('on'); clearTimeout(el._t); el._t = setTimeout(function () { el.classList.remove('on'); }, 2600); }

  /* ---------- блоки ---------- */
  var entries = U.CATALOG.map(function (e) {
    var b = U.makeBlock(e.id), def = U.B[e.type];
    return { id: e.id, type: e.type, name: e.name || def.name, cat: def.cat, block: b, width: 1440 };
  });

  function variantsOf(en) { return (U.B[en.type].variants || []).filter(function (x) { return U.when(x.when, en.block.v); }); }
  function variantText(en) { return variantsOf(en).map(function (x) { var o = x.options.filter(function (o) { return o[0] === en.block.v[x.key]; })[0]; return x.label + ': ' + (o ? o[1] : en.block.v[x.key]); }).join(', '); }

  function docFor(en) {
    var ctx = { edit: false, lang: 'ru', img: function (r) { return !r ? '' : r.indexOf('lib:') === 0 ? 'lib/' + r.slice(4) : r; }, href: function (h) { return h || '#'; }, isCurrent: function () { return false; }, homeHref: function () { return '#'; }, tabSel: function () { return 0; }, faqOpen: function () { return false; } };
    var html = U.renderBlocks([en.block], ctx);
    var chrome = en.type === 'header' || en.type === 'footer';
    return '<!doctype html><html lang="ru" class="u-js"><head><meta charset="utf-8"><base href="' + BASE + 'site/">' + (chrome ? '<link rel="stylesheet" href="chrome.css">' : '') + '<link rel="stylesheet" href="site.css"><style>html{background:#F3F1F8}body{padding:24px 0}a{pointer-events:none}</style></head><body class="u-body">' + html + '<script src="site.js"><\/script></body></html>';
  }

  function rowHTML(en) {
    var vs = variantsOf(en).map(function (x) {
      return '<label>' + esc(x.label) + '<span class="seg" role="group" aria-label="' + esc(x.label) + '">' + x.options.map(function (o) { return '<button type="button" data-v="' + x.key + '" data-val="' + esc(o[0]) + '" aria-pressed="' + (en.block.v[x.key] === o[0]) + '">' + esc(o[1]) + '</button>'; }).join('') + '</span></label>';
    }).join('');
    return '<div class="stage"><div class="head"><h2 id="h-' + en.id + '">' + esc(en.name) + '</h2><span class="cat">' + esc(en.cat) + '</span></div>' +
      '<div class="ctl"><span class="seg" role="group" aria-label="Ширина экрана">' + WIDTHS.map(function (w) { return '<button type="button" data-w="' + w + '" aria-pressed="' + (en.width === w) + '">' + w + '</button>'; }).join('') + '</span>' + vs + '</div>' +
      '<div class="canvas"><div class="frame"><div class="ph">Блок загрузится при прокрутке</div></div></div></div>' +
      '<aside class="disc" aria-labelledby="h-' + en.id + '"></aside>';
  }

  function mount(en, row) {
    var canvas = row.querySelector('.canvas'), frame = row.querySelector('.frame');
    var avail = canvas.clientWidth - 32, scale = Math.min(1, avail / en.width);
    frame.innerHTML = '';
    var ifr = document.createElement('iframe');
    ifr.title = 'Блок «' + en.name + '», ширина ' + en.width;
    ifr.style.width = en.width + 'px'; ifr.style.height = '300px';
    frame.style.width = en.width + 'px'; frame.style.transform = 'scale(' + scale + ')';
    frame.appendChild(ifr);
    var fit = function () {
      try { var h = ifr.contentDocument.documentElement.scrollHeight; ifr.style.height = h + 'px'; canvas.style.height = (h * scale + 32) + 'px'; } catch (e) {}
    };
    ifr.addEventListener('load', function () {
      fit();
      try { new ResizeObserver(fit).observe(ifr.contentDocument.body); } catch (e) {}
      setTimeout(fit, 600); setTimeout(fit, 2500);
    });
    ifr.srcdoc = docFor(en);
    en.mounted = true;
  }

  /* ---------- обсуждение ---------- */
  function statusOf(id) { var s = DATA.status.filter(function (x) { return x.block === id; })[0]; return s ? s.status : 'new'; }
  function commentsOf(id) { return DATA.comments.filter(function (c) { return c.block === id; }); }
  function fmt(iso) { try { return new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }

  function discHTML(en) {
    var st = statusOf(en.id), list = commentsOf(en.id), sObj = DATA.status.filter(function (x) { return x.block === en.id; })[0];
    return '<div class="st" role="group" aria-label="Статус блока">' + [['new', 'Без ревью'], ['fix', 'Нужны правки'], ['ok', 'Принят']].map(function (s) { return '<button type="button" class="chip" data-s="' + s[0] + '" aria-pressed="' + (st === s[0]) + '">' + s[1] + '</button>'; }).join('') + '</div>' +
      (sObj && sObj.author ? '<span class="who">Статус поставил' + (sObj.author ? ': ' + esc(sObj.author) : '') + ', ' + esc(fmt(sObj.updated)) + '</span>' : '') +
      '<div class="list">' + (list.length ? list.map(function (c) {
        return '<article class="cm' + (c.resolved ? ' is-done' : '') + '"><header><b>' + esc(c.author || 'Без имени') + '</b><span>' + esc(fmt(c.created)) + '</span></header>' +
          (c.width || c.variant ? '<span class="ctxl">' + esc([c.width ? c.width + ' px' : '', c.variant].filter(Boolean).join(' · ')) + '</span>' : '') +
          (c.issue ? '<span class="k">Что не так</span><p>' + esc(c.issue) + '</p>' : '') + (c.rule ? '<span class="k">Правило</span><p>' + esc(c.rule) + '</p>' : '') +
          '<label><input type="checkbox" data-res="' + c.id + '"' + (c.resolved ? ' checked' : '') + ' style="width:auto"> Исправлено</label></article>';
      }).join('') : '<p class="empty">Замечаний пока нет.</p>') + '</div>' +
      '<form data-form><label>Что не так<textarea name="issue" rows="3" placeholder="Например: заголовок на 390 переносится по одному слову"></textarea></label>' +
      '<label>Правило вёрстки<textarea name="rule" rows="2" placeholder="Например: отступ от заголовка до текста — 16 px на всех ширинах"></textarea></label>' +
      '<span class="ctxl">Замечание запишется с контекстом: ' + en.width + ' px' + (variantText(en) ? ' · ' + esc(variantText(en)) : '') + '</span>' +
      '<button class="btn btn--p" type="submit">Отправить</button></form>';
  }

  function renderDisc(en) { var row = document.getElementById('r-' + en.id); if (row) row.querySelector('.disc').innerHTML = discHTML(en); }
  function renderAllDisc() { entries.forEach(renderDisc); renderTop(); applyFilter(); }

  function renderTop() {
    var n = entries.length, ok = 0, fix = 0;
    entries.forEach(function (en) { var s = statusOf(en.id); if (s === 'ok') ok++; else if (s === 'fix') fix++; });
    document.getElementById('prog').innerHTML = '<span class="bar" aria-hidden="true"><i style="width:' + (ok / n * 100) + '%;background:var(--ok)"></i><i style="width:' + (fix / n * 100) + '%;background:var(--fix)"></i></span>Принято ' + ok + ' из ' + n + (fix ? ' · правки: ' + fix : '');
    document.getElementById('nav').innerHTML = entries.map(function (en) { var s = statusOf(en.id); return '<a href="#r-' + en.id + '" class="' + (s === 'new' ? '' : s) + '">' + esc(en.name) + (commentsOf(en.id).filter(function (c) { return !c.resolved; }).length ? ' · ' + commentsOf(en.id).filter(function (c) { return !c.resolved; }).length : '') + '</a>'; }).join('');
  }
  function applyFilter() { entries.forEach(function (en) { var row = document.getElementById('r-' + en.id); row.hidden = FILTER !== 'all' && statusOf(en.id) !== FILTER; }); }

  /* ---------- сеть ---------- */
  function call(path, body) {
    return fetch(API + path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'same-origin' } : { credentials: 'same-origin', cache: 'no-store' })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || ('Ошибка ' + r.status)); return j; }); });
  }
  function load() { return call('review').then(function (d) { DATA = d; renderAllDisc(); }).catch(function (e) { toast('Не удалось загрузить замечания: ' + e.message); }); }

  /* ---------- отрисовка ---------- */
  $rows.innerHTML = entries.map(function (en) { return '<section class="row" id="r-' + en.id + '">' + rowHTML(en) + '</section>'; }).join('');
  var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { var en = entries.filter(function (x) { return 'r-' + x.id === e.target.id; })[0]; if (en && !en.mounted) mount(en, e.target); io.unobserve(e.target); } }); }, { rootMargin: '800px 0px' });
  entries.forEach(function (en) { io.observe(document.getElementById('r-' + en.id)); });
  renderAllDisc(); load();
  setInterval(function () { if (!document.hidden) load(); }, 30000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) load(); });
  var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { entries.forEach(function (en) { if (en.mounted) mount(en, document.getElementById('r-' + en.id)); }); }, 300); });

  function entryOf(el) { var row = el.closest('.row'); return row && entries.filter(function (x) { return 'r-' + x.id === row.id; })[0]; }
  function me() { var n = $me.value.trim(); if (!n) { $me.focus(); toast('Укажите имя вверху — чтобы было понятно, чьё замечание'); } return n; }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('button'); if (!t) return;
    if (t.parentNode.id === 'flt') { FILTER = t.getAttribute('data-f'); Array.prototype.forEach.call(t.parentNode.children, function (b) { b.setAttribute('aria-pressed', b === t ? 'true' : 'false'); }); applyFilter(); return; }
    if (t.id === 'exp') { exportMD(); return; }
    var en = entryOf(t); if (!en) return;
    if (t.hasAttribute('data-w')) { en.width = +t.getAttribute('data-w'); var row = document.getElementById('r-' + en.id); row.querySelector('.stage').outerHTML = rowHTML(en).replace(/<aside[\s\S]*$/, ''); mount(en, row); renderDisc(en); return; }
    if (t.hasAttribute('data-v')) { en.block.v[t.getAttribute('data-v')] = t.getAttribute('data-val'); var r2 = document.getElementById('r-' + en.id); r2.querySelector('.stage').outerHTML = rowHTML(en).replace(/<aside[\s\S]*$/, ''); mount(en, r2); renderDisc(en); return; }
    if (t.hasAttribute('data-s')) { var who = me(); if (!who) return; call('status', { block: en.id, status: t.getAttribute('data-s'), author: who }).then(function (d) { DATA = d; renderAllDisc(); }).catch(function (err) { toast(err.message); }); }
  });
  document.addEventListener('change', function (e) {
    var c = e.target; if (!c.hasAttribute('data-res')) return;
    call('resolve', { id: +c.getAttribute('data-res'), resolved: c.checked }).then(function (d) { DATA = d; renderAllDisc(); }).catch(function (err) { toast(err.message); });
  });
  document.addEventListener('submit', function (e) {
    var f = e.target; if (!f.hasAttribute('data-form')) return;
    e.preventDefault();
    var en = entryOf(f), who = me(); if (!who) return;
    var issue = f.issue.value.trim(), rule = f.rule.value.trim();
    if (!issue && !rule) { toast('Опишите, что не так, или правило'); return; }
    var btn = f.querySelector('button'); btn.disabled = true;
    call('comment', { block: en.id, author: who, issue: issue, rule: rule, width: String(en.width), variant: variantText(en) })
      .then(function (d) { DATA = d; renderAllDisc(); toast('Замечание сохранено'); })
      .catch(function (err) { btn.disabled = false; toast(err.message); });
  });

  function exportMD() {
    var out = ['# Ревью блоков конструктора Uzum Bank', '', 'Выгружено: ' + new Date().toLocaleString('ru-RU'), ''];
    entries.forEach(function (en) {
      var list = commentsOf(en.id), st = { new: 'Без ревью', fix: 'Нужны правки', ok: 'Принят' }[statusOf(en.id)];
      out.push('## ' + en.name + ' (`' + en.id + '`) — ' + st);
      if (!list.length) out.push('', '_Замечаний нет._');
      list.forEach(function (c) {
        out.push('', '- ' + (c.resolved ? '~~' : '') + (c.author || 'Без имени') + ', ' + fmt(c.created) + (c.width ? ', ' + c.width + ' px' : '') + (c.variant ? ', ' + c.variant : '') + (c.resolved ? '~~ — исправлено' : ''));
        if (c.issue) out.push('  - Что не так: ' + c.issue.replace(/\n/g, ' '));
        if (c.rule) out.push('  - Правило: ' + c.rule.replace(/\n/g, ' '));
      });
      out.push('');
    });
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([out.join('\n')], { type: 'text/markdown' })); a.download = 'ubweb-review.md'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
})();
