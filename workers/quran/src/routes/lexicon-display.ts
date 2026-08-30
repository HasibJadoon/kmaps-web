import type { Router } from '../../../shared/src/router';
import { ok, notFound, internalError } from '../../../shared/src/response';
import { query } from '../../../shared/src/db';
import type { QuranEnv } from '../env';

interface RootRow {
  root_ar: string; root_display: string | null; root_type: string | null;
  frequency_quran: number | null;
  meaning_core_ar: string | null; meaning_core_en: string | null; meaning_core_ur: string | null;
  hook_ar: string | null; hook_en: string | null; hook_ur: string | null;
  family_json: string | null; lens_coverage_json: string | null;
  senses_json: string | null; section_icons_json: string | null;
  semantic_field: string | null; is_anchor: number;
}

const parse = <T>(s: string | null, fallback: T): T => {
  if (!s) return fallback;
  try { return JSON.parse(s) as T; } catch { return fallback; }
};

export function lexiconDisplayRoutes(router: Router<QuranEnv>) {
  router.get('/qr/lexicon/root/:root', async (_req, env, { root }) => {
    try {
      const decoded = decodeURIComponent(root);
      const rows = await query<RootRow>(
        env.DB_QR,
        `SELECT root_ar, root_display, root_type, frequency_quran,
                meaning_core_ar, meaning_core_en, meaning_core_ur,
                hook_ar, hook_en, hook_ur,
                family_json, lens_coverage_json, senses_json, section_icons_json,
                semantic_field, is_anchor
           FROM qr_morph_display_root
          WHERE root_ar = ? AND status = 'live' LIMIT 1`,
        [decoded],
      );
      const r = rows[0];
      if (!r) return notFound(`display root ${decoded}`);

      return ok({
        root: r.root_ar,
        root_display: r.root_display,
        root_type: r.root_type,
        frequency_quran: r.frequency_quran,
        meaning_core: { ar: r.meaning_core_ar, en: r.meaning_core_en, ur: r.meaning_core_ur },
        hook: { ar: r.hook_ar, en: r.hook_en, ur: r.hook_ur },
        family: parse<unknown[]>(r.family_json, []),
        lenses: parse<unknown[]>(r.lens_coverage_json, []),
        senses: parse<string[]>(r.senses_json, []),
        section_icons: parse<Record<string, string>>(r.section_icons_json, {}),
        semantic_field: r.semantic_field,
        is_anchor: !!r.is_anchor,
      });
    } catch (err) {
      console.error('[qr/lexicon/root]', err);
      return internalError('Failed to load root display');
    }
  });
}
