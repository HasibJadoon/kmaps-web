import type { Label } from './labels';

/// A daily reading (ar_daily_reading.body_md) as story-book pages — the same shape the story-book reader draws for
/// «كليلة ودمنة» (GET /ar/text/storybooks/:id), so one reader serves both.
///
/// The markdown carries ```read blocks (one per line of the reading), an optional ```cast block (a dialogue's speakers) and
/// an optional ```vocab block (the words to learn: they belong to the place's vocabulary hub, GET /ar/vocab/:domain, not to a page of
/// the book — the last page ends with a quiet link to the hub instead). Each read block becomes one page: its picture, its Arabic words with
/// their times, its English line. A dialogue's block is a question and an answer by two speakers, each voiced from its own
/// recording: the page then has TWO clips — the question's and the answer's — and its words are the question's followed by
/// the answer's, each clip naming the words (from…to) it voices, the speaker's Arabic name and colour, and the pause before
/// it (gap_q / gap_a). A turn voiced alone (one speaker, one clip) still names its speaker. Every word shown comes from the
/// data or from ar_practice_label (scope 'storybook'); nothing is written in the app.
///
/// A page sounds like its scene, as a Kalīla page does: an optional ```sound block is the reading's default and a read
/// block's own `sound` overrides it — {ambience: {id, gain_db?, scene_in?}, spots: [{id, word, gain_db?}]}, ids from ar_sfx
/// (resolved to URLs by the route).

export interface Cue { ambience?: { id: string; gain_db?: number; scene_in?: boolean }; spots?: Array<{ id: string; word?: number; at?: number; gain_db?: number }> }
export interface SfxRef { url: string; sceneIn: string | null }

interface ReadBlock {
  ar?: string; en?: string; audio?: string; words?: number[][]; keys?: Array<{ w: string; en: string }>; img?: string;
  role?: string; q?: string; q_audio?: string; q_words?: number[][]; q_speaker?: string; speaker?: string;
  gap_q?: number; gap_a?: number; sound?: Cue;
}
type Cast = Record<string, { ar?: string; en?: string; color?: string }>;

export interface ReadingRow { slug: string; kind: string; title_en: string; title_ar: string; subtitle_en: string | null; body_md: string; domain?: string | null }

const parse = <T>(j: string): T | null => { try { return JSON.parse(j) as T; } catch { return null; } };

/// The fenced blocks of the markdown, in order: [type, body].
export function blocksOf(md: string): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const m of md.matchAll(/```(\w+)[^\n]*\n([\s\S]*?)\n?```/g)) out.push([m[1], m[2].trim()]);
  return out;
}

/// The words of a line with their times: the text split on spaces, each paired with its [start, end] — a word the data has
/// no time for keeps the end of the one before it, so the voice never lights a word it has no time for.
function timed(text: string, times: number[][] | undefined, keys: Set<string>) {
  let last = 0;
  return text.split(/\s+/).filter(Boolean).map((t, i) => {
    const w = times?.[i];
    const s = w && w.length === 2 ? w[0] : last, e = w && w.length === 2 ? w[1] : last;
    last = e;
    return { t, s, e, k: keys.has(t) };
  });
}

const L = (labels: Map<string, Label>, key: string, fallback: string, fallbackAr: string | null = null) => {
  const l = labels.get(key);
  return { text: l?.label ?? fallback, ar: l?.labelAr ?? fallbackAr, icon: l?.icon ?? null, detail: l?.detail ?? null, color: l?.color ?? null };
};

/// The ar_sfx ids a reading's sounds name (its ```sound default and every read block's own), for the route to look up.
export function soundIds(md: string): string[] {
  const cues = blocksOf(md).filter(([t]) => t === 'sound' || t === 'read')
    .map(([t, b]) => (t === 'sound' ? parse<Cue>(b) : parse<ReadBlock>(b)?.sound) ?? {});
  return [...new Set(cues.flatMap((c) => [c.ambience?.id, ...(c.spots ?? []).map((s) => s.id)]).filter((x): x is string => !!x))];
}

/// A cue as the reader plays it (the shape a Kalīla page sends): only the sounds ar_sfx has; null when none.
function soundOf(c: Cue | null | undefined, sfx: Map<string, SfxRef>) {
  if (!c) return null;
  const a = c.ambience && sfx.get(c.ambience.id);
  const spots = (c.spots ?? []).filter((s) => sfx.has(s.id))
    .map((s) => ({ id: s.id, url: sfx.get(s.id)!.url, word: s.word ?? null, at: s.at ?? null, gainDb: s.gain_db ?? -12 }));
  if (!a && !spots.length) return null;
  return { ambience: a ? { id: c.ambience!.id, url: a.url, sceneIn: c.ambience!.scene_in ? a.sceneIn : null, gainDb: c.ambience!.gain_db ?? -22 } : null, spots };
}

/// `base` is the story-book words object (the same one a Kalīla story sends); only the reading's own cover kicker is added here.
/// `sfx` holds the reading's sounds (soundIds → ar_sfx) as URLs; without it the pages are silent under the voice.
export function readingBook(r: ReadingRow, labels: Map<string, Label>, base: Record<string, unknown>, sfx: Map<string, SfxRef> = new Map()) {
  const blocks = blocksOf(r.body_md);
  const cast = (blocks.find(([t]) => t === 'cast') && parse<Cast>(blocks.find(([t]) => t === 'cast')![1])) || {};
  const scene = (blocks.find(([t]) => t === 'sound') && parse<Cue>(blocks.find(([t]) => t === 'sound')![1])) || null;
  // the heading read aloud (role "title") is the cover's job; a page needs a picture to sit on, but one without keeps the cover's
  const reads = blocks.filter(([t]) => t === 'read').map(([, b]) => parse<ReadBlock>(b)).filter((b): b is ReadBlock => !!b && b.role !== 'title' && !!b.ar);
  const first = reads.find((b) => b.img)?.img ?? null;
  let carry = first;
  const total = reads.length + 1;

  const speaker = (id: string | undefined) => {
    const c = id ? cast[id] : undefined;
    return { speaker: id ?? null, name: c?.ar ?? null, color: c?.color ?? null };
  };

  const pages = reads.map((b, i) => {
    const keys = new Set((b.keys ?? []).map((k) => k.w));
    const ans = timed(b.ar!, b.words, keys);
    const q = b.q && b.q_audio ? timed(b.q, b.q_words, keys) : [];
    const clips = [
      ...(q.length ? [{ url: b.q_audio!, gap: b.gap_q ?? 0.5, from: 0, to: q.length - 1, ...speaker(b.q_speaker) }] : []),
      ...(b.audio ? [{ url: b.audio, gap: b.gap_a ?? 0.45, from: q.length, to: q.length + ans.length - 1, ...speaker(b.speaker) }] : []),
    ];
    if (b.img) carry = b.img;
    return {
      no: i + 1, of: total, kind: 'story', picture: b.img ?? carry, placeholder: false,
      textAr: [b.q && b.q_audio ? b.q : null, b.ar].filter(Boolean).join(' '), textEn: b.en ?? null,
      words: [...q, ...ans].map(({ t, s, e, k }) => ({ t, s, e, k })),
      start: null, end: null, recording: null, link: null, lines: null, sound: soundOf(b.sound ?? scene, sfx),
      clips,
    };
  });

  const place = L(labels, 'words_of_place', 'Words of this place', 'كَلِمَاتُ الْمَكَانِ');
  const kicker = L(labels, r.kind === 'qa' ? 'reading_kicker_qa' : 'reading_kicker', r.kind === 'qa' ? 'ARABIC DIALOGUE' : 'ARABIC READING',
                   r.kind === 'qa' ? 'حِوَارٌ' : 'قِرَاءَةٌ');

  return {
    id: `ARDR:${r.slug}`, titleAr: r.title_ar, titleEn: r.title_en, summary: r.subtitle_en || null, authored: true,
    chapter: null, inside: null, look: { accent: '#C9A84C', gradient: ['#141414', '#0B0B0B'], motif: null }, themes: [],
    words: { ...base, kicker },
    audio: null, pages,
    // no last page of its own: the book ends on its last picture, and that page carries a quiet link to the place's vocabulary hub
    // (GET /ar/vocab/:domain), opened on this reading's words (focus)
    remember: null,
    hub: r.domain ? { domain: r.domain, focus: `reading:${r.slug}`, title: place.text, titleAr: place.ar, icon: place.icon } : null,
    next: null,
  };
}
