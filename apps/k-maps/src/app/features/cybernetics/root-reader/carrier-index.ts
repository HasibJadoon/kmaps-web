// ─── CarrierIndex — a layer's carriers, looked up by table name ──────────────
//
// Ported from the iOS app's `CarrierIndex` (CyberneticsFeature/Presentation/
// CybLayerViews.swift), so the two clients read a root the same way.
//
// A band is not one table. CORE is the root's identity row *and* its letter
// slots *and* its permutation family; SENSE is senses *and* arcs *and* axes.
// A view for that band has to reach for the carrier it wants by name, which is
// all this is.

import type { RootCarrierRows } from '../data/cyb.models';

export type Row = Record<string, unknown>;

export class CarrierIndex {
  constructor(readonly carriers: RootCarrierRows[]) {}

  /** The rows of one carrier, or nothing if this root has none. */
  rows(table: string): Row[] {
    return this.carriers.find((c) => c.carrier_table === table)?.rows ?? [];
  }

  /** The first of these carriers that actually holds rows. */
  any(tables: string[]): Row[] {
    for (const t of tables) {
      const r = this.rows(t);
      if (r.length) return r;
    }
    return [];
  }

  /** The carrier itself — what it holds against what arrived. A view showing
   *  six of three hundred rows has to be able to say which it is. */
  carrier(table: string): RootCarrierRows | undefined {
    return this.carriers.find((c) => c.carrier_table === table);
  }

  first(table: string): Row | undefined { return this.rows(table)[0]; }

  get total(): number { return this.carriers.reduce((a, c) => a + c.rows.length, 0); }
}

/** A cell's text, whatever the column's type. */
export function str(v: unknown): string {
  return v === null || v === undefined ? '' : String(v);
}
/** Present, non-empty text — or undefined, so `@if` reads naturally. */
export function txt(r: Row | undefined, key: string): string | undefined {
  if (!r) return undefined;
  const s = str(r[key]).trim();
  return s === '' ? undefined : s;
}
export function num(v: unknown): number {
  const n = Number(str(v));
  return Number.isFinite(n) ? n : 0;
}
export function flag(r: Row | undefined, key: string): boolean {
  return !!r && str(r[key]) === '1';
}

/** Sorted by a numeric column, missing values last — the order the carrier
 *  itself declares rather than whatever the read happened to return. */
export function sortedBy(rows: Row[], key: string): Row[] {
  return [...rows].sort((a, b) => {
    const x = a[key] === null || a[key] === undefined ? Number.MAX_SAFE_INTEGER : num(a[key]);
    const y = b[key] === null || b[key] === undefined ? Number.MAX_SAFE_INTEGER : num(b[key]);
    return x - y;
  });
}

/** `gloss_json` carries `{ar,en,ur}` — a row's own trilingual reading, worth
 *  more than the flat note beside it. */
export function gloss(raw: unknown, lang: 'ar' | 'en' | 'ur' = 'ar'): string | undefined {
  const s = str(raw);
  if (!s) return undefined;
  try {
    const o = JSON.parse(s);
    const v = o && typeof o === 'object' ? o[lang] : null;
    return typeof v === 'string' && v ? v : undefined;
  } catch { return undefined; }
}

/** A JSON array column, read defensively — these are CHECK(json_valid) in the
 *  schema, but a view should not blow up on the one row that is not. */
export function jsonArray(raw: unknown): unknown[] {
  const s = str(raw);
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch { return []; }
}

/** The three positions every Arabic root is described by. `slot_role` stores
 *  them as fa/ain/lam; the books name them in full, so does this. */
export function slotName(role: string | undefined): string {
  switch (role) {
    case 'fa': return 'fāʾ';
    case 'ain': return 'ʿayn';
    case 'lam': return 'lām';
    default: return role ?? '';
  }
}
