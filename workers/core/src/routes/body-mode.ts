import { queryOne } from '../../../shared/src/db';
import type { CoreEnv } from '../env';

// ── What a dashboard plan shows (migration 079): core_app_label scope body_mode, key = core_body_profile.plan ─────────
// No row (the owner's 'omad'): everything, exactly as before. A row (the 'child' plan, for the owner's son): no weight,
// no calories, the kids' moves, the five prayers with nothing missed or owed — every switch below read from the row.

export type Mode = {
  /** the prayers this plan shows (the Friday prayer stands in Dhuhr's place); absent: all */
  prayers?: string[];
  /** false: a farḍ prayer whose time has gone is "passed", never "missed" */
  missed?: boolean;
  /** false: no "to make up" list */
  owed?: boolean;
  friday_list?: boolean;
  insights?: boolean;
  /** 'all_prayed': the streak and the celebration count all five prayed, on time or not */
  streak?: string;
  /** the words' suffix: body_ui_<words>, body_prayer_ui_<words>, body_khushu_<words> laid over the adult scopes */
  words?: string;
  routine_set?: string;
  move_goal_min?: number;
  strength_parts?: string[];
  strength_days?: number;
  /** prayer-screen words (body_prayer_ui keys) never sent to this plan */
  hide_words?: string[];
};

const json = <T>(s: string | null | undefined, fb: T): T => { try { return s ? JSON.parse(s) as T : fb; } catch { return fb; } };

/** The mode row for a plan, or null for a plan that has none (the adult dashboard). */
export function modeFromRow(row: { extra_json: string | null } | null | undefined): Mode | null {
  return row ? json<Mode>(row.extra_json, {}) : null;
}

/** The reader's plan, time zone and mode. */
export async function profileMode(env: CoreEnv, me: string): Promise<{ plan: string | null; tz: string; mode: Mode | null }> {
  const p = await queryOne<{ plan: string; tz: string }>(env.DB_CORE, `SELECT plan, tz FROM core_body_profile WHERE owner_ref = ?`, [me]);
  const row = p ? await queryOne<{ extra_json: string | null }>(env.DB_CORE,
    `SELECT extra_json FROM core_app_label WHERE scope = 'body_mode' AND key = ?`, [p.plan]) : null;
  return { plan: p?.plan ?? null, tz: p?.tz || 'Australia/Sydney', mode: modeFromRow(row) };
}

export const DAY = 86_400_000;
export const dayOf = (t: Date, tz: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(t);
export const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
export const weekday = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' });
/** Days in a row, back from today (or yesterday, if today is not done yet), on which `done` holds. */
export function streak(today: string, done: (d: string) => boolean): number {
  let d = done(today) ? today : addDays(today, -1), n = 0;
  while (done(d) && n < 3650) { n++; d = addDays(d, -1); }
  return n;
}
/** A word's {placeholders} filled; numbers grouped. */
export const fill = (t: unknown, v: Record<string, string | number>) =>
  String(t ?? '').replace(/\{(\w+)\}/g, (_, k) => (k in v ? (typeof v[k] === 'number' ? Number(v[k]).toLocaleString('en-GB') : String(v[k])) : ''));
