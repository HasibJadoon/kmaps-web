import type { Router } from '../../../shared/src/router';
import { notFound, ok } from '../../../shared/src/response';
import { query, queryOne } from '../../../shared/src/db';
import type { ContentEnv } from '../env';

// Essays: long-form reading (a key term told in full), authored once and read by everyone — a cm_documents row of
// doc_type 'essay' with its markdown in one 'markdown' block. The class path links a key term's essay as a node to
// read before its slides and drills; the app lays the markdown out itself (headings, verse panels, notes).

export function essayRoutes(router: Router<ContentEnv>) {
  // a passage's essays, each with the word it is written about (meta anchor "surah:ayah:word") — the class path places
  // each one in the sentence that holds its word, so a new essay reaches the path without anyone linking it
  router.get('/cm/essays', async (req, env) => {
    const passage = new URL(req.url).searchParams.get('passage');
    if (!passage) return ok({ essays: [] });
    const rows = await query<{ slug: string; title: string; title_ar: string | null; meta_json: string | null }>(env.DB_CM,
      `SELECT slug, title, title_ar, meta_json FROM cm_documents
        WHERE doc_type = 'essay' AND publication_state = 'published' AND json_extract(meta_json, '$.passage_id') = ?
        ORDER BY json_extract(meta_json, '$.anchor'), slug`, [passage]);
    return ok({ essays: rows.map((r) => {
      let m: Record<string, unknown> = {};
      try { m = JSON.parse(r.meta_json ?? '{}'); } catch { /* keep empty */ }
      return { slug: r.slug, title: r.title, titleAr: r.title_ar, termKey: m.term_key ?? null, termEn: m.term_en ?? null,
               anchor: m.anchor ?? null };
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
