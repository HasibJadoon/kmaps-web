import type { Router } from '../../../shared/src/router';
import { ok, created, badRequest, notFound } from '../../../shared/src/response';
import { requireAuth } from '../../../shared/src/auth';
import { readJsonObject, nonBlank } from '../../../shared/src/validate';
import type { CoreEnv } from '../env';
import { StudySessionRepo, type StudySessionCreate } from '../repositories/study-session.repo';

const DOMAINS = new Set(['quran', 'arabic', 'wv']);
const LANES = new Set(['quran', 'language', 'worldview']);
const ACTIVITIES = new Set([
  'read', 'listen', 'watch', 'class', 'review', 'write', 'teach', 'discuss',
]);

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export function studySessionRoutes(router: Router<CoreEnv>) {

  router.get('/core/study/sessions', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;

    const url = new URL(req.url);
    const scopeKind = nonBlank(url.searchParams.get('scope_kind'));
    const scopeRef = nonBlank(url.searchParams.get('scope_ref'));
    if (!scopeKind || !scopeRef) return badRequest('scope_kind and scope_ref are required');

    const repo = new StudySessionRepo(env.DB_CORE);
    const activities = (url.searchParams.get('activity') ?? '')
      .split(',').map((a) => a.trim()).filter((a) => ACTIVITIES.has(a));

    const [sessions, tally] = await Promise.all([
      repo.forScope(ctx.userId, scopeKind, scopeRef),
      repo.tally(ctx.userId, scopeKind, scopeRef,
                 activities.length ? activities : [...ACTIVITIES]),
    ]);

    return ok({
      scope: { kind: scopeKind, ref: scopeRef },
      tally: {
        sessions: tally?.sessions ?? 0,
        layers:   tally?.layers ?? 0,
        last_at:  tally?.last_at ?? null,
        seconds:  tally?.secs ?? 0,
      },
      sessions,
    });
  });

  router.post('/core/study/sessions', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;

    const body = await readJsonObject(req);
    if (!body) return badRequest('a JSON body is required');

    const domain   = nonBlank(body['domain']);
    const lane     = nonBlank(body['lane']);
    const activity = nonBlank(body['activity']);
    const scopeKind = nonBlank(body['scope_kind']);
    const scopeRef  = nonBlank(body['scope_ref']);

    if (!domain || !DOMAINS.has(domain))     return badRequest('domain must be quran, arabic or wv');
    if (!lane || !LANES.has(lane))           return badRequest('lane must be quran, language or worldview');
    if (!activity || !ACTIVITIES.has(activity)) return badRequest(`activity must be one of ${[...ACTIVITIES].join(', ')}`);
    if (!scopeKind || !scopeRef)             return badRequest('scope_kind and scope_ref are required');

    const confidence = num(body['confidence']);
    if (confidence !== null && (confidence < 1 || confidence > 4)) {
      return badRequest('confidence must be between 1 and 4');
    }

    const input: StudySessionCreate = {
      domain, lane, scope_kind: scopeKind, scope_ref: scopeRef, activity,
      layer_id:      nonBlank(body['layer_id']),
      band_code:     nonBlank(body['band_code']),
      node_id:       nonBlank(body['node_id']),
      source_kind:   nonBlank(body['source_kind']),
      source_ref:    nonBlank(body['source_ref']),
      started_at:    nonBlank(body['started_at']),
      ended_at:      nonBlank(body['ended_at']),
      duration_secs: num(body['duration_secs']),
      confidence,
      note:          nonBlank(body['note']),
    };

    const row = await new StudySessionRepo(env.DB_CORE).create(ctx.userId, input);
    return created(row);
  });

  router.delete('/core/study/sessions/:id', async (req, env, { id }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const gone = await new StudySessionRepo(env.DB_CORE).remove(ctx.userId, id);
    return gone ? ok({ deleted: id }) : notFound(`study session ${id}`);
  });
}
