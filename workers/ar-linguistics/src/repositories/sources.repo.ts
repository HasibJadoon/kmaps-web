// ─── SourcesRepo — ar_ling_source metadata (single source of truth) ─────────
// Replaces the SOURCE_META / SOURCES / SOURCE_ORDER constants that used to
// live inline in lexicon.ts, lexicon_v2.ts, lexicon_lane.ts,
// lexicon_mufradat.ts, and lexicon_lisan.ts. After 0016/0017 every lexicon
// source has slug + origin + source_order + bilingual + parser-hint columns
// in D1, so this repo is the only place worker code reads source metadata.
//
// Caller pattern:
//
//   const repo  = new SourcesRepo(env.DB_AL);
//   const src   = await repo.bySlug('raghib_mufradat');
//   const all   = await repo.inDisplayOrder();
//   const some  = await repo.bySlugs(['lane_lexicon', 'qamus_muhit']);
//
// Per-request memoisation: each call (re)reads D1. There's no module-level
// cache because Cloudflare Workers instances are short-lived and a stale row
// here would mis-label every entry response. If a route makes multiple lookups
// (e.g. group entries by source then enrich each group), the caller can hold
// onto the returned objects rather than re-querying.

import { query, queryOne } from '../../../shared/src/db';

/** A normalised lexicon-source row. Every field corresponds 1:1 to a column
 *  on ar_ling_source after migration 0016 + seed 0017. `slug` is null for
 *  rows that don't correspond to a TS-side identifier (orphaned duplicates,
 *  scholarship sources, synonym datasets) — those are filtered out by every
 *  query below. */
export interface LexiconSource {
  id:                 string;        // D1 primary key (e.g. SRC:KETABONLINE:MUFRADAT)
  slug:               string;        // TS-side identifier used in URLs (e.g. raghib_mufradat)
  title_ar:           string;
  title_short_ar:     string | null; // spine / book-strip name (العين, المفردات)
  title_en:           string | null;
  author_name:        string | null;
  period_label:       string | null;
  origin:             string | null; // lane / ketabonline / thahabi / saaid / qomra
  bilingual:          boolean;       // Lane only
  source_order:       number | null; // catalogue ordering (1 = first)
  footnote_source:    string | null; // 'inline_brackets' | 'footnote_blocks' | 'none' | null
  quran_block_shape:  string | null; // 'inline_verse' | 'cue_only_verse_in_braces' | null
  genre:              string | null;
  author_death_ah:    number | null; // Hijri death year (classical authors)
  author_death_ce:    number | null; // CE death year (Lane etc.); null for living authors
}

interface SourceRow {
  id:                 string;
  slug:               string;
  title_ar:           string;
  title_short_ar:     string | null;
  title_en:           string | null;
  author_name:        string | null;
  period_label:       string | null;
  origin:             string | null;
  bilingual:          number;
  source_order:       number | null;
  footnote_source:    string | null;
  quran_block_shape:  string | null;
  genre:              string | null;
  author_death_ah:    number | null;
  author_death_ce:    number | null;
}

const SELECT = `
  id, slug, title_ar, title_short_ar, title_en, author_name, period_label,
  origin, bilingual, source_order, footnote_source, quran_block_shape, genre,
  author_death_ah, author_death_ce
FROM ar_ling_source`;

function toSource(r: SourceRow): LexiconSource {
  return {
    id:                 r.id,
    slug:               r.slug,
    title_ar:           r.title_ar,
    title_short_ar:     r.title_short_ar ?? null,
    title_en:           r.title_en,
    author_name:        r.author_name,
    period_label:       r.period_label,
    origin:             r.origin,
    bilingual:          r.bilingual === 1,
    source_order:       r.source_order,
    footnote_source:    r.footnote_source,
    quran_block_shape:  r.quran_block_shape,
    genre:              r.genre,
    author_death_ah:    r.author_death_ah ?? null,
    author_death_ce:    r.author_death_ce ?? null,
  };
}

export class SourcesRepo {
  constructor(private db: D1Database) {}

  /** Resolve one source by its TS-style slug. Returns null when the slug is
   *  not registered (no D1 row OR the row exists but its slug column is NULL
   *  — orphaned duplicates from earlier imports). */
  async bySlug(slug: string): Promise<LexiconSource | null> {
    if (!slug) return null;
    const row = await queryOne<SourceRow>(
      this.db,
      `SELECT ${SELECT} WHERE slug = ? LIMIT 1`,
      [slug],
    );
    return row ? toSource(row) : null;
  }

  /** Bulk-resolve many slugs in one query. Returned in the same order as the
   *  input array; missing slugs are simply omitted (no null gaps). Callers
   *  that need to detect missing slugs should diff against the input. */
  async bySlugs(slugs: readonly string[]): Promise<LexiconSource[]> {
    if (!slugs.length) return [];
    const placeholders = slugs.map(() => '?').join(',');
    const rows = await query<SourceRow>(
      this.db,
      `SELECT ${SELECT} WHERE slug IN (${placeholders})`,
      [...slugs],
    );
    // Preserve input order — D1 returns rows in arbitrary order.
    const bySlug = new Map(rows.map(r => [r.slug, r]));
    return slugs
      .map(s => bySlug.get(s))
      .filter((r): r is SourceRow => r != null)
      .map(toSource);
  }

  /** Every active source (slug NOT NULL), in catalogue order. Rows without a
   *  source_order sort to the end alphabetically — keeps newly imported
   *  sources visible until an admin assigns them a position. */
  async inDisplayOrder(): Promise<LexiconSource[]> {
    const rows = await query<SourceRow>(
      this.db,
      `SELECT ${SELECT}
       WHERE slug IS NOT NULL
       ORDER BY (source_order IS NULL), source_order ASC, slug ASC`,
    );
    return rows.map(toSource);
  }

  /** Active sources filtered to one origin pipeline (e.g. all qomra editions
   *  for an admin view). Same ordering rules as inDisplayOrder. */
  async byOrigin(origin: string): Promise<LexiconSource[]> {
    const rows = await query<SourceRow>(
      this.db,
      `SELECT ${SELECT}
       WHERE slug IS NOT NULL AND origin = ?
       ORDER BY (source_order IS NULL), source_order ASC, slug ASC`,
      [origin],
    );
    return rows.map(toSource);
  }

  /** All slugs registered in D1 — useful for validation (e.g. is `:rootSlug`
   *  in this URL a known lexicon?) without paying the cost of fetching every
   *  column. Returned as a Set for O(1) `has()` checks at call sites. */
  async knownSlugs(): Promise<Set<string>> {
    const rows = await query<{ slug: string }>(
      this.db,
      `SELECT slug FROM ar_ling_source WHERE slug IS NOT NULL`,
    );
    return new Set(rows.map(r => r.slug));
  }

  // ─── Display configuration (migration 0039) ──────────────────────────────
  // The per-lexicon rendering contract used to be TypeScript: SOURCE_SLUG
  // constants, LISAN_SLUGS arrays, and hardcoded block_type switches spread
  // across lexicon_lane / lexicon_lisan / lexicon_mufradat / lexicon_five_lens.
  // It is now four rows-per-lexicon in ar_ling_lexicon_display_*. Adding a
  // lexicon is an INSERT, not a route file.

  /** The profile row for one lexicon, or null when the lexicon has no display
   *  setup yet (metadata-only sources, pending ingests). */
  async profileBySlug(slug: string): Promise<LexiconDisplayProfile | null> {
    if (!slug) return null;
    const row = await queryOne<ProfileRow>(
      this.db,
      `SELECT ${PROFILE_SELECT} WHERE source_slug = ? AND status = 'live' LIMIT 1`,
      [slug],
    );
    return row ? toProfile(row) : null;
  }

  /** Every live profile in catalogue order — the payload behind a lexicon
   *  picker. Joined to ar_ling_source so one call yields both the
   *  bibliographic identity and the rendering contract. */
  async profilesInDisplayOrder(): Promise<{ source: SourceResponseMeta; profile: LexiconDisplayProfile }[]> {
    const rows = await query<ProfileRow & SourceRow>(
      this.db,
      `SELECT ${PROFILE_COLS_P},
              s.id, s.slug, s.title_ar, s.title_en, s.author_name, s.period_label,
              s.origin, s.bilingual, s.source_order, s.footnote_source,
              s.quran_block_shape, s.genre, s.author_death_ah, s.author_death_ce
         FROM ar_ling_lexicon_display_profile p
         JOIN ar_ling_source s ON s.slug = p.source_slug
        WHERE p.status = 'live'
        ORDER BY p.display_order ASC`,
    );
    return rows.map(r => ({ source: toResponseMeta(toSource(r)), profile: toProfile(r) }));
  }

  /** Ordered panel list for one lexicon. Per-source overrides win over the
   *  kind defaults via COALESCE, so a lexicon only stores what it changes. */
  async sectionsBySlug(slug: string): Promise<LexiconDisplaySection[]> {
    const rows = await query<SectionRow>(
      this.db,
      `SELECT sec.kind_code,
              sec.panel_key,
              sec.seq,
              COALESCE(sec.label_ar,     k.name_ar)      AS label_ar,
              COALESCE(sec.label_en,     k.name_en)      AS label_en,
              COALESCE(sec.label_ur,     k.name_ur)      AS label_ur,
              COALESCE(sec.is_visible,   k.is_visible)   AS is_visible,
              COALESCE(sec.is_collapsed, k.is_collapsed) AS is_collapsed,
              k.style_key, k.kind_family, k.icon, sec.block_count
         FROM ar_ling_lexicon_display_section sec
         JOIN ar_ling_lexicon_display_block_kind k ON k.kind_code = sec.kind_code
        WHERE sec.source_slug = ? AND k.status = 'live'
        ORDER BY sec.seq ASC`,
      [slug],
    );
    return rows.map(toSection);
  }

  /** Parser exceptions for one lexicon. Most lexicons have none — their
   *  behaviour is fully described by profile.footnote_mode / quran_cue_mode. */
  async rulesBySlug(slug: string): Promise<LexiconDisplayRule[]> {
    const rows = await query<RuleRow>(
      this.db,
      `SELECT rule_key, pattern, flags, replacement, seq, note_en
         FROM ar_ling_lexicon_display_rule
        WHERE source_slug = ? AND status = 'live'
        ORDER BY rule_key ASC, seq ASC`,
      [slug],
    );
    return rows.map(r => ({
      rule_key:    r.rule_key,
      pattern:     r.pattern,
      flags:       r.flags,
      replacement: r.replacement,
      seq:         r.seq,
      note_en:     r.note_en,
    }));
  }

  /** Everything a renderer needs for one lexicon, in three queries. Returns
   *  null when the slug is unknown or has no display profile — callers should
   *  404 rather than fall back to a default shape, since a wrong contract
   *  renders a book in another book's clothes. */
  async displayConfig(slug: string): Promise<LexiconDisplayConfig | null> {
    const [source, profile] = await Promise.all([
      this.bySlug(slug),
      this.profileBySlug(slug),
    ]);
    if (!source || !profile) return null;
    const [sections, rules] = await Promise.all([
      this.sectionsBySlug(slug),
      this.rulesBySlug(slug),
    ]);
    return { source, profile, sections, rules };
  }
}

// ─── Display config types + row mappers ─────────────────────────────────────

export type FootnoteMode  = 'inline_brackets' | 'footnote_blocks' | 'marker_paren' | 'none';
export type QuranCueMode  = 'inline_verse' | 'cue_only_verse_in_braces' | 'refs_table' | 'none';
export type ComposerKey   = 'classical_prose' | 'lane_entry' | 'synthesis_lens';

export interface LexiconDisplayProfile {
  source_slug:       string;
  composer_key:      ComposerKey;
  is_bilingual:      boolean;
  footnote_mode:     FootnoteMode;
  quran_cue_mode:    QuranCueMode;
  headword_mode:     string;
  page_anchor_mode:  string;
  script_key:        string;
  translation_langs: string[];
  display_order:     number;
}

export interface LexiconDisplaySection {
  kind_code:    string;
  kind_family:  'classical' | 'synthesis';
  panel_key:    string;
  seq:          number;
  label_ar:     string;
  label_en:     string;
  label_ur:     string;
  style_key:    string;   // 'mushaf' → UthmanicHafs; everything else → AmiriQuran
  icon:         string | null;
  is_visible:   boolean;
  is_collapsed: boolean;
  block_count:  number;   // observed at seed time — advisory, never a constraint
}

export interface LexiconDisplayRule {
  rule_key:    string;
  pattern:     string | null;
  flags:       string | null;
  replacement: string | null;
  seq:         number;
  note_en:     string | null;
}

export interface LexiconDisplayConfig {
  source:   LexiconSource;
  profile:  LexiconDisplayProfile;
  sections: LexiconDisplaySection[];
  rules:    LexiconDisplayRule[];
}

interface ProfileRow {
  source_slug:       string;
  composer_key:      string;
  is_bilingual:      number;
  footnote_mode:     string;
  quran_cue_mode:    string;
  headword_mode:     string;
  page_anchor_mode:  string;
  script_key:        string;
  translation_langs: string;   // JSON array
  display_order:     number;
}

interface SectionRow {
  kind_code:    string;
  kind_family:  string;
  panel_key:    string;
  seq:          number;
  label_ar:     string;
  label_en:     string;
  label_ur:     string;
  style_key:    string;
  icon:         string | null;
  is_visible:   number;
  is_collapsed: number;
  block_count:  number;
}

interface RuleRow {
  rule_key:    string;
  pattern:     string | null;
  flags:       string | null;
  replacement: string | null;
  seq:         number;
  note_en:     string | null;
}

/** Profile columns, unqualified. Kept separate from the FROM clause so the
 *  joined query in profilesInDisplayOrder() can alias them without string
 *  surgery on a combined SELECT. */
const PROFILE_COLS = [
  'source_slug', 'composer_key', 'is_bilingual', 'footnote_mode', 'quran_cue_mode',
  'headword_mode', 'page_anchor_mode', 'script_key', 'translation_langs', 'display_order',
] as const;

const PROFILE_SELECT = `
  ${PROFILE_COLS.join(', ')}
FROM ar_ling_lexicon_display_profile`;

const PROFILE_COLS_P = PROFILE_COLS.map(c => `p.${c}`).join(', ');

function toProfile(r: ProfileRow): LexiconDisplayProfile {
  let langs: string[] = [];
  try {
    const parsed = JSON.parse(r.translation_langs || '[]');
    if (Array.isArray(parsed)) langs = parsed.filter((x): x is string => typeof x === 'string');
  } catch {
    // CHECK(json_valid) guards the column, so this is unreachable in practice.
    // Degrade to "no translations" rather than failing the whole entry render.
  }
  return {
    source_slug:       r.source_slug,
    composer_key:      r.composer_key as ComposerKey,
    is_bilingual:      r.is_bilingual === 1,
    footnote_mode:     r.footnote_mode as FootnoteMode,
    quran_cue_mode:    r.quran_cue_mode as QuranCueMode,
    headword_mode:     r.headword_mode,
    page_anchor_mode:  r.page_anchor_mode,
    script_key:        r.script_key,
    translation_langs: langs,
    display_order:     r.display_order,
  };
}

function toSection(r: SectionRow): LexiconDisplaySection {
  return {
    kind_code:    r.kind_code,
    kind_family:  r.kind_family === 'synthesis' ? 'synthesis' : 'classical',
    panel_key:    r.panel_key,
    seq:          r.seq,
    label_ar:     r.label_ar,
    label_en:     r.label_en,
    label_ur:     r.label_ur,
    style_key:    r.style_key,
    icon:         r.icon,
    is_visible:   r.is_visible === 1,
    is_collapsed: r.is_collapsed === 1,
    block_count:  r.block_count,
  };
}

// ─── Light-weight UI projection used by lexicon route responses ─────────────
// Five of the six existing route handlers shape their per-source response
// blocks identically:
//   { slug, title_ar, title_en, author, period }
// `toResponseMeta` centralises that projection so all five emit the same
// keys — eliminating drift between e.g. `period` (lexicon.ts) and
// `period_label` (lexicon_lisan.ts) seen in the audit.
export interface SourceResponseMeta {
  slug:     string;
  title_ar: string;
  title_en: string;
  author:   string;
  period:   string;
}

export function toResponseMeta(s: LexiconSource): SourceResponseMeta {
  return {
    slug:     s.slug,
    title_ar: s.title_ar,
    title_en: s.title_en ?? s.title_ar,
    author:   s.author_name ?? '',
    period:   s.period_label ?? '',
  };
}
