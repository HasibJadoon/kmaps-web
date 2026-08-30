export interface QuranEnv {

  DB_QR: D1Database;

  AR_LINGUISTICS?: Fetcher;
  WORLDVIEW?: Fetcher;
  CONTENT?: Fetcher;

  DEP_GRAPHS_BUCKET: R2Bucket;

  JWT_SECRET?: string;
}
