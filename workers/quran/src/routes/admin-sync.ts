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

interface AlRoot {
  id: string;
  root_text?: string;
  root_type?: string;
  frequency_quran?: number;
  meaning_core_en?: string;
  meaning_core_ar?: string;
}

/** Pull the first matching AL root for a surface root string. */
async function resolveAlRoot(al: Fetcher, rootAr: string): Promise<AlRoot | null> {
  const url = `https://al/al/roots/search?q=${encodeURIComponent(rootAr)}&per_page=1`;
  const res = await al.fetch(new Request(url));
  if (!res.ok) return null;
  const body = (await res.json()) as { data?: AlRoot[]; results?: AlRoot[] };
  const rows = body.data ?? body.results ?? [];
  // Prefer an exact surface match; else fall back to the top hit.
  return rows.find((r) => r.root_text === rootAr) ?? rows[0] ?? null;
}

/** Fetch the full canonical root record by id (for content refresh). */
async function fetchAlRoot(al: Fetcher, id: string): Promise<AlRoot | null> {
  const res = await al.fetch(new Request(`https://al/al/roots/${encodeURIComponent(id)}`));
  if (!res.ok) return null;
  const body = (await res.json()) as { data?: AlRoot } | AlRoot;
  return (body as { data?: AlRoot }).data ?? (body as AlRoot);
}

export function adminSyncRoutes(router: Router<QuranEnv>) {
  // POST /qr/admin/sync/al-root-ref?force=1&refresh=1
  //   force=1   re-resolves rows that already have an al_root_ref.
  //   refresh=1 also re-projects the cached content columns (meaning_core_*,
  //             root_type, frequency_quran) from the canonical AL root record.
  //             (Trilingual hooks / family_json come from AL DNA and need a
  //             dedicated AL display endpoint — left as a follow-up.)
  router.post('/qr/admin/sync/al-root-ref', async (req, env) => {
    const al = env.AR_LINGUISTICS;
    if (!al) return badRequest('AR_LINGUISTICS service binding not configured');

    const url = new URL(req.url);
    const force = url.searchParams.get('force') === '1';
    const refresh = url.searchParams.get('refresh') === '1';
    const where = force ? '' : 'WHERE al_root_ref IS NULL';
    const { results } = await env.DB_QR
      .prepare(`SELECT id, root_ar FROM qr_morph_display_roots ${where}`)
      .all<{ id: string; root_ar: string }>();

    const rows = results ?? [];
    let matched = 0;
    let unmatched = 0;
    let refreshed = 0;
    const now = new Date().toISOString();
    const updates: D1PreparedStatement[] = [];

    for (const row of rows) {
      const hit = await resolveAlRoot(al, row.root_ar);
      if (!hit) { unmatched++; continue; }
      matched++;

      if (refresh) {
        const full = (await fetchAlRoot(al, hit.id)) ?? hit;
        refreshed++;
        updates.push(
          env.DB_QR
            .prepare(
              `UPDATE qr_morph_display_roots
                  SET al_root_ref = ?, content_source = 'al_projection', content_synced_at = ?,
                      meaning_core_en = COALESCE(?, meaning_core_en),
                      meaning_core_ar = COALESCE(?, meaning_core_ar),
                      root_type       = COALESCE(?, root_type),
                      frequency_quran = COALESCE(?, frequency_quran)
                WHERE id = ?`,
            )
            .bind(
              `AL:${hit.id}`, now,
              full.meaning_core_en ?? null, full.meaning_core_ar ?? null,
              full.root_type ?? null, full.frequency_quran ?? null,
              row.id,
            ),
        );
      } else {
        updates.push(
          env.DB_QR
            .prepare(
              `UPDATE qr_morph_display_roots
                  SET al_root_ref = ?, content_source = 'al_projection', content_synced_at = ?
                WHERE id = ?`,
            )
            .bind(`AL:${hit.id}`, now, row.id),
        );
      }
    }

    if (updates.length) await env.DB_QR.batch(updates);

    return ok({
      job: 'al-root-ref-backfill',
      scanned: rows.length,
      matched,
      unmatched,
      refreshed,
      forced: force,
      refresh,
      synced_at: now,
    });
  });
}
