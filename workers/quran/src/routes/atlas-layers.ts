import type { Router } from '../../../shared/src/router';
import { ok, notFound, badRequest } from '../../../shared/src/response';
import { query, queryOne, placeholders, chunked } from '../../../shared/src/db';
import { parseIntParam } from '../../../shared/src/validate';
import type { QuranEnv } from '../env';
import { labels, byKey, card, type Label } from '../lib/labels';

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

/// A surah's derived passages as atlas units (the curated units' shape, marked derived, with their basis).
export async function derivedUnits(env: QuranEnv, s: number,
                                   layersFor: (has: Record<string, number>) => Array<{ id: string; depth: string | null }>) {
  const rows = await query<Proposal>(env.DB_QR,
    `SELECT ${PROPOSAL_COLS} FROM qr_surah_passage_proposal WHERE surah = ? ORDER BY passage_no`, [s]);
  const layers = layersFor({});
  return rows.map((p) => ({
    no: p.passage_no, from: p.ayah_from, to: p.ayah_to, title: p.title_en, theme: null,
    words: p.words, built: 0, layers: layers.map((l) => ({ id: l.id, depth: l.depth })),
    derived: true, basis: openingOf(p),
  }));
}

/// One derived passage (for /qr/atlas/passage/:s/:p when the surah has no curated passages).
export async function derivedPassage(env: QuranEnv, s: number, p: number) {
  const row = await queryOne<Proposal>(env.DB_QR,
    `SELECT ${PROPOSAL_COLS} FROM qr_surah_passage_proposal
      WHERE surah = ? AND passage_no = ?
        AND NOT EXISTS (SELECT 1 FROM qr_surah_study_passage c WHERE c.surah = ? AND c.status != 'deleted')`, [s, p, s]);
  return row ? { from: row.ayah_from, to: row.ayah_to, title: row.title_en, titleAr: row.title_ar, basis: basisOf(row) } : null;
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
  const books = await bookNames(env, srcs, L);
  return { terms, books };
}

export function atlasLayerRoutes(router: Router<QuranEnv>) {
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
    if (layer === 'structure') payload = { ...payload, ...(await structureLive(env, s)) };
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
async function structureLive(env: QuranEnv, s: number) {
  const [curated, derived, groups, units] = await Promise.all([
    query<{ passage_no: number; ayah_from: number; ayah_to: number; title: string | null; theme: string | null;
            status: string; meta_json: string | null }>(env.DB_QR,
      `SELECT passage_no, ayah_from, ayah_to, COALESCE(title_en, label) AS title, theme, status, meta_json
         FROM qr_surah_study_passage WHERE surah = ? AND status != 'deleted' ORDER BY passage_no`, [s]),
    query<Proposal>(env.DB_QR,
      `SELECT ${PROPOSAL_COLS} FROM qr_surah_passage_proposal WHERE surah = ? ORDER BY passage_no`, [s]),
    query<{ id: string; name_en: string; name_ar: string | null; source_slug: string | null; group_basis: string;
            surah_from: number; surah_to: number; summary_md: string }>(env.DB_QR,
      `SELECT g.id, g.name_en, g.name_ar, g.source_slug, g.group_basis, g.surah_from, g.surah_to, g.summary_md
         FROM qr_nazm_group g JOIN qr_nazm_group_member m ON m.group_id = g.id WHERE m.surah = ?
        ORDER BY g.group_basis, g.surah_from`, [s]),
    query<{ unit_index: number; ayah_from: number; ayah_to: number; unit_role: string | null; label: string | null }>(env.DB_QR,
      `SELECT unit_index, ayah_from, ayah_to, unit_role, label FROM qr_surah_structure_unit WHERE surah = ? ORDER BY unit_index`, [s]),
  ]);
  const passages = curated.length
    ? curated.map((p) => {
        let meta: Record<string, unknown> = {};
        try { meta = p.meta_json ? JSON.parse(p.meta_json) : {}; } catch { /* keep empty */ }
        return { no: p.passage_no, from: p.ayah_from, to: p.ayah_to, title: p.title, theme: p.theme, derived: false,
                 live: p.status === 'live', evidence: (meta.boundary_evidence as string | undefined) ?? null,
                 basis: null };
      })
    : derived.map((p) => ({ no: p.passage_no, from: p.ayah_from, to: p.ayah_to, title: p.title_en, theme: null,
                            derived: true, live: true, evidence: null, basis: openingOf(p) }));
  return {
    passageSource: curated.length ? 'curated' : derived.length ? 'derived' : null,
    passages,
    groups: groups.map((g) => ({ id: g.id, title: g.name_en, titleAr: g.name_ar, source: g.source_slug, basis: g.group_basis,
                                 range: [g.surah_from, g.surah_to], summary: g.summary_md })),
    units: units.map((u) => ({ no: u.unit_index, from: u.ayah_from, to: u.ayah_to, role: u.unit_role, title: u.label })),
  };
}
