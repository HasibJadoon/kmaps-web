/**
 * Small list/JSON helpers every worker had its own copy of.
 */

/** A shuffled copy (Fisher–Yates). `rand` may be seeded for a repeatable deal. */
export function shuffle<T>(xs: readonly T[], rand: () => number = Math.random): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** The distinct items, first occurrence kept, order kept. */
export function uniq<T>(xs: readonly T[]): T[] {
  return xs.filter((x, i) => xs.indexOf(x) === i);
}

/** JSON from an optional column; `fallback` when it is empty or does not parse. */
export function parseJson<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try { return JSON.parse(s) as T; } catch { return fallback; }
}
