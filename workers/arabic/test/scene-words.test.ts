// A scene's words screen shows the high end only — verb + preposition and idioms, expert grammar and balāgha, Qurʾān
// key terms, and words hard in the Qurʾān — never every verb and noun.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { Router } from '../../shared/src/router';
import { ok } from '../../shared/src/response';
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

test('the words screen gives four high-end sections and leaves everyday words out', async () => {
  const AR = new DatabaseSync(':memory:');
  AR.exec(`CREATE TABLE ar_practice_label (scope TEXT, key TEXT, label TEXT, label_ar TEXT, detail TEXT, icon TEXT, color TEXT,
             min_value INTEGER, extra_json TEXT, sort INTEGER, PRIMARY KEY (scope, key));
           CREATE TABLE ar_text_unit (id TEXT PRIMARY KEY, script_json TEXT);
           CREATE TABLE ar_scene_lexeme (unit_id TEXT, scene_no INT, line INT, span_from INT, span_to INT, ref TEXT, kind TEXT);
           CREATE TABLE ar_scene_vocab (unit_id TEXT, scene_no INT, features_json TEXT);
           CREATE TABLE ar_scene_feature_term (unit_id TEXT, scene_no INT, feature_idx INT, term_ar TEXT, term_id TEXT, match_kind TEXT);
           CREATE TABLE ar_ling_gram_term (id TEXT PRIMARY KEY, name_ar TEXT, name_en TEXT, badge_color TEXT, tier TEXT);`);
  for (const m of ['0045_ar_scene_word.sql', '0049_ar_quran_grade.sql', '0050_ar_scene_word_words.sql', '0051_ar_scene_word_highend.sql'])
    AR.exec(sql('arabic/migrations/' + m));
  AR.prepare('INSERT INTO ar_text_unit VALUES (?, ?)').run('U1', JSON.stringify({ scenes: [{ scene_no: 1, lines: [
    { ar: 'رَغِبَ عَنْ الدُّنْيا فَأَبْلَسَ' }, { ar: 'ذَهَبَ الرَّجُلُ إلى السُّوقِ' }] }] }));
  AR.exec(`INSERT INTO ar_scene_lexeme VALUES ('U1', 1, 0, 0, 1, 'AL:VI:رغب|عن', 'verbal_idiom'), ('U1', 1, 0, 2, 2, 'AL:SK:x', 'keyterm');
           INSERT INTO ar_scene_vocab VALUES ('U1', 1, '[{"line":0,"span":[0,3],"feature":"tadmin","text":"رغب عن الدنيا","explanation":"the verb takes عن: turning away"},{"line":1,"span":[0,1],"feature":"plain verb"}]');
           INSERT INTO ar_ling_gram_term VALUES ('GT:balagha:tadmin', 'تَضْمِين', 'implied meaning', '#B388EB', 'expert'), ('GT:nahw:fil', 'فِعْل', 'verb', null, 'basic');
           INSERT INTO ar_scene_feature_term VALUES ('U1', 1, 0, 'تضمين', 'GT:balagha:tadmin', 'exact'), ('U1', 1, 1, 'فعل', 'GT:nahw:fil', 'exact');`);
  const w = AR.prepare(`INSERT INTO ar_scene_word (unit_id, scene_no, line, word_index, surface, lemma_ar, root, word_class, link_kind, al_lemma_ref, sarf_json, source, qr_grade)
                        VALUES ('U1', 1, ?, ?, ?, ?, ?, ?, 'lemma', ?, ?, 'camel', ?)`);
  w.run(1, 3, 'فَأَبْلَسَ', 'أَبْلَسَ', 'بلس', 'verb', 'AL:LEMMA:aaa', '{"madi":"أَبْلَسَ","mudari":"يُبْلِسُ"}', 'hard');
  w.run(2, 0, 'ذَهَبَ', 'ذَهَبَ', 'ذهب', 'verb', 'AL:LEMMA:bbb', null, 'common');
  w.run(2, 1, 'الرَّجُلُ', 'رَجُل', 'رجل', 'noun', 'AL:LEMMA:ccc', null, 'medium');

  const al = new Router<any>();
  al.get('/al/lex/v2/lexemes', async () => ok({ lexemes: { 'VI:رغب|عن': { meanings: [{ en: 'to turn away from' }] }, 'SK:x': { terms: [{ term: 'dunyā', ar: 'الدنيا', gloss: 'the near life' }] } } }));
  const qr = new Router<any>();
  qr.post('/qr/internal/rows', async () => ok({ ok: true, rows: [{ al_lemma_ref: 'AL:LEMMA:aaa', quran_n: 5 }] }));
  const bind = (r: Router<any>) => ({ fetch: (u: string, init?: RequestInit) => r.handle(new Request(u, init), {}) }) as unknown as Fetcher;
  const ar = new Router<any>(); sceneWordRoutes(ar);
  const res = await ar.handle(new Request('https://ar/ar/scenes/U1/1/words'), { DB_AR: d1(AR), AR_LINGUISTICS: bind(al), QURAN: bind(qr) });
  const data = (await res.json() as any).data;

  assert.deepEqual(data.sections.map((s: any) => s.key), ['sec_idiom', 'sec_feature', 'sec_keyterm', 'sec_hard']);
  const [idiom, feature, keyterm, hard] = data.sections.map((s: any) => s.items);
  assert.deepEqual([idiom[0].phrase, idiom[0].meaning, idiom[0].line], ['رَغِبَ عَنْ', 'to turn away from', 1]);
  assert.equal(feature.length, 1, 'only the expert-tier feature');
  assert.equal(feature[0].term.nameAr, 'تَضْمِين');
  assert.equal(keyterm[0].meaning, 'the near life');
  assert.deepEqual(hard.map((x: any) => x.surface), ['فَأَبْلَسَ'], 'common and medium words are left out');
  assert.equal(hard[0].quran.countLine, '5× in the Qurʾān');
  assert.deepEqual(hard[0].sarf.map((s: any) => s.form), ['أَبْلَسَ', 'يُبْلِسُ']);
});
