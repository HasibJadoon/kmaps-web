-- Reading lessons (owner, 2026-10-25): a short read-along story or Q&A in one Everyday category. The lesson itself is a
-- note in km_content (note_ref); this row files it under its category so the Everyday room can list it there.
CREATE TABLE IF NOT EXISTS ar_daily_reading (
  id           TEXT PRIMARY KEY,
  domain_id    TEXT NOT NULL REFERENCES ar_curriculum_domain(id),
  slug         TEXT NOT NULL UNIQUE,
  kind         TEXT NOT NULL CHECK (kind IN ('story', 'qa')),
  title_en     TEXT NOT NULL,
  title_ar     TEXT NOT NULL,
  subtitle_en  TEXT,
  note_ref     TEXT NOT NULL,
  cover_key    TEXT,
  lines        INTEGER NOT NULL DEFAULT 0,
  level        TEXT NOT NULL DEFAULT 'A2',
  sort_order   INTEGER NOT NULL DEFAULT 0,
  is_published INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ar_daily_reading_domain ON ar_daily_reading (domain_id, is_published, sort_order);
INSERT OR IGNORE INTO ar_curriculum_domain (id, slug, title, title_ar, description, sort_order) VALUES
  ('01ARDOM000000000000032', 'moral_stories', 'Moral Stories', 'قِصَصٌ وَعِبَرٌ', 'Short stories with a lesson, classic tales retold simply', 5);
INSERT OR REPLACE INTO ar_daily_reading (id, domain_id, slug, kind, title_en, title_ar, subtitle_en, note_ref, cover_key, lines, sort_order) VALUES
  ('ARDR:honesty-saves', '01ARDOM000000000000032', 'honesty-saves', 'story', 'Honesty Saves', 'الصِّدْقُ يُنْجِي', 'A broken vase, and a brave true word.', 'NOTE:AR:reading:honesty-saves', 'reading/honesty-saves/p1.jpg', 6, 1),
  ('ARDR:friday', '01ARDOM000000000000031', 'friday', 'qa', 'What do you do on Friday?', 'مَاذَا تَفْعَلُ يَوْمَ الْجُمُعَةِ؟', 'A Friday, question by question.', 'NOTE:AR:reading:friday', 'reading/friday/p3.jpg', 5, 1);
