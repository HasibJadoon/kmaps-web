import type { RootCarrierRows } from '../data/cyb.models';

export type Row = Record<string, unknown>;

export class CarrierIndex {
  constructor(readonly carriers: RootCarrierRows[]) {}

  rows(table: string): Row[] {
    return this.carriers.find((c) => c.carrier_table === table)?.rows ?? [];
  }

  any(tables: string[]): Row[] {
    for (const t of tables) {
      const r = this.rows(t);
      if (r.length) return r;
    }
    return [];
  }

  carrier(table: string): RootCarrierRows | undefined {
    return this.carriers.find((c) => c.carrier_table === table);
  }

  first(table: string): Row | undefined { return this.rows(table)[0]; }

  get total(): number { return this.carriers.reduce((a, c) => a + c.rows.length, 0); }
}

export function str(v: unknown): string {
  return v === null || v === undefined ? '' : String(v);
}

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

export function sortedBy(rows: Row[], key: string): Row[] {
  return [...rows].sort((a, b) => {
    const x = a[key] === null || a[key] === undefined ? Number.MAX_SAFE_INTEGER : num(a[key]);
    const y = b[key] === null || b[key] === undefined ? Number.MAX_SAFE_INTEGER : num(b[key]);
    return x - y;
  });
}

export function gloss(raw: unknown, lang: 'ar' | 'en' | 'ur' = 'ar'): string | undefined {
  const s = str(raw);
  if (!s) return undefined;
  try {
    const o = JSON.parse(s);
    const v = o && typeof o === 'object' ? o[lang] : null;
    return typeof v === 'string' && v ? v : undefined;
  } catch { return undefined; }
}

export function jsonArray(raw: unknown): unknown[] {
  const s = str(raw);
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch { return []; }
}

export function slotName(role: string | undefined): string {
  switch (role) {
    case 'fa': return 'fāʾ';
    case 'ain': return 'ʿayn';
    case 'lam': return 'lām';
    default: return role ?? '';
  }
}
