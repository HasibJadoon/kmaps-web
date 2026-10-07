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
import { irabBookDrills, irabBookCount } from './practice-irabbooks';
import { gramTermDrills, gramTermCounts } from './practice-grammar';
import { lexiconDrills } from './practice-lexicon';
import { vocabDrills, vocabCount, pairsDrills } from './practice-vocab';
import { arc2Drills } from './practice-arc2';
import { surahLexDrills, surahLexCounts } from './practice-surah-lex';
import { groupDrills, groupsCount } from './practice-groups';
import { ssDrills, ssCount } from './practice-ss';
import { structureDrills, structureCount } from './practice-structure';
import { questionDrills, tafsirDrillsQ, questionsCount, tafsirReadDrills, tafsirLangDrills, listenWorks } from './practice-tafsirq';
import { sarfDrills, sarfSheet, lexiconRoot, lexiconLemma } from './practice-sarf';

/** Bump when the الصرف sheet's JSON changes shape or wording rules, so the edge cache starts afresh. */
const SARF_SHEET_V = '2026-10-07g'
const LEX_PAGE_V = '2026-10-07g';

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

const RECITER = 7;
const BOOKS: Record<string, string> = { qul_irab_quran_daas: 'al-Daʿʿās, Iʿrāb al-Qurʾān' };
export type Band = 'basic' | 'middle' | 'advanced' | 'all';
type Levels = Record<string, Record<string, unknown>>;
export type Scope = { surah: number | null; from: number | null; to: number | null };

const shuffle = <T>(xs: T[]) => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const cap = (s: string | null | undefined) => (s ?? '').replace(/^\w/, (c) => c.toUpperCase());
/// letters only, for matching words across spellings
const fold = (w: string) => (w ?? '').replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, '')
  .replace(/[ٱأإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[^ء-ي]/g, '');
const loose = (w: string) => fold(w).replace(/[اوي]/g, '');

export function practiceRoutes(router: Router<QuranEnv>) {
  // the passage's commentary, to read and follow (the passage study's commentary section): the four
  // works over the passage, every line timed, with its English and its terms — public, like the atlas
  router.get('/qr/tafsir/passage', async (req, env) => {
    const u = new URL(req.url);
    const surah = Number(u.searchParams.get('surah')), from = Number(u.searchParams.get('from')), to = Number(u.searchParams.get('to'));
    if (!Number.isInteger(surah) || surah < 1 || !Number.isInteger(from) || from < 1) return badRequest('surah and from are required');
    const [works, L] = await Promise.all([listenWorks(env, WORKS, { surah, from, to: Number.isInteger(to) && to >= from ? to : from }), labels(env)]);
    // each work is studied in four views (qr_study_label tafsir_view), with the words its screens say (tafsir_ui)
    return ok({ works, views: L.tafsir_view ?? [], ui: L.tafsir_ui ?? [] });
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
    if (!/^(AL:)?[0-9a-f]{20,}$/.test(id)) return badRequest('id is a lemma\'s global id (AL:…)');
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
      query<{ n: number }>(env.DB_QR, `SELECT COALESCE(SUM(n_ayat), 0) AS n FROM qr_translation_feature`).catch(() => [{ n: 0 }]),
      al<{ grammar: number; balagha: number; idiom: number; arc: number }>(env, '/al/drill/counts').catch(() => null),
    ]);
    const [tafsir, irabbooks, gram, vocab, ss] = await Promise.all([tafsirCount(env).catch(() => 0), irabBookCount(env).catch(() => 0),
                                                         gramTermCounts(env, L.skill ?? []).catch(() => ({} as Record<string, number>)),
                                                         vocabCount(env).catch(() => 0), ssCount(env).catch(() => 0)]);
    const structure = await structureCount(env).catch(() => 0);
    const asked = await questionsCount(env).catch(() => ({ questions: 0, tafsirq: 0 }));
    const n: Record<string, number> = { irab: irab[0]?.n ?? 0, lines: ayat[0]?.n ?? 0, translation: tr[0]?.n ?? 0, tafsir, irabbooks, vocab, pairs: Math.floor(vocab / 5), ss, structure, ...asked, ...(counts ?? {}), ...gram, ...(await surahLexCounts(env).catch(() => ({}))), groups: await groupsCount(env, L).catch(() => 0) };
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
                                scope: Scope, u: URL | null = null, only?: string[]): Promise<Array<Record<string, unknown>>> {
  const meta = byKey(L.skill).get(skill);
  if (!meta) return [];
  const levels = (meta.extra?.levels ?? {}) as Levels;
  // a class step may hold only some of a skill's asks (class_node extra.only): those, at every level
  const lv = only?.length ? { asks: only, types: only } : band === 'all' ? {} : (levels[band] ?? {});
  const src = String(meta.extra?.source ?? skill);
  const items =
    src === 'irab' ? await irabDrills(env, n, scope, lv, band, levels)
    : src === 'lines' ? await lineDrills(env, skill, n, scope, lv, !!meta.extra?.timed, meta.extra?.interaction as string | undefined)
    : src === 'gram' ? await gramDrills(env, skill, String(meta.extra?.discipline ?? 'NH'), n, scope, lv)
    : src === 'idiom' ? await idiomDrills(env, n, scope, lv, L)
    : src === 'arc' ? await arcDrills(env, n, lv, L)
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
    : src === 'ss' ? await ssDrills(env, n, scope, lv, L)
    : src === 'structure' ? await structureDrills(env, n, scope, lv, L)
    : src === 'questions' ? await questionDrills(env, n, scope)
    : src === 'tafsirq' ? await tafsirDrillsQ(env, meta.extra?.interaction === 'listen_mark' ? 'listen' : 'meaning', n, scope)
    : src === 'sarf' ? await sarfDrills(env, n, scope)
    : src === 'tafsir_read' || src === 'tafsir_hear'
      ? (await tafsirReadDrills(env, scope, (meta.extra?.works as string[] | undefined) ?? WORKS, src === 'tafsir_hear')).slice(0, n)
    : src === 'tafsir_lang' ? (await tafsirLangDrills(env, scope, (meta.extra?.works as string[] | undefined) ?? WORKS)).slice(0, n)
    : [];
  const kinds = byKey(L.kind);
  const shaped = items.map((it) => {
    const k = kinds.get(String(it.ask ?? skill)) ?? kinds.get(skill);
    const { ask: _a, ...rest } = it;
    return { ...rest, instruction: k?.label ?? null, instructionAr: k?.labelAr ?? null };
  });
  // every drill carries the registry terms its own rows name
  return attachGt(env.DB_QR, shaped as Array<Record<string, unknown>>);
}

// ── shared ──────────────────────────────────────────────────────────────────

function al<T>(env: QuranEnv, path: string): Promise<T> {
  if (!env.AR_LINGUISTICS) return Promise.reject(new Error('no AL binding'));
  return env.AR_LINGUISTICS.fetch(`https://al${path}`).then((r) => r.json() as Promise<{ data: T }>).then((j) => j.data);
}

type Word = { word_index: number; word_text: string; pos: string | null; lemma: string | null; is_content_word: number | null };
type Ayah = { key: string; surah: number; ayah: number; ws: Word[]; words: { t: string; s: number; e: number }[]; aligned: boolean;
              audio: { url: string; start: number; end: number } | null; en: string | null; title: string };

/// Each āyah with its words, their times in the recitation (where it numbers the words as the
/// corpus does), its clip, its default English, and where it stands.
async function loadAyat(env: QuranEnv, pairs: number[][]): Promise<Map<string, Ayah>> {
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
    out.set(key, {
      key, surah: s, ayah: a, ws, aligned, en: enOf.get(key) ?? null,
      title: `${names.get(s) ?? 'Surah ' + s} ${s}:${a}`,
      words: ws.map((w) => { const t = aligned ? at.get(w.word_index) : undefined; return { t: w.word_text, s: t ? t[1] / 1000 : 0, e: t ? t[2] / 1000 : 0 }; }),
      audio: r ? { url: r.audio_url, start: r.start_ms / 1000, end: r.end_ms / 1000 } : null,
    });
  }
  return out;
}

/// The review card every drill files: the whole drill kept so review replays it, and where it sits.
function withCard(drill: Record<string, unknown>, a: { ref: string; type: string; kind: string; front: string; back: string;
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
                  prefix_count: number | null };
/** The particle a word carries in front (وَ فَ بِ لِ كَ سَ), or none — a gap's word and its options share it. */
const leadingConj = (w: PoolWord) => (Number(w.prefix_count ?? 0) > 0 && /^[وفبلكس]/.test(w.word_text) && !/^ال/.test(w.word_text) ? w.word_text[0] : '');

/** Three words that fit the gap the target leaves: its part of speech, definite or not like it, in
 *  its case, with its leading وَ / فَ — so the gap's form gives nothing away — one form per lemma, and
 *  for a word heard, close to it in length. Loosened step by step only when the sūra has too few. */
export function gapFillers(target: PoolWord, pool: PoolWord[], heard: boolean): string[] {
  const len = (w: string) => fold(w).length;
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
  const pairs = await pickAyat(env, scope, minW, maxW, n * (timed ? 3 : 2));
  const ayat = [...(await loadAyat(env, pairs)).values()].filter((a) => a.ws.length && (!timed || a.aligned));
  // the other words to choose from: content words of the same surahs
  const surahIds = [...new Set(ayat.map((a) => a.surah))];
  const pool = surahIds.length ? await query<PoolWord>(env.DB_QR,
    `SELECT DISTINCT word_text, pos, lemma, gt_case, has_det_prefix, prefix_count FROM qr_word_occurrence
      WHERE surah IN (${surahIds.map(() => '?').join(',')}) AND is_content_word = 1 LIMIT 3000`, surahIds) : [];
  const facts = surahIds.length ? await query<PoolWord & { surah: number; ayah: number; word_index: number }>(env.DB_QR,
    `SELECT surah, ayah, word_index, word_text, pos, lemma, gt_case, has_det_prefix, prefix_count FROM qr_word_occurrence
      WHERE (surah, ayah) IN (SELECT json_extract(value, '$[0]'), json_extract(value, '$[1]') FROM json_each(?))`, [JSON.stringify(pairs)]) : [];
  const factOf = new Map(facts.map((f) => [`${f.surah}:${f.ayah}:${f.word_index}`, f]));
  const out: Record<string, unknown>[] = [];
  for (const a of ayat) {
    if (out.length >= n) break;
    const base: Record<string, unknown> = { id: `${skill}:${a.key}`, kind: skill, script: 'quran', audio: a.audio, words: a.words, en: a.en,
                                            source: { workId: `QR:SURAH:${a.surah}`, title: a.title, level: null } };
    // a skill row may name its interaction (mark: listen, then tap each word not caught)
    if (interaction) base.interaction = interaction;
    const line = a.ws.map((w) => w.word_text).join(' ');
    const card = (front: string, back: string) => withCard(base, { ref: `QR:${skill}:${a.key}`, type: 'passage', kind: skill, front, back,
                                                                   surah: a.surah, ayah: a.ayah, series: a.title.replace(/ \d+:\d+$/, '') });
    if (skill === 'fill' || skill === 'hear') {
      const content = a.ws.map((w, i) => ({ w, i })).filter(({ w, i }) => (w.is_content_word ?? 0) === 1 && fold(w.word_text).length >= 3
        && (skill !== 'hear' || a.words[i].e - a.words[i].s >= 0.25));
      if (!content.length) continue;
      const pick = content[Math.floor(Math.random() * content.length)];
      const answer = pick.w.word_text;
      const target = factOf.get(`${a.surah}:${a.ayah}:${pick.w.word_index}`);
      const wrong = gapFillers(target ?? { word_text: answer, pos: pick.w.pos, lemma: pick.w.lemma, gt_case: null, has_det_prefix: null, prefix_count: null },
                               pool, skill === 'hear');
      if (wrong.length < 3) continue;
      const options = shuffle([answer, ...wrong]);
      if (skill === 'fill') { base.blank = pick.i; base.answer = answer; base.options = options; }
      else {
        const t = a.words[pick.i];
        base.audio = { ...a.audio!, start: Math.max(a.audio!.start, t.s - 0.04), end: Math.min(a.audio!.end, t.e + 0.08) };
        base.target = pick.i; base.answer = answer; base.options = options; base.line = a.audio;
      }
      out.push(card(line.replace(answer, '＿＿＿'), `${answer}\n${line}`));
    } else if (skill === 'order') {
      const order = a.ws.map((_, i) => i);
      let sh = shuffle(order);
      for (let k = 0; k < 4 && sh.every((v, i) => v === i); k++) sh = shuffle(order);
      base.shuffled = sh;
      out.push(card(a.en ?? a.title, line));
    } else {
      out.push(card(a.en ?? a.title, line));   // shadow: the āyah and its timings
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
  const pool = await query<IrabItem>(env.DB_QR,
    `SELECT id, surah, ayah, word_index, word_text, role_gt, irab_ar, source_slug FROM qr_irab_drill_item
      WHERE ${w.sql} ${roles ? `AND role_gt IN (${roles.map(() => '?').join(',')})` : ''} ${alt ? `AND irab_ar LIKE '%ويجوز%'` : ''}
      ORDER BY random() LIMIT ?`, [...w.args, ...(roles ?? []), n * 4]);
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
  const optionOf = (gt: string) => { const t = name.get(gt); return t ? (t.name_en ? `${cap(t.name_en)} · ${t.name_ar}` : t.name_ar) : null; };
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
      span: idx >= 0 ? [idx] : [], prompt: `What is the iʿrāb of ${it.word_text}?`,
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
    const drill: Record<string, unknown> = {
      id: `${skill}:${e.id}`, kind: 'feature', script: 'quran', audio: a.audio, words: a.words, en: a.en,
      span: spanOf(a.ws, e.exampleAr), prompt: skill === 'balagha' ? 'Which figure of rhetoric is at work in the marked words?' : 'Which grammar term names the marked words?',
      options: shuffle([answer, ...others]), answer,
      note: { en: cap(e.nameEn), ar: e.nameAr }, explanation: e.definition,
      source: { workId: `QR:SURAH:${a.surah}`, title: a.title, level: null },
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

type Arc = { id: string; root: string; title: string | null; titleAr: string | null; steps: Array<{ n: number; en: string; gloss: string | null; ar: string }> };

async function arcDrills(env: QuranEnv, n: number, lv: Record<string, unknown>, L: Record<string, Label[]>) {
  const qs = new URLSearchParams({ n: String(n), minSteps: String(lv.minSteps ?? 2), maxSteps: String(lv.maxSteps ?? 20) });
  const res = await al<{ items: Arc[] }>(env, `/al/drill/arcs?${qs}`).catch(() => ({ items: [] as Arc[] }));
  const ask = String(lv.ask ?? 'order');
  const rootOf = (r: string) => r.split('').join(' ');
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
      const drill: Record<string, unknown> = {
        id: `arc:origin:${arc.id}`, kind: 'gist', ask: 'arc_origin',
        prompt: `Where does the meaning of ${rootOf(arc.root)} start?`, options: shuffle([answer, ...wrong]), answer,
        en: steps.map((s) => s.en).join(' → '), source,
      };
      return withCard(drill, { ref: `QR:arc:origin:${arc.id}`, type: 'root', kind: 'arc',
        front: `${rootOf(arc.root)} — first image?`, back: steps.map((s) => s.en).join(' → ') });
    }
    const order = steps.map((_, i) => i);
    let sh = shuffle(order);
    for (let k = 0; k < 4 && sh.every((v, i) => v === i); k++) sh = shuffle(order);
    const drill: Record<string, unknown> = {
      id: `arc:order:${arc.id}`, kind: 'dialogue', ask: 'arc_order',
      prompt: `${rootOf(arc.root)} — from its first image to its last sense`,
      dialogue: steps.map((s) => ({ speaker: null, ar: s.ar || s.en, en: [s.en, s.gloss].filter(Boolean).join(' — '), clip: clips[s.ar]?.audio ?? null })),
      shuffled: sh, source,
    };
    return withCard(drill, { ref: `QR:arc:order:${arc.id}`, type: 'root', kind: 'arc',
      front: `${rootOf(arc.root)} — order its senses`, back: steps.map((s) => s.en).join(' → ') });
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
