import type { Router } from '../../../shared/src/router';
import { ok, notFound } from '../../../shared/src/response';
import { query, queryOne } from '../../../shared/src/db';
import type { WorldviewEnv } from '../env';

/**
 * The people the library is by.
 *
 * An author was a string on a source row, which is enough to group a shelf and
 * not enough to open a page about him. Here he is a row: his dates, what kind
 * of writer he was, and every work of his the corpus holds, each with the year
 * it was written — which is a life laid out in order, and the thing a reader
 * actually wants when he taps a name.
 */

const WORK_COLS = `
  s.id, s.slug, s.title, s.title_ar, s.source_type, s.source_domain, s.language,
  s.published_year, s.description_md, s.url,
  json_extract(s.meta_json,'$.book.summary')       AS summary,
  json_extract(s.meta_json,'$.book.cover')         AS cover,
  json_extract(s.meta_json,'$.book.rating')        AS rating,
  json_extract(s.meta_json,'$.book.ratings_count') AS ratings_count,
  json_extract(s.meta_json,'$.book.pages')         AS pages,
  json_extract(s.meta_json,'$.book.subjects')      AS subjects_json,
  (SELECT COUNT(*) FROM wv_source_units u WHERE u.source_id = s.id) AS unit_count`;

const PERSON_COLS = `
  p.id, p.person_key, p.name_en, p.name_ar, p.name_native, p.person_type,
  p.birth_year, p.death_year, p.era, p.nationality, p.bio_md`;

export function authorRoutes(router: Router<WorldviewEnv>) {

  // Everyone the shelf is by, oldest first — the library read as a procession
  // rather than an alphabet.
  router.get('/wv/authors', async (req, env) => {
    const url = new URL(req.url);
    const domain = url.searchParams.get('domain');
    const params: unknown[] = [];
    let where = 's.person_ref IS NOT NULL';
    if (domain) { where += ' AND s.source_domain = ?'; params.push(domain); }
    const authors = await query<Record<string, unknown>>(
      env.DB_WV,
      `SELECT ${PERSON_COLS},
              COUNT(s.id) AS work_count,
              MIN(s.published_year) AS first_year,
              MAX(s.published_year) AS last_year,
              MAX(json_extract(s.meta_json,'$.book.cover')) AS cover
         FROM core_person p
         JOIN wv_sources s ON s.person_ref = p.id
        WHERE ${where}
        GROUP BY p.id
        ORDER BY p.birth_year IS NULL, p.birth_year, p.name_en`,
      params,
    );
    return ok({ authors, total: authors.length });
  });

  // One author, and everything of his the corpus holds.
  router.get('/wv/authors/:id', async (_req, env, { id }) => {
    const key = id.startsWith('PN:') ? id : `PN:${id}`;
    const author = await queryOne<Record<string, unknown>>(
      env.DB_WV,
      `SELECT ${PERSON_COLS} FROM core_person p WHERE p.id = ? OR p.person_key = ?`,
      [key, id],
    );
    if (!author) return notFound(`author ${id}`);

    const works = await query<Record<string, unknown>>(
      env.DB_WV,
      `SELECT ${WORK_COLS} FROM wv_sources s WHERE s.person_ref = ?
        ORDER BY s.published_year IS NULL, s.published_year, s.title`,
      [author.id],
    );
    return ok({ author, works });
  });
}
