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
  senses: Array<{
    sense_key: string; gloss_ar: string | null; gloss_en: string | null;
    gloss_ur: string | null; is_core: number; status: string;
  }>;
  arcs: Array<{
    arc_key: string; arc_ar: string | null; arc_en: string | null;
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

  resolveLemmas(ids: string[]): Promise<{ ok: true; data: Record<string, ResolvedLemma> }> {
    return callService(
      this.fetcher,
      `/al/lemmas/resolve?ids=${encodeURIComponent(ids.join(','))}`,
    );
  }
}

export function createAlClient(env: QuranEnv): AlClient | null {
  return env.AR_LINGUISTICS ? new AlClient(env.AR_LINGUISTICS) : null;
}
