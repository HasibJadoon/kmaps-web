/// Where an episode sits in the Liberalism curriculum (owner 2026-11-17: "cluster → favour, critic; series basic to
/// evolve day by day"): its round (1 Basic … 4 Expert), its cluster (one big question of liberalism) and its angle
/// (favour · critic · islamic · guide · synthesis). Labels and colours come from the series meta, so the apps carry
/// none: `rounds` [{n, label}], `clusters` [{n, label}], `angles` {key: {label, color}}, `guides` {cluster: [{who,
/// line}]}, `depth` {cluster: [source ids the guides draw on]}.

import { line, obj, str } from './text';

export interface OrderRow {
  id: string; session_no: number | null; state: string | null;
  source_ref?: string | null; round?: number | null; cluster?: number | null; angle?: string | null;
}

function byN(list: unknown, n: number | null | undefined): Record<string, unknown> | null {
  if (n == null || !Array.isArray(list)) return null;
  return (list as unknown[]).map(obj).find((r) => r['n'] === n) ?? null;
}

const num = (v: unknown) => (typeof v === 'number' ? v : null);

export function roundOf(seriesMeta: Record<string, unknown>, n: number | null | undefined) {
  const r = byN(seriesMeta['rounds'], n);
  return n == null ? null : { n, label: str(r?.['label']) ?? `Round ${n}` };
}

export function clusterOf(seriesMeta: Record<string, unknown>, n: number | null | undefined) {
  const c = byN(seriesMeta['clusters'], n);
  return n == null ? null : { n, label: line(c?.['label']) ?? `Cluster ${n}` };
}

export function angleOf(seriesMeta: Record<string, unknown>, key: string | null | undefined) {
  if (!key) return null;
  const a = obj(obj(seriesMeta['angles'])[key]);
  return { key, label: str(a['label']) ?? key[0]!.toUpperCase() + key.slice(1), color: str(a['color']) };
}

/// The chip on the hub: "Round 1 · Basic · Liberty & the self · Favour".
export function placeOf(meta: Record<string, unknown>, seriesMeta: Record<string, unknown>) {
  const round = roundOf(seriesMeta, num(meta['round'])), cluster = clusterOf(seriesMeta, num(meta['cluster']));
  const angle = angleOf(seriesMeta, str(meta['angle']));
  return round || cluster || angle ? { round, cluster, angle } : null;
}

/// The heading a tile sits under in the grid: "Round 1 · Basic › Liberty & the self".
export function groupLabel(e: Pick<OrderRow, 'round' | 'cluster'>, seriesMeta: Record<string, unknown>): string | null {
  const r = roundOf(seriesMeta, e.round), c = clusterOf(seriesMeta, e.cluster);
  if (!r && !c) return null;
  return [r ? `Round ${r.n} · ${r.label}` : null, c?.label].filter(Boolean).join(' › ');
}

/// How deep the episodes have gone into the corpus the guides (Imam Tom, Gray, Hallaq) draw on for this cluster:
/// a source counts once any of its episodes is recorded.
export function depthOf(meta: Record<string, unknown>, seriesMeta: Record<string, unknown>, order: OrderRow[]) {
  const n = num(meta['cluster']);
  if (n == null) return null;
  const want = (Array.isArray(obj(seriesMeta['depth'])[String(n)]) ? obj(seriesMeta['depth'])[String(n)] as unknown[] : [])
    .map(str).filter((s): s is string => !!s);
  const guides = (Array.isArray(obj(seriesMeta['guides'])[String(n)]) ? obj(seriesMeta['guides'])[String(n)] as unknown[] : [])
    .map(obj).map((g) => ({ who: str(g['who']) ?? '', line: line(g['line']) ?? '' })).filter((g) => g.who && g.line);
  if (!want.length && !guides.length) return null;
  const done = new Set(order.filter((e) => e.state === 'done' && e.source_ref).map((e) => e.source_ref!));
  const covered = want.filter((s) => done.has(s)).length;
  return { cluster: clusterOf(seriesMeta, n)!.label, covered, of: want.length,
    pct: want.length ? Math.round((covered / want.length) * 100) : 0, guides };
}
