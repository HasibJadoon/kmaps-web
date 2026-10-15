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

// ── The roadmap (§2.3b): the map's progress, from the learner's classes ─────────────────────
//
// A class's section is its scope less its last part (QR:SP:40:1-3 → QR:SP:40, the sūra). Per
// section: classes studied, under way, the stars of those studied, the days they took, items
// still to perfect. The streak counts the learner's days with any study, running back from today
// — or from yesterday, while today is not yet studied — and the longest run there has been.

export interface RoadmapClass {
  scope: string; status: string; rating: number | null; daysTaken: number | null; activeDays: number; open: number;
}
export interface RoadmapDay { day: string; seconds: number; items: number; right: number }

export const sectionOf = (scope: string) => {
  const i = scope.lastIndexOf(':');
  return i > 0 ? scope.slice(0, i) : scope;
};

const dayMs = (d: string) => Date.parse(`${d}T00:00:00Z`);
const dayOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** The current run of study days (alive while yesterday was studied), and the longest run. */
export function streakOf(studied: string[], today: string): { current: number; best: number; today: boolean } {
  const set = new Set(studied.filter((d) => Number.isFinite(dayMs(d))));
  const t = dayMs(today);
  const runBack = (from: number) => { let n = 0; while (set.has(dayOf(from - n * 86_400_000))) n++; return n; };
  const current = set.has(today) ? runBack(t) : runBack(t - 86_400_000);
  let best = 0;
  for (const d of set) {
    if (set.has(dayOf(dayMs(d) - 86_400_000))) continue;     // not the first day of its run
    let n = 0;
    while (set.has(dayOf(dayMs(d) + n * 86_400_000))) n++;
    best = Math.max(best, n);
  }
  return { current, best: Math.max(best, current), today: set.has(today) };
}

/** The last `span` days to today, oldest first, each summed over every class (0 when none). */
export function recentDays(days: RoadmapDay[], today: string, span = 28): RoadmapDay[] {
  const by = new Map<string, RoadmapDay>();
  for (const d of days) {
    const a = by.get(d.day) ?? { day: d.day, seconds: 0, items: 0, right: 0 };
    by.set(d.day, { day: d.day, seconds: a.seconds + (d.seconds || 0), items: a.items + (d.items || 0), right: a.right + (d.right || 0) });
  }
  const t = dayMs(today);
  return Array.from({ length: span }, (_, i) => {
    const day = dayOf(t - (span - 1 - i) * 86_400_000);
    return by.get(day) ?? { day, seconds: 0, items: 0, right: 0 };
  });
}

export function roadmapOf(classes: RoadmapClass[], days: RoadmapDay[], today: string) {
  const sections = new Map<string, { section: string; studied: number; underWay: number; stars: number; days: number; open: number }>();
  for (const c of classes) {
    const key = sectionOf(c.scope);
    const s = sections.get(key) ?? { section: key, studied: 0, underWay: 0, stars: 0, days: 0, open: 0 };
    if (c.status === 'studied') { s.studied++; s.stars += c.rating ?? 0; s.days += c.daysTaken ?? c.activeDays ?? 0; }
    else s.underWay++;
    s.open += c.open || 0;
    sections.set(key, s);
  }
  const studiedDays = [...new Set(days.filter((d) => (d.items || 0) > 0 || (d.seconds || 0) > 0).map((d) => d.day))];
  return {
    sections: [...sections.values()].sort((a, b) => a.section.localeCompare(b.section, 'en', { numeric: true })),
    units: classes.map((c) => ({ scope: c.scope, section: sectionOf(c.scope), status: c.status, rating: c.rating,
                                 daysTaken: c.daysTaken, activeDays: c.activeDays, open: c.open })),
    streak: streakOf(studiedDays, today),
    days: recentDays(days, today),
  };
}
