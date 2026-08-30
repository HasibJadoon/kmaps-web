import type { PaginateOptions, PaginatedRows } from './types';

export async function query<T = Record<string, unknown>>(
  db: D1Database,
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await db.prepare(sql).bind(...params).all<T>();
  return result.results ?? [];
}

export async function queryOne<T = Record<string, unknown>>(
  db: D1Database,
  sql: string,
  params: unknown[] = [],
): Promise<T | null> {
  const row = await db.prepare(sql).bind(...params).first<T>();
  return row ?? null;
}

export async function execute(
  db: D1Database,
  sql: string,
  params: unknown[] = [],
): Promise<D1Result> {
  return db.prepare(sql).bind(...params).run();
}

export async function executeBatch(
  db: D1Database,
  statements: Array<{ sql: string; params?: unknown[] }>,
): Promise<D1Result[]> {
  const prepared = statements.map(({ sql, params = [] }) =>
    db.prepare(sql).bind(...params),
  );
  return db.batch(prepared);
}

export async function paginate<T = Record<string, unknown>>(
  db: D1Database,
  sql: string,
  countSql: string,
  params: unknown[] = [],
  opts: PaginateOptions = {},
): Promise<PaginatedRows<T>> {
  const page = Math.max(1, opts.page ?? 1);
  const per_page = Math.min(100, Math.max(1, opts.per_page ?? 20));
  const offset = (page - 1) * per_page;

  const [rows, countRow] = await Promise.all([
    query<T>(db, `${sql} LIMIT ? OFFSET ?`, [...params, per_page, offset]),
    queryOne<{ count: number }>(db, countSql, params),
  ]);

  const total = countRow?.count ?? 0;
  return { rows, total, page, per_page, has_more: offset + rows.length < total };
}

export async function exists(
  db: D1Database,
  sql: string,
  params: unknown[] = [],
): Promise<boolean> {
  const row = await db.prepare(sql).bind(...params).first<{ n: number }>();
  return (row?.n ?? 0) > 0;
}
