// A drill's source over a real SQLite: a drill id located to its rows, those rows read, a write held
// to them, and the corrected drill rebuilt; the routes answer only a reviewer.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { locate, rebuild, drillSourceRoutes } from '../src/routes/drill-source';
import { readSource, writeSource, SourceError } from '../../shared/src/drill-source';

function d1(db: DatabaseSync) {
  const bound = (sql: string, params: unknown[]) => {
    const stmt = db.prepare(sql);
    return {
      async all<T>() { return { results: stmt.all(...(params as never[])) as T[] }; },
      async first<T>() { return (stmt.get(...(params as never[])) as T) ?? null; },
      async run() { const r = stmt.run(...(params as never[])); return { success: true, meta: { changes: r.changes } }; },
    };
  };
  return {
    prepare: (sql: string) => ({ bind: (...p: unknown[]) => bound(sql, p), ...bound(sql, []) }),
    async batch(stmts: Array<{ run(): Promise<unknown> }>) { const out = []; for (const s of stmts) out.push(await s.run()); return out; },
  };
}

function setup() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE qr_study_question (id TEXT PRIMARY KEY, surah INT, ayah_from INT, ayah_to INT, options_json TEXT, sort_order INT, status TEXT);
    CREATE TABLE qr_tafsir_question (id TEXT PRIMARY KEY, surah INT, ayah_from INT, ayah_to INT, question_en TEXT, interaction TEXT, options_json TEXT,
                                     correct_json TEXT, explain_en TEXT, support_json TEXT, sort_order INT, status TEXT);
    CREATE TABLE qr_tafsir_audio (id TEXT, source_slug TEXT, seq INT, object_key TEXT, status TEXT);
    CREATE TABLE qr_tafsir_audio_segment (id TEXT PRIMARY KEY, audio_id TEXT, page_id TEXT, seq INT, start_sec REAL, end_sec REAL, text_ar TEXT, meta_json TEXT);
    CREATE TABLE qr_tafsir_segment_en (segment_id TEXT PRIMARY KEY, audio_id TEXT, seq INT, text_en TEXT, terms_json TEXT, status TEXT);
    CREATE TABLE qr_tafsir_book_display_source (source_slug TEXT, book_title_en TEXT, book_title_ar TEXT, author_name_ar TEXT);
    CREATE TABLE qr_tafsir_drill_item (id TEXT PRIMARY KEY, surah INT, ayah_from INT, text TEXT, answer TEXT, context TEXT, others_json TEXT);
    CREATE TABLE qr_irab_drill_item (id TEXT PRIMARY KEY, surah INT, ayah INT, word_index INT, role_gt TEXT, irab_ar TEXT);
    CREATE TABLE ar_ling_gram_term (id TEXT, name_ar TEXT, badge_color TEXT);`);
  db.prepare(`INSERT INTO qr_study_question VALUES (?, 40, 2, 2, ?, 1, 'live')`)
    .run('QR:Q:40:1:03', JSON.stringify({ ask_en: 'Why تنزيل?', interaction: 'choose', options: ['In stages', 'At once'], correct: [0] }));
  db.exec(`INSERT INTO qr_tafsir_audio VALUES ('AUD:razi:1', 'razi', 1, 'tafsir/razi/1.mp3', 'live');
           INSERT INTO qr_tafsir_audio_segment VALUES ('SEG:AUD:razi:1:4', 'AUD:razi:1', 'P1', 4, 10, 14, 'قوله تنزيل الكتاب', NULL);
           INSERT INTO qr_tafsir_segment_en VALUES ('SEG:AUD:razi:1:4', 'AUD:razi:1', 4, 'His words: the sending down', '[]', 'live');
           INSERT INTO qr_irab_drill_item VALUES ('muyassar:40:2:1', 40, 2, 1, 'GT:irab:khabar', 'خبر مرفوع'),
                                                 ('darwish:40:2:1', 40, 2, 1, 'GT:irab:khabar', 'خبر');`);
  return { db, env: { DB_QR: d1(db) } as never };
}

test('a drill id is located to the rows it is built from, read, corrected and rebuilt', async () => {
  const { env } = setup();
  const id = 'questions:QR:Q:40:1:03';
  const loc = (await locate(env, id))!;
  assert.equal(loc.kind, 'questions');
  const fields = await readSource((env as { DB_QR: D1Database }).DB_QR, loc);
  assert.deepEqual(fields.map((f) => f.col), ['options_json', 'status']);
  assert.equal((fields[0].value as { ask_en: string }).ask_en, 'Why تنزيل?');   // JSON read as JSON

  // a write is held to this drill's rows and columns
  const db = (env as { DB_QR: D1Database }).DB_QR;
  await assert.rejects(writeSource(db, loc, [{ table: 'qr_study_question', key: 'QR:Q:40:1:03', col: 'surah', value: 2 }]), SourceError);
  await assert.rejects(writeSource(db, loc, [{ table: 'qr_study_question', key: 'QR:Q:1:1:01', col: 'status', value: 'draft' }]), SourceError);
  await assert.rejects(writeSource(db, loc, [{ table: 'qr_study_question', key: 'QR:Q:40:1:03', col: 'options_json', value: '{nope' }]), SourceError);
  const fixed = { ask_en: 'Why تنزيل and not إنزال?', interaction: 'choose', options: ['In stages', 'At once', 'By night'], correct: [0] };
  assert.equal(await writeSource(db, loc, [{ table: 'qr_study_question', key: 'QR:Q:40:1:03', col: 'options_json', value: fixed }]), 1);

  // rebuilt as it will be dealt
  const d = (await rebuild(env, id))!;
  assert.equal(d.promptEn, 'Why تنزيل and not إنزال?');
  assert.equal((d.options as string[]).length, 3);
  assert.equal(d.answer, 'In stages');
  // drafted, it is no longer dealt
  await writeSource(db, loc, [{ table: 'qr_study_question', key: 'QR:Q:40:1:03', col: 'status', value: 'draft' }]);
  assert.equal(await rebuild(env, id), null);
});

test('a tafsīr line is its segments; iʿrāb is every book row of the word; a dealt-fresh kind names its tables', async () => {
  const { env } = setup();
  const line = (await locate(env, 'tafsir_line:AUD:razi:1:4'))!;
  assert.deepEqual(line.rows.map((r) => `${r.table}:${r.key}`),
    ['qr_tafsir_audio_segment:SEG:AUD:razi:1:4', 'qr_tafsir_segment_en:SEG:AUD:razi:1:4']);
  const rebuilt = (await rebuild(env, 'tafsir_line:AUD:razi:1:4'))!;
  assert.equal(rebuilt.en, 'His words: the sending down');
  assert.equal(rebuilt.source, undefined);              // the filed copy keeps its passage

  const irab = (await locate(env, 'irab:40:2:1'))!;
  assert.equal(irab.rows.length, 2);
  const fill = (await locate(env, 'fill:40:2'))!;
  assert.deepEqual(fill.rows, []);
  assert.ok(fill.derived!.includes('qr_word_occurrence'));
  assert.equal(await locate(env, 'nothing:1'), null);
});

test('the source routes answer a reviewer only', async () => {
  const { env } = setup();
  const routes = new Map<string, (req: Request, env: unknown) => Promise<Response>>();
  drillSourceRoutes({ get: (p: string, h: never) => routes.set(`GET ${p}`, h), patch: (p: string, h: never) => routes.set(`PATCH ${p}`, h) } as never);
  const call = (m: string, path: string, role: string | null, body?: unknown) => {
    const [p] = path.split('?');
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (role) { headers['X-KM-User-Id'] = 'CORE:U1'; headers['X-KM-Role'] = role; }
    return routes.get(`${m} ${p}`)!(new Request(`http://x${path}`, { method: m, headers, body: body ? JSON.stringify(body) : undefined }), env);
  };
  assert.equal((await call('GET', '/qr/drill/source?id=questions:QR:Q:40:1:03', 'member')).status, 403);
  assert.equal((await call('GET', '/qr/drill/source?id=questions:QR:Q:40:1:03', null)).status, 403);
  const got = await (await call('GET', '/qr/drill/source?id=questions:QR:Q:40:1:03', 'admin')).json() as { data: Record<string, any> };
  assert.equal(got.data.ref, 'QR:questions:QR:Q:40:1:03');
  assert.equal(got.data.rebuilt, true);
  assert.equal(got.data.drill.srs, undefined);
  const patched = await (await call('PATCH', '/qr/drill/source', 'admin', { id: 'tafsir_line:AUD:razi:1:4',
    edits: [{ table: 'qr_tafsir_segment_en', key: 'SEG:AUD:razi:1:4', col: 'text_en', value: 'His saying: the sending down of the Book' }] })).json() as { data: Record<string, any> };
  assert.equal(patched.data.changed, 1);
  assert.equal(patched.data.drill.en, 'His saying: the sending down of the Book');
  const found = await (await call('GET', '/qr/drill/search?q=' + encodeURIComponent('تنزيل'), 'admin')).json() as { data: { results: { id: string }[] } };
  assert.ok(found.data.results.some((r) => r.id === 'questions:QR:Q:40:1:03'));
  assert.ok(found.data.results.some((r) => r.id === 'tafsir_line:AUD:razi:1:4'));
  const byRef = await (await call('GET', '/qr/drill/search?q=QR:questions:QR:Q:40:1:03', 'admin')).json() as { data: { results: { id: string }[] } };
  assert.deepEqual(byRef.data.results.map((r) => r.id), ['questions:QR:Q:40:1:03']);
});
