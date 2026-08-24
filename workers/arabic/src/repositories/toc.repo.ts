// ─── TocRepo — the curriculum table of contents ────────────────────────────────
// km_arabic holds the TOC in two tables that describe the same thing from two
// sides, and neither is redundant:
//
//   ar_curriculum_container / _container_unit  the pedagogical spine — three
//     courses, their modules in teaching order, minutes, skill focus
//   ar_grammar_node                            the classical hierarchy — fann →
//     bāb → faṣl → masʾala, the divisions the sources themselves use
//
// A module names its node (gn_node_id) and every node names its module
// (unit_id), so one read gives a tree that is both a syllabus and a fihris.
// Sources hang off nodes through ar_node_source, which is why the Sources card
// can say which topics cite a given book.

import { query, queryOne } from '../../../shared/src/db';

export interface Discipline {
  code: string;            // NH | SF | BL
  slug: string;
  name_ar: string;
  name_en: string;
  name_ur: string | null;
  tagline_en: string | null;
  root_node_id: string | null;
  container_id: string | null;
  accent: string | null;
  sort_order: number;
}

export interface DisciplineSummary extends Discipline {
  course: {
    id: string; slug: string; title: string; title_ar: string | null;
    level: string | null; description_md: string | null; is_published: number;
  } | null;
  counts: { modules: number; topics: number; sources: number; minutes: number };
}

/** A node of the classical hierarchy, with its children nested under it. */
export interface TocNode {
  id: string;
  parent_id: string | null;
  discipline: string;
  node_type: string;       // fann | qism | bab | fasl | masala
  name_ar: string;
  name_en: string | null;
  name_ur: string | null;
  definition_ar: string | null;
  depth: number;
  path: string | null;
  sort_order: number;
  status: string;
  unit_id: string | null;
  source_count: number;
  children: TocNode[];
}

export interface TocModule {
  id: string;
  parent_id: string | null;
  title: string;
  title_ar: string | null;
  unit_type: string;       // module | lesson
  unit_index: number;
  description_md: string | null;
  estimated_mins: number | null;
  skill_focus: string | null;
  gn_node_id: string | null;
  lessons: TocModule[];    // curriculum lessons filed under this module
  topics: TocNode[];       // the classical subtree the module opens into
}

interface NodeRow {
  id: string; parent_id: string | null; discipline: string; node_type: string;
  name_ar: string; name_en: string | null; name_ur: string | null;
  definition_ar: string | null; depth: number; path: string | null;
  sort_order: number; status: string; unit_id: string | null;
  source_count: number;
}

const NODE_COLS = `
  n.id, n.parent_id, n.discipline, n.node_type, n.name_ar, n.name_en, n.name_ur,
  n.definition_ar, n.depth, n.path, n.sort_order, n.status, n.unit_id,
  (SELECT COUNT(*) FROM ar_node_source s WHERE s.node_id = n.id) AS source_count`;

const UNIT_COLS = `
  u.id, u.parent_id, u.title, u.title_ar, u.unit_type, u.unit_index,
  u.description_md, u.estimated_mins, u.skill_focus, u.gn_node_id`;

function toNode(r: NodeRow): TocNode {
  return { ...r, children: [] };
}

/**
 * Nest a flat, parent-ordered node list into a forest.
 *
 * `roots` decides what counts as a top-level node: any row whose parent is not
 * itself in the list. That keeps the function honest for both a whole
 * discipline (one fann root) and a single module's slice (several siblings).
 */
function nest(rows: NodeRow[]): TocNode[] {
  const byId = new Map<string, TocNode>();
  for (const r of rows) byId.set(r.id, toNode(r));
  const roots: TocNode[] = [];
  for (const r of rows) {
    const node = byId.get(r.id)!;
    const parent = r.parent_id ? byId.get(r.parent_id) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  const sort = (list: TocNode[]) => {
    list.sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id));
    for (const n of list) sort(n.children);
  };
  sort(roots);
  return roots;
}

export class TocRepo {
  constructor(private db: D1Database) {}

  // ── The three domains of Arabic linguistics ────────────────────────────────

  /** Naḥw, Ṣarf and Balāgha with their course and their live counts. */
  async disciplines(): Promise<DisciplineSummary[]> {
    const rows = await query<DisciplineSummary & {
      course_id: string | null; course_slug: string | null;
      course_title: string | null; course_title_ar: string | null;
      course_level: string | null; course_desc: string | null;
      course_published: number | null;
      modules: number; topics: number; sources: number; minutes: number;
    }>(this.db, `
      SELECT d.code, d.slug, d.name_ar, d.name_en, d.name_ur, d.tagline_en,
             d.root_node_id, d.container_id, d.accent, d.sort_order,
             c.id AS course_id, c.slug AS course_slug, c.title AS course_title,
             c.title_ar AS course_title_ar, c.level AS course_level,
             c.description_md AS course_desc, c.is_published AS course_published,
             (SELECT COUNT(*) FROM ar_curriculum_container_unit u
               WHERE u.container_id = c.id AND u.unit_type = 'module')       AS modules,
             (SELECT COUNT(*) FROM ar_grammar_node n
               WHERE n.discipline = d.code)                                   AS topics,
             (SELECT COUNT(*) FROM ar_learning_source s
               WHERE s.discipline = d.code)                                   AS sources,
             (SELECT COALESCE(SUM(u.estimated_mins), 0)
                FROM ar_curriculum_container_unit u
               WHERE u.container_id = c.id AND u.unit_type = 'module')        AS minutes
        FROM ar_discipline d
        LEFT JOIN ar_curriculum_container c ON c.id = d.container_id
       ORDER BY d.sort_order`);

    return rows.map((r) => ({
      code: r.code, slug: r.slug, name_ar: r.name_ar, name_en: r.name_en,
      name_ur: r.name_ur, tagline_en: r.tagline_en, root_node_id: r.root_node_id,
      container_id: r.container_id, accent: r.accent, sort_order: r.sort_order,
      course: r.course_id ? {
        id: r.course_id, slug: r.course_slug!, title: r.course_title!,
        title_ar: r.course_title_ar, level: r.course_level,
        description_md: r.course_desc, is_published: r.course_published ?? 0,
      } : null,
      counts: {
        modules: r.modules, topics: r.topics,
        sources: r.sources, minutes: r.minutes,
      },
    }));
  }

  findDiscipline(codeOrSlug: string): Promise<Discipline | null> {
    return queryOne<Discipline>(this.db, `
      SELECT code, slug, name_ar, name_en, name_ur, tagline_en,
             root_node_id, container_id, accent, sort_order
        FROM ar_discipline
       WHERE code = ? COLLATE NOCASE OR slug = ? COLLATE NOCASE`,
      [codeOrSlug, codeOrSlug]);
  }

  // ── One discipline's full TOC ──────────────────────────────────────────────

  /**
   * Course → modules (in teaching order) → the classical subtree each opens
   * into, plus any curriculum lessons filed under the module.
   *
   * Two reads, not one per module: every unit and every node of the discipline
   * comes back in one pass each, then the tree is assembled in memory.
   */
  async curriculum(discipline: Discipline): Promise<{
    discipline: Discipline;
    course: Record<string, unknown> | null;
    modules: TocModule[];
    /** Nodes of the discipline that no module teaches — the reference tree. */
    unassigned: TocNode[];
  }> {
    const course = discipline.container_id
      ? await queryOne<Record<string, unknown>>(this.db, `
          SELECT id, slug, title, title_ar, container_type, level,
                 description_md, is_published, discipline, sort_order
            FROM ar_curriculum_container WHERE id = ?`,
          [discipline.container_id])
      : null;

    const [units, nodes] = await Promise.all([
      discipline.container_id
        ? query<TocModule & { parent_id: string | null }>(this.db, `
            SELECT ${UNIT_COLS} FROM ar_curriculum_container_unit u
             WHERE u.container_id = ?
             ORDER BY u.unit_index, u.id`,
            [discipline.container_id])
        : Promise.resolve([]),
      query<NodeRow>(this.db, `
        SELECT ${NODE_COLS} FROM ar_grammar_node n
         WHERE n.discipline = ?
         ORDER BY n.depth, n.sort_order, n.id`,
        [discipline.code]),
    ]);

    // Nodes grouped by the module that owns them, then nested within the group.
    const byUnit = new Map<string, NodeRow[]>();
    const orphans: NodeRow[] = [];
    for (const n of nodes) {
      if (n.unit_id) {
        const bucket = byUnit.get(n.unit_id);
        if (bucket) bucket.push(n);
        else byUnit.set(n.unit_id, [n]);
      } else {
        orphans.push(n);
      }
    }

    const modules: TocModule[] = [];
    const byId = new Map<string, TocModule>();
    for (const u of units) {
      const m: TocModule = {
        ...u,
        lessons: [],
        // A module's own root node is the entry point, not a topic under it —
        // drop it so the reader does not see the same title twice.
        topics: nest((byUnit.get(u.id) ?? []).filter((n) => n.id !== u.gn_node_id)),
      };
      byId.set(u.id, m);
    }
    for (const u of units) {
      const m = byId.get(u.id)!;
      const parent = u.parent_id ? byId.get(u.parent_id) : undefined;
      if (parent) parent.lessons.push(m);
      else modules.push(m);
    }

    return { discipline, course, modules, unassigned: nest(orphans) };
  }

  // ── One node ───────────────────────────────────────────────────────────────

  async node(id: string): Promise<{
    node: TocNode; ancestors: NodeRow[]; unit: Record<string, unknown> | null;
    sources: Record<string, unknown>[];
  } | null> {
    const row = await queryOne<NodeRow>(this.db,
      `SELECT ${NODE_COLS} FROM ar_grammar_node n WHERE n.id = ?`, [id]);
    if (!row) return null;

    const [children, ancestors, unit, sources] = await Promise.all([
      query<NodeRow>(this.db,
        `SELECT ${NODE_COLS} FROM ar_grammar_node n
          WHERE n.parent_id = ? ORDER BY n.sort_order, n.id`, [id]),
      // Walk up by parent_id rather than by path: path is a convenience column,
      // parent_id is the relation.
      query<NodeRow>(this.db, `
        WITH RECURSIVE up(id) AS (
          SELECT parent_id FROM ar_grammar_node WHERE id = ?
          UNION ALL
          SELECT g.parent_id FROM ar_grammar_node g JOIN up ON g.id = up.id
           WHERE g.parent_id IS NOT NULL
        )
        SELECT ${NODE_COLS} FROM ar_grammar_node n
          JOIN up ON up.id = n.id ORDER BY n.depth`, [id]),
      row.unit_id
        ? queryOne<Record<string, unknown>>(this.db, `
            SELECT u.id, u.container_id, u.title, u.title_ar, u.unit_type,
                   u.unit_index, u.description_md, u.estimated_mins,
                   u.skill_focus, c.title AS course_title, c.discipline
              FROM ar_curriculum_container_unit u
              LEFT JOIN ar_curriculum_container c ON c.id = u.container_id
             WHERE u.id = ?`, [row.unit_id])
        : Promise.resolve(null),
      this.nodeSources(id),
    ]);

    return {
      node: { ...toNode(row), children: children.map(toNode) },
      ancestors, unit, sources,
    };
  }

  nodeSources(nodeId: string): Promise<Record<string, unknown>[]> {
    return query(this.db, `
      SELECT s.id, s.source_kind, s.title_ar, s.title_en, s.author_ar,
             s.author_en, s.death_year, s.url, s.platform, s.edition,
             s.lang, s.discipline, s.authority, s.al_source_slug,
             ns.locator, ns.role, ns.timestamp_s, ns.note_ar, ns.sort_order
        FROM ar_node_source ns
        JOIN ar_learning_source s ON s.id = ns.source_id
       WHERE ns.node_id = ?
       ORDER BY ns.sort_order, s.id`, [nodeId]);
  }
}
