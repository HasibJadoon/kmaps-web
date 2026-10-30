import type { Router } from '../../../shared/src/router';
import { notFound, ok, unauthorized } from '../../../shared/src/response';
import { execute, query, queryOne } from '../../../shared/src/db';
import { actorRef } from '../../../shared/src/auth';
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
                minutes: Math.max(1, Math.round(row.body.split(/\s+/).length / 220)), body: row.body,
                voice: await docVoice(env.DB_CM, row.doc_id) });
  });

  // Ask for a doc to be read aloud: it joins the queue the voicing runner works through. Asking again for a doc that
  // is done re-voices it (the runner keeps every clip whose text has not changed).
  router.post('/cm/docs/:id/voice', async (req, env, params) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const doc = await queryOne<{ doc_id: string }>(env.DB_CM,
      `SELECT doc_id FROM cm_documents WHERE doc_id = ? OR slug = ? LIMIT 1`, [params.id, params.id]);
    if (!doc) return notFound(`doc ${params.id}`);
    await execute(env.DB_CM,
      `INSERT INTO cm_doc_voice (doc_id, status, requested_at, requested_by) VALUES (?, 'queued', datetime('now'), ?)
       ON CONFLICT(doc_id) DO UPDATE SET status = CASE WHEN status = 'voicing' THEN status ELSE 'queued' END,
         requested_at = datetime('now'), requested_by = excluded.requested_by, error = NULL`,
      [doc.doc_id, user]);
    return ok({ voice: await docVoice(env.DB_CM, doc.doc_id) });
  });
}

export interface DocVoice {
  status: string;
  /** The doc read aloud, a clip per section, in order — present once voiced (kept while a new voicing runs). */
  sections: Array<{ title: string; url: string; seconds: number }>;
  seconds: number;
}

/// A doc's voice and its place in the queue; null when nobody has asked for it.
export async function docVoice(db: D1Database, docId: string): Promise<DocVoice | null> {
  const v = await queryOne<{ status: string; sections_json: string | null }>(db,
    `SELECT status, sections_json FROM cm_doc_voice WHERE doc_id = ?`, [docId]);
  if (!v) return null;
  let sections: DocVoice['sections'] = [];
  try { sections = JSON.parse(v.sections_json ?? '[]'); } catch { /* none yet */ }
  return { status: v.status, sections, seconds: Math.round(sections.reduce((n, s) => n + (s.seconds || 0), 0)) };
}
