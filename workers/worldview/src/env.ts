export interface WorldviewEnv {

  DB_WV: D1Database;

  /// Recitations the poetry reads against — the Masnavi as توحید بهروزی sings
  /// it. Served read-only via GET /wv/audio/:key+; the module is publicGet, so
  /// an <audio> tag reaches it without a token, which it could not carry.
  WV_AUDIO: R2Bucket;

  CONTENT?: Fetcher;
  QURAN?: Fetcher;
  CORE?: Fetcher;

  JWT_SECRET?: string;
}
