// A daily reading as story-book pages (GET /ar/daily/readings/:slug/book): one page per read block with its picture, words,
// times and clips; a dialogue's question and answer as two clips on one page; the words to learn as the last page.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { Router } from '../../shared/src/router';
import { dailyRoutes } from '../src/routes/daily';

function d1(db: DatabaseSync): D1Database {
  const stmt = (q: string, args: unknown[] = []) => {
    const s = db.prepare(q);
    const a = args as never[];
    return {
      bind: (...b: unknown[]) => stmt(q, b),
      all: async () => ({ results: s.all(...a) }),
      first: async () => s.get(...a) ?? null,
      run: async () => { const r = s.run(...a); return { meta: { changes: Number(r.changes) } }; },
    };
  };
  return { prepare: (q: string) => stmt(q) } as unknown as D1Database;
}

const fence = (t: string, o: unknown) => '```' + t + '\n' + JSON.stringify(o) + '\n```';
const story = `# At the Market · فِي السُّوقِ\n\nA morning trip.\n\n::readall[Play all]\n\n` + [
  fence('read', { ar: 'خَرَجْتُ إِلَى السُّوقِ.', en: 'I went to the market.', audio: '/api/ar/audio/r/l1.m4a', words: [[0, 0.4], [0.4, 0.8], [0.8, 1.5]],
                  keys: [{ w: 'السُّوقِ.', en: 'the market' }], img: '/api/ar/audio/r/p1.jpg', side: 'left' }),
  fence('read', { ar: 'رَجَعْتُ.', en: 'I came back.', audio: '/api/ar/audio/r/l2.m4a', words: [[0, 0.5]] }),
  '## Words to learn',
  fence('vocab', [{ w: 'السُّوقِ', en: 'the market', base: 'سُوقٌ — أَسْوَاقٌ', img: '/api/ar/audio/r/w/a.jpg', audio: '/api/ar/audio/r/w/a.m4a' }]),
].join('\n\n');
const dialogue = `# Two Friends · حِوَارٌ\n\n` + [
  fence('cast', { narrator: { ar: 'الراوي', color: '#C9C2B0' }, friend_a: { ar: 'أحمد', en: 'Ahmad', color: '#E8C96A' }, friend_b: { ar: 'خالد', color: '#7FD1AE' } }),
  fence('read', { role: 'title', ar: 'حِوَارٌ', audio: '/t.m4a', words: [[0, 1]], speaker: 'narrator' }),
  fence('read', { ar: 'أَذْهَبُ إِلَى السُّوقِ.', en: 'I am going to the market.', audio: '/api/ar/audio/d/l1.m4a', words: [[0, 0.4], [0.4, 0.7], [0.7, 1.2]],
                  img: '/api/ar/audio/d/p1.jpg', q: 'إِلَى أَيْنَ تَذْهَبُ؟', q_audio: '/api/ar/audio/d/q1.m4a', q_words: [[0, 0.3], [0.3, 0.9]],
                  q_speaker: 'friend_a', speaker: 'friend_b', gap_q: 0.7, gap_a: 0.45 }),
].join('\n\n');

function world() {
  const AR = new DatabaseSync(':memory:');
  AR.exec(`CREATE TABLE ar_practice_label (scope TEXT, key TEXT, label TEXT, label_ar TEXT, detail TEXT, icon TEXT, color TEXT,
             min_value INTEGER, extra_json TEXT, sort INTEGER, PRIMARY KEY (scope, key));
           CREATE TABLE ar_curriculum_domain (id TEXT, slug TEXT);
           CREATE TABLE ar_daily_reading (slug TEXT, kind TEXT, title_en TEXT, title_ar TEXT, subtitle_en TEXT, body_md TEXT, is_published INTEGER, domain_id TEXT);
           INSERT INTO ar_curriculum_domain VALUES ('D1', 'market_shopping');`);
  const ins = AR.prepare(`INSERT INTO ar_daily_reading VALUES (?,?,?,?,?,?,1,'D1')`);
  ins.run('daily-market', 'story', 'At the Market', 'فِي السُّوقِ', 'A morning trip.', story);
  ins.run('friends', 'qa', 'Two Friends', 'حِوَارٌ', '', dialogue);
  ins.run('empty', 'story', 'Empty', 'فارغ', '', '# nothing');
  const env = { DB_AR: d1(AR) } as any;
  const r = new Router<any>(); dailyRoutes(r);
  const get = async (path: string) => { const res = await r.handle(new Request('https://ar' + path), env); return { status: res.status, body: await res.json() as any }; };
  return { AR, get };
}

test('a story reading: a page per block, picture carried on, words timed, key words flagged, one clip each, no words page but a link to the hub', async () => {
  const { status, body } = await world().get('/ar/daily/readings/daily-market/book');
  assert.equal(status, 200);
  const b = body.data;
  assert.equal(b.id, 'ARDR:daily-market');
  assert.equal(b.titleAr, 'فِي السُّوقِ'); assert.equal(b.titleEn, 'At the Market'); assert.equal(b.summary, 'A morning trip.');
  assert.equal(b.words.kicker.text, 'ARABIC READING'); assert.equal(b.words.kicker.ar, 'قِرَاءَةٌ');   // the fallback until the label rows are in
  assert.equal(b.words.english.text, 'English');
  assert.equal(b.pages.length, 2);
  const p = b.pages[0];
  assert.equal(p.picture, '/api/ar/audio/r/p1.jpg'); assert.equal(p.textEn, 'I went to the market.'); assert.equal(p.of, 3);
  assert.deepEqual(p.words.map((w: any) => [w.t, w.s, w.e, w.k]), [['خَرَجْتُ', 0, 0.4, false], ['إِلَى', 0.4, 0.8, false], ['السُّوقِ.', 0.8, 1.5, true]]);
  assert.deepEqual(p.clips, [{ url: '/api/ar/audio/r/l1.m4a', gap: 0.45, from: 0, to: 2, speaker: null, name: null, color: null }]);
  assert.equal(b.pages[1].picture, '/api/ar/audio/r/p1.jpg');                         // no picture of its own: the one before stays
  assert.equal(b.remember, null);                                                      // the words are the hub's, not a page of the book
  assert.deepEqual(b.hub, { domain: 'market_shopping', focus: 'reading:daily-market', title: 'Words of this place', titleAr: 'كَلِمَاتُ الْمَكَانِ', icon: null });
});

test('a dialogue: the question and the answer are two clips on one page, each with its speaker, colour, words and pause', async () => {
  const { body } = await world().get('/ar/daily/readings/friends/book');
  const b = body.data;
  assert.equal(b.words.kicker.text, 'ARABIC DIALOGUE');
  assert.equal(b.pages.length, 1);                                                     // the title line is the cover's, not a page
  const p = b.pages[0];
  assert.deepEqual(p.words.map((w: any) => w.t), ['إِلَى', 'أَيْنَ', 'تَذْهَبُ؟', 'أَذْهَبُ', 'إِلَى', 'السُّوقِ.']);
  assert.deepEqual(p.clips, [
    { url: '/api/ar/audio/d/q1.m4a', gap: 0.7, from: 0, to: 2, speaker: 'friend_a', name: 'أحمد', color: '#E8C96A' },
    { url: '/api/ar/audio/d/l1.m4a', gap: 0.45, from: 3, to: 5, speaker: 'friend_b', name: 'خالد', color: '#7FD1AE' },
  ]);
  assert.equal(p.words[3].s, 0);                                                       // the answer's times are its own recording's
});

const scenes = `# Where are the keys? · أَيْنَ\n\n` + [
  fence('cast', { mommy: { ar: 'سَلْمَى', color: '#E58FA5' }, dad: { ar: 'كَرِيم', color: '#6FA8DC' } }),
  fence('sound', { ambience: { id: 'amb_home_room' } }),
  fence('read', { ar: 'لَا أَجِدُهَا.', audio: '/api/ar/audio/k/t1.m4a', words: [[0, 0.5], [0.5, 1]], speaker: 'mommy' }),
  fence('read', { ar: 'وَجَدْتُهَا!', audio: '/api/ar/audio/k/t5.m4a', words: [[0, 0.8]], speaker: 'mommy',
                  sound: { ambience: { id: 'amb_home_room', gain_db: -24 }, spots: [{ id: 'keys_jingle', word: 0 }, { id: 'not_in_library', word: 0 }] } }),
].join('\n\n');

test('a reading sounds like its scene: the default bed under every page, a page\'s own cue over it, only sounds ar_sfx has', async () => {
  const w = world();
  w.AR.exec(`CREATE TABLE ar_sfx (id TEXT PRIMARY KEY, object_key TEXT, scene_in_key TEXT, loopable INTEGER);
             INSERT INTO ar_sfx VALUES ('amb_home_room', 'sfx/amb_home_room-1.m4a', NULL, 1), ('keys_jingle', 'sfx/keys_jingle-2.m4a', NULL, 0);`);
  w.AR.prepare(`INSERT INTO ar_daily_reading VALUES (?,?,?,?,?,?,1,'D1')`).run('everyday-home', 'qa', 'Where are the keys?', 'أَيْنَ', '', scenes);
  const p = (await w.get('/ar/daily/readings/everyday-home/book')).body.data.pages;
  assert.deepEqual(p[0].sound, { ambience: { id: 'amb_home_room', url: '/api/ar/audio/sfx/amb_home_room-1.m4a', sceneIn: null, gainDb: -22 }, spots: [] });
  assert.equal(p[1].sound.ambience.gainDb, -24);
  assert.deepEqual(p[1].sound.spots, [{ id: 'keys_jingle', url: '/api/ar/audio/sfx/keys_jingle-2.m4a', word: 0, at: null, gainDb: -12 }]);
  assert.deepEqual(p[0].clips[0], { url: '/api/ar/audio/k/t1.m4a', gap: 0.45, from: 0, to: 1, speaker: 'mommy', name: 'سَلْمَى', color: '#E58FA5' });
  // a reading with no sounds stays silent under the voice (and needs no ar_sfx table)
  assert.equal((await world().get('/ar/daily/readings/daily-market/book')).body.data.pages[0].sound, null);
});

test('the labels come from ar_practice_label when the rows exist', async () => {
  const w = world();
  w.AR.exec(`INSERT INTO ar_practice_label VALUES ('storybook','reading_kicker','EVERYDAY READING','قِرَاءَةٌ يَوْمِيَّةٌ',NULL,NULL,NULL,NULL,NULL,1)`);
  const real = Date.now; Date.now = () => real() + 120_000;                              // past the label memo (a minute)
  try {
    const { body } = await w.get('/ar/daily/readings/daily-market/book');
    assert.equal(body.data.words.kicker.text, 'EVERYDAY READING');
  } finally { Date.now = real; }
});

test('an unknown or empty reading is a 404', async () => {
  const w = world();
  assert.equal((await w.get('/ar/daily/readings/nope/book')).status, 404);
  assert.equal((await w.get('/ar/daily/readings/empty/book')).status, 404);
});
