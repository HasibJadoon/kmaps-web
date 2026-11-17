/// Think — what caught our eye, one tafsīr voice and one who differs, a hadith or parallel, the honest unknowns.
import type { Phase } from './index';
import { hostAndPartner, people, personNamed } from '../people';
import { line, obj } from '../text';

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

const unknowns = (m: Record<string, unknown>) => (Array.isArray(m['unknowns']) ? m['unknowns'] : []).map(line).filter((s): s is string => !!s);

export const think: Phase = {
  key: 'think', title: 'Think', icon: 'lightbulb', color: '#81b29a',
  prepared: (ctx) => [(line(ctx.meta['struck']) ? 1 : 0) + sources(ctx.meta).length + (parallel(ctx.meta) ? 1 : 0)
    + (unknowns(ctx.meta).length ? 1 : 0), 5],
  build: (ctx) => ({
    struck: line(ctx.meta['struck']), sources: sources(ctx.meta), parallel: parallel(ctx.meta), unknowns: unknowns(ctx.meta),
    host_points: personNamed(people(ctx), hostAndPartner(ctx).host),
  }),
};
