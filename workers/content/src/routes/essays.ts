import type { Router } from '../../../shared/src/router';
import { notFound, ok } from '../../../shared/src/response';
import { query, queryOne } from '../../../shared/src/db';
import type { ContentEnv } from '../env';

// Essays: long-form reading (a key term told in full), authored once and read by everyone — a cm_documents row of
// doc_type 'essay' with its markdown in one 'markdown' block. The class path links a key term's essay as a node to
// read before its slides and drills; the app lays the markdown out itself (headings, verse panels, notes).

export function essayRoutes(router: Router<ContentEnv>) {
  // a passage's essays, each with the word it is written about. A key term's essay is the term's, shared by every sūra
  // (owner, 2026-10-24): it is found by its lemmas (meta.lemmas, as qr_word_occurrence spells them) wherever the passage
  // holds one — the caller sends the passage's lemmas — and the class path places it in the sentence that holds the
  // word. An older essay tied to one passage (meta.passage_id) still comes with that passage, at its meta anchor.
  router.get('/cm/essays', async (req, env) => {
    const u = new URL(req.url);
    const passage = u.searchParams.get('passage');
    const lemmas = (u.searchParams.get('lemmas') ?? '').split(',').map((x) => x.trim()).filter(Boolean);
    if (!passage && !lemmas.length) return ok({ essays: [] });
    const rows = await query<{ slug: string; title: string; title_ar: string | null; meta_json: string | null }>(env.DB_CM,
      `SELECT slug, title, title_ar, meta_json FROM cm_documents
        WHERE doc_type = 'essay' AND publication_state = 'published'
          AND (json_extract(meta_json, '$.passage_id') = ?
               OR EXISTS (SELECT 1 FROM json_each(meta_json, '$.lemmas') j WHERE j.value IN (SELECT value FROM json_each(?))))
        ORDER BY json_extract(meta_json, '$.anchor'), slug`, [passage ?? '', JSON.stringify(lemmas)]);
    return ok({ essays: rows.map((r) => {
      let m: Record<string, unknown> = {};
      try { m = JSON.parse(r.meta_json ?? '{}'); } catch { /* keep empty */ }
      return { slug: r.slug, title: r.title, titleAr: r.title_ar, termKey: m.term_key ?? null, termEn: m.term_en ?? null,
               anchor: m.anchor ?? null, lemmas: Array.isArray(m.lemmas) ? m.lemmas : [] };
    }) });
  });

  router.get('/cm/essays/:slug', async (_req, env, params) => {
    const row = await queryOne<{ doc_id: string; slug: string; title: string; title_ar: string | null; meta_json: string | null; body: string | null }>(
      env.DB_CM,
      `SELECT d.doc_id, d.slug, d.title, d.title_ar, d.meta_json,
              (SELECT b.content_text FROM cm_blocks b WHERE b.doc_id = d.doc_id AND b.block_type = 'markdown' ORDER BY b.seq_order LIMIT 1) AS body
         FROM cm_documents d WHERE d.doc_type = 'essay' AND (d.slug = ? OR d.doc_id = ?) LIMIT 1`,
      [params.slug, params.slug]);
    if (!row || !row.body) return notFound(`essay ${params.slug}`);
    let meta: Record<string, unknown> = {};
    try { meta = JSON.parse(row.meta_json ?? '{}'); } catch { /* keep empty */ }
    return ok({ docId: row.doc_id, slug: row.slug, title: row.title, titleAr: row.title_ar, kicker: meta.kicker ?? null,
                minutes: Math.max(1, Math.round(row.body.split(/\s+/).length / 220)), body: row.body });
  });
}
