-- The Studio stage's renderer (scene.html, its scripts and styles) as data. Each release names every file it serves
-- by path and the SHA-256 of its bytes; the bytes live in R2 (km-studio-overlay, key overlay/<sha256>). Studio keeps
-- the live release on disk and serves any file it does not name from the copy bundled in the app. Owner, 2026-10-28:
-- renderer changes ship as data, with no rebuild of the app.
CREATE TABLE IF NOT EXISTS st_overlay_release (
  version       TEXT PRIMARY KEY,
  manifest_json TEXT NOT NULL,              -- {"deck.js": "<sha256>", "builders/keyterm.js": "<sha256>", …}
  note          TEXT,
  live          INTEGER NOT NULL DEFAULT 0, -- the one release Studio takes (the newest live row)
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
