import { query, queryOne } from '../../../shared/src/db';
import type { ArabicEnv } from '../env';
import { byKey, srsCardFor, type Label } from './labels';
import { ttsClips, ttsHash, ttsKey } from './tts';

// ── Grammar drills in sentences: shared by the grammar path and the practice home ─────────────
// A grammar drill is always met in a sentence: an āyah heard in the recitation, a scene line with
// its clip, or a sentence from a grammar book or lesson (ar_grammar_sentence — the examples the
// lessons and the books give for their rules; a SILMA voice where one has been rendered, queued
// where not). AL's drills (/al/drill/grammar/:source) come whole — prompt, options, answer, why;
// here they are set in a sentence and carded.

export type L = Record<string, Label[]>;
export type Group = { band: string; series: string | null; episode: string | null; skill?: string };
export type GramDrill = { id: string; source: string; ask: string; termId: string | null; terms: string[]; prompt: string; promptEn: string | null;
                          options: string[]; answer: string; explanation: string | null; note?: { en: string | null; ar: string | null } | null;
                          optionScope?: string; qrRef?: string; exampleAr?: string; wordIndex?: number | null; word?: string | null;
                          cite?: { source: string; title: string | null; bab?: string | null; volume?: number | null; page?: number | null } | null };
export type Heard = { ref: string; words: { t: string; s: number; e: number }[]; audio: { url: string; start: number; end: number } | null;
                      en: string | null; title: string; series: string; wordIndex: number[] };
export type TermCard = { id: string; nameAr: string; nameEn: string | null; short: string | null; definitionEn: string | null; definitionAr: string | null;
                         discipline: string | null; category: { key: string; nameAr: string; nameEn: string | null } | null;
                         parent: { id: string; nameAr: string; nameEn: string | null } | null; siblings: Array<{ id: string; nameAr: string; nameEn: string | null }>;
                         shawahid: Array<{ ar: string; ref: string; en: string | null; wordIndex?: number | null; source?: string; cite?: string | null }>;
                         treatedIn: Array<{ source: string; title: string; bab: string | null; page: number | null; confirmed: boolean }>; adima: number };
export interface Sentence {
  id: string; kind: string; text_ar: string; qr_ref: string | null; term_id: string | null; lesson_id: string | null; origin: string;
  source_slug: string | null; chunk_id: string | null; bab_id: string | null; volume_no: number | null; page_no: number | null;
  word_count: number; depth: number | null; level: number; bab_title_ar: string | null; bab_order: number | null; context_ar: string | null;
}
type Word = { t: string; s: number; e: number };
type Staged = { words: Word[]; audio: { url: string; start: number; end: number } | null; script?: string; span: number[]; en: string | null;
                voice?: string; title: string | null; wordIndex?: number[] };

export const shuffle = <T>(xs: T[]) => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const cap = (s: string | null | undefined) => (s ?? '').replace(/^\w/, (c) => c.toUpperCase());
export const loose = (w: string) => (w ?? '').replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '')
  .replace(/[ٱأإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[^ء-ي]/g, '').replace(/[اوي]/g, '');
export const setting = (all: L, key: string, dflt: number) => byKey(all.setting).get(key)?.min ?? dflt;
export const fill = (t: string | null | undefined, v: Record<string, string | number>) => (t ?? '').replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ''));
const clip = (s: string | null | undefined, n: number) => { const t = (s ?? '').trim(); return t.length > n ? `${t.slice(0, n).replace(/\s+\S*$/, '')}…` : t; };
/// the app decodes a note as two strings: never a null inside it
const noteOf = (en: string | null | undefined, ar: string | null | undefined) => (en || ar ? { en: en ?? '', ar: ar ?? '' } : null);

function service<T>(f: Fetcher | undefined, host: string, path: string): Promise<T> {
  if (!f) return Promise.reject(new Error(`no ${host} binding`));
  return f.fetch(`https://${host}${path}`).then((r) => r.json() as Promise<{ data?: T }>)
    .then((j) => { if (j?.data === undefined) throw new Error(`${host}${path}: no data`); return j.data; });
}
export const al = <T>(env: ArabicEnv, path: string) => service<T>(env.AR_LINGUISTICS, 'al', path);
export const qr = <T>(env: ArabicEnv, path: string) => service<T>(env.QURAN, 'qr', path);

/// where a phrase stands in its āyah: the run of words it spells (compared by consonants: the marks, the long
/// vowels and the spellings of alif set aside, so an imlāʾī quotation finds its Uthmani words)
export function spanOf(words: { t: string }[], phrase: string): number[] {
  const toks = (phrase ?? '').replace(/[﴿﴾()«»]/g, ' ').split(/\s+/).map(loose).filter(Boolean);
  const keys = words.map((w) => loose(w.t));
  if (!toks.length) return [];
  for (let i = 0; i < keys.length; i++) {
    if (keys[i] !== toks[0]) continue;
    let k = 1;
    while (k < toks.length && i + k < keys.length && keys[i + k] === toks[k]) k++;
    if (k >= Math.min(2, toks.length)) return Array.from({ length: Math.min(toks.length, keys.length - i) }, (_, j) => i + j);
  }
  return [];
}

export const heardOf = async (env: ArabicEnv, refs: string[]) => (refs.length
  ? (await qr<{ ayat: Record<string, Heard> }>(env, `/qr/drill/ayat?refs=${encodeURIComponent([...new Set(refs)].join(','))}`)
    .catch(() => ({ ayat: {} as Record<string, Heard> }))).ayat
  : {} as Record<string, Heard>);

// ── the registry, as mirrored into km_arabic (ar_ling_gram_term) ─────────────────────────────
export type Term = { id: string; parent_term_id: string | null; category_key: string; name_ar: string; name_en: string | null;
                     short_en: string | null; definition_en: string | null; definition_ar: string | null; discipline: string | null; depth: number };
type Reg = { terms: Term[]; byId: Map<string, Term>; kids: Map<string | null, Term[]> };
let regMemo: { at: number; reg: Reg } | null = null;
export async function registry(env: ArabicEnv): Promise<Reg> {
  if (regMemo && Date.now() - regMemo.at < 300_000) return regMemo.reg;
  const terms = (await query<Omit<Term, 'depth'>>(env.DB_AR,
    `SELECT id, parent_term_id, category_key, name_ar, name_en, short_en, substr(definition_en, 1, 400) AS definition_en,
            substr(definition_ar, 1, 400) AS definition_ar, discipline FROM ar_ling_gram_term WHERE status = 'live'`)).map((t) => ({ ...t, depth: 0 }));
  const byId = new Map(terms.map((t) => [t.id, t]));
  const depthOf = (t: Term, n = 0): number => (t.parent_term_id && byId.has(t.parent_term_id) && n < 8 ? 1 + depthOf(byId.get(t.parent_term_id)!, n + 1) : 0);
  for (const t of terms) t.depth = depthOf(t);
  const kids = new Map<string | null, Term[]>();
  for (const t of terms) kids.set(t.parent_term_id, [...(kids.get(t.parent_term_id) ?? []), t]);
  regMemo = { at: Date.now(), reg: { terms, byId, kids } };
  return regMemo.reg;
}
export const termLabel = (t: { name_ar: string; name_en: string | null }) => (t.name_en ? `${cap(t.name_en)} · ${t.name_ar}` : t.name_ar);
const said = (s: string | null | undefined) => (s && /\s/.test(s.trim()) && s.trim().length >= 12 && !/^[a-z0-9_\s]+$/.test(s.trim()) ? s.trim() : null);
export const hadd = (t: Term) => said(t.definition_en) ?? said(t.short_en) ?? said(t.definition_ar);

/// the wrong answers beside a term: its siblings under its heading, then its category — never a term above or below it
export function besideTerm(reg: Reg, t: Term): Term[] {
  const up = new Set<string>();
  for (let p = t.parent_term_id, n = 0; p && n < 9; p = reg.byId.get(p)?.parent_term_id ?? null, n++) up.add(p);
  const under = (x: Term) => { for (let p = x.parent_term_id, n = 0; p && n < 9; p = reg.byId.get(p)?.parent_term_id ?? null, n++) if (p === t.id) return true; return false; };
  const ok = (x: Term) => x.id !== t.id && !up.has(x.id) && !under(x) && x.name_ar !== t.name_ar;
  const sib = (reg.kids.get(t.parent_term_id) ?? []).filter((x) => ok(x) && x.category_key === t.category_key);
  const cat = reg.terms.filter((x) => ok(x) && x.category_key === t.category_key && !sib.includes(x));
  const disc = reg.terms.filter((x) => ok(x) && x.discipline === t.discipline && x.category_key !== t.category_key && x.depth === t.depth);
  return [...shuffle(sib), ...shuffle(cat), ...shuffle(disc)];
}

// ── the sentences ───────────────────────────────────────────────────────────────────────────
const S_COLS = `id, kind, text_ar, qr_ref, term_id, lesson_id, origin, source_slug, chunk_id, bab_id, volume_no, page_no, word_count, depth,
                level, bab_title_ar, bab_order, context_ar`;

/// sentences, drawn at random: at these levels, from these origins, for these lessons or terms
export async function drawSentences(env: ArabicEnv, n: number,
    w: { levels?: number[]; origins?: string[]; lessonIds?: string[]; termIds?: string[]; asked?: boolean; withTerm?: boolean; babOnly?: boolean;
         minLevel?: number }): Promise<Sentence[]> {
  const where: string[] = [];
  const args: unknown[] = [];
  if (w.levels?.length) { where.push(`level IN (${w.levels.map(() => '?').join(',')})`); args.push(...w.levels); }
  if (w.minLevel) { where.push('level >= ?'); args.push(w.minLevel); }
  if (w.origins?.length) { where.push(`origin IN (${w.origins.map(() => '?').join(',')})`); args.push(...w.origins); }
  if (w.lessonIds?.length) { const ids = w.lessonIds.slice(0, 60); where.push(`lesson_id IN (${ids.map(() => '?').join(',')})`); args.push(...ids); }
  if (w.termIds?.length) { const ids = w.termIds.slice(0, 80); where.push(`term_id IN (${ids.map(() => '?').join(',')})`); args.push(...ids); }
  // something to ask: a term, or failing one a bāb by name (withTerm / babOnly: that one alone)
  if (w.withTerm) where.push('term_id IS NOT NULL');
  else if (w.babOnly) where.push('term_id IS NULL AND bab_title_ar IS NOT NULL');
  else if (w.asked) where.push('(term_id IS NOT NULL OR bab_title_ar IS NOT NULL)');
  const cond = where.length ? where.join(' AND ') : '1 = 1';
  const start = Math.floor(Math.random() * 2 ** 31);
  let rows = await query<Sentence>(env.DB_AR, `SELECT ${S_COLS} FROM ar_grammar_sentence WHERE ${cond} AND rnd >= ? ORDER BY rnd LIMIT ?`, [...args, start, n]);
  if (rows.length < n) rows = rows.concat(await query<Sentence>(env.DB_AR,
    `SELECT ${S_COLS} FROM ar_grammar_sentence WHERE ${cond} AND rnd < ? ORDER BY rnd LIMIT ?`, [...args, start, n - rows.length]));
  return rows;
}

/// sentences on a page of a book (a masʾala of the Inṣāf, a page of ʿUḍayma or of a bāb)
async function sentencesAt(env: ArabicEnv, slug: string, volume: number | null | undefined, page: number | null | undefined) {
  if (!page) return [] as Sentence[];
  return query<Sentence>(env.DB_AR,
    `SELECT ${S_COLS} FROM ar_grammar_sentence WHERE source_slug = ? AND volume_no IS ? AND page_no BETWEEN ? AND ? ORDER BY page_no, rnd LIMIT 4`,
    [slug, volume ?? null, page, page + 4]);
}

/// each sentence as the app plays it: an āyah in the recitation, or the book's words in a SILMA voice where one
/// is rendered (queued for the renderer where it is not — ar_tts_request, as POST /ar/practice/tts does)
export async function stage(env: ArabicEnv, rows: Array<{ key: string; kind: string; text: string; ref?: string | null }>): Promise<Map<string, Staged>> {
  const out = new Map<string, Staged>();
  const heard = await heardOf(env, rows.filter((r) => r.kind === 'quran' && r.ref).map((r) => r.ref!));
  const plain = rows.filter((r) => r.kind !== 'quran');
  const clips = plain.length ? await ttsClips(env, plain.map((r) => r.text)).catch(() => new Map()) : new Map();
  const missing: string[] = [];
  for (const r of rows) {
    if (r.kind === 'quran') {
      const a = r.ref ? heard[r.ref] : undefined;
      if (!a) continue;
      out.set(r.key, { words: a.words, audio: a.audio, script: 'quran', span: spanOf(a.words, r.text), en: a.en, title: a.title, wordIndex: a.wordIndex });
    } else {
      const c = clips.get(r.text);
      const toks = ttsKey(r.text).split(' ');
      if (!c) missing.push(r.text);
      out.set(r.key, { words: c?.words ?? toks.map((t) => ({ t, s: 0, e: 0 })), audio: c?.audio ?? null, voice: c?.voice, span: [], en: null, title: null });
    }
  }
  if (missing.length) {
    const stmts = await Promise.all([...new Set(missing)].filter((t) => t.length <= 600).map(async (t) => env.DB_AR.prepare(
      `INSERT OR IGNORE INTO ar_tts_request (text_hash, text_ar, source) VALUES (?, ?, 'gram_sentence')`).bind(await ttsHash(t), ttsKey(t))));
    if (stmts.length) await env.DB_AR.batch(stmts).catch(() => null);
  }
  return out;
}

/// "al-Ghalāyīnī, Jāmiʿ al-durūs (جامع الدروس العربية) 1:10 — «bāb»", a lesson named first where it has one
export function citeOf(all: L, s: Pick<Sentence, 'source_slug' | 'volume_no' | 'page_no' | 'bab_title_ar'>, lesson?: string | null) {
  const b = s.source_slug ? byKey(all.grammar_book).get(s.source_slug) : undefined;
  const book = b ? `${b.label}${b.labelAr ? ` (${b.labelAr})` : ''}` : s.source_slug;
  const at = s.page_no ? (s.volume_no ? `${s.volume_no}:${s.page_no}` : `p. ${s.page_no}`) : null;
  return [lesson ? `Lesson «${lesson}»` : null, [book, at].filter(Boolean).join(' '), s.bab_title_ar ? `«${s.bab_title_ar}»` : null]
    .filter(Boolean).join(' — ') || null;
}

const lessonTitle = (l: { title_ar: string; title_en: string | null }) => (l.title_en ? `${l.title_en} · ${l.title_ar}` : l.title_ar);

/// the sentences as drills: which rule is it cited for (gs_term), which lesson cites it (gs_lesson), which bāb
/// of its book (gs_bab) — the ask each row can carry, where the one asked for cannot be
export async function sentenceDrills(env: ArabicEnv, all: L, rows: Sentence[], want: string, group: Group) {
  const reg = await registry(env);
  const kinds = byKey(all.kind);
  const lids = [...new Set(rows.map((r) => r.lesson_id).filter((x): x is string => !!x))];
  const lessons = new Map((lids.length ? await query<{ id: string; parent_id: string | null; title_ar: string; title_en: string | null }>(env.DB_AR,
    `SELECT id, parent_id, title_ar, title_en FROM ar_lesson WHERE id IN (${lids.map(() => '?').join(',')})`, lids) : []).map((l) => [l.id, l]));
  const staged = await stage(env, rows.map((r) => ({ key: r.id, kind: r.kind, text: r.text_ar, ref: r.qr_ref })));
  const built = await Promise.all(rows.map(async (s): Promise<Record<string, unknown> | null> => {
    const st = staged.get(s.id);
    if (!st || !st.words.length) return null;
    const t = s.term_id ? reg.byId.get(s.term_id) : undefined;
    const l = s.lesson_id ? lessons.get(s.lesson_id) : undefined;
    const ask = want === 'gs_lesson' && l ? 'gs_lesson' : t && want !== 'gs_bab' ? 'gs_term' : s.bab_title_ar ? 'gs_bab' : t ? 'gs_term' : l ? 'gs_lesson' : null;
    let answer: string, options: string[];
    if (ask === 'gs_term' && t) {
      answer = termLabel(t);
      options = [...new Set(besideTerm(reg, t).map(termLabel))].filter((x) => x !== answer).slice(0, 3);
    } else if (ask === 'gs_lesson' && l) {
      answer = lessonTitle(l);
      const near = await query<{ title_ar: string; title_en: string | null }>(env.DB_AR,
        `SELECT title_ar, title_en FROM ar_lesson WHERE status = 'live' AND id <> ? AND (parent_id IS ? OR parent_id = ?) ORDER BY random() LIMIT 6`,
        [l.id, l.parent_id, l.parent_id ?? l.id]);
      options = [...new Set(near.map(lessonTitle))].filter((x) => x !== answer).slice(0, 3);
    } else if (ask === 'gs_bab' && s.bab_title_ar) {
      answer = s.bab_title_ar;
      const near = await query<{ bab_title_ar: string }>(env.DB_AR,
        `SELECT DISTINCT bab_title_ar FROM ar_grammar_sentence WHERE source_slug = ? AND bab_title_ar IS NOT NULL AND bab_title_ar <> ?
          ORDER BY abs(COALESCE(bab_order, 0) - ?) LIMIT 8`, [s.source_slug, s.bab_title_ar, s.bab_order ?? 0]);
      options = shuffle(near.map((x) => x.bab_title_ar)).slice(0, 3);
    } else return null;
    if (options.length < 2) return null;
    const cite = citeOf(all, s, l ? l.title_ar : null);
    const d: Record<string, unknown> = {
      id: `gs:${ask}:${s.id}`, kind: 'feature', ask, ...(st.script ? { script: st.script } : {}), audio: st.audio, words: st.words, span: st.span, en: st.en,
      // the āyah's cited words, or the book's sentence itself
      prompt: st.script === 'quran' && st.span.length ? st.span.map((i) => st.words[i].t).join(' ') : kinds.get(ask)?.labelAr ?? s.text_ar,
      promptEn: null, answer, options: shuffle([answer, ...options]),
      note: t ? noteOf(cap(t.name_en) || null, t.name_ar) : noteOf(null, s.bab_title_ar),
      // what the rule is (the term's ḥadd), the author's own words before the example, and where it is from
      explanation: [t ? clip(hadd(t), 320) : null, s.context_ar ? `«${clip(s.context_ar, 260)}»` : null, cite].filter(Boolean).join('\n') || null,
      terms: t ? [t.id] : [], ...(st.voice ? { voice: st.voice } : {}),
      source: { workId: s.source_slug ? `AL:book:${s.source_slug}` : s.qr_ref ? `QR:SURAH:${s.qr_ref.split(':')[0]}` : null,
                title: st.title ?? (s.source_slug ? byKey(all.grammar_book).get(s.source_slug)?.labelAr ?? s.source_slug : l?.title_ar ?? null), level: null },
      instruction: kinds.get(ask)?.label ?? null, instructionAr: kinds.get(ask)?.labelAr ?? null,
    };
    d.srs = srsCardFor(d, { skill: group.skill ?? 'grammar', band: group.band, series: group.series, episode: group.episode });
    return d.srs ? d : null;   // an empty drill is dropped
  }));
  return built.filter((d): d is Record<string, unknown> => !!d);
}

/// AL's drills, each set in a sentence: the āyah it stands on; else a sentence the lessons or books cite for its
/// term (or on its page of the book); else a Qurʾānic shāhid of the term from the registry; else, for a drill
/// whose own prompt is a book's words (a page, a masʾala, a rule), those words, voiced. A drill with none is left out.
export async function asDrills(env: ArabicEnv, all: L, items: GramDrill[], group: Group, levels: number[] = [1, 2, 3]) {
  const kinds = byKey(all.kind);
  const named = (scope: string | undefined, x: string) => {
    const l = scope ? byKey(all[scope]).get(x) : undefined;
    return l ? (l.labelAr ? `${l.label} · ${l.labelAr}` : l.label) : x;
  };
  const maxLevel = Math.max(...levels);
  // 1. the sentence for each: page, term, registry shāhid, its own words
  const pick = new Map<string, { key: string; kind: string; text: string; ref?: string | null; cite: string | null; context?: string | null }>();
  const termIds = [...new Set(items.filter((i) => !i.qrRef).flatMap((i) => i.terms))];
  const byTerm = new Map<string, Sentence[]>();
  if (termIds.length) {
    const rows = await query<Sentence>(env.DB_AR,
      `SELECT ${S_COLS} FROM ar_grammar_sentence WHERE term_id IN (${termIds.slice(0, 90).map(() => '?').join(',')}) AND level <= ?
        ORDER BY (origin IN ('lesson','title','curated')) DESC, random() LIMIT 300`, [...termIds.slice(0, 90), maxLevel]);
    for (const r of rows) byTerm.set(r.term_id!, [...(byTerm.get(r.term_id!) ?? []), r]);
  }
  const used = new Set<string>();
  const need: GramDrill[] = [];
  const atPage = new Map(await Promise.all(items.filter((it) => !it.qrRef && it.cite?.page).map(async (it) =>
    [it.id, await sentencesAt(env, it.cite!.source === 'adima' ? 'adima_dirasat' : it.cite!.source, it.cite!.volume, it.cite!.page)] as const)));
  for (const it of items) {
    if (it.qrRef) { pick.set(it.id, { key: it.id, kind: 'quran', text: it.exampleAr ?? it.word ?? '', ref: it.qrRef, cite: null }); continue; }
    let s: Sentence | undefined = (atPage.get(it.id) ?? []).find((x) => !used.has(x.id));
    for (const tid of it.terms) { if (s) break; s = (byTerm.get(tid) ?? []).find((x) => !used.has(x.id)); }
    if (s) {
      used.add(s.id);
      pick.set(it.id, { key: it.id, kind: s.kind, text: s.text_ar, ref: s.qr_ref, cite: citeOf(all, s), context: s.context_ar });
    } else need.push(it);
  }
  // 2. the registry's own shawāhid of the terms still without a sentence
  const still = [...new Set(need.flatMap((i) => i.terms))];
  if (still.length) {
    const info = await al<{ terms: TermCard[] }>(env, `/al/drill/grammar/terms?ids=${encodeURIComponent(still.slice(0, 40).join(','))}`)
      .catch(() => ({ terms: [] as TermCard[] }));
    const sh = new Map(info.terms.map((t) => [t.id, shuffle(t.shawahid.filter((x) => /^\d+:\d+$/.test(x.ref)))]));
    for (const it of [...need]) {
      const x = it.terms.map((t) => sh.get(t)?.shift()).find(Boolean);
      if (x) { pick.set(it.id, { key: it.id, kind: 'quran', text: x.ar, ref: x.ref, cite: x.cite ?? null }); need.splice(need.indexOf(it), 1); }
    }
  }
  // 3. a book's own words as the sentence: the page, the position, the rule
  for (const it of need) {
    const own = /[ء-ي]/.test(it.prompt) && it.prompt.trim().split(/\s+/).length >= 4 ? it.prompt.replace(/…$/, '').trim() : null;
    if (own) pick.set(it.id, { key: it.id, kind: 'prose', text: own, cite: null });
  }
  const staged = await stage(env, [...pick.values()]);
  const out: Record<string, unknown>[] = [];
  for (const it of items) {
    const p = pick.get(it.id);
    const st = p ? staged.get(p.key) : undefined;
    if (!p || !st || !st.words.length) continue;
    const options = it.options.map((o) => named(it.optionScope, o));
    const answer = named(it.optionScope, it.answer);
    const alCite = it.cite ? [it.cite.title, it.cite.bab ? `«${it.cite.bab}»` : null,
                              it.cite.volume ? `${it.cite.volume}:${it.cite.page ?? ''}` : it.cite.page ? `p. ${it.cite.page}` : null].filter(Boolean).join(' — ') : null;
    const self = p.kind === 'prose';
    // an āyah drill marks the word it asks about (AL's word index), else the phrase it quotes
    const k = it.qrRef && it.wordIndex != null ? (st.wordIndex ?? []).indexOf(it.wordIndex) : -1;
    const span = k >= 0 ? [k] : st.span;
    const prompt = it.qrRef ? it.word ?? (span.length ? span.map((i) => st.words[i].t).join(' ') : it.prompt)
      : self ? (kinds.get(it.ask)?.labelAr ?? '') : [it.prompt, it.promptEn].filter(Boolean).join(' — ');
    const d: Record<string, unknown> = {
      id: `gp:${it.id}`, kind: 'feature', ask: it.ask, ...(st.script ? { script: st.script } : {}), audio: st.audio, words: st.words, span, en: st.en,
      prompt, promptEn: it.qrRef ? it.promptEn : null, answer, options: shuffle(options),
      note: it.note ? noteOf(it.note.en, it.note.ar) : null,
      explanation: [it.explanation, alCite, p.context ? `«${clip(p.context, 220)}»` : null, p.cite ? `Example: ${p.cite}` : null].filter(Boolean).join('\n') || null,
      terms: it.terms, ...(st.voice ? { voice: st.voice } : {}),
      source: { workId: it.qrRef ? `QR:SURAH:${it.qrRef.split(':')[0]}` : it.termId ? `AL:${it.termId}` : null,
                title: st.title ?? it.cite?.title ?? p.cite ?? null, level: null },
      instruction: kinds.get(it.ask)?.label ?? null, instructionAr: kinds.get(it.ask)?.labelAr ?? null,
    };
    d.srs = srsCardFor(d, { skill: group.skill ?? 'grammar_path', band: group.band, series: group.series, episode: group.episode });
    if (d.srs) out.push(d);   // an empty drill is dropped
  }
  return out;
}

/// iʿrāb instances as shawāhid of the terms the registry has none for, as AL would have drilled them
export async function irabDrills(env: ArabicEnv, terms: string[], n: number): Promise<GramDrill[]> {
  const roles = terms.filter((t) => t.startsWith('GT:irab_role:'));
  if (!roles.length || n <= 0) return [];
  const [res, info] = await Promise.all([
    qr<{ items: Array<{ id: string; termId: string; ref: string; word: string; irab: string; book: string }> }>(env,
      `/qr/drill/irab-shawahid?terms=${encodeURIComponent(roles.join(','))}&n=${n}`).catch(() => ({ items: [] })),
    al<{ terms: TermCard[] }>(env, `/al/drill/grammar/terms?ids=${encodeURIComponent(roles.join(','))}`).catch(() => ({ terms: [] as TermCard[] })),
  ]);
  const byId = new Map(info.terms.map((t) => [t.id, t]));
  const lab = (t: { nameAr: string; nameEn: string | null }) => (t.nameEn ? `${cap(t.nameEn)} · ${t.nameAr}` : t.nameAr);
  return res.items.map((r) => {
    const t = byId.get(r.termId);
    if (!t || t.siblings.length < 2) return null;
    return { id: `gt:irab:${r.id}`, source: 'shahid', ask: 'gt_shahid', termId: t.id, terms: [t.id], prompt: r.word, promptEn: null,
             options: [lab(t), ...shuffle(t.siblings).slice(0, 3).map(lab)], answer: lab(t), explanation: r.irab,
             qrRef: r.ref, word: r.word, cite: { source: 'irab', title: r.book } } as GramDrill;
  }).filter((x): x is GramDrill => !!x);
}

/// the scene questions about these terms, as the scene round builds them: the line heard, the words marked
export async function sceneDrills(env: ArabicEnv, all: L, terms: string[], k: number, group: Group) {
  if (!terms.length || k <= 0) return [];
  const ids = shuffle(terms).slice(0, 90);
  const picks = await query<{ unit_id: string; scene_no: number; feature_idx: number; term_id: string }>(env.DB_AR,
    `SELECT unit_id, scene_no, feature_idx, MIN(term_id) AS term_id FROM ar_scene_feature_term
      WHERE term_id IN (${ids.map(() => '?').join(',')}) GROUP BY unit_id, scene_no, feature_idx ORDER BY random() LIMIT ?`, [...ids, k * 2]);
  const kinds = byKey(all.kind);
  const out: Record<string, unknown>[] = [];
  // the scenes read at once, not one after another
  const rows = await Promise.all(picks.map((p) => queryOne<{ features_json: string | null; script_json: string | null; work: string; level: string; audio: string | null }>(env.DB_AR,
      `SELECT v.features_json, t.script_json, r.id AS work, r.level,
              (SELECT a.object_key FROM ar_acq_audio a WHERE a.acq_ref_id = r.id AND a.status = 'live' AND a.object_key NOT LIKE 'youtube:%' LIMIT 1) AS audio
         FROM ar_scene_vocab v JOIN ar_text_unit t ON t.id = v.unit_id JOIN ar_acquisition_ref r ON r.id = t.acq_ref_id
        WHERE v.unit_id = ? AND v.scene_no = ?`, [p.unit_id, p.scene_no]).catch(() => null)));
  for (const [n, p] of picks.entries()) {
    if (out.length >= k) break;
    const row = rows[n];
    if (!row?.features_json || !row.script_json || !row.audio) continue;
    try {
      const f = (JSON.parse(row.features_json) as Array<{ line: number; span: [number, number]; feature: string; term_ar?: string; q: string;
        options: string[]; answer: number; explanation?: string; tier?: string; bucket?: string }>)[p.feature_idx];
      const doc = JSON.parse(row.script_json) as { series_ar?: string; scenes: Array<{ scene_no: number; title_ar?: string;
        lines: Array<{ ar: string; en?: string; start: number; end: number; w?: Array<[number, number]> }> }> };
      const sc = doc.scenes.find((s) => s.scene_no === p.scene_no);
      const l = sc?.lines[f?.line ?? -1];
      if (!f || !l || !f.options?.length) continue;
      const toks = l.ar.trim().split(/\s+/);
      const timed = (l.w ?? []).length === toks.length;
      const url = `/api/ar/audio/${encodeURI(row.audio)}`;
      const d: Record<string, unknown> = {
        id: `feature:${p.unit_id}:${p.scene_no}:${f.line}:${f.span[0]}`, kind: 'feature', audio: { url, start: l.start, end: l.end },
        words: toks.map((t, i) => ({ t, s: timed ? l.w![i][0] : l.start, e: timed ? l.w![i][1] : l.end })),
        span: Array.from({ length: f.span[1] - f.span[0] + 1 }, (_, i) => f.span[0] + i), prompt: f.q, answer: f.options[f.answer],
        options: shuffle(f.options), note: noteOf(f.feature, f.term_ar ?? ''), explanation: f.explanation ?? null, en: l.en ?? null,
        terms: [p.term_id], tier: f.tier ?? null, bucket: f.bucket ?? 'grammar',
        source: { workId: row.work, title: [doc.series_ar, sc?.title_ar].filter(Boolean).join(' · '), level: row.level },
        instruction: kinds.get('feature')?.label ?? null, instructionAr: kinds.get('feature')?.labelAr ?? null,
      };
      d.srs = srsCardFor(d, { skill: group.skill ?? 'grammar_path', band: group.band, series: group.series, episode: group.episode });
      if (d.srs) out.push(d);   // an empty drill is dropped
    } catch { /* a scene whose reading does not parse is passed over */ }
  }
  return out;
}

/// a round: the lesson's own examples first (when it has lessons), then the plan's sources and asks, each with its
/// share, on these terms; then the scene questions
export async function round(env: ArabicEnv, all: L, plan: Array<{ source: string; ask?: string }>, terms: string[], size: number,
                            group: Group, lessons: string[] = [], levels: number[] = [1, 2, 3]) {
  const own = lessons.length ? shuffle(await drawSentences(env, setting(all, 'grammar_lesson_share', 4) * 2,
    { lessonIds: lessons, origins: ['lesson', 'title', 'curated'], withTerm: true })) : [];
  const mine = own.length ? (await sentenceDrills(env, all, own, 'gs_term', group)).slice(0, setting(all, 'grammar_lesson_share', 4)) : [];
  const rest = size - mine.length;
  const sources = plan.filter((p) => p.source !== 'scene');
  const scenes = plan.some((p) => p.source === 'scene') ? Math.min(setting(all, 'grammar_scene_share', 3), Math.ceil(rest / 3)) : 0;
  const share = Math.max(1, Math.ceil((rest - scenes) / Math.max(1, sources.length)) + 1);
  const ids = encodeURIComponent(terms.join(','));
  const piles = await Promise.all(sources.map(async (p) => {
    const res = await al<{ items: GramDrill[]; missing?: string[] }>(env, `/al/drill/grammar/${p.source}?ask=${p.ask ?? ''}&n=${share}&terms=${ids}`)
      .catch(() => ({ items: [] as GramDrill[], missing: [] as string[] }));
    let items = res.items;
    if (p.source === 'shahid' && res.missing?.length && items.length < share) items = items.concat(await irabDrills(env, res.missing, share - items.length));
    return items;
  }));
  // one from each source in turn, so the round spans them; a source with nothing on these terms gives way
  const picked: GramDrill[] = [];
  const seen = new Set<string>();
  for (let i = 0; picked.length < rest - scenes && piles.some((p) => p.length > i); i++)
    for (const p of piles) if (p[i] && !seen.has(p[i].id) && picked.length < rest - scenes) { seen.add(p[i].id); picked.push(p[i]); }
  const [drills, scene] = await Promise.all([asDrills(env, all, picked, group, levels), sceneDrills(env, all, terms, rest - picked.length, group)]);
  // then the books' examples of the same terms, where the sources and scenes fell short
  const short = rest - drills.length - scene.length;
  const books = short > 0 ? await sentenceDrills(env, all, await drawSentences(env, short * 2, { termIds: terms, origins: ['reading', 'toc', 'page'], levels }),
                                                 'gs_term', group) : [];
  return [...mine, ...shuffle([...drills, ...scene, ...books.slice(0, Math.max(0, short))])].slice(0, size);
}

/// the registry terms these lessons teach
export async function termsOf(env: ArabicEnv, lessonIds: string[]) {
  if (!lessonIds.length) return [] as string[];
  const rows = await query<{ term_id: string }>(env.DB_AR,
    `SELECT DISTINCT t.term_id FROM ar_lesson_term t JOIN ar_ling_gram_term g ON g.id = t.term_id AND g.status = 'live'
      WHERE t.lesson_id IN (${lessonIds.map(() => '?').join(',')}) ORDER BY t.sort_order`, lessonIds);
  return rows.map((r) => r.term_id);
}

/// A lesson as its book teaches it: the book's own text of its bāb (AL /al/gram/pages — the ḥadd, the rules, the
/// worked examples, in order) and the examples mined from it, heard. The book is the lesson's spine where the spine
/// is a book (scope grammar_book), else the book its bāb belongs to.
export async function lessonPreview(env: ArabicEnv, all: L, id: string) {
  const l = await queryOne<{ id: string; spine: string; bab_id: string | null; title_ar: string; title_en: string | null;
                             volume_no: number | null; page_start: number | null }>(env.DB_AR,
    `SELECT id, spine, bab_id, title_ar, title_en, volume_no, page_start FROM ar_lesson WHERE id = ?`, [id]);
  if (!l) return null;
  const books = byKey(all.grammar_book);
  const slug = books.has(l.spine) ? l.spine : l.bab_id ? (await queryOne<{ source_slug: string }>(env.DB_AR,
    `SELECT source_slug FROM ar_grammar_sentence WHERE bab_id = ? AND source_slug IS NOT NULL LIMIT 1`, [l.bab_id]))?.source_slug ?? null : null;
  const [pages, rows] = await Promise.all([
    slug && l.bab_id ? al<{ pages: Array<{ text_ar: string; volume_no: number | null; page_no: number | null }> }>(env,
      `/al/gram/pages/${encodeURIComponent(slug)}?bab=${encodeURIComponent(l.bab_id)}&limit=8`).catch(() => ({ pages: [] })) : Promise.resolve({ pages: [] }),
    query<Sentence>(env.DB_AR, `SELECT ${S_COLS} FROM ar_grammar_sentence WHERE lesson_id = ? AND origin IN ('lesson', 'title', 'curated')
                                 ORDER BY volume_no, page_no, rnd LIMIT 10`, [id]),
  ]);
  const text: string[] = [];
  let size = 0;
  for (const p of pages.pages) {
    for (const para of p.text_ar.split(/[\r\n]+/).map((x) => x.trim()).filter((x) => x.length >= 2)) {
      if (size > 4000) break;
      text.push(para); size += para.length;
    }
  }
  const reg = await registry(env);
  const staged = await stage(env, rows.map((r) => ({ key: r.id, kind: r.kind, text: r.text_ar, ref: r.qr_ref })));
  const b = slug ? books.get(slug) : undefined;
  const first = pages.pages[0];
  return {
    title: l.title_en ?? l.title_ar, titleAr: l.title_ar,
    source: slug ? { slug, title: b?.label ?? slug, titleAr: b?.labelAr ?? null,
                     at: first?.page_no ? `${first.volume_no ? `${first.volume_no}:` : ''}${first.page_no}` : null } : null,
    text,
    examples: rows.flatMap((r) => {
      const st = staged.get(r.id);
      if (!st) return [];
      const t = r.term_id ? reg.byId.get(r.term_id) : undefined;
      return [{ id: r.id, kind: r.kind, ar: r.text_ar, ref: r.qr_ref, script: st.script ?? null, audio: st.audio, words: st.words, span: st.span,
                en: st.en, rule: r.context_ar, term: t ? { id: t.id, nameAr: t.name_ar, nameEn: cap(t.name_en) || null } : null,
                cite: citeOf(all, r) }];
    }),
  };
}
