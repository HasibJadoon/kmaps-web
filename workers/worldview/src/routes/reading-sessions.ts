import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, badRequest, paginated } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { WorldviewEnv } from '../env';
import { ReadingSessionRepo } from '../repositories/reading-session.repo';

const DEFAULT_USER = '1';
const DEFAULT_WS   = 'ws_user_1';

export function readingSessionRoutes(router: Router<WorldviewEnv>) {

  router.get('/worldview/reading-sessions', async (req, env) => {
    const url = new URL(req.url);
    return paginated(
      await new ReadingSessionRepo(env.DB_WV).list({
        source_id:     url.searchParams.get('source_id') ?? undefined,
        core_user_ref: url.searchParams.get('user') ?? undefined,
        status:        url.searchParams.get('status') ?? undefined,
        ...parsePagination(url),
      }),
    );
  });

  router.get('/worldview/reading-sessions/active', async (req, env) => {
    const url = new URL(req.url);
    const sourceId = url.searchParams.get('source_id');
    if (!sourceId) return badRequest('source_id required');
    const user = url.searchParams.get('user') ?? DEFAULT_USER;
    const row = await new ReadingSessionRepo(env.DB_WV).activeForSource(sourceId, user);
    return ok(row ?? null);
  });

  router.get('/worldview/reading-sessions/:id', async (_req, env, { id }) => {
    const row = await new ReadingSessionRepo(env.DB_WV).findById(id);
    return row ? ok(row) : notFound(`reading session ${id}`);
  });

  router.post('/worldview/reading-session', async (req, env) => {
    const b = await req.json() as Record<string, unknown>;
    if (!b.source_id) return badRequest('source_id required');
    return created(await new ReadingSessionRepo(env.DB_WV).create({
      source_id:      String(b.source_id),
      source_unit_id: (b.source_unit_id as string | null) ?? null,
      title:          (b.title          as string | null) ?? null,
      session_type:   b.session_type ? String(b.session_type) : undefined,
      status:         b.status       ? String(b.status)       : undefined,
      focus_mode:     (b.focus_mode     as string | null) ?? null,
      last_position:  (b.last_position  as string | null) ?? null,
      summary_md:     (b.summary_md     as string | null) ?? null,
      core_user_ref:  b.core_user_ref ? String(b.core_user_ref) : DEFAULT_USER,
      core_ws_ref:    b.core_ws_ref   ? String(b.core_ws_ref)   : DEFAULT_WS,
      meta_json:      (b.meta_json      as string | null) ?? null,
    }));
  });

  router.put('/worldview/reading-session', async (req, env) => {
    const b = await req.json() as Record<string, unknown>;
    if (!b.id) return badRequest('id required');
    const row = await new ReadingSessionRepo(env.DB_WV).patch(String(b.id), {
      source_unit_id: b.source_unit_id as string | null | undefined,
      title:          b.title          as string | null | undefined,
      session_type:   b.session_type   as string | undefined,
      status:         b.status         as string | undefined,
      focus_mode:     b.focus_mode     as string | null | undefined,
      ended_at:       b.ended_at       as string | null | undefined,
      last_position:  b.last_position  as string | null | undefined,
      duration_secs:  b.duration_secs != null ? Number(b.duration_secs) : undefined,
      summary_md:     b.summary_md     as string | null | undefined,
      meta_json:      b.meta_json      as string | null | undefined,
    });
    return row ? ok(row) : notFound(`reading session ${b.id}`);
  });

  router.delete('/worldview/reading-session/:id', async (_req, env, { id }) => {
    await new ReadingSessionRepo(env.DB_WV).delete(id);
    return ok({ id, deleted: true });
  });

  router.get('/wv/reading-sessions', async (req, env) => {
    const url = new URL(req.url);
    return paginated(
      await new ReadingSessionRepo(env.DB_WV).list({
        source_id:     url.searchParams.get('source_id') ?? undefined,
        core_user_ref: url.searchParams.get('user') ?? undefined,
        status:        url.searchParams.get('status') ?? undefined,
        ...parsePagination(url),
      }),
    );
  });

  router.get('/wv/reading-sessions/:id', async (_req, env, { id }) => {
    const row = await new ReadingSessionRepo(env.DB_WV).findById(id);
    return row ? ok(row) : notFound(`reading session ${id}`);
  });
}
