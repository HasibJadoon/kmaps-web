// A scene's words carry how hard each lemma is in the Qurʾān: the AR route asks the QR worker's
// /qr/internal/rows for qr_vocab_grade by AL lemma (qr_120/121), labelled from ar_practice_label (0049).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { Router } from '../../shared/src/router';
import { ok } from '../../shared/src/response';
import { readRows, type RowsRequest } from '../../shared/src/sense';
import { sceneWordRoutes } from '../src/routes/scene-words';

const root = new URL('../../', import.meta.url).pathname;
const sql = (p: string) => readFileSync(root + p, 'utf8');

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

test('scene words carry their Qurʾān grade and count; unlinked words and a missing QR leave it out', async () => {
  const AR = new DatabaseSync(':memory:');
  AR.exec(`CREATE TABLE ar_practice_label (scope TEXT, key TEXT, label TEXT, label_ar TEXT, detail TEXT, icon TEXT, color TEXT,
             min_value INTEGER, extra_json TEXT, sort INTEGER, PRIMARY KEY (scope, key));`);
  AR.exec(sql('arabic/migrations/0045_ar_scene_word.sql'));
  AR.exec(sql('arabic/migrations/0049_ar_quran_grade.sql'));
  const w = AR.prepare(`INSERT INTO ar_scene_word (unit_id, scene_no, line, word_index, surface, lemma_ar, root, word_class, link_kind, al_lemma_ref, sarf_json, source)
                        VALUES ('U1', 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'camel')`);
  w.run(1, 0, 'أَبْلَسَ', 'أَبْلَسَ', 'بلس', 'verb', 'lemma', 'AL:LEMMA:aaa', '{"madi":"أَبْلَسَ","mudari":"يُبْلِسُ"}');
  w.run(1, 1, 'الكِتَابُ', 'كِتَاب', 'كتب', 'noun', 'lemma', 'AL:LEMMA:bbb', null);
  w.run(2, 0, 'هَاتِف', 'هَاتِف', 'هتف', 'noun', 'none', null, null);

  const QR = new DatabaseSync(':memory:');
  QR.exec(`CREATE TABLE qr_study_label (scope TEXT NOT NULL, key TEXT NOT NULL, label TEXT NOT NULL, label_ar TEXT, detail TEXT, icon TEXT, color TEXT,
             min_value INTEGER, extra_json TEXT, sort INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (scope, key));`);
  QR.exec(sql('quran/migrations/qr_120_vocab_grade.sql'));
  QR.exec(sql('quran/migrations/qr_121_vocab_grade_al.sql'));
  QR.exec(`INSERT INTO qr_vocab_grade (root, lemma, al_lemma_ref, grade, quran_n) VALUES ('بلس', 'أَبْلَسَ', 'AL:LEMMA:aaa', 'hard', 5),
                                                                                        ('كتب', 'كِتَٰب', 'AL:LEMMA:bbb', 'common', 260)`);
  const qr = new Router<{ DB_QR: D1Database }>();
  qr.post('/qr/internal/rows', async (req, env) => ok(await readRows(env.DB_QR, await req.json<RowsRequest>())));
  const QURAN = { fetch: (u: string, init?: RequestInit) => qr.handle(new Request(u, init), { DB_QR: d1(QR) }) } as unknown as Fetcher;

  const ar = new Router<any>(); sceneWordRoutes(ar);
  const get = async (env: unknown) => (await (await ar.handle(new Request('https://ar/ar/scenes/U1/1/words'), env)).json() as any).data;

  const data = await get({ DB_AR: d1(AR), QURAN });
  const words = data.lines.flatMap((l: any) => l.words);
  assert.deepEqual(words.map((x: any) => x.quran?.grade.key ?? null), ['hard', 'common', null]);
  assert.equal(words[0].quran.countLine, '5× in the Qurʾān');
  assert.equal(words[0].quran.grade.label, 'Hard');
  assert.deepEqual(words[0].sarf.map((s: any) => [s.key, s.form]), [['madi', 'أَبْلَسَ'], ['mudari', 'يُبْلِسُ']]);
  assert.deepEqual(data.legend.quranGrade.map((g: any) => g.key), ['common', 'medium', 'hard', 'super']);

  const without = await get({ DB_AR: d1(AR) });
  assert.ok(without.lines.flatMap((l: any) => l.words).every((x: any) => x.quran === null));
});
