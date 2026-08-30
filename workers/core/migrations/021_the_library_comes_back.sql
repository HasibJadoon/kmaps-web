CREATE TABLE IF NOT EXISTS cyb_card (
  id        TEXT PRIMARY KEY,
  node_id   TEXT NOT NULL REFERENCES cyb_node(id) ON DELETE CASCADE,
  card_kind TEXT NOT NULL,
  front_md  TEXT,
  back_md   TEXT,
  tags_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_cyb_card_node ON cyb_card(node_id);

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

CREATE INDEX IF NOT EXISTS idx_srs_card_surah_surah ON core_srs_card_surah(surah);
