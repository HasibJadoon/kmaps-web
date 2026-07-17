-- 0033_rename_mufradat_slug.sql
-- Rename the al-Rāghib Mufradāt source slug:
--   ketabonline_al_raghib_mufradat  →  al_raghib_mufradat
-- (drop the provider prefix; "mufradat" is the accurate transliteration of
--  المفردات). Rewrites the denormalised source_slug join key across every
--  lexicon content table plus the source registry (ar_ling_sources.slug).
--
-- The *_fts indexes are external-content FTS5 with AFTER UPDATE triggers
-- (trig_albk_fts_au / trig_alre_fts_au / trig_albp_fts_au), so these updates
-- keep search in sync automatically — no manual rebuild needed.
--
-- Idempotent: re-running matches nothing (rows already carry the new slug).

UPDATE ar_ling_sources
   SET slug = 'al_raghib_mufradat'
 WHERE slug = 'ketabonline_al_raghib_mufradat';

UPDATE ar_ling_lexicon_root_entries
   SET source_slug = 'al_raghib_mufradat'
 WHERE source_slug = 'ketabonline_al_raghib_mufradat';

UPDATE ar_ling_lexicon_entry_sections
   SET source_slug = 'al_raghib_mufradat'
 WHERE source_slug = 'ketabonline_al_raghib_mufradat';

UPDATE ar_ling_lexicon_blocks
   SET source_slug = 'al_raghib_mufradat'
 WHERE source_slug = 'ketabonline_al_raghib_mufradat';

UPDATE ar_ling_lexicon_block_links
   SET source_slug = 'al_raghib_mufradat'
 WHERE source_slug = 'ketabonline_al_raghib_mufradat';

UPDATE ar_ling_lexicon_quran_refs
   SET source_slug = 'al_raghib_mufradat'
 WHERE source_slug = 'ketabonline_al_raghib_mufradat';

UPDATE ar_ling_lexicon_book_pages
   SET source_slug = 'al_raghib_mufradat'
 WHERE source_slug = 'ketabonline_al_raghib_mufradat';

UPDATE ar_ling_lexicon_root_entry_sources
   SET source_slug = 'al_raghib_mufradat'
 WHERE source_slug = 'ketabonline_al_raghib_mufradat';

UPDATE ar_ling_lexicon_entries
   SET source_slug = 'al_raghib_mufradat'
 WHERE source_slug = 'ketabonline_al_raghib_mufradat';

UPDATE ar_ling_source_chunks
   SET source_slug = 'al_raghib_mufradat'
 WHERE source_slug = 'ketabonline_al_raghib_mufradat';
