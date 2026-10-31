import { cached } from '../../../shared/src/cache';
import type { Router } from '../../../shared/src/router';
import { attachGt } from '../../../shared/src/gt-attach';
import { ok, badRequest, notFound } from '../../../shared/src/response';
import { query } from '../../../shared/src/db';
import type { QuranEnv } from '../env';
import { labels, byKey, card, type Label } from '../lib/labels';
import { features as tFeatures, profiles as tProfiles, sources as tSources, fallbackOf, choiceLabel, cleanText,
         type TFeature, type ProfileRow } from '../lib/translation-choices';
import { tafsirDrills, tafsirCount } from './practice-tafsir';
import { readingSentenceDrills } from './practice-reading';
import { irabBookDrills, irabBookCount } from './practice-irabbooks';
import { gramTermDrills, gramTermCounts } from './practice-grammar';
import { lexiconDrills } from './practice-lexicon';
import { vocabDrills, vocabCount, pairsDrills } from './practice-vocab';
import { arc2Drills } from './practice-arc2';
import { surahLexDrills, surahLexCounts } from './practice-surah-lex';
import { groupDrills, groupsCount } from './practice-groups';
import { ssDrills, ssCount } from './practice-ss';
import { structureDrills, structureCount } from './practice-structure';
import { questionDrills, tafsirDrillsQ, questionsCount, tafsirReadDrills, tafsirLangDrills, listenWorks, passageDrills, type PassageStage } from './practice-tafsirq';
import { sarfDrills, sarfSheet, lexiconRoot, lexiconLemma } from './practice-sarf';
import { ensureCard, attachRef, widenToAyat, foldSources, loadAyat, runOn, withCard, shuffle, type Ayah as KitAyah, fold, loose } from './practice-kit';

// The āyah loader lives in practice-kit (one copy); re-exported for the callers that import it from here.
export { loadAyat, runOn };

type Word = KitAyah['ws'][number];
/// a line drilled here: an āyah as the kit loads it, or a sentence assembled across āyāt (no surah name of its own)
type Ayah = Omit<KitAyah, 'surahName'> & { surahName?: string };
import { softFail } from '../../../shared/src/soft-fail';

/** Bump when the الصرف sheet's JSON changes shape or wording rules, so the edge cache starts afresh. */
const SARF_SHEET_V = '2026-10-16a'
const LEX_PAGE_V = '2026-10-08k';

// ── Qurʾān drills ─────────────────────────────────────────────────────────────
// The Qurʾān drilled as the Arabic side is (DrillKit shapes): each āyah a line heard in
// al-ʿAfāsī's recitation, its words timed — listen & fill, build the āyah, catch the word,
// shadow — and iʿrāb, grammar, balāgha, verbal idioms, sense arcs and translation choices. Every skill has three
// levels, read from qr_study_label (skill.extra_json.levels). Every drill carries its review
// card (CORE SRS, module QR) with the whole drill kept, so review replays it as the drill.
//
//   GET /qr/practice/home
//   GET /qr/practice/session?skill=&level=basic|middle|advanced|all&surah=&from=&to=&n=8
//       scope: an āyah range of a surah, a whole surah, or (no surah) the whole Qurʾān

const BOOKS: Record<string, string> = { qul_irab_quran_daas: 'al-Daʿʿās, Iʿrāb al-Qurʾān' };
export type Band = 'basic' | 'middle' | 'advanced' | 'all';
type Levels = Record<string, Record<string, unknown>>;
export type Scope = { surah: number | null; from: number | null; to: number | null };

const cap = (s: string | null | undefined) => (s ?? '').replace(/^\w/, (c) => c.toUpperCase());

export function practiceRoutes(router: Router<QuranEnv>) {
  // the passage's commentary, to read and follow (the passage study's commentary section): the four
  // works over the passage, every line timed, with its English and its terms — public, like the atlas
  router.get('/qr/tafsir/passage', async (req, env) => {
    const u = new URL(req.url);
    const surah = Number(u.searchParams.get('surah')), from = Number(u.searchParams.get('from')), to = Number(u.searchParams.get('to'));
    if (!Number.isInteger(surah) || surah < 1 || !Number.isInteger(from) || from < 1) return badRequest('surah and from are required');
    const [works, L] = await Promise.all([listenWorks(env, WORKS, { surah, from, to: Number.isInteger(to) && to >= from ? to : from }), labels(env)]);
    // each work is studied in four views (qr_study_label tafsir_view), with the words its screens say (tafsir_ui), and
    // each passage drilled in three stages (tafsir_stage)
    return ok({ works, views: L.tafsir_view ?? [], ui: L.tafsir_ui ?? [], stages: L.tafsir_stage ?? [] });
  });

  // one passage of one work, drilled (the commentary's Drills view): stage understand · translate · master. The passage
  // is named by its recording and the line it starts on, as the commentary serves it
  router.get('/qr/tafsir/passage/drills', async (req, env) => {
    const u = new URL(req.url);
    const surah = Number(u.searchParams.get('surah')), from = Number(u.searchParams.get('from')), to = Number(u.searchParams.get('to'));
    const work = u.searchParams.get('work') ?? '', audio = u.searchParams.get('audio') ?? '', at = Number(u.searchParams.get('passage'));
    const stage = u.searchParams.get('stage') as PassageStage;
    if (!Number.isInteger(surah) || !Number.isInteger(from) || !work || !audio || !Number.isInteger(at)
        || !['understand', 'translate', 'master'].includes(stage)) return badRequest('surah, from, work, audio, passage and stage are required');
    const scope = { surah, from, to: Number.isInteger(to) && to >= from ? to : from };
    const [items, L] = await Promise.all([passageDrills(env, scope, work, audio, at, stage), labels(env)]);
    const kinds = byKey(L.kind);
    const drills = items.map((it) => {
      const k = kinds.get(String(it.ask ?? it.kind));
      const { ask: _a, ...rest } = it;
      return { ...rest, instruction: k?.label ?? null, instructionAr: k?.labelAr ?? null };
    });
    return ok({ drills, stage: (L.tafsir_stage ?? []).find((x) => x.key === stage) ?? null });
  });

  // the passage's الصرف, to read (the passage study's الصرف tab): public, like the atlas
  // the JSON is kept at the edge (an hour; ETag, 304s); the app's refresh (?refresh=1) rebuilds it
  router.get('/qr/sarf/passage', async (req, env) => {
    const u = new URL(req.url);
    const surah = Number(u.searchParams.get('surah')), from = Number(u.searchParams.get('from')), to = Number(u.searchParams.get('to'));
    if (!Number.isInteger(surah) || surah < 1) return badRequest('surah is required');
    // the sheet's shape version is part of the cache key: a deploy that changes the JSON never serves an old copy
    const keyed = new URL(req.url); keyed.searchParams.set('v', SARF_SHEET_V);
    return cached(new Request(keyed.toString(), req), async () => {
      const sheet = await sarfSheet(env, { surah, from: Number.isInteger(from) && from > 0 ? from : null, to: Number.isInteger(to) && to > 0 ? to : null },
                                     u.searchParams.has('refresh'));
      return ok(sheet ?? { words: [], roots: [] });
    }, { browser: 60, edge: 3600 });
  });

  // the lexicon's pages — a root and a lemma across the whole Qurʾān, the same from every passage: public, kept at the
  // edge like the sheet (the shape version is part of the key)
  router.get('/qr/lexicon/root', async (req, env) => {
    const u = new URL(req.url);
    const root = (u.searchParams.get('root') ?? '').trim();
    if (!root) return badRequest('root is required');
    const keyed = new URL(req.url); keyed.searchParams.set('v', LEX_PAGE_V);
    return cached(new Request(keyed.toString(), req), async () => {
      const page = await lexiconRoot(env, root, u.searchParams.has('refresh'));
      return page ? ok(page) : notFound(`root ${root}`);
    }, { browser: 60, edge: 3600 });
  });
  router.get('/qr/lexicon/lemma', async (req, env) => {
    const u = new URL(req.url);
    const id = (u.searchParams.get('id') ?? '').trim();
    // a lemma's AL id: its global id, or the id an imported book's headword was filed under (lane_lemma_n…)
    if (!/^(AL:)?[A-Za-z0-9_-]{6,80}$/.test(id)) return badRequest('id is a lemma\'s AL id (AL:…)');
    const keyed = new URL(req.url); keyed.searchParams.set('v', LEX_PAGE_V);
    return cached(new Request(keyed.toString(), req), async () => {
      const page = await lexiconLemma(env, id, u.searchParams.has('refresh'));
      return page ? ok(page) : notFound(`lemma ${id}`);
    }, { browser: 60, edge: 3600 });
  });

  router.get('/qr/practice/home', async (_req, env) => {
    const [L, irab, ayat, tr, counts] = await Promise.all([
      labels(env),
      query<{ n: number }>(env.DB_QR, `SELECT COUNT(*) AS n FROM qr_irab_drill_item`),
      query<{ n: number }>(env.DB_QR, `SELECT COUNT(*) AS n FROM qr_ayah`),
      // translation choices: every place a feature stands (the registry keeps the counts)
      query<{ n: number }>(env.DB_QR, `SELECT COALESCE(SUM(n_ayat), 0) AS n FROM qr_translation_feature`).catch(softFail([{ n: 0 }])),
      al<{ grammar: number; balagha: number; idiom: number; arc: number }>(env, '/al/drill/counts').catch(() => null),
    ]);
    const [tafsir, irabbooks, gram, vocab, ss] = await Promise.all([tafsirCount(env).catch(softFail(0)), irabBookCount(env).catch(softFail(0)),
                                                         gramTermCounts(env, L.skill ?? []).catch(softFail({} as Record<string, number>)),
                                                         vocabCount(env).catch(softFail(0)), ssCount(env).catch(softFail(0))]);
    const structure = await structureCount(env).catch(softFail(0));
    const asked = await questionsCount(env).catch(softFail({ questions: 0, tafsirq: 0 }));
    const n: Record<string, number> = { irab: irab[0]?.n ?? 0, lines: ayat[0]?.n ?? 0, translation: tr[0]?.n ?? 0, tafsir, irabbooks, vocab, pairs: Math.floor(vocab / 5), ss, structure, ...asked, ...(counts ?? {}), ...gram, ...(await surahLexCounts(env).catch(softFail({}))), groups: await groupsCount(env, L).catch(() => 0) };
    return ok({
      skills: (L.skill ?? []).map((s) => {
        const src = String(s.extra?.source ?? s.key);
        const key = src === 'gram' ? (s.extra?.discipline === 'BL' ? 'balagha' : 'grammar') : src === 'gramterm' ? s.key : src;
        return { ...card(s), count: n[key] ?? 0 };
      }),
      levels: (L.level ?? []).map(card),
    });
  });

  // The drill stage's own words alone, for a host that plays drills it did not draw here
  // (an SRS review, the full drill): Check, Listen, the grades, the result lines …
  router.get('/qr/practice/stage', async (_req, env) => {
    const L = await labels(env);
    return ok({ stage: L.stage ?? [] });
  });

  router.get('/qr/practice/session', async (req, env) => {
    const u = new URL(req.url);
    const skill = u.searchParams.get('skill') ?? 'irab';
    const band = (['basic', 'middle', 'advanced'].includes(u.searchParams.get('level') ?? '') ? u.searchParams.get('level') : 'all') as Band;
    const n = Math.min(20, Math.max(1, Number(u.searchParams.get('n') ?? 8)));
    const scope: Scope = { surah: Number(u.searchParams.get('surah') ?? 0) || null,
                           from: Number(u.searchParams.get('from') ?? 0) || null, to: Number(u.searchParams.get('to') ?? 0) || null };
    if (scope.surah !== null && (scope.surah < 1 || scope.surah > 114)) return badRequest('surah 1–114');
    const L = await labels(env);
    const meta = byKey(L.skill).get(skill);
    if (!meta) return badRequest(`unknown skill ${skill}`);
    const items = await drawSkill(env, L, skill, band, n, scope, u);
    const deck = byKey(L.path).get('srs_deck');
    const res = ok({
      skill: card(meta), level: band,
      items,
      srsDeck: deck ? { title: deck.label, description: deck.detail } : null,
      // the drill stage's own words (Check, Listen, Slower …), as label rows
      stage: L.stage ?? [],
    });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  });
}

/**
 * n drills of one skill over a scope, as the device takes them: each with the instruction its
 * kind's label row gives, and the registry terms its own rows name. The session draws a round
 * with it; the class (practice-class.ts) draws a step's whole pool. Unknown skill: none.
 */
/** The four commentaries a passage is read in, concise to extensive. */
const WORKS = ['zamakhshari', 'ibn_ashur', 'razi', 'alusi'];

export async function drawSkill(env: QuranEnv, L: Record<string, Label[]>, skill: string, band: Band, n: number,
                                scope: Scope, u: URL | null = null, only?: string[], every = false): Promise<Array<Record<string, unknown>>> {
  const meta = byKey(L.skill).get(skill);
  if (!meta) return [];
  const levels = (meta.extra?.levels ?? {}) as Levels;
  // a class step may hold only some of a skill's asks (class_node extra.only): those, at every level
  const lv = only?.length ? { asks: only, types: only } : band === 'all' ? {} : (levels[band] ?? {});
  // a class step over its own passage may ask for every word of it (class_node extra.every), not only the hard ones
  if (every) (lv as Record<string, unknown>).every = true;
  const src = String(meta.extra?.source ?? skill);
  const items =
    src === 'irab' ? await irabDrills(env, n, scope, lv, band, levels)
    : src === 'lines' ? await lineDrills(env, skill, n, scope, lv, !!meta.extra?.timed, meta.extra?.interaction as string | undefined)
    : src === 'gram' ? await gramDrills(env, skill, String(meta.extra?.discipline ?? 'NH'), n, scope, lv)
    : src === 'idiom' ? await idiomDrills(env, n, scope, lv, L)
    // no drill is built on the fly (owner, 2026-10-24): a root's arc is drilled from the bank (km_core cyb_drill rg:*,
    // authored by kmaps-resources scripts/quran/author_range_drills.py), never generated here
    : src === 'arc' ? []
    : src === 'translation' ? await translationDrills(env, n, scope, band, levels)
    : src === 'tafsir' ? await tafsirDrills(env, n, scope, lv, L)
    : src === 'irabbooks' ? await irabBookDrills(env, n, scope, lv, L)
    : src === 'gramterm' ? await gramTermDrills(env, skill, meta, n, scope, lv, band, L)
    : src === 'lexicon' ? await lexiconDrills(env, n, scope, lv, L)
    : src === 'vocab' ? await vocabDrills(env, n, scope, lv, L)
    : src === 'pairs' ? await pairsDrills(env, Math.max(1, Math.round(n / 3)), scope)
    : src === 'arc2' ? await arc2Drills(env, n, scope, lv, L)
    : ['nearsyn', 'keyterm', 'expression'].includes(src) ? await surahLexDrills(env, src, n, scope, lv, L)
    : src === 'groups' ? await groupDrills(env, n, scope, lv, L, u)
    : src === 'ss' ? [...await ssDrills(env, n, scope, lv, L), ...await sentenceLineDrills(env, scope, (lv.asks as string[] | undefined) ?? [])]
    // a class step may take some of a sentence's reading drills (class_node extra.only.reading): by the builder in the id
    : src === 'reading' ? (await readingSentenceDrills(env, scope))
        .filter((d) => !only?.length || only.includes(String(d.id ?? '').split(':')[0]))
    : src === 'structure' ? await structureDrills(env, n, scope, lv, L)
    : src === 'questions' ? await questionDrills(env, n, scope)
    : src === 'tafsirq' ? await tafsirDrillsQ(env, meta.extra?.interaction === 'listen_mark' ? 'listen' : 'meaning', n, scope)
    : src === 'sarf' ? await sarfDrills(env, n, scope)
    : src === 'tafsir_read' || src === 'tafsir_hear'
      ? (await tafsirReadDrills(env, scope, (meta.extra?.works as string[] | undefined) ?? WORKS, src === 'tafsir_hear')).slice(0, n)
    : src === 'tafsir_lang' ? (await tafsirLangDrills(env, scope, (meta.extra?.works as string[] | undefined) ?? WORKS)).slice(0, n)
    : [];
  const kinds = byKey(L.kind);
  // grammar and balāgha keep to the high end: a drill whose terms hold no EXPERT-tier term (qr_122) is not dealt
  let pool = items;
  if (src === 'gram' || src === 'gramterm') {
    const expert = new Set((await query<{ id: string }>(env.DB_QR, `SELECT id FROM ar_ling_gram_term WHERE tier = 'expert'`)
      .catch(softFail([] as Array<{ id: string }>))).map((r) => r.id));
    pool = items.filter((it) => ((it.terms as string[] | undefined) ?? [it.termId as string | undefined].filter(Boolean) as string[])
      .some((t) => expert.has(t)));
  }
  const shaped = pool.flatMap((it) => {
    const k = kinds.get(String(it.ask ?? skill)) ?? kinds.get(skill);
    // concept-based only: a kind about a person, a book, a school or where something stands is retired (qr_124)
    if ((kinds.get(String(it.ask ?? it.kind ?? ''))?.extra as { retired?: unknown } | null)?.retired) return [];
    const { ask: _a, ...rest } = it;
    // a drill a builder dealt without its card still files one: nothing practised is left out of review
    const d = ensureCard({ ...rest, instruction: k?.label ?? null, instructionAr: k?.labelAr ?? null }, skill);
    return d ? [foldSources(d)] : [];   // an empty drill is dropped, never dealt; its citations become source chips
  });
  // every drill carries the registry terms its own rows name
  // and every drill set in an āyah carries its reference: ﴿الأنعام، ١٤٥- 6:145 ﴾
  return attachGt(env.DB_QR, await attachRef(env.DB_QR, shaped as Array<Record<string, unknown>>));
}

// ── shared ──────────────────────────────────────────────────────────────────

function al<T>(env: QuranEnv, path: string): Promise<T> {
  if (!env.AR_LINGUISTICS) return Promise.reject(new Error('no AL binding'));
  return env.AR_LINGUISTICS.fetch(`https://al${path}`).then((r) => r.json() as Promise<{ data: T }>).then((j) => j.data);
}


const scopeWhere = (s: Scope, col = '') => s.surah === null ? { sql: '1=1', args: [] as number[] }
  : s.from && s.to ? { sql: `${col}surah = ? AND ${col}ayah BETWEEN ? AND ?`, args: [s.surah, s.from, s.to] }
  : { sql: `${col}surah = ?`, args: [s.surah] };

/// āyāt in scope whose word count sits in the level's bounds
async function pickAyat(env: QuranEnv, scope: Scope, minWords: number, maxWords: number, n: number) {
  const w = scopeWhere(scope);
  const rows = await query<{ surah: number; ayah: number }>(env.DB_QR,
    `SELECT surah, ayah FROM qr_word_occurrence WHERE ${w.sql} GROUP BY surah, ayah
      HAVING COUNT(*) BETWEEN ? AND ? ORDER BY random() LIMIT ?`, [...w.args, minWords, maxWords, n]);
  return rows.map((r) => [r.surah, r.ayah]);
}

type PoolWord = { word_text: string; pos: string | null; lemma: string | null; gt_case: string | null; has_det_prefix: number | null;
                  prefix_count: number | null; root?: string | null; gt_derivation_type?: string | null; form_roman?: string | null;
                  gt_number?: string | null; gt_tense?: string | null; gt_person?: string | null };
const POOL_COLS = 'word_text, pos, lemma, gt_case, has_det_prefix, prefix_count, root, gt_derivation_type, form_roman, gt_number, gt_tense, gt_person';
/** The particle a word carries in front (وَ فَ بِ لِ كَ سَ), or none — a gap's word and its options share it. */
const leadingConj = (w: PoolWord) => (Number(w.prefix_count ?? 0) > 0 && /^[وفبلكس]/.test(w.word_text) && !/^ال/.test(w.word_text) ? w.word_text[0] : '');

/** Three words that fit the gap the target leaves: its part of speech, definite or not like it, in
 *  its case, with its leading وَ / فَ — so the gap's form gives nothing away — one form per lemma, and
 *  for a word heard, close to it in length. Loosened step by step only when the sūra has too few. */
export function gapFillers(target: PoolWord, pool: PoolWord[], heard: boolean, kin: PoolWord[] = []): string[] {
  const len = (w: string) => fold(w).length;
  // NEAR-MISSES first (owner, 2026-10-14): another word of the same root, then a word of the same pattern (its
  // derivation, or for a verb its form, tense and person) — each in the gap's own shape (part of speech, definite
  // or not, case, number, leading وَ/فَ), so the form gives nothing away. Two at most from the root, so the choice is
  // not all one family; the rest by pattern, then by the gap's shape alone (the sūra's words, as before).
  const shape = (p: PoolWord) => p.pos === target.pos && (p.has_det_prefix ?? 0) === (target.has_det_prefix ?? 0)
    && p.gt_case === target.gt_case && (p.gt_number ?? null) === (target.gt_number ?? null) && leadingConj(p) === leadingConj(target);
  // lemmas compared WITH their vowels here: مُنذَر (warned) is not مُنذِر (warner) — the nearest miss of all
  // (the app grades such choices by their vowels, DrillGrading.same)
  const lemmaKey = (p: PoolWord) => (p.lemma ?? p.word_text).normalize('NFC');
  const own = lemmaKey(target);
  const near: Array<{ fits: (p: PoolWord) => boolean; max: number; from: PoolWord[] }> = [
    { fits: (p) => !!target.root && p.root === target.root && shape(p), max: 2, from: kin },
    { fits: (p) => shape(p) && (target.pos === 'V'
        ? !!target.form_roman && p.form_roman === target.form_roman && p.gt_tense === target.gt_tense && p.gt_person === target.gt_person
        : !!target.gt_derivation_type && p.gt_derivation_type === target.gt_derivation_type), max: 3, from: [...kin, ...pool] },
    { fits: shape, max: 3, from: pool },
  ];
  {
    const seen = new Set<string>([own]);
    const out: string[] = [];
    for (const t of near) {
      let took = 0;
      for (const c of shuffle(t.from.filter((p) => t.fits(p) && p.word_text.normalize('NFC') !== target.word_text.normalize('NFC')))) {
        const k = lemmaKey(c);
        if (seen.has(k) || took >= t.max) continue;
        seen.add(k); out.push(c.word_text); took += 1;
        if (out.length === 3) return out;
      }
    }
  }
  // too few of the gap's exact shape: the old loosening, one tier at a time
  const tries: ((p: PoolWord) => boolean)[] = [
    (p) => p.pos === target.pos && (p.has_det_prefix ?? 0) === (target.has_det_prefix ?? 0) && p.gt_case === target.gt_case && leadingConj(p) === leadingConj(target),
    (p) => p.pos === target.pos && (p.has_det_prefix ?? 0) === (target.has_det_prefix ?? 0) && leadingConj(p) === leadingConj(target),
    (p) => p.pos === target.pos && leadingConj(p) === leadingConj(target),
  ];
  for (const fits of tries) {
    const seen = new Set<string>([loose(target.lemma ?? target.word_text)]);
    let cands = pool.filter((p) => fits(p) && loose(p.word_text) !== loose(target.word_text));
    cands = heard ? cands.sort((x, y) => Math.abs(len(x.word_text) - len(target.word_text)) - Math.abs(len(y.word_text) - len(target.word_text)))
                  : shuffle(cands);
    const out: string[] = [];
    for (const c of (heard ? shuffle(cands.slice(0, 12)) : cands)) {
      const k = loose(c.lemma ?? c.word_text);
      if (seen.has(k)) continue;
      seen.add(k); out.push(c.word_text);
      if (out.length === 3) return out;
    }
  }
  return [];
}

// ── listen & fill · build the āyah · catch the word · shadow ──────────────────

async function lineDrills(env: QuranEnv, skill: string, n: number, scope: Scope, lv: Record<string, unknown>, timed: boolean,
                          interaction?: string) {
  const minW = Number(lv.minWords ?? 3), maxW = Number(lv.maxWords ?? 60);
  // more āyāt than asked: only one holding high-end language is drilled
  const pairs = await pickAyat(env, scope, minW, maxW, n * (timed ? 6 : 4));
  const ayat = [...(await loadAyat(env, pairs)).values()].filter((a) => a.ws.length && (!timed || a.aligned));
  const ctx = await lineContext(env, pairs, skill === 'fill' || skill === 'hear');
  const out: Record<string, unknown>[] = [];
  for (const a of ayat) {
    if (out.length >= n) break;
    const d = lineDrill(skill, { ...a, id: a.key, ays: a.ws.map(() => a.ayah), wordKey: (i) => String(a.ws[i].word_index) }, ctx, interaction);
    if (d) out.push(d);
  }
  return out;
}

/** A line drilled by ear: an āyah, or one sentence of the passage (its words, which may run over two āyāt). */
type Line = Ayah & { id: string; ays: number[]; wordKey: (i: number) => string; at?: { ayah: number; word: number }; sentence?: boolean };
type LineCtx = { pool: PoolWord[]; factOf: Map<string, PoolWord>; high: Set<string>; kin: PoolWord[] };

/** What a line's drills choose from: the sūras' content words, each word's facts, which words are high-end,
 *  and (for a gap) the words of the same roots across the Qurʾān. */
async function lineContext(env: QuranEnv, pairs: number[][], gaps: boolean): Promise<LineCtx> {
  const surahIds = [...new Set(pairs.map((p) => p[0]))];
  const pool = surahIds.length ? await query<PoolWord>(env.DB_QR,
    `SELECT DISTINCT ${POOL_COLS} FROM qr_word_occurrence
      WHERE surah IN (${surahIds.map(() => '?').join(',')}) AND is_content_word = 1 LIMIT 3000`, surahIds) : [];
  const facts = surahIds.length ? await query<PoolWord & { surah: number; ayah: number; word_index: number }>(env.DB_QR,
    `SELECT surah, ayah, word_index, ${POOL_COLS} FROM qr_word_occurrence
      WHERE (surah, ayah) IN (SELECT json_extract(value, '$[0]'), json_extract(value, '$[1]') FROM json_each(?))`, [JSON.stringify(pairs)]) : [];
  const factOf = new Map(facts.map((f) => [`${f.surah}:${f.ayah}:${f.word_index}`, f as PoolWord]));
  // HIGH-END only (the learner's rule for the Qurʾān): a word graded medium → super (qr_vocab_grade, a verb, noun or
  // adjective), or one flagged where it stands (an idiom, a disputed meaning, a debated word, an iʿrāb split — qr_vocab_flag)
  const high = new Set((pairs.length ? await query<{ k: string }>(env.DB_QR,
    `SELECT i.surah || ':' || i.ayah || ':' || i.word_index AS k FROM qr_vocab_item i
       LEFT JOIN qr_vocab_grade g ON g.root = i.root AND g.lemma = i.lemma
      WHERE (i.surah, i.ayah) IN (SELECT json_extract(value, '$[0]'), json_extract(value, '$[1]') FROM json_each(?))
        AND ((g.grade IN ('medium', 'hard', 'super') AND g.focus = 1)
             OR EXISTS (SELECT 1 FROM qr_vocab_flag f WHERE f.surah = i.surah AND f.ayah = i.ayah AND f.word_index = i.word_index))`,
    [JSON.stringify(pairs)]).catch(softFail([] as Array<{ k: string }>)) : []).map((r) => r.k));
  // the words of the same roots across the whole Qurʾān: a gap's nearest misses
  const roots = [...new Set(facts.filter((f) => f.root && high.has(`${f.surah}:${f.ayah}:${f.word_index}`)).map((f) => f.root as string))];
  const kin = gaps && roots.length ? await query<PoolWord>(env.DB_QR,
    `SELECT DISTINCT ${POOL_COLS} FROM qr_word_occurrence WHERE root IN (${roots.map(() => '?').join(',')}) AND is_content_word = 1 LIMIT 4000`,
    roots).catch(softFail([] as PoolWord[])) : [];
  return { pool, factOf, high, kin };
}

/** One line's drill of a listening skill — fill, hear, order, shadow (or mark) — or null when it has nothing to ask. */
function lineDrill(skill: string, a: Line, ctx: LineCtx, interaction?: string): Record<string, unknown> | null {
  const { pool, factOf, high, kin } = ctx;
  const hi = (i: number) => high.has(`${a.surah}:${a.ays[i]}:${a.ws[i].word_index}`);
  // an āyah with nothing high-end in it is not drilled — whether a word of it is asked, or the āyah whole. A sentence of
  // the class's passage is built and recited whatever its words; only a word asked alone (fill, hear) must be high-end.
  if (!a.sentence && !a.ws.some((_, i) => hi(i))) return null;
  if (a.sentence && skill === 'order' && a.ws.length < 3) return null;   // two tiles are a coin toss, not a build
  const base: Record<string, unknown> = { id: `${skill}:${a.id}`, kind: skill, script: 'quran', audio: a.audio, words: a.words, en: a.en,
                                          source: { workId: `QR:SURAH:${a.surah}`, title: a.title, level: null } };
  if (a.at) base.at = a.at;
  // a skill row may name its interaction (mark: listen, then tap each word not caught)
  if (interaction) base.interaction = interaction;
  const line = a.ws.map((w) => w.word_text).join(' ');
  const series = a.title.replace(/ \d+:\d+(–\d+)?$/, '');
  const card = (front: string, back: string) => withCard(base, { ref: `QR:${skill}:${a.id}`, type: 'passage', kind: skill, front, back,
                                                                 surah: a.surah, ayah: a.ayah, series });
  if (skill === 'fill' || skill === 'hear') {
    const content = a.ws.map((w, i) => ({ w, i })).filter(({ w, i }) => (w.is_content_word ?? 0) === 1 && fold(w.word_text).length >= 3
      && hi(i) && (skill !== 'hear' || a.words[i].e - a.words[i].s >= 0.25));
    if (!content.length) return null;
    const pick = content[Math.floor(Math.random() * content.length)];
    const answer = pick.w.word_text;
    const target = factOf.get(`${a.surah}:${a.ays[pick.i]}:${pick.w.word_index}`);
    const wrong = gapFillers(target ?? { word_text: answer, pos: pick.w.pos, lemma: pick.w.lemma, gt_case: null, has_det_prefix: null, prefix_count: null },
                             pool, skill === 'hear', kin);
    if (wrong.length < 3) return null;
    const options = shuffle([answer, ...wrong]);
    if (skill === 'fill') { base.blank = pick.i; base.answer = answer; base.options = options; }
    else {
      const t = a.words[pick.i];
      base.audio = { ...a.audio!, start: Math.max(a.audio!.start, t.s - 0.04), end: Math.min(a.audio!.end, t.e + 0.08) };
      base.target = pick.i; base.answer = answer; base.options = options; base.line = a.audio;
    }
    // the blank is part of its identity: one review item per line and word
    base.id = `${skill}:${a.id}:${a.wordKey(pick.i)}`;
    return withCard(base, { ref: `QR:${skill}:${a.id}:${a.wordKey(pick.i)}`, type: 'passage', kind: skill,
      front: line.replace(answer, '＿＿＿'), back: `${answer}\n${line}`, surah: a.surah, ayah: a.ayah, series });
  }
  if (skill === 'order') {
    const order = a.ws.map((_, i) => i);
    let sh = shuffle(order);
    for (let k = 0; k < 4 && sh.every((v, i) => v === i); k++) sh = shuffle(order);
    base.shuffled = sh;
  }
  return card(a.en ?? a.title, line);   // order: the line rebuilt; shadow / mark: the line and its timings
}

/** The listening drills of each sentence of the passage (class step "Sentences", ss asks ss_fill · ss_order · ss_hear ·
 *  ss_shadow): the sentence's own words cut from its āyāt, timed in the recitation, with the English of those āyāt.
 *  Each stands at the sentence's first word, so the class places it in that sentence. */
export async function sentenceLineDrills(env: QuranEnv, scope: Scope, asks: string[]): Promise<Record<string, unknown>[]> {
  const skills = ['order', 'fill', 'hear', 'shadow'].filter((s) => asks.includes(`ss_${s}`));
  if (!skills.length || !scope.surah) return [];
  const from = scope.from ?? 1, to = scope.to ?? 999;
  const sentences = await query<{ id: string; ayah_from: number; ayah_to: number; ws: number | null; we: number | null }>(env.DB_QR,
    `SELECT id, ayah_from, ayah_to, word_start_index AS ws, word_end_index AS we FROM qr_ss_occ_sentence
      WHERE surah = ? AND ayah_from >= ? AND ayah_to <= ? AND COALESCE(is_virtual, 0) = 0 AND word_start_index IS NOT NULL
      ORDER BY ayah_from, word_start_index, (id LIKE '%:jadwal:%'), id`, [scope.surah, from, to]);
  if (!sentences.length) return [];
  const nums = [...new Set(sentences.flatMap((s) => Array.from({ length: s.ayah_to - s.ayah_from + 1 }, (_, i) => s.ayah_from + i)))];
  const pairs = nums.map((a) => [scope.surah!, a]);
  const ayat = await loadAyat(env, pairs);
  const ctx = await lineContext(env, pairs, skills.includes('fill') || skills.includes('hear'));
  const out: Record<string, unknown>[] = [];
  const seen = new Set<string>();
  for (const s of sentences) {
    // one reading of the same words is enough: two sentence rows over one span give one set of drills
    const span = `${s.ayah_from}:${s.ws}-${s.ayah_to}:${s.we}`;
    if (seen.has(span)) continue;
    seen.add(span);
    const parts = Array.from({ length: s.ayah_to - s.ayah_from + 1 }, (_, i) => ayat.get(`${scope.surah}:${s.ayah_from + i}`));
    if (parts.some((p) => !p || !p.aligned || !p.audio) || new Set(parts.map((p) => p!.audio!.url)).size > 1) continue;
    const ws: Word[] = [], words: Ayah['words'] = [], ays: number[] = [];
    for (const p of parts as Ayah[]) {
      p.ws.forEach((w, i) => {
        if (p.ayah === s.ayah_from && w.word_index < (s.ws ?? 1)) return;
        if (p.ayah === s.ayah_to && w.word_index > (s.we ?? 9_999)) return;
        ws.push(w); words.push(p.words[i]); ays.push(p.ayah);
      });
    }
    if (ws.length < 2) continue;             // a single word (حم) is heard in the āyah step, not built
    const first = parts[0]!, last = parts[parts.length - 1]!;
    const range = s.ayah_to > s.ayah_from ? `${scope.surah}:${s.ayah_from}–${s.ayah_to}` : `${scope.surah}:${s.ayah_from}`;
    // the English only where the sentence is its āyāt whole: a part of an āyah is not given the whole āyah's English
    const whole = (s.ws ?? 1) === 1 && parts[parts.length - 1]!.ws.every((w) => w.word_index <= (s.we ?? 9_999));
    const en = whole ? [...new Set(parts.map((p) => p!.en).filter(Boolean))].join(' ') || null : null;
    const line: Line = {
      key: s.id, id: s.id, surah: scope.surah, ayah: s.ayah_from, ws, words, ays, aligned: true, en,
      title: first.title.replace(/ \d+:\d+$/, ` ${range}`),
      audio: { url: first.audio!.url, start: Math.max(first.audio!.start, words[0].s - 0.05), end: Math.min(last.audio!.end, words[words.length - 1].e + 0.15) },
      wordKey: (i) => `${ays[i]}.${ws[i].word_index}`, at: { ayah: s.ayah_from, word: s.ws ?? 1 }, sentence: true,
    };
    // the full āyāt on top, the sentence lit in them, and the sentence itself in the box beneath (a fill's with its gap);
    // the build (order) keeps to its tiles, since there the line is the answer, and a heard word is not spelled out first
    const sentence = ws.map((w) => w.word_text);
    for (const k of skills) {
      const d = lineDrill(k, line, ctx);
      if (!d) continue;
      if (k !== 'order') {
        if (k === 'fill' && typeof d.blank === 'number') d.prompt = sentence.map((t, i) => (i === d.blank ? '＿＿＿' : t)).join(' ');
        else if (k === 'shadow') d.prompt = sentence.join(' ');
        d.span = sentence.map((_, i) => i);
        widenToAyat(d, parts as Ayah[], { ayah: ays[0], word_index: ws[0].word_index });
      }
      out.push({ ...d, ask: k });
    }
  }
  return out;
}

// ── iʿrāb ──────────────────────────────────────────────────────────────────

type IrabItem = { id: string; surah: number; ayah: number; word_index: number; word_text: string; role_gt: string; irab_ar: string; source_slug: string };

async function irabDrills(env: QuranEnv, n: number, scope: Scope, lv: Record<string, unknown>, band: Band, levels: Levels) {
  const w = scopeWhere(scope);
  const roles = (lv.roles as string[] | undefined)?.map((r) => `GT:irab_role:${r}`);
  const alt = lv.alternative === true;
  // high end only: never a basic role alone (the basic level's mubtadaʾ, khabar, fāʿil …) — an iʿrāb with a second
  // reading (ويجوز) is always kept, it is the nuance
  const basic = ((levels as Record<string, { roles?: string[] }> | undefined)?.basic?.roles ?? []).map((r) => `GT:irab_role:${r}`);
  const pool = await query<IrabItem>(env.DB_QR,
    `SELECT id, surah, ayah, word_index, word_text, role_gt, irab_ar, source_slug FROM qr_irab_drill_item
      WHERE ${w.sql} ${roles ? `AND role_gt IN (${roles.map(() => '?').join(',')})` : ''} ${alt ? `AND irab_ar LIKE '%ويجوز%'` : ''}
        ${basic.length ? `AND (irab_ar LIKE '%ويجوز%' OR role_gt NOT IN (${basic.map(() => '?').join(',')}))` : ''}
      ORDER BY random() LIMIT ?`, [...w.args, ...(roles ?? []), ...basic, n * 4]);
  const seen = new Set<string>();
  const picked = pool.filter((it) => { const k = `${it.surah}:${it.ayah}`; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, n);
  if (!picked.length) return [];
  const pairs = picked.map((p) => [p.surah, p.ayah]);
  const inAyat = pairs.map(() => '(surah = ? AND ayah = ?)').join(' OR ');
  const [ayat, sameAyah, names] = await Promise.all([
    loadAyat(env, pairs),
    query<{ surah: number; ayah: number; role_gt: string }>(env.DB_QR, `SELECT DISTINCT surah, ayah, role_gt FROM qr_irab_drill_item WHERE (surah, ayah) IN (SELECT json_extract(value, '$[0]'), json_extract(value, '$[1]') FROM json_each(?))`, [JSON.stringify(pairs)]),
    query<{ id: string; name_ar: string; name_en: string | null }>(env.DB_QR, `SELECT id, name_ar, name_en FROM ar_ling_gram_term WHERE id LIKE 'GT:irab_role:%'`),
  ]);
  const name = new Map(names.map((t) => [t.id, t]));
  // plain English, then the Arabic term: a transliteration in brackets ("Adjective (naʿt)") is dropped — the Arabic says it
  const plainEn = (en: string) => en.replace(/\s*\([^)]*\)/g, '').trim();
  const optionOf = (gt: string) => { const t = name.get(gt); return t ? (t.name_en ? `${cap(plainEn(t.name_en))} · ${t.name_ar}` : t.name_ar) : null; };
  // distractors from the same level first (then all roles), and the roles standing in the same āyah
  const levelRoles = band !== 'all' ? ((levels[band]?.roles as string[] | undefined) ?? []).map((r) => `GT:irab_role:${r}`) : [];
  const allRoles = [...name.keys()];
  const rolesIn = new Map<string, string[]>();
  for (const r of sameAyah) rolesIn.set(`${r.surah}:${r.ayah}`, [...(rolesIn.get(`${r.surah}:${r.ayah}`) ?? []), r.role_gt]);
  return picked.map((it) => {
    const a = ayat.get(`${it.surah}:${it.ayah}`)!;
    const idx = a.ws.findIndex((w) => w.word_index === it.word_index);
    const answer = optionOf(it.role_gt) ?? it.role_gt;
    const others = [...new Set([...(rolesIn.get(a.key) ?? []), ...shuffle(levelRoles), ...shuffle(allRoles)])]
      .filter((g) => g !== it.role_gt).map(optionOf).filter((x): x is string => !!x && x !== answer).slice(0, 3);
    const t = name.get(it.role_gt);
    const drill: Record<string, unknown> = {
      id: `irab:${a.key}:${it.word_index}`, kind: 'feature', script: 'quran', audio: a.audio, words: a.words, en: a.en,
      span: idx >= 0 ? [idx] : [], at: { ayah: a.ayah, word: it.word_index }, prompt: `What is the iʿrāb of ${it.word_text}?`,
      options: shuffle([answer, ...others]), answer,
      note: t ? { en: cap(t.name_en), ar: t.name_ar } : null,
      explanation: `${it.irab_ar} — ${BOOKS[it.source_slug] ?? it.source_slug}`,
      source: { workId: `QR:SURAH:${it.surah}`, title: a.title, level: null },
    };
    return withCard(drill, { ref: `QR:irab:${a.key}:${it.word_index}`, type: 'grammar', kind: 'irab', band,
      front: `${a.ws.map((w) => w.word_text).join(' ')}\n${it.word_text} — ?`, back: `${answer}\n${it.irab_ar}`,
      surah: it.surah, ayah: it.ayah, series: a.title.replace(/ \d+:\d+$/, '') });
  });
}

// ── grammar · balāgha (the registry's Qurʾānic examples) ─────────────────────

type GramEx = { id: string; termId: string; nameAr: string; nameEn: string | null; definition: string | null; category: string; depth: number;
                exampleAr: string; ref: string; siblings: Array<{ id: string; nameAr: string; nameEn: string | null }> };

/// where an example phrase stands in its āyah: the run of words it spells
function spanOf(ws: Word[], phrase: string): number[] {
  const toks = phrase.split(/\s+/).map(loose).filter(Boolean);
  const keys = ws.map((w) => loose(w.word_text));
  if (!toks.length) return [];
  for (let i = 0; i < keys.length; i++) {
    if (keys[i] !== toks[0]) continue;
    let k = 1;
    while (k < toks.length && i + k < keys.length && keys[i + k] === toks[k]) k++;
    if (k >= Math.min(2, toks.length)) return Array.from({ length: Math.min(toks.length, keys.length - i) }, (_, j) => i + j);
  }
  return [];
}

async function gramDrills(env: QuranEnv, skill: string, discipline: string, n: number, scope: Scope, lv: Record<string, unknown>) {
  const qs = new URLSearchParams({ discipline, n: String(n), minDepth: String(lv.minDepth ?? 0), maxDepth: String(lv.maxDepth ?? 9) });
  if (scope.surah) qs.set('surah', String(scope.surah));
  const res = await al<{ items: GramEx[] }>(env, `/al/drill/gram-examples?${qs}`).catch(() => ({ items: [] as GramEx[] }));
  const exs = res.items.filter((e) => /^\d+:\d+$/.test(e.ref) && e.siblings.length >= 3
    && (!scope.from || !scope.to || (Number(e.ref.split(':')[1]) >= scope.from && Number(e.ref.split(':')[1]) <= scope.to)));
  const ayat = await loadAyat(env, exs.map((e) => e.ref.split(':').map(Number)));
  const optionOf = (t: { nameAr: string; nameEn: string | null }) => (t.nameEn ? `${cap(t.nameEn)} · ${t.nameAr}` : t.nameAr);
  return exs.map((e) => {
    const a = ayat.get(e.ref);
    if (!a) return null;
    const answer = optionOf(e);
    const others = e.siblings.map(optionOf).filter((x) => x !== answer).slice(0, 3);
    const span = spanOf(a.ws, e.exampleAr);
    const drill: Record<string, unknown> = {
      id: `${skill}:${e.id}`, kind: 'feature', script: 'quran', audio: a.audio, words: a.words, en: a.en,
      span, at: { ayah: a.ayah, word: span.length ? a.ws[span[0]]?.word_index ?? null : null }, prompt: skill === 'balagha' ? 'Which figure of rhetoric is at work in the marked words?' : 'Which grammar term names the marked words?',
      options: shuffle([answer, ...others]), answer,
      note: { en: cap(e.nameEn), ar: e.nameAr }, explanation: e.definition,
      source: { workId: `QR:SURAH:${a.surah}`, title: a.title, level: null },
      // the term it tests — the expert-tier filter (drawSkill) keeps only drills whose term is expert
      termId: e.termId, terms: [e.termId],
    };
    return withCard(drill, { ref: `QR:${skill}:${e.id}`, type: 'grammar', kind: skill,
      front: `${e.exampleAr}\n(${e.ref}) — ?`, back: `${answer}${e.definition ? `\n${e.definition}` : ''}`,
      surah: a.surah, ayah: a.ayah, series: a.title.replace(/ \d+:\d+$/, '') });
  }).filter((x): x is Record<string, unknown> => !!x);
}

// ── verbal idioms (Mir) ────────────────────────────────────────────────────

type Idiom = { id: string; root: string; expressionAr: string; surfaceAr: string | null; particle: string | null; en: string;
               construction: string | null; explanation: string | null; surah: number; ayah: number; freq: number; ref: string;
               range: Array<{ ar: string; en: string }>; sameParticle: Array<{ ar: string; en: string }> };
type Lexeme = { meanings?: Array<{ en: string; ref: string | null; ayahEn?: string | null }>; lane?: { senses: string[]; page: number | null; source: string } | null };

async function idiomDrills(env: QuranEnv, n: number, scope: Scope, lv: Record<string, unknown>, L: Record<string, Label[]>) {
  const qs = new URLSearchParams({ n: String(n) });
  if (scope.surah) qs.set('surah', String(scope.surah));
  if (scope.from && scope.to) { qs.set('from', String(scope.from)); qs.set('to', String(scope.to)); }
  if (lv.minFreq != null) qs.set('minFreq', String(lv.minFreq));
  if (lv.maxFreq != null) qs.set('maxFreq', String(lv.maxFreq));
  const res = await al<{ items: Idiom[] }>(env, `/al/drill/idioms?${qs}`).catch(() => ({ items: [] as Idiom[] }));
  const items = res.items;
  if (!items.length) return [];
  const [ayat, lex] = await Promise.all([
    loadAyat(env, items.map((i) => [i.surah, i.ayah])),
    al<{ lexemes?: Record<string, Lexeme> }>(env, `/al/lex/v2/lexemes?refs=${encodeURIComponent([...new Set(items.map((i) => i.ref))].join(','))}`)
      .catch(() => ({ lexemes: {} as Record<string, Lexeme> })),
  ]);
  const refs = [...new Set(Object.values(lex.lexemes ?? {}).flatMap((x) => (x.meanings ?? []).map((m) => m.ref)).filter((r): r is string => !!r && /^\d+:\d+$/.test(r)))];
  const texts = refs.length ? new Map((await query<{ surah: number; ayah: number; text: string }>(env.DB_QR,
    `SELECT surah, ayah, text_uthmani AS text FROM qr_ayah WHERE (surah, ayah) IN (SELECT json_extract(value, '$[0]'), json_extract(value, '$[1]') FROM json_each(?))`,
    [JSON.stringify(refs.map((r) => r.split(':').map(Number)))])).map((r) => [`${r.surah}:${r.ayah}`, r.text])) : new Map<string, string>();
  const titles = byKey(L.context);
  const all = items.flatMap((i) => [...i.range, ...i.sameParticle]);
  return items.map((it) => {
    const a = ayat.get(`${it.surah}:${it.ayah}`);
    if (!a) return null;
    // the verb as it stands, and its particle if it is a word of its own
    const vi = a.ws.findIndex((w) => it.surfaceAr && loose(w.word_text) === loose(it.surfaceAr));
    const span = vi >= 0 ? [vi] : [];
    if (vi >= 0 && it.particle) {
      const p = loose(it.particle);
      const pi = a.ws.findIndex((w, i) => i > vi && i <= vi + 4 && (loose(w.word_text) === p || loose(w.word_text).startsWith(p)));
      if (pi > vi) span.push(pi);
    }
    const wrong = [...new Map([...it.range, ...it.sameParticle, ...shuffle(all)].filter((x) => x.en.toLowerCase() !== it.en.toLowerCase())
      .map((x) => [x.en.toLowerCase(), x.en])).values()].slice(0, 3);
    if (wrong.length < 3) return null;
    const x = lex.lexemes?.[it.ref];
    const context = x ? {
      meanings: x.meanings?.length ? { title: titles.get('meanings')?.label ?? null,
        items: x.meanings.slice(0, 5).map((m) => ({ en: m.en, ref: m.ref, ayahAr: m.ref ? texts.get(m.ref) ?? null : null, ayahEn: m.ayahEn ?? null })) } : null,
      lane: x.lane ? { title: titles.get('lane')?.label ?? null, senses: x.lane.senses, cite: `${x.lane.source}, p. ${x.lane.page ?? '—'}` } : null,
    } : null;
    const drill: Record<string, unknown> = {
      id: `idiom:${it.id}`, kind: 'idiom', script: 'quran', audio: a.audio, words: a.words, en: a.en, span,
      prompt: it.expressionAr, options: shuffle([it.en, ...wrong]), answer: it.en,
      note: it.construction ? { en: it.construction, ar: it.expressionAr } : null,
      explanation: it.explanation ?? 'Mustansir Mir, Verbal Idioms of the Qurʾān', context,
      source: { workId: `QR:SURAH:${a.surah}`, title: a.title, level: null },
    };
    return withCard(drill, { ref: `QR:idiom:${it.id}`, type: 'vocabulary', kind: 'idiom',
      front: `${it.expressionAr}\n${a.ws.map((w) => w.word_text).join(' ')}`, back: `${it.en}\n(${it.surah}:${it.ayah})`,
      surah: a.surah, ayah: a.ayah, series: a.title.replace(/ \d+:\d+$/, '') });
  }).filter((x): x is Record<string, unknown> => !!x);
}

// ── sense arcs ─────────────────────────────────────────────────────────────

type ArcStep = { n: number; en: string; gloss: string | null; ar: string; icon?: string | null; story?: string | null; labelAr?: string | null };
type Arc = { id: string; root: string; title: string | null; titleAr: string | null; steps: ArcStep[] };

/// A rung's Arabic as the infographic shows it, small beside its beat — only when short: the sense's own Arabic label,
/// else the lexicon's quoted word if it is a voweled word or two (an unvoweled quote is a name or a heading, not the word).
export function arcShortAr(s: ArcStep): string | null {
  const words = (t: string) => t.trim().split(/\s+/).length;
  if (s.labelAr && words(s.labelAr) <= 3 && s.labelAr.length <= 24) return s.labelAr.trim();
  if (s.ar && words(s.ar) <= 2 && s.ar.length <= 22 && /[\u064B-\u0652]/.test(s.ar)) return s.ar.trim();
  return null;
}

/// The root's short story as a slide infographic (deck contract §3b, snake_case as decks write it): the `timeline` kind
/// — the root's letters in a gold medallion (`term_ar`) the line grows out of, down through every step of the arc, in
/// order and never cut, each station's disc popping with the sense's icon and its story beat sliding in beside it; the
/// step this drill is about lit rust and `focus` (it breathes once the rest have landed), the rest in the slides' own
/// tone cycle, so a step's place is its colour; the note the one-line takeaway. The timing is data (`motion`).
/// Any drill may carry a `graphic`; the app draws it in the answered feedback (DrillKit StageReveal).
export function arcGraphic(root: string, steps: ArcStep[], lit: number, note: string) {
  return {
    kind: 'timeline', title: `The story of ${root}`, term_ar: root,
    items: steps.map((s, i) => ({
      label: i === 0 ? 'Basic' : String(i + 1), icon: s.icon ?? null, en: s.story ?? s.en, ar: arcShortAr(s),
      ...(i === lit ? { tone: 'rust', focus: true } : {}),
    })),
    note, motion: { every: 0.35, delay: 0.2 },
  };
}

/// The one-line takeaway: the sense, and its gloss when it adds to it.
const arcLine = (s: ArcStep) => (s.gloss && s.gloss.toLowerCase() !== s.en.toLowerCase() ? `${s.en} — ${s.gloss}` : s.en);

async function arcDrills(env: QuranEnv, n: number, lv: Record<string, unknown>, L: Record<string, Label[]>) {
  const qs = new URLSearchParams({ n: String(n), minSteps: String(lv.minSteps ?? 2), maxSteps: String(lv.maxSteps ?? 20) });
  const res = await al<{ items: Arc[] }>(env, `/al/drill/arcs?${qs}`).catch(() => ({ items: [] as Arc[] }));
  const ask = String(lv.ask ?? 'order');
  const rootOf = (r: string) => r; // a root is shown joined (نزل), never ن ز ل
  const allSteps = res.items.flatMap((a) => a.steps.map((s) => s.en));
  // each rung heard: its Arabic voiced by SILMA (km_arabic ar_tts_clip); what is not yet rendered is queued
  type Clip = { audio: { url: string; start: number; end: number } };
  const texts = [...new Set(res.items.flatMap((a) => a.steps.map((s) => s.ar).filter(Boolean)))];
  const clips: Record<string, Clip> = texts.length && env.ARABIC ? await env.ARABIC.fetch('https://ar/ar/practice/tts', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ texts, source: 'qr-arc' }) })
    .then((r) => r.json() as Promise<{ data?: { clips?: Record<string, Clip> } }>).then((j) => j.data?.clips ?? {}).catch(() => ({})) : {};
  return res.items.map((arc) => {
    const steps = [...arc.steps].sort((a, b) => a.n - b.n);
    if (steps.length < 2) return null;
    const source = { workId: `AL:ROOT:${arc.root}`, title: `${rootOf(arc.root)}${arc.title ? ` · ${arc.title}` : ''}`, level: null };
    if (ask === 'origin') {
      const answer = steps[0].en;
      const wrong = [...new Set([...steps.slice(1).map((s) => s.en), ...shuffle(allSteps)])].filter((x) => x !== answer).slice(0, 3);
      if (wrong.length < 3) return null;
      const line = `It starts with: ${arcLine(steps[0])}`;
      const drill: Record<string, unknown> = {
        id: `arc:origin:${arc.id}`, kind: 'gist', ask: 'arc_origin',
        prompt: `Where does the meaning of ${rootOf(arc.root)} start?`, options: shuffle([answer, ...wrong]), answer,
        en: steps[0].en, graphic: arcGraphic(arc.root, steps, 0, line), source,
      };
      return withCard(drill, { ref: `QR:arc:origin:${arc.id}`, type: 'root', kind: 'arc',
        front: `${rootOf(arc.root)} — first image?`, back: line });
    }
    // one use, heard — which sense on the arc does it carry? The arc stands in its order, Basic → 2 → 3 …, and is
    // never shuffled: the order is the lesson (owner, 2026-10-20: a choice on the arc, never "put it in order")
    if (steps.length < 3) return null;
    const pickAt = 1 + [...arc.id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % (steps.length - 1);
    const here = steps[pickAt];
    if (!here.ar) return null;
    const MAX = 6;
    const shown = steps.slice(0, MAX - 1).includes(here) ? steps.slice(0, MAX) : [...steps.slice(0, MAX - 1), here];
    const rungs = shown.map((s, i) => ({ ar: '', en: [s.en, s.gloss].filter(Boolean).join(' — '), label: i === 0 ? 'Basic' : String(i + 1),
                                         icon: s.icon ?? null }));
    const options = rungs.map((r) => r.en);
    if (new Set(options).size !== options.length) return null;
    const answer = rungs[shown.indexOf(here)].en;
    const line = `Here: ${arcLine(here)}`;
    const drill: Record<string, unknown> = {
      id: `arc:order:${arc.id}`, kind: 'gist', ask: 'arc_choose', interaction: 'choose_arc',
      instruction: 'Listen — which sense on its arc is this?', instructionAr: 'اِسْمَعْ — أَيُّ مَعَانِيهِ هَذَا؟',
      prompt: here.ar, audio: clips[here.ar]?.audio ?? null, options, answer, arc: rungs,
      // the story is told by the graphic (every step, this one lit); the old essay explanation is gone
      en: here.en, graphic: arcGraphic(arc.root, steps, pickAt, line),
      source,
    };
    return withCard(drill, { ref: `QR:arc:order:${arc.id}`, type: 'root', kind: 'arc',
      front: `${rootOf(arc.root)} — which sense here?\n${here.ar}`, back: line });
  }).filter((x): x is Record<string, unknown> => !!x);
}

// ── translation choices ────────────────────────────────────────────────────
// How the English translators render an Arabic feature (qr_052; the choices are computed offline).
//   L1 who       a rendering with a strong signature → whose is it? (the others rarely take that choice)
//   L2 strategy  a rendering, its Arabic feature marked → which named strategy does it take?
//   L3 compare   3–4 renderings of one āyah → which one follows X (the registry's compare_json)
// Only translations complete enough for the feature (profile total ≥ coverage × its āyāt) are drilled.

type TSpot = { feature: string; surah: number; ayah: number; word_indexes: string; ar_words: string | null };
type TRow = { surah: number; ayah: number; source_id: string; choice: string; evidence: string | null; value: number | null };
type TDraft = { ask: 'who' | 'strategy' | 'compare'; f: TFeature; spot: TSpot; key: string; prompt: string; options: string[]; answer: string;
                note: { en: string; ar: string }; explanation: string; front: string; back: string };
type TSources = Awaited<ReturnType<typeof tSources>>;

const TINT = '#F2CC8F';
const pick = <T>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
const pct = (x: number) => `${Math.round(x * 100)}%`;
const clip = (t: string, n = 420) => (t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, '') + ' …' : t);
/// a rendering as shown — long enough that the words its choice was read from are in it (null if they are not)
const shownWith = (t: string, evidence: string | null, n: number) => { const c = clip(t, n); return !evidence || c.includes(evidence) ? c : null; };
/// a choice's label, in quotes unless it has its own
const quoted = (s: string) => (/^[“"‘]/.test(s) ? s : `“${s}”`);

function spotsFor(env: QuranEnv, feature: string, scope: Scope, k: number) {
  const w = scopeWhere(scope);
  return query<TSpot>(env.DB_QR,
    `SELECT feature, surah, ayah, word_indexes, ar_words FROM qr_translation_feature_ayah WHERE feature = ? AND ${w.sql}
      ORDER BY random() LIMIT ?`, [feature, ...w.args, k]);
}

/// the choices at these āyāt (by the choice table's key: āyah, feature, translation)
async function choicesAt(env: QuranEnv, feature: string, spots: TSpot[], extra = '', extraArgs: string[] = []) {
  const out: TRow[] = [];
  for (let i = 0; i < spots.length; i += 30) {
    const part = spots.slice(i, i + 30);
    out.push(...await query<TRow>(env.DB_QR,
      `SELECT surah, ayah, source_id, choice, evidence, value FROM qr_translation_choice
        WHERE (${part.map(() => '(surah = ? AND ayah = ?)').join(' OR ')}) AND feature = ? ${extra}`,
      [...part.flatMap((s) => [s.surah, s.ayah]), feature, ...extraArgs]));
  }
  return out;
}

/// renderings by (translation, surah, āyah) — the translation table's unique key
async function textsOf(env: QuranEnv, keys: Array<{ source_id: string; surah: number; ayah: number }>) {
  const out = new Map<string, string>();
  const uniq = [...new Map(keys.map((k) => [`${k.source_id}|${k.surah}:${k.ayah}`, k])).values()];
  for (let i = 0; i < uniq.length; i += 30) {
    const part = uniq.slice(i, i + 30);
    const rows = await query<{ source_id: string; surah: number; ayah: number; text: string }>(env.DB_QR,
      `SELECT source_id, surah, ayah, translation_text AS text FROM qr_translation
        WHERE ${part.map(() => '(source_id = ? AND surah = ? AND ayah = ?)').join(' OR ')}`,
      part.flatMap((k) => [k.source_id, k.surah, k.ayah]));
    for (const r of rows) out.set(`${r.source_id}|${r.surah}:${r.ayah}`, cleanText(r.text));
  }
  return out;
}

/// translations complete enough for each feature
function completeOf(fs: TFeature[], prof: ProfileRow[], coverage: number) {
  const nAyat = new Map(fs.map((f) => [f.key, f.nAyat]));
  const out = new Map<string, Set<string>>();
  for (const p of prof) if (p.total >= coverage * (nAyat.get(p.feature) ?? 0)) (out.get(p.feature) ?? out.set(p.feature, new Set()).get(p.feature)!).add(p.source_id);
  return out;
}

async function translationDrills(env: QuranEnv, n: number, scope: Scope, band: Band, levels: Levels) {
  const asks = band === 'all' ? ['who', 'strategy', 'compare'] : [String(levels[band]?.ask ?? 'strategy')];
  const [fs, src, prof] = await Promise.all([tFeatures(env), tSources(env), tProfiles(env)]);
  if (!fs.length) return [];
  const per = Math.ceil(n / asks.length);
  const drafts: TDraft[] = [];
  for (const ask of asks) {
    const lv = (band === 'all' ? Object.values(levels).find((l) => l.ask === ask) : levels[band]) ?? {};
    const complete = completeOf(fs, prof, Number(lv.coverage ?? 0.9));
    const got = ask === 'who' ? await whoDrafts(env, fs, src, prof, complete, per, scope, lv)
      : ask === 'compare' ? await compareDrafts(env, fs, src, complete, per, scope, lv)
      : await strategyDrafts(env, fs, src, complete, per, scope, lv);
    drafts.push(...got.slice(0, per));
  }
  const picked = shuffle(drafts).slice(0, n);
  const ayat = await loadAyat(env, [...new Map(picked.map((d) => [`${d.spot.surah}:${d.spot.ayah}`, [d.spot.surah, d.spot.ayah]])).values()]);
  return picked.map((d) => {
    const a = ayat.get(`${d.spot.surah}:${d.spot.ayah}`);
    if (!a) return null;
    const idx = d.spot.word_indexes ? d.spot.word_indexes.split(',').map(Number) : [];
    const span = idx.map((i) => a.ws.findIndex((w) => w.word_index === i)).filter((i) => i >= 0);
    const drill: Record<string, unknown> = {
      id: `translation:${d.key}`, kind: 'feature', ask: `translation_${d.ask}`, script: 'quran', audio: a.audio, words: a.words, en: null,
      span, prompt: d.prompt, options: d.options, answer: d.answer, note: d.note, explanation: d.explanation,
      badges: [{ label: d.f.label, labelAr: d.f.labelAr, color: TINT }],
      source: { workId: `QR:SURAH:${a.surah}`, title: a.title, level: null },
    };
    return withCard(drill, { ref: `QR:translation:${d.key}`, type: 'translation', kind: 'translation', band,
      front: d.front, back: d.back, surah: a.surah, ayah: a.ayah, series: a.title.replace(/ \d+:\d+$/, '') });
  }).filter((x): x is Record<string, unknown> => !!x);
}

/// L1 — a rendering with a translator's signature choice: whose is it?
async function whoDrafts(env: QuranEnv, fs: TFeature[], src: TSources, prof: ProfileRow[], complete: Map<string, Set<string>>,
                         n: number, scope: Scope, lv: Record<string, unknown>): Promise<TDraft[]> {
  const byKey = new Map(fs.map((f) => [f.key, f]));
  const minShare = Number(lv.minShare ?? 0.5), minLift = Number(lv.minLift ?? 2), maxOther = Number(lv.maxOtherShare ?? 0.15);
  const sigs = shuffle(prof.filter((p) => {
    const f = byKey.get(p.feature);
    return f && f.key !== 'length_ratio' && p.choice !== fallbackOf(f) && p.share >= minShare && (p.lift ?? 0) >= minLift
      && complete.get(p.feature)?.has(p.source_id);
  }));
  // one signature per translator, as far as they go round
  const seen = new Set<string>();
  const order = [...sigs.filter((s) => !seen.has(s.source_id) && seen.add(s.source_id)), ...sigs];
  const tries = order.slice(0, n * 2);
  const built = await Promise.all(tries.map(async (sig): Promise<TDraft | null> => {
    const f = byKey.get(sig.feature)!;
    const spots = await spotsFor(env, f.key, scope, 30);
    if (!spots.length) return null;
    const mine = await choicesAt(env, f.key, spots, 'AND source_id = ? AND choice = ?', [sig.source_id, sig.choice]);
    if (!mine.length) return null;
    const hit = pick(mine);
    const spot = spots.find((s) => s.surah === hit.surah && s.ayah === hit.ayah)!;
    const here = await choicesAt(env, f.key, [spot]);
    const shareOf = new Map(prof.filter((p) => p.feature === f.key && p.choice === sig.choice).map((p) => [p.source_id, p.share]));
    const names = new Set([src.get(sig.source_id)?.translator]);
    const others = shuffle(here.filter((r) => r.source_id !== sig.source_id && r.choice !== sig.choice && complete.get(f.key)?.has(r.source_id)
      && (shareOf.get(r.source_id) ?? 0) <= maxOther))
      .filter((r) => { const nm = src.get(r.source_id)?.translator; if (!nm || names.has(nm)) return false; names.add(nm); return true; })
      .slice(0, 3);
    if (others.length < 3) return null;
    const texts = await textsOf(env, [{ source_id: sig.source_id, surah: hit.surah, ayah: hit.ayah }]);
    const full = texts.get(`${sig.source_id}|${hit.surah}:${hit.ayah}`);
    const text = full ? shownWith(full, hit.evidence, 700) : null;
    if (!text) return null;
    const who = src.get(sig.source_id)!.translator;
    const label = choiceLabel(f, sig.choice);
    const rest = others.map((r) => `${src.get(r.source_id)!.translator} ${pct(shareOf.get(r.source_id) ?? 0)}`).join(', ');
    return {
      ask: 'who', f, spot, key: `who:${sig.source_id}:${f.key}:${hit.surah}:${hit.ayah}`,
      prompt: `“${text}”`, options: shuffle([who, ...others.map((r) => src.get(r.source_id)!.translator)]), answer: who,
      note: { en: `${who} — ${label}`, ar: f.labelAr ?? '' },
      explanation: `${f.label}: ${who} takes ${quoted(label)}${hit.evidence ? ` (here: “${hit.evidence}”)` : ''} in ${pct(sig.share)} of the ${sig.total} āyāt `
        + `— ${sig.lift ? `${Math.round(sig.lift * 10) / 10}× the translators' average` : 'a signature'}. The others here: ${rest}.`,
      front: `“${clip(text, 300)}”\n— whose rendering?`, back: `${who}\n${f.label}: ${label}${hit.evidence ? ` — “${hit.evidence}”` : ''} (${pct(sig.share)} of ${sig.total})`,
    };
  }));
  return built.filter((x): x is TDraft => !!x);
}

/// L2 — a rendering, the Arabic feature marked: which named strategy does it take?
async function strategyDrafts(env: QuranEnv, fs: TFeature[], src: TSources, complete: Map<string, Set<string>>,
                              n: number, scope: Scope, lv: Record<string, unknown>): Promise<TDraft[]> {
  const allowed = (lv.features as string[] | undefined) ?? fs.map((f) => f.key);
  const pool = fs.filter((f) => allowed.includes(f.key) && f.choices.length >= 3);
  if (!pool.length) return [];
  const want = new Map<TFeature, number>();
  for (let i = 0; i < n + 2; i++) { const f = pick(pool); want.set(f, (want.get(f) ?? 0) + 1); }
  const built = await Promise.all([...want.entries()].map(async ([f, k]) => {
    const spots = await spotsFor(env, f.key, scope, k + 2);
    const rows = spots.length ? await choicesAt(env, f.key, spots) : [];
    const drafts: Array<{ spot: TSpot; row: TRow; present: string[] }> = [];
    for (const spot of spots) {
      const here = rows.filter((r) => r.surah === spot.surah && r.ayah === spot.ayah && complete.get(f.key)?.has(r.source_id));
      const present = [...new Set(here.map((r) => r.choice))];
      if (!present.length) continue;
      const choice = pick(present);                     // every strategy the āyah shows has the same chance
      drafts.push({ spot, row: pick(here.filter((r) => r.choice === choice)), present });
    }
    const texts = await textsOf(env, drafts.map((d) => ({ source_id: d.row.source_id, surah: d.spot.surah, ayah: d.spot.ayah })));
    return drafts.map(({ spot, row, present }): TDraft | null => {
      const full = texts.get(`${row.source_id}|${spot.surah}:${spot.ayah}`);
      const text = full ? shownWith(full, row.evidence, 700) : null;
      if (!text) return null;
      const answer = choiceLabel(f, row.choice);
      const wrong = [...new Set([...shuffle(present), ...shuffle(f.choices.map((c) => c.key))])].filter((c) => c !== row.choice)
        .slice(0, 3).map((c) => choiceLabel(f, c));
      const who = src.get(row.source_id)?.translator ?? row.source_id;
      const marked = spot.ar_words ? ` ${spot.ar_words}` : '';
      const ev = f.key === 'length_ratio' ? `${row.value} English words for each Arabic word` : row.evidence ? `“${row.evidence}”` : 'no marker for it';
      return {
        ask: 'strategy', f, spot, key: `strategy:${f.key}:${spot.surah}:${spot.ayah}:${row.source_id}`,
        prompt: `“${text}”`, options: shuffle([answer, ...wrong]), answer,
        note: { en: `${f.label} — ${answer}`, ar: f.labelAr ?? '' },
        explanation: `${who}: ${ev}. ${f.detail ?? ''}`.trim(),
        front: `${f.label}${marked}\n“${clip(text, 300)}” (${who})\n— which strategy?`, back: `${answer}\n${ev}`,
      };
    }).filter((x): x is TDraft => !!x);
  }));
  return shuffle(built.flat());
}

/// L3 — 3–4 renderings of one āyah: which follows X?
async function compareDrafts(env: QuranEnv, fs: TFeature[], src: TSources, complete: Map<string, Set<string>>,
                             n: number, scope: Scope, lv: Record<string, unknown>): Promise<TDraft[]> {
  const k = Math.max(3, Math.min(4, Number(lv.options ?? 4)));
  const pool = fs.filter((f) => f.compare.length);
  if (!pool.length) return [];
  const want = new Map<TFeature, number>();
  for (let i = 0; i < n + 2; i++) { const f = pick(pool); want.set(f, (want.get(f) ?? 0) + 1); }
  const built = await Promise.all([...want.entries()].map(async ([f, cnt]) => {
    const spots = await spotsFor(env, f.key, scope, cnt * 3);
    const rows = spots.length ? await choicesAt(env, f.key, spots) : [];
    const sets: Array<{ spot: TSpot; q: typeof f.compare[number]; answer: TRow; others: TRow[] }> = [];
    for (const spot of spots) {
      if (sets.length >= cnt) break;
      const here = shuffle(rows.filter((r) => r.surah === spot.surah && r.ayah === spot.ayah && complete.get(f.key)?.has(r.source_id)));
      const q = pick(f.compare);
      if (q.by) {
        const chosen = distinctBy(here, (r) => String(r.value)).slice(0, k).sort((a, b) => (a.value ?? 0) - (b.value ?? 0));
        if (chosen.length < k) continue;
        const [ans, next] = q.by === 'min_value' ? [chosen[0], chosen[1]] : [chosen[k - 1], chosen[k - 2]];
        if (Math.abs((ans.value ?? 0) - (next.value ?? 0)) < 0.15) continue;   // a clear winner only
        sets.push({ spot, q, answer: ans, others: chosen.filter((r) => r !== ans) });
      } else {
        const yes = here.filter((r) => q.yes?.includes(r.choice));
        const no = here.filter((r) => q.no?.includes(r.choice));
        if (!yes.length) continue;
        // the wrong ones: different strategies first, then more of the same
        const byChoice = new Map<string, TRow[]>();
        for (const r of no) byChoice.set(r.choice, [...(byChoice.get(r.choice) ?? []), r]);
        const others: TRow[] = [];
        for (let round = 0; others.length < k - 1 && round < 4; round++)
          for (const rs of byChoice.values()) if (rs[round] && others.length < k - 1) others.push(rs[round]);
        if (others.length < k - 1) continue;
        sets.push({ spot, q, answer: yes[0], others });
      }
    }
    const texts = await textsOf(env, sets.flatMap((s) => [s.answer, ...s.others].map((r) => ({ source_id: r.source_id, surah: s.spot.surah, ayah: s.spot.ayah }))));
    return sets.map(({ spot, q, answer, others }): TDraft | null => {
      const all = [answer, ...others];
      const textOf = (r: TRow) => texts.get(`${r.source_id}|${spot.surah}:${spot.ayah}`);
      if (all.some((r) => !textOf(r))) return null;
      const shown = all.map((r) => shownWith(textOf(r)!, r.evidence, 600));
      if (shown.some((t) => !t) || new Set(shown).size < shown.length) return null;
      const say = (r: TRow) => `${src.get(r.source_id)?.translator ?? r.source_id} — ${choiceLabel(f, r.choice)}`
        + (f.key === 'length_ratio' ? ` (${r.value} English words per Arabic word)` : r.evidence ? ` (“${r.evidence}”)` : '');
      const qi = f.compare.indexOf(q);
      return {
        ask: 'compare', f, spot, key: `compare:${f.key}:${qi}:${spot.surah}:${spot.ayah}`,
        prompt: q.ask, options: shuffle(shown as string[]), answer: shown[0]!,
        note: { en: `${src.get(answer.source_id)?.translator ?? ''} — ${choiceLabel(f, answer.choice)}`, ar: f.labelAr ?? '' },
        explanation: `${all.map(say).join(' · ')}. ${f.detail ?? ''}`.trim(),
        front: `${q.ask}\n${spot.surah}:${spot.ayah}${spot.ar_words ? ` — ${spot.ar_words}` : ''}`, back: `${say(answer)}\n“${clip(textOf(answer)!, 300)}”`,
      };
    }).filter((x): x is TDraft => !!x);
  }));
  return shuffle(built.flat());
}

function distinctBy<T>(xs: T[], key: (x: T) => string) {
  const seen = new Set<string>();
  return xs.filter((x) => { const k = key(x); if (seen.has(k)) return false; seen.add(k); return true; });
}
