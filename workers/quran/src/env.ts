export interface QuranEnv {

  DB_QR: D1Database;

  AR_LINGUISTICS?: Fetcher;
  ARABIC?: Fetcher;
  WORLDVIEW?: Fetcher;
  CONTENT?: Fetcher;

  DEP_GRAPHS_BUCKET: R2Bucket;

  JWT_SECRET?: string;
}
