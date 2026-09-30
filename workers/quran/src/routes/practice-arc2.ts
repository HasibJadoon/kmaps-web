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
  labelEn: string | null; quoteAr: string | null; quoteEn: string | null; marker: string | null; page: string | null; foundUnder: string | null;
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
const spaced = (r: string) => [...fold(r)].join(' ');
const clip = (t: string | null | undefined, k = 140) => { const s = (t ?? '').replace(/\s+/g, ' ').trim(); return s.length > k ? s.slice(0, k - 1).replace(/\s+\S*$/, '') + ' …' : s; };
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
const arcText = (rs: Rung[], src: Src, k = 8) => rs.slice(0, k).map((r) =>
  `${r.seq}. ${clip(r.labelEn ?? r.labelAr, 90)}${r.labelEn && r.labelAr ? ` — ${clip(r.labelAr, 60)}` : ''}` +
  (r.attest?.length ? ` (${r.attest.map((a) => `${src[a.source]?.short ?? a.source} ${a.seq}`).join(', ')})` : '')).join('\n');

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
  const piles: Drill[][] = [];
  for (const ask of want) {
    const xs = shuffle(m.asks[ask] ?? []);
    const pile: Drill[] = [];
    for (const x of xs) {
      const d = build(ask, x, { ayat, occFor, src, band, relations: m.relations });
      if (d) pile.push(d);
      if (pile.length >= n) break;
    }
    piles.push(pile);
  }
  return interleave(piles, n);
}

type Ctx = { ayat: Map<string, Ayah>; occFor: (root: string, lemma?: string | null) => Occ | undefined; src: Src;
             band: ReturnType<typeof levelOf>['band']; relations: Record<string, string> };

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
    const why = asl ? `${asl.cite}: «${clip(asl.quoteAr ?? asl.labelAr, 260)}»` : first.cite ?? '';
    let options: string[];
    let prompt: string;
    if (ask === 'arc_core') {
      const others = shuffle((x.otherCores ?? []) as Array<{ labelAr: string | null; labelEn: string | null }>)
        .map((o) => clip(en ? o.labelEn ?? '' : o.labelAr ?? '', 110)).filter((o) => o && o !== answer);
      options = uniq([answer, ...others]).slice(0, 4);
      prompt = `What is the core of ${spaced(x.root)} — its first image, in ${byWhom}'s words?`;
    } else {
      const later = rungs.filter((r) => r.seq > 1 && (en ? r.labelEn : r.labelAr)).map((r) => face(r, en)).filter((o) => o !== answer);
      options = uniq([answer, ...shuffle(later)]).slice(0, 4);
      prompt = `Where does the meaning of ${spaced(x.root)} start? One of these is its first rung; the others come later on its arc.`;
    }
    if (options.length < 3) return null;
    const drill: Drill = { id: `arc2:${ask}:${x.root}`, kind: 'feature', ask: ask.replace('arc_', 'arc2_'), ...at.base, prompt,
      options: shuffle(options), answer, arabicOptions: !en, note: { en: `the root ${spaced(x.root)}`, ar: spaced(x.root) },
      explanation: `${why}\n\nThe arc, as the sources order it:\n${arcText(rungs, src)}`, badges: [badge(who)], source: source(x.root, who) };
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
      explanation: rs.map((r) => `${r.seq}. ${clip(r.labelEn ?? r.labelAr, 100)} — ${r.cite ?? ''}`).join('\n') };
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
      explanation: `${x.to.cite ?? name}: «${clip(quote, 300)}» — ${x.relationLabel}.`, badges: [badge(x.source)], source: source(x.root, x.source) };
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
