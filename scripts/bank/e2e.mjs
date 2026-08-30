// ─── The bank, end to end, over HTTP ──────────────────────────────────────────
//
// Everything a learner's phone does, in the order it does it: sign in, find the
// pack, walk the path, play a unit, be judged, finish, and see the score move.
// Nothing here reads D1 — if a route is broken this must fail, and a query that
// went around the route would hide exactly that.
//
//   KMAPS_TEST_PASSWORD=… node scripts/bank/e2e.mjs
//
// Same two variables as workers/core/test/srs-e2e.sh, so one export runs both
// suites. The password stays out of the repo and is never printed.

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

// ── 0 · the gate is really a gate ────────────────────────────────────────────
{
  const anon = await fetch(`${BASE}${PREFIX}/core/bank/packs`);
  check(anon.status === 401, 'unauthenticated /core/bank/packs is refused',
        `status ${anon.status}`);
}

// ── 1 · sign in, or use the token we were handed ─────────────────────────────
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

// ── 2 · the packs are there ──────────────────────────────────────────────────
const packs = (await api('/core/bank/packs')).body?.packs
           ?? (await api('/core/bank/packs')).body ?? [];
const list = Array.isArray(packs) ? packs : packs.packs ?? [];
const path = list.find((p) => p.slug === 'quran-40-path');
const quiz = list.find((p) => p.slug === 'quran-40-quiz');
check(!!path, 'the path pack is listed');
check(!!quiz, 'the quiz pack is listed');
if (!path) process.exit(1);

// ── 3 · the path has its units, in order ─────────────────────────────────────
const detail = (await api('/core/bank/packs/quran-40-path')).body;
const units = detail?.units ?? [];
check(units.length === 4, 'the path has four nodes', `got ${units.length}`);
check(units[0]?.node_type === 'lesson' && units[2]?.node_type === 'review',
      'lesson first, review third');

// ── 4 · a unit hands over its items ──────────────────────────────────────────
const lesson = units[0];
const payload = (await api(`/core/bank/units/${lesson.id}/items`)).body;
const items = payload?.items ?? [];
check(items.length === 6, 'the lesson serves six items', `got ${items.length}`);
check(items.every((i) => (i.options ?? []).length === 4), 'each has four options');

// The answer must not travel with the question. The server grades; a client
// holding is_correct can score itself, and in a live room, everyone else.
const leaks = items.filter((i) => (i.options ?? []).some(
  (o) => o.is_correct !== undefined || o.why_wrong_en !== undefined));
check(leaks.length === 0, 'the payload does not carry the answer',
      leaks.length ? `${leaks.length} of ${items.length} items expose is_correct/why_wrong` : '');

// ── 5 · play it ──────────────────────────────────────────────────────────────
const attempt = (await api('/core/bank/attempts', {
  method: 'POST', body: JSON.stringify({ unit_ref: lesson.id, mode: 'solo' }),
})).body;
check(!!attempt?.id, 'an attempt starts');

// Answered the way a person answers: pick one, let the server say.
let right = 0;
for (const [seq, item] of items.entries()) {
  const pick = (item.options ?? [])[seq % 4];
  const res = await api(`/core/bank/attempts/${attempt.id}/answer`, {
    method: 'POST',
    body: JSON.stringify({ item_ref: item.id, seq, answer: [pick?.id],
                           shown_at_ms: Date.now() - 4000 }),
  });
  if (res.body?.correct) right++;
  if (seq === 0) {
    check(res.status === 201 || res.status === 200, 'an answer is accepted',
          `status ${res.status}`);
    check(typeof res.body?.correct === 'boolean', 'the server returns a verdict');
    check(typeof res.body?.latency_ms === 'number' && res.body.latency_ms >= 4000,
          'latency is the server\'s, not the client\'s', `${res.body?.latency_ms}ms`);
  }
}
console.log(`  (answered ${right}/${items.length} correctly by picking blind)`);

const finished = (await api(`/core/bank/attempts/${attempt.id}/finish`, {
  method: 'POST', body: '{}' })).body;
check(finished?.score !== undefined, 'the attempt finishes with a score',
      `score ${finished?.score} · points ${finished?.points} · passed ${finished?.passed}`);

// ── 6 · a finished attempt is closed ─────────────────────────────────────────
{
  const again = await api(`/core/bank/attempts/${attempt.id}/answer`, {
    method: 'POST', body: JSON.stringify({ item_ref: items[0].id, answer: ['x'] }) });
  check(again.status === 400, 'a finished attempt refuses more answers',
        `status ${again.status}`);
}

// ── 7 · the score card ───────────────────────────────────────────────────────
{
  const scores = (await api('/core/bank/scores')).body;
  check(!!scores, 'the score card answers');
  console.log('  ' + JSON.stringify(scores).slice(0, 300));
}

// ── 8 · the career card ──────────────────────────────────────────────────────
{
  const me = (await api('/core/bank/profile')).body;
  check(!!me?.career, 'the profile answers');
  check(me?.career?.innings >= 1, 'the round just played counts as an innings',
        `innings ${me?.career?.innings}`);
  check(me?.career?.average !== undefined && me?.record !== undefined,
        'it carries an average and a W-L-D record',
        `avg ${me?.career?.average} · ${me?.record?.won}-${me?.record?.lost}-${me?.record?.drew}`);
  check(Array.isArray(me?.form) && me.form.length >= 1, 'form lists recent innings');
  // A rating off six answers would be a guess wearing five stars.
  check(me?.career?.stars === null && me?.career?.rating_after > 0,
        'the rating is withheld until there is enough to judge',
        `${me?.career?.rating_after} more answers needed`);
}

// ── 9 · the quiz pack's five shapes are all served ───────────────────────────
{
  const doc = (await api('/core/bank/packs/quran-40-quiz')).body;
  const shapes = new Set((doc?.items ?? []).map((i) => i.interaction));
  check(shapes.size === 5, 'the quiz serves five interaction types',
        [...shapes].join(', ') || 'none returned');
}

console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
process.exitCode = failures ? 1 : 0;
