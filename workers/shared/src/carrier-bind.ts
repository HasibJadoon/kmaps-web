// ─── carrier-bind — how a carrier table is tied to one root ──────────────────
//
// The registry says which table carries a sub-layer and how that table reaches
// the root. Most reach it directly, by holding the root in a column. Some reach
// it through one other table, and those were unreadable: the plan queries took
// only `root_bind = 'direct'`, so 18-STEP's 336 arc steps and 19-ATT's 1,665
// attestations reported as *unknown* — the Sense band showed four sub-layers
// where the registry declares six.
//
// The join was recorded, but as prose in `root_bind_col`:
//
//     'target_id -> ar_ling_root_sense.id WHERE target_type=''sense'' -> root_norm'
//
// which cannot be executed. Migration 0106 adds a machine-readable form and
// this builds the `WHERE` from it.
//
// It lives here, and not beside the query, because it is small, easy to get
// subtly wrong, and worth pinning: the first version of it put the filter
// inside the subquery, where `target_type` would have named a column of the
// table being joined TO rather than of the carrier — a table that has no such
// column, so every attestation reading would have failed.

/** Identifiers are interpolated into SQL, so they must look like identifiers. */
export const IDENT = /^[a-z_][a-z0-9_]*$/;

/** A carrier that reaches the root through exactly one other table. */
export interface ViaPath {
  /** The column ON THE CARRIER holding the far table's key. */
  col: string;
  to_table: string;
  to_col: string;
  /** The column on the far table that names the root. */
  root_col: string;
  /** Narrows the CARRIER's own rows — some carriers serve several scopes. */
  where_col?: string;
  where_val?: string;
}

/** Enough of a registry row to decide how it binds. */
export interface BindablePlan {
  root_bind: string;
  root_bind_col: string | null;
  root_bind_via_json?: string | null;
}

/** A parsed, identifier-checked join path, or null when it cannot be trusted. */
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

/**
 * The `WHERE` tying one carrier to one root, plus the values it binds.
 *
 * `null` means the binding cannot be read — which is *unknown*, and must never
 * be rendered as a count of zero.
 *
 * Only registry-supplied identifiers are ever interpolated; every value the
 * caller supplies is a parameter.
 */
export function bindWhere(
  plan: BindablePlan,
  /** What a direct binding compares against — the root string, or its ULID. */
  boundValue: string,
  /** The root itself. A `via` path always ends at a root-named column. */
  root: string,
): { sql: string; params: string[] } | null {
  if (plan.root_bind === 'via') {
    const v = parseVia(plan.root_bind_via_json);
    if (!v) return null;
    const sql = `${v.col} IN (SELECT ${v.to_col} FROM ${v.to_table} WHERE ${v.root_col} = ?)`;
    // The filter narrows the CARRIER, so it sits outside the subquery.
    return v.where_col
      ? { sql: `${sql} AND ${v.where_col} = ?`, params: [root, String(v.where_val ?? '')] }
      : { sql, params: [root] };
  }
  const col = plan.root_bind_col;
  if (!col || !IDENT.test(col)) return null;
  return { sql: `${col} = ?`, params: [boundValue] };
}
