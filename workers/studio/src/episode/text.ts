/// Small text helpers every episode screen shares.

export function str(v: unknown): string | null { return typeof v === 'string' && v.trim() ? v.trim() : null; }

export function strings(v: unknown): string[] {
  return Array.isArray(v) ? v.map(str).filter((s): s is string => !!s) : [];
}

export function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
}

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
}

export const AR = '؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿';
const AR_RUN = new RegExp(`[${AR}](?:[${AR}\\s‌‍]*[${AR}])?`, 'g');
const HAS_AR = new RegExp(`[${AR}]`);

/// An English line with Arabic in it: each Arabic run goes in a right-to-left isolate (RLI … PDI), so the line stays
/// left-to-right, the words keep their order, and brackets, cites and full stops stay where they were written —
/// a line that starts with an Arabic word otherwise flips whole. Lines with no Latin letters are left alone.
export function bidiLine(text: string): string {
  if (!/[A-Za-z]/.test(text) || !HAS_AR.test(text)) return text;
  return text.replace(AR_RUN, (run) => `⁧${run}⁩`);
}

/// A string from meta, ready to show (trimmed, Arabic isolated), or null.
export function line(v: unknown): string | null { const s = str(v); return s ? bidiLine(s) : null; }

/// "الجدال في آيات الله — The Charge and Its Genealogy" → its two halves; "Liberalism · 06 — Locke…" → "Locke…".
export function splitTitle(title: string): { en: string; ar: string | null } {
  const k = title.lastIndexOf(' — ');
  if (k < 0) return { en: title, ar: null };
  const a = title.slice(0, k).trim(), b = title.slice(k + 3).trim();
  const isAr = (t: string) => HAS_AR.test(t) && !/[A-Za-z]/.test(t);
  if (isAr(a)) return { en: b, ar: a };
  if (isAr(b)) return { en: a, ar: b };
  return { en: b, ar: null };
}
