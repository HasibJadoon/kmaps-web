/// Hasib's and Ali's talk points, by section; a point with no speaker is the host's.

import type { EpisodeCtx } from './context';
import { bidiLine, str } from './text';

export interface Person { name: string; color: string | null; role: string | null; groups: Array<{ heading: string; points: string[] }> }

export function people(ctx: Pick<EpisodeCtx, 'participants' | 'sections'>): Person[] {
  const ps = [...ctx.participants].sort((a, b) => a.seq - b.seq);
  if (!ps.length) return [];
  const host = ps.find((p) => p.role === 'host') ?? ps[0]!;
  const out = new Map(ps.map((p) => [p.id, { name: p.display_name, color: p.color, role: p.role, groups: [] as Person['groups'] }]));
  const talk = ctx.sections.filter((s) => s.type === 'talk_card');
  for (const s of talk.length ? talk : ctx.sections) {
    for (const pt of s.points) {
      const raw = str(pt.text);
      if (!raw) continue;
      const who = out.get(pt.speaker_ref ?? '') ?? out.get(host.id)!;
      const heading = bidiLine(str(s.heading) ?? '');
      const last = who.groups[who.groups.length - 1];
      if (last && last.heading === heading) last.points.push(bidiLine(raw));
      else who.groups.push({ heading, points: [bidiLine(raw)] });
    }
  }
  return [...out.values()].filter((p) => p.groups.length);
}

/// The host (Hasib) and the partner (Ali), by the participants' order.
export function hostAndPartner(ctx: Pick<EpisodeCtx, 'participants'>): { host: string | null; partner: string | null } {
  const ps = [...ctx.participants].sort((a, b) => a.seq - b.seq);
  const host = ps.find((p) => p.role === 'host') ?? ps[0];
  const partner = ps.find((p) => p !== host);
  return { host: host?.display_name ?? null, partner: partner?.display_name ?? null };
}

export function personNamed(list: Person[], name: string | null): Person | null {
  return name ? list.find((p) => p.name === name) ?? null : null;
}
