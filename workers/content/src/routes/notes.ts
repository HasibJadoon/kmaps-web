import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, badRequest, paginated, unauthorized } from '../../../shared/src/response';
import { parsePagination, nonBlank } from '../../../shared/src/validate';
import { actorRef } from '../../../shared/src/auth';
import type { ContentEnv } from '../env';
import { NoteRepo } from '../repositories/note.repo';

export function noteRoutes(router: Router<ContentEnv>) {

  router.get('/cm/notes', async (req, env) => {
    const url = new URL(req.url);
    return paginated(
      await new NoteRepo(env.DB_CM).list(
        url.searchParams.get('ref'),
        parsePagination(url),
        url.searchParams.get('domain'),
        url.searchParams.get('ref_prefix'),
      ),
    );
  });

  router.get('/cm/notes/:id', async (_req, env, { id }) => {
    const row = await new NoteRepo(env.DB_CM).findById(id);
    return row ? ok(row) : notFound(`note ${id}`);
  });

  // A note written against a passage. The reference is the same everywhere —
  // ARL for a book line, WVB for a couplet, QRL for a line of tafsir — so one
  // route serves every reader, and every note lands in the one store.
  router.post('/cm/notes', async (req, env) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const b = await req.json() as Record<string, unknown>;
    const body = nonBlank(b.content_md) ?? nonBlank(b.body_text);
    const ref  = nonBlank(b.resource_ref) ?? nonBlank(b.passage_ref);
    if (!body && !ref) return badRequest('content_md or a passage reference required');
    return created(await new NoteRepo(env.DB_CM).create({
      core_user_ref: user,
      content_md:    body ?? '',
      title:         nonBlank(b.title),
      resource_ref:  ref,
      domain:        nonBlank(b.domain),
      note_type:     nonBlank(b.note_type) ?? 'passage',
      quote:         nonBlank(b.quote),
      tags:          Array.isArray(b.tags) ? (b.tags as string[]) : null,
    }));
  });

  router.patch('/cm/notes/:id', async (req, env, { id }) => {
    const b = await req.json() as Record<string, unknown>;
    if (!b.content_md) return badRequest('content_md required');
    const row = await new NoteRepo(env.DB_CM).update(
      id,
      String(b.content_md),
      b.title !== undefined ? (b.title as string | null) : undefined,
    );
    return row ? ok(row) : notFound(`note ${id}`);
  });
}
