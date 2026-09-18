import type { Router } from '../../../shared/src/router';
import { ok, notFound } from '../../../shared/src/response';
import type { ContentEnv } from '../env';
import { CmTemplateRepo } from '../repositories/template.repo';

/// The template registry: the shape a K-Maps document is authored in, and the
/// worked entries that show that shape filled in. Reference data — it names
/// books and fields and holds nothing about anyone — so the gateway lists
/// 'cm/templates' as an unsigned GET path.
export function cmTemplateRoutes(router: Router<ContentEnv>) {

  router.get('/cm/templates/categories', async (_req, env) =>
    ok({ categories: await new CmTemplateRepo(env.DB_CM).categories() }));

  router.get('/cm/templates', async (req, env) => {
    const category = new URL(req.url).searchParams.get('category');
    return ok({ templates: await new CmTemplateRepo(env.DB_CM).templates(category) });
  });

  router.get('/cm/templates/:key', async (_req, env, { key }) => {
    const row = await new CmTemplateRepo(env.DB_CM).template(key);
    if (!row) return notFound(`template ${key}`);
    return ok(row);
  });

  router.get('/cm/templates/:key/samples/:sampleId', async (_req, env, { key, sampleId }) => {
    const row = await new CmTemplateRepo(env.DB_CM).sample(key, sampleId);
    if (!row) return notFound(`sample ${sampleId}`);
    return ok(row);
  });
}
