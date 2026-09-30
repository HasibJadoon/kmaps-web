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
//
//   L1 vocab_root · vocab_lemma · vocab_meaning     — the scope's frequent lemmas first
//   L2 vocab_family · vocab_kin · vocab_form        — the root's family (in the surah, then the Qurʾān)
//   L3 vocab_range · vocab_same · vocab_rung        — only words a source places
// A surah session walks the surah: its lemmas drawn tier by tier (frequent first, a little shuffled),
// the drills in āyah order. The asks a level has come from qr_study_label (skill.extra_json.levels).

type Item = { surah: number; ayah: number; word_index: number; word_text: string; root: string; lemma: string | null; pos: string | null;
              form_roman: string | null; wazn_ar: string | null; lemma_n: number; root_n: number; tier: number; n_lemmas: number;
              gloss_en: string | null; gloss_ref: string | null; here_en: string | null; here_ref: string | null; here_sense: string | null;
              senses_json: string | null };
type Group = { root: string; lemma: string; tier: number; first: number; k: number; nl: number; pos: string | null;
               gloss: string | null; wv: string | null; wazn: string | null; lemma_n: number; placed: number };
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
const LEVEL_ASKS: Record<string, string[]> = { basic: ['vocab_root', 'vocab_lemma', 'vocab_meaning'],
  middle: ['vocab_family', 'vocab_kin', 'vocab_form'], advanced: ['vocab_range', 'vocab_same', 'vocab_rung'] };
const L3 = new Set(LEVEL_ASKS.advanced);

const fold = (w: string | null | undefined) => (w ?? '').replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, '')
  .replace(/[ٱأإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[^ء-ي]/g, '');
const spaced = (r: string) => [...fold(r)].join(' ');
const shared = (a: string, b: string) => { const x = [...fold(a)]; return [...fold(b)].filter((c, i) => x[i] === c).length; };
const key = (x: { surah: number; ayah: number; word_index: number }) => `${x.surah}:${x.ayah}:${x.word_index}`;
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
  const want = asks.length ? asks : LEVEL_ASKS.basic;
  const advanced = want.every((a) => L3.has(a));
  const w = scopeSql(scope);
  // the scope's lemmas: how frequent (tier), where they first stand, whether a source places them
  const groups = await query<Group>(env.DB_QR,
    `SELECT root, lemma, MIN(tier) AS tier, MIN(surah * 1000 + ayah) AS first, COUNT(*) AS k, MAX(n_lemmas) AS nl, MAX(pos) AS pos,
            MAX(gloss_en) AS gloss, MAX(CASE WHEN here_sense IS NULL THEN here_en END) AS wv, MAX(wazn_ar) AS wazn, MAX(lemma_n) AS lemma_n, MAX(senses_json IS NOT NULL) AS placed
       FROM qr_vocab_item WHERE ${w.sql} AND lemma IS NOT NULL GROUP BY root, lemma`, w.args);
  if (!groups.length) return [];
  // walk: frequent first (a little shuffled within the walk), L3 only what a source places
  const eligible = groups.filter((g) => !advanced || g.placed);
  const order = eligible.map((g) => ({ g, r: g.tier + Math.random() * 1.6 })).sort((a, b) => a.r - b.r).map((x) => x.g);
  const chosen = order.slice(0, Math.max(n * 3, 24));
  // their words in scope
  const occ = await query<Item>(env.DB_QR,
    `SELECT surah, ayah, word_index, word_text, root, lemma, pos, form_roman, wazn_ar, lemma_n, root_n, tier, n_lemmas, gloss_en, gloss_ref,
            here_en, here_ref, here_sense, senses_json
       FROM qr_vocab_item WHERE ${w.sql} ${advanced ? 'AND senses_json IS NOT NULL' : ''}
        AND (root, lemma) IN (SELECT json_extract(value, '$[0]'), json_extract(value, '$[1]') FROM json_each(?))`,
    [...w.args, JSON.stringify(chosen.map((g) => [g.root, g.lemma]))]);
  const occOf = new Map<string, Item[]>();
  for (const o of occ) occOf.set(`${o.root}|${o.lemma}`, [...(occOf.get(`${o.root}|${o.lemma}`) ?? []), o]);
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
  const spare = Math.ceil(n * 1.5);
  for (const g of chosen) {
    if (plans.length >= spare) break;
    const os = shuffle(occOf.get(`${g.root}|${g.lemma}`) ?? []);
    if (!os.length) continue;
    for (let k = 0; k < want.length; k++) {
      const ask = want[(t + k) % want.length];
      const o = os.find((x) => feasible(ask, x, famOf, senseOf, rangeOf));
      if (o) { plans.push({ o, ask }); t = (t + k + 1) % want.length; break; }
    }
  }
  if (!plans.length) return [];
  plans.sort((a, b) => a.o.surah - b.o.surah || a.o.ayah - b.o.ayah || a.o.word_index - b.o.word_index);
  // the āyāt heard (each drill's own), and, for a "same sense" drill, the word of the root in the āyāt it offers
  const ctx: Ctx = { groups, famOf, senseOf, rangeOf, noteOf, allRoots, band };
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
    if (d) out.push(d);
  }
  // keep n, the asks still mixed, in āyah order
  if (out.length <= n) return out;
  const byAsk = new Map<string, Drill[]>();
  for (const d of out) byAsk.set(String(d.ask), [...(byAsk.get(String(d.ask)) ?? []), d]);
  const keep = new Set<Drill>();
  for (let i = 0; keep.size < n; i++) for (const xs of byAsk.values()) if (i < xs.length && keep.size < n) keep.add(xs[i]);
  return out.filter((d) => keep.has(d));
}

type Ctx = { groups: Group[]; famOf: Map<string, Fam[]>; senseOf: Map<string, Sense>; rangeOf: Map<string, Sense[]>;
             noteOf: Map<string, string | null>; allRoots: Array<{ root_ar: string; n: number }>; band: ReturnType<typeof levelOf>['band'] };

const placedOf = (o: Item, senseOf: Map<string, Sense>) => parseJson<string[]>(o.senses_json, []).map((id) => senseOf.get(id)).filter((s): s is Sense => !!s);
const labelOf = (s: Sense) => (s.source === 'raghib_mufradat' ? s.label_ar : s.label_en) ?? s.label_ar ?? '';
/// a source's range of senses for the root: the placed sense and its fellows, each with a label
const rangeFor = (s: Sense, rangeOf: Map<string, Sense[]>) => (rangeOf.get(s.group_key) ?? []).filter((x) => labelOf(x));

function feasible(ask: string, o: Item, famOf: Map<string, Fam[]>, senseOf: Map<string, Sense>, rangeOf: Map<string, Sense[]>) {
  const fam = famOf.get(o.root) ?? [];
  switch (ask) {
    case 'vocab_root': case 'vocab_lemma': return !!o.lemma;
    case 'vocab_meaning': return !!(o.here_en || o.gloss_en);
    case 'vocab_family': return fam.length >= 3 && !!o.lemma;
    case 'vocab_kin': return fam.some((f) => f.lemma !== o.lemma);
    case 'vocab_form': return fam.some((f) => f.gloss && f.wazn);
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

function build(ask: string, o: Item, ay: Ayah, idx: number, c: Ctx, wordsAt: Map<string, string>): Drill | null {
  const fam = (c.famOf.get(o.root) ?? []).sort((a, b) => b.n - a.n);
  const lemma = o.lemma ?? o.word_text;
  const root = spaced(o.root);
  const meaning = o.here_en ?? o.gloss_en;
  const mRef = o.here_en ? o.here_ref : o.gloss_ref;
  const famLine = fam.slice(0, 6).map((f) => `${f.lemma}${f.wazn ? ` (${f.wazn})` : ''}${f.gloss ? ` — ${clip(f.gloss, 70)}` : ''} ×${f.n}`).join('\n');
  const base = { script: 'quran', audio: ay.audio, words: ay.words, en: ay.en, span: [idx],
                 source: { workId: `QR:SURAH:${o.surah}`, title: ay.title, level: null } };
  const badge = (label: string, labelAr: string, color = COLOR) => [{ label, labelAr, color }];
  const card = (d: Drill, ref: string, front: string, back: string, series: string) =>
    withCard(d, { ref: `QR:vocab:${ref}`, type: 'vocab', kind: 'vocab', front: `${ay.ws.map((x) => x.word_text).join(' ')}\n${front}`, back,
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
      explanation: `${o.word_text} is of the root ${root} (${o.root_n} words in the Qurʾān); its lemma ${lemma} occurs ${o.lemma_n}×.${meaning ? ` ${lemma}: ${meaning}.` : ''}`,
      badges: badge('Qurʾān · root', 'الجَذْر') };
    return card(d, `root:${o.root}:${o.lemma}`, `${o.word_text} — root?`, root, 'Roots');
  }
  if (ask === 'vocab_lemma') {
    const sameRoot = shuffle(fam.filter((f) => f.lemma !== lemma).map((f) => f.lemma)).slice(0, 2);
    const scopeLemmas = shuffle(c.groups.filter((g) => g.root !== o.root && g.pos === o.pos).map((g) => g.lemma));
    const others = pickOthers(fold(lemma), [...sameRoot, ...scopeLemmas], (x) => fold(x));
    if (others.length < 3) return null;
    const d: Drill = { ...base, id, kind: 'feature', ask, prompt: `${o.word_text} — which dictionary form (lemma) is it?`,
      options: shuffle([lemma, ...others]), answer: lemma, note: { en: o.wazn_ar ? `pattern ${o.wazn_ar}` : 'lemma', ar: lemma },
      explanation: `${o.word_text} is a form of ${lemma}${o.wazn_ar ? ` (pattern ${o.wazn_ar})` : ''}, root ${root} — ${o.lemma_n}× in the Qurʾān.${meaning ? ` ${meaning}${mRef ? ` (${mRef})` : ''}.` : ''}`,
      badges: badge('Qurʾān · lemma', 'اللَّفْظَة') };
    return card(d, `lemma:${o.root}:${lemma}`, `${o.word_text} — lemma?`, `${lemma} (${root})`, 'Lemmas');
  }
  if (ask === 'vocab_meaning') {
    if (!meaning) return null;
    // the wrong answers in the same voice as the right one: the word view's glosses beside a word-view gloss, Lane's beside Lane's
    const wordView = !!o.here_en && !o.here_sense;
    const pick = (g: Group) => (wordView ? g.wv : g.gloss);
    const pool = [...shuffle(c.groups.filter((g) => g.root !== o.root && pick(g) && g.pos === o.pos)),
                  ...shuffle(c.groups.filter((g) => g.root !== o.root && pick(g) && g.pos !== o.pos))].map((g) => pick(g)!);
    const others = pickOthers(meaning.toLowerCase(), pool, (x) => x.toLowerCase());
    if (others.length < 3) return null;
    const here = !!o.here_en;
    const d: Drill = { ...base, id, kind: 'feature', ask, prompt: `What does ${o.word_text} mean here?`,
      options: shuffle([meaning, ...others]), answer: meaning, note: { en: `${lemma} · ${root}`, ar: lemma },
      explanation: `${lemma} (root ${root}): ${meaning} — ${here ? `the sense ${mRef} files this āyah under` : `${mRef ?? 'the lemma\'s gloss'}`}.`,
      badges: badge(here ? `${(o.here_ref ?? '').split(',')[0]} · meaning here` : 'Qurʾān · meaning', 'المَعْنَى هُنَا') };
    return card(d, `meaning:${key(o)}`, `${o.word_text} — meaning here?`, `${meaning}${mRef ? `\n${mRef}` : ''}`, 'Meanings');
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
    const opt = (x: Sense) => { const ex = exOf(x, here); const lab = clip(labelOf(x), 150); return ex ? `${lab} · e.g. ${ex}` : lab; };
    const answer = opt(s);
    const src = SRC[s.source];
    const note = c.noteOf.get(`${key(o)}|${s.id}`);
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
