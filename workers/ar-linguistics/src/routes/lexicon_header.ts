import type { Router } from '../../../shared/src/router';
import { ok, notFound } from '../../../shared/src/response';
import type { ArLinguisticsEnv } from '../env';

/// The book header: what stands above the heading pills in the reader.
///
/// It renders FROM BLOCKS. ar_ling_lexicon_entry_ds.ds_json is only a layout —
/// section order and block ids — and the blocks themselves are rows in
/// ar_ling_lexicon_block with origin='derived'. That indirection is the point:
/// every piece of the header has a global id, so it can be linked to, and the
/// backlink index answers what rests on it.
export function lexiconHeaderRoutes(router: Router<ArLinguisticsEnv>) {

  router.get('/al/lexicon/:root/:slug/header', async (_req, env, { root, slug }) => {
    const rootNorm = decodeURIComponent(root);
    const entry = await env.DB_AL.prepare(
      `SELECT d.root_entry_id, d.ds_json, d.doc_json, d.template_key, d.template_ver, d.status
         FROM ar_ling_lexicon_entry_ds d
         JOIN ar_ling_lexicon_entry e ON e.id = d.root_entry_id
        WHERE e.root_norm = ? AND e.source_slug = ?`
    ).bind(rootNorm, slug).first<{
      root_entry_id: string; ds_json: string | null; doc_json: string;
      template_key: string; template_ver: number; status: string;
    }>();

    if (!entry) return notFound(`header ${rootNorm} × ${slug}`);

    let layout: { sections?: { blocks?: string[] }[] } = {};
    try { layout = JSON.parse(entry.ds_json ?? '{}'); } catch { layout = {}; }

    const rows = (await env.DB_AL.prepare(
      `SELECT id, parent_block_id, block_type, block_seq, depth,
              title_ar, text_plain, data_json
         FROM ar_ling_lexicon_block
        WHERE root_entry_id = ? AND origin = 'derived'
        ORDER BY block_seq`
    ).bind(entry.root_entry_id).all()).results ?? [];

    const blocks: Record<string, unknown> = {};
    for (const r of rows as Record<string, unknown>[]) {
      let data: unknown = {};
      try { data = JSON.parse(String(r['data_json'] ?? '{}')); } catch { data = {}; }
      blocks[String(r['id'])] = {
        id: r['id'], parent_block_id: r['parent_block_id'], block_type: r['block_type'],
        block_seq: r['block_seq'], depth: r['depth'],
        title_ar: r['title_ar'], text_plain: r['text_plain'], data,
      };
    }

    // A section names ids; a child (a sense under its form) is reached through
    // its parent, so the layout stays flat and the tree lives in the blocks.
    const children: Record<string, string[]> = {};
    for (const r of rows as Record<string, unknown>[]) {
      const parent = r['parent_block_id'];
      if (typeof parent === 'string' && parent) {
        (children[parent] ??= []).push(String(r['id']));
      }
    }

    return ok({
      root: rootNorm, source_slug: slug, status: entry.status,
      template_key: entry.template_key, template_ver: entry.template_ver,
      layout, blocks, children,
    });
  });

  /// What rests on a block — the backlink, straight off ix_lex_block_link_to.
  router.get('/al/lexicon/blocks/:id/backlinks', async (_req, env, { id }) => {
    const rows = (await env.DB_AL.prepare(
      `SELECT l.from_block_id, l.link_kind, l.label,
              b.block_type, b.title_ar, b.source_slug, b.origin
         FROM ar_ling_lexicon_block_link l
         LEFT JOIN ar_ling_lexicon_block b ON b.id = l.from_block_id
        WHERE l.to_block_id = ?
        ORDER BY b.block_seq`
    ).bind(id).all()).results ?? [];
    return ok({ block_id: id, backlinks: rows });
  });
}
