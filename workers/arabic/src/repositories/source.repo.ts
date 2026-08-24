// ─── SourceRepo — ar_learning_source / ar_node_source ──────────────────────────
// Every book, matn and lecture the curriculum leans on, and the topics that
// cite each one. Sources used to surface only where a node happened to mention
// them, which meant a book with no cited topic was invisible; the list here is
// the source table itself, so nothing hides.

import { query, queryOne } from '../../../shared/src/db';

export interface LearningSource {
  id: string;
  source_kind: string;      // book | video | article | matn
  title_ar: string | null;
  title_en: string | null;
  author_ar: string | null;
  author_en: string | null;
  death_year: string | null;
  url: string | null;
  platform: string | null;
  edition: string | null;
  locator: string | null;
  lang: string | null;
  discipline: string | null; // NH | SF | BL
  authority: string;         // classical | primary_modern | pedagogical | secondary
  al_source_slug: string | null;
  notes_md: string | null;
  cited_by: number;          // how many TOC nodes cite it
}

export interface SourceGroup {
  discipline: string | null;
  name_ar: string | null;
  name_en: string;
  accent: string | null;
  sources: LearningSource[];
}

const COLS = `
  s.id, s.source_kind, s.title_ar, s.title_en, s.author_ar, s.author_en,
  s.death_year, s.url, s.platform, s.edition, s.locator, s.lang,
  s.discipline, s.authority, s.al_source_slug, s.notes_md,
  (SELECT COUNT(*) FROM ar_node_source ns WHERE ns.source_id = s.id) AS cited_by`;

// Classical first, then the modern commentaries, then teaching material —
// the order a reader would want to be handed them in.
const AUTHORITY_RANK = `
  CASE s.authority
    WHEN 'classical'      THEN 0
    WHEN 'matn'           THEN 1
    WHEN 'primary_modern' THEN 2
    WHEN 'pedagogical'    THEN 3
    ELSE 4
  END`;

export class SourceRepo {
  constructor(private db: D1Database) {}

  list(discipline?: string | null, kind?: string | null): Promise<LearningSource[]> {
    const where: string[] = [];
    const params: unknown[] = [];
    if (discipline) { where.push('s.discipline = ? COLLATE NOCASE'); params.push(discipline); }
    if (kind)       { where.push('s.source_kind = ?');               params.push(kind); }
    return query<LearningSource>(this.db, `
      SELECT ${COLS} FROM ar_learning_source s
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY ${AUTHORITY_RANK}, s.death_year, s.id`, params);
  }

  /** Every source, grouped under the discipline it serves — the Sources card. */
  async grouped(): Promise<SourceGroup[]> {
    const [sources, disciplines] = await Promise.all([
      this.list(),
      query<{ code: string; name_ar: string; name_en: string; accent: string | null; sort_order: number }>(
        this.db,
        `SELECT code, name_ar, name_en, accent, sort_order FROM ar_discipline ORDER BY sort_order`),
    ]);

    const groups: SourceGroup[] = disciplines.map((d) => ({
      discipline: d.code, name_ar: d.name_ar, name_en: d.name_en,
      accent: d.accent, sources: [],
    }));
    const byCode = new Map(groups.map((g) => [g.discipline, g]));

    // A source whose discipline is unset (or names a discipline that is not one
    // of the three) still has to appear — it lands in a shared group rather
    // than being silently dropped.
    let shared: SourceGroup | null = null;
    for (const s of sources) {
      const group = s.discipline ? byCode.get(s.discipline) : undefined;
      if (group) { group.sources.push(s); continue; }
      shared ??= { discipline: null, name_ar: null, name_en: 'Shared', accent: null, sources: [] };
      shared.sources.push(s);
    }
    if (shared) groups.push(shared);

    return groups.filter((g) => g.sources.length > 0);
  }

  async findById(id: string): Promise<{
    source: LearningSource; cited_at: Record<string, unknown>[];
  } | null> {
    const source = await queryOne<LearningSource>(this.db,
      `SELECT ${COLS} FROM ar_learning_source s WHERE s.id = ?`, [id]);
    if (!source) return null;

    const cited_at = await query(this.db, `
      SELECT n.id, n.name_ar, n.name_en, n.node_type, n.depth, n.path,
             n.discipline, n.unit_id, u.title AS unit_title,
             ns.locator, ns.role, ns.timestamp_s, ns.note_ar
        FROM ar_node_source ns
        JOIN ar_grammar_node n ON n.id = ns.node_id
        LEFT JOIN ar_curriculum_container_unit u ON u.id = n.unit_id
       WHERE ns.source_id = ?
       ORDER BY n.depth, n.path`, [id]);

    return { source, cited_at };
  }
}
