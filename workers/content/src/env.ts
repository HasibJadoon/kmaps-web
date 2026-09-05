export interface ContentEnv {

  DB_CM: D1Database;

  KMAPS_ASSETS: R2Bucket;

  CORE?: Fetcher;

  JWT_SECRET?: string;
}
