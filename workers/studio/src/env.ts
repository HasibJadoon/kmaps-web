export interface StudioEnv {

  DB_ST: D1Database;

  EPISODE_SESSION: DurableObjectNamespace;

  /// R2, the stage's renderer files keyed overlay/<sha256> (st_overlay_release).
  OVERLAY: R2Bucket;

  CORE: Fetcher;

  /// QR, for the passage a brainstorm is about.
  QR: Fetcher;

  /// Secret. The brainstorm tutor's Claude API key.
  ANTHROPIC_API_KEY: string;
}
