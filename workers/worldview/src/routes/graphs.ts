import type { Router } from '../../../shared/src/router';
import { ok, notFound } from '../../../shared/src/response';
import { query, queryOne, execute } from '../../../shared/src/db';
import { forceLayout } from '../lib/force-layout';
import type { WorldviewEnv } from '../env';
import { GraphRepo } from '../repositories/graph.repo';
import { dual } from './prefix';

async function computeLayout(
  env: WorldviewEnv,
  graphId: string,
  nodes: Record<string, unknown>[],
  edges: Record<string, unknown>[],
): Promise<{ node_id: string; x: number; y: number }[]> {
  const degree = new Map<string, number>();
  const bump = (k: unknown) => {
    const id = String(k);
    degree.set(id, (degree.get(id) ?? 0) + 1);
  };
  for (const e of edges) { bump(e.from_node_id); bump(e.to_node_id); }

  const placed = forceLayout(
    nodes.map(nd => ({ id: String(nd.id), degree: degree.get(String(nd.id)) ?? 0 })),
    edges.map(e => ({ source: String(e.from_node_id), target: String(e.to_node_id) })),
  );

  await execute(env.DB_WV,
    `DELETE FROM wv_node_layout WHERE graph_id = ? AND layout_type = 'force'`, [graphId]);

  for (let i = 0; i < placed.length; i += 20) {
    const chunk = placed.slice(i, i + 20);
    await execute(env.DB_WV,
      `INSERT INTO wv_node_layout (graph_id, node_id, x, y, layout_type)
       VALUES ${chunk.map(() => '(?, ?, ?, ?, \'force\')').join(', ')}`,
      chunk.flatMap(p => [graphId, p.id, p.x, p.y]),
    );
  }
  return placed.map(p => ({ node_id: p.id, x: p.x, y: p.y }));
}

const ISLANDS = [
  { id: 'al-rum',      title: 'al-Rūm 30:2–6 — claim and counter-claim', prefix: 'wv_node_qs30_2_6_' },
  { id: 'arjana',      title: 'Muslims in the Western Imagination',      prefix: 'node-arjana-' },
  { id: 'orientalism', title: 'Orientalism §I — the character map',      prefix: 'wvn-orient-s1-' },
  { id: 'yusuf',       title: 'Sūrat Yūsuf — distillation',              prefix: 'wv_node_q12_' },
  { id: 'hallaq',      title: 'The Impossible State — ch. 1, Premises',   prefix: 'wvn-hallaq-ch1-' },
] as const;

export function graphRoutes(router: Router<WorldviewEnv>) {

  dual(router, 'get', '/graphs', async (_req, env) => {
    const graphs = await Promise.all(ISLANDS.map(async g => {
      const n = await queryOne<{ n: number }>(
        env.DB_WV, `SELECT COUNT(*) AS n FROM wv_nodes WHERE id LIKE ?`, [`${g.prefix}%`],
      );
      const e = await queryOne<{ n: number }>(
        env.DB_WV,
        `SELECT COUNT(*) AS n FROM wv_node_edges
          WHERE from_node_id LIKE ? AND to_node_id LIKE ?`,
        [`${g.prefix}%`, `${g.prefix}%`],
      );
      return { id: g.id, title: g.title, nodes: n?.n ?? 0, edges: e?.n ?? 0 };
    }));
    return ok({ graphs });
  });

  dual(router, 'get', '/graphs/:id', async (_req, env, { id }) => {
    const island = ISLANDS.find(g => g.id === id);
    if (!island) return notFound(`graph ${id}`);
    const like = `${island.prefix}%`;

    const [nodes, edges, nodeTypes, relTypes] = await Promise.all([
      query<Record<string, unknown>>(
        env.DB_WV,

        `SELECT id, node_type, title, summary, tradition_id, canonical_ref,
                json_extract(data_json, '$.text_plain')            AS text_plain,
                json_extract(data_json, '$.slug')                  AS slug,
                json_extract(data_json, '$.display_label_short')   AS label_short,
                json_extract(data_json, '$.display_label_medium')  AS label_medium,
                json_extract(data_json, '$.cluster')               AS cluster,
                json_extract(data_json, '$.cluster_title')         AS cluster_title,
                data_json, meta_json
           FROM wv_nodes WHERE id LIKE ? ORDER BY id`,
        [like],
      ),
      query<Record<string, unknown>>(
        env.DB_WV,

        `SELECT id, from_node_id, to_node_id, relation_type, weight, note
           FROM wv_node_edges WHERE from_node_id LIKE ? AND to_node_id LIKE ?
          ORDER BY id`,
        [like, like],
      ),
      query<{ node_type: string; n: number }>(
        env.DB_WV,
        `SELECT node_type, COUNT(*) AS n FROM wv_nodes WHERE id LIKE ?
          GROUP BY node_type ORDER BY n DESC`,
        [like],
      ),
      query<{ relation_type: string; n: number }>(
        env.DB_WV,
        `SELECT relation_type, COUNT(*) AS n FROM wv_node_edges
          WHERE from_node_id LIKE ? AND to_node_id LIKE ?
          GROUP BY relation_type ORDER BY n DESC`,
        [like, like],
      ),
    ]);

    const linked = new Set<string>();
    for (const e of edges) {
      linked.add(String(e.from_node_id));
      linked.add(String(e.to_node_id));
    }
    const orphans = nodes.filter(n => !linked.has(String(n.id))).map(n => n.id);

    let placed = await query<{ node_id: string; x: number; y: number }>(
      env.DB_WV,
      `SELECT node_id, x, y FROM wv_node_layout WHERE graph_id = ? AND layout_type = 'force'`,
      [island.id],
    );
    if (placed.length !== nodes.length) {
      placed = await computeLayout(env, island.id, nodes, edges);
    }
    const at = new Map(placed.map(p => [p.node_id, p]));
    const positioned = nodes.map(nd => {
      const p = at.get(String(nd.id));
      return { ...nd, x: p?.x ?? 0, y: p?.y ?? 0 };
    });

    return ok({
      graph: { id: island.id, title: island.title, layout: 'force' },
      nodes: positioned,
      edges,
      legend: {
        nodeTypes: nodeTypes.map(t => ({ key: t.node_type, count: t.n })),
        relationTypes: relTypes.map(t => ({ key: t.relation_type, count: t.n })),
      },
      orphans,
    });
  });

  dual(router, 'post', '/graphs/:id/layout', async (_req, env, { id }) => {
    const island = ISLANDS.find(g => g.id === id);
    if (!island) return notFound(`graph ${id}`);
    const like = `${island.prefix}%`;
    const [nodes, edges] = await Promise.all([
      query<Record<string, unknown>>(env.DB_WV,
        `SELECT id FROM wv_nodes WHERE id LIKE ? ORDER BY id`, [like]),
      query<Record<string, unknown>>(env.DB_WV,
        `SELECT from_node_id, to_node_id FROM wv_node_edges
          WHERE from_node_id LIKE ? AND to_node_id LIKE ?
          ORDER BY id`, [like, like]),
    ]);
    const placed = await computeLayout(env, island.id, nodes, edges);
    return ok({ graph: island.id, placed: placed.length });
  });

  dual(router, 'get', '/clusters', async (req, env) => {
    const url = new URL(req.url);
    const repo = new GraphRepo(env.DB_WV);
    return ok(await repo.clusters(
      url.searchParams.get('tradition'), url.searchParams.get('cluster_type'), {},
    ));
  });

  dual(router, 'get', '/clusters/:id', async (_req, env, { id }) => {
    const repo = new GraphRepo(env.DB_WV);
    const cluster = await repo.findClusterById(id);
    if (!cluster) return notFound(`cluster ${id}`);
    return ok({ cluster, members: await repo.members(id) });
  });
}
