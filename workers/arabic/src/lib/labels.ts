import { query } from '../../../shared/src/db';
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
                                          icon: s.icon ?? 'circle', color: s.color ?? '#D8B657' });

/// A badge: what a drill works on, or how hard it is.
export const badge = (l: Label | undefined) => (l ? { label: l.label, labelAr: l.labelAr, color: l.color ?? '#D8B657' } : null);

/// Each drill carries the instruction for its kind.
export function instruct<T extends { kind: string }>(items: T[], all: Scopes) {
  const kinds = byKey(all.kind);
  return items.map((it) => ({ ...it, instruction: kinds.get(it.kind)?.label ?? null, instructionAr: kinds.get(it.kind)?.labelAr ?? null }));
}

/// Every drill files a review card (CORE SRS) keyed to what it asks about, so the same word or line
/// meets the same card again and the schedule follows the learner's answers. What a card asks and
/// answers, by kind of drill; null where a drill has nothing to remember by itself.
export function srsCardFor(it: Record<string, unknown>): Record<string, unknown> | null {
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
    case 'grammar': case 'feature':
      front = [prompt, s(it.promptEn)].filter(Boolean).join('\n'); back = [ans, s(it.explanation)].filter(Boolean).join('\n'); type = 'grammar'; break;
    case 'speaker':
      // who says it: the line on the front, the speaker and what they mean on the back
      front = [line, prompt].filter(Boolean).join('\n'); back = [ans, en].filter(Boolean).join('\n'); type = 'passage'; break;
    case 'gist':
      front = prompt; back = [ans, en].filter(Boolean).join('\n'); type = 'passage'; break;
    case 'dialogue': {
      // the exchange as it was spoken, turn by turn, and its English
      const turns = (it.dialogue as Array<{ speaker?: string | null; ar: string; en?: string | null }> | undefined) ?? [];
      front = turns.map((d) => (d.speaker ? `${d.speaker}: ${d.ar}` : d.ar)).join('\n') || null;
      back = turns.map((d) => s(d.en)).filter(Boolean).join('\n') || null; type = 'passage'; break;
    }
    default: return null;
  }
  // every drill files a card: with nothing else to put on the back, the line itself or where it is from
  back = back || line || s((it.source as { title?: string } | undefined)?.title);
  if (!front || !back) return null;
  // what a review needs to play it again: the clip and its timed words
  const extra: Record<string, unknown> = {};
  if (it.audio) extra.audio = it.audio;
  if (it.words) extra.words = it.words;
  return { module: 'AR', resource_type: type, card_kind: String(it.bucket ?? it.kind), card_template: String(it.kind),
           resource_ref: `AR:drill:${String(it.id)}`, front_text: front, back_text: back,
           ...(Object.keys(extra).length ? { extra } : {}) };
}
