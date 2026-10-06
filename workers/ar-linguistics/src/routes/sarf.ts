import type { Router } from '../../../shared/src/router';
import { ok, badRequest } from '../../../shared/src/response';
import { query } from '../../../shared/src/db';
import type { ArLinguisticsEnv } from '../env';

// ── الصرف of a set of roots and lemmas, for a reader of the Qurʾān (the passage screen) ───────────
//
// Everything the "Forms & words" screen shows about the LANGUAGE, by global id (AL:ROOT / AL:LEMMA):
//   per root   its picture (ar_ling_root_dna.picture_*), its verb tables (ar_ling_root_form_paradigm,
//              22-BAB), the prepositions its words take (ar_ling_root_lemma_tadiya, 20-GOV, the cited rows),
//              its opposites (ar_ling_root_didd, 30-KIN), and how its lemmas are used — the construction arcs
//              (ar_ling_lemma_arc, each with its primary worked verse)
//   per lemma  its plurals (ar_ling_root_lemma_jam, 200-LEM)
//   sets       the near-synonym sets with a checked member from these roots (furūq, 80-KIN)
// What a word means in its verse stays with QR; this is the same for every verse.

const MAX = 200;
const ids = (raw: string | null) => [...new Set((raw ?? '').split(',').map((s) => s.trim()).filter(Boolean))].slice(0, MAX);
const inList = `(SELECT value FROM json_each(?))`;

export function sarfRoutes(router: Router<ArLinguisticsEnv>) {
  router.get('/al/sarf/sheet', async (req, env) => {
    const u = new URL(req.url);
    const roots = ids(u.searchParams.get('roots'));
    const lemmas = ids(u.searchParams.get('lemmas'));
    if (!roots.length && !lemmas.length) return badRequest('roots and/or lemmas (comma-separated global ids) required');
    const R = JSON.stringify(roots), L = JSON.stringify(lemmas);
    const db = env.DB_AL;
    const [dna, paradigms, preps, didd, jam, members, contrasts, arcs] = await Promise.all([
      query<{ root_id: string; root_norm: string; picture_en: string | null; picture_ar: string | null }>(db,
        `SELECT root_id, root_norm, picture_en, picture_ar FROM ar_ling_root_dna WHERE root_id IN ${inList}`, [R]),
      query<{ id: string; root_id: string; lemma_id: string | null; verb_form: string | null; bab_key: string | null;
              source_ref: string | null; paradigm_json: string }>(db,
        `SELECT id, root_id, lemma_id, verb_form, bab_key, source_ref, paradigm_json FROM ar_ling_root_form_paradigm
          WHERE status = 'live' AND paradigm_type = 'verb_form' AND root_id IN ${inList}`, [R]),
      // the prepositions the Qurʾān shows — the cited rows; plain English where the ingested gloss is older
      query<{ id: string; root_id: string; lemma_id: string | null; verb_form: string | null; harf: string | null;
              harf_term_id: string | null; frame_ar: string | null; meaning_en: string | null; cite_json: string;
              qr_ref: string | null; sort_order: number }>(db,
        `SELECT id, root_id, lemma_id, verb_form, harf, harf_term_id, frame_ar,
                coalesce(json_extract(display_json, '$.plain_en'), meaning_en) AS meaning_en, cite_json,
                json_extract(display_json, '$.qr_ref') AS qr_ref, sort_order
           FROM ar_ling_root_lemma_tadiya
          WHERE status = 'live' AND cite_json IS NOT NULL AND root_id IN ${inList} ORDER BY root_id, sort_order`, [R]),
      query<{ id: string; root_id: string; antonym_ar: string; antonym_root_id: string | null; antonym_en: string | null;
              relation_kind: string; note_en: string | null; source_ref: string | null; display_json: string | null }>(db,
        `SELECT id, root_id, antonym_ar, antonym_root_id, antonym_en, relation_kind, note_en, source_ref, display_json
           FROM ar_ling_root_didd WHERE status = 'live' AND root_id IN ${inList} ORDER BY root_id, sort_order`, [R]),
      query<{ lemma_id: string; plural_ar: string; kind_ref: string; kind_ar: string; wazn_ar: string | null;
              surah: number | null; ayah: number | null; needle: string | null; note_en: string | null }>(db,
        `SELECT j.lemma_id, j.plural_ar, j.kind_ref, g.name_ar AS kind_ar, z.wazn_ar, j.surah, j.ayah, j.needle, j.note_en
           FROM ar_ling_root_lemma_jam j JOIN ar_ling_gram_term g ON g.id = j.kind_ref
           LEFT JOIN ar_ling_sarf_wazn z ON z.id = j.wazn_id
          WHERE j.status = 'live' AND j.lemma_id IN ${inList} ORDER BY j.lemma_id, j.sort_order`, [L]),
      // a set comes when one of its CHECKED members is from these roots; then all its checked members come
      query<{ set_id: string; title_en: string | null; title_ar: string | null; member_id: string; lemma_id: string;
              root_id: string | null; ar: string; en: string | null; contrast: string | null; sort_order: number;
              surah: number | null; ayah: number | null; quote: string | null }>(db,
        `SELECT m.set_id, s.canonical_en AS title_en, s.canonical_ar AS title_ar, m.id AS member_id, m.lemma_id,
                l.root_id, m.arabic_display AS ar, m.basic_gloss AS en, m.contrast_note AS contrast, m.sort_order,
                e.surah, e.ayah, e.arabic_quote AS quote
           FROM ar_ling_root_lemma_furuq_member m
           JOIN ar_ling_root_lemma_furuq_set s ON s.id = m.set_id
           LEFT JOIN ar_ling_root_lemma l ON l.id = m.lemma_id
           LEFT JOIN ar_ling_root_lemma_furuq_evidence e ON e.id = (SELECT e2.id FROM ar_ling_root_lemma_furuq_evidence e2
                      WHERE e2.member_id = m.id AND e2.validation_status = 'checked' ORDER BY e2.created_at LIMIT 1)
          WHERE m.source_status = 'lexicon_checked'
            AND m.set_id IN (SELECT m2.set_id FROM ar_ling_root_lemma_furuq_member m2 JOIN ar_ling_root_lemma l2 ON l2.id = m2.lemma_id
                              WHERE m2.source_status = 'lexicon_checked' AND l2.root_id IN ${inList})
          ORDER BY m.set_id, m.sort_order`, [R]),
      query<{ set_id: string; note_md: string }>(db,
        `SELECT set_id, note_md FROM ar_ling_root_lemma_furuq_set_src WHERE source_role = 'contrast'`),
      // every construction arc of the roots' lemmas, with its primary worked verse
      query<{ id: string; root_id: string; lemma_id: string; lemma_ar: string; construction_ar: string; harf: string | null;
              attest_count: number; arc_ar: string; arc_en: string; boundary_note_en: string | null; branches_json: string | null;
              ex_surah: number | null; ex_ayah: number | null; ex_text: string | null; ex_en: string | null; ex_note: string | null }>(db,
        `SELECT a.id, l.root_id, a.lemma_id, coalesce(l.lemma_text_canonical, l.lemma_text) AS lemma_ar, a.construction_ar, a.harf, a.attest_count, a.arc_ar, a.arc_en,
                a.boundary_note_en, a.branches_json,
                e.surah AS ex_surah, e.ayah AS ex_ayah, e.text_ar AS ex_text, e.fluent_en AS ex_en, e.note_en AS ex_note
           FROM ar_ling_lemma_arc a JOIN ar_ling_root_lemma l ON l.id = a.lemma_id
           LEFT JOIN ar_ling_lemma_arc_example e ON e.id = (SELECT e2.id FROM ar_ling_lemma_arc_example e2 WHERE e2.arc_id = a.id
                                                             ORDER BY e2.is_primary DESC, e2.seq LIMIT 1)
          WHERE a.status = 'live' AND l.root_id IN ${inList}
          ORDER BY l.root_id, a.lemma_id, a.attest_count DESC`, [R]),
    ]);

    const contrast = new Map(contrasts.map((c) => [c.set_id, c.note_md]));
    const sets = new Map<string, { id: string; title_en: string | null; title_ar: string | null; contrast: string | null; members: unknown[] }>();
    for (const m of members) {
      if (!sets.has(m.set_id)) sets.set(m.set_id, { id: m.set_id, title_en: m.title_en, title_ar: m.title_ar, contrast: contrast.get(m.set_id) ?? null, members: [] });
      sets.get(m.set_id)!.members.push({ lemma_id: m.lemma_id, root_id: m.root_id, ar: m.ar, en: m.en, contrast: m.contrast,
        cite: m.surah && m.quote ? { surah: m.surah, ayah: m.ayah, needle: m.quote } : null });
    }
    const byRoot = <T extends { root_id: string }>(rows: T[], r: string) => rows.filter((x) => x.root_id === r);
    return ok({
      roots: Object.fromEntries(roots.map((r) => {
        const d = dna.find((x) => x.root_id === r);
        return [r, {
          root_id: r, root_norm: d?.root_norm ?? null,
          picture: d?.picture_en ? { en: d.picture_en, ar: d.picture_ar } : null,
          paradigms: byRoot(paradigms, r).map((p) => ({ ...p, paradigm: JSON.parse(p.paradigm_json), paradigm_json: undefined })),
          preps: byRoot(preps, r).map((p) => ({ ...p, cite: JSON.parse(p.cite_json), cite_json: undefined })),
          opposites: byRoot(didd, r).map((o) => ({ ...o, display: o.display_json ? JSON.parse(o.display_json) : null, display_json: undefined })),
          constructions: byRoot(arcs, r).map((a) => ({ ...a, branches: a.branches_json ? JSON.parse(a.branches_json) : [], branches_json: undefined })),
        }];
      })),
      lemmas: Object.fromEntries(lemmas.map((l) => [l, { plurals: jam.filter((j) => j.lemma_id === l) }])),
      sets: [...sets.values()],
    });
  });
}
