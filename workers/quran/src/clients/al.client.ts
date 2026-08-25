// ─── AR_LINGUISTICS service client (from QR) ─────────────────────────────────
// Wraps callService() with typed return shapes for the AL routes QR needs.
// Rule: QR never binds DB_AL directly — all AL data comes through this client.

import { callService } from '../../../shared/src/service-client';
import type { QuranEnv } from '../env';

export interface LemmaInfo {
  id: string;           // AL:ULID
  root_text: string | null;
  lemma_ar: string;
  pos: string | null;
  gloss_en: string | null;
}

/** The lemma tier as `/al/lemmas/resolve` returns it, keyed by AL lemma id.
 *
 *  Deliberately structural rather than exhaustive: QR names the few fields the
 *  grid card renders and passes the rest through untouched, so a new field on
 *  the AL side reaches the app without a change here. `status` rides on every
 *  row because most of this layer is still draft — AL returns it rather than
 *  filtering, and the caller decides what it will show.
 *
 *  This is the whole point of the tier: the sense of كتاب is one row in AL, and
 *  all 260 occurrences resolve to it. Nothing is copied into km_quran. */
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
  id: string;           // AL:ULID
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

  /** Table-sourced expressions for a passage's surah:ayah range. */
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

  /** Deep root layer for the word modal — batched by root_norm. */
  getWordAnalysis(roots: string[]): Promise<{ ok: true; data: Record<string, unknown> }> {
    return callService(
      this.fetcher,
      `/al/word-analysis?roots=${encodeURIComponent(roots.join(','))}`,
    );
  }

  /** Lemma tier for a whole passage in one call — batched by AL lemma id.
   *  The counterpart to `getWordAnalysis`: that resolves the root tier, this
   *  the lemma tier, and between them km_quran needs to store neither. */
  resolveLemmas(ids: string[]): Promise<{ ok: true; data: Record<string, ResolvedLemma> }> {
    return callService(
      this.fetcher,
      `/al/lemmas/resolve?ids=${encodeURIComponent(ids.join(','))}`,
    );
  }
}

/** Create an AlClient from a QuranEnv, or return null if binding is absent. */
export function createAlClient(env: QuranEnv): AlClient | null {
  return env.AR_LINGUISTICS ? new AlClient(env.AR_LINGUISTICS) : null;
}
