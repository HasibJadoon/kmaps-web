import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, badRequest, paginated, unauthorized } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { ContentEnv } from '../env';
import { NoteRepo } from '../repositories/note.repo';

/** Who is writing. The gateway puts the verified id here; the client never
 *  sends an owner of its own. */
function actor(req: Request): string | null {
  const id = req.headers.get('X-KM-User-Id');
  return id && id.trim() ? id.trim() : null;
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

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
    const user = actor(req);
    if (!user) return unauthorized('Authenticated user required');
    const b = await req.json() as Record<string, unknown>;
    const body = str(b.content_md) ?? str(b.body_text);
    const ref  = str(b.resource_ref) ?? str(b.passage_ref);
    if (!body && !ref) return badRequest('content_md or a passage reference required');
    return created(await new NoteRepo(env.DB_CM).create({
      core_user_ref: user,
      content_md:    body ?? '',
      title:         str(b.title),
      resource_ref:  ref,
      domain:        str(b.domain),
      note_type:     str(b.note_type) ?? 'passage',
      quote:         str(b.quote),
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
