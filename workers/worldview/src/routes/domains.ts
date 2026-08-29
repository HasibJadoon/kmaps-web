// ─── /wv/domains — entering the corpus by field ───────────────────────────────
//
// A reader should be able to start from a field rather than from a book: open
// philosophy, or psychology, or modernity, and get that field's traditions and
// what has been said inside it.
//
// The words a reader has in mind sit at two levels. Philosophy, psychology and
// the social are `wv_domains` rows; modernity and postmodernism are
// `wv_traditions` rows of `tradition_type='movement'` that live inside a domain.
// So `/facets` returns both levels in one list — a reader should not have to
// know whether a word was filed as a domain, a movement or a discipline.
//
// What is joinable is narrower than it looks. `wv_traditions.domain_id` is set
// on all 17, so domain → tradition works. `wv_moral_axes.domain_id` is NULL on
// all 15, and `tradition_id` is unset on every topic, question, claim and
// timeline event. The counts below therefore report what is actually there,
// including the zeros, rather than offering a filter that silently finds
// nothing.

import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, badRequest, paginated } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import { query, queryOne } from '../../../shared/src/db';
import type { WorldviewEnv } from '../env';
import { DomainRepo } from '../repositories/domain.repo';
import { dual } from './prefix';

interface DomainWithCounts {
  id: string;
  slug: string;
  title: string;
  title_ar: string | null;
  description: string | null;
  sort_order: number;
  traditions: number;
}

export function domainRoutes(router: Router<WorldviewEnv>) {

  // GET /wv/domains — every field, each with how many traditions it holds.
  //
  // Ordered by that count rather than by `sort_order`, which is 0 on nine of
  // the eleven rows and so sorts nothing. A domain holding no tradition is
  // still returned: an empty field is a fact about the corpus, and hiding it
  // makes the corpus look more complete than it is.
  dual(router, 'get', '/domains', async (_req, env) => {
    return ok(await query<DomainWithCounts>(
      env.DB_WV,
      `SELECT d.id, d.slug, d.title, d.title_ar, d.description, d.sort_order,
              COUNT(t.id) AS traditions
         FROM wv_domains d
         LEFT JOIN wv_traditions t ON t.domain_id = d.id
        GROUP BY d.id
        ORDER BY traditions DESC, d.title`,
    ));
  });

  // GET /wv/domains/facets — the browsable entry list, both levels at once.
  //
  // `kind` says which level a row came from, so a client can group them without
  // guessing: 'domain' for a field, 'tradition_type' for the kinds a tradition
  // can be (religion, philosophy, mysticism, ideology, movement, discipline,
  // era). Modernity and postmodernism are reachable through the second.
  dual(router, 'get', '/domains/facets', async (_req, env) => {
    const [domains, kinds] = await Promise.all([
      query<{ slug: string; title: string; n: number }>(
        env.DB_WV,
        `SELECT d.slug, d.title, COUNT(t.id) AS n
           FROM wv_domains d
           LEFT JOIN wv_traditions t ON t.domain_id = d.id
          GROUP BY d.id ORDER BY n DESC, d.title`,
      ),
      query<{ slug: string; n: number }>(
        env.DB_WV,
        `SELECT tradition_type AS slug, COUNT(*) AS n
           FROM wv_traditions
          WHERE tradition_type IS NOT NULL
          GROUP BY tradition_type ORDER BY n DESC`,
      ),
    ]);
    return ok({
      facets: [
        ...domains.map(d => ({ kind: 'domain' as const, slug: d.slug, title: d.title, count: d.n })),
        ...kinds.map(k => ({
          kind: 'tradition_type' as const,
          slug: k.slug,
          title: k.slug.charAt(0).toUpperCase() + k.slug.slice(1).replace(/_/g, ' '),
          count: k.n,
        })),
      ],
    });
  });

  // GET /wv/domains/:slug — one field, with everything reachable from it.
  //
  // `filled` is the honest part: it reports how much of this field actually
  // carries data, so a screen can say "3 traditions, no dated events yet"
  // instead of drawing an empty timeline as though the field were quiet.
  dual(router, 'get', '/domains/:slug', async (_req, env, { slug }) => {
    const domain = await queryOne<DomainWithCounts>(
      env.DB_WV,
      `SELECT id, slug, title, title_ar, description, sort_order, 0 AS traditions
         FROM wv_domains WHERE slug = ?`,
      [slug],
    );
    if (!domain) return notFound(`domain ${slug}`);

    const traditions = await query<Record<string, unknown>>(
      env.DB_WV,
      `SELECT id, slug, title, title_ar, tradition_type, founded_period,
              geographic_origin, description_md
         FROM wv_traditions WHERE domain_id = ? ORDER BY title`,
      [domain.id],
    );
    const ids = traditions.map(t => String(t.id));
    const holes = ids.length ? ids.map(() => '?').join(',') : "''";

    const [people, nodes, sources] = await Promise.all([
      query<Record<string, unknown>>(
        env.DB_WV,
        `SELECT id, slug, name, name_ar, person_type, era, birth_year, death_year, tradition_id
           FROM wv_people WHERE tradition_id IN (${holes}) ORDER BY birth_year, name`,
        ids,
      ),
      query<{ tradition_id: string; n: number }>(
        env.DB_WV,
        `SELECT tradition_id, COUNT(*) AS n FROM wv_nodes
          WHERE tradition_id IN (${holes}) GROUP BY tradition_id`,
        ids,
      ),
      query<Record<string, unknown>>(
        env.DB_WV,
        `SELECT id, slug, title, source_type, published_year, tradition_id
           FROM wv_sources WHERE tradition_id IN (${holes}) ORDER BY published_year`,
        ids,
      ),
    ]);

    return ok({
      domain: { ...domain, traditions: traditions.length },
      traditions,
      people,
      sources,
      nodesByTradition: Object.fromEntries(nodes.map(n => [n.tradition_id, n.n])),
      filled: {
        traditions: traditions.length,
        people: people.length,
        sources: sources.length,
        nodes: nodes.reduce((sum, n) => sum + Number(n.n), 0),
      },
    });
  });

  dual(router, 'post', '/domains', async (req, env) => {
    const b = await req.json() as Record<string, unknown>;
    if (!b.slug || !b.title) return badRequest('slug and title required');
    return created(await new DomainRepo(env.DB_WV).createDomain({
      slug: String(b.slug),
      title: String(b.title),
      title_ar: (b.title_ar as string | null) ?? null,
      description: (b.description as string | null) ?? null,
      sort_order: typeof b.sort_order === 'number' ? b.sort_order : 0,
    }));
  });

  // ── Periods, regions and locations ─────────────────────────────────────────
  // All three tables are empty today. The routes exist so a timeline or a map
  // has somewhere to read from the moment the first row is authored, and so the
  // emptiness is visible as an empty list rather than as a 404 that reads like
  // a missing feature.

  dual(router, 'get', '/periods', async (req, env) => {
    const url = new URL(req.url);
    return paginated(await new DomainRepo(env.DB_WV).listPeriods({
      period_type: url.searchParams.get('period_type'),
      ...parsePagination(url),
    }));
  });

  dual(router, 'get', '/regions', async (req, env) => {
    const url = new URL(req.url);
    return paginated(await new DomainRepo(env.DB_WV).listRegions({
      region_type: url.searchParams.get('region_type'),
      parent_id:   url.searchParams.get('parent_id'),
      ...parsePagination(url),
    }));
  });
}
