import type { Router } from './router';
import { ok, badRequest, notFound, conflict, forbidden, unauthorized } from './response';
import { query, queryOne, execute } from './db';
import { actorRef, forwardedReviewer } from './auth';

// One domain's half of the intake (kmaps-web workers/arabic/src/routes/intake.ts): the items the
// inbox routed to THIS domain and the stage each has reached here. The QR and WV workers mount it
// over their own tables (qr_intake_pipeline + qr_intake_stage, wv_intake_pipeline + wv_intake_stage),
// so each domain owns its pipeline and the words for its stages.
//
//   GET    /<p>/intake-pipeline            the pipeline, stage by stage (signed in)
//   POST   /<p>/intake-pipeline/lookup     {refs}  → each ref's stage           (inbox)
//   PUT    /<p>/intake-pipeline            {intakeRef,url,title,kind,itemCount} (inbox: routed here)
//   DELETE /<p>/intake-pipeline            {intakeRef} — only while still queued (inbox: unrouted)
//   PATCH  /<p>/intake-pipeline/stage      {intakeRef, stage, targetRef?, note?} (inbox or reviewer)
//
// Writes come from the Arabic worker's service binding (X-KM-Origin: ar-intake — the gateway strips
// any X-KM- header a caller sends, so only an internal call carries it) or from a reviewer.

export interface PipelineSpec<E> {
  prefix: string;                 // '/qr' | '/wv'
  db: (env: E) => D1Database;
  table: string;                  // qr_intake_pipeline
  stages: string;                 // qr_intake_stage
}

interface StageRow { key: string; label: string; label_ar: string | null; detail: string | null; icon: string | null; color: string | null; sort: number }
interface PipeRow { intake_ref: string; url: string; title: string | null; kind: string | null; item_count: number | null;
                    stage: string; target_ref: string | null; note: string | null; updated_at: string }

const internal = (req: Request) => req.headers.get('X-KM-Origin') === 'ar-intake';
const badge = (s: StageRow | undefined, key: string) =>
  ({ key, label: s?.label ?? key, labelAr: s?.label_ar ?? null, icon: s?.icon ?? null, color: s?.color ?? null });

export function intakePipelineRoutes<E>(router: Router<E>, spec: PipelineSpec<E>) {
  const base = `${spec.prefix}/intake-pipeline`;
  const stagesOf = async (env: E) => query<StageRow>(spec.db(env), `SELECT * FROM ${spec.stages} ORDER BY sort`);
  const canWrite = (req: Request) => internal(req) || forwardedReviewer(req);

  router.get(base, async (req, env) => {
    if (!actorRef(req) && !internal(req)) return unauthorized();
    const stage = new URL(req.url).searchParams.get('stage');
    const [stages, rows, counts] = await Promise.all([
      stagesOf(env),
      query<PipeRow>(spec.db(env), `SELECT * FROM ${spec.table} ${stage ? 'WHERE stage = ?' : ''} ORDER BY updated_at DESC LIMIT 500`, stage ? [stage] : []),
      query<{ stage: string; n: number }>(spec.db(env), `SELECT stage, COUNT(1) AS n FROM ${spec.table} GROUP BY stage`),
    ]);
    const by = new Map(stages.map((s) => [s.key, s]));
    const n = new Map(counts.map((c) => [c.stage, c.n]));
    return ok({
      stages: stages.map((s) => ({ ...badge(s, s.key), detail: s.detail, count: n.get(s.key) ?? 0 })),
      items: rows.map((r) => ({ intakeRef: r.intake_ref, url: r.url, title: r.title, kind: r.kind, itemCount: r.item_count,
                                stage: badge(by.get(r.stage), r.stage), targetRef: r.target_ref, note: r.note, updatedAt: r.updated_at })),
    });
  });

  router.post(`${base}/lookup`, async (req, env) => {
    if (!internal(req) && !actorRef(req)) return unauthorized();
    const b = await req.json().catch(() => ({})) as { refs?: unknown };
    const refs = Array.isArray(b.refs) ? b.refs.filter((r): r is string => typeof r === 'string').slice(0, 1000) : [];
    const stages = await stagesOf(env);
    const by = new Map(stages.map((s) => [s.key, s]));
    const rows: PipeRow[] = [];
    for (let i = 0; i < refs.length; i += 90) {      // D1 caps bound parameters per statement
      const part = refs.slice(i, i + 90);
      rows.push(...await query<PipeRow>(spec.db(env),
        `SELECT * FROM ${spec.table} WHERE intake_ref IN (${part.map(() => '?').join(',')})`, part));
    }
    return ok({
      stages: stages.map((s) => ({ ...badge(s, s.key), detail: s.detail })),
      rows: rows.map((r) => ({ intakeRef: r.intake_ref, stage: badge(by.get(r.stage), r.stage), targetRef: r.target_ref })),
    });
  });

  router.put(base, async (req, env) => {
    if (!canWrite(req)) return forbidden();
    const b = await req.json().catch(() => ({})) as Record<string, unknown>;
    const ref = typeof b.intakeRef === 'string' ? b.intakeRef : '';
    if (!/^AR:IN:/.test(ref) || typeof b.url !== 'string') return badRequest('intakeRef (AR:IN:…) and url are needed');
    await execute(spec.db(env),
      `INSERT INTO ${spec.table} (intake_ref, url, title, kind, item_count, target_ref) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(intake_ref) DO UPDATE SET url = excluded.url, title = excluded.title, kind = excluded.kind,
         item_count = excluded.item_count, target_ref = COALESCE(${spec.table}.target_ref, excluded.target_ref),
         updated_at = datetime('now')`,
      [ref, b.url, (b.title as string) ?? null, (b.kind as string) ?? null,
       typeof b.itemCount === 'number' ? b.itemCount : null, (b.targetRef as string) ?? null]);
    return ok({ intakeRef: ref });
  });

  router.delete(base, async (req, env) => {
    if (!canWrite(req)) return forbidden();
    const b = await req.json().catch(() => ({})) as Record<string, unknown>;
    const ref = String(b.intakeRef ?? '');
    const row = await queryOne<PipeRow>(spec.db(env), `SELECT * FROM ${spec.table} WHERE intake_ref = ?`, [ref]);
    if (!row) return ok({ intakeRef: ref, removed: false });
    if (row.stage !== 'queued') return conflict('under way');
    await execute(spec.db(env), `DELETE FROM ${spec.table} WHERE intake_ref = ?`, [ref]);
    return ok({ intakeRef: ref, removed: true });
  });

  router.patch(`${base}/stage`, async (req, env) => {
    if (!canWrite(req)) return forbidden();
    const b = await req.json().catch(() => ({})) as Record<string, unknown>;
    const ref = String(b.intakeRef ?? ''), stage = String(b.stage ?? '');
    const stages = await stagesOf(env);
    if (!stages.some((s) => s.key === stage)) return badRequest('unknown stage');
    const sets = ['stage = ?'], args: unknown[] = [stage];
    if (b.targetRef !== undefined) { sets.push('target_ref = ?'); args.push(b.targetRef ? String(b.targetRef) : null); }
    if (b.note !== undefined) { sets.push('note = ?'); args.push(b.note ? String(b.note) : null); }
    const res = await execute(spec.db(env), `UPDATE ${spec.table} SET ${sets.join(', ')}, updated_at = datetime('now') WHERE intake_ref = ?`, [...args, ref]);
    if (!res.meta.changes) return notFound(`pipeline item ${ref}`);
    const s = stages.find((x) => x.key === stage);
    return ok({ intakeRef: ref, stage: badge(s, stage) });
  });
}
