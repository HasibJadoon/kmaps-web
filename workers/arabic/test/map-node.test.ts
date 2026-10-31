// The Everyday atlas as one recursive node tree (ar_map_node; GET /ar/map/:id, GET /ar/vocab/:domain): any level — a
// world, a district, a place, a room — answers in the same shape: its canvas, labelled areas and markers (stops,
// artifacts, portals) with their place, state and caption; markers never touch; content that is live but not hung
// on the tree lands in the place's default room; the vocabulary hub gathers a place's words once.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { Router } from '../../shared/src/router';
import { mapRoutes } from '../src/routes/map';
import { parseKey, buildVocabulary, keysOf } from '../src/lib/stop-vocab';

const root = new URL('../', import.meta.url).pathname;

function d1(db: DatabaseSync): D1Database {
  const stmt = (q: string, args: unknown[] = []) => {
    const s = db.prepare(q);
    return {
      bind: (...b: unknown[]) => stmt(q, b),
      all: async () => ({ results: s.all(...(args as never[])) }),
      first: async () => s.get(...(args as never[])) ?? null,
      run: async () => ({ meta: { changes: Number(s.run(...(args as never[])).changes) } }),
    };
  };
  return { prepare: (q: string) => stmt(q) } as unknown as D1Database;
}

const READING = '# T\n\n```read\n{"ar":"فِي غُرْفَتِي سَرِيرٌ","keys":[{"w":"سَرِيرٌ","en":"a bed (سَرِيرٌ — أَسِرَّةٌ)"},{"w":"كُتُبٌ","en":"books (كِتَابٌ — كُتُبٌ)"},{"w":"أَفْتَحُ","en":"to open (فَتَحَ — يَفْتَحُ)"},{"w":"مَرْحَبًا","en":"welcome"}]}\n```\n';

function world() {
  const AR = new DatabaseSync(':memory:');
  AR.exec(`
    CREATE TABLE ar_map (id TEXT PRIMARY KEY, slug TEXT, title TEXT, title_ar TEXT, era TEXT, image_key TEXT);
    CREATE TABLE ar_curriculum_domain (id TEXT PRIMARY KEY, slug TEXT, title TEXT, title_ar TEXT, description TEXT, cover_key TEXT, map_id TEXT, map_order INTEGER);
    CREATE TABLE ar_daily_theme (id TEXT PRIMARY KEY, domain_id TEXT, is_published INTEGER, day_index INTEGER);
    CREATE TABLE ar_daily_reading (id TEXT PRIMARY KEY, domain_id TEXT, slug TEXT, kind TEXT, title_en TEXT, title_ar TEXT, lines INTEGER,
                                   cover_key TEXT, sort_order INTEGER, is_published INTEGER, body_md TEXT, created_at TEXT DEFAULT '');
    CREATE TABLE ar_daily_dialogue (id TEXT PRIMARY KEY, theme_id TEXT, title_ar TEXT, title_en TEXT, image_key TEXT, sort_order INTEGER);
    CREATE TABLE ar_daily_dialogue_turn (id TEXT PRIMARY KEY, dialogue_id TEXT, word_id TEXT);
    CREATE TABLE ar_daily_word (id TEXT PRIMARY KEY, theme_id TEXT, singular_ar TEXT, plural_ar TEXT, gloss_en TEXT, image_key TEXT,
                                audio_key_sg TEXT, audio_key_pl TEXT, sort_order INTEGER);
    CREATE TABLE ar_daily_sentence (id TEXT PRIMARY KEY, theme_id TEXT, word_id TEXT, sort_order INTEGER);
    CREATE TABLE ar_daily_passage (id TEXT PRIMARY KEY, theme_id TEXT, title_ar TEXT, word_count INTEGER);`);
  AR.exec(readFileSync(root + 'migrations/ar_map_node.sql', 'utf8'));
  AR.exec(`
    INSERT INTO ar_map VALUES ('MAP:t', 't', 'The Test Town', 'مَدِينَةٌ', 'msa', 'pic/t.jpg'), ('MAP:u', 'u', 'Other', 'أُخْرَى', 'msa', NULL);
    INSERT INTO ar_curriculum_domain VALUES ('D1', 'home', 'Home and Family', 'الْبَيْتُ', 'd', 'cover/home.jpg', 'MAP:t', 1),
                                            ('D2', 'kitchen_only', 'Kitchen Only', 'مَطْبَخٌ', 'd', NULL, 'MAP:t', 2),
                                            ('D3', 'plain', 'Plain', 'سَاذَجٌ', 'd', NULL, 'MAP:t', 3);
    INSERT INTO ar_daily_theme VALUES ('T1', 'D1', 1, 1), ('T2', 'D2', 1, 1), ('T9', 'D1', 0, 9);
    INSERT INTO ar_daily_reading VALUES ('R1', 'D1', 'daily-home', 'story', 'My Room', 'غُرْفَتِي', 4, 'r/p1.jpg', 1, 1, '${READING}', ''),
                                        ('R2', 'D1', 'friday', 'qa', 'Friday', 'الْجُمُعَةُ', 5, NULL, 2, 1, NULL, '');
    INSERT INTO ar_daily_dialogue VALUES ('DL1', 'T1', 'أَيْنَ الْمَفَاتِيحُ؟', 'Where are the keys?', 'd/k.jpg', 1);
    INSERT INTO ar_daily_dialogue_turn VALUES ('DL1:1', 'DL1', 'W1'), ('DL1:2', 'DL1', NULL);
    INSERT INTO ar_daily_word VALUES ('W1', 'T1', 'سَرِيرٌ', 'أَسِرَّةٌ', 'a bed', 'w/bed.jpg', 'a/sg.mp3', 'a/pl.mp3', 1), ('W2', 'T1', 'بَابٌ', 'أَبْوَابٌ', 'a door', NULL, NULL, NULL, 2),
                                      ('W3', 'T2', 'طَاوِلَةٌ', 'طَاوِلَاتٌ', 'a table', NULL, NULL, NULL, 1);
    INSERT INTO ar_daily_sentence VALUES ('S1', 'T1', 'W2', 1);
    INSERT INTO ar_daily_passage VALUES ('P1', 'T1', 'الْبَيْتُ', 31);`);
  const n = (id: string, parent: string | null, type: string, kind: string | null, o: Record<string, unknown> = {}) =>
    AR.prepare(`INSERT INTO ar_map_node (id, parent_id, type, kind, ref, title_ar, title_en, icon, color, x, y, w, h, sort_order, settings, domain, map_id)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id, parent, type, kind, (o.ref as string) ?? null, (o.ar as string) ?? null, (o.en as string) ?? null,
      (o.icon as string) ?? null, (o.color as string) ?? null, (o.x as number) ?? null, (o.y as number) ?? null, (o.w as number) ?? null, (o.h as number) ?? null,
      (o.sort as number) ?? 0, JSON.stringify(o.settings ?? {}), (o.domain as string) ?? null, (o.map as string) ?? 'MAP:t');
  n('MAP:t', null, 'stop', 'world');
  n('t:centre', 'MAP:t', 'stop', 'district', { ar: 'الْوَسَطُ', en: 'Centre', x: 0.1, y: 0.1, w: 0.8, h: 0.5, color: '#eee', settings: { inline: true, reveal: 0.95 } });
  n('t:centre:home', 't:centre', 'stop', 'place', { domain: 'home', x: 0.25, y: 0.5, sort: 1, icon: 'house.fill' });
  n('t:centre:kitchen_only', 't:centre', 'stop', 'place', { domain: 'kitchen_only', x: 0.75, y: 0.5, sort: 2 });
  n('t:centre:plain', 't:centre', 'stop', 'place', { domain: 'plain', x: 0.5, y: 0.8, sort: 3 });
  n('t:portal', 'MAP:t', 'portal', null, { ref: 'MAP:u', x: 0.5, y: 0.95, sort: 9 });
  // the home: three rooms, the entrance the default; the dialogue hung on the entrance, the reading in the bedroom
  n('t:centre:home:entrance', 't:centre:home', 'stop', 'room', { ar: 'الْمَدْخَلُ', en: 'Entrance', x: 0.04, y: 0.06, w: 0.45, h: 0.4, settings: { inline: true, default: true } });
  n('t:centre:home:bedroom', 't:centre:home', 'stop', 'room', { ar: 'غُرْفَةُ النَّوْمِ', en: 'Bedroom', x: 0.5, y: 0.06, w: 0.45, h: 0.4, settings: { inline: true } });
  n('t:centre:home:garden', 't:centre:home', 'stop', 'room', { ar: 'الْحَدِيقَةُ', en: 'Garden', x: 0.04, y: 0.5, w: 0.9, h: 0.4, settings: { inline: true } });
  n('t:centre:home:entrance~dialogue~DL1', 't:centre:home:entrance', 'artifact', 'dialogue', { ref: 'DL1' });
  n('t:centre:home:bedroom~reading~daily-home', 't:centre:home:bedroom', 'artifact', 'reading', { ref: 'ARDR:daily-home' });
  n('t:centre:home:garden~reading~nothing', 't:centre:home:garden', 'artifact', 'reading', { ref: 'ARDR:not-written-yet' });
  const r = new Router<any>(); mapRoutes(r);
  const get = async (path: string) => {
    const res = await r.handle(new Request('https://ar' + path), { DB_AR: d1(AR) } as any);
    return { status: res.status, body: await res.json() as any };
  };
  return { get };
}

const noOverlap = (d: any) => {
  const m = d.world.marker, ns = d.nodes;
  for (let i = 0; i < ns.length; i++) for (let j = i + 1; j < ns.length; j++) {
    assert.ok(Math.abs(ns[i].x - ns[j].x) * d.world.w >= m.w - 1 || Math.abs(ns[i].y - ns[j].y) * d.world.h >= m.h - 1, `${ns[i].id} / ${ns[j].id}`);
  }
};

test('a world: its districts are labelled areas, its places stand inside them, a portal leads elsewhere', async () => {
  const d = (await world().get('/ar/map/MAP:t')).body.data;
  assert.equal(d.node.kind, 'world');
  assert.equal(d.node.title, 'The Test Town');
  assert.equal(d.world.mode, 'picture');
  assert.ok(d.world.gate, "the world's own picture fills it");
  assert.deepEqual(d.zones.map((z: any) => [z.id, z.reveal, z.count]), [['t:centre', 0.95, 3]]);
  const by = Object.fromEntries(d.nodes.map((n: any) => [n.id, n]));
  assert.equal(by['t:centre:home'].state, 'open');
  assert.equal(by['t:centre:home'].title, 'Home and Family');
  assert.equal(by['t:centre:home'].caption, '2 readings · 2 words');
  assert.equal(by['t:centre:plain'].state, 'locked');
  assert.equal(by['t:centre:plain'].caption, 'Coming soon');
  // the opening view is calm: places with something in them show, the coming-soon ones appear as you zoom in
  assert.equal(by['t:centre:home'].reveal, 0);
  assert.equal(by['t:centre:plain'].reveal, 1);
  assert.equal(by['t:portal'].type, 'portal');
  assert.equal(by['t:portal'].ref, 'MAP:u');
  assert.equal(by['t:portal'].title, 'Other');
  noOverlap(d);
  const z = d.zones[0];
  for (const id of ['t:centre:home', 't:centre:plain']) assert.ok(by[id].x >= z.x - 0.2 && by[id].x <= z.x + z.w + 0.2);
});

test('a place: its rooms are areas, artifacts stand in their rooms, live content not on the tree goes to the default room', async () => {
  const d = (await world().get('/ar/map/t:centre:home')).body.data;
  assert.deepEqual(d.node.breadcrumbs.map((b: any) => b.id), ['MAP:t', 't:centre']);
  assert.equal(d.node.domain, 'home');
  assert.deepEqual(d.zones.map((z: any) => z.id), ['t:centre:home:entrance', 't:centre:home:bedroom', 't:centre:home:garden']);
  const by = Object.fromEntries(d.nodes.map((n: any) => [n.id, n]));
  const dlg = by['t:centre:home:entrance~dialogue~DL1'];
  assert.equal(dlg.titleAr, 'أَيْنَ الْمَفَاتِيحُ؟');
  assert.equal(dlg.caption, '2 lines · listen in');
  assert.equal(dlg.state, 'open');
  assert.equal(dlg.zone, 't:centre:home:entrance');
  const rd = by['t:centre:home:bedroom~reading~daily-home'];
  assert.equal(rd.caption, '4 lines · read-along');
  assert.equal(rd.zone, 't:centre:home:bedroom');
  const soon = by['t:centre:home:garden~reading~nothing'];
  assert.equal(soon.state, 'locked');
  assert.equal(soon.caption, 'Coming soon');
  // live but not hung: the Friday Q&A, the sentences, the passage and the hub, all in the default room (the entrance)
  const extra = d.nodes.filter((n: any) => n.id.includes('~') && !['dialogue~DL1', 'reading~daily-home', 'reading~nothing'].some((k) => n.id.endsWith(k)));
  assert.deepEqual(extra.map((n: any) => n.kind).sort(), ['passage', 'reading', 'sentences', 'vocab_hub']);
  assert.ok(extra.every((n: any) => n.zone === 't:centre:home:entrance'));
  const hub = extra.find((n: any) => n.kind === 'vocab_hub');
  assert.equal(hub.titleAr, 'المُفْرَدَات');
  assert.equal(hub.state, 'open');
  assert.ok(/words/.test(hub.caption));
  noOverlap(d);
});

test('any level answers the same way: a room opens as a canvas of its own; a place with no rows yet is laid out from its content', async () => {
  const w = world();
  const room = (await w.get('/ar/map/t:centre:home:bedroom')).body.data;
  assert.equal(room.node.kind, 'room');
  assert.deepEqual(room.node.breadcrumbs.map((b: any) => b.id), ['MAP:t', 't:centre', 't:centre:home']);
  assert.deepEqual(room.nodes.map((n: any) => n.kind), ['reading']);
  const dom = (await w.get('/ar/map/domain:kitchen_only')).body.data;
  assert.equal(dom.node.title, 'Kitchen Only');
  assert.deepEqual(dom.nodes.map((n: any) => n.kind), ['vocab_hub'], 'a place with only words has its hub');
  assert.equal((await w.get('/ar/map/nope')).status, 404);
  assert.equal((await w.get('/ar/map/domain:nope')).status, 404);
});

test("the vocabulary hub: day-set words and the readings' key words, once each, with where they are seen", async () => {
  const d = (await world().get('/ar/vocab/home')).body.data;
  const words = d.sections.flatMap((s: any) => s.groups.flatMap((g: any) => g.words.map((w: any) => ({ ...w, group: g.kind, section: s.key }))));
  const bed = words.filter((w: any) => w.ar === 'سَرِيرٌ');
  assert.equal(bed.length, 1, 'the bed is in the day-set and in the reading, and listed once');
  assert.equal(bed[0].form, 'أَسِرَّةٌ');
  assert.equal(bed[0].picture, '/api/ar/audio/w/bed.jpg');
  assert.equal(bed[0].audio, '/api/ar/audio/a/sg.mp3');
  assert.deepEqual(bed[0].seenIn.map((s: any) => s.id).sort(), ['dialogue:DL1', 'reading:daily-home']);
  assert.equal(bed[0].section, 't:centre:home:bedroom', 'grouped by the room of the story it is first seen in');
  assert.equal(words.find((w: any) => w.ar === 'فَتَحَ')?.group, 'verb');
  assert.equal(words.find((w: any) => w.ar === 'فَتَحَ')?.formLabel, 'present');
  assert.equal(words.find((w: any) => w.ar === 'مَرْحَبًا')?.group, 'expression');
  assert.equal(d.count, words.length);
});

test('key parsing, and a word taught earlier on the map is not repeated', () => {
  assert.deepEqual(parseKey({ w: 'سَرِيرٌ', en: 'a bed (سَرِيرٌ — أَسِرَّةٌ)' }), { gloss: 'a bed', lemma: 'سَرِيرٌ', form: 'أَسِرَّةٌ' });
  assert.deepEqual(parseKey({ w: 'مَرْحَبًا', en: 'welcome' }), { gloss: 'welcome', lemma: 'مَرْحَبًا', form: null });
  assert.equal(keysOf(READING).length, 4);
  const v = buildVocabulary({ words: [{ id: 'a', singular: 'بَابٌ', plural: 'أَبْوَابٌ', gloss: 'door', image: null, audioSg: null, audioPl: null }],
    readings: [], dialogues: [], sentenceWordIds: [], taughtBefore: new Set(['باب']), roomOf: new Map(), rooms: [] });
  assert.equal(v.count, 0);
});
