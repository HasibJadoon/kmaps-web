-- km_arabic_linguistic · 023 · the entry's display spec, and backlinks that scale
--
-- Two things, both in service of one goal: blocks are the unit, and anything
-- may point at a block.
--
-- 1. ar_ling_lexicon_entry_ds — one row per (book entry × template). It holds
--    the authored document in the template's own shape (doc_json) and the
--    display spec a screen draws (ds_json). ds_json REFERENCES blocks by
--    ar_ling_lexicon_block.id; it never copies their text. That id is already a
--    global TEXT primary key, so it is the block id everything else cites — no
--    second identifier is minted here.
--
-- 2. Indexes on ar_ling_lexicon_block_link. The table already models block →
--    block (link_kind='block', to_block_id) alongside root, āyah, authority,
--    lemma and concept targets, but it carries no index at all, so a backlink
--    query — "what points AT this block" — scans the whole table. Backlinks are
--    the point, so they get the index.

CREATE TABLE IF NOT EXISTS ar_ling_lexicon_entry_ds (
  id             TEXT PRIMARY KEY,
  root_entry_id  TEXT NOT NULL,
  source_slug    TEXT NOT NULL,
  root_norm      TEXT NOT NULL,

  -- which contract this row was built to, so a reshape is a new row, not a
  -- silent rewrite of one the app is already drawing
  template_key   TEXT NOT NULL,
  template_ver   INTEGER NOT NULL DEFAULT 1,

  -- the entry as the template asks for it, verbatim from the book
  doc_json       TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(doc_json)),
  -- the same entry shaped into sections and blocks for a screen; block ids
  -- inside are ar_ling_lexicon_block.id
  ds_json        TEXT CHECK (ds_json IS NULL OR json_valid(ds_json)),

  -- 'raw' | 'clean' | 'blocked' | 'index_only' | 'absent'
  status         TEXT NOT NULL DEFAULT 'raw',
  built_by       TEXT,
  built_at       TEXT,

  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT,

  FOREIGN KEY (root_entry_id) REFERENCES "ar_ling_lexicon_entry"(id),
  UNIQUE (root_entry_id, template_key)
);

CREATE INDEX IF NOT EXISTS ix_lex_entry_ds_root
  ON ar_ling_lexicon_entry_ds(root_norm, source_slug);
CREATE INDEX IF NOT EXISTS ix_lex_entry_ds_template
  ON ar_ling_lexicon_entry_ds(template_key, status);

-- Backlinks: what points AT this block, and what this block points at.
CREATE INDEX IF NOT EXISTS ix_lex_block_link_to
  ON ar_ling_lexicon_block_link(to_block_id, link_kind)
  WHERE to_block_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_lex_block_link_from
  ON ar_ling_lexicon_block_link(from_block_id, link_kind);
CREATE INDEX IF NOT EXISTS ix_lex_block_link_root
  ON ar_ling_lexicon_block_link(to_root_norm)
  WHERE to_root_norm IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_lex_block_link_ayah
  ON ar_ling_lexicon_block_link(to_surah, to_ayah)
  WHERE to_surah IS NOT NULL;

-- The block tree itself, read by entry and by parent on every render.
CREATE INDEX IF NOT EXISTS ix_lex_block_entry
  ON ar_ling_lexicon_block(root_entry_id, block_seq);
CREATE INDEX IF NOT EXISTS ix_lex_block_parent
  ON ar_ling_lexicon_block(parent_block_id)
  WHERE parent_block_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_lex_block_type
  ON ar_ling_lexicon_block(root_norm, block_type);
