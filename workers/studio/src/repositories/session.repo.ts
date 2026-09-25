import { queryOne, execute } from '../../../shared/src/db';
import { typedId, randomCode } from '../../../shared/src/ulid';

export interface SessionRow {
  id: string;
  episode_ref: string;
  core_user_ref: string;
  room_code: string;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  snapshot_json: string | null;
  created_at: string;
}

const COLS = `id, episode_ref, core_user_ref, room_code, status,
              started_at, ended_at, snapshot_json, created_at`;

export class SessionRepo {
  constructor(private db: D1Database) {}

  findByCode(code: string): Promise<SessionRow | null> {
    return queryOne<SessionRow>(
      this.db, `SELECT ${COLS} FROM st_sessions WHERE room_code = ?`, [code],
    );
  }

  findById(id: string): Promise<SessionRow | null> {
    return queryOne<SessionRow>(
      this.db, `SELECT ${COLS} FROM st_sessions WHERE id = ?`, [id],
    );
  }

  findLiveByEpisode(episodeRef: string): Promise<SessionRow | null> {
    return queryOne<SessionRow>(
      this.db,
      `SELECT ${COLS} FROM st_sessions
       WHERE episode_ref = ? AND status = 'live'
       ORDER BY created_at DESC LIMIT 1`,
      [episodeRef],
    );
  }

  async create(episodeRef: string, userRef: string): Promise<SessionRow> {
    const id = typedId('ST');
    const now = new Date().toISOString();

    for (let attempt = 0; attempt < 6; attempt++) {
      const code = randomCode();
      if (await this.findByCode(code)) continue;
      await execute(
        this.db,
        `INSERT INTO st_sessions
           (id, episode_ref, core_user_ref, room_code, status, started_at, created_at)
         VALUES (?, ?, ?, ?, 'live', ?, ?)`,
        [id, episodeRef, userRef, code, now, now],
      );
      return (await this.findById(id))!;
    }
    throw new Error('Could not allocate a unique room code');
  }

  async end(id: string, snapshotJson: string | null = null): Promise<void> {
    await execute(
      this.db,
      `UPDATE st_sessions SET status = 'ended', ended_at = ?, snapshot_json = ? WHERE id = ?`,
      [new Date().toISOString(), snapshotJson, id],
    );
  }
}
