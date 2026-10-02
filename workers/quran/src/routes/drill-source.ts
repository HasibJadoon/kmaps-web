import type { Router } from '../../../shared/src/router';
import { ok, badRequest, notFound, forbidden } from '../../../shared/src/response';
import { forwardedReviewer } from '../../../shared/src/auth';
import { query, queryOne } from '../../../shared/src/db';
import { readJsonObject } from '../../../shared/src/validate';
import { readSource, writeSource, SourceError, after, filedCopy, type Located, type SourceEdit } from '../../../shared/src/drill-source';
import type { QuranEnv } from '../env';
import { questionDrills, tafsirDrillsQ, lineDrills, parseLineRef } from './practice-tafsirq';
import type { Drill } from './practice-kit';

// ── A Qurʾān drill's source, for a reviewer to find and correct ──────────────────────────────────
//
//   GET   /qr/drill/source?id=<drill id>   the rows the drill is built from, their editable columns
//                                          as they are, and the drill rebuilt from them (where one
//                                          drill can be rebuilt by its id)
//   PATCH /qr/drill/source                 { id, edits: [{ table, key, col, value }] } — then rebuilt
//   GET   /qr/drill/search?q=              drills by id, or by the words of their stored text
//
// Reviewers only (the gateway's X-KM-Role). What each kind is built from is said here once.

const SEARCH_LIMIT = 12;

/** The rows a drill id is built from, or the tables it is drawn from when it has none. */
export async function locate(env: QuranEnv, id: string): Promise<Located | null> {
  let k: string | null;
  if ((k = after(id, 'questions:')))
    return { kind: 'questions', rows: [{ table: 'qr_study_question', keyCol: 'id', key: k,
             cols: [{ col: 'options_json', json: true }, { col: 'status' }] }] };
  if ((k = after(id, 'tafsirq:')))
    return { kind: 'tafsir_meaning', rows: [{ table: 'qr_tafsir_question', keyCol: 'id', key: k,
             cols: [{ col: 'question_en' }, { col: 'options_json', json: true }, { col: 'correct_json', json: true },
                    { col: 'explain_en' }, { col: 'status' }] }] };
  if ((k = after(id, 'tafsir:')))
    return { kind: 'tafsir', rows: [{ table: 'qr_tafsir_drill_item', keyCol: 'id', key: k,
             cols: [{ col: 'text' }, { col: 'answer' }, { col: 'context' }, { col: 'others_json', json: true }] }] };
  const line = parseLineRef(id);
  if (line) {
    if (line.to - line.from >= 12) return null;
    const segs = await query<{ id: string }>(env.DB_QR,
      `SELECT id FROM qr_tafsir_audio_segment WHERE audio_id = ? AND seq BETWEEN ? AND ? ORDER BY seq`, [line.audio, line.from, line.to]);
    return { kind: 'tafsir_listen', rows: segs.flatMap((s) => [
      { table: 'qr_tafsir_audio_segment', keyCol: 'id', key: s.id, cols: [{ col: 'text_ar' }] },
      { table: 'qr_tafsir_segment_en', keyCol: 'segment_id', key: s.id, cols: [{ col: 'text_en' }, { col: 'terms_json', json: true }] },
    ]) };
  }
  if ((k = after(id, 'irab:'))) {
    const [s, a, w] = k.split(':').map(Number);
    const rows = await query<{ id: string }>(env.DB_QR,
      `SELECT id FROM qr_irab_drill_item WHERE surah = ? AND ayah = ? AND word_index = ?`, [s, a, w]);
    return { kind: 'irab', rows: rows.map((r) => ({ table: 'qr_irab_drill_item', keyCol: 'id', key: r.id,
             cols: [{ col: 'role_gt' }, { col: 'irab_ar' }] })), derived: ['ar_ling_gram_term'] };
  }
  if ((k = after(id, 'irabbooks:'))) {
    // <ask>:<s>:<a>:<w or w-wto>[:<source_slug>]
    const [, s, a, wk, slug] = k.split(':');
    const rows = await query<{ id: string }>(env.DB_QR,
      `SELECT id FROM qr_irab_book_word WHERE surah = ? AND ayah = ? AND word_index = ? AND (? IS NULL OR source_slug = ?)`,
      [Number(s), Number(a), Number(String(wk).split('-')[0]), slug ?? null, slug ?? null]);
    return { kind: 'irabbooks', rows: rows.map((r) => ({ table: 'qr_irab_book_word', keyCol: 'id', key: r.id,
             cols: [{ col: 'parse_ar' }, { col: 'alt_ar' }, { col: 'role_gt' }] })) };
  }
  // built when dealt from wider data: fixed in the tables they are drawn from
  const kind = id.split(':')[0];
  const derived: Record<string, string[]> = {
    fill: ['qr_word_occurrence', 'qr_translation'], hear: ['qr_word_occurrence', 'qr_recitation_ayah'],
    order: ['qr_word_occurrence', 'qr_translation'], shadow: ['qr_word_occurrence', 'qr_recitation_ayah'],
    mark: ['qr_word_occurrence', 'qr_recitation_ayah'],
    vocab: ['qr_vocab_item', 'qr_vocab_gloss', 'qr_vocab_sense'], pairs: ['qr_vocab_item'],
    translation: ['qr_translation_choice', 'qr_translation', 'qr_translation_feature'],
    lexicon: ['ar_ling_lexicon_fact', 'qr_word_occurrence'],
    nearsyn: ['qr_drill_anchor', 'ar_ling_root_lemma_furuq_set'], keyterm: ['qr_drill_anchor'], expression: ['qr_drill_anchor'],
    groups: ['qr_nazm_group', 'qr_nazm_group_member', 'qr_surah_layer'], structure: ['qr_passage_section'],
    ss: ['qr_ss_clause_reading', 'qr_ss_ellipsis_event', 'qr_ss_scope_nuance', 'qr_ss_translation_decision'],
    idiom: ['ar_ling_root_lemma_tabir'], arc: ['ar_ling_sense_arc'], arc2: ['ar_ling_arc'],
    gt: ['ar_ling_gram_term', 'ar_ling_gram_term_example'], adima: ['ar_ling_adima_note'],
    grammar: ['ar_ling_gram_term_example'], balagha: ['ar_ling_gram_term_example'],
  };
  return derived[kind] ? { kind, rows: [], derived: derived[kind] } : null;
}

/** The one drill an id names, rebuilt from its rows now — for the kinds that can be drawn by id. */
export async function rebuild(env: QuranEnv, id: string): Promise<Drill | null> {
  let k: string | null;
  if ((k = after(id, 'questions:')) || (k = after(id, 'tafsirq:'))) {
    const table = id.startsWith('questions:') ? 'qr_study_question' : 'qr_tafsir_question';
    const q = await queryOne<{ surah: number; ayah_from: number; ayah_to: number }>(env.DB_QR,
      `SELECT surah, ayah_from, ayah_to FROM ${table} WHERE id = ?`, [k]);
    if (!q) return null;
    const scope = { surah: q.surah, from: q.ayah_from, to: q.ayah_to };
    const drills = table === 'qr_study_question' ? await questionDrills(env, 500, scope) : await tafsirDrillsQ(env, 'meaning', 500, scope);
    return drills.find((d) => d.id === id) ?? null;
  }
  if (parseLineRef(id)) {
    const [d] = await lineDrills(env, [id], { surah: null, from: null, to: null });
    if (!d) return null;
    // drawn without its passage: the copy keeps the passage it was filed under
    const { source: _source, ...rest } = d;
    return rest;
  }
  return null;
}

async function sourceOf(env: QuranEnv, id: string) {
  const loc = await locate(env, id);
  if (!loc) return null;
  const fields = await readSource(env.DB_QR, loc);
  if (loc.rows.length && !fields.length) return null;
  const drill = fields.length ? filedCopy(await rebuild(env, id)) : null;
  return { loc, body: { id, ref: `QR:${id}`, module: 'QR', kind: loc.kind, editable: fields.length > 0, fields,
                        derived: loc.derived ?? [], drill, rebuilt: !!drill } };
}

export function drillSourceRoutes(router: Router<QuranEnv>) {
  router.get('/qr/drill/source', async (req, env) => {
    if (!forwardedReviewer(req)) return forbidden('Reviewers only');
    const id = new URL(req.url).searchParams.get('id')?.trim();
    if (!id) return badRequest('id is required');
    const s = await sourceOf(env, id);
    return s ? ok(s.body) : notFound(`drill ${id}`);
  });

  router.patch('/qr/drill/source', async (req, env) => {
    if (!forwardedReviewer(req)) return forbidden('Reviewers only');
    const b = await readJsonObject(req);
    const id = typeof b?.['id'] === 'string' ? b['id'].trim() : '';
    const edits = Array.isArray(b?.['edits']) ? (b['edits'] as SourceEdit[]) : [];
    if (!id || !edits.length) return badRequest('id and edits are required');
    const loc = await locate(env, id);
    if (!loc || !loc.rows.length) return notFound(`drill ${id} has no rows of its own`);
    let changed = 0;
    try { changed = await writeSource(env.DB_QR, loc, edits); }
    catch (e) { if (e instanceof SourceError) return badRequest(e.message); throw e; }
    const s = await sourceOf(env, id);
    return ok({ ...(s?.body ?? { id }), changed });
  });

  router.get('/qr/drill/search', async (req, env) => {
    if (!forwardedReviewer(req)) return forbidden('Reviewers only');
    const raw = (new URL(req.url).searchParams.get('q') ?? '').trim();
    const q = raw.replace(/^QR:(?=[a-z_]+:)/, '');
    if (q.length < 2) return badRequest('q must be two letters or more');
    // an id: that drill, when it is one
    if (/^[a-z_0-9]+:/.test(q)) {
      const s = await sourceOf(env, q);
      if (s) return ok({ results: [{ id: q, ref: `QR:${q}`, module: 'QR', kind: s.loc.kind, text: q, where: null }] });
    }
    const like = `%${q}%`;
    const [qs, tq, ti, lines] = await Promise.all([
      query<{ id: string; text: string; surah: number; ayah_from: number }>(env.DB_QR,
        `SELECT id, json_extract(options_json, '$.ask_en') AS text, surah, ayah_from FROM qr_study_question
          WHERE options_json LIKE ? OR id LIKE ? ORDER BY surah, ayah_from LIMIT ?`, [like, like, SEARCH_LIMIT]),
      query<{ id: string; text: string; surah: number; ayah_from: number }>(env.DB_QR,
        `SELECT id, question_en AS text, surah, ayah_from FROM qr_tafsir_question
          WHERE question_en LIKE ? OR options_json LIKE ? OR explain_en LIKE ? OR id LIKE ? ORDER BY surah, ayah_from LIMIT ?`,
        [like, like, like, like, SEARCH_LIMIT]),
      query<{ id: string; text: string; surah: number; ayah_from: number }>(env.DB_QR,
        `SELECT id, text, surah, ayah_from FROM qr_tafsir_drill_item WHERE text LIKE ? OR answer LIKE ? OR id LIKE ? LIMIT ?`,
        [like, like, like, SEARCH_LIMIT]),
      query<{ audio_id: string; seq: number; text: string }>(env.DB_QR,
        `SELECT s.audio_id, s.seq, COALESCE(e.text_en, s.text_ar) AS text
           FROM qr_tafsir_segment_en e JOIN qr_tafsir_audio_segment s ON s.id = e.segment_id
          WHERE e.text_en LIKE ? OR s.text_ar LIKE ? LIMIT ?`, [like, like, SEARCH_LIMIT]),
    ]);
    const row = (id: string, kind: string, text: string | null, where: string | null) =>
      ({ id, ref: `QR:${id}`, module: 'QR', kind, text: text ?? id, where });
    return ok({ results: [
      ...qs.map((r) => row(`questions:${r.id}`, 'questions', r.text, `${r.surah}:${r.ayah_from}`)),
      ...tq.map((r) => row(`tafsirq:${r.id}`, 'tafsir_meaning', r.text, `${r.surah}:${r.ayah_from}`)),
      ...ti.map((r) => row(`tafsir:${r.id}`, 'tafsir', r.text, r.surah ? `${r.surah}:${r.ayah_from}` : null)),
      ...lines.map((r) => row(`tafsir_line:${r.audio_id}:${r.seq}`, 'tafsir_listen', r.text, null)),
    ] });
  });
}
