/// Any episode doc's scenes, shaped for a presenter (owner 2026-11-26: one Studio, everything data driven). The studio
/// worker calls this over its CONTENT binding for an episode's Recording screen; the words and the Arabic face come in
/// the query from the studio registry, so nothing here names a series.
///   GET /cm/scenes/:docId?face=mushaf|amiri&meaning=…&lesson=…&units=…
import type { Router } from '../../../shared/src/router';
import { actorRef } from '../../../shared/src/auth';
import { query, queryOne } from '../../../shared/src/db';
import { notFound, ok, unauthorized } from '../../../shared/src/response';
import type { ContentEnv } from '../env';
import { shapeScene, type BlockRow } from '../readalong';

export function sceneRoutes(router: Router<ContentEnv>) {
  router.get('/cm/scenes/:docId', async (req, env, { docId }) => {
    if (!actorRef(req)) return unauthorized('Authenticated user required');
    const sp = new URL(req.url).searchParams;
    const doc = await queryOne<{ doc_id: string; title: string }>(env.DB_CM, `SELECT doc_id, title FROM cm_documents WHERE doc_id = ?`, [docId]);
    if (!doc) return notFound(`doc ${docId}`);
    const blocks = await query<BlockRow>(env.DB_CM,
      `SELECT block_id, seq_order, attrs_json FROM cm_blocks WHERE doc_id = ? AND block_type = 'scene' ORDER BY seq_order`, [docId]);
    const cfg = { face: sp.get('face') ?? 'amiri', units: sp.get('units') ?? '',
                  labels: { meaning: sp.get('meaning') ?? '', lesson: sp.get('lesson') ?? '' } };
    return ok({ doc_id: doc.doc_id, title: doc.title, scenes: blocks.map((b, i) => ({ no: i + 1, ...shapeScene(b, cfg) })) });
  });
}
