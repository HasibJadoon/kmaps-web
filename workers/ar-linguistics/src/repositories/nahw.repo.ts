import { query, queryOne, paginate } from '../../../shared/src/db';
import type { PaginateOptions } from '../../../shared/src/types';

// Naḥw concepts are the grammar-term registry's NH terms (ar_ling_gram_term). The old
// ar_ling_nahw_concepts table was never carried into this database; the route reads the registry
// and answers in the shape it always promised: concept_type is the term's category, the example
// its first Qurʾānic shāhid.

export interface NahwConcept {
  id: string;
  concept_name_ar: string;
  concept_name_en: string;
  concept_type: string;
  definition_ar: string | null;
  definition_en: string | null;
  example_ar: string | null;
  irab_label: string | null;
  parent_id: string | null;
}

const COLS = `t.id, t.name_ar AS concept_name_ar, t.name_en AS concept_name_en, t.category_key AS concept_type,
              t.definition_ar, COALESCE(t.definition_en, t.short_en) AS definition_en,
              (SELECT e.example_ar FROM ar_ling_gram_term_example e WHERE e.term_id = t.id ORDER BY e.sort_order LIMIT 1) AS example_ar,
              CASE WHEN t.category_key = 'irab_role' THEN t.name_ar END AS irab_label, t.parent_term_id AS parent_id`;
const LIVE = `t.status = 'live' AND t.discipline = 'NH'`;

export class NahwRepo {
  constructor(private db: D1Database) {}

  list(category?: string, opts: PaginateOptions = {}) {
    const where = category ? `AND t.category_key = ?` : '';
    const params = category ? [category] : [];
    return paginate<NahwConcept>(
      this.db,
      `SELECT ${COLS} FROM ar_ling_gram_term t WHERE ${LIVE} ${where} ORDER BY t.category_key, t.term_order, t.name_ar`,
      `SELECT COUNT(*) AS count FROM ar_ling_gram_term t WHERE ${LIVE} ${where}`,
      params,
      opts,
    );
  }

  findById(id: string): Promise<NahwConcept | null> {
    return queryOne<NahwConcept>(this.db, `SELECT ${COLS} FROM ar_ling_gram_term t WHERE ${LIVE} AND t.id = ?`, [id]);
  }

  findByKey(key: string): Promise<NahwConcept | null> {
    return queryOne<NahwConcept>(this.db,
      `SELECT ${COLS} FROM ar_ling_gram_term t WHERE ${LIVE} AND (t.id = ? OR t.term_key = ?) LIMIT 1`, [key, key]);
  }

  children(parentId: string): Promise<NahwConcept[]> {
    return query<NahwConcept>(this.db,
      `SELECT ${COLS} FROM ar_ling_gram_term t WHERE ${LIVE} AND t.parent_term_id = ? ORDER BY t.term_order, t.name_ar`, [parentId]);
  }
}
