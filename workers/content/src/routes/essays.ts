import type { Router } from '../../../shared/src/router';
import { notFound, ok } from '../../../shared/src/response';
import { queryOne } from '../../../shared/src/db';
import type { ContentEnv } from '../env';

// Essays: long-form reading (a key term told in full), authored once and read by everyone — a cm_documents row of
// doc_type 'essay' with its markdown in one 'markdown' block. The class path links a key term's essay as a node to
// read before its slides and drills; the app lays the markdown out itself (headings, verse panels, notes).

export function essayRoutes(router: Router<ContentEnv>) {
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
