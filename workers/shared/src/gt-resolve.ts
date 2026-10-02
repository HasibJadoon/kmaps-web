/**
 * Naming free-form grammar values by the GT registry — from data, never by rule.
 *
 * A value as it was typed into a table («مبتدا», `mudaf_ilayh`, "naat (Daas …)") is looked
 * up, as a whole, among the registry's spellings (`ar_ling_gram_term_alias`). Which
 * categories a slot is looked up in, and in what order, is data too (the `ss_slot` labels).
 * A value no spelling matches resolves to null: the answer to it is a new alias row, not code.
 *
 * The lookup key is the one `alias_bare` is stored under (AL 0111, 0121): Arabic without its
 * ḥarakāt (U+064B–U+0652, U+0670), anything else trimmed and lower-cased.
 */

export interface GtAliasRow {
  alias_bare: string;
  term_id: string;
  category_key: string;
}

export function aliasKey(raw: string): string {
  const t = raw.trim();
  return /[\u0600-\u06FF]/.test(t) ? t.replace(/[\u064B-\u0652\u0670]/g, '') : t.toLowerCase();
}

/** slot → the registry categories it is resolved in, first to last. */
export type GtSlots = Record<string, string[]>;

export type GtResolve = (slot: string, raw: string | null | undefined) => string | null;

export function makeGtResolver(aliases: GtAliasRow[], slots: GtSlots): GtResolve {
  const byKey = new Map<string, Map<string, string>>();
  for (const a of aliases) {
    const m = byKey.get(a.alias_bare) ?? new Map<string, string>();
    if (!m.has(a.category_key)) m.set(a.category_key, a.term_id);
    byKey.set(a.alias_bare, m);
  }
  return (slot, raw) => {
    if (!raw || !raw.trim()) return null;
    const hits = byKey.get(aliasKey(raw));
    if (!hits) return null;
    for (const category of slots[slot] ?? []) {
      const id = hits.get(category);
      if (id) return id;
    }
    return null;
  };
}

/**
 * The Latin spellings of registry terms that occur, as whole words, in some English prose —
 * so a reader can be shown the term's Arabic name where the prose wrote it in Latin («the
 * khabar of …» → «the خبر of …»). Only spellings the registry holds, in the categories given.
 * Longest first, so «mafʿūl bihi» is taken before «mafʿūl».
 */
export function latinGlossary(aliases: GtAliasRow[], categories: string[], prose: string): { en: string; ref: string }[] {
  const text = prose.toLowerCase();
  const wanted = new Set(categories);
  const out = new Map<string, string>();
  for (const a of aliases) {
    if (!wanted.has(a.category_key) || /[\u0600-\u06FF]/.test(a.alias_bare) || out.has(a.alias_bare)) continue;
    if (!text.includes(a.alias_bare)) continue;
    const esc = a.alias_bare.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`(?<![\\p{L}\\p{M}])${esc}(?![\\p{L}\\p{M}])`, 'u').test(text)) out.set(a.alias_bare, a.term_id);
  }
  return [...out].sort((x, y) => y[0].length - x[0].length).map(([en, ref]) => ({ en, ref }));
}
