import { query, queryOne, execute } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';

export interface StudySessionRow {
  id: string;
  user_ref: string;
  domain: string;
  lane: string;
  layer_id: string | null;
  band_code: string | null;
  scope_kind: string;
  scope_ref: string;
  node_id: string | null;
  activity: string;
  source_kind: string | null;
  source_ref: string | null;
  started_at: string;
  ended_at: string | null;
  duration_secs: number | null;
  confidence: number | null;
  note: string | null;
  created_at: string;
}

export interface StudySessionCreate {
  domain: string;
  lane: string;
  scope_kind: string;
  scope_ref: string;
  activity: string;
  layer_id?: string | null;
  band_code?: string | null;
  node_id?: string | null;
  source_kind?: string | null;
  source_ref?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  duration_secs?: number | null;
  confidence?: number | null;
  note?: string | null;
}

const COLS =
  'id, user_ref, domain, lane, layer_id, band_code, scope_kind, scope_ref, node_id, ' +
  'activity, source_kind, source_ref, started_at, ended_at, duration_secs, confidence, note, created_at';

export class StudySessionRepo {
  constructor(private db: D1Database) {}

  forScope(userRef: string, scopeKind: string, scopeRef: string): Promise<StudySessionRow[]> {
    return query<StudySessionRow>(
      this.db,
      `SELECT ${COLS} FROM core_study_session
       WHERE user_ref = ? AND scope_kind = ? AND scope_ref = ?
       ORDER BY started_at DESC`,
      [userRef, scopeKind, scopeRef],
    );
  }

  tally(userRef: string, scopeKind: string, scopeRef: string, activities: string[]) {
    const ph = activities.map(() => '?').join(',');
    return queryOne<{ sessions: number; layers: number; last_at: string | null; secs: number }>(
      this.db,
      `SELECT COUNT(*) AS sessions,
              COUNT(DISTINCT layer_id) AS layers,
              MAX(COALESCE(ended_at, started_at)) AS last_at,
              COALESCE(SUM(duration_secs), 0) AS secs
         FROM core_study_session
        WHERE user_ref = ? AND scope_kind = ? AND scope_ref = ?
          AND activity IN (${ph})`,
      [userRef, scopeKind, scopeRef, ...activities],
    );
  }

  async create(userRef: string, input: StudySessionCreate): Promise<StudySessionRow> {
    const id = typedId('SS');
    const started = input.started_at ?? new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO core_study_session
         (id, user_ref, domain, lane, layer_id, band_code, scope_kind, scope_ref, node_id,
          activity, source_kind, source_ref, started_at, ended_at, duration_secs, confidence, note)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id, userRef, input.domain, input.lane, input.layer_id ?? null, input.band_code ?? null,
        input.scope_kind, input.scope_ref, input.node_id ?? null,
        input.activity, input.source_kind ?? null, input.source_ref ?? null,
        started, input.ended_at ?? null, input.duration_secs ?? null,
        input.confidence ?? null, input.note ?? null,
      ],
    );
    const row = await queryOne<StudySessionRow>(
      this.db, `SELECT ${COLS} FROM core_study_session WHERE id = ?`, [id]);
    return row!;
  }

  async remove(userRef: string, id: string): Promise<boolean> {
    const res = await execute(
      this.db, 'DELETE FROM core_study_session WHERE id = ? AND user_ref = ?', [id, userRef]);
    return (res.meta?.changes ?? 0) > 0;
  }
}
