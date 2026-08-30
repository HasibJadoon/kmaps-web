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
    learning_steps: json<string[] | null>(row.learning_steps, null),
    relearning_steps: json<string[] | null>(row.relearning_steps, null),
  };
}
