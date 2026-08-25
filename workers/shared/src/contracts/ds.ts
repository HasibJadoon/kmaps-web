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

/** Every block may be titled and hinted; the rest is per kind. */
export interface DsBlockBase {
  title?: string;
  hint?: string;
}

/**
 * The block kinds this version of the vocabulary defines. Each is a shape some
 * client already draws.
 */
export type DsKnownBlock =
  | (DsBlockBase & { kind: 'hero'; mark: DsText; facts?: DsFact[]; ar?: DsText; en?: DsText; ur?: DsText })
  | (DsBlockBase & { kind: 'grid'; cells: DsCell[]; overflow_count?: number })
  | (DsBlockBase & { kind: 'chain'; summary?: DsText; nodes: DsNode[] })
  | (DsBlockBase & { kind: 'bars'; bars: DsBar[]; overflow_count?: number })
  | (DsBlockBase & { kind: 'card_list'; records: DsRecord[]; overflow_count?: number })
  | (DsBlockBase & { kind: 'ledger'; records: DsRecord[]; overflow_count?: number })
  | (DsBlockBase & { kind: 'pills'; pills: { id: string; label: DsText; muted?: boolean }[]; overflow_count?: number })
  | (DsBlockBase & { kind: 'prose_blocks'; blocks: DsProseBlock[]; overflow_count?: number })
  | (DsBlockBase & { kind: 'pairs'; pairs: { id: string; label: DsText; value: DsText }[] })
  | (DsBlockBase & {
      kind: 'table'; columns: string[]; rows: (string | null)[][]; overflow_count?: number;
      /** Columns that were NULL in every row read — a build gap that becomes
       *  invisible the moment a row is rendered as prose. */
      null_columns?: string[];
    })
  | (DsBlockBase & { kind: 'note'; note_kind: 'empty' | 'unknown' | 'truncated'; text: string });

/**
 * What a renderer switches on.
 *
 * Closed on purpose: a discriminated union narrows, and a renderer that cannot
 * narrow is a renderer full of casts. Forward compatibility is handled at the
 * boundary instead — see `normaliseBlock`. The vocabulary still grows freely on
 * the worker side; a client simply converts what it does not recognise before
 * the type system ever sees it.
 */
export type DsBlock = DsKnownBlock;

/** The kinds this build knows how to draw. */
export const DS_BLOCK_KINDS = [
  'hero', 'grid', 'chain', 'bars', 'card_list', 'ledger', 'pills',
  'prose_blocks', 'pairs', 'table', 'note',
] as const;

export type DsBlockKind = (typeof DS_BLOCK_KINDS)[number];

function isKnownKind(k: unknown): k is DsBlockKind {
  return typeof k === 'string' && (DS_BLOCK_KINDS as readonly string[]).includes(k);
}

/**
 * Make one block safe to render.
 *
 * The worker owns the vocabulary and will grow it: a new carrier earns a better
 * shape than a table, a new scope needs a new arrangement. A client compiled
 * before that happens must not blank the section or throw — blank is the exact
 * failure this whole design exists to avoid, because a reader cannot tell it
 * apart from a layer that genuinely holds nothing.
 *
 * So an unrecognised kind becomes a note that says which kind it was. The data
 * is there; only this build's renderer is older than the spec.
 */
export function normaliseBlock(raw: unknown): DsBlock {
  const b = (raw ?? {}) as { kind?: unknown; title?: unknown; hint?: unknown };
  if (isKnownKind(b.kind)) return raw as DsBlock;
  const kind = typeof b.kind === 'string' && b.kind ? b.kind : 'an unnamed';
  return {
    kind: 'note',
    note_kind: 'unknown',
    title: typeof b.title === 'string' ? b.title : undefined,
    text: `This build cannot render a “${kind}” block yet. `
        + 'The data is there; the renderer is older than the spec.',
  };
}

/** Make a whole spec safe to render. One call, at the edge. */
export function normaliseSpec<T extends { sections: { blocks: unknown[] }[] }>(spec: T): T {
  for (const section of spec.sections ?? []) {
    section.blocks = (section.blocks ?? []).map(normaliseBlock);
  }
  return spec;
}

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

/**
 * One axis of the control plane's reading of this subject.
 *
 * `measured` is the field that matters. A node no sensor has read reports
 * `pct: 0, measured: false`, and rendering that as 0% claims a measurement
 * nobody took — for most roots, three of the four axes are in exactly that
 * state. `sensors` against `read_sensors` says how much of the axis has
 * actually been looked at.
 */
export interface DsReading {
  axis: string;
  pct: number;
  measured: boolean;
  /** Measured once, but no live sensor stands behind the number now. */
  stale: boolean;
  sensors: number;
  read_sensors: number;
}

/**
 * What the control plane knows about this subject.
 *
 * Added by km_core, which owns the plane. The domain worker that shapes the
 * layers cannot read km_core and should not: the spec says what a layer IS and
 * holds, the plane says how far along it is, and they are separate claims.
 */
export interface DsPlane {
  node_id: string | null;
  readings: DsReading[];
}

export interface DisplaySpec {
  subject: DsSubject;
  scope: string;
  form: DsForm;
  sections: DsSection[];
  /** Present only on the composed spec from km_core. */
  plane?: DsPlane;
  /** Counts across the whole spec, so a header need not add them up. */
  summary: { filled: number; empty: number; unknown: number; rows: number };
}
