// ─── contract · the display spec ─────────────────────────────────────────────
//
// What a layer of a root, lemma or word IS, shaped for reading.
//
// Three clients render this data — the Angular app, the iOS app and the macOS
// Studio overlays — and until now each decided for itself how a layer should
// look. iOS grew a per-band view system in Swift; Studio grew scene kinds; the
// web was starting a third copy. The decisions are the same ones every time
// (what is the title of this row, how are these ordered, is this weight big or
// small), so they belong in one place, and that place is the worker that
// already knows the schema.
//
// The vocabulary below is not invented. Every block kind is one the iOS band
// views or the Studio scenes already draw, so it is known to be sufficient for
// what exists.
//
// What the ds decides: order, joins, which column is the title, weights as
// fractions, muted/highlighted/terminal, vocabulary mapping, counts, and how
// much to show. What the client decides: layout, chrome, fonts, direction,
// interaction, and what a fraction looks like.

/** Which script a piece of text is in, so a client picks the right face. */
export type DsScript = 'ar' | 'latin' | 'urdu';

/** A run of text with the script it is written in. Never a bare string: the
 *  Arabic UI face and the muṣḥaf face are different fonts and using one for the
 *  other is a typographic error, not a preference. */
export interface DsText {
  text: string;
  script: DsScript;
  /** `mushaf` marks Qurʾānic text, which is set in a different face from
   *  Arabic UI labels. Absent means ordinary text. */
  register?: 'mushaf' | 'quote';
}

/** Where a value came from. A synthesis is ours and says so; anything else
 *  cites. This mirrors the CHECK on qr_morph_display_block, which is the one
 *  provenance rule in the codebase that was actually enforced. */
export interface DsProvenance {
  /** `kmaps_*` for a synthesis, a real source slug otherwise. */
  source: string;
  is_synthesis: boolean;
  /** Required when `is_synthesis` is false — where to check the claim. */
  ref?: string;
  page?: string;
  confidence?: string;
}

/** One cell of a grid — a letter slot, a permutation, an antonym. */
export interface DsCell {
  id: string;
  mark: DsText;
  caption?: string;
  footnote?: string;
  /** The language declined to use this permutation; it is real information. */
  muted?: boolean;
  highlighted?: boolean;
}

/** One rung of a chain — a sense on an arc, a stage of a development. */
export interface DsNode {
  id: string;
  title: DsText;
  subtitle?: string;
  detail?: string;
  /** Where the arc ends. */
  terminal?: boolean;
  /** The arc names a sense this subject does not carry — the gap is the point. */
  unresolved?: boolean;
}

/** One magnitude, already divided by the largest so a client need not know
 *  the scale. */
export interface DsBar {
  id: string;
  label: DsText;
  sublabel?: string;
  note?: string;
  value: string;
  /** 0..1. A zero draws as "nothing yet", not as a very small bar. */
  fraction: number;
}

/** A labelled fact, e.g. `frequency_quran` → `293× in the muṣḥaf`. */
export interface DsFact { label: string; value: DsText }

/** One record read as content rather than as columns. */
export interface DsRecord {
  id: string;
  /** Badges are short categorical flags: is_core, status, confidence. */
  badges?: { label: string; value: string; tone?: 'strong' | 'ok' | 'warn' | 'plain' }[];
  ar?: DsText;
  en?: DsText;
  ur?: DsText;
  facts?: DsFact[];
  provenance?: DsProvenance;
}

/** A typographic role, not a size. The client owns what a heading looks like. */
export type DsProseRole = 'heading' | 'definition' | 'verse' | 'narration' | 'aside';

export interface DsProseBlock {
  id: string;
  role: DsProseRole;
  /** Nesting, clamped by the builder. */
  depth: number;
  text: DsText;
  translation?: DsText;
  provenance?: DsProvenance;
}

/** The block kinds. Each is a shape some client already draws. */
export type DsBlock =
  | { kind: 'hero'; title?: string; hint?: string; mark: DsText; facts?: DsFact[]; ar?: DsText; en?: DsText; ur?: DsText }
  | { kind: 'grid'; title?: string; hint?: string; cells: DsCell[]; overflow_count?: number }
  | { kind: 'chain'; title?: string; hint?: string; summary?: DsText; nodes: DsNode[] }
  | { kind: 'bars'; title?: string; hint?: string; bars: DsBar[]; overflow_count?: number }
  | { kind: 'card_list'; title?: string; hint?: string; records: DsRecord[]; overflow_count?: number }
  | { kind: 'ledger'; title?: string; hint?: string; records: DsRecord[]; overflow_count?: number }
  | { kind: 'pills'; title?: string; hint?: string; pills: { id: string; label: DsText; muted?: boolean }[]; overflow_count?: number }
  | { kind: 'prose_blocks'; title?: string; hint?: string; blocks: DsProseBlock[]; overflow_count?: number }
  | { kind: 'pairs'; title?: string; hint?: string; pairs: { id: string; label: DsText; value: DsText }[] }
  | { kind: 'table'; title?: string; hint?: string; columns: string[]; rows: (string | null)[][]; overflow_count?: number;
      /** Columns that were NULL in every row read — a build gap that becomes
       *  invisible the moment a row is rendered as prose. */
      null_columns?: string[] }
  | { kind: 'note'; title?: string; note_kind: 'empty' | 'unknown' | 'truncated'; text: string };

/**
 * Whether this layer holds anything — and the third state is the important one.
 *
 * `unknown` means no audited carrier binds it, so nothing has ever been read.
 * Reporting that as `empty` claims a measurement nobody took. Most layers of
 * most roots are one of these two: identity and phonology cover the whole
 * corpus, sense arcs cover 53 roots, semantic fields 4.
 */
export type DsState = 'filled' | 'empty' | 'unknown';

/** One sub-layer, rendered. */
export interface DsSection {
  /** The registry's own code — `14-SENSE`. */
  code: string;
  band: string;
  title: string;
  title_ar?: string;
  icon?: string;
  /** The band's colour from the registry, or null when it declares none. */
  accent?: string | null;
  state: DsState;
  /** What the carriers hold, in total, before any cap. */
  total_rows: number;
  /** The tables read, so a reader can go and look. */
  carriers: string[];
  blocks: DsBlock[];
}

/** How much to send. A phone is not a small desktop. */
export type DsForm = 'desktop' | 'mobile';

export interface DsSubject {
  kind: 'root' | 'lemma' | 'word';
  ref: string;
  display: DsText;
}

export interface DisplaySpec {
  subject: DsSubject;
  scope: string;
  form: DsForm;
  sections: DsSection[];
  /** Counts across the whole spec, so a header need not add them up. */
  summary: { filled: number; empty: number; unknown: number; rows: number };
}
