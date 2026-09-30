-- The practice labels and the grammar sentences are content too: a write to either moves the content
-- cache version (kmaps_cache_version.sql), so the practice home and the rest rebuild on their next read.
-- (ar_read_pool is left out: the TTS publisher writes it clip by clip, and would move the version all day.)
CREATE TRIGGER IF NOT EXISTS trg_kcv_ar_practice_label_i AFTER INSERT ON ar_practice_label BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;
CREATE TRIGGER IF NOT EXISTS trg_kcv_ar_practice_label_u AFTER UPDATE ON ar_practice_label BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;
CREATE TRIGGER IF NOT EXISTS trg_kcv_ar_practice_label_d AFTER DELETE ON ar_practice_label BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;
CREATE TRIGGER IF NOT EXISTS trg_kcv_ar_grammar_sentence_i AFTER INSERT ON ar_grammar_sentence BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;
CREATE TRIGGER IF NOT EXISTS trg_kcv_ar_grammar_sentence_u AFTER UPDATE ON ar_grammar_sentence BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;
CREATE TRIGGER IF NOT EXISTS trg_kcv_ar_grammar_sentence_d AFTER DELETE ON ar_grammar_sentence BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;
UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content';
