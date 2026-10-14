import { query } from '../../../shared/src/db';
import type { ArabicEnv } from '../env';

// How common a word form is, and whether it is HIGH-END — the one test every AR drill uses to decide what is worth
// drilling (the learner reads at an intermediate level and wants the high end only).

export const freqKey = (w: string) => w.replace(/[ً-ْٰـۖ-ۭ]/g, '').replace(/[ٱأإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
  .replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/[^ء-ي]/g, '');
export async function freqOf(env: ArabicEnv, ws: string[]) {
  const keys = [...new Set(ws.map(freqKey).filter((k) => k.length >= 2))];
  const out = new Map<string, number>();
  for (let i = 0; i < keys.length; i += 90) {
    const part = keys.slice(i, i + 90);
    for (const r of await query<{ bare: string; n: number }>(env.DB_AR, `SELECT bare, n FROM ar_word_freq WHERE bare IN (${part.map(() => '?').join(',')})`, part))
      out.set(r.bare, r.n);
  }
  return (w: string) => out.get(freqKey(w)) ?? 0;
}
/// HIGH-END words only (the learner reads at an intermediate level and wants the high end): a word is worth drilling
/// when it is hard or gharīb in the Qurʾān (ar_scene_word.qr_grade — the forms heard in the series) or rare in the
/// classical library (ar_word_freq: used fewer than RARE_MAX times across Shamela — calibrated 2026-10-14 on samples:
/// below it الأحدوثة، المهابة، الندماء; above it مشقّة، بهجة). An unknown form (n = 0) is not taken for rare.
const RARE_MAX = 1500;
let hardMemo: { at: number; set: Set<string> } | null = null;
async function hardForms(env: ArabicEnv): Promise<Set<string>> {
  if (hardMemo && Date.now() - hardMemo.at < 600_000) return hardMemo.set;
  const rows = await query<{ surface: string }>(env.DB_AR,
    `SELECT DISTINCT surface FROM ar_scene_word WHERE qr_grade IN ('hard', 'super')`).catch(() => [] as Array<{ surface: string }>);
  hardMemo = { at: Date.now(), set: new Set(rows.map((r) => freqKey(r.surface)).filter((k) => k.length >= 2)) };
  return hardMemo.set;
}
export async function highEndOf(env: ArabicEnv, ws: string[]): Promise<(w: string) => boolean> {
  const [f, hard] = await Promise.all([freqOf(env, ws), hardForms(env)]);
  return (w: string) => { if (hard.has(freqKey(w))) return true; const n = f(w); return n > 0 && n < RARE_MAX; };
}

