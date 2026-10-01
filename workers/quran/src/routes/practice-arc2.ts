import { query } from '../../../shared/src/db';
import type { QuranEnv } from '../env';
import type { Label } from '../lib/labels';
import { loadAyat, withCard, levelOf, shuffle, uniq, interleave, type Ayah, type Drill, type Scope } from './practice-kit';

// ── Meaning arcs (QR skill 'meaning_arc', source 'arc2') ─────────────────────────
// The DERIVED arcs of every Qurʾānic root (AL 0114, kmaps-resources meaning_arcs.py): each source's
// own arc — Ibn Fāris's aṣl and his branches, Lane's senses in his order, al-Rāghib's Qurʾānic senses,
// the Tāj/Lisān/Ṣiḥāḥ/… read by their own markers — and the combined arc that aligns them. The
// hand-built arcs keep their own skill ('arc'); this one drills what the sources themselves order.
// Every drill stands in a sentence — the āyah where the root is (recited, the word marked where that
// does not give the answer away) or the source's own quoted statement — and files its review card.
//
//   L1 the root's core     arc_core   what is the root's first image — the aṣl, in the source's words
//                                     (the cores of other roots to choose between)
//                          arc_first  which of the root's rungs is where its meaning starts
//   L2 the arc's order     arc_order  a source's rungs, shuffled: put them back in its order (dialogue)
//                          arc_lemma  Lane gives this sense under one of the root's words — which?
//   L3 words and links     arc_word   the marked word in its āyah: which rung does it stand on here?
//                          arc_link   what does the source write between rung X and rung Y? (the formula)
//                          arc_disagree  the sources order two rungs oppositely: which places X first?
// AL shapes the material (/al/drill/meaning-arcs); the asks a level has come from qr_study_label.

type Rung = { id: string; seq: number; tier: string; kind: string; source: string; headAr: string | null; labelAr: string | null;
  labelEn: string | null; stepEn?: string | null; quoteAr: string | null; quoteEn: string | null; marker: string | null; page: string | null; foundUnder: string | null;
  ayat: string[]; nWords: number; cite: string | null; attest?: Array<{ source: string; seq: number; of: number; name?: string }> };
type Src = Record<string, { en: string; short: string; ar: string }>;
type Material = { asks: Record<string, any[]>; sources: Src; relations: Record<string, string> };
type Occ = { surah: number; ayah: number; word_index: number; word_text: string; root: string; lemma: string | null };

const LEVEL_ASKS: Record<string, string[]> = { basic: ['arc_core', 'arc_first'], middle: ['arc_order', 'arc_lemma'],
                                               advanced: ['arc_word', 'arc_link', 'arc_disagree'] };
const COLOR: Record<string, string> = { maqayis_lugha: '#B388EB', lane_lexicon: '#5DA9E9', raghib_mufradat: '#4FB3A9', zabidi_taj_arus: '#E07A5F',
  ibn_manzur_lisan_arab: '#81B29A', jawhari_sihah: '#F2CC8F', qamus_muhit: '#F28482', fayyumi_misbah_munir: '#9C89B8', khalil_kitab_ayn: '#D8B657',
  ubab_zakhir: '#A5A58D', mir_verbal_idioms: '#F4A261', combined: '#B388EB' };

const fold = (w: string | null | undefined) => (w ?? '').replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, '')
  .replace(/[ٱأإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[^ء-ي]/g, '');
// a root as one word (غلل), the way the user reads it — not letter by letter
const spaced = (r: string) => fold(r);
// a source's sigils (Lane's ‡ tropical, † post-classical, * marks) are its typography, not the reader's text
const tidy = (t: string | null | undefined) => (t ?? '').replace(/[‡†*]+/g, '').replace(/\s+/g, ' ').trim();
/// cut where the source pauses (، ؛ . ;) rather than mid-phrase; only then at a word
const clip = (t: string | null | undefined, k = 140) => {
  const s = tidy(t);
  if (s.length <= k) return s;
  const head = s.slice(0, k);
  const pause = Math.max(...['،', '؛', '.', ';', ':'].map((p) => head.lastIndexOf(p)));
  return (pause > k * 0.5 ? head.slice(0, pause) : head.replace(/\s+\S*$/, '')).trim() + ' …';
};
// Bidi for an explanation read as plain text: an English line starts left-to-right (LRM) so its
// number stays on the left, and the Arabic inside it is isolated (FSI…PDI) so it cannot reorder the
// line; an Arabic quote stands on a line of its own and reads right-to-left.
const LTR = '\u200E';
// Lane renders some senses in Latin; those are not the reader's English
const isEnglish = (t: string) => /\b(the|a|an|of|to|or|and|he|she|it|was|is|in|on|with|for|from|his|her|their)\b/i.test(t);
/// Lane's English as plain English: the Arabic he quotes inside a gloss taken out, its brackets and
/// doubled punctuation tidied — the Arabic stands on its own line below
const plainEn = (t: string | null | undefined) => {
  const s = tidy(t).replace(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+/g, ' ')
    .replace(/\(\s*\)|\[\s*\]/g, ' ').replace(/\s+([,.;:])/g, '$1').replace(/([,;:])\1+/g, '$1')
    .replace(/,\s*,/g, ',').replace(/\s+/g, ' ').replace(/^[\s,;:—-]+|[\s,;:—-]+$/g, '').trim();
  return s && isEnglish(s) ? s : '';
};
const iso = (ar: string) => `\u2068${ar}\u2069`;
/// a rung as an option: the source's English where every option has it, else its Arabic
const face = (r: Rung, en: boolean) => clip(en ? (r.labelEn ?? r.labelAr) : (r.labelAr ?? r.labelEn), 110);

function al<T>(env: QuranEnv, path: string): Promise<T> {
  if (!env.AR_LINGUISTICS) return Promise.reject(new Error('no AL binding'));
  return env.AR_LINGUISTICS.fetch(`https://al${path}`).then((r) => r.json() as Promise<{ data: T }>).then((j) => j.data);
}

const scopeWhere = (s: Scope) => s.surah === null ? { sql: '1=1', args: [] as number[] }
  : s.from && s.to ? { sql: 'surah = ? AND ayah BETWEEN ? AND ?', args: [s.surah, s.from, s.to] }
  : { sql: 'surah = ?', args: [s.surah] };

/// the words of a source's own statement, untimed, with one span marked
function line(text: string, mark?: string | null) {
  const toks = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).slice(0, 60);
  const i = toks.findIndex((t) => t.includes('＿'));
  const j = i >= 0 ? i : mark ? toks.findIndex((t) => fold(t).length >= 2 && fold(t).includes(fold(mark))) : -1;
  return { words: toks.map((t) => ({ t, s: 0, e: 0 })), span: j >= 0 ? [j] : [] };
}

/// the arc read out: each rung and who gives it
const arcText = (rs: Rung[], src: Src, k = 8) => rs.slice(0, k).map((r) => {
  // the step in plain words, then its key word (head_ar, vocalised) — the book's own sentence only
  // where no one has written the step out yet
  const en = plainEn(r.labelEn), key = tidy(r.headAr), ar = key && key.length <= 40 ? key : clip(r.labelAr, 70);
  const head = `${LTR}${r.seq}. ${en ? clip(en, 110) : iso(ar)}`;
  return en && ar ? `${head}\n${ar}` : head;
}).join('\n\n');
/// a rung as one short step of an arc: its English with the "or …" alternatives and everything after
/// the first stop taken off, at most eight words ("He made it, or caused it, to enter, into a thing"
/// → "He made it to enter into a thing")
const stepEn = (r: Rung) => {
  const e = plainEn(r.labelEn).replace(/,\s*or\s+[^,;.]+/gi, '').split(/[;.]| — |: /)[0].replace(/[,\s]+$/, '').trim();
  const ws = e.split(/\s+/).filter(Boolean);
  return ws.length >= 2 ? ws.slice(0, 8).join(' ') : '';
};
/// the root's arc in English: its first steps, in order, each said once
/// only the turning points someone has written as a short step (step_en: "Binding", "Book") — an arc
/// is offered only once its steps read cleanly, never Lane's sentences cut short
const arcSteps = (rs: Rung[], k = 5) => uniq([...rs].sort((a, b) => a.seq - b.seq).map((r) => tidy(r.stepEn)).filter(Boolean)).slice(0, k);
const arcLine = (steps: string[]) => steps.join('  →  ');
/// a source's statement: who says it (left-to-right), then the words themselves on their own line
const said = (cite: string | null | undefined, quote: string | null | undefined, k = 260) =>
  [cite ? `${LTR}${tidy(cite)}:` : '', quote ? `«${clip(quote, k)}»` : ''].filter(Boolean).join('\n');

export async function arc2Drills(env: QuranEnv, n: number, scope: Scope, lv: Record<string, unknown>, L: Record<string, Label[]>): Promise<Drill[]> {
  const { band, asks } = levelOf(L, 'meaning_arc', lv);
  const want = asks.length ? asks : LEVEL_ASKS.basic;
  const w = scopeWhere(scope);
  // the scope's roots, as the Qurʾān has them, and a few words of each (the āyah a drill stands in)
  const occ = await query<Occ>(env.DB_QR,
    `SELECT surah, ayah, word_index, word_text, root, lemma FROM qr_word_occurrence
      WHERE root IS NOT NULL AND is_content_word = 1 AND ${w.sql} ORDER BY random() LIMIT 600`, w.args);
  const occOf = new Map<string, Occ[]>();
  for (const o of occ) occOf.set(o.root, [...(occOf.get(o.root) ?? []), o]);
  const roots = shuffle([...occOf.keys()]).slice(0, 80);
  if (!roots.length) return [];
  const qs = new URLSearchParams({ asks: want.join(','), n: String(Math.ceil(n / Math.max(1, want.length)) + 2), roots: roots.join(',') });
  if (scope.surah) qs.set('surah', String(scope.surah));
  if (scope.from && scope.to) { qs.set('from', String(scope.from)); qs.set('to', String(scope.to)); }
  const m = await al<Material>(env, `/al/drill/meaning-arcs?${qs}`).catch(() => null);
  if (!m) return [];
  const src = m.sources;
  // the āyāt the drills stand in: the word placed on the rung (arc_word), else a word of the root in scope
  const pairs: number[][] = [];
  for (const x of m.asks.arc_word ?? []) pairs.push([x.surah, x.ayah]);
  const occFor = (root: string, lemma?: string | null) => { const os = occOf.get(root) ?? []; return (lemma ? os.find((o) => o.lemma === lemma) : undefined) ?? os[0]; };
  for (const k of ['arc_core', 'arc_first', 'arc_lemma']) for (const x of m.asks[k] ?? []) {
    const o = occFor(x.root, x.lemma);
    if (o) pairs.push([o.surah, o.ayah]);
    else if (x.words?.[0]) pairs.push([x.words[0].surah, x.words[0].ayah]);
  }
  const ayat = await loadAyat(env, pairs);
  const arcs = new Map<string, string[]>();
  for (const x of m.asks.arc_first ?? []) { const st = arcSteps(x.rungs ?? []); if (st.length >= 3) arcs.set(x.root, st); }
  const piles: Drill[][] = [];
  for (const ask of want) {
    const xs = shuffle(m.asks[ask] ?? []);
    const pile: Drill[] = [];
    for (const x of xs) {
      const d = build(ask, x, { ayat, occFor, src, band, relations: m.relations, arcs });
      if (d) pile.push(d);
      if (pile.length >= n) break;
    }
    piles.push(pile);
  }
  return interleave(piles, n);
}

type Ctx = { ayat: Map<string, Ayah>; occFor: (root: string, lemma?: string | null) => Occ | undefined; src: Src;
             band: ReturnType<typeof levelOf>['band']; relations: Record<string, string>; arcs: Map<string, string[]> };

function inAyah(ctx: Ctx, root: string, lemma?: string | null, at?: { surah: number; ayah: number; wordIndex: number }, mark = true) {
  const o = at ? { surah: at.surah, ayah: at.ayah, word_index: at.wordIndex } : ctx.occFor(root, lemma);
  if (!o) return null;
  const ay = ctx.ayat.get(`${o.surah}:${o.ayah}`);
  if (!ay) return null;
  const idx = ay.ws.findIndex((x) => x.word_index === o.word_index);
  return { ay, idx, base: { script: 'quran', audio: ay.audio, words: ay.words, en: ay.en, span: mark && idx >= 0 ? [idx] : [] } };
}

function build(ask: string, x: any, ctx: Ctx): Drill | null {
  const { src, band } = ctx;
  const badge = (s: string) => ({ label: src[s]?.short ?? s, labelAr: src[s]?.ar ?? null, color: COLOR[s] ?? '#B388EB' });
  const source = (root: string, s?: string) => ({ workId: `AL:ROOT:${root}`, title: `${spaced(root)} · ${s ? src[s]?.en ?? s : 'meaning arc'}`, level: null });
  if (ask === 'arc_core' || ask === 'arc_first') {
    const first: Rung = x.first;
    const rungs: Rung[] = x.rungs ?? [];
    const asl: Rung | undefined = x.asl?.[0];
    const at = inAyah(ctx, x.root);
    if (!at) return null;
    const who = asl ? 'maqayis_lugha' : (first.attest?.[0]?.source ?? 'lane_lexicon');
    const byWhom = src[who]?.short ?? who;
    const en = !first.labelAr;
    const answer = face(first, en);
    const core = asl ?? first, coreEn = plainEn(core.labelEn), coreKey = tidy(core.headAr);
    // the core said plainly, with its key word and who gives it; the book's sentence where it is not written out
    const why = coreEn
      ? [`${LTR}Core image: ${coreEn}`, coreKey && coreKey.length <= 40 ? coreKey : '', `${LTR}— ${byWhom}`].filter(Boolean).join('\n')
      : (asl ? said(asl.cite, asl.quoteAr ?? asl.labelAr) : `${LTR}${tidy(first.cite)}`);
    let options: string[];
    let prompt: string;
    if (ask === 'arc_core') {
      const others = shuffle((x.otherCores ?? []) as Array<{ labelAr: string | null; labelEn: string | null }>)
        .map((o) => clip(en ? o.labelEn ?? '' : o.labelAr ?? '', 110)).filter((o) => o && o !== answer);
      options = uniq([answer, ...others]).slice(0, 4);
      prompt = `What is the core of ${spaced(x.root)} — its first image, in ${byWhom}'s words?`;
    } else {
      // the arc itself, in English: which of these close arcs is the root's? (the same steps out of
      // order, the arc run backwards, another root's arc of this round)
      const steps = ctx.arcs.get(x.root);
      if (!steps) return null;
      const right = arcLine(steps);
      const swapped = steps.length > 2 ? arcLine([steps[0], steps[2], steps[1], ...steps.slice(3)]) : '';
      const lateSwap = steps.length > 3 ? arcLine([steps[0], steps[1], steps[3], steps[2], ...steps.slice(4)]) : '';
      const backwards = arcLine([...steps].reverse());
      const other = shuffle([...ctx.arcs.entries()].filter(([r]) => r !== x.root)).map(([, st]) => arcLine(st))[0] ?? '';
      const wrong = uniq([swapped, other || lateSwap, backwards, lateSwap].filter((o) => o && o !== right)).slice(0, 3);
      if (wrong.length < 2) return null;
      const word = at.idx >= 0 ? at.ay.ws[at.idx]?.word_text : null;
      const arcDrill: Drill = { id: `arc2:${ask}:${x.root}`, kind: 'feature', ask: 'arc2_pick', ...at.base,
        prompt: `${word ? `${word} — ` : ''}which is the arc of meaning of its root ${spaced(x.root)}, from its first image on?`,
        options: shuffle([right, ...wrong]), answer: right, arabicOptions: false,
        note: { en: `the root ${spaced(x.root)}`, ar: spaced(x.root) },
        explanation: `${why}\n\n${LTR}How the meaning branches out:\n\n${arcText(rungs, src)}`, badges: [badge(who)], source: source(x.root, who) };
      return withCard(arcDrill, { ref: `QR:arc2:${ask}:${x.root}`, type: 'root', kind: 'meaning_arc', band,
        front: `${at.ay.ws.map((w) => w.word_text).join(' ')}\n${spaced(x.root)} — its arc of meaning?`, back: right });
    }
    if (options.length < 3) return null;
    const drill: Drill = { id: `arc2:${ask}:${x.root}`, kind: 'feature', ask: ask.replace('arc_', 'arc2_'), ...at.base, prompt,
      options: shuffle(options), answer, arabicOptions: !en, note: { en: `the root ${spaced(x.root)}`, ar: spaced(x.root) },
      explanation: `${why}\n\n${LTR}How the meaning branches out:\n\n${arcText(rungs, src)}`, badges: [badge(who)], source: source(x.root, who) };
    return withCard(drill, { ref: `QR:arc2:${ask}:${x.root}`, type: 'root', kind: 'meaning_arc', band,
      front: `${at.ay.ws.map((w) => w.word_text).join(' ')}\n${spaced(x.root)} — ${ask === 'arc_core' ? 'its core?' : 'where does it start?'}`,
      back: `${answer}\n${why}`, surah: at.ay.surah, ayah: at.ay.ayah, series: 'Meaning arcs · the core' });
  }
  if (ask === 'arc_order') {
    let rs: Rung[] = (x.rungs ?? []).filter((r: Rung) => r.labelAr || r.labelEn);
    if (rs.length < 3) return null;
    // at most six, the first always among them, the rest spread along the arc — the source's order kept
    if (rs.length > 6) { const keep = new Set([0, ...shuffle(rs.slice(1).map((_, i) => i + 1)).slice(0, 5)]); rs = rs.filter((_, i) => keep.has(i)); }
    const order = rs.map((_, i) => i);
    let sh = shuffle(order);
    for (let k = 0; k < 4 && sh.every((v, i) => v === i); k++) sh = shuffle(order);
    const name = src[x.source]?.short ?? x.source;
    const drill: Drill = { id: `arc2:order:${x.root}:${x.source}`, kind: 'dialogue', ask: 'arc2_order',
      prompt: `${name} on ${spaced(x.root)} — put his statements back in his order`,
      dialogue: rs.map((r) => ({ speaker: null, ar: clip(r.labelAr ?? r.headAr ?? '', 160), en: clip(r.labelEn ?? (r.marker ? `(${r.marker})` : ''), 160), clip: null })),
      shuffled: sh, badges: [badge(x.source)], source: source(x.root, x.source),
      explanation: rs.map((r) => `${LTR}${r.seq}. ${plainEn(r.labelEn) ? clip(plainEn(r.labelEn), 100) : iso(clip(r.labelAr, 100))}${r.cite ? `\n${LTR}— ${tidy(r.cite)}` : ''}`).join('\n\n') };
    return withCard(drill, { ref: `QR:arc2:order:${x.root}:${x.source}`, type: 'root', kind: 'meaning_arc', band,
      front: `${spaced(x.root)} — ${name}'s order`, back: rs.map((r) => clip(r.labelEn ?? r.labelAr, 60)).join(' → '), series: 'Meaning arcs · order' });
  }
  if (ask === 'arc_lemma') {
    const fam: string[] = uniq(x.family ?? []);
    const others = shuffle(fam.filter((l) => fold(l) !== fold(x.lemma))).slice(0, 3);
    if (others.length < 1) return null;
    const w0 = x.words?.[0];
    const at = inAyah(ctx, x.root, x.lemma, w0 ? { surah: w0.surah, ayah: w0.ayah, wordIndex: w0.wordIndex } : undefined, false);
    const base = at ? at.base : line(`${x.labelEn}`);
    const drill: Drill = { id: `arc2:lemma:${x.root}:${x.lemma}:${x.marker ?? ''}`, kind: 'feature', ask: 'arc2_lemma', ...base, span: [],
      prompt: `Lane gives “${clip(x.labelEn, 120)}”${x.marker ? ` (his sense ${String(x.marker).trim()})` : ''} under one of the words of ${spaced(x.root)}. Which?`,
      options: shuffle([x.lemma, ...others]), answer: x.lemma, arabicOptions: true,
      note: { en: `a word of ${spaced(x.root)}`, ar: x.lemma },
      explanation: `${x.cite}.${at ? ` The āyah has ${x.lemma} — listen for it.` : ''}\nThe root's words in the Qurʾān: ${fam.join('، ')}`,
      badges: [badge('lane_lexicon')], source: source(x.root, 'lane_lexicon') };
    return withCard(drill, { ref: `QR:arc2:lemma:${x.root}:${x.lemma}:${x.marker ?? ''}`, type: 'root', kind: 'meaning_arc', band,
      front: `${at ? at.ay.ws.map((w) => w.word_text).join(' ') + '\n' : ''}“${clip(x.labelEn, 100)}” — which word of ${spaced(x.root)}?`,
      back: `${x.lemma}\n${x.cite}`, surah: at?.ay.surah ?? null, ayah: at?.ay.ayah ?? null, series: 'Meaning arcs · lemmas' });
  }
  if (ask === 'arc_word') {
    const rung: Rung = x.rung;
    const others: Rung[] = x.others ?? [];
    const at = inAyah(ctx, x.root, x.lemma, { surah: x.surah, ayah: x.ayah, wordIndex: x.wordIndex });
    if (!at || at.idx < 0) return null;
    const en = !!rung.labelEn && others.filter((r) => r.labelEn).length >= 2;
    const answer = face(rung, en);
    const opts = uniq([answer, ...shuffle(others.filter((r) => (en ? r.labelEn : r.labelAr))).map((r) => face(r, en))]).filter(Boolean).slice(0, 4);
    if (opts.length < 3) return null;
    const by: Rung | null = x.by;
    const who = by?.source ?? 'raghib_mufradat';
    const drill: Drill = { id: `arc2:word:${x.surah}:${x.ayah}:${x.wordIndex}`, kind: 'feature', ask: 'arc2_word', ...at.base,
      prompt: `Listen — the marked word is of ${spaced(x.root)}. Which rung of its arc does it stand on here?`,
      options: shuffle(opts), answer, arabicOptions: !en, note: { en: `${x.wordText} · ${spaced(x.root)}`, ar: x.wordText ?? '' },
      explanation: `${src[who]?.short ?? who} files this āyah under «${clip(by?.labelAr ?? by?.labelEn, 160)}» — ${by?.cite ?? ''}` +
        `${x.note ? `\n${src[who]?.short ?? who}: «${clip(x.note, 200)}»` : ''}` +
        `\nRung ${rung.seq} of the arc${rung.attest?.length ? `, given by ${rung.attest.map((a) => `${src[a.source]?.short ?? a.source} (${a.seq})`).join(', ')}` : ''}.`,
      badges: [badge(who)], source: { workId: `QR:SURAH:${at.ay.surah}`, title: at.ay.title, level: null } };
    return withCard(drill, { ref: `QR:arc2:word:${x.surah}:${x.ayah}:${x.wordIndex}`, type: 'root', kind: 'meaning_arc', band,
      front: `${at.ay.ws.map((w) => w.word_text).join(' ')}\n${x.wordText} — which rung?`, back: `${answer}\n${by?.cite ?? ''}`,
      surah: at.ay.surah, ayah: at.ay.ayah, series: at.ay.title.replace(/ \d+:\d+$/, '') });
  }
  if (ask === 'arc_link') {
    const name = src[x.source]?.short ?? x.source;
    const quote: string = x.quoteAr ?? x.quoteEn ?? '';
    const answer = String(x.formula);
    const options = uniq([answer, ...shuffle(x.otherFormulas ?? [])]).slice(0, 4);
    if (options.length < 3) return null;
    // the statement itself, the formula blanked (Lane's English or the Arabic)
    const isEn = !x.quoteAr;
    const plain = answer.replace(/[«»‡†]/g, '').replace(/\(.*?\)/g, '').trim();
    const blanked = isEn ? quote.replace(new RegExp(plain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '＿＿') : blankAr(quote, plain);
    const ln = line(blanked);
    const drill: Drill = { id: `arc2:link:${x.root}:${x.source}:${x.from.seq}:${x.to.seq}`, kind: 'feature', ask: 'arc2_link',
      script: isEn ? null : 'arabic', audio: null, en: null, words: ln.words, span: ln.span,
      prompt: `${name} goes from «${clip(x.from.labelAr ?? x.from.labelEn, 70)}» to «${clip(x.to.labelAr ?? x.to.labelEn, 70)}». With which words?`,
      options: shuffle(options), answer, arabicOptions: !isEn, note: { en: x.relationLabel, ar: answer },
      explanation: `${said(x.to.cite ?? name, quote, 300)}\n${LTR}— ${x.relationLabel}.`, badges: [badge(x.source)], source: source(x.root, x.source) };
    return withCard(drill, { ref: `QR:arc2:link:${x.root}:${x.source}:${x.from.seq}:${x.to.seq}`, type: 'root', kind: 'meaning_arc', band,
      front: `${spaced(x.root)} · ${name}: ${clip(x.from.labelAr ?? x.from.labelEn, 50)} → ${clip(x.to.labelAr ?? x.to.labelEn, 50)} — how?`,
      back: `${answer} (${x.relationLabel})\n«${clip(quote, 200)}»`, series: 'Meaning arcs · links' });
  }
  if (ask === 'arc_disagree') {
    const a: Rung = x.a, b: Rung = x.b;
    const answerSrc = shuffle(x.aFirst as string[])[0];
    const wrong = (x.bFirst as string[]).filter((s) => !(x.aFirst as string[]).includes(s));
    const pool = uniq([...wrong, ...(a.attest ?? []).map((t) => t.source), ...(b.attest ?? []).map((t) => t.source)])
      .filter((s) => !(x.aFirst as string[]).includes(s));
    const options = uniq([answerSrc, ...pool]).slice(0, 4).map((s) => src[s]?.short ?? s);
    if (options.length < 2 || !wrong.length) return null;
    const answer = src[answerSrc]?.short ?? answerSrc;
    const pos = (r: Rung, s: string) => r.attest?.find((t) => t.source === s)?.seq;
    const who = (s: string) => `${src[s]?.short ?? s}: «${clip(a.labelAr ?? a.labelEn, 50)}» ${pos(a, s)}, «${clip(b.labelAr ?? b.labelEn, 50)}» ${pos(b, s)}`;
    const ln = line(clip(a.labelAr ?? a.labelEn ?? '', 200));
    const drill: Drill = { id: `arc2:disagree:${x.root}:${a.seq}:${b.seq}`, kind: 'feature', ask: 'arc2_disagree',
      script: a.labelAr ? 'arabic' : null, audio: null, en: null, words: ln.words, span: [],
      prompt: `The sources disagree on ${spaced(x.root)}. Which of them places «${clip(a.labelAr ?? a.labelEn, 70)}» BEFORE «${clip(b.labelAr ?? b.labelEn, 70)}»?`,
      options: shuffle(options), answer, note: { en: 'the order of the senses', ar: 'تَرْتِيبُ المَعَانِي' },
      explanation: `Where each places them (its rung numbers):\n${[...x.aFirst, ...x.bFirst].map(who).join('\n')}`,
      badges: [badge(answerSrc)], source: source(x.root) };
    return withCard(drill, { ref: `QR:arc2:disagree:${x.root}:${a.seq}:${b.seq}`, type: 'root', kind: 'meaning_arc', band,
      front: `${spaced(x.root)}: «${clip(a.labelAr ?? a.labelEn, 50)}» before «${clip(b.labelAr ?? b.labelEn, 50)}» — who?`,
      back: `${answer}\n${[...x.aFirst, ...x.bFirst].map(who).join('\n')}`, series: 'Meaning arcs · disagreements' });
  }
  return null;
}

/// blank the formula in an Arabic statement, matching its letters whatever the vowels
function blankAr(text: string, formula: string) {
  const f = fold(formula.replace(/…/g, ' ')).trim();
  if (!f) return text;
  const toks = text.split(/\s+/);
  const ft = formula.replace(/…/g, ' ').split(/\s+/).map(fold).filter(Boolean);
  for (let i = 0; i < toks.length; i++) {
    if (fold(toks[i]) === ft[0] || (ft[0].length >= 3 && fold(toks[i]).endsWith(ft[0]))) {
      const k = Math.min(ft.length, toks.length - i);
      return [...toks.slice(0, i), '＿＿', ...toks.slice(i + k)].join(' ');
    }
  }
  return text;
}
