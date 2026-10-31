export interface BackendEnv {

  QURAN:          Fetcher;
  WORLDVIEW:      Fetcher;
  ARABIC:         Fetcher;
  AR_LINGUISTICS: Fetcher;
  CONTENT:        Fetcher;
  STUDIO:         Fetcher;
  CORE:           Fetcher;

  JWT_SECRET:      string;

  ALLOWED_ORIGINS: string;
}
