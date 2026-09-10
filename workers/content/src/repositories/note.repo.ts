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
  quote: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface NoteCreate {
  core_user_ref: string;
  content_md: string;
  title?: string | null;
  /** The passage this note is about: ARL / WVB / QRL, one rule everywhere. */
  resource_ref?: string | null;
  domain?: string | null;
  note_type?: string | null;
  /** The words themselves, kept so the note still reads if the reader is gone. */
  quote?: string | null;
  tags?: string[] | null;
}

// The table grew past the shape this repo was written for: the key is
// `note_id`, the prose is `body_text`, and a note now carries the domain it
// belongs to. Read under the old names so callers keep working.
const COLS = `note_id AS id, title, body_text AS content_md, passage_ref AS resource_ref,
              domain, note_type, tags_json,
              json_extract(meta_json,'$.quote') AS quote, created_at, updated_at`;

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

  // Writing goes to the same columns the read path uses. The note keeps the
  // passage it was written about *and* the words it quoted: the reference finds
  // the line again, the quote survives even if that edition does not.
  async create(input: NoteCreate): Promise<Note> {
    const id  = typedId('CM');
    const now = new Date().toISOString();
    const meta = input.quote ? JSON.stringify({ quote: input.quote }) : '{}';
    await execute(
      this.db,
      `INSERT INTO cm_notes
         (note_id, core_user_ref, note_type, title, body_text, passage_ref,
          domain, tags_json, meta_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.core_user_ref, input.note_type ?? 'passage', input.title ?? null,
       input.content_md, input.resource_ref ?? null, input.domain ?? null,
       JSON.stringify(input.tags ?? []), meta, now, now],
    );
    return (await this.findById(id))!;
  }

  async update(id: string, content_md: string, title?: string | null): Promise<Note | null> {
    const now  = new Date().toISOString();
    const sets = ['body_text = ?', 'updated_at = ?'];
    const vals: unknown[] = [content_md, now];
    if (title !== undefined) { sets.push('title = ?'); vals.push(title); }
    vals.push(id);
    await execute(this.db, `UPDATE cm_notes SET ${sets.join(', ')} WHERE note_id = ?`, vals);
    return this.findById(id);
  }
}
