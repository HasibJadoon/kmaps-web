import type { Router } from '../../../shared/src/router';
import { notFound, ok } from '../../../shared/src/response';
import { queryOne } from '../../../shared/src/db';
import type { ContentEnv } from '../env';

// A hub is a contents page of cards — the sūra's Notes page, say. Which cards,
// in what order, and every word and glyph on them are the row's (a
// cm_documents row of doc_type 'hub'); the app only knows how to open each
// card's `kind`. Adding a card is adding it to the row.
export function hubRoutes(router: Router<ContentEnv>) {
  router.get('/cm/hubs/:slug', async (_req, env, params) => {
    const row = await queryOne<{ title: string; title_ar: string | null; meta_json: string | null }>(
      env.DB_CM,
      `SELECT title, title_ar, meta_json FROM cm_documents WHERE doc_type = 'hub' AND slug = ? LIMIT 1`,
      [params.slug],
    );
    if (!row) return notFound(`hub ${params.slug}`);
    let meta: { cards?: unknown[]; labels?: Record<string, string> } = {};
    try { meta = JSON.parse(row.meta_json ?? '{}') ?? {}; } catch { /* empty hub */ }
    const cards = (Array.isArray(meta.cards) ? meta.cards : [])
      .filter((c): c is Record<string, unknown> => !!c && typeof c === 'object' && typeof (c as { kind?: unknown }).kind === 'string');
    return ok({ title: row.title, title_ar: row.title_ar, labels: meta.labels ?? {}, cards });
  });
}
