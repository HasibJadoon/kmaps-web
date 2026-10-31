// The muṣḥaf page fonts come from our own R2: p1…p604 only, served as woff2 and cached for a year.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Router } from '../../shared/src/router';
import { mushafFontRoutes, QCF2_PREFIX } from '../src/routes/mushaf-fonts';
import type { QuranEnv } from '../src/env';

const stored = new Set([`${QCF2_PREFIX}p1.woff2`]);
const env = { DEP_GRAPHS_BUCKET: {
  get: async (key: string) => stored.has(key) ? { body: 'font', httpEtag: '"e1"' } : null,
} } as unknown as QuranEnv;
const r = new Router<QuranEnv>(); mushafFontRoutes(r);
const get = (f: string) => r.handle(new Request(`http://x/qr/mushaf/fonts/${f}`), env);

test('a stored page font is served as woff2, cached for a year', async () => {
  const res = await get('p1.woff2');
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('Content-Type'), 'font/woff2');
  assert.match(res.headers.get('Cache-Control') ?? '', /immutable/);
});

test('only p1…p604 are fonts', async () => {
  for (const f of ['p0.woff2', 'p605.woff2', 'p1.ttf', '..%2Fsecret', 'x.woff2']) assert.equal((await get(f)).status, 400, f);
  assert.equal((await get('p2.woff2')).status, 404);
});
