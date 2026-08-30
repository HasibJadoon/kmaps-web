export const IDENT = /^[a-z_][a-z0-9_]*$/;

export interface ViaPath {

  col: string;
  to_table: string;
  to_col: string;

  root_col: string;

  where_col?: string;
  where_val?: string;
}

export interface BindablePlan {
  root_bind: string;
  root_bind_col: string | null;
  root_bind_via_json?: string | null;
}

export function parseVia(raw: string | null | undefined): ViaPath | null {
  if (!raw) return null;
  let v: Partial<ViaPath>;
  try { v = JSON.parse(raw) as Partial<ViaPath>; } catch { return null; }
  const { col, to_table, to_col, root_col, where_col, where_val } = v;
  if (!col || !to_table || !to_col || !root_col) return null;
  if (![col, to_table, to_col, root_col].every((x) => IDENT.test(x))) return null;
  if (where_col !== undefined && !IDENT.test(where_col)) return null;
  return { col, to_table, to_col, root_col, where_col, where_val };
}

export function bindWhere(
  plan: BindablePlan,

  boundValue: string,

  root: string,
): { sql: string; params: string[] } | null {
  if (plan.root_bind === 'via') {
    const v = parseVia(plan.root_bind_via_json);
    if (!v) return null;
    const sql = `${v.col} IN (SELECT ${v.to_col} FROM ${v.to_table} WHERE ${v.root_col} = ?)`;

    return v.where_col
      ? { sql: `${sql} AND ${v.where_col} = ?`, params: [root, String(v.where_val ?? '')] }
      : { sql, params: [root] };
  }
  const col = plan.root_bind_col;
  if (!col || !IDENT.test(col)) return null;
  return { sql: `${col} = ?`, params: [boundValue] };
}
