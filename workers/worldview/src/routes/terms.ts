import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, badRequest } from '../../../shared/src/response';
import { query, queryOne, execute } from '../../../shared/src/db';
import type { WorldviewEnv } from '../env';
import { dual } from './prefix';

const COLS = `id, domain_slug, category_key, term_key, name_en, name_ar, name_ur,
              short_en, definition_en, parent_term_id, tradition_id, concept_ref,
              badge_color, icon, term_order, status, superseded_by`;

interface TermRow {
  id: string;
  domain_slug: string | null;
  category_key: string;
  term_key: string;
  name_en: string;
  parent_term_id: string | null;
  superseded_by: string | null;
  status: string;
  [k: string]: unknown;
}

export function termRoutes(router: Router<WorldviewEnv>) {

  dual(router, 'get', '/terms', async (req, env) => {
    const url = new URL(req.url);
    const conds: string[] = [];
    const params: unknown[] = [];
    const domain = url.searchParams.get('domain');
    const kind   = url.searchParams.get('kind');
    const search = url.searchParams.get('q');
    if (domain) { conds.push('domain_slug = ?'); params.push(domain); }
    if (kind)   { conds.push('category_key = ?'); params.push(kind); }
    if (search) { conds.push('(term_key LIKE ? OR name_en LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
    if (url.searchParams.get('live') === '1') conds.push("status = 'live'");
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

    const rows = await query<TermRow>(
      env.DB_WV,
      `SELECT ${COLS} FROM wv_term ${where}
        ORDER BY category_key, term_order DESC, name_en`,
      params,
    );
    return ok({ terms: rows, total: rows.length });
  });

  dual(router, 'get', '/terms/kinds', async (_req, env) =>
    ok({
      kinds: await query<{ category_key: string; n: number; unassigned: number }>(
        env.DB_WV,
        `SELECT category_key, COUNT(*) AS n,
                SUM(CASE WHEN domain_slug IS NULL THEN 1 ELSE 0 END) AS unassigned
           FROM wv_term GROUP BY category_key ORDER BY n DESC`,
      ),
    }));

  dual(router, 'get', '/terms/tree', async (req, env) => {
    const url = new URL(req.url);
    const domain = url.searchParams.get('domain');
    const kind   = url.searchParams.get('kind');
    const conds: string[] = ["status = 'live'"];
    const params: unknown[] = [];
    if (domain) { conds.push('domain_slug = ?'); params.push(domain); }
    if (kind)   { conds.push('category_key = ?'); params.push(kind); }

    const rows = await query<TermRow>(
      env.DB_WV,
      `SELECT ${COLS} FROM wv_term WHERE ${conds.join(' AND ')}
        ORDER BY term_order DESC, name_en`,
      params,
    );
    const byParent = new Map<string | null, TermRow[]>();
    for (const r of rows) {
      const key = r.parent_term_id;
      const bucket = byParent.get(key);
      if (bucket) bucket.push(r); else byParent.set(key, [r]);
    }
    const nest = (parent: string | null): unknown[] =>
      (byParent.get(parent) ?? []).map(t => ({ ...t, children: nest(t.id) }));
    return ok({ tree: nest(null), total: rows.length });
  });

  dual(router, 'get', '/terms/:id', async (_req, env, { id }) => {
    const term = await queryOne<TermRow>(env.DB_WV, `SELECT ${COLS} FROM wv_term WHERE id = ?`, [id]);
    if (!term) return notFound(`term ${id}`);

    const ancestry: TermRow[] = [];
    let cursor = term.parent_term_id;
    for (let i = 0; cursor && i < 12; i++) {
      const up = await queryOne<TermRow>(env.DB_WV, `SELECT ${COLS} FROM wv_term WHERE id = ?`, [cursor]);
      if (!up) break;
      ancestry.unshift(up);
      cursor = up.parent_term_id;
    }

    const children = await query<TermRow>(
      env.DB_WV, `SELECT ${COLS} FROM wv_term WHERE parent_term_id = ? ORDER BY name_en`, [id],
    );

    let usedBy = 0;
    if (term.category_key === 'node_type') {
      usedBy = (await queryOne<{ n: number }>(
        env.DB_WV, `SELECT COUNT(*) AS n FROM wv_nodes WHERE node_type = ?`, [term.term_key]))?.n ?? 0;
    } else if (term.category_key === 'relation_type') {
      usedBy = (await queryOne<{ n: number }>(
        env.DB_WV, `SELECT COUNT(*) AS n FROM wv_node_edges WHERE relation_type = ?`, [term.term_key]))?.n ?? 0;
    }

    return ok({ term, ancestry, children, usedBy });
  });

  dual(router, 'post', '/terms', async (req, env) => {
    const b = await req.json() as Record<string, unknown>;
    const kind = b.category_key ? String(b.category_key) : '';
    const key  = b.term_key ? String(b.term_key) : '';
    if (!kind || !key || !b.name_en) return badRequest('category_key, term_key and name_en required');
    const domain = b.domain_slug ? String(b.domain_slug) : null;
    const id = `WT:${domain ?? '-'}:${key}`;
    await execute(
      env.DB_WV,
      `INSERT INTO wv_term (id, domain_slug, category_key, term_key, name_en, name_ar,
                            short_en, definition_en, parent_term_id, tradition_id, concept_ref)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, domain, kind, key, String(b.name_en),
       (b.name_ar as string | null) ?? null,
       (b.short_en as string | null) ?? null,
       (b.definition_en as string | null) ?? null,
       (b.parent_term_id as string | null) ?? null,
       (b.tradition_id as string | null) ?? null,
       (b.concept_ref as string | null) ?? null],
    );
    return created(await queryOne<TermRow>(env.DB_WV, `SELECT ${COLS} FROM wv_term WHERE id = ?`, [id]));
  });
}
