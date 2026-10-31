/// The sprint's contract (owner, 2026-10-31: "this sprint should be able to do Arabic, WV, Qurʾān — all data-driven").
///
/// A study's room is the same sprint in every domain; what it works through is the domain's own. A study row
/// names its backlog (meta_json.sprint: { backlog: { module, path }, unit }), and every domain worker that hosts
/// sprints serves these two shapes, shaped from its own tables:
///   SprintBacklog  the units a study walks one by one — a sūra's passages, a series' scenes, a source's phases —
///                  each a tile, matched to the studies by its typed ref (`unit`)
///                  A backlog has levels (owner, 2026-10-31: "isms can have many books, and many sessions and
///                  passages"): a tile may hold a backlog of its own (`down` — an ism's books, a book's chapters), a
///                  backlog names the levels above it (`up`), and one level can be broken more than one way (`views` —
///                  a book by chapters, by passages, or by sessions).
///   SprintPage     one unit opened: its lines (Arabic, English, and the audio to hear each, when there is one),
///                  and the way into its own deeper study
/// The app draws both without knowing which domain they came from. A path may carry a query (?by=sessions).

export interface SprintSource { module: string; path: string }

/// A level above, or another way to break this one.
export interface SprintCrumb { label: string; source: SprintSource }

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
  /** Its page (none for a tile that is only a level — Arabic's "Classes"). */
  page: SprintSource | null;
  /** Its own backlog, when it is a level of its own (an ism's books, a book's chapters). */
  down?: SprintSource | null;
  /** False for a tile that is only a way in (Arabic's "Series"), not a unit a week can take. Default true. */
  pullable?: boolean;
}

export interface SprintBacklog {
  /** The backlog's name (Passage backlog). */
  title: string;
  /** What it is the backlog of (Ghāfir). */
  subtitle: string | null;
  items: SprintItem[];
  /** The levels above, top first (Isms › Liberalism). */
  up?: SprintCrumb[];
  /** The other ways to break this level, the one shown marked (Chapters · Passages · Sessions). */
  views?: Array<SprintCrumb & { on: boolean }>;
  /** This level's own page (a book's, an ism's). */
  page?: SprintSource | null;
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
