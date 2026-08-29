// ─── /wv/moral — the axes a worldview can be compared on ──────────────────────
//
// The 15 moral axes are the concepts the comparison turns on, and every one
// already carries a `concept_ref` into the shared `CN:` registry — the same
// discipline `GT:` uses for grammar terms. That ref is what lets a position
// stated while reading the Qurʾān and a position stated while reading Hallaq
// be about the same thing.
//
// `domain_id` is NULL on all 15, so axes cannot yet be filtered by field. The
// route does not offer that filter rather than offering one that returns
// nothing.

import type { Router } from '../../../shared/src/router';
import { ok, notFound, paginated } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import { query } from '../../../shared/src/db';
import type { WorldviewEnv } from '../env';
import { MoralRepo } from '../repositories/moral.repo';
import { dual } from './prefix';

export function moralRoutes(router: Router<WorldviewEnv>) {

  // GET /wv/moral/axes?axis_type=relational
  dual(router, 'get', '/moral/axes', async (req, env) => {
    const url = new URL(req.url);
    return paginated(await new MoralRepo(env.DB_WV).listAxes({
      axis_type: url.searchParams.get('axis_type'),
      ...parsePagination(url),
    }));
  });

  // GET /wv/moral/axes/:id — the axis, and who has actually spoken on it.
  //
  // The second half is the point: an axis with no positions is a question
  // nobody has answered yet, and the screen should be able to say so.
  dual(router, 'get', '/moral/axes/:id', async (_req, env, { id }) => {
    const axis = await new MoralRepo(env.DB_WV).findAxisById(id);
    if (!axis) return notFound(`moral axis ${id}`);
    const positions = await query<{ tradition_id: string; title: string; n: number }>(
      env.DB_WV,
      `SELECT p.tradition_id, t.title, COUNT(*) AS n
         FROM wv_value_positions p
         LEFT JOIN wv_traditions t ON t.id = p.tradition_id
        WHERE p.moral_axis_id = ?
        GROUP BY p.tradition_id
        ORDER BY n DESC`,
      [id],
    );
    return ok({ axis, spokenBy: positions });
  });

  dual(router, 'get', '/moral/virtues', async (req, env) =>
    paginated(await new MoralRepo(env.DB_WV).listVirtues(parsePagination(new URL(req.url)))));

  dual(router, 'get', '/moral/vices', async (req, env) =>
    paginated(await new MoralRepo(env.DB_WV).listVices(parsePagination(new URL(req.url)))));
}
