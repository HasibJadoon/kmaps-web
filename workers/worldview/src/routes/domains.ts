import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, badRequest } from '../../../shared/src/response';
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
      `SELECT id, slug, title, title_ar, tradition_type, parent_id, founded_period,
              geographic_origin, description_md
         FROM wv_traditions WHERE domain_id = ? ORDER BY title`,
      [domain.id],
    );
    const ids = traditions.map(t => String(t.id));
    const holes = ids.length ? ids.map(() => '?').join(',') : "''";

    const branches = ids.length ? await query<Record<string, unknown>>(
      env.DB_WV,
      `SELECT id, slug, title, title_ar, tradition_id, branch_type, parent_id,
              period_range, description_md
         FROM wv_tradition_branches WHERE tradition_id IN (${holes})
        ORDER BY title`,
      ids,
    ) : [];

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

    const byParent = new Map<string | null, Record<string, unknown>[]>();
    for (const t of traditions) {
      const key = (t.parent_id as string | null) ?? null;
      (byParent.get(key) ?? byParent.set(key, []).get(key)!).push(t);
    }
    const branchesFor = (tid: string) => branches.filter(b => b.tradition_id === tid);
    const nest = (parent: string | null): Record<string, unknown>[] =>
      (byParent.get(parent) ?? []).map(t => ({
        ...t,
        branches: branchesFor(String(t.id)),
        children: nest(String(t.id)),
      }));

    return ok({
      domain: { ...domain, traditions: traditions.length },
      traditions: nest(null),
      traditionsFlat: traditions,
      people,
      sources,
      nodesByTradition: Object.fromEntries(nodes.map(n => [n.tradition_id, n.n])),
      filled: {
        traditions: traditions.length,
        branches: branches.length,
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

}
