export interface ContentEnv {

  DB_CM: D1Database;

  KMAPS_ASSETS: R2Bucket;

  CORE?: Fetcher;

  /** km-studio-worker: the episodes a study feeds, for the passage log. */
  STUDIO?: Fetcher;

  /** One live room per study: presence, focus and change notices (study-room.ts). */
  STUDY_ROOM?: DurableObjectNamespace;

  JWT_SECRET?: string;
}
