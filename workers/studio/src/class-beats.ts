/// The Zāwiya Class: two iPads at the table, each showing the same talking
/// card and each screen-recorded, while the phones film the two faces.
///
/// A card steps in beat by beat — the overlay's talk_card builder decides the
/// order: its line, then each sub-point (one turn of the exchange), then what
/// it draws (a ladder rung per step, the senses at once, a link, a contrast in
/// two). Both iPads and the take log must agree on that count and on who
/// speaks each beat, so it is worked out here, once, and sent with the room's
/// snapshot; the app only reads it.
///
/// A drawing closes the point it illustrates, so it is spoken by whoever said
/// the last sub-point (or the card's own `who`); a line before the exchange by
/// whoever opens it.

export interface ClassBeat {
  /// Who speaks this beat — a participant's display name, or '' when the card
  /// names nobody.
  who: string;
  kind: 'line' | 'turn' | 'visual';
}

type Json = Record<string, unknown>;

const text = (v: unknown): boolean => typeof v === 'string' && v.trim() !== '';

export function classBeats(overlayJson: string | null): ClassBeat[] {
  let o: Json = {};
  try {
    const parsed: unknown = overlayJson ? JSON.parse(overlayJson) : {};
    if (parsed && typeof parsed === 'object') o = parsed as Json;
  } catch { return []; }

  const subs = (Array.isArray(o['subs']) ? o['subs'] : [])
    .filter((s): s is Json => !!s && typeof s === 'object' && text((s as Json)['text']));
  const whoOf = (s: Json | undefined) => (s && text(s['who']) ? String(s['who']) : '');

  // The bookends (bookend.js) step in their own order: (the question, ticked,
  // on the close) → symbol and title → line → recap → each host line → (the
  // frame cleared for the YouTube end screen).
  if (o['kind'] === 'bookend') {
    const first = whoOf(subs[0]);
    const out: ClassBeat[] = [];
    if (o['side'] === 'outro' && text(o['question'])) out.push({ who: first, kind: 'visual' });
    out.push({ who: first, kind: 'visual' });
    if (text(o['line'])) out.push({ who: first, kind: 'line' });
    if (Array.isArray(o['recap']) && o['recap'].length) out.push({ who: first, kind: 'visual' });
    for (const s of subs) out.push({ who: whoOf(s), kind: 'turn' });
    if (o['end_screen'] === true) out.push({ who: '', kind: 'visual' });
    return out;
  }

  const beats: ClassBeat[] = [];
  if (text(o['line'])) beats.push({ who: whoOf(subs[0]), kind: 'line' });
  for (const s of subs) beats.push({ who: whoOf(s), kind: 'turn' });

  // A drawing played as its own scene (the full card at a Zāwiya Class)
  // names who explains it in `who`.
  const closer = whoOf(subs[subs.length - 1]) || (text(o['who']) ? String(o['who']) : '');
  let drawn = 0;
  const steps = Array.isArray(o['steps']) ? o['steps'].filter((r) => r && typeof r === 'object'
    && (text((r as Json)['text']) || text((r as Json)['ref']))) : [];
  drawn += steps.length;
  if (Array.isArray(o['senses']) && o['senses'].some(text)) drawn += 1;
  const link = o['link'] as Json | undefined;
  if (link && (text(link['to']) || text(link['text']))) drawn += 1;
  const contrast = o['contrast'] as Json | undefined;
  if (contrast && text(contrast['told']) && text(contrast['text'])) drawn += 2;
  for (let i = 0; i < drawn; i++) beats.push({ who: closer, kind: 'visual' });

  return beats;
}

/// `83.4` → `00:01:23.400`, the marker clock the takes already use.
export function clock(seconds: number): string {
  const total = Math.max(0, seconds);
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = Math.floor(total % 60);
  const ms = Math.round((total - Math.floor(total)) * 1000) % 1000;
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${p(h)}:${p(m)}:${p(s)}.${p(ms, 3)}`;
}
