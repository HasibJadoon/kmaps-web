import type { Router } from '../../../shared/src/router';
import { ok, badRequest } from '../../../shared/src/response';
import { query } from '../../../shared/src/db';
import { cached } from '../../../shared/src/cache';
import type { ArLinguisticsEnv } from '../env';

// ── Meaning arcs: root → lemma → word ─────────────────────────────────────────
// The hand-built layer first (ar_ling_sense_arc + steps, ar_ling_root_dna, ar_ling_root_tatawwur,
// ar_ling_lemma_arc — it outranks anything derived), then the DERIVED arcs (0114, meaning_arcs.py):
// each source's own arc (Ibn Fāris's aṣl and branches, Lane's senses in his order, al-Rāghib's
// Qurʾānic senses, the Tāj/Lisān/Ṣiḥāḥ/… statements read by their own markers), and the combined arc
// that aligns them — every rung saying which sources give it and where each places it, every edge
// the formula a source writes, quoted.
//
//   GET /al/arc/root/:root     hand-built, then derived: combined rungs (with the sources, the lemmas
//                              that carry each, sample Qurʾānic words), edges, each source's arc, the
//                              lemma sub-arcs, and where the sources disagree on the order
//   GET /al/arc/lemma/:lemma   one Qurʾānic lemma's sub-arc: the combined rungs it carries (and how the
//                              match was made), Lane's senses under its headword, its words on each rung
//   GET /al/drill/meaning-arcs?asks=&roots=&surah=&from=&to=&n=
//                              drill material for the QR skill 'meaning_arc' (practice-arc2.ts)

type RungRow = { id: string; arc_id: string; root_norm: string; source_slug: string; seq: number; tier: string; kind: string;
  head_ar: string | null; label_ar: string | null; label_en: string | null; quote_ar: string | null; quote_en: string | null;
  step_en?: string | null; marker: string | null; page: string | null; block_id: string | null; fact_id: string | null; vocab_sense_id: string | null;
  found_under: string | null; key_rank: number | null; combined_id: string | null; attest_json: string | null; ayat_json: string | null;
  n_words: number; confidence: string };
type EdgeRow = { id: string; arc_id: string; source_slug: string; from_id: string; to_id: string; relation: string; marker_key: string | null;
  formula: string; quote_ar: string | null; quote_en: string | null; block_id: string | null; also_json: string | null };
type WordRow = { surah: number; ayah: number; word_index: number; lemma_ar: string | null; word_text: string | null; rung_id: string | null;
  src_rung_id: string; source_slug: string; how: string; note_ar: string | null };
type LemmaRow = { root_norm: string; lemma_ar: string; rung_id: string; combined_id: string | null; source_slug: string; how: string;
  seq: number | null; head_ar: string | null; label_en: string | null; marker: string | null; block_id: string | null; page: string | null; n_words: number | null };
type Attest = { source: string; rung_id: string; seq: number; of: number; found_under: string | null; kind: string };

export const SOURCES: Record<string, { en: string; short: string; ar: string }> = {
  maqayis_lugha: { en: 'Ibn Fāris, Maqāyīs al-Lugha', short: 'Ibn Fāris', ar: 'مقاييس اللغة' },
  lane_lexicon: { en: 'Lane, Arabic–English Lexicon', short: 'Lane', ar: 'معجم لين' },
  raghib_mufradat: { en: 'al-Rāghib, al-Mufradāt', short: 'al-Rāghib', ar: 'المفردات' },
  zabidi_taj_arus: { en: 'al-Zabīdī, Tāj al-ʿArūs', short: 'the Tāj', ar: 'تاج العروس' },
  ibn_manzur_lisan_arab: { en: 'Ibn Manẓūr, Lisān al-ʿArab', short: 'the Lisān', ar: 'لسان العرب' },
  jawhari_sihah: { en: 'al-Jawharī, al-Ṣiḥāḥ', short: 'the Ṣiḥāḥ', ar: 'الصحاح' },
  qamus_muhit: { en: 'al-Fīrūzābādī, al-Qāmūs al-Muḥīṭ', short: 'the Qāmūs', ar: 'القاموس المحيط' },
  fayyumi_misbah_munir: { en: 'al-Fayyūmī, al-Miṣbāḥ al-Munīr', short: 'the Miṣbāḥ', ar: 'المصباح المنير' },
  khalil_kitab_ayn: { en: 'al-Khalīl, Kitāb al-ʿAyn', short: 'al-Khalīl', ar: 'العين' },
  ubab_zakhir: { en: 'al-Ṣaghānī, al-ʿUbāb al-Zākhir', short: 'al-Ṣaghānī', ar: 'العباب الزاخر' },
  mir_verbal_idioms: { en: 'Mir, Verbal Idioms of the Qurʾān', short: 'Mir', ar: 'مير' },
  combined: { en: 'the sources aligned', short: 'combined', ar: 'المصادر مجتمعة' },
};
export const RELATION: Record<string, string> = {
  branch: 'a branch of the aṣl', outside: 'outside the aṣl (shādhdh)', extension: 'extended from it', metaphor: 'borrowed from it (istiʿāra / majāz)',
  metonymy: 'by metonymy (kināya)', naming: 'named for it', usage: 'used for it', origin: 'its origin',
};

const parse = <T>(s: string | null | undefined, d: T): T => { try { return s ? JSON.parse(s) as T : d; } catch { return d; } };
const norm = (r: string) => decodeURIComponent(r).trim();
export const cite = (r: { source_slug: string; page: string | null; marker: string | null; found_under?: string | null }, root: string) => {
  const s = SOURCES[r.source_slug]?.en ?? r.source_slug;
  const under = r.found_under && r.found_under !== root ? `, s.v. ${r.found_under}` : `, s.v. ${root}`;
  const pg = r.page ? `, p. ${r.page}` : '';
  const mk = r.source_slug === 'lane_lexicon' && r.marker ? `, sense ${r.marker.trim()}` : '';
  return `${s}${under}${pg}${mk}`;
};

function rungOut(r: RungRow, root: string) {
  return {
    id: r.id, seq: r.seq, tier: r.tier, kind: r.kind, source: r.source_slug, headAr: r.head_ar, labelAr: r.label_ar, labelEn: r.label_en, stepEn: r.step_en ?? null,
    quoteAr: r.quote_ar, quoteEn: r.quote_en, marker: r.marker, page: r.page, foundUnder: r.found_under,
    combinedId: r.combined_id, ayat: parse<string[]>(r.ayat_json, []), nWords: r.n_words, confidence: r.confidence,
    cite: r.source_slug === 'combined' ? null : cite(r, root),
    blockId: r.block_id, factId: r.fact_id, vocabSenseId: r.vocab_sense_id,
  };
}

async function handBuilt(env: ArLinguisticsEnv, root: string) {
  const [arcs, dna, tat, lemmaArcs] = await Promise.all([
    query<{ id: string; scope_level: string; scope_key: string; arc_en: string | null; arc_ar: string | null; is_primary: number; status: string }>(env.DB_AL,
      `SELECT id, scope_level, scope_key, arc_en, arc_ar, is_primary, status FROM ar_ling_sense_arc WHERE root_norm = ? AND status <> 'rejected'
        ORDER BY is_primary DESC, id`, [root]),
    query<{ core_ar: string | null; core_en: string | null; headline_en: string | null; headline_ar: string | null; poles_json: string; status: string }>(env.DB_AL,
      `SELECT core_ar, core_en, headline_en, headline_ar, poles_json, status FROM ar_ling_root_dna WHERE root_norm = ?`, [root]).catch(() => []),
    query<{ stage_no: number; stage_ar: string; stage_en: string | null; note_en: string | null; source_ref: string | null }>(env.DB_AL,
      `SELECT stage_no, stage_ar, stage_en, note_en, source_ref FROM ar_ling_root_tatawwur WHERE root_norm = ? AND status <> 'rejected' ORDER BY stage_no`, [root]).catch(() => []),
    query<{ id: string; construction_ar: string; arc_ar: string; arc_en: string; attest_count: number }>(env.DB_AL,
      `SELECT id, construction_ar, arc_ar, arc_en, attest_count FROM ar_ling_lemma_arc WHERE root_norm = ? AND status = 'live'`, [root]).catch(() => []),
  ]);
  const steps = arcs.length ? await query<{ arc_id: string; step_no: number; note_md: string | null; label_ar: string | null; label_en: string | null;
      gloss_ar: string | null; gloss_en: string | null }>(env.DB_AL,
    `SELECT s.arc_id, s.step_no, s.note_md, r.label_ar, r.label_en, r.gloss_ar, r.gloss_en FROM ar_ling_sense_arc_step s
       JOIN ar_ling_root_sense r ON r.id = s.sense_id WHERE s.arc_id IN (${arcs.map(() => '?').join(',')}) ORDER BY s.arc_id, s.step_no`,
    arcs.map((a) => a.id)) : [];
  return {
    origin: 'hand-built',
    arcs: arcs.map((a) => ({ id: a.id, scope: a.scope_level, scopeKey: a.scope_key, title: a.arc_en, titleAr: a.arc_ar, primary: !!a.is_primary,
      status: a.status, steps: steps.filter((s) => s.arc_id === a.id).map((s) => ({ n: s.step_no, labelEn: s.label_en, labelAr: s.label_ar,
        glossEn: s.gloss_en, glossAr: s.gloss_ar, note: s.note_md })) })),
    dna: dna[0] ? { coreAr: dna[0].core_ar, coreEn: dna[0].core_en, headlineEn: dna[0].headline_en, headlineAr: dna[0].headline_ar,
                    poles: parse(dna[0].poles_json, []), status: dna[0].status } : null,
    tatawwur: tat.map((t) => ({ n: t.stage_no, ar: t.stage_ar, en: t.stage_en, note: t.note_en, sourceRef: t.source_ref })),
    lemmaArcs: lemmaArcs.map((l) => ({ id: l.id, construction: l.construction_ar, arcAr: l.arc_ar, arcEn: l.arc_en, attested: l.attest_count })),
  };
}

/// pairs of combined rungs two sources order oppositely
export function disagreements(rungs: Array<{ seq: number; attest: Attest[] }>) {
  const out: Array<{ a: number; b: number; aFirst: string[]; bFirst: string[] }> = [];
  for (let i = 0; i < rungs.length; i++) for (let j = i + 1; j < rungs.length; j++) {
    const A = new Map(rungs[i].attest.map((x) => [x.source, x.seq]));
    const aFirst: string[] = [], bFirst: string[] = [];
    for (const x of rungs[j].attest) {
      const sa = A.get(x.source);
      if (sa === undefined || sa === x.seq) continue;
      (sa < x.seq ? aFirst : bFirst).push(x.source);
    }
    if (aFirst.length && bFirst.length) out.push({ a: rungs[i].seq, b: rungs[j].seq, aFirst: [...new Set(aFirst)], bFirst: [...new Set(bFirst)] });
  }
  return out;
}

async function derived(env: ArLinguisticsEnv, root: string, wordsPerRung = 3) {
  const [arcs, rungs, edges, lemmas, words] = await Promise.all([
    query<{ id: string; scope: string; source_slug: string | null; n_rungs: number; n_edges: number; keys_json: string | null; handbuilt: number }>(env.DB_AL,
      `SELECT id, scope, source_slug, n_rungs, n_edges, keys_json, handbuilt FROM ar_ling_arc WHERE root_norm = ?`, [root]),
    query<RungRow>(env.DB_AL, `SELECT * FROM ar_ling_arc_rung WHERE root_norm = ? ORDER BY arc_id, seq`, [root]),
    query<EdgeRow>(env.DB_AL, `SELECT id, arc_id, source_slug, from_id, to_id, relation, marker_key, formula, quote_ar, quote_en, block_id, also_json
                                 FROM ar_ling_arc_edge WHERE root_norm = ?`, [root]),
    query<LemmaRow>(env.DB_AL, `SELECT * FROM ar_ling_arc_lemma_rung WHERE root_norm = ?`, [root]),
    query<WordRow>(env.DB_AL, `SELECT surah, ayah, word_index, lemma_ar, word_text, rung_id, src_rung_id, source_slug, how, note_ar
                                 FROM ar_ling_arc_word WHERE root_norm = ? ORDER BY surah, ayah, word_index`, [root]),
  ]);
  if (!arcs.length) return null;
  const comb = rungs.filter((r) => r.source_slug === 'combined');
  const bySeq = new Map(comb.map((r) => [r.id, r.seq]));
  const lemmasOf = new Map<string, Set<string>>();
  for (const l of lemmas) if (l.combined_id && l.how !== 'ambiguous') lemmasOf.set(l.combined_id, (lemmasOf.get(l.combined_id) ?? new Set()).add(l.lemma_ar));
  const wordsOf = new Map<string, WordRow[]>();
  for (const w of words) if (w.rung_id) wordsOf.set(w.rung_id, [...(wordsOf.get(w.rung_id) ?? []), w]);
  const wordOut = (w: WordRow) => ({ ref: `${w.surah}:${w.ayah}`, surah: w.surah, ayah: w.ayah, wordIndex: w.word_index, wordText: w.word_text,
    lemma: w.lemma_ar, source: w.source_slug, how: w.how, note: w.note_ar });
  const combined = comb.map((r) => {
    const attest = parse<Attest[]>(r.attest_json, []);
    const ws = wordsOf.get(r.id) ?? [];
    return { ...rungOut(r, root), attest: attest.map((a) => ({ ...a, name: SOURCES[a.source]?.short ?? a.source })),
             lemmas: [...(lemmasOf.get(r.id) ?? [])], nWords: new Set(ws.map((w) => `${w.surah}:${w.ayah}:${w.word_index}`)).size,
             words: ws.filter((w, i, a) => a.findIndex((x) => x.surah === w.surah && x.ayah === w.ayah && x.word_index === w.word_index) === i)
               .slice(0, wordsPerRung).map(wordOut) };
  });
  const edgeOut = (e: EdgeRow) => ({ id: e.id, source: e.source_slug, from: bySeq.get(e.from_id) ?? e.from_id, to: bySeq.get(e.to_id) ?? e.to_id,
    fromId: e.from_id, toId: e.to_id, relation: e.relation, relationLabel: RELATION[e.relation] ?? e.relation, formula: e.formula,
    quoteAr: e.quote_ar, quoteEn: e.quote_en, also: parse(e.also_json, []) });
  const sources = arcs.filter((a) => a.scope === 'source').map((a) => {
    const rs = rungs.filter((r) => r.arc_id === a.id);
    const seqOf = new Map(rs.map((r) => [r.id, r.seq]));
    return { source: a.source_slug, name: SOURCES[a.source_slug ?? '']?.en ?? a.source_slug, nameAr: SOURCES[a.source_slug ?? '']?.ar ?? null,
             keys: parse<string[]>(a.keys_json, []),
             rungs: rs.map((r) => ({ ...rungOut(r, root), combinedSeq: r.combined_id ? bySeq.get(r.combined_id) ?? null : null })),
             edges: edges.filter((e) => e.arc_id === a.id).map((e) => ({ ...edgeOut(e), from: seqOf.get(e.from_id) ?? null, to: seqOf.get(e.to_id) ?? null })) };
  }).sort((x, y) => Object.keys(SOURCES).indexOf(x.source ?? '') - Object.keys(SOURCES).indexOf(y.source ?? ''));
  // the lemma sub-arcs
  const lemmaMap = new Map<string, LemmaRow[]>();
  for (const l of lemmas) if (l.how !== 'ambiguous') lemmaMap.set(l.lemma_ar, [...(lemmaMap.get(l.lemma_ar) ?? []), l]);
  const lemmaOut = [...lemmaMap.entries()].map(([lemma, ls]) => {
    const clear = ls.filter((l) => l.how !== 'ambiguous');
    const seqs = [...new Set(clear.map((l) => l.combined_id).filter((x): x is string => !!x).map((id) => bySeq.get(id)).filter((x): x is number => x != null))].sort((a, b) => a - b);
    const lane = clear.filter((l) => l.source_slug === 'lane_lexicon' && l.label_en).sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0))
      .map((l) => ({ seq: l.seq, en: l.label_en, marker: l.marker, page: l.page, head: l.head_ar, how: l.how }));
    return { lemma, rungs: seqs, lane, how: [...new Set(ls.map((l) => l.how))], ambiguous: ls.some((l) => l.how === 'ambiguous'),
             nWords: new Set(words.filter((w) => w.lemma_ar === lemma).map((w) => `${w.surah}:${w.ayah}:${w.word_index}`)).size };
  }).sort((a, b) => b.nWords - a.nWords || b.rungs.length - a.rungs.length);
  const combArc = arcs.find((a) => a.scope === 'combined');
  return {
    origin: 'derived', method: 'meaning_arcs.py/v1', keys: parse<string[]>(combArc?.keys_json, []),
    combined: { rungs: combined, edges: edges.filter((e) => e.arc_id === combArc?.id).map(edgeOut) },
    disagreements: disagreements(combined).slice(0, 20),
    sources, lemmas: lemmaOut,
    // headwords a source gives that match more than one of the root's lemmas (a bare عالم: عَالِم or عَٰلَم?) — not attached
    ambiguousHeadwords: lemmas.filter((l) => l.how === 'ambiguous').map((l) => ({ source: l.source_slug, head: l.head_ar, candidates: l.lemma_ar.split('|') })),
    words: { placed: new Set(words.map((w) => `${w.surah}:${w.ayah}:${w.word_index}`)).size },
  };
}


// ── a root, deeper: its aṣl by every book, its core and its meaning's layers ─────────────────────
//
// What a root's page shows under its card. The aṣl (ar_ling_root_asl): the meaning most books share as the
// primary, then each book's own words, oldest first, each with the page and block it rests on. The core
// (ar_ling_root_dna), the root's meaning as layers — its root-scope arcs, step by step (ar_ling_sense_arc) — and
// the stages its meaning went through (ar_ling_root_tatawwur).

/** Books the aṣl reads that the arc sources do not name. */
const ASL_BOOK: Record<string, string> = {
  ibn_durayd_jamharat_lugha: 'Jamhara', azhari_tahdhib_lugha: 'al-Tahdhīb', ibn_sidah_muhkam: 'al-Muḥkam',
  zamakhshari_asas_balagha: 'al-Asās', ibn_sida_mukhassas: 'al-Mukhaṣṣaṣ',
};
export type AslRow = { id: string; source_slug: string | null; statement_ar: string; statement_en: string | null; page_ref: string | null;
                       block_id: string | null; death_hijri: number | null; is_primary: number; confidence: string };
type Hand = Awaited<ReturnType<typeof handBuilt>>;

/** The deep root: the aṣl (primary first, then each book oldest first), the core, the layers, the stages. */
export function deepRoot(root: string, asl: AslRow[], hand: Hand) {
  const book = (slug: string | null) => (slug ? ASL_BOOK[slug] ?? SOURCES[slug]?.short?.replace(/^the /, '') ?? slug : '');
  const row = (r: AslRow) => ({
    ar: r.statement_ar, en: r.statement_en, deathHijri: r.death_hijri,
    // the book it rests on, as a back-link: the lexicon reader at that block
    source: r.source_slug ? { book: book(r.source_slug), page: r.page_ref && /^\d+$/.test(r.page_ref) ? Number(r.page_ref) : null,
                              source: r.source_slug, root, block: r.block_id } : null,
  });
  const primary = asl.find((r) => r.is_primary === 1) ?? null;
  const rest = asl.filter((r) => r !== primary)
    .sort((a, b) => (a.death_hijri ?? 9999) - (b.death_hijri ?? 9999) || (a.source_slug ?? '').localeCompare(b.source_slug ?? ''));
  return {
    root,
    asl: primary || rest.length ? { primary: primary ? row(primary) : null, books: rest.map(row) } : null,
    core: hand.dna ? { en: hand.dna.coreEn, ar: hand.dna.coreAr, headline: hand.dna.headlineEn, headlineAr: hand.dna.headlineAr } : null,
    // the root-scope arcs, primary first: how its meaning grows, step by step, each step with its Arabic
    layers: hand.arcs.filter((a) => a.scope === 'root' && a.status !== 'rejected').map((a) => ({
      id: a.id, title: a.title, titleAr: a.titleAr, primary: a.primary,
      steps: a.steps.map((s) => ({ n: s.n, en: s.labelEn ?? s.glossEn, ar: s.labelAr, glossEn: s.glossEn, glossAr: s.glossAr })) })),
    stages: hand.tatawwur.map((t) => ({ n: t.n, ar: t.ar, en: t.en, note: t.note })),
  };
}

/** A synthesized root, as a row of the Root Synthesis list: its aṣl (the primary statement), how many books it is
 *  read from, how many meaning layers it has. */
type SynthRow = { root: string; books: number; en: string | null; ar: string | null; layers: number };

export function arcRoutes(router: Router<ArLinguisticsEnv>) {
  // every root with an aṣl, root by root in letter order — the Root Synthesis list; each opens the root's own page
  router.get('/al/root/synthesis', (req, env) => cached(req, async () => {
    const rows = await query<SynthRow>(env.DB_AL,
      `WITH asl AS (SELECT root_norm, COUNT(*) AS books,
                           MAX(CASE WHEN is_primary = 1 THEN statement_en END) AS en,
                           MAX(CASE WHEN is_primary = 1 THEN statement_ar END) AS ar
                      FROM ar_ling_root_asl WHERE status = 'active' GROUP BY root_norm),
            lay AS (SELECT root_norm, COUNT(*) AS layers FROM ar_ling_sense_arc
                     WHERE scope_level = 'root' AND status <> 'rejected' GROUP BY root_norm)
       SELECT asl.root_norm AS root, books, en, ar, COALESCE(layers, 0) AS layers
         FROM asl LEFT JOIN lay USING (root_norm) ORDER BY asl.root_norm`);
    return ok({
      labels: {
        title: 'Root Synthesis', titleAr: 'توليف الجذر',
        detail: 'Every root whose first meaning is drawn from the books — root by root',
        search: 'Find a root', books: 'books', layers: 'layers',
      },
      total: rows.length,
      roots: rows.map((r) => ({ ...r, letter: [...r.root][0] ?? '' })),
    });
  }, { browser: 60, edge: 3600 }));

  router.get('/al/root/deep/:root', async (_req, env, params) => {
    const root = norm(params.root ?? '');
    if (!root) return badRequest('root required');
    const [asl, hand] = await Promise.all([
      query<AslRow>(env.DB_AL,
        `SELECT id, source_slug, statement_ar, statement_en, page_ref, block_id, death_hijri, is_primary, confidence
           FROM ar_ling_root_asl WHERE root_norm = ? AND status = 'active'`, [root]),
      handBuilt(env, root),
    ]);
    return ok(deepRoot(root, asl, hand));
  });
  router.get('/al/arc/root/:root', async (_req, env, params) => {
    const root = norm(params.root ?? '');
    if (!root) return badRequest('root required');
    const [hand, der] = await Promise.all([handBuilt(env, root), derived(env, root)]);
    return ok({ root, handBuilt: hand, derived: der, sources: SOURCES });
  });

  router.get('/al/arc/lemma/:lemma', async (_req, env, params) => {
    const lemma = norm(params.lemma ?? '');
    if (!lemma) return badRequest('lemma required');
    const ls = await query<LemmaRow>(env.DB_AL, `SELECT * FROM ar_ling_arc_lemma_rung WHERE lemma_ar = ?`, [lemma]);
    const wordsL = await query<WordRow & { root_norm: string }>(env.DB_AL,
      `SELECT surah, ayah, word_index, lemma_ar, word_text, rung_id, src_rung_id, source_slug, how, note_ar, root_norm
         FROM ar_ling_arc_word WHERE lemma_ar = ? ORDER BY surah, ayah, word_index`, [lemma]);
    const root = ls[0]?.root_norm ?? (wordsL[0] as { root_norm?: string } | undefined)?.root_norm ?? null;
    if (!root) return ok({ lemma, root: null, rungs: [], lane: [], ambiguous: [], words: { placed: 0 } });
    const ids = [...new Set([...ls.map((l) => l.combined_id), ...wordsL.map((w) => w.rung_id)].filter((x): x is string => !!x))];
    const rungs = ids.length ? await query<RungRow>(env.DB_AL, `SELECT * FROM ar_ling_arc_rung WHERE id IN (${ids.map(() => '?').join(',')}) ORDER BY seq`, ids) : [];
    const srcIds = [...new Set(ls.filter((l) => l.source_slug !== 'lane_lexicon' || l.how === 'placed-word').map((l) => l.rung_id))];
    const srcRungs = srcIds.length ? await query<RungRow>(env.DB_AL, `SELECT * FROM ar_ling_arc_rung WHERE id IN (${srcIds.map(() => '?').join(',')})`, srcIds) : [];
    const byId = new Map(srcRungs.map((r) => [r.id, r]));
    return ok({
      lemma, root,
      rungs: rungs.map((r) => {
        const mine = ls.filter((l) => l.combined_id === r.id);
        const ws = wordsL.filter((w) => w.rung_id === r.id);
        return { ...rungOut(r, root), attest: parse<Attest[]>(r.attest_json, []).map((a) => ({ ...a, name: SOURCES[a.source]?.short ?? a.source })),
                 how: [...new Set(mine.map((l) => l.how).concat(ws.length ? ['placed-word'] : []))],
                 bySources: mine.filter((l) => byId.has(l.rung_id)).map((l) => { const s = byId.get(l.rung_id)!; return { source: s.source_slug, seq: s.seq,
                   labelAr: s.label_ar, labelEn: s.label_en, cite: cite(s, root), how: l.how }; }),
                 words: ws.slice(0, 12).map((w) => ({ ref: `${w.surah}:${w.ayah}`, wordIndex: w.word_index, wordText: w.word_text, source: w.source_slug, note: w.note_ar })) };
      }),
      // Lane under this lemma's headword, in his order — the lemma's own sub-arc in his words
      lane: ls.filter((l) => l.source_slug === 'lane_lexicon' && l.label_en).sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0))
        .map((l) => ({ seq: l.seq, en: l.label_en, marker: l.marker, page: l.page, head: l.head_ar, how: l.how,
                       cite: `Lane, Arabic–English Lexicon, s.v. ${l.head_ar ?? lemma}${l.page ? `, p. ${l.page}` : ''}${l.marker ? `, sense ${l.marker.trim()}` : ''}` })),
      ambiguous: ls.filter((l) => l.how === 'ambiguous').map((l) => ({ source: l.source_slug, head: l.head_ar, rung: l.rung_id })),
      words: { placed: new Set(wordsL.map((w) => `${w.surah}:${w.ayah}:${w.word_index}`)).size },
    });
  });

  router.get('/al/drill/meaning-arcs', async (req, env) => {
    const u = new URL(req.url);
    const n = Math.min(40, Math.max(1, Number(u.searchParams.get('n') ?? 8)));
    const asks = (u.searchParams.get('asks') ?? 'arc_core').split(',').map((s) => s.trim()).filter(Boolean);
    const roots = (u.searchParams.get('roots') ?? '').split(',').map((r) => r.trim()).filter(Boolean).slice(0, 80);
    const surah = Number(u.searchParams.get('surah') ?? 0) || null;
    const from = Number(u.searchParams.get('from') ?? 0) || null;
    const to = Number(u.searchParams.get('to') ?? 0) || null;
    return ok(await drillMaterial(env, asks, roots, { surah, from, to }, n));
  });
}

// ── drill material ─────────────────────────────────────────────────────────────
// Each ask draws what it needs, and only from what the sources say: the aṣl (Ibn Fāris's thesis),
// the combined rungs, the source arcs in their own order, the lemma sub-arcs, the words placed on a
// rung, the edges (their formulae), and the orders the sources disagree on.

const inList = (xs: unknown[]) => xs.map(() => '?').join(',');
const pick = <T>(xs: T[], k: number) => [...xs].sort(() => Math.random() - 0.5).slice(0, k);

async function drillMaterial(env: ArLinguisticsEnv, asks: string[], roots: string[], scope: { surah: number | null; from: number | null; to: number | null },
                             n: number) {
  const out: Record<string, unknown[]> = {};
  const rootClause = roots.length ? `AND root_norm IN (${inList(roots)})` : '';
  const per = Math.max(2, Math.ceil(n * 1.5));
  const combinedOf = async (rs: string[]) => rs.length ? query<RungRow>(env.DB_AL,
    `SELECT * FROM ar_ling_arc_rung WHERE source_slug = 'combined' AND root_norm IN (${inList(rs)}) ORDER BY root_norm, seq`, rs) : [];
  for (const ask of asks) {
    if (ask === 'arc_core' || ask === 'arc_first') {
      // roots whose combined arc opens on an aṣl a source states, with ≥ 3 rungs
      const heads = await query<RungRow>(env.DB_AL,
        `SELECT * FROM ar_ling_arc_rung WHERE source_slug = 'combined' AND seq = 1 AND tier = 'asl' AND label_ar IS NOT NULL ${rootClause}
          ORDER BY random() LIMIT ?`, [...roots, per]);
      const rs = heads.map((h) => h.root_norm);
      const [all, src, others] = await Promise.all([
        combinedOf(rs),
        rs.length ? query<RungRow>(env.DB_AL, `SELECT * FROM ar_ling_arc_rung WHERE source_slug = 'maqayis_lugha' AND seq = 1 AND root_norm IN (${inList(rs)})`, rs) : [],
        query<RungRow>(env.DB_AL, `SELECT * FROM ar_ling_arc_rung WHERE source_slug = 'combined' AND seq = 1 AND tier = 'asl' AND label_ar IS NOT NULL
                                     ORDER BY random() LIMIT 40`),
      ]);
      out[ask] = heads.map((h) => ({ root: h.root_norm, first: rungOut(h, h.root_norm),
        rungs: all.filter((r) => r.root_norm === h.root_norm).map((r) => rungOut(r, h.root_norm)),
        asl: src.filter((s) => s.root_norm === h.root_norm).map((s) => ({ ...rungOut(s, h.root_norm) })),
        otherCores: others.filter((o) => o.root_norm !== h.root_norm).slice(0, 8).map((o) => ({ root: o.root_norm, labelAr: o.label_ar, labelEn: o.label_en })) }));
    } else if (ask === 'arc_order') {
      // a source's own arc, 3–6 rungs, to put back in its order
      const arcs = await query<{ id: string; root_norm: string; source_slug: string; n_rungs: number }>(env.DB_AL,
        `SELECT id, root_norm, source_slug, n_rungs FROM ar_ling_arc WHERE scope = 'source' AND source_slug IN ('maqayis_lugha','lane_lexicon','raghib_mufradat','zabidi_taj_arus','jawhari_sihah')
            AND n_rungs >= 3 ${rootClause} ORDER BY random() LIMIT ?`, [...roots, per]);
      const ids = arcs.map((a) => a.id);
      const rs = ids.length ? await query<RungRow>(env.DB_AL, `SELECT * FROM ar_ling_arc_rung WHERE arc_id IN (${inList(ids)}) ORDER BY arc_id, seq`, ids) : [];
      out[ask] = arcs.map((a) => ({ root: a.root_norm, source: a.source_slug, name: SOURCES[a.source_slug]?.en,
        rungs: rs.filter((r) => r.arc_id === a.id).map((r) => rungOut(r, a.root_norm)) }));
    } else if (ask === 'arc_lemma') {
      // a Lane sense under one lemma's headword; the root's other Qurʾānic lemmas to choose between
      const ls = await query<LemmaRow>(env.DB_AL,
        `SELECT * FROM ar_ling_arc_lemma_rung WHERE source_slug = 'lane_lexicon' AND how IN ('lane-form','vocalised','folded') AND label_en IS NOT NULL
            ${rootClause} AND length(label_en) BETWEEN 8 AND 120 ORDER BY random() LIMIT ?`, [...roots, per * 2]);
      const rs = [...new Set(ls.map((l) => l.root_norm))];
      const fam = rs.length ? await query<{ root_norm: string; lemma_ar: string }>(env.DB_AL,
        `SELECT DISTINCT root_norm, lemma_ar FROM ar_ling_arc_lemma_rung WHERE root_norm IN (${inList(rs)}) AND how <> 'ambiguous'`, rs) : [];
      const words = ls.length ? await query<WordRow & { root_norm: string }>(env.DB_AL,
        `SELECT surah, ayah, word_index, lemma_ar, word_text, rung_id, src_rung_id, source_slug, how, note_ar, root_norm FROM ar_ling_arc_word
          WHERE lemma_ar IN (${inList(ls.map((l) => l.lemma_ar))}) LIMIT 400`, ls.map((l) => l.lemma_ar)) : [];
      const seen = new Set<string>();
      out[ask] = ls.filter((l) => { const k = `${l.root_norm}|${l.lemma_ar}`; if (seen.has(k)) return false; seen.add(k); return true; })
        .map((l) => ({ root: l.root_norm, lemma: l.lemma_ar, labelEn: l.label_en, marker: l.marker, head: l.head_ar, page: l.page, how: l.how,
          cite: `Lane, Arabic–English Lexicon, s.v. ${l.head_ar ?? l.lemma_ar}${l.page ? `, p. ${l.page}` : ''}${l.marker ? `, sense ${l.marker.trim()}` : ''}`,
          family: fam.filter((f) => f.root_norm === l.root_norm).map((f) => f.lemma_ar),
          words: words.filter((w) => w.lemma_ar === l.lemma_ar).slice(0, 4).map((w) => ({ surah: w.surah, ayah: w.ayah, wordIndex: w.word_index })) }))
        .filter((x) => x.family.length >= 2);
    } else if (ask === 'arc_word') {
      // a word in its āyah on the rung a source files it under; the root's other rungs to choose between
      const w = scope.surah === null ? { sql: '1=1', args: [] as number[] }
        : scope.from && scope.to ? { sql: 'surah = ? AND ayah BETWEEN ? AND ?', args: [scope.surah, scope.from, scope.to] }
        : { sql: 'surah = ?', args: [scope.surah] };
      const ws = await query<WordRow & { root_norm: string }>(env.DB_AL,
        `SELECT surah, ayah, word_index, lemma_ar, word_text, rung_id, src_rung_id, source_slug, how, note_ar, root_norm FROM ar_ling_arc_word
          WHERE rung_id IS NOT NULL AND ${w.sql} ${rootClause} ORDER BY random() LIMIT ?`, [...w.args, ...roots, per * 2]);
      const rs = [...new Set(ws.map((x) => x.root_norm))];
      const srcIds = [...new Set(ws.map((x) => x.src_rung_id))];
      const [comb, srcs] = await Promise.all([combinedOf(rs),
        srcIds.length ? query<RungRow>(env.DB_AL, `SELECT * FROM ar_ling_arc_rung WHERE id IN (${inList(srcIds)})`, srcIds) : Promise.resolve([] as RungRow[])]);
      const seen = new Set<string>();
      out[ask] = ws.filter((x) => { const k = `${x.surah}:${x.ayah}:${x.word_index}`; if (seen.has(k)) return false; seen.add(k); return true; })
        .map((x) => { const s = srcs.find((r) => r.id === x.src_rung_id);
          return { root: x.root_norm, surah: x.surah, ayah: x.ayah, wordIndex: x.word_index, wordText: x.word_text, lemma: x.lemma_ar, note: x.note_ar,
                   rung: comb.find((r) => r.id === x.rung_id) ? rungOut(comb.find((r) => r.id === x.rung_id)!, x.root_norm) : null,
                   by: s ? rungOut(s, x.root_norm) : null,
                   others: comb.filter((r) => r.root_norm === x.root_norm && r.id !== x.rung_id).map((r) => rungOut(r, x.root_norm)) }; })
        .filter((x) => x.rung && x.others.length >= 2);
    } else if (ask === 'arc_link') {
      // what a source writes between two of its rungs — the formula, quoted
      const es = await query<EdgeRow & { root_norm: string }>(env.DB_AL,
        `SELECT id, arc_id, source_slug, from_id, to_id, relation, marker_key, formula, quote_ar, quote_en, block_id, also_json, root_norm
           FROM ar_ling_arc_edge WHERE source_slug <> 'combined' AND arc_id NOT LIKE '%:combined' ${rootClause}
            AND length(coalesce(quote_ar, quote_en, '')) >= 20 ORDER BY random() LIMIT ?`, [...roots, per * 2]);
      const ids = [...new Set(es.flatMap((e) => [e.from_id, e.to_id]))];
      const [rs, other] = await Promise.all([
        ids.length ? query<RungRow>(env.DB_AL, `SELECT * FROM ar_ling_arc_rung WHERE id IN (${inList(ids)})`, ids) : Promise.resolve([] as RungRow[]),
        query<EdgeRow>(env.DB_AL, `SELECT id, arc_id, source_slug, from_id, to_id, relation, marker_key, formula, quote_ar, quote_en, block_id, also_json
                                     FROM ar_ling_arc_edge WHERE arc_id NOT LIKE '%:combined' ORDER BY random() LIMIT 60`),
      ]);
      const byId = new Map(rs.map((r) => [r.id, r]));
      out[ask] = es.filter((e) => byId.has(e.from_id) && byId.has(e.to_id)).map((e) => ({ root: e.root_norm, source: e.source_slug,
        name: SOURCES[e.source_slug]?.en, relation: e.relation, relationLabel: RELATION[e.relation] ?? e.relation, formula: e.formula,
        quoteAr: e.quote_ar, quoteEn: e.quote_en,
        from: rungOut(byId.get(e.from_id)!, e.root_norm), to: rungOut(byId.get(e.to_id)!, e.root_norm),
        otherFormulas: [...new Set(other.filter((o) => o.source_slug === e.source_slug && o.formula !== e.formula).map((o) => o.formula))].slice(0, 6),
        otherRelations: [...new Set(other.map((o) => o.relation).filter((r) => r !== e.relation))] }));
    } else if (ask === 'arc_disagree') {
      // two combined rungs the sources order oppositely
      const cand = await query<{ root_norm: string }>(env.DB_AL,
        `SELECT root_norm FROM ar_ling_arc WHERE scope = 'combined' AND n_sources >= 3 AND n_rungs >= 4 ${rootClause} ORDER BY random() LIMIT ?`, [...roots, per * 3]);
      const rs = cand.map((c) => c.root_norm);
      const all = await combinedOf(rs);
      const items: unknown[] = [];
      for (const root of rs) {
        const mine = all.filter((r) => r.root_norm === root).map((r) => ({ ...rungOut(r, root), attest: parse<Attest[]>(r.attest_json, []) }));
        const d = disagreements(mine);
        if (!d.length) continue;
        const x = pick(d, 1)[0];
        items.push({ root, a: mine.find((r) => r.seq === x.a), b: mine.find((r) => r.seq === x.b), aFirst: x.aFirst, bFirst: x.bFirst });
        if (items.length >= per) break;
      }
      out[ask] = items;
    }
  }
  return { asks: out, sources: SOURCES, relations: RELATION };
}
