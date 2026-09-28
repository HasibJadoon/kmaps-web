import type { Router } from '../../../shared/src/router';
import { ok, badRequest } from '../../../shared/src/response';
import { parseIntParam } from '../../../shared/src/validate';
import type { QuranEnv } from '../env';
import { TranslationRepo } from '../repositories/translation.repo';

export function translationRoutes(router: Router<QuranEnv>) {

  router.get('/qr/translations', async (req, env) => {
    const url   = new URL(req.url);
    const surah = parseIntParam(url.searchParams.get('surah') ?? '');
    const ayah  = parseIntParam(url.searchParams.get('ayah')  ?? '');
    if (!surah || !ayah) return badRequest('surah and ayah params required');
    return ok(await new TranslationRepo(env.DB_QR).byAyah(surah, ayah));
  });

}
