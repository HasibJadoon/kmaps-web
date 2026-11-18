/// The pieces Claude writes into an episode's meta (scripts/studio/episode_phases.py), read by name. The three steps
/// (Study · Prepare · Record) and the publish screen all draw on them.
import { line, obj } from '../text';

export const list = (v: unknown) => (Array.isArray(v) ? v : []).map(line).filter((s): s is string => !!s);

/// One voice, and one who reads it differently.
export function sources(meta: Record<string, unknown>): Array<{ who: string; says: string; differs: boolean }> {
  const raw = Array.isArray(meta['sources']) ? meta['sources'] : [];
  return raw.map(obj).map((s) => ({ who: line(s['who']) ?? '', says: line(s['says']) ?? '', differs: s['differs'] === true }))
    .filter((s) => s.who && s.says).slice(0, 2);
}

export function parallel(meta: Record<string, unknown>): { kind: string; ref: string | null; text: string } | null {
  const p = obj(meta['parallel']);
  const text = line(p['text']);
  return text ? { kind: line(p['kind']) ?? 'parallel', ref: line(p['ref']), text } : null;
}

/// The 3–5 minute short that goes out the day before: the hook and the question it ends on.
export function short(meta: Record<string, unknown>): { hook: string; open_question: string | null } | null {
  const s = obj(meta['short']);
  const hook = line(s['hook']);
  return hook ? { hook, open_question: line(s['open_question']) } : null;
}

/// The chain: the question left open, the promise the next episode keeps, and which passage comes next.
export function chain(meta: Record<string, unknown>) {
  const c = obj(meta['chain']);
  return { open_question: line(c['open_question']), promise: line(c['promise']), next: line(c['next']) };
}
