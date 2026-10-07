import { query, queryOne, paginate } from '../../../shared/src/db';
import type { PaginateOptions } from '../../../shared/src/types';

/** A QAC feature bundle (ar_ling_root_lemma_sarf, MORPH:*): what a word occurrence references. */
export interface MorphologyEntry {
  id: string; pos: string | null; pattern: string | null; verb_form: string | null; root_type: string | null;
  gender: string | null; number: string | null; case_marker: string | null; definiteness: string | null;
  tense: string | null; voice: string | null; person: string | null; mood: string | null;
  derivation_type: string | null; qac_flags: string | null;
}

/** A lemma's own form facts (ar_ling_root_lemma_wazn, 200-LEM): pattern, derivation, مشتق/جامد, لازم/متعدٍّ. */
export interface LemmaForm {
  id: string; lemma_id: string; wazn_id: string; wazn_ar: string; derivation_id: string; derivation_ar: string | null;
  jumud_ref: string | null; transitivity_ref: string | null; base_verb: string | null; base_bab: string | null;
  basis: string; source_slug: string | null; source_ref: string | null; quote_ar: string | null;
}

/** A verb table or a template (ar_ling_root_form_paradigm, 22-BAB). */
export interface FormParadigm {
  id: string; paradigm_name: string; paradigm_type: string; verb_form: string | null; root_type: string | null;
  bab_key: string | null; root_id: string | null; lemma_id: string | null; status: string;
}

const BUNDLE = `id, pos, pattern, verb_form, root_type, gender, number, case_marker, definiteness, tense, voice, person, mood,
                derivation_type, qac_flags`;

export class MorphologyRepo {
  constructor(private db: D1Database) {}

  /** The lemma's form facts, best-attested first. */
  byLemma(lemmaId: string): Promise<LemmaForm[]> {
    return query<LemmaForm>(
      this.db,
      `SELECT w.id, w.lemma_id, w.wazn_id, z.wazn_ar, w.gram_term_ref AS derivation_id, g.name_ar AS derivation_ar,
              w.jumud_ref, w.transitivity_ref, w.base_verb, w.base_bab, w.basis, w.source_slug, w.source_ref, w.quote_ar
         FROM ar_ling_root_lemma_wazn w
         JOIN ar_ling_sarf_wazn z ON z.id = w.wazn_id
         LEFT JOIN ar_ling_gram_term g ON g.id = w.gram_term_ref
        WHERE w.status = 'live' AND w.lemma_id = ?
        ORDER BY w.is_disputed, CASE w.basis WHEN 'attested' THEN 0 WHEN 'source_attested' THEN 1 ELSE 2 END, w.id`,
      [lemmaId.replace(/^AL:/, '')],
    );
  }

  findById(id: string): Promise<MorphologyEntry | null> {
    return queryOne<MorphologyEntry>(this.db, `SELECT ${BUNDLE} FROM ar_ling_root_lemma_sarf WHERE id = ?`, [id]);
  }

  /** Verb tables and templates; `type` = paradigm_type (verb_form, conjugation_template, imperative_rule), `root` = global root id. */
  listParadigms(filter: { type?: string; root?: string } = {}, opts: PaginateOptions = {}) {
    const conds = [filter.type ? `paradigm_type = ?` : null, filter.root ? `root_id = ?` : null].filter(Boolean);
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const params = [filter.type, filter.root].filter((x): x is string => !!x);
    return paginate<FormParadigm>(
      this.db,
      `SELECT id, paradigm_name, paradigm_type, verb_form, root_type, bab_key, root_id, lemma_id, status
         FROM ar_ling_root_form_paradigm ${where} ORDER BY paradigm_type, root_id, verb_form, id`,
      `SELECT COUNT(*) AS count FROM ar_ling_root_form_paradigm ${where}`,
      params,
      opts,
    );
  }
}
