// Every drill is a user's: the gateway closes the routes that deal drills to a reader without a
// session, while the module's public reads stay open.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MODULE_MAP, isPrivatePath } from '../src/modules';

test('Qurʾān drills are private, the Atlas is not', () => {
  const qr = MODULE_MAP.qr;
  for (const p of ['qr/practice/home', 'qr/practice/session?skill=hear', 'qr/practice/class/path?passage=QR:SP:40:1-3',
                   'qr/practice/class/listen?passage=x', 'qr/practice/stage', 'qr/practice'])
    assert.ok(isPrivatePath(qr, p), p);
  for (const p of ['qr/atlas/home', 'qr/atlas/surah/40', 'qr/tafsir/audio/books', 'qr/practiced'])
    assert.ok(!isPrivatePath(qr, p), p);
});

test('Arabic drills are private, its reading is not', () => {
  const ar = MODULE_MAP.ar;
  for (const p of ['ar/practice/home?level=a1', 'ar/practice/session', 'ar/scenes/u1/3/practice?tier=2',
                   'ar/path/placement?level=b1', 'ar/path/unit/u7/check'])
    assert.ok(isPrivatePath(ar, p), p);
  for (const p of ['ar/scenes', 'ar/scenes/u1', 'ar/path?level=a1', 'ar/path/unit/u7', 'ar/atlas/home'])
    assert.ok(!isPrivatePath(ar, p), p);
  assert.ok(!(ar.publicGetPaths ?? []).includes('ar/practice'));
});
