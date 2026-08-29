// The learner's stored scheduler settings, normalised. Lifted out of the route
// so the shared review session reads the same weights the solo queue does —
// otherwise one person answering in company would be scheduled by defaults
// while the same answer alone used their own tuned parameters.

import type { SrsParams } from '../repositories/srs.repo';
import type { StoredParams } from './fsrs';

/** The learner's stored settings, or nothing — `buildParams` supplies and
 *  validates the defaults. */
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
    learning_steps: json<string[] | null>(row.learning_steps, null),
    relearning_steps: json<string[] | null>(row.relearning_steps, null),
  };
}
