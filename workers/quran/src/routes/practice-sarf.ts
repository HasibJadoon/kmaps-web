import { query } from '../../../shared/src/db';
import type { QuranEnv } from '../env';
import { createAlClient, type AlSarfSheet, type ResolvedLemma } from '../clients/al.client';
import { withCard, shuffle, parseJson, rangeOf, interleave, type Drill, type Scope } from './practice-kit';

// ── الصرف: the passage's words, their forms, prepositions, family and meanings in the Qurʾān ──────
//
// The passage's words are QR's (qr_sarf_word, qr_word_occurrence: what each word is and means in its
// verse). Everything about the LANGUAGE is AL's, by global root and lemma id (/al/sarf/sheet,
// /al/lemmas/resolve): each verb's الصرف الصغير, the prepositions the Qurʾān shows and what each does,
// the root's picture, other verbs and opposites, each lemma's range, arc, form facts and plurals, and
// the near-synonym sets. Every label is a GT term; every Qurʾān quotation is cut from the muṣḥaf text
// (qr_ayah.text_uthmani) by its citation's bare needle.
//
//   sf_table    the table with one form hidden          sf_plural  واحد → its Qurʾānic جمع
//   sf_bab      a bare verb's باب                        sf_prep    which preposition gives this meaning
//   sf_form     a derived verb's form                    sf_range   what the word means in this āyah
//   sf_masadir  every مصدر of the verb (choose all)      sf_family  what a verb of the root means
//   sf_root     the root's picture                       sf_near    which near-synonym has this shade

type Cite = { surah: number; ayah: number; needle: string };
type Verb = { id: string; root: string; form_gt: string; bab_gt: string | null; root_type_gt: string | null; route_gt: string | null;
              maani_gt: string | null; meaning_en: string; madi: string; mudari: string; masadir_json: string; fail: string | null;
              fail_gt: string | null; madi_majhul: string | null; mudari_majhul: string | null; maful: string | null; amr: string | null;
              nahy: string | null; zarf_json: string | null; ala_json: string | null; others_json: string | null; quran_n: number;
              cite_json: string | null; full: number; note_en: string | null; lemma_id?: string | null };
type Prep = { id: string; verb_id: string; prep_ar: string; prep_gt: string | null; usage_ar: string; meaning_en: string; cite_json: string; sources: Src[] };
type Word = { surah: number; ayah: number; word_index: number; word_ar: string; root: string; verb_id: string | null; sigha_gt: string | null;
              pattern_ar: string | null; prep_json: string | null };
// the Qurʾānic word itself (qr_word_occurrence): QAC's parse and what it means in this āyah
type Occ = { surah: number; ayah: number; word_index: number; lemma: string | null; gid_lemma: string | null; root_uid: string | null;
             here_en: string | null;
             gt_derivation_type: string | null; gt_form_family: string | null; gt_jumud: string | null; gt_case: string | null;
             gt_number: string | null; gt_gender: string | null; gt_definiteness: string | null };
// the case first (the iʿrāb sign), then what the word is made of
const OCC_GT = ['gt_case', 'gt_derivation_type', 'gt_form_family', 'gt_jumud', 'gt_number', 'gt_gender', 'gt_definiteness'] as const;
/** The card is the word in its verse: its case and what it is in this sentence (number, gender, definiteness). What the
 *  word IS — derivation, form family, مشتق/جامد, pattern — is the lemma's, and the detail screen has it (lemmaProps). */
const VERSE_GT = ['gt_case', 'gt_number', 'gt_gender', 'gt_definiteness'] as const;
type Sense = { id: string; root: string; lemma_ar: string; lemma_id: string | null; sense_en: string; sense_ar: string | null; cites_json: string };
type Near = { id: string; root: string; roots: string[]; lemmas: string[]; focus_ar: string; title_en: string; title_ar: string; members_json: string;
              sources: Src[];
              contrast: string | null };
/** A book a line rests on, for the app's back-link: the book's short name, its printed page, and where to open it
 *  (the lexicon reader: source + root). */
type Src = { book: string; page: number | null; source: string; root: string; block?: string };
const BOOK: Record<string, string> = {
  raghib_mufradat: 'al-Rāghib', lane_lexicon: 'Lane', ibn_manzur_lisan_arab: 'Lisān', maqayis_lugha: 'Maqāyīs',
  jawhari_sihah: 'al-Ṣiḥāḥ', zabidi_taj_arus: 'Tāj', fayyumi_misbah_munir: 'al-Miṣbāḥ', qamus_muhit: 'al-Qāmūs',
  khalil_kitab_ayn: 'al-ʿAyn', ibn_durayd_jamharat_lugha: 'Jamhara', zamakhshari_asas_balagha: 'al-Asās',
};
export const sourcesOf = (rows: { source_slug: string; page: number | null; root_norm: string; block_id?: string }[]): Src[] => {
  const seen = new Set<string>();
  return rows.map((r) => ({ book: BOOK[r.source_slug] ?? r.source_slug, page: r.page, source: r.source_slug, root: r.root_norm, block: r.block_id }))
    .filter((x) => { const k = `${x.source}|${x.page}|${x.root}`; if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => a.book.localeCompare(b.book) || (a.page ?? 0) - (b.page ?? 0));
};
/** The "— al-Rāghib pp. 699, 286; Lane p. 2590" tail of a line: the books now come as links (sources), so it is cut. */
export const stripRefs = (s: string | null) => (s ? s.replace(/\s+—\s+(?:al-|Lane|Lisān|Maqāyīs|Tāj|Ibn |Jamhara|Kitāb)[^—]*$/u, '').trim() : s);
type NearMember = { ar: string; en: string; contrast?: string | null; cite: Cite | null; lemmaId?: string | null };
type Plural = { ar: string; cite: Cite };
/** An opposite as a book states it; `forWord` names the word of the root it belongs to when that is not the root's main sense. */
type Opposite = { ar: string; en: string | null; kind: string; note: string | null; cites: Cite[]; lemmaId: string | null; forWord: string | null; sources: Src[];
                  /** the opposite's own root, as text, when the Qurʾān uses it — its page can be opened */ root: string | null };
type Construction = { lemmaId: string; lemma: string; construction: string; count: number; line: string; lineAr: string; note: string | null; sources: Src[];
                      quote: string | null; quoteEn: string | null };
/** What kind of opposite, in plain words (ar_ling_root_didd.relation_kind). */
const OPPOSITE_KIND: Record<string, string> = {
  antonym: 'opposite', naqid: 'opposite', contrary: 'opposite', contrast: 'set against it',
  addad_internal: 'one word, both meanings', contronym_internal: 'one word, both meanings', antithetical_pair: 'paired in the Qurʾān', derived_contrary: 'opposite' };
type Cell = { label: string; value: string };

/** The mazīd forms by number, as the family table names them. */
const FORM_ORDER = ['form_i', 'form_ii', 'form_iii', 'form_iv', 'form_v', 'form_vi', 'form_vii', 'form_viii', 'form_ix', 'form_x'];
const FORM_NO: Record<string, string> = Object.fromEntries(FORM_ORDER.map((f, i) => [f, ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][i]]));

/** The table cells drilled (row.column): مصدر, فاعل; مجهول, مفعول; أمر, ظرف. */
const TABLE_CELLS = new Set(['0.2', '0.3', '1.0', '1.3', '2.0', '2.2']);
const PREPS = ['عَلَى', 'إِلَى', 'مِنْ', 'عَنْ', 'لِ', 'بِ', 'فِي', 'مَعَ'];
const BABS = ['GT:form_family:bab_nasara', 'GT:form_family:bab_daraba', 'GT:form_family:bab_fataha', 'GT:form_family:bab_samia',
              'GT:form_family:bab_hasiba', 'GT:form_family:bab_karuma'];
const FORMS = ['form_ii', 'form_iii', 'form_iv', 'form_v', 'form_vi', 'form_vii', 'form_viii', 'form_x'].map((f) => `GT:form_family:${f}`);

// ── the muṣḥaf text, cut by a citation's needle ─────────────────────────────

const MARKS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;
/** A word's consonant skeleton: no marks, the hamza seats and long vowels gone — so a bare needle
 *  finds its words in the Uthmānī text whatever the spelling of their vowels. */
export function skeleton(w: string): string {
  return w.replace(MARKS, '').replace(/[ٱأإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[اويءئؤ]/g, '');
}
/** The words of the āyah the needle names, as the muṣḥaf writes them; null when they are not in it. */
export function cutQuote(text: string, needle: string): string | null {
  const words = text.split(/\s+/).filter((w) => w.replace(MARKS, '').length > 0);
  const want = needle.split(/\s+/).filter(Boolean).map(skeleton);
  const have = words.map(skeleton);
  for (let i = 0; i + want.length <= have.length; i++)
    if (want.every((s, k) => have[i + k] === s)) return words.slice(i, i + want.length).join(' ');
  return null;
}

const quote = (c: Cite, texts: Map<string, string>) => {
  const t = texts.get(`${c.surah}:${c.ayah}`);
  const q = t ? cutQuote(t, c.needle) : null;
  return q ? `﴿${q}﴾ ${c.surah}:${c.ayah}` : null;
};

// ── what a scope holds ──────────────────────────────────────────────────────

async function load(env: QuranEnv, scope: Scope, refresh = false) {
  const words = await query<Word>(env.DB_QR,
    `SELECT * FROM qr_sarf_word WHERE surah = ? AND (? IS NULL OR ayah >= ?) AND (? IS NULL OR ayah <= ?) ORDER BY ayah, word_index`,
    [scope.surah, scope.from, scope.from, scope.to, scope.to]);
  const roots = [...new Set(words.map((w) => w.root))];
  if (!roots.length) return null;
  const at = JSON.stringify(words.map((w) => [w.surah, w.ayah, w.word_index]));
  const [occs, irab, links] = await Promise.all([
    query<Occ>(env.DB_QR,
      `SELECT o.surah, o.ayah, o.word_index, o.lemma, o.gid_lemma, o.root_uid, o.here_en, ${OCC_GT.map((c) => `o.${c}`).join(', ')}
         FROM qr_word_occurrence o
        WHERE (o.surah, o.ayah, o.word_index) IN (SELECT json_extract(value, '$[0]'), json_extract(value, '$[1]'), json_extract(value, '$[2]') FROM json_each(?))`,
      [at]),
    // each word's own iʿrāb: its word-scope links in the sentence structure (qr_ss_scope_morph_link, keyed to the occurrence)
    query<{ surah: number; ayah: number; word_index: number; term_ref: string }>(env.DB_QR,
      `SELECT o.surah, o.ayah, o.word_index, m.lx_morph_ref AS term_ref
         FROM qr_word_occurrence o JOIN qr_ss_scope_morph_link m ON m.scope_type = 'word' AND m.scope_id = o.id
        WHERE (o.surah, o.ayah, o.word_index) IN (SELECT json_extract(value, '$[0]'), json_extract(value, '$[1]'), json_extract(value, '$[2]') FROM json_each(?))`,
      [at]).catch(() => []),
    // which AL sense (and arc) each word uses here — the QR binding (qr_word_sense_link)
    query<{ s: number; a: number; w: number; al_sense_id: string; al_arc_id: string | null }>(env.DB_QR,
      `SELECT surah_no AS s, ayah_no AS a, word_index AS w, al_sense_id, al_arc_id FROM qr_word_sense_link
        WHERE status = 'live' AND is_contextual = 1
          AND (surah_no, ayah_no, word_index) IN (SELECT json_extract(value, '$[0]'), json_extract(value, '$[1]'), json_extract(value, '$[2]') FROM json_each(?))`,
      [at]).catch(() => []),
  ]);
  // the language is AL's, by global id — the same core a root's or a lemma's page reads (lexiconRoot, lexiconLemma)
  const gids = [...new Set(occs.map((o) => o.gid_lemma).filter((g): g is string => !!g))];
  const at3 = (o: { surah: number; ayah: number; word_index: number }) => `${o.surah}:${o.ayah}:${o.word_index}`;
  const occAt = new Map(occs.map((o) => [at3(o), o]));
  const uidOf = new Map<string, string>();                        // root text → global root id
  for (const w of words) { const u = occAt.get(at3(w))?.root_uid; if (u && !uidOf.has(w.root)) uidOf.set(w.root, u); }
  const rootOfGid = new Map(words.map((w) => [occAt.get(at3(w))?.gid_lemma ?? '', w.root]));
  const C = await core(env, { roots, uidOf, gids, rootOfGid }, refresh);
  const gidOf = (w: Word) => occAt.get(at3(w))?.gid_lemma;
  return {
    ...C, words,
    pluralsOf: (w: Word) => C.pluralsOfGid(gidOf(w)),
    otherPluralsOf: (w: Word) => C.otherPluralsOfGid(gidOf(w)),
    occ: new Map(occs.map((o) => [`${o.surah}:${o.ayah}:${o.word_index}`, o])),
    link: new Map(links.map((l) => [`${l.s}:${l.a}:${l.w}`, l])),
    irab: irab.reduce((m, r) => m.set(`${r.surah}:${r.ayah}:${r.word_index}`, [...(m.get(`${r.surah}:${r.ayah}:${r.word_index}`) ?? []), r.term_ref]),
                      new Map<string, string[]>()),
  };
}

/** What the language core is seeded with: the roots (text, in order), each root's global id, the lemmas' global ids,
 *  and the root each lemma is of. A passage seeds it from its words; a root's or a lemma's page from the whole Qurʾān. */
type Seed = { roots: string[]; uidOf: Map<string, string>; gids: string[]; rootOfGid: Map<string, string> };

/** AL's language for a seed: each lemma's senses, arcs and form facts (/al/lemmas/resolve), the roots' and lemmas'
 *  الصرف (/al/sarf/sheet), every sense's Qurʾānic citations, and the āyāt and GT names they need. */
async function core(env: QuranEnv, seed: Seed, refresh = false) {
  const { roots, uidOf, gids, rootOfGid } = seed;
  const rootText = new Map([...uidOf].map(([t, u]) => [u, t]));  // global root id → root text
  const al = createAlClient(env);
  const [resolved, sheet] = await Promise.all([
    al && gids.length ? al.resolveLemmas(gids, { refresh }).then((r) => r.data).catch(() => ({})) : Promise.resolve({}),
    al && uidOf.size ? al.sarfSheet([...uidOf.values()], gids.map((g) => g.replace(/^AL:/, '')), { refresh }).then((r) => r.data).catch(() => null)
      : Promise.resolve(null),
  ]) as [Record<string, import('../clients/al.client').ResolvedLemma>, AlSarfSheet | null];
  const order = roots;                                            // the seed's roots, in order
  const verbs = sheet ? verbsOf(sheet, rootText, order) : [];
  const preps = sheet ? prepsOf(sheet, verbs, rootText) : [];
  const nearsAll = sheet ? nearsOf(sheet, rootText, order) : [];
  // a near-synonym member opens its own lemma page — when the Qurʾān uses that lemma
  const memberIds = [...new Set(nearsAll.flatMap((n) => parseJson<NearMember[]>(n.members_json, []).map((m) => m.lemmaId).filter((x): x is string => !!x)))];
  const quranic = new Set(memberIds.length ? (await query<{ g: string }>(env.DB_QR,
    `SELECT DISTINCT gid_lemma AS g FROM qr_word_occurrence WHERE gid_lemma IN (SELECT value FROM json_each(?))`, [JSON.stringify(memberIds)])
    .catch(() => [])).map((r) => r.g) : []);
  const nears = nearsAll.map((n) => ({ ...n, members_json: JSON.stringify(parseJson<NearMember[]>(n.members_json, [])
    .map((m) => ({ ...m, lemmaId: m.lemmaId && quranic.has(m.lemmaId) ? m.lemmaId : null }))) }));
  const pictures = sheet ? Object.values(sheet.roots).filter((r) => r.picture && rootText.has(r.root_id))
    .map((r) => ({ root: rootText.get(r.root_id)!, text_en: r.picture!.en, text_ar: r.picture!.ar ?? '' })) : [];
  // an opposite's root (AL global id) as the text the Qurʾān files it under, so its page can be opened
  const antonymIds = sheet ? [...new Set(Object.values(sheet.roots).flatMap((r) => r.opposites.map((o) => o.antonym_root_id))
    .filter((x): x is string => !!x))] : [];
  const antonymRoot = new Map((antonymIds.length ? await query<{ root_uid: string; root: string }>(env.DB_QR,
    `SELECT root_uid, MIN(root) AS root FROM qr_word_occurrence WHERE root_uid IN (SELECT value FROM json_each(?)) GROUP BY root_uid`,
    [JSON.stringify(antonymIds)]).catch(() => []) : []).map((x) => [x.root_uid, x.root] as const));
  const opposites = new Map<string, Opposite[]>(sheet ? Object.values(sheet.roots).filter((r) => rootText.has(r.root_id))
    .map((r) => [rootText.get(r.root_id)!, r.opposites.map((o) => ({ ar: o.antonym_ar, en: o.antonym_en, kind: o.relation_kind,
      root: o.antonym_root_id ? antonymRoot.get(o.antonym_root_id) ?? null : null,
      note: o.note_en, cites: o.display?.quran ?? [], lemmaId: o.lemma_id, sources: sourcesOf(o.sources ?? []),
      forWord: o.for_word_ar ? (o.for_word_en ? `${o.for_word_ar} — ${o.for_word_en}` : o.for_word_ar) : null }))]) : []);
  // how each root's lemmas are used: the construction arcs, with the primary worked verse cut from the muṣḥaf
  const constructions = new Map<string, Construction[]>(sheet ? Object.values(sheet.roots).filter((r) => rootText.has(r.root_id))
    .map((r) => [rootText.get(r.root_id)!, (r.constructions ?? []).map((a) => ({
      lemmaId: a.lemma_id, lemma: a.lemma_ar, construction: a.construction_ar, count: a.attest_count, line: a.arc_en, lineAr: a.arc_ar, note: a.boundary_note_en, sources: sourcesOf(a.sources ?? []),
      quote: a.ex_text ? `﴿${a.ex_text}﴾ ${a.ex_surah}:${a.ex_ayah}` : null, quoteEn: a.ex_en }))]) : []);
  const pluralsOfGid = (gid: string | null | undefined): Plural[] => {
    const g = gid?.replace(/^AL:/, '');
    return (g && sheet?.lemmas[g]?.plurals || []).filter((p) => p.surah && p.ayah && p.needle)
      .map((p) => ({ ar: p.plural_ar, cite: { surah: p.surah!, ayah: p.ayah!, needle: p.needle! } }));
  };
  // plurals a book gives that the Qurʾān does not use — shown as such, never as Qurʾānic
  const otherPluralsOfGid = (gid: string | null | undefined) => {
    const g = gid?.replace(/^AL:/, '');
    return (g && sheet?.lemmas[g]?.plurals || []).filter((p) => !(p.surah && p.ayah && p.needle))
      .map((p) => ({ ar: p.plural_ar, kind: p.kind_ar, note: p.note_en }));
  };
  const lemmaOf = (gid: string | null | undefined) => (gid ? resolved[gid] ?? resolved[gid.replace(/^AL:/, '')] : undefined);
  // a lemma's range in the Qurʾān: its AL senses that some Qurʾānic word links to, cited from those words
  const alSenseIds = gids.flatMap((g) => (lemmaOf(g)?.senses ?? []).map((x) => x.id));
  const cited = alSenseIds.length ? await query<{ al_sense_id: string; s: number; a: number; w: number }>(env.DB_QR,
    `SELECT al_sense_id, surah_no AS s, ayah_no AS a, word_index AS w FROM qr_word_sense_link
      WHERE status = 'live' AND al_sense_id IN (SELECT value FROM json_each(?)) ORDER BY display_order, surah_no, ayah_no, word_index`,
    [JSON.stringify(alSenseIds)]).catch(() => []) : [];
  // the words around each cited word, to cut its quotation from the muṣḥaf
  const around = cited.length ? await query<{ surah: number; ayah: number; word_index: number; word_text_bare: string | null }>(env.DB_QR,
    `SELECT surah, ayah, word_index, word_text_bare FROM qr_word_occurrence
      WHERE (surah, ayah) IN (SELECT json_extract(value, '$[0]'), json_extract(value, '$[1]') FROM json_each(?))`,
    [JSON.stringify([...new Set(cited.map((c) => `${c.s}:${c.a}`))].map((k) => k.split(':').map(Number)))]).catch(() => []) : [];
  const needle = (c: { s: number; a: number; w: number }) => around
    .filter((x) => x.surah === c.s && x.ayah === c.a && x.word_index >= c.w - 1 && x.word_index <= c.w + 1)
    .sort((x, y) => x.word_index - y.word_index).map((x) => x.word_text_bare ?? '').join(' ');
  const senses: Sense[] = gids.flatMap((g) => {
    const l = lemmaOf(g);
    return (l?.senses ?? []).map((x, i) => ({ x, i, cites: cited.filter((c) => c.al_sense_id === x.id) }))
      .filter(({ cites }) => cites.length)
      .map(({ x, cites }) => ({ id: x.id, root: rootOfGid.get(g) ?? '', lemma_ar: l!.lemma_ar, lemma_id: g,
        sense_en: x.gloss_en ?? x.label_en ?? '', sense_ar: x.gloss_ar ?? x.label_ar,
        cites_json: JSON.stringify(cites.slice(0, 3).map((c) => ({ surah: c.s, ayah: c.a, needle: needle(c) }))) }));
  });
  const arcOf = (gid: string | null | undefined, arcId: string | null | undefined) => {
    const arcs = (lemmaOf(gid)?.arcs ?? []).filter((a) => a.status === 'live');
    return (arcs.find((a) => a.id === arcId) ?? arcs.find((a) => a.is_primary) ?? arcs[0])?.arc_en ?? null;
  };
  // a lemma's own form facts, from AL: derivation, مشتق/جامد, لازم/متعدٍّ (its base verb), its verb form when derived (عِقَاب ← مُفَاعَلَة), pattern
  const lemmaPropsOf = (gid: string | null | undefined) => {
    const w = lemmaOf(gid)?.wazn?.[0];
    if (!w) return [];
    const fam = w.family_id?.startsWith('GT:form_family:form_') && w.family_ar && w.family_ar !== w.wazn_ar
      ? [{ id: w.family_id, ar: w.family_ar }] : [];
    const jumud = w.jumud_id && w.jumud_ar && w.jumud_id !== w.derivation_id ? [{ id: w.jumud_id, ar: w.jumud_ar }] : [];
    const trans = w.transitivity_id && w.transitivity_ar ? [{ id: w.transitivity_id, ar: w.transitivity_ar }] : [];
    return [{ id: w.derivation_id, ar: w.derivation_ar }, ...jumud, ...trans, ...fam, { id: w.wazn_id, ar: `وَزْن ${w.wazn_ar}` }];
  };
  // every āyah a citation names, and the GT names the drills use
  const cites: Cite[] = [
    ...verbs.map((v) => parseJson<Cite | null>(v.cite_json, null)), ...preps.map((p) => parseJson<Cite | null>(p.cite_json, null)),
    ...senses.flatMap((s) => parseJson<Cite[]>(s.cites_json, [])),
    ...nears.flatMap((n) => parseJson<NearMember[]>(n.members_json, []).map((m) => m.cite)),
    ...gids.flatMap((g) => pluralsOfGid(g).map((p) => p.cite)),
    ...[...opposites.values()].flat().flatMap((o) => o.cites),
  ].filter((c): c is Cite => !!c && Number.isInteger(c.surah));
  const pairs = [...new Set(cites.map((c) => `${c.surah}:${c.ayah}`))].map((k) => k.split(':').map(Number));
  const gtIds = [...new Set([...BABS, ...FORMS, ...verbs.flatMap((v) => [v.fail_gt, v.form_gt]), 'GT:derivation_type:passive_participle']
    .filter((x): x is string => !!x))];
  const [ayat, gts] = await Promise.all([
    pairs.length ? query<{ surah: number; ayah: number; t: string }>(env.DB_QR,
      `SELECT surah, ayah, COALESCE(text_uthmani, text) AS t FROM qr_ayah
        WHERE (surah, ayah) IN (SELECT json_extract(value, '$[0]'), json_extract(value, '$[1]') FROM json_each(?))`, [JSON.stringify(pairs)])
      : Promise.resolve([]),
    query<{ id: string; name_ar: string }>(env.DB_QR, `SELECT id, name_ar FROM ar_ling_gram_term WHERE id IN (SELECT value FROM json_each(?))`,
      [JSON.stringify(gtIds)]),
  ]);
  return {
    verbs, preps, senses, nears, opposites, constructions, pluralsOfGid, otherPluralsOfGid, lemmaOf,
    // each root's words as AL lists them (live single-word lemmas), for the root's grid
    wordsOf: (r: string) => (sheet ? Object.values(sheet.roots).find((x) => rootText.get(x.root_id) === r)?.words ?? [] : []),
    arcOf, lemmaPropsOf,
    // a lemma's derivation and pattern, from AL (the word screen's الصيغة)
    formOf: (gid: string | null | undefined) => { const z = lemmaOf(gid)?.wazn?.[0]; return z ? { form: z.derivation_ar, pattern: z.wazn_ar } : null; },
    // a lemma's dictionary form, from AL (QR's copy keeps the shadda of the word before it: تَّوْب)
    lemmaTextOf: (gid: string | null | undefined) => lemmaOf(gid)?.lemma_ar ?? null,
    picture: new Map(pictures.map((p) => [p.root, p])),
    texts: new Map(ayat.map((a) => [`${a.surah}:${a.ayah}`, a.t])),
    gt: new Map(gts.map((g) => [g.id, g.name_ar])),
  };
}
type Data = NonNullable<Awaited<ReturnType<typeof load>>>;

// ── AL's الصرف in the shapes the drills and the sheet read ─────────────────
// A verb keeps the id it was first drilled under (its QR row, kept in AL as source_ref), so a learner's
// cards stay theirs; a verb first made in AL is known by its AL id.

const formKey = (gt: string | null | undefined) => (gt ?? '').split(':').pop() ?? '';
function verbsOf(sheet: AlSarfSheet, rootText: Map<string, string>, order: string[]): Verb[] {
  const s = (x: unknown) => (x == null ? null : String(x));
  const js = (x: unknown) => (x == null ? null : JSON.stringify(x));
  const out = Object.values(sheet.roots).filter((r) => rootText.has(r.root_id)).flatMap((r) => r.paradigms.map((p): Verb => {
    const j = p.paradigm as Record<string, unknown>;
    return {
      id: p.source_ref?.startsWith('qr_sarf_verb ') ? p.source_ref.slice('qr_sarf_verb '.length) : p.id,
      root: rootText.get(r.root_id)!, lemma_id: p.lemma_id,
      form_gt: s(j.form_gt) ?? `GT:form_family:form_${(p.verb_form ?? 'i').toLowerCase()}`, bab_gt: s(j.bab_gt), root_type_gt: s(j.root_type_gt),
      route_gt: s(j.route_gt), maani_gt: s(j.maani_gt), meaning_en: s(j.meaning) ?? '', madi: s(j.past) ?? '', mudari: s(j.present) ?? '',
      masadir_json: JSON.stringify(j.masadir ?? []), fail: s(j.active_participle), fail_gt: s(j.active_participle_gt),
      madi_majhul: s(j.passive_past), mudari_majhul: s(j.passive_present), maful: s(j.passive_participle), amr: s(j.imperative), nahy: s(j.prohibition),
      zarf_json: js(j.noun_of_place_time), ala_json: js(j.noun_of_instrument),
      others_json: Array.isArray(j.derived) ? JSON.stringify((j.derived as Record<string, string>[]).map((d) => [d.word, d.gt, d.pattern, d.meaning])) : null,
      quran_n: Number(j.quran_n ?? 0), cite_json: js(j.cite), full: j.full_table ? 1 : 0, note_en: s(j.note),
    };
  }));
  return out.sort((a, b) => order.indexOf(a.root) - order.indexOf(b.root) || FORM_ORDER.indexOf(formKey(a.form_gt)) - FORM_ORDER.indexOf(formKey(b.form_gt))
    || a.id.localeCompare(b.id));
}

/** A preposition row hangs on its verb: the QR verb it was first checked under, else the verb of its lemma. */
function prepsOf(sheet: AlSarfSheet, verbs: Verb[], rootText: Map<string, string>): Prep[] {
  const ids = new Set(verbs.map((v) => v.id));
  const rows = Object.values(sheet.roots).filter((r) => rootText.has(r.root_id)).flatMap((r) => r.preps.map((p) => {
    const ref = p.qr_ref ?? (p.id.startsWith('TDY:QR:') ? p.id.slice('TDY:QR:'.length) : p.id);
    const fromRef = ref.match(/^SP:(SV:.+):\d+$/)?.[1];
    const verb = (fromRef && ids.has(fromRef) ? fromRef : null) ?? verbs.find((v) => v.lemma_id && v.lemma_id === p.lemma_id)?.id
      ?? verbs.find((v) => v.root === rootText.get(r.root_id))?.id;
    return verb ? { id: ref, verb_id: verb, prep_ar: p.harf ?? '', prep_gt: p.harf_term_id, usage_ar: p.frame_ar ?? '', meaning_en: p.meaning_en ?? '',
                    cite_json: JSON.stringify(p.cite), sources: sourcesOf(p.sources ?? []), n: Number(ref.match(/:(\d+)$/)?.[1] ?? p.sort_order) } : null;
  })).filter((x): x is Prep & { n: number } => !!x);
  const at = new Map(verbs.map((v, i) => [v.id, i]));
  return rows.sort((a, b) => (at.get(a.verb_id)! - at.get(b.verb_id)!) || a.n - b.n).map(({ n: _n, ...p }) => p);
}

/** A near-synonym set belongs to every passage root one of its checked members comes from. */
function nearsOf(sheet: AlSarfSheet, rootText: Map<string, string>, order: string[]): Near[] {
  return sheet.sets.map((st) => {
    const roots = [...new Set(st.members.map((m) => (m.root_id ? rootText.get(m.root_id) : undefined)).filter((r): r is string => !!r))]
      .sort((a, b) => order.indexOf(a) - order.indexOf(b));
    const focus = st.members.find((m) => m.root_id && rootText.get(m.root_id) === roots[0]);
    return { id: st.id, root: roots[0] ?? '', roots, lemmas: st.members.map((m) => m.lemma_id), focus_ar: focus?.ar ?? '', title_en: st.title_en ?? '', title_ar: st.title_ar ?? '',
             contrast: st.contrast, sources: sourcesOf(st.sources ?? []),
             members_json: JSON.stringify(st.members.map((m): NearMember => ({ ar: m.ar, en: m.en ?? '', contrast: m.contrast, cite: m.cite,
                                                                                lemmaId: m.lemma_id ? `AL:${m.lemma_id.replace(/^AL:/, '')}` : null }))) };
  }).filter((n) => n.roots.length).sort((a, b) => order.indexOf(a.root) - order.indexOf(b.root));
}

// ── the table ───────────────────────────────────────────────────────────────

const masadirOf = (v: Verb) => parseJson<string[]>(v.masadir_json, []);
const listOf = (s: string | null) => parseJson<string[]>(s, []);

/** The verb's الصرف الصغير as rows of cells, in the textbook's order; cells with no form are left out. */
export function tableOf(v: Verb, gt: Map<string, string>): Cell[][] {
  const mas = masadirOf(v);
  const rows: Cell[][] = [[
    { label: 'الماضي', value: v.madi }, { label: 'المضارع', value: v.mudari }, { label: 'المصدر', value: mas.join(' وَ') },
    { label: `فهو ${gt.get(v.fail_gt ?? '') ?? 'اسم الفاعل'}`, value: v.fail ?? '' },
  ]];
  if (v.madi_majhul) rows.push([
    { label: 'الماضي المجهول', value: v.madi_majhul }, { label: 'المضارع المجهول', value: v.mudari_majhul ?? '' },
    { label: 'المصدر', value: mas[0] ?? '' }, { label: 'فهو اسم المفعول', value: v.maful ?? '' },
  ]);
  const zarf = listOf(v.zarf_json), ala = listOf(v.ala_json);
  if (v.amr || zarf.length) rows.push([
    { label: 'الأمر منه', value: v.amr ?? '' }, { label: 'والنهي عنه', value: v.nahy ?? '' },
    { label: 'والظرف منه', value: zarf.join(' وَ') }, ...(ala.length ? [{ label: 'والآلة منه', value: ala.join(' وَ') }] : []),
  ]);
  return rows.map((r) => r.filter((c) => c.value));
}

/** The table said as one line, the way it is learnt by heart. */
export function chantOf(v: Verb): string {
  const mas = masadirOf(v);
  let s = `${v.madi} ${v.mudari} ${mas.join(' وَ')}${v.fail ? ` فَهُوَ ${v.fail}` : ''}`;
  if (v.madi_majhul) s += `، وَ${v.madi_majhul} ${v.mudari_majhul} ${mas[0]} فَهُوَ ${v.maful}`;
  if (v.amr) s += `، الأَمْرُ مِنْهُ ${v.amr}، وَالنَّهْيُ عَنْهُ ${v.nahy}`;
  const zarf = listOf(v.zarf_json), ala = listOf(v.ala_json);
  if (zarf.length) s += `، وَالظَّرْفُ مِنْهُ ${zarf.join(' وَ')}`;
  if (ala.length) s += `، وَالآلَةُ مِنْهُ ${ala.join(' وَ')}`;
  return s;
}

// ── dealing ─────────────────────────────────────────────────────────────────

/** k wrong options from a pool: unique, not the answer, in a new order. */
function wrong(answer: string, pool: string[], k = 3): string[] {
  return shuffle([...new Set(pool.filter((x) => x && x !== answer))]).slice(0, k);
}
function choose(answer: string, pool: string[], k = 3) {
  const ws = wrong(answer, pool, k);
  return ws.length >= 2 ? { options: shuffle([answer, ...ws]), answer } : null;
}

export async function sarfDrills(env: QuranEnv, n: number, scope: Scope): Promise<Drill[]> {
  if (!scope.surah) return [];
  const D = await load(env, scope);
  if (!D) return [];
  const { verbs, preps, senses, nears, words, texts, gt, picture, occ, pluralsOf } = D;
  const where = rangeOf(scope.surah, scope.from ?? 1, scope.to);
  const ayah = scope.from ?? words[0]?.ayah ?? null;
  const source = { workId: `QR:SURAH:${scope.surah}`, title: where, level: null };
  const byId = new Map(verbs.map((v) => [v.id, v]));
  const termsOf = (v: Verb) => [v.bab_gt, v.form_gt, v.root_type_gt, v.route_gt, v.maani_gt, v.fail_gt].filter(Boolean) as string[];
  const pic = (root: string) => picture.get(root);
  const after = (v: Verb) => [chantOf(v), pic(v.root) ? `${[...v.root].join(' ')}: ${pic(v.root)!.text_en}` : null, v.note_en]
    .filter(Boolean).join('\n');
  const make = (id: string, kind: string, d: Drill, front: string, back: string) => withCard({
    id: `sarf:${id}`, kind: 'sarf', ask: kind, interaction: 'choose', source, ...d,
  }, { ref: `QR:sarf:${id}`, type: 'passage', kind: 'sarf', front, back, surah: scope.surah, ayah, series: 'sarf' });

  // each kind's drills in groups (a verb, a root, a set): a kind is dealt round-robin across its groups, so
  // a round reaches every word; the order is fixed, so a class finds the same drills again
  const piles: Drill[][][] = [[], [], [], [], [], [], [], [], []];
  const groups = piles.map(() => new Map<string, Drill[]>());
  const group = (k: number, key: string) => {
    if (!groups[k].has(key)) { const arr: Drill[] = []; groups[k].set(key, arr); piles[k].push(arr); }
    return groups[k].get(key)!;
  };

  // the table, one form hidden — its wrong options are the verb's other forms
  for (const v of verbs.filter((x) => x.full)) {
    const rows = tableOf(v, gt);
    const all = rows.flat().map((c) => c.value);
    const sib = verbs.filter((x) => x.root === v.root && x.id !== v.id).flatMap((x) => tableOf(x, gt).flat().map((c) => c.value));
    rows.forEach((row, r) => row.forEach((cell, c) => {
      if (!TABLE_CELLS.has(`${r}.${c}`)) return;               // the forms a learner most needs; the ماضي is the drill's name
      const o = choose(cell.value, [...all, ...sib]);
      if (!o) return;
      group(0, v.id).push(make(`table:${v.id}:${r}.${c}`, 'sf_table', {
        prompt: `${v.madi} ${v.mudari}`, promptEn: `${cell.label} — ${v.meaning_en}`, script: 'arabic', ...o,
        table: { rows, hidden: [r, c] }, explanation: after(v), terms: termsOf(v),
      }, `${v.madi}: ${cell.label}`, cell.value));
    }));
  }

  // the باب of a bare verb, the form of a derived one
  for (const v of verbs) {
    const mas = masadirOf(v)[0] ?? '';
    if (v.bab_gt) {
      const o = choose(gt.get(v.bab_gt) ?? '', BABS.map((b) => gt.get(b) ?? ''));
      if (o) group(1, v.root).push(make(`bab:${v.id}`, 'sf_bab', { prompt: `${v.madi} ${v.mudari} ${mas}`, promptEn: v.meaning_en, script: 'arabic', ...o,
        explanation: after(v), terms: termsOf(v) }, `${v.madi} ${v.mudari}`, o.answer));
    } else if (v.form_gt !== 'GT:form_family:form_i') {
      const o = choose(gt.get(v.form_gt) ?? '', FORMS.map((f) => gt.get(f) ?? ''));
      if (o) group(1, v.root).push(make(`form:${v.id}`, 'sf_form', { prompt: `${v.madi} ${v.mudari} ${mas}`, promptEn: v.meaning_en, script: 'arabic', ...o,
        explanation: after(v), terms: termsOf(v) }, `${v.madi} ${v.mudari}`, o.answer));
    }
  }

  // every مصدر (choose all) — the wrong ones are the verb's other forms
  for (const v of verbs.filter((x) => masadirOf(x).length > 1)) {
    const mas = masadirOf(v);
    const ws = wrong('', [v.fail ?? '', v.maful ?? '', v.amr ?? '', ...listOf(v.zarf_json)].filter((x) => !mas.includes(x)), 2);
    if (!ws.length) continue;
    const options = shuffle([...mas, ...ws]);
    group(2, v.root).push(make(`masadir:${v.id}`, 'sf_masadir', { interaction: 'choose_all', prompt: `${v.madi} ${v.mudari} …`, promptEn: v.meaning_en,
      script: 'arabic', options, correct: options.flatMap((x, i) => (mas.includes(x) ? [i] : [])),
      explanation: after(v), terms: [...termsOf(v), 'GT:derivation_type:masdar'] }, `${v.madi} — المصادر`, mas.join(' · ')));
  }

  // واحد → جمع, as the Qurʾān has it
  const plurals = words.flatMap((w) => pluralsOf(w).map((p, k) => ({ w, p, k })));
  for (const { w, p, k } of plurals) {
    const v = w.verb_id ? byId.get(w.verb_id) : undefined;
    const answer = p.ar.replace(/\s*\(.*\)$/, '');
    const others = parseJson<string[][]>(v?.others_json ?? null, []).map((o) => o[0]);
    const o = choose(answer, [...plurals.map((x) => x.p.ar.replace(/\s*\(.*\)$/, '')), ...others, ...(v ? masadirOf(v) : [])]);
    if (!o) continue;
    group(3, w.root).push(make(`plural:${w.surah}:${w.ayah}:${w.word_index}:${k}`, 'sf_plural', {
      prompt: w.word_ar.replace(/^وَ/, ''), promptEn: occ.get(`${w.surah}:${w.ayah}:${w.word_index}`)?.here_en ?? null, script: 'arabic', ...o,
      explanation: [quote(p.cite, texts), v ? chantOf(v) : null].filter(Boolean).join('\n'),
      terms: ['GT:noun_process:jam_taksir', ...(w.sigha_gt ? [w.sigha_gt] : [])] }, `${w.word_ar}: الجمع`, answer));
  }

  // which preposition gives this meaning — and what it does
  for (const p of preps) {
    const v = byId.get(p.verb_id);
    if (!v) continue;
    const o = choose(p.prep_ar, PREPS);
    if (!o) continue;
    const q = quote(parseJson<Cite>(p.cite_json, { surah: 0, ayah: 0, needle: '' }), texts);
    group(4, v.id).push(make(`prep:${p.id}`, 'sf_prep', { prompt: `${v.madi} … ؟`, promptEn: p.meaning_en, script: 'arabic', ...o,
      explanation: [`${p.usage_ar}: ${p.meaning_en}`, q].filter(Boolean).join('\n'),
      terms: [...(p.prep_gt ? [p.prep_gt] : []), 'GT:pos:harf_jarr', ...termsOf(v)] }, `${v.madi} + ؟ (${p.meaning_en})`, p.prep_ar));
  }

  // what the word means in this āyah — its range across the Qurʾān
  const byRoot = new Map<string, Sense[]>();
  for (const s of senses) byRoot.set(s.root, [...(byRoot.get(s.root) ?? []), s]);
  for (const s of senses) {
    const c = parseJson<Cite[]>(s.cites_json, [])[0];
    const q = c ? quote(c, texts) : null;
    if (!q) continue;
    // an option names its sense, never the word in the quote: the Arabic in brackets stays for after
    const plain = (x: Sense) => x.sense_en.replace(/\s*\([^)]*\)/g, '').trim();
    const o = choose(plain(s), (byRoot.get(s.root) ?? []).map(plain));
    if (!o) continue;
    group(5, s.root).push(make(`range:${s.id}`, 'sf_range', { prompt: `${s.lemma_ar}\n${q}`, promptEn: null, script: 'arabic', ...o,
      explanation: (byRoot.get(s.root) ?? []).map((x) => `${x.id === s.id ? '▸' : '·'} ${x.sense_en}${x.sense_ar ? ` — ${x.sense_ar}` : ''}`).join('\n') }, q, s.sense_en));
  }

  // the root's verbs in the Qurʾān: what each one means
  for (const v of verbs) {
    const c = parseJson<Cite | null>(v.cite_json, null);
    const q = c ? quote(c, texts) : null;
    const o = choose(v.meaning_en, [...verbs.filter((x) => x.root === v.root).map((x) => x.meaning_en), ...verbs.map((x) => x.meaning_en)]);
    if (!o) continue;
    group(6, v.root).push(make(`family:${v.id}`, 'sf_family', { prompt: [`${v.madi} ${v.mudari} ${masadirOf(v)[0] ?? ''}`, q].filter(Boolean).join('\n'), promptEn: null,
      script: 'arabic', ...o, explanation: after(v), terms: termsOf(v) }, `${v.madi} ${v.mudari}`, v.meaning_en));
  }

  // the root's picture
  const roots = [...new Set(words.map((w) => w.root))];
  for (const r of roots) {
    const p = pic(r);
    if (!p) continue;
    const o = choose(p.text_en, roots.map((x) => pic(x)?.text_en ?? ''));
    if (!o) continue;
    group(7, r).push(make(`root:${r}`, 'sf_root', { prompt: [...r].join(' '), promptEn: null, script: 'arabic', ...o,
      explanation: p.text_ar }, [...r].join(' '), p.text_en));
  }

  // near-synonyms: which word carries this shade
  for (const ns of nears) {
    const ms = parseJson<NearMember[]>(ns.members_json, []);
    ms.forEach((m, k) => {
      const o = choose(m.ar, ms.map((x) => x.ar));
      if (!o) return;
      group(8, ns.id).push(make(`near:${ns.id}:${k}`, 'sf_near', { prompt: ns.title_ar, promptEn: m.en, script: 'arabic', ...o,
        explanation: ms.map((x) => `${x.ar} — ${x.en}`).join('\n') + (m.cite && quote(m.cite, texts) ? `\n${quote(m.cite, texts)}` : '') }, m.en, m.ar));
    });
  }

  return interleave(piles.map((groups) => interleave(groups, Number.MAX_SAFE_INTEGER)), n);
}

// ── the passage's الصرف, to read ────────────────────────────────────────────
//
// The same rows the drills are dealt from, laid out for reading (the passage study's الصرف tab):
// each focus word with its lemma's arc (held once for the whole Qurʾān), what it means here, every GT tag QAC gives it, its root's picture, its form and its Qurʾānic plurals;
// each verb's table and its family; the prepositions and what they do; the Qurʾān's meaning range
// of each word; the near-synonyms. Every label a GT term's Arabic name, every quotation cut from
// the muṣḥaf.

// ── English lines that quote Arabic ───────────────────────────────────────────
// The word screen sits in a right-to-left layout, so an English line holding an Arabic phrase can come out
// scrambled (the full stop jumps to the front, a verse number lands on the wrong side). Each English line is marked
// left-to-right (LRM) and each Arabic phrase in it is isolated (RLI … PDI), so both keep their own order.
const AR_CH = '\\u0600-\\u06FF\\u0750-\\u077F\\u08A0-\\u08FF\\uFB50-\\uFDFF\\uFE70-\\uFEFF';
const HAS_AR = new RegExp(`[${AR_CH}]`);
const AR_RUN = new RegExp(`[«﴿]?[${AR_CH}]+(?:[\\s\\u00A0،؛]+[${AR_CH}]+)*[»﴾]?`, 'g');
export const bidiEn = (s: string) => (HAS_AR.test(s) ? '\u200E' + s.replace(AR_RUN, (m) => '\u2067' + m + '\u2069\u200E') : s);
const EN_KEYS = new Set(['note', 'line', 'quoteEn', 'contrast', 'en', 'meaning', 'here', 'forWord', 'gloss']);
// Arabic and English kept apart: a note or a contrast line is served as English text (`note`) plus its Arabic quotes
// as their own list (`noteAr`: [{ ar, ref }]). A quote with its verse — «…» (4:24) — leaves "(4:24)" in the English; a
// longer quote with no verse leaves "[n]". One- or two-word Arabic (a particle, a word) stays in the line, isolated.
const QUOTE = /«([^»]+)»(?:\s*\(([^)]+)\))?/g;
export function splitArabic(s: string): { en: string; ar: { ar: string; ref: string | null; n: number | null }[] } {
  const ar: { ar: string; ref: string | null; n: number | null }[] = [];
  let k = 0;
  const en = s.replace(QUOTE, (m, q: string, ref: string | undefined, at: number, all: string) => {
    if (!HAS_AR.test(q)) return m;
    if (!ref && q.trim().split(/\s+/).length <= 2) return q.trim();
    // after 'on', 'in', 'at' … the verse reads as a plain reference ('on 4:24'); elsewhere it stands in brackets
    if (ref) { ar.push({ ar: q.trim(), ref: ref.trim(), n: null }); return /\b(on|in|at|of|and|see)\s*$/i.test(all.slice(Math.max(0, at - 6), at)) ? ref.trim() : `(${ref.trim()})`; }
    k += 1; ar.push({ ar: q.trim(), ref: null, n: k }); return `[${k}]`;
  }).replace(/:\s*\(/g, ' (').replace(/\s{2,}/g, ' ').replace(/\s+([.,;:])/g, '$1').replace(/:\s*\./g, '.').trim();
  return { en, ar };
}
const SPLIT_KEYS: Record<string, string> = { note: 'noteAr', contrast: 'contrastAr' };
const bidiTree = (v: unknown, key = ''): unknown => {
  if (typeof v === 'string') return EN_KEYS.has(key) ? bidiEn(v) : v;
  if (Array.isArray(v)) return v.map((x) => bidiTree(x, key));
  if (!v || typeof v !== 'object') return v;
  const out: Record<string, unknown> = {};
  for (const [k, x] of Object.entries(v)) {
    if (SPLIT_KEYS[k] && typeof x === 'string') {
      const { en, ar } = splitArabic(x);
      out[k] = bidiEn(en); out[SPLIT_KEYS[k]] = ar;
    } else out[k] = bidiTree(x, k);
  }
  return out;
};

type CoreData = Awaited<ReturnType<typeof core>>;

/** The shapes the sheet and the root's and lemma's pages show, over a core: GT names, quotations cut from the muṣḥaf,
 *  and each verb, near-synonym set, opposite and family as the app draws it; the section heads as label rows. */
async function kitOf(env: QuranEnv, D: CoreData, extraIds: (string | null)[] = []) {
  const { verbs, preps, texts, gt, picture } = D;
  const extra = await query<{ id: string; name_ar: string }>(env.DB_QR,
    `SELECT id, name_ar FROM ar_ling_gram_term WHERE id IN (SELECT value FROM json_each(?))`,
    [JSON.stringify([...new Set([...verbs.flatMap((v) => [v.bab_gt, v.root_type_gt, v.route_gt, v.maani_gt]),
                                  ...preps.map((p) => p.prep_gt), ...extraIds,
                                  ...verbs.flatMap((v) => parseJson<string[][]>(v.others_json, []).map((o) => o[1]))])].filter(Boolean))]);
  for (const g of extra) gt.set(g.id, g.name_ar);
  const name = (id: string | null | undefined) => (id ? gt.get(id) ?? null : null);
  const cite = (c: Cite | null | undefined) => (c ? quote(c, texts) : null);
  const oppositeView = (o: Opposite) => ({ ar: o.ar, en: o.en, kind: OPPOSITE_KIND[o.kind] ?? o.kind, forWord: o.forWord, sources: o.sources, toRoot: o.root,
    note: o.note, quote: o.cites.map(cite).find(Boolean) ?? null });
  const nearView = (n: Near) => ({ title: n.title_en, titleAr: n.title_ar, contrast: stripRefs(n.contrast), sources: n.sources,
    members: parseJson<NearMember[]>(n.members_json, []).map((m) => ({ ar: m.ar, en: m.en, contrast: m.contrast ?? null, quote: cite(m.cite),
                                                                        lemmaId: m.lemmaId ?? null })) });
  const verbView = (v: Verb) => ({
    id: v.id, root: v.root, title: `${v.madi} ${v.mudari}`, meaning: v.meaning_en,
    chips: [v.bab_gt, v.form_gt, v.root_type_gt, v.route_gt, v.maani_gt].map(name).filter(Boolean),
    table: v.full ? tableOf(v, gt) : null, chant: chantOf(v), masadir: masadirOf(v),
    others: parseJson<string[][]>(v.others_json, []).map(([form, g, pattern, meaning]) => ({ form, name: name(g), pattern, meaning })),
    note: v.note_en, quote: cite(parseJson<Cite | null>(v.cite_json, null)), inQuran: v.quran_n,
    preps: preps.filter((p) => p.verb_id === v.id).map((p) => ({ prep: p.prep_ar, name: name(p.prep_gt), usage: p.usage_ar,
                                                                  meaning: p.meaning_en, quote: cite(parseJson<Cite | null>(p.cite_json, null)), sources: p.sources })),
  });
  const pic = (r: string) => (picture.get(r) ? { en: picture.get(r)!.text_en, ar: picture.get(r)!.text_ar } : null);
  const formNo = (v: Verb) => FORM_NO[v.form_gt.split(':').pop() ?? ''] ?? '';
  const byForm = (a: Verb, b: Verb) => FORM_ORDER.indexOf(a.form_gt.split(':').pop() ?? '') - FORM_ORDER.indexOf(b.form_gt.split(':').pop() ?? '');
  // the section heads and their ledes, as label rows (scope sarf_section)
  const heads = await query<{ key: string; label: string; label_ar: string | null; detail: string | null }>(env.DB_QR,
    `SELECT key, label, label_ar, detail FROM qr_study_label WHERE scope = 'sarf_section' ORDER BY sort`);
  // a root's verbs the Qurʾān uses, as family lines, Form I first — each with the prepositions it takes and what each does
  const familyOf = (r: string) => ({ root: r, letters: [...r].join(' '), gloss: pic(r)?.en ?? null,
    lines: verbs.filter((v) => v.root === r).sort(byForm).map((v) => ({
      id: v.id, form: formNo(v), line: `${v.madi} ${v.mudari} ${masadirOf(v).join(' وَ')}`, meaning: v.meaning_en,
      inQuran: v.quran_n, quote: cite(parseJson<Cite | null>(v.cite_json, null)),
      preps: preps.filter((p) => p.verb_id === v.id).map((p) => ({ prep: p.prep_ar, name: name(p.prep_gt), usage: p.usage_ar,
        meaning: p.meaning_en, quote: cite(parseJson<Cite | null>(p.cite_json, null)), sources: p.sources })) })) });
  // the words the word, lemma and root screens say (scope lex_page)
  const lex = await query<{ key: string; label: string; label_ar: string | null; detail: string | null; icon: string | null }>(env.DB_QR,
    `SELECT key, label, label_ar, detail, icon FROM qr_study_label WHERE scope = 'lex_page' ORDER BY sort`)
    .then((r) => r.map((x) => ({ key: x.key, label: x.label, labelAr: x.label_ar, detail: x.detail, icon: x.icon })));
  return { name, cite, oppositeView, nearView, verbView, pic, formNo, byForm, familyOf, heads, lex };
}

export async function sarfSheet(env: QuranEnv, scope: Scope, refresh = false) {
  const sheet = await sarfSheetRaw(env, scope, refresh);
  return sheet ? (bidiTree(sheet) as typeof sheet) : sheet;
}

async function sarfSheetRaw(env: QuranEnv, scope: Scope, refresh = false) {
  const D = await load(env, scope, refresh);
  if (!D) return null;
  const { verbs, preps, senses, nears, words, texts, gt, picture, occ, irab, link, arcOf, lemmaPropsOf, lemmaTextOf, formOf, otherPluralsOf, pluralsOf, opposites, constructions } = D;
  const occOf = (w: Word) => occ.get(`${w.surah}:${w.ayah}:${w.word_index}`);
  // every GT tag QAC gives each word, named Arabic first
  const props = await query<{ id: string; name_ar: string; name_en: string | null }>(env.DB_QR,
    `SELECT id, name_ar, name_en FROM ar_ling_gram_term WHERE id IN (SELECT value FROM json_each(?))`,
    [JSON.stringify([...new Set([...occ.values()].flatMap((o) => OCC_GT.map((c) => o[c])).concat([...irab.values()].flat()).filter(Boolean))])]);
  // a word's tags: its iʿrāb first, then QAC's
  const tagsOf = (w: Word) => [...new Set([...(irab.get(`${w.surah}:${w.ayah}:${w.word_index}`) ?? []), ...VERSE_GT.map((c) => occOf(w)?.[c])])]
    .filter((g): g is string => !!g && prop.has(g));
  const prop = new Map(props.map((p) => [p.id, p]));
  // the sense each word of the scope uses — marked in its lemma's range
  const linkOf = (w: Word) => link.get(`${w.surah}:${w.ayah}:${w.word_index}`);
  const used = new Set(words.map((w) => linkOf(w)?.al_sense_id).filter(Boolean));
  const K = await kitOf(env, D, words.map((w) => w.sigha_gt));
  const { name, cite, oppositeView, nearView, verbView, pic, formNo, byForm, heads, lex } = K;
  const roots = [...new Set(words.map((w) => w.root))];
  const lemmas = (r: string) => [...new Set(senses.filter((x) => x.root === r).map((x) => x.lemma_ar))];
  return {
    sections: heads.map((h) => ({ key: h.key, title: h.label, titleAr: h.label_ar, lede: h.detail })),
    lex,
    // one table per focus verb, in the textbook's order
    tables: verbs.filter((v) => v.full).map(verbView),
    // each root's verbs the Qurʾān uses, as family lines, Form I first
    families: roots.map((r) => ({ root: r, letters: [...r].join(' '), gloss: pic(r)?.en ?? null,
      lines: verbs.filter((v) => v.root === r).sort(byForm).map((v) => ({
        id: v.id, form: formNo(v), line: `${v.madi} ${v.mudari} ${masadirOf(v).join(' وَ')}`, meaning: v.meaning_en,
        inQuran: v.quran_n, quote: cite(parseJson<Cite | null>(v.cite_json, null)) })) })).filter((f) => f.lines.length),
    // every preposition a verb takes in the Qurʾān, and what it does
    preps: preps.map((p) => ({ root: verbs.find((v) => v.id === p.verb_id)?.root ?? '', verb: verbs.find((v) => v.id === p.verb_id)?.madi ?? '', prep: p.prep_ar, name: name(p.prep_gt),
                               usage: p.usage_ar, meaning: p.meaning_en, quote: cite(parseJson<Cite | null>(p.cite_json, null)), sources: p.sources })),
    // each word's senses across the Qurʾān, by lemma; the one in this passage marked
    ranges: roots.flatMap((r) => lemmas(r).map((l) => ({ root: r, lemma: l, gloss: pic(r)?.en ?? null,
      senses: senses.filter((x) => x.root === r && x.lemma_ar === l).map((x) => ({ en: x.sense_en, ar: x.sense_ar, here: used.has(x.id),
        quotes: parseJson<Cite[]>(x.cites_json, []).map(cite).filter(Boolean) })) }))),
    // how each root's lemmas are used — one line per construction, with a worked verse
    constructions: roots.flatMap((r) => (constructions.get(r) ?? []).map(({ lemmaId: _l, ...c }) => ({ root: r, ...c }))),
    // each root's opposites as the books state them, the kind in plain words
    opposites: roots.flatMap((r) => (opposites.get(r) ?? []).map((o) => ({ root: r, ...oppositeView(o) }))),
    near: nears.map((n) => ({ root: n.root, ...nearView(n) })),
    words: words.map((w) => ({
      ref: `${w.surah}:${w.ayah}:${w.word_index}`, place: `${w.surah}:${w.ayah} · ${w.word_index}`, word: w.word_ar, lemma: lemmaTextOf(occOf(w)?.gid_lemma) ?? occOf(w)?.lemma ?? null, arc: arcOf(occOf(w)?.gid_lemma, linkOf(w)?.al_arc_id),
      // the lemma's global id: its page in the lexicon (/qr/lexicon/lemma), the same from every verse
      lemmaId: occOf(w)?.gid_lemma ?? null,
      // the arc as its steps, picture first, for the card to draw step → step
      arcSteps: (arcOf(occOf(w)?.gid_lemma, linkOf(w)?.al_arc_id) ?? '').split('→').map((x) => x.trim()).filter(Boolean), here: occOf(w)?.here_en ?? '', root: w.root,
      letters: [...w.root].join(' '),
      picture: picture.get(w.root) ? { en: picture.get(w.root)!.text_en, ar: picture.get(w.root)!.text_ar } : null,
      form: formOf(occOf(w)?.gid_lemma)?.form ?? name(w.sigha_gt), pattern: formOf(occOf(w)?.gid_lemma)?.pattern ?? w.pattern_ar, verb: w.verb_id,
      // the word in this verse (card): its iʿrāb and QAC tags
      props: tagsOf(w).map((g) => ({ id: g, ar: prop.get(g)!.name_ar, en: prop.get(g)!.name_en })),
      // the lemma (detail screen): its own form facts from AL, the same in every verse
      lemmaProps: lemmaPropsOf(occOf(w)?.gid_lemma),
      // how the root's words are used — this word's own lemma first, then the root's other lemmas
      constructions: (() => {
        const own = occOf(w)?.gid_lemma?.replace(/^AL:/, '');
        const all = constructions.get(w.root) ?? [];
        return [...all.filter((c) => c.lemmaId === own), ...all.filter((c) => c.lemmaId !== own)].map(({ lemmaId: _l, ...c }) => c);
      })(),
      // its near-synonym sets — the ones this lemma is in first, then the root's others
      near: (() => {
        const own = occOf(w)?.gid_lemma?.replace(/^AL:/, '');
        const all = nears.filter((n) => n.roots.includes(w.root));
        return [...all.filter((n) => own && n.lemmas.includes(own)), ...all.filter((n) => !own || !n.lemmas.includes(own))].map(nearView);
      })(),
      // its opposites — the ones for this word (or the root's main sense) first, then those of the root's other words, named
      opposites: (() => {
        const own = occOf(w)?.gid_lemma?.replace(/^AL:/, '');
        const all = opposites.get(w.root) ?? [];
        const mine = (o: Opposite) => !o.forWord || (!!own && o.lemmaId === own);
        return [...all.filter(mine), ...all.filter((o) => !mine(o))].map(oppositeView);
      })(),
      plurals: pluralsOf(w).map((p) => ({ ar: p.ar, quote: cite(p.cite) })),
      otherPlurals: otherPluralsOf(w),
      prep: (() => { const p = parseJson<{ ar: string; gt: string; how: string } | null>(w.prep_json, null);
                     return p ? { prep: p.ar, name: name(p.gt), how: p.how } : null; })(),
    })),
    roots: roots.map((r) => ({
      root: r, letters: [...r].join(' '), picture: picture.get(r) ? { en: picture.get(r)!.text_en, ar: picture.get(r)!.text_ar } : null,
      verbs: verbs.filter((v) => v.root === r).map(verbView),
      range: senses.filter((s) => s.root === r).map((s) => ({ lemma: s.lemma_ar, en: s.sense_en, ar: s.sense_ar, here: used.has(s.id),
                                                            quotes: parseJson<Cite[]>(s.cites_json, []).map(cite).filter(Boolean) })),
      near: nears.filter((n) => n.roots.includes(r)).map(nearView),
      // the root's opposites, as the books state them (and the Qurʾān sets them side by side)
      opposites: (opposites.get(r) ?? []).map((o) => ({ ar: o.ar, en: o.en, kind: o.kind, forWord: o.forWord, note: o.note,
        quotes: o.cites.map(cite).filter(Boolean) })),
    })),
  };
}

// ── the lexicon's pages: a root and a lemma across the whole Qurʾān ─────────────────────────────────
//
// The passage sheet's word card is the word in its verse. What the word IS belongs to its lemma, and what its letters
// hold to its root — the same from every verse, so their pages are the lexicon's, not the passage's. Both read the
// same core as the sheet, seeded from every Qurʾānic word of the root or the lemma.

const sectionsOf = (K: Awaited<ReturnType<typeof kitOf>>) => K.heads.map((h) => ({ key: h.key, title: h.label, titleAr: h.label_ar, lede: h.detail }));

/** A root's page — the whole root: its picture, its words in the Qurʾān (most used first, each opening its lemma's
 *  page), its verbs as family lines, every preposition they take, every near-synonym set and opposite of its words.
 *  The verb tables and uses are each word's, on its lemma's page. */
export async function lexiconRoot(env: QuranEnv, root: string, refresh = false) {
  const page = await lexiconRootRaw(env, root, refresh);
  return page ? (bidiTree(page) as typeof page) : page;
}
async function lexiconRootRaw(env: QuranEnv, root: string, refresh: boolean) {
  const rows = await query<{ root_uid: string | null; gid_lemma: string; lemma: string | null; n: number }>(env.DB_QR,
    `SELECT MAX(root_uid) AS root_uid, gid_lemma, MIN(lemma) AS lemma, COUNT(*) AS n FROM qr_word_occurrence
      WHERE root = ? AND gid_lemma IS NOT NULL GROUP BY gid_lemma ORDER BY n DESC, gid_lemma`, [root]);
  const uid = rows.find((r) => r.root_uid)?.root_uid;
  if (!uid) return null;
  const gids = rows.map((r) => r.gid_lemma);
  const al = createAlClient(env);
  const [D, deep] = await Promise.all([
    core(env, { roots: [root], uidOf: new Map([[root, uid]]), gids, rootOfGid: new Map(gids.map((g) => [g, root])) }, refresh),
    // the root, deeper — AL's: its aṣl by every book, its core, its meaning's layers, its stages
    al ? al.rootDeep(root).then((r) => r.data).catch(() => null) : Promise.resolve(null),
  ]);
  const K = await kitOf(env, D);
  return {
    asl: deep?.asl ?? null, core: deep?.core ?? null, layers: deep?.layers ?? [], stages: deep?.stages ?? [],
    sections: sectionsOf(K), lex: K.lex,
    root, letters: [...root].join(' '), picture: K.pic(root), count: rows.reduce((t, r) => t + r.n, 0),
    // every word of the root: the Qurʾān's lemmas first (most used first), then the root's other words in AL, once each
    lemmas: (() => {
      const quran = rows.map((r) => ({ id: r.gid_lemma, lemma: D.lemmaTextOf(r.gid_lemma) ?? r.lemma ?? '', count: r.n,
        form: D.formOf(r.gid_lemma)?.form ?? null, pattern: D.formOf(r.gid_lemma)?.pattern ?? null, arc: D.arcOf(r.gid_lemma, null) }));
      const seen = new Set([...quran.map((q) => q.id.replace(/^AL:/, '')), ...quran.map((q) => spelling(q.lemma))]);
      const more = D.wordsOf(root).filter((w) => {
        const k = spelling(w.lemma_text);
        if (seen.has(w.id) || seen.has(k)) return false;
        seen.add(w.id); seen.add(k);
        return true;
      }).map((w) => ({ id: `AL:${w.id}`, lemma: w.lemma_text, count: 0, form: null, pattern: null, arc: null }));
      return [...quran, ...more];
    })(),
    // root-focused: the root's verbs as family lines (ماض مضارع مصادر, each with its prepositions), how its words are used
    // in the Qurʾān, every word's arc, the root's own opposites. A lemma's meaning range, its full الصرف الصغير table,
    // its near-synonym sets and its own opposites are on the lemma's page.
    families: [K.familyOf(root)].filter((f) => f.lines.length),
    // every word's arc in full, most used first: how each lemma's meaning runs from the root's picture
    arcs: rows.map((r) => ({ id: r.gid_lemma, lemma: D.lemmaTextOf(r.gid_lemma) ?? r.lemma ?? '', count: r.n,
      steps: (D.arcOf(r.gid_lemma, null) ?? '').split('→').map((x) => x.trim()).filter(Boolean) })).filter((a) => a.steps.length),
    // the prepositions are on their verb's family line; here, only those whose verb has no line
    preps: D.preps.filter((p) => !D.verbs.some((v) => v.id === p.verb_id && v.root === root)).map((p) => ({ root, verb: D.verbs.find((v) => v.id === p.verb_id)?.madi ?? '', prep: p.prep_ar, name: K.name(p.prep_gt),
      usage: p.usage_ar, meaning: p.meaning_en, quote: K.cite(parseJson<Cite | null>(p.cite_json, null)), sources: p.sources })),
    constructions: (D.constructions.get(root) ?? []).map(({ lemmaId: _l, ...c }) => ({ root, ...c })),
    // the root's own opposites only: one tied to a lemma or a word is on that lemma's page, as is every near-synonym
    // set (its members are lemmas)
    opposites: (D.opposites.get(root) ?? []).filter((o) => !o.lemmaId && !o.forWord).map((o) => ({ root, ...K.oppositeView(o) })),
  };
}

/** A lemma's page: its meaning arc, its form (الصيغة) and plurals, its meanings across the Qurʾān each with verses, how
 *  it is used, its near-synonyms and opposites — and, for a verb, its table and the prepositions it takes. */
export async function lexiconLemma(env: QuranEnv, gid: string, refresh = false) {
  const page = await lexiconLemmaRaw(env, gid, refresh);
  return page ? (bidiTree(page) as typeof page) : page;
}
async function lexiconLemmaRaw(env: QuranEnv, gid: string, refresh: boolean) {
  const id = gid.startsWith('AL:') ? gid : `AL:${gid}`;
  const bare = id.slice(3);
  const rows = await query<{ root: string | null; root_uid: string | null; lemma: string | null; n: number }>(env.DB_QR,
    `SELECT root, MAX(root_uid) AS root_uid, MIN(lemma) AS lemma, COUNT(*) AS n FROM qr_word_occurrence
      WHERE gid_lemma = ? GROUP BY root ORDER BY n DESC`, [id]);
  // a word the Qurʾān does not use: its root from AL, and the text the Qurʾān files that root under
  let root = rows.find((r) => r.root && r.root_uid)?.root ?? null;
  let uid = rows.find((r) => r.root && r.root_uid)?.root_uid ?? null;
  if (!rows.length) {
    const al = createAlClient(env);
    const l = al ? (await al.resolveLemmas([bare]).then((r) => r.data).catch(() => ({})) as Record<string, ResolvedLemma>)[bare] : undefined;
    if (!l?.root?.id) return null;
    uid = l.root.id;
    root = (await query<{ root: string }>(env.DB_QR, `SELECT MIN(root) AS root FROM qr_word_occurrence WHERE root_uid = ?`, [uid]))[0]?.root
      ?? l.root.root_norm ?? null;
    if (!root) return null;
    rows.push({ root, root_uid: uid, lemma: l.lemma_ar, n: 0 });
  }
  const D = await core(env, { roots: root ? [root] : [], uidOf: new Map(root && uid ? [[root, uid]] : []), gids: [id],
                              rootOfGid: new Map(root ? [[id, root]] : []) }, refresh);
  const K = await kitOf(env, D);
  const lemma = D.lemmaTextOf(id) ?? rows[0].lemma ?? '';
  const own = D.verbs.filter((v) => v.lemma_id === bare);
  const arc = D.arcOf(id, null);
  // what QAC says the lemma's words are (a participle, a verbal noun …), for a lemma AL gives no form facts for
  const qac = await query<{ d: string | null }>(env.DB_QR,
    `SELECT gt_derivation_type AS d FROM qr_word_occurrence WHERE gid_lemma = ? AND gt_derivation_type IS NOT NULL
      GROUP BY gt_derivation_type ORDER BY COUNT(*) DESC LIMIT 1`, [id]).catch(() => []);
  const base = own.length ? null : baseVerbOf(D.lemmaOf(id)?.wazn?.[0] ?? null, qac[0]?.d ?? null, D.verbs, lemma);
  const verbsHere = own.length ? own : base ? [base] : [];
  // lemma-scoped only: the opposites tied to this lemma — by its id, or by its spelling for one the books tie to the word
  // (the root's own are on the root's page)
  const mine = (o: Opposite) => o.lemmaId === bare
    || (!o.lemmaId && !!o.forWord && spelling(o.forWord.split(' — ')[0]) === spelling(lemma));
  return {
    sections: sectionsOf(K), lex: K.lex,
    id, lemma, root, letters: root ? [...root].join(' ') : null, count: rows.reduce((t, r) => t + r.n, 0),
    arc, arcSteps: (arc ?? '').split('→').map((x) => x.trim()).filter(Boolean),
    form: D.formOf(id)?.form ?? null, pattern: D.formOf(id)?.pattern ?? null, lemmaProps: D.lemmaPropsOf(id),
    plurals: D.pluralsOfGid(id).map((p) => ({ ar: p.ar, quote: K.cite(p.cite) })),
    otherPlurals: D.otherPluralsOfGid(id),
    // its meanings across the Qurʾān, each with the verses that use it
    ranges: [{ root: root ?? '', lemma, gloss: root ? K.pic(root)?.en ?? null : null,
      senses: D.senses.filter((x) => x.lemma_id === id).map((x) => ({ en: x.sense_en, ar: x.sense_ar, here: false,
        quotes: parseJson<Cite[]>(x.cites_json, []).map(K.cite).filter(Boolean) })) }].filter((r) => r.senses.length),
    constructions: root ? (D.constructions.get(root) ?? []).filter((c) => c.lemmaId === bare).map(({ lemmaId: _l, ...c }) => ({ root, ...c })) : [],
    near: D.nears.filter((n) => n.lemmas.includes(bare)).map((n) => ({ root: n.root, ...K.nearView(n) })),
    opposites: root ? (D.opposites.get(root) ?? []).filter(mine).map((o) => ({ root, ...K.oppositeView(o) })) : [],
    // a derived word (مشتق): the verb it is made from — its family, its line, what it means
    origin: base ? { verb: `${base.madi} ${base.mudari}`, family: K.name(base.bab_gt) ?? K.name(base.form_gt),
                     derivation: D.lemmaOf(id)?.wazn?.[0]?.derivation_ar ?? K.name(qac[0]?.d) ?? null,
                     line: `${base.madi} ${base.mudari} ${masadirOf(base).join(' وَ')}`, meaning: base.meaning_en } : null,
    // الصرف الصغير: the lemma's own verb, or the verb a derived word is made from — with the prepositions it takes —
    // — that lemma's table only (the root's whole family is on the root's page)
    tables: verbsHere.map(K.verbView),
    preps: D.preps.filter((p) => verbsHere.some((v) => v.id === p.verb_id)).map((p) => ({ root: root ?? '', verb: verbsHere.find((v) => v.id === p.verb_id)?.madi ?? '',
      prep: p.prep_ar, name: K.name(p.prep_gt), usage: p.usage_ar, meaning: p.meaning_en, quote: K.cite(parseJson<Cite | null>(p.cite_json, null)), sources: p.sources })),
  };
}

const bareAr = (t: string) => t.replace(/[\u064B-\u0652\u0670\u0640]/g, '').trim();
/** A word's spelling key, so the same word written two ways is one (كِتَٰب and كِتَابٌ; اكْتَتَبَ and إِكْتَتَبَ) while two
 *  words stay two (كَتَبَ and كَتَّبَ; كِتَاب and كُتَّاب; مَكْتَب and مُكْتَب): dagger alif as alif, hamza seats as alif,
 *  no tatweel, tanween, sukun or final case vowel, no vowel on a word-initial alif — the inner vowels and shadda kept. */
export const spelling = (t: string) => t.trim()
  .replace(/\u0670/g, 'ا').replace(/[أإآٱ]/g, 'ا').replace(/[\u0640\u064B-\u064D\u0652]/g, '')
  .replace(/^ا[\u064E-\u0650]/, 'ا').replace(/[\u064E-\u0650]+$/, '').replace(/ى$/, 'ي');
/** The verb a derived (مشتق) lemma is made from, among its root's verbs: the one AL names (its base verb, in its باب), else
 *  the one of the form family AL names, else — for a participle or verbal noun with no family named — the root's Form I
 *  verb when it has only one. A جامد word, or one that cannot be told, has none: never a guess between verbs. */
export function baseVerbOf(z: { base_verb: string | null; family_id: string | null; jumud_id?: string | null; derivation_id?: string } | null,
                           qacDerivation: string | null, verbs: Verb[], lemma?: string | null): Verb | null {
  if (z?.jumud_id && /jamid/.test(z.jumud_id)) return null;
  if (z?.base_verb) {
    // spelt with its shadda first (نَزَّلَ is not نَزَلَ), then bare; the family AL names decides between the two
    const [madiV, mudariV] = z.base_verb.trim().split(/\s+/);
    const exact = verbs.filter((v) => spelling(v.madi) === spelling(madiV) && (!mudariV || spelling(v.mudari) === spelling(mudariV)));
    const [madi, mudari] = bareAr(z.base_verb).split(/\s+/);
    const named = exact.length ? exact : verbs.filter((v) => bareAr(v.madi) === madi && (!mudari || bareAr(v.mudari) === mudari));
    const hit = named.find((v) => v.bab_gt === z.family_id || v.form_gt === z.family_id) ?? named[0];
    if (hit) return hit;
  }
  if (z?.family_id) {
    const fam = verbs.filter((v) => v.bab_gt === z.family_id || v.form_gt === z.family_id);
    if (fam.length === 1) return fam[0];
  }
  // the word is one verb's own masdar or participle, as AL spells them (تَنْزِيل is نَزَّلَ's masdar, not نَزَلَ's)
  if (lemma) {
    const key = (t: string) => spelling(t.replace(/\u064Bا$|ا\u064B$/, ''));
    const own = key(lemma);
    const makes = verbs.filter((v) => [...masadirOf(v), v.fail, v.maful].some((f) => !!f && key(f) === own));
    if (makes.length === 1) return makes[0];
  }
  const derived = /participle|masdar|sifa|tafdil|mubalagha|makan|zaman|ala/.test(`${z?.derivation_id ?? ''} ${qacDerivation ?? ''}`);
  const formI = verbs.filter((v) => formKey(v.form_gt) === 'form_i');
  return derived && formI.length === 1 ? formI[0] : null;
}
