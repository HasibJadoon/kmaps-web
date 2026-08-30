import { queryOne, query, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

export interface Highlight {
  id: string;
  resource_ref: string;
  anchor_start: string;
  anchor_end: string;
  text_excerpt: string | null;
  color: string | null;
  note_ref: string | null;
  created_at: string;
}

export interface HighlightCreate {
  resource_ref: string;
  anchor_start: string;
  anchor_end: string;
  text_excerpt?: string | null;
  color?: string | null;
  note_ref?: string | null;
}

const COLS = `id, resource_ref, anchor_start, anchor_end,
              text_excerpt, color, note_ref, created_at`;

export class HighlightRepo {
  constructor(private db: D1Database) {}

  byResource(resourceRef: string): Promise<Highlight[]> {
    return query<Highlight>(
      this.db,
      `SELECT ${COLS} FROM cm_highlights WHERE resource_ref = ? ORDER BY created_at`,
      [resourceRef],
    );
  }

  list(resourceRef: string | null, opts: PaginateOptions = {}) {
    const where  = resourceRef ? 'WHERE resource_ref = ?' : '';
    const params = resourceRef ? [resourceRef] : [];
    return paginate<Highlight>(
      this.db,
      `SELECT ${COLS} FROM cm_highlights ${where} ORDER BY created_at DESC`,
      `SELECT COUNT(*) AS count FROM cm_highlights ${where}`,
      params, opts,
    );
  }

  findById(id: string): Promise<Highlight | null> {
    return queryOne<Highlight>(
      this.db, `SELECT ${COLS} FROM cm_highlights WHERE id = ?`, [id],
    );
  }

  async create(input: HighlightCreate): Promise<Highlight> {
    const id  = typedId('CM');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO cm_highlights
         (id, resource_ref, anchor_start, anchor_end, text_excerpt, color, note_ref, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.resource_ref, input.anchor_start, input.anchor_end,
       input.text_excerpt ?? null, input.color ?? null, input.note_ref ?? null, now],
    );
    return (await this.findById(id))!;
  }

  async delete(id: string): Promise<void> {
    await execute(this.db, `DELETE FROM cm_highlights WHERE id = ?`, [id]);
  }
}
