import { query, queryOne } from '../../../shared/src/db';
import { buildFeats, cardFeats, gtIdsOf, readingSourceSlugs, readingsOf, registryFeats, rangeOf, shapeReadings, waznOf, type GtRow, type SourceLabel, type TermLabel } from '../lib/morph-card';
import type { AlClient, ResolvedLemma } from '../clients/al.client';
import { softFail } from '../../../shared/src/soft-fail';

/** Register filter chips on the word page: the label each register shows, in reading order. */
const REGISTER_LABEL: Record<string, string> = {
  quran: 'Qurʾān', classical: 'Classical', msa: 'MSA',
  linguistic: 'Linguistic', modern: 'Modern', tafsir: 'Tafsīr',
};
const REGISTER_ORDER = Object.keys(REGISTER_LABEL);
const registerOptions = (regs: string[]) => [...regs]
  .sort((a, b) => (REGISTER_ORDER.indexOf(a) + 1 || 99) - (REGISTER_ORDER.indexOf(b) + 1 || 99))
  .map((key) => ({ key, label: REGISTER_LABEL[key] ?? key }));

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

  constructor(private db: D1Database, private al: AlClient | null = null) {}

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
    ).catch(softFail([] as BlockRow[]));

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
      ).catch(softFail([]));
    }

    const sibs = await query<{ ayah_no: number; word_index: number; surface_ar: string }>(
      this.db,
      `SELECT ayah_no, word_index, surface_ar FROM qr_morph_display_word
        WHERE surah_no = ? AND is_promoted = 1 AND status = 'live'
        ORDER BY ayah_no, word_index`,
      [surah],
    ).catch(softFail([]));
    const idx = sibs.findIndex(s => s.ayah_no === ayah && s.word_index === wordIndex);
    const mkNav = (s: { ayah_no: number; word_index: number; surface_ar: string } | undefined) =>
      s ? { surah, ayah: s.ayah_no, word_index: s.word_index, surface_ar: s.surface_ar } : null;

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

    const occ = coreBlocks.find(b => b.type === 'occurrences');
    const occItems: any[] = (occ?.data as { items?: any[] })?.items ?? [];
    const contexts = occItems.map(it => ({
      key: it.ayah_key, ayah_key: it.ayah_key, kind_ar: it.kind_ar, en: it.en,
      text_ar: it.text_ar, note: it.note ?? '', source: it.source ?? 'Qurʾān', focus: !!it.focus,
      blocks: tempByKey.get(it.ayah_key) ?? [],
    }));

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
      register_options: registerOptions(regsAvail),
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

  async grid(
    surah: number,
    from?: number,
    to?: number,
    opts: { includeLemma?: boolean } = {},
  ): Promise<unknown[]> {
    type GridRow = WordRow & LemmaTierRow & GtRow & {
      sense_arc_en: string | null;
      sense_range_en: string | null;
      verb_form_ar: string | null;
      morphology_tag_json: string | null;

      lemma_uid: string | null;
    };
    const args: unknown[] = [surah];
    let range = '';
    if (from != null && to != null) {
      range = ' AND d.ayah_no BETWEEN ? AND ?';
      args.push(Math.min(from, to), Math.max(from, to));
    }

    const rows = await query<GridRow>(
      this.db,
      `SELECT d.id, d.surah_no, d.ayah_no, d.word_index,
              d.surface_ar, d.lemma_ar, d.lemma_ref,
              d.root_ar, d.root_display, d.word_group,
              d.pos_ar, d.pos_en,
              d.gloss_ar, d.gloss_en, d.gloss_ur,
              d.derived_type_ar, d.derived_type_en,
              d.wazn_ar, d.form_roman, d.form_ar, d.features_json,
              d.badge_color, d.is_anchor, d.frequency_quran,
              d.root_meaning_ar, d.root_meaning_en, d.quran_meanings_json,
              d.sense_arc_en, d.sense_range_en, d.verb_form_ar,
              o.morphology_tag_json AS morphology_tag_json,
              o.gt_case, o.gt_definiteness, o.gt_number, o.gt_gender, o.gt_person,
              o.gt_voice, o.gt_tense, o.gt_mood, o.gt_jumud, o.gt_derivation_type,
              o.gt_form_family, o.gt_readings_json,
              q.lx_lemma_ref AS lemma_uid,${LEMMA_TIER_SELECT}
         FROM qr_morph_display_word d
         LEFT JOIN qr_word_occurrence o
           ON o.surah = d.surah_no AND o.ayah = d.ayah_no AND o.word_index = d.word_index
         LEFT JOIN qr_lemma q ON q.id = d.lemma_ref
         LEFT JOIN qr_morph_display_lemma l ON l.id = d.lemma_ref AND l.status = 'live'
         ${FAMILY_JOIN}
        WHERE d.surah_no = ? AND d.is_promoted = 1 AND d.status = 'live'${range}
        ORDER BY d.ayah_no, d.word_index`,
      args,
    ).catch(softFail([] as GridRow[]));

    const [lemmas, terms, sources] = await Promise.all([
      this.resolveLemmaTier(rows.map(r => r.lemma_uid)),
      this.resolveTerms(rows.flatMap(gtIdsOf)),
      this.sourceLabels(rows.flatMap(r => readingSourceSlugs(r.gt_readings_json))),
    ]);

    return rows.map(w => {
      const al = w.lemma_uid ? lemmas[w.lemma_uid] : undefined;
      const bucket = w.word_group === 'verb' ? 'verb' : 'noun';
      const derivedAr = al?.form?.name_ar ?? w.l_derived_type_ar ?? w.derived_type_ar;
      const derivedEn = al?.form?.name_en ?? w.l_derived_type_en ?? w.derived_type_en;

      const alMeanings = (al?.senses ?? [])
        .filter(s => s.gloss_ar || s.gloss_en)
        .map(s => ({ ar: s.gloss_ar ?? '', en: s.gloss_en ?? '' }));
      const meanings = alMeanings.length
        ? alMeanings
        : ((hydrate(w.quran_meanings_json) as Array<{ ar: string; en: string }> | null) ?? null);
      const coreSense = (al?.senses ?? []).find(s => s.is_core) ?? al?.senses?.[0];
      const primaryArc = (al?.arcs ?? []).find(a => a.is_primary) ?? al?.arcs?.[0];

      return {
        id: w.id, surah: w.surah_no, ayah: w.ayah_no, word_index: w.word_index,
        surface_ar: w.surface_ar,
        lemma_ar: al?.lemma_ar ?? w.lemma_ar,
        root_ar: al?.root?.root_text ?? w.root_ar,
        root_display: w.root_display,

        lemma_ref: w.lemma_ref,
        lemma_uid: w.lemma_uid,
        root_uid: al?.root?.id ? `AL:${al.root.id}` : null,
        group: w.word_group, pos_ar: w.pos_ar, pos_en: w.pos_en,
        gloss: {
          ar: coreSense?.gloss_ar ?? w.l_gloss_ar ?? w.gloss_ar,
          en: coreSense?.gloss_en ?? w.l_gloss_en ?? w.gloss_en,
          ur: coreSense?.gloss_ur ?? w.l_gloss_ur ?? w.gloss_ur,
        },
        derived_type_ar: derivedAr, derived_type_en: derivedEn,
        wazn_ar: waznOf(al?.form?.wazn ?? w.l_wazn_ar ?? w.wazn_ar,
                        w.morphology_tag_json, w.lemma_ar, w.root_ar, bucket),
        form_roman: al?.form?.roman ?? w.f_roman ?? w.l_form_roman ?? w.form_roman,
        form_ar: al?.form?.name_ar ?? w.f_name_ar ?? w.l_form_ar ?? w.form_ar,
        root_meaning: {
          ar: al?.root?.meaning_core_ar ?? w.root_meaning_ar,
          en: al?.root?.meaning_core_en ?? w.root_meaning_en,
        },
        quran_meanings: meanings,
        badge_color: w.badge_color, is_anchor: !!w.is_anchor,
        frequency_quran: al?.frequency_quran ?? w.frequency_quran,

        feats: cardFeats(
          registryFeats(w.features_json)
            ?? buildFeats(bucket, w.morphology_tag_json, derivedAr, derivedEn,
                          al?.form?.example_ar ?? w.f_model_ar ?? w.l_verb_form_ar ?? w.verb_form_ar ?? null,
                          al?.form?.name_ar ?? w.f_name_ar, al?.form?.roman ?? w.f_roman),
          w, terms),
        contested: readingsOf(w.gt_readings_json).length > 1,
        readings: shapeReadings(w.gt_readings_json, terms, sources),
        sense_arc_en: primaryArc?.arc_en ?? w.sense_arc_en ?? null,
        sense_range_en: rangeOf(w.sense_range_en, meanings),

        ...(opts.includeLemma ? { lemma: al ?? null } : {}),
      };
    });
  }

  private async sourceLabels(slugs: string[]): Promise<Record<string, SourceLabel>> {
    const uniq = [...new Set(slugs)];
    if (!uniq.length) return {};
    const rows = await query<SourceLabel & { source_slug: string }>(
      this.db,
      `SELECT source_slug, title_ar, author_name_ar, death_year_hijri
         FROM qr_morph_display_source
        WHERE source_slug IN (${uniq.map(() => '?').join(',')})`,
      uniq,
    ).catch(softFail([]));
    return Object.fromEntries(rows.map(r => [r.source_slug, r]));
  }

  private async resolveTerms(ids: string[]): Promise<Record<string, TermLabel>> {
    const uniq = [...new Set(ids)];
    if (!this.al || !uniq.length) return {};
    try {
      return (await this.al.resolveTerms(uniq)).data ?? {};
    } catch {
      return {};
    }
  }

  private async resolveLemmaTier(
    refs: Array<string | null>,
  ): Promise<Record<string, ResolvedLemma>> {
    if (!this.al) return {};
    const ids = [...new Set(refs.filter((r): r is string => !!r))];
    if (!ids.length) return {};
    try {
      const res = await this.al.resolveLemmas(ids);
      return res.data ?? {};
    } catch {
      return {};
    }
  }
}
