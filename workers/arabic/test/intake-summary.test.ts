// The Workspace card's feed (GET /ar/intake/summary) and the list's "next": what is already in the app,
// parked or turned down is never next on the learning path.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { Router } from '../../shared/src/router';
import { intakePipelineRoutes } from '../../shared/src/intake-pipeline';
import { intakeRoutes, thumbnailOf } from '../src/routes/intake';

const root = new URL('../../', import.meta.url).pathname;
const sql = (p: string) => readFileSync(root + p, 'utf8');

function d1(db: DatabaseSync): D1Database {
  const stmt = (q: string, args: unknown[] = []) => {
    const s = db.prepare(q);
    const a = args.map((v) => (typeof v === 'boolean' ? +v : v)) as never[];
    return {
      bind: (...b: unknown[]) => stmt(q, b),
      all: async () => ({ results: s.all(...a) }),
      first: async () => s.get(...a) ?? null,
      run: async () => { const r = s.run(...a); return { meta: { changes: Number(r.changes) } }; },
    };
  };
  return { prepare: (q: string) => stmt(q) } as unknown as D1Database;
}

function world() {
  const AR = new DatabaseSync(':memory:');
  AR.exec(`CREATE TABLE ar_practice_label (scope TEXT, key TEXT, label TEXT, label_ar TEXT, detail TEXT, icon TEXT, color TEXT,
             min_value INTEGER, extra_json TEXT, sort INTEGER, PRIMARY KEY (scope, key));
           CREATE TABLE ar_acquisition_ref (id TEXT PRIMARY KEY);`);
  for (const m of ['0039_ar_intake.sql', '0040_ar_intake_words.sql', '0041_ar_intake_form_route.sql', '0042_ar_intake_domains.sql',
                   '0043_ar_intake_path.sql', '0044_ar_learner_path.sql', '0075_intake_in_app.sql', '0078_intake_summary_words.sql'])
    AR.exec(sql('arabic/migrations/' + m));
  const QR = new DatabaseSync(':memory:'); QR.exec(sql('quran/migrations/qr_119_intake_pipeline.sql'));
  const WV = new DatabaseSync(':memory:'); WV.exec(sql('worldview/migrations/011_wv_intake_pipeline.sql'));
  const qr = new Router<{ DB_QR: D1Database }>(); intakePipelineRoutes(qr, { prefix: '/qr', db: (e) => e.DB_QR, table: 'qr_intake_pipeline', stages: 'qr_intake_stage' });
  const wv = new Router<{ DB_WV: D1Database }>(); intakePipelineRoutes(wv, { prefix: '/wv', db: (e) => e.DB_WV, table: 'wv_intake_pipeline', stages: 'wv_intake_stage' });
  const binding = (r: Router<any>, env: unknown) => ({ fetch: (u: string, init?: RequestInit) => r.handle(new Request(u, init), env) }) as unknown as Fetcher;
  const env = { DB_AR: d1(AR), QURAN: binding(qr, { DB_QR: d1(QR) }), WORLDVIEW: binding(wv, { DB_WV: d1(WV) }) } as any;
  const ar = new Router<any>(); intakeRoutes(ar);
  const get = async (path: string, signedIn = true) => {
    const res = await ar.handle(new Request('https://ar' + path, { headers: signedIn ? { 'X-KM-User-Id': 'u1', 'X-KM-Role': 'user' } : {} }), env);
    return { status: res.status, body: await res.json() as any };
  };
  const add = (id: string, o: { status: string; rank?: number | null; title?: string; kind?: string; ext?: string; parent?: string; seq?: number; meta?: string }) =>
    AR.prepare(`INSERT INTO ar_intake_item (id, parent_id, kind, url, platform, external_id, title_ar, title_en, strand, level, status, path_rank, seq, item_count, meta_json, to_ar)
                VALUES (?, ?, ?, ?, 'youtube', ?, ?, ?, 'lugha', 'easy', ?, ?, ?, ?, ?, 1)`)
      .run(id, o.parent ?? null, o.kind ?? 'playlist', 'https://youtu.be/' + id, o.ext ?? id, o.title ?? id, 'En ' + id, o.status, o.rank ?? null, o.seq ?? null,
           o.parent ? null : 7, o.meta ?? '{}');
  return { AR, get, add };
}

test('next on the path skips what is in the app, parked or rejected — in the list and in the summary', async () => {
  const w = world();
  w.add('IN:a', { status: 'in_app', rank: 1 });
  w.add('IN:b', { status: 'parked', rank: 2 });
  w.add('IN:c', { status: 'rejected', rank: 3 });
  w.add('IN:d', { status: 'queued', rank: 4 });
  w.add('IN:e', { status: 'logged', rank: 5 });
  w.add('IN:f', { status: 'queued', rank: 6 });
  w.add('IN:g', { status: 'queued', rank: 7 });
  w.add('IN:h', { status: 'queued', rank: null });                 // not on the path at all

  const list = await w.get('/ar/intake');
  assert.deepEqual(list.body.data.next.map((r: any) => r.id), ['IN:d', 'IN:e', 'IN:f', 'IN:g']);

  const s = await w.get('/ar/intake/summary');
  assert.equal(s.status, 200);
  assert.deepEqual(s.body.data.next.map((r: any) => r.id), ['IN:d', 'IN:e', 'IN:f'], 'three, in path order');
});

test('the summary is shaped for a renderer: words from labels, tiles, pipelines, next rows', async () => {
  const w = world();
  w.add('IN:a', { status: 'in_app', rank: 1 });
  w.add('IN:b', { status: 'queued', rank: 2, title: 'قصص', ext: 'PLx1234567', meta: '{}' });
  w.add('IN:b1', { status: 'queued', parent: 'IN:b', kind: 'video', ext: 'vid12345678', seq: 1 });
  w.add('IN:c', { status: 'logged' });
  w.add('IN:c1', { status: 'logged', parent: 'IN:c', kind: 'video', seq: 1 });   // a child is not a source: never counted

  const { status, body } = await w.get('/ar/intake/summary');
  assert.equal(status, 200);
  const d = body.data;
  assert.equal(d.title.label, 'Intake queue');
  assert.equal(d.title.labelAr, 'طَابُورُ الوَارِد');
  assert.ok(d.title.detail, 'the subtitle comes from the label');
  assert.equal(d.nextTitle.label, 'Next up');

  assert.deepEqual(d.tiles.map((t: any) => [t.key, t.count]), [['in_app', 1], ['queued', 1], ['logged', 1]], 'parked hidden at zero');
  for (const t of d.tiles) for (const k of ['key', 'label', 'labelAr', 'color', 'icon', 'count']) assert.ok(k in t, `tile has ${k}`);
  assert.equal(d.tiles[0].label, 'In the app');

  assert.deepEqual(d.pipelines.map((p: any) => p.domain.key), ['ar', 'qr', 'wv']);
  const arP = d.pipelines[0];
  assert.ok(arP.domain.label && arP.domain.color);
  assert.ok(arP.stages.length > 1 && arP.stages.every((s: any) => typeof s.count === 'number' && s.label));
  assert.equal(arP.total, arP.stages.reduce((a: number, s: any) => a + s.count, 0));
  assert.ok(d.pipelines[1].stages.length > 1, 'the QR worker answers with its own stages');

  assert.deepEqual(d.next.map((r: any) => r.id), ['IN:b']);
  const n = d.next[0];
  assert.equal(n.titleAr, 'قصص');
  assert.equal(n.titleEn, 'En IN:b');
  assert.equal(n.strand.label, 'Language');
  assert.equal(n.level.label, 'Easy');
  assert.equal(n.episodes, 1);
  assert.equal(n.episodesLabel, '1 episodes');
  assert.equal(n.pathStep, 'Step 2');
  assert.equal(n.thumbnail, 'https://i.ytimg.com/vi/vid12345678/hqdefault.jpg', "a playlist's cover is its first episode's still");

  // the parked tile appears once something is parked
  w.add('IN:p', { status: 'parked' });
  const again = await w.get('/ar/intake/summary');
  assert.deepEqual(again.body.data.tiles.map((t: any) => t.key), ['in_app', 'queued', 'logged', 'parked']);
});

test('the summary is for signed-in readers only', async () => {
  const w = world();
  assert.equal((await w.get('/ar/intake/summary', false)).status, 401);
});

test('a cover: its own, else the video still, else none', () => {
  const base = { kind: 'video', platform: 'youtube', external_id: 'abcdefghijk', meta_json: '{}' };
  assert.equal(thumbnailOf(base), 'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg');
  assert.equal(thumbnailOf({ ...base, meta_json: '{"thumbnail":"https://x.test/c.jpg"}' }), 'https://x.test/c.jpg');
  assert.equal(thumbnailOf({ ...base, meta_json: '{"thumbnail":"javascript:1"}' }), 'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg');
  assert.equal(thumbnailOf({ ...base, kind: 'playlist' }), null, 'a playlist with no episode listed has no cover');
  assert.equal(thumbnailOf({ ...base, platform: 'archive.org' }), null);
});
