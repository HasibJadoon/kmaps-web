// The Arabic class (drill-engine plan 4.3): an episode's scenes as nodes, drawn the same every time.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seeded } from '../src/routes/scenes';
import { sceneKey, splitKey, interleave, scenesOf } from '../src/routes/practice-class';

test('a seeded draw repeats for the same unit and scene, and differs between scenes', () => {
  const a = seeded('ARTX:YT-x:1#3'), b = seeded('ARTX:YT-x:1#3'), c = seeded('ARTX:YT-x:1#4');
  const xs = Array.from({ length: 6 }, () => a()), ys = Array.from({ length: 6 }, () => b()), zs = Array.from({ length: 6 }, () => c());
  assert.deepEqual(xs, ys);
  assert.notDeepEqual(xs, zs);
  assert.ok(xs.every((x) => x >= 0 && x < 1));
});

test('a scene node key names its step and scene', () => {
  assert.equal(sceneKey('scenes', 3), 'scenes@3');
  assert.deepEqual(splitKey('scenes@3'), { step: 'scenes', scene: 3, part: null });
  assert.deepEqual(splitKey('check'), { step: 'check', scene: null, part: null });
  assert.deepEqual(splitKey('scenes@x'), { step: 'scenes', scene: null, part: null });
});

test('a mixed sprint takes from each scene in turn', () => {
  assert.deepEqual(interleave([[1, 2, 3], [10, 20], [100]], 5), [1, 10, 100, 2, 20]);
  assert.deepEqual(interleave([[], [7]], 4), [7]);
});

test("an episode's scenes keep their numbers, their titles without the number", () => {
  const u = { id: 'U', level: 'A2', title_ar: null, title_en: null, series: null, episode: 1,
              scenes_json: JSON.stringify([{ scene_no: 1, title_en: 'Scene 1 — The well' }, { scene_no: 2, title_ar: 'المشهد الثاني — البئر' }]) };
  // a scene with no timings or lines of its own carries them as empty (start/end null, lines [])
  assert.deepEqual(scenesOf(u), [{ no: 1, titleEn: 'The well', titleAr: null, start: null, end: null, lines: [] },
                                 { no: 2, titleEn: null, titleAr: 'البئر', start: null, end: null, lines: [] }]);
});
