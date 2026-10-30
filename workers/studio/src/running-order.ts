/// The running order as the apps list it: each scene with what it is and how
/// it sits in the frame, and the scenes gathered into the chapters the video
/// is cut into. Worked out here, once, so the Mac, the iPad and the web draw
/// the same list without each keeping its own table of the stage's builders.
///
/// A chapter is the scenes sharing a `group_key` (a scene with none stands on
/// its own). Its `transition` scene is the chapter card itself, so it opens
/// the chapter rather than being listed as one more scene; and a chapter of
/// one scene is that scene, under the chapter's name.

type Region = 'lower' | 'lowerLeft' | 'side' | 'center';

export interface SceneLook {
  name: string;
  region: Region;
  /// `#RRGGBB`.
  tint: string;
  /// False when the stage has no builder of this name and draws a note panel.
  builder: boolean;
}

const GOLD = '#E8C96D', BRASS = '#C9A84C', SKY = '#6BBAD9', MINT = '#73C7AD',
  PLUM = '#C48AD9', SAND = '#E0AD6B', AMBER = '#F2B85C', GREY = '#A8A8B3', SAGE = '#9EC785';

const full = (tint: string): SceneLook => ({ name: 'Full frame', region: 'center', tint, builder: true });
const lower = (tint: string): SceneLook => ({ name: 'Bottom panel', region: 'lower', tint, builder: true });
const side = (tint: string): SceneLook => ({ name: 'Side panel', region: 'side', tint, builder: true });

/// Every builder on the stage (overlay/builders), by name.
const LOOKS: Record<string, SceneLook> = {
  title_card: full(GOLD), chapter: full(GOLD), outro: full(GOLD), bookend: full(GOLD),
  transition: { name: 'Chapter card', region: 'center', tint: GOLD, builder: true },
  ayah: lower(BRASS), passage: lower(BRASS), translation: lower(BRASS),
  sentence: lower(SKY), outline: lower(SKY), compare: lower(SKY), slide: lower(SKY),
  note: lower(GREY), buildup: lower(SAND), balagha: lower(SKY), readings: lower(BRASS), voices: lower(SKY),
  fact_strip: { name: 'Bottom strip', region: 'lower', tint: SAGE, builder: true },
  lower_third: { name: 'Lower third', region: 'lowerLeft', tint: GOLD, builder: true },
  talk_card: { name: 'Talk card', region: 'lowerLeft', tint: GOLD, builder: true },
  talk_strip: { name: 'Talk strip', region: 'lower', tint: GOLD, builder: true },
  lexeme: side(PLUM), tree: side(MINT),
  sarf: lower(PLUM), lugha: lower(PLUM), root: lower(PLUM),
  treebank: full(MINT), vocab_word: full(AMBER), vocab_root: full(AMBER), vocab_family: full(AMBER),
  keyterm: full(AMBER), passage_keys: full(BRASS), concept: full(SKY), verse_class: full(SKY),
  sentence_map: full(SKY), passage_ring: full(MINT), chiasm: full(MINT), sura_arcs: full(MINT),
  nazm_map: full(MINT), flow: full(SKY), quiz: full(SAND), summary: full(GOLD),
};

export function sceneLook(kind: string): SceneLook {
  return LOOKS[kind] ?? { name: 'Note panel', region: 'lower', tint: GREY, builder: false };
}

interface SectionIn {
  id: string;
  heading: string;
  overlay_kind: string | null;
  group_key: string | null;
  group_label: string | null;
  points: Array<{ overlay_json: string | null }>;
}

export interface SceneFacts {
  kind: string;
  look: SceneLook;
  title: string;
  title_ar: string | null;
  /// What the row says under the title — a discussion's talking points; a
  /// class scene's steps are the stage's own, so it says nothing.
  note: string | null;
}

export interface Chapter {
  key: string;
  title: string;
  title_ar: string | null;
  /// The chapter card that opens it, when it has one.
  opener: string | null;
  scenes: string[];
}

const ARABIC = /[؀-ۿ]/;

/// "التلاوة — reading the passage" → English and Arabic halves, either order.
export function splitHeading(heading: string): { en: string; ar: string | null } {
  const parts = heading.split(/\s+[—–-]\s+/).map((p) => p.trim()).filter(Boolean);
  const ar = parts.filter((p) => ARABIC.test(p) && !/[A-Za-z]/.test(p));
  const en = parts.filter((p) => !ar.includes(p));
  const english = en.join(' — ') || heading;
  return { en: english.charAt(0).toUpperCase() + english.slice(1), ar: ar.join(' — ') || null };
}

function kindOf(s: SectionIn): string {
  if (s.overlay_kind) return s.overlay_kind;
  for (const p of s.points) {
    try {
      const k = JSON.parse(p.overlay_json ?? 'null')?.kind;
      if (typeof k === 'string' && k) return k;
    } catch { /* a point without a payload */ }
  }
  return 'talk_card';
}

export function sceneFacts(s: SectionIn, discussion: boolean): SceneFacts {
  const kind = kindOf(s);
  const { en, ar } = splitHeading(s.heading);
  const n = s.points.length;
  return {
    kind, look: sceneLook(kind), title: en, title_ar: ar,
    note: discussion ? (n === 0 ? 'No talking points yet' : n === 1 ? '1 talking point' : `${n} talking points`) : null,
  };
}

export function chapters(sections: SectionIn[]): Chapter[] {
  const out: Chapter[] = [];
  for (const s of sections) {
    const last = out[out.length - 1];
    const key = s.group_key ?? `scene:${s.id}`;
    let ch = last && last.key === key ? last : null;
    if (!ch) {
      const label = s.group_label ? splitHeading(s.group_label) : splitHeading(s.heading);
      ch = { key, title: label.en, title_ar: label.ar ?? splitHeading(s.heading).ar, opener: null, scenes: [] };
      out.push(ch);
    }
    if (kindOf(s) === 'transition' && !ch.opener && ch.scenes.length === 0) {
      ch.opener = s.id;
      // The card carries the chapter's Arabic name when the label has none.
      if (!ch.title_ar) ch.title_ar = splitHeading(s.heading).ar;
    } else {
      ch.scenes.push(s.id);
    }
  }
  return out;
}
