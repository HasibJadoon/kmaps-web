export interface SenseRequest {
  reader: 'row_exists' | 'row_ratio' | 'col_fraction' | 'sql_scalar' | 'ref_resolves';
  table?: string;

  bind_col?: string;
  bind_value?: string;

  col?: string;

  bind_kind?: 'text' | 'id';

  scope_kind?: string;

  expected?: number;

  sql?: string;
  params?: (string | number)[];
}

export interface RowsRequest {
  table: string;
  bind_col: string;
  bind_value: string;

  bind_values?: string[];

  bind_via?: string;
  range_from?: number;
  range_to?: number;

  filter_col?: string;
  filter_value?: string;
  limit?: number;
}

export interface RowsResult {
  ok: boolean;
  rows?: Record<string, unknown>[];

  total?: number;
  error?: string;
}

export interface SenseResult {
  ok: boolean;
  reading?: number;
  error?: string;
}

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

const MAX_BIND_VALUES = 200;

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

const ROW_ORDER_KEYS = [
  'surah', 'ayah', 'ayah_from', 'sentence_seq', 'clause_order', 'step_seq',
  'step_no', 'stage_no', 'block_seq', 'chunk_seq', 'unit_index', 'slot_index',
  'perm_index', 'sort_order', 'display_order', 'seq',
];

const orderCache = new Map<string, string>();

async function orderingFor(db: D1Database, table: string): Promise<string> {
  if (!IDENT.test(table)) return '';
  const cached = orderCache.get(table);
  if (cached !== undefined) return cached;

  const cols = await db.prepare('SELECT name FROM pragma_table_info(?)')
    .bind(table).all<{ name: string }>().catch(() => null);
  const have = new Set((cols?.results ?? []).map(c => c.name));

  const keys = ROW_ORDER_KEYS.filter(k => have.has(k)).slice(0, 2);

  if (have.has('id') && !keys.includes('id')) keys.push('id');
  const clause = keys.length ? ` ORDER BY ${keys.join(', ')}` : '';
  orderCache.set(table, clause);
  return clause;
}

export async function readRows(db: D1Database, req: RowsRequest): Promise<RowsResult> {
  try {
    if (!IDENT.test(req.table)) return { ok: false, error: 'bad table' };
    if (!IDENT.test(req.bind_col)) return { ok: false, error: 'bad bind_col' };
    if (!(await tableExists(db, req.table))) return { ok: false, error: `no such table ${req.table}` };

    const many = (req.bind_values ?? []).filter(v => typeof v === 'string' && v !== '');
    if (many.length > MAX_BIND_VALUES) return { ok: false, error: 'too many bind values' };
    let where: string;
    const params: (string | number)[] = [];
    if (many.length) {
      where = `${req.bind_col} IN (${many.map(() => '?').join(',')})`;
      params.push(...many);
    } else {
      where = `${req.bind_col} = ?`;
      params.push(req.bind_value);
    }

    const range = (req.bind_via ?? '').split(',').map(c => c.trim()).filter(Boolean);
    if (range.length === 2 && req.range_from != null && req.range_to != null) {
      if (!range.every(c => IDENT.test(c))) return { ok: false, error: 'bad range columns' };
      where += ` AND ${range[0]} >= ? AND ${range[1]} <= ?`;
      params.push(req.range_from, req.range_to);
    }
    if (req.filter_col != null && req.filter_value != null) {
      if (!IDENT.test(req.filter_col)) return { ok: false, error: 'bad filter_col' };
      where += ` AND ${req.filter_col} = ?`;
      params.push(req.filter_value);
    }
    const limit = Math.min(200, Math.max(1, req.limit ?? 60));

    const order = await orderingFor(db, req.table);
    const [rows, count] = await Promise.all([
      db.prepare(`SELECT * FROM ${req.table} WHERE ${where}${order} LIMIT ${limit}`)
        .bind(...params).all<Record<string, unknown>>(),
      db.prepare(`SELECT count(*) AS n FROM ${req.table} WHERE ${where}`)
        .bind(...params).first<{ n: number }>(),
    ]);
    const results = rows.results ?? [];
    return { ok: true, rows: results, total: count?.n ?? results.length };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'read failed' };
  }
}
