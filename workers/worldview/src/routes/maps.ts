import type { Router } from '../../../shared/src/router';
import { ok, notFound, paginated } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import { query } from '../../../shared/src/db';
import type { WorldviewEnv } from '../env';
import { MapRepo } from '../repositories/map.repo';
import { dual } from './prefix';

export function mapRoutes(router: Router<WorldviewEnv>) {

  dual(router, 'get', '/maps', async (req, env) => {
    const url = new URL(req.url);
    return paginated(await new MapRepo(env.DB_WV).layers(
      url.searchParams.get('tradition'), parsePagination(url),
    ));
  });

  dual(router, 'get', '/maps/:id', async (_req, env, { id }) => {
    const layer = await new MapRepo(env.DB_WV).findLayerById(id);
    if (!layer) return notFound(`map layer ${id}`);
    const features = await query<Record<string, unknown>>(
      env.DB_WV,
      `SELECT id, map_layer_id, feature_type, title, label, location_id,
              latitude, longitude, geometry_json, linked_entity, period_label, meta_json
         FROM wv_map_features WHERE map_layer_id = ?
        ORDER BY rowid`,
      [id],
    );
    const periods: string[] = [];
    for (const f of features) {
      const p = f.period_label as string | null;
      if (p && !periods.includes(p)) periods.push(p);
    }
    return ok({ layer, features, periods });
  });
}
