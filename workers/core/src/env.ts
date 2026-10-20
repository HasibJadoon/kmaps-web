export interface CoreEnv {
  /** The request's context (index.ts): work a route finishes after it has answered. Absent in tests. */
  ctx?: ExecutionContext;

  DB_CORE: D1Database;

  REVIEW_SESSION: DurableObjectNamespace;

  QUIZ_SESSION: DurableObjectNamespace;
  TABLE_SESSION: DurableObjectNamespace;

  QURAN: Fetcher;
  /** The Arabic worker: the class paths of its units (the widgets). */
  ARABIC?: Fetcher;
  AR_LINGUISTICS: Fetcher;
  CONTENT: Fetcher;
  /** R2 km-personal: the owner's private files — meal photos for the dashboard (routes/body.ts). */
  PERSONAL?: R2Bucket;

  JWT_SECRET: string;
  JWT_EXPIRY_SECONDS?: string;

  GOOGLE_CLIENT_ID?: string;
  APPLE_CLIENT_ID?: string;
  APPLE_REDIRECT_URI?: string;

  CARD_APPROVERS?: string;
}
