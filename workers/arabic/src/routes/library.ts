import type { Router } from '../../../shared/src/router';
import { ok } from '../../../shared/src/response';
import { query } from '../../../shared/src/db';
import type { ArabicEnv } from '../env';

/// The linguistics library: the books the disciplines are taught from, and the
/// disciplines themselves. Both are read-only registries — the app lists them,
/// it does not author them.
export function libraryRoutes(router: Router<ArabicEnv>) {

  /// Every source, newest scholarship last: classical first, then the modern
  /// primaries, then what is pedagogical. `discipline` narrows to NH/SF/BL.
  router.get('/ar/sources', async (req, env) => {
    const url = new URL(req.url);
    const discipline = url.searchParams.get('discipline');
    const kind = url.searchParams.get('kind');

    const conds: string[] = [];
    const params: unknown[] = [];
    if (discipline) { conds.push('discipline = ?'); params.push(discipline); }
    if (kind) { conds.push('source_kind = ?'); params.push(kind); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

    return ok({
      sources: await query(
        env.DB_AR,
        `SELECT id, source_kind, title_ar, title_en, author_ar, author_en,
                death_year, url, platform, edition, lang, discipline,
                authority, al_source_slug, notes_md
           FROM ar_learning_source ${where}
          ORDER BY discipline,
                   CASE authority
                     WHEN 'classical' THEN 1
                     WHEN 'primary_modern' THEN 2
                     WHEN 'pedagogical' THEN 3
                     ELSE 4 END,
                   COALESCE(title_en, title_ar)`,
        params,
      ),
    });
  });

  /// Naḥw, Ṣarf, Balāgha — each with the accent it is drawn in and the course
  /// that teaches it.
  router.get('/ar/disciplines', async (_req, env) =>
    ok({
      disciplines: await query(
        env.DB_AR,
        `SELECT d.code, d.slug, d.name_ar, d.name_en, d.name_ur, d.tagline_en,
                d.accent, d.container_id AS containerId, d.sort_order,
                (SELECT COUNT(*) FROM ar_learning_source s
                  WHERE s.discipline = d.code) AS sources,
                (SELECT c.title FROM ar_curriculum_container c
                  WHERE c.discipline = d.code LIMIT 1) AS courseTitle,
                (SELECT c.id FROM ar_curriculum_container c
                  WHERE c.discipline = d.code LIMIT 1) AS courseId
           FROM ar_discipline d
          ORDER BY d.sort_order`,
      ),
    }));
}
