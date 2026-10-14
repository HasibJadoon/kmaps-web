import type { Router } from '../../../shared/src/router';
import { ok, notFound } from '../../../shared/src/response';
import { query, queryOne } from '../../../shared/src/db';
import { labels, byKey } from '../lib/labels';
import type { ArabicEnv } from '../env';

// The learner's expert reference (AR 0047): only the EXPERT terms of the graded grammar registry — the balāgha,
// naḥw and ṣarf the commentators argue over, never the basics — each with every place it has been met in the
// scenes (ar_scene_feature_term → the scene's feature: its line, its words, its explanation). Kept to be met and
// read as it comes, not drilled. It grows as scenes are read for their expert features.

export function expertTermRoutes(router: Router<ArabicEnv>) {
  router.get('/ar/expert-terms', async (_req, env) => {
    const L = await labels(env);
    const rows = await query<{ id: string; discipline: string | null; category_key: string | null; name_ar: string; name_en: string | null;
                               short_en: string | null; badge_color: string | null; met: number; scenes: number }>(env.DB_AR,
      `SELECT g.id, g.discipline, g.category_key, g.name_ar, g.name_en, g.short_en, g.badge_color,
              COUNT(f.term_id) AS met, COUNT(DISTINCT f.unit_id || ':' || f.scene_no) AS scenes
         FROM ar_ling_gram_term g LEFT JOIN ar_scene_feature_term f ON f.term_id = g.id
        WHERE g.tier = 'expert' GROUP BY g.id ORDER BY met DESC, g.discipline, g.name_ar`);
    const D = byKey(L.expert_discipline);
    return ok({
      title: byKey(L.expert).get('title') ?? null,
      disciplines: (L.expert_discipline ?? []).map((l) => ({ key: l.key, label: l.label, labelAr: l.labelAr, color: l.color,
        total: rows.filter((r) => r.discipline === l.key).length, met: rows.filter((r) => r.discipline === l.key && r.met > 0).length })),
      terms: rows.map((r) => ({ id: r.id, nameAr: r.name_ar, nameEn: r.name_en, short: r.short_en, color: r.badge_color,
        discipline: r.discipline ? { key: r.discipline, label: D.get(r.discipline)?.label ?? r.discipline, labelAr: D.get(r.discipline)?.labelAr ?? null } : null,
        met: r.met, scenes: r.scenes })),
    });
  });

  router.get('/ar/expert-terms/:id', async (_req, env, { id }) => {
    const t = await queryOne<{ id: string; name_ar: string; name_en: string | null; definition_ar: string | null; definition_en: string | null;
                               short_en: string | null; discipline: string | null }>(env.DB_AR,
      `SELECT id, name_ar, name_en, definition_ar, definition_en, short_en, discipline FROM ar_ling_gram_term WHERE id = ? AND tier = 'expert'`, [id]);
    if (!t) return notFound(`expert term ${id}`);
    const hits = await query<{ unit_id: string; scene_no: number; feature_idx: number; features_json: string | null; series: string | null;
                               episode: number | null; scene_title: string | null }>(env.DB_AR,
      `SELECT f.unit_id, f.scene_no, f.feature_idx, v.features_json,
              json_extract(u.script_json, '$.series_ar') AS series, json_extract(u.script_json, '$.episode') AS episode,
              (SELECT json_extract(s.value, '$.title_ar') FROM json_each(json_extract(u.script_json, '$.scenes')) s
                WHERE json_extract(s.value, '$.scene_no') = f.scene_no) AS scene_title
         FROM ar_scene_feature_term f
         JOIN ar_scene_vocab v ON v.unit_id = f.unit_id AND v.scene_no = f.scene_no
         JOIN ar_text_unit u ON u.id = f.unit_id
        WHERE f.term_id = ? ORDER BY series, episode, f.scene_no LIMIT 200`, [id]);
    const met = hits.map((h) => {
      let feat: Record<string, unknown> = {};
      try { feat = (JSON.parse(h.features_json ?? '[]') as Array<Record<string, unknown>>)[h.feature_idx] ?? {}; } catch { /* none */ }
      return { unit: h.unit_id, scene: h.scene_no, series: h.series, episode: h.episode, sceneTitle: h.scene_title,
               line: feat.line ?? null, span: feat.span ?? null, text: feat.text ?? null, feature: feat.feature ?? null,
               explanation: feat.explanation ?? null };
    });
    return ok({ term: { id: t.id, nameAr: t.name_ar, nameEn: t.name_en, short: t.short_en, definitionAr: t.definition_ar,
                        definitionEn: t.definition_en, discipline: t.discipline }, met });
  });
}
