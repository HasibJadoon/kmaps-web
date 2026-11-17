import { query, queryOne } from '../../../shared/src/db';

export interface TranslationSource {
  id: string;
  slug: string;
  language: string;
  author: string;
  title: string;
  is_default: number;
}

export interface Translation {
  id: string;
  surah: number;
  ayah: number;
  source_id: string;
  text: string;
  /// who made it, from qr_translation_source (null when the source row is missing)
  translator?: string | null;
  edition?: string | null;
  language?: string | null;
  slug?: string | null;
  is_default?: number | null;
}

export class TranslationRepo {
  constructor(private db: D1Database) {}

  listSources(): Promise<TranslationSource[]> {
    return query<TranslationSource>(
      this.db,
      `SELECT id, source_code AS slug, language, translator_name AS author, edition AS title, is_default
       FROM qr_translation_source
       ORDER BY language, translator_name`,
    );
  }

  findSource(id: string): Promise<TranslationSource | null> {
    return queryOne<TranslationSource>(
      this.db,
      `SELECT id, source_code AS slug, language, translator_name AS author, edition AS title, is_default
       FROM qr_translation_source WHERE id = ?`,
      [id],
    );
  }

  /// `named` adds who made each one (from qr_translation_source) and orders them default first, then by language
  /// and translator; without it the rows are as before (a different URL, so a different cache entry).
  byAyah(surahId: number, ayahNum: number, named = false): Promise<Translation[]> {
    if (!named) {
      return query<Translation>(
        this.db,
        `SELECT t.id, t.surah, t.ayah, t.source_id, t.translation_text AS text
         FROM qr_translation t
         WHERE t.surah = ? AND t.ayah = ?`,
        [surahId, ayahNum],
      );
    }
    return query<Translation>(
      this.db,
      `SELECT t.id, t.surah, t.ayah, t.source_id, t.translation_text AS text,
              s.translator_name AS translator, s.edition, s.language, s.source_code AS slug, s.is_default
       FROM qr_translation t
       LEFT JOIN qr_translation_source s ON s.id = t.source_id
       WHERE t.surah = ? AND t.ayah = ?
       ORDER BY COALESCE(s.is_default, 0) DESC, s.language, s.translator_name`,
      [surahId, ayahNum],
    );
  }

  bySourceAndRange(
    sourceId: string,
    surahId: number,
    from: number,
    to: number,
  ): Promise<Translation[]> {
    return query<Translation>(
      this.db,
      `SELECT id, surah, ayah, source_id, translation_text AS text
       FROM qr_translation
       WHERE source_id = ? AND surah = ? AND ayah BETWEEN ? AND ?
       ORDER BY ayah`,
      [sourceId, surahId, from, to],
    );
  }
}
