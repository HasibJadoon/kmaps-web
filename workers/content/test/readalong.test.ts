import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { shapeEpisode, readalongConfig, offeredHere, fill } from '../src/readalong';
import { markersOf, tc } from '../src/readalong-room';

// Both series exactly as readalong_cm.py writes them into km_content: the cm_collections rows, the episode docs with their
// covers, and every scene block (with its own text from km_quran).
const fx = JSON.parse(readFileSync(join(__dirname, 'fixtures/readalong.json'), 'utf8'));
const [tahrir, quran] = fx.series;
const cfgOf = (s: { meta_json: string }) => readalongConfig(s.meta_json)!;
const shape = (s: any, no = 1) => {
  const eps = s.episodes.map(({ blocks, ...e }: any) => e);
  const ep = s.episodes.find((e: any) => e.episode_no === no);
  return shapeEpisode(s, cfgOf(s), eps, eps.find((e: any) => e.episode_no === no), ep.blocks);
};

test('fill leaves unknown slots visible', () => {
  assert.equal(fill('EP {ep}', { ep: '01' }), 'EP 01');
  assert.equal(fill('{nope}', {}), '{nope}');
});

test('the hub offers each series only where it reads', () => {
  assert.equal(offeredHere(cfgOf(tahrir), 'intro', 40), true);
  assert.equal(offeredHere(cfgOf(tahrir), 'intro', 2), false);
  assert.equal(offeredHere(cfgOf(tahrir), 'surah', 40), false);
  assert.equal(offeredHere(cfgOf(quran), 'surah', 1), true);
  assert.equal(offeredHere(cfgOf(quran), 'surah', 114), true);
});

test('stream 1, episode 01: cover, the read-through, seven sentences, the slips, the method, next', () => {
  const p = shape(tahrir);
  const types = p.scenes.map((s) => s['type']);
  assert.equal(types[0], 'title');
  assert.equal(p.scenes[0]['title'], 'The sūra\'s names');
  assert.equal(p.scenes[0]['eyebrow'], 'TODAY\'S READING');
  assert.equal(types[1], 'page');
  assert.equal((p.scenes[1]['lines'] as unknown[]).length, 7);
  assert.equal(types.filter((t) => t === 'line').length, 7);
  assert.equal(types.filter((t) => t === 'short').length, 6);
  assert.equal(types.filter((t) => t === 'steps').length, 1);
  assert.equal(types.at(-1), 'title');
  const open = p.scenes[0] as any, close = p.scenes.at(-1) as any;
  assert.deepEqual([open.role, close.role], ['open', 'close']);
  assert.equal(open.title, close.title);
  assert.equal(open.series_ar, 'التحرير والتنوير');
  assert.equal(close.eyebrow, 'END OF EPISODE 01');
  assert.equal(close.next_title, 'That is the last episode so far');
  assert.equal(p.scenes.length, 1 + 15 + 1);
  // every block scene carries its take cue
  assert.ok(p.scenes.slice(1, -1).every((s) => typeof s['cue'] === 'string' && (s['cue'] as string).length > 0));
  // sentence 1: Arabic, then its meaning, then the near-miss
  const s1 = p.scenes[2] as any;
  assert.equal(s1.type, 'line');
  assert.equal(s1.n, 1);
  assert.ok(s1.text.replace(/[\u064B-\u0652\u0670]/g, '').startsWith('بسم الله'));
  assert.deepEqual(s1.beats.map((b: any) => b.type), ['meaning', 'lesson']);
  assert.equal(s1.beats[1].bad.ar, 'حَتَّى يُصْبِحَ');
  assert.equal(p.chrome.chip, 'EP 01');
  assert.deepEqual(p.episodes.map((e) => e.no), [1]);
});

test('stream 2, episode 01: āyah page in the muṣḥaf face, English contrast kept as English, talk scenes from the strip', () => {
  const p = shape(quran);
  const types = p.scenes.map((s) => s['type']);
  assert.deepEqual(types, ['title', 'line', 'short', 'steps', 'steps', 'talk', 'steps', 'talk', 'talk', 'title']);
  const read = p.scenes[1] as any;
  assert.equal(read.face, 'mushaf');
  assert.ok(read.beats[0].text.length > 10);                           // the default English
  const ba = p.scenes[2] as any;
  assert.equal(ba.bad.ar, '');
  assert.match(ba.bad.en, /By means of His name/);
  const sorcerers = p.scenes[5] as any;
  assert.equal(sorcerers.word, 'بِعِزَّةِ فِرۡعَوۡنَ');
  assert.equal(sorcerers.talk.length, 2);
  const answer = p.scenes[7] as any;
  assert.equal(answer.sub, '27:30 → 1:1');
  assert.match(answer.text, /Qurʾān for sure/);
  assert.equal(p.scenes.at(-1)!['next_title'], 'That is the last episode so far');
});

test('a two-person episode opens a live room; a one-person episode does not', () => {
  const solo = shape(tahrir) as any, two = shape(quran) as any;
  assert.equal(solo.episode.people, 1);
  assert.equal(solo.episode.room, null);
  assert.equal(two.episode.people, 2);
  assert.equal(two.episode.room, 'readalong/CM:COL:series:quran-understanding/room/1');
  assert.equal(two.labels.mark, 'Start take');
});

test('the room turns a take into markers from the mark', () => {
  assert.equal(tc(0), '0:00:00.000');
  assert.equal(tc(3_723_456), '1:02:03.456');
  const markers = markersOf({ markAt: 10_000, log: [
    { scene: 0, beat: 0, id: 'open', t: 10_000 },
    { scene: 1, beat: 0, id: 'read', t: 25_500 },
  ] }, 70_000);
  assert.deepEqual(markers.map((m) => [m.id, m.start, m.end]), [
    ['open', '0:00:00.000', '0:00:15.500'],
    ['read', '0:00:15.500', '0:01:00.000'],
  ]);
});

test('the episode carries its resources, grouped in the order written', () => {
  const s = JSON.parse(JSON.stringify(quran));
  const eps = s.episodes.map(({ blocks, ...e }: any) => e);
  const m = JSON.parse(eps[0].meta_json);
  m.resources = [{ group: 'Study', title: 'Key points', link: 'com.kmaps.app://essay/a' },
                 { group: 'Slides', title: 'Deck', link: 'com.kmaps.app://deck/b' },
                 { group: 'Study', title: 'Lexicon', link: 'com.kmaps.app://essay/c' },
                 { group: 'Study', title: 'no link' }];
  eps[0].meta_json = JSON.stringify(m);
  const p = shapeEpisode(s, cfgOf(s), eps, eps[0], s.episodes[0].blocks) as any;
  assert.deepEqual(p.resources.map((g: any) => [g.title, g.items.map((i: any) => i.title)]), [['Study', ['Key points', 'Lexicon']], ['Slides', ['Deck']]]);
  assert.deepEqual((shape(tahrir) as any).resources, []);
});
