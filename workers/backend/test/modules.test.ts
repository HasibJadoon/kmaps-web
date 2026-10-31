// Every drill is a user's: the gateway closes the routes that deal drills to a reader without a
// session, while the module's public reads stay open.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MODULE_MAP, isPrivatePath, isAdminRole, needsAdminWrite } from '../src/modules';

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

test('canonical content is written by a reviewer; a learner writes only their own', () => {
  for (const [key, p] of [['qr', 'qr/ayahs/2/255'], ['qr', 'qr/surahs/2'], ['qr', 'qr/admin/sync/al-root-ref'],
                          ['al', 'al/roots'], ['al', 'al/near-synonyms/x'], ['wv', 'wv/traditions'],
                          ['worldview', 'worldview/source'], ['qr', 'qr/drill/source']] as const)
    assert.ok(needsAdminWrite(MODULE_MAP[key], 'PATCH', p), p);
  for (const [key, p] of [['qr', 'qr/practice/class/refresh'], ['worldview', 'worldview/reading-session'],
                          ['worldview', 'worldview/reading-session/abc']] as const)
    assert.ok(!needsAdminWrite(MODULE_MAP[key], 'POST', p), p);
  // reads stay open, and modules with the learner's own records are not admin-written
  assert.ok(!needsAdminWrite(MODULE_MAP.qr, 'GET', 'qr/ayahs/2/255'));
  for (const key of ['cm', 'core', 'ar', 'st', 'studio'] as const)
    assert.ok(!needsAdminWrite(MODULE_MAP[key], 'POST', `${key}/anything`), key);
  assert.ok(isAdminRole('admin') && isAdminRole('superadmin') && !isAdminRole('member') && !isAdminRole(undefined));
});

test('who is signed up is never a public read', () => {
  for (const p of ['core/users/by-email?email=a@b.c', 'core/users/CORE:1', 'core/workspaces/W1/members', 'core/workspaces/W1'])
    assert.ok(isPrivatePath(MODULE_MAP.core, p), p);
  assert.ok(!isPrivatePath(MODULE_MAP.core, 'core/auth/google'));
});
