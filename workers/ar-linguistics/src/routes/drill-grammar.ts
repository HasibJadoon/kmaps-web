import type { Router } from '../../../shared/src/router';
import { ok, badRequest } from '../../../shared/src/response';
import type { ArLinguisticsEnv } from '../env';

// ── Grammar drills, from the grammar-term registry and the books ─────────────────
// Every drill here is made from the linguistic record, whole: the prompt, the options, the
// answer and why. The drilling surfaces (the Arabic grammar path, the Qurʾān practice) add the
// instruction (their labels, keyed by `ask`), the āyah and its recitation where a drill carries a
// qrRef, and the review card. Each source has three asks — its three levels — and the caller
// says which (its labels hold the levels as data).
//
//   GET /al/drill/grammar/counts
//   GET /al/drill/grammar/terms?ids=GT:…,GT:…&books=   a lesson's terms, for its preview (and its books' titles)
//   GET /al/drill/grammar/:source?ask=&n=&terms=&discipline=&category=&minDepth=&maxDepth=&surah=
//
//   source   asks (L1 · L2 · L3)
//   tree     gt_category  — which branch?  · gt_parent — which heading is it under? · gt_sibling — what sits beside it?
//   define   gt_define_term — the definition names which term? · gt_define_def — which is its definition? · gt_define_ar — the Arabic definition
//   shahid   gt_shahid — a Qurʾānic shāhid: which term? (by depth) · gt_shahid_pick — which of these is a shāhid of it?
//   book     gt_book — which book has a bāb on it? · gt_bab — which of these has a bāb in this book? · gt_page — a page of the book: which term?
//   khilaf   gt_khilaf_whose — Kūfan or Baṣran? · gt_khilaf_basra / gt_khilaf_kufa — which is their position? · gt_khilaf_which — which masʾala?
//   wazn     gt_wazn_term — this rule forms which noun? · gt_wazn_pattern — on which wazn? · gt_wazn_rule — under which rule?
//   contrast gt_pair — its counterpart? · gt_pair_which — which of the two fits? · gt_contested — which two readings contend?
//   adima    adima_pattern (ṣarf) / adima_heading (naḥw) · adima_meaning / adima_term · adima_note — ʿUḍayma's Dirāsāt
//
// Scope: terms= (a lesson's GT ids) keeps drills about those terms; discipline=NH|SF|BL,
// category=, minDepth/maxDepth narrow the registry; surah= keeps Qurʾānic ones to a surah.
// "Which book or bāb treats it" rests only on exact or confirmed links (ar_ling_gram_term_toc,
// ar_ling_gram_chunk_term), never on a heading that merely contains the term's name.

interface Term { id: string; category_key: string; term_key: string; parent_term_id: string | null; term_order: number | null; name_ar: string;
                 name_en: string | null; short_ar: string | null; short_en: string | null; definition_ar: string | null;
                 definition_en: string | null; discipline: string | null; name_bare: string | null; depth: number }
interface Cat { category_key: string; name_ar: string; name_en: string | null; discipline: string | null }
interface Reg { terms: Term[]; byId: Map<string, Term>; kids: Map<string | null, Term[]>; cats: Map<string, Cat>; overlaps: Set<string> }
interface Q { n: number; ask: string; terms: Set<string> | null; discipline: string | null; category: string | null;
              minDepth: number; maxDepth: number; surah: number | null }
export interface GramDrill {
  id: string; source: string; ask: string; termId: string | null; terms: string[];
  prompt: string; promptEn: string | null; options: string[]; answer: string; explanation: string | null;
  note?: { en: string | null; ar: string | null } | null; optionScope?: string;
  qrRef?: string; exampleAr?: string; wordIndex?: number | null; word?: string | null;
  cite?: { source: string; title: string | null; bab?: string | null; volume?: number | null; page?: number | null } | null;
}

const MARKS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;
const bare = (s: string | null | undefined) => (s ?? '').replace(MARKS, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').trim();
const cap = (s: string | null | undefined) => (s ?? '').replace(/^\w/, (c) => c.toUpperCase());
const shuffle = <T>(xs: T[]) => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const uniq = (xs: string[]) => [...new Set(xs.filter((x) => !!x && x.trim()))];
const label = (t: { name_ar: string; name_en: string | null }) => (t.name_en ? `${cap(t.name_en)} · ${t.name_ar}` : t.name_ar);
const catLabel = (c: Cat | undefined) => (c ? (c.name_en ? `${cap(c.name_en)} · ${c.name_ar}` : c.name_ar) : '');

/// the answer and up to three others, shuffled — or null when there are too few to choose between
function choices(answer: string, pool: string[], min = 2): string[] | null {
  const others = uniq(pool).filter((x) => x !== answer).slice(0, 3);
  return others.length >= min ? shuffle([answer, ...others]) : null;
}

/// a term's own name hidden where a definition says it (Arabic, whatever its vowels)
function maskAr(text: string, name: string): string {
  const core = bare(name).replace(/^ال/, '').replace(/[^ء-ي]/g, '');
  if (core.length < 2) return text;
  const any = (ch: string) => (ch === 'ا' ? '[اأإآٱ]' : ch === 'ي' ? '[يى]' : ch === 'ه' ? '[هة]' : ch);
  const V = '[\\u064B-\\u0652\\u0670\\u0640]*';
  const re = new RegExp(`(^|[\\s«"(\\[،.:؛])([وفبلك]${V})?([اٱ]${V}ل${V})?${[...core].map((ch) => any(ch)).join(V)}${V}(?=$|[\\s»")\\],.:؛،!؟])`, 'g');
  return text.replace(re, '$1$2…');
}
function maskEn(text: string, name: string | null): string {
  if (!name) return text;
  let out = text;
  // the name, and its head (what stands before a dash, comma or bracket) — not every word of it
  const words = [name, name.split(/\s[—–]\s|[,;:(]/)[0]].map((w) => w.trim()).filter((w) => w.length >= 4);
  for (const w of words.sort((a, b) => b.length - a.length)) out = out.replace(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '…');
  return out;
}

let memo: { at: number; reg: Reg } | null = null;
async function registry(env: ArLinguisticsEnv): Promise<Reg> {
  if (memo && Date.now() - memo.at < 300_000) return memo.reg;
  const [terms, cats, ov] = await Promise.all([
    env.DB_AL.prepare(
      `SELECT id, category_key, term_key, parent_term_id, term_order, name_ar, name_en, short_ar, short_en,
              substr(definition_ar, 1, 700) AS definition_ar, substr(definition_en, 1, 700) AS definition_en, discipline, name_bare
         FROM ar_ling_gram_term WHERE status = 'live'`).all<Omit<Term, 'depth'>>(),
    env.DB_AL.prepare(`SELECT category_key, name_ar, name_en, discipline FROM ar_ling_gram_category`).all<Cat>(),
    // terms one line can carry at once (an istiʿāra is taṣrīḥiyya AND aṣliyya; لَقَدْ is the oath's lām too): never each
    // other's wrong choice, else 'which is it?' has two right answers
    env.DB_AL.prepare(`SELECT from_term_id, to_term_id FROM ar_ling_gram_term_relation WHERE relation_kind = 'overlaps'`)
      .all<{ from_term_id: string; to_term_id: string }>().catch(() => ({ results: [] as Array<{ from_term_id: string; to_term_id: string }> })),
  ]);
  const list = (terms.results ?? []).map((t) => ({ ...t, depth: 0 }));
  const byId = new Map(list.map((t) => [t.id, t]));
  const depthOf = (t: Term, seen = 0): number => (t.parent_term_id && byId.has(t.parent_term_id) && seen < 8
    ? 1 + depthOf(byId.get(t.parent_term_id)!, seen + 1) : 0);
  for (const t of list) t.depth = depthOf(t);
  const kids = new Map<string | null, Term[]>();
  for (const t of list) kids.set(t.parent_term_id, [...(kids.get(t.parent_term_id) ?? []), t]);
  for (const v of kids.values()) v.sort((a, b) => (a.term_order ?? 0) - (b.term_order ?? 0));
  const overlaps = new Set<string>();
  for (const r of ov.results ?? []) { overlaps.add(`${r.from_term_id}|${r.to_term_id}`); overlaps.add(`${r.to_term_id}|${r.from_term_id}`); }
  const reg = { terms: list, byId, kids, cats: new Map((cats.results ?? []).map((c) => [c.category_key, c])), overlaps };
  memo = { at: Date.now(), reg };
  return reg;
}

type QrExample = { id: string; term_id: string; example_ar: string; qr_ref: string; gloss_en: string | null };
let exMemo: { at: number; byTerm: Map<string, QrExample[]> } | null = null;
/// the registry's Qurʾānic examples by term, kept per isolate as the registry is
async function qrExamples(env: ArLinguisticsEnv): Promise<Map<string, QrExample[]>> {
  if (exMemo && Date.now() - exMemo.at < 300_000) return exMemo.byTerm;
  const rows = (await env.DB_AL.prepare(
    `SELECT id, term_id, example_ar, qr_ref, gloss_en FROM ar_ling_gram_term_example WHERE qr_ref IS NOT NULL`).all<QrExample>()).results ?? [];
  const byTerm = new Map<string, QrExample[]>();
  for (const r of rows) byTerm.set(r.term_id, [...(byTerm.get(r.term_id) ?? []), r]);
  exMemo = { at: Date.now(), byTerm };
  return byTerm;
}

const inScope = (t: Term, q: Q) => (!q.terms || q.terms.has(t.id)) && (!q.discipline || t.discipline === q.discipline)
  && (!q.category || t.category_key === q.category) && t.depth >= q.minDepth && t.depth <= q.maxDepth;
/// the terms beside a term: its siblings under the same parent first, then the rest of its category
const beside = (reg: Reg, t: Term) => {
  const free = (x: Term) => x.id !== t.id && !reg.overlaps.has(`${t.id}|${x.id}`);
  const sib = (reg.kids.get(t.parent_term_id) ?? []).filter((x) => free(x) && x.category_key === t.category_key);
  const cat = reg.terms.filter((x) => free(x) && x.category_key === t.category_key && !sib.includes(x));
  return [...shuffle(sib), ...shuffle(cat)];
};
/// a definition is a sentence: some registry rows hold a key ("manawi", "thulathi_mazeed") where a gloss would be
const said = (s: string | null | undefined) => (s && /\s/.test(s.trim()) && s.trim().length >= 12 && !/^[a-z0-9_\s]+$/.test(s.trim()) ? s.trim() : null);
const defEn = (t: Term) => said(t.definition_en) ?? said(t.short_en);
const defAr = (t: Term) => said(t.definition_ar) ?? said(t.short_ar);
const exOf = (t: Term) => defEn(t) ?? defAr(t);

// ── the sources ──────────────────────────────────────────────────────────────

async function tree(env: ArLinguisticsEnv, q: Q): Promise<GramDrill[]> {
  const reg = await registry(env);
  const out: GramDrill[] = [];
  for (const t of shuffle(reg.terms.filter((x) => inScope(x, q)))) {
    if (out.length >= q.n) break;
    const base = { source: 'tree', ask: q.ask, termId: t.id, prompt: t.name_ar, promptEn: cap(t.name_en) || null, explanation: exOf(t) };
    if (q.ask === 'gt_category') {
      const mine = reg.cats.get(t.category_key);
      const others = shuffle([...reg.cats.values()].filter((c) => c.category_key !== t.category_key
        && c.discipline === (mine?.discipline ?? t.discipline))).map(catLabel);
      const opts = choices(catLabel(mine), others);
      if (!mine || !opts) continue;
      out.push({ ...base, id: `gt:tree:category:${t.id}`, terms: [t.id], options: opts, answer: catLabel(mine) });
    } else if (q.ask === 'gt_parent') {
      const p = t.parent_term_id ? reg.byId.get(t.parent_term_id) : undefined;
      if (!p) continue;
      // other headings of its category at the parent's depth; failing those, any term of the category above it
      const heads = reg.terms.filter((x) => x.category_key === t.category_key && x.id !== p.id && x.id !== t.id
        && x.parent_term_id !== t.id && (reg.kids.get(x.id)?.length ?? 0) > 0);
      const rest = reg.terms.filter((x) => x.category_key === t.category_key && x.id !== p.id && x.id !== t.id && x.depth <= p.depth);
      const opts = choices(label(p), [...shuffle(heads), ...shuffle(rest)].map(label));
      if (!opts) continue;
      out.push({ ...base, id: `gt:tree:parent:${t.id}`, terms: [t.id, p.id], options: opts, answer: label(p),
                 note: { en: cap(p.name_en) || null, ar: p.name_ar } });
    } else {
      const p = t.parent_term_id ? reg.byId.get(t.parent_term_id) : undefined;
      const sibs = (reg.kids.get(t.parent_term_id) ?? []).filter((x) => x.id !== t.id);
      if (!p || !sibs.length) continue;
      const s = shuffle(sibs)[0];
      const away = reg.terms.filter((x) => x.category_key === t.category_key && x.parent_term_id !== t.parent_term_id
        && x.id !== t.parent_term_id && x.id !== t.id);
      const opts = choices(label(s), shuffle(away).map(label));
      if (!opts) continue;
      out.push({ ...base, id: `gt:tree:sibling:${t.id}:${s.id}`, terms: [t.id, s.id], options: opts, answer: label(s),
                 explanation: `${label(p)} → ${sibs.concat([t]).map((x) => x.name_ar).join('، ')}` });
    }
  }
  return out;
}

async function define(env: ArLinguisticsEnv, q: Q): Promise<GramDrill[]> {
  const reg = await registry(env);
  const out: GramDrill[] = [];
  const want = q.ask === 'gt_define_ar' ? defAr : defEn;
  for (const t of shuffle(reg.terms.filter((x) => inScope(x, q) && !!want(x)))) {
    if (out.length >= q.n) break;
    const near = beside(reg, t);
    if (q.ask === 'gt_define_def') {
      const answer = maskEn(defEn(t)!, t.name_en);
      const opts = choices(answer, near.filter((x) => defEn(x)).map((x) => maskEn(defEn(x)!, x.name_en)));
      if (!opts) continue;
      out.push({ id: `gt:define:def:${t.id}`, source: 'define', ask: q.ask, termId: t.id, terms: [t.id], prompt: t.name_ar,
                 promptEn: cap(t.name_en) || null, options: opts, answer, explanation: defAr(t) });
    } else {
      const text = q.ask === 'gt_define_ar' ? maskAr(defAr(t)!, t.name_ar) : maskEn(defEn(t)!, t.name_en);
      const opts = choices(label(t), near.map(label));
      if (!opts) continue;
      out.push({ id: `gt:define:${q.ask === 'gt_define_ar' ? 'ar' : 'term'}:${t.id}`, source: 'define', ask: q.ask, termId: t.id,
                 terms: [t.id], prompt: text, promptEn: catLabel(reg.cats.get(t.category_key)) || null, options: opts, answer: label(t),
                 explanation: q.ask === 'gt_define_ar' ? defEn(t) : defAr(t) });
    }
  }
  return out;
}

async function shahid(env: ArLinguisticsEnv, q: Q): Promise<{ items: GramDrill[]; missing: string[] }> {
  const reg = await registry(env);
  const scoped = reg.terms.filter((x) => inScope(x, q));
  if (!scoped.length) return { items: [], missing: [] };
  const ids = scoped.map((t) => t.id);
  // every Qurʾānic example, read once per isolate (a few thousand short rows) — not a query per 90 terms
  const ex = await qrExamples(env);
  const rows = ids.flatMap((id) => ex.get(id) ?? []).filter((r) => !q.surah || r.qr_ref.startsWith(`${q.surah}:`));
  const withEx = new Set(rows.map((r) => r.term_id));
  const missing = ids.filter((id) => !withEx.has(id));
  // one example per term per round, so the round spans the terms
  const seen = new Set<string>();
  const picked = shuffle(rows.filter((r) => /^\d+:\d+$/.test(r.qr_ref)))
    .filter((r) => (seen.has(r.term_id) ? false : (seen.add(r.term_id), true))).slice(0, q.n);
  const items: GramDrill[] = [];
  for (const r of picked) {
    const t = reg.byId.get(r.term_id)!;
    const near = beside(reg, t);
    if (q.ask === 'gt_shahid_pick') {
      // which of these phrases is a shāhid of the term? the others are shawāhid of the terms beside it
      const others = shuffle(near.slice(0, 12).flatMap((x) => ex.get(x.id) ?? [])).slice(0, 6).map((x) => x.example_ar);
      const opts = choices(r.example_ar, others.filter((x) => bare(x) !== bare(r.example_ar)));
      if (!opts) continue;
      items.push({ id: `gt:shahid:pick:${r.id}`, source: 'shahid', ask: q.ask, termId: t.id, terms: [t.id], prompt: t.name_ar,
                   promptEn: cap(t.name_en) || null, options: opts, answer: r.example_ar, explanation: exOf(t),
                   qrRef: r.qr_ref, exampleAr: r.example_ar });
    } else {
      const opts = choices(label(t), near.map(label));
      if (!opts) continue;
      items.push({ id: `gt:shahid:${r.id}`, source: 'shahid', ask: q.ask, termId: t.id, terms: [t.id], prompt: r.example_ar,
                   promptEn: r.gloss_en, options: opts, answer: label(t), explanation: exOf(t),
                   note: { en: cap(t.name_en) || null, ar: t.name_ar }, qrRef: r.qr_ref, exampleAr: r.example_ar });
    }
  }
  return { items, missing };
}

type Toc = { term_id: string; source_slug: string; bab_title_ar: string | null; page_start: number | null; state: string };
async function sources(env: ArLinguisticsEnv, slugs: string[]) {
  if (!slugs.length) return new Map<string, { title: string; author: string | null; titleEn: string | null }>();
  const rows = (await env.DB_AL.prepare(`SELECT slug, title_ar, title_en, author_name FROM ar_ling_source WHERE slug IN (${slugs.map(() => '?').join(',')})`)
    .bind(...slugs).all<{ slug: string; title_ar: string; title_en: string | null; author_name: string | null }>()).results ?? [];
  return new Map(rows.map((r) => [r.slug, { title: r.title_ar, author: r.author_name, titleEn: r.title_en }]));
}
/// English first — «Sharḥ al-Mufaṣṣal (Ibn Yaʿīsh) · شرح المفصل» — the Arabic title with its author where AL has no English name
const bookLabel = (b: { title: string; author: string | null; titleEn?: string | null } | undefined, slug: string) =>
  (b ? (b.titleEn ? `${b.titleEn} · ${b.title}` : b.author ? `${b.title} — ${b.author}` : b.title) : slug);

async function book(env: ArLinguisticsEnv, q: Q): Promise<GramDrill[]> {
  const reg = await registry(env);
  if (q.ask === 'gt_page') {
    // a page of the book, under a bāb whose own title names the term (confirmed): which term does it treat?
    const scoped = reg.terms.filter((x) => inScope(x, q)).map((t) => t.id);
    if (!scoped.length) return [];
    const rows = (await env.DB_AL.prepare(
      `SELECT ct.chunk_id, ct.term_id, c.source_slug, c.volume_no, c.page_no, substr(c.text_ar, 1, 420) AS text_ar
         FROM ar_ling_gram_chunk_term ct JOIN ar_ling_gram_chunk c ON c.id = ct.chunk_id
        WHERE ct.match_kind = 'exact' AND ct.state = 'confirmed' AND c.source_slug <> 'adima_dirasat' ${q.terms ? `AND ct.term_id IN (${scoped.map(() => '?').join(',')})` : ''}
        ORDER BY random() LIMIT ?`).bind(...(q.terms ? scoped : []), q.n * 6)
      .all<{ chunk_id: string; term_id: string; source_slug: string; volume_no: number | null; page_no: number | null; text_ar: string }>()).results ?? [];
    const books = await sources(env, [...new Set(rows.map((r) => r.source_slug))]);
    const seen = new Set<string>();
    const out: GramDrill[] = [];
    for (const r of rows) {
      const t = reg.byId.get(r.term_id);
      if (!t || !inScope(t, q) || seen.has(t.id) || out.length >= q.n) continue;
      // the paragraph that names the term, with the name hidden: what the book says it is
      const paras = r.text_ar.replace(/\r/g, '\n').split('\n').map((x) => x.trim()).filter((x) => x.length > 25);
      const nm = bare(t.name_ar).replace(/^ال/, '');
      const at = Math.max(0, paras.findIndex((x) => bare(x).includes(nm)));
      const text = maskAr(paras.slice(at, at + 2).join(' '), t.name_ar).slice(0, 320);
      if (text.length < 60 || !text.includes('…')) continue;
      const opts = choices(label(t), beside(reg, t).map(label));
      if (!opts) continue;
      seen.add(t.id);
      out.push({ id: `gt:book:page:${r.chunk_id}:${t.id}`, source: 'book', ask: q.ask, termId: t.id, terms: [t.id], prompt: `${text}…`,
                 promptEn: null, options: opts, answer: label(t), explanation: exOf(t),
                 cite: { source: r.source_slug, title: bookLabel(books.get(r.source_slug), r.source_slug), volume: r.volume_no, page: r.page_no } });
    }
    return out;
  }
  const toc = (await env.DB_AL.prepare(
    `SELECT term_id, source_slug, bab_title_ar, page_start, state FROM ar_ling_gram_term_toc
      WHERE match_kind = 'exact' OR state = 'confirmed'`).all<Toc>()).results ?? [];
  const books = await sources(env, [...new Set(toc.map((r) => r.source_slug))]);
  const byTerm = new Map<string, Toc[]>();
  for (const r of toc) byTerm.set(r.term_id, [...(byTerm.get(r.term_id) ?? []), r]);
  const discOf = new Map<string, string>();       // a book's discipline: the terms it has bābs on
  for (const r of toc) { const t = reg.byId.get(r.term_id); if (t?.discipline && !discOf.has(r.source_slug)) discOf.set(r.source_slug, t.discipline); }
  const out: GramDrill[] = [];
  for (const t of shuffle(reg.terms.filter((x) => inScope(x, q) && byTerm.has(x.id)))) {
    if (out.length >= q.n) break;
    const mine = shuffle(byTerm.get(t.id)!)[0];
    const cite = { source: mine.source_slug, title: bookLabel(books.get(mine.source_slug), mine.source_slug), bab: mine.bab_title_ar, page: mine.page_start };
    if (q.ask === 'gt_book') {
      const has = new Set(byTerm.get(t.id)!.map((r) => r.source_slug));
      const others = shuffle([...books.keys()].filter((s) => !has.has(s) && discOf.get(s) === t.discipline))
        .concat(shuffle([...books.keys()].filter((s) => !has.has(s))));
      const answer = bookLabel(books.get(mine.source_slug), mine.source_slug);
      const opts = choices(answer, others.map((s) => bookLabel(books.get(s), s)));
      if (!opts) continue;
      out.push({ id: `gt:book:book:${t.id}:${mine.source_slug}`, source: 'book', ask: q.ask, termId: t.id, terms: [t.id], prompt: t.name_ar,
                 promptEn: cap(t.name_en) || null, options: opts, answer, explanation: mine.bab_title_ar ? `«${mine.bab_title_ar}»` : null, cite });
    } else {
      // the book's coverage: of these terms, which one has a bāb of its own in it? (the others have none there)
      const inBook = new Set(toc.filter((r) => r.source_slug === mine.source_slug).map((r) => r.term_id));
      const others = beside(reg, t).filter((x) => !inBook.has(x.id));
      const opts = choices(label(t), others.map(label));
      if (!opts) continue;
      out.push({ id: `gt:book:bab:${t.id}:${mine.source_slug}`, source: 'book', ask: q.ask, termId: t.id, terms: [t.id],
                 prompt: bookLabel(books.get(mine.source_slug), mine.source_slug), promptEn: catLabel(reg.cats.get(t.category_key)) || null,
                 options: opts, answer: label(t),
                 explanation: [mine.bab_title_ar ? `«${mine.bab_title_ar.replace(/^\[|\]$/g, '')}»` : null, exOf(t)].filter(Boolean).join(' — ') || null, cite });
    }
  }
  return out;
}

async function khilaf(env: ArLinguisticsEnv, q: Q): Promise<GramDrill[]> {
  const rows = (await env.DB_AL.prepare(
    `SELECT id, masala_no, title_ar, kufa_ar, basra_ar, volume_no, page_start FROM ar_ling_gram_khilaf
      WHERE status IS NOT 'retired' AND kufa_ar IS NOT NULL AND basra_ar IS NOT NULL`)
    .all<{ id: string; masala_no: number; title_ar: string; kufa_ar: string; basra_ar: string; volume_no: number | null; page_start: number | null }>()).results ?? [];
  const reg = await registry(env);
  // a lesson's masāʾil: those whose title names one of its terms (the Inṣāf has no GT links of its own)
  const names = q.terms ? [...q.terms].map((id) => reg.byId.get(id)).filter((t): t is Term => !!t)
    .map((t) => bare(t.name_ar).replace(/^ال/, '')).filter((x) => x.length >= 3) : null;
  const pool = names ? rows.filter((r) => names.some((nm) => bare(r.title_ar).includes(nm))) : rows;
  const cite = (r: typeof rows[number]) => ({ source: 'ibn_anbari_insaf', title: 'الإنصاف في مسائل الخلاف — أبو البركات الأنباري',
                                             bab: r.title_ar, volume: r.volume_no, page: r.page_start });
  const title = (r: typeof rows[number]) => r.title_ar.replace(/^مسألة\s*/, '').trim();
  const out: GramDrill[] = [];
  for (const r of shuffle(pool)) {
    if (out.length >= q.n) break;
    const base = { source: 'khilaf', termId: null, terms: [] as string[], cite: cite(r) };
    if (q.ask === 'gt_khilaf_whose') {
      const school = Math.random() < 0.5 ? 'kufa' : 'basra';
      const pos = school === 'kufa' ? r.kufa_ar : r.basra_ar;
      out.push({ ...base, id: `gt:khilaf:whose:${r.id}:${school}`, ask: q.ask, prompt: pos, promptEn: title(r),
                 options: ['kufa', 'basra'], answer: school, optionScope: 'school',
                 explanation: school === 'kufa' ? r.basra_ar : r.kufa_ar });
    } else if (q.ask === 'gt_khilaf_basra' || q.ask === 'gt_khilaf_kufa') {
      const answer = q.ask === 'gt_khilaf_basra' ? r.basra_ar : r.kufa_ar;
      if (bare(r.basra_ar) === bare(r.kufa_ar)) continue;
      out.push({ ...base, id: `gt:khilaf:${q.ask === 'gt_khilaf_basra' ? 'basra' : 'kufa'}:${r.id}`, ask: q.ask, prompt: title(r),
                 promptEn: null, options: shuffle([r.kufa_ar, r.basra_ar]), answer, explanation: null });
    } else {
      const school = Math.random() < 0.5 ? 'kufa' : 'basra';
      const others = shuffle(rows.filter((x) => x.id !== r.id)).map(title);
      const opts = choices(title(r), others);
      if (!opts) continue;
      out.push({ ...base, id: `gt:khilaf:which:${r.id}`, ask: q.ask, prompt: school === 'kufa' ? r.kufa_ar : r.basra_ar, promptEn: null,
                 options: opts, answer: title(r), explanation: `${school === 'kufa' ? r.basra_ar : r.kufa_ar}`, note: { en: school, ar: null } });
    }
  }
  return out;
}

async function wazn(env: ArLinguisticsEnv, q: Q): Promise<GramDrill[]> {
  const rows = (await env.DB_AL.prepare(
    `SELECT r.id, r.wazn_id, r.gram_term_ref, r.condition_key, r.strength, r.source_slug, r.quote_ar, r.note_md,
            w.wazn_ar, w.name_en AS wazn_en
       FROM ar_ling_sarf_wazn_rule r JOIN ar_ling_sarf_wazn w ON w.id = r.wazn_id
      WHERE r.status = 'live' AND r.condition_key <> 'needs_source' AND r.quote_ar IS NOT NULL AND length(r.quote_ar) > 8`)
    .all<{ id: string; wazn_id: string; gram_term_ref: string; condition_key: string; strength: string; source_slug: string;
           quote_ar: string; note_md: string | null; wazn_ar: string; wazn_en: string | null }>()).results ?? [];
  const reg = await registry(env);
  const pool = rows.filter((r) => { const t = reg.byId.get(r.gram_term_ref); return !!t && (!q.terms || q.terms.has(t.id)); });
  const books = await sources(env, [...new Set(rows.map((r) => r.source_slug))]);
  const waznLabel = (r: typeof rows[number]) => (r.wazn_en ? `${r.wazn_ar} (${r.wazn_en})` : r.wazn_ar);
  const nouns = uniq(rows.map((r) => r.gram_term_ref)).map((id) => reg.byId.get(id)).filter((t): t is Term => !!t);
  const out: GramDrill[] = [];
  for (const r of shuffle(pool)) {
    if (out.length >= q.n) break;
    const t = reg.byId.get(r.gram_term_ref)!;
    const cite = { source: r.source_slug, title: bookLabel(books.get(r.source_slug), r.source_slug) };
    const why = [r.note_md, `${cite.title}`].filter(Boolean).join(' — ');
    if (q.ask === 'gt_wazn_term') {
      const opts = choices(label(t), [...nouns.filter((x) => x.id !== t.id), ...beside(reg, t)].map(label));
      if (!opts) continue;
      out.push({ id: `gt:wazn:term:${r.id}`, source: 'wazn', ask: q.ask, termId: t.id, terms: [t.id], prompt: r.quote_ar,
                 promptEn: waznLabel(r), options: opts, answer: label(t), explanation: why, cite });
    } else if (q.ask === 'gt_wazn_pattern') {
      // the rule with its wazn hidden: which wazn does it give this noun?
      const masked = maskAr(r.quote_ar, r.wazn_ar.split('/')[0]);
      const opts = choices(waznLabel(r), shuffle(rows.filter((x) => x.wazn_id !== r.wazn_id)).map(waznLabel));
      if (!opts) continue;
      out.push({ id: `gt:wazn:pattern:${r.id}`, source: 'wazn', ask: q.ask, termId: t.id, terms: [t.id], prompt: masked,
                 promptEn: label(t), options: opts, answer: waznLabel(r), explanation: why, cite });
    } else {
      // the same wazn under its other rules, or the same noun on its other wazns: which rule is this one?
      const near = rows.filter((x) => x.id !== r.id && (x.wazn_id === r.wazn_id || x.gram_term_ref === r.gram_term_ref)
        && bare(x.quote_ar) !== bare(r.quote_ar));
      const opts = choices(r.quote_ar, shuffle(near).map((x) => x.quote_ar));
      if (!opts) continue;
      out.push({ id: `gt:wazn:rule:${r.id}`, source: 'wazn', ask: q.ask, termId: t.id, terms: [t.id], prompt: `${r.wazn_ar} — ${t.name_ar}`,
                 promptEn: `${waznLabel(r)} as ${cap(t.name_en)}`, options: opts, answer: r.quote_ar, explanation: why,
                 note: { en: r.strength, ar: null }, cite });
    }
  }
  return out;
}

async function contrast(env: ArLinguisticsEnv, q: Q): Promise<GramDrill[]> {
  const rows = (await env.DB_AL.prepare(
    `SELECT from_term_id, to_term_id, relation_kind, note_ar, note_en FROM ar_ling_gram_term_relation
      WHERE relation_kind IN ('contrast', 'confused_with', 'contested_with')`)
    .all<{ from_term_id: string; to_term_id: string; relation_kind: string; note_ar: string | null; note_en: string | null }>()).results ?? [];
  const reg = await registry(env);
  const pool = rows.filter((r) => reg.byId.has(r.from_term_id) && reg.byId.has(r.to_term_id)
    && (!q.terms || q.terms.has(r.from_term_id) || q.terms.has(r.to_term_id)));
  const pairName = (r: typeof rows[number]) => `${reg.byId.get(r.from_term_id)!.name_ar} / ${reg.byId.get(r.to_term_id)!.name_ar}`;
  const out: GramDrill[] = [];
  if (q.ask === 'gt_contested') {
    const contested = rows.filter((r) => r.relation_kind === 'contested_with' && reg.byId.has(r.from_term_id) && reg.byId.has(r.to_term_id));
    for (const r of shuffle(pool.filter((x) => x.relation_kind === 'contested_with' && x.note_ar))) {
      if (out.length >= q.n) break;
      const opts = choices(pairName(r), contested.filter((x) => x !== r).map(pairName));
      if (!opts) continue;
      const [a, b] = [reg.byId.get(r.from_term_id)!, reg.byId.get(r.to_term_id)!];
      out.push({ id: `gt:contrast:contested:${r.from_term_id}:${r.to_term_id}`, source: 'contrast', ask: q.ask, termId: a.id, terms: [a.id, b.id],
                 prompt: maskAr(maskAr(r.note_ar!, a.name_ar), b.name_ar), promptEn: r.note_en ? maskEn(maskEn(r.note_en, a.name_en), b.name_en) : null,
                 options: opts, answer: pairName(r), explanation: `${label(a)} — ${label(b)}` });
    }
    return out;
  }
  for (const r of shuffle(pool.filter((x) => x.relation_kind !== 'contested_with'))) {
    if (out.length >= q.n) break;
    // either side can be asked about
    const flip = Math.random() < 0.5;
    const a = reg.byId.get(flip ? r.to_term_id : r.from_term_id)!, b = reg.byId.get(flip ? r.from_term_id : r.to_term_id)!;
    const why = [r.note_en, r.note_ar].filter(Boolean).join(' — ') || null;
    if (q.ask === 'gt_pair') {
      const opts = choices(label(b), beside(reg, b).filter((x) => x.id !== a.id).map(label));
      if (!opts) continue;
      out.push({ id: `gt:contrast:pair:${a.id}:${b.id}`, source: 'contrast', ask: q.ask, termId: a.id, terms: [a.id, b.id], prompt: a.name_ar,
                 promptEn: cap(a.name_en) || null, options: opts, answer: label(b), explanation: why, note: { en: r.relation_kind, ar: null } });
    } else {
      // what tells the two apart, said of one of them: its half of the note ("in = possible; idhā = expected"), or its definition
      const latin = (x: string) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[ʿʾ'’]/g, '').toLowerCase().trim();
      const keys = [latin(a.term_key).replace(/_/g, ' '), latin(a.name_en ?? '').split(/[\s(]/)[0]].filter((k) => k.length >= 2);
      const halves = (r.note_en ?? '').split(/[;,،]/).map((x) => x.trim()).filter(Boolean);
      const own = halves.length > 1 ? halves.find((h) => keys.includes(latin(h).split(/[\s=]/)[0])) : undefined;
      const said = own ? `… ${own.replace(/^\S+\s*/, '').trim()}` : defEn(a) ? maskEn(defEn(a)!, a.name_en) : null;
      if (!said || said.length < 3) continue;
      const opts = choices(label(a), [label(b), ...beside(reg, a).filter((x) => x.id !== b.id).map(label)].slice(0, 3), 1);
      if (!opts) continue;
      out.push({ id: `gt:contrast:which:${a.id}:${b.id}`, source: 'contrast', ask: q.ask, termId: a.id, terms: [a.id, b.id],
                 prompt: `${a.name_ar} / ${b.name_ar}`, promptEn: said, options: opts, answer: label(a), explanation: why });
    }
  }
  return out;
}

type Entry = { id: string; discipline: string; chapter_ar: string | null; section_ar: string | null; head_ar: string | null;
               pattern_ar: string | null; pattern_term_id: string | null; meaning_ar: string | null; meaning_term_id: string | null;
               section_term_id: string | null; quote_ar: string; surah: number; ayah: number; word_index: number | null; word_ar: string | null;
               volume_no: number | null; page_no: number | null };
const ADIMA = { source: 'adima_dirasat', title: 'دراسات لأسلوب القرآن الكريم — محمد عبد الخالق عضيمة' };

async function adima(env: ArLinguisticsEnv, q: Q): Promise<GramDrill[]> {
  const reg = await registry(env);
  // the pattern and its meaning are ṣarf (the verb-form studies); the headings and their terms naḥw
  const disc = ['adima_pattern', 'adima_meaning'].includes(q.ask) ? 'SF' : ['adima_heading', 'adima_term'].includes(q.ask) ? 'NH'
    : q.discipline === 'NH' || q.discipline === 'SF' ? q.discipline : null;
  const where: string[] = ['quote_match >= 0.6'];
  const args: unknown[] = [];
  if (disc) { where.push('discipline = ?'); args.push(disc); }
  if (q.surah) { where.push('surah = ?'); args.push(q.surah); }
  if (q.terms) {
    const ids = [...q.terms].slice(0, 60);
    const ph = ids.map(() => '?').join(',');
    where.push(`(pattern_term_id IN (${ph}) OR meaning_term_id IN (${ph}) OR section_term_id IN (${ph}))`);
    args.push(...ids, ...ids, ...ids);
  }
  const cite = (e: { volume_no: number | null; page_no: number | null; section_ar: string | null }) =>
    ({ ...ADIMA, bab: e.section_ar, volume: e.volume_no, page: e.page_no });
  const out: GramDrill[] = [];
  const COLS = `id, discipline, chapter_ar, section_ar, head_ar, pattern_ar, pattern_term_id, meaning_ar, meaning_term_id,
                section_term_id, quote_ar, surah, ayah, word_index, word_ar, volume_no, page_no`;

  if (q.ask === 'adima_note') {
    const nw = ['drill_ar IS NOT NULL'];
    const na: unknown[] = [];
    if (disc) { nw.push('discipline = ?'); na.push(disc); }
    if (q.terms) {
      const ids = [...q.terms].slice(0, 60); const ph = ids.map(() => '?').join(',');
      nw.push(`(pattern_term_id IN (${ph}) OR meaning_term_id IN (${ph}) OR section_term_id IN (${ph}))`); na.push(...ids, ...ids, ...ids);
    }
    const notes = (await env.DB_AL.prepare(
      `SELECT id, discipline, chapter_ar, section_ar, head_ar, drill_ar, volume_no, page_no, about_readings FROM ar_ling_adima_note
        WHERE ${nw.join(' AND ')} ORDER BY random() LIMIT ?`).bind(...na, q.n * 2)
      .all<{ id: string; discipline: string; chapter_ar: string | null; section_ar: string | null; head_ar: string | null;
             drill_ar: string; volume_no: number | null; page_no: number | null; about_readings: number }>()).results ?? [];
    for (const n of notes) {
      if (out.length >= q.n) break;
      const near = (await env.DB_AL.prepare(
        `SELECT drill_ar FROM ar_ling_adima_note WHERE drill_ar IS NOT NULL AND id <> ? AND discipline = ?
            AND (chapter_ar IS ? OR section_ar IS ?) ORDER BY random() LIMIT 6`).bind(n.id, n.discipline, n.chapter_ar, n.section_ar)
        .all<{ drill_ar: string }>()).results ?? [];
      const far = near.length >= 3 ? [] : ((await env.DB_AL.prepare(
        `SELECT drill_ar FROM ar_ling_adima_note WHERE drill_ar IS NOT NULL AND id <> ? AND discipline = ? ORDER BY random() LIMIT 4`)
        .bind(n.id, n.discipline).all<{ drill_ar: string }>()).results ?? []);
      const opts = choices(n.drill_ar, [...near, ...far].map((x) => x.drill_ar));
      if (!opts) continue;
      out.push({ id: `adima:note:${n.id}`, source: 'adima', ask: q.ask, termId: null, terms: [], prompt: n.head_ar ?? n.section_ar ?? '',
                 promptEn: [n.chapter_ar, n.section_ar].filter(Boolean).join(' › ') || null, options: opts, answer: n.drill_ar,
                 explanation: null, note: { en: n.about_readings ? 'readings' : null, ar: n.section_ar }, cite: cite(n) });
    }
    return out;
  }

  const need = q.ask === 'adima_pattern' ? 'pattern_term_id IS NOT NULL AND word_index IS NOT NULL'
    : q.ask === 'adima_meaning' ? 'meaning_ar IS NOT NULL'
    : q.ask === 'adima_term' ? 'section_term_id IS NOT NULL'
    : 'section_ar IS NOT NULL AND chapter_ar IS NOT NULL';
  const rows = (await env.DB_AL.prepare(`SELECT ${COLS} FROM ar_ling_adima_entry WHERE ${where.join(' AND ')} AND ${need} ORDER BY random() LIMIT ?`)
    .bind(...args, q.n * 4).all<Entry>()).results ?? [];
  // the choices: the patterns ʿUḍayma studies, the meanings he names under a pattern, the headings of a chapter
  const patterns = q.ask === 'adima_pattern' ? ((await env.DB_AL.prepare(
    `SELECT DISTINCT pattern_ar FROM ar_ling_adima_entry WHERE pattern_ar IS NOT NULL`).all<{ pattern_ar: string }>()).results ?? []).map((x) => x.pattern_ar) : [];
  const seen = new Set<string>();
  for (const e of rows) {
    if (out.length >= q.n) break;
    const k = `${e.surah}:${e.ayah}`;
    if (seen.has(k)) continue;
    const base = { source: 'adima', ask: q.ask, qrRef: k, exampleAr: e.quote_ar, wordIndex: e.word_index, word: e.word_ar, cite: cite(e) };
    const where = [e.chapter_ar, e.section_ar, e.head_ar].filter(Boolean).join(' › ');
    if (q.ask === 'adima_pattern') {
      const opts = choices(e.pattern_ar!, shuffle(patterns));
      if (!opts) continue;
      out.push({ ...base, id: `adima:pattern:${e.id}`, termId: e.pattern_term_id, terms: [e.pattern_term_id!].concat(e.meaning_term_id ? [e.meaning_term_id] : []),
                 prompt: e.quote_ar, promptEn: e.word_ar, options: opts, answer: e.pattern_ar!, explanation: where,
                 note: { en: cap(reg.byId.get(e.pattern_term_id!)?.name_en) || null, ar: e.pattern_ar } });
    } else if (q.ask === 'adima_meaning') {
      const others = ((await env.DB_AL.prepare(
        `SELECT DISTINCT meaning_ar FROM ar_ling_adima_entry WHERE meaning_ar IS NOT NULL AND meaning_ar <> ? AND discipline = 'SF'
            ORDER BY pattern_term_id IS ? DESC LIMIT 12`).bind(e.meaning_ar, e.pattern_term_id)
        .all<{ meaning_ar: string }>()).results ?? []).map((x) => x.meaning_ar);
      const answer = e.meaning_term_id && reg.byId.get(e.meaning_term_id) ? label(reg.byId.get(e.meaning_term_id)!) : e.meaning_ar!;
      const asLabel = (m: string) => { const t = reg.terms.find((x) => x.category_key === 'sigha_maani' && bare(x.name_ar) === bare(m)); return t ? label(t) : m; };
      const opts = choices(answer, shuffle(others).map(asLabel));
      if (!opts) continue;
      out.push({ ...base, id: `adima:meaning:${e.id}`, termId: e.meaning_term_id, terms: [e.meaning_term_id, e.pattern_term_id].filter((x): x is string => !!x),
                 prompt: e.quote_ar, promptEn: [e.pattern_ar, e.word_ar].filter(Boolean).join(' — ') || null, options: opts, answer, explanation: where });
    } else if (q.ask === 'adima_term') {
      const t = reg.byId.get(e.section_term_id!);
      if (!t) continue;
      const opts = choices(label(t), beside(reg, t).map(label));
      if (!opts) continue;
      out.push({ ...base, id: `adima:term:${e.id}`, termId: t.id, terms: [t.id], prompt: e.quote_ar, promptEn: e.word_ar,
                 options: opts, answer: label(t), explanation: where });
    } else {
      const heads = ((await env.DB_AL.prepare(
        `SELECT DISTINCT section_ar FROM ar_ling_adima_entry WHERE discipline = ? AND chapter_ar = ? AND section_ar <> ? LIMIT 20`)
        .bind(e.discipline, e.chapter_ar, e.section_ar).all<{ section_ar: string }>()).results ?? []).map((x) => x.section_ar);
      const opts = choices(e.section_ar!, shuffle(heads));
      if (!opts) continue;
      out.push({ ...base, id: `adima:heading:${e.id}`, termId: e.section_term_id, terms: e.section_term_id ? [e.section_term_id] : [],
                 prompt: e.quote_ar, promptEn: e.chapter_ar, options: opts, answer: e.section_ar!, explanation: e.head_ar ? `${e.section_ar} › ${e.head_ar}` : null });
    }
    seen.add(k);
  }
  return out;
}

const SOURCES: Record<string, { asks: string[] }> = {
  tree: { asks: ['gt_category', 'gt_parent', 'gt_sibling'] },
  define: { asks: ['gt_define_term', 'gt_define_def', 'gt_define_ar'] },
  shahid: { asks: ['gt_shahid', 'gt_shahid_pick'] },
  book: { asks: ['gt_book', 'gt_bab', 'gt_page'] },
  khilaf: { asks: ['gt_khilaf_whose', 'gt_khilaf_basra', 'gt_khilaf_kufa', 'gt_khilaf_which'] },
  wazn: { asks: ['gt_wazn_term', 'gt_wazn_pattern', 'gt_wazn_rule'] },
  contrast: { asks: ['gt_pair', 'gt_pair_which', 'gt_contested'] },
  adima: { asks: ['adima_pattern', 'adima_heading', 'adima_meaning', 'adima_term', 'adima_note'] },
};

function parseQ(u: URL, source: string): Q | string {
  const ask = u.searchParams.get('ask') ?? SOURCES[source].asks[0];
  if (!SOURCES[source].asks.includes(ask)) return `ask for ${source}: ${SOURCES[source].asks.join(' | ')}`;
  const ids = (u.searchParams.get('terms') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const disc = (u.searchParams.get('discipline') ?? '').toUpperCase();
  return {
    n: Math.min(30, Math.max(1, Number(u.searchParams.get('n') ?? 8))), ask,
    terms: ids.length ? new Set(ids) : null, discipline: ['NH', 'SF', 'BL', 'DL'].includes(disc) ? disc : null,
    category: u.searchParams.get('category') || null,
    minDepth: Number(u.searchParams.get('minDepth') ?? 0), maxDepth: Number(u.searchParams.get('maxDepth') ?? 9),
    surah: Number(u.searchParams.get('surah') ?? 0) || null,
  };
}

export function drillGrammarRoutes(router: Router<ArLinguisticsEnv>) {
  // how much each source holds
  router.get('/al/drill/grammar/counts', async (_req, env) => {
    const one = async (sql: string) => ((await env.DB_AL.prepare(sql).first<{ n: number }>())?.n ?? 0);
    const [terms, defs, shawahid, toc, pages, khilafN, waznN, pairs, adimaN, notes] = await Promise.all([
      one(`SELECT COUNT(*) AS n FROM ar_ling_gram_term WHERE status = 'live'`),
      one(`SELECT COUNT(*) AS n FROM ar_ling_gram_term WHERE status = 'live' AND (definition_en IS NOT NULL OR short_en IS NOT NULL OR definition_ar IS NOT NULL)`),
      one(`SELECT COUNT(*) AS n FROM ar_ling_gram_term_example WHERE qr_ref IS NOT NULL`),
      one(`SELECT COUNT(*) AS n FROM ar_ling_gram_term_toc WHERE match_kind = 'exact' OR state = 'confirmed'`),
      one(`SELECT COUNT(*) AS n FROM ar_ling_gram_chunk_term WHERE match_kind = 'exact' AND state = 'confirmed'`),
      one(`SELECT COUNT(*) AS n FROM ar_ling_gram_khilaf WHERE kufa_ar IS NOT NULL AND basra_ar IS NOT NULL`),
      one(`SELECT COUNT(*) AS n FROM ar_ling_sarf_wazn_rule WHERE status = 'live' AND condition_key <> 'needs_source'`),
      one(`SELECT COUNT(*) AS n FROM ar_ling_gram_term_relation WHERE relation_kind IN ('contrast','confused_with','contested_with')`),
      one(`SELECT COUNT(*) AS n FROM ar_ling_adima_entry WHERE quote_match >= 0.6`),
      one(`SELECT COUNT(*) AS n FROM ar_ling_adima_note WHERE drill_ar IS NOT NULL`),
    ]);
    return ok({ tree: terms, define: defs, shahid: shawahid, book: toc + pages, khilaf: khilafN, wazn: waznN, contrast: pairs,
                adima: adimaN + notes });
  });

  // a lesson's terms, for its preview: what each is, where it sits, three shawāhid, where it is treated
  router.get('/al/drill/grammar/terms', async (req, env) => {
    const u = new URL(req.url);
    const ids = [...new Set((u.searchParams.get('ids') ?? '').split(',').map((s) => s.trim()).filter(Boolean))].slice(0, 40);
    // the books a caller will name beside them (a lesson's readings), by slug
    const want = [...new Set((u.searchParams.get('books') ?? '').split(',').map((s) => s.trim()).filter(Boolean))].slice(0, 40);
    if (!ids.length && !want.length) return badRequest('ids (GT term ids) or books (source slugs) required');
    if (!ids.length) return ok({ terms: [], books: Object.fromEntries(await sources(env, want)) });
    const reg = await registry(env);
    const ph = ids.map(() => '?').join(',');
    const [ex, toc, adimaN] = await Promise.all([
      env.DB_AL.prepare(`SELECT term_id, example_ar, qr_ref, gloss_en FROM ar_ling_gram_term_example
                          WHERE qr_ref IS NOT NULL AND term_id IN (${ph}) ORDER BY term_id, sort_order`).bind(...ids)
        .all<{ term_id: string; example_ar: string; qr_ref: string; gloss_en: string | null }>(),
      env.DB_AL.prepare(`SELECT term_id, source_slug, bab_title_ar, page_start, state FROM ar_ling_gram_term_toc
                          WHERE (match_kind = 'exact' OR state = 'confirmed') AND term_id IN (${ph}) ORDER BY state = 'confirmed' DESC, source_rank`)
        .bind(...ids).all<Toc>(),
      env.DB_AL.prepare(`SELECT COALESCE(pattern_term_id, meaning_term_id, section_term_id) AS term_id, COUNT(*) AS n FROM ar_ling_adima_entry
                          WHERE quote_match >= 0.6 AND (pattern_term_id IN (${ph}) OR meaning_term_id IN (${ph}) OR section_term_id IN (${ph}))
                          GROUP BY 1`).bind(...ids, ...ids, ...ids).all<{ term_id: string; n: number }>(),
    ]);
    const books = await sources(env, [...new Set((toc.results ?? []).map((r) => r.source_slug))]);
    // a term the registry has fewer than three shawāhid for: ʿUḍayma's citations under its heading fill in
    const short = ids.filter((id) => (ex.results ?? []).filter((e) => e.term_id === id).length < 3);
    const adimaEx = short.length ? ((await env.DB_AL.prepare(
      `SELECT COALESCE(CASE WHEN section_term_id IN (${short.map(() => '?').join(',')}) THEN section_term_id END,
                       CASE WHEN meaning_term_id IN (${short.map(() => '?').join(',')}) THEN meaning_term_id END, pattern_term_id) AS term_id,
              quote_ar, surah, ayah, word_ar, word_index, section_ar, volume_no, page_no
         FROM ar_ling_adima_entry WHERE quote_match >= 0.8 AND word_index IS NOT NULL
          AND (section_term_id IN (${short.map(() => '?').join(',')}) OR meaning_term_id IN (${short.map(() => '?').join(',')})
               OR pattern_term_id IN (${short.map(() => '?').join(',')}))
        ORDER BY random() LIMIT ?`).bind(...short, ...short, ...short, ...short, ...short, short.length * 4)
      .all<{ term_id: string; quote_ar: string; surah: number; ayah: number; word_ar: string | null; word_index: number | null;
             section_ar: string | null; volume_no: number | null; page_no: number | null }>()).results ?? []) : [];
    const terms = ids.map((id) => reg.byId.get(id)).filter((t): t is Term => !!t).map((t) => {
      const p = t.parent_term_id ? reg.byId.get(t.parent_term_id) : undefined;
      const c = reg.cats.get(t.category_key);
      return {
        id: t.id, nameAr: t.name_ar, nameEn: cap(t.name_en) || null, short: t.short_en, definitionEn: t.definition_en, definitionAr: t.definition_ar,
        discipline: t.discipline, category: c ? { key: c.category_key, nameAr: c.name_ar, nameEn: c.name_en } : null,
        parent: p ? { id: p.id, nameAr: p.name_ar, nameEn: cap(p.name_en) || null } : null,
        siblings: (reg.kids.get(t.parent_term_id) ?? []).filter((x) => x.id !== t.id && x.category_key === t.category_key && !reg.overlaps.has(`${t.id}|${x.id}`)).slice(0, 8)
          .map((x) => ({ id: x.id, nameAr: x.name_ar, nameEn: cap(x.name_en) || null })),
        shawahid: [
          ...(ex.results ?? []).filter((e) => e.term_id === t.id && /^\d+:\d+$/.test(e.qr_ref))
            .map((e) => ({ ar: e.example_ar, ref: e.qr_ref, en: e.gloss_en, wordIndex: null as number | null, source: 'registry', cite: null as string | null })),
          ...adimaEx.filter((e) => e.term_id === t.id).map((e) => ({ ar: e.quote_ar, ref: `${e.surah}:${e.ayah}`, en: null, wordIndex: e.word_index,
            source: 'adima', cite: `${ADIMA.title}${e.section_ar ? ` — «${e.section_ar}»` : ''}${e.volume_no ? ` ${e.volume_no}:${e.page_no ?? ''}` : ''}` })),
        ].slice(0, 3),
        treatedIn: (toc.results ?? []).filter((r) => r.term_id === t.id).slice(0, 4)
          .map((r) => ({ source: r.source_slug, title: bookLabel(books.get(r.source_slug), r.source_slug), bab: r.bab_title_ar, page: r.page_start,
                         confirmed: r.state === 'confirmed' })),
        adima: (adimaN.results ?? []).find((x) => x.term_id === t.id)?.n ?? 0,
      };
    });
    return ok({ terms, books: want.length ? Object.fromEntries(await sources(env, want)) : {} });
  });

  router.get('/al/drill/grammar/:source', async (req, env, { source }) => {
    if (!SOURCES[source]) return badRequest(`source: ${Object.keys(SOURCES).join(' | ')}`);
    const q = parseQ(new URL(req.url), source);
    if (typeof q === 'string') return badRequest(q);
    if (source === 'shahid') return ok(await shahid(env, q));
    const items = source === 'tree' ? await tree(env, q)
      : source === 'define' ? await define(env, q)
      : source === 'book' ? await book(env, q)
      : source === 'khilaf' ? await khilaf(env, q)
      : source === 'wazn' ? await wazn(env, q)
      : source === 'contrast' ? await contrast(env, q)
      : await adima(env, q);
    return ok({ items });
  });
}
