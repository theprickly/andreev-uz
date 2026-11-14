/* VSplanet Книги — инструменты для ИИ-агентов браузера (WebMCP, document.modelContext).
   Каталог подставляется при сборке (tools/optimize.py → плейсхолдер каталога). Только чтение и навигация. */
(() => {
  if (!("modelContext" in document) || !document.modelContext?.registerTool) return;
  const ROOT = new URL("../", document.currentScript.src);
  const CATALOG = [{"slug":"booker","title":"От тюрьмы к успеху","author":"Букер Т, Эндрю Уильям Райт","description":"Первая автобиография Букера Т «От тюрьмы к успеху» на русском. Перевод для VSplanet.net. Читайте онлайн, без регистрации, или скачайте EPUB."},{"slug":"booker-royalty","title":"Моё восхождение к вершинам рестлинга","author":"Букер Т, Эндрю Уильям Райт","description":"Вторая автобиография Букера Т «Моё восхождение к вершинам рестлинга» на русском — неполный перевод для VSplanet.net. Читайте онлайн, без регистрации."},{"slug":"copeland","title":"На грани","author":"Адам Коупленд (Эдж)","description":"Автобиография Адама Коупленда (Эджа) «На грани» на русском: главы 1–30 в переводе Тани (Dark Bird) для VSplanet.net. Читайте онлайн, без регистрации."},{"slug":"eddie","title":"Обмани смерть. Укради жизнь","author":"Эдди Герреро, Майкл Кругман","description":"Книжный спецпроект VSplanet: «Обмани смерть. Укради жизнь» — история Эдди Герреро. Перевод Александра Суменко для VSplanet.net."},{"slug":"flair","title":"Быть мужчиной","author":"Рик Флэр, Кит Эллиот Гринберг","description":"Автобиография Рика Флэра «Быть мужчиной» на русском: главы 1–6 в переводе Евгения Лайдера для VSplanet.net. Читайте онлайн, без регистрации."},{"slug":"goldust","title":"Кросс-Роудс","author":"Дастин Роудс (Голдаст), Марк Вансил","description":"Автобиография Дастина Роудса (Голдаста) «Кросс-Роудс» на русском — неполный перевод для VSplanet.net. Читайте онлайн, без регистрации."},{"slug":"hart","title":"Хитман","author":"Брет Харт","description":"Автобиография Брета Харта «Хитман» на русском. Перевод для VSplanet.net. Читайте онлайн, без регистрации, или скачайте EPUB."},{"slug":"heenan","title":"Плохиш из мира рестлинга","author":"Бобби Хинан, Стив Андерсон","description":"Автобиография Бобби Хинана «Плохиш из мира рестлинга» на русском. Перевод для VSplanet.net. Читайте онлайн, без регистрации, или скачайте EPUB."},{"slug":"holly","title":"Хардкорная правда","author":"Боб Холли, Росс Уильямс","description":"Автобиография Боба Холли «Хардкорная правда» на русском — неполный перевод для VSplanet.net. Читайте онлайн, без регистрации."},{"slug":"jericho","title":"Неоспоримый","author":"Крис Джерико, Питер Томас Форнатале","description":"Автобиография Криса Джерико «Неоспоримый» на русском. Перевод Артёма Розанова для VSplanet.net. Читайте онлайн, без регистрации, или скачайте EPUB."},{"slug":"lesnar","title":"Тиски смерти","author":"Брок Леснар, Пол Хейман","description":"Автобиография Брока Леснара «Тиски смерти» на русском. Перевод для VSplanet.net. Читайте онлайн, без регистрации, или скачайте EPUB."},{"slug":"piper","title":"В яме с Пайпером","author":"Родди Пайпер, Роберт Пикарелло","description":"Автобиография Родди Пайпера «В яме с Пайпером» на русском — неполный перевод для VSplanet.net. Читайте онлайн, без регистрации."},{"slug":"wcw","title":"Смерть WCW","author":"Р. Д. Рейнольдс и Брайан Альварес","description":"Книга о закате World Championship Wrestling «Смерть WCW» на русском. Перевод Александра Суменко для VSplanet.net. Читайте онлайн, без регистрации, или скачайте EPUB."}];
  const SLUGS = CATALOG.map(b => b.slug);
  const cache = new Map();
  const norm = s => s.toLocaleLowerCase("ru").replace(/ё/g, "е").replace(/[  \s]+/g, " ");
  const bookUrl = slug => new URL(slug + "/", ROOT).href;
  const readerUrl = (slug, ch, p) => bookUrl(slug) + "#read/" + ch + (p == null ? "" : "/" + p);
  const unknown = slug => ({ error: `Книга «${slug}» не найдена.`, availableBooks: SLUGS });

  async function getJSON(url, signal) {
    const r = await fetch(url, { signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${url}`);
    return r.json();
  }
  async function bookData(slug, signal) {
    if (cache.has(slug)) return cache.get(slug);
    const files = await getJSON(new URL(slug + "/files.json", ROOT), signal);
    const name = files.files.map(f => f[0]).find(n => /^book-[0-9a-f]+\.json$/.test(n));
    const data = await getJSON(new URL(slug + "/" + name, ROOT), signal);
    cache.set(slug, data);
    return data;
  }
  async function chapterBlocks(slug, ch, signal) {
    const data = await bookData(slug, signal);
    const c = data.chapters[ch];
    if (c.blocks) return c.blocks;
    const r = await fetch(new URL(slug + "/" + c.f, ROOT), { signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const t = document.createElement("template");
    t.innerHTML = await r.text();           // текст сайта, не пользовательский ввод; <template> инертен
    c.blocks = [...t.content.children].map(e => e.textContent.replace(/\s+/g, " ").trim());
    return c.blocks;
  }
  function excerpt(text, words) {
    const n = norm(text);
    const at = Math.max(0, n.indexOf(words[0]));
    const from = Math.max(0, at - 120), to = Math.min(text.length, at + 200);
    return (from ? "…" : "") + text.slice(from, to).trim() + (to < text.length ? "…" : "");
  }
  const clampInt = (v, lo, hi, d) => Number.isInteger(v) ? Math.min(hi, Math.max(lo, v)) : d;
  const failed = (err, signal) => { if (signal?.aborted) throw err; return { error: "Не удалось загрузить текст: " + (err?.message || err) }; };

  const tools = [
    {
      name: "list_books",
      description: "Возвращает каталог автобиографий рестлеров в русском переводе VSplanet: идентификатор книги, название, автора и адрес. Используйте, чтобы узнать, какие книги есть, или найти идентификатор книги для других инструментов.",
      inputSchema: { type: "object", properties: {} },
      execute: () => CATALOG.map(b => ({ ...b, url: bookUrl(b.slug) })),
      annotations: { readOnlyHint: true, untrustedContentHint: false },
    },
    {
      name: "get_table_of_contents",
      description: "Возвращает оглавление книги: номер, название и объём каждой главы и ссылку для чтения. Используйте, когда нужно найти главу по названию или понять структуру книги.",
      inputSchema: { type: "object", properties: {
        book: { type: "string", enum: SLUGS, description: "Идентификатор книги из list_books." } }, required: ["book"] },
      async execute({ book }, { signal } = {}) {
        if (!SLUGS.includes(book)) return unknown(book);
        try {
          const data = await bookData(book, signal);
          return { book, title: data.title, chapters: data.chapters.map((c, i) => ({
            chapter: i, title: c.title, words: c.words, minutes: Math.max(1, Math.ceil(c.words / 200)), url: readerUrl(book, i) })) };
        } catch (e) { return failed(e, signal); }
      },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
    },
    {
      name: "search_book_text",
      description: "Ищет слова в полном тексте книг и возвращает абзацы с совпадениями: книгу, главу, отрывок и ссылку прямо на абзац в читалке. Используйте, чтобы найти упоминание человека, матча, события или цитату. Регистр и буква «ё» не важны; в абзаце должны встретиться все слова запроса.",
      inputSchema: { type: "object", properties: {
        query: { type: "string", description: "Слова на русском, как они могут стоять в тексте, например «Монреаль Винс» или «Овен Харт»." },
        book: { type: "string", enum: SLUGS, description: "Искать только в этой книге. Без него поиск идёт по всем книгам — это дольше." },
        limit: { type: "integer", minimum: 1, maximum: 50, default: 10, description: "Сколько совпадений вернуть." } },
        required: ["query"] },
      async execute({ query, book, limit } = {}, { signal } = {}) {
        if (typeof query !== "string" || norm(query).trim().length < 2) return { error: "Передайте запрос хотя бы из двух букв." };
        if (book != null && !SLUGS.includes(book)) return unknown(book);
        const max = clampInt(limit, 1, 50, 10), words = norm(query).trim().split(" ");
        const results = [], searched = [];
        try {
          for (const slug of book ? [book] : SLUGS) {
            const data = await bookData(slug, signal);
            const all = await Promise.all(data.chapters.map((_, ch) => chapterBlocks(slug, ch, signal)));
            for (let ch = 0; ch < all.length && results.length < max; ch++) {
              all[ch].forEach((t, p) => {
                if (results.length < max && words.every(w => norm(t).includes(w)))
                  results.push({ book: slug, bookTitle: data.title, chapter: ch, chapterTitle: data.chapters[ch].title,
                                 paragraph: p, excerpt: excerpt(t, words), url: readerUrl(slug, ch, p) });
              });
            }
            searched.push(slug);
            if (results.length >= max) break;
          }
        } catch (e) { return failed(e, signal); }
        return { query, results, truncated: results.length >= max, searchedBooks: searched };
      },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
    },
    {
      name: "open_in_reader",
      description: "Открывает книгу в читалке на этой вкладке — на нужной главе и, если указан, на нужном абзаце с подсветкой. Используйте после поиска или оглавления, когда человек хочет прочитать найденное место.",
      inputSchema: { type: "object", properties: {
        book: { type: "string", enum: SLUGS, description: "Идентификатор книги из list_books." },
        chapter: { type: "integer", minimum: 0, description: "Номер главы из get_table_of_contents или search_book_text." },
        paragraph: { type: "integer", minimum: 0, description: "Номер абзаца из search_book_text." } },
        required: ["book"] },
      async execute({ book, chapter, paragraph } = {}, { signal } = {}) {
        if (!SLUGS.includes(book)) return unknown(book);
        let url = bookUrl(book);
        if (chapter != null) {
          try {
            const n = (await bookData(book, signal)).chapters.length;
            if (!Number.isInteger(chapter) || chapter < 0 || chapter >= n) return { error: `В книге ${n} глав: номер от 0 до ${n - 1}.` };
          } catch (e) { return failed(e, signal); }
          url = readerUrl(book, chapter, Number.isInteger(paragraph) && paragraph >= 0 ? paragraph : null);
        }
        const target = new URL(url);
        if (target.pathname === location.pathname) location.hash = target.hash;   // та же книга: переход без перезагрузки
        else setTimeout(() => location.assign(url), 50);                           // ответ агенту уходит до смены страницы
        return { opened: url };
      },
      annotations: { readOnlyHint: false },
    },
  ];
  const ctl = new AbortController();
  addEventListener("pagehide", e => { if (!e.persisted) ctl.abort(); });
  for (const t of tools) Promise.resolve(document.modelContext.registerTool(t, { signal: ctl.signal })).catch(() => {});
})();
