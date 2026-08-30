import { query, queryOne, paginate } from '../../../shared/src/db';
import type { PaginateOptions } from '../../../shared/src/types';

export interface MorphologyEntry {
  id: string;
  lemma_id: string;
  form_ar: string;
  stem_type: string | null;
  pattern: string | null;
  tags: string | null;
}

export interface FormParadigm {
  id: string;
  paradigm_name: string;
  category: string;
  pattern: string;
  example_ar: string | null;
}

export class MorphologyRepo {
  constructor(private db: D1Database) {}

  byLemma(lemmaId: string): Promise<MorphologyEntry[]> {
    return query<MorphologyEntry>(
      this.db,
      `SELECT id, lemma_id, form_ar, stem_type, pattern, tags
       FROM ar_ling_root_lemma_sarf
       WHERE lemma_id = ?
       ORDER BY stem_type, form_ar`,
      [lemmaId],
    );
  }

  findById(id: string): Promise<MorphologyEntry | null> {
    return queryOne<MorphologyEntry>(
      this.db,
      `SELECT id, lemma_id, form_ar, stem_type, pattern, tags
       FROM ar_ling_root_lemma_sarf WHERE id = ?`,
      [id],
    );
  }

  listParadigms(category?: string, opts: PaginateOptions = {}) {
    const where = category ? `WHERE category = ?` : '';
    const params = category ? [category] : [];
    return paginate<FormParadigm>(
      this.db,
      `SELECT id, paradigm_name, category, pattern, example_ar
       FROM ar_ling_root_form_paradigm ${where} ORDER BY category, paradigm_name`,
      `SELECT COUNT(*) AS count FROM ar_ling_root_form_paradigm ${where}`,
      params,
      opts,
    );
  }
}
