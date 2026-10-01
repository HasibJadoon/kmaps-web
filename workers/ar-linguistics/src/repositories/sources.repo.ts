import { query, queryOne } from '../../../shared/src/db';

export interface LexiconSource {
  id:                 string;
  slug:               string;
  title_ar:           string;
  title_short_ar:     string | null;
  title_en:           string | null;
  author_name:        string | null;
  period_label:       string | null;
  origin:             string | null;
  bilingual:          boolean;
  source_order:       number | null;
  footnote_source:    string | null;
  quran_block_shape:  string | null;
  genre:              string | null;
  author_death_ah:    number | null;
  author_death_ce:    number | null;
  title_translit:     string | null;
  title_gloss_en:     string | null;
  author_en:          string | null;
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
  title_translit:     string | null;
  title_gloss_en:     string | null;
  author_en:          string | null;
}

const SELECT = `
  id, slug, title_ar, title_short_ar, title_en, author_name, period_label,
  origin, bilingual, source_order, footnote_source, quran_block_shape, genre,
  author_death_ah, author_death_ce, title_translit, title_gloss_en, author_en
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
    title_translit:     r.title_translit ?? null,
    title_gloss_en:     r.title_gloss_en ?? null,
    author_en:          r.author_en ?? null,
  };
}

export class SourcesRepo {
  constructor(private db: D1Database) {}

  async bySlug(slug: string): Promise<LexiconSource | null> {
    if (!slug) return null;
    const row = await queryOne<SourceRow>(
      this.db,
      `SELECT ${SELECT} WHERE slug = ? LIMIT 1`,
      [slug],
    );
    return row ? toSource(row) : null;
  }

  async bySlugs(slugs: readonly string[]): Promise<LexiconSource[]> {
    if (!slugs.length) return [];
    const placeholders = slugs.map(() => '?').join(',');
    const rows = await query<SourceRow>(
      this.db,
      `SELECT ${SELECT} WHERE slug IN (${placeholders})`,
      [...slugs],
    );

    const bySlug = new Map(rows.map(r => [r.slug, r]));
    return slugs
      .map(s => bySlug.get(s))
      .filter((r): r is SourceRow => r != null)
      .map(toSource);
  }

  async inDisplayOrder(): Promise<LexiconSource[]> {
    const rows = await query<SourceRow>(
      this.db,
      `SELECT ${SELECT}
       WHERE slug IS NOT NULL
       ORDER BY (source_order IS NULL), source_order ASC, slug ASC`,
    );
    return rows.map(toSource);
  }

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

  async knownSlugs(): Promise<Set<string>> {
    const rows = await query<{ slug: string }>(
      this.db,
      `SELECT slug FROM ar_ling_source WHERE slug IS NOT NULL`,
    );
    return new Set(rows.map(r => r.slug));
  }

  async profileBySlug(slug: string): Promise<LexiconDisplayProfile | null> {
    if (!slug) return null;
    const row = await queryOne<ProfileRow>(
      this.db,
      `SELECT ${PROFILE_SELECT} WHERE source_slug = ? AND status = 'live' LIMIT 1`,
      [slug],
    );
    return row ? toProfile(row) : null;
  }

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

export type FootnoteMode  = 'inline_brackets' | 'footnote_blocks' | 'marker_paren' | 'none';
export type QuranCueMode  = 'inline_verse' | 'cue_only_verse_in_braces' | 'refs_table' | 'none';
export type ComposerKey   = 'classical_prose' | 'lane_entry' | 'synthesis_lens' | 'stored_blocks';

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
  style_key:    string;
  icon:         string | null;
  is_visible:   boolean;
  is_collapsed: boolean;
  block_count:  number;
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
  translation_langs: string;
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
