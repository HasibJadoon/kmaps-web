import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import {
  shapeHome, buildForest, titleParts, isStrand,
  type HomeEpisodeRow, type StreamRow, type StageRow,
} from '../src/home';

// Real st_episodes rows (km_studio, 2026-10-21) and the stream rows exactly as
// migration 0008 writes them — the migration is run, not copied.
const here = join(__dirname);
const rows: HomeEpisodeRow[] = JSON.parse(readFileSync(join(here, 'fixtures/st-episodes.json'), 'utf8'));

function seeded(): { streams: StreamRow[]; stages: StageRow[] } {
  const db = new Database(':memory:');
  db.exec(readFileSync(join(here, '../migrations/0008_st_streams.sql'), 'utf8'));
  // and again: the migration must be safe to re-run by `d1 execute --file`
  db.exec(readFileSync(join(here, '../migrations/0008_st_streams.sql'), 'utf8'));
  // 0009 rewrites the Arabic stream's words (and files episodes, which the fixture rows already carry)
  db.exec(`CREATE TABLE st_episodes (id TEXT PRIMARY KEY, core_user_ref TEXT, core_ws_ref TEXT, title TEXT, format TEXT,
    status TEXT, ecosystem TEXT, series_ref TEXT, session_no INTEGER, output_kind TEXT, created_at TEXT, updated_at TEXT)`);
  db.exec(`CREATE TABLE IF NOT EXISTS d1_migrations (id INTEGER PRIMARY KEY, name TEXT, applied_at TEXT)`);
  db.exec(readFileSync(join(here, '../migrations/0009_st_streams_arabic_classical.sql'), 'utf8'));
  return {
    streams: db.prepare('SELECT * FROM st_streams WHERE active = 1 ORDER BY seq').all() as StreamRow[],
    stages: db.prepare('SELECT * FROM st_pipeline_stages ORDER BY seq').all() as StageRow[],
  };
}

const { streams, stages } = seeded();
const home = shapeHome(rows, streams, stages);

// Written for the app's snapshot test, which renders the landing from it.
if (process.env.STUDIO_HOME_FIXTURE_OUT) {
  writeFileSync(process.env.STUDIO_HOME_FIXTURE_OUT, JSON.stringify({ ok: true, data: home }, null, 1));
}

test('three streams, in seq order, words from the rows', () => {
  assert.deepEqual(home.streams.map((s) => s.key), ['quran', 'arabic', 'worldview']);
  assert.equal(home.streams[0].title_ar, 'القرآن');
  assert.equal(home.streams[0].title_face, 'uthmanic');
  assert.equal(home.streams[1].motif, 'ink');
  assert.deepEqual(home.streams[2].accent.length, 3);
});

test('counts are leaves only, and in-the-can mirrors EpisodeStatus.isShootable', () => {
  for (const s of home.streams) {
    const mine = rows.filter((r) => r.ecosystem === s.key && !isStrand(r));
    // every leaf of the ecosystem is under the stream's forest (no row dropped)
    assert.equal(s.counts.total, mine.length, s.key);
    const shot = mine.filter((r) => ['shot', 'published', 'done'].includes(r.status)).length;
    assert.equal(s.counts.done, shot, s.key);
    assert.equal(s.counts.to_shoot, s.counts.total - s.counts.done);
    assert.equal(s.counts.stages.reduce((a, b) => a + b.count, 0),
      mine.filter((r) => r.status !== 'archived').length);
  }
  assert.equal(home.totals.total, home.streams.reduce((a, s) => a + s.counts.total, 0));
});

test('series are the strands one level under each channel root', () => {
  const quran = home.streams.find((s) => s.key === 'quran')!;
  const ids = quran.series.map((s) => s.id);
  assert.ok(ids.includes('SER:burhan:ghafir'));
  assert.ok(ids.includes('SER:dozawiya:ghafir'));
  assert.ok(!ids.includes('SER:eco:quran'), 'a channel root with strands is not itself a series');
  const ghafir = quran.series.find((s) => s.id === 'SER:burhan:ghafir')!;
  assert.equal(ghafir.channel, 'WS:CYBERNETICS');
  assert.equal(ghafir.total, 20);
  assert.equal(ghafir.title_ar, 'سورة غافر');

  // the Qurʾānic Vocabulary shelf is Qurʾān's (0009); Arabic is acquiring Classical Arabic — reading, reactions,
  // drills, grammar, balāgha, ṣarf, in that order
  const s44 = quran.series.find((s) => s.id === 'SER:vocab:s44')!;
  assert.equal(s44.parent_title_en, 'Qurʾānic Vocabulary');
  const arabic = home.streams.find((s) => s.key === 'arabic')!;
  assert.ok(!arabic.series.some((s) => s.id.startsWith('SER:vocab')));
  const cyb = arabic.series.filter((s) => s.channel === 'WS:CYBERNETICS').map((s) => s.id);
  for (const k of ['reading', 'reactions', 'drills', 'nahw', 'balagha', 'sarf']) assert.ok(cyb.includes(`SER:cyb:arabic:${k}`), k);
  // archived strands with nothing under them are not listed
  const wv = home.streams.find((s) => s.key === 'worldview')!;
  assert.ok(!wv.series.some((s) => s.id === 'SER:doz:wv:wahy'));
});

test('next up is the first shootable leaf in tree order — what the app would find', () => {
  for (const s of home.streams) {
    const forest = buildForest(rows.filter((r) => r.ecosystem === s.key));
    const walk = (ns: typeof forest): HomeEpisodeRow[] =>
      ns.flatMap((n) => (isStrand(n.row) ? walk(n.children) : [n.row]));
    const first = walk(forest).find((r) => !['shot', 'published', 'done'].includes(r.status));
    assert.equal(s.next_up?.id ?? null, first?.id ?? null, s.key);
  }
});

test('resume is the most recently opened episode', () => {
  const opened = rows.filter((r) => r.last_opened_at && !isStrand(r))
    .sort((a, b) => (b.last_opened_at! > a.last_opened_at! ? 1 : -1));
  assert.equal(home.resume?.id, opened[0]?.id);
});

test('graphics are DeckGraphic payloads the app can draw', () => {
  const drawn = new Set(['timeline', 'hub', 'chevrons']);
  for (const s of home.streams) {
    for (const g of s.graphics) {
      assert.ok(drawn.has(g.kind), g.kind);
      assert.ok(g.items.length > 0);
      if (g.kind === 'chevrons') assert.ok(g.items.length <= 5);
      if (g.kind === 'timeline') assert.ok(g.items.length <= 7);
    }
  }
  assert.equal(home.graphic.kind, 'chevrons');
  assert.equal(home.graphic.items.length, stages.length);
});

test('titles split by script as String.kmTitleParts does', () => {
  assert.deepEqual(titleParts('القرآن — Qurʾān with Arham'), { ar: 'القرآن', en: 'Qurʾān with Arham' });
  assert.deepEqual(titleParts('Sūrat al-Dukhān — with Arham'), { ar: null, en: 'Sūrat al-Dukhān — with Arham' });
  assert.deepEqual(titleParts('سورة 44'), { ar: 'سورة 44', en: '' });
});
