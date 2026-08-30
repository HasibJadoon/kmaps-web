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

  router.get('/al/lex/v2/display', (req, env) => cached(req, async () => {
    const profiles = await new SourcesRepo(env.DB_AL).profilesInDisplayOrder();
    return ok({ lexicons: profiles, total: profiles.length });
  }));

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

  router.get('/al/lex/v2/display/:source_slug', (req, env, params) => cached(req, async () => {
    const slug = params.source_slug;
    const config = await new SourcesRepo(env.DB_AL).displayConfig(slug);
    if (!config) {

      return notFound(`Display profile for lexicon '${slug}'`);
    }

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
