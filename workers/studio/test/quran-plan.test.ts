import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import type { HomeEpisodeRow, StageRow } from '../src/home';
import { shapeQuranPlan, surahRef, type StudyMap } from '../src/quran-plan';

// Real st_episodes rows (km_studio, 2026-10-21) with migration 0011 run over
// them, and QR's study map as /qr/internal/study-map reads it (km_quran,
// 2026-10-27: 114 surahs, 80 cut passages, 22 naẓm groups).
const here = join(__dirname);
const map: StudyMap = JSON.parse(readFileSync(join(here, 'fixtures/qr-study-map.json'), 'utf8'));

function seeded(): { rows: HomeEpisodeRow[]; stages: StageRow[]; meta: string } {
  const db = new Database(':memory:');
  db.exec(readFileSync(join(here, '../migrations/0008_st_streams.sql'), 'utf8'));
  db.exec(`CREATE TABLE st_episodes (id TEXT PRIMARY KEY, title TEXT, format TEXT, status TEXT, core_ws_ref TEXT,
    ecosystem TEXT, series_ref TEXT, session_no INTEGER, source_ref TEXT, last_opened_at TEXT, updated_at TEXT)`);
  const put = db.prepare(`INSERT INTO st_episodes VALUES (@id, @title, @format, @status, @core_ws_ref, @ecosystem,
    @series_ref, @session_no, @source_ref, @last_opened_at, NULL)`);
  for (const r of JSON.parse(readFileSync(join(here, 'fixtures/st-episodes.json'), 'utf8'))) put.run(r);
  const m = readFileSync(join(here, '../migrations/0011_st_quran_plan.sql'), 'utf8');
  db.exec(m);
  db.exec(m); // safe to re-run
  return {
    rows: db.prepare(`SELECT id, title, format, status, core_ws_ref, ecosystem, series_ref, session_no, source_ref,
      last_opened_at FROM st_episodes`).all() as HomeEpisodeRow[],
    stages: db.prepare('SELECT * FROM st_pipeline_stages ORDER BY seq').all() as StageRow[],
    meta: (db.prepare(`SELECT meta_json FROM st_streams WHERE key = 'quran'`).get() as { meta_json: string }).meta_json,
  };
}

const { rows, stages, meta } = seeded();
const plan = shapeQuranPlan('quran', rows, stages, map);

// Written for the app's snapshot test, which renders the Qurʾān page from it.
if (process.env.STUDIO_PLAN_FIXTURE_OUT) {
  writeFileSync(process.env.STUDIO_PLAN_FIXTURE_OUT, JSON.stringify({ ok: true, data: plan }, null, 1));
}

test('the migration names the plan and keeps the stream meta it had', () => {
  const m = JSON.parse(meta);
  assert.equal(m.plan, 'surahs');
  assert.equal(m.points, 8);
});

test('source refs: passage, whole surah, anything else', () => {
  assert.deepEqual(surahRef('QR:SP:40:1-3'), { surah: 40, from: 1, to: 3 });
  assert.deepEqual(surahRef('QR:SP:40:6-6'), { surah: 40, from: 6, to: 6 });
  assert.deepEqual(surahRef('QR:SURAH:44'), { surah: 44 });
  assert.equal(surahRef('AL:ROOT:قوم'), null);
  assert.equal(surahRef(null), null);
});

test('every surah, in order, with its state', () => {
  assert.equal(plan.surahs.length, 114);
  assert.deepEqual(plan.surahs.map((s) => s.no).slice(0, 3), [1, 2, 3]);
  const s = (n: number) => plan.surahs[n - 1];
  assert.equal(s(40).state, 'studying');
  assert.equal(s(44).state, 'studying');
  assert.equal(s(30).state, 'ready', 'passages cut, nothing planned');
  assert.equal(s(2).state, 'open');
  assert.equal(s(2).passages, undefined, 'an untouched surah carries no detail');
  assert.equal(s(40).revelation, 'Makkī');
});

test('vocabulary roots are placed by their strand, not their title', () => {
  const g = plan.surahs[39];
  const vocab = g.tracks?.find((t) => t.id === 'SER:vocab:s40');
  assert.ok(vocab, 'the Ghāfir vocabulary shelf is a track of surah 40');
  assert.equal(vocab!.total, 12);
  assert.equal(vocab!.shelf_en, 'Qurʾānic Vocabulary');
  const tracks = new Set(g.tracks!.map((t) => t.id));
  assert.ok(tracks.has('SER:dozawiya:ghafir') && tracks.has('SER:burhan:ghafir'));
  assert.equal(plan.surahs[43].tracks?.find((t) => t.id === 'SER:vocab:s44')?.total, 110);
});

test('passages carry the furthest stage reached on them', () => {
  const ps = plan.surahs[39].passages!;
  assert.equal(ps.length, 20);
  // 40:1–3 has a live podcast (ready) beside a planned lesson
  assert.equal(ps[0].stage, 'ready');
  assert.ok(ps[0].channels.includes('WS:DOZAWIYA') && ps[0].channels.includes('WS:CYBERNETICS'));
  assert.equal(ps[1].stage, 'planned');
  // the Ḥawāmīm gate (39:71–75) sits on al-Zumar's last passage
  assert.equal(plan.surahs[38].passages!.at(-1)!.episodes, 1);
});

test('groups with a surah in study come first, close-knit before sprawling', () => {
  assert.equal(plan.groups.length, 22);
  assert.equal(plan.groups[0].id, 'QR:NZ:hawamim');
  const hawamim = plan.groups[0];
  assert.equal(hawamim.span, '40–46');
  assert.equal(hawamim.studying, 2);
  assert.equal(hawamim.ready, 3);
  const makki = plan.groups.findIndex((g) => g.id === 'QR:NZ:makki');
  const mathani = plan.groups.findIndex((g) => g.id === 'QR:NZ:mathani');
  assert.ok(mathani < makki);
  assert.equal(plan.groups[makki].span, '86 surahs');
  // untouched groups last
  assert.equal(plan.groups.at(-1)!.studying + plan.groups.at(-1)!.ready, 0);
});

test('opens on the next episode to shoot', () => {
  assert.equal(plan.focus_surah, 40);
  assert.equal(plan.focus_group, 'QR:NZ:hawamim');
});

test('every episode in the stream is placed', () => {
  const placed = plan.surahs.reduce((n, s) => n + s.episodes, 0);
  assert.equal(placed + plan.unplaced, rows.filter((r) => r.ecosystem === 'quran'
    && r.format !== 'series' && r.format !== 'group').length);
});
