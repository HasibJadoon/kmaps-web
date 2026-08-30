export interface StudioEnv {

  DB_ST: D1Database;

  EPISODE_SESSION: DurableObjectNamespace;

  CORE: Fetcher;
}
