import type { Router } from '../../../shared/src/router';
import { ok } from '../../../shared/src/response';
import type { ArLinguisticsEnv } from '../env';
import { WordViewRepo } from '../repositories/word_view.repo';

export function wordViewRoutes(router: Router<ArLinguisticsEnv>) {

  router.get('/al/verb-government/:root', async (_req, env, { root }) =>
    ok(await new WordViewRepo(env.DB_AL).verbGovernment(decodeURIComponent(root))),
  );

  router.get('/al/root-antonyms/:root', async (_req, env, { root }) =>
    ok(await new WordViewRepo(env.DB_AL).antonyms(decodeURIComponent(root))),
  );

  router.get('/al/expressions/by-root/:root', async (_req, env, { root }) =>
    ok(await new WordViewRepo(env.DB_AL).expressionsByRoot(decodeURIComponent(root))),
  );

  router.get('/al/expressions/by-quran/:surah', async (req, env, { surah }) => {
    const url = new URL(req.url);
    const from = parseInt(url.searchParams.get('from') ?? '1', 10) || 1;
    const to = parseInt(url.searchParams.get('to') ?? '999', 10) || 999;
    return ok(
      await new WordViewRepo(env.DB_AL).expressionsByQuran(parseInt(surah, 10) || 0, from, to),
    );
  });
}
