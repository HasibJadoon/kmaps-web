import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, badRequest, paginated, unauthorized } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import { actorRef } from '../../../shared/src/auth';
import type { ContentEnv } from '../env';
import { CmSourceRepo } from '../repositories/source.repo';

export const CM_SOURCE_TYPES = [
  'book', 'article', 'paper', 'lecture', 'manuscript', 'video', 'podcast',
  'channel', 'course_notes', 'textbook', 'workbook', 'thread', 'other',
] as const;

export function cmSourceRoutes(router: Router<ContentEnv>) {

  router.get('/cm/sources', async (req, env) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const url = new URL(req.url);
    return paginated(await new CmSourceRepo(env.DB_CM).list({
      user,
      type: url.searchParams.get('type'),
      status: url.searchParams.get('status'),
      ...parsePagination(url),
    }));
  });

  router.get('/cm/sources/types', async (_req, _env) =>
    ok({ types: CM_SOURCE_TYPES }));

  router.get('/cm/sources/:id', async (req, env, { id }) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const row = await new CmSourceRepo(env.DB_CM).findById(id);
    if (!row || row.core_user_ref !== user) return notFound(`source ${id}`);
    return ok(row);
  });

  router.post('/cm/sources', async (req, env) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const b = await req.json() as Record<string, unknown>;

    const title = typeof b['title'] === 'string' ? b['title'].trim() : '';
    if (!title) return badRequest('title required');

    const type = typeof b['source_type'] === 'string' ? b['source_type'] : 'other';
    if (!(CM_SOURCE_TYPES as readonly string[]).includes(type)) {
      return badRequest(`source_type must be one of: ${CM_SOURCE_TYPES.join(', ')}`);
    }

    return created(await new CmSourceRepo(env.DB_CM).create({
      core_user_ref: user,
      title,
      source_type: type,
      title_ar: typeof b['title_ar'] === 'string' ? b['title_ar'] : null,
      subtitle: typeof b['subtitle'] === 'string' ? b['subtitle'] : null,
      language: typeof b['language'] === 'string' ? b['language'] : undefined,
      workspace_ref: typeof b['workspace_ref'] === 'string' ? b['workspace_ref'] : null,
      author_names: Array.isArray(b['author_names']) ? (b['author_names'] as string[]) : null,
      publisher: typeof b['publisher'] === 'string' ? b['publisher'] : null,
      publication_year: typeof b['publication_year'] === 'number' ? b['publication_year'] : null,
      isbn: typeof b['isbn'] === 'string' ? b['isbn'] : null,
      doi: typeof b['doi'] === 'string' ? b['doi'] : null,
      url: typeof b['url'] === 'string' ? b['url'] : null,

      parent_source_ref: typeof b['parent_source_ref'] === 'string' ? b['parent_source_ref'] : null,
      episode_no: typeof b['episode_no'] === 'number' ? b['episode_no'] : null,
      published_at: typeof b['published_at'] === 'string' ? b['published_at'] : null,
    }));
  });

  router.get('/cm/sources/:id/episodes', async (req, env, { id }) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const result = await new CmSourceRepo(env.DB_CM).channel(id);
    if (!result || result.channel.core_user_ref !== user) return notFound(`source ${id}`);
    return ok(result);
  });

  router.post('/cm/sources/:id/promote', async (req, env, { id }) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const b = await req.json() as Record<string, unknown>;
    const ref = typeof b['wv_source_ref'] === 'string' ? b['wv_source_ref'].trim() : '';
    if (!ref) return badRequest('wv_source_ref required');

    const repo = new CmSourceRepo(env.DB_CM);
    const row = await repo.findById(id);
    if (!row || row.core_user_ref !== user) return notFound(`source ${id}`);
    return ok(await repo.promote(id, ref));
  });
}
