import type { Router } from '../../../shared/src/router';
import { badRequest, notFound, ok, unauthorized } from '../../../shared/src/response';
import { actorRef } from '../../../shared/src/auth';
import type { ContentEnv } from '../env';
import { StudyRepo } from '../repositories/study.repo';

// Studies: a passage worked through in steps, each step a deck. `?status=active`
// is what the workspace's active-study card asks for. Person steps resolve to
// the caller's own deck, so two people see the same study with their own slides.
export function studyRoutes(router: Router<ContentEnv>) {
  router.get('/cm/studies', async (req, env) => {
    const status = new URL(req.url).searchParams.get('status') ?? undefined;
    return ok(await new StudyRepo(env.DB_CM).list(actorRef(req), status));
  });

  // Time and reach on one step, reported by the player as the person reads.
  router.post('/cm/studies/:id/progress', async (req, env, params) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const b = await req.json().catch(() => null) as Record<string, unknown> | null;
    const step = Number(b?.step);
    if (!b || !Number.isInteger(step)) return badRequest('step required');
    const repo = new StudyRepo(env.DB_CM);
    const id = await repo.resolve(params.id);
    if (!id || !(await repo.isMember(id, user))) return notFound(`study ${params.id}`);
    await repo.report(id, user, {
      step,
      seconds: Number(b.seconds) || 0,
      slide: Number(b.slide) || 0,
      slideCount: Number(b.slide_count) || 0,
      done: b.done === true,
    });
    return ok({ ok: true });
  });

  // The monitor: both people through every step, with dates, time and review points.
  router.get('/cm/studies/:id/monitor', async (req, env, params) => {
    const repo = new StudyRepo(env.DB_CM);
    const id = await repo.resolve(params.id);
    const monitor = id ? await repo.monitor(id, actorRef(req)) : null;
    return monitor ? ok(monitor) : notFound(`study ${params.id}`);
  });
}
