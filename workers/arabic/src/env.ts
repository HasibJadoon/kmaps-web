export interface ArabicEnv {

  DB_AR: D1Database;

  // Arabic acquisition media — audio only. Objects are keyed by content hash,
  // so a changed file is a new key and never a rewrite.
  AR_AUDIO: R2Bucket;

  AR_LINGUISTICS?: Fetcher;
  QURAN?: Fetcher;

  JWT_SECRET?: string;
}
