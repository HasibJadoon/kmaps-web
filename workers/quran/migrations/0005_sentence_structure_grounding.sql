CREATE TABLE IF NOT EXISTS qr_ss_term (
  term_key    TEXT PRIMARY KEY,
  label_ar    TEXT,
  label_en    TEXT,
  color       TEXT,
  category    TEXT NOT NULL DEFAULT 'constituent',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_qr_ss_term_cat ON qr_ss_term(category, sort_order);

ALTER TABLE qr_ss_tree_node ADD COLUMN term_key TEXT;
ALTER TABLE qr_ss_tree_node ADD COLUMN label_ar TEXT;
ALTER TABLE qr_ss_tree_node ADD COLUMN note_md TEXT;
ALTER TABLE qr_ss_tree_node ADD COLUMN word_occurrence_id TEXT;

ALTER TABLE qr_ss_tree ADD COLUMN grounding TEXT NOT NULL DEFAULT 'authored';
ALTER TABLE qr_ss_tree ADD COLUMN source_ref TEXT;

CREATE INDEX IF NOT EXISTS idx_qr_ss_tree_node_term ON qr_ss_tree_node(term_key);
CREATE INDEX IF NOT EXISTS idx_qr_ss_tree_node_word ON qr_ss_tree_node(word_occurrence_id);
