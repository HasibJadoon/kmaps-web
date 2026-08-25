-- 021 — the library comes back
--
-- `cyb_card` was dropped when staging was retired (see 020, which called it
-- "gone for good"). Nothing told the SRS routes. `/core/srs/library`,
-- `/library/items`, `/library/enroll` and `/library/take` all still select from
-- it, so every one of them has been throwing `no such table: cyb_card` — a 500
-- the iOS app reports as "Couldn't reach the card library." on every surah.
--
-- The table comes back rather than the routes changing, because the content is
-- still here. Sixty-eight enrolled copies in `core_srs_card` carry the whole
-- published payload in `extra_json`:
--
--   {"cyb_card":"CARD:44:3:s1:tarjama",
--    "node_id":"CYB:quran:44:1-9:ss:44:3:s1",
--    "kind":"ss_tarjama_build"}
--
-- alongside the `front_text`/`back_text` they were copied from. That is every
-- column the routes read, so the library is reconstructed from the copies it
-- made of itself. All 68 ids are distinct and all 18 node_ids still resolve, so
-- the primary key and the foreign key both hold.
--
-- The shape here is the staging-era one the routes query — `front_md`,
-- `back_md`, `tags_json` — not the scheduling shape in `core.schema.sql`
-- (ease/interval_days/due_at). Scheduling lives in `core_srs_card` now; a
-- library card is content and nothing else. `core.schema.sql` should be
-- corrected to match.
--
-- Run one statement at a time: D1 rejects a file that mixes DDL with INSERTs
-- and returns `D1_RESET_DO` without naming the reason.

-- 1. The table.
CREATE TABLE IF NOT EXISTS cyb_card (
  id        TEXT PRIMARY KEY,
  node_id   TEXT NOT NULL REFERENCES cyb_node(id) ON DELETE CASCADE,
  card_kind TEXT NOT NULL,
  front_md  TEXT,
  back_md   TEXT,
  tags_json TEXT
);

-- 2. Its index. Every library route filters `node_id LIKE 'CYB:quran:<n>:%'`,
--    which is a prefix scan the primary key cannot serve.
CREATE INDEX IF NOT EXISTS idx_cyb_card_node ON cyb_card(node_id);

-- 3. The content, read back out of the copies. `INSERT OR IGNORE` so a rerun is
--    a no-op and a card that was somehow republished keeps its published text
--    rather than being overwritten by one learner's copy.
INSERT OR IGNORE INTO cyb_card (id, node_id, card_kind, front_md, back_md, tags_json)
SELECT json_extract(extra_json, '$.cyb_card'),
       json_extract(extra_json, '$.node_id'),
       COALESCE(json_extract(extra_json, '$.kind'), tags, 'unknown'),
       front_text,
       back_text,
       CASE WHEN tags IS NULL OR tags = '' THEN NULL
            ELSE json_array(tags) END
  FROM core_srs_card
 WHERE extra_json LIKE '%cyb_card%'
   AND json_extract(extra_json, '$.cyb_card') IS NOT NULL
   AND json_extract(extra_json, '$.node_id')  IS NOT NULL;

-- 4. The surah filter in `SrsRepo.due()` reaches through `core_srs_card_surah`
--    now, because a root or lemma card cannot name its surah in its own
--    `resource_ref`. That lookup is by surah alone, which the (card_id, surah)
--    primary key cannot serve.
CREATE INDEX IF NOT EXISTS idx_srs_card_surah_surah ON core_srs_card_surah(surah);
