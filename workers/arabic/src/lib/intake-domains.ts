import { query, execute } from '../../../shared/src/db';
import type { ArabicEnv } from '../env';
import { byKey, type Label } from './labels';

// The intake routes each item to up to three domains, and each runs its own pipeline (migration
// 0042): AR here (ar_intake_pipeline), QR and WV in their own databases, reached over the service
// bindings (shared/src/intake-pipeline.ts). This file is the inbox's side of that conversation.

export const DOMAINS = ['ar', 'qr', 'wv'] as const;
export type Domain = typeof DOMAINS[number];
export const FLAG: Record<Domain, string> = { ar: 'to_ar', qr: 'to_qr', wv: 'to_wv' };

export interface StageBadge { key: string; label: string; labelAr: string | null; icon: string | null; color: string | null }
export interface StageOption extends StageBadge { detail: string | null; count?: number }
export interface DomainStage { stage: StageBadge; targetRef: string | null }

const ref = (id: string) => `AR:${id}`;

function remote(env: ArabicEnv, d: Exclude<Domain, 'ar'>): Fetcher | undefined {
  return d === 'qr' ? env.QURAN : env.WORLDVIEW;
}

async function call<T>(env: ArabicEnv, d: Exclude<Domain, 'ar'>, method: string, path: string, body?: unknown): Promise<{ status: number; data: T | null }> {
  const f = remote(env, d);
  if (!f) return { status: 503, data: null };
  const r = await f.fetch(`https://${d}/${d}/intake-pipeline${path}`, {
    method, headers: { 'content-type': 'application/json', 'X-KM-Origin': 'ar-intake' },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).catch(() => null);
  if (!r) return { status: 503, data: null };
  const j = await r.json().catch(() => null) as { data?: T } | null;
  return { status: r.status, data: j?.data ?? null };
}

const arBadge = (l: Label | undefined, key: string): StageBadge =>
  ({ key, label: l?.label ?? key, labelAr: l?.labelAr ?? null, icon: l?.icon ?? null, color: l?.color ?? null });

/** Each domain's stages, in order, with how many items sit at each. */
export async function boards(env: ArabicEnv, L: Record<string, Label[]>): Promise<Record<Domain, StageOption[]>> {
  const arCounts = new Map((await query<{ stage: string; n: number }>(env.DB_AR,
    `SELECT stage, COUNT(1) AS n FROM ar_intake_pipeline GROUP BY stage`)).map((c) => [c.stage, c.n]));
  const ar = (L.pipeline_ar ?? []).map((l) => ({ ...arBadge(l, l.key), detail: l.detail, count: arCounts.get(l.key) ?? 0 }));
  const [qr, wv] = await Promise.all((['qr', 'wv'] as const).map(async (d) =>
    (await call<{ stages: StageOption[] }>(env, d, 'GET', '')).data?.stages ?? []));
  return { ar, qr, wv };
}

/** Where each of these items stands in each domain it was routed to. */
export async function stagesOf(env: ArabicEnv, L: Record<string, Label[]>, ids: string[]): Promise<Record<Domain, Map<string, DomainStage>>> {
  const out: Record<Domain, Map<string, DomainStage>> = { ar: new Map(), qr: new Map(), wv: new Map() };
  if (!ids.length) return out;
  const P = byKey(L.pipeline_ar);
  for (let i = 0; i < ids.length; i += 90) {
    const part = ids.slice(i, i + 90);
    for (const r of await query<{ intake_id: string; stage: string; target_ref: string | null }>(env.DB_AR,
      `SELECT intake_id, stage, target_ref FROM ar_intake_pipeline WHERE intake_id IN (${part.map(() => '?').join(',')})`, part))
      out.ar.set(r.intake_id, { stage: arBadge(P.get(r.stage), r.stage), targetRef: r.target_ref });
  }
  await Promise.all((['qr', 'wv'] as const).map(async (d) => {
    const res = await call<{ rows: { intakeRef: string; stage: StageBadge; targetRef: string | null }[] }>(env, d, 'POST', '/lookup', { refs: ids.map(ref) });
    for (const r of res.data?.rows ?? []) out[d].set(r.intakeRef.replace(/^AR:/, ''), { stage: r.stage, targetRef: r.targetRef });
  }));
  return out;
}

export interface Routed { id: string; url: string; title: string | null; kind: string; item_count: number | null;
                          acq_ref_id: string | null; wv_source_ref: string | null }

/** Put a queued item into a domain's pipeline (idempotent). */
export async function enter(env: ArabicEnv, d: Domain, it: Routed): Promise<boolean> {
  if (d === 'ar') {
    await execute(env.DB_AR, `INSERT OR IGNORE INTO ar_intake_pipeline (intake_id, target_ref) VALUES (?, ?)`, [it.id, it.acq_ref_id]);
    return true;
  }
  const res = await call(env, d, 'PUT', '', { intakeRef: ref(it.id), url: it.url, title: it.title, kind: it.kind,
    itemCount: it.item_count, targetRef: d === 'wv' && it.wv_source_ref ? it.wv_source_ref.replace(/^WV:/, '') : null });
  return res.status < 300;
}

/** Take it out of a domain's pipeline — only while that domain has not started on it. */
export async function leave(env: ArabicEnv, d: Domain, id: string): Promise<'removed' | 'busy' | 'failed'> {
  if (d === 'ar') {
    const res = await execute(env.DB_AR, `DELETE FROM ar_intake_pipeline WHERE intake_id = ? AND stage = 'queued'`, [id]);
    if (res.meta.changes) return 'removed';
    const still = await query(env.DB_AR, `SELECT 1 FROM ar_intake_pipeline WHERE intake_id = ?`, [id]);
    return still.length ? 'busy' : 'removed';
  }
  const res = await call(env, d, 'DELETE', '', { intakeRef: ref(id) });
  return res.status === 409 ? 'busy' : res.status < 300 ? 'removed' : 'failed';
}

/** Move it to a stage in one domain's pipeline. */
export async function setStage(env: ArabicEnv, L: Record<string, Label[]>, d: Domain, id: string, stage: string,
                               targetRef?: string | null): Promise<{ status: number }> {
  if (d === 'ar') {
    if (!byKey(L.pipeline_ar).has(stage)) return { status: 400 };
    const sets = ['stage = ?'], args: unknown[] = [stage];
    if (targetRef !== undefined) { sets.push('target_ref = ?'); args.push(targetRef); }
    const res = await execute(env.DB_AR, `UPDATE ar_intake_pipeline SET ${sets.join(', ')}, updated_at = datetime('now') WHERE intake_id = ?`, [...args, id]);
    return { status: res.meta.changes ? 200 : 404 };
  }
  const body: Record<string, unknown> = { intakeRef: ref(id), stage };
  if (targetRef !== undefined) body.targetRef = targetRef;
  return { status: (await call(env, d, 'PATCH', '/stage', body)).status };
}
