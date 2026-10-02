import { query, queryOne } from '../../../shared/src/db';
import type { QuranEnv } from '../env';
import { attachGt } from '../../../shared/src/gt-attach';
import { withCard, shuffle, parseJson, rangeOf, type Drill, type Scope } from './practice-kit';

// ── The class's steps 6 and 7: the passage's questions, and its tafsīr heard then drilled ─────────
//
//   questions        (step 6) qr_study_question rows that are live and carry options (qr_069):
//                    choose / choose_all, asked as their ask_en words them (Rule 0)
//   tafsir_meaning   (step 7) qr_tafsir_question (qr_070): what the āyāt mean, as the recordings
//                    explained it. The drill plays the lines that answer it; the lines rise, verbatim,
//                    after the answer, with the work named under them — never asked.
//   tafsir_listen    (step 7) the same lines as listen_mark drills: hear the line, tap each word
//                    not caught. Their ids name the lines (tafsir_line:<audio>:<from>-<to>), so a
//                    line marked in the listen gate comes back as the same drill (lineDrills).
//
// And the listen gate (class_node kind listen): every work's span over the passage, its lines
// timed, through listenWorks — a page reaching past the passage is cut where the data says
// (qr_tafsir_page_cut), else heard in the first passage it reaches.
//
// The goal is reading tafsīr fluently: every line carries its accurate English and the registry
// terms it uses (qr_tafsir_segment_en: text_en, terms_json [{ar, ref: GT:…}]) — under the line in
// the gate, as the meaning held back in a listen drill, beside the answer in a meaning drill,
// and as GT chips on every drill the line is in.

type Question = { id: string; surah: number; ayah_from: number; ayah_to: number; options_json: string | null; sort_order: number };
type TafsirQ = { id: string; surah: number; ayah_from: number; ayah_to: number; question_en: string; interaction: string;
                 options_json: string; correct_json: string; explain_en: string | null; support_json: string };
type Support = { audio: string; page: string; from: number; to: number };
type Seg = { audio_id: string; page_id: string; seq: number; start_sec: number; end_sec: number; text_ar: string; w: string | null;
             en: string | null; terms: string | null };
type Term = { ar: string; ref: string };

/// A line's columns, its English and terms beside it: every query of the recorded lines reads these.
const SEG_COLS = `s.audio_id, s.page_id, s.seq, s.start_sec, s.end_sec, s.text_ar, json_extract(s.meta_json, '$.w') AS w,
                  e.text_en AS en, e.terms_json AS terms`;
const SEG_FROM = `qr_tafsir_audio_segment s LEFT JOIN qr_tafsir_segment_en e ON e.segment_id = s.id AND e.status = 'live'`;
const termsOf = (l: Seg): Term[] => parseJson<Term[]>(l.terms, []).filter((t) => t && t.ar && /^GT:[a-z_]+:[a-z0-9_]+$/.test(t.ref));

const AUDIO = (key: string) => `/api/ar/audio/${encodeURI(key)}`;
const inScope = (scope: Scope) => ({
  sql: 'surah = ? AND (? IS NULL OR ayah_to >= ?) AND (? IS NULL OR ayah_from <= ?)',
  args: [scope.surah, scope.from, scope.from, scope.to, scope.to],
});

/// Options in a new order, the right ones followed: the answer (choose) or the indices (choose_all).
export function dealt(options: string[], correct: number[]) {
  const order = shuffle(options.map((_, i) => i));
  const right = new Set(correct);
  return {
    options: order.map((i) => options[i]),
    correct: order.flatMap((i, k) => (right.has(i) ? [k] : [])),
    answer: correct.length === 1 ? options[correct[0]] : null,
  };
}

// ── step 6 ──────────────────────────────────────────────────────────────────

export async function questionDrills(env: QuranEnv, n: number, scope: Scope): Promise<Drill[]> {
  if (!scope.surah) return [];
  const w = inScope(scope);
  const rows = await query<Question>(env.DB_QR,
    `SELECT id, surah, ayah_from, ayah_to, options_json, sort_order FROM qr_study_question
      WHERE status = 'live' AND options_json IS NOT NULL AND ${w.sql} ORDER BY sort_order LIMIT ?`, [...w.args, n]);
  const out: Drill[] = [];
  for (const q of rows) {
    const o = parseJson<{ ask_en?: string; interaction?: string; options?: string[]; correct?: number[]; explain_en?: string }>(q.options_json, {});
    if (!o.ask_en || !o.options?.length || !o.correct?.length) continue;
    const all = o.interaction === 'choose_all';
    const d = dealt(o.options, o.correct);
    const where = rangeOf(q.surah, q.ayah_from, q.ayah_to);
    out.push(withCard({
      id: `questions:${q.id}`, kind: 'questions', ask: all ? 'sq_choose_all' : 'sq_choose',
      interaction: all ? 'choose_all' : 'choose', script: 'english',
      promptEn: o.ask_en, options: d.options, ...(all ? { correct: d.correct } : { answer: d.answer }),
      explanation: o.explain_en ?? null,
      source: { workId: `QR:SURAH:${q.surah}`, title: where, level: null },
    }, { ref: `QR:question:${q.id}`, type: 'passage', kind: 'questions', front: o.ask_en,
         back: o.correct.map((i) => o.options![i]).join(' · '), surah: q.surah, ayah: q.ayah_from, series: 'questions' }));
  }
  return out;
}

// ── step 7: the recorded lines ──────────────────────────────────────────────

/// A line's words with their times; a word the aligner never heard ([0,0]) has none.
export function timedWords(text: string, w: string | null): { t: string; s: number; e: number }[] {
  const tokens = text.split(/\s+/).filter(Boolean);
  const times = parseJson<unknown[]>(w, []);
  return tokens.map((t, i) => {
    const x = times.length === tokens.length ? times[i] : null;
    const ok = Array.isArray(x) && x.length === 2 && Number(x[1]) > Number(x[0]);
    return { t, s: ok ? Number((x as number[])[0]) : 0, e: ok ? Number((x as number[])[1]) : 0 };
  });
}

/// A run of lines, as one id: tafsir_line:<audio>:<from>-<to> (or :<seq> for one line).
export const lineRef = (audio: string, from: number, to: number) => `tafsir_line:${audio}:${from === to ? from : `${from}-${to}`}`;
export function parseLineRef(ref: string): { audio: string; from: number; to: number } | null {
  if (!ref.startsWith('tafsir_line:')) return null;
  const rest = ref.slice('tafsir_line:'.length);
  const at = rest.lastIndexOf(':');
  if (at <= 0) return null;
  const [a, b] = rest.slice(at + 1).split('-').map(Number);
  const to = Number.isFinite(b) ? b : a;
  return Number.isInteger(a) && Number.isInteger(to) && to >= a ? { audio: rest.slice(0, at), from: a, to } : null;
}

/// A line ends a sentence when its last mark is . ؟ ? ! — a comma, colon or semicolon carries on, and
/// so does a line that leaves a citation bracket open.
export const endsSentence = (t: string) => /[.؟?!]["»”)\]]*\s*$/.test(t.trim()) && !/\[[^\]]*$/.test(t);

/// How far a listen run reaches: back to where its sentence starts, on to where a sentence ends.
const SPAN_BACK = 4, SPAN_MAX = 8;

/// A line closes a clause when it ends at a semicolon — the next best edge where a full stop is far.
export const endsClause = (t: string) => endsSentence(t) || (/[؛;]\s*$/.test(t.trim()) && !/\[[^\]]*$/.test(t));

/** The lines (by seq) a run should hold so it is whole sentences: back from `from` to the line after a
 *  sentence end (at most SPAN_BACK lines), and on from `to` to a line that ends one (at most `max` lines
 *  in all). Where no full stop is within reach a semicolon serves; where neither is, the run stays
 *  as it was asked (at the start) or stops at `max` lines (at the end). */
export function sentenceSpan(lines: { seq: number; text_ar: string }[], from: number, to: number, max = SPAN_MAX): { from: number; to: number } {
  const at = (seq: number) => lines.findIndex((l) => l.seq === seq);
  const fi = at(from), ti = Math.max(at(to), fi);
  if (fi < 0) return { from, to };
  const back = (ends: (t: string) => boolean) => {
    for (let s = fi; s >= Math.max(0, fi - SPAN_BACK); s--) if (s === 0 || ends(lines[s - 1].text_ar)) return s;
    return -1;
  };
  const ahead = (start: number, ends: (t: string) => boolean) => {
    const last = Math.min(lines.length - 1, start + max - 1);
    for (let e = Math.max(ti, start); e <= last; e++) if (ends(lines[e].text_ar)) return e;
    return -1;
  };
  const endFrom = (start: number) => [ahead(start, endsSentence), ahead(start, endsClause)].find((x) => x >= 0) ?? -1;
  let s = [back(endsSentence), back(endsClause)].find((x) => x >= 0) ?? fi;
  let e = endFrom(s);
  // reaching back used up the reach before the sentence ends: keep the asked start, look ahead from it
  if (e < 0 && s < fi && endFrom(fi) >= 0) { s = fi; e = endFrom(fi); }
  if (e < 0) e = Math.min(lines.length - 1, s + max - 1);
  return { from: lines[s].seq, to: lines[Math.max(e, ti)].seq };
}

/** The words of a run the reciter actually spoke: a printed citation in brackets ([الزخرف: ٤٢]) and
 *  bare marks (* * *, ٣٧] .) left untimed by the aligner are dropped; an untimed real word stays. */
export function spokenWords<W extends { t: string; s: number; e: number }>(words: W[]): W[] {
  let open = false;
  return words.filter((w) => {
    const opens = w.t.includes('['), closes = w.t.includes(']');
    const bracketed = open || opens || closes;
    if (opens && !closes) open = true;
    if (closes) open = false;
    // bare marks and numbers (٨٦] , * , .) are never words to hear; a bracketed word goes when unspoken
    const marks = /^[[\]()*.:،؛,\-–—0-9٠-٩٫\s]+$/.test(w.t);
    return !(marks || (bracketed && w.e <= w.s));
  });
}

type Work = { slug: string; title: string | null; titleAr: string | null; author: string | null };
type Run = { audio: string; key: string; from: number; to: number; lines: Seg[]; work: Work };

/// The lines of each run asked for, with their recording and its work.
async function loadRuns(env: QuranEnv, runs: { audio: string; from: number; to: number }[]): Promise<Map<string, Run>> {
  const out = new Map<string, Run>();
  if (!runs.length) return out;
  const audios = [...new Set(runs.map((r) => r.audio))];
  const [recs, segs] = await Promise.all([
    query<{ id: string; object_key: string; source_slug: string; title_en: string | null; title_ar: string | null; author: string | null }>(env.DB_QR,
      `SELECT a.id, a.object_key, a.source_slug, s.book_title_en AS title_en, s.book_title_ar AS title_ar, s.author_name_ar AS author
         FROM qr_tafsir_audio a LEFT JOIN qr_tafsir_book_display_source s ON s.source_slug = a.source_slug
        WHERE a.id IN (${audios.map(() => '?').join(',')})`, audios),
    query<Seg>(env.DB_QR,
      `SELECT ${SEG_COLS} FROM ${SEG_FROM}
        WHERE ${runs.map(() => '(s.audio_id = ? AND s.seq BETWEEN ? AND ?)').join(' OR ')} ORDER BY s.audio_id, s.seq`,
      runs.flatMap((r) => [r.audio, r.from, r.to])),
  ]);
  const rec = new Map(recs.map((r) => [r.id, r]));
  for (const r of runs) {
    const a = rec.get(r.audio);
    const lines = segs.filter((s) => s.audio_id === r.audio && s.seq >= r.from && s.seq <= r.to && s.end_sec > s.start_sec);
    if (!a || !lines.length) continue;
    out.set(lineRef(r.audio, r.from, r.to), { audio: r.audio, key: a.object_key, from: r.from, to: r.to, lines,
      work: { slug: a.source_slug, title: a.title_en, titleAr: a.title_ar, author: a.author } });
  }
  return out;
}

const clipOf = (r: Run) => ({ url: AUDIO(r.key), start: Math.max(0, r.lines[0].start_sec - 0.2), end: r.lines[r.lines.length - 1].end_sec + 0.2 });
const wordsOf = (r: Run) => spokenWords(r.lines.flatMap((l) => timedWords(l.text_ar, l.w)));
const textOf = (r: Run) => wordsOf(r).map((w) => w.t).join(' ');

/** A run cut down to the lines from..to (inclusive) — as its own run, named by them. */
function narrow(r: Run, from: number, to: number): Run | undefined {
  const lines = r.lines.filter((l) => l.seq >= from && l.seq <= to);
  return lines.length ? { ...r, from, to, lines } : undefined;
}
const citeOf = (r: Run) => [r.work.titleAr ?? r.work.title, r.work.author].filter(Boolean).join(' — ');
/// The run's accurate English, line by line joined; null unless every line has its English.
const enOf = (r: Run) => (r.lines.every((l) => l.en) ? r.lines.map((l) => l.en).join(' ') : null);
/// The registry terms the run's lines use, each once.
const termsOfRun = (r: Run): Term[] => {
  const seen = new Set<string>();
  return r.lines.flatMap(termsOf).filter((t) => !seen.has(t.ref) && !!seen.add(t.ref));
};

/// One listen_mark drill per run: hear the lines, tap each word not caught.
function listenDrill(r: Run, surah: number, ayah: number, title: string): Drill {
  return withCard({
    id: lineRef(r.audio, r.from, r.to), kind: 'tafsir_listen', ask: 'tq_listen', interaction: 'listen_mark', script: 'arabic',
    audio: clipOf(r), words: wordsOf(r),
    // the line's English, held back until asked for or answered; its terms become GT chips
    en: enOf(r), terms: termsOfRun(r),
    explanation: citeOf(r) || null,
    source: { workId: `QR:SURAH:${surah}`, title, level: null },
  }, { ref: `QR:${lineRef(r.audio, r.from, r.to)}`, type: 'passage', kind: 'tafsir_listen', front: textOf(r), back: citeOf(r),
       surah, ayah, series: 'tafsir' });
}

/// The longest run a listen drill holds: a line or three, not a page.
const LISTEN_LINES = 3;

export async function tafsirDrillsQ(env: QuranEnv, mode: 'meaning' | 'listen', n: number, scope: Scope): Promise<Drill[]> {
  if (!scope.surah) return [];
  const w = inScope(scope);
  const qs = await query<TafsirQ>(env.DB_QR,
    `SELECT id, surah, ayah_from, ayah_to, question_en, interaction, options_json, correct_json, explain_en, support_json
       FROM qr_tafsir_question WHERE status = 'live' AND ${w.sql} ORDER BY sort_order LIMIT ?`, [...w.args, n]);
  const support = (q: TafsirQ) => parseJson<Support[]>(q.support_json, []).filter((s) => s.audio && Number.isInteger(s.from));
  // each run read with lines around it, then cut to whole sentences: a listen drill a line or three
  // (to a sentence end), a meaning drill the lines that answer it (widened the same way)
  const asked = (s: Support) => ({ from: s.from, to: mode === 'listen' ? Math.min(s.to ?? s.from, s.from + LISTEN_LINES - 1) : (s.to ?? s.from) });
  const want = qs.map((q) => support(q)[0]).filter(Boolean)
    .map((s) => ({ audio: s.audio, from: Math.max(1, s.from - SPAN_BACK), to: asked(s).to + SPAN_MAX + 2 }));
  const windows = await loadRuns(env, want);
  const runs = new Map<string, Run>();
  const spanOf = (s: Support) => {
    const w = windows.get(lineRef(s.audio, Math.max(1, s.from - SPAN_BACK), asked(s).to + SPAN_MAX + 2));
    if (!w) return undefined;
    const a = asked(s);
    const span = sentenceSpan(w.lines, a.from, a.to, Math.max(SPAN_MAX, a.to - a.from + 1));
    const r = narrow(w, span.from, span.to);
    if (r) runs.set(lineRef(s.audio, s.from, s.to ?? s.from) + ':' + mode, r);
    return r;
  };

  const out: Drill[] = [];
  const seen = new Set<string>();
  const dealtRuns: Run[] = [];
  for (const q of qs) {
    const s = support(q)[0];
    if (!s) continue;
    const where = rangeOf(q.surah, q.ayah_from, q.ayah_to);
    if (mode === 'listen') {
      const r = spanOf(s);
      // two questions on neighbouring lines widen to the same sentences: a run that overlaps one
      // already dealt from the same recording is not dealt again
      if (!r || dealtRuns.some((d) => d.audio === r.audio && d.from <= r.to && r.from <= d.to)) continue;
      dealtRuns.push(r);
      seen.add(lineRef(r.audio, r.from, r.to));
      out.push(listenDrill(r, q.surah, q.ayah_from, where));
      continue;
    }
    const options = parseJson<string[]>(q.options_json, []);
    const correct = parseJson<number[]>(q.correct_json, []);
    if (options.length < 2 || !correct.length) continue;
    const r = spanOf(s);
    const all = q.interaction === 'choose_all';
    const d = dealt(options, correct);
    out.push(withCard({
      id: `tafsirq:${q.id}`, kind: 'tafsir_meaning', ask: all ? 'tq_choose_all' : 'tq_choose',
      interaction: all ? 'choose_all' : 'choose', script: 'english',
      promptEn: q.question_en, options: d.options, ...(all ? { correct: d.correct } : { answer: d.answer }),
      // the lines that explained it: played again on asking; after the answer, read in full with
      // their accurate English, the point drawn from them, and the work they are from
      ...(r ? { audio: clipOf(r), note: { en: enOf(r) ?? q.explain_en ?? '', ar: textOf(r) }, terms: termsOfRun(r),
                explanation: [enOf(r) ? q.explain_en : null, citeOf(r)].filter(Boolean).join('\n— ') || null }
            : { explanation: q.explain_en }),
      source: { workId: `QR:SURAH:${q.surah}`, title: where, level: null },
    }, { ref: `QR:tafsirq:${q.id}`, type: 'passage', kind: 'tafsir_meaning', front: q.question_en,
         back: correct.map((i) => options[i]).join(' · '), surah: q.surah, ayah: q.ayah_from, series: 'tafsir' }));
  }
  return out;
}

/// The listen drills a set of line refs names — the to-perfect lines, wherever they were marked.
export async function lineDrills(env: QuranEnv, refs: string[], scope: Scope): Promise<Drill[]> {
  const want = refs.map(parseLineRef).filter((x): x is NonNullable<typeof x> => !!x && x.to - x.from < 12);
  if (!want.length) return [];
  const runs = await loadRuns(env, want);
  const title = scope.surah ? rangeOf(scope.surah, scope.from ?? 1, scope.to) : '';
  const drills = want.map((x) => runs.get(lineRef(x.audio, x.from, x.to)))
    .filter((r): r is Run => !!r)
    .map((r) => listenDrill(r, scope.surah ?? 0, scope.from ?? 0, title));
  // drawn outside drawSkill, so they take their GT chips here
  return attachGt(env.DB_QR, drills);
}

// ── the listen gate ─────────────────────────────────────────────────────────

/// Which lines of a read page a passage hears: from `from` (null: its first) to before `before`
/// (null: its last), or null when it hears none of it. A page reaching past the passage is cut at
/// the line its next āyah begins on; with no such cut it is heard whole in the first passage it
/// reaches, and not again.
export function pageSpan(page: { from: number; to: number }, passage: { from: number; to: number },
                         cuts: { ayah: number; seq: number }[]): { from: number | null; before: number | null } | null {
  if (page.to < passage.from || page.from > passage.to) return null;
  let from: number | null = null;
  if (page.from < passage.from) {
    const c = cuts.filter((x) => x.ayah > page.from && x.ayah <= passage.from).sort((a, b) => b.ayah - a.ayah)[0];
    if (!c) return null;
    from = c.seq;
  }
  let before: number | null = null;
  if (page.to > passage.to) {
    const c = cuts.filter((x) => x.ayah > passage.to && x.ayah <= page.to).sort((a, b) => a.ayah - b.ayah)[0];
    if (c) before = c.seq;
    else if (page.from < passage.from) return null;
  }
  return { from, before };
}

/// "40:1-6" → { from: 1, to: 6 }; "40:3" → { from: 3, to: 3 }.
export function groupRange(key: string | null): { surah: number; from: number; to: number } | null {
  const m = /^(\d+):(\d+)(?:-(\d+))?$/.exec(key ?? '');
  return m ? { surah: Number(m[1]), from: Number(m[2]), to: Number(m[3] ?? m[2]) } : null;
}

export type ListenTerm = { ar: string; ref: string; nameAr: string; color: string | null };
export type ListenLine = { id: string; seq: number; start: number; end: number; text: string; words: { t: string; s: number; e: number }[];
                           en: string | null; terms: ListenTerm[] };
export type ListenPart = { audio: string; url: string; start: number; end: number; lines: ListenLine[] };
export type ListenWork = { slug: string; title: string | null; titleAr: string | null; author: string | null; seconds: number; parts: ListenPart[] };

/// Every work the gate names, its span over the passage: the recordings in reading order, each
/// with its lines. A work with no recorded line over the passage is left out.
export async function listenWorks(env: QuranEnv, slugs: string[], p: { surah: number; from: number; to: number }): Promise<ListenWork[]> {
  if (!slugs.length) return [];
  const [pages, books] = await Promise.all([
    query<{ id: string; source_slug: string; seq: number; ayah_group_key: string }>(env.DB_QR,
      `SELECT id, source_slug, seq, ayah_group_key FROM qr_tafsir_read_page
        WHERE surah_no = ? AND kind = 'ayah' AND status = 'live' AND source_slug IN (${slugs.map(() => '?').join(',')})
        ORDER BY source_slug, seq`, [p.surah, ...slugs]),
    query<{ source_slug: string; title_en: string | null; title_ar: string | null; author: string | null }>(env.DB_QR,
      `SELECT source_slug, book_title_en AS title_en, book_title_ar AS title_ar, author_name_ar AS author
         FROM qr_tafsir_book_display_source WHERE source_slug IN (${slugs.map(() => '?').join(',')})`, slugs),
  ]);
  const near = pages.filter((x) => { const g = groupRange(x.ayah_group_key); return !!g && g.to >= p.from && g.from <= p.to; });
  if (!near.length) return [];
  const ids = near.map((x) => x.id);
  const [segs, cuts, recs] = await Promise.all([
    query<Seg>(env.DB_QR,
      `SELECT ${SEG_COLS} FROM ${SEG_FROM} WHERE s.page_id IN (${ids.map(() => '?').join(',')}) ORDER BY s.audio_id, s.seq`, ids),
    query<{ page_id: string; audio_id: string; ayah: number; seq: number }>(env.DB_QR,
      `SELECT page_id, audio_id, ayah, seq FROM qr_tafsir_page_cut WHERE page_id IN (${ids.map(() => '?').join(',')})`, ids),
    query<{ id: string; object_key: string; seq: number }>(env.DB_QR,
      `SELECT id, object_key, seq FROM qr_tafsir_audio WHERE status = 'live' AND id IN
         (SELECT DISTINCT audio_id FROM qr_tafsir_audio_segment WHERE page_id IN (${ids.map(() => '?').join(',')}))`, ids),
  ]);
  const rec = new Map(recs.map((r) => [r.id, r]));
  const book = new Map(books.map((b) => [b.source_slug, b]));
  // the registry's name and colour for every term the lines use
  const refs = [...new Set(segs.flatMap((l) => termsOf(l).map((t) => t.ref)))];
  const named = new Map<string, { name_ar: string; badge_color: string | null }>();
  for (let i = 0; i < refs.length; i += 90) {
    const ids90 = refs.slice(i, i + 90);
    const rows = await query<{ id: string; name_ar: string; badge_color: string | null }>(env.DB_QR,
      `SELECT id, name_ar, badge_color FROM ar_ling_gram_term WHERE id IN (${ids90.map(() => '?').join(',')})`, ids90).catch(() => []);
    for (const r of rows) if (r.name_ar) named.set(r.id, r);
  }
  const lineTerms = (l: Seg): ListenTerm[] => termsOf(l).flatMap((t) => {
    const n = named.get(t.ref);
    return n ? [{ ar: t.ar, ref: t.ref, nameAr: n.name_ar, color: n.badge_color }] : [];
  });

  return slugs.flatMap((slug) => {
    const parts: ListenPart[] = [];
    for (const page of near.filter((x) => x.source_slug === slug)) {
      const g = groupRange(page.ayah_group_key)!;
      // the page's lines from one recording: the first, in reading order, that reads it
      const audio = [...new Set(segs.filter((s) => s.page_id === page.id).map((s) => s.audio_id))]
        .filter((a) => rec.has(a)).sort((a, b) => rec.get(a)!.seq - rec.get(b)!.seq)[0];
      if (!audio) continue;
      const span = pageSpan(g, p, cuts.filter((c) => c.page_id === page.id && c.audio_id === audio));
      if (!span) continue;
      const lines = segs.filter((s) => s.page_id === page.id && s.audio_id === audio && s.end_sec > s.start_sec
        && (span.from === null || s.seq >= span.from) && (span.before === null || s.seq < span.before));
      if (!lines.length) continue;
      const last = parts[parts.length - 1];
      const part = last && last.audio === audio ? last : { audio, url: AUDIO(rec.get(audio)!.object_key), start: 0, end: 0, lines: [] };
      part.lines.push(...lines.map((s) => ({ id: lineRef(audio, s.seq, s.seq), seq: s.seq, start: s.start_sec, end: s.end_sec,
                                             text: s.text_ar, words: timedWords(s.text_ar, s.w),
                                             en: s.en, terms: lineTerms(s) })));
      if (part !== last) parts.push(part);
    }
    for (const x of parts) {
      x.lines.sort((a, b) => a.seq - b.seq);
      x.start = Math.max(0, x.lines[0].start - 0.3);
      x.end = x.lines[x.lines.length - 1].end + 0.3;
    }
    if (!parts.length) return [];
    const b = book.get(slug);
    const seconds = Math.round(parts.reduce((t, x) => t + (x.end - x.start), 0));
    return [{ slug, title: b?.title_en ?? null, titleAr: b?.title_ar ?? null, author: b?.author ?? null, seconds, parts }];
  });
}

/// The practice home's counts: live passage questions with options; live tafsīr questions.
export async function questionsCount(env: QuranEnv): Promise<{ questions: number; tafsirq: number }> {
  const r = await queryOne<{ q: number; t: number }>(env.DB_QR,
    `SELECT (SELECT COUNT(*) FROM qr_study_question WHERE status = 'live' AND options_json IS NOT NULL) AS q,
            (SELECT COUNT(*) FROM qr_tafsir_question WHERE status = 'live') AS t`);
  return { questions: r?.q ?? 0, tafsirq: r?.t ?? 0 };
}

