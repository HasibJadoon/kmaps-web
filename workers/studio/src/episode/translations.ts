/// Every translation of one āyah, for the phase screens' "tap an āyah" sheet (owner 2026-11-17: "verse selected can
/// show all translations"). QR keeps the rows; this only groups and labels them, so the app stays a renderer.

export interface QrTranslationRow {
  source_id: string;
  text: string | null;
  translator?: string | null;
  edition?: string | null;
  language?: string | null;
  slug?: string | null;
  is_default?: number | null;
}

export interface TranslationItem { id: string; translator: string; edition: string | null; text: string; default: boolean }
export interface TranslationGroup { key: string; label: string; rtl: boolean; items: TranslationItem[] }

const LANGS: Record<string, { label: string; rtl: boolean }> = {
  en: { label: 'English', rtl: false },
  ur: { label: 'Urdu', rtl: true },
  ar: { label: 'Arabic', rtl: true },
};

/// a translation's text as shown: no markup, no footnote markers, one space
export const cleanTranslation = (t: string | null | undefined) =>
  (t ?? '').replace(/<sup[^>]*>.*?<\/sup>/gi, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

/// "QR:TRANS:EN_IA_ARTHUR_JOHN_ARBERRY" → "Arthur John Arberry" when the source row has no translator name
const nameFromId = (id: string) => id.replace(/^.*:/, '').replace(/^[A-Z]{2}_(IA_)?/, '').split('_')
  .map((w) => (w ? w[0] + w.slice(1).toLowerCase() : w)).join(' ');

/// The rows grouped: English (the default one first, then by translator), Urdu, then any other language in its own
/// script. Transliterations and romanised editions are left out (owner 2026-11-17: "no transliteration or Roman
/// Urdu tabs"), as are empty texts.
export function groupTranslations(rows: QrTranslationRow[]): TranslationGroup[] {
  const groups = new Map<string, TranslationGroup>();
  for (const r of rows) {
    const text = cleanTranslation(r.text);
    if (!text) continue;
    const lang = (r.language ?? r.source_id.replace(/^.*:/, '').slice(0, 2)).toLowerCase();
    if (/TRANSLIT|ROMAN/i.test(`${r.slug ?? ''} ${r.source_id}`) || lang.includes('roman')) continue;
    const key = lang;
    const meta = LANGS[lang] ?? { label: lang.toUpperCase(), rtl: false };
    const g = groups.get(key) ?? { key, label: meta.label, rtl: meta.rtl, items: [] };
    // some source names come bracketed ("[Al-Muntakhab]", "[The Monotheist Group] (2011 Edition)"): drop the brackets
    const name = (r.translator ?? '').replace(/[[\]]/g, '').replace(/\s+/g, ' ').trim();
    g.items.push({ id: r.source_id, translator: name || nameFromId(r.source_id), edition: r.edition ?? null,
      text, default: r.is_default === 1 });
    groups.set(key, g);
  }
  const rank = (k: string) => (k === 'en' ? 0 : k === 'ur' ? 1 : 2);
  return [...groups.values()]
    .map((g) => ({ ...g, items: g.items.sort((a, b) => Number(b.default) - Number(a.default) || a.translator.localeCompare(b.translator)) }))
    .sort((a, b) => rank(a.key) - rank(b.key) || a.label.localeCompare(b.label));
}
