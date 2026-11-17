import type { Router } from '../../../shared/src/router';
import { ok } from '../../../shared/src/response';
import { query, queryOne } from '../../../shared/src/db';
import type { ContentEnv } from '../env';
import { DocumentRepo } from '../repositories/document.repo';
import { ensureDocument } from './documents';
import { docVoice } from './essays';
import { readerDocument, type ReaderBlockRow, type ReaderDocRow } from '../reader';

// GET /cm/reader/doc/:id — any content document as the app's one reader reads it (src/reader.ts): a markdown doc as it
// is, a typed-block doc written out as reader markdown. The same access as the document itself.
export function readerRoutes(router: Router<ContentEnv>) {
  router.get('/cm/reader/doc/:id', async (req, env, { id }) => {
    const missing = await ensureDocument(new DocumentRepo(env.DB_CM), id, req, 'read');
    if (missing) return missing;
    const doc = await queryOne<ReaderDocRow>(env.DB_CM,
      `SELECT doc_id, doc_type, slug, title, title_ar, reading_time_min, tags_json, meta_json, surah, ayah_from, ayah_to, passage_ref
         FROM cm_documents WHERE doc_id = ?`, [id]);
    const blocks = await query<ReaderBlockRow>(env.DB_CM,
      `SELECT block_type, content_text, content_ar, attrs_json FROM cm_blocks
        WHERE doc_id = ? AND parent_block_id IS NULL ORDER BY seq_order`, [id]);
    const out = readerDocument(doc!, blocks);
    return ok({ ...out, voice: await docVoice(env.DB_CM, out.docId), voiceable: true });
  });
}
