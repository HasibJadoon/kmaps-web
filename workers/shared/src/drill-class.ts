// The Class's rules, as pure functions: how one sprint's answers move an item, how a node is
// starred, what a studied class is rated, how many days it took. CORE applies them to the
// learner's record (routes/drill-class.ts); nothing here touches a database.
//
// An item is a drill met in a class. It is `right` when it was right the first time it was
// met; otherwise `open` (to perfect) until it is answered right twice in a row, then
// `perfected`. A right or perfected item missed again on a later replay is open again.

export type ItemState = 'right' | 'open' | 'perfected';

/** How an item went in one sprint, as the device reports it. */
export interface SprintAnswer {
  /** right at its first attempt in this sprint */
  first: boolean;
  /** wrong attempts in this sprint (a wrong answer comes back until it is right) */
  misses: number;
  /** right answers in a row at the end of the sprint */
  streak: number;
  /** marked by the learner as not caught (listen_mark): open whatever the answer */
  marked?: boolean;
}

/** The item as the record keeps it. */
export interface ItemRecord {
  first_right: number;
  misses: number;
  streak: number;
  state: ItemState;
}

/** Right answers in a row that clear an open item. */
export const CLEARS = 2;

/** Where an item stands after a sprint: `prev` is its record, null when first met. */
export function nextItem(prev: ItemRecord | null, a: SprintAnswer): ItemRecord {
  const missed = a.misses > 0 || !!a.marked;
  if (!prev) {
    const clean = a.first && !missed;
    return {
      first_right: clean ? 1 : 0,
      misses: a.misses,
      streak: a.streak,
      state: clean ? 'right' : a.streak >= CLEARS && !a.marked ? 'perfected' : 'open',
    };
  }
  const streak = missed ? a.streak : prev.streak + a.streak;
  let state: ItemState = prev.state;
  if (missed) state = streak >= CLEARS && !a.marked ? 'perfected' : 'open';
  else if (prev.state === 'open' && streak >= CLEARS) state = 'perfected';
  return { first_right: prev.first_right, misses: prev.misses + a.misses, streak, state };
}

/** A star band: at or above `min` percent, `stars` stars. */
export interface StarBand { stars: number; min: number }

/** Stars for a share of first-try right answers; one star for finishing at all. */
export function starsFor(right: number, total: number, bands: StarBand[]): number {
  if (total <= 0) return 0;
  const pct = (right * 100) / total;
  const hit = [...bands].sort((a, b) => b.min - a.min).find((b) => pct >= b.min);
  return hit ? hit.stars : 1;
}

/** First-try accuracy, 0–100. */
export function scoreOf(firstTryRight: number, itemsTotal: number): number {
  return itemsTotal > 0 ? Math.round((firstTryRight * 100) / itemsTotal) : 0;
}

/** Calendar days from the first study day to the last, both counted (YYYY-MM-DD). */
export function daysTaken(days: string[]): number {
  const t = days.map((d) => Date.parse(`${d}T00:00:00Z`)).filter(Number.isFinite);
  if (!t.length) return 0;
  return Math.round((Math.max(...t) - Math.min(...t)) / 86_400_000) + 1;
}

/** One node's progress, as the record keeps it in steps_json. */
export interface NodeProgress {
  /** sprint indices done */
  sprints: number[];
  /** sprints the node holds */
  of: number;
  /** best stars of any sprint */
  stars: number;
  /** best first-try percentage of any sprint (the check's pass mark is read against it) */
  best: number;
  items: number;
  right: number;
  seconds: number;
}

/** A node's progress after one sprint. */
export function nextNode(prev: NodeProgress | undefined, sprint: number, of: number,
                         items: number, right: number, seconds: number, stars: number): NodeProgress {
  const done = new Set(prev?.sprints ?? []);
  done.add(sprint);
  return {
    sprints: [...done].sort((a, b) => a - b),
    of: Math.max(of, prev?.of ?? 0),
    stars: Math.max(stars, prev?.stars ?? 0),
    best: Math.max(items > 0 ? Math.round((right * 100) / items) : 0, prev?.best ?? 0),
    items: (prev?.items ?? 0) + items,
    right: (prev?.right ?? 0) + right,
    seconds: (prev?.seconds ?? 0) + seconds,
  };
}

/** The SRS grade a studied item is filed with: Good when right first time, Hard otherwise. */
export function seededRating(state: ItemState): 2 | 3 {
  return state === 'right' ? 3 : 2;
}

/** Words missed on an item, every sprint's together: indices, ascending, each once. */
export function mergeMissed(prev: unknown, now: unknown): number[] {
  const ok = (x: unknown) => (Array.isArray(x) ? x : []).map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n < 10_000);
  return [...new Set([...ok(prev), ...ok(now)])].sort((a, b) => a - b);
}

/** The card an item files, carrying the words missed on it (extra.drill.missed); as it was when none. */
export function cardWithMissed(card: Record<string, unknown> | null, missed: number[]): Record<string, unknown> | null {
  if (!card || !missed.length) return card;
  const extra = (card['extra'] && typeof card['extra'] === 'object' ? card['extra'] : {}) as Record<string, unknown>;
  const drill = (extra['drill'] && typeof extra['drill'] === 'object' ? extra['drill'] : null) as Record<string, unknown> | null;
  if (!drill) return card;
  return { ...card, extra: { ...extra, drill: { ...drill, missed } } };
}
