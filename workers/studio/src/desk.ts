/// One episode's desk: everything needed to produce it, on one page (owner 2026-11-17 — "From the episode directly:
/// read, all notes, questions — one view"; "procrastination kill, ADHD noise cut and focus").
///
///   now        the one thing to do today and its big button (read · record), with the cue ("After Fajr"), the
///              minutes of the focus timer, "Day 1 of 2" and a countdown — never a list of dates
///   reward     what has been produced so far, shown once something is
///   focus      the concept to master and the selected text (Qurʾān āyāt or Worldview passages), only the 2-day part
///   people     each person's points (Hasib | Ali), by section
///   questions  the episode's questions
///   slides     the deck, when the episode has one
///
/// Everything is shaped here so the apps only draw it; no date arithmetic on a device.

import { dayIn, type Checklist, type SeriesPlan } from './checklist';

export interface DeskNow {
  key: string | null;
  label: string;
  /// read — the focus timer, then Done; record — the session; null — nothing to press (queued or recorded).
  action: 'read' | 'record' | null;
  state: 'active' | 'queued' | 'done';
  /// "After Fajr" — the if-then cue the step is tied to.
  cue: string | null;
  /// The prayer the cue follows and the minutes after it, for the reminder the phone schedules from its prayer times.
  cue_prayer: string | null;
  cue_after_min: number | null;
  /// The day the cue falls on (YYYY-MM-DD): the step's planned day, or today when the plan has rolled past it.
  cue_on: string | null;
  minutes: number | null;
  day_of: number;
  days: number;
  /// "today" · "tomorrow" · "in 3 days" · "still on — today".
  countdown: string | null;
  still_on: boolean;
}

export interface DeskBlock { id: string; n: number | null; cite: string | null; text: string; en: string | null }

export interface DeskFocus {
  cite: string | null;
  rtl: boolean;
  concept: { id: string | null; label: string } | null;
  blocks: DeskBlock[];
  /// The whole part's English, when it comes as one (a Qurʾān passage's assembled rendering).
  translation: string | null;
  /// When the text is not in the app: what to read, in the plan's own words.
  note: string | null;
  open_url: string | null;
}

export interface DeskPerson {
  name: string;
  color: string | null;
  role: string | null;
  groups: Array<{ heading: string; points: string[] }>;
}

export interface Desk {
  id: string;
  title: string;
  number: number | null;
  series: string | null;
  now: DeskNow;
  reward: { produced_total: number; in_a_row: number; line: string } | null;
  focus: DeskFocus;
  people: DeskPerson[];
  questions: string[];
  slides: { title: string; url: string } | null;
  checklist: Checklist;
}

/// What the route gathers for one episode.
export interface DeskInput {
  id: string;
  title: string;
  session_no: number | null;
  series_title: string | null;
  meta: Record<string, unknown>;
  plan: SeriesPlan;
  checklist: Checklist;
  /// Every checklist of the series, for the reward.
  siblings: Checklist[];
  participants: Array<{ id: string; display_name: string; color: string | null; role: string | null; seq: number }>;
  /// `type` 'talk_card' marks the talk notes; when an episode has them, its other sections (a class's slides) stay off the desk.
  sections: Array<{ heading: string | null; type?: string | null; points: Array<{ text: string | null; speaker_ref: string | null }> }>;
  reading: DeskReading | null;
  slides: { title: string; deck: string } | null;
  now: Date;
}

export type DeskReading =
  | { kind: 'qr'; surah: number; surah_name: string | null; from: number; to: number;
      ayahs: Array<{ ayah: number; text: string; en: string | null }>; translation: string | null }
  | { kind: 'wv'; title: string | null; passages: Array<{ id: string; cite: string | null; text: string; en: string | null }> };

function str(v: unknown): string | null { return typeof v === 'string' && v.trim() ? v.trim() : null; }

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
}

/// The one thing to do now, from the checklist (the worker's planned days) and the series' step cues.
export function deskNow(plan: SeriesPlan, c: Checklist, now: Date, partner: string | null, cite: string | null): DeskNow {
  const days = c.steps.length;
  const base = { cue: null, cue_prayer: null, cue_after_min: null, cue_on: null, minutes: null, countdown: null,
    still_on: false };
  if (c.state === 'done') {
    return { ...base, key: null, label: c.finished_label ? `Recorded ${c.finished_label}` : 'Recorded', action: null,
      state: 'done', day_of: days, days };
  }
  if (c.state === 'queued') {
    return { ...base, key: null, label: 'Waits its turn — record the active one first', action: null, state: 'queued',
      day_of: 0, days };
  }
  const i = c.steps.findIndex((s) => !s.done);
  const step = c.steps[i] ?? c.steps[c.steps.length - 1]!;
  const def = plan.steps.find((d) => d.key === step.key);
  const action: 'read' | 'record' = step.action === 'shoot' ? 'record' : 'read';
  const today = dayIn(plan.tz, now);
  let countdown: string | null = null, stillOn = false;
  if (step.planned_on) {
    const d = daysBetween(today, step.planned_on);
    if (d < 0) { stillOn = true; countdown = 'still on — today'; }
    else countdown = d === 0 ? 'today' : d === 1 ? 'tomorrow' : `in ${d} days`;
  }
  const minutes = def?.minutes ?? null;
  const label = action === 'record'
    ? `Record${partner ? ` with ${partner}` : ''}`
    : `Read${cite ? ` ${cite}` : ''}${minutes ? ` · ${minutes} min` : ''}`;
  return {
    key: step.key, label, action, state: 'active',
    cue: def?.cue ?? null, cue_prayer: def?.cuePrayer ?? null, cue_after_min: def?.cueAfterMin ?? null,
    cue_on: step.planned_on ? (stillOn ? today : step.planned_on) : null, minutes, day_of: Math.max(1, i + 1), days, countdown, still_on: stillOn,
  };
}

/// Episodes produced in the series, and the run of them each finished within a cadence (+1 day) of the one before.
export function deskReward(siblings: Checklist[], cadenceDays: number | null): Desk['reward'] {
  const done = siblings.map((c) => c.finished_on).filter((d): d is string => !!d).sort();
  if (!done.length) return null;
  const gap = (cadenceDays ?? 7) + 1;
  let run = 1;
  for (let k = done.length - 1; k > 0; k--) {
    if (daysBetween(done[k - 1]!, done[k]!) <= gap) run++; else break;
  }
  const line = `${done.length} produced${run > 1 ? ` · ${run} in a row` : ''}`;
  return { produced_total: done.length, in_a_row: run, line };
}

/// Each person's points, by section, in the order the sections run; a point with no speaker is the host's.
export function deskPeople(input: Pick<DeskInput, 'participants' | 'sections'>): DeskPerson[] {
  const people = [...input.participants].sort((a, b) => a.seq - b.seq);
  if (!people.length) return [];
  const host = people.find((p) => p.role === 'host') ?? people[0]!;
  const out = new Map(people.map((p) => [p.id, { name: p.display_name, color: p.color, role: p.role,
    groups: [] as DeskPerson['groups'] }]));
  const talk = input.sections.filter((s) => s.type === 'talk_card');
  for (const s of talk.length ? talk : input.sections) {
    for (const pt of s.points) {
      const text = str(pt.text);
      if (!text) continue;
      const who = out.get(pt.speaker_ref ?? '') ?? out.get(host.id)!;
      const heading = str(s.heading) ?? '';
      const last = who.groups[who.groups.length - 1];
      if (last && last.heading === heading) last.points.push(text);
      else who.groups.push({ heading, points: [text] });
    }
  }
  return [...out.values()].filter((p) => p.groups.length);
}

function conceptOf(meta: Record<string, unknown>): DeskFocus['concept'] {
  const c = meta['concept'];
  if (typeof c === 'string' && c.trim()) return { id: null, label: c.trim() };
  if (c && typeof c === 'object') {
    const r = c as Record<string, unknown>;
    const label = str(r['label']);
    if (label) return { id: str(r['id']), label };
  }
  return null;
}

export function deskFocus(input: Pick<DeskInput, 'meta' | 'reading' | 'checklist'>): DeskFocus {
  const open = input.checklist.steps.find((s) => s.open)?.open ?? null;
  const concept = conceptOf(input.meta);
  const r = input.reading;
  if (r?.kind === 'qr') {
    const span = r.from === r.to ? `${r.surah}:${r.from}` : `${r.surah}:${r.from}–${r.to}`;
    return {
      cite: r.surah_name ? `${r.surah_name} ${span}` : span, rtl: true, concept, translation: r.translation, note: null,
      open_url: open?.url ?? null,
      blocks: r.ayahs.map((a) => ({ id: `${r.surah}:${a.ayah}`, n: a.ayah, cite: null, text: a.text, en: a.en })),
    };
  }
  if (r?.kind === 'wv') {
    const first = r.passages[0]?.cite ?? null, last = r.passages[r.passages.length - 1]?.cite ?? null;
    const span = first && last && first !== last ? `${first}–${last}` : first;
    return {
      cite: [r.title, span].filter(Boolean).join(' · ') || null, rtl: false, concept, translation: null, note: null,
      open_url: open?.url ?? null,
      blocks: r.passages.map((p) => ({ id: p.id, n: null, cite: p.cite, text: p.text, en: p.en })),
    };
  }
  const card = input.meta['card'] && typeof input.meta['card'] === 'object'
    ? input.meta['card'] as Record<string, unknown> : {};
  return {
    cite: null, rtl: false, concept, blocks: [], translation: null,
    note: str(input.meta['read_note']) ?? str(card['read']), open_url: open?.url ?? null,
  };
}

/// The short cite the Now bar names ("40:4–5", "Locke ch. V §25–33").
function nowCite(focus: DeskFocus, meta: Record<string, unknown>, reading: DeskReading | null): string | null {
  if (str(meta['read_label'])) return str(meta['read_label']);
  if (reading?.kind === 'qr') return reading.from === reading.to ? `${reading.surah}:${reading.from}` : `${reading.surah}:${reading.from}–${reading.to}`;
  return focus.cite;
}

export function buildDesk(input: DeskInput): Desk {
  const focus = deskFocus(input);
  const people = deskPeople(input);
  const hostName = people[0]?.name ?? null;
  const partner = input.participants.length > 1
    ? [...input.participants].sort((a, b) => a.seq - b.seq).find((p) => p.display_name !== hostName)?.display_name ?? null
    : null;
  const questions = Array.isArray(input.meta['questions'])
    ? (input.meta['questions'] as unknown[]).map(str).filter((q): q is string => !!q) : [];
  return {
    id: input.id, title: input.title, number: input.session_no, series: input.series_title,
    now: deskNow(input.plan, input.checklist, input.now, partner, nowCite(focus, input.meta, input.reading)),
    reward: deskReward(input.siblings, input.plan.cadenceDays),
    focus, people, questions,
    slides: input.slides ? { title: input.slides.title, url: `com.kmaps.app://deck/${input.slides.deck}` } : null,
    checklist: input.checklist,
  };
}

