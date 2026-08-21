// ─── /core/study/sessions — the study axis's write path ───────────────────────
// The one place a study act is recorded. Reading, listening, teaching and
// discussing are things a person does, not rows a miner can produce, so the
// reader confirms them here and the study sensors read the result.
//
// Domain is a closed set — quran | arabic | wv — matching cyb_layer.

import type { Router } from '../../../shared/src/router';
import { ok, created, badRequest, notFound } from '../../../shared/src/response';
import { requireAuth } from '../../../shared/src/auth';
import type { CoreEnv } from '../env';
import { StudySessionRepo, type StudySessionCreate } from '../repositories/study-session.repo';

/** Same shape as the helper in srs.ts — a non-object body reads as absent. */
async function readJson(req: Request): Promise<Record<string, unknown> | undefined> {
  try {
    const body = await req.json();
    return typeof body === 'object' && body !== null && !Array.isArray(body)
      ? body as Record<string, unknown>
      : undefined;
  } catch {
    return undefined;
  }
}

const DOMAINS = new Set(['quran', 'arabic', 'wv']);
const LANES = new Set(['quran', 'language', 'worldview']);
const ACTIVITIES = new Set([
  'read', 'listen', 'watch', 'class', 'review', 'write', 'teach', 'discuss',
]);

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export function studySessionRoutes(router: Router<CoreEnv>) {

  // GET /core/study/sessions?scope_kind=passage&scope_ref=QR:SP:40:1-3
  router.get('/core/study/sessions', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;

    const url = new URL(req.url);
    const scopeKind = str(url.searchParams.get('scope_kind'));
    const scopeRef = str(url.searchParams.get('scope_ref'));
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

  // POST /core/study/sessions — record one study act.
  router.post('/core/study/sessions', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;

    const body = await readJson(req);
    if (!body) return badRequest('a JSON body is required');

    const domain   = str(body['domain']);
    const lane     = str(body['lane']);
    const activity = str(body['activity']);
    const scopeKind = str(body['scope_kind']);
    const scopeRef  = str(body['scope_ref']);

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
      layer_id:      str(body['layer_id']),
      band_code:     str(body['band_code']),
      node_id:       str(body['node_id']),
      source_kind:   str(body['source_kind']),
      source_ref:    str(body['source_ref']),
      started_at:    str(body['started_at']),
      ended_at:      str(body['ended_at']),
      duration_secs: num(body['duration_secs']),
      confidence,
      note:          str(body['note']),
    };

    const row = await new StudySessionRepo(env.DB_CORE).create(ctx.userId, input);
    return created(row);
  });

  // DELETE /core/study/sessions/:id — undo a confirmation.
  router.delete('/core/study/sessions/:id', async (req, env, { id }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const gone = await new StudySessionRepo(env.DB_CORE).remove(ctx.userId, id);
    return gone ? ok({ deleted: id }) : notFound(`study session ${id}`);
  });
}
