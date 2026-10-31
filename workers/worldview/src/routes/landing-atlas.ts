import type { Router } from '../../../shared/src/router';
import { ok, notFound } from '../../../shared/src/response';
import { query } from '../../../shared/src/db';
import type { WorldviewEnv } from '../env';
import { dual } from './prefix';

// The landing atlas: the sky the app opens on — its constellations, the
// worldview graph under them, the history eras and the Revelation scene.
// One row per thing drawn in wv_landing_atlas_item (migration 013), each in
// the shape the app draws; this route only gathers them into one answer.
// Served through cache.ts ('landing' family): the same for every reader.

interface ItemRow { section: string; data_json: string }

type Json = Record<string, unknown>;

export async function buildLandingAtlas(env: WorldviewEnv, atlasId: string) {
  const rows = await query<ItemRow>(env.DB_WV,
    `SELECT section, data_json FROM wv_landing_atlas_item
      WHERE atlas_id = ? ORDER BY section, sort_order, item_id`, [atlasId]);
  if (!rows.length) return null;
  const by = new Map<string, Json[]>();
  for (const r of rows) {
    let data: Json;
    try { data = JSON.parse(r.data_json) as Json; } catch { continue; }   // one broken row is left off, not the atlas
    const list = by.get(r.section) ?? [];
    list.push(data);
    by.set(r.section, list);
  }
  const all = (s: string) => by.get(s) ?? [];
  const head = all('graph')[0] ?? {};
  const scene = all('scene')[0] ?? null;
  return {
    graph: {
      schema_version: head['schema_version'] ?? 1,
      graph_id: head['graph_id'] ?? atlasId,
      meta: head['meta'] ?? null,
      clusters: all('cluster'),
      nodes: all('node'),
      edges: all('edge'),
      zoom_views: all('view'),
    },
    layers: all('layer'),
    eras: all('era'),
    scene: scene && { ...scene, rings: all('scene_ring'), nodes: all('scene_node'), links: all('scene_link') },
  };
}

export function landingAtlasRoutes(router: Router<WorldviewEnv>) {
  dual(router, 'get', '/landing-atlas', async (req, env) => {
    const id = new URL(req.url).searchParams.get('id') || 'landing';
    const atlas = await buildLandingAtlas(env, id);
    return atlas ? ok(atlas) : notFound('Landing atlas');
  });
}
