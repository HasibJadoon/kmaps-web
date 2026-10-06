import { callService } from '../../../shared/src/service-client';
import type { QuranEnv } from '../env';

export interface LemmaInfo {
  id: string;
  root_text: string | null;
  lemma_ar: string;
  pos: string | null;
  gloss_en: string | null;
}

export interface ResolvedLemma {
  id: string;
  lemma_ar: string;
  pos: string | null;
  verb_form: string | null;
  frequency_quran: number;
  root: {
    id: string | null; root_text: string | null; root_norm: string | null;
    meaning_core_ar: string | null; meaning_core_en: string | null;
  } | null;
  form: {
    roman: string | null; name_ar: string; name_en: string | null;
    wazn: string | null; example_ar: string | null; kind: string;
    derivation_type: string | null;
  } | null;
  /** the lemma's pattern and derivation, best-attested first */
  wazn?: Array<{
    id: string; wazn_id: string; wazn_ar: string; derivation_id: string; derivation_ar: string;
    family_id: string | null; family_ar: string | null; jumud_id?: string | null; jumud_ar?: string | null;
    transitivity_id?: string | null; transitivity_ar?: string | null; base_verb: string | null; basis: string;
    source_slug: string | null; source_ref: string | null; quote_ar: string | null;
  }>;
  senses: Array<{
    id: string; label_ar: string | null; label_en: string | null;
    sense_key: string; gloss_ar: string | null; gloss_en: string | null;
    gloss_ur: string | null; is_core: number; status: string;
  }>;
  arcs: Array<{
    id: string; arc_key: string; arc_ar: string | null; arc_en: string | null;
    arc_ur: string | null; is_primary: number; status: string;
  }>;
  governance: unknown[];
  furuq: unknown[];
  tabir: unknown[];
  coverage: Record<string, boolean>;
}

export interface MorphologyInfo {
  id: string;
  form_ar: string;
  stem_type: string | null;
  pattern: string | null;
  tags: string | null;
}

export interface ExpressionItem {
  id: string;
  ayah: number;
  ar: string | null;
  en: string | null;
  type: string | null;
}

export class AlClient {
  constructor(private fetcher: Fetcher) {}

  getLemma(id: string): Promise<{ ok: true; data: LemmaInfo }> {
    return callService(this.fetcher, `/al/lemmas/${encodeURIComponent(id)}`);
  }

  getExpressionsByQuran(
    surah: number,
    from: number,
    to: number,
  ): Promise<{ ok: true; data: ExpressionItem[] }> {
    return callService(
      this.fetcher,
      `/al/expressions/by-quran/${surah}?from=${from}&to=${to}`,
    );
  }

  getMorphology(id: string): Promise<{ ok: true; data: MorphologyInfo }> {
    return callService(this.fetcher, `/al/morphology/${encodeURIComponent(id)}`);
  }

  getLemmasByRoot(rootText: string): Promise<{ ok: true; data: LemmaInfo[] }> {
    return callService(
      this.fetcher,
      `/al/lemmas?root=${encodeURIComponent(rootText)}`,
    );
  }

  getWordAnalysis(roots: string[]): Promise<{ ok: true; data: Record<string, unknown> }> {
    return callService(
      this.fetcher,
      `/al/word-analysis?roots=${encodeURIComponent(roots.join(','))}`,
    );
  }

  resolveTerms(ids: string[]): Promise<{ ok: true; data: Record<string, GramTermLabel> }> {
    return callService(
      this.fetcher,
      `/al/gram/terms/resolve?ids=${encodeURIComponent([...ids].sort().join(','))}`,
    );
  }

  /** The الصرف of a passage's roots and lemmas, by global id: verb tables, prepositions, opposites, root
   *  pictures, plurals and near-synonym sets (/al/sarf/sheet). */
  sarfSheet(roots: string[], lemmas: string[], opts: { refresh?: boolean } = {}): Promise<{ ok: true; data: AlSarfSheet }> {
    return callService(
      this.fetcher,
      `/al/sarf/sheet?roots=${encodeURIComponent(roots.join(','))}&lemmas=${encodeURIComponent(lemmas.join(','))}${opts.refresh ? '&refresh=1' : ''}`,
    );
  }

  /** `refresh` rebuilds AL's kept answer too — a refresh at the top reaches the language data under it. */
  resolveLemmas(ids: string[], opts: { refresh?: boolean } = {}): Promise<{ ok: true; data: Record<string, ResolvedLemma> }> {
    return callService(
      this.fetcher,
      `/al/lemmas/resolve?ids=${encodeURIComponent(ids.join(','))}${opts.refresh ? '&refresh=1' : ''}`,
    );
  }
}

type AlCite = { surah: number; ayah: number; needle: string };
export interface AlSarfSheet {
  roots: Record<string, {
    root_id: string; root_norm: string | null; picture: { en: string; ar: string | null } | null;
    paradigms: Array<{ id: string; root_id: string; lemma_id: string | null; verb_form: string | null; bab_key: string | null;
                       source_ref: string | null; paradigm: Record<string, unknown> }>;
    preps: Array<{ id: string; root_id: string; lemma_id: string | null; verb_form: string | null; harf: string | null;
                   harf_term_id: string | null; frame_ar: string | null; meaning_en: string | null; cite: AlCite;
                   qr_ref: string | null; sort_order: number }>;
    opposites: Array<{ id: string; antonym_ar: string; antonym_root_id: string | null; antonym_en: string | null;
                       relation_kind: string; note_en: string | null; source_ref: string | null;
                       lemma_id: string | null; for_word_ar: string | null; for_word_en: string | null;
                       display: { quran?: AlCite[] } | null }>;
    constructions?: Array<{ id: string; lemma_id: string; lemma_ar: string; construction_ar: string; harf: string | null;
                            attest_count: number; arc_ar: string; arc_en: string; boundary_note_en: string | null;
                            branches: Array<{ kind?: string; label?: string; arc_en?: string }>;
                            ex_surah: number | null; ex_ayah: number | null; ex_text: string | null; ex_en: string | null; ex_note: string | null }>;
  }>;
  lemmas: Record<string, { plurals: Array<{ plural_ar: string; kind_ref: string; kind_ar: string; wazn_ar: string | null;
                                            surah: number | null; ayah: number | null; needle: string | null; note_en: string | null }> }>;
  sets: Array<{ id: string; title_en: string | null; title_ar: string | null; contrast: string | null;
                members: Array<{ lemma_id: string; root_id: string | null; ar: string; en: string | null; contrast: string | null; cite: AlCite | null }> }>;
}

export interface GramTermLabel {
  id: string; category_key: string; term_key: string;
  name_ar: string; name_en: string | null; name_ur: string | null;
}

export function createAlClient(env: QuranEnv): AlClient | null {
  return env.AR_LINGUISTICS ? new AlClient(env.AR_LINGUISTICS) : null;
}
