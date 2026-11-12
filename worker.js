// andreev.uz — Worker.
// Всё, кроме /mave/api/*, отдаётся как статика (env.ASSETS).
// /mave/api/* — серверная часть переноса подкаста MAVE → Internet Archive:
//   GET  /mave/api/feed?url=…   — RSS-лента MAVE (браузер сам её прочитать не может: нет CORS)
//   GET  /mave/api/meta?id=…    — метаданные страницы archive.org (для сверки размеров)
//   POST /mave/api/transfer     — один выпуск: поток из MAVE прямо в Internet Archive (S3 API)
// Ключи Internet Archive приходят в теле запроса и нигде не сохраняются.

const FEED_HOSTS = new Set(['cloud.mave.digital']);
const AUDIO_HOST = /(^|\.)mave\.digital$/;
const BUCKET = /^[a-z0-9][a-z0-9-]{4,90}$/;
const FILE = /^[a-z0-9][a-z0-9-]{0,120}\.(mp3|m4a)$/;
const KEY = /^[A-Za-z0-9_+/.=-]{8,256}$/;
const MAX_FEED = 24 * 1024 * 1024;
const MAX_AUDIO = 600 * 1024 * 1024;
const UA = 'andreev.uz podcast archive transfer (owner-initiated)';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/mave/api/')) {
      try {
        return await api(request, url);
      } catch (error) {
        return json({ error: error.message || 'Внутренняя ошибка.' }, 500);
      }
    }
    return env.ASSETS.fetch(request);
  },
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function httpsUrl(raw, hostTest) {
  let u;
  try { u = new URL(raw); } catch { return null; }
  if (u.protocol !== 'https:' || u.username || u.password || (u.port && u.port !== '443')) return null;
  return hostTest(u.hostname) ? u : null;
}

async function api(request, url) {
  const route = url.pathname.slice('/mave/api/'.length);

  if (route === 'feed' && request.method === 'GET') {
    const src = httpsUrl(url.searchParams.get('url') || '', (h) => FEED_HOSTS.has(h));
    if (!src) return json({ error: 'Нужна ссылка вида https://cloud.mave.digital/…' }, 400);
    const res = await fetch(src, { headers: { 'User-Agent': UA } });
    if (!res.ok) return json({ error: `MAVE вернул HTTP ${res.status}. Проверь ссылку на RSS.` }, 502);
    const body = await res.arrayBuffer();
    if (body.byteLength > MAX_FEED) return json({ error: 'RSS больше 24 МБ.' }, 413);
    return new Response(body, {
      headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }

  if (route === 'meta' && request.method === 'GET') {
    const id = url.searchParams.get('id') || '';
    if (!BUCKET.test(id)) return json({ error: 'Неверный идентификатор.' }, 400);
    const res = await fetch(`https://archive.org/metadata/${id}`, {
      headers: { 'User-Agent': UA }, cf: { cacheTtl: 0 },
    });
    if (!res.ok) return json({ error: `archive.org вернул HTTP ${res.status}.` }, 502);
    const data = await res.json();
    const files = (data.files || [])
      .filter((f) => f.source === 'original')
      .map((f) => ({ name: f.name, size: Number(f.size || 0) }));
    return json({ exists: Boolean(data.metadata), files });
  }

  if (route === 'transfer' && request.method === 'POST') {
    const origin = request.headers.get('Origin');
    if (origin && origin !== url.origin) return json({ error: 'Запрос с чужого сайта.' }, 403);
    const len = Number(request.headers.get('Content-Length') || 0);
    if (len > 32768) return json({ error: 'Слишком большой запрос.' }, 413);
    let d;
    try { d = await request.json(); } catch { return json({ error: 'Некорректный JSON.' }, 400); }
    return transfer(d);
  }

  return json({ error: 'Действие не найдено.' }, 404);
}

const enc = (v) => 'uri(' + encodeURIComponent(String(v)) + ')';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function transfer(d) {
  const audio = httpsUrl(d.url || '', (h) => AUDIO_HOST.test(h));
  if (!audio) return json({ error: 'Аудио должно лежать на mave.digital.' }, 400);
  if (!BUCKET.test(d.bucket || '') || !FILE.test(d.file || ''))
    return json({ error: 'Неверное имя страницы или файла архива.' }, 400);
  if (!KEY.test(d.access || '') || !KEY.test(d.secret || ''))
    return json({ error: 'Проверь Access Key и Secret Key Internet Archive.' }, 400);
  const type = d.type === 'audio/mp4' ? 'audio/mp4' : 'audio/mpeg';

  const meta = {
    'x-archive-auto-make-bucket': '1',
    'x-archive-meta-mediatype': 'audio',
    'x-archive-meta-collection': 'opensource_audio',
    'x-archive-meta-title': enc(String(d.title || d.bucket).slice(0, 200)),
    'x-archive-meta-description': enc(String(d.description || d.title || '').slice(0, 2000)),
    'x-archive-meta-subject': enc('podcast'),
  };
  if (d.creator) meta['x-archive-meta-creator'] = enc(String(d.creator).slice(0, 180));

  let target = `https://s3.us.archive.org/${d.bucket}/${d.file}`;
  let lastError = '';
  for (let attempt = 0; attempt < 4; attempt++) {
    const src = await fetch(audio.href, { headers: { 'User-Agent': UA, 'Accept-Encoding': 'identity' } });
    if (!src.ok) {
      lastError = `MAVE вернул HTTP ${src.status} для аудио.`;
      if (src.status >= 500 || src.status === 429) { await sleep(3000 * (attempt + 1)); continue; }
      return json({ error: lastError }, 502);
    }
    const ct = (src.headers.get('Content-Type') || '').split(';')[0].trim();
    if (['text/html', 'text/plain', 'application/json', 'application/xml'].includes(ct)) {
      src.body?.cancel();
      return json({ error: 'MAVE вернул страницу вместо аудио.' }, 502);
    }
    const size = Number(src.headers.get('Content-Length') || 0);
    if (!size) { src.body?.cancel(); return json({ error: 'MAVE не сообщил размер файла.' }, 502); }
    if (size > MAX_AUDIO) { src.body?.cancel(); return json({ error: 'Файл больше 600 МБ.' }, 413); }

    // Поток без буферизации: тело идёт из MAVE прямо в Internet Archive.
    const { readable, writable } = new FixedLengthStream(size);
    const pipe = src.body.pipeTo(writable).catch(() => {});
    let res;
    try {
      res = await fetch(target, {
        method: 'PUT',
        body: readable,
        redirect: 'manual',
        headers: {
          ...meta,
          Authorization: `LOW ${d.access}:${d.secret}`,
          'Content-Type': type,
          'x-archive-size-hint': String(size),
        },
      });
    } catch (e) {
      lastError = 'Соединение с Internet Archive оборвалось.';
      await sleep(5000 * (attempt + 1));
      continue;
    }
    await pipe;
    const text = res.status >= 300 ? (await res.text()).slice(0, 600) : '';

    if (res.status >= 200 && res.status < 300) return json({ ok: true, bytes: size });
    if ([301, 302, 307, 308].includes(res.status)) {
      const loc = httpsUrl(new URL(res.headers.get('Location') || '', target).href,
        (h) => h === 'archive.org' || h.endsWith('.archive.org'));
      if (!loc) return json({ error: 'Internet Archive перенаправил на неожиданный адрес.' }, 502);
      target = loc.href;
      continue;
    }
    const code = (text.match(/<Code>([^<]+)<\/Code>/) || [])[1] || '';
    const message = (text.match(/<Message>([^<]+)<\/Message>/) || [])[1] || '';
    lastError = `Internet Archive вернул HTTP ${res.status}${code ? ' ' + code : ''}${message ? ': ' + message : ''}`;
    if (res.status === 403 || res.status === 401)
      return json({ error: lastError + '. Проверь ключи или права на страницу архива.', fatal: true }, 502);
    if ([408, 429, 500, 502, 503, 504].includes(res.status)) {
      return json({ error: lastError, retry: true }, 503);
    }
    return json({ error: lastError }, 502);
  }
  return json({ error: lastError || 'Не удалось перенести выпуск.', retry: true }, 503);
}
