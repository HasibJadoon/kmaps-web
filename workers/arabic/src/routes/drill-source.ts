import type { Router } from '../../../shared/src/router';
import { ok, badRequest, notFound, forbidden } from '../../../shared/src/response';
import { forwardedReviewer } from '../../../shared/src/auth';
import { query, queryOne } from '../../../shared/src/db';
import { readJsonObject } from '../../../shared/src/validate';
import { readSource, writeSource, SourceError, after, type Located, type SourceEdit } from '../../../shared/src/drill-source';
import type { ArabicEnv } from '../env';

// ── An Arabic drill's source, for a reviewer to find and correct ─────────────────────────────────
//
//   GET   /ar/drill/source?id=<drill id>   the rows the drill is built from and their editable columns
//   PATCH /ar/drill/source                 { id, edits: [{ table, key, col, value }] }
//   GET   /ar/drill/search?q=              drills by id, or by the words of their stored text
//
// Reviewers only (the gateway's X-KM-Role). An Arabic drill is dealt fresh from its rows, so a fix
// reaches every drill dealt after it; copies already filed to review keep what they were.

const SEARCH_LIMIT = 12;
const LINE_SKILLS = ['fill', 'hear', 'order', 'shadow', 'dictation'];

const poolRow = (id: string): Located['rows'][number] => (id.startsWith('rp:')
  ? { table: 'ar_read_pool', keyCol: 'id', key: id.slice(3), cols: [{ col: 'text_ar' }, { col: 'blanks_json', json: true }] }
  : { table: 'ar_practice_pool', keyCol: 'id', key: id,
      cols: [{ col: 'text_ar' }, { col: 'text_en' }, { col: 'gloss_json', json: true }, { col: 'blanks_json', json: true }] });

/** The rows a drill id is built from, or the tables it is drawn from when it has none. */
export async function locate(env: ArabicEnv, id: string): Promise<Located | null> {
  let k: string | null;
  // a scene's drills (<skill>:ARTX:<unit>:<scene>:…) are built from its script and vocabulary
  if (/^[a-z]+:ARTX:/.test(id)) return { kind: id.split(':')[0], rows: [], derived: ['ar_scene_vocab', 'ar_text_unit'] };
  if ((k = after(id, 'grammar:')))
    return { kind: 'grammar', rows: [{ table: 'ar_exercises', keyCol: 'id', key: k,
             cols: [{ col: 'prompt_ar' }, { col: 'prompt_en' }, { col: 'options_json', json: true },
                    { col: 'answer_json', json: true }, { col: 'explanation_md' }] }] };
  if ((k = after(id, 'gs:')))
    return { kind: 'feature', rows: [{ table: 'ar_grammar_sentence', keyCol: 'id', key: k.slice(k.indexOf(':') + 1),
             cols: [{ col: 'text_ar' }, { col: 'term_id' }] }], derived: ['ar_ling_gram_term'] };
  if ((k = after(id, 'read:'))) return { kind: 'read', rows: [poolRow(`rp:${k}`)] };
  if ((k = after(id, 'vocab:'))) return { kind: 'vocab', rows: [poolRow(k.replace(/:\d+$/, ''))] };
  const skill = id.split(':')[0];
  if (LINE_SKILLS.includes(skill)) return { kind: skill, rows: [poolRow(id.slice(skill.length + 1))] };
  if ((k = after(id, 'plural:')))
    return { kind: 'plural', rows: [{ table: 'ar_daily_word', keyCol: 'id', key: k,
             cols: [{ col: 'singular_ar' }, { col: 'plural_ar' }, { col: 'gloss_en' }, { col: 'plural_kind' }] }] };
  if ((k = after(id, 'meaning:')) || (k = after(id, 'mine:'))) {
    const daily = await queryOne<{ id: string }>(env.DB_AR, `SELECT id FROM ar_daily_word WHERE id = ?`, [k]);
    return { kind: skill, rows: [daily
      ? { table: 'ar_daily_word', keyCol: 'id', key: k, cols: [{ col: 'singular_ar' }, { col: 'plural_ar' }, { col: 'gloss_en' }] }
      : { table: 'ar_acq_item', keyCol: 'id', key: k, cols: [{ col: 'text_ar' }, { col: 'vocalised_ar' }, { col: 'gloss_en' }] }] };
  }
  // built when dealt from wider data: fixed in the tables they are drawn from
  const derived: Record<string, string[]> = {
    pairs: ['ar_daily_word', 'ar_acq_item'], gp: ['ar_ling_gram_term_example'], gt: ['ar_ling_gram_term_example'],
  };
  return derived[skill] ? { kind: skill, rows: [], derived: derived[skill] } : null;
}

async function sourceOf(env: ArabicEnv, id: string) {
  const loc = await locate(env, id);
  if (!loc) return null;
  const fields = await readSource(env.DB_AR, loc);
  if (loc.rows.length && !fields.length) return null;
  return { loc, body: { id, ref: `AR:${id}`, module: 'AR', kind: loc.kind, editable: fields.length > 0, fields,
                        derived: loc.derived ?? [], drill: null, rebuilt: false } };
}

export function drillSourceRoutes(router: Router<ArabicEnv>) {
  router.get('/ar/drill/source', async (req, env) => {
    if (!forwardedReviewer(req)) return forbidden('Reviewers only');
    const id = new URL(req.url).searchParams.get('id')?.trim();
    if (!id) return badRequest('id is required');
    const s = await sourceOf(env, id);
    return s ? ok(s.body) : notFound(`drill ${id}`);
  });

  router.patch('/ar/drill/source', async (req, env) => {
    if (!forwardedReviewer(req)) return forbidden('Reviewers only');
    const b = await readJsonObject(req);
    const id = typeof b?.['id'] === 'string' ? b['id'].trim() : '';
    const edits = Array.isArray(b?.['edits']) ? (b['edits'] as SourceEdit[]) : [];
    if (!id || !edits.length) return badRequest('id and edits are required');
    const loc = await locate(env, id);
    if (!loc || !loc.rows.length) return notFound(`drill ${id} has no rows of its own`);
    let changed = 0;
    try { changed = await writeSource(env.DB_AR, loc, edits); }
    catch (e) { if (e instanceof SourceError) return badRequest(e.message); throw e; }
    const s = await sourceOf(env, id);
    return ok({ ...(s?.body ?? { id }), changed });
  });

  router.get('/ar/drill/search', async (req, env) => {
    if (!forwardedReviewer(req)) return forbidden('Reviewers only');
    const raw = (new URL(req.url).searchParams.get('q') ?? '').trim();
    const q = raw.replace(/^AR:(?=[a-z_]+:)/, '');
    if (q.length < 2) return badRequest('q must be two letters or more');
    if (/^[a-z_]+:/.test(q)) {
      const s = await sourceOf(env, q);
      if (s) return ok({ results: [{ id: q, ref: `AR:${q}`, module: 'AR', kind: s.loc.kind, text: q, where: null }] });
    }
    const like = `%${q}%`;
    const [ex, pool, read, daily, acq, gs] = await Promise.all([
      query<{ id: string; text: string }>(env.DB_AR,
        `SELECT id, COALESCE(prompt_en, prompt_ar) AS text FROM ar_exercises WHERE prompt_en LIKE ? OR prompt_ar LIKE ? OR id LIKE ? LIMIT ?`,
        [like, like, like, SEARCH_LIMIT]),
      query<{ id: string; text: string; work: string | null }>(env.DB_AR,
        `SELECT id, text_ar AS text, work_title AS work FROM ar_practice_pool WHERE text_ar LIKE ? OR text_en LIKE ? LIMIT ?`, [like, like, SEARCH_LIMIT]),
      query<{ id: string; text: string; work: string | null }>(env.DB_AR,
        `SELECT id, text_ar AS text, work_title AS work FROM ar_read_pool WHERE text_ar LIKE ? LIMIT ?`, [like, SEARCH_LIMIT]),
      query<{ id: string; text: string }>(env.DB_AR,
        `SELECT id, singular_ar || ' — ' || gloss_en AS text FROM ar_daily_word WHERE singular_ar LIKE ? OR gloss_en LIKE ? LIMIT ?`,
        [like, like, SEARCH_LIMIT]),
      query<{ id: string; text: string }>(env.DB_AR,
        `SELECT id, COALESCE(vocalised_ar, text_ar) || ' — ' || COALESCE(gloss_en, '') AS text FROM ar_acq_item
          WHERE status = 'live' AND (text_ar LIKE ? OR vocalised_ar LIKE ? OR gloss_en LIKE ?) LIMIT ?`, [like, like, like, SEARCH_LIMIT]),
      query<{ id: string; text: string }>(env.DB_AR,
        `SELECT id, text_ar AS text FROM ar_grammar_sentence WHERE text_ar LIKE ? LIMIT ?`, [like, SEARCH_LIMIT]),
    ]);
    const row = (id: string, kind: string, text: string | null, where: string | null) =>
      ({ id, ref: `AR:${id}`, module: 'AR', kind, text: text ?? id, where });
    return ok({ results: [
      ...ex.map((r) => row(`grammar:${r.id}`, 'grammar', r.text, null)),
      ...pool.map((r) => row(`fill:${r.id}`, 'fill', r.text, r.work)),
      ...read.map((r) => row(`read:${r.id}`, 'read', r.text, r.work)),
      ...daily.map((r) => row(`meaning:${r.id}`, 'meaning', r.text, null)),
      ...acq.map((r) => row(`meaning:${r.id}`, 'meaning', r.text, null)),
      ...gs.map((r) => row(`gs:gs_term:${r.id}`, 'feature', r.text, null)),
    ] });
  });
}
