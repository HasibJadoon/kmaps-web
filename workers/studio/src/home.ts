import { parseJson } from '../../shared/src/collections';
/// The studio home: the caller's episodes grouped into the three streams.
///
/// Pure shaping over rows — no D1 here — so the whole home can be checked
/// against a fixture of real st_episodes rows. What a stream is called, how it
/// is coloured and which motif it draws come from st_streams; what counts as
/// "in the can" comes from st_pipeline_stages. The only rules in this file are
/// the tree's, and they mirror the app's EpisodeTree exactly (strands first,
/// then session number, then title), so the "next up" the worker names is the
/// one the app would have found walking the same list.

export interface HomeEpisodeRow {
  id: string;
  title: string;
  format: string;
  status: string;
  core_ws_ref: string | null;
  ecosystem: string | null;
  series_ref: string | null;
  session_no: number | null;
  source_ref: string | null;
  last_opened_at: string | null;
}

export interface StreamRow {
  key: string;
  seq: number;
  title_en: string;
  title_ar: string;
  title_face: string;
  tagline: string | null;
  icon: string | null;
  accent: string | null;
  glow: string | null;
  tone: string | null;
  motif: string;
  meta_json: string | null;
}

export interface StageRow {
  key: string;
  seq: number;
  label_en: string;
  label_ar: string;
  icon: string | null;
  tone: string | null;
  statuses: string;
  in_can: number;
}

/// The DeckGraphic JSON shape KMAPSSlides' InfographicView decodes (snake_case).
export interface GraphicItem {
  id?: string;
  label?: string;
  ar?: string;
  en?: string;
  tone?: string;
  icon?: string;
  focus?: boolean;
  points?: string[];
}
export interface Graphic {
  kind: string;
  title?: string;
  term?: string;
  term_ar?: string;
  note?: string;
  icon?: string;
  items: GraphicItem[];
}

export interface StageCount {
  key: string;
  count: number;
}

export interface HomeCounts {
  total: number;
  done: number;
  to_shoot: number;
  by_status: Record<string, number>;
  stages: StageCount[];
}

export interface HomeSeries {
  id: string;
  title: string;
  title_ar: string | null;
  title_en: string;
  parent_id: string | null;
  parent_title_en: string | null;
  channel: string | null;
  total: number;
  done: number;
  next_up: string | null;
}

export interface HomeChannel {
  ws: string;
  count: number;
  done: number;
}

export interface HomeEpisode {
  id: string;
  title: string;
  title_ar: string | null;
  title_en: string;
  status: string;
  channel: string | null;
  series_id: string | null;
  source_ref: string | null;
  session_no: number | null;
  last_opened_at: string | null;
}

export interface HomeStream {
  key: string;
  seq: number;
  title_en: string;
  title_ar: string;
  title_face: string;
  tagline: string | null;
  icon: string | null;
  accent: string[];
  glow: string | null;
  tone: string | null;
  motif: string;
  meta: Record<string, unknown>;
  counts: HomeCounts;
  channels: HomeChannel[];
  series: HomeSeries[];
  next_up: HomeEpisode | null;
  resume: HomeEpisode | null;
  graphics: Graphic[];
}

export interface HomeStage {
  key: string;
  seq: number;
  label_en: string;
  label_ar: string;
  icon: string | null;
  tone: string | null;
  statuses: string[];
  in_can: boolean;
  count: number;
}

export interface StudioHome {
  streams: HomeStream[];
  stages: HomeStage[];
  totals: HomeCounts;
  next_up: HomeEpisode | null;
  resume: HomeEpisode | null;
  /// Episodes whose ecosystem names no stream — still reachable by channel.
  unfiled: number;
  graphic: Graphic;
}

// MARK: - The tree, as the app builds it

const STRAND_FORMATS = new Set(['series', 'group']);
export const isStrand = (r: { format: string }) => STRAND_FORMATS.has(r.format);

export interface Node {
  row: HomeEpisodeRow;
  children: Node[];
}

/// Strands first, then session number (unnumbered last), then title.
function order(a: HomeEpisodeRow, b: HomeEpisodeRow): number {
  const as = isStrand(a), bs = isStrand(b);
  if (as !== bs) return as ? -1 : 1;
  const x = a.session_no, y = b.session_no;
  if (x != null && y != null && x !== y) return x - y;
  if (x == null && y != null) return 1;
  if (x != null && y == null) return -1;
  return a.title < b.title ? -1 : a.title > b.title ? 1 : 0;
}

/// A row whose parent is not in the list surfaces as a root rather than
/// vanishing — the same rule EpisodeTree.build keeps.
export function buildForest(rows: HomeEpisodeRow[]): Node[] {
  const present = new Set(rows.map((r) => r.id));
  const childrenOf = new Map<string, HomeEpisodeRow[]>();
  const roots: HomeEpisodeRow[] = [];
  for (const r of rows) {
    const p = r.series_ref;
    if (p && present.has(p) && p !== r.id) {
      const list = childrenOf.get(p) ?? [];
      list.push(r);
      childrenOf.set(p, list);
    } else {
      roots.push(r);
    }
  }
  const node = (r: HomeEpisodeRow, depth: number): Node => {
    if (depth >= 8) return { row: r, children: [] };
    const kids = [...(childrenOf.get(r.id) ?? [])].sort(order);
    return { row: r, children: kids.map((k) => node(k, depth + 1)) };
  };
  return [...roots].sort(order).map((r) => node(r, 0));
}

/// Every episode under these nodes, in running order.
export function leaves(nodes: Node[]): HomeEpisodeRow[] {
  const out: HomeEpisodeRow[] = [];
  const walk = (n: Node) => {
    if (isStrand(n.row)) n.children.forEach(walk);
    else out.push(n.row);
  };
  nodes.forEach(walk);
  return out;
}

// MARK: - Titles

const ARABIC = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;

/// `القرآن — Qurʾān with Arham` → { ar: 'القرآن', en: 'Qurʾān with Arham' } —
/// the split String.kmTitleParts makes in the app.
export function titleParts(title: string): { ar: string | null; en: string } {
  const parts = title.split(' — ');
  if (parts.length < 2) {
    return ARABIC.test(title) ? { ar: title, en: '' } : { ar: null, en: title };
  }
  const head = parts[0].trim();
  const tail = parts.slice(1).join(' — ').trim();
  if (ARABIC.test(head) && !ARABIC.test(tail)) return { ar: head, en: tail };
  if (ARABIC.test(tail) && !ARABIC.test(head)) return { ar: tail, en: head };
  return { ar: null, en: title };
}

// MARK: - Shaping


function episode(r: HomeEpisodeRow): HomeEpisode {
  const t = titleParts(r.title);
  return {
    id: r.id,
    title: r.title,
    title_ar: t.ar,
    title_en: t.en,
    status: r.status,
    channel: r.core_ws_ref,
    series_id: r.series_ref,
    source_ref: r.source_ref,
    session_no: r.session_no,
    last_opened_at: r.last_opened_at,
  };
}

/// The most recently opened episode among these, if any was opened.
function mostRecent(rows: HomeEpisodeRow[]): HomeEpisodeRow | null {
  let best: HomeEpisodeRow | null = null;
  for (const r of rows) {
    if (!r.last_opened_at || isStrand(r)) continue;
    if (!best || r.last_opened_at > (best.last_opened_at ?? '')) best = r;
  }
  return best;
}

export class Pipeline {
  readonly stages: HomeStage[];
  private stageOf = new Map<string, HomeStage>();

  constructor(rows: StageRow[]) {
    this.stages = [...rows]
      .sort((a, b) => a.seq - b.seq)
      .map((s) => ({
        key: s.key,
        seq: s.seq,
        label_en: s.label_en,
        label_ar: s.label_ar,
        icon: s.icon,
        tone: s.tone,
        statuses: parseJson<string[]>(s.statuses, []),
        in_can: s.in_can === 1,
        count: 0,
      }));
    for (const s of this.stages) for (const st of s.statuses) this.stageOf.set(st, s);
  }

  /// The stage a status sits in, if any.
  stage(status: string): HomeStage | undefined {
    return this.stageOf.get(status);
  }

  /// Shot or published — what the app's `!status.isShootable` calls done.
  inCan(status: string): boolean {
    return this.stageOf.get(status)?.in_can ?? false;
  }

  counts(rows: HomeEpisodeRow[]): HomeCounts {
    const by_status: Record<string, number> = {};
    const stage = new Map<string, number>(this.stages.map((s) => [s.key, 0]));
    let done = 0;
    for (const r of rows) {
      by_status[r.status] = (by_status[r.status] ?? 0) + 1;
      const s = this.stageOf.get(r.status);
      if (s) stage.set(s.key, (stage.get(s.key) ?? 0) + 1);
      if (this.inCan(r.status)) done += 1;
    }
    return {
      total: rows.length,
      done,
      to_shoot: rows.length - done,
      by_status,
      stages: this.stages.map((s) => ({ key: s.key, count: stage.get(s.key) ?? 0 })),
    };
  }
}

/// The strands a stream is made of. A channel's root strand for the stream
/// ("القرآن — Qurʾān with Arham") is the channel itself; the series are the
/// strands one level in. A root holding episodes directly is listed as well,
/// and a root with no strands under it is a series of its own.
function seriesOf(forest: Node[], pipe: Pipeline): HomeSeries[] {
  const out: HomeSeries[] = [];
  const make = (n: Node, parent: Node | null, only?: HomeEpisodeRow[]): HomeSeries => {
    const eps = only ?? leaves([n]);
    const t = titleParts(n.row.title);
    const next = eps.find((e) => !pipe.inCan(e.status)) ?? null;
    return {
      id: n.row.id,
      title: n.row.title,
      title_ar: t.ar,
      title_en: t.en,
      parent_id: parent?.row.id ?? null,
      parent_title_en: parent ? titleParts(parent.row.title).en || parent.row.title : null,
      channel: n.row.core_ws_ref,
      total: eps.length,
      done: eps.filter((e) => pipe.inCan(e.status)).length,
      next_up: next?.id ?? null,
    };
  };
  for (const root of forest) {
    if (!isStrand(root.row)) continue;
    const strands = root.children.filter((c) => isStrand(c.row));
    if (!strands.length) {
      out.push(make(root, null));
      continue;
    }
    const direct = root.children.filter((c) => !isStrand(c.row)).map((c) => c.row);
    if (direct.length) out.push(make(root, null, direct));
    for (const s of strands) out.push(make(s, root));
  }
  // A shelf with episodes on it before an empty one; tree order otherwise.
  return out
    .map((x, i) => ({ x, i }))
    .sort((a, b) => Number(b.x.total > 0) - Number(a.x.total > 0) || a.i - b.i)
    .map(({ x }) => x);
}

const STRAND_ARCHIVED = 'archived';

export function shapeHome(
  rows: HomeEpisodeRow[],
  streamRows: StreamRow[],
  stageRows: StageRow[],
): StudioHome {
  const pipe = new Pipeline(stageRows);
  const streams = [...streamRows].sort((a, b) => a.seq - b.seq);
  const keys = new Set(streams.map((s) => s.key));

  const shaped: HomeStream[] = streams.map((s) => {
    const mine = rows.filter((r) => r.ecosystem === s.key);
    const forest = buildForest(mine);
    const eps = leaves(forest);
    const counts = pipe.counts(eps);

    const byWs = new Map<string, HomeChannel>();
    for (const e of eps) {
      if (!e.core_ws_ref) continue;
      const c = byWs.get(e.core_ws_ref) ?? { ws: e.core_ws_ref, count: 0, done: 0 };
      c.count += 1;
      if (pipe.inCan(e.status)) c.done += 1;
      byWs.set(e.core_ws_ref, c);
    }
    // Channels that hold only strands so far still belong to the stream.
    for (const r of mine) {
      if (r.core_ws_ref && !byWs.has(r.core_ws_ref) && r.status !== STRAND_ARCHIVED) {
        byWs.set(r.core_ws_ref, { ws: r.core_ws_ref, count: 0, done: 0 });
      }
    }

    // Archived strands with nothing under them are history, not a shelf.
    const series = seriesOf(forest, pipe).filter(
      (x) => x.total > 0 || mine.find((r) => r.id === x.id)?.status !== STRAND_ARCHIVED,
    );
    const nextRow = eps.find((e) => !pipe.inCan(e.status)) ?? null;
    const resumeRow = mostRecent(eps);

    const stream: HomeStream = {
      key: s.key,
      seq: s.seq,
      title_en: s.title_en,
      title_ar: s.title_ar,
      title_face: s.title_face,
      tagline: s.tagline,
      icon: s.icon,
      accent: parseJson<string[]>(s.accent, []),
      glow: s.glow,
      tone: s.tone,
      motif: s.motif,
      meta: parseJson<Record<string, unknown>>(s.meta_json, {}),
      counts,
      channels: [...byWs.values()].sort((a, b) => b.count - a.count || (a.ws < b.ws ? -1 : 1)),
      series,
      next_up: nextRow ? episode(nextRow) : null,
      resume: resumeRow ? episode(resumeRow) : null,
      graphics: [],
    };
    stream.graphics = streamGraphics(stream, nextRow);
    return stream;
  });

  const allLeaves = leaves(buildForest(rows.filter((r) => r.ecosystem && keys.has(r.ecosystem))));
  const totals = pipe.counts(allLeaves);
  const unfiled = rows.filter((r) => !isStrand(r) && !(r.ecosystem && keys.has(r.ecosystem))).length;

  // Next up across the streams: the first stream, in its own order, with
  // something left to shoot. Resume: the last episode opened anywhere.
  const next = shaped.find((s) => s.next_up)?.next_up ?? null;
  const resumeRow = mostRecent(allLeaves);

  const stages = pipe.stages.map((st) => ({
    ...st,
    count: totals.stages.find((c) => c.key === st.key)?.count ?? 0,
  }));

  return {
    streams: shaped,
    stages,
    totals,
    next_up: next,
    resume: resumeRow ? episode(resumeRow) : null,
    unfiled,
    graphic: pipelineGraphic(stages, shaped),
  };
}

// MARK: - Infographics (DeckGraphic payloads)

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/// The stream's series as a timeline. (Its shelves round a hub and its own
/// pipeline as chevrons were dropped from the stream page, owner 2026-10-27:
/// the landing's line already shows the pipeline, and the shelves are listed
/// channel by channel.)
function streamGraphics(s: HomeStream, nextRow: HomeEpisodeRow | null): Graphic[] {
  const shelf = s.series.filter((x) => x.total > 0);
  const focusId = nextRow
    ? shelf.find((x) => x.next_up === nextRow.id)?.id ?? null
    : null;
  const graphics: Graphic[] = [];

  if (shelf.length) {
    graphics.push({
      kind: 'timeline',
      title: s.title_en,
      term_ar: s.title_ar,
      note: `${plural(s.counts.total, 'episode')} · ${s.counts.done} in the can · ${s.counts.to_shoot} to shoot`,
      items: shelf.slice(0, 6).map((x) => ({
        id: x.id,
        label: `${x.done}/${x.total}`,
        ar: x.title_ar ?? undefined,
        en: x.title_en || x.parent_title_en || undefined,
        tone: s.tone ?? undefined,
        focus: x.id === focusId ? true : undefined,
      })),
    });
  }

  return graphics;
}

/// planned → draft → … → in the can, across every stream.
function pipelineGraphic(stages: HomeStage[], streams: HomeStream[]): Graphic {
  return {
    kind: 'chevrons',
    title: 'Production',
    items: stages.map((st) => {
      const split = streams
        .map((s) => ({ s, n: s.counts.stages.find((c) => c.key === st.key)?.count ?? 0 }))
        .filter((x) => x.n > 0)
        .map((x) => `${x.s.title_en} ${x.n}`);
      return {
        id: st.key,
        en: st.label_en,
        ar: st.label_ar,
        icon: st.icon ?? undefined,
        tone: st.tone ?? undefined,
        points: [plural(st.count, 'episode'), ...(split.length ? [split.join(' · ')] : [])],
      };
    }),
  };
}
