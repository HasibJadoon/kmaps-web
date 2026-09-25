export interface StudioEnv {

  DB_ST: D1Database;

  EPISODE_SESSION: DurableObjectNamespace;

  CORE: Fetcher;

  /// QR, for the passage a brainstorm is about.
  QR: Fetcher;

  /// Secret. The brainstorm tutor's Claude API key.
  ANTHROPIC_API_KEY: string;
}
