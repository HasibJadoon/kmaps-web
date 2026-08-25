// ─── LemmaRepo — all SQL for ar_ling_root_lemma ───────────────────────────────────

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';
import type { Lemma, LemmaCreate } from '../schemas/lemma.schema';

// The `Lemma` wire shape and the table's column names diverged: the table has
// lemma_text / part_of_speech / frequency_quran, and no gloss columns at all.
// Every SELECT here named the wire fields directly, so all three GET routes
// failed with `no such column` on every call. Aliasing keeps the published
// shape while reading what actually exists; the glosses have no home column,
// so they resolve NULL rather than pretending.
const SELECT = `
  l.id, l.lemma_text AS lemma_ar,
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

  /** Matches the vocalized surface and its bare form, so a query typed without
   *  diacritics still finds the lemma — there is no gloss column to search. */
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

  /** `ar_ling_root_lemma` carries no gloss column, so a create that supplies one
   *  is rejected rather than silently dropping it. A gloss belongs to a sense
   *  (`ar_ling_root_sense`), which is where it should be written. */
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
