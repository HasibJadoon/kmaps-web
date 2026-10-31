// English display labels for AR row values the library screens show. The app renders
// the `*_label` fields these add and keeps no label maps of its own.

const CONTAINER_TYPE: Record<string, string> = {
  book: 'Book', literature: 'Literature', story: 'Story', poetry: 'Poetry',
  classical: 'Classical', podcast: 'Podcast', podcast_episode: 'Podcast',
  video: 'Video', video_series: 'Series',
};

const startCase = (v: string) => v.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const containerTypeLabel = (t: unknown) => {
  const key = typeof t === 'string' ? t.trim() : '';
  return CONTAINER_TYPE[key] ?? startCase(key);
};

export const withContainerTypeLabel = <T extends { container_type?: unknown }>(r: T) =>
  ({ ...r, container_type_label: containerTypeLabel(r.container_type) });

/// The reading shelf's bands, in the order a reader climbs them: stories carry a beginner
/// furthest, poetry is the highest register, proverbs the shortest complete thing on it.
/// Shape decides how a book is read (and which reader opens it).
export const SHELF_SHAPES: { shape: string; en: string; ar: string; note: string }[] = [
  { shape: 'prose',    en: 'Stories',           ar: 'الحكايات',        note: 'Narrative adab — read for the story, not the lesson' },
  { shape: 'nights',   en: 'The Nights',        ar: 'ألف ليلة وليلة',  note: 'One night, one page. The Būlāq text, all 1,001' },
  { shape: 'series',   en: 'Series & podcasts', ar: 'المسلسلات',       note: 'Transcripts, read against the recording they came from' },
  { shape: 'dialogue', en: 'Conversation',      ar: 'الحوار',          note: 'Spoken exchange — the register you would actually be answered in' },
  { shape: 'maqama',   en: 'Maqāmāt',           ar: 'المقامات',        note: 'Rhymed prose. Episodes, each a performance' },
  { shape: 'amthal',   en: 'Proverbs',          ar: 'الأمثال',         note: 'One line, complete. The shortest whole utterance' },
  { shape: 'diwan',    en: 'Dīwāns',            ar: 'الدواوين',        note: 'Poetry — two hemistichs to a line, highest register' },
];
