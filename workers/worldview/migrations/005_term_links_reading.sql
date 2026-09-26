-- Concept links made while reading: a passage (wv_corpus_block) linked to a
-- registered concept (core_concept GC:), with the words it rests on and who
-- linked it. The backlinks of a concept are this table read by al_concept_ref.
ALTER TABLE wv_term_links ADD COLUMN quote TEXT;
ALTER TABLE wv_term_links ADD COLUMN core_user_ref TEXT;
CREATE INDEX IF NOT EXISTS idx_wv_tl_entity ON wv_term_links(entity_type, entity_id);
