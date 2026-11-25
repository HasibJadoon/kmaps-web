/// Read along — one episode for the iPad, shaped from km_content alone (owner 2026-11-26: "generic, all fed from D1,
/// no local logic"). A series is a cm_collections row (collection_type 'series') whose meta_json.readalong says how it
/// is shown (stream, Arabic face, where the hub offers it, every label as a {slot} template). Its episodes are the
/// episode docs linked in order by cm_collection_items. An episode's scenes are its `scene` blocks: each is drawn by
/// what it holds — its own text (attrs.read), a contrast, steps, or a strip of lines — never by its key name. Every
/// episode opens on a cover (doc meta.cover). A new series or episode is new rows; nothing here or in the apps changes.

export type ReadAlongConfig = {
  stream?: number;
  face?: string;                      // amiri | mushaf
  place?: string;                     // "intro" (a tafsīr's sūra introduction) | "surah" (a sūra's page)
  surah?: number;                     // offered on this sūra only (absent = every sūra)
  unit?: string;
  units?: string;
  labels: Record<string, string>;
};

export type SeriesRow = { collection_id: string; title: string; title_ar: string | null; meta_json: string | null };
export type EpisodeRow = { doc_id: string; title: string; meta_json: string | null; episode_no: number };
export type BlockRow = { block_id: string; seq_order: number; attrs_json: string | null };

type ReadLine = { n: number; ar: string; en?: string | null; ref?: string };
type Contrast = { told?: string; text?: string; told_label?: string; text_label?: string };
type Step = { ref?: string; text?: string };
type Drawing = { topic?: string; ref?: string; symbol?: string; title?: string; contrast?: Contrast; steps?: Step[];
                 link?: { from?: string; to?: string; text?: string } } | null;
type Strip = { topic?: string; ref?: string; symbol?: string; subs?: Array<{ who?: string; text?: string }> } | null;
type Attrs = {
  section?: { heading?: string; key?: string };
  point?: { cue?: string };
  overlay?: { strip?: Strip; drawing?: Drawing };
  read?: { lines?: ReadLine[] };
};

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const arabicDigits = (n: number) => String(n).replace(/\d/g, (d) => AR_DIGITS[Number(d)]);
const hasArabic = (t: string) => /[؀-ۿ]/.test(t);
const parse = <T>(s: string | null | undefined, d: T): T => { try { return s ? JSON.parse(s) as T : d; } catch { return d; } };

/// {slot} templates: {ep} {name_en} {NAME_EN} {title} {count}
export function fill(t: string | undefined, v: Record<string, string | number>): string {
  if (!t) return '';
  return t.replace(/\{([A-Za-z_]+)\}/g, (_, k: string) => (v[k] !== undefined ? String(v[k]) : `{${k}}`));
}

export function readalongConfig(metaJson: string | null): ReadAlongConfig | null {
  const r = parse<Record<string, unknown>>(metaJson, {})['readalong'] as ReadAlongConfig | undefined;
  return r && r.labels ? r : null;
}

export function offeredHere(cfg: ReadAlongConfig, place: string, surah: number): boolean {
  if ((cfg.place ?? 'surah') !== place) return false;
  return cfg.surah === undefined || !surah || cfg.surah === surah;
}

/// One scene block → one scene, by what it holds.
export function shapeScene(b: BlockRow, cfg: ReadAlongConfig): Record<string, unknown> {
  const L = cfg.labels, face = cfg.face ?? 'amiri';
  const a = parse<Attrs>(b.attrs_json, {});
  const d = a.overlay?.drawing ?? null, strip = a.overlay?.strip ?? null;
  const lines = (a.read?.lines ?? []).filter((l) => l.ar);
  const common = { id: b.block_id, cue: a.point?.cue ?? null, ref: d?.ref ?? strip?.ref ?? null, heading: a.section?.heading ?? null };
  const eyebrow = (d?.topic ?? strip?.topic ?? a.section?.heading ?? '').toUpperCase();
  const c = d?.contrast;
  const lesson = c && c.told ? {
    type: 'lesson', label: fill(L.lesson, {}),
    good: { label: (c.text_label ?? '').toUpperCase(), ar: d?.symbol ?? '', en: c.text ?? null },
    bad: hasArabic(c.told) ? { label: (c.told_label ?? '').toUpperCase(), ar: c.told, en: null }
                           : { label: (c.told_label ?? '').toUpperCase(), ar: '', en: c.told },
    note: null,
  } : null;

  if (lines.length > 1) {
    return { ...common, type: 'page', eyebrow, face, count: `${lines.length} ${cfg.units ?? ''}`.trim(),
             lines: lines.map((l) => ({ n: l.n, mark: face === 'mushaf' ? `﴿${arabicDigits(l.n)}﴾` : arabicDigits(l.n), text: l.ar })) };
  }
  if (lines.length === 1) {
    const l = lines[0];
    const beats: Array<Record<string, unknown>> = [];
    if (l.en) beats.push({ type: 'meaning', label: fill(L.meaning, {}), text: l.en });
    if (lesson) beats.push(lesson);
    return { ...common, type: 'line', eyebrow, sub: d?.title ?? null, n: l.n, text: l.ar, face, audio: null, beats };
  }
  if (lesson) {
    return { ...common, type: 'short', eyebrow, sub: common.ref, word: d?.symbol ?? null, text: d?.title ?? '', good: lesson.good, bad: lesson.bad };
  }
  if (d?.steps?.length) {
    return { ...common, type: 'steps', eyebrow, title: d.title ?? '', word: d.symbol ?? null,
             steps: d.steps.map((s) => ({ ref: s.ref ?? null, text: s.text ?? '' })) };
  }
  const link = d?.link;
  return { ...common, type: 'talk', eyebrow, title: d?.title ?? null, word: d?.symbol ?? strip?.symbol ?? null,
           sub: link?.from && link?.to ? `${link.from} → ${link.to}` : common.ref, text: link?.text ?? null,
           talk: (strip?.subs ?? []).map((s) => ({ who: s.who ?? '', text: s.text ?? '' })) };
}

/// How many read the episode together (doc meta.people); 2 or more = a live room for it.
export function peopleOf(ep: EpisodeRow): number {
  const n = Number(parse<{ people?: unknown }>(ep.meta_json, {}).people ?? 1);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

export function shapeEpisode(series: SeriesRow, cfg: ReadAlongConfig, episodes: EpisodeRow[], ep: EpisodeRow, blocks: BlockRow[]) {
  const L = cfg.labels;
  const no = ep.episode_no, pad = String(no).padStart(2, '0');
  const v = { ep: pad, name_en: series.title, NAME_EN: series.title.toUpperCase() };
  const cover = parse<{ cover?: { title?: string; subtitle?: string } }>(ep.meta_json, {}).cover ?? {};
  const next = episodes.find((e) => e.episode_no > no);
  const nextTitle = next ? (parse<{ cover?: { title?: string } }>(next.meta_json, {}).cover?.title ?? next.title) : null;
  // one title template, at both ends of the episode: the same card opens it and closes it
  const titleCard = (role: 'open' | 'close') => ({
    id: `${ep.doc_id}:${role}`, type: 'title', role, cue: null, ref: null,
    eyebrow: fill(role === 'open' ? L.cover : L.close, v), ep: pad, ep_label: fill(L.ep_label, v),
    title: cover.title ?? ep.title, subtitle: cover.subtitle ?? '',
    series_en: series.title, series_ar: series.title_ar, brand: fill(L.brand, v),
    next_label: role === 'close' ? (next ? fill(L.next, v) : null) : null,
    next_title: role === 'close' ? (nextTitle ?? fill(L.end, v)) : null,
  });
  const scenes: Array<Record<string, unknown>> = [
    titleCard('open'),
    ...blocks.slice().sort((x, y) => x.seq_order - y.seq_order).map((b) => shapeScene(b, cfg)),
    titleCard('close'),
  ];
  return {
    series: { id: series.collection_id, title: series.title, stream: cfg.stream ?? null, name_en: series.title, name_ar: series.title_ar },
    episode: { id: ep.doc_id, no, title: cover.title ?? ep.title, people: peopleOf(ep),
               // the room's path under /api/cm, only when two read it together
               room: peopleOf(ep) >= 2 ? `readalong/${series.collection_id}/room/${no}` : null },
    episodes: episodes.map((e) => ({ id: e.doc_id, no: e.episode_no, title: parse<{ cover?: { title?: string } }>(e.meta_json, {}).cover?.title ?? e.title })),
    chrome: { chip: fill(L.chip, v), label: fill(L.label, v), book: fill(L.book, v) },
    picker: { title: fill(L.picker_title, v), hint: fill(L.picker_hint, v), start: fill(L.picker_start, v), range: fill(L.range, v) },
    labels: { hear: fill(L.hear, v), scenes: fill(L.scenes, v),
              together: fill(L.together ?? '', v), mark: fill(L.mark ?? '', v), cut: fill(L.cut ?? '', v) },
    scenes,
  };
}
