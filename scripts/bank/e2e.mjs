const BASE = process.env.KM_BASE ?? 'https://backend.k-maps.com';
const PREFIX = process.env.KM_PREFIX ?? '/api';
const EMAIL = process.env.KMAPS_TEST_EMAIL ?? 'system@test.com';
const need = (k) => {
  const v = process.env[k];
  if (!v) { console.error(`${k} is not set`); process.exit(2); }
  return v;
};

let failures = 0;
const check = (ok, label, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? '✓' : '✗'} ${label}${detail ? '  ' + detail : ''}`);
  return ok;
};

let token = null;
async function api(path, init = {}) {
  const res = await fetch(`${BASE}${PREFIX}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  const text = await res.text();
  let body = null;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body: body?.data ?? body, raw: body };
}

{
  const anon = await fetch(`${BASE}${PREFIX}/core/bank/packs`);
  check(anon.status === 401, 'unauthenticated /core/bank/packs is refused',
        `status ${anon.status}`);
}

if (process.env.KM_TOKEN) {
  token = process.env.KM_TOKEN;
  check(true, 'using the token from the environment');
} else {
  const res = await api('/core/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: EMAIL, password: need('KMAPS_TEST_PASSWORD') }),
  });
  token = res.body?.token ?? res.raw?.token ?? null;
  if (!check(!!token, `signed in as ${EMAIL}`, `status ${res.status}`)) process.exit(1);
}

const packs = (await api('/core/bank/packs')).body?.packs
           ?? (await api('/core/bank/packs')).body ?? [];
const list = Array.isArray(packs) ? packs : packs.packs ?? [];
const path = list.find((p) => p.slug === 'quran-40-path');
const quiz = list.find((p) => p.slug === 'quran-40-quiz');
check(!!path, 'the path pack is listed');
check(!!quiz, 'the quiz pack is listed');
if (!path) process.exit(1);

const detail = (await api('/core/bank/packs/quran-40-path')).body;
const units = detail?.units ?? [];
check(units.length === 4, 'the path has four nodes', `got ${units.length}`);
check(units[0]?.node_type === 'lesson' && units[2]?.node_type === 'review',
      'lesson first, review third');

const lesson = units[0];
const payload = (await api(`/core/bank/units/${lesson.id}/items`)).body;
const items = payload?.items ?? [];
check(items.length === 6, 'the lesson serves six items', `got ${items.length}`);
check(items.every((i) => (i.options ?? []).length === 4), 'each has four options');

const optionLeaks = items.filter((i) => (i.options ?? []).some(
  (o) => o.is_correct !== undefined || o.why_wrong_en !== undefined));
check(optionLeaks.length === 0, 'no option carries is_correct or why_wrong',
      optionLeaks.length ? `${optionLeaks.length} of ${items.length} items` : '');

const declaredLeaks = items.filter((i) => i.response_json !== undefined);
check(declaredLeaks.length === 0, 'no item carries response_json',
      declaredLeaks.length ? `${declaredLeaks.length} items expose the declared answer` : '');

const toldLeaks = items.filter((i) => i.explanation_en != null || i.explanation_ar != null);
check(toldLeaks.length === 0, 'no item carries its explanation before it is answered',
      toldLeaks.length ? `${toldLeaks.length} items` : '');

const sliders = items.filter((i) => i.interaction === 'slider');
for (const s of sliders) {
  const shape = s.response_public ? JSON.parse(s.response_public) : {};
  check(shape.min !== undefined && shape.correct === undefined
        && shape.tolerance === undefined,
        'a slider gets its range and not its answer', JSON.stringify(shape));
}

const attempt = (await api('/core/bank/attempts', {
  method: 'POST', body: JSON.stringify({ unit_ref: lesson.id, mode: 'solo' }),
})).body;
check(!!attempt?.id, 'an attempt starts');

let right = 0;
for (const [seq, item] of items.entries()) {
  const pick = (item.options ?? [])[seq % 4];
  const res = await api(`/core/bank/attempts/${attempt.id}/answer`, {
    method: 'POST',
    body: JSON.stringify({ item_ref: item.id, seq, answer: [pick?.id] }),
  });
  if (res.body?.correct) right++;
  if (seq === 0) {
    check(res.status === 201 || res.status === 200, 'an answer is accepted',
          `status ${res.status}`);
    check(typeof res.body?.correct === 'boolean', 'the server returns a verdict');

    check(typeof res.body?.latency_ms === 'number' && res.body.latency_ms >= 0,
          'the server measures the elapsed time itself', `${res.body?.latency_ms}ms`);
  }
}
console.log(`  (answered ${right}/${items.length} correctly by picking blind)`);

{

  const other = (await api('/core/bank/packs/quran-40-quiz')).body?.items ?? [];
  if (other.length) {
    const res = await api(`/core/bank/attempts/${attempt.id}/answer`, {
      method: 'POST',
      body: JSON.stringify({ item_ref: other[0].id, answer: ['x'] }) });
    check(res.status === 404 || res.status === 403,
          'an item from another pack cannot be answered here', `status ${res.status}`);
    check(res.body?.correct_options === undefined,
          'and it does not leak the answer while refusing');
  }

  const again = await api(`/core/bank/attempts/${attempt.id}/answer`, {
    method: 'POST',
    body: JSON.stringify({ item_ref: items[0].id, seq: 0, answer: [items[0].options[0].id] }) });
  const after = (await api('/core/bank/attempts')).status;
  check(again.body?.replayed === true,
        'a repeated answer replays the first verdict rather than scoring twice',
        `status ${again.status}`);
}

const finished = (await api(`/core/bank/attempts/${attempt.id}/finish`, {
  method: 'POST', body: '{}' })).body;
check(finished?.score !== undefined, 'the attempt finishes with a score',
      `score ${finished?.score} · points ${finished?.points} · passed ${finished?.passed}`);

{
  const again = await api(`/core/bank/attempts/${attempt.id}/answer`, {
    method: 'POST', body: JSON.stringify({ item_ref: items[0].id, answer: ['x'] }) });
  check(again.status === 400, 'a finished attempt refuses more answers',
        `status ${again.status}`);
}

{
  const second = (await api(`/core/bank/attempts/${attempt.id}/finish`, {
    method: 'POST', body: '{}' })).body;
  check(second?.already === true, 'a second finish is a no-op, not a second award',
        `xp ${second?.xp}`);
}

{
  const scores = (await api('/core/bank/scores')).body;
  check(!!scores, 'the score card answers');
  console.log('  ' + JSON.stringify(scores).slice(0, 300));
}

{
  const me = (await api('/core/bank/profile')).body;
  check(!!me?.career, 'the profile answers');
  check(me?.career?.innings >= 1, 'the round just played counts as an innings',
        `innings ${me?.career?.innings}`);
  check(me?.career?.average !== undefined && me?.record !== undefined,
        'it carries an average and a W-L-D record',
        `avg ${me?.career?.average} · ${me?.record?.won}-${me?.record?.lost}-${me?.record?.drew}`);
  check(Array.isArray(me?.form) && me.form.length >= 1, 'form lists recent innings');

  check(me?.career?.stars === null && me?.career?.rating_after > 0,
        'the rating is withheld until there is enough to judge',
        `${me?.career?.rating_after} more answers needed`);
}

{
  const doc = (await api('/core/bank/packs/quran-40-quiz')).body;
  const shapes = new Set((doc?.items ?? []).map((i) => i.interaction));
  check(shapes.size === 5, 'the quiz serves five interaction types',
        [...shapes].join(', ') || 'none returned');
}

console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
process.exitCode = failures ? 1 : 0;
