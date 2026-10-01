import type { Router } from '../../../shared/src/router';
import { ok, notFound, badRequest } from '../../../shared/src/response';
import { query, queryOne, placeholders, chunked } from '../../../shared/src/db';
import { parseIntParam } from '../../../shared/src/validate';
import type { QuranEnv } from '../env';
import { labels, byKey, card, type Label } from '../lib/labels';
import { surahRings } from './atlas-groups';

// ── A surah's own layers, and passages for a surah no one has cut ─────────────
// Built by kmaps-resources scripts/quran/atlas_layers.py into two tables (qr_057):
//
//   qr_surah_layer             sarf · nahw · balagha · themes · structure, one payload each.
//                              Every item names its source (a book slug, 'qac', 'ss', 'maududi')
//                              and every grammatical label is a GT: term; the slice returns the
//                              terms and the books it mentions, so the app renders names, not ids.
//   qr_surah_passage_proposal  passages cut where the mufassirūn and the iʿrāb books group the
//                              āyāt alike, with each opening's basis (who agrees, who runs across).
//                              Shown only for a surah with no curated passages at all — the
//                              curated study grid (qr_surah_study_passage) is never touched.

export const SURAH_LAYERS = ['sarf', 'nahw', 'balagha', 'themes', 'structure'] as const;

interface Proposal {
  passage_no: number; ayah_from: number; ayah_to: number; title_en: string | null; title_ar: string | null;
  words: number; opening_score: number | null; opening_support: number; basis_json: string;
}

const PROPOSAL_COLS = `passage_no, ayah_from, ayah_to, title_en, title_ar, words, opening_score, opening_support, basis_json`;

function basisOf(p: Proposal) {
  try { return JSON.parse(p.basis_json); } catch { return null; }
}

/// A unit's basis in a list: its opening only (each book's groups are in the structure layer's division).
function openingOf(p: Proposal) {
  const b = basisOf(p);
  return b ? { opening: b.opening } : null;
}

type Layers = (has: Record<string, number>) => Array<{ id: string; depth: string | null }>;

export interface CuratedRow { passage_no: number; ayah_from: number; ayah_to: number; status: string }

/// A surah's curated rows (any status but deleted — a draft is hand-cut too).
export function curatedRows(env: QuranEnv, s: number) {
  return query<CuratedRow>(env.DB_QR,
    `SELECT passage_no, ayah_from, ayah_to, status FROM qr_surah_study_passage WHERE surah = ? AND status != 'deleted'
      ORDER BY ayah_from`, [s]);
}

/// Whether curated passages cover the surah from its first āyah to its last with no gap.
export function coversSurah(rows: Array<{ from: number; to: number }>, ayahs: number) {
  if (!rows.length) return false;
  const xs = [...rows].sort((x, y) => x.from - y.from);
  let next = 1;
  for (const r of xs) {
    if (r.from > next) return false;
    next = Math.max(next, r.to + 1);
  }
  return next > ayahs;
}

/// The derived passages that fill what the curated passages leave uncovered: each derived passage
/// trimmed to the uncovered stretch it falls in (a curated edge cuts it). With no curated passages,
/// the derived passages as they are.
async function fillers(env: QuranEnv, s: number, ayahs: number, covered: Array<{ from: number; to: number }>) {
  const rows = await query<Proposal>(env.DB_QR,
    `SELECT ${PROPOSAL_COLS} FROM qr_surah_passage_proposal WHERE surah = ? ORDER BY passage_no`, [s]);
  if (!covered.length) return rows.map((p) => ({ p, from: p.ayah_from, to: p.ayah_to, words: p.words, trimmed: false }));
  const taken = new Set<number>();
  for (const c of covered) for (let a = c.from; a <= c.to; a++) taken.add(a);
  const perAyah = new Map((await query<{ ayah: number; n: number }>(env.DB_QR,
    `SELECT ayah, COUNT(*) AS n FROM qr_word_occurrence WHERE surah = ? GROUP BY ayah`, [s])).map((r) => [r.ayah, r.n]));
  const out: Array<{ p: Proposal; from: number; to: number; words: number; trimmed: boolean }> = [];
  for (const p of rows) {
    let a = p.ayah_from;
    while (a <= p.ayah_to) {
      while (a <= p.ayah_to && taken.has(a)) a++;
      if (a > p.ayah_to || a > ayahs) break;
      let b = a;
      while (b + 1 <= p.ayah_to && !taken.has(b + 1)) b++;
      let words = 0;
      for (let x = a; x <= b; x++) words += perAyah.get(x) ?? 0;
      out.push({ p, from: a, to: b, words, trimmed: a !== p.ayah_from || b !== p.ayah_to });
      a = b + 1;
    }
  }
  return out;
}

const titleOf = (from: number, to: number, p: Proposal, trimmed: boolean) =>
  trimmed ? (from === to ? `Āyah ${from}` : `Āyāt ${from}–${to}`) : p.title_en;

/// A surah's units: the curated ones as they are, and derived passages around them where the
/// curated passages leave āyāt uncovered — ordered by āyah and numbered by position. A curated unit
/// whose own passage_no differs from its position keeps it as curatedNo. Each unit also carries
/// key "from-to", which /qr/atlas/passage/:s/:from-:to resolves.
export async function atlasUnits<T extends { no: number; from: number; to: number }>(
  env: QuranEnv, s: number, ayahs: number, curated: T[], layersFor: Layers,
) {
  const layers = layersFor({}).map((l) => ({ id: l.id, depth: l.depth }));
  const derived = (await fillers(env, s, ayahs, curated)).map((f) => ({
    no: 0, from: f.from, to: f.to, title: titleOf(f.from, f.to, f.p, f.trimmed),
    // Ibn ʿĀshūr's own words for the topic, where his opening of the passage names it (only while the passage opens where his does)
    titleAr: f.from === f.p.ayah_from ? f.p.title_ar : null, theme: null,
    words: f.words, built: 0, layers,
    derived: true as const, basis: f.trimmed
      ? { opening: f.from === f.p.ayah_from ? basisOf(f.p)?.opening : { ayah: f.from, rule: 'curated_edge' },
          trimmedFrom: [f.p.ayah_from, f.p.ayah_to] }
      : openingOf(f.p),
  }));
  if (!curated.length) return derived.map((d, i) => ({ ...d, no: i + 1, key: `${d.from}-${d.to}` }));
  const all: Array<(T & { key?: string; curatedNo?: number }) | (typeof derived)[number] & { key?: string }> =
    [...curated, ...derived].sort((x, y) => x.from - y.from);
  return all.map((u, i) => {
    if ('derived' in u && u.derived === true) return { ...u, no: i + 1, key: `${u.from}-${u.to}` };
    const c = u as T;
    return c.no === i + 1 ? { ...c, key: `${c.from}-${c.to}` } : { ...c, no: i + 1, curatedNo: c.no, key: `${c.from}-${c.to}` };
  });
}

/// One unit of a surah that is not wholly curated, by its position (p) or its "from-to" key:
/// a curated passage (its own row) or a derived one (for /qr/atlas/passage/:s/:p).
export async function mixedPassage(env: QuranEnv, s: number, ayahs: number, curated: CuratedRow[],
                                   pick: { no?: number; from?: number; to?: number }) {
  const cur = curated.map((c) => ({ no: c.passage_no, from: c.ayah_from, to: c.ayah_to }));
  const units = await atlasUnits(env, s, ayahs, cur, () => []);
  const i = pick.no ? pick.no - 1 : units.findIndex((u) => u.from === pick.from && u.to === pick.to);
  const u = units[i];
  if (!u) return null;
  if ('derived' in u && u.derived) {
    const full = (await fillers(env, s, ayahs, cur)).find((f) => f.from === u.from && f.to === u.to);
    const basis = full ? (full.trimmed ? u.basis : basisOf(full.p)) : u.basis;
    return { kind: 'derived' as const, no: i + 1, from: u.from, to: u.to, title: u.title, titleAr: u.titleAr, basis };
  }
  const c = u as { no: number; from: number; to: number; curatedNo?: number };
  return { kind: 'curated' as const, no: i + 1, curatedNo: c.curatedNo ?? c.no, from: c.from, to: c.to };
}

type BookName = { title: string | null; titleAr: string | null; author: string | null; authorAr: string | null };

/// The books' names, from their own source tables (tafsīr, iʿrāb), then qr_study_label 'atlas_source'.
export async function bookNames(env: QuranEnv, slugs: string[], L: Record<string, Label[]>) {
  const srcs = [...new Set(slugs)];
  const books: Record<string, BookName> = {};
  if (!srcs.length) return books;
  const ph = placeholders(srcs.length);
  const rows = await query<{ slug: string; title: string | null; title_ar: string | null; author: string | null; author_ar: string | null }>(env.DB_QR,
    `SELECT source_slug AS slug, book_title_en AS title, book_title_ar AS title_ar, author_name_en AS author, author_name_ar AS author_ar
       FROM qr_tafsir_book_display_source WHERE source_slug IN (${ph})
     UNION ALL
     SELECT source_slug, book_title_en, book_title_ar, author_name_en, author_name_ar
       FROM qr_irab_book_display_source WHERE source_slug IN (${ph})`, [...srcs, ...srcs]);
  for (const r of rows) books[r.slug] = { title: r.title, titleAr: r.title_ar, author: r.author, authorAr: r.author_ar };
  for (const l of L.atlas_source ?? []) {
    if (srcs.includes(l.key)) books[l.key] = { title: l.label, titleAr: l.labelAr, author: null, authorAr: null };
  }
  return books;
}

/// The names behind a payload: every GT: term it mentions (qr_gram_term_ref) and every source
/// (the tafsīr and iʿrāb books' own source tables, then qr_study_label 'atlas_source').
async function namesFor(env: QuranEnv, payload: unknown, L: Record<string, Label[]>) {
  const text = JSON.stringify(payload);
  const ids = [...new Set([...text.matchAll(/"(GT:[a-z_]+:[a-z0-9_]+)"/g)].map((m) => m[1]))];
  const srcs = [...new Set([...text.matchAll(/"source":"([a-z_]+)"/g)].map((m) => m[1]))];
  const listed = (payload as { sources?: unknown }).sources;
  if (Array.isArray(listed)) for (const x of listed) if (typeof x === 'string' && !srcs.includes(x)) srcs.push(x);
  const terms: Record<string, { en: string; ar: string; short: string | null; category: string }> = {};
  for (const part of chunked(ids, 90)) {
    const rows = await query<{ id: string; name_en: string; name_ar: string; short_en: string | null; category_key: string }>(env.DB_QR,
      `SELECT id, name_en, name_ar, short_en, category_key FROM qr_gram_term_ref WHERE id IN (${placeholders(part.length)})`, part);
    for (const r of rows) terms[r.id] = { en: r.name_en, ar: r.name_ar, short: r.short_en, category: r.category_key };
  }
  const books: Record<string, BookName & { deathAh?: number | null }> = await bookNames(env, srcs, L);
  // the grammar books are named by AL (ar_ling_source)
  const rest = srcs.filter((x) => !books[x]);
  if (rest.length && env.AR_LINGUISTICS) {
    const meta = await alMeta(env, [], rest).catch(() => null);
    for (const [slug, b] of Object.entries(meta?.books ?? {})) {
      books[slug] = { title: b.title, titleAr: b.titleAr, author: b.authorEn ?? null, authorAr: b.author, deathAh: b.deathAh };
    }
  }
  return { terms, books };
}

// ── the grammar books' citations, paged ──────────────────────────────────────
type AlMeta = { disciplines: Record<string, string>; books: Record<string, { title: string | null; titleAr: string; author: string | null; authorEn?: string | null;
                                                                              deathAh: number | null }> };

async function alMeta(env: QuranEnv, chunks: string[], slugs: string[]): Promise<AlMeta> {
  const r = await env.AR_LINGUISTICS!.fetch('https://al/al/gram/citation-meta', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chunks, slugs }) });
  const j = await r.json() as { data?: AlMeta };
  if (!j.data) throw new Error('AL citation-meta: no data');
  return j.data;
}

async function getJson<T>(binding: Fetcher | undefined, url: string): Promise<T> {
  if (!binding) throw new Error('binding missing');
  const j = await (await binding.fetch(url)).json() as { data?: T };
  if (j.data === undefined) throw new Error(`${url}: no data`);
  return j.data;
}

// a registry term's category → the layer its shawāhid belong to (as atlas_layers.py files them)
const SARF_CATS = new Set(['form_family', 'derivation_type', 'sigha_maani', 'phonotactic', 'noun_process', 'form_tier',
  'root_type', 'taddiya_route', 'transitivity', 'tense', 'mood', 'voice', 'person', 'number', 'gender', 'inflection_class',
  'jumud', 'asl_kind']);
const termLayer = (k: string | null) => {
  const cat = (k ?? '').split(':')[1] ?? '';
  return cat.startsWith('balagha') ? 'balagha' : SARF_CATS.has(cat) ? 'sarf' : 'nahw';
};
const DISC: Record<string, string> = { sarf: 'SF', nahw: 'NH', balagha: 'BL' };

/// One page of a layer's citations: ʿUḍayma's (set=adima, ṣarf and naḥw), the grammar books' (set=books)
/// or the registry's shawāhid (set=shawahid); ?from&to cuts it to an āyah range (a passage).
async function citationsPage(env: QuranEnv, s: number, layer: string, set: string, from: number, to: number,
                             page: number, per: number) {
  const range = `from=${from}&to=${to}`;
  if (set === 'adima') {
    const d = await getJson<{ total: number; items: Array<Record<string, unknown>> }>(env.AR_LINGUISTICS,
      `https://al/al/gram/adima/by-surah/${s}?discipline=${DISC[layer]}&${range}&page=${page}&per=${per}`);
    return {
      total: d.total,
      items: d.items.map((r) => ({
        ref: `${r.surah}:${r.ayah}`, text: r.quote_ar, word: r.word_ar ?? null, wordIndex: r.word_index ?? null,
        chapter: r.chapter_ar, section: r.section_ar, head: r.head_ar, pattern: r.pattern_term_id, patternAr: r.pattern_ar,
        meaning: r.meaning_term_id, meaningAr: r.meaning_ar, key: r.section_term_id, vol: r.volume_no, page: r.page_no,
        source: 'adima_dirasat',
      })),
    };
  }
  if (set === 'books') {
    const d = await getJson<{ items: Array<{ qr_ref: string; text_ar: string; context_ar: string | null; bab_title_ar: string | null;
                                             term_id: string | null; source_slug: string; chunk_id: string | null; volume_no: number | null;
                                             page_no: number | null; origin: string }> }>(env.ARABIC,
      `https://ar/ar/grammar-citations/by-surah/${s}?${range}`);
    const meta = await alMeta(env, [...new Set(d.items.map((r) => r.chunk_id).filter((x): x is string => !!x))], []);
    const mine = d.items.filter((r) => r.chunk_id && meta.disciplines[r.chunk_id] === DISC[layer]);
    return {
      total: mine.length,
      byBook: Object.entries(mine.reduce<Record<string, number>>((m, r) => ({ ...m, [r.source_slug]: (m[r.source_slug] ?? 0) + 1 }), {}))
        .sort((x, y) => y[1] - x[1]).map(([source, count]) => ({ source, count })),
      items: mine.slice((page - 1) * per, page * per).map((r) => ({
        ref: r.qr_ref, text: r.text_ar, context: r.context_ar, section: r.bab_title_ar, key: r.term_id,
        source: r.source_slug, vol: r.volume_no, page: r.page_no, origin: r.origin,
      })),
    };
  }
  const d = await getJson<{ items: Array<{ term_id: string; example_ar: string; qr_ref: string; source_ref: string | null; gloss_en: string | null }> }>(
    env.AR_LINGUISTICS, `https://al/al/gram/term-examples/by-surah/${s}?${range}`);
  const mine = d.items.filter((r) => termLayer(r.term_id) === layer);
  return {
    total: mine.length,
    items: mine.slice((page - 1) * per, page * per).map((r) => ({
      ref: r.qr_ref, key: r.term_id, text: r.example_ar, gloss: r.gloss_en, source: (r.source_ref ?? '').split('#')[0] || null,
    })),
  };
}

export function atlasLayerRoutes(router: Router<QuranEnv>) {
  // A layer's full list of grammar-book citations, paged: /qr/atlas/surah/:s/{sarf,nahw,balagha}/citations
  //   ?set=adima|books|shawahid &page=1 &per=40 (≤100) &from&to (an āyah range — a passage's)
  router.get('/qr/atlas/surah/:surahId/:layer/citations', async (req, env, { surahId, layer }) => {
    const s = parseIntParam(surahId);
    if (!s || s < 1 || s > 114) return badRequest('Invalid surahId');
    if (!DISC[layer]) return badRequest(`no citations for layer ${layer}`);
    const u = new URL(req.url);
    const set = u.searchParams.get('set') ?? 'books';
    if (!['adima', 'books', 'shawahid'].includes(set) || (set === 'adima' && layer === 'balagha')) return badRequest(`unknown set ${set}`);
    const num = (k: string, d: number) => { const n = Number(u.searchParams.get(k)); return Number.isInteger(n) && n > 0 ? n : d; };
    const page = num('page', 1), per = Math.min(100, num('per', 40)), from = num('from', 1), to = num('to', 999);
    const [L, res] = await Promise.all([labels(env), citationsPage(env, s, layer, set, from, to, page, per).catch((e: Error) => e)]);
    if (res instanceof Error) return ok({ surah: s, layer, set, page, per, total: 0, items: [], error: res.message });
    const lab = byKey(L.layer_section).get(`${layer}.${set === 'books' ? 'grammarBooks' : set}`);
    return ok({
      surah: s, layer, set, range: [from, to], page, per, pages: Math.ceil(res.total / per),
      section: lab ? { title: lab.label, titleAr: lab.labelAr, tagline: lab.detail } : null,
      ...res,
      ...(await namesFor(env, res, L)),
    });
  });

  // A surah's own layer: /qr/atlas/surah/:s/{sarf,nahw,balagha,themes,structure}
  router.get('/qr/atlas/surah/:surahId/:layer', async (_req, env, { surahId, layer }) => {
    const s = parseIntParam(surahId);
    if (!s || s < 1 || s > 114) return badRequest('Invalid surahId');
    if (!(SURAH_LAYERS as readonly string[]).includes(layer)) return badRequest(`unknown layer ${layer}`);
    const [L, head, row] = await Promise.all([
      labels(env),
      queryOne<{ id: number; name_ar: string; name_en: string; translit: string | null; ayahs: number; revelation: string }>(env.DB_QR,
        `SELECT id, name_ar, name_en, name_transliteration AS translit, ayah_count AS ayahs, revelation_type AS revelation
           FROM qr_surah WHERE id = ?`, [s]),
      queryOne<{ payload_json: string; built_at: string }>(env.DB_QR,
        `SELECT payload_json, built_at FROM qr_surah_layer WHERE surah = ? AND layer = ?`, [s, layer]),
    ]);
    if (!head) return notFound(`surah ${s}`);
    let payload: Record<string, unknown> = {};
    try { payload = row ? JSON.parse(row.payload_json) : {}; } catch { payload = {}; }
    if (layer === 'structure') payload = { ...payload, ...(await structureLive(env, s, head.ayahs)) };
    const lab = byKey(L.surah_layer).get(layer);
    const sections = (L.layer_section ?? []).filter((x) => x.key.startsWith(`${layer}.`))
      .map((x) => ({ id: x.key.slice(layer.length + 1), title: x.label, titleAr: x.labelAr, tagline: x.detail }));
    return ok({
      surah: head,
      layer: lab ? card(lab) : { id: layer },
      sections,
      ...payload,
      ...(await namesFor(env, payload, L)),
      builtAt: row?.built_at ?? null,
    });
  });
}

/// The structure layer's live part: the passages (curated, else derived, each with its basis),
/// the naẓm groups the surah belongs to, and any authored structural units.
async function structureLive(env: QuranEnv, s: number, ayahs: number) {
  const [curated, groups, units] = await Promise.all([
    query<{ passage_no: number; ayah_from: number; ayah_to: number; title: string | null; theme: string | null;
            status: string; meta_json: string | null }>(env.DB_QR,
      `SELECT passage_no, ayah_from, ayah_to, COALESCE(title_en, label) AS title, theme, status, meta_json
         FROM qr_surah_study_passage WHERE surah = ? AND status != 'deleted' ORDER BY passage_no`, [s]),
    query<{ id: string; name_en: string; name_ar: string | null; source_slug: string | null; group_basis: string;
            surah_from: number; surah_to: number; summary_md: string }>(env.DB_QR,
      `SELECT g.id, g.name_en, g.name_ar, g.source_slug, g.group_basis, g.surah_from, g.surah_to, g.summary_md
         FROM qr_nazm_group g JOIN qr_nazm_group_member m ON m.group_id = g.id WHERE m.surah = ?
        ORDER BY g.group_basis, g.surah_from`, [s]),
    query<{ unit_index: number; ayah_from: number; ayah_to: number; unit_role: string | null; label: string | null }>(env.DB_QR,
      `SELECT unit_index, ayah_from, ayah_to, unit_role, label FROM qr_surah_structure_unit WHERE surah = ? ORDER BY unit_index`, [s]),
  ]);
  const cur = curated.map((p) => {
    let meta: Record<string, unknown> = {};
    try { meta = p.meta_json ? JSON.parse(p.meta_json) : {}; } catch { /* keep empty */ }
    return { no: p.passage_no, from: p.ayah_from, to: p.ayah_to, title: p.title, theme: p.theme, derived: false,
             live: p.status === 'live', evidence: (meta.boundary_evidence as string | undefined) ?? null,
             basis: null as unknown };
  });
  const covered = coversSurah(cur, ayahs);
  const passages = covered ? cur : (await atlasUnits(env, s, ayahs, cur, () => [])).map((u) =>
    'evidence' in u ? u : { no: u.no, from: u.from, to: u.to, title: u.title, titleAr: u.titleAr, theme: null, derived: true, live: true,
                            evidence: null, basis: u.basis, key: u.key });
  return {
    passageSource: covered ? 'curated' : cur.length ? 'mixed' : passages.length ? 'derived' : null,
    passages,
    groups: groups.map((g) => ({ id: g.id, title: g.name_en, titleAr: g.name_ar, source: g.source_slug, basis: g.group_basis,
                                 range: [g.surah_from, g.surah_to], summary: g.summary_md })),
    units: units.map((u) => ({ no: u.unit_index, from: u.ayah_from, to: u.ayah_to, role: u.unit_role, title: u.label })),
    // its recorded rings (A … centre … A′), each with its source — atlas-groups.ts
    rings: await surahRings(env, s),
  };
}
