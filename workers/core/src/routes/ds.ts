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
