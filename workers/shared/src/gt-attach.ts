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
  const disc = new Map<string, string>();   // the term's science (SF NH BL DL): the drill's sub-domain in its global id
  for (let i = 0; i < all.length; i += 90) {
    const ids = all.slice(i, i + 90);
    const rows = await query<{ id: string; name_ar: string | null; badge_color: string | null; discipline: string | null }>(db,
      `SELECT id, name_ar, badge_color, discipline FROM ar_ling_gram_term WHERE id IN (${ids.map(() => '?').join(',')})`, ids)
      // a mirror without the discipline column still gives its chips
      .catch(() => query<{ id: string; name_ar: string | null; badge_color: string | null; discipline: string | null }>(db,
        `SELECT id, name_ar, badge_color, NULL AS discipline FROM ar_ling_gram_term WHERE id IN (${ids.map(() => '?').join(',')})`, ids))
      .catch(() => [] as { id: string; name_ar: string | null; badge_color: string | null; discipline: string | null }[]);
    for (const r of rows) {
      if (r.name_ar) byRef.set(r.id, { ref: r.id, nameAr: r.name_ar, color: r.badge_color });
      if (r.discipline) disc.set(r.id, r.discipline);
    }
  }
  return items.map((it, i) => {
    const gt = perItem[i].map((ref) => byRef.get(ref)).filter((c): c is GtChip => !!c);
    const discipline = it.discipline ?? perItem[i].map((ref) => disc.get(ref)).find(Boolean);
    if (discipline) it = { ...it, discipline };
    // The card a drill files keeps a copy of the drill to replay, and review plays that copy: so
    // it is taken here, last, from the drill exactly as it is dealt — its instruction, its terms,
    // all it was given after the card was first made. Only the card itself and the context panel
    // (a review fetches that when it is opened) stay out.
    const srs = it.srs as { extra?: { drill?: Record<string, unknown> } } | undefined;
    const { srs: _s, context: _c, badges: _b, ...dealt } = it;
    const filed = srs?.extra?.drill ? { srs: { ...srs, extra: { ...srs.extra, drill: { ...dealt, gt } } } } : {};
    return { ...it, ...filed, gt };
  });
}
