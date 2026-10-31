export type KmDateStyle = 'long' | 'short';

const OPTIONS: Record<KmDateStyle, Intl.DateTimeFormatOptions> = {
  long: { day: 'numeric', month: 'short', year: 'numeric' }, // 3 Oct 2026
  short: { day: 'numeric', month: 'short' },                 // 3 Oct
};

/** The app's one date format (en-GB). Empty for a missing or unreadable date. */
export function formatKmDate(value: string | number | Date | null | undefined, style: KmDateStyle = 'long'): string {
  if (value == null || value === '') return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', OPTIONS[style]);
}
