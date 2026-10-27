/// The Qurʾān stream as a plan: every surah of the muṣḥaf, the surah groups
/// it falls into, and the caller's episodes laid over both — so a surah can be
/// studied on its own and a group planned as a whole.
///
/// Pure shaping, like home.ts: QR's study map (surahs, cut passages, naẓm
/// groups) and the caller's st_episodes rows in, the screen's payload out.
/// Which surah an episode is about is read from source_ref — its own
/// (`QR:SP:40:1-3`, `QR:SURAH:44`) or the nearest strand above it that names
/// one — never from a title.

import {
  buildForest, leaves, titleParts, Pipeline,
  type HomeEpisodeRow, type StageRow, type Node,
} from './home';

// MARK: - QR's study map (POST /qr/internal/study-map)

export interface QrSurah {
  id: number;
  name_ar: string;
  name_en: string;
  name_tr: string | null;
  ayah_count: number;
  revelation_type: string;
}

export interface QrPassage {
  surah: number;
  passage_no: number;
  ayah_from: number;
  ayah_to: number;
  title_en: string | null;
  title_ar: string | null;
}

export interface QrGroup {
  id: string;
  name_ar: string | null;
  name_en: string;
  name_tr: string | null;
  surah_from: number;
  surah_to: number;
  member_count: number;
  contiguous: number;
  group_basis: string;
  confidence: string;
  members: number[];
}

export interface StudyMap {
  surahs: QrSurah[];
  passages: QrPassage[];
  groups: QrGroup[];
}

// MARK: - The payload

/// Where a surah stands in the plan; the legend the screen draws.
export interface PlanState {
  key: 'studying' | 'ready' | 'open';
  label_en: string;
  label_ar: string;
  icon: string;
  tone: string | null;
}

export interface PlanStage {
  key: string;
  seq: number;
  label_en: string;
  label_ar: string;
  icon: string | null;
  tone: string | null;
}

export interface PlanChannel {
  ws: string;
  count: number;
}

/// A strand of episodes about one surah — a channel's series on it, or its
/// vocabulary shelf.
export interface PlanTrack {
  id: string;
  title_ar: string | null;
  title_en: string;
  shelf_en: string | null;
  channel: string | null;
  total: number;
  done: number;
  next_up: string | null;
  /// Episodes per pipeline stage, in stage order.
  stages: { key: string; count: number }[];
}

/// A cut passage and the furthest stage any episode on it has reached.
export interface PlanPassage {
  no: number;
  from: number;
  to: number;
  title_en: string | null;
  title_ar: string | null;
  stage: string | null;
  episodes: number;
  channels: string[];
}

export interface PlanSurah {
  no: number;
  name_ar: string;
  name_en: string;
  ayahs: number;
  revelation: string;
  state: PlanState['key'];
  passages_cut: number;
  episodes: number;
  done: number;
  channels: PlanChannel[];
  /// Only on surahs with something to show — cut passages or episodes.
  passages?: PlanPassage[];
  tracks?: PlanTrack[];
}

export interface PlanGroup {
  id: string;
  name_ar: string | null;
  name_en: string;
  name_tr: string | null;
  /// `40–46`, or `7 surahs` when the members are not one run.
  span: string;
  basis: string;
  confidence: string;
  members: number[];
  studying: number;
  ready: number;
  episodes: number;
  done: number;
}

export interface QuranPlan {
  stream: string;
  states: PlanState[];
  stages: PlanStage[];
  surahs: PlanSurah[];
  groups: PlanGroup[];
  /// The surah and group to open on: where the next episode to shoot is.
  focus_surah: number | null;
  focus_group: string | null;
  /// Episodes in the stream that name no surah.
  unplaced: number;
}

export const PLAN_STATES: PlanState[] = [
  { key: 'studying', label_en: 'In study', label_ar: 'قيد الدرس', icon: 'book.pages', tone: 'gold' },
  { key: 'ready', label_en: 'Passages cut', label_ar: 'مقاطع جاهزة', icon: 'scissors', tone: 'teal' },
  { key: 'open', label_en: 'Not started', label_ar: 'لم يبدأ', icon: 'circle.dashed', tone: null },
];

/// qr_surah.revelation_type as the page says it.
const REVELATION: Record<string, string> = { makki: 'Makkī', madani: 'Madanī' };

// MARK: - Reading a source_ref

/// `QR:SP:40:1-3` → { surah: 40, from: 1, to: 3 }; `QR:SURAH:44` → { surah: 44 }.
export function surahRef(ref: string | null): { surah: number; from?: number; to?: number } | null {
  if (!ref) return null;
  const p = ref.split(':');
  if (p[0] !== 'QR') return null;
  if (p[1] === 'SURAH' && p.length === 3) {
    const surah = Number(p[2]);
    return Number.isInteger(surah) && surah > 0 ? { surah } : null;
  }
  if (p[1] === 'SP' && p.length === 4) {
    const surah = Number(p[2]);
    const [a, b] = p[3].split('-').map(Number);
    if (!Number.isInteger(surah) || !Number.isInteger(a)) return null;
    return { surah, from: a, to: Number.isInteger(b) ? b : a };
  }
  return null;
}

// MARK: - Shaping

export function shapeQuranPlan(
  stream: string,
  rows: HomeEpisodeRow[],
  stageRows: StageRow[],
  map: StudyMap,
): QuranPlan {
  const pipe = new Pipeline(stageRows);
  const mine = rows.filter((r) => r.ecosystem === stream);
  const forest = buildForest(mine);
  const eps = leaves(forest);
  const byId = new Map(mine.map((r) => [r.id, r]));

  // An episode's surah: its own ref, else the nearest strand above that names one.
  const surahOf = (r: HomeEpisodeRow) => {
    let at: HomeEpisodeRow | undefined = r;
    for (let depth = 0; at && depth < 8; depth++) {
      const ref = surahRef(at.source_ref);
      if (ref) return ref;
      at = at.series_ref ? byId.get(at.series_ref) : undefined;
    }
    return null;
  };

  const onSurah = new Map<number, { row: HomeEpisodeRow; from?: number; to?: number }[]>();
  let unplaced = 0;
  for (const e of eps) {
    const ref = surahOf(e);
    if (!ref) { unplaced += 1; continue; }
    const list = onSurah.get(ref.surah) ?? [];
    list.push({ row: e, from: ref.from, to: ref.to });
    onSurah.set(ref.surah, list);
  }

  const passagesOf = new Map<number, QrPassage[]>();
  for (const p of map.passages) {
    const list = passagesOf.get(p.surah) ?? [];
    list.push(p);
    passagesOf.set(p.surah, list);
  }

  // A strand's title, for the track an episode sits on.
  const strandOf = (r: HomeEpisodeRow) => (r.series_ref ? byId.get(r.series_ref) : undefined);
  const nodeIndex = new Map<string, Node>();
  const index = (ns: Node[]) => ns.forEach((n) => { nodeIndex.set(n.row.id, n); index(n.children); });
  index(forest);

  const stageSeq = (key: string | null) => pipe.stages.find((s) => s.key === key)?.seq ?? -1;

  const surahs: PlanSurah[] = map.surahs.map((s) => {
    const here = onSurah.get(s.id) ?? [];
    const cut = passagesOf.get(s.id) ?? [];
    const done = here.filter((e) => pipe.inCan(e.row.status)).length;

    const ws = new Map<string, number>();
    for (const e of here) {
      if (e.row.core_ws_ref) ws.set(e.row.core_ws_ref, (ws.get(e.row.core_ws_ref) ?? 0) + 1);
    }
    const channels = [...ws.entries()]
      .map(([w, count]) => ({ ws: w, count }))
      .sort((a, b) => b.count - a.count || (a.ws < b.ws ? -1 : 1));

    const out: PlanSurah = {
      no: s.id,
      name_ar: s.name_ar,
      name_en: s.name_tr || s.name_en,
      ayahs: s.ayah_count,
      revelation: REVELATION[s.revelation_type] ?? s.revelation_type,
      state: here.length ? 'studying' : cut.length ? 'ready' : 'open',
      passages_cut: cut.length,
      episodes: here.length,
      done,
      channels,
    };
    if (!here.length && !cut.length) return out;

    out.passages = cut.map((p) => {
      // an episode is on a passage when their āyāt meet; a whole-surah one is on none
      const on = here.filter((e) => e.from != null && e.to != null && e.from <= p.ayah_to && e.to >= p.ayah_from);
      let stage: string | null = null;
      for (const e of on) {
        const st = pipe.stage(e.row.status)?.key ?? null;
        if (stageSeq(st) > stageSeq(stage)) stage = st;
      }
      return {
        no: p.passage_no,
        from: p.ayah_from,
        to: p.ayah_to,
        title_en: p.title_en,
        title_ar: p.title_ar,
        stage,
        episodes: on.length,
        channels: [...new Set(on.map((e) => e.row.core_ws_ref).filter((w): w is string => !!w))],
      };
    });

    const tracks = new Map<string, HomeEpisodeRow[]>();
    for (const e of here) {
      const key = e.row.series_ref ?? e.row.id;
      const list = tracks.get(key) ?? [];
      list.push(e.row);
      tracks.set(key, list);
    }
    out.tracks = [...tracks.entries()].map(([id, list]) => {
      const strand = byId.get(id);
      const t = titleParts(strand?.title ?? list[0].title);
      const shelf = strand ? strandOf(strand) : undefined;
      // in running order, as the tree walks it
      const ordered = strand && nodeIndex.has(id)
        ? leaves([nodeIndex.get(id)!]).filter((x) => list.includes(x))
        : list;
      const next = ordered.find((x) => !pipe.inCan(x.status)) ?? null;
      const c = pipe.counts(ordered);
      return {
        id,
        title_ar: t.ar,
        title_en: t.en,
        shelf_en: shelf ? titleParts(shelf.title).en || shelf.title : null,
        channel: strand?.core_ws_ref ?? list[0].core_ws_ref,
        total: ordered.length,
        done: c.done,
        next_up: next?.id ?? null,
        stages: c.stages,
      };
    // a channel's tracks together, then the larger first
    }).sort((a, b) => (a.channel ?? '~').localeCompare(b.channel ?? '~') || b.total - a.total || (a.id < b.id ? -1 : 1));
    return out;
  });

  const bySurah = new Map(surahs.map((s) => [s.no, s]));
  const groups: PlanGroup[] = map.groups.map((g) => {
    const ms = g.members.map((n) => bySurah.get(n)).filter((x): x is PlanSurah => !!x);
    return {
      id: g.id,
      name_ar: g.name_ar,
      name_en: g.name_en,
      name_tr: g.name_tr,
      span: g.contiguous ? `${g.surah_from}–${g.surah_to}` : `${g.members.length} surahs`,
      basis: g.group_basis,
      confidence: g.confidence,
      members: g.members,
      studying: ms.filter((m) => m.state === 'studying').length,
      ready: ms.filter((m) => m.state !== 'open').length,
      episodes: ms.reduce((n, m) => n + m.episodes, 0),
      done: ms.reduce((n, m) => n + m.done, 0),
    };
  });
  // Groups with a surah in study first, then those with passages cut, then
  // the rest; within each, the close-knit before the sprawling (Ḥawāmīm
  // before "the Makkan surahs"), a run before a scatter.
  const contiguous = new Map(map.groups.map((g) => [g.id, g.contiguous === 1]));
  const tier = (g: PlanGroup) => (g.studying ? 0 : g.ready ? 1 : 2);
  groups.sort((a, b) =>
    tier(a) - tier(b)
    || a.members.length - b.members.length
    || Number(contiguous.get(b.id)) - Number(contiguous.get(a.id))
    || a.members[0] - b.members[0]);

  const next = eps.find((e) => !pipe.inCan(e.status) && surahOf(e));
  const focusSurah = next ? surahOf(next)!.surah : surahs.find((s) => s.state === 'studying')?.no ?? null;
  const focusGroup = focusSurah == null ? null
    : groups.find((g) => g.members.includes(focusSurah) && contiguous.get(g.id) && g.members.length > 1)?.id
      ?? groups.find((g) => g.members.includes(focusSurah))?.id ?? null;

  return {
    stream,
    states: PLAN_STATES,
    stages: pipe.stages.map(({ key, seq, label_en, label_ar, icon, tone }) => ({ key, seq, label_en, label_ar, icon, tone })),
    surahs,
    groups,
    focus_surah: focusSurah,
    focus_group: focusGroup,
    unplaced,
  };
}
