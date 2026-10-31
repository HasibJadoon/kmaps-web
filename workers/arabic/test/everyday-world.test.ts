// Everyday's worlds: places walk the trail district by district, never crowd one another, and the trail and
// scenery stay inside the world; the room's world holds every top-level map.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { atlasWorld, mapWorld, W } from '../src/lib/everyday-world';

const districts = [{ key: 'home', title: 'Home Street' }, { key: 'centre', title: 'Town Centre' }];
const places = [
  { id: 'market', district: 'centre', stop: 9 }, { id: 'morning', district: 'home', stop: 1 },
  { id: 'family', district: 'home', stop: 2 }, { id: 'school', district: 'centre', stop: 8 },
  { id: 'stray', district: null, stop: 3 },
];

test('places walk down the trail by district, then stop; strays and portals come last', () => {
  const w = mapWorld('town', 'msa', true, districts, places, ['park']);
  const ys = ['morning', 'family', 'school', 'market', 'stray', 'park'].map((id) => w.spots.get(id)!.y);
  assert.deepEqual([...ys].sort((a, b) => a - b), ys);
  assert.equal(w.bands.length, 2);
  assert.ok(w.bands[0]!.y < w.spots.get('morning')!.y && w.bands[1]!.y < w.spots.get('school')!.y);
  assert.ok(w.gate && w.gate.y < w.spots.get('morning')!.y);
});

test('two places in a row are a lane apart, and every place is a full step below the one before', () => {
  const w = mapWorld('town', 'early', false, districts, places, []);
  const pts = ['morning', 'family', 'school', 'market', 'stray'].map((id) => w.spots.get(id)!);
  for (let i = 1; i < pts.length; i++) {
    assert.ok(Math.abs(pts[i]!.x - pts[i - 1]!.x) * W >= 0.29 * W);
    assert.ok((pts[i]!.y - pts[i - 1]!.y) * w.h >= 340 - 1);
  }
});

test('the trail ends at the last stop and every point lies inside the world', () => {
  const w = mapWorld('town', 'msa', true, districts, places, ['park']);
  const last = w.path.curves[w.path.curves.length - 1]!;
  assert.deepEqual([last[4], last[5]], [w.spots.get('park')!.x, w.spots.get('park')!.y]);
  for (const c of w.path.curves) for (const v of c) assert.ok(v >= 0 && v <= 1);
  for (const s of w.scenery) assert.ok(s.x >= 0 && s.x <= 1 && s.y >= 0 && s.y <= 1);
  // the same map lays out the same scenery every time
  assert.deepEqual(mapWorld('town', 'msa', true, districts, places, ['park']).scenery, w.scenery);
});

test("the room's world stands every map on it, in order", () => {
  const a = atlasWorld(['modern', 'early', 'village']);
  assert.equal(a.spots.size, 3);
  assert.ok(a.spots.get('modern')!.y < a.spots.get('early')!.y && a.spots.get('early')!.y < a.spots.get('village')!.y);
  assert.equal(a.path.curves.length, 2);
});
