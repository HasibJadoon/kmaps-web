import type { Router } from '../../../shared/src/router';
import { ok, badRequest } from '../../../shared/src/response';
import type { ArLinguisticsEnv } from '../env';
import { DsRepo } from '../repositories/ds.repo';
import type { DsForm } from '../../../shared/src/contracts/ds';

const FORMS = new Set(['desktop', 'mobile']);

const SCOPES = new Set(['root', 'lemma', 'word', 'context']);

export function dsRoutes(router: Router<ArLinguisticsEnv>) {

  router.get('/al/ds/root/:root', async (req, env, { root }) => {
    if (!root) return badRequest('root required');
    const url = new URL(req.url);

    const form = url.searchParams.get('form') ?? 'desktop';
    if (!FORMS.has(form)) {
      return badRequest(`form must be one of ${[...FORMS].join(', ')}`);
    }
    const scope = url.searchParams.get('scope') ?? 'root';
    if (!SCOPES.has(scope)) {
      return badRequest(`scope must be one of ${[...SCOPES].join(', ')}`);
    }

    const repo = new DsRepo(env.DB_AL);
    return ok(await repo.root(root, form as DsForm, scope === 'context' ? 'word' : scope));
  });
}
