-- ─── 004 · the domain registry · three parallel study domains ────────────────
--
-- Cybernetics controls three domains that run their own B·S·C·R loop at the
-- same time and do not wait on each other:
--
--     Qurʾān            · km_quran
--     Classical Arabic  · km_arabic_linguistic  +  km_arabic
--     Worldview         · km_worldview
--
-- WHY TWO DATABASES FOR ARABIC
--
-- `km_arabic` and `km_arabic_linguistic` are different things and the names
-- hide it. `km_arabic_linguistic` holds the knowledge — 1,642 roots, 4,908
-- lemmas, the lexicons, the senses and their arcs. `km_arabic` holds the
-- curriculum and the learner: ar_curriculum_track · _unit · _lesson and
-- ar_learn_mastery · _exposure_log · _unit_progress · _task_completion.
--
-- That split is exactly the Build/Study divide. Build mines the linguistic
-- database; Study and Retention read and write the learner one. So a domain
-- names both, and which database a reading comes from is a property of the
-- axis, not of the domain.
--
-- Live today: km_arabic_linguistic is well populated, km_arabic is scaffolded
-- and nearly empty — 6 curriculum tracks, 1 exposure-log row, everything else
-- zero. That is a true reading of Study for this domain, not a fault, and it is
-- why the Arabic loop should report Study as barely started rather than absent.
--
-- `learner_db` for Qurʾān and Worldview is km_core, because their review state
-- is the one central deck (core_srs_deck · _card · _review) added in core 002.
-- Arabic has its own ar_learn_* tables, which predate that deck and are empty;
-- if they are ever retired in favour of the central deck, this column is the one
-- row to change.

CREATE TABLE IF NOT EXISTS cyb_domain (
  slug          TEXT PRIMARY KEY,           -- matches cyb_node.domain
  lane          TEXT NOT NULL,              -- matches cyb_node.lane
  name_ar       TEXT NOT NULL,
  name_en       TEXT NOT NULL,
  name_ur       TEXT,
  hint          TEXT,
  -- Where the knowledge is built. Build senses this.
  content_db    TEXT NOT NULL,
  -- Where the learner's own state lives. Study and Retention sense this.
  learner_db    TEXT NOT NULL,
  -- What one unit of work is called in this domain — the thing a loop closes
  -- over. Qurʾān works a passage, Arabic a root, Worldview a concept.
  unit_kind     TEXT NOT NULL,
  color_hex     TEXT,
  symbol        TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'live',
  meta_json     TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(meta_json)),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO cyb_domain
  (slug, lane, name_ar, name_en, hint, content_db, learner_db, unit_kind,
   color_hex, symbol, display_order)
VALUES
  ('quran', 'quran', 'القرآن', 'Qurʾān',
   '114 surahs · passages · words',
   'km_quran', 'km_core', 'passage',
   '#e8c96a', 'book.closed', 10),

  ('arabic', 'language', 'العربية', 'Classical Arabic',
   '1,642 roots · 4,908 lemmas',
   'km_arabic_linguistic', 'km_arabic', 'root',
   '#4dd9a8', 'character.textbox', 20),

  ('wv', 'worldview', 'رؤية العالم', 'Worldview',
   'concepts · claims · evidence',
   'km_worldview', 'km_core', 'concept',
   '#c58ad9', 'globe.europe.africa', 30);

-- `ling` exists on six cyb_node rows as a fourth domain value. It is the
-- linguistic *pieces* hung under Qurʾān passages rather than a domain anyone
-- studies on its own, so it is recorded as retired rather than promoted to a
-- fourth study domain — declaring it would put an empty card on the hub.
INSERT OR IGNORE INTO cyb_domain
  (slug, lane, name_ar, name_en, hint, content_db, learner_db, unit_kind,
   color_hex, symbol, display_order, status)
VALUES
  ('ling', 'quran', 'اللسانيات', 'Linguistics',
   'legacy · pieces under Qurʾān passages',
   'km_arabic_linguistic', 'km_core', 'piece',
   '#8fa0b8', 'text.magnifyingglass', 90, 'retired');
