/// The sprint's contract (owner, 2026-10-31: "this sprint should be able to do Arabic, WV, Qurʾān — all data-driven").
///
/// A study's room is the same sprint in every domain; what it works through is the domain's own. A study row
/// names its backlog (meta_json.sprint: { backlog: { module, path }, unit }), and every domain worker that hosts
/// sprints serves these two shapes, shaped from its own tables:
///   SprintBacklog  the units a study walks one by one — a sūra's passages, a series' scenes, a source's phases —
///                  each a tile, matched to the studies by its typed ref (`unit`)
///   SprintPage     one unit opened: its lines (Arabic, English, and the audio to hear each, when there is one),
///                  and the way into its own deeper study
/// The app draws both without knowing which domain they came from.

export interface SprintSource { module: string; path: string }

export interface SprintItem {
  /** Its typed ref — the same ref a study of it carries in meta_json.sprint.unit (QR:SP:40:1-3). */
  unit: string;
  /** The tile's short mark (P01). */
  label: string;
  title: string | null;
  title_ar: string | null;
  /** Its shortest name, for a tile. */
  short: string | null;
  /** Where it is (40:1–3). */
  ref: string | null;
  /** Its page. */
  page: SprintSource;
}

export interface SprintBacklog {
  /** The backlog's name (Passage backlog). */
  title: string;
  /** What it is the backlog of (Ghāfir). */
  subtitle: string | null;
  items: SprintItem[];
}

export interface SprintLine {
  /** Its mark beside the Arabic (﴿١﴾ for an āyah), when it has one. */
  mark: string | null;
  /** Its Arabic, when it has any (a Worldview position is often English alone). */
  ar: string | null;
  en: string | null;
  audio: { url: string; start: number; end: number } | null;
}

export interface SprintPage {
  kicker: string;
  title: string | null;
  title_ar: string | null;
  summary: string | null;
  /** How its Arabic is set: the muṣḥaf's face (Qurʾān text) or the UI's. */
  face: 'mushaf' | 'ui';
  /** The listen bar's words, when there is audio (Listen to the passage · Mishary al-ʿAfāsī · 3 āyāt). */
  listen: { label: string; detail: string } | null;
  lines: SprintLine[];
  /** The unit's own deeper study, when the domain has one (the Qurʾān passage study). */
  study: { label: string; open: { type: string; ref: string } } | null;
}
