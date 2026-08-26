-- 023 — the source log
--
-- Companion to `core_daily_log` (022). That table logs *events* — one row per
-- thing done on a day. This one logs *resources* — one row per book, corpus,
-- paper or site that has been read or is wanted, carrying a personal
-- exploration state that no existing table holds.
--
-- `cyb_source_registry` already catalogues 68 sources with a `coverage_state`
-- of catalogued / ingested / complete / authored. That is the system's view:
-- how far the data got in. It deliberately is not reused here, for one
-- structural reason — `loop_key`, `source_kind`, `binding`, `locator` and
-- `entry_locator` are all NOT NULL. A resource you have merely heard of has
-- none of those yet, so capturing it would mean inventing a binding and a
-- locator to satisfy the schema. Friction at the moment of capture is exactly
-- what loses the note, and a want-to-read list that demands five invented
-- values does not get written. Here only `title` is required.
--
-- A resource may already be registered somewhere, or be entirely new, so
-- `registered_in` names where it currently lives and defaults to 'none':
--
--   none                          new — read it, but it is in no registry yet
--   cyb_source_registry           the km_core system catalogue
--   ar_ling_source                the AL source table
--   ar_ling_gram_source_toc_rank  the ranked grammar/ṣarf roster
--   ar_ling_gram_external_toc     jamharah-keyed external TOC
--   external                      lives outside K-MAPS entirely
--
-- Left as free TEXT rather than a CHECK: a resource can be registered in a
-- place not on this list, and rejecting it at insert would lose the capture.
-- `registered_in = 'none'` is the actionable queue — things read and worth
-- keeping that nothing in the corpus knows about yet.
--
-- `explore_state` is the human axis, orthogonal to `coverage_state`:
--
--   want       heard of it, not opened it
--   exploring  currently reading round it
--   explored   read enough to judge it
--   parked     real, but not now — with `why` saying what would unpark it
--   rejected   looked, decided against — the row that stops the third look
--
-- `rejected` is the one that earns the table. A resource dismissed once will
-- look just as interesting in four months, and nothing else records the
-- dismissal. `found_what` holds the reason, so the second temptation costs a
-- query instead of an afternoon.
--
-- No UNIQUE on title or slug — same reasoning as 022's `unit_ref`. A duplicate
-- row is a signal that the same resource keeps resurfacing; a constraint would
-- swallow it.
--
-- Run one statement at a time: D1 rejects a file that mixes DDL with INSERTs
-- and returns `D1_RESET_DO` without naming the reason.

-- 1. The table.
CREATE TABLE IF NOT EXISTS core_source_log (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),

  -- what it is
  title         TEXT NOT NULL,
  author        TEXT,
  domain        TEXT NOT NULL DEFAULT 'other'
                  CHECK (domain IN ('arabic','quran','worldview','other')),
  source_kind   TEXT,
  source_slug   TEXT,
  locator       TEXT,

  -- registered anywhere, or new
  registered_in TEXT NOT NULL DEFAULT 'none',

  -- where I am with it
  explore_state TEXT NOT NULL DEFAULT 'want'
                  CHECK (explore_state IN ('want','exploring','explored','parked','rejected')),
  priority      INTEGER CHECK (priority IS NULL OR priority BETWEEN 1 AND 5),
  why           TEXT,
  found_what    TEXT,
  verdict       TEXT,

  first_seen    TEXT NOT NULL DEFAULT (date('now')),
  last_touched  TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. The read: what's open, by domain.
CREATE INDEX IF NOT EXISTS idx_source_log_state ON core_source_log(explore_state, domain);

-- 3. The join back to the registries and to core_daily_log.source_slug.
CREATE INDEX IF NOT EXISTS idx_source_log_slug ON core_source_log(source_slug);

-- 4. "Did I already look at this?" by name.
CREATE INDEX IF NOT EXISTS idx_source_log_title ON core_source_log(title);

-- 5. The queue: what to pick up next.
CREATE INDEX IF NOT EXISTS idx_source_log_priority ON core_source_log(priority DESC, first_seen);

-- 6. The ingest backlog: read, kept, registered nowhere.
CREATE INDEX IF NOT EXISTS idx_source_log_registered ON core_source_log(registered_in, explore_state);

-- 7. Seed from the system registry, so the log starts knowing what is done.
--    ling → arabic, wv → worldview; complete/ingested/authored → explored.
--    Seeds 68 rows.
INSERT INTO core_source_log (title, author, domain, source_kind, source_slug, registered_in, explore_state, found_what)
SELECT
  COALESCE(NULLIF(title_en,''), NULLIF(title_ar,''), source_slug),
  author,
  CASE domain WHEN 'ling' THEN 'arabic' WHEN 'wv' THEN 'worldview'
              WHEN 'arabic' THEN 'arabic' WHEN 'quran' THEN 'quran' ELSE 'other' END,
  source_kind,
  source_slug,
  'cyb_source_registry',
  CASE coverage_state WHEN 'catalogued' THEN 'want' ELSE 'explored' END,
  'Seeded from cyb_source_registry · coverage_state=' || coverage_state
    || COALESCE(' · db=' || db, '')
FROM cyb_source_registry;

-- 8. ʿUḍayma is rank 0 in AL but absent from cyb_source_registry, so the seed
--    above misses it. It is the source the QAC comparison turned on, and the
--    fetch trap is worth carrying: the live site serves a JS interstitial and
--    the Wayback snapshot is windows-1256, not utf-8.
INSERT INTO core_source_log
  (title, author, domain, source_kind, source_slug, locator, registered_in,
   explore_state, priority, why, found_what, verdict, last_touched)
VALUES (
 'دراسات لأسلوب القرآن الكريم — دليل المعجم الصرفي',
 'محمد عبد الخالق عُضَيمة',
 'quran',
 'quranic-index',
 'adima_dirasat',
 'https://jamharah.net/showthread.php?t=21843',
 'ar_ling_gram_source_toc_rank + ar_ling_gram_external_toc',
 'exploring',
 5,
 'source_rank 0 in ar_ling_gram_source_toc_rank — "one entry per term, every Qurʾānic instance inside it; reach for this first".',
 'Master ṣarf index: 25 posts, 1,343 headings, 167 of them qirāʾāt-keyed. 389 entries already loaded into ar_ling_gram_external_toc (ids 14381–15007) matching these headings 1:1. Thread 21843 itself is NOT loaded. 238 ids unloaded inside the span, largest run 14481–14688 (208 ids) = the bāb-by-bāb verb block. LIVE SITE IS A JS INTERSTITIAL — use the Wayback snapshot, windows-1256 encoded, not utf-8.',
 'Keep. It is the derivational/phonological/qirāʾāt layer QAC structurally cannot hold.',
 date('now'));
