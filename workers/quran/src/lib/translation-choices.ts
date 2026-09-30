import { query } from '../../../shared/src/db';
import type { QuranEnv } from '../env';

// The translation-choices registry (qr_052): each Arabic feature, the named English strategies a
// translator can take for it, and the comparisons a drill can ask. The choices themselves are
// computed offline (kmaps-resources/scripts/quran/translation_choices.py) into
// qr_translation_choice / _feature_ayah / _profile. Read once a minute per isolate.

export interface TChoice { key: string; label: string; regex?: string | null; flags?: string; max?: number | null; [k: string]: unknown }
export interface TCompare { ask: string; yes?: string[]; no?: string[]; by?: 'min_value' | 'max_value' }
export interface TFeature {
  key: string; label: string; labelAr: string | null; detail: string | null; arabicDetector: string;
  scope: string; window: number | null; choices: TChoice[]; compare: TCompare[];
  nAyat: number; nRows: number; computedAt: string | null;
}

let memo: { at: number; data: TFeature[] } | null = null;

export async function features(env: QuranEnv): Promise<TFeature[]> {
  if (memo && Date.now() - memo.at < 60_000) return memo.data;
  const rows = await query<{ key: string; label_en: string; label_ar: string | null; detail: string | null; arabic_detector: string;
                             scope: string; window_words: number | null; choices_json: string; compare_json: string | null;
                             n_ayat: number | null; n_rows: number | null; computed_at: string | null }>(env.DB_QR,
    `SELECT key, label_en, label_ar, detail, arabic_detector, scope, window_words, choices_json, compare_json, n_ayat, n_rows, computed_at
       FROM qr_translation_feature ORDER BY sort`);
  const parse = <T>(s: string | null, d: T): T => { try { return s ? JSON.parse(s) as T : d; } catch { return d; } };
  const data = rows.map((r) => ({
    key: r.key, label: r.label_en, labelAr: r.label_ar, detail: r.detail, arabicDetector: r.arabic_detector,
    scope: r.scope, window: r.window_words, choices: parse<TChoice[]>(r.choices_json, []), compare: parse<TCompare[]>(r.compare_json, []),
    nAyat: r.n_ayat ?? 0, nRows: r.n_rows ?? 0, computedAt: r.computed_at,
  }));
  memo = { at: Date.now(), data };
  return data;
}

/// the fallback choice: the one with no regex (length bands aside)
export const fallbackOf = (f: TFeature) => f.key === 'length_ratio' ? null : (f.choices.find((c) => !c.regex)?.key ?? null);
export const choiceLabel = (f: TFeature, key: string) => f.choices.find((c) => c.key === key)?.label ?? key;
/// a translation's text as shown: no markup, one space
export const cleanText = (t: string | null | undefined) => (t ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

export interface Source { id: string; translator: string; edition: string | null }
export async function sources(env: QuranEnv): Promise<Map<string, Source>> {
  const rows = await query<{ id: string; translator_name: string; edition: string | null }>(env.DB_QR,
    `SELECT id, translator_name, edition FROM qr_translation_source WHERE language = 'en' ORDER BY translator_name`);
  return new Map(rows.map((r) => [r.id, { id: r.id, translator: r.translator_name, edition: r.edition }]));
}

export interface ProfileRow { feature: string; source_id: string; choice: string; n: number; total: number; share: number; lift: number | null }
export function profiles(env: QuranEnv, feature?: string | string[]): Promise<ProfileRow[]> {
  const fs = feature === undefined ? [] : Array.isArray(feature) ? feature : [feature];
  return query<ProfileRow>(env.DB_QR,
    `SELECT feature, source_id, choice, n, total, share, lift FROM qr_translation_profile
      ${fs.length ? `WHERE feature IN (${fs.map(() => '?').join(',')})` : ''}`, fs);
}
