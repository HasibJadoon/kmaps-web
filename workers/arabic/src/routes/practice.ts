import type { Router } from '../../../shared/src/router';
import { attachGt } from '../../../shared/src/gt-attach';
import { ok, badRequest } from '../../../shared/src/response';
import { query } from '../../../shared/src/db';
import type { ArabicEnv } from '../env';
import { labels, byKey, skillCard, instruct, srsCardFor } from '../lib/labels';
import { worksOfStep } from './learn-path';
import { commonWords, isCommon } from '../lib/common';
import { parseBand, bare, BANDS, type Band } from '../lib/levels';
const BANDS_CEFR: Record<string, readonly string[]> = Object.fromEntries(BANDS.map((b) => [b.key, b.cefr]));
import { mineDrills } from './words';
import { al, asDrills, drawSentences, registry, round, sceneDrills, sentenceDrills, shuffle, stage, termsOf, hadd,
         type GramDrill, type Group, type L } from '../lib/grammar';

// ── Practice: skills drilled on real Arabic ──────────────────────────────────
// Every listening drill is cut from a line someone actually said — in a series,
// a podcast, a story, a reading — with every word timed (ar_practice_pool), so
// the app can play the line, or one word of it, from the recording itself.
// The worker builds each drill whole (the blank, the options, the order); the
// app only plays and checks. A session is drawn fresh each time, so it is never
// kept; the skill list is.

// the skills are data: ar_practice_label scope 'skill' (lib/labels.ts); so are the levels' sentences
// (scope sentence_band: word counts, an upper band, graded classical sentences, rare or common blanks)
// and the Grammar skill's sources per level (scope grammar_drill 'practice')

interface Line {
  id: string; band: string; level: string | null; work_id: string | null; work_title: string | null;
  object_key: string; start_sec: number; end_sec: number; text_ar: string; words_json: string; word_count: number;
  text_en: string | null; gloss_json: string | null; blanks_json?: string | null;
}

/// The blanks chosen offline for a line (blanks_json, kmaps-resources drill_words.py): a word
/// worth drilling and three options of its own part of speech and shape, real words only.
type Blank = { i: number; a: string; o: string[]; p: string | null };
const blanksOf = (l: { blanks_json?: string | null }): Blank[] => {
  try { const b = l.blanks_json ? JSON.parse(l.blanks_json) as Blank[] : []; return Array.isArray(b) ? b.filter((x) => x.o?.length === 3) : []; }
  catch { return []; }
};

const audioUrl = (key: string) => `/api/ar/audio/${encodeURI(key)}`;

// ── Levels: what each level's sentences are (ar_practice_label scope sentence_band) ──────────
// the word counts of its recorded lines, an upper band a share of a session is drawn from, the
// classical sentences it reads (ar_read_pool grades) and hears (the voiced ones, as lines), and
// which blank it prefers — the commoner content word at Level 1, the rarer at Level 3
type BandCfg = { lines?: { min: number; max: number }; upper?: { min: number; share: number }; book?: { grades: number[]; share: number };
                 read?: { grades: number[] }; blank?: 'common' | 'mid' | 'rare'; words?: { vocab?: number } };
const bandCfg = (all: L, band: Band): BandCfg => (byKey(all.sentence_band).get(band === 'all' ? 'middle' : band)?.extra ?? {}) as BandCfg;

/// how common a word is in the Shamela library (ar_word_freq, kmaps-resources drill_words.py grade)
const freqKey = (w: string) => w.replace(/[ً-ْٰـۖ-ۭ]/g, '').replace(/[ٱأإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
  .replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/[^ء-ي]/g, '');
async function freqOf(env: ArabicEnv, ws: string[]) {
  const keys = [...new Set(ws.map(freqKey).filter((k) => k.length >= 2))];
  const out = new Map<string, number>();
  for (let i = 0; i < keys.length; i += 90) {
    const part = keys.slice(i, i + 90);
    for (const r of await query<{ bare: string; n: number }>(env.DB_AR, `SELECT bare, n FROM ar_word_freq WHERE bare IN (${part.map(() => '?').join(',')})`, part))
      out.set(r.bare, r.n);
  }
  return (w: string) => out.get(freqKey(w)) ?? 0;
}
/// of the words a line could blank, the one its level prefers: the commonest (Level 1), the rarest (Level 3), any (Level 2)
function prefer<T>(xs: T[], n: (x: T) => number, mode: BandCfg['blank']): T | undefined {
  if (!xs.length) return undefined;
  if (mode !== 'common' && mode !== 'rare') return xs[Math.floor(Math.random() * xs.length)];
  const sorted = [...xs].sort((a, b) => (mode === 'common' ? n(b) - n(a) : n(a) - n(b)));
  return sorted[Math.floor(Math.random() * Math.min(2, sorted.length))];
}

/// Random lines at a level, within its word counts — translated ones first, so the meaning can be shown.
/// Lines from the works one path step holds (step=… on a session): its own scenes, every band.
async function stepLines(env: ArabicEnv, works: string[], n: number, wc?: { min: number; max: number }): Promise<Line[]> {
  if (n <= 0 || !works.length) return [];
  const ids = works.slice(0, 90);
  return query<Line>(env.DB_AR,
    `SELECT * FROM ar_practice_pool WHERE work_id IN (${ids.map(() => '?').join(',')})
       ${wc ? 'AND word_count BETWEEN ? AND ?' : ''} ORDER BY (abs(rnd * 2654435761 + ?) % 1000003) LIMIT ?`,
    [...ids, ...(wc ? [wc.min, wc.max] : []), Math.floor(Math.random() * 1e6), n]);
}

async function drawLines(env: ArabicEnv, band: Band, n: number, translated = true, wc?: { min: number; max: number }): Promise<Line[]> {
  if (n <= 0) return [];
  const start = Math.floor(Math.random() * 1e9);
  const where = (band === 'all' ? '' : 'band = ? AND ') + (translated ? 'text_en IS NOT NULL AND ' : '') + (wc ? 'word_count BETWEEN ? AND ? AND' : '');
  const args = [...(band === 'all' ? [] : [band]), ...(wc ? [wc.min, wc.max] : [])];
  let rows = await query<Line>(env.DB_AR, `SELECT * FROM ar_practice_pool WHERE ${where} rnd >= ? ORDER BY rnd LIMIT ?`, [...args, start, n]);
  if (rows.length < n) rows = rows.concat(await query<Line>(env.DB_AR,
    `SELECT * FROM ar_practice_pool WHERE ${where} rnd >= 0 ORDER BY rnd LIMIT ?`, [...args, n - rows.length]));
  if (translated && rows.length < n) {
    const seen = new Set(rows.map((r) => r.id));
    rows = rows.concat((await drawLines(env, band, n - rows.length + 4, false, wc)).filter((r) => !seen.has(r.id)).slice(0, n - rows.length));
  }
  return rows;
}

/// Classical sentences with a rendered voice, every word timed (ar_read_pool, SILMA), as listening lines
async function bookLines(env: ArabicEnv, grades: number[], n: number, maxWords: number): Promise<Line[]> {
  if (n <= 0 || !grades.length) return [];
  const start = Math.floor(Math.random() * 1e9);
  const rows = await query<ReadRow & { word_count: number }>(env.DB_AR,
    `SELECT id, work_id, work_title, unit_id, text_ar, object_key, start_sec, end_sec, words_json, blanks_json, word_count FROM ar_read_pool
      WHERE object_key IS NOT NULL AND words_json IS NOT NULL AND grade IN (${grades.map(() => '?').join(',')}) AND word_count <= ?
      ORDER BY (abs(rowid * 2654435761 + ${start}) % 1000) LIMIT ?`, [...grades, maxWords, n]);
  return rows.filter((r) => { try { return (JSON.parse(r.words_json!) as unknown[]).length === r.text_ar.trim().split(/\s+/).length; } catch { return false; } })
    .map((r) => ({ id: `rp:${r.id}`, band: 'advanced', level: null, work_id: r.work_id, work_title: r.work_title, object_key: r.object_key!,
                   start_sec: r.start_sec ?? 0, end_sec: r.end_sec ?? 0, text_ar: r.text_ar.trim(), words_json: r.words_json!, word_count: r.word_count,
                   text_en: null, gloss_json: null, blanks_json: r.blanks_json }));
}

const glossesOf = (l: { gloss_json: string | null }) => { try { return l.gloss_json ? JSON.parse(l.gloss_json) as string[] : null; } catch { return null; } };

function wordsOf(l: Line) {
  let times: Array<[number, number]> = [];
  try { times = JSON.parse(l.words_json); } catch { times = []; }
  return l.text_ar.split(/\s+/).map((t, i) => ({ t, s: times[i]?.[0] ?? l.start_sec, e: times[i]?.[1] ?? l.end_sec }));
}

// Words that carry little on their own: never the blank.
// what not to drill is data (ar_common_word): function words at every level, common Qurʾān words above Basic

const shapeOf = (w: string) => { const b = bare(w); return b.startsWith('وال') ? 'وال' : b.startsWith('بال') ? 'بال' : b.startsWith('ال') ? 'ال'
  : b.startsWith('و') ? 'و' : b.startsWith('ب') ? 'ب' : b.startsWith('ل') ? 'ل' : ''; };

const endOf = (w: string) => { const b = bare(w); return (['ون', 'ين', 'ات', 'وا', 'نا', 'ها', 'هم', 'ة', 'ت', 'ه'].find((e) => b.endsWith(e) && b.length - e.length >= 2)) ?? ''; };

/// Words to offer beside the right one when the line has no blanks chosen offline: the same
/// article, prefix and ending (so the same kind of word), a close length, shared letters; none the same.
function distractors(answer: string, pool: string[], k = 3, light: (w: string) => boolean = () => false) {
  const a = bare(answer);
  const letters = new Set(a.replace(/^(وال|بال|ال|و|ب|ل)/, ''));
  const art = (w: string) => /^(وال|فال|بال|كال|لل|ال)/.test(bare(w));
  const scored = pool
    .filter((w) => { const b = bare(w); return b !== a && b.length >= 2 && !light(w) && art(w) === art(answer) && Math.abs(b.length - a.length) <= 2
      && !b.includes(a) && !a.includes(b); })
    .map((w) => {
      const b = bare(w);
      const shared = [...new Set(b.replace(/^(وال|بال|ال|و|ب|ل)/, ''))].filter((c) => letters.has(c)).length;
      return { w, score: shared + (shapeOf(w) === shapeOf(answer) ? 3 : 0) + (endOf(w) === endOf(answer) ? 4 : 0)
        - Math.abs(b.length - a.length) + Math.random() * 2 };
    })
    .sort((x, y) => y.score - x.score);
  const out: string[] = [];
  for (const { w } of scored) { if (!out.some((x) => bare(x) === bare(w))) out.push(w); if (out.length === k) break; }
  return out;
}
const clean = (w: string) => w.replace(/[؟،؛.!?"«»:…,()]/g, '');
/// Options shown bare, so the vowel marks of the right one do not give it away.
const shown = (w: string) => bare(clean(w));

async function lineDrills(env: ArabicEnv, all: L, skill: string, band: Band, n: number, works: string[] = []) {
  const cfg = bandCfg(all, band);
  const common = await commonWords(env);
  const light = (w: string) => isCommon(common, w, band === 'basic');
  // more lines than asked: a line with no word worth drilling is passed over. The level's own lines, a share
  // from its upper band, and at Level 3 a share of classical sentences heard in their SILMA voice
  const want = skill === 'fill' || skill === 'hear' ? n * 3 : n;
  const upN = cfg.upper ? Math.round(want * cfg.upper.share) : 0;
  const bookN = cfg.book ? Math.round(want * cfg.book.share) : 0;
  // a path step's practice draws its own lines first; the level's pool only tops it up
  const own = works.length ? await stepLines(env, works, want - bookN, cfg.lines) : [];
  const [main, upper, book, others] = await Promise.all([
    works.length ? Promise.resolve(own) : drawLines(env, band, want - upN - bookN, true, cfg.lines),
    cfg.upper && !works.length ? drawLines(env, band, upN, true, { min: cfg.upper.min, max: cfg.lines?.max ?? 99 })
      : works.length && own.length < want - bookN ? drawLines(env, band, want - bookN - own.length, false, cfg.lines) : Promise.resolve([] as Line[]),
    cfg.book ? bookLines(env, cfg.book.grades, bookN, skill === 'order' ? 18 : 40) : Promise.resolve([] as Line[]),
    drawLines(env, band, 24, false),
  ]);
  const lines = shuffle([...main, ...upper, ...book]);
  const pool = [...new Set(others.flatMap((l) => l.text_ar.split(/\s+/).map(clean)).filter((w) => bare(w).length >= 2))];
  const freq = await freqOf(env, lines.flatMap((l) => blanksOf(l).map((b) => b.a)).concat(lines.flatMap((l) => l.text_ar.split(/\s+/))));
  return lines.map((l) => {
    const words = wordsOf(l);
    const audio = { url: audioUrl(l.object_key), start: l.start_sec, end: l.end_sec };
    const source = { workId: l.work_id, title: l.work_title, level: l.level };
    // the meaning, for the learner to reveal: the sentence, and a gloss per word
    const base = { id: `${skill}:${l.id}`, kind: skill, audio, words: words.map((w) => ({ ...w, t: w.t })), source,
                   en: l.text_en, glosses: glossesOf(l) };
    if (skill === 'fill' || skill === 'hear') {
      // a content word, long enough to hear, clearly timed — the lightest words never; the blanks
      // chosen offline first (their options are the same kind of word), else one chosen here; of
      // those, the one the level prefers (commoner at Level 1, rarer at Level 3)
      const chosen = blanksOf(l).filter((b) => words[b.i] && words[b.i].e - words[b.i].s >= 0.22 && !light(words[b.i].t));
      const content = words.map((w, i) => ({ w, i }))
        .filter(({ w }) => bare(w.t).length >= 3 && !light(w.t) && w.e - w.s >= 0.22);
      if (!chosen.length && (l.blanks_json || !content.length)) return null;   // a line with blanks_json [] has nothing worth drilling
      // a name is no vocabulary: where the line has another word to blank, never a proper noun
      const named = chosen.filter((x) => x.p !== 'PN');
      const b = prefer(named.length ? named : chosen, (x) => freq(x.a), cfg.blank) ?? null;
      const pick = b ? { w: words[b.i], i: b.i } : prefer(content, (x) => freq(x.w.t), cfg.blank)!;
      const answer = b ? b.a : shown(pick.w.t);
      const options = shuffle([answer, ...(b ? b.o : distractors(answer, pool, 3, light).map(shown))]);
      if (options.length < 3) return null;
      return skill === 'fill'
        ? { ...base, blank: pick.i, answer, options }
        : { ...base, audio: { ...audio, start: Math.max(l.start_sec, pick.w.s - 0.04), end: Math.min(l.end_sec, pick.w.e + 0.06) },
            target: pick.i, answer, options, line: audio };
    }
    if (skill === 'order') {
      const order = words.map((_, i) => i);
      let shuffled = shuffle(order);
      for (let k = 0; k < 4 && shuffled.every((v, i) => v === i); k++) shuffled = shuffle(order);
      return { ...base, shuffled };
    }
    return base;   // shadow: the line and its timings
  }).filter(Boolean).slice(0, n);
}

/// Words: what a word means in the line it was said in — a hard word of a recorded line, marked where it is
/// heard, its meaning there (the line's own word-by-word gloss) among three meanings of words of the same part of
/// speech from other lines; its root and core sense from AL once answered. The rest of a session are the
/// glossed words of the reader's lists (ar_daily_word, ar_acq_item).
async function vocabDrills(env: ArabicEnv, all: L, band: Band, n: number) {
  if (n <= 0) return [];
  const cfg = bandCfg(all, band);
  const common = await commonWords(env);
  const light = (w: string) => isCommon(common, w, band === 'basic');
  const start = Math.floor(Math.random() * 1e9);
  const where = `${band === 'all' ? '' : 'band = ? AND '}gloss_json IS NOT NULL AND blanks_json IS NOT NULL AND blanks_json <> '[]'`;
  const args = band === 'all' ? [] : [band];
  let lines = await query<Line>(env.DB_AR, `SELECT * FROM ar_practice_pool WHERE ${where} AND rnd >= ? ORDER BY rnd LIMIT ?`, [...args, start, n * 5]);
  if (lines.length < n * 5) lines = lines.concat(await query<Line>(env.DB_AR,
    `SELECT * FROM ar_practice_pool WHERE ${where} AND rnd < ? ORDER BY rnd LIMIT ?`, [...args, start, n * 5 - lines.length]));
  type Cand = { l: Line; words: ReturnType<typeof wordsOf>; b: Blank; gloss: string };
  const cands: Cand[] = [];
  for (const l of lines) {
    const g = glossesOf(l);
    const words = wordsOf(l);
    if (!g || g.length !== words.length) continue;
    for (const b of blanksOf(l)) {
      const gloss = (g[b.i] ?? '').trim();
      if (words[b.i] && gloss && gloss.length <= 40 && !light(words[b.i].t)) cands.push({ l, words, b, gloss });
    }
  }
  const freq = await freqOf(env, cands.map((c) => c.b.a));
  const byLine = new Map<string, Cand[]>();
  for (const c of cands) byLine.set(c.l.id, [...(byLine.get(c.l.id) ?? []), c]);
  const picked = [...byLine.values()].map((cs) => prefer(cs, (c) => freq(c.b.a), cfg.blank)!).slice(0, n);
  const low = (x: string) => x.toLowerCase().replace(/[^a-z ]/g, '').trim();
  // the root and its core sense (AL /al/lookup), for the note once answered
  const roots = await Promise.all(picked.map((c) => al<{ found: boolean; lemmas: Array<{ lemma_ar: string; pos: string | null; root_text: string | null; root_en: string | null }> }>(
    env, `/al/lookup?w=${encodeURIComponent(bare(c.words[c.b.i].t))}`).catch(() => null)));
  const kinds = byKey(all.kind);
  return picked.map((c, k) => {
    const same = cands.filter((x) => x.l.id !== c.l.id && x.b.p === c.b.p && low(x.gloss) !== low(c.gloss));
    const any = cands.filter((x) => x.l.id !== c.l.id && low(x.gloss) !== low(c.gloss));
    const opts = [...new Set([...shuffle(same), ...shuffle(any)].map((x) => x.gloss))].filter((g) => low(g) !== low(c.gloss)).slice(0, 3);
    if (opts.length < 3) return null;
    const lem = roots[k]?.found ? roots[k]!.lemmas[0] : null;
    const core = lem?.root_en ? lem.root_en.split('→').slice(0, 2).map((x) => x.trim()).join(' → ') : null;
    const l = c.l;
    return {
      id: `vocab:${l.id}:${c.b.i}`, kind: 'vocab', audio: { url: audioUrl(l.object_key), start: l.start_sec, end: l.end_sec },
      words: c.words, target: c.b.i, prompt: clean(c.words[c.b.i].t), answer: c.gloss, options: shuffle([c.gloss, ...opts]), en: l.text_en,
      explanation: [lem ? `${lem.lemma_ar}${lem.pos ? ` (${lem.pos})` : ''}${lem.root_text ? ` — root ${[...lem.root_text].join(' ')}` : ''}` : null,
                    core ? `${core} (AL)` : null, l.work_title ? `Heard in ${l.work_title}` : null].filter(Boolean).join('\n') || null,
      source: { workId: l.work_id, title: l.work_title, level: l.level },
      instruction: kinds.get('vocab')?.label ?? null, instructionAr: kinds.get('vocab')?.labelAr ?? null,
    };
  }).filter((x): x is NonNullable<typeof x> => !!x);
}

async function listWordDrills(env: ArabicEnv, band: Band, n: number) {
  if (n <= 0) return [];
  const daily = await query<{ id: string; singular_ar: string; plural_ar: string; gloss_en: string; gender: string }>(env.DB_AR,
    `SELECT id, singular_ar, plural_ar, gloss_en, gender FROM ar_daily_word`);
  const mined = await query<{ id: string; text_ar: string; vocalised_ar: string | null; gloss_en: string; register: string | null }>(env.DB_AR,
    `SELECT id, text_ar, vocalised_ar, gloss_en, register FROM ar_acq_item WHERE gloss_en IS NOT NULL AND status = 'live'`);
  const words = [
    ...daily.map((d) => ({ id: d.id, word: d.singular_ar, gloss: d.gloss_en, band: 'basic' })),
    ...mined.map((m) => ({ id: m.id, word: m.vocalised_ar ?? m.text_ar, gloss: m.gloss_en,
                            band: m.register === 'fusha_turath' ? 'advanced' : 'middle' })),
  ];
  // never a function word; above Basic, never a word the Qurʾān or the corpus makes common
  const common = await commonWords(env);
  const mine = words.filter((w) => (band === 'all' || w.band === band) && !isCommon(common, w.word, band === 'basic'));
  const glosses = [...new Set(words.map((w) => w.gloss))];
  return shuffle(mine).slice(0, n).map((w) => ({
    id: `meaning:${w.id}`, kind: 'meaning', prompt: w.word, answer: w.gloss,
    options: shuffle([w.gloss, ...shuffle(glosses.filter((g) => g !== w.gloss)).slice(0, 3)]),
  }));
}

async function wordDrills(env: ArabicEnv, all: L, band: Band, n: number) {
  const inLine = Math.round(n * (bandCfg(all, band).words?.vocab ?? 0.7));
  const [a, b] = await Promise.all([vocabDrills(env, all, band, inLine), listWordDrills(env, band, n)]);
  return shuffle([...a, ...b.slice(0, n - a.length)]);
}

/// Tap the matching pairs: the meaning pool dealt five words at a time, each beside its gloss.
/// No two words in a round share a gloss, so every pair has one partner.
async function pairsDrills(env: ArabicEnv, band: Band, n: number) {
  const pool = await listWordDrills(env, band, n * 8);
  const out: Array<Record<string, unknown>> = [];
  let round: typeof pool = [];
  for (const d of pool) {
    if (round.some((r) => r.answer === d.answer || r.prompt === d.prompt)) continue;
    round.push(d);
    if (round.length === 5) {
      out.push({ id: `pairs:${round.map((r) => r.id.replace(/^meaning:/, '')).join('+')}`, kind: 'pairs', interaction: 'pairs',
                 pairs: round.map((r) => [r.prompt, r.answer]) });
      round = [];
      if (out.length === n) break;
    }
  }
  return out;
}

// ── Ṣarf from the scenes (AR 0045/0046): the words heard in the series, drilled by form ────────────────
interface SW { unit_id: string; scene_no: number; line: number; word_index: number; surface: string; lemma_ar: string | null;
               word_class: string; link_kind: string; al_lemma_ref: string | null; sarf_json: string | null }
const plain = (t: string | null) => (t ?? '').replace(/[\u064B-\u0652\u0670\u0640]/g, '');

async function sarfDrills(env: ArabicEnv, band: Band, n: number, works: string[] = []) {
  // a path step's own scenes when practising it; else the scenes of the level, Qurʾānic words first
  const lv: string[] = band === 'all' ? [] : [...(BANDS_CEFR[band] ?? [])];
  const where = works.length ? `r.id IN (${works.slice(0, 90).map(() => '?').join(',')})`
    : lv.length ? `r.level IN (${lv.map(() => '?').join(',')})` : '1';
  const rows = await query<SW>(env.DB_AR,
    `SELECT w.unit_id, w.scene_no, w.line, w.word_index, w.surface, w.lemma_ar, w.word_class, w.link_kind, w.al_lemma_ref, w.sarf_json
       FROM ar_scene_word w JOIN ar_text_unit t ON t.id = w.unit_id JOIN ar_acquisition_ref r ON r.id = t.acq_ref_id
      WHERE ${where} AND w.word_class IN ('verb', 'noun') AND w.sarf_json IS NOT NULL
      ORDER BY (w.link_kind = 'lemma') DESC, abs(random()) % 1000 LIMIT 400`, works.length ? works.slice(0, 90) : lv);
  const verbs = new Map<string, { madi: string; mudari: string; surface: string; ref: string | null }>();
  const nouns = new Map<string, { mufrad: string; jam: string; surface: string; ref: string | null }>();
  const lemmas: Array<{ surface: string; lemma: string; ref: string | null }> = [];
  for (const r of rows) {
    let f: Record<string, string> = {};
    try { f = JSON.parse(r.sarf_json ?? '{}'); } catch { continue; }
    if (r.word_class === 'verb' && f.madi && f.mudari && !verbs.has(plain(f.madi))) verbs.set(plain(f.madi), { madi: f.madi, mudari: f.mudari, surface: r.surface, ref: r.al_lemma_ref });
    if (r.word_class === 'noun' && f.mufrad && f.jam && plain(f.jam) !== plain(f.mufrad) && !nouns.has(plain(f.mufrad)))
      nouns.set(plain(f.mufrad), { mufrad: f.mufrad, jam: f.jam, surface: r.surface, ref: r.al_lemma_ref });
    if (r.lemma_ar && plain(r.lemma_ar) !== plain(r.surface.replace(/[^\u0600-\u06FF]/g, ''))) lemmas.push({ surface: r.surface, lemma: r.lemma_ar, ref: r.al_lemma_ref });
  }
  const V = shuffle([...verbs.values()]), N = shuffle([...nouns.values()]), M = shuffle(lemmas);
  const out: Array<Record<string, unknown>> = [];
  const opts = (answer: string, pool: string[]) => shuffle([answer, ...shuffle(pool.filter((x) => plain(x) !== plain(answer))).slice(0, 3)]);
  const quran = (ref: string | null) => (ref ? { lemmaRef: ref } : null);
  // one pairs round of five verbs, then choose drills in turn: present, plural, dictionary form
  if (V.length >= 5) out.push({ id: `sarf_pairs:${V.slice(0, 5).map((v) => plain(v.madi)).join('+')}`, kind: 'sarf_pairs', interaction: 'pairs',
                                 pairs: V.slice(0, 5).map((v) => [v.madi, v.mudari]) });
  let i = 0;
  while (out.length < n && (i < V.length || i < N.length || i < M.length)) {
    const v = V[i + 5], m = N[i], w = M[i];
    if (v) out.push({ id: `sarf_mudari:${plain(v.madi)}`, kind: 'sarf_mudari', prompt: v.madi, answer: v.mudari, heard: v.surface,
                      options: opts(v.mudari, V.map((x) => x.mudari)), quran: quran(v.ref) });
    if (m && out.length < n) out.push({ id: `sarf_jam:${plain(m.mufrad)}`, kind: 'sarf_jam', prompt: m.mufrad, answer: m.jam, heard: m.surface,
                                         options: opts(m.jam, N.map((x) => x.jam)), quran: quran(m.ref) });
    if (w && out.length < n) out.push({ id: `sarf_lemma:${plain(w.surface)}`, kind: 'sarf_lemma', prompt: w.surface, answer: w.lemma,
                                         options: opts(w.lemma, M.map((x) => x.lemma)), quran: quran(w.ref) });
    i++;
  }
  return out.slice(0, n);
}

const PLURAL_KIND: Record<string, { en: string; ar: string }> = {
  taksir: { en: 'broken plural', ar: 'جمع تكسير' },
  salim_m: { en: 'sound masculine plural', ar: 'جمع مذكر سالم' },
  salim_f: { en: 'sound feminine plural', ar: 'جمع مؤنث سالم' },
};

async function pluralDrills(env: ArabicEnv, band: Band, n: number) {
  if (band !== 'all' && band !== 'basic') return [];
  const rows = await query<{ id: string; singular_ar: string; plural_ar: string; gloss_en: string; plural_kind: string; pattern_ar: string | null }>(env.DB_AR,
    `SELECT id, singular_ar, plural_ar, gloss_en, plural_kind, pattern_ar FROM ar_daily_word`);
  const plurals = rows.map((r) => r.plural_ar);
  return shuffle(rows).slice(0, n).map((r) => ({
    id: `plural:${r.id}`, kind: 'plural', prompt: r.singular_ar, gloss: r.gloss_en, answer: r.plural_ar,
    options: shuffle([r.plural_ar, ...distractors(r.plural_ar, plurals)]),
    note: PLURAL_KIND[r.plural_kind] ?? null, pattern: r.pattern_ar,
  }));
}

// ── Grammar: the lessons and the books, three levels (ar_practice_label grammar_drill 'practice') ────
// Every drill in a sentence (lib/grammar.ts): the lessons' own examples and the books' shawāhid
// (ar_grammar_sentence), AL's sources on the registry (tree, define, shahid, book, khilaf, wazn, contrast,
// adima) each set in a sentence, the scene questions on registry terms, the grammar questions of
// ar_exercises. A lesson's own round (?lesson=LSN:…) drills its terms with its own examples first.
type PlanEntry = { source: string; ask?: string; share?: number; levels?: Array<number | string>; minDepth?: number; maxDepth?: number; discipline?: string };
const planOf = (all: L, band: Band) =>
  (((byKey(all.grammar_drill).get('practice')?.extra ?? {}) as Record<string, PlanEntry[]>)[band === 'all' ? 'middle' : band] ?? []);
const levelsOf = (band: Band) => (band === 'basic' ? [1] : band === 'middle' ? [1, 2] : [1, 2, 3]);
const SENT_ORIGINS: Record<string, string[]> = { lesson: ['lesson', 'title'], books: ['reading', 'toc', 'page', 'bab'], example: ['curated'] };

/// the grammar questions of ar_exercises, each in the sentence it asks about (the words after «في:», the āyah it quotes)
async function exerciseDrills(env: ArabicEnv, all: L, levels: string[], k: number, group: Group) {
  if (k <= 0 || !levels.length) return [];
  const rows = await query<{ id: string; prompt_ar: string; prompt_en: string | null; options_json: string; answer_json: string; explanation_md: string | null; level: string | null }>(env.DB_AR,
    `SELECT id, prompt_ar, prompt_en, options_json, answer_json, explanation_md, level FROM ar_exercises
      WHERE exercise_type = 'mcq' AND level IN (${levels.map(() => '?').join(',')}) ORDER BY random() LIMIT ?`, [...levels, k]);
  const sentenceOf = (p: string) => (p.match(/﴿([^﴾]+)﴾/)?.[1] ?? p.match(/[«"]([^»"]{3,})[»"]/)?.[1] ?? p.split(/[:：]/).slice(1).join(':').replace(/[؟?]\s*$/, '')).trim();
  const staged = await stage(env, rows.map((r) => ({ key: r.id, kind: 'prose', text: sentenceOf(r.prompt_ar) || r.prompt_ar })));
  const kinds = byKey(all.kind);
  return rows.flatMap((r) => {
    try {
      const options = JSON.parse(r.options_json) as string[];
      const answer = options[(JSON.parse(r.answer_json) as { correct: number }).correct];
      const st = staged.get(r.id);
      if (!st || !answer) return [];
      const d: Record<string, unknown> = { id: `grammar:${r.id}`, kind: 'feature', ask: 'grammar', audio: st.audio, words: st.words, span: [],
        prompt: r.prompt_ar, promptEn: null, answer, options: shuffle(options), note: r.prompt_en ? { en: r.prompt_en, ar: '' } : null,
        explanation: r.explanation_md, level: r.level, ...(st.voice ? { voice: st.voice } : {}),
        source: { workId: null, title: null, level: r.level },
        instruction: kinds.get('grammar')?.label ?? null, instructionAr: kinds.get('grammar')?.labelAr ?? null };
      d.srs = srsCardFor(d, { skill: group.skill, band: group.band });
      return [d];
    } catch { return []; }
  });
}

/// the scene questions on the registry terms at these depths
async function sceneAt(env: ArabicEnv, all: L, e: PlanEntry, k: number, group: Group) {
  const reg = await registry(env);
  const mapped = await query<{ term_id: string }>(env.DB_AR, `SELECT DISTINCT term_id FROM ar_scene_feature_term`);
  const ids = mapped.map((r) => r.term_id).filter((id) => { const t = reg.byId.get(id); return !!t && t.depth >= (e.minDepth ?? 0) && t.depth <= (e.maxDepth ?? 9); });
  return sceneDrills(env, all, ids, k, group);
}

async function fromSource(env: ArabicEnv, all: L, e: PlanEntry, k: number, band: Band, group: Group): Promise<Record<string, unknown>[]> {
  if (SENT_ORIGINS[e.source]) {
    const rows = await drawSentences(env, k * 2, { levels: e.source === 'example' ? undefined : (e.levels as number[] | undefined), origins: SENT_ORIGINS[e.source],
                                                   asked: true, withTerm: e.ask === 'gs_term', babOnly: e.ask === 'gs_bab' });
    return (await sentenceDrills(env, all, rows, e.ask ?? 'gs_term', group)).slice(0, k);
  }
  if (e.source === 'scene') return sceneAt(env, all, e, k, group);
  if (e.source === 'exercise') return exerciseDrills(env, all, (e.levels ?? []).map(String), k, group);
  const qs = new URLSearchParams({ ask: e.ask ?? '', n: String(Math.min(30, k * 3 + 2)) });
  if (e.minDepth != null) qs.set('minDepth', String(e.minDepth));
  if (e.maxDepth != null) qs.set('maxDepth', String(e.maxDepth));
  if (e.discipline) qs.set('discipline', e.discipline);
  const res = await al<{ items: GramDrill[] }>(env, `/al/drill/grammar/${e.source}?${qs}`).catch(() => ({ items: [] as GramDrill[] }));
  return (await asDrills(env, all, shuffle(res.items).slice(0, k * 2), group, levelsOf(band))).slice(0, k);
}

async function grammarDrills(env: ArabicEnv, all: L, band: Band, n: number, lesson: string | null) {
  const group: Group = { band, series: null, episode: lesson, skill: 'grammar' };
  if (lesson) {
    // a lesson's round: its terms, its own examples first, the books' at the level above
    const terms = await termsOf(env, [lesson]);
    const plan = ((byKey(all.grammar_drill).get('drill')?.extra ?? {}) as Record<string, Array<{ source: string; ask?: string }>>)[band === 'advanced' ? 'advanced' : 'basic'] ?? [];
    return round(env, all, plan, terms, n, group, [lesson], levelsOf(band === 'all' ? 'advanced' : band));
  }
  const plan = planOf(all, band);
  if (!plan.length) return [];
  // n slots, each to a source by its share; a source that comes back short gives way to the sentences
  const total = plan.reduce((t, e) => t + (e.share ?? 1), 0);
  const slots = new Map<PlanEntry, number>();
  for (let i = 0; i < n; i++) {
    let x = Math.random() * total;
    const e = plan.find((p) => (x -= p.share ?? 1) < 0) ?? plan[plan.length - 1];
    slots.set(e, (slots.get(e) ?? 0) + 1);
  }
  const piles = await Promise.all([...slots].map(([e, k]) => fromSource(env, all, e, k, band, group).catch(() => [] as Record<string, unknown>[])));
  const seen = new Set<string>();
  let items = shuffle(piles.flat()).filter((d) => (seen.has(String(d.id)) ? false : (seen.add(String(d.id)), true)));
  if (items.length < n) {
    const more = await sentenceDrills(env, all, await drawSentences(env, (n - items.length) * 2,
      { levels: [levelsOf(band).slice(-1)[0]], asked: true }), 'gs_term', group);
    items = items.concat(more.filter((d) => !seen.has(String(d.id))));
  }
  return items.slice(0, n);
}

/// Read & fill: a sentence from the books, as its author wrote it, one hard word blanked —
/// never a function word, and above Basic never a common one; the options the same kind of word.
/// A sentence with a rendered voice (SILMA, ar_read_pool.object_key — kmaps-resources
/// scripts/tts/silma_clips.py) carries its audio and every word timed, like a listening line;
/// those are drawn first.
type ReadRow = { id: string; work_id: string; work_title: string | null; unit_id: string; text_ar: string;
                 object_key: string | null; start_sec: number | null; end_sec: number | null; words_json: string | null; blanks_json: string | null };
/// Graded (ar_read_pool.grade, by length and rare words): Level 1 reads grade 0 — the plainest recorded lines of the
/// books and readers, in their human recording (drill_words.py level1) — Level 2 the plainer, Level 3 the harder.
async function readDrills(env: ArabicEnv, all: L, band: Band, n: number) {
  const cfg = bandCfg(all, band);
  const grades = band === 'all' ? [0, 1, 2, 3] : cfg.read?.grades ?? [];
  if (!grades.length) return [];
  const common = await commonWords(env);
  const light = (w: string) => isCommon(common, w, band === 'basic');
  const draw = async (voiced: boolean, k: number) => {
    const start = Math.floor(Math.random() * 1e9);
    return query<ReadRow>(env.DB_AR,
      `SELECT id, work_id, work_title, unit_id, text_ar, object_key, start_sec, end_sec, words_json, blanks_json FROM ar_read_pool
        WHERE grade IN (${grades.map(() => '?').join(',')}) AND object_key IS ${voiced ? 'NOT ' : ''}NULL
        ORDER BY (abs(hashof) % 1000) LIMIT ?`.replace('hashof', `(rowid * 2654435761 + ${start})`), [...grades, k]);
  };
  let rows = await draw(true, n * 2);
  if (rows.length < n * 3) rows = shuffle(rows.concat(await draw(false, n * 4)));
  const freq = await freqOf(env, rows.flatMap((r) => blanksOf(r).map((b) => b.a)));
  const pool = [...new Set(rows.flatMap((r) => r.text_ar.split(/\s+/).map(clean)).filter((w) => bare(w).length >= 3 && !light(w)))];
  const out: unknown[] = [];
  for (const r of rows) {
    if (out.length >= n) break;
    const toks = r.text_ar.trim().split(/\s+/);
    const chosen = blanksOf(r).filter((b) => toks[b.i] && !light(toks[b.i]));
    const cands = toks.map((t, i) => ({ t, i })).filter(({ t }) => bare(clean(t)).length >= 4 && !light(t));
    let answer: string, opts: string[], at: number;
    if (chosen.length) {
      const b = prefer(chosen, (x) => freq(x.a), cfg.blank)!;
      answer = b.a; opts = b.o; at = b.i;
    } else {
      if (r.blanks_json || !cands.length) continue;
      const pick = cands[Math.floor(Math.random() * cands.length)];
      answer = shown(pick.t); opts = distractors(answer, pool, 3, light).map(shown); at = pick.i;
      if (opts.length < 3) continue;
    }
    let times: Array<[number, number]> = [];
    try { times = r.words_json ? JSON.parse(r.words_json) : []; } catch { times = []; }
    const voiced = !!r.object_key && times.length === toks.length;
    const end = r.end_sec ?? 0;
    out.push({ id: `read:${r.id}`, kind: 'read', blank: at, answer, options: shuffle([answer, ...opts]),
               words: toks.map((t, i) => ({ t, s: voiced ? times[i][0] : 0, e: voiced ? times[i][1] : 0 })),
               ...(voiced ? { audio: { url: audioUrl(r.object_key!), start: r.start_sec ?? 0, end },
                              ...(r.object_key!.startsWith('tts/') ? { voice: 'silma' } : {}) } : {}),
               source: { workId: r.work_id, title: r.work_title, level: null }, en: null });
  }
  return out;
}

let alCounts: { at: number; data: Record<string, number> } | null = null;
async function grammarCount(env: ArabicEnv, all: L, band: Band) {
  const plan = planOf(all, band);
  if (!plan.length) return 0;
  if (!alCounts || Date.now() - alCounts.at > 600_000)
    alCounts = { at: Date.now(), data: await al<Record<string, number>>(env, '/al/drill/grammar/counts').catch(() => ({})) };
  const [reg, sent, scenes, ex] = await Promise.all([
    registry(env),
    query<{ level: number; origin: string; term: number; n: number }>(env.DB_AR,
      `SELECT level, origin, term_id IS NOT NULL AS term, COUNT(*) AS n FROM ar_grammar_sentence WHERE term_id IS NOT NULL OR bab_title_ar IS NOT NULL
        GROUP BY level, origin, term`),
    query<{ term_id: string }>(env.DB_AR, `SELECT MIN(term_id) AS term_id FROM ar_scene_feature_term GROUP BY unit_id, scene_no, feature_idx`),
    query<{ level: string; n: number }>(env.DB_AR, `SELECT level, COUNT(*) AS n FROM ar_exercises WHERE exercise_type = 'mcq' GROUP BY level`),
  ]);
  const inDepth = (e: PlanEntry, t: { depth: number; discipline: string | null }) =>
    t.depth >= (e.minDepth ?? 0) && t.depth <= (e.maxDepth ?? 9) && (!e.discipline || t.discipline === e.discipline);
  let total = 0;
  const done = new Set<string>();
  for (const e of plan) {
    const key = `${e.source}:${SENT_ORIGINS[e.source] ? e.ask ?? '' : ''}:${e.minDepth ?? ''}:${e.maxDepth ?? ''}:${e.discipline ?? ''}:${(e.levels ?? []).join(',')}`;
    if (done.has(key)) continue;
    done.add(key);
    if (SENT_ORIGINS[e.source]) {
      const lv = e.source === 'example' ? null : new Set((e.levels ?? []).map(Number));
      total += sent.filter((r) => SENT_ORIGINS[e.source].includes(r.origin) && (!lv || lv.has(r.level))
        && (e.ask === 'gs_term' ? !!r.term : e.ask === 'gs_bab' ? !r.term : true)).reduce((s, r) => s + r.n, 0);
    } else if (e.source === 'scene') {
      total += scenes.filter((r) => { const t = reg.byId.get(r.term_id); return !!t && inDepth(e, t); }).length;
    } else if (e.source === 'exercise') {
      const lv = new Set((e.levels ?? []).map(String));
      total += ex.filter((r) => lv.has(r.level)).reduce((s, r) => s + r.n, 0);
    } else if (e.source === 'tree' || e.source === 'define') {
      // the registry terms at these depths (with a definition, to be defined)
      total += reg.terms.filter((t) => inDepth(e, t) && (e.source === 'tree' || !!hadd(t))).length;
    } else if (!done.has(`al:${e.source}`)) {
      done.add(`al:${e.source}`);
      total += alCounts.data[e.source] ?? 0;
    }
  }
  return total;
}

async function counts(env: ArabicEnv, all: L, band: Band) {
  const cfg = bandCfg(all, band);
  const wc = cfg.lines ?? { min: 0, max: 999 };
  const grades = band === 'all' ? [0, 1, 2, 3] : cfg.read?.grades ?? [];
  const [pool, daily, mined, glossed, mine, read, voiced, grammar] = await Promise.all([
    query<{ n: number }>(env.DB_AR, `SELECT COUNT(*) AS n FROM ar_practice_pool WHERE (? = 'all' OR band = ?) AND word_count BETWEEN ? AND ?`, [band, band, wc.min, wc.max]),
    query<{ n: number }>(env.DB_AR, `SELECT COUNT(*) AS n FROM ar_daily_word`),
    query<{ register: string | null; n: number }>(env.DB_AR,
      `SELECT register, COUNT(*) AS n FROM ar_acq_item WHERE gloss_en IS NOT NULL AND status = 'live' GROUP BY register`),
    query<{ n: number }>(env.DB_AR, `SELECT COUNT(*) AS n FROM ar_practice_pool WHERE (? = 'all' OR band = ?) AND gloss_json IS NOT NULL
                                      AND blanks_json IS NOT NULL AND blanks_json <> '[]'`, [band, band]),
    query<{ n: number }>(env.DB_AR, `SELECT COUNT(*) AS n FROM ar_acq_item WHERE status = 'live' AND root_ar IS NOT NULL AND capture_id IS NOT NULL`),
    grades.length ? query<{ n: number }>(env.DB_AR, `SELECT COUNT(*) AS n FROM ar_read_pool WHERE grade IN (${grades.map(() => '?').join(',')})`, grades) : Promise.resolve([{ n: 0 }]),
    cfg.book ? query<{ n: number }>(env.DB_AR, `SELECT COUNT(*) AS n FROM ar_read_pool WHERE object_key IS NOT NULL AND words_json IS NOT NULL
                                                  AND grade IN (${cfg.book.grades.map(() => '?').join(',')})`, cfg.book.grades) : Promise.resolve([{ n: 0 }]),
    grammarCount(env, all, band),
  ]);
  const basicOk = band === 'all' || band === 'basic';
  const minedN = mined.filter((m) => band === 'all' || (m.register === 'fusha_turath' ? 'advanced' : 'middle') === band)
    .reduce((s, m) => s + m.n, 0);
  return {
    lines: (pool[0]?.n ?? 0) + (voiced[0]?.n ?? 0),
    words: (basicOk ? daily[0]?.n ?? 0 : 0) + minedN + (glossed[0]?.n ?? 0), plurals: basicOk ? daily[0]?.n ?? 0 : 0,
    grammar,
    mine: mine[0]?.n ?? 0,   // the reader's own words, at every level
    read: read[0]?.n ?? 0,
  };
}

export function practiceRoutes(router: Router<ArabicEnv>) {
  // The skills, and how much there is to drill in each at this level.
  router.get('/ar/practice/home', async (req, env) => {
    const band = parseBand(new URL(req.url).searchParams.get('level'));
    const all = await labels(env);
    const c = await counts(env, all, band);
    return ok({
      level: band,
      skills: (all.skill ?? []).map((s) => ({ ...skillCard(s), count: c[(s.extra?.source as keyof typeof c) ?? 'lines'] ?? 0 }))
        .filter((s) => s.count > 0),
      // scene practice, where the level has scripted episodes (Middle, Advanced)
      scenes: (all.scene_skill ?? []).find((x) => x.key === 'shelf')
        ? skillCard((all.scene_skill ?? []).find((x) => x.key === 'shelf')!) : null,
    });
  });

  // The drill stage's own words alone, for a host that plays drills it did not draw here
  // (an SRS review, the full drill): Check, Listen, the grades, the result lines …
  router.get('/ar/practice/stage', async (_req, env) => {
    const all = await labels(env);
    return ok({ stage: all.stage ?? [] });
  });

  // A session: n drills of one skill, drawn fresh.
  router.get('/ar/practice/session', async (req, env) => {
    const url = new URL(req.url);
    const band = parseBand(url.searchParams.get('level'));
    const skill = url.searchParams.get('skill') ?? '';
    const n = Math.min(20, Math.max(3, Number(url.searchParams.get('n') ?? 8)));
    const all = await labels(env);
    const row = (all.skill ?? []).find((s) => s.key === skill);
    if (!row) return badRequest(`unknown skill ${skill}`);
    const meta = skillCard(row);
    // step=<intake id>: the drills of one step of the learning path, from the works it holds
    const step = url.searchParams.get('step');
    const stepWorks = step ? await worksOfStep(env, step) : [];
    const items = row.extra?.source === 'lines' ? await lineDrills(env, all, skill, band, n, stepWorks)
      : skill === 'mine' ? await mineDrills(env, n)
      : skill === 'read' ? await readDrills(env, all, band, n)
      : skill === 'meaning' ? await wordDrills(env, all, band, n)
      : skill === 'pairs' ? await pairsDrills(env, band, Math.max(1, Math.round(n / 3)))
      : skill === 'plural' ? await pluralDrills(env, band, n)
      : skill === 'sarf' ? await sarfDrills(env, band, n, stepWorks)
      : await grammarDrills(env, all, band, n, url.searchParams.get('lesson'));
    const deck = (all.path ?? []).find((x) => x.key === 'srs_deck');
    // each card grouped by the series or book it came from
    const works = [...new Set((items as Array<{ source?: { workId?: string } }>).map((it) => it.source?.workId).filter((x): x is string => !!x))];
    const series = new Map((works.length ? await query<{ id: string; series: string | null }>(env.DB_AR,
      `SELECT id, json_extract(meta_json, '$.series') AS series FROM ar_acquisition_ref WHERE id IN (${works.map(() => '?').join(',')})`, works) : [])
      .map((r) => [r.id, r.series] as const));
    const withCards = (items as Array<Record<string, unknown>>).map((it) => {
      const w = (it.source as { workId?: string } | undefined)?.workId;
      return { ...it, srs: it.srs ?? srsCardFor(it, { skill, band, series: w ? series.get(w) ?? null : null }) };
    });
    const instructed = instruct(withCards as unknown as Array<{ kind: string }>, all) as unknown as Array<Record<string, unknown>>;
    const res = ok({ skill: meta, level: band,
                     // every drill carries the registry terms its own rows name
                     items: await attachGt(env.DB_AR, instructed),
                     srsDeck: deck ? { title: deck.label, description: deck.detail } : null,
                     // the drill stage's own words (Check, Listen, Slower …), as label rows
                     stage: all.stage ?? [] });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  });
}
