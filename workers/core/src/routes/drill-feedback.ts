import type { Router } from '../../../shared/src/router';
import { ok, badRequest, notFound, forbidden } from '../../../shared/src/response';
import { requireAuth } from '../../../shared/src/auth';
import { query, queryOne } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import { readJsonObject } from '../../../shared/src/validate';
import type { CoreEnv } from '../env';

// ── Feedback on any drill ────────────────────────────────────────────────────
//
//   GET   /core/drill/feedback/reasons   the reasons and the sheet's words (core_app_label 045), and
//                                        the drills not to deal this reader: those they removed, and
//                                        those a reviewer removed for everyone
//   POST  /core/drill/feedback           { drillId, reason, note?, module?, kind?, resourceRef?, drill? }
//                                        a reason that hides also suspends the reader's card for it
//   GET   /core/drill/feedback?status=open  the review queue (a reviewer sees all; anyone else theirs)
//   PATCH /core/drill/feedback/:id       { status: resolved | dismissed | removed, note? } — reviewers

interface Reason { key: string; label: string; label_ar: string | null; detail: string | null; icon: string | null;
                   color: string | null; extra_json: string | null }

const STATUSES = new Set(['open', 'resolved', 'dismissed', 'removed']);
const str = (v: unknown, max = 2000): string | undefined =>
  (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined);
const hides = (r: Reason | null | undefined) => {
  try { return !!r?.extra_json && JSON.parse(r.extra_json)?.hides === true; } catch { return false; }
};

async function reasons(env: CoreEnv) {
  return query<Reason & { scope: string }>(env.DB_CORE,
    `SELECT scope, key, label, label_ar, detail, icon, color, extra_json FROM core_app_label
      WHERE scope IN ('feedback', 'feedback_ui') ORDER BY scope, sort`);
}

const word = (r: Reason) => ({ key: r.key, label: r.label, labelAr: r.label_ar, detail: r.detail, icon: r.icon, color: r.color });

export function drillFeedbackRoutes(router: Router<CoreEnv>) {
  router.get('/core/drill/feedback/reasons', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const [rows, mine, all] = await Promise.all([
      reasons(env),
      query<{ drill_id: string; reason: string }>(env.DB_CORE,
        `SELECT DISTINCT drill_id, reason FROM core_drill_feedback WHERE user_ref = ? AND status <> 'dismissed'`, [ctx.userId]),
      query<{ drill_id: string }>(env.DB_CORE, `SELECT DISTINCT drill_id FROM core_drill_feedback WHERE status = 'removed'`),
    ]);
    const hiding = new Set(rows.filter((r) => r.scope === 'feedback' && hides(r)).map((r) => r.key));
    return ok({
      reasons: rows.filter((r) => r.scope === 'feedback').map((r) => ({ ...word(r), hides: hides(r) })),
      words: rows.filter((r) => r.scope === 'feedback_ui').map(word),
      hidden: [...new Set(mine.filter((m) => hiding.has(m.reason)).map((m) => m.drill_id))],
      removed: all.map((r) => r.drill_id),
    });
  });

  router.post('/core/drill/feedback', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const raw = await readJsonObject(req);
    // the app's client sends snake_case keys; either spelling is taken
    const b: Record<string, unknown> | null = raw ? { ...raw, drillId: raw['drillId'] ?? raw['drill_id'],
                                                      resourceRef: raw['resourceRef'] ?? raw['resource_ref'] } : null;
    const drillId = str(b?.['drillId'], 300);
    const reasonKey = str(b?.['reason'], 60);
    if (!drillId || !reasonKey) return badRequest('drillId and reason are required');
    const reason = await queryOne<Reason>(env.DB_CORE,
      `SELECT key, label, label_ar, detail, icon, color, extra_json FROM core_app_label WHERE scope = 'feedback' AND key = ?`, [reasonKey]);
    if (!reason) return badRequest(`unknown reason ${reasonKey}`);
    const drill = b?.['drill'] && typeof b['drill'] === 'object' ? JSON.stringify(b['drill']).slice(0, 32_000) : null;
    const resourceRef = str(b?.['resourceRef'], 300) ?? null;
    const id = typedId('DFB');
    await env.DB_CORE.prepare(
      `INSERT INTO core_drill_feedback (id, user_ref, drill_id, module, kind, resource_ref, reason, note, drill_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(id, ctx.userId, drillId, str(b?.['module'], 10) ?? null, str(b?.['kind'], 60) ?? null, resourceRef,
            reasonKey, str(b?.['note']) ?? null, drill).run();
    // a drill the learner removes leaves their review too
    let suspended = 0;
    if (hides(reason) && resourceRef) {
      const r = await env.DB_CORE.prepare(
        `UPDATE core_srs_card SET suspended = 1 WHERE user_ref = ? AND resource_ref = ? AND suspended = 0`)
        .bind(ctx.userId, resourceRef).run();
      suspended = Number((r as { meta?: { changes?: number } }).meta?.changes ?? 0);
    }
    return ok({ id, hidden: hides(reason), suspended });
  });

  router.get('/core/drill/feedback', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const status = new URL(req.url).searchParams.get('status');
    if (status && !STATUSES.has(status)) return badRequest('bad status');
    const rows = await query<Record<string, unknown>>(env.DB_CORE,
      `SELECT f.id, f.user_ref AS userId, COALESCE(NULLIF(u.display_name, ''), substr(u.email, 1, instr(u.email, '@') - 1)) AS name,
              f.drill_id AS drillId, f.module, f.kind, f.resource_ref AS resourceRef, f.reason, f.note, f.drill_json AS drill,
              f.status, f.resolution_note AS resolution, f.created_at AS createdAt, f.resolved_at AS resolvedAt,
              (SELECT COUNT(*) FROM core_drill_feedback g WHERE g.drill_id = f.drill_id) AS reports
         FROM core_drill_feedback f LEFT JOIN core_users u ON u.id = f.user_ref
        WHERE (? IS NULL OR f.status = ?) AND (? = 1 OR f.user_ref = ?)
        ORDER BY f.created_at DESC LIMIT 200`,
      [status, status, ctx.isAdmin ? 1 : 0, ctx.userId]);
    return ok({
      feedback: rows.map((r) => ({ ...r, drill: (() => { try { return r.drill ? JSON.parse(String(r.drill)) : null; } catch { return null; } })() })),
      reviewer: ctx.isAdmin,
    });
  });

  router.patch('/core/drill/feedback/:id', async (req, env, { id }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    if (!ctx.isAdmin) return forbidden('Reviewers only');
    const b = await readJsonObject(req);
    const status = str(b?.['status'], 20);
    if (!status || status === 'open' || !STATUSES.has(status)) return badRequest('status must be resolved, dismissed or removed');
    const r = await env.DB_CORE.prepare(
      `UPDATE core_drill_feedback SET status = ?, resolved_by = ?, resolution_note = ?,
              resolved_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?`)
      .bind(status, ctx.userId, str(b?.['note']) ?? null, id).run();
    if (!Number((r as { meta?: { changes?: number } }).meta?.changes ?? 0)) return notFound(`feedback ${id}`);
    return ok({ id, status });
  });
}
