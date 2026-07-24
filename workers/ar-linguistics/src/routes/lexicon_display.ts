// ─── /al/lex/v2/display/* — the per-lexicon rendering contract ───────────────
//
// Serves the display setup added in migration 0039. Every lexicon's contract —
// which block kinds it uses, what panel each lands in, what order, what label
// in EN/AR/UR, which font, how footnotes and Qurʾānic cues behave — is rows in
// ar_ling_lexicon_display_*, not code. The UI reads this once per book and
// renders; it never branches on slug.
//
// Endpoints:
//   GET /al/lex/v2/display                 every live profile, catalogue order
//   GET /al/lex/v2/display/kinds           the closed 20-value block vocabulary
//   GET /al/lex/v2/display/:source_slug    full contract for one lexicon
//
// Registration order matters: `/display/kinds` is a literal that would
// otherwise be captured by `:source_slug`, so it is registered first — the
// router returns the first matching route (shared/src/router.ts:81).
//
// This module reads config only. Composing an actual entry from the contract
// still runs through the per-family routes (lexicon_lane / lexicon_lisan /
// lexicon_mufradat / lexicon_five_lens); retiring those is gated on capturing
// their current responses as fixtures, so the replacement can be proven
// byte-identical rather than merely plausible.

import type { Router } from '../../../shared/src/router';
import { ok, notFound } from '../../../shared/src/response';
import { cached } from '../../../shared/src/cache';
import { query } from '../../../shared/src/db';
import type { ArLinguisticsEnv } from '../env';
import { SourcesRepo, toResponseMeta } from '../repositories/sources.repo';

interface KindRow {
  kind_code:    string;
  kind_family:  string;
  panel_key:    string;
  style_key:    string;
  name_ar:      string;
  name_en:      string;
  name_ur:      string;
  is_visible:   number;
  is_collapsed: number;
  sort_weight:  number;
  icon:         string | null;
}

export function lexiconDisplayRoutes(router: Router<ArLinguisticsEnv>) {

  // ── GET /al/lex/v2/display ──────────────────────────────────────────────
  // The lexicon picker payload: bibliographic identity + rendering contract in
  // one call, so the shell doesn't need a second round-trip per book.
  // Edge-cached — profiles only change when a lexicon is added or retuned.
  router.get('/al/lex/v2/display', (req, env) => cached(req, async () => {
    const profiles = await new SourcesRepo(env.DB_AL).profilesInDisplayOrder();
    return ok({ lexicons: profiles, total: profiles.length });
  }));

  // ── GET /al/lex/v2/display/kinds ────────────────────────────────────────
  // The closed block-kind vocabulary (N15). The UI maps `style_key` to a CSS
  // class and a font: 'mushaf' → UthmanicHafs, everything else → AmiriQuran.
  // Registered before `:source_slug` so the literal wins.
  router.get('/al/lex/v2/display/kinds', (req, env) => cached(req, async () => {
    const rows = await query<KindRow>(
      env.DB_AL,
      `SELECT kind_code, kind_family, panel_key, style_key,
              name_ar, name_en, name_ur, is_visible, is_collapsed, sort_weight, icon
         FROM ar_ling_lexicon_display_block_kind
        WHERE status = 'live'
        ORDER BY sort_weight ASC`,
    );
    const kinds = rows.map(r => ({
      kind_code:    r.kind_code,
      kind_family:  r.kind_family,
      panel_key:    r.panel_key,
      style_key:    r.style_key,
      name_ar:      r.name_ar,
      name_en:      r.name_en,
      name_ur:      r.name_ur,
      is_visible:   r.is_visible === 1,
      is_collapsed: r.is_collapsed === 1,
      sort_weight:  r.sort_weight,
      icon:         r.icon,
    }));
    return ok({ kinds, total: kinds.length });
  }));

  // ── GET /al/lex/v2/display/:source_slug ─────────────────────────────────
  // The full contract for one lexicon. 404s rather than falling back to a
  // default shape — rendering a book under another book's contract produces
  // output that looks right and is wrong, which is worse than an error.
  router.get('/al/lex/v2/display/:source_slug', (req, env, params) => cached(req, async () => {
    const slug = params.source_slug;
    const config = await new SourcesRepo(env.DB_AL).displayConfig(slug);
    if (!config) {
      // notFound() appends " not found" — pass a noun phrase, not a sentence.
      return notFound(`Display profile for lexicon '${slug}'`);
    }
    // Panels are derived, not stored: the section list already carries
    // panel_key and is ordered by seq, so grouping here keeps the ordering
    // authority in D1 and hands the UI a ready-to-render structure.
    const panels: { panel_key: string; sections: typeof config.sections }[] = [];
    for (const section of config.sections) {
      const last = panels[panels.length - 1];
      if (last && last.panel_key === section.panel_key) last.sections.push(section);
      else panels.push({ panel_key: section.panel_key, sections: [section] });
    }
    return ok({
      source:   toResponseMeta(config.source),
      profile:  config.profile,
      panels,
      sections: config.sections,
      rules:    config.rules,
    });
  }));
}
