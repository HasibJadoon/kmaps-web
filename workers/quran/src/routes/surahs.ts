import type { Router } from '../../../shared/src/router';
import { ok, notFound, badRequest } from '../../../shared/src/response';
import { parseIntParam } from '../../../shared/src/validate';
import type { QuranEnv } from '../env';
import { SurahRepo } from '../repositories/surah.repo';
import { validateSurahPatch } from '../schemas/surah.schema';

export function surahRoutes(router: Router<QuranEnv>) {

  router.get('/qr/surahs', async (_req, env) => {
    const repo = new SurahRepo(env.DB_QR);
    return ok(await repo.listAll());
  });

  router.get('/qr/surahs/:id', async (_req, env, { id }) => {
    const num = parseIntParam(id);
    if (!num || num < 1 || num > 114)
      return badRequest('Surah ID must be between 1 and 114');

    const surah = await new SurahRepo(env.DB_QR).findById(num);
    return surah ? ok(surah) : notFound(`surah ${id}`);
  });

  router.patch('/qr/surahs/:id', async (req, env, { id }) => {
    const num = parseIntParam(id);
    if (!num) return badRequest('Invalid surah ID');

    const body = await req.json();
    const result = validateSurahPatch(body);
    if ('error' in result) return badRequest(result.error);

    const updated = await new SurahRepo(env.DB_QR).update(num, result.data);
    return updated ? ok(updated) : notFound(`surah ${id}`);
  });
}
