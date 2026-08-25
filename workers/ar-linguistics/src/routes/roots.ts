// ─── /al/roots routes ─────────────────────────────────────────────────────────

import type { Router } from '../../../shared/src/router';
import { ok, created, notFound, badRequest, paginated } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { ArLinguisticsEnv } from '../env';
import { RootRepo } from '../repositories/root.repo';
import { SenseRepo } from '../repositories/sense.repo';
import { validateRootCreate } from '../schemas/root.schema';

export function rootRoutes(router: Router<ArLinguisticsEnv>) {

  // GET /al/roots?page=1&per_page=20
  router.get('/al/roots', async (req, env) => {
    return paginated(await new RootRepo(env.DB_AL).list(parsePagination(new URL(req.url))));
  });

  // GET /al/roots/search?q=كتب
  router.get('/al/roots/search', async (req, env) => {
    const url = new URL(req.url);
    const q = url.searchParams.get('q');
    if (!q) return badRequest('q param required');
    return paginated(await new RootRepo(env.DB_AL).search(q, parsePagination(url)));
  });

  // GET /al/roots/glosses?roots=نزل,كتب,علم — the identity card of many roots
  // at once. A grid of root tiles needs a gloss and a muṣḥaf frequency per
  // tile; those live in DB_AL while the passage's root list comes from the
  // Quran worker, so the app reads them here in one call rather than N.
  //
  // Declared before /al/roots/:id so "glosses" is never matched as an id.
  router.get('/al/roots/glosses', async (req, env) => {
    const raw = new URL(req.url).searchParams.get('roots');
    if (!raw) return badRequest('roots param required (comma-separated)');
    const roots = [...new Set(raw.split(',').map((r) => r.trim()).filter(Boolean))].slice(0, 200);
    return ok({ roots: await new RootRepo(env.DB_AL).glosses(roots) });
  });

  // GET /al/roots/:root/senses — the 360° sense layer for one root: its senses,
  // the arcs between them, every arc's steps, and the attestations backing all
  // three. One call, because the arc is meaningless without its steps and a
  // claim is meaningless without who said it.
  //
  // Declared before /al/roots/:id so "senses" is never matched as an id.
  router.get('/al/roots/:root/senses', async (_req, env, { root }) => {
    const repo = new SenseRepo(env.DB_AL);
    const [senses, arcs, steps, attestations] = await Promise.all([
      repo.senses(root), repo.arcs(root), repo.steps(root), repo.attestations(root),
    ]);
    return ok({ root, senses, arcs, steps, attestations });
  });

  // GET /al/roots/:id
  router.get('/al/roots/:id', async (_req, env, { id }) => {
    const root = await new RootRepo(env.DB_AL).findById(id);
    return root ? ok(root) : notFound(`root ${id}`);
  });

  // POST /al/roots — admin
  router.post('/al/roots', async (req, env) => {
    const body = await req.json();
    const result = validateRootCreate(body);
    if ('error' in result) return badRequest(result.error);
    return created(await new RootRepo(env.DB_AL).create(result.data));
  });
}
