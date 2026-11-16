import type { Router } from '../../../shared/src/router';
import { ok, unauthorized, badRequest } from '../../../shared/src/response';
import type { StudioEnv } from '../env';
import { actorRef } from '../auth';
import { membershipsFor, workspaceIds } from '../core-client';
import { EpisodeRepo } from '../repositories/episode.repo';
import { seriesPlan, dayIn } from '../checklist';
import { buildActivity, type ActivitySeries } from '../activity';

function metaObject(json: string | null): Record<string, unknown> {
  try { const v: unknown = json ? JSON.parse(json) : {}; return v && typeof v === 'object' ? v as Record<string, unknown> : {}; }
  catch { return {}; }
}

export function activityRoutes(router: Router<StudioEnv>) {
  /// The Week (?week=YYYY-MM-DD, the week that day falls in; ?week=now this one) or the Month
  /// (?month=YYYY-MM) as a view of activity: every day of it, with the steps
  /// ticked that day and the days episodes are aimed at, from every series the
  /// caller can see that carries its own planner. Read only.
  router.get('/st/activity', async (req, env) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const q = new URL(req.url).searchParams;
    const week = q.get('week'), month = q.get('month');
    if (week && week !== 'now' && !/^\d{4}-\d{2}-\d{2}$/.test(week)) return badRequest('week: YYYY-MM-DD or now');
    if (month && !/^\d{4}-\d{2}$/.test(month)) return badRequest('month: YYYY-MM');

    const repo = new EpisodeRepo(env.DB_ST);
    const rows = await repo.listEpisodes(user, workspaceIds(await membershipsFor(env, req, user)));
    const series: ActivitySeries[] = [];
    let tz = 'UTC';
    for (const s of rows) {
      const plan = seriesPlan(s.meta_json);
      if (!plan.steps.length) continue;
      tz = plan.tz;
      const meta = metaObject(s.meta_json);
      const title = typeof meta['short'] === 'string' ? meta['short'] as string
        : (s.title.split(' — ').pop() ?? s.title);
      series.push({
        id: s.id, title, plan,
        accent: typeof meta['accent'] === 'string' ? meta['accent'] as string : '#D8B657',
        episodes: rows.filter((e) => e.series_ref === s.id)
          .map((e) => ({ id: e.id, session_no: e.session_no, meta_json: e.meta_json, title: e.title })),
      });
    }
    const now = new Date();
    const today = dayIn(tz, now);
    return ok(month || !week
      ? buildActivity('month', month ?? today.slice(0, 7), series, now, tz)
      : buildActivity('week', week === 'now' ? today : week, series, now, tz));
  });
}
