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

async function resolveAlRoot(al: Fetcher, rootAr: string): Promise<AlRoot | null> {
  const url = `https://al/al/roots/search?q=${encodeURIComponent(rootAr)}&per_page=1`;
  const res = await al.fetch(new Request(url));
  if (!res.ok) return null;
  const body = (await res.json()) as { data?: AlRoot[]; results?: AlRoot[] };
  const rows = body.data ?? body.results ?? [];

  return rows.find((r) => r.root_text === rootAr) ?? rows[0] ?? null;
}

async function fetchAlRoot(al: Fetcher, id: string): Promise<AlRoot | null> {
  const res = await al.fetch(new Request(`https://al/al/roots/${encodeURIComponent(id)}`));
  if (!res.ok) return null;
  const body = (await res.json()) as { data?: AlRoot } | AlRoot;
  return (body as { data?: AlRoot }).data ?? (body as AlRoot);
}

export function adminSyncRoutes(router: Router<QuranEnv>) {

  router.post('/qr/admin/sync/al-root-ref', async (req, env) => {
    const al = env.AR_LINGUISTICS;
    if (!al) return badRequest('AR_LINGUISTICS service binding not configured');

    const url = new URL(req.url);
    const force = url.searchParams.get('force') === '1';
    const refresh = url.searchParams.get('refresh') === '1';
    const where = force ? '' : 'WHERE al_root_ref IS NULL';
    const { results } = await env.DB_QR
      .prepare(`SELECT id, root_ar FROM qr_morph_display_root ${where}`)
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
              `UPDATE qr_morph_display_root
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
              `UPDATE qr_morph_display_root
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
