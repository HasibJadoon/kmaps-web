/**
 * Narrow error swallowing for optional D1 reads.
 *
 * A worker often reads a layer that may not exist yet on every database (a table
 * added by a later migration, a column not yet backfilled). For those, an empty
 * answer is right. Every other failure — a bad query, too many bind params, a D1
 * outage — must surface, or a broken table shows up as "no data" and nobody looks.
 *
 *   query(db, sql).catch(softFail([]))              // [] only if the table/column is missing
 *   try { … } catch (e) { rethrowUnlessMissing(e) } // same rule inside a try block
 */

const MISSING_SCHEMA = /no such (table|column)|has no column named/i;

/** True when `e` is SQLite/D1 saying a table or column does not exist. */
export function isMissingSchema(e: unknown): boolean {
  const msg = e instanceof Error ? `${e.message} ${String((e as { cause?: unknown }).cause ?? '')}` : String(e);
  return MISSING_SCHEMA.test(msg);
}

function describe(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/**
 * A `.catch` handler: returns `fallback` when the failure is a missing table or
 * column (logged as a warning), and logs + rethrows anything else.
 */
export function softFail<T>(fallback: T, label?: string): (e: unknown) => T {
  return (e: unknown) => {
    rethrowUnlessMissing(e, label);
    return fallback;
  };
}

/** For `catch (e)` blocks: returns normally on a missing table/column, rethrows otherwise. */
export function rethrowUnlessMissing(e: unknown, label?: string): void {
  const tag = label ? `[${label}] ` : '';
  if (isMissingSchema(e)) {
    console.warn(`${tag}optional table/column missing: ${describe(e)}`);
    return;
  }
  console.error(`${tag}${describe(e)}`);
  throw e;
}
