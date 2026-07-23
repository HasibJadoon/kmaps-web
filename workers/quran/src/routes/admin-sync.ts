// ─── /qr/admin/sync — cross-domain projection sync jobs ───────────────────────
// Backfills qr_morph_display_roots.al_root_ref (added in QR migration 0009) by
// resolving each display root's canonical AL id through the AR_LINGUISTICS
// service binding — never by binding AL's D1 database directly (domain rule).
//
// AL owns root identity; qr_morph_display_roots is a render cache. This job makes
// the cache carry a typed 'AL:<ar_ling_roots.id>' pointer back to the source of
// truth and stamps content_synced_at. It does not rewrite the cached content
// columns (a fuller refresh can fetch /al/roots/:id later) — it establishes the
// reference so the two can never silently drift.

import type { Router } from '../../../shared/src/router';
import { ok, badRequest } from '../../../shared/src/response';
import type { QuranEnv } from '../env';

interface AlRoot { id: string; root_text?: string }

/** Pull the first matching AL root id for a surface root string. */
async function resolveAlRootId(al: Fetcher, rootAr: string): Promise<string | null> {
  const url = `https://al/al/roots/search?q=${encodeURIComponent(rootAr)}&per_page=1`;
  const res = await al.fetch(new Request(url));
  if (!res.ok) return null;
  const body = (await res.json()) as { data?: AlRoot[]; results?: AlRoot[] };
  const rows = body.data ?? body.results ?? [];
  // Prefer an exact surface match; else fall back to the top hit.
  const exact = rows.find((r) => r.root_text === rootAr);
  return (exact ?? rows[0])?.id ?? null;
}

export function adminSyncRoutes(router: Router<QuranEnv>) {
  // POST /qr/admin/sync/al-root-ref?force=1
  //   force=1 re-resolves rows that already have an al_root_ref.
  router.post('/qr/admin/sync/al-root-ref', async (req, env) => {
    const al = env.AR_LINGUISTICS;
    if (!al) return badRequest('AR_LINGUISTICS service binding not configured');

    const force = new URL(req.url).searchParams.get('force') === '1';
    const where = force ? '' : 'WHERE al_root_ref IS NULL';
    const { results } = await env.DB_QR
      .prepare(`SELECT id, root_ar FROM qr_morph_display_roots ${where}`)
      .all<{ id: string; root_ar: string }>();

    const rows = results ?? [];
    let matched = 0;
    let unmatched = 0;
    const now = new Date().toISOString();
    const updates: D1PreparedStatement[] = [];

    for (const row of rows) {
      const alId = await resolveAlRootId(al, row.root_ar);
      if (!alId) { unmatched++; continue; }
      matched++;
      updates.push(
        env.DB_QR
          .prepare(
            `UPDATE qr_morph_display_roots
                SET al_root_ref = ?, content_source = 'al_projection', content_synced_at = ?
              WHERE id = ?`,
          )
          .bind(`AL:${alId}`, now, row.id),
      );
    }

    if (updates.length) await env.DB_QR.batch(updates);

    return ok({
      job: 'al-root-ref-backfill',
      scanned: rows.length,
      matched,
      unmatched,
      forced: force,
      synced_at: now,
    });
  });
}
