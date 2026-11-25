export interface ContentEnv {

  DB_CM: D1Database;

  KMAPS_ASSETS: R2Bucket;

  CORE?: Fetcher;

  /** km-studio-worker: the episodes a study feeds, for the passage log. */
  STUDIO?: Fetcher;

  /** km-ar-linguistics-worker: deck search finds by root through its root table (/al/lookup/roots). */
  AR_LINGUISTICS?: Fetcher;

  /** One live room per study: presence, focus and change notices (study-room.ts). */
  STUDY_ROOM?: DurableObjectNamespace;

  /** One live room per two-person read-along episode: same scene on every iPad, the take's flash and markers (readalong-room.ts). */
  READALONG_ROOM?: DurableObjectNamespace;

  JWT_SECRET?: string;
}
