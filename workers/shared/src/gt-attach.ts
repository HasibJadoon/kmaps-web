import { query } from './db';

/**
 * Every drill carries its GT terms. A drill is cut from rows that already name the registry
 * terms they are about (an iʿrāb role, a device, a pattern, a sentence role) as `GT:<category>:<key>`
 * refs; those refs are gathered from the drill as built and sent beside it as the terms
 * themselves — ref, Arabic name, badge colour — read from the domain's mirror of the registry
 * (`ar_ling_gram_term`). A drill whose rows name no term carries none: nothing is guessed.
 */

export interface GtChip { ref: string; nameAr: string; color: string | null }

const GT_REF = /GT:[a-z_]+:[a-z0-9_]+/g;

/** The GT refs a value names anywhere in it, first occurrence first. */
export function gtRefsOf(value: unknown): string[] {
  const found = JSON.stringify(value ?? null).match(GT_REF) ?? [];
  return [...new Set(found)];
}

/** Each item with `gt`: the registry terms its own data names. */
export async function attachGt<T extends Record<string, unknown>>(
  db: D1Database, items: T[],
): Promise<Array<T & { gt: GtChip[] }>> {
  const perItem = items.map((it) => gtRefsOf(it));
  const all = [...new Set(perItem.flat())];
  const byRef = new Map<string, GtChip>();
  for (let i = 0; i < all.length; i += 90) {
    const ids = all.slice(i, i + 90);
    const rows = await query<{ id: string; name_ar: string | null; badge_color: string | null }>(db,
      `SELECT id, name_ar, badge_color FROM ar_ling_gram_term WHERE id IN (${ids.map(() => '?').join(',')})`, ids)
      .catch(() => [] as { id: string; name_ar: string | null; badge_color: string | null }[]);
    for (const r of rows) if (r.name_ar) byRef.set(r.id, { ref: r.id, nameAr: r.name_ar, color: r.badge_color });
  }
  return items.map((it, i) => {
    const gt = perItem[i].map((ref) => byRef.get(ref)).filter((c): c is GtChip => !!c);
    // the card a drill files keeps a copy of the drill to replay: it carries the terms too
    const srs = it.srs as { extra?: { drill?: Record<string, unknown> } } | undefined;
    const filed = srs?.extra?.drill ? { srs: { ...srs, extra: { ...srs.extra, drill: { ...srs.extra.drill, gt } } } } : {};
    return { ...it, ...filed, gt };
  });
}
