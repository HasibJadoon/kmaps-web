import { queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

export interface Note {
  id: string;
  title: string | null;
  content_md: string;
  resource_ref: string | null;
  domain: string | null;
  note_type: string | null;
  tags_json: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface NoteCreate {
  content_md: string;
  title?: string | null;
  resource_ref?: string | null;
}

// The table grew past the shape this repo was written for: the key is
// `note_id`, the prose is `body_text`, and a note now carries the domain it
// belongs to. Read under the old names so callers keep working.
const COLS = `note_id AS id, title, body_text AS content_md, passage_ref AS resource_ref,
              domain, note_type, tags_json, created_at, updated_at`;

export class NoteRepo {
  constructor(private db: D1Database) {}

  list(ref: string | null, opts: PaginateOptions = {}, domain: string | null = null,
       refPrefix: string | null = null) {
    const conds: string[] = ['deleted_at IS NULL'];
    const params: unknown[] = [];
    if (ref)    { conds.push('passage_ref = ?'); params.push(ref); }
    // every note written on one poem, in a single ask: the ref carries the
    // line it was written on, so the reader wants the whole prefix
    if (refPrefix) { conds.push('passage_ref LIKE ?'); params.push(refPrefix + '%'); }
    if (domain) { conds.push('domain = ?');      params.push(domain); }
    const where = `WHERE ${conds.join(' AND ')}`;
    return paginate<Note>(
      this.db,
      `SELECT ${COLS} FROM cm_notes ${where} ORDER BY created_at DESC`,
      `SELECT COUNT(*) AS count FROM cm_notes ${where}`,
      params, opts,
    );
  }

  findById(id: string): Promise<Note | null> {
    return queryOne<Note>(
      this.db, `SELECT ${COLS} FROM cm_notes WHERE note_id = ?`, [id],
    );
  }

  async create(input: NoteCreate): Promise<Note> {
    const id  = typedId('CM');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO cm_notes (id, title, content_md, resource_ref, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [id, input.title ?? null, input.content_md, input.resource_ref ?? null, now],
    );
    return (await this.findById(id))!;
  }

  async update(id: string, content_md: string, title?: string | null): Promise<Note | null> {
    const now  = new Date().toISOString();
    const sets = ['content_md = ?', 'updated_at = ?'];
    const vals: unknown[] = [content_md, now];
    if (title !== undefined) { sets.push('title = ?'); vals.push(title); }
    vals.push(id);
    await execute(this.db, `UPDATE cm_notes SET ${sets.join(', ')} WHERE id = ?`, vals);
    return this.findById(id);
  }
}
