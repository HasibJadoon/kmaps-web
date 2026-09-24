import { query, queryOne, execute } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';

export const EPISODE_FORMATS = [
  'podcast', 'tutorial', 'talking_head', 'conversation', 'solo',
  'lesson_passage', 'lesson_two_person', 'series',
] as const;

export const PROCESS_STEP_TYPES = [
  'reading', 'vocabulary', 'sentence_structure', 'passage_structure',
  'tafsir', 'worldview', 'surah_structure',
] as const;

export const SECTION_TYPES = [
  'intro', 'main_point', 'discussion', 'conclusion', 'custom',
  'open', 'close', ...PROCESS_STEP_TYPES,
] as const;
export const PARTICIPANT_ROLES = ['host', 'speaker', 'guest', 'viewer'] as const;
// The production pipeline, in order: an episode is drafted, planned into a
// week, made ready to shoot, shot, then published. 'live' and 'done' predate
// this and are kept so old rows still validate on a PATCH.
export const EPISODE_STATUSES = [
  'draft', 'planned', 'ready', 'shot', 'published', 'live', 'done',
] as const;

/// Where a status sits in the pipeline, for the planner's progress read.
/// Anything unrecognised sits at the start rather than throwing.
export const EPISODE_STAGES = ['draft', 'planned', 'ready', 'shot', 'published'] as const;

const PALETTE = ['#c9a84c', '#4c9fc9', '#c94c7a', '#5cc94c', '#9b6cc9', '#c97a4c'];

export interface EpisodeRow {
  id: string;
  core_user_ref: string;
  core_ws_ref: string | null;
  title: string;
  format: string;
  template_ref: string | null;
  status: string;
  meta_json: string | null;

  ecosystem: string | null;

  series_ref: string | null;
  session_no: number | null;
  output_kind: string | null;

  source_ref: string | null;

  /// When this episode was last opened in a studio, by anyone on the account.
  ///
  /// Which episode is being worked on is a fact about the production, not
  /// about the Mac it was opened on — the planner on the phone wants the same
  /// answer — so it lives here rather than in local storage. The most recently
  /// opened episode in a workspace is the active one; nothing has to be
  /// cleared when another takes over.
  last_opened_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ParticipantRow {
  id: string;
  episode_ref: string;
  display_name: string;
  color: string;
  role: string;
  seq: number;
  core_user_ref: string | null;
  created_at: string;
}

export interface SectionRow {
  id: string;
  episode_ref: string;

  type: string;
  heading: string;
  seq: number;

  overlay_kind: string | null;

  d1_query: string | null;

  /// Scenes that belong to one pass of the running order — the five that
  /// treat one sentence, say. Sections sharing a key are one group, and
  /// `group_label` is what the rail calls it. Null means a scene that stands
  /// on its own.
  group_key: string | null;
  group_label: string | null;
  created_at: string;
  updated_at: string;
}

export interface PointRow {
  id: string;
  section_ref: string;
  episode_ref: string;
  text: string;
  speaker_ref: string | null;
  bridge: string | null;
  est_seconds: number | null;

  overlay_json: string | null;

  subs_json: string | null;
  seq: number;
  created_at: string;
  updated_at: string;
}

/// The production phases, in order. Every episode has all six from the day it
/// is created; what changes is each one's state and what was written on it.
export const EPISODE_PHASES = ['plan', 'prepare', 'film', 'edit', 'publish', 'review'] as const;
export type EpisodePhase = (typeof EPISODE_PHASES)[number];
export const PHASE_STATES = ['pending', 'active', 'done'] as const;

export interface PhaseRow {
  id: string;
  episode_ref: string;
  phase: string;
  seq: number;
  /// pending until someone starts it, active while it is the work in hand,
  /// done once it has been logged as finished.
  state: string;
  /// What was learned doing this phase. Each phase keeps its own, so a note
  /// about the shoot is not filed with a note about the cut.
  notes_md: string | null;
  started_at: string | null;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
  updated_at: string;
}

/// One shoot of this episode. The planner shows what has actually been
/// captured, which is the only honest answer to "has it been shot".
export interface CaptureRow {
  id: string;
  concept: string;
  started_at: string | null;
  ended_at: string | null;
  marker_count: number;
}

/// The schedule, parsed out of meta_json. Every field is optional: an episode
/// that has never been scheduled returns an empty plan rather than nulls the
/// caller has to guess at.
export interface EpisodePlan {
  week?: string;
  due_at?: string;
  shoot_at?: string;
  publish_at?: string;
  review?: string;
}

export interface EpisodeAggregate extends EpisodeRow {
  participants: ParticipantRow[];
  sections: Array<SectionRow & { points: PointRow[] }>;
  captures: CaptureRow[];
  plan: EpisodePlan;
  phases: PhaseRow[];
}

/// meta_json is free-form and hand-edited; a body that is not an object, or
/// not JSON at all, means "nothing scheduled", never an error.
export function episodePlan(metaJson: string | null): EpisodePlan {
  if (!metaJson) return {};
  try {
    const parsed: unknown = JSON.parse(metaJson);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const meta = parsed as Record<string, unknown>;
    const plan: EpisodePlan = {};
    for (const key of ['week', 'due_at', 'shoot_at', 'publish_at', 'review'] as const) {
      const value = meta[key];
      if (typeof value === 'string' && value.trim()) plan[key] = value.trim();
    }
    return plan;
  } catch {
    return {};
  }
}

export interface EpisodeCreate {
  core_user_ref: string;
  core_ws_ref?: string | null;
  title: string;
  format?: string;
  template_ref?: string | null;
  ecosystem?: string | null;
  series_ref?: string | null;
  session_no?: number | null;
  output_kind?: string | null;
  source_ref?: string | null;
}

export interface EpisodePatch {
  title?: string;
  format?: string;
  status?: string;
  meta_json?: string | null;
  ecosystem?: string | null;
  series_ref?: string | null;
  session_no?: number | null;
  output_kind?: string | null;
  source_ref?: string | null;
}

export interface ParticipantInput {
  display_name: string;
  color?: string;
  role?: string;
  seq?: number;
  core_user_ref?: string | null;
}

export interface ParticipantPatch {
  display_name?: string;
  color?: string;
  role?: string;
  seq?: number;
  core_user_ref?: string | null;
}

export interface SectionInput {
  type?: string;
  heading: string;
  seq?: number;
  overlay_kind?: string | null;
  d1_query?: string | null;
  group_key?: string | null;
  group_label?: string | null;
}

export interface SectionPatch {
  type?: string;
  heading?: string;
  seq?: number;
  overlay_kind?: string | null;
  d1_query?: string | null;
  group_key?: string | null;
  group_label?: string | null;
}

export interface PointInput {
  text?: string;
  speaker_ref?: string | null;
  bridge?: string | null;
  est_seconds?: number | null;
  overlay_json?: string | null;
  subs_json?: string | null;
  seq?: number;
}

export interface PointPatch {
  text?: string;
  speaker_ref?: string | null;
  bridge?: string | null;
  est_seconds?: number | null;
  overlay_json?: string | null;
  subs_json?: string | null;
  seq?: number;
}

export interface TemplateStructure {
  participants?: Array<{ role?: string; display_name?: string; color?: string }>;
  sections?: Array<{
    type?: string;
    heading?: string;
    /// Which scene builder draws this section on the overlay stage.
    overlay_kind?: string | null;
    /// The rows the scene draws. In a template this carries placeholders —
    /// {surah}, {from}, {to}, {passage} — filled from the episode's source_ref
    /// when the structure is applied, so one template serves every passage.
    d1_query?: string | null;
    /// Scenes sharing a key are one pass of the running order.
    group_key?: string | null;
    group_label?: string | null;
    points?: Array<{ text?: string; speaker_role?: string | null; est_seconds?: number | null }>;
  }>;
}

/// Values a template's placeholders resolve to. Derived from source_ref.
export interface StructureVars {
  surah?: number;
  from?: number;
  to?: number;
  passage?: string;
}

/// `QR:SP:40:1-3` → { surah: 40, from: 1, to: 3, passage: 'QR:SP:40:1-3' }.
/// Anything else yields nothing, and placeholders are left as they are rather
/// than silently resolving to a wrong passage.
export function structureVars(sourceRef: string | null | undefined): StructureVars {
  const m = (sourceRef ?? '').match(/^QR:SP:(\d+):(\d+)-(\d+)$/);
  if (!m) return {};
  return {
    surah: parseInt(m[1], 10),
    from: parseInt(m[2], 10),
    to: parseInt(m[3], 10),
    passage: sourceRef!,
  };
}

function fillPlaceholders(sql: string | null | undefined, vars: StructureVars): string | null {
  if (!sql) return null;
  let out = sql;
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined) continue;
    out = out.split(`{${key}}`).join(String(value));
  }
  // A query still holding a placeholder would run against the wrong rows.
  return /\{(surah|from|to|passage)\}/.test(out) ? null : out;
}

const EP_COLS = `id, core_user_ref, core_ws_ref, title, format, template_ref,
                 status, meta_json, ecosystem, series_ref, session_no,
                 output_kind, source_ref, last_opened_at, created_at, updated_at`;
const PA_COLS = `id, episode_ref, display_name, color, role, seq, core_user_ref, created_at`;
const SE_COLS = `id, episode_ref, type, heading, seq, overlay_kind, d1_query,
                 group_key, group_label, created_at, updated_at`;
const PT_COLS = `id, section_ref, episode_ref, text, speaker_ref, bridge, est_seconds,
                 overlay_json, subs_json, seq, created_at, updated_at`;

export class EpisodeRepo {
  constructor(private db: D1Database) {}

  /// Visible rows: anything in a workspace the caller belongs to, plus their
  /// own rows that predate workspaces (core_ws_ref still null).
  private scope(wsIds: string[]): { sql: string; args: unknown[] } {
    if (!wsIds.length) {
      return { sql: `(core_ws_ref IS NULL AND core_user_ref = ?)`, args: [] };
    }
    const holes = wsIds.map(() => '?').join(', ');
    return {
      sql: `(core_ws_ref IN (${holes}) OR (core_ws_ref IS NULL AND core_user_ref = ?))`,
      args: wsIds,
    };
  }

  listEpisodes(userRef: string, wsIds: string[] = []): Promise<EpisodeRow[]> {
    const { sql, args } = this.scope(wsIds);
    return query<EpisodeRow>(
      this.db,
      `SELECT ${EP_COLS} FROM st_episodes
       WHERE ${sql}
       ORDER BY created_at DESC`,
      [...args, userRef],
    );
  }

  listSeriesEpisodes(
    userRef: string,
    seriesRef: string,
    wsIds: string[] = [],
  ): Promise<EpisodeRow[]> {
    const { sql, args } = this.scope(wsIds);
    return query<EpisodeRow>(
      this.db,
      `SELECT ${EP_COLS} FROM st_episodes
       WHERE ${sql} AND series_ref = ?
       ORDER BY COALESCE(session_no, 1e9), created_at`,
      [...args, userRef, seriesRef],
    );
  }

  findEpisode(id: string): Promise<EpisodeRow | null> {
    return queryOne<EpisodeRow>(
      this.db, `SELECT ${EP_COLS} FROM st_episodes WHERE id = ?`, [id],
    );
  }

  async createEpisode(input: EpisodeCreate): Promise<EpisodeRow> {
    const id = typedId('ST');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO st_episodes
         (id, core_user_ref, core_ws_ref, title, format, template_ref,
          status, meta_json, ecosystem, series_ref, session_no, output_kind,
          source_ref, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'draft', NULL, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.core_user_ref,
        input.core_ws_ref ?? null,
        input.title,
        input.format ?? 'podcast',
        input.template_ref ?? null,
        input.ecosystem ?? null,
        input.series_ref ?? null,
        input.session_no ?? null,
        input.output_kind ?? null,
        input.source_ref ?? null,
        now,
        now,
      ],
    );
    return (await this.findEpisode(id))!;
  }

  /// Merge fields into meta_json without reading the whole blob into the
  /// client. meta_json is hand-edited and may carry keys this build knows
  /// nothing about; a whole-blob replace from the app would drop them
  /// silently, so the merge happens here, over the row as it stands.
  ///
  /// A key set to null is removed. A body that is not an object is replaced
  /// rather than merged into — there is nothing to preserve in that case.
  /// Ensure the six phases exist. Episodes created before phases were a thing
  /// have none; rather than a migration that has to be remembered, they are
  /// filled in the first time anyone asks.
  async ensurePhases(episodeId: string): Promise<void> {
    for (let i = 0; i < EPISODE_PHASES.length; i++) {
      await execute(
        this.db,
        `INSERT OR IGNORE INTO st_phase (id, episode_ref, phase, seq, state)
         VALUES (?, ?, ?, ?, 'pending')`,
        [`${episodeId}:${EPISODE_PHASES[i]}`, episodeId, EPISODE_PHASES[i], i + 1],
      );
    }
  }

  /// Log a phase: its state, and what was written on it.
  ///
  /// Completing one stamps the time and who did it, and moves the next phase
  /// to active — the episode is always somewhere, and the furthest phase that
  /// is done is what `status` reports, so the two can never disagree.
  async patchPhase(
    episodeId: string,
    phase: string,
    patch: { state?: string; notes_md?: string | null },
    actor?: string,
  ): Promise<PhaseRow[]> {
    await this.ensurePhases(episodeId);
    const now = new Date().toISOString();
    const sets: string[] = [];
    const vals: unknown[] = [];

    if (patch.notes_md !== undefined) { sets.push('notes_md = ?'); vals.push(patch.notes_md); }
    if (patch.state !== undefined) {
      sets.push('state = ?'); vals.push(patch.state);
      if (patch.state === 'done') {
        sets.push('completed_at = ?', 'completed_by = ?');
        vals.push(now, actor ?? null);
      } else if (patch.state === 'active') {
        sets.push('started_at = COALESCE(started_at, ?)', 'completed_at = NULL');
        vals.push(now);
      }
    }
    if (sets.length) {
      sets.push('updated_at = ?'); vals.push(now);
      await execute(
        this.db,
        `UPDATE st_phase SET ${sets.join(', ')} WHERE episode_ref = ? AND phase = ?`,
        [...vals, episodeId, phase],
      );
    }

    if (patch.state === 'done') {
      const i = (EPISODE_PHASES as readonly string[]).indexOf(phase);
      const next = i >= 0 ? EPISODE_PHASES[i + 1] : undefined;
      if (next) {
        await execute(
          this.db,
          `UPDATE st_phase SET state = 'active', started_at = COALESCE(started_at, ?),
                               updated_at = ?
            WHERE episode_ref = ? AND phase = ? AND state = 'pending'`,
          [now, now, episodeId, next],
        );
      }
      await this.syncStatus(episodeId);
    }

    return query<PhaseRow>(
      this.db,
      `SELECT id, episode_ref, phase, seq, state, notes_md, started_at,
              completed_at, completed_by, created_at, updated_at
         FROM st_phase WHERE episode_ref = ? ORDER BY seq ASC`,
      [episodeId],
    );
  }

  /// `status` is the coarse reading of the phases, so it is derived rather
  /// than set by hand — otherwise the pill and the log drift apart.
  private async syncStatus(episodeId: string): Promise<void> {
    const done = await query<{ phase: string }>(
      this.db,
      `SELECT phase FROM st_phase WHERE episode_ref = ? AND state = 'done' ORDER BY seq DESC`,
      [episodeId],
    );
    const furthest = done[0]?.phase;
    const map: Record<string, string> = {
      plan: 'planned', prepare: 'ready', film: 'shot',
      edit: 'shot', publish: 'published', review: 'published',
    };
    const status = furthest ? map[furthest] : undefined;
    if (status) await this.patchEpisode(episodeId, { status });
  }

  /// Stamp an episode as just opened. Returns the row so the caller can see
  /// the time the server recorded rather than guessing at it.
  async markOpened(id: string): Promise<EpisodeRow | null> {
    await execute(
      this.db,
      `UPDATE st_episodes SET last_opened_at = ? WHERE id = ?`,
      [new Date().toISOString(), id],
    );
    return this.findEpisode(id);
  }

  async patchPlan(id: string, fields: Record<string, string | null>): Promise<EpisodeRow | null> {
    const row = await this.findEpisode(id);
    if (!row) return null;

    let meta: Record<string, unknown> = {};
    if (row.meta_json) {
      try {
        const parsed: unknown = JSON.parse(row.meta_json);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          meta = parsed as Record<string, unknown>;
        }
      } catch { /* unparseable meta is replaced, not merged */ }
    }

    for (const [key, value] of Object.entries(fields)) {
      if (value === null) delete meta[key];
      else meta[key] = value;
    }

    return this.patchEpisode(id, { meta_json: JSON.stringify(meta) });
  }

  async patchEpisode(id: string, patch: EpisodePatch): Promise<EpisodeRow | null> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (patch.title !== undefined)     { sets.push('title = ?');     vals.push(patch.title); }
    if (patch.format !== undefined)    { sets.push('format = ?');    vals.push(patch.format); }
    if (patch.status !== undefined)    { sets.push('status = ?');    vals.push(patch.status); }
    if (patch.meta_json !== undefined) { sets.push('meta_json = ?'); vals.push(patch.meta_json); }
    if (patch.ecosystem !== undefined)  { sets.push('ecosystem = ?');   vals.push(patch.ecosystem); }
    if (patch.series_ref !== undefined) { sets.push('series_ref = ?');  vals.push(patch.series_ref); }
    if (patch.session_no !== undefined) { sets.push('session_no = ?');  vals.push(patch.session_no); }
    if (patch.output_kind !== undefined){ sets.push('output_kind = ?'); vals.push(patch.output_kind); }
    if (patch.source_ref !== undefined) { sets.push('source_ref = ?');  vals.push(patch.source_ref); }
    if (sets.length === 0) return this.findEpisode(id);
    sets.push('updated_at = ?');
    vals.push(new Date().toISOString());
    vals.push(id);
    await execute(this.db, `UPDATE st_episodes SET ${sets.join(', ')} WHERE id = ?`, vals);
    return this.findEpisode(id);
  }

  async deleteEpisode(id: string): Promise<boolean> {
    await execute(this.db, `DELETE FROM st_talking_points WHERE episode_ref = ?`, [id]);
    await execute(this.db, `DELETE FROM st_sections WHERE episode_ref = ?`, [id]);
    await execute(this.db, `DELETE FROM st_participants WHERE episode_ref = ?`, [id]);
    const res = await execute(this.db, `DELETE FROM st_episodes WHERE id = ?`, [id]);
    return (res.meta.changes ?? 0) > 0;
  }

  async findAggregate(id: string): Promise<EpisodeAggregate | null> {
    const episode = await this.findEpisode(id);
    if (!episode) return null;

    const [participants, sections, points, phases, captures] = await Promise.all([
      query<ParticipantRow>(
        this.db,
        `SELECT ${PA_COLS} FROM st_participants WHERE episode_ref = ? ORDER BY seq ASC`,
        [id],
      ),
      query<SectionRow>(
        this.db,
        `SELECT ${SE_COLS} FROM st_sections WHERE episode_ref = ? ORDER BY seq ASC`,
        [id],
      ),
      query<PointRow>(
        this.db,
        `SELECT ${PT_COLS} FROM st_talking_points WHERE episode_ref = ? ORDER BY seq ASC`,
        [id],
      ),
      query<PhaseRow>(
        this.db,
        `SELECT id, episode_ref, phase, seq, state, notes_md, started_at,
                completed_at, completed_by, created_at, updated_at
           FROM st_phase WHERE episode_ref = ? ORDER BY seq ASC`,
        [id],
      ),
      query<CaptureRow>(
        this.db,
        `SELECT s.id, s.concept, s.started_at, s.ended_at,
                (SELECT COUNT(*) FROM st_capture_markers m WHERE m.session_ref = s.id)
                  AS marker_count
           FROM st_capture_sessions s
          WHERE s.episode_ref = ?
          ORDER BY COALESCE(s.started_at, s.created_at) DESC`,
        [id],
      ),
    ]);

    const pointsBySection = new Map<string, PointRow[]>();
    for (const point of points) {
      const bucket = pointsBySection.get(point.section_ref) ?? [];
      bucket.push(point);
      pointsBySection.set(point.section_ref, bucket);
    }

    return {
      ...episode,
      participants,
      sections: sections.map((section) => ({
        ...section,
        points: pointsBySection.get(section.id) ?? [],
      })),
      captures,
      phases,
      plan: episodePlan(episode.meta_json),
    };
  }

  findParticipant(id: string): Promise<ParticipantRow | null> {
    return queryOne<ParticipantRow>(
      this.db, `SELECT ${PA_COLS} FROM st_participants WHERE id = ?`, [id],
    );
  }

  async createParticipant(episodeId: string, input: ParticipantInput): Promise<ParticipantRow> {
    const id = typedId('ST');
    const seq = input.seq ?? await this.nextSeq('st_participants', 'episode_ref', episodeId);
    await execute(
      this.db,
      `INSERT INTO st_participants
         (id, episode_ref, display_name, color, role, seq, core_user_ref, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        episodeId,
        input.display_name,
        input.color ?? PALETTE[seq % PALETTE.length],
        input.role ?? 'speaker',
        seq,
        input.core_user_ref ?? null,
        new Date().toISOString(),
      ],
    );
    return (await this.findParticipant(id))!;
  }

  async patchParticipant(id: string, patch: ParticipantPatch): Promise<ParticipantRow | null> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (patch.display_name !== undefined) { sets.push('display_name = ?'); vals.push(patch.display_name); }
    if (patch.color !== undefined)        { sets.push('color = ?');        vals.push(patch.color); }
    if (patch.role !== undefined)         { sets.push('role = ?');         vals.push(patch.role); }
    if (patch.seq !== undefined)          { sets.push('seq = ?');          vals.push(patch.seq); }
    if (patch.core_user_ref !== undefined) { sets.push('core_user_ref = ?'); vals.push(patch.core_user_ref); }
    if (sets.length === 0) return this.findParticipant(id);
    vals.push(id);
    await execute(this.db, `UPDATE st_participants SET ${sets.join(', ')} WHERE id = ?`, vals);
    return this.findParticipant(id);
  }

  async deleteParticipant(id: string): Promise<boolean> {

    await execute(
      this.db,
      `UPDATE st_talking_points SET speaker_ref = NULL WHERE speaker_ref = ?`,
      [id],
    );
    const res = await execute(this.db, `DELETE FROM st_participants WHERE id = ?`, [id]);
    return (res.meta.changes ?? 0) > 0;
  }

  findSection(id: string): Promise<SectionRow | null> {
    return queryOne<SectionRow>(
      this.db, `SELECT ${SE_COLS} FROM st_sections WHERE id = ?`, [id],
    );
  }

  async createSection(episodeId: string, input: SectionInput): Promise<SectionRow> {
    const id = typedId('ST');
    const now = new Date().toISOString();
    const seq = input.seq ?? await this.nextSeq('st_sections', 'episode_ref', episodeId);
    await execute(
      this.db,
      `INSERT INTO st_sections
         (id, episode_ref, type, heading, seq, overlay_kind, d1_query,
          group_key, group_label, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, episodeId, input.type ?? 'custom', input.heading, seq,
       input.overlay_kind ?? null, input.d1_query ?? null,
       input.group_key ?? null, input.group_label ?? null, now, now],
    );
    return (await this.findSection(id))!;
  }

  async patchSection(id: string, patch: SectionPatch): Promise<SectionRow | null> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (patch.type !== undefined)    { sets.push('type = ?');    vals.push(patch.type); }
    if (patch.heading !== undefined) { sets.push('heading = ?'); vals.push(patch.heading); }
    if (patch.seq !== undefined)     { sets.push('seq = ?');     vals.push(patch.seq); }
    if (patch.overlay_kind !== undefined) { sets.push('overlay_kind = ?'); vals.push(patch.overlay_kind); }
    if (patch.d1_query !== undefined)     { sets.push('d1_query = ?');     vals.push(patch.d1_query); }
    if (patch.group_key !== undefined)    { sets.push('group_key = ?');    vals.push(patch.group_key); }
    if (patch.group_label !== undefined)  { sets.push('group_label = ?');  vals.push(patch.group_label); }
    if (sets.length === 0) return this.findSection(id);
    sets.push('updated_at = ?');
    vals.push(new Date().toISOString());
    vals.push(id);
    await execute(this.db, `UPDATE st_sections SET ${sets.join(', ')} WHERE id = ?`, vals);
    return this.findSection(id);
  }

  async deleteSection(id: string): Promise<boolean> {
    await execute(this.db, `DELETE FROM st_talking_points WHERE section_ref = ?`, [id]);
    const res = await execute(this.db, `DELETE FROM st_sections WHERE id = ?`, [id]);
    return (res.meta.changes ?? 0) > 0;
  }

  findPoint(id: string): Promise<PointRow | null> {
    return queryOne<PointRow>(
      this.db, `SELECT ${PT_COLS} FROM st_talking_points WHERE id = ?`, [id],
    );
  }

  async createPoint(sectionId: string, episodeId: string, input: PointInput): Promise<PointRow> {
    const id = typedId('ST');
    const now = new Date().toISOString();
    const seq = input.seq ?? await this.nextSeq('st_talking_points', 'section_ref', sectionId);
    await execute(
      this.db,
      `INSERT INTO st_talking_points
         (id, section_ref, episode_ref, text, speaker_ref, bridge, est_seconds,
          overlay_json, subs_json, seq, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        sectionId,
        episodeId,
        input.text ?? '',
        input.speaker_ref ?? null,
        input.bridge ?? null,
        input.est_seconds ?? null,
        input.overlay_json ?? null,
        input.subs_json ?? null,
        seq,
        now,
        now,
      ],
    );
    return (await this.findPoint(id))!;
  }

  async patchPoint(id: string, patch: PointPatch): Promise<PointRow | null> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (patch.text !== undefined)        { sets.push('text = ?');        vals.push(patch.text); }
    if (patch.speaker_ref !== undefined) { sets.push('speaker_ref = ?'); vals.push(patch.speaker_ref); }
    if (patch.bridge !== undefined)      { sets.push('bridge = ?');      vals.push(patch.bridge); }
    if (patch.est_seconds !== undefined) { sets.push('est_seconds = ?'); vals.push(patch.est_seconds); }
    if (patch.seq !== undefined)         { sets.push('seq = ?');         vals.push(patch.seq); }
    if (patch.overlay_json !== undefined) { sets.push('overlay_json = ?'); vals.push(patch.overlay_json); }
    if (patch.subs_json !== undefined)    { sets.push('subs_json = ?');    vals.push(patch.subs_json); }
    if (sets.length === 0) return this.findPoint(id);
    sets.push('updated_at = ?');
    vals.push(new Date().toISOString());
    vals.push(id);
    await execute(this.db, `UPDATE st_talking_points SET ${sets.join(', ')} WHERE id = ?`, vals);
    return this.findPoint(id);
  }

  async deletePoint(id: string): Promise<boolean> {
    const res = await execute(this.db, `DELETE FROM st_talking_points WHERE id = ?`, [id]);
    return (res.meta.changes ?? 0) > 0;
  }

  async applyStructure(
    episodeId: string,
    structure: TemplateStructure,
    vars: StructureVars = {},
  ): Promise<void> {
    const roleToId = new Map<string, string>();

    const participants = structure.participants ?? [];
    for (let i = 0; i < participants.length; i++) {
      const p = participants[i];
      const created = await this.createParticipant(episodeId, {
        display_name: (p.display_name ?? '').trim() || `Person ${i + 1}`,
        color: p.color || PALETTE[i % PALETTE.length],
        role: i === 0 ? 'host' : 'speaker',
        seq: i,
      });
      if (p.role) roleToId.set(p.role, created.id);
    }

    const sections = structure.sections ?? [];
    for (let s = 0; s < sections.length; s++) {
      const sec = sections[s];
      const section = await this.createSection(episodeId, {
        type: sec.type || 'custom',
        heading: (sec.heading ?? '').trim() || 'Section',
        overlay_kind: sec.overlay_kind ?? null,
        d1_query: fillPlaceholders(sec.d1_query, vars),
        group_key: sec.group_key ?? null,
        group_label: sec.group_label ?? null,
        seq: s,
      });
      const points = sec.points ?? [];
      for (let p = 0; p < points.length; p++) {
        const pt = points[p];
        await this.createPoint(section.id, episodeId, {
          text: pt.text ?? '',
          speaker_ref: pt.speaker_role ? roleToId.get(pt.speaker_role) ?? null : null,
          est_seconds: pt.est_seconds ?? null,
          seq: p,
        });
      }
    }
  }

  private async nextSeq(table: string, refCol: string, refVal: string): Promise<number> {
    const row = await queryOne<{ next: number }>(
      this.db,
      `SELECT COALESCE(MAX(seq), -1) + 1 AS next FROM ${table} WHERE ${refCol} = ?`,
      [refVal],
    );
    return row?.next ?? 0;
  }
}
