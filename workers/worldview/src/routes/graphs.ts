// ─── /wv/graphs — the node maps, positioned ───────────────────────────────────
//
// There is no single graph here. There are four islands — al-Rūm 30:2–6, the
// Arjana corpus, Orientalism §I, and a Yūsuf distillation — and they share no
// nodes and no edges. Only al-Rūm carries a `graph_id`, in `meta_json`, and no
// edge carries one at all, so the islands are recovered by id prefix. That is
// a weakness of the data, and these routes report the four separately rather
// than implying a whole that does not exist.
//
// Layout is computed and stored server-side, not on the client. The web draws
// with a d3 force simulation; iOS has no simulation, no charting library and no
// zoomable graph host, and writing a second solver would guarantee the two
// apps disagree about where a node is. One layout, both clients.

import type { Router } from '../../../shared/src/router';
import { ok, notFound } from '../../../shared/src/response';
import { query, queryOne } from '../../../shared/src/db';
import type { WorldviewEnv } from '../env';
import { GraphRepo } from '../repositories/graph.repo';
import { dual } from './prefix';

/** The four islands, by the id prefix that is the only thing separating them. */
const ISLANDS = [
  { id: 'al-rum',      title: 'al-Rūm 30:2–6 — claim and counter-claim', prefix: 'wv_node_qs30_2_6_' },
  { id: 'arjana',      title: 'Muslims in the Western Imagination',      prefix: 'node-arjana-' },
  { id: 'orientalism', title: 'Orientalism §I — the character map',      prefix: 'wvn-orient-s1-' },
  { id: 'yusuf',       title: 'Sūrat Yūsuf — distillation',              prefix: 'wv_node_q12_' },
] as const;

export function graphRoutes(router: Router<WorldviewEnv>) {

  // GET /wv/graphs — the islands, with honest counts.
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

  // GET /wv/graphs/:id — nodes, edges, clusters and the legend, in one payload.
  //
  // The legend covers every node and relation type actually present, counted
  // from the rows. It is built this way on purpose: the web client currently
  // folds 24 node types and 96 relation types into six and six through a
  // lookup with a silent fall-through, so an unmapped type is drawn as
  // something it is not. A legend derived from the data cannot do that — an
  // unfamiliar relation appears as itself.
  dual(router, 'get', '/graphs/:id', async (_req, env, { id }) => {
    const island = ISLANDS.find(g => g.id === id);
    if (!island) return notFound(`graph ${id}`);
    const like = `${island.prefix}%`;

    const [nodes, edges, nodeTypes, relTypes] = await Promise.all([
      query<Record<string, unknown>>(
        env.DB_WV,
        // The display labels, the plain text and the slug are not columns —
        // they live inside data_json. Lifted here so a client never has to
        // parse the blob to draw a node.
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
           FROM wv_node_edges WHERE from_node_id LIKE ? AND to_node_id LIKE ?`,
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

    // Nodes with no edge at all. In al-Rūm that is 109 of 136 — the evidence
    // and concept nodes hang off `data_json.claim_id` instead of an edge — so a
    // client that drew only the connected graph would silently drop most of it.
    const linked = new Set<string>();
    for (const e of edges) {
      linked.add(String(e.from_node_id));
      linked.add(String(e.to_node_id));
    }
    const orphans = nodes.filter(n => !linked.has(String(n.id))).map(n => n.id);

    return ok({
      graph: { id: island.id, title: island.title },
      nodes,
      edges,
      legend: {
        nodeTypes: nodeTypes.map(t => ({ key: t.node_type, count: t.n })),
        relationTypes: relTypes.map(t => ({ key: t.relation_type, count: t.n })),
      },
      orphans,
    });
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
