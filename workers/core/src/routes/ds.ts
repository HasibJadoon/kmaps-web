// ─── /core/ds — the composed display spec ────────────────────────────────────
//
//   GET /core/ds/root/:root?form=desktop|mobile
//
// The whole picture of a root: its layers, how built they are, the cards made
// from it, and where it lives in the muṣḥaf. km_core is the only worker bound
// to every other one and the only one holding the control plane and the SRS,
// so it is the only place this can be assembled.
//
// A client should ask for this rather than for the parts. Asking the domain
// worker directly still works and returns the layers alone, which is the right
// answer to a different question.

import type { Router } from '../../../shared/src/router';
import { ok, badRequest } from '../../../shared/src/response';
import type { CoreEnv } from '../env';
import { CoreDsRepo } from '../repositories/ds.repo';
import type { DsForm } from '../../../shared/src/contracts/ds';

const FORMS = new Set(['desktop', 'mobile']);

export function dsRoutes(router: Router<CoreEnv>) {
  router.get('/core/ds/root/:root', async (req, env, { root }) => {
    if (!root) return badRequest('root required');
    const form = new URL(req.url).searchParams.get('form') ?? 'desktop';
    if (!FORMS.has(form)) return badRequest(`form must be one of ${[...FORMS].join(', ')}`);

    const repo = new CoreDsRepo(env.DB_CORE, env);
    return ok(await repo.root(root, form as DsForm));
  });
}
