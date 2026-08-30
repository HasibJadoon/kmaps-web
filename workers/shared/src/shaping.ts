export type Row = Record<string, unknown>;

export function str(v: unknown): string {
  return v === null || v === undefined ? '' : String(v);
}

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

export function jsonArrayOf(raw: unknown): string[] {
  const s = str(raw).trim();
  if (!s || s[0] !== '[') return [];
  try {
    const v: unknown = JSON.parse(s);
    return Array.isArray(v) ? v.map((x) => str(x)).filter((x) => x !== '') : [];
  } catch { return []; }
}

export function slotName(role: unknown): string {
  switch (str(role)) {
    case 'fa': return 'fāʾ';
    case 'ain': return 'ʿayn';
    case 'lam': return 'lām';
    default: return str(role);
  }
}

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

const VERB_FORM_ORDER: Record<string, number> = {
  I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8,
  IX: 9, X: 10, XI: 11, XII: 12, XIII: 13, XIV: 14, XV: 15,
};

export function verbFormRank(roman: unknown): number {
  return VERB_FORM_ORDER[str(roman).trim().toUpperCase()] ?? 99;
}

export function byVerbForm(rows: Row[], key = 'verb_form'): Row[] {
  return [...rows].sort((a, b) => verbFormRank(a[key]) - verbFormRank(b[key]));
}

export const ORDER_KEYS = [
  'step_no', 'step_seq', 'stage_no', 'clause_order', 'slot_index', 'perm_index',
  'unit_index', 'seq', 'sort_order', 'display_order', 'chunk_index',
] as const;

export function orderingKey(rows: Row[]): string | null {
  if (!rows.length) return null;
  const cols = Object.keys(rows[0]);
  return ORDER_KEYS.find((k) => cols.includes(k)) ?? null;
}

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

export function sortedByInferredKey(rows: Row[]): Row[] {
  const k = orderingKey(rows);
  return k ? sortedBy(rows, k) : [...rows];
}

export interface ChainNode {

  key: string;
  title: string;
  titleIsArabic: boolean;
  subtitle: string | null;
  detail: string | null;
  isTerminal: boolean;

  unresolved: boolean;
}

export function arcPath(arcKey: unknown): string[] {
  return str(arcKey)
    .split('>')
    .map((s) => s.trim())
    .filter((s) => s !== '');
}

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

export interface WeightedRow { row: Row; weight: number; fraction: number }

export function normaliseWeights(rows: Row[], key = 'weight'): WeightedRow[] {
  const weights = rows.map((r) => num(r[key]));
  const top = Math.max(1, ...weights);
  return rows.map((row, i) => ({
    row,
    weight: weights[i],
    fraction: weights[i] / top,
  }));
}

const SCOPE_OF: Record<string, string> = {
  root: 'root', letter: 'root',
  lemma: 'lemma', form: 'lemma',
  word: 'word', context: 'word',
};

export function scopeFold(scopeLevel: unknown): string | null {
  return SCOPE_OF[str(scopeLevel).trim()] ?? null;
}

export type FillState = 'filled' | 'empty' | 'unknown';

export function fillState(rows: number | null | undefined): FillState {
  if (rows === null || rows === undefined) return 'unknown';
  return rows > 0 ? 'filled' : 'empty';
}

export function sensorFraction(reading: number, expected: number): number | null {
  if (!(expected > 0)) return null;
  return Math.min(1, reading / expected);
}
