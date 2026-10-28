import { query } from '../../../shared/src/db';
import type { QuranEnv } from '../env';
import type { Label } from '../lib/labels';
import { loadAyat, withCard, levelOf, shuffle, uniq, parseJson, type Ayah, type Drill, type Scope } from './practice-kit';

// ── Surah vocabulary (QR skill 'vocab') ──────────────────────────────────────
// A surah's words, lemma by lemma, each drilled in its āyah (the word marked, al-ʿAfāsī's recitation)
// and filed as a review card (module QR, kind 'vocab'). The rows are precomputed (qr_056; kmaps-resources
// scripts/quran/vocab_items.py): every content word with its lemma, root, frequency tier and gloss, and
// the senses the sources place THIS āyah under — al-Rāghib's Mufradāt (his own gloss over the run of
// quotations), Lane's sense blocks (his Qurʾān references), Mir's verbal idioms and the sense arcs —
// each set among the other senses the same source gives the root in the Qurʾān (its range).
// What a word means HERE comes from the books (qr_058, scripts/quran/vocab_meanings.py → qr_vocab_gloss):
// every gloss the tafsīrs, the iʿrāb books, the lexicons and the grammar books give it in this āyah,
// verbatim with its citation, and one of them, by source priority, the primary (a source naming the
// āyah > tafsīr consensus > the iʿrāb books > one tafsīr > …; never Lane's first headword sense).
//
//   L1 vocab_root · vocab_lemma · vocab_meaning     — the scope's frequent lemmas first
//   L2 vocab_family · vocab_kin · vocab_form · vocab_who   — the root's family; which book glosses it so
//   L3 vocab_range · vocab_same · vocab_rung · vocab_books — only words a source places; how the books gloss it
// A surah session walks the surah's medium-to-super verbs, nouns and adjectives (qr_vocab_grade), medium first,
// a little shuffled, and the places where a word is hard come first — an idiom, a meaning the books dispute,
// a word the schools debate, an iʿrāb the books split on (qr_vocab_flag). A common word comes only at such a
// place. The drills in āyah order; each carries its grade and its flags, the source quoted. The asks a level has come from qr_study_label (skill.extra_json.levels).

type Item = { surah: number; ayah: number; word_index: number; word_text: string; root: string; lemma: string | null; pos: string | null;
              form_roman: string | null; wazn_ar: string | null; lemma_n: number; root_n: number; tier: number; n_lemmas: number;
              gloss_en: string | null; gloss_ref: string | null; here_en: string | null; here_ref: string | null; here_sense: string | null;
              senses_json: string | null };
type Group = { root: string; lemma: string; tier: number; first: number; k: number; nl: number; pos: string | null;
               gloss: string | null; wazn: string | null; lemma_n: number; placed: number; grade: string; flagged: number };
type Flag = { surah: number; ayah: number; word_index: number; kind: string; detail: string | null; ref: string | null; quote_ar: string | null };
/// the walk: medium → hard → super (qr_120; scripts/quran/vocab_grade.py)
const GRADE_RANK: Record<string, number> = { medium: 0, hard: 1, super: 2, common: 1 };
type Gloss = { surah: number; ayah: number; word_index: number; lang: string; text: string; source_slug: string; source_kind: string;
               citation: string; method: string; confidence: string; rank: number; role: string | null; grp: number | null; quote_ar: string | null };
type Prim = { root: string; lemma: string; lang: string; text: string; source_kind: string; source_slug: string };
type Core = { root: string; source_slug: string; text_ar: string | null; text_en: string | null; citation: string };
type Sense = { id: string; source: string; root: string; head_ar: string | null; label_ar: string | null; label_en: string | null;
               kind: string | null; marker: string | null; page: string | null; seq: number | null; group_key: string; ref: string;
               ayat_json: string; n_ayat: number; arc_json: string | null };
type Fam = { root: string; lemma: string; wazn: string | null; gloss: string | null; gloss_ref: string | null; n: number; at: number };

const COLOR = '#4FB3A9';
const SRC: Record<string, { en: string; ar: string; color: string }> = {
  raghib_mufradat: { en: 'al-Rāghib, al-Mufradāt', ar: 'المفردات', color: '#4FB3A9' },
  lane_lexicon: { en: 'Lane, Lexicon', ar: 'معجم لين', color: '#5DA9E9' },
  mir_verbal_idioms: { en: 'Mir, Verbal Idioms', ar: 'التعبيرات الفعلية', color: '#F4A261' },
  sense_arc: { en: 'Sense arc', ar: 'سُلَّم المعنى', color: '#B388EB' },
};
/// the books that gloss a word in its āyah (qr_vocab_gloss.source_slug) — a short name and the Arabic
const BOOK: Record<string, { en: string; ar: string }> = {
  razi: { en: 'al-Rāzī', ar: 'الرازي' }, alusi: { en: 'al-Ālūsī', ar: 'الآلوسي' }, zamakhshari: { en: 'al-Zamakhsharī', ar: 'الزمخشري' },
  ibn_ashur: { en: 'Ibn ʿĀshūr', ar: 'ابن عاشور' }, tabari: { en: 'al-Ṭabarī', ar: 'الطبري' }, ibn_atiyya: { en: 'Ibn ʿAṭiyya', ar: 'ابن عطية' },
  abu_hayyan: { en: 'Abū Ḥayyān', ar: 'أبو حيان' }, ibn_kathir: { en: 'Ibn Kathīr', ar: 'ابن كثير' },
  qul_irab_darwish: { en: 'Darwīsh (al-lugha)', ar: 'درويش' }, qul_jadwal_irab_quran: { en: 'al-Jadwal', ar: 'الجدول' },
  qul_irab_muyassar: { en: 'al-Iʿrāb al-Muyassar', ar: 'الإعراب الميسر' }, raghib_mufradat: { en: 'al-Rāghib', ar: 'الراغب' },
  lane_lexicon: { en: 'Lane', ar: 'لين' }, mir_verbal_idioms: { en: 'Mir', ar: 'مير' }, sense_arc: { en: 'Sense arc', ar: 'سلّم المعنى' },
  adima_dirasat: { en: 'ʿUḍayma', ar: 'عضيمة' }, 'ibn-kathir-abridged': { en: 'Ibn Kathīr (English)', ar: 'ابن كثير' },
  maarif: { en: 'Maʿārif al-Qurʾān', ar: 'معارف القرآن' }, tazkir: { en: 'Tazkīr al-Qurʾān', ar: 'تذكير القرآن' },
  kmaps_word_view: { en: 'K-Maps word view', ar: 'K-Maps' },
};
const TAFSIRS = ['razi', 'alusi', 'zamakhshari', 'ibn_ashur', 'tabari', 'ibn_atiyya', 'abu_hayyan', 'ibn_kathir'];
const bookOf = (slug: string) => BOOK[slug] ?? { en: slug.replace(/_/g, ' '), ar: slug };
const LEVEL_ASKS: Record<string, string[]> = { basic: ['vocab_root', 'vocab_lemma', 'vocab_meaning'],
  middle: ['vocab_family', 'vocab_kin', 'vocab_form', 'vocab_who'], advanced: ['vocab_range', 'vocab_same', 'vocab_rung', 'vocab_books'] };
const L3 = new Set(LEVEL_ASKS.advanced.filter((a) => a !== 'vocab_books'));

const fold = (w: string | null | undefined) => (w ?? '').replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, '')
  .replace(/[ٱأإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[^ء-ي]/g, '');
const spaced = (r: string) => fold(r).replace(/\s+/g, ''); // a root is shown joined (نزل), never ن ز ل
const shared = (a: string, b: string) => { const x = [...fold(a)]; return [...fold(b)].filter((c, i) => x[i] === c).length; };
const key = (x: { surah: number; ayah: number; word_index: number }) => `${x.surah}:${x.ayah}:${x.word_index}`;
const norm = (t: string) => fold(t) || t.toLowerCase().replace(/[^a-z ]/g, '').trim();
const clip = (t: string, n = 120) => (t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, '') + ' …' : t);

function scopeSql(s: Scope, alias = '') {
  const p = alias ? `${alias}.` : '';
  return s.surah === null ? { sql: '1=1', args: [] as number[] }
    : s.from && s.to ? { sql: `${p}surah = ? AND ${p}ayah BETWEEN ? AND ?`, args: [s.surah, s.from, s.to] }
    : { sql: `${p}surah = ?`, args: [s.surah] };
}

/// n distinct from a pool, none equal (by `k`) to the answer or to each other
function pickOthers<T>(answer: string, pool: T[], k: (x: T) => string, n = 3): T[] {
  const seen = new Set([answer]);
  const out: T[] = [];
  for (const x of pool) { const v = k(x); if (!v || seen.has(v)) continue; seen.add(v); out.push(x); if (out.length >= n) break; }
  return out;
}

export async function vocabCount(env: QuranEnv): Promise<number> {
  const r = await query<{ n: number }>(env.DB_QR, `SELECT COUNT(*) AS n FROM qr_vocab_item`);
  return r[0]?.n ?? 0;
}

export async function vocabDrills(env: QuranEnv, n: number, scope: Scope, lv: Record<string, unknown>, L: Record<string, Label[]>): Promise<Drill[]> {
  const { band, asks } = levelOf(L, 'vocab', lv);
  const every = lv.every === true;
  const want = asks.length ? asks : LEVEL_ASKS.basic;
  const advanced = want.every((a) => L3.has(a));
  const w = scopeSql(scope);
  // the scope's lemmas: how frequent (tier), where they first stand, whether a source places them
  const wi = scopeSql(scope, 'i');
  const groups = await query<Group>(env.DB_QR,
    `SELECT i.root, i.lemma, MIN(i.tier) AS tier, MIN(i.surah * 1000 + i.ayah) AS first, COUNT(*) AS k, MAX(i.n_lemmas) AS nl, MAX(i.pos) AS pos,
            MAX(i.gloss_en) AS gloss, MAX(i.wazn_ar) AS wazn, MAX(i.lemma_n) AS lemma_n, MAX(i.senses_json IS NOT NULL) AS placed,
            COALESCE(MAX(g.grade), 'common') AS grade,   -- an ungraded lemma is not assumed hard
            SUM(EXISTS (SELECT 1 FROM qr_vocab_flag f WHERE f.surah = i.surah AND f.ayah = i.ayah AND f.word_index = i.word_index)) AS flagged
       FROM qr_vocab_item i LEFT JOIN qr_vocab_grade g ON g.root = i.root AND g.lemma = i.lemma
      WHERE ${wi.sql} AND i.lemma IS NOT NULL AND (COALESCE(g.focus, 1) = 1 OR ?)
      GROUP BY i.root, i.lemma`, [...wi.args, every ? 1 : 0]);
  // common words only where they are flagged — except in a class step that asks for every word of its passage
  const kept = every ? groups : groups.filter((g) => g.grade !== 'common' || g.flagged > 0);
  if (!kept.length) return [];
  // walk: medium → super, the flagged first (a little shuffled within the walk), L3 only what a source places
  const eligible = kept.filter((g) => !advanced || g.placed);
  const order = eligible.map((g) => ({ g, r: GRADE_RANK[g.grade] - (g.flagged ? 1 : 0) + Math.random() * 1.6 }))
    .sort((a, b) => a.r - b.r).map((x) => x.g);
  const chosen = order.slice(0, Math.max(n * 3, 24));
  // their words in scope
  const occ = await query<Item>(env.DB_QR,
    `SELECT surah, ayah, word_index, word_text, root, lemma, pos, form_roman, wazn_ar, lemma_n, root_n, tier, n_lemmas, gloss_en, gloss_ref,
            here_en, here_ref, here_sense, senses_json
       FROM qr_vocab_item WHERE ${w.sql} ${advanced ? 'AND senses_json IS NOT NULL' : ''}
        AND (root, lemma) IN (SELECT json_extract(value, '$[0]'), json_extract(value, '$[1]') FROM json_each(?))`,
    [...w.args, JSON.stringify(chosen.map((g) => [g.root, g.lemma]))]);
  // where each is hard: its flags in scope
  const flagRows = occ.length ? await query<Flag>(env.DB_QR,
    `SELECT surah, ayah, word_index, kind, detail, ref, quote_ar FROM qr_vocab_flag
      WHERE (surah, ayah, word_index) IN (SELECT json_extract(value, '$[0]'), json_extract(value, '$[1]'), json_extract(value, '$[2]') FROM json_each(?))`,
    [JSON.stringify(occ.map((o) => [o.surah, o.ayah, o.word_index]))]) : [];
  const flagsOf = new Map<string, Flag[]>();
  for (const f of flagRows) flagsOf.set(key(f), [...(flagsOf.get(key(f)) ?? []), f]);
  const gradeOf = new Map(chosen.map((g) => [`${g.root}|${g.lemma}`, g.grade]));
  const occOf = new Map<string, Item[]>();
  for (const o of occ) {
    // a common word is drilled only at a flagged place
    if (!every && gradeOf.get(`${o.root}|${o.lemma}`) === 'common' && !flagsOf.has(key(o))) continue;
    occOf.set(`${o.root}|${o.lemma}`, [...(occOf.get(`${o.root}|${o.lemma}`) ?? []), o]);
  }
  // each root's family in the Qurʾān (its lemmas, their pattern and gloss, where one first stands)
  const roots = uniq(chosen.map((g) => g.root));
  const [fam, allRoots] = await Promise.all([
    query<Fam>(env.DB_QR,
      `SELECT root, lemma, MAX(wazn_ar) AS wazn, MAX(gloss_en) AS gloss, MAX(gloss_ref) AS gloss_ref, MAX(lemma_n) AS n, MIN(surah * 1000 + ayah) AS at
         FROM qr_vocab_item WHERE root IN (SELECT value FROM json_each(?)) AND lemma IS NOT NULL GROUP BY root, lemma`, [JSON.stringify(roots)]),
    query<{ root_ar: string; n: number }>(env.DB_QR, `SELECT root_ar, n FROM qr_root_freq`).catch(() => [] as Array<{ root_ar: string; n: number }>),
  ]);
  const famOf = new Map<string, Fam[]>();
  for (const f of fam) famOf.set(f.root, [...(famOf.get(f.root) ?? []), f]);
  // what the books say each chosen word means here (every gloss, with its source), the scope's other words' primaries
  // (the wrong answers, in the same voice), and the roots' imagery (Maqāyīs's aṣl, the root DNA)
  const g = scopeSql(scope, 'g');
  const [glossRows, prims, cores] = await Promise.all([
    occ.length ? query<Gloss>(env.DB_QR,
      `SELECT surah, ayah, word_index, lang, text, source_slug, source_kind, citation, method, confidence, rank, role, grp, quote_ar FROM qr_vocab_gloss
        WHERE (surah, ayah, word_index) IN (SELECT json_extract(value, '$[0]'), json_extract(value, '$[1]'), json_extract(value, '$[2]') FROM json_each(?))
        ORDER BY rank`, [JSON.stringify(occ.map((o) => [o.surah, o.ayah, o.word_index]))]) : Promise.resolve([] as Gloss[]),
    query<Prim>(env.DB_QR,
      `SELECT i.root, i.lemma, g.lang, g.text, g.source_kind, g.source_slug FROM qr_vocab_gloss g
         JOIN qr_vocab_item i ON i.surah = g.surah AND i.ayah = g.ayah AND i.word_index = g.word_index
        WHERE g.role = 'primary' AND ${g.sql} ${scope.surah === null ? 'AND (g.surah * 7 + g.ayah) % 23 = ?' : ''} LIMIT 3000`,
      scope.surah === null ? [...g.args, Math.floor(Math.random() * 23)] : g.args),
    query<Core>(env.DB_QR, `SELECT root, source_slug, text_ar, text_en, citation FROM qr_vocab_root_core WHERE root IN (SELECT value FROM json_each(?))`,
      [JSON.stringify(roots)]).catch(() => [] as Core[]),
  ]);
  const glossOf = new Map<string, Gloss[]>();
  for (const x of glossRows) glossOf.set(key(x), [...(glossOf.get(key(x)) ?? []), x]);
  const coreOf = new Map<string, Core[]>();
  for (const c of cores) coreOf.set(c.root, [...(coreOf.get(c.root) ?? []), c]);
  // the senses the chosen words are placed under, with the rest of each source's range
  const placedIds = uniq(occ.flatMap((o) => parseJson<string[]>(o.senses_json, [])));
  const senseRows = placedIds.length ? await query<Sense>(env.DB_QR,
    `SELECT id, source, root, head_ar, label_ar, label_en, kind, marker, page, seq, group_key, ref, ayat_json, n_ayat, arc_json FROM qr_vocab_sense
      WHERE group_key IN (SELECT group_key FROM qr_vocab_sense WHERE id IN (SELECT value FROM json_each(?)))`, [JSON.stringify(placedIds)]) : [];
  const senseOf = new Map(senseRows.map((s) => [s.id, s]));
  const rangeOf = new Map<string, Sense[]>();
  for (const s of senseRows) rangeOf.set(s.group_key, [...(rangeOf.get(s.group_key) ?? []), s]);
  const notes = placedIds.length ? await query<{ surah: number; ayah: number; word_index: number; sense_id: string; note_ar: string | null }>(env.DB_QR,
    `SELECT surah, ayah, word_index, sense_id, note_ar FROM qr_vocab_place WHERE note_ar IS NOT NULL AND sense_id IN (SELECT value FROM json_each(?))`,
    [JSON.stringify(placedIds)]) : [];
  const noteOf = new Map(notes.map((x) => [`${key(x)}|${x.sense_id}`, x.note_ar]));

  // one word per lemma, one ask each, turn by turn through the level's asks
  const plans: Array<{ o: Item; ask: string }> = [];
  let t = 0;
  // a few more than asked: a word whose options come up short is dropped, and the round is still full
  const spare = every ? Number.MAX_SAFE_INTEGER : Math.ceil(n * 1.5);
  for (const g of chosen) {
    if (plans.length >= spare) break;
    // the flagged places first: that is where the word is hard
    const os = shuffle(occOf.get(`${g.root}|${g.lemma}`) ?? []).sort((a, b) => Number(flagsOf.has(key(b))) - Number(flagsOf.has(key(a))));
    if (!os.length) continue;
    for (let k = 0; k < want.length; k++) {
      const ask = want[(t + k) % want.length];
      const o = os.find((x) => feasible(ask, x, famOf, senseOf, rangeOf, glossOf.get(key(x)) ?? []));
      if (!o) continue;
      plans.push({ o, ask });
      // a class step that asks for every word drills each word every way it can; a round takes one ask per word
      if (!every) { t = (t + k + 1) % want.length; break; }
    }
  }
  if (!plans.length) return [];
  plans.sort((a, b) => a.o.surah - b.o.surah || a.o.ayah - b.o.ayah || a.o.word_index - b.o.word_index);
  // the āyāt heard (each drill's own), and, for a "same sense" drill, the word of the root in the āyāt it offers
  const ctx: Ctx = { groups, famOf, senseOf, rangeOf, noteOf, allRoots, band, glossOf, prims, coreOf };
  const sameRefs = uniq(plans.filter((p) => p.ask === 'vocab_same').flatMap((p) => placedOf(p.o, senseOf)
    .filter((s) => s.source !== 'sense_arc').flatMap((s) => [...parseJson<string[]>(s.ayat_json, []),
      ...(rangeOf.get(s.group_key) ?? []).flatMap((x) => parseJson<string[]>(x.ayat_json, []).slice(0, 2))])));
  const [ayat, wordsAt] = await Promise.all([loadAyat(env, plans.map((p) => [p.o.surah, p.o.ayah])),
    sameRefs.length ? wordsOf(env, sameRefs.slice(0, 400), uniq([...roots, ...senseRows.map((s) => s.root)])) : Promise.resolve(new Map<string, string>())]);
  const out: Drill[] = [];
  for (const p of plans) {
    const ay = ayat.get(`${p.o.surah}:${p.o.ayah}`);
    if (!ay) continue;
    const idx = ay.ws.findIndex((x) => x.word_index === p.o.word_index);
    if (idx < 0) continue;
    const d = build(p.ask, p.o, ay, idx, ctx, wordsAt);
    if (d) out.push(marked(d, gradeOf.get(`${p.o.root}|${p.o.lemma}`) ?? 'medium', flagsOf.get(key(p.o)) ?? [], L));
  }
  // a word-initial shadda is the article's assimilation left on a lemma or pattern (تَّوْب, فَّعْل — 2,371 lemmas): never
  // written so; taken off every text the learner reads (the lemma stays the data's join key)
  for (const d of out) cleanShadda(d);
  // keep n, the asks still mixed, in āyah order (a class step asking for every word keeps them all)
  if (every || out.length <= n) return out;
  const byAsk = new Map<string, Drill[]>();
  for (const d of out) byAsk.set(String(d.ask), [...(byAsk.get(String(d.ask)) ?? []), d]);
  const keep = new Set<Drill>();
  for (let i = 0; keep.size < n; i++) for (const xs of byAsk.values()) if (i < xs.length && keep.size < n) keep.add(xs[i]);
  return out.filter((d) => keep.has(d));
}

const INITIAL_SHADDA = /(^|[\s«»()\[\]،:;—\-·/])([\u0621-\u064A])\u0651/g;
const unShadda = (t: unknown) => (typeof t === 'string' ? t.replace(INITIAL_SHADDA, '$1$2') : t);
/** The texts a drill shows, with no word opening on a shadda; the Qurʾān's own words (words, the āyah) are left as written. */
function cleanShadda(d: Drill) {
  for (const k of ['prompt', 'answer', 'explanation', 'promptEn']) if (typeof d[k] === 'string') d[k] = unShadda(d[k]);
  if (Array.isArray(d.options)) d.options = (d.options as unknown[]).map(unShadda);
  const note = d.note as { en?: string; ar?: string } | undefined;
  if (note) d.note = { ...note, en: unShadda(note.en) as string, ar: unShadda(note.ar) as string };
}

type Ctx = { groups: Group[]; famOf: Map<string, Fam[]>; senseOf: Map<string, Sense>; rangeOf: Map<string, Sense[]>;
             noteOf: Map<string, string | null>; allRoots: Array<{ root_ar: string; n: number }>; band: ReturnType<typeof levelOf>['band'];
             glossOf: Map<string, Gloss[]>; prims: Prim[]; coreOf: Map<string, Core[]> };

const primaryOf = (gs: Gloss[]) => gs.find((x) => x.role === 'primary') ?? null;
/// the glosses the books give the word here that can be told apart: one per source (its best), in the Arabic, from a book
/// (not the word view, not ʿUḍayma's pattern functions), each with its agreement group
function readings(gs: Gloss[]) {
  const by = new Map<string, Gloss>();
  for (const x of gs) {
    // a book's own gloss of the word here (ranks 1–4): not the weaker readings (the last word of a quotation, «X، أي …»), not the lemma elsewhere
    if (x.lang !== 'ar' || x.rank > 4 || x.source_kind === 'kmaps' || x.method === 'adima_function' || x.method === 'tafsir_lemma') continue;
    if (!by.has(x.source_slug)) by.set(x.source_slug, x);
  }
  return [...by.values()];
}
/// the readings that differ: a source whose gloss no other source shares (its group is its own), when ≥2 groups stand
function differing(gs: Gloss[]) {
  const rs = readings(gs);
  const groups = new Set(rs.map((x) => x.grp));
  if (rs.length < 2 || groups.size < 2) return [];
  return rs.filter((x) => rs.filter((y) => y.grp === x.grp).length === 1);
}

const placedOf = (o: Item, senseOf: Map<string, Sense>) => parseJson<string[]>(o.senses_json, []).map((id) => senseOf.get(id)).filter((s): s is Sense => !!s);
const labelOf = (s: Sense) => (s.source === 'raghib_mufradat' ? s.label_ar : s.label_en) ?? s.label_ar ?? '';
/// a source's range of senses for the root: the placed sense and its fellows, each with a label
const rangeFor = (s: Sense, rangeOf: Map<string, Sense[]>) => (rangeOf.get(s.group_key) ?? []).filter((x) => labelOf(x));

function feasible(ask: string, o: Item, famOf: Map<string, Fam[]>, senseOf: Map<string, Sense>, rangeOf: Map<string, Sense[]>, gs: Gloss[]) {
  const fam = famOf.get(o.root) ?? [];
  switch (ask) {
    case 'vocab_root': case 'vocab_lemma': return !!o.lemma;
    case 'vocab_meaning': return !!primaryOf(gs);
    case 'vocab_who': case 'vocab_books': return differing(gs).length >= 1;
    case 'vocab_family': return fam.length >= 3 && !!o.lemma;
    case 'vocab_kin': return fam.some((f) => f.lemma !== o.lemma);
    // a proper noun has no pattern to learn (اللَّه carried a made-up فعلَّل)
    case 'vocab_form': return o.pos !== 'PN' && fam.some((f) => f.gloss && f.wazn);
    case 'vocab_range': return placedOf(o, senseOf).some((s) => s.source !== 'sense_arc' && rangeFor(s, rangeOf).length >= 3);
    case 'vocab_same': return placedOf(o, senseOf).some((s) => s.source !== 'sense_arc' && parseJson<string[]>(s.ayat_json, []).length >= 2
                                                        && rangeFor(s, rangeOf).filter((x) => x.id !== s.id).length >= 1);
    case 'vocab_rung': return placedOf(o, senseOf).some((s) => s.source === 'sense_arc' && (parseJson<{ steps?: unknown[] }>(s.arc_json, {}).steps?.length ?? 0) >= 3);
  }
  return false;
}

/// for each āyah key, the word of one of these roots that stands in it (to show where a sense is used)
async function wordsOf(env: QuranEnv, refs: string[], roots: string[]) {
  const pairs = refs.map((r) => r.split(':').map(Number));
  const rows = await query<{ surah: number; ayah: number; word_text: string; root: string }>(env.DB_QR,
    `SELECT surah, ayah, word_text, root FROM qr_vocab_item WHERE (surah, ayah) IN (SELECT json_extract(value, '$[0]'), json_extract(value, '$[1]') FROM json_each(?))
        AND root IN (SELECT value FROM json_each(?))`, [JSON.stringify(pairs), JSON.stringify(roots)]);
  const out = new Map<string, string>();
  for (const r of rows) out.set(`${r.surah}:${r.ayah}|${r.root}`, r.word_text);
  return out;
}

/// the drill's grade and, where it is hard here, why — each a badge from qr_study_label, the source quoted below
function marked(d: Drill, grade: string, flags: Flag[], L: Record<string, Label[]>): Drill {
  const gl = (L.vocab_grade ?? []).find((x) => x.key === grade);
  const fl = new Map((L.vocab_flag ?? []).map((x) => [x.key, x]));
  const badges = [...((d.badges as Array<Record<string, unknown>>) ?? []),
    ...(gl ? [{ label: gl.label, labelAr: gl.labelAr, color: gl.color }] : []),
    ...flags.flatMap((f) => { const x = fl.get(f.kind); return x ? [{ label: x.label, labelAr: x.labelAr, color: x.color }] : []; })];
  const why = flags.map((f) => {
    const x = fl.get(f.kind);
    const head = `${x?.label ?? f.kind}${f.detail ? ` — ${f.detail}` : ''}`;
    const tail = f.kind === 'grammar' ? '' : f.quote_ar ? `: «${clip(f.quote_ar, 220)}»` : '';
    // the source: the books that differ · the tafsīr that names the schools (its slug, then its block) · Mir's page
    const src = !f.ref || f.kind === 'grammar' ? '' : f.kind === 'meaning' ? f.ref.split(',').map((x) => bookOf(x).en).join(', ')
      : f.kind === 'theology' ? `${bookOf(f.ref.split(' ')[0]).en}${/ p\.(\S+)/.exec(f.ref) ? `, p. ${/ p\.(\S+)/.exec(f.ref)![1]}` : ''}` : clip(f.ref, 80);
    return `${head}${tail}${src ? ` (${src})` : ''}`;
  });
  return { ...d, badges, grade, hard: flags.map((f) => f.kind),
           explanation: [d.explanation, ...why].filter(Boolean).join('\n') };
}

function build(ask: string, o: Item, ay: Ayah, idx: number, c: Ctx, wordsAt: Map<string, string>): Drill | null {
  const fam = (c.famOf.get(o.root) ?? []).sort((a, b) => b.n - a.n);
  const lemma = o.lemma ?? o.word_text;
  const root = spaced(o.root);
  // the meaning here: the primary gloss the books give it (and, beside it, the other language where a source gives it)
  const gs = c.glossOf.get(key(o)) ?? [];
  const prim = primaryOf(gs);
  const side = gs.find((x) => x.role === 'en' || x.role === 'ar') ?? null;
  const en = prim?.lang === 'en' ? prim : side?.lang === 'en' ? side : null;
  const meaning = prim?.text ?? null;
  const mRef = prim?.citation ?? null;
  const cores = c.coreOf.get(o.root) ?? [];
  const coreLine = cores.map((x) => `Root imagery (${x.source_slug === 'maqayis_lugha' ? 'Maqāyīs, the aṣl' : 'root DNA'}): ${[x.text_ar, x.text_en].filter(Boolean).join(' — ')}`).join('\n');
  const readLine = (xs: Gloss[]) => xs.map((x) => `· ${bookOf(x.source_slug).en}: «${clip(x.text, 90)}»`).join('\n');
  const famLine = fam.slice(0, 6).map((f) => `${f.lemma}${f.wazn ? ` (${f.wazn})` : ''}${f.gloss ? ` — ${clip(f.gloss, 70)}` : ''} ×${f.n}`).join('\n');
  const base = { script: 'quran', audio: ay.audio, words: ay.words, en: ay.en, span: [idx],
                 source: { workId: `QR:SURAH:${o.surah}`, title: ay.title, level: null } };
  const badge = (label: string, labelAr: string, color = COLOR) => [{ label, labelAr, color }];
  const card = (d: Drill, ref: string, front: string, back: string, series: string) =>
    withCard(d, { ref: `QR:vocab:${ref}`, type: 'vocabulary', kind: 'vocab', front: `${ay.ws.map((x) => x.word_text).join(' ')}\n${front}`, back,
                  surah: o.surah, ayah: o.ayah, series, band: c.band });
  const id = `vocab:${ask}:${key(o)}`;

  if (ask === 'vocab_root') {
    // other roots: the scope's, and the Qurʾān's that share two letters in place
    const near = shuffle(c.allRoots.filter((r) => r.root_ar !== o.root && shared(r.root_ar, o.root) >= 2));
    const scopeRoots = shuffle(uniq(c.groups.map((g) => g.root)).filter((r) => r !== o.root));
    const others = pickOthers(o.root, [...near.map((r) => r.root_ar), ...scopeRoots], (x) => fold(x));
    if (others.length < 3) return null;
    const d: Drill = { ...base, id, kind: 'feature', ask, prompt: `Which root is ${o.word_text} from?`,
      options: shuffle([root, ...others.map(spaced)]), answer: root, note: { en: `root ${root}`, ar: root },
      explanation: `${o.word_text} is of the root ${root} (${o.root_n} words in the Qurʾān); its lemma ${lemma} occurs ${o.lemma_n}×.${meaning ? ` Here: «${meaning}» (${bookOf(prim!.source_slug).en}).` : ''}${coreLine ? `\n${coreLine}` : ''}`,
      badges: badge('Qurʾān · root', 'الجَذْر') };
    return card(d, `root:${o.root}:${o.lemma}`, `${o.word_text} — root?`, root, 'Roots');
  }
  if (ask === 'vocab_lemma') {
    const sameRoot = shuffle(fam.filter((f) => f.lemma !== lemma).map((f) => f.lemma)).slice(0, 2);
    const scopeLemmas = shuffle(c.groups.filter((g) => g.root !== o.root && g.pos === o.pos).map((g) => g.lemma));
    const others = pickOthers(fold(lemma), [...sameRoot, ...scopeLemmas], (x) => fold(x));
    if (others.length < 3) return null;
    const d: Drill = { ...base, id, kind: 'feature', ask, prompt: `\u200E\u2068${o.word_text}\u2069 — which dictionary form (lemma) is it?`,   // the Arabic isolated, the line LTR
      options: shuffle([lemma, ...others]), answer: lemma, note: { en: o.wazn_ar ? `pattern ${o.wazn_ar}` : 'lemma', ar: lemma },
      explanation: `${o.word_text} is a form of ${lemma}${o.wazn_ar ? ` (pattern ${o.wazn_ar})` : ''}, root ${root} — ${o.lemma_n}× in the Qurʾān.${meaning ? ` Here: «${meaning}» — ${mRef}.` : ''}`,
      badges: badge('Qurʾān · lemma', 'اللَّفْظَة') };
    return card(d, `lemma:${o.root}:${lemma}`, `${o.word_text} — lemma?`, `${lemma} (${root})`, 'Lemmas');
  }
  if (ask === 'vocab_meaning') {
    if (!prim || !meaning) return null;
    // the wrong answers in the same voice as the right one: the same kind of book's glosses of the scope's other words, then any
    // book's in the same language — never a gloss of this lemma, never one the answer's own books share
    const mine = new Set(gs.filter((x) => x.grp === prim.grp).map((x) => fold(x.text)));
    const pool = c.prims.filter((x) => x.lang === prim.lang && !(x.root === o.root && x.lemma === o.lemma) && !mine.has(fold(x.text)));
    const others = pickOthers(norm(meaning), [...shuffle(pool.filter((x) => x.source_kind === prim.source_kind)), ...shuffle(pool)].map((x) => x.text), norm);
    if (others.length < 3) return null;
    const other = differing(gs).filter((x) => x.grp !== prim.grp).slice(0, 3);
    const book = bookOf(prim.source_slug);
    const d: Drill = { ...base, id, kind: 'feature', ask, prompt: `What does ${o.word_text} mean here?`,
      options: shuffle([meaning, ...others]), answer: meaning,
      note: { en: en && en !== prim ? `${en.text} (${bookOf(en.source_slug).en})` : `${lemma} · ${root}`, ar: lemma },
      explanation: `${lemma} (root ${root}) here: «${meaning}» — ${mRef}.${en && en !== prim ? `\nIn English: ${en.text} — ${en.citation}.` : ''}`
        + `${other.length ? `\nThe books differ:\n${readLine(other)}` : ''}${coreLine ? `\n${coreLine}` : ''}`,
      meaning: { text: meaning, lang: prim.lang, source: prim.source_slug, citation: prim.citation, method: prim.method,
                 en: en && en !== prim ? { text: en.text, citation: en.citation } : null, quote: prim.quote_ar },
      badges: badge(`${book.en} · meaning here`, `${book.ar} · المَعْنَى هُنَا`) };
    return card(d, `meaning:${key(o)}`, `${o.word_text} — meaning here?`, `${meaning}\n${mRef}${en && en !== prim ? `\n${en.text}` : ''}`, 'Meanings');
  }
  if (ask === 'vocab_who' || ask === 'vocab_books') {
    // where the books gloss the word differently: which book says this (L2), what this book says (L3)
    const diff = differing(gs);
    if (!diff.length) return null;
    const rs = readings(gs);
    const r = shuffle(diff).sort((a, b) => (TAFSIRS.includes(a.source_slug) ? 0 : 1) - (TAFSIRS.includes(b.source_slug) ? 0 : 1))[0];
    const book = bookOf(r.source_slug);
    const all = readLine(rs);
    if (ask === 'vocab_who') {
      // the others: the books that gloss it otherwise here, then books that do not gloss it at all (none of them says this)
      const saySame = new Set(rs.filter((x) => x.grp === r.grp).map((x) => x.source_slug));
      const names = uniq([...shuffle(rs.filter((x) => !saySame.has(x.source_slug)).map((x) => x.source_slug)),
                          ...shuffle(TAFSIRS.filter((b) => !rs.some((x) => x.source_slug === b)))]);
      const others = pickOthers(book.en, names.map((b) => bookOf(b).en), (x) => x);
      if (others.length < 2) return null;
      const d: Drill = { ...base, id, kind: 'feature', ask, prompt: `Which book glosses ${o.word_text} here as «${clip(r.text, 110)}»?`,
        options: shuffle([book.en, ...others]), answer: book.en, note: { en: `${lemma} · how the books gloss it`, ar: book.ar },
        explanation: `${r.citation}: «${r.text}».\nThe books on ${o.word_text} here:\n${all}`,
        badges: badge('Qurʾān · the books differ', 'اخْتِلَافُ الكُتُب', '#E07A5F') };
      return card(d, `who:${key(o)}:${r.source_slug}`, `«${clip(r.text, 80)}» — which book?`, `${book.en}\n${r.citation}`, 'Glosses');
    }
    // how does this book gloss it: its gloss among the others' (then its glosses of other words in the scope)
    const pool = [...shuffle(rs.filter((x) => x.grp !== r.grp).map((x) => x.text)),
                  ...shuffle(c.prims.filter((x) => x.lang === 'ar' && x.source_slug === r.source_slug && !(x.root === o.root && x.lemma === o.lemma)).map((x) => x.text)),
                  ...shuffle(c.prims.filter((x) => x.lang === 'ar' && !(x.root === o.root && x.lemma === o.lemma)).map((x) => x.text))];
    const others = pickOthers(norm(r.text), pool, norm);
    if (others.length < 2) return null;
    const d: Drill = { ...base, id, kind: 'feature', ask, prompt: `How does ${book.en} gloss ${o.word_text} here?`,
      options: shuffle([r.text, ...others.slice(0, 3)]), answer: r.text, note: { en: `${book.en} on ${o.surah}:${o.ayah}`, ar: book.ar },
      explanation: `${r.citation}: «${r.text}».${r.quote_ar ? `\nAs it stands: ${clip(r.quote_ar, 200)}` : ''}\nThe books on ${o.word_text} here:\n${all}`,
      badges: badge(`${book.en} · how it glosses`, `${book.ar} · تَفْسِيرُ الكَلِمَة`, '#E07A5F') };
    return card(d, `books:${key(o)}:${r.source_slug}`, `${book.en}: ${o.word_text} here?`, `${r.text}\n${r.citation}`, 'Glosses');
  }
  if (ask === 'vocab_family') {
    const others = shuffle(fam.filter((f) => f.lemma !== lemma)).slice(0, 3).map((f) => f.lemma);
    if (others.length < 2) return null;
    const d: Drill = { ...base, id, kind: 'feature', ask, prompt: `${o.word_text} is of the root ${root} — which of its words is it?`,
      options: shuffle([lemma, ...others]), answer: lemma, note: { en: `the family of ${root}`, ar: root },
      explanation: `The root ${root} in the Qurʾān (${o.root_n} words, ${fam.length} lemmas):\n${famLine}`, badges: badge('Qurʾān · lemma family', 'أُسْرَةُ الجَذْر', '#81B29A') };
    return card(d, `family:${o.root}:${lemma}`, `${o.word_text} — which word of ${root}?`, `${lemma}\n${famLine}`, 'Families');
  }
  if (ask === 'vocab_kin') {
    // a word of the same family, in this surah if it has one, else the Qurʾān's most frequent; the others share letters but not the root
    const kinPool = fam.filter((f) => f.lemma !== lemma);
    const inSurah = kinPool.filter((f) => c.groups.some((g) => g.root === o.root && g.lemma === f.lemma));
    const kin = (inSurah.length ? shuffle(inSurah) : kinPool)[0];
    if (!kin) return null;
    const near = shuffle(c.groups.filter((g) => g.root !== o.root && shared(g.root, o.root) >= 1).map((g) => g.lemma));
    const far = shuffle(c.groups.filter((g) => g.root !== o.root).map((g) => g.lemma));
    const others = pickOthers(fold(kin.lemma), [...near, ...far], (x) => fold(x));
    if (others.length < 3) return null;
    const at = `${Math.floor(kin.at / 1000)}:${kin.at % 1000}`;
    const d: Drill = { ...base, id, kind: 'feature', ask, prompt: `Which of these words is of the same root as ${o.word_text}?`,
      options: shuffle([kin.lemma, ...others]), answer: kin.lemma, note: { en: `kin of ${lemma}`, ar: root },
      explanation: `${kin.lemma} is of ${root}, like ${lemma}${kin.gloss ? ` — ${kin.gloss}` : ''}; ${inSurah.length ? 'it stands in this surah too' : `first at ${at}`} (×${kin.n}).\n${famLine}`,
      badges: badge('Qurʾān · lemma family', 'أُسْرَةُ الجَذْر', '#81B29A') };
    return card(d, `kin:${o.root}:${kin.lemma}`, `${o.word_text} — which is its kin?`, `${kin.lemma} (${root})`, 'Families');
  }
  if (ask === 'vocab_form') {
    // a word of the family by its pattern → its meaning (the others: the family's other meanings, then other roots' on the same pattern)
    const withGloss = shuffle(fam.filter((f) => f.gloss && f.wazn));
    const f = withGloss.find((x) => x.lemma === lemma) ?? withGloss[0];
    if (!f) return null;
    const pool = [...shuffle(fam.filter((x) => x.lemma !== f.lemma && x.gloss).map((x) => x.gloss!)),
                  ...shuffle(c.groups.filter((g) => g.root !== o.root && g.gloss && g.wazn === f.wazn).map((g) => g.gloss!)),
                  ...shuffle(c.groups.filter((g) => g.root !== o.root && g.gloss).map((g) => g.gloss!))];
    const others = pickOthers(f.gloss!.toLowerCase(), pool, (x) => x.toLowerCase());
    if (others.length < 3) return null;
    const d: Drill = { ...base, id, kind: 'feature', ask, prompt: `The root ${root} on the pattern ${f.wazn} gives ${f.lemma} — what does it mean?`,
      options: shuffle([f.gloss!, ...others]), answer: f.gloss!, note: { en: `${f.lemma} · ${f.wazn}`, ar: f.lemma },
      explanation: `${f.lemma} (${f.wazn}, root ${root}, ×${f.n}): ${f.gloss}${f.gloss_ref ? ` (${f.gloss_ref})` : ''}.${f.lemma !== lemma ? ` The marked ${o.word_text} is ${lemma}.` : ''}\n${famLine}`,
      badges: badge('Qurʾān · pattern', 'الوَزْن', '#E9C46A') };
    return card(d, `form:${o.root}:${f.lemma}`, `${f.lemma} (${f.wazn}) — meaning?`, `${f.gloss}${f.gloss_ref ? `\n${f.gloss_ref}` : ''}`, 'Patterns');
  }
  const placed = placedOf(o, c.senseOf);
  const exOf = (s: Sense, not: string) => parseJson<string[]>(s.ayat_json, []).find((r) => r !== not) ?? null;
  const here = `${o.surah}:${o.ayah}`;
  if (ask === 'vocab_range') {
    const s = shuffle(placed.filter((x) => x.source !== 'sense_arc' && rangeFor(x, c.rangeOf).length >= 3))
      .sort((a, b) => (a.source === 'lane_lexicon' ? 0 : 1) - (b.source === 'lane_lexicon' ? 0 : 1))[0];
    if (!s) return null;
    const range = rangeFor(s, c.rangeOf);
    const others = shuffle(range.filter((x) => x.id !== s.id && !placed.some((p) => p.id === x.id)))
      .filter((x, i, xs) => xs.findIndex((y) => labelOf(y) === labelOf(x)) === i && labelOf(x) !== labelOf(s)).slice(0, 3);
    if (others.length < 2) return null;
    const note = c.noteOf.get(`${key(o)}|${s.id}`);
    // where the place names the clause of a long sense that fits it (qr_vocab_place.note_ar — al-Rāghib's قابل paragraph
    // opens on the bucket at the well and only then «قَبِلْتُ عذره وتوبته»), the answer is that clause
    const opt = (x: Sense) => { const ex = exOf(x, here); const lab = clip(x.id === s.id && note ? note : labelOf(x), 150); return ex ? `${lab} · e.g. ${ex}` : lab; };
    const answer = opt(s);
    const src = SRC[s.source];
    const rangeLine = range.slice(0, 8).map((x) => `${x.id === s.id ? '▸ ' : '· '}${clip(labelOf(x), 90)}${x.marker && x.source === 'lane_lexicon' ? ` [${x.head_ar} ${x.marker}]` : ''} — ${parseJson<string[]>(x.ayat_json, []).slice(0, 3).join(', ')}`).join('\n');
    const d: Drill = { ...base, id, kind: 'feature', ask, prompt: `${o.word_text} — which of its Qurʾānic senses (in ${src.en}) does this āyah use?`,
      options: shuffle([answer, ...others.map(opt)]), answer, note: { en: `${src.en} · ${range.length} senses in the Qurʾān`, ar: o.lemma ?? o.word_text },
      explanation: `${s.ref}${s.head_ar && s.source !== 'raghib_mufradat' ? ` (${s.head_ar})` : ''} files ${here} under: ${labelOf(s)}.${note ? ` al-Rāghib on it: «${note}».` : ''}\nThe range (${src.en}):\n${rangeLine}`,
      badges: badge(src.en, src.ar, src.color) };
    return card(d, `range:${key(o)}:${s.id}`, `${o.word_text} — which sense here?`, `${labelOf(s)}\n${s.ref}`, `Range · ${src.en}`);
  }
  if (ask === 'vocab_same') {
    const s = placed.find((x) => x.source !== 'sense_arc' && parseJson<string[]>(x.ayat_json, []).length >= 2 && rangeFor(x, c.rangeOf).some((y) => y.id !== x.id));
    if (!s) return null;
    const mine = shuffle(parseJson<string[]>(s.ayat_json, []).filter((r) => r !== here));
    const answerRef = mine[0];
    if (!answerRef) return null;
    const otherRefs = shuffle(rangeFor(s, c.rangeOf).filter((x) => x.id !== s.id && !placed.some((p) => p.id === x.id))
      .flatMap((x) => parseJson<string[]>(x.ayat_json, []).slice(0, 2).map((r) => ({ r, x }))))
      .filter((y) => y.r !== here && !parseJson<string[]>(s.ayat_json, []).includes(y.r));
    const others = pickOthers(answerRef, otherRefs, (y) => y.r).slice(0, 3);
    if (others.length < 2) return null;
    const show = (r: string, x: Sense = s) => { const wd = wordsAt.get(`${r}|${o.root}`) ?? wordsAt.get(`${r}|${x.root}`); return `${r}${wd ? ` · ${wd}` : ''}`; };
    const answer = show(answerRef);
    const src = SRC[s.source];
    const d: Drill = { ...base, id, kind: 'feature', ask, prompt: `${o.word_text} here: “${clip(labelOf(s), 110)}” (${src.en}). Where else does it carry this sense?`,
      options: shuffle([answer, ...others.map((y) => show(y.r, y.x))]), answer, note: { en: `${src.en}: the same sense`, ar: o.lemma ?? o.word_text },
      explanation: `${s.ref} files ${[here, ...mine].slice(0, 6).join(', ')} under: ${labelOf(s)}.\n${others.map((y) => `${y.r}: ${clip(labelOf(y.x), 90)}`).join('\n')}`,
      badges: badge(src.en, src.ar, src.color) };
    return card(d, `same:${s.id}:${answerRef}`, `${o.word_text} — same sense where?`, `${answerRef}\n${labelOf(s)}\n${s.ref}`, `Range · ${src.en}`);
  }
  if (ask === 'vocab_rung') {
    const s = placed.find((x) => x.source === 'sense_arc' && (parseJson<{ steps?: unknown[] }>(x.arc_json, {}).steps?.length ?? 0) >= 3);
    if (!s) return null;
    const arc = parseJson<{ id: string; en: string | null; ar: string | null; steps: Array<{ n: number; en: string | null; ar: string | null; gloss: string | null }> }>(s.arc_json, { id: '', en: null, ar: null, steps: [] });
    const steps = [...arc.steps].sort((a, b) => a.n - b.n).filter((x) => x.en);
    const me = steps.find((x) => String(x.n) === s.marker);
    if (!me) return null;
    const lab = (x: { n: number; en: string | null }) => `${x.n}. ${x.en}`;
    const others = shuffle(steps.filter((x) => x.n !== me.n)).slice(0, 3);
    const d: Drill = { ...base, id, kind: 'feature', ask, prompt: `${root}: ${arc.en ?? 'its sense arc'} — which rung is ${o.word_text} here?`,
      options: shuffle([lab(me), ...others.map(lab)]), answer: lab(me), note: { en: 'sense arc', ar: arc.ar ?? root },
      explanation: `${steps.map((x) => `${x.n === me.n ? '▸ ' : ''}${x.en}${x.ar ? ` (${x.ar})` : ''}`).join(' → ')}\n${me.gloss ?? ''}\n${s.ref}.`,
      badges: badge(SRC.sense_arc.en, SRC.sense_arc.ar, SRC.sense_arc.color) };
    return card(d, `rung:${key(o)}:${arc.id}`, `${o.word_text} — which rung of ${root}?`, `${lab(me)}\n${steps.map((x) => x.en).join(' → ')}`, 'Sense arcs');
  }
  return null;
}

/// Tap the matching pairs, from the scope's lemmas: five a round, each beside its meaning, its
/// root or its pattern — the facets the lemma's own row holds, taken in turn. No two lemmas in a
/// round share a partner, so every pair has one answer.
export async function pairsDrills(env: QuranEnv, n: number, scope: Scope): Promise<Drill[]> {
  const w = scopeSql(scope);
  const rows = await query<{ lemma: string; root: string | null; gloss: string | null; wazn: string | null }>(env.DB_QR,
    `SELECT i.lemma, MAX(i.root) AS root, MAX(i.gloss_en) AS gloss, MAX(i.wazn_ar) AS wazn FROM qr_vocab_item i
       JOIN qr_vocab_grade g ON g.root = i.root AND g.lemma = i.lemma AND g.grade IN ('medium', 'hard', 'super') AND g.focus = 1
      WHERE ${scopeSql(scope, 'i').sql} AND i.lemma IS NOT NULL GROUP BY i.lemma`, w.args);   // medium → super only, never common words
  const facets = ['gloss', 'root', 'wazn'] as const;
  const out: Drill[] = [];
  for (let k = 0; out.length < n && k < n * facets.length; k++) {
    const facet = facets[k % facets.length];
    // fixed rounds: the lemmas in a stable order from a chosen point — the same five come back as the same review item
    const ordered = rows.filter((x) => x[facet]).sort((x, y) => x.lemma.localeCompare(y.lemma));
    const from = ordered.length ? Math.floor(Math.random() * Math.ceil(ordered.length / 5)) * 5 : 0;
    const round: typeof rows = [];
    for (const r of [...ordered.slice(from), ...ordered.slice(0, from)]) {
      if (round.some((x) => x[facet] === r[facet] || x.lemma === r.lemma)) continue;
      round.push(r);
      if (round.length === 5) break;
    }
    if (round.length < 3) continue;
    const pairs = round.map((r) => [r.lemma, String(r[facet])]);
    const key = round.map((r) => r.lemma).join('+');
    const d: Drill = { id: `pairs:${facet}:${scope.surah ?? 'all'}:${key}`, kind: 'pairs', ask: `pairs_${facet}`,
                       interaction: 'pairs', pairs };
    out.push(withCard(d, { ref: `QR:pairs:${facet}:${key}`, type: 'vocabulary', kind: 'pairs',
                           front: pairs.map((p) => p[0]).join('\n'), back: pairs.map((p) => p[1]).join('\n'),
                           surah: scope.surah }));
  }
  return out;
}
