import type { Router } from '../../../shared/src/router';
import { ok, badRequest, notFound } from '../../../shared/src/response';
import { query, queryOne, execute } from '../../../shared/src/db';
import type { QuranEnv } from '../env';
import { labels, byKey, type Label } from '../lib/labels';
import { drawSkill, loadAyat, type Scope } from './practice';
import { interleave, parseJson } from './practice-kit';
import { listenWorks, lineDrills, parseLineRef, sentenceDrills, parseSentenceRef } from './practice-tafsirq';

// ── The Class: a passage studied as one lesson ─────────────────────────────────
// What the class is: its path of graded sprints, in the order the class_node label rows give
// (qr_067), and every drill each step holds over the passage — all of a step's skills, drawn
// whole, not sampled. What the learner did lives in CORE (/core/drill/class*); the device
// puts the two together (locks, rings, stars). The same for every reader, so kept (index.ts).
//
//   GET /qr/practice/class/surah?surah=40           the sūra's passages, in order: its units
//   GET /qr/practice/class/path?passage=QR:SP:40:1-3 the unit's nodes, how many drills each holds
//   GET /qr/practice/class/pills?passage=…&node=words   one node's pills, from its kept counts (qr_160)
//   GET /qr/practice/class/node?passage=…&node=words  a node's drills, whole: the device cuts the
//       sprints and keeps them. check: drawn from every step; review: &steps=read,words;
//       practice: &refs=<drill ids> (the class's to-perfect set, from CORE — a tafsīr line
//       marked in the listen gate is named by its line ref and drawn as its listen drill)
//   GET /qr/practice/class/listen?passage=…&node=listen  the listen gate: each work the node
//       names, its recordings over the passage with every line timed; one sprint per work, run
//       when that work is heard to the node's `heard` percent

type Passage = { id: string; surah: number; passage_no: number; ayah_from: number; ayah_to: number;
                 label: string | null; title_en: string | null; title_ar: string | null };
type Drill = Record<string, unknown>;

const passageOf = (env: QuranEnv, id: string) => queryOne<Passage>(env.DB_QR,
  `SELECT id, surah, passage_no, ayah_from, ayah_to, label, title_en, title_ar
     FROM qr_surah_study_passage WHERE id = ?`, [id]);

const scopeOf = (p: Passage): Scope => ({ surah: p.surah, from: p.ayah_from, to: p.ayah_to });
const kindOf = (n: Label) => String(n.extra?.kind ?? 'step');
const skillsOf = (n: Label) => (Array.isArray(n.extra?.skills) ? n.extra!.skills as string[] : []);
const num = (v: unknown, d: number) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);

// A drill's card carries a copy of the drill to replay in review (gt-attach.ts) — the drill itself, less its card, its
// context panel and badges. Kept, that copy doubled every pool; so a pool keeps it as a mark (`drill: true`) and it is
// made again from the drill when the drill is served. Old pools are rewritten slim the first time they are read.
function slim(d: Drill): Drill {
  const srs = d.srs as { extra?: Record<string, unknown> } | undefined;
  if (!srs?.extra || !srs.extra.drill || srs.extra.drill === true) return d;
  return { ...d, srs: { ...srs, extra: { ...srs.extra, drill: true } } };
}
export function full(d: Drill): Drill {
  const srs = d.srs as { extra?: Record<string, unknown> } | undefined;
  if (srs?.extra?.drill !== true) return d;
  const { srs: _s, context: _c, badges: _b, ...dealt } = d;
  return { ...d, srs: { ...srs, extra: { ...srs.extra, drill: dealt } } };
}

type PoolRow = { step_key: string; definition: string; items_json: string };
const defOfStep = (node: Label) => JSON.stringify(node.extra ?? {});
/** A kept pool row's drills, or null when it is not this step's current draw. */
function parseKept(node: Label, kept: PoolRow | null | undefined): Drill[] | null {
  if (!kept || kept.definition !== defOfStep(node)) return null;
  try { return JSON.parse(kept.items_json) as Drill[]; } catch { return null; }
}

/** A step's drills over a passage, kept (qr_140): the first draw is served from then on, so the path's
 *  counts, a node's drills and any later day's draw agree, and an item kept open can always be dealt
 *  back. Drawn again only when the step's definition changes (or the passage's rows are deleted). Slim
 *  (no review copy): serve with `full`. `kept` is the row when the caller already read it. */
async function stepPool(env: QuranEnv, L: Record<string, Label[]>, node: Label, p: Passage, kept?: PoolRow | null): Promise<Drill[]> {
  const definition = defOfStep(node);
  const row = kept !== undefined ? kept : await queryOne<PoolRow>(env.DB_QR,
    'SELECT step_key, definition, items_json FROM qr_class_pool WHERE passage_id = ? AND step_key = ?', [p.id, node.key]).catch(() => null);
  const have = parseKept(node, row);
  if (have) {
    // a pool kept before slimming: rewritten once
    if (row!.items_json.includes('"drill":{')) {
      const thin = have.map(slim);
      await execute(env.DB_QR, 'UPDATE qr_class_pool SET items_json = ? WHERE passage_id = ? AND step_key = ? AND definition = ?',
        [JSON.stringify(thin), p.id, node.key, definition]).catch(() => null);
      return thin;
    }
    return have;
  }
  const drawn = (await drawPool(env, L, node, scopeOf(p))).map(slim);
  if (!drawn.length) return drawn;            // nothing to keep: a step with no drills here stays off the path
  // the first draw wins: two first reads at once keep one draw, and both are served it
  await execute(env.DB_QR,
    `INSERT INTO qr_class_pool (passage_id, step_key, definition, items_json) VALUES (?, ?, ?, ?)
     ON CONFLICT (passage_id, step_key) DO UPDATE SET definition = excluded.definition, items_json = excluded.items_json,
       created_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')
     WHERE qr_class_pool.definition <> excluded.definition`,
    [p.id, node.key, definition, JSON.stringify(drawn)]).catch(() => null);
  // the step's kept counts and lessons (qr_160) were made from the old draw: made again on the next read
  await env.DB_QR.batch([
    env.DB_QR.prepare('DELETE FROM qr_class_node_stat WHERE passage_id = ? AND node_key = ?').bind(p.id, node.key),
    env.DB_QR.prepare('DELETE FROM qr_class_lesson WHERE passage_id = ? AND step_key = ?').bind(p.id, node.key),
  ]).catch(() => null);
  const now = await queryOne<{ items_json: string }>(env.DB_QR,
    'SELECT items_json FROM qr_class_pool WHERE passage_id = ? AND step_key = ?', [p.id, node.key]).catch(() => null);
  try { return now ? JSON.parse(now.items_json) as Drill[] : drawn; } catch { return drawn; }
}

/** Several steps' pools: their kept rows read in one query, any not kept drawn. */
async function stepPools(env: QuranEnv, L: Record<string, Label[]>, steps: Label[], p: Passage): Promise<Drill[][]> {
  if (!steps.length) return [];
  const rows = await query<PoolRow>(env.DB_QR,
    `SELECT step_key, definition, items_json FROM qr_class_pool WHERE passage_id = ? AND step_key IN (${steps.map(() => '?').join(',')})`,
    [p.id, ...steps.map((n) => n.key)]).catch(() => [] as PoolRow[]);
  const byStep = new Map(rows.map((r) => [r.step_key, r]));
  return Promise.all(steps.map((n) => stepPool(env, L, n, p, byStep.get(n.key) ?? null)));
}

/** Every drill a step holds over the passage: each of its skills drawn whole, once each by id. */
async function drawPool(env: QuranEnv, L: Record<string, Label[]>, node: Label, scope: Scope): Promise<Drill[]> {
  const max = num(node.extra?.max, 30);
  const only = (node.extra?.only ?? {}) as Record<string, string[]>;
  const piles = await Promise.all(skillsOf(node).map((s) => drawSkill(env, L, s, 'all', max, scope, null, only[s], node.extra?.every === true)
    .catch(() => [] as Drill[])));
  const seen = new Set<string>();
  // the skills interleaved, so a sprint is not all one kind of drill
  return interleave(piles, Number.MAX_SAFE_INTEGER).filter((d) => {
    const id = String(d.id ?? '');
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

// ── A step run sentence by sentence ────────────────────────────────────────────
// A sentence is a span of words: it may run over several āyāt, and one āyah may hold several
// sentences. So a drill is placed by where it stands — its āyah and first marked word (`at`) —
// in the sentence whose span holds that word. A drill that names only its āyah goes to the
// first sentence touching that āyah. Each sentence with drills is a node of its own, keyed
// `<step>@<sentence id>`; a sentence with none is left off the path, as an empty step is.

export type Sentence = { id: string; ayah_from: number; ayah_to: number; ws: number | null; we: number | null };

const SEP = '@';
export const sentenceKey = (step: string, sentence: string) => `${step}${SEP}${sentence}`;
export const splitKey = (key: string): { step: string; sentence: string | null } => {
  const i = key.indexOf(SEP);
  return i < 0 ? { step: key, sentence: null } : { step: key.slice(0, i), sentence: key.slice(i + 1) };
};
const perSentence = (n: Label) => n.extra?.per === 'sentence';

/** Where a drill stands: its `at`, else the āyah its card names (surah:ayah) or its id carries. */
function standing(d: Drill): { ayah: number | null; word: number | null } {
  const at = d.at as { ayah?: number | null; word?: number | null } | undefined;
  if (at?.ayah) return { ayah: Number(at.ayah), word: at.word ? Number(at.word) : null };
  const work = ((d.srs as { extra?: { group?: { work?: string | null } } } | undefined)?.extra?.group?.work) ?? '';
  const m = /^\d+:(\d+)$/.exec(work) ?? /:\d{1,3}:(\d{1,3})(?::|$)/.exec(String(d.id ?? ''));
  return { ayah: m ? Number(m[1]) : null, word: null };
}

/** Each drill in its sentence, in the sentences' order; a drill no sentence holds is left out. */
export function placeBySentence(drills: Drill[], sentences: Sentence[]): Map<string, Drill[]> {
  const pos = (ayah: number, word: number) => ayah * 10_000 + word;
  const out = new Map<string, Drill[]>(sentences.map((s) => [s.id, []]));
  for (const d of drills) {
    const { ayah, word } = standing(d);
    if (!ayah) continue;
    const s = (word ? sentences.find((x) => pos(x.ayah_from, x.ws ?? 1) <= pos(ayah, word) && pos(ayah, word) <= pos(x.ayah_to, x.we ?? 9_999)) : undefined)
      ?? sentences.find((x) => x.ayah_from <= ayah && ayah <= x.ayah_to);
    if (s) out.get(s.id)!.push(d);
  }
  return out;
}

/** The passage's sentences, in reading order — the sentences of its trees (qr_ss_tree). Where two readings
 *  cover the same words, the one with a built tree comes first, then the curated over al-Jadwal's; the drills
 *  go to the first that holds them, and a reading left with none is not on the path. */
const sentencesOf = (env: QuranEnv, p: Passage) => query<Sentence>(env.DB_QR,
  `SELECT s.id, s.ayah_from, s.ayah_to, s.word_start_index AS ws, s.word_end_index AS we FROM qr_ss_occ_sentence s
    WHERE s.surah = ? AND s.ayah_from <= ? AND s.ayah_to >= ? AND COALESCE(s.is_virtual, 0) = 0
    ORDER BY s.ayah_from, s.word_start_index,
             NOT EXISTS (SELECT 1 FROM qr_ss_tree t WHERE t.sentence_id = s.id), (s.id LIKE '%:jadwal:%'), s.id`,
  [p.surah, p.ayah_to, p.ayah_from]);

/** A sentence's node, worded by class_ui `sentence_n`: its number in the passage and its range. */
function sentenceLabel(L: Record<string, Label[]>, step: Label, s: Sentence, n: number, surah: number): Label {
  const w = (L.class_ui ?? []).find((l) => l.key === 'sentence_n');
  const range = s.ayah_to > s.ayah_from ? `${surah}:${s.ayah_from}–${s.ayah_to}` : `${surah}:${s.ayah_from}`;
  const fill = (t: string | null | undefined, r = range) => (t ?? '').replace('{n}', String(n)).replace('{range}', r);
  // in the Arabic line the range sits isolated left-to-right (LRI … PDI): bare, "40:2–3" would read "3–40:2"
  const isolated = `\u2066${range}\u2069`;
  return { ...step, key: sentenceKey(step.key, s.id),
           label: w ? fill(w.label) : `${step.label} ${n}`, labelAr: w ? fill(w.labelAr, isolated) : step.labelAr,
           detail: range };
}

/** A drill's style within its class step — a sub-node of the step on the path, finished only when every drill of it is
 *  (owner, 2026-10-16). From the drill's id: the builder and its ask (sarf:table, vocab:vocab_root, ss:tree); a commentary
 *  drill by its book (tafsir_read:razi); the commentators' language by phrase or term; else the builder (fill, irab, grammar). */
export function styleOf(d: Drill): string {
  const p = String(d.id ?? '').split(':');
  if (['sarf', 'vocab', 'keyterm', 'expression', 'ss', 'structure'].includes(p[0])) return `${p[0]}:${p[1] ?? ''}`;
  if (p[0] === 'tafsir_read' || p[0] === 'tafsir_hear') return `${p[0]}:${p[1] === 'QRTA' ? p[2] ?? '' : p[1] ?? ''}`;
  if (p[0] === 'tafsir_lang') return `tafsir_lang:${(p[1] ?? '').startsWith('p_') ? 'phrase' : 'term'}`;
  return p[0];
}

/** The subject a drill teaches within its style — one lesson slide per subject: a verb (SV:<root>:<form>), a near-synonym
 *  set, a word (<sūra>:<āyah>:<word>), a key term, an expression; else the drill itself. */
export function subjectOf(d: Drill): string {
  const id = String(d.id ?? '');
  const sv = /SV:[^:]+:[A-Z]+/.exec(id);
  if (sv) return sv[0];
  const ns = /NS:[^:]+:[^:]+/.exec(id);
  if (ns) return ns[0];
  const w = /^vocab:[^:]+:(\d+:\d+:\d+)/.exec(id);
  if (w) return `w:${w[1]}`;
  const kt = /^keyterm:[^:]+:(.+?):\d+:\d+(:\d+)?$/.exec(id);
  if (kt) return `kt:${kt[1]}`;
  return id;
}
const lessonId = (d: Drill) => `${styleOf(d)}|${subjectOf(d)}`;

const ARABIC_RE = /[\u0600-\u06FF]/;
const LATIN_RE = /[A-Za-z]/;
/** A step's lesson: for each sub-node, a slide per subject its drills teach — the subject (its Arabic, its English), the
 *  points the drills rest on (their explanations, each line once), and its example from the passage (the drill's line and
 *  its English). Drawn from the very drills the learner is about to answer, so every drill has its slide. */
export function lessonOf(L: Record<string, Label[]>, items: Drill[], only?: string | null) {
  const names = byKey(L.class_style ?? []);
  const order = new Map((L.class_style ?? []).map((x, i) => [x.key, i]));
  const groups = new Map<string, Drill[]>();
  for (const d of items) {
    if (only && styleOf(d) !== only) continue;
    const k = lessonId(d);
    groups.set(k, [...(groups.get(k) ?? []), d]);
  }
  const slides = [...groups].map(([id, ds]) => {
    const style = styleOf(ds[0]);
    const lines = ds.flatMap((d) => String(d.explanation ?? '').split('\n')).map((x) => x.trim()).filter(Boolean);
    const points = [...new Set(lines)].slice(0, 8);
    // the heading: the first Arabic line (a verb's table line, a phrase) — else the drill's prompt; its English: a single
    // drill's answer when that is English, else the sub-node's title
    const ar = points.find((x) => ARABIC_RE.test(x) && !LATIN_RE.test(x)) ?? (ARABIC_RE.test(String(ds[0].prompt ?? '')) ? String(ds[0].prompt) : '');
    const ans = ds.length === 1 && typeof ds[0].answer === 'string' && LATIN_RE.test(ds[0].answer as string) ? String(ds[0].answer) : null;
    const withLine = ds.find((d) => Array.isArray(d.words) && (d.words as unknown[]).length > 0 && String((d.source as { title?: string } | undefined)?.title ?? '').length);
    const words = withLine ? (withLine.words as Array<{ t: string }>).map((w) => w.t).join(' ') : null;
    return {
      id, style, styleTitle: names.get(style)?.label ?? style, styleTitleAr: names.get(style)?.labelAr ?? '',
      // a verb's meanings: its first, as the heading's English (not the sub-node's title again)
      headingAr: ar, heading: ans ?? (/^1\. (.+?) — /.exec(points.find((x) => /^1\. /.test(x)) ?? '')?.[1] ?? names.get(style)?.label ?? ''),
      points: points.filter((x) => x !== ar),
      example: words ? { ar: words, en: (withLine?.en as string | undefined) ?? null, ref: (withLine?.source as { title?: string } | undefined)?.title ?? null,
                         audio: withLine?.audio ?? null,
                         // the line word by word, timed to its recording, so the lesson lights each word as it is read
                         words: (withLine?.words as unknown[] | undefined) ?? null, script: (withLine?.script as string | undefined) ?? null } : null,
      drills: ds.map((d) => d.id),
    };
  });
  return slides.sort((a, b) => (order.get(a.style) ?? 999) - (order.get(b.style) ?? 999));
}

/** The lesson style of the passage heard whole. */
const WHOLE = 'whole';

/** The passage heard whole, from its first āyah to its last (40:1 حم … 40:3): every word timed to the recitation, so the
 *  lesson lights each as it is read. The Reading class's first node (/lesson?style=whole). Nil when the recitation does not
 *  number the words as the corpus does (no timing to follow). */
async function passageSlide(env: QuranEnv, L: Record<string, Label[]>, p: Passage, style: string) {
  const pairs: number[][] = [];
  for (let a = p.ayah_from; a <= p.ayah_to; a++) pairs.push([p.surah, a]);
  const ayat = [...(await loadAyat(env, pairs)).values()];
  if (!ayat.length || ayat.some((a) => !a.aligned || !a.audio) || new Set(ayat.map((a) => a.audio!.url)).size > 1) return null;
  const names = byKey(L.class_style ?? []);
  const head = (L.class_ui ?? []).find((l) => l.key === 'whole_passage');
  const words = ayat.flatMap((a) => a.words);
  return {
    id: `passage|${p.id}`, style, styleTitle: head?.label ?? names.get(style)?.label ?? style, styleTitleAr: head?.labelAr ?? names.get(style)?.labelAr ?? '',
    headingAr: '', heading: p.title_en ?? '', points: [] as string[],
    example: { ar: words.map((w) => w.t).join(' '), en: ayat.map((a) => a.en ?? '').filter(Boolean).join(' '),
               ref: `${ayat[0].title.replace(/ \d+:\d+$/, '')} ${p.surah}:${p.ayah_from}${p.ayah_to > p.ayah_from ? `–${p.ayah_to}` : ''}`,
               audio: { url: ayat[0].audio!.url, start: ayat[0].audio!.start, end: ayat[ayat.length - 1].audio!.end },
               words, script: 'quran' },
    drills: [] as unknown[],
  };
}

/** The commentaries read as a session: every prepared sentence of the passage's commentary (qr_tafsir_sentence), book by
 *  book in reading order — its Arabic, read aloud from the recording; its translation; then its breakdown: the concept,
 *  the meaning in full (a historical point with it), and each term it turns on, named with its science (naḥw, ṣarf,
 *  balāgha). */
async function readingSession(env: QuranEnv, L: Record<string, Label[]>, p: Passage) {
  const rows = await query<{ id: string; source_slug: string; audio_id: string; seq_from: number; seq_to: number; concept_en: string | null;
                             concept_ar: string | null; gist_en: string; meaning_en: string | null; terms_json: string | null }>(env.DB_QR,
    `SELECT id, source_slug, audio_id, seq_from, seq_to, concept_en, concept_ar, gist_en, meaning_en, terms_json FROM qr_tafsir_sentence
      WHERE surah = ? AND status = 'live' AND ayah_from <= ? AND ayah_to >= ? ORDER BY source_slug, audio_id, seq_from`,
    [p.surah, p.ayah_to, p.ayah_from]).catch(() => []);
  if (!rows.length) return [];
  // in batches: one query binds at most 100 values
  // the batches and the terms, all at once
  const ids = rows.map((r) => r.id), batches: string[][] = [];
  for (let i = 0; i < ids.length; i += 25) batches.push(ids.slice(i, i + 25));
  const termIds = [...new Set(rows.flatMap((r) => parseJson<string[]>(r.terms_json ?? '', [])))];
  const [piles, terms] = await Promise.all([
    Promise.all(batches.map((b) => sentenceDrills(env, b, scopeOf(p)))),
    termIds.length ? query<{ id: string; name_en: string | null; name_ar: string; discipline: string | null }>(env.DB_QR,
      `SELECT id, name_en, name_ar, discipline FROM ar_ling_gram_term WHERE id IN (SELECT value FROM json_each(?))`, [JSON.stringify(termIds)]).catch(() => [])
      : Promise.resolve([]),
  ]);
  const byId = new Map(piles.flat().map((d) => [String(d.id), d]));
  const science: Record<string, string> = { NH: 'Naḥw', nahw: 'Naḥw', SF: 'Ṣarf', sarf: 'Ṣarf', BL: 'Balāgha', balagha: 'Balāgha' };
  const termOf = new Map(terms.map((t) => [t.id, t]));
  const names = byKey(L.class_style ?? []);
  const order = ['zamakhshari', 'razi', 'alusi', 'ibn_ashur'];
  const reading = rows.sort((a, b) => order.indexOf(a.source_slug) - order.indexOf(b.source_slug))
    .flatMap((r) => {
      const d = byId.get(r.id);
      if (!d) return [];
      const style = `tafsir_read:${r.source_slug}`;
      const words = (d.words as Array<{ t: string }> | undefined) ?? [];
      const termLines = parseJson<string[]>(r.terms_json ?? '', []).map((id) => termOf.get(id)).filter((t): t is NonNullable<typeof t> => !!t)
        .map((t) => `${science[t.discipline ?? ''] ?? 'Term'}: ${t.name_en ?? ''} (${t.name_ar})`);
      return [{
        id: r.id, style, styleTitle: names.get(style)?.label ?? r.source_slug, styleTitleAr: names.get(style)?.labelAr ?? '',
        headingAr: words.map((w) => w.t).join(' '), heading: r.gist_en,
        points: [r.concept_en ? `Concept: ${r.concept_en}${r.concept_ar ? ` (${r.concept_ar})` : ''}` : null, r.meaning_en, ...termLines]
          .filter((x): x is string => !!x),
        example: null, audio: d.audio ?? null, drills: [r.id],
      }];
    });
  // then the four set side by side (qr_tafsir_contrast): what they share, where they part, what each dwells on, where a
  // school shows
  const contrast = await query<{ id: string; kind: string; ayah: string | null; topic_en: string; topic_ar: string | null; point_en: string;
                                 positions_json: string | null }>(env.DB_QR,
    `SELECT id, kind, ayah, topic_en, topic_ar, point_en, positions_json FROM qr_tafsir_contrast
      WHERE passage_id = ? AND status = 'live' ORDER BY ord`, [p.id]).catch(() => []);
  const kinds = byKey(L.class_style ?? []);
  const book = (slug: string) => names.get(`tafsir_read:${slug}`)?.label ?? slug;
  return [...reading, ...contrast.map((c) => ({
    id: c.id, style: `tafsir_contrast:${c.kind}`, styleTitle: kinds.get(`tafsir_contrast:${c.kind}`)?.label ?? c.kind,
    styleTitleAr: kinds.get(`tafsir_contrast:${c.kind}`)?.labelAr ?? '',
    headingAr: c.topic_ar ?? '', heading: c.topic_en,
    points: [c.point_en, ...Object.entries(parseJson<Record<string, string>>(c.positions_json ?? '', {})).map(([b, x]) => `${book(b)}: ${x}`)],
    example: null, audio: null, drills: [] as string[],
  }))];
}

/** A lesson as a deck in the slides contract (KMAPSSlides, the Iḍāfa deck's format): a title slide, then each slide in the
 *  layout its content fits — a list of words with their English (examples), a commentary sentence (shahid), else a
 *  subject with its lines (definition); the points go to the slide's notes. */
function deckOf(id: string, title: string, titleAr: string, slides: Array<{ id: string; style: string; styleTitle: string; styleTitleAr: string;
  headingAr: string; heading: string; points: string[]; example: { ar: string; en: string | null } | null }>) {
  const pair = /^([^A-Za-z]*[\u0600-\u06FF][^A-Za-z]*?)\s+—\s+(.+)$/;
  const out = slides.map((sl, i) => {
    const pairs = sl.points.map((x) => pair.exec(x)).filter((m): m is RegExpExecArray => !!m);
    const reading = sl.style.startsWith('tafsir_read:');
    const listing = !reading && pairs.length >= 2;
    // the example only where it adds a line (a verb's example is its own line again)
    const ex = sl.example && !sl.headingAr.includes(sl.example.ar) && !sl.example.ar.includes(sl.headingAr) ? sl.example : null;
    const linesAr = reading ? [sl.headingAr] : listing ? pairs.map((m) => m[1].trim()) : [sl.headingAr, ...(ex ? [ex.ar] : [])].filter(Boolean);
    const linesEn = reading ? [sl.heading] : listing ? pairs.map((m) => m[2].trim()) : [sl.heading, ...(ex ? [ex.en ?? ''] : [])];
    const notes = reading || !listing ? sl.points : sl.points.filter((x) => !pair.test(x));
    return { n: i + 2, blockId: `BLK:${sl.id}`, layout: reading ? 'shahid' : listing ? 'examples' : 'definition', accent: null,
             kicker: sl.styleTitleAr || sl.styleTitle, source: sl.styleTitle, linesAr, linesEn: linesEn.slice(0, linesAr.length),
             notesEn: notes, verseRefs: [] as unknown[] };
  });
  return {
    docId: id, slug: id.toLowerCase().replace(/[^a-z0-9]+/g, '-'), contractVersion: 1, title, titleAr, language: 'ar', direction: 'rtl',
    domain: 'quran', subdomain: 'class', slideCount: out.length + 1, durationMin: Math.max(1, Math.round((out.length + 1) / 3)), videos: [] as string[],
    theme: {}, collection: null, motion: null,
    slides: [{ n: 1, blockId: `BLK:${id}:title`, layout: 'title', accent: null, kicker: titleAr, source: null, linesAr: [titleAr || title],
               linesEn: [title], notesEn: [] as string[], verseRefs: [] as unknown[] }, ...out],
  };
}

/** A style's count, and whether it has a lesson worth a node: its drills explain something (a listening drill over a
 *  line has nothing to teach before it — it is the line). */
type StyleCount = { key: string; total: number; lesson?: boolean };

/** How many drills of each style, in the order first met. */
const countStyles = (items: Drill[]): StyleCount[] => {
  const count = new Map<string, number>(), teaches = new Set<string>();
  for (const d of items) {
    const k = styleOf(d);
    count.set(k, (count.get(k) ?? 0) + 1);
    if (String(d.explanation ?? '').trim()) teaches.add(k);
  }
  return [...count].map(([key, total]) => ({ key, total, lesson: teaches.has(key) }));
};

/** The pills: each style counted, titled by class_style (qr_149), in its order. */
function namedStyles(L: Record<string, Label[]>, counts: StyleCount[]) {
  const names = byKey(L.class_style ?? []);
  const order = new Map((L.class_style ?? []).map((x, i) => [x.key, i]));
  return counts.map(({ key, total, lesson }) => ({ key, total, lesson: lesson ?? false, title: names.get(key)?.label ?? key, titleAr: names.get(key)?.labelAr ?? '' }))
    .sort((a, b) => (order.get(a.key) ?? 999) - (order.get(b.key) ?? 999));
}

/** A step's sub-nodes: each style its drills hold, titled by class_style (qr_149). */
const stylesOf = (L: Record<string, Label[]>, items: Drill[]) => namedStyles(L, countStyles(items));

const stepNodes = (L: Record<string, Label[]>) => (L.class_node ?? []).filter((n) => kindOf(n) === 'step');

/** The node rows as the device draws them. A listen node's sprints are its works, given. */
const nodeCard = (n: Label, drills: number, works = 0, styles: ReturnType<typeof stylesOf> = []) => {
  const sprint = num(n.extra?.sprint, 12);
  const kind = kindOf(n);
  return {
    key: n.key, kind, step: n.extra?.step ?? null,
    title: n.label, titleAr: n.labelAr ?? '', tagline: n.detail ?? '', icon: n.icon ?? 'circle', color: n.color ?? '#D8B657',
    drills, sprint,
    sprints: kind === 'step' ? Math.max(1, Math.ceil(drills / sprint)) : kind === 'listen' ? Math.max(1, works) : 1,
    pass: n.extra?.pass ?? n.extra?.heard ?? null,
    // the module the step belongs to (class_node extra.module: its number and title) — the path shows a heading where one starts
    module: (n.extra?.module as { n: number; title: string; titleAr: string } | undefined) ?? null,
    styles,
  };
};

const worksOf = (n: Label) => (Array.isArray(n.extra?.works) ? n.extra!.works as string[] : []);
const listenOf = (env: QuranEnv, n: Label, p: Passage) => listenWorks(env, worksOf(n), { surah: p.surah, from: p.ayah_from, to: p.ayah_to });

const bandsOf = (L: Record<string, Label[]>) =>
  (L.class_band ?? []).map((b) => ({ stars: Number(b.extra?.stars ?? 0), min: Number(b.min ?? 0) })).filter((b) => b.stars > 0);

const passageCard = (p: Passage) => ({
  id: p.id, surah: p.surah, number: p.passage_no, from: p.ayah_from, to: p.ayah_to,
  label: p.label, title: p.title_en, titleAr: p.title_ar,
});

/** One full round over a unit (qr_127): each style of `unit_round` in its order, `n` of its drills, the styles with
 *  nothing over the passage left out. Sampled from the kept step pools (a skill's drills are those whose id starts with
 *  it), so a round costs one read, not a fresh draw of every skill. Dealt afresh each time (/qr/practice/round). */
async function unitRound(env: QuranEnv, L: Record<string, Label[]>, p: Passage): Promise<{ items: Drill[]; styles: unknown[] }> {
  const rows = L.unit_round ?? [];          // in their sort order, as labels() reads them
  // only the steps that hold a round skill are read
  const wanted = new Set(rows.map((r) => r.key));
  const all = (await stepPools(env, L, stepNodes(L).filter((n) => skillsOf(n).some((k) => wanted.has(k))), p)).flat();
  const bySkill = new Map<string, Drill[]>();
  for (const d of all) { const k = String(d.id ?? '').split(':')[0]; (bySkill.get(k) ?? bySkill.set(k, []).get(k)!).push(d); }
  const seen = new Set<string>();
  const items: Drill[] = [], styles: unknown[] = [];
  for (const r of rows) {
    const take = shuffle(bySkill.get(r.key) ?? []).filter((d) => { const id = String(d.id ?? ''); if (!id || seen.has(id)) return false; seen.add(id); return true; })
      .slice(0, num(r.extra?.n, 2));
    if (!take.length) continue;
    items.push(...take.map(full));
    styles.push({ id: r.key, title: r.label, titleAr: r.labelAr ?? '', icon: r.icon ?? 'circle', color: r.color ?? '#D8B657', count: take.length });
  }
  return { items, styles };
}

// ── A node's counts, kept (qr_160) ─────────────────────────────────────────────
// The path needs only how many drills each node holds and its pills — never the drills. Each node's
// counts are made once (from its kept pool, its recordings, the round's draw) and kept per passage;
// after that a path is one read of small rows, however big the pools. A row is made again when what
// it was made from changes (its `definition`): the node's extra, and for a step run per sentence the
// passage's sentence ids. A node with nothing over the passage is not kept, so new drills show up.

type SentenceStat = { id: string; drills: number; styles: StyleCount[] };
type NodeStat = { drills: number; styles: StyleCount[]; sentences: SentenceStat[] | null };
const ROUND = '@round';

type StatRow = { node_key: string; definition: string; drills: number; styles_json: string; sentences_json: string | null; updated_at: string };
const statRows = (env: QuranEnv, passage: string) => query<StatRow>(env.DB_QR,
  'SELECT node_key, definition, drills, styles_json, sentences_json, updated_at FROM qr_class_node_stat WHERE passage_id = ?', [passage])
  .catch(() => [] as StatRow[]);
const DAY_MS = 86_400_000;

async function nodeStats(env: QuranEnv, L: Record<string, Label[]>, p: Passage, only?: Set<string>, given?: StatRow[])
  : Promise<{ stats: Map<string, NodeStat>; sentences: Sentence[] }> {
  const nodes = (L.class_node ?? []).filter((n) => (kindOf(n) === 'step' || kindOf(n) === 'listen') && (!only || only.has(n.key)));
  const needSentences = nodes.some((n) => kindOf(n) === 'step' && perSentence(n));
  const [rows, sentences] = await Promise.all([
    given ? Promise.resolve(given) : statRows(env, p.id),
    needSentences ? sentencesOf(env, p) : Promise.resolve([] as Sentence[]),
  ]);
  const kept = new Map(rows.map((r) => [r.node_key, r]));
  const sentDef = `|${sentences.map((x) => x.id).join(',')}`;
  type Want = { key: string; def: string; node: Label | null };
  const want: Want[] = nodes.map((n) => ({ key: n.key, node: n, def: `s2|${JSON.stringify(n.extra ?? {})}${kindOf(n) === 'step' && perSentence(n) ? sentDef : ''}` }));
  if (!only || only.has(ROUND)) want.push({ key: ROUND, node: null, def: JSON.stringify((L.unit_round ?? []).map((r) => [r.key, r.extra?.n ?? null])) });

  const stats = new Map<string, NodeStat>();
  const missing: Want[] = [];
  for (const w of want) {
    const r = kept.get(w.key);
    // a node with nothing here is kept too, and counted again after a day (drills may have been authored since)
    if (r && r.definition === w.def && (r.drills > 0 || Date.now() - Date.parse(r.updated_at) < DAY_MS)) {
      try {
        stats.set(w.key, { drills: r.drills, styles: JSON.parse(r.styles_json), sentences: r.sentences_json ? JSON.parse(r.sentences_json) : null });
        continue;
      } catch { /* counted again below */ }
    }
    missing.push(w);
  }
  const made = await Promise.all(missing.map(async (w): Promise<NodeStat> => {
    if (!w.node) {
      const round = await unitRound(env, L, p).catch(() => ({ items: [] as Drill[], styles: [] as unknown[] }));
      return { drills: round.items.length, sentences: null,
               styles: (round.styles as Array<{ id: string; count: number }>).map((x) => ({ key: x.id, total: x.count })) };
    }
    if (kindOf(w.node) === 'listen') {
      const works = await listenOf(env, w.node, p).catch(() => []);
      return { drills: works.length, styles: [], sentences: null };
    }
    const pool = await stepPool(env, L, w.node, p);
    let per: SentenceStat[] | null = null;
    if (perSentence(w.node) && sentences.length) {
      const placed = placeBySentence(pool, sentences);
      per = sentences.flatMap((x) => { const d = placed.get(x.id) ?? []; return d.length ? [{ id: x.id, drills: d.length, styles: countStyles(d) }] : []; });
    }
    return { drills: pool.length, styles: countStyles(pool), sentences: per };
  }));
  const writes = missing.map((w, i) => { stats.set(w.key, made[i]); return { w, st: made[i] }; });
  if (writes.length) {
    await env.DB_QR.batch(writes.map(({ w, st }) => env.DB_QR.prepare(
      `INSERT INTO qr_class_node_stat (passage_id, node_key, definition, drills, styles_json, sentences_json) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (passage_id, node_key) DO UPDATE SET definition = excluded.definition, drills = excluded.drills,
         styles_json = excluded.styles_json, sentences_json = excluded.sentences_json, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')`)
      .bind(p.id, w.key, w.def, st.drills, JSON.stringify(st.styles), st.sentences ? JSON.stringify(st.sentences) : null))).catch(() => null);
  }
  return { stats, sentences };
}

export function practiceClassRoutes(router: Router<QuranEnv>) {
  router.get('/qr/practice/round', async (req, env) => {
    const id = new URL(req.url).searchParams.get('passage');
    if (!id) return badRequest('passage is required');
    const [L, p] = await Promise.all([labels(env), passageOf(env, id)]);
    if (!p) return notFound(`passage ${id}`);
    const { items, styles } = await unitRound(env, L, p);
    const head = (L.class_ui ?? []).find((l) => l.key === 'full_round');
    return ok({
      skill: { id: 'unit_round', title: head?.label ?? 'One full round', titleAr: head?.labelAr ?? '', tagline: head?.detail ?? '',
               icon: head?.icon ?? 'circle.hexagongrid', color: head?.color ?? '#D8B657', count: items.length },
      items, styles, stage: L.stage ?? [],
    });
  });

  /** A passage's prompts for the Table (drill-engine plan §2.3c): its study questions kept with no options —
   *  reflections to talk over, never scored. GET /qr/practice/table?passage=QR:SP:40:1-3 */
  router.get('/qr/practice/table', async (req, env) => {
    const id = new URL(req.url).searchParams.get('passage');
    if (!id) return badRequest('passage is required');
    const p = await passageOf(env, id);
    if (!p) return notFound(`passage ${id}`);
    const rows = await query<{ id: string; question_en: string; question_ar: string | null; question_type: string; ayah_from: number | null; ayah_to: number | null }>(env.DB_QR,
      `SELECT id, question_en, question_ar, question_type, ayah_from, ayah_to FROM qr_study_question
        WHERE passage_id = ? AND status = 'live' AND (options_json IS NULL OR options_json = '' OR options_json = '[]')
        ORDER BY sort_order`, [id]);
    return ok({ passage: passageCard(p), prompts: rows.map((r) => ({ id: r.id, en: r.question_en, ar: r.question_ar, kind: r.question_type,
                                                                     from: r.ayah_from ?? p.ayah_from, to: r.ayah_to ?? p.ayah_to })) });
  });

  router.get('/qr/practice/class/surah', async (req, env) => {
    const surah = Number(new URL(req.url).searchParams.get('surah'));
    if (!Number.isInteger(surah) || surah < 1 || surah > 114) return badRequest('surah 1–114');
    // the next stop on the study path (study_path, qr_151): it opens once every passage here is graded; a sūra whose
    // passages are not cut yet is named, not opened (ready = false). Labels are kept in memory, so the passages and
    // both sūras' names and counts are one round trip.
    const L = await labels(env);
    const path = (L.study_path ?? []).filter((x) => x.extra?.kind === 'surah');
    const at = path.findIndex((x) => Number(x.extra?.surah) === surah);
    const nextSurah = at >= 0 && at + 1 < path.length ? Number(path[at + 1].extra?.surah) : null;
    const [rows, names] = await Promise.all([
      query<Passage>(env.DB_QR,
        `SELECT id, surah, passage_no, ayah_from, ayah_to, label, title_en, title_ar
           FROM qr_surah_study_passage WHERE surah = ? AND status = 'live' ORDER BY passage_no`, [surah]),
      query<{ id: number; name_ar: string; name_en: string; name_transliteration: string; n: number }>(env.DB_QR,
        `SELECT s.id, s.name_ar, s.name_en, s.name_transliteration,
                (SELECT COUNT(*) FROM qr_surah_study_passage x WHERE x.surah = s.id AND x.status = 'live') AS n
           FROM qr_surah s WHERE s.id IN (?, ?)`, [surah, nextSurah ?? surah]),
    ]);
    const name = names.find((x) => x.id === surah);
    const nm = nextSurah ? names.find((x) => x.id === nextSurah) : undefined;
    const next = nextSurah ? { id: nextSurah, nameAr: nm?.name_ar ?? null, name: nm?.name_transliteration ?? nm?.name_en ?? null,
                               passages: nm?.n ?? 0, ready: (nm?.n ?? 0) > 0 } : null;
    return ok({
      surah: { id: surah, nameAr: name?.name_ar ?? null, name: name?.name_transliteration ?? name?.name_en ?? null },
      passages: rows.map(passageCard),
      words: L.class_ui ?? [],
      next,
    });
  });

  router.get('/qr/practice/class/path', async (req, env) => {
    const id = new URL(req.url).searchParams.get('passage');
    if (!id) return badRequest('passage is required');
    // the kept counts are read with the passage, in one round trip
    const [L, p, rows] = await Promise.all([labels(env), passageOf(env, id), statRows(env, id)]);
    if (!p) return notFound(`passage ${id}`);
    // counts only, from the kept rows (qr_160): no pool, recording or round is opened here
    const { stats, sentences } = await nodeStats(env, L, p, undefined, rows);
    const held = (n: Label) => stats.get(n.key)?.drills ?? 0;
    // the full round, shown only when the unit has drills for it — and only the styles it has
    const head = (L.class_ui ?? []).find((l) => l.key === 'full_round');
    const roundRows = byKey(L.unit_round ?? []);
    const roundStat = stats.get(ROUND);
    const fullRound = roundStat && roundStat.drills > 0
      ? { title: head?.label ?? 'One full round', titleAr: head?.labelAr ?? '', icon: head?.icon ?? 'circle.hexagongrid',
          color: head?.color ?? '#D8B657',
          styles: roundStat.styles.flatMap((x) => { const r = roundRows.get(x.key); return r ? [{ id: r.key, title: r.label, titleAr: r.labelAr ?? '',
            icon: r.icon ?? 'circle', color: r.color ?? '#D8B657', count: x.total }] : []; }) }
      : null;
    const at = new Map(sentences.map((x, i) => [x.id, i]));
    // a step none of whose skills has a drill for this passage is left off its path; so is a
    // listen gate none of whose works is recorded over it. A step run per sentence is its
    // sentences, each with drills its own node.
    const nodes = (L.class_node ?? [])
      .filter((n) => kindOf(n) === 'step' || kindOf(n) === 'listen' ? held(n) > 0 : true)
      .flatMap((n) => {
        const st = stats.get(n.key);
        if (kindOf(n) === 'listen') return [nodeCard(n, 0, held(n))];
        if (kindOf(n) !== 'step') return [nodeCard(n, 0)];
        if (!perSentence(n) || !st?.sentences?.length) return [nodeCard(n, held(n), 0, namedStyles(L, st?.styles ?? []))];
        return st.sentences.flatMap((x) => {
          const i = at.get(x.id);
          return i === undefined ? [] : [nodeCard(sentenceLabel(L, n, sentences[i], i + 1, p.surah), x.drills, 0, namedStyles(L, x.styles))];
        });
      });
    const anySteps = stepNodes(L).some((n) => held(n) > 0);
    return ok({
      passage: passageCard(p),
      nodes: anySteps ? nodes : [],
      bands: bandsOf(L),
      words: L.class_ui ?? [],
      stage: L.stage ?? [],
      round: fullRound,
    });
  });

  // A node's pills alone, from its kept counts: GET /qr/practice/class/pills?passage=…&node=words[@<sentence>]
  // — for a screen that shows one class (its sub-path) without the passage's whole path.
  router.get('/qr/practice/class/pills', async (req, env) => {
    const u = new URL(req.url);
    const id = u.searchParams.get('passage'), key = u.searchParams.get('node');
    if (!id || !key) return badRequest('passage and node are required');
    const [L, p] = await Promise.all([labels(env), passageOf(env, id)]);
    if (!p) return notFound(`passage ${id}`);
    const { step, sentence } = splitKey(key);
    const base = byKey(L.class_node).get(step);
    if (!base || kindOf(base) !== 'step') return badRequest(`unknown step ${key}`);
    const { stats } = await nodeStats(env, L, p, new Set([step]));
    const st = stats.get(step);
    const one = sentence ? st?.sentences?.find((x) => x.id === sentence) : st;
    return ok({ passage: p.id, node: key, drills: one?.drills ?? 0, styles: namedStyles(L, one?.styles ?? []) });
  });

  // A step's lesson, before its drills: GET /qr/practice/class/lesson?passage=…&node=words[&style=sarf:table]
  router.get('/qr/practice/class/lesson', async (req, env) => {
    const u = new URL(req.url);
    const id = u.searchParams.get('passage'), key = u.searchParams.get('node');
    if (!id || !key) return badRequest('passage and node are required');
    const [L, p] = await Promise.all([labels(env), passageOf(env, id)]);
    if (!p) return notFound(`passage ${id}`);
    const { step: stepKey, sentence } = splitKey(key);
    const base = byKey(L.class_node).get(stepKey);
    if (!base || kindOf(base) !== 'step') return badRequest(`unknown step ${key}`);
    const style = u.searchParams.get('style');
    const one = u.searchParams.get('slide');
    const tafsir = (base.extra?.module as { study?: string } | undefined)?.study === 'tafsir';
    // the lesson's slides are made once and kept (qr_160 qr_class_lesson), per node and style; a pool redraw drops
    // them, and the commentaries' reading session (made from the books, not a pool) is made again after a day
    // the lesson's own shape is part of what it was made from: a slide that gains a field makes the kept ones again
    const definition = `${defOfStep(base)}|lesson:4`;
    const kept = await queryOne<{ definition: string; body_json: string; updated_at: string }>(env.DB_QR,
      'SELECT definition, body_json, updated_at FROM qr_class_lesson WHERE passage_id = ? AND node_key = ? AND style = ?',
      [p.id, key, style ?? '']).catch(() => null);
    type LessonSlide = { id: string; audio?: unknown; example?: { audio?: unknown } | null };
    let body: { slides: LessonSlide[]; drills: number } | null = null;
    if (kept && kept.definition === definition && (!tafsir || Date.now() - Date.parse(kept.updated_at) < DAY_MS)) {
      try { body = JSON.parse(kept.body_json); } catch { body = null; }
    }
    if (!body) {
      if (tafsir) {
        body = { slides: await readingSession(env, L, p), drills: 0 };
      } else {
        let items = await stepPool(env, L, base, p);
        if (sentence) items = placeBySentence(items, await sentencesOf(env, p)).get(sentence) ?? [];
        // style 'whole': the passage heard whole, from its first āyah — the Reading class's first node
        const whole = style === WHOLE ? await passageSlide(env, L, p, WHOLE).catch(() => null) : null;
        const slides: LessonSlide[] = style === WHOLE ? (whole ? [whole] : []) : lessonOf(L, items, style);
        body = { slides, drills: style === WHOLE ? 0 : items.length };
      }
      if (body.slides.length) {
        await execute(env.DB_QR,
          `INSERT INTO qr_class_lesson (passage_id, step_key, node_key, style, definition, body_json) VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT (passage_id, node_key, style) DO UPDATE SET definition = excluded.definition, body_json = excluded.body_json,
             updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')`,
          [p.id, base.key, key, style ?? '', definition, JSON.stringify(body)]).catch(() => null);
      }
    }
    // one slide alone (a drill's own, opened from the drill), or the step's whole lesson
    const slides = body.slides.filter((x) => !one || x.id === one) as Parameters<typeof deckOf>[3];
    return ok({ passage: passageCard(p), node: nodeCard(base, body.drills), slides,
                deck: deckOf(`LESSON:${p.id}:${key}`, base.label, base.labelAr ?? '', slides),
                audio: [null, ...body.slides.filter((x) => !one || x.id === one)
                  .map((x) => (tafsir ? x.audio : x.example?.audio) ?? null)] });
  });

  router.get('/qr/practice/class/node', async (req, env) => {
    const u = new URL(req.url);
    const id = u.searchParams.get('passage');
    const key = u.searchParams.get('node');
    // &style=<key>: one sub-node's drills only (a step's pool can run to hundreds)
    const style = u.searchParams.get('style');
    if (!id || !key) return badRequest('passage and node are required');
    const [L, p] = await Promise.all([labels(env), passageOf(env, id)]);
    if (!p) return notFound(`passage ${id}`);
    const { step: stepKey, sentence } = splitKey(key);
    const base = byKey(L.class_node).get(stepKey);
    if (!base || (sentence && (kindOf(base) !== 'step' || !perSentence(base)))) return badRequest(`unknown node ${key}`);
    const scope = scopeOf(p);
    const kind = kindOf(base);
    const size = num(base.extra?.sprint, 12);
    let node = base;

    let items: Drill[];
    if (kind === 'step' && sentence) {
      const [pool, sentences] = await Promise.all([stepPool(env, L, base, p), sentencesOf(env, p)]);
      const i = sentences.findIndex((s) => s.id === sentence);
      if (i < 0) return notFound(`sentence ${sentence}`);
      items = placeBySentence(pool, sentences).get(sentence) ?? [];
      node = sentenceLabel(L, base, sentences[i], i + 1, p.surah);
    } else if (kind === 'step') {
      items = await stepPool(env, L, base, p);
    } else {
      const wanted = kind === 'review'
        ? new Set((u.searchParams.get('steps') ?? '').split(',').filter(Boolean).map((k) => splitKey(k).step))
        : null;
      const steps = stepNodes(L).filter((n) => !wanted || wanted.has(n.key));
      const pools = await stepPools(env, L, steps, p);
      if (kind === 'practice') {
        const refs = new Set((u.searchParams.get('refs') ?? '').split(',').filter(Boolean));
        items = pools.flat().filter((d) => refs.has(String(d.id)));
        // lines marked in the listen gate are drills of no step: drawn by their refs
        const found = new Set(items.map((d) => String(d.id)));
        const lines = [...refs].filter((r) => !found.has(r) && parseLineRef(r));
        if (lines.length) items = [...items, ...await lineDrills(env, lines, scope)];
        // sentences marked "not understood" in the commentary's Understanding step: first, by their refs
        const sents = [...refs].filter((r) => !found.has(r) && parseSentenceRef(r));
        if (sents.length) items = [...await sentenceDrills(env, sents, scope), ...items];
      } else {
        // check and review: drawn across the steps in turn, a sprint's worth
        items = interleave(pools.map(shuffle), size);
      }
    }
    if (style) items = items.filter((d) => styleOf(d) === style);
    // each drill names its style, the sub-node it counts toward (the device sends it back with the answer)
    // and the lesson slide that teaches it (GET /qr/practice/class/lesson), opened from the drill; its card's
    // review copy is made again here (pools keep it as a mark)
    const styled = items.map((d) => ({ ...full(d), style: styleOf(d), lesson: lessonId(d) }));
    return ok({ passage: passageCard(p), node: nodeCard(node, items.length, 0, stylesOf(L, items)), items: styled, bands: bandsOf(L), stage: L.stage ?? [] });
  });

  router.get('/qr/practice/class/listen', async (req, env) => {
    const u = new URL(req.url);
    const id = u.searchParams.get('passage');
    const key = u.searchParams.get('node') ?? 'listen';
    if (!id) return badRequest('passage is required');
    const [L, p] = await Promise.all([labels(env), passageOf(env, id)]);
    if (!p) return notFound(`passage ${id}`);
    const node = byKey(L.class_node).get(key);
    if (!node || kindOf(node) !== 'listen') return badRequest(`not a listen node: ${key}`);
    const works = await listenOf(env, node, p);
    return ok({ passage: passageCard(p), node: nodeCard(node, 0, works.length), works,
                heard: num(node.extra?.heard, 90), words: L.class_ui ?? [] });
  });
}

function shuffle<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
