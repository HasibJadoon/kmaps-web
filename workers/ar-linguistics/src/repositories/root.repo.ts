// ─── RootRepo — all SQL for ar_ling_roots ─────────────────────────────────────

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';
import type { Root, RootCreate } from '../schemas/root.schema';

/** One root's identity card, as `ar_ling_roots` stores it. */
export interface RootGloss {
  root_normalized: string;
  root_text: string;
  root_letters: string | null;
  root_type: string | null;
  frequency_quran: number | null;
  meaning_core_en: string | null;
  meaning_core_ar: string | null;
  meaning_core_ur: string | null;
}

export class RootRepo {
  constructor(private db: D1Database) {}

  list(opts: PaginateOptions = {}) {
    return paginate<Root>(
      this.db,
      `SELECT id, root_text, root_normalized, letter_count, frequency, notes
       FROM ar_ling_roots
       ORDER BY root_text`,
      `SELECT COUNT(*) AS count FROM ar_ling_roots`,
      [],
      opts,
    );
  }

  findById(id: string): Promise<Root | null> {
    return queryOne<Root>(
      this.db,
      `SELECT id, root_text, root_normalized, letter_count, frequency, notes
       FROM ar_ling_roots WHERE id = ?`,
      [id],
    );
  }

  search(q: string, opts: PaginateOptions = {}) {
    const pattern = `%${q}%`;
    return paginate<Root>(
      this.db,
      `SELECT id, root_text, root_normalized, letter_count, frequency, notes
       FROM ar_ling_roots
       WHERE root_text LIKE ? OR root_normalized LIKE ?
       ORDER BY frequency DESC, root_text`,
      `SELECT COUNT(*) AS count FROM ar_ling_roots
       WHERE root_text LIKE ? OR root_normalized LIKE ?`,
      [pattern, pattern],
      opts,
    );
  }

  /**
   * The identity card of many roots at once — what a grid of root tiles needs
   * to say anything about a root beyond its three letters.
   *
   * The Quran worker can name a passage's roots but not gloss them: the glosses
   * live in DB_AL. Rather than let a caller fetch one root at a time (a passage
   * of twelve roots meant twelve round trips), this reads them in one pass and
   * keys the result by the normalized form the caller asked for.
   */
  glosses(roots: string[]): Promise<RootGloss[]> {
    if (!roots.length) return Promise.resolve([]);
    const marks = roots.map(() => '?').join(',');
    return query<RootGloss>(
      this.db,
      `SELECT root_normalized, root_text, root_letters, root_type,
              frequency_quran, meaning_core_en, meaning_core_ar, meaning_core_ur
       FROM ar_ling_roots
       WHERE root_normalized IN (${marks}) OR root_text IN (${marks})`,
      [...roots, ...roots],
    );
  }

  async create(input: RootCreate): Promise<Root> {
    const id = typedId('AL');
    const normalized = input.root_text.replace(/[\u064B-\u065F]/g, ''); // strip diacritics
    await execute(
      this.db,
      `INSERT INTO ar_ling_roots (id, root_text, root_normalized, letter_count, notes)
       VALUES (?, ?, ?, ?, ?)`,
      [id, input.root_text, normalized, input.letter_count ?? 3, input.notes ?? null],
    );
    return (await this.findById(id))!;
  }
}
