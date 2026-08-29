// ─── CoreEnv ───────────────────────────────────────────────────────────────────
// Owns DB_CORE (km_core). Identity, workspaces, roles, grants, policies.
// No domain tables. All other workers call CORE for auth context.
// The one exception to "CORE calls no domain worker": the sensor engine reads
// each carrier database through its owning worker's internal sense route.

export interface CoreEnv {
  // Owned database
  DB_CORE: D1Database;

  // Reviewing together: one shared question, each person's own card scheduled.
  REVIEW_SESSION: DurableObjectNamespace;

  // Sensor-engine readers (internal routes on the carrier owners)
  QURAN: Fetcher;
  AR_LINGUISTICS: Fetcher;
  CONTENT: Fetcher;

  // Secrets
  JWT_SECRET: string;          // required — CORE issues tokens
  JWT_EXPIRY_SECONDS?: string; // default 3600

  // OAuth — optional. When unset, the matching provider is reported as
  // disabled by /core/auth/providers and its login endpoint refuses.
  // Comma-separated to allow multiple audiences (e.g. Apple services-id
  // plus native bundle-id).
  GOOGLE_CLIENT_ID?: string;
  APPLE_CLIENT_ID?: string;
  APPLE_REDIRECT_URI?: string; // required for the Apple web sign-in popup
  /// Comma-separated emails allowed to publish cards into the shared library.
  CARD_APPROVERS?: string;
}
