import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

export interface WvNode {
  id: string;
  node_type: string;
  title: string;
  summary: string | null;
  tradition_id: string | null;
  status: string;
  created_at: string;
}

export interface WvEdge {
  id: string;
  from_node_id: string;
  to_node_id: string;
  relation_type: string;
  note: string | null;
  created_at: string;
}

export interface NodeCreate {
  node_type: string;
  title: string;
  summary?: string | null;
  tradition_id?: string | null;
}

export interface EdgeCreate {
  from_node_id: string;
  to_node_id: string;
  relation_type: string;
  note?: string | null;
}

const NODE_COLS = `id, node_type, title, summary, tradition_id, status, created_at`;
const EDGE_COLS = `id, from_node_id, to_node_id, relation_type, note, created_at`;

export class NodeRepo {
  constructor(private db: D1Database) {}

  list(type: string | null, traditionId: string | null, opts: PaginateOptions = {}) {
    const conds: string[]  = [];
    const params: unknown[] = [];
    if (type)       { conds.push('node_type = ?');   params.push(type); }
    if (traditionId){ conds.push('tradition_id = ?'); params.push(traditionId); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<WvNode>(
      this.db,
      `SELECT ${NODE_COLS} FROM wv_nodes ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_nodes ${where}`,
      params, opts,
    );
  }

  findById(id: string): Promise<WvNode | null> {
    return queryOne<WvNode>(
      this.db, `SELECT ${NODE_COLS} FROM wv_nodes WHERE id = ?`, [id],
    );
  }

  edges(nodeId: string): Promise<WvEdge[]> {
    return query<WvEdge>(
      this.db,
      `SELECT ${EDGE_COLS} FROM wv_node_edges WHERE from_node_id = ? ORDER BY relation_type`,
      [nodeId],
    );
  }

  async createNode(input: NodeCreate): Promise<WvNode> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO wv_nodes (id, node_type, title, summary, tradition_id, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'active', ?)`,
      [id, input.node_type, input.title, input.summary ?? null,
       input.tradition_id ?? null, now],
    );
    return (await this.findById(id))!;
  }

  async createEdge(input: EdgeCreate): Promise<WvEdge> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO wv_node_edges (id, from_node_id, to_node_id, relation_type, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, input.from_node_id, input.to_node_id, input.relation_type,
       input.note ?? null, now],
    );
    return (await queryOne<WvEdge>(
      this.db, `SELECT ${EDGE_COLS} FROM wv_node_edges WHERE id = ?`, [id],
    ))!;
  }
}
