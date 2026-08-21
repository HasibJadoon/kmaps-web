// ─── The sensor reader, shared by every domain worker ─────────────────────────
//
// One internal route per worker executes the five reader kinds against its own
// database. The whitelist is structural: table and column names must be
// identifiers AND resolve in this database's sqlite_master; `sql_scalar` (the
// one reader whose definition IS SQL, held in km_core's registry) must be a
// single SELECT. The route itself is internal-only — it is never mounted on a
// public module path, and the backend strips nothing to it.
//
// This is the actuator the whole rule implies: a percentage nobody can
// recompute mechanically is a hand-written number with a sensor's name on it.

export interface SenseRequest {
  reader: 'row_exists' | 'row_ratio' | 'col_fraction' | 'sql_scalar' | 'ref_resolves';
  table?: string;
  /** Column the scope binds on (e.g. root_norm) — with `value`, narrows the count. */
  bind_col?: string;
  bind_value?: string;
  /** col_fraction: the column whose non-empty share is the reading. */
  col?: string;
  /** `id` means bind_col holds this database's own key, not the scope string.
   *  The owning worker resolves it — km_core does not hold other databases'
   *  primary keys, and matching a ULID column against 'نزل' returns zero for
   *  every root rather than failing. */
  bind_kind?: 'text' | 'id';
  /** The scope the value names: root | lemma | passage … */
  scope_kind?: string;
  /** row_ratio: denominator. */
  expected?: number;
  /** sql_scalar: a single SELECT returning one numeric column. Registry-authored. */
  sql?: string;
  params?: (string | number)[];
}

export interface SenseResult {
  ok: boolean;
  reading?: number;
  error?: string;
}

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

async function tableExists(db: D1Database, table: string): Promise<boolean> {
  const row = await db
    .prepare(`SELECT 1 AS x FROM sqlite_master WHERE type IN ('table','view') AND name = ?`)
    .bind(table).first<{ x: number }>();
  return !!row;
}

export async function sense(db: D1Database, req: SenseRequest): Promise<SenseResult> {
  try {
    switch (req.reader) {
      case 'row_exists':
      case 'row_ratio': {
        if (!req.table || !IDENT.test(req.table)) return { ok: false, error: 'bad table' };
        if (!(await tableExists(db, req.table))) return { ok: false, error: `no such table ${req.table}` };
        let sql = `SELECT COUNT(*) AS n FROM ${req.table}`;
        const params: (string | number)[] = [];
        if (req.bind_col) {
          if (!IDENT.test(req.bind_col)) return { ok: false, error: 'bad bind_col' };
          sql += ` WHERE ${req.bind_col} = ?`;
          params.push(req.bind_value ?? '');
        }
        const row = await db.prepare(sql).bind(...params).first<{ n: number }>();
        const n = row?.n ?? 0;
        if (req.reader === 'row_exists') return { ok: true, reading: n > 0 ? 1 : 0 };
        const expected = req.expected && req.expected > 0 ? req.expected : 1;
        return { ok: true, reading: Math.min(1, n / expected) };
      }
      case 'col_fraction': {
        if (!req.table || !IDENT.test(req.table)) return { ok: false, error: 'bad table' };
        if (!req.col || !IDENT.test(req.col)) return { ok: false, error: 'bad col' };
        if (!(await tableExists(db, req.table))) return { ok: false, error: `no such table ${req.table}` };
        let where = '';
        const params: (string | number)[] = [];
        if (req.bind_col) {
          if (!IDENT.test(req.bind_col)) return { ok: false, error: 'bad bind_col' };
          where = ` WHERE ${req.bind_col} = ?`;
          params.push(req.bind_value ?? '');
        }
        const row = await db.prepare(
          `SELECT COUNT(*) AS total,
                  SUM(CASE WHEN ${req.col} IS NOT NULL AND TRIM(CAST(${req.col} AS TEXT)) != ''
                       AND TRIM(CAST(${req.col} AS TEXT)) NOT IN ('{}','[]') THEN 1 ELSE 0 END) AS filled
             FROM ${req.table}${where}`,
        ).bind(...params).first<{ total: number; filled: number }>();
        const total = row?.total ?? 0;
        if (total === 0) return { ok: true, reading: 0 };
        return { ok: true, reading: (row?.filled ?? 0) / total };
      }
      case 'ref_resolves': {
        // A reference resolves when the named table holds a row for the value.
        if (!req.table || !IDENT.test(req.table) || !req.bind_col || !IDENT.test(req.bind_col)) {
          return { ok: false, error: 'bad ref target' };
        }
        if (!(await tableExists(db, req.table))) return { ok: false, error: `no such table ${req.table}` };
        const row = await db.prepare(
          `SELECT COUNT(*) AS n FROM ${req.table} WHERE ${req.bind_col} = ?`,
        ).bind(req.bind_value ?? '').first<{ n: number }>();
        return { ok: true, reading: (row?.n ?? 0) > 0 ? 1 : 0 };
      }
      case 'sql_scalar': {
        const sql = (req.sql ?? '').trim();
        // Registry-authored, but held to shape: one SELECT, no statement chain.
        if (!/^SELECT\b/i.test(sql) || sql.includes(';')) {
          return { ok: false, error: 'sql_scalar must be a single SELECT' };
        }
        const row = await db.prepare(sql).bind(...(req.params ?? [])).first<Record<string, unknown>>();
        const first = row ? Object.values(row)[0] : null;
        const value = typeof first === 'number' ? first : Number(first ?? 0);
        return { ok: true, reading: Number.isFinite(value) ? value : 0 };
      }
      default:
        return { ok: false, error: `unknown reader` };
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'sense failed' };
  }
}
