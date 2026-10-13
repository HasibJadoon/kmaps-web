export interface ArabicEnv {

  DB_AR: D1Database;

  // Arabic acquisition media — audio only. Objects are keyed by content hash,
  // so a changed file is a new key and never a rewrite.
  AR_AUDIO: R2Bucket;

  // Publisher companion audio held under licence to one reader. Private: no
  // anonymous route reaches it, only a signed URL minted per key.
  AR_VENDOR: R2Bucket;

  AR_LINGUISTICS?: Fetcher;
  QURAN?: Fetcher;
  // The intake routes Worldview's share to its pipeline (lib/intake-domains.ts).
  WORLDVIEW?: Fetcher;

  JWT_SECRET?: string;

  // Signs the expiring stream URLs for AR_VENDOR. Its own secret, not the
  // gateway's JWT_SECRET, which no domain worker holds.
  VENDOR_URL_SECRET?: string;
}
