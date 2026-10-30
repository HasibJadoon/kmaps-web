-- A doc read aloud, and the queue that gets it there (owner, 2026-10-31: "queue audio so the model auto generates").
-- One row per doc: queued → voicing → done (or failed). The runner on the Mac (kmaps-resources
-- scripts/tts/voice_docs.py) takes queued rows, voices the doc section by section (Kokoro bm_george for the English,
-- SILMA for Arabic words, the reciter for a quoted āyah), uploads the clips to R2 doc-en/<slug>/ and writes them here.
-- source_hash is the text the clips were made from: a doc whose text changes is queued again on the runner's next pass.
CREATE TABLE IF NOT EXISTS cm_doc_voice (
  doc_id        TEXT PRIMARY KEY,
  status        TEXT NOT NULL DEFAULT 'queued',   -- queued · voicing · done · failed
  requested_at  TEXT NOT NULL DEFAULT (datetime('now')),
  requested_by  TEXT,
  started_at    TEXT,
  done_at       TEXT,
  error         TEXT,
  source_hash   TEXT,
  -- [{ "title": "I — A Stitch in Leather", "url": "/api/ar/audio/doc-en/<slug>/s01-<hash>.m4a", "seconds": 184.2 }]
  sections_json TEXT
);
CREATE INDEX IF NOT EXISTS cm_doc_voice_status ON cm_doc_voice(status, requested_at);
