import type { Router } from '../../../shared/src/router';
import { ok, badRequest } from '../../../shared/src/response';
import { parseIntParam } from '../../../shared/src/validate';
import type { QuranEnv } from '../env';
import { WordRepo } from '../repositories/word.repo';

export function wordRoutes(router: Router<QuranEnv>) {

  router.get('/qr/words', async (req, env) => {
    const url = new URL(req.url);
    const surah = parseIntParam(url.searchParams.get('surah') ?? '');
    const ayah  = parseIntParam(url.searchParams.get('ayah')  ?? '');
    if (!surah) return badRequest('surah param is required');

    const repo = new WordRepo(env.DB_QR);

    if (ayah) return ok(await repo.byAyah(surah, ayah));

    const from = parseIntParam(url.searchParams.get('from') ?? '');
    const to   = parseIntParam(url.searchParams.get('to')   ?? '');
    if (from && to) return ok(await repo.byRange(surah, from, to));

    return badRequest('Provide ayah or from+to range');
  });

  router.get('/qr/words/by-root', async (req, env) => {
    const url  = new URL(req.url);
    const root = url.searchParams.get('root');
    if (!root) return badRequest('root param required');

    return ok(await new WordRepo(env.DB_QR).byRoot(root));
  });
}
