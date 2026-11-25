/// The read API's view-models, built only from registry rows and episode rows — no word, colour, stage or section is
/// written here. Every label a screen shows is resolved from st_label; every section comes from st_view_section in its
/// order, filtered by its `when` rule and the asking platform. The apps render `kind` and nothing else.

import { holds, stageStates, type EpisodeFacts, type Rule } from './rules';
import type { EpisodeBundle, Registry } from './types';

const parse = <T>(s: string | null | undefined, d: T): T => { try { return s ? JSON.parse(s) as T : d; } catch { return d; } };
export const label = (reg: Registry, key: string | null | undefined) => (key ? reg.labels[key] ?? key : null);
const personKey = (ref: string) => ref.replace(/^CM:/, '').replace(/^PN:/, '');

export function factsOf(reg: Registry, b: EpisodeBundle): EpisodeFacts {
  const series = reg.series.find((s) => s.id === b.ep.series_ref);
  const resources: Record<string, number> = {};
  for (const r of b.resources) resources[r.group_key] = (resources[r.group_key] ?? 0) + 1;
  return {
    refs: { boundary_ref: b.ep.boundary_ref, scenes_ref: b.ep.scenes_ref, slides_ref: b.ep.slides_ref, folder_path: b.ep.folder_path },
    checks: Object.fromEntries(b.checks.map((c) => [c.check_key, c.result])),
    defined_checks: reg.checks.filter((c) => c.workflow_ref === series?.workflow_ref).map((c) => c.key),
    resources,
    takes: b.takes.filter((t) => t.status === 'kept').length,
    publications: b.publications.filter((p) => p.published_at || p.url).map((p) => p.part_key),
  };
}

export function stagesOf(reg: Registry, b: EpisodeBundle) {
  const wf = reg.series.find((s) => s.id === b.ep.series_ref)?.workflow_ref;
  const defs = reg.stages.filter((s) => s.workflow_ref === wf);
  const states = stageStates(defs.map((s) => ({ key: s.key, seq: s.seq, done_rule: parse<Rule>(s.done_rule_json, {}) })), factsOf(reg, b));
  return states.map((st) => {
    const d = defs.find((x) => x.key === st.key)!;
    return { key: st.key, label: label(reg, d.label_key), icon: d.icon_token, tone: d.tone_token, state: st.state };
  });
}

/// The stage the episode is in (current, or the last when all are done) — derived, never stored.
export function stageNow(reg: Registry, b: EpisodeBundle) {
  const st = stagesOf(reg, b);
  return st.find((s) => s.state === 'current') ?? st[st.length - 1] ?? null;
}

export function peopleOf(reg: Registry, b: EpisodeBundle) {
  return b.people.slice().sort((x, y) => x.seq - y.seq)
    .map((p) => ({ ref: p.person_ref, name: label(reg, `person.${personKey(p.person_ref)}`), role: p.role_key, role_label: label(reg, `role.${p.role_key}`) }));
}

/// One episode as a card: what lists, boards and the Now screen show.
export function card(reg: Registry, b: EpisodeBundle) {
  const s = reg.series.find((x) => x.id === b.ep.series_ref);
  const st = stageNow(reg, b);
  return {
    id: b.ep.id, no: b.ep.no, kind: b.ep.kind, title_en: b.ep.title_en, title_ar: b.ep.title_ar, boundary: b.ep.boundary_ref,
    series: s ? { id: s.id, label: label(reg, s.label_key) } : null,
    arc: b.ep.arc_key ? label(reg, reg.arcs.find((a) => a.series_ref === b.ep.series_ref && a.key === b.ep.arc_key)?.label_key) : null,
    stage: st ? { key: st.key, label: st.label, icon: st.icon, tone: st.tone } : null,
    people: peopleOf(reg, b).filter((p) => p.role !== 'manager').map((p) => p.name),
    updated_at: b.ep.updated_at,
  };
}

/// A view's sections in order, for this platform, those whose `when` rule holds for the episode (if any).
export function sectionsOf(reg: Registry, viewId: string, platform: string, facts?: EpisodeFacts) {
  return reg.sections.filter((s) => s.view_ref === viewId)
    .filter((s) => s.platforms === 'all' || s.platforms.split(',').map((x) => x.trim()).includes(platform))
    .filter((s) => !facts || holds(parse<Rule>(s.when_rule_json, {}), facts))
    .sort((a, b) => a.seq - b.seq)
    .map((s) => ({ key: s.key, kind: s.kind, label: label(reg, s.label_key), bind: s.bind, layout: s.layout }));
}

/// The manifest every app loads first: the look, all words, the navigation, the domains/shows/series.
export function manifest(reg: Registry, platform: string) {
  const nav = sectionsOf(reg, 'VIEW:nav', platform).map((s) => s.kind === 'nav_item'
    ? { ...s, view: s.bind, icon: s.layout }
    : { ...s, series: seriesList(reg) });
  return {
    version: reg.version,
    tokens: Object.fromEntries(reg.tokens.map((t) => [t.key, { kind: t.kind, value: t.value }])),
    labels: reg.labels,
    nav,
    views: reg.views.map((v) => ({ id: v.id, label: label(reg, v.label_key) })),
  };
}

export function seriesList(reg: Registry) {
  return reg.series.filter((s) => s.status === 'active').sort((a, b) => a.seq - b.seq).map((s) => ({
    id: s.id, label: label(reg, s.label_key), subtitle: label(reg, s.subtitle_key),
    show: label(reg, reg.shows.find((x) => x.id === s.show_ref)?.label_key),
    domain: { key: s.domain_key, label: label(reg, reg.domains.find((d) => d.key === s.domain_key)?.label_key),
      accent: reg.domains.find((d) => d.key === s.domain_key)?.accent_token ?? null },
  }));
}

/// Bind each section of a view to its data; unknown binds come back empty so the app shows the section's empty state.
function fill(sections: ReturnType<typeof sectionsOf>, data: Record<string, unknown>) {
  return sections.map((s) => ({ key: s.key, kind: s.kind, label: s.label, layout: s.layout, data: s.bind ? data[s.bind] ?? null : null }));
}

/// The one episode page: header, people, sprint stages, study resources, scenes, slides, checks, takes, publications —
/// in the order and with the rules VIEW:episode gives.
/// "QR:40:1-5" → {surah, from, to}; a whole-sūra boundary covers every āyah.
export function rangeOf(ref: string | null | undefined): { surah: number; from: number; to: number } | null {
  const m = (ref ?? '').match(/^QR:(\d+):(?:(\d+)-(\d+)|all)$/);
  if (!m) return null;
  return { surah: Number(m[1]), from: m[2] ? Number(m[2]) : 1, to: m[3] ? Number(m[3]) : 9999 };
}

/// Other series' episodes on the same āyāt (overlapping boundaries), grouped by series — worked out, never linked by hand.
export function relatedOf(reg: Registry, b: EpisodeBundle, all: EpisodeBundle[]) {
  const r = rangeOf(b.ep.boundary_ref);
  if (!r) return [];
  const groups: Array<{ key: string; label: string | null; icon: string; items: Array<{ title: string; url: string | null; local_path: string | null }> }> = [];
  for (const o of all) {
    if (o.ep.series_ref === b.ep.series_ref || o.ep.status !== 'active') continue;
    const x = rangeOf(o.ep.boundary_ref);
    if (!x || x.surah !== r.surah || x.to < r.from || x.from > r.to || (x.from === 1 && x.to === 9999)) continue;
    const s = reg.series.find((y) => y.id === o.ep.series_ref);
    let g = groups.find((y) => y.key === o.ep.series_ref);
    if (!g) { g = { key: o.ep.series_ref, label: label(reg, s?.label_key), icon: 'icon.group.films', items: [] }; groups.push(g); }
    const yt = o.publications.find((p) => p.part_key === 'long' && p.url)?.url ?? null;
    g.items.push({ title: `${o.ep.title_en} · ${o.ep.boundary_ref?.replace(/^QR:/, '')}`, url: yt ?? `com.kmaps.app://studio/episode/${o.ep.id}`, local_path: null });
  }
  return groups;
}

export function episodePage(reg: Registry, b: EpisodeBundle, platform: string, all: EpisodeBundle[] = []) {
  const facts = factsOf(reg, b);
  const c = card(reg, b);
  const wf = reg.series.find((s) => s.id === b.ep.series_ref)?.workflow_ref;
  const groups: Array<{ key: string; label: string | null; icon: string; items: Array<{ title: string; url: string | null; local_path: string | null }> }> = [];
  for (const r of b.resources.slice().sort((x, y) => x.seq - y.seq)) {
    let g = groups.find((x) => x.key === r.group_key);
    if (!g) { g = { key: r.group_key, label: label(reg, `group.${r.group_key}`), icon: `icon.group.${r.group_key}`, items: [] }; groups.push(g); }
    g.items.push({ title: r.label_override ?? r.ref ?? r.url ?? '', url: r.url, local_path: r.local_path });
  }
  // group order is data (token order.resource_groups); groups it does not name come after, as written
  const order = (reg.tokens.find((t) => t.key === 'order.resource_groups')?.value ?? '').split(',').map((x) => x.trim());
  const rank = (k: string) => { const i = order.indexOf(k); return i < 0 ? order.length : i; };
  groups.sort((a, b) => rank(a.key) - rank(b.key));
  const checks = reg.checks.filter((k) => k.workflow_ref === wf).sort((x, y) => x.seq - y.seq).map((k) => {
    const got = b.checks.find((x) => x.check_key === k.key);
    const result = got?.result ?? null;
    return { key: k.key, stage: k.stage_key, label: label(reg, k.label_key), result, result_label: result ? label(reg, `check.${result}`) : null,
      icon: result ? `icon.check.${result}` : null, note: got?.note ?? null };
  });
  const data: Record<string, unknown> = {
    header: { ...c, folder: b.ep.folder_path },
    people: peopleOf(reg, b),
    stages: stagesOf(reg, b),
    resources: groups,
    related: relatedOf(reg, b, all),
    scenes: b.ep.scenes_ref ? { ref: b.ep.scenes_ref, run: `studio/episodes/${b.ep.id}/run` } : null,
    slides: b.ep.slides_ref ? { ref: b.ep.slides_ref, url: `com.kmaps.app://doc/${b.ep.slides_ref}` } : null,
    checks,
    takes: b.takes,
    publications: b.publications.map((p) => ({ part: p.part_key, part_label: label(reg, `part.${p.part_key}`), url: p.url, published_at: p.published_at,
      chapters: parse(p.chapters_json, []) })),
  };
  return { view: 'VIEW:episode', id: b.ep.id, sections: fill(sectionsOf(reg, 'VIEW:episode', platform, facts), data) };
}

const stageIndex = (reg: Registry, b: EpisodeBundle) => {
  const st = stagesOf(reg, b);
  const cur = st.findIndex((s) => s.state === 'current');
  return cur < 0 ? st.length : cur;
};

/// Now: the episode closest to the camera, what is in production, what went out recently.
export function nowPage(reg: Registry, all: EpisodeBundle[], platform: string) {
  const live = all.filter((b) => b.ep.status === 'active' && b.ep.kind === 'long');
  const total = (b: EpisodeBundle) => stagesOf(reg, b).length;
  // which stages count as "next to film", in priority order, is data (token order.now_next)
  const nextOrder = (reg.tokens.find((t) => t.key === 'order.now_next')?.value ?? '').split(',').map((x) => x.trim()).filter(Boolean);
  const rank = (b: EpisodeBundle) => { const i = nextOrder.indexOf(stageNow(reg, b)?.key ?? ''); return i < 0 ? nextOrder.length : i; };
  const unfinished = live.filter((b) => stageIndex(reg, b) < total(b));
  const next = unfinished.filter((b) => rank(b) < nextOrder.length).sort((a, b) => rank(a) - rank(b) || a.ep.no - b.ep.no)[0] ?? null;
  const doing = unfinished.filter((b) => b !== next).sort((a, b) => stageIndex(reg, b) - stageIndex(reg, a));
  const published = live.filter((b) => stageIndex(reg, b) >= total(b))
    .sort((a, b) => (b.publications[0]?.published_at ?? '').localeCompare(a.publications[0]?.published_at ?? '')).slice(0, 6);
  const data = { next: next ? card(reg, next) : null, doing: doing.map((b) => card(reg, b)), published: published.map((b) => card(reg, b)) };
  return { view: 'VIEW:now', sections: fill(sectionsOf(reg, 'VIEW:now', platform), data) };
}

/// Pipeline: one board per workflow (the sprint, the film), each with its stages as columns and the episodes in them.
export function pipelinePage(reg: Registry, all: EpisodeBundle[], platform: string) {
  const live = all.filter((x) => x.ep.status === 'active' && x.ep.kind === 'long');
  // boards in the order of the first series that uses each workflow (series seq is data)
  const wfs = [...new Set(reg.series.slice().sort((a, b) => a.seq - b.seq).map((s) => s.workflow_ref))]
    .filter((wf) => live.some((b) => reg.series.find((s) => s.id === b.ep.series_ref)?.workflow_ref === wf));
  const boards = wfs.map((wf) => {
    const cols = reg.stages.filter((s) => s.workflow_ref === wf).sort((a, b) => a.seq - b.seq)
      .map((s) => ({ key: s.key, label: label(reg, s.label_key), icon: s.icon_token, tone: s.tone_token, episodes: [] as ReturnType<typeof card>[] }));
    for (const b of live.filter((x) => reg.series.find((s) => s.id === x.ep.series_ref)?.workflow_ref === wf)) {
      cols.find((c) => c.key === stageNow(reg, b)?.key)?.episodes.push(card(reg, b));
    }
    return { key: wf, label: label(reg, `workflow.${wf.split(':')[1]}`), columns: cols };
  });
  return { view: 'VIEW:pipeline', sections: fill(sectionsOf(reg, 'VIEW:pipeline', platform), { boards }) };
}

/// A series: its header, then each arc's episodes in order, Shorts under their long.
export function seriesPage(reg: Registry, seriesId: string, all: EpisodeBundle[], platform: string) {
  const s = seriesList(reg).find((x) => x.id === seriesId) ?? null;
  const eps = all.filter((b) => b.ep.series_ref === seriesId && b.ep.status === 'active');
  const arcs = reg.arcs.filter((a) => a.series_ref === seriesId).sort((a, b) => a.seq - b.seq).map((a) => ({
    key: a.key, label: label(reg, a.label_key),
    episodes: eps.filter((b) => b.ep.arc_key === a.key && b.ep.kind === 'long').sort((x, y) => x.ep.no - y.ep.no).map((b) => ({
      ...card(reg, b), shorts: eps.filter((x) => x.ep.parent_ref === b.ep.id).sort((x, y) => x.ep.no - y.ep.no).map((x) => card(reg, x)),
    })),
  }));
  return { view: 'VIEW:series', id: seriesId, sections: fill(sectionsOf(reg, 'VIEW:series', platform), { header: s, arcs }) };
}

/// Recording (the presenter): the episode's scenes from its scene doc, numbered, current + next shown by the app.
/// `scenes` is the content worker's /cm/scenes payload; the app needs nothing else to run a take.
export function runPage(reg: Registry, b: EpisodeBundle, scenes: { scenes?: Array<Record<string, unknown>> } | null, platform: string) {
  const data = {
    scenes: { episode: card(reg, b), people: peopleOf(reg, b).filter((p) => p.role !== 'manager'), items: scenes?.scenes ?? [],
      next_label: label(reg, 'presenter.next'), scene_label: label(reg, 'presenter.scene'),
      room: `studio/episodes/${b.ep.id}/room` },
  };
  return { view: 'VIEW:run', id: b.ep.id, sections: fill(sectionsOf(reg, 'VIEW:run', platform), data) };
}

/// The words and face the scene shaper needs, from the registry (labels presenter.*, token face.<series>).
export function sceneParams(reg: Registry, b: EpisodeBundle): Record<string, string> {
  return {
    face: reg.tokens.find((t) => t.key === `face.${b.ep.series_ref}`)?.value ?? reg.tokens.find((t) => t.key === 'face.default')?.value ?? 'amiri',
    meaning: label(reg, 'presenter.meaning') ?? '', lesson: label(reg, 'presenter.lesson') ?? '', units: label(reg, 'presenter.units') ?? '',
  };
}

/// "## 40:3 — …" / "## 40:4–5 …" → the āyāt that section is on (in the episode's sūra), or [] for an introduction.
export function ayatOfHeading(h: string, surah: number): number[] {
  const m = h.match(/(\d+):(\d+)(?:\s*[–-]\s*(\d+))?/);
  if (!m || Number(m[1]) !== surah) return [];
  const a = Number(m[2]), z = Number(m[3] ?? m[2]);
  return Array.from({ length: Math.max(0, z - a + 1) }, (_, i) => a + i);
}

/// Study: one column per mufassir (the episode's tafsīr scripts), one row per āyah of the boundary, plus the
/// introductions; a mufassir with nothing on an āyah gets an explicit silent cell.
export function studyPage(reg: Registry, b: EpisodeBundle, docs: Array<{ title: string; body: string }>, platform: string) {
  const m = (b.ep.boundary_ref ?? '').match(/^QR:(\d+):(\d+)-(\d+)$/);
  const surah = m ? Number(m[1]) : 0, from = m ? Number(m[2]) : 0, to = m ? Number(m[3]) : -1;
  const silent = label(reg, 'empty.silent_on_ayah');
  const cols = docs.map((d) => {
    const parts: Array<{ heading: string; ayat: number[]; text: string }> = [];
    for (const chunk of d.body.split(/\n(?=## )/)) {
      const head = chunk.match(/^## (.+)/);
      if (!head) continue;
      parts.push({ heading: head[1].trim(), ayat: ayatOfHeading(head[1], surah), text: chunk.replace(/^## .+\n?/, '').trim() });
    }
    return { title: d.title, parts };
  });
  const rows = [];
  for (let a = from; a <= to; a++) {
    rows.push({ ayah: `${surah}:${a}`, cells: cols.map((c) => {
      const p = c.parts.find((x) => x.ayat.includes(a));
      return p ? { mufassir: c.title, heading: p.heading, text: p.text, shared: p.ayat.length > 1 ? p.ayat : null } : { mufassir: c.title, silent };
    }) });
  }
  const intro = cols.map((c) => ({ mufassir: c.title, parts: c.parts.filter((p) => p.ayat.length === 0 && p.text) }))
    .filter((c) => c.parts.length);
  return { view: 'VIEW:study', id: b.ep.id, sections: fill(sectionsOf(reg, 'VIEW:study', platform), { ayat: { columns: cols.map((c) => c.title), intro, rows } }) };
}
