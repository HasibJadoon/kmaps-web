import { query, queryOne } from '../../../shared/src/db';
import type { QuranEnv } from '../env';
import { attachGt } from '../../../shared/src/gt-attach';
import { spelled } from '../lib/tafsir-text';
import { withCard, shuffle, parseJson, rangeOf, type Drill, type Scope } from './practice-kit';
import { cutQuote, bidiEn } from './practice-sarf';

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
export function timedWords(raw: string, w: string | null): { t: string; s: number; e: number }[] {
  // the basmala sign spelt out as its four words, its time shared among them
  const { text, times: spelt } = spelled(raw, parseJson<unknown[]>(w, []));
  const tokens = text.split(/\s+/).filter(Boolean);
  const times = spelt ?? [];
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

/// A sentence marked "not understood", as one id: tafsir_sent:<audio>:<from>-<to> (qr_tafsir_sentence.id).
export const sentenceRef = (audio: string, from: number, to: number) => `tafsir_sent:${audio}:${from}-${to}`;
export function parseSentenceRef(ref: string): { audio: string; from: number; to: number } | null {
  return ref.startsWith('tafsir_sent:') ? parseLineRef(`tafsir_line:${ref.slice('tafsir_sent:'.length)}`) : null;
}

/** The understanding drills a set of sentence refs names — the sentences the learner marked "not understood". The
 *  sentence plays, its words shown; the learner chooses what it says among the near misses written for it (and the
 *  work's nearest other sentence); its meaning is the explanation after the answer. */
export async function sentenceDrills(env: QuranEnv, refs: string[], scope: Scope): Promise<Drill[]> {
  const ids = [...new Set(refs.filter((r) => parseSentenceRef(r)))];
  if (!ids.length) return [];
  const rows = await query<SentenceRow & { source_slug: string; surah: number; ayah_from: number; wrong_json: string; terms_json: string }>(env.DB_QR,
    `SELECT id, audio_id, source_slug, seq_from, seq_to, surah, ayah_from, gist_en, wrong_json, concept_en, concept_ar, meaning_en, terms_json
       FROM qr_tafsir_sentence WHERE status = 'live' AND id IN (${ids.map(() => '?').join(',')})`, ids);
  if (!rows.length) return [];
  // the work's other gists, for a fourth choice nearest in length
  const audios = [...new Set(rows.map((r) => r.audio_id))];
  const siblings = await query<{ audio_id: string; id: string; gist_en: string }>(env.DB_QR,
    `SELECT audio_id, id, gist_en FROM qr_tafsir_sentence WHERE status = 'live' AND audio_id IN (${audios.map(() => '?').join(',')})`, audios);
  const runs = await loadRuns(env, rows.map((r) => ({ audio: r.audio_id, from: r.seq_from, to: r.seq_to })));
  const title = scope.surah ? rangeOf(scope.surah, scope.from ?? 1, scope.to) : '';
  const out: Drill[] = [];
  for (const r of rows) {
    const run = runs.get(lineRef(r.audio_id, r.seq_from, r.seq_to));
    if (!run) continue;
    const wrong = parseJson<string[]>(r.wrong_json, []).filter((x) => x && x !== r.gist_en);
    const other = siblings.filter((x) => x.audio_id === r.audio_id && x.id !== r.id && !wrong.includes(x.gist_en))
      .sort((a, b) => Math.abs(a.gist_en.length - r.gist_en.length) - Math.abs(b.gist_en.length - r.gist_en.length))[0];
    const options = [r.gist_en, ...wrong, ...(other ? [other.gist_en] : [])].slice(0, 4).map(bidiEn);
    if (options.length < 3) continue;
    const terms = parseJson<string[]>(r.terms_json, []).filter((t) => /^GT:[a-z_]+:[a-z0-9_]+$/.test(t));
    out.push(withCard({
      id: r.id, kind: 'tafsir_understand', ask: 'tq_read', interaction: 'choose', script: 'arabic',
      audio: clipOf(run), words: wordsOf(run),
      options: shuffle(options), answer: options[0], terms,
      note: { en: bidiEn(r.concept_en), ar: r.concept_ar ?? '' },
      explanation: bidiEn(r.meaning_en),
      source: { workId: `QR:SURAH:${scope.surah ?? r.surah}`, title: `${title} · ${citeOf(run)}`, level: null },
    }, { ref: `QR:${r.id}`, type: 'passage', kind: 'tafsir_understand', front: textOf(run), back: `${r.gist_en}\n\n${r.meaning_en}`,
         surah: scope.surah ?? r.surah, ayah: scope.from ?? r.ayah_from, series: 'tafsir' }));
  }
  return attachGt(env.DB_QR, out);
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
/** A paragraph of the work's own English for the passage (qr_surah_tafsir_chunk), pinned to the recorded lines its
 *  Arabic spans — the "passage" view shows the Arabic run on, the English under it, the paragraph lit as it is read. */
export type ListenParagraph = { from: number; to: number; en: string; heading?: string | null };
/** A sentence of the recording with what it says and means (qr_tafsir_sentence): the "Understanding" view. */
export type ListenSentence = { id: string; from: number; to: number; gist: string; concept: string; conceptAr: string | null; meaning: string };
export type ListenPart = { audio: string; url: string; start: number; end: number; lines: ListenLine[];
                           paragraphs: ListenParagraph[]; sentences: ListenSentence[] };
export type ListenWork = { slug: string; title: string | null; titleAr: string | null; author: string | null; seconds: number; parts: ListenPart[] };

type Chunk = { source_slug: string; text_ar: string; text_en: string };
type SentenceRow = { id: string; audio_id: string; seq_from: number; seq_to: number; gist_en: string; concept_en: string;
                     concept_ar: string | null; meaning_en: string };

/// Arabic letters only, spellings unified: for finding a paragraph's opening among the recorded words.
export const arTokens = (t: string) => (t ?? '').replace(/[\u064B-\u065F\u0670\u0640]/g, '')
  .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').match(/[\u0621-\u064A]+/g) ?? [];

/** The work's English paragraphs pinned to the recorded lines: each paragraph starts at the line where its Arabic's
 *  opening words are read (the first 6, else 5, 4 or 3). A paragraph not found in the recording is not this part's
 *  (another passage's, or unread); two that start on one line are one paragraph; lines before the first found
 *  paragraph belong to it; each runs to the line before the next. */
export function alignParagraphs(lines: { seq: number; text: string }[], chunks: { text_ar: string; text_en: string }[]): ListenParagraph[] {
  if (!lines.length) return [];
  const toks: string[] = [], seqOf: number[] = [];
  for (const l of lines) for (const t of arTokens(l.text)) { toks.push(t); seqOf.push(l.seq); }
  const startOf = (ar: string): number | null => {
    const ct = arTokens(ar);
    for (const k of [6, 5, 4, 3]) {
      if (ct.length < k) continue;
      for (let i = 0; i + k <= toks.length; i++) {
        let same = true;
        for (let j = 0; j < k && same; j++) same = toks[i + j] === ct[j];
        if (same) return seqOf[i];
      }
    }
    return null;
  };
  const found: { from: number; en: string }[] = [];
  for (const c of chunks) {
    const at = startOf(c.text_ar);
    if (at === null) continue;
    const same = found.find((f) => f.from === at);
    if (same) same.en = `${same.en} ${c.text_en.trim()}`;
    else found.push({ from: at, en: c.text_en.trim() });
  }
  found.sort((a, b) => a.from - b.from);
  if (!found.length) return [];
  found[0].from = lines[0].seq;
  const last = lines[lines.length - 1].seq;
  return found.map((f, i) => ({ from: f.from, to: i + 1 < found.length ? found[i + 1].from - 1 : last, en: f.en }));
}

/** A reader's paragraphs over the whole part: the English-pinned ones as they are, and every stretch no English covers
 *  (a work with no English, or lines before / between them) cut into passages at sentence ends — a passage closes at a
 *  full stop, question or colon once it holds about `soft` letters, and at the next line past `hard` — so a long
 *  commentary reads as passages, not one block. A passage with no English of its own carries en ''. */
export function passagesOf(lines: { seq: number; text: string }[], pinned: ListenParagraph[], soft = 420, hard = 900): ListenParagraph[] {
  if (!lines.length) return [];
  const out: ListenParagraph[] = [];
  const cut = (run: { seq: number; text: string }[]) => {
    let from: number | null = null, size = 0;
    run.forEach((l, i) => {
      from ??= l.seq;
      size += l.text.length;
      const ends = /[.!؟?:؛]\s*[»”"')\]]*\s*$/.test(l.text.trim());
      if ((size >= soft && ends) || size >= hard || i === run.length - 1) {
        out.push({ from, to: l.seq, en: '' });
        from = null; size = 0;
      }
    });
  };
  const sorted = [...pinned].sort((a, b) => a.from - b.from);
  let at = 0;
  for (const g of sorted) {
    const before = lines.filter((l) => l.seq < g.from && (at === 0 || l.seq > at));
    if (before.length) cut(before);
    out.push(g);
    at = g.to;
  }
  const after = lines.filter((l) => !sorted.length || l.seq > at);
  if (after.length) cut(after);
  return out;
}

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
  const [segs, cuts, recs, chunks, sents] = await Promise.all([
    query<Seg>(env.DB_QR,
      `SELECT ${SEG_COLS} FROM ${SEG_FROM} WHERE s.page_id IN (${ids.map(() => '?').join(',')}) ORDER BY s.audio_id, s.seq`, ids),
    query<{ page_id: string; audio_id: string; ayah: number; seq: number }>(env.DB_QR,
      `SELECT page_id, audio_id, ayah, seq FROM qr_tafsir_page_cut WHERE page_id IN (${ids.map(() => '?').join(',')})`, ids),
    query<{ id: string; object_key: string; seq: number }>(env.DB_QR,
      `SELECT id, object_key, seq FROM qr_tafsir_audio WHERE status = 'live' AND id IN
         (SELECT DISTINCT audio_id FROM qr_tafsir_audio_segment WHERE page_id IN (${ids.map(() => '?').join(',')}))`, ids),
    // the works' own English over the passage, paragraph by paragraph, in reading order
    query<Chunk>(env.DB_QR,
      `SELECT c.source_slug, c.text_ar, c.text_en FROM qr_surah_tafsir_chunk c JOIN qr_surah_tafsir_reading r ON r.id = c.reading_id
        WHERE r.surah = ? AND r.ayah_from <= ? AND r.ayah_to >= ? AND c.text_en IS NOT NULL AND c.text_en <> ''
          AND c.source_slug IN (${slugs.map(() => '?').join(',')})
        ORDER BY c.source_slug, r.ayah_from, c.chunk_index`, [p.surah, p.to, p.from, ...slugs]).catch(() => [] as Chunk[]),
    query<SentenceRow>(env.DB_QR,
      `SELECT id, audio_id, seq_from, seq_to, gist_en, concept_en, concept_ar, meaning_en FROM qr_tafsir_sentence
        WHERE status = 'live' AND surah = ? AND source_slug IN (${slugs.map(() => '?').join(',')}) ORDER BY audio_id, seq_from`,
      [p.surah, ...slugs]).catch(() => [] as SentenceRow[]),
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
      const part: ListenPart = last && last.audio === audio ? last
        : { audio, url: AUDIO(rec.get(audio)!.object_key), start: 0, end: 0, lines: [], paragraphs: [], sentences: [] };
      part.lines.push(...lines.map((s) => ({ id: lineRef(audio, s.seq, s.seq), seq: s.seq, start: s.start_sec, end: s.end_sec,
                                             text: spelled(s.text_ar, null).text, words: timedWords(s.text_ar, s.w),
                                             en: s.en, terms: lineTerms(s) })));
      if (part !== last) parts.push(part);
    }
    for (const x of parts) {
      x.lines.sort((a, b) => a.seq - b.seq);
      x.start = Math.max(0, x.lines[0].start - 0.3);
      x.end = x.lines[x.lines.length - 1].end + 0.3;
      // English that opens on (or holds) Arabic still reads left to right: the Arabic runs are isolated
      x.paragraphs = passagesOf(x.lines,
        alignParagraphs(x.lines, chunks.filter((c) => c.source_slug === slug)).map((g) => ({ ...g, en: bidiEn(g.en) })));
      const first = x.lines[0].seq, lastSeq = x.lines[x.lines.length - 1].seq;
      x.sentences = sents.filter((r) => r.audio_id === x.audio && r.seq_from >= first && r.seq_to <= lastSeq)
        .map((r) => ({ id: r.id, from: r.seq_from, to: r.seq_to, gist: bidiEn(r.gist_en), concept: bidiEn(r.concept_en),
                       conceptAr: r.concept_ar, meaning: bidiEn(r.meaning_en) }));
      // each passage's heading: the idea of the first recorded sentence that starts in it (qr_tafsir_sentence)
      x.paragraphs = x.paragraphs.map((g) => ({ ...g,
        heading: x.sentences.filter((t) => t.from >= g.from && t.from <= g.to).sort((a, b) => a.from - b.from)[0]?.concept ?? null }));
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


// ── reading the commentary through ──────────────────────────────────────────
//
// The four works over the passage, each read through in its author's order, a sentence at a time:
// the line plays and its words light as they are said; the learner chooses the English that says
// what it says. The other choices are other sentences of the same work, nearest in length, so only
// reading the line tells them apart; the English is never shown before the answer. A sentence missed
// comes back until it is right, so a passage's step is passed only when all four works are understood.

/** A work's lines as sentences: lines joined until one ends a sentence (or, past four lines, a
 *  clause), at most six; a scrap of three words or fewer joins the sentence before it. */
export function sentencesOf<L extends { text: string; words: { t: string; s: number; e: number }[] }>(lines: L[]): L[][] {
  const out: L[][] = [];
  let acc: L[] = [];
  for (const l of lines) {
    acc.push(l);
    if (endsSentence(l.text) || (acc.length >= 4 && endsClause(l.text)) || acc.length >= 6) { out.push(acc); acc = []; }
  }
  if (acc.length) out.push(acc);
  return out.reduce<L[][]>((xs, g) => {
    const n = spokenWords(g.flatMap((l) => l.words)).length;
    if (n <= 3 && xs.length) xs[xs.length - 1] = [...xs[xs.length - 1], ...g];
    else xs.push(g);
    return xs;
  }, []);
}

/** Rung 3 (read): the line shown and played. Rung 4 (heard): the same sentences, nothing on the screen
 *  but the recording — the learner follows by ear alone. */
export async function tafsirReadDrills(env: QuranEnv, scope: Scope, slugs: string[], heard = false): Promise<Drill[]> {
  if (!scope.surah || !scope.from) return [];
  const works = await listenWorks(env, slugs, { surah: scope.surah, from: scope.from, to: scope.to ?? scope.from });
  const out: Drill[] = [];
  const where = rangeOf(scope.surah, scope.from, scope.to);
  for (const w of works) {
    const cite = [w.titleAr ?? w.title, w.author].filter(Boolean).join(' — ');
    const groups = w.parts.flatMap((part) => sentencesOf(part.lines).map((g) => ({ part, g })))
      .map(({ part, g }) => ({ part, g, en: g.every((l) => l.en) ? g.map((l) => l.en).join(' ') : null }));
    const english = groups.map((x) => x.en).filter((x): x is string => !!x);
    for (const { part, g, en } of groups) {
      if (!en) continue;
      const words = spokenWords(g.flatMap((l) => l.words));
      if (words.length < 4) continue;
      // the other choices: this work's other sentences, nearest in length
      const others = [...new Set(english.filter((x) => x !== en))]
        .sort((a, b) => Math.abs(a.length - en.length) - Math.abs(b.length - en.length)).slice(0, 3);
      if (others.length < 3) continue;
      const from = g[0].seq, to = g[g.length - 1].seq;
      const kind = heard ? 'tafsir_hear' : 'tafsir_read';
      const id = `${kind}:${part.audio}:${from === to ? from : `${from}-${to}`}`;
      const seen = new Set<string>();
      const terms = g.flatMap((l) => l.terms).filter((t) => !seen.has(t.ref) && !!seen.add(t.ref)).map((t) => t.ref);
      out.push(withCard({
        id, kind, ask: heard ? 'tq_hear' : 'tq_read', interaction: 'choose', script: 'arabic',
        audio: { url: part.url, start: Math.max(0, g[0].start - 0.2), end: g[g.length - 1].end + 0.2 }, ...(heard ? {} : { words }),
        // heard: the line itself is shown only once answered
        ...(heard ? { note: { en, ar: words.map((x) => x.t).join(' ') } } : {}),
        options: shuffle([en, ...others]), answer: en, terms,
        explanation: cite || null,
        source: { workId: `QR:SURAH:${scope.surah}`, title: `${where} · ${w.titleAr ?? w.title ?? ''}`, level: null },
      }, { ref: `QR:${id}`, type: 'passage', kind, front: words.map((x) => x.t).join(' '), back: en,
           surah: scope.surah, ayah: scope.from, series: 'tafsir' }));
    }
  }
  return out;
}

// ── the commentators' language (rung 2) ─────────────────────────────────────

type Gloss = { key: string; kind: 'phrase' | 'term'; ar: string; needle: string | null; gt_ref: string | null; en: string; use_en: string | null };

/** The commentators' stock phrases and terms, each met in this passage's own commentary: the line that
 *  uses it plays, and the learner chooses what the phrase does or what the term means. */
export async function tafsirLangDrills(env: QuranEnv, scope: Scope, slugs: string[]): Promise<Drill[]> {
  if (!scope.surah || !scope.from) return [];
  const [works, glosses] = await Promise.all([
    listenWorks(env, slugs, { surah: scope.surah, from: scope.from, to: scope.to ?? scope.from }),
    query<Gloss>(env.DB_QR, `SELECT key, kind, ar, needle, gt_ref, en, use_en FROM qr_tafsir_gloss WHERE status = 'live' ORDER BY sort`),
  ]);
  const lines = works.flatMap((w) => w.parts.flatMap((part) => part.lines.map((line) => ({ w, part, line }))));
  const where = rangeOf(scope.surah, scope.from, scope.to);
  const phrases = glosses.filter((g) => g.kind === 'phrase'), terms = glosses.filter((g) => g.kind === 'term');
  const out: Drill[] = [];
  const make = (g: Gloss, hit: (typeof lines)[number], shown: string, answer: string, pool: string[]) => {
    const others = [...new Set(pool.filter((x) => x && x !== answer))].sort(() => Math.random() - 0.5).slice(0, 3);
    if (others.length < 3) return;
    const { w, part, line } = hit;
    const id = `tafsir_lang:${g.key}`;
    out.push(withCard({
      id, kind: 'tafsir_lang', ask: g.kind === 'phrase' ? 'tq_phrase' : 'tq_term', interaction: 'choose', script: 'arabic',
      audio: { url: part.url, start: Math.max(0, line.start - 0.2), end: line.end + 0.2 }, words: spokenWords(line.words),
      prompt: shown, options: shuffle([answer, ...others]), answer, terms: g.gt_ref ? [g.gt_ref] : [],
      explanation: [`${g.ar} — ${g.en}${g.use_en ? `: ${g.use_en.toLowerCase()}` : ''}`, line.en, [w.titleAr ?? w.title, w.author].filter(Boolean).join(' — ')]
        .filter(Boolean).join('\n'),
      source: { workId: `QR:SURAH:${scope.surah}`, title: `${where} · ${w.titleAr ?? w.title ?? ''}`, level: null },
    }, { ref: `QR:${id}`, type: 'passage', kind: 'tafsir_lang', front: g.ar, back: answer, surah: scope.surah, ayah: scope.from, series: 'tafsir' }));
  };
  // a phrase: the first line of the passage's commentary that uses it, matched by its bare form
  for (const g of phrases) {
    const hit = lines.find((x) => g.needle && cutQuote(x.line.text, g.needle));
    if (hit) make(g, hit, cutQuote(hit.line.text, g.needle!)!, g.use_en ?? g.en, phrases.map((p) => p.use_en ?? p.en));
  }
  // a term: the first line that names it
  for (const g of terms) {
    const hit = lines.find((x) => x.line.terms.some((t) => t.ref === g.gt_ref));
    const shown = hit?.line.terms.find((t) => t.ref === g.gt_ref)?.ar;
    if (hit && shown) make(g, hit, shown, g.en, terms.map((t) => t.en));
  }
  return out;
}
