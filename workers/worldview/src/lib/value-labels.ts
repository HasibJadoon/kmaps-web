// English display labels for WV row values (source_type, unit_type, note kinds, era
// short names). The app renders the `*_label` fields these helpers add — it holds no
// label maps of its own (rule: data shaping lives in the worker, never the UI).

const SOURCE_TYPE: Record<string, string> = {
  book: 'Book', article: 'Article', essay: 'Essay', paper: 'Paper', lecture: 'Lecture',
  podcast: 'Podcast', video: 'Video', website: 'Website', document: 'Document',
  scripture: 'Scripture', report: 'Report', other: 'Source',
};

const UNIT_TYPE: Record<string, string> = {
  chapter: 'Chapter', passage: 'Passage', section: 'Section', part: 'Part', unit: 'Unit',
  excerpt: 'Excerpt', page: 'Page', paragraph: 'Paragraph',
};

const NOTE_KIND: Record<string, string> = {
  quote: 'Highlight', highlight: 'Highlight', reflection: 'Reflection', question: 'Question',
  insight: 'Insight', claim_seed: 'Claim', summary: 'Summary', observation: 'Observation',
};

/** Short column heads for era nodes whose data_json carries no `short`. */
const ERA_SHORT: Record<string, string> = {
  medieval: 'Medieval', renaissance: 'Renaiss.', americas: 'Americas',
  orientalist: 'Orient.', sept11: '9/11 +',
};

const startCase = (v: string) => v.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const labelOf = (map: Record<string, string>, raw: unknown, empty: string) => {
  const key = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (!key) return map[empty] ?? startCase(empty);
  return map[key] ?? startCase(key);
};

export const sourceTypeLabel = (t: unknown) => labelOf(SOURCE_TYPE, t, 'other');
export const unitTypeLabel = (t: unknown) => labelOf(UNIT_TYPE, t, 'unit');
export const noteKindLabel = (k: unknown) => labelOf(NOTE_KIND, k, 'highlight');

export const withSourceTypeLabel = <T extends { source_type?: unknown }>(r: T) =>
  ({ ...r, source_type_label: sourceTypeLabel(r.source_type) });
export const withUnitTypeLabel = <T extends { unit_type?: unknown }>(r: T) =>
  ({ ...r, unit_type_label: unitTypeLabel(r.unit_type) });
export const withNoteKindLabel = <T extends { note_kind?: unknown }>(r: T) =>
  ({ ...r, note_kind_label: noteKindLabel(r.note_kind) });

/** An era node's short column head: its own `short`, the known one, or its title's first word. */
export function withEraShortLabel<T extends { node_type?: unknown; title?: unknown; data_json?: unknown }>(r: T) {
  if (r.node_type !== 'era') return r;
  let data: Record<string, unknown> | null = null;
  try { data = typeof r.data_json === 'string' ? JSON.parse(r.data_json) : null; } catch { data = null; }
  const slug = String(data?.era ?? '');
  const title = String(r.title ?? slug);
  const short = typeof data?.short === 'string' && data.short ? data.short
    : ERA_SHORT[slug] ?? title.split(/[\s/(]/)[0];
  return { ...r, short_label: short };
}
