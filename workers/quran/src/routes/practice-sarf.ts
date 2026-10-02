import { query } from '../../../shared/src/db';
import type { QuranEnv } from '../env';
import { withCard, shuffle, parseJson, rangeOf, interleave, type Drill, type Scope } from './practice-kit';

// ── الصرف: the passage's words, their forms, prepositions, family and meanings in the Qurʾān ──────
//
// Read from qr_sarf_* (qr_073): for each focus word of the passage its verb's الصرف الصغير, the
// prepositions that verb takes in the Qurʾān and what each one does, the root's other Qurʾānic
// verbs, the word's meaning range across the Qurʾān, its near-synonyms, and the root's picture
// (qr_vocab_root_core, kmaps_root_dna). Every label is a GT term; every Qurʾān quotation is cut from
// the muṣḥaf text (qr_ayah.text_uthmani) by its citation's bare needle.
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
              cite_json: string | null; full: number; note_en: string | null };
type Prep = { id: string; verb_id: string; prep_ar: string; prep_gt: string | null; usage_ar: string; meaning_en: string; cite_json: string };
type Word = { surah: number; ayah: number; word_index: number; word_ar: string; root: string; verb_id: string | null; sigha_gt: string | null;
              pattern_ar: string | null; here_en: string; plurals_json: string | null; prep_json: string | null };
type Sense = { id: string; root: string; lemma_ar: string; sense_en: string; sense_ar: string | null; cites_json: string; here: number };
type Near = { id: string; root: string; focus_ar: string; title_en: string; title_ar: string; members_json: string };
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

async function load(env: QuranEnv, scope: Scope) {
  const words = await query<Word>(env.DB_QR,
    `SELECT * FROM qr_sarf_word WHERE surah = ? AND (? IS NULL OR ayah >= ?) AND (? IS NULL OR ayah <= ?) ORDER BY ayah, word_index`,
    [scope.surah, scope.from, scope.from, scope.to, scope.to]);
  const roots = [...new Set(words.map((w) => w.root))];
  if (!roots.length) return null;
  const inRoots = `(SELECT value FROM json_each(?))`;
  const R = JSON.stringify(roots);
  const [verbs, preps, senses, nears, pictures] = await Promise.all([
    query<Verb>(env.DB_QR, `SELECT * FROM qr_sarf_verb WHERE status = 'live' AND root IN ${inRoots} ORDER BY sort`, [R]),
    query<Prep>(env.DB_QR, `SELECT p.* FROM qr_sarf_prep p JOIN qr_sarf_verb v ON v.id = p.verb_id WHERE v.root IN ${inRoots} ORDER BY p.sort`, [R]),
    query<Sense>(env.DB_QR, `SELECT * FROM qr_sarf_sense WHERE root IN ${inRoots} ORDER BY root, sort`, [R]),
    query<Near>(env.DB_QR, `SELECT * FROM qr_sarf_near WHERE status = 'live' AND root IN ${inRoots}`, [R]),
    query<{ root: string; text_en: string; text_ar: string }>(env.DB_QR,
      `SELECT root, text_en, text_ar FROM qr_vocab_root_core WHERE source_slug = 'kmaps_root_dna' AND root IN ${inRoots}`, [R]),
  ]);
  // every āyah a citation names, and the GT names the drills use
  const cites: Cite[] = [
    ...verbs.map((v) => parseJson<Cite | null>(v.cite_json, null)), ...preps.map((p) => parseJson<Cite | null>(p.cite_json, null)),
    ...senses.flatMap((s) => parseJson<Cite[]>(s.cites_json, [])),
    ...nears.flatMap((n) => parseJson<{ cite: Cite }[]>(n.members_json, []).map((m) => m.cite)),
    ...words.flatMap((w) => parseJson<{ cite: Cite }[]>(w.plurals_json, []).map((p) => p.cite)),
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
    words, verbs, preps, senses, nears,
    picture: new Map(pictures.map((p) => [p.root, p])),
    texts: new Map(ayat.map((a) => [`${a.surah}:${a.ayah}`, a.t])),
    gt: new Map(gts.map((g) => [g.id, g.name_ar])),
  };
}
type Data = NonNullable<Awaited<ReturnType<typeof load>>>;

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
  const { verbs, preps, senses, nears, words, texts, gt, picture } = D;
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
  const plurals = words.flatMap((w) => parseJson<{ ar: string; cite: Cite }[]>(w.plurals_json, []).map((p, k) => ({ w, p, k })));
  for (const { w, p, k } of plurals) {
    const v = w.verb_id ? byId.get(w.verb_id) : undefined;
    const answer = p.ar.replace(/\s*\(.*\)$/, '');
    const others = parseJson<string[][]>(v?.others_json ?? null, []).map((o) => o[0]);
    const o = choose(answer, [...plurals.map((x) => x.p.ar.replace(/\s*\(.*\)$/, '')), ...others, ...(v ? masadirOf(v) : [])]);
    if (!o) continue;
    group(3, w.root).push(make(`plural:${w.surah}:${w.ayah}:${w.word_index}:${k}`, 'sf_plural', {
      prompt: w.word_ar.replace(/^وَ/, ''), promptEn: w.here_en, script: 'arabic', ...o,
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
    const ms = parseJson<{ ar: string; en: string; cite: Cite }[]>(ns.members_json, []);
    ms.forEach((m, k) => {
      const o = choose(m.ar, ms.map((x) => x.ar));
      if (!o) return;
      group(8, ns.id).push(make(`near:${ns.id}:${k}`, 'sf_near', { prompt: ns.title_ar, promptEn: m.en, script: 'arabic', ...o,
        explanation: ms.map((x) => `${x.ar} — ${x.en}`).join('\n') + (quote(m.cite, texts) ? `\n${quote(m.cite, texts)}` : '') }, m.en, m.ar));
    });
  }

  return interleave(piles.map((groups) => interleave(groups, Number.MAX_SAFE_INTEGER)), n);
}

// ── the passage's الصرف, to read ────────────────────────────────────────────
//
// The same rows the drills are dealt from, laid out for reading (the passage study's الصرف tab):
// each focus word with what it means here, its root's picture, its form and its Qurʾānic plurals;
// each verb's table and its family; the prepositions and what they do; the Qurʾān's meaning range
// of each word; the near-synonyms. Every label a GT term's Arabic name, every quotation cut from
// the muṣḥaf.

export async function sarfSheet(env: QuranEnv, scope: Scope) {
  const D = await load(env, scope);
  if (!D) return null;
  const { verbs, preps, senses, nears, words, texts, gt, picture } = D;
  const extra = await query<{ id: string; name_ar: string }>(env.DB_QR,
    `SELECT id, name_ar FROM ar_ling_gram_term WHERE id IN (SELECT value FROM json_each(?))`,
    [JSON.stringify([...new Set([...verbs.flatMap((v) => [v.bab_gt, v.root_type_gt, v.route_gt, v.maani_gt]),
                                  ...preps.map((p) => p.prep_gt), ...words.map((w) => w.sigha_gt),
                                  ...verbs.flatMap((v) => parseJson<string[][]>(v.others_json, []).map((o) => o[1]))])].filter(Boolean))]);
  for (const g of extra) gt.set(g.id, g.name_ar);
  const name = (id: string | null | undefined) => (id ? gt.get(id) ?? null : null);
  const cite = (c: Cite | null | undefined) => (c ? quote(c, texts) : null);
  const verbView = (v: Verb) => ({
    id: v.id, root: v.root, title: `${v.madi} ${v.mudari}`, meaning: v.meaning_en,
    chips: [v.bab_gt, v.form_gt, v.root_type_gt, v.route_gt, v.maani_gt].map(name).filter(Boolean),
    table: v.full ? tableOf(v, gt) : null, chant: chantOf(v), masadir: masadirOf(v),
    others: parseJson<string[][]>(v.others_json, []).map(([form, g, pattern, meaning]) => ({ form, name: name(g), pattern, meaning })),
    note: v.note_en, quote: cite(parseJson<Cite | null>(v.cite_json, null)), inQuran: v.quran_n,
    preps: preps.filter((p) => p.verb_id === v.id).map((p) => ({ prep: p.prep_ar, name: name(p.prep_gt), usage: p.usage_ar,
                                                                  meaning: p.meaning_en, quote: cite(parseJson<Cite | null>(p.cite_json, null)) })),
  });
  const roots = [...new Set(words.map((w) => w.root))];
  const pic = (r: string) => (picture.get(r) ? { en: picture.get(r)!.text_en, ar: picture.get(r)!.text_ar } : null);
  const formNo = (v: Verb) => FORM_NO[v.form_gt.split(':').pop() ?? ''] ?? '';
  const byForm = (a: Verb, b: Verb) => FORM_ORDER.indexOf(a.form_gt.split(':').pop() ?? '') - FORM_ORDER.indexOf(b.form_gt.split(':').pop() ?? '');
  const lemmas = (r: string) => [...new Set(senses.filter((x) => x.root === r).map((x) => x.lemma_ar))];
  // the section heads and their ledes, as label rows (scope sarf_section)
  const heads = await query<{ key: string; label: string; label_ar: string | null; detail: string | null }>(env.DB_QR,
    `SELECT key, label, label_ar, detail FROM qr_study_label WHERE scope = 'sarf_section' ORDER BY sort`);
  return {
    sections: heads.map((h) => ({ key: h.key, title: h.label, titleAr: h.label_ar, lede: h.detail })),
    // one table per focus verb, in the textbook's order
    tables: verbs.filter((v) => v.full).map(verbView),
    // each root's verbs the Qurʾān uses, as family lines, Form I first
    families: roots.map((r) => ({ root: r, letters: [...r].join(' '), gloss: pic(r)?.en ?? null,
      lines: verbs.filter((v) => v.root === r).sort(byForm).map((v) => ({
        id: v.id, form: formNo(v), line: `${v.madi} ${v.mudari} ${masadirOf(v).join(' وَ')}`, meaning: v.meaning_en,
        inQuran: v.quran_n, quote: cite(parseJson<Cite | null>(v.cite_json, null)) })) })).filter((f) => f.lines.length),
    // every preposition a verb takes in the Qurʾān, and what it does
    preps: preps.map((p) => ({ root: verbs.find((v) => v.id === p.verb_id)?.root ?? '', verb: verbs.find((v) => v.id === p.verb_id)?.madi ?? '', prep: p.prep_ar, name: name(p.prep_gt),
                               usage: p.usage_ar, meaning: p.meaning_en, quote: cite(parseJson<Cite | null>(p.cite_json, null)) })),
    // each word's senses across the Qurʾān, by lemma; the one in this passage marked
    ranges: roots.flatMap((r) => lemmas(r).map((l) => ({ root: r, lemma: l, gloss: pic(r)?.en ?? null,
      senses: senses.filter((x) => x.root === r && x.lemma_ar === l).map((x) => ({ en: x.sense_en, ar: x.sense_ar, here: !!x.here,
        quotes: parseJson<Cite[]>(x.cites_json, []).map(cite).filter(Boolean) })) }))),
    near: nears.map((n) => ({ root: n.root, title: n.title_en, titleAr: n.title_ar,
      members: parseJson<{ ar: string; en: string; cite: Cite }[]>(n.members_json, []).map((m) => ({ ar: m.ar, en: m.en, quote: cite(m.cite) })) })),
    words: words.map((w) => ({
      ref: `${w.surah}:${w.ayah}:${w.word_index}`, place: `${w.surah}:${w.ayah} · ${w.word_index}`, word: w.word_ar, here: w.here_en, root: w.root,
      letters: [...w.root].join(' '),
      picture: picture.get(w.root) ? { en: picture.get(w.root)!.text_en, ar: picture.get(w.root)!.text_ar } : null,
      form: name(w.sigha_gt), pattern: w.pattern_ar, verb: w.verb_id,
      plurals: parseJson<{ ar: string; cite: Cite }[]>(w.plurals_json, []).map((p) => ({ ar: p.ar, quote: cite(p.cite) })),
      prep: (() => { const p = parseJson<{ ar: string; gt: string; how: string } | null>(w.prep_json, null);
                     return p ? { prep: p.ar, name: name(p.gt), how: p.how } : null; })(),
    })),
    roots: roots.map((r) => ({
      root: r, letters: [...r].join(' '), picture: picture.get(r) ? { en: picture.get(r)!.text_en, ar: picture.get(r)!.text_ar } : null,
      verbs: verbs.filter((v) => v.root === r).map(verbView),
      range: senses.filter((s) => s.root === r).map((s) => ({ lemma: s.lemma_ar, en: s.sense_en, ar: s.sense_ar, here: !!s.here,
                                                            quotes: parseJson<Cite[]>(s.cites_json, []).map(cite).filter(Boolean) })),
      near: nears.filter((n) => n.root === r).map((n) => ({ title: n.title_en, titleAr: n.title_ar,
        members: parseJson<{ ar: string; en: string; cite: Cite }[]>(n.members_json, []).map((m) => ({ ar: m.ar, en: m.en, quote: cite(m.cite) })) })),
    })),
  };
}
