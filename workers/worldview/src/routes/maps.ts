// ─── /wv/maps — the geographic layer ──────────────────────────────────────────
//
// `wv_map_features` holds ten real coordinates across five era labels — Rome
// and Jerusalem and al-Andalus in the medieval band, Constantinople in the
// renaissance, the Americas and the Barbary Coast, Egypt and London under
// orientalism, then New York, Guantánamo and Abu Ghraib. The Angular map has
// never drawn any of them: its four waypoints are a hardcoded const and it
// makes no request at all.
//
// The `period_label` on each feature matches the era axes of the comparison
// matrix, which is what makes the map steppable across the same five bands the
// heatmap uses — the two views are the same argument in different projections.

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

  // GET /wv/maps/:id — a layer with its features, and the era bands they fall in.
  //
  // `periods` is derived from the features rather than declared anywhere, in
  // the order they first appear — the data carries its own sequence, and a
  // second list of era names would be a second thing to keep in step.
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
