import type { Router } from '../../../shared/src/router';
import { ok, badRequest, notFound } from '../../../shared/src/response';
import { query, queryOne, execute } from '../../../shared/src/db';
import type { QuranEnv } from '../env';
import { labels, byKey, type Label } from '../lib/labels';
import { drawSkill, type Scope } from './practice';
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

/** A step's drills over a passage, kept (qr_140): the first draw is served from then on, so the path's
 *  counts, a node's drills and any later day's draw agree, and an item kept open can always be dealt
 *  back. Drawn again only when the step's definition changes (or the passage's rows are deleted). */
async function stepPool(env: QuranEnv, L: Record<string, Label[]>, node: Label, p: Passage): Promise<Drill[]> {
  const definition = JSON.stringify(node.extra ?? {});
  const kept = await queryOne<{ definition: string; items_json: string }>(env.DB_QR,
    'SELECT definition, items_json FROM qr_class_pool WHERE passage_id = ? AND step_key = ?', [p.id, node.key]).catch(() => null);
  if (kept && kept.definition === definition) {
    try { return JSON.parse(kept.items_json) as Drill[]; } catch { /* drawn again below */ }
  }
  const drawn = await drawPool(env, L, node, scopeOf(p));
  if (!drawn.length) return drawn;            // nothing to keep: a step with no drills here stays off the path
  // the first draw wins: two first reads at once keep one draw, and both are served it
  await execute(env.DB_QR,
    `INSERT INTO qr_class_pool (passage_id, step_key, definition, items_json) VALUES (?, ?, ?, ?)
     ON CONFLICT (passage_id, step_key) DO UPDATE SET definition = excluded.definition, items_json = excluded.items_json,
       created_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')
     WHERE qr_class_pool.definition <> excluded.definition`,
    [p.id, node.key, definition, JSON.stringify(drawn)]).catch(() => null);
  const now = await queryOne<{ items_json: string }>(env.DB_QR,
    'SELECT items_json FROM qr_class_pool WHERE passage_id = ? AND step_key = ?', [p.id, node.key]).catch(() => null);
  try { return now ? JSON.parse(now.items_json) as Drill[] : drawn; } catch { return drawn; }
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
      headingAr: ar, heading: ans ?? (names.get(style)?.label ?? ''),
      points: points.filter((x) => x !== ar),
      example: words ? { ar: words, en: (withLine?.en as string | undefined) ?? null, ref: (withLine?.source as { title?: string } | undefined)?.title ?? null,
                         audio: withLine?.audio ?? null } : null,
      drills: ds.map((d) => d.id),
    };
  });
  return slides.sort((a, b) => (order.get(a.style) ?? 999) - (order.get(b.style) ?? 999));
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
  const ids = rows.map((r) => r.id), drills: Drill[] = [];
  for (let i = 0; i < ids.length; i += 25) drills.push(...await sentenceDrills(env, ids.slice(i, i + 25), scopeOf(p)));
  const byId = new Map(drills.map((d) => [String(d.id), d]));
  const termIds = [...new Set(rows.flatMap((r) => parseJson<string[]>(r.terms_json ?? '', [])))];
  const terms = termIds.length ? await query<{ id: string; name_en: string | null; name_ar: string; discipline: string | null }>(env.DB_QR,
    `SELECT id, name_en, name_ar, discipline FROM ar_ling_gram_term WHERE id IN (SELECT value FROM json_each(?))`, [JSON.stringify(termIds)]).catch(() => []) : [];
  const science: Record<string, string> = { NH: 'Naḥw', nahw: 'Naḥw', SF: 'Ṣarf', sarf: 'Ṣarf', BL: 'Balāgha', balagha: 'Balāgha' };
  const termOf = new Map(terms.map((t) => [t.id, t]));
  const names = byKey(L.class_style ?? []);
  const order = ['zamakhshari', 'razi', 'alusi', 'ibn_ashur'];
  return rows.sort((a, b) => order.indexOf(a.source_slug) - order.indexOf(b.source_slug))
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
}

/** A step's sub-nodes: each style its drills hold, in the order first met, titled by class_style (qr_149). */
function stylesOf(L: Record<string, Label[]>, items: Drill[]) {
  const names = byKey(L.class_style ?? []);
  const order = new Map((L.class_style ?? []).map((x, i) => [x.key, i]));
  const count = new Map<string, number>();
  for (const d of items) { const k = styleOf(d); count.set(k, (count.get(k) ?? 0) + 1); }
  return [...count].map(([key, total]) => ({ key, total, title: names.get(key)?.label ?? key, titleAr: names.get(key)?.labelAr ?? '' }))
    .sort((a, b) => (order.get(a.key) ?? 999) - (order.get(b.key) ?? 999));
}

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
 *  nothing over the passage left out. Not kept: a round is dealt afresh each time (it is not under /class/). */
async function unitRound(env: QuranEnv, L: Record<string, Label[]>, scope: Scope): Promise<{ items: Drill[]; styles: unknown[] }> {
  const rows = L.unit_round ?? [];          // in their sort order, as labels() reads them
  const piles = await Promise.all(rows.map((r) => drawSkill(env, L, r.key, 'all', num(r.extra?.n, 2) * 4, scope).catch(() => [] as Drill[])));
  const seen = new Set<string>();
  const items: Drill[] = [], styles: unknown[] = [];
  rows.forEach((r, i) => {
    const take = piles[i].filter((d) => { const id = String(d.id ?? ''); if (!id || seen.has(id)) return false; seen.add(id); return true; })
      .sort(() => Math.random() - 0.5).slice(0, num(r.extra?.n, 2));
    if (!take.length) return;
    items.push(...take);
    styles.push({ id: r.key, title: r.label, titleAr: r.labelAr ?? '', icon: r.icon ?? 'circle', color: r.color ?? '#D8B657', count: take.length });
  });
  return { items, styles };
}

export function practiceClassRoutes(router: Router<QuranEnv>) {
  router.get('/qr/practice/round', async (req, env) => {
    const id = new URL(req.url).searchParams.get('passage');
    if (!id) return badRequest('passage is required');
    const [L, p] = await Promise.all([labels(env), passageOf(env, id)]);
    if (!p) return notFound(`passage ${id}`);
    const { items, styles } = await unitRound(env, L, scopeOf(p));
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
    const [L, rows, name] = await Promise.all([
      labels(env),
      query<Passage>(env.DB_QR,
        `SELECT id, surah, passage_no, ayah_from, ayah_to, label, title_en, title_ar
           FROM qr_surah_study_passage WHERE surah = ? AND status = 'live' ORDER BY passage_no`, [surah]),
      queryOne<{ name_ar: string; name_en: string; name_transliteration: string }>(env.DB_QR,
        'SELECT name_ar, name_en, name_transliteration FROM qr_surah WHERE id = ?', [surah]),
    ]);
    // the next stop on the study path (study_path, qr_151): it opens once every passage here is graded; a sūra whose
    // passages are not cut yet is named, not opened (ready = false)
    const path = (L.study_path ?? []).filter((x) => x.extra?.kind === 'surah');
    const at = path.findIndex((x) => Number(x.extra?.surah) === surah);
    const nextSurah = at >= 0 && at + 1 < path.length ? Number(path[at + 1].extra?.surah) : null;
    const next = nextSurah ? await Promise.all([
      queryOne<{ name_ar: string; name_en: string; name_transliteration: string }>(env.DB_QR,
        'SELECT name_ar, name_en, name_transliteration FROM qr_surah WHERE id = ?', [nextSurah]),
      queryOne<{ n: number }>(env.DB_QR, `SELECT COUNT(*) AS n FROM qr_surah_study_passage WHERE surah = ? AND status = 'live'`, [nextSurah]),
    ]).then(([nm, c]) => ({ id: nextSurah, nameAr: nm?.name_ar ?? null, name: nm?.name_transliteration ?? nm?.name_en ?? null,
                             passages: c?.n ?? 0, ready: (c?.n ?? 0) > 0 })) : null;
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
    const [L, p] = await Promise.all([labels(env), passageOf(env, id)]);
    if (!p) return notFound(`passage ${id}`);
    const scope = scopeOf(p);
    const steps = stepNodes(L);
    const listens = (L.class_node ?? []).filter((n) => kindOf(n) === 'listen');
    const [pools, heard, round] = await Promise.all([
      Promise.all(steps.map((n) => stepPool(env, L, n, p))),
      Promise.all(listens.map((n) => listenOf(env, n, p).catch(() => []))),
      unitRound(env, L, scope).catch(() => ({ items: [] as Drill[], styles: [] as unknown[] })),
    ]);
    // the full round, shown only when the unit has drills for it — and only the styles it has
    const head = (L.class_ui ?? []).find((l) => l.key === 'full_round');
    const fullRound = round.items.length
      ? { title: head?.label ?? 'One full round', titleAr: head?.labelAr ?? '', icon: head?.icon ?? 'circle.hexagongrid',
          color: head?.color ?? '#D8B657', styles: round.styles }
      : null;
    const held = new Map(steps.map((n, i) => [n.key, pools[i].length]));
    const works = new Map(listens.map((n, i) => [n.key, heard[i].length]));
    const sentences = steps.some(perSentence) ? await sentencesOf(env, p) : [];
    // a step none of whose skills has a drill for this passage is left off its path; so is a
    // listen gate none of whose works is recorded over it. A step run per sentence is its
    // sentences, each with drills its own node.
    const nodes = (L.class_node ?? [])
      .filter((n) => kindOf(n) === 'step' ? (held.get(n.key) ?? 0) > 0 : kindOf(n) === 'listen' ? (works.get(n.key) ?? 0) > 0 : true)
      .flatMap((n) => {
        const pool = kindOf(n) === 'step' ? pools[steps.indexOf(n)] : [];
        if (kindOf(n) !== 'step' || !perSentence(n) || !sentences.length) return [nodeCard(n, held.get(n.key) ?? 0, works.get(n.key) ?? 0, stylesOf(L, pool))];
        const placed = placeBySentence(pools[steps.indexOf(n)], sentences);
        return sentences.flatMap((s, i) => {
          const k = placed.get(s.id)?.length ?? 0;
          return k ? [nodeCard(sentenceLabel(L, n, s, i + 1, p.surah), k, 0, stylesOf(L, placed.get(s.id) ?? []))] : [];
        });
      });
    return ok({
      passage: passageCard(p),
      nodes: [...held.values()].some((n) => n > 0) ? nodes : [],
      bands: bandsOf(L),
      words: L.class_ui ?? [],
      stage: L.stage ?? [],
      round: fullRound,
    });
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
    // the commentaries' study is a reading session: each sentence of each book read aloud, then broken down
    if ((base.extra?.module as { study?: string } | undefined)?.study === 'tafsir') {
      return ok({ passage: passageCard(p), node: nodeCard(base, 0), slides: await readingSession(env, L, p) });
    }
    let items = await stepPool(env, L, base, p);
    if (sentence) items = placeBySentence(items, await sentencesOf(env, p)).get(sentence) ?? [];
    const slides = lessonOf(L, items, u.searchParams.get('style'));
    return ok({ passage: passageCard(p), node: nodeCard(base, items.length), slides });
  });

  router.get('/qr/practice/class/node', async (req, env) => {
    const u = new URL(req.url);
    const id = u.searchParams.get('passage');
    const key = u.searchParams.get('node');
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
      const pools = await Promise.all(steps.map((n) => stepPool(env, L, n, p)));
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
    // each drill names its style, the sub-node it counts toward (the device sends it back with the answer)
    // and the lesson slide that teaches it (GET /qr/practice/class/lesson), opened from the drill
    const styled = items.map((d) => ({ ...d, style: styleOf(d), lesson: lessonId(d) }));
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
