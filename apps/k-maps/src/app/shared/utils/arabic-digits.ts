const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩';

/** Western digits → Arabic-Indic (٠–٩); everything else is left as it is. */
export function toArabicDigits(value: number | string | null | undefined): string {
  if (value == null) return '';
  return String(value).replace(/[0-9]/g, (d) => ARABIC_INDIC[Number(d)]);
}

/** Arabic-Indic (٠–٩) digits → Western; everything else is left as it is. */
export function fromArabicDigits(value: string): string {
  return value.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}
