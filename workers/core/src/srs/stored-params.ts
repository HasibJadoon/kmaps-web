import type { SrsParams } from '../repositories/srs.repo';
import type { StoredParams } from './fsrs';

export function storedOf(row: SrsParams | null): StoredParams | null {
  if (!row) return null;
  const json = <T>(raw: string | null, fallback: T): T => {
    if (!raw) return fallback;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as T) : fallback;
    } catch { return fallback; }
  };
  return {
    w: json<number[] | null>(row.weights_json, null),
    request_retention: row.desired_retention,
    maximum_interval: row.maximum_interval,
    // the column's old default ("1m","10m") is not a choice anyone made: it brought every passed drill back within minutes
    // and filled the due list right after practice (owner, 2026-10-24) — read it as unset, so fsrs.ts's next-day step applies
    learning_steps: legacySteps(row.learning_steps) ? null : json<string[] | null>(row.learning_steps, null),
    relearning_steps: json<string[] | null>(row.relearning_steps, null),
  };
}

/** The schema's old default learning steps, stored on every row whether or not anyone chose them. */
function legacySteps(v: unknown): boolean {
  return typeof v === 'string' && v.replace(/\s/g, '') === '["1m","10m"]';
}
