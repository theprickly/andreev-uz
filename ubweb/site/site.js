/* Uzum Bank — интерактив страниц: меню, переворот карты, вкладки. FAQ работает на <details> без скриптов. */
(function () {
  document.documentElement.classList.add('u-js');
  function selectTab(tab, focus) {
    var list = tab.closest('[role=tablist]');
    if (!list) return;
    var tabs = list.querySelectorAll('[role=tab]');
    for (var i = 0; i < tabs.length; i++) {
      var on = tabs[i] === tab;
      tabs[i].setAttribute('aria-selected', on ? 'true' : 'false');
      tabs[i].tabIndex = on ? 0 : -1;
      var p = document.getElementById(tabs[i].getAttribute('aria-controls'));
      if (p) { if (on) { p.hidden = false; p.tabIndex = 0; } else { p.setAttribute('hidden', 'until-found'); p.removeAttribute('tabindex'); } }
    }
    if (focus) tab.focus();
  }
  // Поиск по странице (Ctrl+F) раскрывает вкладку с найденным текстом
  document.addEventListener('beforematch', function (e) {
    var p = e.target.closest && e.target.closest('[role=tabpanel]');
    var t = p && document.querySelector('[role=tab][aria-controls="' + p.id + '"]');
    if (t) selectTab(t, false);
  }, true);
  document.addEventListener('click', function (e) {
    var t = e.target;
    var burger = t.closest && t.closest('.u-burger');
    if (burger) {
      var menu = document.getElementById(burger.getAttribute('aria-controls'));
      var open = burger.getAttribute('aria-expanded') !== 'true';
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      var L = { ru: ['Закрыть меню', 'Открыть меню'], uz: ['Menyuni yopish', 'Menyuni ochish'], en: ['Close menu', 'Open menu'] }[document.documentElement.lang] || ['Закрыть меню', 'Открыть меню'];
      burger.setAttribute('aria-label', open ? L[0] : L[1]);
      if (menu) menu.classList.toggle('is-open', open);
      return;
    }
    var flip = t.closest && t.closest('.u-flip');
    if (flip) {
      var on = !flip.classList.contains('is-flipped');
      flip.classList.toggle('is-flipped', on);
      flip.setAttribute('aria-pressed', on ? 'true' : 'false');
      return;
    }
    var tab = t.closest && t.closest('[role=tab]');
    if (tab) { selectTab(tab, false); return; }
    var a = t.closest && t.closest('a[href^="#"]');
    if (a && a.getAttribute('href').length > 1) {
      var target = document.getElementById(a.getAttribute('href').slice(1));
      if (target && target.getAttribute('role') === 'tabpanel') {
        var owner = document.querySelector('[aria-controls="' + target.id + '"]');
        if (owner) selectTab(owner, false);
      }
    }
  });
  document.addEventListener('keydown', function (e) {
    var tab = e.target.closest && e.target.closest('[role=tab]');
    if (!tab) return;
    var tabs = Array.prototype.slice.call(tab.closest('[role=tablist]').querySelectorAll('[role=tab]'));
    var i = tabs.indexOf(tab), n = -1;
    if (e.key === 'ArrowRight') n = (i + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = tabs.length - 1;
    if (n >= 0) { e.preventDefault(); selectTab(tabs[n], true); }
  });
  function openFromHash() {
    var id = location.hash.slice(1);
    if (!id) return;
    var p = document.getElementById(id);
    if (p && p.getAttribute('role') === 'tabpanel') {
      var owner = document.querySelector('[aria-controls="' + id + '"]');
      if (owner) selectTab(owner, false);
    }
  }
  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (f && f.getAttribute && f.getAttribute('data-unconfigured') === 'true') {
      e.preventDefault();
      var msg = f.querySelector('.u-form-msg');
      if (!msg) { msg = document.createElement('p'); msg.className = 'u-form-msg'; msg.setAttribute('role', 'status'); f.appendChild(msg); }
      msg.textContent = 'Форма пока не подключена к обработчику.';
    }
  });
  /* переключатель языка в оригинальной шапке: ссылки берутся из <link rel="alternate" hreflang> */
  var alts = Array.prototype.slice.call(document.querySelectorAll('link[rel=alternate][hreflang]')).filter(function (l) { return l.hreflang !== 'x-default'; });
  var NAMES = { ru: 'Русский', uz: "O'zbekcha", en: 'English' };
  if (alts.length > 1) {
    var cur = document.documentElement.lang;
    Array.prototype.forEach.call(document.querySelectorAll('header .value'), function (v) {
      var btn = v.closest('button'); if (!btn) return;
      btn.setAttribute('aria-haspopup', 'true'); btn.setAttribute('aria-expanded', 'false');
      btn.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        var old = document.querySelector('.u-langmenu'); if (old) { old.remove(); btn.setAttribute('aria-expanded', 'false'); return; }
        var m = document.createElement('div'); m.className = 'u-langmenu'; m.setAttribute('role', 'menu');
        alts.forEach(function (l) { var a = document.createElement('a'); a.href = l.getAttribute('href'); a.setAttribute('role', 'menuitem'); a.lang = l.hreflang; a.textContent = NAMES[l.hreflang] || l.hreflang; if (l.hreflang === cur) a.setAttribute('aria-current', 'true'); m.appendChild(a); });
        var r = btn.getBoundingClientRect();
        m.style.top = (r.bottom + window.scrollY + 6) + 'px'; m.style.left = Math.max(8, Math.min(r.left + window.scrollX, document.documentElement.clientWidth - 196)) + 'px';
        document.body.appendChild(m); btn.setAttribute('aria-expanded', 'true'); m.querySelector('a').focus();
      });
    });
    document.addEventListener('click', function (e) { var m = document.querySelector('.u-langmenu'); if (m && !m.contains(e.target)) m.remove(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { var m = document.querySelector('.u-langmenu'); if (m) m.remove(); } });
  }
  window.addEventListener('hashchange', openFromHash);
  openFromHash();

  /* Акция: обратный отсчёт и автоматическое завершение */
  function tickPromos() {
    var now = Date.now();
    Array.prototype.forEach.call(document.querySelectorAll('[data-deadline]'), function (el) {
      var left = Date.parse(el.getAttribute('data-deadline')) - now;
      if (left <= 0) { el.classList.add('is-ended'); return; }
      var m = Math.floor(left / 60000), set = function (s, v) { var n = el.querySelector(s); if (n) n.textContent = v; };
      set('[data-cd-d]', Math.floor(m / 1440)); set('[data-cd-h]', Math.floor(m % 1440 / 60)); set('[data-cd-m]', m % 60);
    });
  }
  if (document.querySelector('[data-deadline]')) { tickPromos(); setInterval(tickPromos, 30000); }

  /* Калькулятор: формулы те же, что в конструкторе */
  function fmt(n, cur) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ' + cur; }
  function calc(box) {
    var c; try { c = JSON.parse(box.getAttribute('data-calc')); } catch (e) { return; }
    var ai = box.querySelector('[data-in=a]'), ti = box.querySelector('[data-in=t]');
    var a = +ai.value, t = ti ? +ti.value : 1, r = c.r / 100, res;
    if (c.k === 'loan') { var i = r / 12, pay = i ? a * i / (1 - Math.pow(1 + i, -t)) : a / t; res = [pay, pay * t - a]; }
    else if (c.k === 'cashback') { var cb = a * r; if (c.c > 0) cb = Math.min(cb, c.c); res = [cb, cb * 12]; }
    else { var inc = c.p ? a * (Math.pow(1 + r / 12, t) - 1) : a * r * t / 12; res = [inc, a + inc]; }
    var o = box.querySelector('[data-out=a]'); if (o) o.textContent = fmt(a, c.cur);
    o = box.querySelector('[data-out=t]'); if (o) o.textContent = t + ' ' + c.mo;
    for (var k = 0; k < 2; k++) { o = box.querySelector('[data-res="' + k + '"]'); if (o) o.textContent = fmt(res[k], c.cur); }
  }
  document.addEventListener('input', function (e) { var box = e.target.closest && e.target.closest('[data-calc]'); if (box && e.target.hasAttribute('data-in')) calc(box); });

  /* Счётчик карт: число «набегает» при появлении блока на экране. Без JS и при reduce-motion сразу видно итоговое число */
  (function () {
    var boxes = document.querySelectorAll('.u-count');
    if (!boxes.length) return;
    var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    function run(box) {
      box.classList.add('is-in');
      var el = box.querySelector('[data-count]'); if (!el || still || el._done) return; el._done = true;
      var to = +el.getAttribute('data-count'), t0 = performance.now(), dur = 1800;
      (function step(t) {
        var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 4);
        el.textContent = String(Math.round(to * e)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        if (k < 1) requestAnimationFrame(step);
      })(t0);
    }
    if (!('IntersectionObserver' in window)) { Array.prototype.forEach.call(boxes, run); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } }); }, { threshold: 0.35 });
    Array.prototype.forEach.call(boxes, function (b) { io.observe(b); });
  })();

  /* Кэшбэк у партнёров: фильтр по категориям */
  document.addEventListener('click', function (e) {
    var chip = e.target.closest && e.target.closest('.u-pchip'); if (!chip) return;
    var bar = chip.closest('[data-pfilter]'), list = document.getElementById(bar.getAttribute('data-pfilter')), cat = chip.getAttribute('data-pcat');
    Array.prototype.forEach.call(bar.querySelectorAll('.u-pchip'), function (c) { c.setAttribute('aria-pressed', c === chip ? 'true' : 'false'); });
    if (list) Array.prototype.forEach.call(list.children, function (li) { li.hidden = !!cat && li.getAttribute('data-pcat') !== cat; });
  });

  /* Новая шапка: сжимается при прокрутке; ссылки языков в мобильном меню */
  (function () {
    var hd = document.querySelectorAll('.u-hd--sticky');
    if (hd.length) { var on = function () { var s = window.scrollY > 8; Array.prototype.forEach.call(hd, function (h) { h.classList.toggle('is-scrolled', s); }); }; window.addEventListener('scroll', on, { passive: true }); on(); }
    var alts2 = Array.prototype.slice.call(document.querySelectorAll('link[rel=alternate][hreflang]')).filter(function (l) { return l.hreflang !== 'x-default'; });
    Array.prototype.forEach.call(document.querySelectorAll('[data-langlinks]'), function (box) {
      if (alts2.length < 2) return;
      alts2.forEach(function (l) { var a = document.createElement('a'); a.href = l.getAttribute('href'); a.lang = l.hreflang; a.textContent = { ru: 'Русский', uz: "O'zbekcha", en: 'English' }[l.hreflang] || l.hreflang; if (l.hreflang === document.documentElement.lang) a.setAttribute('aria-current', 'true'); box.appendChild(a); });
    });
    /* выпадающие разделы меню */
    function closeDD(except) { Array.prototype.forEach.call(document.querySelectorAll('.u-hd__top[aria-expanded=true]'), function (b) { if (b !== except) { b.setAttribute('aria-expanded', 'false'); var dd = document.getElementById(b.getAttribute('aria-controls')); if (dd) dd.hidden = true; } }); }
    function setDD(b, open) { closeDD(open ? b : null); b.setAttribute('aria-expanded', open ? 'true' : 'false'); var dd = document.getElementById(b.getAttribute('aria-controls')); if (dd) dd.hidden = !open; }
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('button.u-hd__top');
      if (b) { setDD(b, b.getAttribute('aria-expanded') !== 'true'); return; }
      if (!(e.target.closest && e.target.closest('.u-hd__dd'))) closeDD(null);
    });
    var fine = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (fine) Array.prototype.forEach.call(document.querySelectorAll('.u-hd__item'), function (li) {
      var b = li.querySelector('button.u-hd__top'), t; if (!b) return;
      li.addEventListener('mouseenter', function () { clearTimeout(t); setDD(b, true); });
      li.addEventListener('mouseleave', function () { t = setTimeout(function () { setDD(b, false); }, 180); });
    });
    /* версия для слабовидящих: крупнее весь сайт, запоминается */
    var big = false; try { big = localStorage.getItem('u-large') === '1'; } catch (e) {}
    function applyBig() { document.documentElement.classList.toggle('u-large', big); Array.prototype.forEach.call(document.querySelectorAll('.u-hd__a11y'), function (x) { x.setAttribute('aria-pressed', big ? 'true' : 'false'); }); }
    applyBig();
    document.addEventListener('click', function (e) { var x = e.target.closest && e.target.closest('.u-hd__a11y'); if (!x) return; big = !big; try { localStorage.setItem('u-large', big ? '1' : '0'); } catch (err) {} applyBig(); });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var open = document.querySelector('.u-hd__top[aria-expanded=true]'); if (open) { setDD(open, false); open.focus(); return; }
      var p = document.querySelector('.u-hd__panel.is-open'); if (!p) return;
      var b = document.querySelector('[aria-controls="' + p.id + '"]'); if (b) { b.click(); b.focus(); }
    });
  })();
})();
