import { query } from '../../../shared/src/db';
import type { QuranEnv } from '../env';
import { byKey, type Label } from '../lib/labels';

// ── Lexicon drills (QR skill 'lexicon') ───────────────────────────────────────
// What each classical lexicon itself says of a root — Lane's senses and apparatus, the Tāj and
// the Qāmūs's model words and «ج:», Ibn Fāris's uṣūl, al-Khalīl's glosses, the dalāla formulae,
// Mir's idioms, Sinai's key terms, and each lexicon's own style — asked at three levels (the
// skill's extra_json.levels name the types each level draws on). AL shapes the questions from its
// facts layer (/al/drill/lexicon); this side puts each in a sentence: the āyah where the root
// stands (its words marked, al-ʿAfāsī's recitation) or, where the Qurʾān has no word for it, the
// lexicon's own quoted example. The lemma-family drills (which word of the root fills the āyah,
// which word is not of the root, which form the verb is) are built here from the āyah's words.
// Every drill carries its review card (CORE SRS, module QR), the whole drill kept.

type Scope = { surah: number | null; from: number | null; to: number | null };
type Band = 'basic' | 'middle' | 'advanced' | 'all';
type Item = {
  id: string; type: string; root: string; source: string | null; sourceTitle: string | null; head: string | null;
  prompt: string; promptAr?: string | null; answer: string; options: string[]; arabicOptions?: boolean;
  sentence: { text: string; source: string | null } | null; ayah: { surah: number; ayah: number; mark: string | null } | null;
  explanation: string | null; note: { en: string; ar: string } | null; steps?: Array<{ ar: string; en: string }>; ref: string;
  context?: { lane?: string[]; sinai?: string[] };
};
type Occ = { surah: number; ayah: number; word_index: number; word_text: string; root: string; lemma: string | null; pos: string | null; form_roman: string | null };
type Gloss = { head: string; gloss: string | null; form: string | null };

const RECITER = 7;
const QR_TYPES = ['family', 'odd', 'form'];
const DEFAULT_TYPES = ['core', 'sense', 'digest', 'plural', 'which_lexicon', 'bab', 'family', 'asl', 'quran_sense', 'style'];
const FORMS: Record<string, string> = { I: 'فَعَلَ', II: 'فَعَّلَ', III: 'فَاعَلَ', IV: 'أَفْعَلَ', V: 'تَفَعَّلَ', VI: 'تَفَاعَلَ', VII: 'اِنْفَعَلَ',
                                        VIII: 'اِفْتَعَلَ', IX: 'اِفْعَلَّ', X: 'اِسْتَفْعَلَ' };
const ARABIC_NUM: Record<string, string> = { I: '1', II: '2', III: '3', IV: '4', V: '5', VI: '6', VII: '7', VIII: '8', IX: '9', X: '10' };
const COLORS: Record<string, string> = { lane_lexicon: '#5DA9E9', zabidi_taj_arus: '#E07A5F', ibn_manzur_lisan_arab: '#81B29A', maqayis_lugha: '#B388EB',
  jawhari_sihah: '#F2CC8F', raghib_mufradat: '#4FB3A9', khalil_kitab_ayn: '#D8B657', qamus_muhit: '#F28482', fayyumi_misbah_munir: '#9C89B8',
  ubab_zakhir: '#A5A58D', sinai_key_terms: '#6D9DC5', mir_verbal_idioms: '#F4A261' };

const shuffle = <T>(xs: T[]) => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const fold = (w: string | null | undefined) => (w ?? '').replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '')
  .replace(/[\u0671\u0623\u0625\u0622]/g, '\u0627').replace(/\u0649/g, '\u064A').replace(/\u0629/g, '\u0647').replace(/[^\u0621-\u064A]/g, '');
const loose = (w: string | null | undefined) => fold(w).replace(/^(وال|فال|بال|كال|لل|ال|و|ف)/, '').replace(/[اوي]/g, '');
const spaced = (r: string) => fold(r).replace(/\s+/g, ''); // a root is shown joined (نزل), never ن ز ل

/// an AL read, asked a second time when the first fails (the linguistic DB queues its long reads under load,
/// and a round that lost its read came back empty)
async function al<T>(env: QuranEnv, path: string): Promise<T> {
  if (!env.AR_LINGUISTICS) throw new Error('no AL binding');
  for (let i = 0; ; i++) {
    const j = await env.AR_LINGUISTICS.fetch(`https://al${path}`).then((r) => r.json() as Promise<{ data?: T }>).catch(() => null);
    if (j?.data) return j.data;
    if (i >= 1) throw new Error(`AL ${path.split('?')[0]} failed`);
    await new Promise((r) => setTimeout(r, 500));
  }
}

type Ayah = { key: string; surah: number; ayah: number; ws: Array<{ word_index: number; word_text: string }>; words: { t: string; s: number; e: number }[];
              audio: { url: string; start: number; end: number } | null; en: string | null; title: string };

/// each āyah with its words, their times in the recitation, its clip, its default English and where it stands
async function loadAyat(env: QuranEnv, pairs: number[][]): Promise<Map<string, Ayah>> {
  const uniq = [...new Map(pairs.map((p) => [`${p[0]}:${p[1]}`, p])).values()];
  if (!uniq.length) return new Map();
  const inAyat = uniq.map(() => '(surah = ? AND ayah = ?)').join(' OR ');
  const flat = uniq.flat();
  const surahIds = [...new Set(uniq.map((p) => p[0]))];
  const [words, rec, tr, surahs] = await Promise.all([
    query<{ surah: number; ayah: number; word_index: number; word_text: string }>(env.DB_QR,
      `SELECT surah, ayah, word_index, word_text FROM qr_word_occurrence WHERE ${inAyat} ORDER BY surah, ayah, word_index`, flat),
    query<{ surah: number; ayah: number; start_ms: number; end_ms: number; segments_json: string | null; audio_url: string }>(env.DB_QR,
      `SELECT a.surah, a.ayah, a.start_ms, a.end_ms, a.segments_json, r.audio_url FROM qr_recitation_ayah a
         JOIN qr_recitation r ON r.reciter_id = a.reciter_id AND r.surah = a.surah
        WHERE a.reciter_id = ${RECITER} AND (${uniq.map(() => '(a.surah = ? AND a.ayah = ?)').join(' OR ')})`, flat),
    query<{ surah: number; ayah: number; text: string }>(env.DB_QR,
      `SELECT t.surah, t.ayah, t.translation_text AS text FROM qr_translation t
         JOIN qr_translation_source s ON s.id = t.source_id AND s.is_default = 1 WHERE ${uniq.map(() => '(t.surah = ? AND t.ayah = ?)').join(' OR ')}`, flat),
    query<{ id: number; name_en: string }>(env.DB_QR, `SELECT id, name_en FROM qr_surah WHERE id IN (${surahIds.map(() => '?').join(',')})`, surahIds),
  ]);
  const names = new Map(surahs.map((s) => [s.id, s.name_en]));
  const recOf = new Map(rec.map((r) => [`${r.surah}:${r.ayah}`, r]));
  const enOf = new Map(tr.map((r) => [`${r.surah}:${r.ayah}`, r.text]));
  const wsOf = new Map<string, Array<{ word_index: number; word_text: string }>>();
  for (const w of words) wsOf.set(`${w.surah}:${w.ayah}`, [...(wsOf.get(`${w.surah}:${w.ayah}`) ?? []), w]);
  const out = new Map<string, Ayah>();
  for (const [s, a] of uniq) {
    const key = `${s}:${a}`;
    const ws = wsOf.get(key) ?? [];
    const r = recOf.get(key);
    const segs: number[][] = r?.segments_json ? JSON.parse(r.segments_json) : [];
    const at = new Map<number, number[]>();
    for (const x of segs) if (!at.has(x[0])) at.set(x[0], x);
    const aligned = ws.length > 0 && at.size === ws.length && ws.every((w) => at.has(w.word_index));
    out.set(key, { key, surah: s, ayah: a, ws, en: enOf.get(key) ?? null, title: `${names.get(s) ?? 'Surah ' + s} ${s}:${a}`,
      words: ws.map((w) => { const t = aligned ? at.get(w.word_index) : undefined; return { t: w.word_text, s: t ? t[1] / 1000 : 0, e: t ? t[2] / 1000 : 0 }; }),
      audio: r ? { url: r.audio_url, start: r.start_ms / 1000, end: r.end_ms / 1000 } : null });
  }
  return out;
}

/// The review card every drill files: the whole drill kept so review replays it, and where it sits.
function withCard(drill: Record<string, unknown>, a: { ref: string; type: string; front: string; back: string; band: Band;
                  surah?: number | null; ayah?: number | null; series?: string | null }) {
  drill.srs = {
    module: 'QR', resource_type: a.type, card_kind: 'lexicon', card_template: String(drill.kind),
    resource_ref: a.ref, front_text: a.front, back_text: a.back,
    extra: { drill: { ...drill }, group: { skill: 'lexicon', band: a.band !== 'all' ? a.band : null, series: a.series ?? null,
                                           workId: a.surah ? `QR:SURAH:${a.surah}` : null, work: a.surah ? `${a.surah}:${a.ayah ?? ''}` : null,
                                           episode: null, scene: null } },
  };
  return drill;
}

const scopeWhere = (s: Scope) => s.surah === null ? { sql: '1=1', args: [] as number[] }
  : s.from && s.to ? { sql: 'surah = ? AND ayah BETWEEN ? AND ?', args: [s.surah, s.from, s.to] }
  : { sql: 'surah = ?', args: [s.surah] };

/// the words of the lexicon's own sentence, untimed, with the marked word (the blank or the headword)
function lexLine(text: string, mark: string | null) {
  const toks = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).slice(0, 60);
  let i = toks.findIndex((t) => t.includes('＿'));
  if (i < 0 && mark) i = toks.findIndex((t) => loose(t) === loose(mark) || (loose(mark).length >= 2 && loose(t).includes(loose(mark))));
  return { words: toks.map((t) => ({ t, s: 0, e: 0 })), span: i >= 0 ? [i] : [] };
}

export async function lexiconDrills(env: QuranEnv, n: number, scope: Scope, lv: Record<string, unknown>, L: Record<string, Label[]>) {
  const band = (['basic', 'middle', 'advanced'].includes(String(lv.band)) ? lv.band : 'all') as Band;
  const types = ((lv.types as string[] | undefined) ?? DEFAULT_TYPES);
  const alTypes = types.filter((t) => !QR_TYPES.includes(t));
  const qrTypes = types.filter((t) => QR_TYPES.includes(t));
  const w = scopeWhere(scope);
  // the roots in scope, as the Qurʾān has them: a sample of their words, a few per root
  // high end only: a root with a lemma the Qurʾān makes medium → super (qr_vocab_grade); a database without the
  // grades (no qr_120) takes every root
  const sel = (high: boolean) => query<Occ>(env.DB_QR,
    `SELECT surah, ayah, word_index, word_text, root, lemma, pos, form_roman FROM qr_word_occurrence o
      WHERE root IS NOT NULL AND is_content_word = 1 AND ${w.sql}
        ${high ? `AND EXISTS (SELECT 1 FROM qr_vocab_grade g WHERE g.root = o.root AND g.focus = 1 AND g.grade IN ('medium', 'hard', 'super'))` : ''}
      ORDER BY random() LIMIT 400`, w.args);
  const occ = await sel(true).catch(() => sel(false));
  const occOf = new Map<string, Occ[]>();
  for (const o of occ) occOf.set(o.root, [...(occOf.get(o.root) ?? []), o]);
  const roots = shuffle([...occOf.keys()]).slice(0, 60);
  if (!roots.length) return [];
  const qs = new URLSearchParams({ roots: roots.join(','), types: alTypes.join(','), n: String(Math.ceil(n * 1.6)), glosses: qrTypes.length ? '1' : '0' });
  if (lv.source) qs.set('source', String(lv.source));
  const res = alTypes.length || qrTypes.length
    ? await al<{ items: Item[]; glosses?: Record<string, Gloss[]>; sources: Record<string, { en: string; ar: string }> }>(env, `/al/drill/lexicon?${qs}`)
      .catch(() => ({ items: [] as Item[], glosses: {} as Record<string, Gloss[]>, sources: {} as Record<string, { en: string; ar: string }> }))
    : { items: [] as Item[], glosses: {} as Record<string, Gloss[]>, sources: {} as Record<string, { en: string; ar: string }> };
  const glosses = res.glosses ?? {};
  // lemma families from the Qurʾān itself: each root's lemmas and a word for each
  const lemmaRows = qrTypes.length ? await query<{ root: string; lemma: string; n: number }>(env.DB_QR,
    `SELECT root, lemma, COUNT(*) AS n FROM qr_word_occurrence WHERE root IN (${roots.map(() => '?').join(',')}) AND lemma IS NOT NULL
      GROUP BY root, lemma`, roots) : [];
  const lemmasOf = new Map<string, string[]>();
  for (const r of lemmaRows) lemmasOf.set(r.root, [...(lemmasOf.get(r.root) ?? []), r.lemma]);
  const qrItems: Array<{ type: string; o: Occ }> = [];
  for (const t of qrTypes) {
    const cand = occ.filter((o) => t === 'form' ? (o.pos === 'V' && !!o.form_roman && FORMS[o.form_roman]) : (lemmasOf.get(o.root)?.length ?? 0) >= (t === 'odd' ? 3 : 2));
    const seen = new Set<string>();
    for (const o of shuffle(cand)) { if (seen.has(o.root)) continue; seen.add(o.root); qrItems.push({ type: t, o }); if (seen.size >= n) break; }
  }
  // interleave AL's items and the family items, then place each in its sentence
  const picked: Array<{ item?: Item; qr?: { type: string; o: Occ } }> = [];
  const a = shuffle(res.items), b = shuffle(qrItems);
  const share = qrTypes.length ? Math.max(1, Math.round(n * qrTypes.length / types.length)) : 0;
  for (let i = 0; picked.length < n && (a.length || b.length); i++) {
    if (b.length && (picked.filter((p) => p.qr).length < share || !a.length) && (i % 3 === 2 || !a.length)) picked.push({ qr: b.shift()! });
    else if (a.length) picked.push({ item: a.shift()! });
    else if (b.length) picked.push({ qr: b.shift()! });
  }
  // the āyah each drill stands in
  const HEAD_TYPES = new Set(['sense', 'digest', 'plural', 'synonym', 'antonym', 'masdar', 'bab', 'plural_pattern', 'tropical', 'dalala', 'disagree', 'keyterm']);
  const ROOT_TYPES = new Set(['core']);
  const SENTENCE_TYPES = new Set(['which_lexicon', 'style', 'disagree', 'asl', 'order']);
  const where = new Map<string, { surah: number; ayah: number; mark: string | null; word_index?: number }>();
  for (const p of picked) {
    if (p.qr) { where.set(`${p.qr.type}:${p.qr.o.surah}:${p.qr.o.ayah}:${p.qr.o.word_index}`, { surah: p.qr.o.surah, ayah: p.qr.o.ayah, mark: p.qr.o.word_text, word_index: p.qr.o.word_index }); continue; }
    const it = p.item!;
    if (SENTENCE_TYPES.has(it.type)) continue;
    if (it.ayah) { where.set(it.id, it.ayah); continue; }
    const os = occOf.get(it.root) ?? [];
    const byHead = it.head ? os.find((o) => loose(o.lemma) === loose(it.head) || loose(o.word_text) === loose(it.head)) : undefined;
    // the lexicon's own sentence when it is one; else the āyah where the root stands
    const thin = !it.sentence?.text || it.sentence.text.trim().split(/\s+/).length < 3;
    const o = byHead ?? (ROOT_TYPES.has(it.type) || thin ? os[0] : undefined);
    if (o && (byHead || !HEAD_TYPES.has(it.type) || thin)) where.set(it.id, { surah: o.surah, ayah: o.ayah, mark: o.word_text, word_index: o.word_index });
  }
  const ayat = await loadAyat(env, [...where.values()].map((x) => [x.surah, x.ayah]));
  const kinds = byKey(L.kind);
  const out: Record<string, unknown>[] = [];
  for (const p of picked) {
    if (p.qr) {
      const d = familyDrill(p.qr.type, p.qr.o, lemmasOf, occ, glosses, ayat, band);
      if (d) out.push(d);
      continue;
    }
    const it = p.item!;
    const at = where.get(it.id);
    const ay = at ? ayat.get(`${at.surah}:${at.ayah}`) : undefined;
    let words: { t: string; s: number; e: number }[]; let span: number[] = []; let script: string | null = null; let audio = null; let en: string | null = null;
    if (ay) {
      words = ay.words; script = 'quran'; audio = ay.audio; en = ay.en;
      const toks = [it.head, ...(at?.mark ?? '').split(/\s+/)].map(loose).filter((t) => t.length >= 2);
      const idx = at?.word_index != null ? ay.ws.findIndex((x) => x.word_index === at.word_index)
        : toks.map((t) => ay.ws.findIndex((x) => loose(x.word_text) === t)).find((k) => k >= 0)
          ?? toks.filter((t) => t.length >= 3).map((t) => ay.ws.findIndex((x) => loose(x.word_text).includes(t))).find((k) => k >= 0) ?? -1;
      span = idx >= 0 ? [idx] : [];
    } else if (it.sentence?.text) {
      ({ words, span } = lexLine(it.sentence.text, it.head));
    } else continue;
    const badges = [{ label: it.sourceTitle?.replace(/^.*?, /, '') ?? 'Lexicon', labelAr: res.sources?.[it.source ?? '']?.ar ?? null, color: COLORS[it.source ?? ''] ?? '#D8B657' }];
    const source = { workId: `AL:ROOT:${it.root}`, title: `${spaced(it.root)} · ${it.sourceTitle ?? 'Lexicon'}`, level: null };
    const quoteNote = !ay || !it.sentence ? null : `${it.sentence.source ? `${it.sentence.source}: ` : ''}${it.sentence.text}`;
    let drill: Record<string, unknown>;
    if (it.steps?.length) {
      const order = it.steps.map((_, i) => i);
      let sh = shuffle(order);
      for (let k = 0; k < 4 && sh.every((v, i) => v === i); k++) sh = shuffle(order);
      drill = { id: `lexicon:${it.id}`, kind: 'dialogue', ask: `lex_${it.type}`, prompt: it.prompt,
        dialogue: it.steps.map((s) => ({ speaker: null, ar: s.ar, en: s.en, clip: null })), shuffled: sh,
        words, script, audio, en, badges, source, explanation: it.explanation };
    } else if (it.type === 'idiom') {
      drill = { id: `lexicon:${it.id}`, kind: 'idiom', ask: `lex_${it.type}`, script, audio, words, en, span, prompt: it.promptAr ?? it.prompt,
        options: it.options, answer: it.answer, note: it.note, explanation: it.explanation, badges, source,
        context: it.context ? { lane: it.context.lane?.length ? { title: 'Lane', senses: it.context.lane, cite: null } : null,
                                sinai: it.context.sinai?.length ? { title: 'Sinai, Key Terms', terms: [], excerpt: it.context.sinai[0], cite: null } : null } : null };
    } else {
      drill = { id: `lexicon:${it.id}`, kind: 'feature', ask: `lex_${it.type}`, script, audio, words, en, span, prompt: it.prompt,
        options: it.options, answer: it.answer, note: it.note,
        explanation: it.explanation ?? quoteNote,
        badges, source };
    }
    const k = kinds.get(`lex_${it.type}`);
    if (k) { drill.instruction = k.label; drill.instructionAr = k.labelAr; }
    out.push(withCard(drill, { ref: `QR:lexicon:${it.ref}`, type: 'lexicon', band,
      front: `${ay ? ay.ws.map((x) => x.word_text).join(' ') + '\n' : it.sentence?.text ? it.sentence.text + '\n' : ''}${it.prompt}`,
      back: `${it.answer}${it.explanation ? `\n${it.explanation.slice(0, 400)}` : ''}`,
      surah: ay?.surah ?? null, ayah: ay?.ayah ?? null, series: it.sourceTitle }));
  }
  return out;
}

/// the lemma family, drilled in its āyah: which word of the root fills it, which word is not of the root, which form the verb is
function familyDrill(type: string, o: Occ, lemmasOf: Map<string, string[]>, occ: Occ[], glosses: Record<string, Gloss[]>,
                     ayat: Map<string, Ayah>, band: Band): Record<string, unknown> | null {
  const ay = ayat.get(`${o.surah}:${o.ayah}`);
  if (!ay) return null;
  const idx = ay.ws.findIndex((x) => x.word_index === o.word_index);
  if (idx < 0) return null;
  const gl = glosses[o.root] ?? [];
  const glossOf = (lemma: string) => gl.find((g) => loose(g.head) === loose(lemma))?.gloss ?? null;
  const fam = [...new Set(lemmasOf.get(o.root) ?? [])];
  const base = { script: 'quran', audio: ay.audio, words: ay.words, en: ay.en,
                 source: { workId: `QR:SURAH:${ay.surah}`, title: ay.title, level: null },
                 badges: [{ label: 'Qurʾān · lemma family', labelAr: 'أُسْرَةُ الجَذْر', color: '#81B29A' }] };
  const meanings = fam.slice(0, 6).map((l) => `${l}${glossOf(l) ? ` — ${glossOf(l)}` : ''}`).join('\n');
  if (type === 'family') {
    if (!o.lemma) return null;
    const others = shuffle(fam.filter((l) => loose(l) !== loose(o.lemma))).slice(0, 3);
    if (others.length < 1) return null;
    const drill = { ...base, id: `lexicon:family:${ay.key}:${o.word_index}`, kind: 'feature', ask: 'lex_family', span: [idx],
      prompt: `The marked word is of the root ${spaced(o.root)} — which of its words is it?`, options: shuffle([o.lemma, ...others]), answer: o.lemma,
      note: { en: `the family of ${spaced(o.root)}`, ar: spaced(o.root) }, explanation: `The root's words in the Qurʾān:\n${meanings}` };
    return withCard(drill, { ref: `QR:lexicon:family:${ay.key}:${o.word_index}`, type: 'lexicon', band, front: `${ay.ws.map((x) => x.word_text).join(' ')}\n${o.word_text} — ?`,
      back: `${o.lemma}${glossOf(o.lemma) ? ` — ${glossOf(o.lemma)}` : ''}`, surah: ay.surah, ayah: ay.ayah, series: 'Lemma families' });
  }
  if (type === 'odd') {
    const mine = shuffle(fam).slice(0, 3);
    const rs = [...fold(o.root)];
    const near = shuffle(occ.filter((x) => x.root !== o.root && x.lemma && [...fold(x.root)].filter((c) => rs.includes(c)).length >= 2));
    const outsider = near[0]?.lemma ?? shuffle(occ.filter((x) => x.root !== o.root && x.lemma))[0]?.lemma;
    if (mine.length < 3 || !outsider) return null;
    const drill = { ...base, id: `lexicon:odd:${ay.key}:${o.word_index}`, kind: 'feature', ask: 'lex_odd', span: [idx],
      prompt: `The marked word is of the root ${spaced(o.root)}. Which of these is NOT of that root?`, options: shuffle([outsider, ...mine]), answer: outsider,
      note: { en: 'not of the root', ar: 'لَيْسَ مِنَ الجَذْر' },
      explanation: `${outsider} is of ${spaced(near[0]?.root ?? '')}. The root ${spaced(o.root)} gives:\n${meanings}` };
    return withCard(drill, { ref: `QR:lexicon:odd:${ay.key}:${o.word_index}`, type: 'lexicon', band, front: `${spaced(o.root)} — which is not of it?\n${mine.join('، ')}، ${outsider}`,
      back: outsider, surah: ay.surah, ayah: ay.ayah, series: 'Lemma families' });
  }
  // form: the marked verb's form, and what Lane says it means in that form
  const f = o.form_roman!;
  const label = (x: string) => `Form ${x} · ${FORMS[x]}`;
  const lane = gl.find((g) => g.form === `Form ${ARABIC_NUM[f]}`);
  const opts = shuffle([label(f), ...shuffle(Object.keys(FORMS).filter((x) => x !== f && x !== 'IX')).slice(0, 3).map(label)]);
  const drill = { ...base, id: `lexicon:form:${ay.key}:${o.word_index}`, kind: 'feature', ask: 'lex_form', span: [idx],
    prompt: `Which form (wazn) is the marked verb?`, options: opts, answer: label(f), note: { en: `Form ${f}`, ar: FORMS[f] },
    explanation: `${o.word_text} is Form ${f} (${FORMS[f]}) of ${spaced(o.root)}.${lane ? ` Lane, ${lane.head}: ${gl.find((g) => loose(g.head) === loose(lane.head) && g.gloss)?.gloss ?? ''}` : ''}` };
  return withCard(drill, { ref: `QR:lexicon:form:${ay.key}:${o.word_index}`, type: 'lexicon', band, front: `${ay.ws.map((x) => x.word_text).join(' ')}\n${o.word_text} — form?`,
    back: label(f), surah: ay.surah, ayah: ay.ayah, series: 'Verb forms' });
}
