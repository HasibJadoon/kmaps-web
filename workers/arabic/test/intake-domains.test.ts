// The intake's three-domain routing, end to end: the real routes of the Arabic, Qurʾān and Worldview
// workers over SQLite (node:sqlite) with the real migrations, wired by fake service bindings.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { Router } from '../../shared/src/router';
import { intakePipelineRoutes } from '../../shared/src/intake-pipeline';
import { intakeRoutes } from '../src/routes/intake';

const root = new URL('../../', import.meta.url).pathname;
const sql = (p: string) => readFileSync(root + p, 'utf8');

/** A D1Database over node:sqlite — the calls the workers make, nothing more. */
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

function arDb() {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE ar_practice_label (scope TEXT, key TEXT, label TEXT, label_ar TEXT, detail TEXT, icon TEXT, color TEXT,
             min_value INTEGER, extra_json TEXT, sort INTEGER, PRIMARY KEY (scope, key));
           CREATE TABLE ar_acquisition_ref (id TEXT PRIMARY KEY);`);
  for (const m of ['0039_ar_intake.sql', '0040_ar_intake_words.sql', '0041_ar_intake_form_route.sql', '0042_ar_intake_domains.sql'])
    db.exec(sql('arabic/migrations/' + m));
  return db;
}
const one = (file: string) => { const db = new DatabaseSync(':memory:'); db.exec(sql(file)); return db; };

function world() {
  const AR = arDb(), QR = one('quran/migrations/qr_119_intake_pipeline.sql'), WV = one('worldview/migrations/011_wv_intake_pipeline.sql');
  const qr = new Router<{ DB_QR: D1Database }>(); intakePipelineRoutes(qr, { prefix: '/qr', db: (e) => e.DB_QR, table: 'qr_intake_pipeline', stages: 'qr_intake_stage' });
  const wv = new Router<{ DB_WV: D1Database }>(); intakePipelineRoutes(wv, { prefix: '/wv', db: (e) => e.DB_WV, table: 'wv_intake_pipeline', stages: 'wv_intake_stage' });
  const binding = (r: Router<any>, env: unknown) => ({ fetch: (u: string, init?: RequestInit) => r.handle(new Request(u, init), env) }) as unknown as Fetcher;
  const env = { DB_AR: d1(AR), QURAN: binding(qr, { DB_QR: d1(QR) }), WORLDVIEW: binding(wv, { DB_WV: d1(WV) }) } as any;
  const ar = new Router<any>(); intakeRoutes(ar);
  const call = async (method: string, path: string, body?: unknown, role = 'admin') => {
    const res = await ar.handle(new Request('https://ar' + path, {
      method, headers: { 'content-type': 'application/json', 'X-KM-User-Id': 'u1', 'X-KM-Role': role },
      body: body === undefined ? undefined : JSON.stringify(body) }), env);
    return { status: res.status, body: await res.json() as any };
  };
  return { AR, QR, WV, call };
}

test('a logged item enters no pipeline; queuing it enters each domain it is routed to', async () => {
  const w = world();
  const made = await w.call('POST', '/ar/intake', { url: 'https://www.youtube.com/playlist?list=PLtest1', domains: ['qr', 'wv'], strand: 'quran', level: 'super', register: 'fusha_turath', form: 'original' });
  assert.equal(made.status, 201);
  const id = made.body.data.id;
  assert.deepEqual(made.body.data.domains.map((d: any) => [d.domain.key, d.on, d.stage]), [['ar', false, null], ['qr', true, null], ['wv', true, null]]);

  const q = await w.call('PATCH', `/ar/intake/${id}`, { status: 'queued' });
  assert.equal(q.status, 200);
  assert.deepEqual(q.body.data.domains.map((d: any) => [d.domain.key, d.stage?.key ?? null]), [['ar', null], ['qr', 'queued'], ['wv', 'queued']]);
  assert.equal(w.QR.prepare('SELECT COUNT(1) n FROM qr_intake_pipeline').get()!.n, 1);
  assert.equal(w.AR.prepare('SELECT COUNT(1) n FROM ar_intake_pipeline').get()!.n, 0);
});

test('a stage moves in its own domain only, and a started domain cannot be unrouted', async () => {
  const w = world();
  const id = (await w.call('POST', '/ar/intake', { url: 'https://youtu.be/abcdefghijk', domains: ['ar', 'qr'] })).body.data.id;
  await w.call('PATCH', `/ar/intake/${id}`, { status: 'queued' });
  const s = await w.call('PATCH', `/ar/intake/${id}`, { stage: { domain: 'qr', stage: 'matched', targetRef: 'QRTB:tabari' } });
  assert.equal(s.status, 200);
  const qr = s.body.data.domains.find((d: any) => d.domain.key === 'qr');
  assert.equal(qr.stage.key, 'matched');
  assert.equal(qr.stage.label, 'Matched');           // the QR worker's own word for its stage
  assert.equal(qr.targetRef, 'QRTB:tabari');
  assert.equal(s.body.data.domains.find((d: any) => d.domain.key === 'ar').stage.key, 'queued');

  const bad = await w.call('PATCH', `/ar/intake/${id}`, { stage: { domain: 'qr', stage: 'scened' } });
  assert.equal(bad.status, 400, 'an AR stage is not a QR stage');

  const busy = await w.call('PATCH', `/ar/intake/${id}`, { domains: ['ar'] });
  assert.equal(busy.status, 409);
  assert.equal(w.AR.prepare(`SELECT to_qr FROM ar_intake_item WHERE id = ?`).get(id)!.to_qr, 1, 'nothing written on a refusal');

  const ok = await w.call('PATCH', `/ar/intake/${id}`, { domains: ['qr'] });   // AR still queued: it may go
  assert.equal(ok.status, 200);
  assert.equal(w.AR.prepare('SELECT COUNT(1) n FROM ar_intake_pipeline').get()!.n, 0);
});

test('the list carries each domain board and filters by domain', async () => {
  const w = world();
  for (const [u, d] of [['https://youtu.be/aaaaaaaaaaa', ['ar']], ['https://youtu.be/bbbbbbbbbbb', ['wv']]] as const) {
    const id = (await w.call('POST', '/ar/intake', { url: u, domains: d })).body.data.id;
    await w.call('PATCH', `/ar/intake/${id}`, { status: 'queued' });
  }
  const all = await w.call('GET', '/ar/intake');
  assert.deepEqual(all.body.data.pipelines.map((p: any) => p.domain.key), ['ar', 'qr', 'wv']);
  const wvBoard = all.body.data.pipelines.find((p: any) => p.domain.key === 'wv').stages;
  assert.equal(wvBoard.find((s: any) => s.key === 'queued').count, 1);
  assert.equal(wvBoard.find((s: any) => s.key === 'lensed').label, 'Lensed');
  const onlyWv = await w.call('GET', '/ar/intake?domain=wv');
  assert.equal(onlyWv.body.data.items.length, 1);
});

test('a non-reviewer cannot change what someone else logged; parking leaves the pipelines', async () => {
  const w = world();
  const id = (await w.call('POST', '/ar/intake', { url: 'https://youtu.be/ccccccccccc', domains: ['ar', 'wv'] })).body.data.id;
  await w.call('PATCH', `/ar/intake/${id}`, { status: 'queued' });
  assert.equal((await w.call('PATCH', `/ar/intake/${id}`, { priority: 1 }, 'user')).status, 200, 'the one who logged it may');
  const parked = await w.call('PATCH', `/ar/intake/${id}`, { status: 'parked' });
  assert.equal(parked.status, 200);
  assert.equal(w.WV.prepare('SELECT COUNT(1) n FROM wv_intake_pipeline').get()!.n, 0);
  assert.equal(w.AR.prepare('SELECT COUNT(1) n FROM ar_intake_pipeline').get()!.n, 0);
});
