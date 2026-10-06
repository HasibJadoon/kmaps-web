import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';
import type { Lemma, LemmaCreate } from '../schemas/lemma.schema';

const SELECT = `
  l.id, coalesce(l.lemma_text_canonical, l.lemma_text) AS lemma_ar,
  l.root_id, r.root_text,
  l.part_of_speech AS pos,
  NULL AS gloss_en, NULL AS gloss_ar,
  l.frequency_quran AS frequency
FROM ar_ling_root_lemma l
LEFT JOIN ar_ling_roots r ON r.id = l.root_id`;

export class LemmaRepo {
  constructor(private db: D1Database) {}

  findById(id: string): Promise<Lemma | null> {
    return queryOne<Lemma>(
      this.db,
      `SELECT ${SELECT} WHERE l.id = ?`,
      [id],
    );
  }

  byRoot(rootId: string): Promise<Lemma[]> {
    return query<Lemma>(
      this.db,
      `SELECT ${SELECT} WHERE l.root_id = ? ORDER BY l.lemma_text`,
      [rootId],
    );
  }

  search(q: string, opts: PaginateOptions = {}) {
    const pattern = `%${q}%`;
    return paginate<Lemma>(
      this.db,
      `SELECT ${SELECT}
       WHERE l.lemma_text LIKE ? OR l.lemma_text_bare LIKE ?
       ORDER BY l.frequency_quran DESC, l.lemma_text`,
      `SELECT COUNT(*) AS count FROM ar_ling_root_lemma l
       WHERE l.lemma_text LIKE ? OR l.lemma_text_bare LIKE ?`,
      [pattern, pattern],
      opts,
    );
  }

  async create(input: LemmaCreate): Promise<Lemma> {
    if (input.gloss_en || input.gloss_ar) {
      throw new Error(
        'ar_ling_root_lemma stores no gloss; write it as a lemma-scoped ar_ling_root_sense instead',
      );
    }
    const id = typedId('AL');
    await execute(
      this.db,
      `INSERT INTO ar_ling_root_lemma (id, lemma_text, root_id, part_of_speech)
       VALUES (?, ?, ?, ?)`,
      [id, input.lemma_ar, input.root_id ?? null, input.pos ?? 'noun'],
    );
    return (await this.findById(id))!;
  }
}
