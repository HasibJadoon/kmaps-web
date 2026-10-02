import type { Router } from '../../../shared/src/router';
import { ok } from '../../../shared/src/response';
import { authenticate } from '../../../shared/src/auth';
import { query } from '../../../shared/src/db';
import type { CoreEnv } from '../env';
import { SrsRepo } from '../repositories/srs.repo';

// ── The Apps as one Atlas (drill-engine plan §2.3c) ──────────────────────────
//
//   GET /core/apps/atlas   the landing: its rooms and their doors, the Today strip's words, and —
//                          for a signed-in reader — Today itself: what is due (all, and per module)
//                          and the classes in progress, the latest first.
//
// What the landing is lives in core_app_label (041); nothing about it is written here. The device
// draws the rows and maps a door's key to the screen it opens.

interface LabelRow {
  scope: string; key: string; parent: string | null; label: string; label_ar: string | null;
  detail: string | null; icon: string | null; color: string | null; extra_json: string | null; sort: number;
}

const extraOf = (r: LabelRow): Record<string, unknown> | null => {
  try { return r.extra_json ? JSON.parse(r.extra_json) : null; } catch { return null; }
};

const word = (r: LabelRow) => ({ key: r.key, label: r.label, labelAr: r.label_ar, detail: r.detail, icon: r.icon, color: r.color });

/** The landing as the device draws it: rooms in order, each with its doors in order. */
export function atlasOf(rows: LabelRow[]) {
  const doors = rows.filter((r) => r.scope === 'door');
  return {
    rooms: rows.filter((r) => r.scope === 'room').map((room) => ({
      ...word(room),
      doors: doors.filter((d) => d.parent === room.key)
        .map((d) => ({ ...word(d), module: (extraOf(d)?.module as string | undefined) ?? null })),
    })).filter((room) => room.doors.length > 0),
    words: rows.filter((r) => r.scope === 'today').map(word),
  };
}

export function appsRoutes(router: Router<CoreEnv>) {
  router.get('/core/apps/atlas', async (req, env) => {
    const ctx = await authenticate(req, env.JWT_SECRET);
    const rows = await query<LabelRow>(env.DB_CORE,
      `SELECT scope, key, parent, label, label_ar, detail, icon, color, extra_json, sort
         FROM core_app_label ORDER BY scope, sort`);
    if (!ctx) return ok({ ...atlasOf(rows), today: null });

    const [due, classes] = await Promise.all([
      new SrsRepo(env.DB_CORE).dueCounts(ctx.userId).catch(() => [] as Array<{ module: string; n: number }>),
      query<{ scope_ref: string; module: string; last_at: string | null; started_at: string }>(env.DB_CORE,
        `SELECT scope_ref, module, last_at, started_at FROM core_drill_class
          WHERE user_ref = ? AND status = 'in_progress'
          ORDER BY COALESCE(last_at, started_at) DESC LIMIT 3`, [ctx.userId]),
    ]);
    const byModule: Record<string, number> = {};
    for (const d of due) byModule[String(d.module).toUpperCase()] = (byModule[String(d.module).toUpperCase()] ?? 0) + (Number(d.n) || 0);
    return ok({
      ...atlasOf(rows),
      today: {
        due: { all: Object.values(byModule).reduce((a, b) => a + b, 0), byModule },
        classes: classes.map((c) => ({ scope: c.scope_ref, module: c.module, lastAt: c.last_at ?? c.started_at })),
      },
    });
  });
}
