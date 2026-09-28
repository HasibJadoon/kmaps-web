import { queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

export interface Tradition {
  id: string;
  slug: string;
  title: string;
  title_ar: string | null;
  /** Kept for older callers: the same as title / title_ar / tradition_type. */
  label_en: string;
  label_ar: string | null;
  category: string;
  tradition_type: string | null;
  parent_id: string | null;
  founded_period: string | null;
  geographic_origin: string | null;
  core_beliefs: string | null;
  description_md: string | null;
  created_at: string;
}

export interface TraditionCreate {
  slug: string;
  label_en: string;
  label_ar?: string | null;
  category?: string;
  parent_id?: string | null;
}

// The table's columns are title / title_ar / tradition_type; this repo was
// written against label_en / label_ar / category, which do not exist, so every
// read failed. The old names stay as aliases for whoever reads them.
const COLS = `id, slug, title, title_ar, title AS label_en, title_ar AS label_ar,
  COALESCE(tradition_type, 'other') AS category, tradition_type, parent_id, founded_period,
  geographic_origin, core_beliefs, description_md, created_at`;

export class TraditionRepo {
  constructor(private db: D1Database) {}

  list(category: string | null, opts: PaginateOptions = {}) {
    const where  = category ? 'WHERE tradition_type = ?' : '';
    const params = category ? [category] : [];
    return paginate<Tradition>(
      this.db,
      `SELECT ${COLS} FROM wv_traditions ${where} ORDER BY title`,
      `SELECT COUNT(*) AS count FROM wv_traditions ${where}`,
      params, opts,
    );
  }

  findById(id: string): Promise<Tradition | null> {
    return queryOne<Tradition>(
      this.db, `SELECT ${COLS} FROM wv_traditions WHERE id = ?`, [id],
    );
  }

  findBySlug(slug: string): Promise<Tradition | null> {
    return queryOne<Tradition>(
      this.db, `SELECT ${COLS} FROM wv_traditions WHERE slug = ?`, [slug],
    );
  }

  async create(input: TraditionCreate): Promise<Tradition> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO wv_traditions (id, slug, title, title_ar, tradition_type, parent_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.label_en, input.label_ar ?? null,
       input.category ?? 'other', input.parent_id ?? null, now, now],
    );
    return (await this.findById(id))!;
  }
}
