// ── A drill's source: the rows it is built from, read and corrected by a reviewer ─────────────────
//
// Every drill is rebuilt from its domain's rows each time it is dealt, so a drill is fixed by fixing
// the rows it is built from. A domain worker locates them for a drill id (its own spec of what each
// kind is built from); this reads those rows' editable columns and writes back only those — a
// write naming any other table, row or column is refused. A kind built at request time from wider
// data (a random blank, options drawn from morphology) has no row of its own: it names the tables
// it is drawn from, to be fixed there.
//
// A drill's universal id is its module and its id: QR:questions:QR:Q:40:1:03, AR:grammar:EX12.

export interface SourceCol { col: string; json?: boolean }
/** A row a drill is built from, and the columns of it a reviewer may correct. */
export interface SourceRow { table: string; keyCol: string; key: string | number; cols: SourceCol[] }
/** What a drill id is built from: rows (editable), or the tables it is drawn from (derived). */
export interface Located { kind: string; rows: SourceRow[]; derived?: string[] }

/** A column as read: `value` as stored (JSON parsed), `text` as an editor shows it — JSON pretty-printed,
 *  so a client that rewrites object keys in transit never touches it. */
export interface SourceField { table: string; keyCol: string; key: string; col: string; json: boolean; value: unknown; text: string }
export interface SourceEdit { table: string; key: string | number; col: string; value: unknown }

const IDENT = /^[a-z_][a-z0-9_]*$/;

/** The located rows' editable columns, as they are now. Rows that are not there are left out. */
export async function readSource(db: D1Database, loc: Located): Promise<SourceField[]> {
  const out: SourceField[] = [];
  for (const r of loc.rows) {
    if (!IDENT.test(r.table) || !IDENT.test(r.keyCol) || !r.cols.every((c) => IDENT.test(c.col))) continue;
    const row = await db.prepare(`SELECT ${r.cols.map((c) => c.col).join(', ')} FROM ${r.table} WHERE ${r.keyCol} = ?`)
      .bind(r.key).first<Record<string, unknown>>();
    if (!row) continue;
    for (const c of r.cols) {
      let value: unknown = row[c.col] ?? null;
      if (c.json && typeof value === 'string') { try { value = JSON.parse(value); } catch { /* shown as stored */ } }
      const text = c.json && value !== null && typeof value !== 'string' ? JSON.stringify(value, null, 2) : String(value ?? '');
      out.push({ table: r.table, keyCol: r.keyCol, key: String(r.key), col: c.col, json: !!c.json, value, text });
    }
  }
  return out;
}

export class SourceError extends Error {}

/** Writes edits to the located rows. Each must name a located row's editable column; a JSON column
 *  takes a value that is (or parses as) JSON. Returns the rows changed. */
export async function writeSource(db: D1Database, loc: Located, edits: SourceEdit[]): Promise<number> {
  const stmts = [];
  for (const e of edits) {
    const row = loc.rows.find((r) => r.table === e.table && String(r.key) === String(e.key));
    const col = row?.cols.find((c) => c.col === e.col);
    if (!row || !col) throw new SourceError(`${e.table}.${e.col} of ${e.key} is not this drill's to edit`);
    let value: unknown = e.value;
    if (col.json) {
      try { value = JSON.stringify(typeof value === 'string' ? JSON.parse(value) : value); }
      catch { throw new SourceError(`${e.table}.${e.col} must be JSON`); }
    } else if (value !== null && typeof value !== 'string' && typeof value !== 'number') {
      throw new SourceError(`${e.table}.${e.col} takes text`);
    }
    stmts.push(db.prepare(`UPDATE ${row.table} SET ${col.col} = ? WHERE ${row.keyCol} = ?`).bind(value as string | number | null, row.key));
  }
  if (!stmts.length) return 0;
  const res = await db.batch(stmts);
  return res.reduce((n, r) => n + Number((r as { meta?: { changes?: number } }).meta?.changes ?? 0), 0);
}

/** The id after a prefix ('questions:' …), or null. */
export const after = (id: string, prefix: string) => (id.startsWith(prefix) ? id.slice(prefix.length) : null);

/** A drill's copy as filed: no card of its own inside it. */
export function filedCopy(drill: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!drill) return null;
  const { srs: _srs, ...rest } = drill;
  return rest;
}
