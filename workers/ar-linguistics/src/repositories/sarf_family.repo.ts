// ─── SarfFamilyRepo — the ṣarf-family panel, registry-resolved ───────────────
//
// One `sarf_family` block per (root, lexicon) in ar_ling_lexicon_block. The
// block's data_json is authored by the lexicon-builder pipeline (see
// docs/quran-morphology-step-process.md) and stores every grammatical label as
// a bare `GT:category:term` id — never a display string. This repo is the only
// place that turns those ids back into names, by looking them up in
// ar_ling_gram_term, so the client never learns the registry exists.
//
// Two invariants worth stating, because both were violated by earlier
// per-lexicon code this replaces:
//
//   • Resolution is a deep walk, not a field list. Any string matching `GT:…`
//     anywhere in the block becomes a term object. When the pipeline adds a
//     code to `nominals[]` or a field that doesn't exist yet, it resolves on
//     its own — there is no list here to forget to update.
//   • Ordering comes from D1 (`author_death_ah`, then `source_order`), not a
//     hardcoded slug array. Adding a lexicon is a row, never an edit here.
//
// Caller pattern:
//
//   const repo   = new SarfFamilyRepo(env.DB_AL);
//   const blocks = await repo.blocksByRoot(rootNorm('بين'));
//   const view   = await repo.resolveBlocks(blocks);

import { query } from '../../../shared/src/db';

// ── Registry ────────────────────────────────────────────────────────────────

/** Every `GT:` id in a sarf_family block is replaced by one of these. Callers
 *  render `name_*`; `code` is kept so the UI can deep-link to the term page. */
export interface GramTermRef {
  code:      string;
  category:  string | null;   // pos | form_family | root_type | transitivity | derivation_type | …
  name_ar:   string | null;
  name_en:   string | null;
  name_ur:   string | null;
  short_ar:  string | null;
  short_en:  string | null;
  short_ur:  string | null;
  /** True when the code is absent from ar_ling_gram_term. Surfaced rather
   *  than swallowed — a silently blank label reads as "no data" when the real
   *  problem is a typo in the block. */
  unresolved?: true;
}

interface TermRow {
  id:           string;
  category_key: string;
  name_ar:      string;
  name_en:      string;
  name_ur:      string;
  short_ar:     string | null;
  short_en:     string | null;
  short_ur:     string | null;
}

const GRAM_CODE = /^GT:[a-z0-9_]+:[a-z0-9_]+$/i;

/** True for a string that is a registry id rather than authored prose. */
export function isGramCode(value: unknown): value is string {
  return typeof value === 'string' && GRAM_CODE.test(value);
}

// ── Block rows ──────────────────────────────────────────────────────────────

export interface SarfBlockRow {
  block_id:        string;
  source_slug:     string;
  block_path:      string;
  block_seq:       number;
  printed_page:    number | null;
  printed_anchor:  string | null;
  origin:          string;
  origin_ref:      string | null;
  data_json:       string;
  // joined from ar_ling_source (LEFT JOIN — a block can outlive its source row)
  title_ar:        string | null;
  title_en:        string | null;
  author_name:     string | null;
  author_death_ah: number | null;
  author_death_ce: number | null;
  period_label:    string | null;
  genre:           string | null;
  source_order:    number | null;
}

const SELECT_BLOCK = `
  SELECT b.id            AS block_id,
         b.source_slug,
         b.block_path,
         b.block_seq,
         b.printed_page,
         b.printed_anchor,
         b.origin,
         b.origin_ref,
         b.data_json,
         s.title_ar,
         s.title_en,
         s.author_name,
         s.author_death_ah,
         s.author_death_ce,
         s.period_label,
         s.genre,
         s.source_order
    FROM ar_ling_lexicon_block b
    LEFT JOIN ar_ling_source s ON s.slug = b.source_slug
   WHERE b.block_type = 'sarf_family'`;

// Chronological by the author's death year — the order a reader of the
// tradition expects. Undated authors (Lane, Sinai, the K-Maps synthesis lens)
// are moderns and sort last, among themselves by catalogue order.
const CHRONOLOGICAL = `
   ORDER BY (s.author_death_ah IS NULL) ASC,
            s.author_death_ah           ASC,
            s.source_order              ASC,
            b.source_slug               ASC,
            b.block_seq                 ASC`;

// ── Resolved view types ─────────────────────────────────────────────────────

export interface Trilingual {
  ar: string | null;
  en: string | null;
  ur: string | null;
}

/** Bibliographic identity of one lexicon, as it appears on a sarf response. */
export interface SarfSourceMeta {
  slug:            string;
  title_ar:        string | null;
  title_en:        string | null;
  author_name:     string | null;
  author_death_ah: number | null;
  author_death_ce: number | null;
  period_label:    string | null;
  genre:           string | null;
}

/** Where in the printed book this panel came from. */
export interface SarfBlockMeta {
  block_id:       string;
  block_path:     string;
  block_seq:      number;
  printed_page:   number | null;
  printed_anchor: string | null;
  origin:         string;
  origin_ref:     string | null;
}

export interface SarfBook {
  chronological_order: number;
  source:              SarfSourceMeta;
  block:               SarfBlockMeta;
  /** The block's data_json with every `GT:` code replaced by a GramTermRef.
   *  Every other field — Arabic verbatim, glosses, senses, āyah cues — is
   *  passed through untouched. */
  sarf_family:         Record<string, unknown>;
}

/** One book's use of a cross-book pole family. */
export interface PoleFamilyUsage {
  source_slug: string;
  /** The book-local pole key (`forms[].pole` / `derivations[].facet`) that
   *  carries this family in this book — null when the item names no pole. */
  pole_key:    string | null;
  /** That pole's trilingual label, from the book's own `poles[]`. */
  label:       Trilingual | null;
  form_ids:    string[];
  item_count:  number;
}

/** A pole family as it spans the corpus. Derived from the blocks on every
 *  request — never stored, so it cannot drift from the data it describes.
 *  (`PF:` codes have no registry table; their labels live in each book's
 *  `poles[]` and are harvested here.) */
export interface PoleFamily {
  code:         string;
  /** Representative label: the earliest book that names this family. */
  label:        Trilingual | null;
  source_count: number;
  item_count:   number;
  used_by:      PoleFamilyUsage[];
}

export interface SarfRootView {
  root_norm:        string;
  source_count:     number;
  pole_families:    PoleFamily[];
  books:            SarfBook[];
  /** `GT:` codes present in the blocks but missing from ar_ling_gram_term.
   *  Empty on healthy data. */
  unresolved_codes: string[];
}

/** One row of the coverage index: which books carry a ṣarf family for a root. */
export interface SarfRootCoverage {
  root_norm:    string;
  source_count: number;
  sources:      string[];   // chronological
}

// ── Pure helpers (exported for testing) ─────────────────────────────────────

/** Collect every registry code anywhere in a parsed block. */
export function collectGramCodes(value: unknown, into: Set<string> = new Set()): Set<string> {
  if (isGramCode(value)) { into.add(value); return into; }
  if (Array.isArray(value)) { for (const v of value) collectGramCodes(v, into); return into; }
  if (value && typeof value === 'object') {
    for (const v of Object.values(value as Record<string, unknown>)) collectGramCodes(v, into);
  }
  return into;
}

/** Deep-copy `value`, replacing every registry code with its term object.
 *  Scalars that aren't codes, and every non-code string, are returned as-is —
 *  authored Arabic is never rewritten. */
export function resolveGramCodes(value: unknown, terms: Map<string, GramTermRef>): unknown {
  if (isGramCode(value)) return terms.get(value) ?? unresolvedTerm(value);
  if (Array.isArray(value)) return value.map(v => resolveGramCodes(v, terms));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = resolveGramCodes(v, terms);
    }
    return out;
  }
  return value;
}

function unresolvedTerm(code: string): GramTermRef {
  return {
    code,
    category: code.split(':')[1] ?? null,
    name_ar: null, name_en: null, name_ur: null,
    short_ar: null, short_en: null, short_ur: null,
    unresolved: true,
  };
}

function toTrilingual(value: unknown): Trilingual | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  const pick = (k: string) => (typeof v[k] === 'string' ? (v[k] as string) : null);
  const out = { ar: pick('ar'), en: pick('en'), ur: pick('ur') };
  return out.ar || out.en || out.ur ? out : null;
}

/** Build the cross-book pole-family table from blocks already in
 *  chronological order — `label` therefore resolves to the earliest naming. */
export function computePoleFamilies(
  blocks: { source_slug: string; sarf_family: Record<string, unknown> }[],
): PoleFamily[] {
  const families = new Map<string, PoleFamily>();

  for (const { source_slug, sarf_family } of blocks) {
    // Book-local pole key → its trilingual label.
    const poleLabels = new Map<string, Trilingual | null>();
    for (const pole of asArray(sarf_family.poles)) {
      const key = readString(pole, 'key');
      if (key) poleLabels.set(key, toTrilingual((pole as Record<string, unknown>).label));
    }

    // forms[] name their pole as `pole`; derivations[] as `facet`.
    const items = [...asArray(sarf_family.forms), ...asArray(sarf_family.derivations)];
    const perFamily = new Map<string, PoleFamilyUsage>();

    for (const item of items) {
      const code = readString(item, 'pole_family');
      if (!code) continue;
      const poleKey = readString(item, 'pole') ?? readString(item, 'facet');
      const formId  = readString(item, 'form_id');

      let usage = perFamily.get(code);
      if (!usage) {
        usage = {
          source_slug,
          pole_key: poleKey,
          label: poleKey ? poleLabels.get(poleKey) ?? null : null,
          form_ids: [],
          item_count: 0,
        };
        perFamily.set(code, usage);
      }
      if (formId) usage.form_ids.push(formId);
      usage.item_count += 1;
    }

    for (const [code, usage] of perFamily) {
      let family = families.get(code);
      if (!family) {
        family = { code, label: null, source_count: 0, item_count: 0, used_by: [] };
        families.set(code, family);
      }
      family.label ??= usage.label;
      family.source_count += 1;
      family.item_count += usage.item_count;
      family.used_by.push(usage);
    }
  }

  // Widest attestation first — the families the tradition agrees on lead.
  return [...families.values()].sort(
    (a, b) => b.source_count - a.source_count || a.code.localeCompare(b.code),
  );
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readString(item: unknown, key: string): string | null {
  if (!item || typeof item !== 'object') return null;
  const v = (item as Record<string, unknown>)[key];
  return typeof v === 'string' && v.length > 0 ? v : null;
}

function toSourceMeta(r: SarfBlockRow): SarfSourceMeta {
  return {
    slug:            r.source_slug,
    title_ar:        r.title_ar,
    title_en:        r.title_en,
    author_name:     r.author_name,
    author_death_ah: r.author_death_ah,
    author_death_ce: r.author_death_ce,
    period_label:    r.period_label,
    genre:           r.genre,
  };
}

function toBlockMeta(r: SarfBlockRow): SarfBlockMeta {
  return {
    block_id:       r.block_id,
    block_path:     r.block_path,
    block_seq:      r.block_seq,
    printed_page:   r.printed_page,
    printed_anchor: r.printed_anchor,
    origin:         r.origin,
    origin_ref:     r.origin_ref,
  };
}

// ── Repository ──────────────────────────────────────────────────────────────

export class SarfFamilyRepo {
  constructor(private db: D1Database) {}

  /** Every book's ṣarf family for one root, chronological. */
  blocksByRoot(rootNorm: string): Promise<SarfBlockRow[]> {
    return query<SarfBlockRow>(
      this.db,
      `${SELECT_BLOCK} AND b.root_norm = ?${CHRONOLOGICAL}`,
      [rootNorm],
    );
  }

  /** One book's ṣarf family for one root. */
  blocksByRootAndSource(rootNorm: string, sourceSlug: string): Promise<SarfBlockRow[]> {
    return query<SarfBlockRow>(
      this.db,
      `${SELECT_BLOCK} AND b.root_norm = ? AND b.source_slug = ?${CHRONOLOGICAL}`,
      [rootNorm, sourceSlug],
    );
  }

  /** Which roots have a ṣarf family, and in which books. */
  async coverage(): Promise<SarfRootCoverage[]> {
    const rows = await query<{ root_norm: string; source_slug: string }>(
      this.db,
      `SELECT b.root_norm, b.source_slug
         FROM ar_ling_lexicon_block b
         LEFT JOIN ar_ling_source s ON s.slug = b.source_slug
        WHERE b.block_type = 'sarf_family'
        ORDER BY b.root_norm ASC,
                 (s.author_death_ah IS NULL) ASC,
                 s.author_death_ah ASC,
                 s.source_order ASC,
                 b.source_slug ASC`,
    );
    const byRoot = new Map<string, string[]>();
    for (const r of rows) {
      const list = byRoot.get(r.root_norm);
      if (list) list.push(r.source_slug);
      else byRoot.set(r.root_norm, [r.source_slug]);
    }
    return [...byRoot.entries()].map(([root_norm, sources]) => ({
      root_norm,
      source_count: sources.length,
      sources,
    }));
  }

  /** Look up the given registry ids. Chunked so a large block can never
   *  exceed D1's bind-variable ceiling. */
  async terms(codes: Iterable<string>): Promise<Map<string, GramTermRef>> {
    const ids = [...new Set(codes)];
    const out = new Map<string, GramTermRef>();
    for (let i = 0; i < ids.length; i += 100) {
      const chunk = ids.slice(i, i + 100);
      const rows = await query<TermRow>(
        this.db,
        `SELECT id, category_key, name_ar, name_en, name_ur, short_ar, short_en, short_ur
           FROM ar_ling_gram_term
          WHERE id IN (${chunk.map(() => '?').join(',')})`,
        chunk,
      );
      for (const r of rows) {
        out.set(r.id, {
          code:     r.id,
          category: r.category_key,
          name_ar:  r.name_ar,
          name_en:  r.name_en,
          name_ur:  r.name_ur,
          short_ar: r.short_ar,
          short_en: r.short_en,
          short_ur: r.short_ur,
        });
      }
    }
    return out;
  }

  /** Parse, resolve and assemble block rows into the response view. One
   *  registry round-trip for the whole set, regardless of book count. */
  async resolveBlocks(rows: SarfBlockRow[], rootNormValue: string): Promise<SarfRootView> {
    const parsed = rows.map(r => ({ row: r, data: parseBlock(r) }));

    const codes = new Set<string>();
    for (const { data } of parsed) collectGramCodes(data, codes);
    const terms = await this.terms(codes);

    const books: SarfBook[] = parsed.map(({ row, data }, i) => ({
      chronological_order: i + 1,
      source:              toSourceMeta(row),
      block:               toBlockMeta(row),
      sarf_family:         resolveGramCodes(data, terms) as Record<string, unknown>,
    }));

    // Pole families are read off the *unresolved* blocks: `PF:` codes are not
    // registry ids and are passed through verbatim either way, but reading the
    // raw shape keeps this independent of how resolution rewrites the tree.
    const poleFamilies = computePoleFamilies(
      parsed.map(({ row, data }) => ({ source_slug: row.source_slug, sarf_family: data })),
    );

    const unresolved = [...codes].filter(c => !terms.has(c)).sort();

    return {
      root_norm:        rootNormValue,
      source_count:     books.length,
      pole_families:    poleFamilies,
      books,
      unresolved_codes: unresolved,
    };
  }
}

/** A block whose data_json is unparseable is a data defect, not a 500 — the
 *  other books still render. The bad book reports itself in `parse_error`. */
function parseBlock(row: SarfBlockRow): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(row.data_json);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return { parse_error: 'data_json is not a JSON object' };
  } catch (e) {
    return { parse_error: `data_json is not valid JSON: ${(e as Error).message}` };
  }
}
