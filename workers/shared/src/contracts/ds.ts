export type DsScript = 'ar' | 'latin' | 'urdu';

export interface DsText {
  text: string;
  script: DsScript;

  register?: 'mushaf' | 'quote';
}

export interface DsProvenance {

  source: string;
  is_synthesis: boolean;

  ref?: string;
  page?: string;
  confidence?: string;
}

export interface DsCell {
  id: string;
  mark: DsText;
  caption?: string;
  footnote?: string;

  muted?: boolean;
  highlighted?: boolean;
}

export interface DsNode {
  id: string;
  title: DsText;
  subtitle?: string;
  detail?: string;

  terminal?: boolean;

  unresolved?: boolean;
}

export interface DsBar {
  id: string;
  label: DsText;
  sublabel?: string;
  note?: string;
  value: string;

  fraction: number;
}

export interface DsFact { label: string; value: DsText }

/** A book a record rests on, as the app's one source back-link reads it (KMSource): the book's short name, its page,
 *  and where to open it — the lexicon reader at `source` + `root`, at `block` when known. */
export interface DsSource {
  book: string;
  page?: number;
  source: string;
  root?: string;
  block?: string;
}

export interface DsRecord {
  id: string;

  badges?: { label: string; value: string; tone?: 'strong' | 'ok' | 'warn' | 'plain' }[];
  ar?: DsText;
  en?: DsText;
  ur?: DsText;
  facts?: DsFact[];
  provenance?: DsProvenance;
  /** the books it rests on, each a back-link to its page */
  sources?: DsSource[];
}

export type DsProseRole = 'heading' | 'definition' | 'verse' | 'narration' | 'aside';

export interface DsProseBlock {
  id: string;
  role: DsProseRole;

  depth: number;
  text: DsText;
  translation?: DsText;
  provenance?: DsProvenance;
}

export interface DsBlockBase {
  title?: string;
  hint?: string;
}

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

      null_columns?: string[];
    })
  | (DsBlockBase & { kind: 'note'; note_kind: 'empty' | 'unknown' | 'truncated'; text: string });

export type DsBlock = DsKnownBlock;

export const DS_BLOCK_KINDS = [
  'hero', 'grid', 'chain', 'bars', 'card_list', 'ledger', 'pills',
  'prose_blocks', 'pairs', 'table', 'note',
] as const;

export type DsBlockKind = (typeof DS_BLOCK_KINDS)[number];

function isKnownKind(k: unknown): k is DsBlockKind {
  return typeof k === 'string' && (DS_BLOCK_KINDS as readonly string[]).includes(k);
}

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

export function normaliseSpec<T extends { sections: { blocks: unknown[] }[] }>(spec: T): T {
  for (const section of spec.sections ?? []) {
    section.blocks = (section.blocks ?? []).map(normaliseBlock);
  }
  return spec;
}

export type DsState = 'filled' | 'empty' | 'unknown';

export interface DsChapter {
  key: string;
  title: string;
  title_ar?: string;

  question: string;
}

export interface DsSection {

  chapter: string;

  code: string;
  band: string;
  title: string;
  title_ar?: string;
  icon?: string;

  accent?: string | null;
  state: DsState;

  total_rows: number;

  carriers: string[];
  blocks: DsBlock[];
}

export type DsForm = 'desktop' | 'mobile';

export interface DsSubject {
  kind: 'root' | 'lemma' | 'word';
  ref: string;
  display: DsText;
}

export interface DsReading {
  axis: string;
  pct: number;
  measured: boolean;

  stale: boolean;
  sensors: number;
  read_sensors: number;
}

export interface DsPlane {
  node_id: string | null;
  readings: DsReading[];
}

export interface DisplaySpec {
  subject: DsSubject;
  scope: string;
  form: DsForm;

  chapters: DsChapter[];
  sections: DsSection[];

  plane?: DsPlane;

  summary: { filled: number; empty: number; unknown: number; rows: number };
}
