// The Apps Atlas as CORE's rows make it: rooms in order with their doors, the doors' modules,
// a room with no door left out, Today's words apart.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { atlasOf } from '../src/routes/apps';

test('the migration\'s rows make six rooms, one door per thing', () => {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../migrations/041_app_atlas.sql', import.meta.url), 'utf8'));
  db.exec(readFileSync(new URL('../migrations/044_path_active_lessons.sql', import.meta.url), 'utf8'));
  const rows = db.prepare('SELECT scope, key, parent, label, label_ar, detail, icon, color, extra_json, sort FROM core_app_label ORDER BY scope, sort').all() as never[];
  const a = atlasOf(rows);
  assert.deepEqual(a.rooms.map((r) => r.key), ['review', 'path', 'practice', 'quiz', 'table', 'scores']);
  const review = a.rooms[0];
  assert.deepEqual(review.doors.map((d) => [d.key, d.module]),
    [['review.quran', 'QR'], ['review.arabic', 'AR'], ['review.all', null], ['review.together', null]]);
  assert.equal(a.rooms.find((r) => r.key === 'quiz')!.doors.length, 1);
  // every door key is unique: nothing is offered twice
  const keys = a.rooms.flatMap((r) => r.doors.map((d) => d.key));
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(a.words.some((w) => w.key === 'due' && w.label.includes('{n}')));
  // Path opens with the active lessons; no other room does
  assert.deepEqual(a.rooms.filter((r) => r.active).map((r) => r.key), ['path']);
  assert.ok(a.words.some((w) => w.key === 'active_line' && w.label.includes('{open}')));
});

test('a room without doors is not drawn', () => {
  const a = atlasOf([
    { scope: 'room', key: 'empty', parent: null, label: 'E', label_ar: null, detail: null, icon: null, color: null, extra_json: null, sort: 1 },
    { scope: 'room', key: 'one', parent: null, label: 'O', label_ar: null, detail: null, icon: null, color: null, extra_json: null, sort: 2 },
    { scope: 'door', key: 'one.x', parent: 'one', label: 'X', label_ar: null, detail: null, icon: null, color: null, extra_json: '{"module":"QR"}', sort: 1 },
  ]);
  assert.deepEqual(a.rooms.map((r) => r.key), ['one']);
  assert.equal(a.rooms[0].doors[0].module, 'QR');
});
