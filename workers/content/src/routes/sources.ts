// ─── /cm/sources — the resource repository ────────────────────────────────────
//
// Books, articles, podcast episodes, videos, lectures — what you have collected,
// with enough bibliography to cite it. Distinct from wv_sources, which is a
// research artefact being read closely; a cm_source becomes one by promotion,
// and the two then point at each other.
//
// Every route here used to throw: the repository selected columns that do not
// exist and never set the NOT NULL owner. See source.repo.ts.

import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, badRequest, paginated, unauthorized } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { ContentEnv } from '../env';
import { CmSourceRepo } from '../repositories/source.repo';

/**
 * What a resource can be.
 *
 * The live rows use `course_notes`, `textbook` and `workbook`, none of which
 * were in the old TypeScript union — because that union was only ever checked
 * by a validator the routes never called. Both lists are merged here and the
 * check is real, so the seven existing rows stay valid and the vocabulary stops
 * being two different things.
 */
export const CM_SOURCE_TYPES = [
  'book', 'article', 'paper', 'lecture', 'manuscript', 'video', 'podcast',
  'channel', 'course_notes', 'textbook', 'workbook', 'thread', 'other',
] as const;

function actor(req: Request): string | null {
  const id = req.headers.get('X-KM-User-Id');
  return id && id.trim() ? id.trim() : null;
}

export function cmSourceRoutes(router: Router<ContentEnv>) {

  // GET /cm/sources?type=book&status=reading
  router.get('/cm/sources', async (req, env) => {
    const user = actor(req);
    if (!user) return unauthorized('Authenticated user required');
    const url = new URL(req.url);
    return paginated(await new CmSourceRepo(env.DB_CM).list({
      user,
      type: url.searchParams.get('type'),
      status: url.searchParams.get('status'),
      ...parsePagination(url),
    }));
  });

  // GET /cm/sources/types — the vocabulary, so a client offers what the
  // database will actually accept.
  router.get('/cm/sources/types', async (_req, _env) =>
    ok({ types: CM_SOURCE_TYPES }));

  router.get('/cm/sources/:id', async (req, env, { id }) => {
    const user = actor(req);
    if (!user) return unauthorized('Authenticated user required');
    const row = await new CmSourceRepo(env.DB_CM).findById(id);
    if (!row || row.core_user_ref !== user) return notFound(`source ${id}`);
    return ok(row);
  });

  // POST /cm/sources
  router.post('/cm/sources', async (req, env) => {
    const user = actor(req);
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
    }));
  });

  // POST /cm/sources/:id/promote — reading has begun.
  //
  // Records the wv_sources row this became. Only this side is written here;
  // the caller sets `cm_source_ref` on the worldview side, because there is no
  // foreign key across two databases and a pair of pointers is the only thing
  // that makes the link checkable afterwards.
  router.post('/cm/sources/:id/promote', async (req, env, { id }) => {
    const user = actor(req);
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
