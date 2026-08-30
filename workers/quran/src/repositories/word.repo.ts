import { query, paginate } from '../../../shared/src/db';
import type { PaginateOptions } from '../../../shared/src/types';
import type { WordOccurrence } from '../schemas/word.schema';

const SELECT = `
  id, surah, ayah, word_index,
  word_text, word_text_bare,
  root, lemma, pos, morphology_tag, morphology_tag_json
FROM qr_word_occurrence`;

export class WordRepo {
  constructor(private db: D1Database) {}

  byAyah(surahId: number, ayahNum: number): Promise<WordOccurrence[]> {
    return query<WordOccurrence>(
      this.db,
      `SELECT ${SELECT}
       WHERE surah = ? AND ayah = ?
       ORDER BY word_index`,
      [surahId, ayahNum],
    );
  }

  byRange(surahId: number, from: number, to: number): Promise<WordOccurrence[]> {
    return query<WordOccurrence>(
      this.db,
      `SELECT ${SELECT}
       WHERE surah = ? AND ayah BETWEEN ? AND ?
       ORDER BY ayah, word_index`,
      [surahId, from, to],
    );
  }

  byLemmaRef(lemma: string, opts: PaginateOptions = {}) {
    return paginate<WordOccurrence>(
      this.db,
      `SELECT ${SELECT} WHERE lemma = ? ORDER BY surah, ayah, word_index`,
      `SELECT COUNT(*) AS count FROM qr_word_occurrence WHERE lemma = ?`,
      [lemma],
      opts,
    );
  }

  byRoot(root: string): Promise<WordOccurrence[]> {
    return query<WordOccurrence>(
      this.db,
      `SELECT ${SELECT} WHERE root = ? ORDER BY surah, ayah, word_index`,
      [root],
    );
  }
}
