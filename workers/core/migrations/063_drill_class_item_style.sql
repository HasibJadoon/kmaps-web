-- A class item's style: the sub-node of its path node it counts toward (QR practice-class.ts styleOf — sarf:table,
-- vocab:vocab_root, tafsir_read:razi …). The class view shows each sub-node's drills passed of its total; a sub-node is
-- finished only when every drill of it is (owner, 2026-10-16).
ALTER TABLE core_drill_class_item ADD COLUMN style TEXT;
CREATE INDEX IF NOT EXISTS idx_core_drill_class_item_style ON core_drill_class_item(class_id, node_key, style);
