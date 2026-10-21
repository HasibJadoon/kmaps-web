import type { Router } from '../../../shared/src/router';
import { ok, unauthorized } from '../../../shared/src/response';
import { query } from '../../../shared/src/db';
import type { StudioEnv } from '../env';
import { actorRef } from '../auth';
import { membershipsFor, workspaceIds } from '../core-client';
import {
  shapeHome, type HomeEpisodeRow, type StreamRow, type StageRow,
} from '../home';

const HOME_COLS = `id, title, format, status, core_ws_ref, ecosystem, series_ref,
                   session_no, source_ref, last_opened_at`;

export function homeRoutes(router: Router<StudioEnv>) {

  /// The studio's landing: the caller's episodes as three streams — words,
  /// counts, channels, series, next up, resume and the infographics each
  /// stream shows — in one read. Visibility is GET /st/episodes's: any
  /// workspace the caller belongs to, plus their own rows from before
  /// workspaces.
  router.get('/st/home', async (req, env) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');

    const wsIds = workspaceIds(await membershipsFor(env, req, user));
    const holes = wsIds.map(() => '?').join(', ');
    const scope = wsIds.length
      ? `(core_ws_ref IN (${holes}) OR (core_ws_ref IS NULL AND core_user_ref = ?))`
      : `(core_ws_ref IS NULL AND core_user_ref = ?)`;

    const [rows, streams, stages] = await Promise.all([
      query<HomeEpisodeRow>(env.DB_ST,
        `SELECT ${HOME_COLS} FROM st_episodes WHERE ${scope}`, [...wsIds, user]),
      query<StreamRow>(env.DB_ST,
        `SELECT key, seq, title_en, title_ar, title_face, tagline, icon, accent, glow,
                tone, motif, meta_json
           FROM st_streams WHERE active = 1 ORDER BY seq`),
      query<StageRow>(env.DB_ST,
        `SELECT key, seq, label_en, label_ar, icon, tone, statuses, in_can
           FROM st_pipeline_stages ORDER BY seq`),
    ]);

    return ok(shapeHome(rows, streams, stages));
  });
}
