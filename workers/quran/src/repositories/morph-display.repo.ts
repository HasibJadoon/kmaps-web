// ─── MorphDisplayRepo — the word view, straight from the display layer ────────
// The Morphology step is WORD-focused. This repo reads the render-ready display
// tables (qr_morph_display_word / _lemmas / _blocks / _sources) and merges the
// block tiers for one word so the UI renders a dumb list of typed blocks:
//   context (this occurrence's iʿrāb + word-focused tafsīr, keyed word-level
//   s:a:w) · lemma (ṣarf — wazn/form live on qr_morph_display_lemma, joined
//   via words.lemma_ref) · root (universal meaning, family, hook, five-lens,
//   lexicon shades, senses, SS-grounded examples). Everything trilingual
//   (en/ar/ur); Arabic terms stay Arabic. Tier-2 facts (wazn, derived type,
//   form, gloss) are served from the lemma tier — the word-row copies are
//   transitional fallbacks slated to be nulled. No shaping logic here beyond
//   JSON hydration + ordering.

import { query, queryOne } from '../../../shared/src/db';
import { buildFeats, rangeOf, waznOf } from '../lib/morph-card';

function hydrate(v: unknown): unknown {
  if (v == null) return null;
  if (typeof v !== 'string') return v;
  const s = v.trim();
  if (!s || (s[0] !== '{' && s[0] !== '[')) return v;
  try { return JSON.parse(s); } catch { return v; }
}

interface WordRow {
  id: string; word_occ_ref: string | null; surah_no: number; ayah_no: number; word_index: number;
  ayah_key: string | null; surface_ar: string; surface_bare: string | null; lemma_ar: string | null;
  lemma_ref: string | null; root_ar: string | null; root_display: string | null; word_group: string;
  pos_ar: string | null; pos_en: string | null; pos_ur: string | null;
  gloss_ar: string | null; gloss_en: string | null; gloss_ur: string | null; badge_color: string | null;
  derived_type_ar: string | null; derived_type_en: string | null; derived_type_ur: string | null;
  wazn_ar: string | null; form_roman: string | null; form_ar: string | null; features_json: string | null;
  is_anchor: number; importance: number; difficulty: number | null; frequency_quran: number | null;
  root_meaning_ar: string | null; root_meaning_en: string | null; quran_meanings_json: string | null;
}
// Tier-2 (lemma) facts joined from qr_morph_display_lemma via words.lemma_ref,
// plus the form-family master row (qr_morph_form_family via form_family_id) —
// the bāb: نَصَرَ … for Form I, the form name (إِفْعَال …) for derived forms.
// These win over the word-row copies (which are transitional and get nulled).
interface LemmaTierRow {
  l_wazn_ar: string | null; l_form_roman: string | null; l_form_ar: string | null;
  l_verb_form_ar: string | null;
  l_derived_type_ar: string | null; l_derived_type_en: string | null; l_derived_type_ur: string | null;
  l_gloss_ar: string | null; l_gloss_en: string | null; l_gloss_ur: string | null;
  f_name_ar: string | null; f_name_en: string | null; f_wazn_ar: string | null;
  f_model_ar: string | null; f_roman: string | null; f_kind: string | null; f_tier: string | null;
}
const LEMMA_TIER_SELECT = `
       l.wazn_ar         AS l_wazn_ar,
       l.form_roman      AS l_form_roman,
       l.form_ar         AS l_form_ar,
       l.verb_form_ar    AS l_verb_form_ar,
       l.derived_type_ar AS l_derived_type_ar,
       l.derived_type_en AS l_derived_type_en,
       l.derived_type_ur AS l_derived_type_ur,
       l.gloss_ar        AS l_gloss_ar,
       l.gloss_en        AS l_gloss_en,
       l.gloss_ur        AS l_gloss_ur,
       f.arabic_name     AS f_name_ar,
       f.english_name    AS f_name_en,
       f.wazn            AS f_wazn_ar,
       f.example_ar      AS f_model_ar,
       f.roman           AS f_roman,
       f.kind            AS f_kind,
       f.tier            AS f_tier`;
const FAMILY_JOIN =
  `LEFT JOIN qr_morph_form_family f ON f.id = l.form_family_id AND f.status = 'live'`;
interface BlockRow {
  scope_level: string; scope_key: string | null; ayah_key: string | null;
  block_type: string; block_subtype: string | null; display_order: number;
  title_ar: string | null; title_en: string | null; title_ur: string | null;
  text_ar: string | null; text_en: string | null; text_ur: string | null;
  data_json: string | null; source_slug: string | null; source_ref: string | null; source_page: string | null;
  is_synthesis: number; register: string | null; meta_json: string | null;
  registers_json: string | null; media_r2_key: string | null; media_kind: string | null; media_alt: string | null;
}
interface SourceRow {
  source_slug: string; kind: string; title_ar: string | null; title_en: string | null;
  author_name_ar: string | null; author_name_en: string | null; author_name_ur: string | null;
  death_year_hijri: number | null; register: string | null; badge_color: string | null;
  badge_glyph: string | null; display_order: number;
}

export class MorphDisplayRepo {
  constructor(private db: D1Database) {}

  /** Full word view: head + ordered tier-merged blocks + the sources they cite. */
  async wordView(surah: number, ayah: number, wordIndex: number): Promise<unknown | null> {
    const w = await queryOne<WordRow & LemmaTierRow>(
      this.db,
      `SELECT w.*,${LEMMA_TIER_SELECT}
         FROM qr_morph_display_word w
         LEFT JOIN qr_morph_display_lemma l ON l.id = w.lemma_ref AND l.status = 'live'
         ${FAMILY_JOIN}
        WHERE w.surah_no = ? AND w.ayah_no = ? AND w.word_index = ? AND w.status = 'live'`,
      [surah, ayah, wordIndex],
    );
    if (!w) return null;

    // All display blocks for this root: scope_level='root' → CORE (static, shared by every
    // context); scope_level='lemma' → CORE too, but only the rows for THIS word's lemma
    // (scope_key = words.lemma_ref — ṣarf of a sibling lemma must not leak in);
    // scope_level='context' → TEMPORAL (belongs to one Qurʾānic occurrence, keyed
    // word-level: scope_key = 's:a:w'). Legacy 'occurrence'/'ayah' rows fold into TEMPORAL too.
    const blocks = await query<BlockRow>(
      this.db,
      `SELECT scope_level, scope_key, ayah_key, block_type, block_subtype, display_order,
              title_ar, title_en, title_ur, text_ar, text_en, text_ur,
              data_json, source_slug, source_ref, source_page, is_synthesis, register, meta_json,
              registers_json, media_r2_key, media_kind, media_alt
         FROM qr_morph_display_block
        WHERE status = 'live' AND root_ar = ?
        ORDER BY display_order`,
      [w.root_ar ?? ''],
    ).catch(() => [] as BlockRow[]);

    const slugs = [...new Set(blocks.map(b => b.source_slug).filter(Boolean))] as string[];
    let sources: SourceRow[] = [];
    if (slugs.length) {
      const sph = slugs.map(() => '?').join(',');
      sources = await query<SourceRow>(
        this.db,
        `SELECT source_slug, kind, title_ar, title_en, author_name_ar, author_name_en, author_name_ur,
                death_year_hijri, register, badge_color, badge_glyph, display_order
           FROM qr_morph_display_source WHERE source_slug IN (${sph}) AND is_visible = 1`,
        slugs,
      ).catch(() => []);
    }

    // Prev/next promoted word in the surah (for full-page word navigation).
    const sibs = await query<{ ayah_no: number; word_index: number; surface_ar: string }>(
      this.db,
      `SELECT ayah_no, word_index, surface_ar FROM qr_morph_display_word
        WHERE surah_no = ? AND is_promoted = 1 AND status = 'live'
        ORDER BY ayah_no, word_index`,
      [surah],
    ).catch(() => []);
    const idx = sibs.findIndex(s => s.ayah_no === ayah && s.word_index === wordIndex);
    const mkNav = (s: { ayah_no: number; word_index: number; surface_ar: string } | undefined) =>
      s ? { surah, ayah: s.ayah_no, word_index: s.word_index, surface_ar: s.surface_ar } : null;

    // ── shape one block for the client ──
    const isCore = (b: BlockRow): boolean =>
      b.scope_level === 'root' || (b.scope_level === 'lemma' && b.scope_key === w.lemma_ref);
    const mapBlock = (b: BlockRow) => ({
      type: b.block_type, subtype: b.block_subtype,
      tier: b.scope_level, scope: isCore(b) ? 'root' : 'word',
      order: b.display_order,
      title: { ar: b.title_ar, en: b.title_en, ur: b.title_ur },
      text: { ar: b.text_ar, en: b.text_en, ur: b.text_ur },
      data: hydrate(b.data_json), source_slug: b.source_slug, source_ref: b.source_ref,
      source_page: b.source_page, is_synthesis: !!b.is_synthesis, register: b.register,
      registers: (hydrate(b.registers_json) as string[] | null) ?? (b.register ? [b.register] : []),
      icon: (hydrate(b.meta_json) as { icon?: string } | null)?.icon ?? null,
      illustration: b.media_r2_key
        ? { url: `/assets/morph-media/${b.block_type}.png`, alt: b.media_alt, kind: b.media_kind }
        : ((hydrate(b.meta_json) as { illustration?: unknown })?.illustration ?? null),
    });

    // CORE (root + this word's lemma tier) renders top; TEMPORAL (context) is
    // grouped by ayah — context scope_keys are word-level ('s:a:w') while the
    // occurrence items are ayah-keyed, so group on ayah_key (else the 's:a'
    // prefix of scope_key). Sibling-lemma blocks (same root, other lemma) drop.
    const coreBlocks = blocks.filter(isCore).map(mapBlock);
    const ayahOf = (b: BlockRow): string => {
      if (b.ayah_key) return b.ayah_key;
      const parts = (b.scope_key ?? '').split(':');
      return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : (b.scope_key ?? '');
    };
    const tempByKey = new Map<string, ReturnType<typeof mapBlock>[]>();
    for (const b of blocks) {
      if (b.scope_level === 'root' || b.scope_level === 'lemma') continue;
      const key = ayahOf(b);
      if (!tempByKey.has(key)) tempByKey.set(key, []);
      tempByKey.get(key)!.push(mapBlock(b));
    }

    // The occurrences block enumerates the contexts; attach each context's temporal blocks.
    const occ = coreBlocks.find(b => b.type === 'occurrences');
    const occItems: any[] = (occ?.data as { items?: any[] })?.items ?? [];
    const contexts = occItems.map(it => ({
      key: it.ayah_key, ayah_key: it.ayah_key, kind_ar: it.kind_ar, en: it.en,
      text_ar: it.text_ar, note: it.note ?? '', source: it.source ?? 'Qurʾān', focus: !!it.focus,
      blocks: tempByKey.get(it.ayah_key) ?? [],
    }));

    // Distinct language-world registers present (drives the sidebar filter).
    const regsAvail = [...new Set(
      [...coreBlocks, ...contexts.flatMap(c => c.blocks)].flatMap(b => b.registers ?? []),
    )];

    return {
      nav: { prev: mkNav(sibs[idx - 1]), next: mkNav(sibs[idx + 1]), index: idx, total: sibs.length },
      word: {
        id: w.id, surah: w.surah_no, ayah: w.ayah_no, word_index: w.word_index, ayah_key: w.ayah_key,
        surface_ar: w.surface_ar, surface_bare: w.surface_bare, lemma_ar: w.lemma_ar,
        root_ar: w.root_ar, root_display: w.root_display, group: w.word_group,
        pos: { ar: w.pos_ar, en: w.pos_en, ur: w.pos_ur },
        gloss: { ar: w.l_gloss_ar ?? w.gloss_ar, en: w.l_gloss_en ?? w.gloss_en, ur: w.l_gloss_ur ?? w.gloss_ur },
        sarf: { derived_ar: w.l_derived_type_ar ?? w.derived_type_ar,
                derived_en: w.l_derived_type_en ?? w.derived_type_en,
                derived_ur: w.l_derived_type_ur ?? w.derived_type_ur,
                wazn_ar: w.l_wazn_ar ?? w.wazn_ar,
                form_roman: w.f_roman ?? w.l_form_roman ?? w.form_roman,
                // the bāb, always from the master family when linked: باب نَصَرَ
                // (Form I) · باب إِفْعَال (derived) — the hero chip renders it
                form_ar: w.f_name_ar ?? w.l_form_ar ?? w.form_ar,
                features: hydrate(w.features_json) },
        family: w.f_name_ar ? {
          name_ar: w.f_name_ar, name_en: w.f_name_en, roman: w.f_roman,
          wazn_ar: w.f_wazn_ar, model_ar: w.f_model_ar, kind: w.f_kind, tier: w.f_tier,
        } : null,
        badge_color: w.badge_color, is_anchor: !!w.is_anchor,
        importance: w.importance, difficulty: w.difficulty, frequency_quran: w.frequency_quran,
      },
      registers_available: regsAvail,
      blocks: coreBlocks,
      contexts,
      sources: Object.fromEntries(sources.map(s => [s.source_slug, {
        kind: s.kind, title_ar: s.title_ar, title_en: s.title_en,
        author_ar: s.author_name_ar, author_en: s.author_name_en, author_ur: s.author_name_ur,
        death_h: s.death_year_hijri, register: s.register,
        badge_color: s.badge_color, badge_glyph: s.badge_glyph, order: s.display_order,
      }])),
    };
  }

  /** Grid: promoted content words for a surah (noun/verb cards, never ḥarf).
   *  The card matches the full-surah morphology grid: the QAC occurrence tag is
   *  joined so the same grammatical-feature chips + range synopsis are shaped. */
  async grid(surah: number): Promise<unknown[]> {
    type GridRow = WordRow & LemmaTierRow & {
      sense_arc_en: string | null;
      sense_range_en: string | null;
      verb_form_ar: string | null;
      morphology_tag_json: string | null;
    };
    const rows = await query<GridRow>(
      this.db,
      `SELECT d.*, o.morphology_tag_json AS morphology_tag_json,${LEMMA_TIER_SELECT}
         FROM qr_morph_display_word d
         LEFT JOIN qr_word_occurrence o
           ON o.surah = d.surah_no AND o.ayah = d.ayah_no AND o.word_index = d.word_index
         LEFT JOIN qr_morph_display_lemma l ON l.id = d.lemma_ref AND l.status = 'live'
         ${FAMILY_JOIN}
        WHERE d.surah_no = ? AND d.is_promoted = 1 AND d.status = 'live'
        ORDER BY d.ayah_no, d.word_index`,
      [surah],
    ).catch(() => [] as GridRow[]);
    return rows.map(w => {
      const meanings = (hydrate(w.quran_meanings_json) as Array<{ ar: string; en: string }> | null) ?? null;
      const bucket = w.word_group === 'verb' ? 'verb' : 'noun';
      const derivedAr = w.l_derived_type_ar ?? w.derived_type_ar;
      const derivedEn = w.l_derived_type_en ?? w.derived_type_en;
      return {
        id: w.id, surah: w.surah_no, ayah: w.ayah_no, word_index: w.word_index,
        surface_ar: w.surface_ar, lemma_ar: w.lemma_ar, root_ar: w.root_ar, root_display: w.root_display,
        group: w.word_group, pos_ar: w.pos_ar, pos_en: w.pos_en,
        gloss: { ar: w.l_gloss_ar ?? w.gloss_ar, en: w.l_gloss_en ?? w.gloss_en, ur: w.l_gloss_ur ?? w.gloss_ur },
        derived_type_ar: derivedAr, derived_type_en: derivedEn,
        wazn_ar: waznOf(w.l_wazn_ar ?? w.wazn_ar, w.morphology_tag_json, w.lemma_ar, w.root_ar, bucket),
        form_roman: w.f_roman ?? w.l_form_roman ?? w.form_roman,
        form_ar: w.f_name_ar ?? w.l_form_ar ?? w.form_ar,
        root_meaning: { ar: w.root_meaning_ar, en: w.root_meaning_en },
        quran_meanings: meanings,
        badge_color: w.badge_color, is_anchor: !!w.is_anchor, frequency_quran: w.frequency_quran,
        feats: buildFeats(bucket, w.morphology_tag_json, derivedAr, derivedEn,
                          w.f_model_ar ?? w.l_verb_form_ar ?? w.verb_form_ar ?? null,
                          w.f_name_ar, w.f_roman),
        sense_arc_en: w.sense_arc_en ?? null,
        sense_range_en: rangeOf(w.sense_range_en, meanings),
      };
    });
  }
}
