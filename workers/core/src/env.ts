export interface CoreEnv {

  DB_CORE: D1Database;

  REVIEW_SESSION: DurableObjectNamespace;

  QUIZ_SESSION: DurableObjectNamespace;
  TABLE_SESSION: DurableObjectNamespace;

  QURAN: Fetcher;
  AR_LINGUISTICS: Fetcher;
  CONTENT: Fetcher;

  JWT_SECRET: string;
  JWT_EXPIRY_SECONDS?: string;

  GOOGLE_CLIENT_ID?: string;
  APPLE_CLIENT_ID?: string;
  APPLE_REDIRECT_URI?: string;

  CARD_APPROVERS?: string;
}
