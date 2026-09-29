import { query } from '../../../shared/src/db';
import type { QuranEnv } from '../env';

// Every label the Qurʾān atlas shows lives in qr_study_label (qr_046_atlas.sql): the
// rooms, a passage's layers, a unit's steps, the drill skills and kinds, the surah
// groupings. Read once a minute per isolate; the responses built from them are kept
// by the 'rest' version, which the table's triggers move on any edit.

export interface Label {
  key: string; label: string; labelAr: string | null; detail: string | null; icon: string | null;
  color: string | null; min: number | null; extra: Record<string, unknown> | null;
}
type Scopes = Record<string, Label[]>;

let memo: { at: number; data: Scopes } | null = null;

export async function labels(env: QuranEnv): Promise<Scopes> {
  if (memo && Date.now() - memo.at < 60_000) return memo.data;
  const rows = await query<{ scope: string; key: string; label: string; label_ar: string | null; detail: string | null;
                             icon: string | null; color: string | null; min_value: number | null; extra_json: string | null }>(env.DB_QR,
    `SELECT scope, key, label, label_ar, detail, icon, color, min_value, extra_json FROM qr_study_label ORDER BY scope, sort`);
  const data: Scopes = {};
  for (const r of rows) {
    let extra: Record<string, unknown> | null = null;
    try { extra = r.extra_json ? JSON.parse(r.extra_json) : null; } catch { /* keep null */ }
    (data[r.scope] ??= []).push({ key: r.key, label: r.label, labelAr: r.label_ar, detail: r.detail, icon: r.icon,
                                  color: r.color, min: r.min_value, extra });
  }
  memo = { at: Date.now(), data };
  return data;
}

export const byKey = (xs: Label[] | undefined) => new Map((xs ?? []).map((x) => [x.key, x]));

/// A label as the app shows it: a room, a layer, a step, a skill.
export const card = (s: Label) => ({ id: s.key, title: s.label, titleAr: s.labelAr ?? '', tagline: s.detail ?? '',
                                     icon: s.icon ?? 'circle', color: s.color ?? '#D8B657' });
