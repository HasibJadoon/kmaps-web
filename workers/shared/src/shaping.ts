// ─── shaping — the canonical shape decisions for a carrier's rows ────────────
//
// These rules decide how a layer's rows are ordered, joined and read. Until now
// each client made them for itself: the iOS app in Swift, the web app in
// TypeScript, and the Studio overlays in a third place. Three implementations of
// "oldest witness first" drift, and nothing fails when they do.
//
// This module is the one implementation. Every function here is ported from the
// iOS `CyberneticsFeature` presentation layer — the file and symbol it came from
// is named above each — and pinned by `workers/shared/test/shaping.test.ts`, so
// the behaviour is fixed BEFORE the display-spec builder starts depending on it.
//
// Nothing here renders. These produce ordered, joined, annotated data; how it
// looks stays in the client.

export type Row = Record<string, unknown>;

/** A cell's text, whatever the column's declared type. */
export function str(v: unknown): string {
  return v === null || v === undefined ? '' : String(v);
}

/** A cell as a number, or null when it does not read as one. Distinguishing
 *  "absent" from "zero" is the whole point — a NULL `death_hijri` is an unknown
 *  death date, not year zero. */
export function numOrNull(v: unknown): number | null {
  const s = str(v).trim();
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function num(v: unknown): number {
  return numOrNull(v) ?? 0;
}

export function flag(r: Row | undefined, key: string): boolean {
  return !!r && str(r[key]) === '1';
}

/**
 * A JSON-array column, read defensively.
 *
 * `root_letters` is `["ن","ز","ل"]` and several carriers store lists the same
 * way. These are `CHECK(json_valid(...))` in the schema, but a view must not
 * blow up on the one row that is not — an unreadable list is an empty one.
 */
export function jsonArrayOf(raw: unknown): string[] {
  const s = str(raw).trim();
  if (!s || s[0] !== '[') return [];
  try {
    const v: unknown = JSON.parse(s);
    return Array.isArray(v) ? v.map((x) => str(x)).filter((x) => x !== '') : [];
  } catch { return []; }
}

/**
 * The three positions every Arabic root is described by.
 *
 * `slot_role` stores them as fa/ain/lam; the books name them in full, so does
 * this. An unrecognised code is shown as it is stored rather than blanked.
 */
export function slotName(role: unknown): string {
  switch (str(role)) {
    case 'fa': return 'fāʾ';
    case 'ain': return 'ʿayn';
    case 'lam': return 'lām';
    default: return str(role);
  }
}

// ── ordering ────────────────────────────────────────────────────────────────

/**
 * Oldest witness first, undated witnesses last.
 *
 * From `CybSynLayerView` (CybRootLayers.swift): the uṣūl are authorities
 * disagreeing across six centuries, and `death_hijri` is the axis that makes
 * "oldest" decidable rather than a matter of reputation — Ibn Durayd (321)
 * outranks Ibn Fāris (395) even though Maqāyīs is the famous one. A row with no
 * death date sorts last rather than first, because an unknown date must not
 * masquerade as the earliest source.
 */
export function byDeathHijri(rows: Row[]): Row[] {
  return [...rows].sort((a, b) => {
    const x = numOrNull(a['death_hijri']);
    const y = numOrNull(b['death_hijri']);
    if (x === null && y === null) return 0;
    if (x === null) return 1;
    if (y === null) return -1;
    return x - y;
  });
}

/** The verb forms, in the order the books give them. */
const VERB_FORM_ORDER: Record<string, number> = {
  I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8,
  IX: 9, X: 10, XI: 11, XII: 12, XIII: 13, XIV: 14, XV: 15,
};

/**
 * Rank of a roman-numeral verb form; unknown forms sort last.
 *
 * From `CybVerbForm.order` (CybLemmaLayers.swift). This exists because a string
 * sort puts X before III — the ladder has to be a declared table, not
 * lexicographic luck.
 */
export function verbFormRank(roman: unknown): number {
  return VERB_FORM_ORDER[str(roman).trim().toUpperCase()] ?? 99;
}

export function byVerbForm(rows: Row[], key = 'verb_form'): Row[] {
  return [...rows].sort((a, b) => verbFormRank(a[key]) - verbFormRank(b[key]));
}

/**
 * The column a carrier is ordered by, inferred from the columns it has.
 *
 * From `CybOrdering` (CybChainGrid.swift). The carriers share no shape, so the
 * ordering column is discovered rather than declared per table. Order of this
 * list is the precedence.
 */
export const ORDER_KEYS = [
  'step_no', 'step_seq', 'stage_no', 'clause_order', 'slot_index', 'perm_index',
  'unit_index', 'seq', 'sort_order', 'display_order', 'chunk_index',
] as const;

export function orderingKey(rows: Row[]): string | null {
  if (!rows.length) return null;
  const cols = Object.keys(rows[0]);
  return ORDER_KEYS.find((k) => cols.includes(k)) ?? null;
}

/** Numerically, never lexically — `10` must not sort before `9`. */
export function sortedBy(rows: Row[], key: string): Row[] {
  return [...rows].sort((a, b) => {
    const x = numOrNull(a[key]);
    const y = numOrNull(b[key]);
    if (x === null && y === null) return 0;
    if (x === null) return 1;
    if (y === null) return -1;
    return x - y;
  });
}

/** Sorted by whichever ordering column the carrier turns out to have. */
export function sortedByInferredKey(rows: Row[]): Row[] {
  const k = orderingKey(rows);
  return k ? sortedBy(rows, k) : [...rows];
}

// ── the sense arc ───────────────────────────────────────────────────────────

export interface ChainNode {
  /** The sense this rung names, or the raw key when the root has no such sense. */
  key: string;
  title: string;
  titleIsArabic: boolean;
  subtitle: string | null;
  detail: string | null;
  isTerminal: boolean;
  /** The arc names a sense this root does not actually carry. */
  unresolved: boolean;
}

/** The rungs an `arc_key` names. Stored as `gathering>decree>scripture`. */
export function arcPath(arcKey: unknown): string[] {
  return str(arcKey)
    .split('>')
    .map((s) => s.trim())
    .filter((s) => s !== '');
}

/**
 * An arc, resolved against the root's own senses.
 *
 * From `CybSensesLayerView.arcNodes` (CybSensesLayer.swift). Each segment of
 * `arc_key` names a `sense_key`; the steps table, when bound, annotates each
 * move and is zipped **positionally**, because `arc_step` has no column tying a
 * step to a segment. A segment naming a sense the root does not carry is kept
 * and marked `unresolved` rather than dropped — the gap is the finding.
 */
export function arcNodes(arc: Row, senses: Row[], steps: Row[] = []): ChainNode[] {
  const byKey = new Map(senses.map((s) => [str(s['sense_key']), s]));
  const terminal = str(arc['terminal_sense_id']);
  const mine = sortedBy(steps.filter((s) => str(s['arc_id']) === str(arc['id'])), 'step_no');

  return arcPath(arc['arc_key']).map((key, i) => {
    const s = byKey.get(key);
    const step = mine[i];
    const ar = s ? str(s['gloss_ar']) : '';
    return {
      key,
      title: ar || key,
      titleIsArabic: ar !== '',
      subtitle: s ? (str(s['gloss_en']) || null) : 'not among this root\'s senses',
      detail: (step ? str(step['note_md']) : '') || (s ? str(s['gloss_ur']) : '') || null,
      isTerminal: terminal !== '' && !!s && str(s['id']) === terminal,
      unresolved: !s,
    };
  });
}

/**
 * The senses no arc walks through, core first.
 *
 * From `CybSensesLayerView.offArcSection`. A sense off every arc is not a lesser
 * sense — it is one the arcs have not yet accounted for, which is exactly what a
 * build screen needs to show. Sorted core-first, then by the carrier's own
 * `sort_order`.
 */
export function offArcSenses(senses: Row[], arcs: Row[]): Row[] {
  const onArc = new Set(arcs.flatMap((a) => arcPath(a['arc_key'])));
  return senses
    .filter((s) => !onArc.has(str(s['sense_key'])))
    .sort((a, b) => {
      const core = (flag(b, 'is_core') ? 1 : 0) - (flag(a, 'is_core') ? 1 : 0);
      if (core !== 0) return core;
      return num(a['sort_order']) - num(b['sort_order']);
    });
}

// ── magnitudes ──────────────────────────────────────────────────────────────

export interface WeightedRow { row: Row; weight: number; fraction: number }

/**
 * Weights as fractions of the heaviest, so a client draws a bar without
 * knowing the scale.
 *
 * From the axes section of `CybSensesLayerView` and the fields section of
 * `CybGraphLayerView`, which had written this normalisation twice. The
 * denominator is `max(1, heaviest)`: an all-zero set must not divide by zero,
 * and every row then correctly reads as empty rather than full.
 */
export function normaliseWeights(rows: Row[], key = 'weight'): WeightedRow[] {
  const weights = rows.map((r) => num(r[key]));
  const top = Math.max(1, ...weights);
  return rows.map((row, i) => ({
    row,
    weight: weights[i],
    fraction: weights[i] / top,
  }));
}

// ── scope ───────────────────────────────────────────────────────────────────

/**
 * `scope_level` → the scope that owns it.
 *
 * Two levels have no scope of their own and fold onto their nearest owner: a
 * *form* is a property of the lemma that carries it, and a *letter* is a radical
 * of the root. The unfolded `scope_level` still rides on every row, so the fold
 * stays visible rather than being lost here.
 *
 * This rule was written twice — `SCOPE_OF` in the AL registry repo and
 * `CybScopeFold` in the iOS layer model — and the two agreed only because
 * nobody had changed either. This is the one copy; an unrecognised level folds
 * nowhere and returns null rather than guessing a home.
 */
const SCOPE_OF: Record<string, string> = {
  root: 'root', letter: 'root',
  lemma: 'lemma', form: 'lemma',
  word: 'word', context: 'word',
};

export function scopeFold(scopeLevel: unknown): string | null {
  return SCOPE_OF[str(scopeLevel).trim()] ?? null;
}

// ── the three-state reading ─────────────────────────────────────────────────

export type FillState = 'filled' | 'empty' | 'unknown';

/**
 * What a sub-layer's carrier holds for one subject.
 *
 * `unknown` is not `empty`. A sub-layer with no audited carrier binding has
 * never been read, and reporting it as zero claims a measurement nobody took —
 * which is the distinction the registry reader was written to preserve and the
 * one a display spec most easily destroys. `rows` is null when unread.
 */
export function fillState(rows: number | null | undefined): FillState {
  if (rows === null || rows === undefined) return 'unknown';
  return rows > 0 ? 'filled' : 'empty';
}

/**
 * The share of a reading a sensor contributes.
 *
 * An **uncalibrated** sensor — one whose `expected` is 0 — contributes nothing
 * and is excluded by the caller, rather than being scored. The control plane's
 * own rollup currently reads `CASE WHEN expected > 0 THEN reading/expected ELSE
 * reading END`, which hands an uncalibrated sensor a perfect score; the iOS
 * client excludes it instead. Two definitions of one number. This is the
 * excluding one: `null` means "no opinion", not "zero".
 */
export function sensorFraction(reading: number, expected: number): number | null {
  if (!(expected > 0)) return null;
  return Math.min(1, reading / expected);
}
