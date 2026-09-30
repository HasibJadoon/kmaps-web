import { query, queryOne, paginate } from '../../../shared/src/db';
import type { PaginateOptions } from '../../../shared/src/types';

// Balāgha concepts are the grammar-term registry's BL terms (ar_ling_gram_term); a branch is its
// category (balagha_maani | balagha_bayan | balagha_badi …). The old ar_ling_balagha_concepts /
// _examples tables were never carried into this database; the registry's terms and their
// shawāhid (ar_ling_gram_term_example) are what stand in for them.

export interface BalaghaConcept {
  id: string;
  concept_key: string;
  label_ar: string;
  label_en: string;
  branch: string;
  description: string | null;
  parent_id: string | null;
}

export interface BalaghaExample {
  id: string;
  concept_id: string;
  text_ar: string;
  source_ref: string | null;
  explanation: string | null;
}

const COLS = `t.id, t.term_key AS concept_key, t.name_ar AS label_ar, t.name_en AS label_en, t.category_key AS branch,
              COALESCE(t.definition_en, t.short_en, t.definition_ar) AS description, t.parent_term_id AS parent_id`;
const LIVE = `t.status = 'live' AND t.discipline = 'BL'`;

export class BalaghaRepo {
  constructor(private db: D1Database) {}

  listConcepts(branch?: string, opts: PaginateOptions = {}) {
    const where = branch ? `AND t.category_key = ?` : '';
    const params = branch ? [branch] : [];
    return paginate<BalaghaConcept>(
      this.db,
      `SELECT ${COLS} FROM ar_ling_gram_term t WHERE ${LIVE} ${where} ORDER BY t.category_key, t.term_order, t.name_ar`,
      `SELECT COUNT(*) AS count FROM ar_ling_gram_term t WHERE ${LIVE} ${where}`,
      params,
      opts,
    );
  }

  findById(id: string): Promise<BalaghaConcept | null> {
    return queryOne<BalaghaConcept>(this.db, `SELECT ${COLS} FROM ar_ling_gram_term t WHERE ${LIVE} AND t.id = ?`, [id]);
  }

  examplesByConcept(conceptId: string): Promise<BalaghaExample[]> {
    return query<BalaghaExample>(this.db,
      `SELECT id, term_id AS concept_id, example_ar AS text_ar, COALESCE(qr_ref, source_ref) AS source_ref, gloss_en AS explanation
         FROM ar_ling_gram_term_example WHERE term_id = ? ORDER BY sort_order`, [conceptId]);
  }
}
