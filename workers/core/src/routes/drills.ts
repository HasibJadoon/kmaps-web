import type { Router } from '../../../shared/src/router';
import { ok } from '../../../shared/src/response';
import { requireAuth } from '../../../shared/src/auth';
import { query } from '../../../shared/src/db';
import type { CoreEnv } from '../env';

// ── The authored drill bank (core 052) ──────────────────────────────────────────────────────────────────────────
//
//   GET /core/cyb/drills?domain=QR&work=QR:SURAH:44&from=1&to=8&kind=…&skill=…&limit=…&concepts=…
//        (no work and no āyāt: `concepts` whole concepts, least met by this learner first)
//        the live authored drills of a lesson (its work, and for the Qurʾān its āyāt), each as dealt with its gid —
//        a lesson deals them among its own
//   GET /core/cyb/drills/audit
//        every AGR:DRL rule run over the bank: how many drills break it (0 expected) — a drill goes live only clean

interface DrillRow { gid: string; domain: string | null; skill: string | null; work_ref: string | null; intro_ayah: number | null; payload_json: string }
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

/** An authored drill as dealt: its payload, its gid, and the card the app files the answer on — the drill itself is the
 *  card's content (no faces of its own: front/back are the prompt and answer, for lists), its lesson the work. */
export function withCard(r: Pick<DrillRow, 'gid' | 'skill' | 'work_ref' | 'payload_json'> & { domain?: string | null }) {
  const d = JSON.parse(r.payload_json) as Record<string, unknown>;
  const module = r.domain ?? r.gid.split(':')[1] ?? 'AR';
  const text = (v: unknown) => (typeof v === 'string' ? v : Array.isArray(v) ? (v as unknown[]).join(' ') : '');
  const srs = {
    // the card's kind from the drill's science (the card table's own list): grammar, vocabulary, else a passage
    module, resourceType: /^DRL:[A-Z]+:(BL|NH|SF):/.test(r.gid) ? 'grammar' : /^DRL:[A-Z]+:DL:/.test(r.gid) ? 'vocabulary' : 'passage',
    resourceRef: r.gid, cardKind: (d.kind as string) ?? null,
    frontText: text(d.prompt) || text(d.instruction) || r.gid, backText: text(d.answer) || '—',
    cardTemplate: (d.interaction as string) ?? (d.kind as string) ?? null,
    extra: { drill: d, ...(r.work_ref ? { group: { workId: r.work_ref } } : {}) },
  };
  return { ...d, gid: r.gid, skill: r.skill, srs };
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
    if (p('kind')) { where.push('kind = ?'); args.push(p('kind')); }
    if (p('skill')) { where.push('skill = ?'); args.push(p('skill')); }
    const from = Number(p('from')), to = Number(p('to'));
    const ayat = from > 0 && to >= from;
    // the lesson: the drill's own place, or any other place it is met (core 055 cyb_drill_place)
    if (p('work') || ayat) {
      const own = [p('work') ? 'work_ref = ?' : null, ayat ? 'intro_ayah BETWEEN ? AND ?' : null].filter(Boolean).join(' AND ');
      const other = [p('work') ? 'pl.work_ref = ?' : null, ayat ? 'pl.intro_ayah BETWEEN ? AND ?' : null].filter(Boolean).join(' AND ');
      const bind = [...(p('work') ? [p('work')] : []), ...(ayat ? [from, to] : [])];
      where.push(`((${own}) OR EXISTS (SELECT 1 FROM cyb_drill_place pl WHERE pl.gid = cyb_drill.gid AND ${other}))`);
      args.push(...bind, ...bind);
    }
    const limit = Math.min(500, Math.max(1, Number(p('limit')) || 200));
    // no lesson given (a skill's own practice — the grammar concepts): whole concepts, the ones this learner has met
    // least first, then at random — so a round climbs one concept's steps and the bank is walked through, not its
    // first rows over and over
    if (!p('work') && !ayat) {
      const n = Math.min(40, Math.max(1, Number(p('concepts')) || 6));
      // a concept begun comes first (its next steps), then the ones never met; a concept met through is left to review
      const works = await query<{ work_ref: string }>(env.DB_CORE,
        `SELECT d.work_ref, COUNT(c.id) AS met, COUNT(*) AS n FROM cyb_drill d
           LEFT JOIN core_srs_card c ON c.drill_gid = d.gid AND c.user_ref = ?
          WHERE ${where.map((w) => 'd.' + w).join(' AND ')} AND d.work_ref IS NOT NULL
          GROUP BY d.work_ref HAVING met < n
          ORDER BY CASE WHEN met > 0 THEN 0 ELSE 1 END, met, random() LIMIT ${n}`, [ctx.userId, ...args]);
      if (works.length) {
        where.push(`work_ref IN (${works.map(() => '?').join(',')})`);
        args.push(...works.map((w) => w.work_ref));
      }
      // a drill the learner already holds comes back through review or the bank, not as new
      where.push(`NOT EXISTS (SELECT 1 FROM core_srs_card c WHERE c.drill_gid = cyb_drill.gid AND c.user_ref = ?)`);
      args.push(ctx.userId);
    }
    // a lesson (a passage): its drills go round robin until each is right three times (core GRADUATE_AFTER), then live
    // in review — so it deals what has not graduated, the least practised first, by level within a round; and says how
    // far through the passage the learner is (met · graduated · total)
    let lesson: { total: number; met: number; graduated: number } | null = null;
    let order = 'intro_ayah, gid';
    const lessonArgs: unknown[] = [];
    if (p('work') || ayat) {
      const scope = where.join(' AND ');
      const counts = await query<{ total: number; met: number; graduated: number }>(env.DB_CORE,
        `SELECT COUNT(*) AS total,
                SUM(EXISTS (SELECT 1 FROM core_srs_card c WHERE c.drill_gid = cyb_drill.gid AND c.user_ref = ?)) AS met,
                SUM(EXISTS (SELECT 1 FROM core_srs_card c WHERE c.drill_gid = cyb_drill.gid AND c.user_ref = ? AND c.card_state <> 'new')) AS graduated
           FROM cyb_drill WHERE ${scope}`, [ctx.userId, ctx.userId, ...args]);
      lesson = { total: counts[0]?.total ?? 0, met: counts[0]?.met ?? 0, graduated: counts[0]?.graduated ?? 0 };
      const begun = await query<{ root: string }>(env.DB_CORE,
        `SELECT DISTINCT COALESCE(json_extract(d.payload_json, '$.links.root'), d.work_ref) AS root
           FROM core_srs_card c JOIN cyb_drill d ON d.gid = c.drill_gid WHERE c.user_ref = ? AND d.domain = ?`,
        [ctx.userId, p('domain') ?? 'QR']);
      // graduated drills live in review; the rest go ROUND ROBIN — fewest right answers in the lesson first (never met =
      // none), so every drill comes round before any comes again; within a round, begun roots first, by step
      where.push(`NOT EXISTS (SELECT 1 FROM core_srs_card c WHERE c.drill_gid = cyb_drill.gid AND c.user_ref = ? AND c.card_state <> 'new')`);
      args.push(ctx.userId);
      order = `(SELECT COUNT(*) FROM core_srs_review r JOIN core_srs_card c ON c.id = r.card_id
                 WHERE c.drill_gid = cyb_drill.gid AND c.user_ref = ? AND r.state_before = 'new' AND r.rating >= 3),
               CASE WHEN COALESCE(json_extract(payload_json, '$.links.root'), work_ref) IN (SELECT value FROM json_each(?)) THEN 0 ELSE 1 END,
               COALESCE(json_extract(payload_json, '$.step'), 9), intro_ayah, gid`;
      lessonArgs.push(ctx.userId, JSON.stringify(begun.map((b) => b.root)));
    }
    const rows = await query<DrillRow>(env.DB_CORE,
      `SELECT gid, domain, skill, work_ref, intro_ayah, payload_json FROM cyb_drill WHERE ${where.join(' AND ')}
        ORDER BY ${order} LIMIT ${limit}`, [...args, ...lessonArgs]);
    return ok({ drills: rows.map((r) => withCard(r)), ...(lesson ? { lesson } : {}) });
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
