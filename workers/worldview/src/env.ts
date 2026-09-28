export interface WorldviewEnv {

  DB_WV: D1Database;

  /// Recitations the poetry reads against — the Masnavi as توحید بهروزی sings
  /// it. Served read-only via GET /wv/audio/:key+; the module is publicGet, so
  /// an <audio> tag reaches it without a token, which it could not carry.
  WV_AUDIO: R2Bucket;

  CONTENT?: Fetcher;
  QURAN?: Fetcher;
  CORE?: Fetcher;

  /// This request's context, set per request in index.ts — so a kept answer
  /// can be checked and rebuilt after the response has gone (cache.ts).
  CTX?: ExecutionContext;

  JWT_SECRET?: string;
}
