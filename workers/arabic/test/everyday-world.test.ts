// Everyday's worlds: places walk the trail district by district, never crowd one another, and the trail and
// scenery stay inside the world; the room's world holds every top-level map.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { atlasWorld, mapWorld, pictureWorld, PICTURE, W } from '../src/lib/everyday-world';

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

// the Modern Town's real board positions (ar_curriculum_domain.district / map_x / map_y, live D1, 2026-10-31)
const TOWN: Array<[string, string, number, number]> = [
  ['morning_routine', 'home', 0.17, 0.1036], ['home_family', 'home', 0.5, 0.1036], ['food_drink', 'home', 0.33, 0.171],
  ['children_upbringing', 'home', 0.67, 0.171], ['neighbours', 'home', 0.83, 0.1036], ['education_school', 'centre', 0.17, 0.3496],
  ['market_shopping', 'centre', 0.83, 0.3496], ['work_profession', 'centre', 0.5, 0.3496], ['city_directions', 'centre', 0.83, 0.417],
  ['government_office', 'centre', 0.5, 0.417], ['travel_transport', 'centre', 0.17, 0.417], ['human_body', 'health', 0.33, 0.5281],
  ['body_health', 'health', 0.67, 0.5281], ['pharmacy', 'health', 0.67, 0.5955], ['hospital', 'health', 0.33, 0.5955],
  ['worship_ritual', 'mosque', 0.5, 0.7066], ['evening_routine', 'home', 0.33, 0.2385], ['night_routine', 'home', 0.67, 0.2385],
  ['weekend_friday', 'mosque', 0.83, 0.7066], ['weather_seasons', 'mosque', 0.67, 0.8414], ['ramadan_eid', 'mosque', 0.33, 0.8414],
  ['conversations', 'garden', 0.83, 0.9526], ['common_verbs', 'garden', 0.17, 0.9526], ['prophetic_duas', 'mosque', 0.17, 0.7066],
  ['hadith_daily', 'mosque', 0.67, 0.774], ['quran_frequent', 'mosque', 0.33, 0.774], ['idioms', 'garden', 0.5, 0.9526],
];

function overlaps(w: ReturnType<typeof pictureWorld>) {
  const m = w.marker!, pts = [...w.spots.values()].map((s) => ({ x: s.x * w.w, y: s.y * w.h }));
  let n = 0;
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
    if (Math.abs(pts[i]!.x - pts[j]!.x) < m.w - 0.5 && Math.abs(pts[i]!.y - pts[j]!.y) < m.h - 0.5) n++;
  }
  return n;
}

test("a picture world stands every place on the painted picture, clear of one another and of the HUD", () => {
  const places = TOWN.map(([id, district, x, y], i) => ({ id, district, stop: i + 1, x, y }));
  const w = pictureWorld('modern-town', 'msa', [], places, []);
  assert.equal(w.mode, 'picture');
  assert.deepEqual(w.gate, { x: 0.5, y: 0.5, w: 1, h: 1 }, 'the picture is the whole world');
  assert.equal(w.spots.size, 27);
  assert.equal(overlaps(w), 0, 'no two markers (badge and name plate) touch');
  for (const s of w.spots.values()) {
    assert.ok(s.x * w.w >= PICTURE.pad.x && s.x * w.w <= w.w - PICTURE.pad.x);
    assert.ok(s.y * w.h >= PICTURE.pad.top - 1 && s.y * w.h <= w.h - PICTURE.pad.bottom + 1, 'under the top HUD and above the bottom bar is kept free');
  }
  // the owner's arrangement is kept: Home Street above the Town Centre above the Masjid Square
  const y = (id: string) => w.spots.get(id)!.y;
  assert.ok(y('home_family') < y('market_shopping') && y('market_shopping') < y('hospital') && y('hospital') < y('worship_ritual'));
  assert.ok(w.spots.get('education_school')!.x < w.spots.get('market_shopping')!.x);
  assert.deepEqual(pictureWorld('modern-town', 'msa', [], places, []).spots, w.spots, 'the same every visit');
});

test('a place with no board position stands in its district; portals wait along the bottom', () => {
  const places = [
    { id: 'a', district: 'home', stop: 1, x: 0.2, y: 0.1 }, { id: 'b', district: 'home', stop: 2, x: 0.8, y: 0.1 },
    { id: 'c', district: 'shop', stop: 3, x: 0.5, y: 0.9 }, { id: 'lost', district: 'home', stop: 4, x: null, y: null },
  ];
  const w = pictureWorld('t', 'msa', [{ key: 'home', title: 'Home' }, { key: 'shop', title: 'Shop' }], places, ['village']);
  const near = (id: string, o: string) => Math.hypot((w.spots.get(id)!.x - w.spots.get(o)!.x) * w.w, (w.spots.get(id)!.y - w.spots.get(o)!.y) * w.h);
  assert.ok(near('lost', 'a') < near('lost', 'c') && near('lost', 'b') < near('lost', 'c'));
  assert.ok(w.spots.get('village')!.y > 0.6, 'a portal waits in the bottom part of the picture');
  assert.equal(overlaps(w), 0);
});

test("the room's islands keep their own room too", () => {
  const a = atlasWorld(['modern', 'early', 'village', 'classical', 'x']);
  const pts = [...a.spots.values()].map((s) => ({ x: s.x * a.w, y: s.y * a.h }));
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
    assert.ok(Math.abs(pts[i]!.x - pts[j]!.x) >= 380 * 1.3 - 1 || Math.abs(pts[i]!.y - pts[j]!.y) >= 380 * 1.45 - 1);
  }
  assert.equal(a.mode, 'islands');
});
