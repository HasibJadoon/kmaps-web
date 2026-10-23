import { query } from '../../../shared/src/db';
import { validOptions } from '../../../shared/src/drill-check';
import type { QuranEnv } from '../env';
import type { Label } from '../lib/labels';

// What the book-built drills (practice-tafsir.ts, practice-irabbooks.ts) share with practice.ts:
// the āyah as it is heard (words, timings, clip, English) and the review card each drill files.
// Copied from practice.ts, which keeps its own; keep the two in step.

const RECITER = 7;

export type Scope = { surah: number | null; from: number | null; to: number | null };
export type Band = 'basic' | 'middle' | 'advanced' | 'all';
export type Drill = Record<string, unknown>;

export const shuffle = <T>(xs: T[]) => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const cap = (s: string | null | undefined) => (s ?? '').replace(/^\w/, (c) => c.toUpperCase());
export const uniq = <T>(xs: T[]) => xs.filter((x, i) => xs.indexOf(x) === i);
export const parseJson = <T>(s: string | null | undefined, d: T): T => { try { return s ? JSON.parse(s) as T : d; } catch { return d; } };

type Word = { word_index: number; word_text: string; pos: string | null; lemma: string | null; is_content_word: number | null };
export type Ayah = { key: string; surah: number; ayah: number; ws: Word[]; words: { t: string; s: number; e: number }[]; aligned: boolean;
                     audio: { url: string; start: number; end: number } | null; en: string | null; title: string; surahName: string };

/// Each āyah with its words, their times in the recitation (where it numbers the words as the
/// corpus does), its clip, its default English, and where it stands.
export async function loadAyat(env: QuranEnv, pairs: number[][]): Promise<Map<string, Ayah>> {
  pairs = uniq(pairs.map((p) => `${p[0]}:${p[1]}`)).map((k) => k.split(':').map(Number));
  if (!pairs.length) return new Map();
  const inAyat = pairs.map(() => '(surah = ? AND ayah = ?)').join(' OR ');
  const flat = pairs.flat();
  const surahIds = [...new Set(pairs.map((p) => p[0]))];
  const [words, rec, tr, surahs] = await Promise.all([
    query<Word & { surah: number; ayah: number }>(env.DB_QR,
      `SELECT surah, ayah, word_index, word_text, pos, lemma, is_content_word FROM qr_word_occurrence WHERE (surah, ayah) IN (SELECT json_extract(value, '$[0]'), json_extract(value, '$[1]') FROM json_each(?)) ORDER BY surah, ayah, word_index`, [JSON.stringify(pairs)]),
    query<{ surah: number; ayah: number; start_ms: number; end_ms: number; segments_json: string | null; audio_url: string }>(env.DB_QR,
      `SELECT a.surah, a.ayah, a.start_ms, a.end_ms, a.segments_json, r.audio_url FROM qr_recitation_ayah a
         JOIN qr_recitation r ON r.reciter_id = a.reciter_id AND r.surah = a.surah
        WHERE a.reciter_id = ${RECITER} AND (a.surah, a.ayah) IN (SELECT json_extract(value, '$[0]'), json_extract(value, '$[1]') FROM json_each(?))`, [JSON.stringify(pairs)]),
    query<{ surah: number; ayah: number; text: string }>(env.DB_QR,
      `SELECT t.surah, t.ayah, t.translation_text AS text FROM qr_translation t
         JOIN qr_translation_source s ON s.id = t.source_id AND s.is_default = 1 WHERE (t.surah, t.ayah) IN (SELECT json_extract(value, '$[0]'), json_extract(value, '$[1]') FROM json_each(?))`, [JSON.stringify(pairs)]),
    query<{ id: number; name_en: string }>(env.DB_QR, `SELECT id, name_en FROM qr_surah WHERE id IN (${surahIds.map(() => '?').join(',')})`, surahIds),
  ]);
  const names = new Map(surahs.map((s) => [s.id, s.name_en]));
  const recOf = new Map(rec.map((r) => [`${r.surah}:${r.ayah}`, r]));
  const enOf = new Map(tr.map((r) => [`${r.surah}:${r.ayah}`, r.text]));
  const wsOf = new Map<string, Word[]>();
  for (const w of words) wsOf.set(`${w.surah}:${w.ayah}`, [...(wsOf.get(`${w.surah}:${w.ayah}`) ?? []), w]);
  const out = new Map<string, Ayah>();
  for (const [s, a] of pairs) {
    const key = `${s}:${a}`;
    const ws = wsOf.get(key) ?? [];
    const r = recOf.get(key);
    const segs: number[][] = r?.segments_json ? JSON.parse(r.segments_json) : [];
    const at = new Map<number, number[]>();
    for (const x of segs) if (!at.has(x[0])) at.set(x[0], x);
    const aligned = ws.length > 0 && at.size === ws.length && ws.every((w) => at.has(w.word_index));
    const surahName = names.get(s) ?? `Surah ${s}`;
    out.set(key, {
      key, surah: s, ayah: a, ws, aligned, en: enOf.get(key) ?? null, surahName,
      title: `${surahName} ${s}:${a}`,
      words: ws.map((w) => { const t = aligned ? at.get(w.word_index) : undefined; return { t: w.word_text, s: t ? t[1] / 1000 : 0, e: t ? t[2] / 1000 : 0 }; }),
      audio: r ? { url: r.audio_url, start: r.start_ms / 1000, end: r.end_ms / 1000 } : null,
    });
  }
  return out;
}

/// The review card every drill files: the whole drill kept so review replays it, and where it sits.
export function withCard(drill: Drill, a: { ref: string; type: string; kind: string; front: string; back: string;
                         surah?: number | null; ayah?: number | null; series?: string | null; band?: Band }) {
  drill.srs = {
    module: 'QR', resource_type: a.type, card_kind: a.kind, card_template: String(drill.kind),
    resource_ref: a.ref, front_text: a.front, back_text: a.back,
    extra: { drill: { ...drill }, group: { skill: a.kind, band: a.band && a.band !== 'all' ? a.band : null, series: a.series ?? null,
                                           workId: a.surah ? `QR:SURAH:${a.surah}` : null, work: a.surah ? `${a.surah}:${a.ayah ?? ''}` : null,
                                           episode: null, scene: null } },
  };
  return drill;
}

/// The guarantee behind every QR drill: one a builder dealt without its card gets one here, named by what it asks and
/// answers, so nothing practised is left out of review (iOS files nothing for a drill with no card). A builder's own
/// card always wins. An EMPTY drill (nothing asked or nothing to answer) gives null: it is dropped, never dealt.
export function ensureCard(drill: Drill, skill: string, band?: Band): Drill | null {
  if (!validOptions(drill)) return null;            // unsound choices: dropped, never dealt
  if (drill.srs) return drill;
  const s = (x: unknown) => (typeof x === 'string' && x.trim() ? x.trim() : null);
  const line = ((drill.words as Array<{ t: string }> | undefined) ?? []).map((w) => w.t).join(' ') || null;
  const pairs = ((drill.pairs as string[][] | undefined) ?? []).filter((p) => Array.isArray(p) && p.length >= 2);
  const units = ((drill.units as unknown[] | undefined) ?? []).filter((u): u is string => typeof u === 'string');
  const front = s(drill.prompt) ?? s(drill.promptEn) ?? line ?? (pairs.length ? pairs.map((p) => p[0]).join('\n') : null)
    ?? (units.length ? [...units].sort().join(' · ') : null);
  const back = s(drill.answer) ?? (pairs.length ? pairs.map((p) => p[1]).join('\n') : null) ?? (units.length ? units.join(' → ') : null)
    ?? s(drill.explanation) ?? s(drill.en) ?? line;
  if (!front || !back) return null;
  const ws = /:(\d{1,3}):(\d{1,3})(?::|$)/.exec(String(drill.id ?? ''));
  const surah = (drill.source as { workId?: string } | undefined)?.workId?.match(/^QR:SURAH:(\d+)/)?.[1] ?? ws?.[1];
  return withCard(drill, { ref: `QR:${skill}:${String(drill.id)}`, type: 'passage', kind: skill, front, back,
                           surah: surah ? Number(surah) : null, ayah: ws ? Number(ws[2]) : null, series: skill, band });
}

/// Which of a skill's levels these settings are (the card files under it), and every ask the skill has.
export function levelOf(L: Record<string, Label[]>, skill: string, lv: Record<string, unknown>) {
  const meta = (L.skill ?? []).find((s) => s.key === skill);
  const levels = (meta?.extra?.levels ?? {}) as Record<string, { asks?: string[] }>;
  const mine = JSON.stringify(lv.asks ?? null);
  const band = (Object.keys(levels).find((k) => JSON.stringify(levels[k].asks ?? null) === mine) ?? 'all') as Band;
  const asks = (lv.asks as string[] | undefined) ?? uniq(Object.values(levels).flatMap((l) => l.asks ?? []));
  return { band, asks, extra: (meta?.extra ?? {}) as Record<string, unknown> };
}

/// Take n from several piles in turn, so a level's kinds of drill are mixed.
export function interleave<T>(piles: T[][], n: number): T[] {
  const out: T[] = [];
  for (let i = 0; out.length < n && piles.some((p) => i < p.length); i++)
    for (const p of piles) if (i < p.length && out.length < n) out.push(p[i]);
  return out;
}

export const rangeOf = (s: number, a: number, b: number | null | undefined) => (b && b > a ? `${s}:${a}–${b}` : `${s}:${a}`);

type AyahPart = { ayah: number; ws: Array<{ word_index: number }>; words: Array<{ t: string; s: number; e: number }>;
                  audio: { url: string; start: number; end: number } | null; en: string | null };

/// A drill built on part of its āyāt (a sentence, a story's words) set back in them whole: the full āyāt's words, audio
/// and English, its own indices (span, blank, target) moved to where its first word stands. A word clip (hear) keeps its
/// clip and hears the āyāt as its line. The card's copy is kept in step.
export function widenToAyat(d: Drill, parts: AyahPart[], first: { ayah: number; word_index: number }): Drill {
  let off = 0;
  for (const p of parts) {
    if (p.ayah !== first.ayah) { off += p.ws.length; continue; }
    const i = p.ws.findIndex((w) => w.word_index === first.word_index);
    if (i < 0) return d;
    off += i;
    break;
  }
  const a0 = parts[0]?.audio, a1 = parts[parts.length - 1]?.audio;
  if (!a0 || !a1) return d;
  const full = { url: a0.url, start: a0.start, end: a1.end };
  d.words = parts.flatMap((p) => p.words);
  if (Array.isArray(d.span)) d.span = (d.span as number[]).map((i) => i + off);
  if (typeof d.blank === 'number') d.blank += off;
  if (typeof d.target === 'number') { d.target += off; d.line = full; } else d.audio = full;
  const en = uniq(parts.map((p) => p.en).filter((x): x is string => !!x)).join(' ');
  if (en) d.en = en;
  const { srs, ...plain } = d as { srs?: { extra: { drill: unknown } } };
  if (srs) srs.extra.drill = { ...plain };
  return d;
}

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const arNum = (n: number) => String(n).replace(/\d/g, (d) => AR_DIGITS[Number(d)]);

/// The āyah's reference as every Qurʾān drill shows it under its line: ﴿الأنعام، ١٤٥- 6:145 ﴾ (a range: ﴿غافر، ٢–٣- 40:2–3 ﴾).
export const quranRef = (nameAr: string, s: number, a: number, b?: number | null) =>
  `﴿${nameAr}، ${arNum(a)}${b && b > a ? `–${arNum(b)}` : ''}- ${rangeOf(s, a, b)} ﴾`;

/// Every drill set in an āyah (it carries the āyah's words) gets its reference, on the drill and on the copy its card
/// keeps, so the line is never shown without where it stands. The place comes from the drill's source title
/// ("Al-Anam 6:145", "Ghafir 40:2–3"), else its id.
export async function attachRef(db: D1Database, drills: Drill[]): Promise<Drill[]> {
  const placeOf = (d: Drill) => {
    const t = String((d.source as { title?: string } | undefined)?.title ?? '');
    const m = /(\d{1,3}):(\d{1,3})(?:\s*[–-]\s*(\d{1,3}))?/.exec(t) ?? /:(\d{1,3}):(\d{1,3})(?::|$)/.exec(String(d.id ?? ''));
    return m ? { s: Number(m[1]), a: Number(m[2]), b: m[3] ? Number(m[3]) : null } : null;
  };
  const placed = drills.map((d) => ({ d, p: Array.isArray(d.words) && (d.words as unknown[]).length && !d.ref ? placeOf(d) : null }));
  const ids = [...new Set(placed.flatMap((x) => (x.p ? [x.p.s] : [])))];
  if (!ids.length) return drills;
  const names = new Map((await query<{ id: number; name_ar: string }>(db,
    `SELECT id, name_ar FROM qr_surah WHERE id IN (${ids.map(() => '?').join(',')})`, ids)).map((r) => [r.id, r.name_ar]));
  for (const { d, p } of placed) {
    const name = p && names.get(p.s);
    if (!p || !name) continue;
    d.ref = quranRef(name, p.s, p.a, p.b);
    const card = (d.srs as { extra?: { drill?: Drill } } | undefined)?.extra?.drill;
    if (card) card.ref = d.ref;
  }
  return drills;
}
