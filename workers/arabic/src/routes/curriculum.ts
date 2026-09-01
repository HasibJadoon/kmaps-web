import type { Router } from '../../../shared/src/router';
import { ok, notFound } from '../../../shared/src/response';
import { query, queryOne } from '../../../shared/src/db';
import type { ArabicEnv } from '../env';

/// The curriculum is a tree, not a list: فنّ → باب/قسم → فصل → مسألة. It is
/// the syllabus each discipline is actually taught in, and every node points
/// back at the page of the book it is read from — so a topic is never a bare
/// heading with nothing behind it.

const NODE_COLS = `id, parent_id, discipline, node_type, name_ar, name_en, name_ur,
                   definition_ar, sort_order, depth, path, status, al_refs_json,
                   teach_order, difficulty`;

interface NodeRow {
  id: string;
  parent_id: string | null;
  node_type: string;
  name_ar: string;
  name_en: string | null;
  definition_ar: string | null;
  sort_order: number;
  depth: number;
  status: string;
  al_refs_json: string | null;
  [k: string]: unknown;
}

/// `al_refs_json` was filled by two different passes and holds two shapes: a
/// book keyed to its volume:page, `{"ghalayini":"3:167"}`, and a bare list of
/// AL page-group ids, `["GPG:1687:1734524"]`. Both mean "read it here", so the
/// payload settles them into one form the app does not have to branch on.
function readingRefs(raw: string | null): { book: string; locator: string }[] {
  if (!raw) return [];
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return []; }
  if (Array.isArray(parsed)) {
    return parsed.filter((x): x is string => typeof x === 'string')
      .map((ref) => ({ book: 'al', locator: ref }));
  }
  if (parsed && typeof parsed === 'object') {
    return Object.entries(parsed as Record<string, unknown>)
      .filter(([, v]) => typeof v === 'string')
      .map(([book, locator]) => ({ book, locator: locator as string }));
  }
  return [];
}

export function curriculumRoutes(router: Router<ArabicEnv>) {

  /// The whole tree for one discipline (NH / SF / BL), nested, with the count
  /// of books cited at each node. One call: the outline is small enough that
  /// paging it would only make the reader wait twice.
  router.get('/ar/curriculum/:code', async (_req, env, { code }) => {
    const discipline = (code ?? '').toUpperCase();
    const spine = await queryOne<{ code: string; name_ar: string; name_en: string;
                                  accent: string | null; root_node_id: string | null }>(
      env.DB_AR,
      `SELECT code, slug, name_ar, name_en, name_ur, tagline_en, accent,
              root_node_id, container_id,
              (SELECT COUNT(*) FROM ar_learning_source s WHERE s.discipline = d.code) AS sources
         FROM ar_discipline d WHERE code = ?`,
      [discipline],
    );
    if (!spine) return notFound(`discipline ${discipline}`);

    const rows = await query<NodeRow>(
      env.DB_AR,
      `SELECT ${NODE_COLS},
              (SELECT COUNT(*) FROM ar_node_source s WHERE s.node_id = n.id) AS sources
         FROM ar_grammar_node n
        WHERE discipline = ?
        ORDER BY depth, sort_order, id`,
      [discipline],
    );

    const kids = new Map<string | null, NodeRow[]>();
    for (const r of rows) {
      const list = kids.get(r.parent_id) ?? [];
      list.push(r);
      kids.set(r.parent_id, list);
    }
    const build = (parent: string | null): unknown[] =>
      (kids.get(parent) ?? []).map((n) => {
        const children = build(n.id);
        return {
          id: n.id,
          type: n.node_type,
          nameAr: n.name_ar,
          nameEn: n.name_en,
          definitionAr: n.definition_ar,
          depth: n.depth,
          status: n.status,
          sources: n.sources ?? 0,
          readIn: readingRefs(n.al_refs_json),
          // A leaf is where the reading actually happens; the app draws it
          // differently from a heading, so it should not have to count.
          leafCount: children.length ? countLeaves(children) : 0,
          children,
        };
      });

    const tree = build(null);
    return ok({
      discipline: spine,
      total: rows.length,
      byType: tally(rows, (r) => r.node_type),
      tree,
    });
  });

  /// One node, with the line of headings above it and the books that teach it.
  router.get('/ar/nodes/:id', async (_req, env, { id }) => {
    const node = await queryOne<NodeRow>(
      env.DB_AR, `SELECT ${NODE_COLS} FROM ar_grammar_node WHERE id = ?`, [id],
    );
    if (!node) return notFound(`node ${id}`);

    const ancestry: NodeRow[] = [];
    let cursor = node.parent_id;
    for (let i = 0; cursor && i < 12; i++) {
      const up = await queryOne<NodeRow>(
        env.DB_AR, `SELECT ${NODE_COLS} FROM ar_grammar_node WHERE id = ?`, [cursor],
      );
      if (!up) break;
      ancestry.unshift(up);
      cursor = up.parent_id;
    }

    const [children, sources] = await Promise.all([
      query<NodeRow>(
        env.DB_AR,
        `SELECT ${NODE_COLS} FROM ar_grammar_node WHERE parent_id = ? ORDER BY sort_order, id`,
        [id],
      ),
      query<Record<string, unknown>>(
        env.DB_AR,
        `SELECT s.id, s.source_kind, s.title_ar, s.title_en, s.author_ar, s.author_en,
                s.death_year, s.url, s.platform, s.authority,
                ns.locator, ns.role, ns.timestamp_s, ns.note_ar
           FROM ar_node_source ns
           JOIN ar_learning_source s ON s.id = ns.source_id
          WHERE ns.node_id = ?
          ORDER BY ns.sort_order, s.id`,
        [id],
      ),
    ]);

    return ok({
      node: {
        id: node.id, type: node.node_type, nameAr: node.name_ar, nameEn: node.name_en,
        definitionAr: node.definition_ar, depth: node.depth, status: node.status,
        discipline: node.discipline, readIn: readingRefs(node.al_refs_json),
      },
      ancestry: ancestry.map((a) => ({ id: a.id, nameAr: a.name_ar, nameEn: a.name_en, type: a.node_type })),
      children: children.map((c) => ({
        id: c.id, type: c.node_type, nameAr: c.name_ar, nameEn: c.name_en,
        status: c.status, definitionAr: c.definition_ar,
      })),
      sources,
    });
  });

  /// One book, and the syllabus it is cited in. A library card that cannot be
  /// opened is a bibliography; this is what opening it means here — the places
  /// in the curriculum that read from it.
  router.get('/ar/sources/:id', async (_req, env, { id }) => {
    const source = await queryOne<Record<string, unknown>>(
      env.DB_AR,
      `SELECT id, source_kind, title_ar, title_en, author_ar, author_en, death_year,
              url, platform, edition, locator, lang, discipline, authority,
              al_source_slug, notes_md, meta_json
         FROM ar_learning_source WHERE id = ?`,
      [id],
    );
    if (!source) return notFound(`source ${id}`);

    const cited = await query<Record<string, unknown>>(
      env.DB_AR,
      `SELECT n.id, n.name_ar AS nameAr, n.name_en AS nameEn, n.node_type AS type,
              n.depth, n.discipline, ns.locator, ns.role, ns.timestamp_s AS at,
              ns.note_ar AS noteAr
         FROM ar_node_source ns
         JOIN ar_grammar_node n ON n.id = ns.node_id
        WHERE ns.source_id = ?
        ORDER BY n.discipline, n.depth, n.sort_order`,
      [id],
    );

    return ok({ source, cited });
  });
}

function countLeaves(children: unknown[]): number {
  let n = 0;
  for (const child of children as { children?: unknown[]; leafCount?: number }[]) {
    if (!child.children?.length) n += 1;
    else n += child.leafCount ?? 0;
  }
  return n;
}

function tally<T>(rows: T[], pick: (row: T) => string | null): { key: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = pick(row);
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}
