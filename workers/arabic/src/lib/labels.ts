import { query } from '../../../shared/src/db';
import { validOptions, drillGid } from '../../../shared/src/drill-check';
import type { ArabicEnv } from '../env';

// Every label an exercise shows lives in ar_practice_label (migration 0013):
// the skills, each drill kind's instruction, the buckets and tiers, the Qurʾān
// frequency tiers, part-of-speech labels. Read once a minute per isolate; the
// responses built from them are cached by the 'content' version, which the
// table's triggers move on any edit.

export interface Label {
  key: string; label: string; labelAr: string | null; detail: string | null; icon: string | null;
  color: string | null; min: number | null; extra: Record<string, unknown> | null;
}
type Scopes = Record<string, Label[]>;

let memo: { at: number; data: Scopes } | null = null;

export async function labels(env: ArabicEnv): Promise<Scopes> {
  if (memo && Date.now() - memo.at < 60_000) return memo.data;
  const rows = await query<{ scope: string; key: string; label: string; label_ar: string | null; detail: string | null;
                             icon: string | null; color: string | null; min_value: number | null; extra_json: string | null }>(env.DB_AR,
    `SELECT scope, key, label, label_ar, detail, icon, color, min_value, extra_json FROM ar_practice_label ORDER BY scope, sort`);
  const data: Scopes = {};
  for (const r of rows) {
    let extra: Record<string, unknown> | null = null;
    try { extra = r.extra_json ? JSON.parse(r.extra_json) : null; } catch { /* keep null */ }
    (data[r.scope] ??= []).push({ key: r.key, label: r.label, labelAr: r.label_ar, detail: r.detail, icon: r.icon,
                                  color: r.color, min: r.min_value, extra });
  }
  memo = { at: Date.now(), data };
  return data;
}

export const byKey = (xs: Label[] | undefined) => new Map((xs ?? []).map((x) => [x.key, x]));

/// A skill card as the app shows it.
export const skillCard = (s: Label) => ({ id: s.key, title: s.label, titleAr: s.labelAr ?? '', tagline: s.detail ?? '',
                                          icon: s.icon ?? 'circle', color: s.color ?? '#D8B657',
                                          // 'lines' when the skill draws recorded lines — what a path step's practice can narrow
                                          source: (s.extra?.source as string | undefined) ?? null });

/// A badge: what a drill works on, or how hard it is.
export const badge = (l: Label | undefined) => (l ? { label: l.label, labelAr: l.labelAr, color: l.color ?? '#D8B657' } : null);

/// Each drill carries the instruction for its kind — or its own, where it was built with one (a grammar
/// drill words it by what it asks: gt_shahid, gs_term …).
export function instruct<T extends { kind: string; instruction?: string | null; instructionAr?: string | null }>(items: T[], all: Scopes) {
  const kinds = byKey(all.kind);
  return items.map((it) => ({ ...it, instruction: it.instruction ?? kinds.get(it.kind)?.label ?? null,
                              instructionAr: it.instructionAr ?? kinds.get(it.kind)?.labelAr ?? null }));
}

/// Every drill files a review card (CORE SRS) keyed to what it asks about, so the same word or line
/// meets the same card again and the schedule follows the learner's answers. What a card asks and
/// answers, by kind of drill. A kind with no case of its own (a new one) still files, through the general rule below —
/// whatever is practised goes to review. Null only for an EMPTY drill (nothing asked, nothing to answer): such a drill
/// is dropped, never dealt and never filed (dropEmpty).
/// Where a drill sits, so its card can be grouped: the skill it was drilled in, the level,
/// and the series or book, episode and scene it came from.
/// Concept-based only: drills of a kind retired in its label row (about a person, a book, a bāb, a school's position —
/// information gathering, AR 0053) are dropped.
export const dropRetired = <T extends Record<string, unknown>>(xs: T[], L: Record<string, Label[]>) => {
  const K = new Map((L.kind ?? []).map((l) => [l.key, l]));
  return xs.filter((x) => !(K.get(String(x.ask ?? x.kind ?? ''))?.extra as { retired?: unknown } | null)?.retired);
};

/// The drills worth dealing: an empty one (no card can be made of it) is dropped.
export const dropEmpty = <T extends Record<string, unknown>>(xs: T[]) => xs.filter((x) => x.srs != null);

export type DrillGroup = { skill?: string; band?: string; series?: string | null; episode?: string | null; scene?: number | null };

export function srsCardFor(it: Record<string, unknown>, g: DrillGroup = {}): Record<string, unknown> | null {
  const s = (x: unknown) => (typeof x === 'string' && x.trim() ? x.trim() : null);
  const line = ((it.words as Array<{ t: string }> | undefined) ?? []).map((w) => w.t).join(' ') || null;
  const en = s(it.en), ans = s(it.answer), prompt = s(it.prompt);
  // the asked word's own meaning: its gloss, or its gloss in the line — the back of a
  // listening card when the line itself has no English
  const at = typeof it.target === 'number' ? it.target : typeof it.blank === 'number' ? it.blank : -1;
  const wordGloss = s(it.gloss) ?? s((it.glosses as unknown[] | undefined)?.[at]);
  let front: string | null = null, back: string | null = null, type = 'vocabulary';
  switch (it.kind) {
    case 'fill': case 'hear': case 'vocab': case 'idiom': case 'nuance':
      front = [it.kind === 'fill' || it.kind === 'hear' || it.kind === 'nuance' ? ans : prompt, line].filter(Boolean).join('\n');
      back = [it.kind === 'fill' || it.kind === 'hear' || it.kind === 'nuance' ? en ?? wordGloss : ans, it.kind === 'vocab' || it.kind === 'idiom' ? en : null]
        .filter((x, i, a) => x && a.indexOf(x) === i).join('\n');
      break;
    case 'read': {
      const words = ((it.words as Array<{ t: string }> | undefined) ?? []).map((w, i) => (i === it.blank ? '＿＿＿' : w.t));
      front = words.join(' '); back = [ans, s((it.source as { title?: string } | undefined)?.title)].filter(Boolean).join('\n');
      break;
    }
    case 'order': case 'dictation': case 'shadow':
      front = en ?? line; back = line; type = 'passage'; break;
    case 'match':
      front = line; back = en; type = 'passage'; break;
    case 'meaning': case 'plural':
      front = prompt; back = [ans, s(it.gloss)].filter(Boolean).join('\n'); break;
    case 'pairs': {
      // the words on the front, each meaning on the back, in the same order
      const pairs = ((it.pairs as string[][] | undefined) ?? []).filter((p) => p.length >= 2);
      front = pairs.map((p) => p[0]).join('\n') || null; back = pairs.map((p) => p[1]).join('\n') || null; break;
    }
    case 'grammar': case 'feature':
      // the sentence it was asked in, then the question — the line only where the prompt is not already it
      front = [line && !(prompt ?? '').includes(line) ? line : null, prompt, s(it.promptEn)].filter(Boolean).join('\n');
      back = [ans, s(it.explanation)].filter(Boolean).join('\n'); type = 'grammar'; break;
    case 'speaker':
      // who says it: the line on the front, the speaker and what they mean on the back
      front = [line, prompt].filter(Boolean).join('\n'); back = [ans, en].filter(Boolean).join('\n'); type = 'passage'; break;
    case 'gist':
      front = prompt; back = [ans, en].filter(Boolean).join('\n'); type = 'passage'; break;
    case 'sarf_mudari': case 'sarf_jam': case 'sarf_lemma':
      // a word's ṣarf: the form given, the form asked for (past → present, singular → plural, word → dictionary form)
      front = [prompt, s(it.heard) && s(it.heard) !== prompt ? s(it.heard) : null].filter(Boolean).join('\n'); back = ans; break;
    case 'sarf_pairs': {
      const pairs = ((it.pairs as string[][] | undefined) ?? []).filter((p) => p.length >= 2);
      front = pairs.map((p) => p[0]).join('\n') || null; back = pairs.map((p) => p[1]).join('\n') || null; break;
    }
    case 'dialogue': {
      // the exchange as it was spoken, turn by turn, and its English
      const turns = (it.dialogue as Array<{ speaker?: string | null; ar: string; en?: string | null }> | undefined) ?? [];
      front = turns.map((d) => (d.speaker ? `${d.speaker}: ${d.ar}` : d.ar)).join('\n') || null;
      back = turns.map((d) => s(d.en)).filter(Boolean).join('\n') || null; type = 'passage'; break;
    }
    default: break;   // a kind with no rule of its own: the general one below
  }
  // The general rule — and the fill-in for any face a kind left empty: the question (or the line, or the units to
  // order, or the pairs' left side) on the front; the answer (or the pairs' right side, the units in order, the
  // explanation) on the back. The drill itself is what review replays; the faces only name the card.
  const pairs = ((it.pairs as string[][] | undefined) ?? []).filter((p) => Array.isArray(p) && p.length >= 2);
  const units = ((it.units as unknown[] | undefined) ?? []).filter((u): u is string => typeof u === 'string');
  front = front || prompt || s(it.promptEn) || line || (pairs.length ? pairs.map((p) => p[0]).join('\n') : null)
    || (units.length ? [...units].sort().join(' · ') : null);
  back = back || ans || (pairs.length ? pairs.map((p) => p[1]).join('\n') : null) || (units.length ? units.join(' → ') : null)
    || s(it.explanation) || en || line;
  // an empty drill — nothing asked or nothing to answer by — is not filed under a made-up name: it is dropped;
  // so is one whose choices are unsound (answer missing, two the same, fewer than two)
  if (!front || !back || !validOptions(it)) return null;
  // what a review needs to play it again: the whole drill as it was drilled (the clip, the
  // timed words, the blank, the options) — review replays it as a drill, not a flipped card.
  // Its context panel is left out: a review fetches that when it is opened.
  const { srs: _s, context: _c, badges: _b, ...rest } = it;
  const drill = { ...rest, gid: drillGid('AR', it.id) };
  const src = (it.source ?? {}) as { workId?: string; title?: string; level?: string | null };
  const extra: Record<string, unknown> = {
    drill,
    group: { skill: g.skill ?? String(it.kind), band: g.band ?? null, series: g.series ?? null,
             workId: src.workId ?? null, work: src.title ?? null, episode: g.episode ?? null, scene: g.scene ?? null },
  };
  if (it.audio) extra.audio = it.audio;
  if (it.words) extra.words = it.words;
  return { module: 'AR', resource_type: type, card_kind: String(it.bucket ?? it.kind), card_template: String(it.kind),
           resource_ref: `AR:drill:${String(it.id)}`, front_text: front, back_text: back,
           extra };
}
