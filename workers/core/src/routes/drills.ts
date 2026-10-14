import type { Router } from '../../../shared/src/router';
import { ok } from '../../../shared/src/response';
import { requireAuth } from '../../../shared/src/auth';
import { query } from '../../../shared/src/db';
import type { CoreEnv } from '../env';

// ── The authored drill bank (core 052) ──────────────────────────────────────────────────────────────────────────
//
//   GET /core/cyb/drills?domain=QR&work=QR:SURAH:44&from=1&to=8&kind=…&limit=…
//        the live authored drills of a lesson (its work, and for the Qurʾān its āyāt), each as dealt with its gid —
//        a lesson deals them among its own
//   GET /core/cyb/drills/audit
//        every AGR:DRL rule run over the bank: how many drills break it (0 expected) — a drill goes live only clean

interface DrillRow { gid: string; skill: string | null; work_ref: string | null; intro_ayah: number | null; payload_json: string }
interface RuleRow { id: string; rule_md: string; severity: string; check_sql: string | null; expected: number }

export async function auditDrills(db: D1Database): Promise<Array<{ id: string; rule: string; severity: string; found: number | null; ok: boolean }>> {
  const rules = await query<RuleRow>(db,
    `SELECT id, rule_md, severity, check_sql, expected FROM cyb_agent_rule WHERE id LIKE 'AGR:DRL:%' AND status = 'live' ORDER BY id`);
  return Promise.all(rules.map(async (r) => {
    let found: number | null = null;
    if (r.check_sql) {
      const row = await db.prepare(r.check_sql).first<Record<string, number>>().catch(() => null);
      found = row ? Number(Object.values(row)[0]) : null;
    }
    return { id: r.id, rule: r.rule_md, severity: r.severity, found, ok: found === (r.expected ?? 0) };
  }));
}

export function drillBankRoutes(router: Router<CoreEnv>) {
  router.get('/core/cyb/drills', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const u = new URL(req.url);
    const p = (k: string) => u.searchParams.get(k);
    const where = [`status = 'live'`];
    const args: unknown[] = [];
    if (p('domain')) { where.push('domain = ?'); args.push(p('domain')); }
    if (p('work')) { where.push('work_ref = ?'); args.push(p('work')); }
    if (p('kind')) { where.push('kind = ?'); args.push(p('kind')); }
    const from = Number(p('from')), to = Number(p('to'));
    if (from > 0 && to >= from) { where.push('intro_ayah BETWEEN ? AND ?'); args.push(from, to); }
    const limit = Math.min(500, Math.max(1, Number(p('limit')) || 200));
    const rows = await query<DrillRow>(env.DB_CORE,
      `SELECT gid, skill, work_ref, intro_ayah, payload_json FROM cyb_drill WHERE ${where.join(' AND ')}
        ORDER BY intro_ayah, gid LIMIT ${limit}`, args);
    return ok({ drills: rows.map((r) => ({ ...(JSON.parse(r.payload_json) as Record<string, unknown>), gid: r.gid, skill: r.skill })) });
  });

  router.get('/core/cyb/drills/audit', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const [rules, counts] = await Promise.all([
      auditDrills(env.DB_CORE),
      query<{ status: string; n: number }>(env.DB_CORE, `SELECT status, count(*) AS n FROM cyb_drill GROUP BY status`),
    ]);
    return ok({ bank: Object.fromEntries(counts.map((c) => [c.status, c.n])), rules, clean: rules.every((r) => r.ok) });
  });
}
