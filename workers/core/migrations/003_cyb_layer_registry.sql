-- ─── 003 · the layer registry ────────────────────────────────────────────────
--
-- `cyb_node.domain`, `.lane` and `.layer` are free text, so the control plane
-- could always describe a new domain without a migration. The client could not:
-- the app rendered its six stream cards from a Swift enum
--
--     enum CybStream { case vocabulary, reading, ss, structure, tafsir, worldview }
--
-- so a seventh layer, or anything under Classical Arabic or Worldview, needed a
-- code edit and a build before it could appear. The registry that governs
-- sub-layers already works the other way round — adding the Senses band lit up
-- six new rows in the app with no client change at all — and this table gives
-- layers the same property.
--
-- ONE ROW PER (domain, layer). `db_name` records which database actually holds
-- that layer's content, because the control plane sits in km_core and the
-- content does not:
--
--     quran   → km_quran
--     arabic  → km_arabic_linguistic
--     wv      → km_worldview
--
-- Nothing here is invented. The six Qurʾān layers are the values already live on
-- `cyb_node.layer`; the Arabic bands are `ar_ling_reg_build_layer` as deployed;
-- the Worldview layers are the `wv_nodes.node_type` values that actually have
-- rows. `translation` is the one addition, and it has content behind it
-- (qr_ss_translation_unit · _passage · _decision · _buildup).

CREATE TABLE IF NOT EXISTS cyb_layer (
  id            TEXT PRIMARY KEY,           -- "<domain>:<layer_key>"
  domain        TEXT NOT NULL,              -- quran | arabic | wv | …
  lane          TEXT NOT NULL,
  layer_key     TEXT NOT NULL,              -- matches cyb_node.layer
  name_ar       TEXT NOT NULL,
  name_en       TEXT NOT NULL,
  name_ur       TEXT,
  hint          TEXT,                       -- "tilāwa · tajwīd"
  -- Which database holds this layer's content. The control plane is in km_core;
  -- the content never is.
  db_name       TEXT NOT NULL,
  color_hex     TEXT,
  symbol        TEXT,                       -- SF Symbol name
  display_order INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'live',
  meta_json     TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(meta_json)),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (domain, layer_key)
);
CREATE INDEX IF NOT EXISTS cyb_layer_domain ON cyb_layer(domain, display_order);

-- ── Qurʾān · km_quran ────────────────────────────────────────────────────────
-- The six already live on cyb_node.layer, in the order the passage screen shows
-- them, plus translation.
INSERT OR IGNORE INTO cyb_layer
  (id, domain, lane, layer_key, name_ar, name_en, hint, db_name, color_hex, symbol, display_order)
VALUES
  ('quran:vocabulary', 'quran', 'quran', 'vocabulary', 'المفردات', 'Root / Vocabulary',
   'roots', 'km_quran', '#e8c96a', 'textformat.abc', 10),
  ('quran:reading', 'quran', 'quran', 'reading', 'القراءة', 'Reading',
   'tilāwa · tajwīd', 'km_quran', '#e8b45c', 'waveform', 20),
  ('quran:ss', 'quran', 'quran', 'ss', 'الإعراب', 'Sentence Structure',
   'iʿrāb', 'km_quran', '#6bbaff', 'point.topleft.down.curvedto.point.bottomright.up', 30),
  ('quran:structure', 'quran', 'quran', 'structure', 'النظم', 'Passage Structure',
   'naẓm · coherence', 'km_quran', '#c58ad9', 'square.stack.3d.up', 40),
  ('quran:tafsir', 'quran', 'quran', 'tafsir', 'التفسير', 'Tafsīr',
   'books', 'km_quran', '#4dd9a8', 'books.vertical', 50),
  -- New. 46 rows across qr_ss_translation_unit · _passage · _decision · _buildup,
  -- which had content and no layer to be reported under.
  ('quran:translation', 'quran', 'quran', 'translation', 'الترجمة', 'Translation',
   'derived · literal → fluent', 'km_quran', '#e0785c', 'character.book.closed', 60);

-- ── Classical Arabic · km_arabic_linguistic ──────────────────────────────────
-- The bands of `ar_ling_reg_build_layer` as deployed, including the Senses band
-- added in ar-linguistics 0097.
INSERT OR IGNORE INTO cyb_layer
  (id, domain, lane, layer_key, name_ar, name_en, hint, db_name, color_hex, symbol, display_order)
VALUES
  ('arabic:CORE',   'arabic', 'language', 'CORE',   'الأصل',        'Identity',
   'root identity', 'km_arabic_linguistic', '#e8c96a', 'circle.lefthalf.filled', 10),
  ('arabic:SYN',    'arabic', 'language', 'SYN',    'ذكاء الجذر',   'Root intelligence',
   'dna · aṣl', 'km_arabic_linguistic', '#4dd9a8', 'sparkle', 20),
  ('arabic:SENSE',  'arabic', 'language', 'SENSE',  'المعاني',      'Senses',
   'senses · arcs · attestations', 'km_arabic_linguistic', '#c58ad9', 'circle.hexagongrid', 30),
  ('arabic:GRAPH',  'arabic', 'language', 'GRAPH',  'شبكة الجذر',   'Root graph',
   'antonyms · fields', 'km_arabic_linguistic', '#6bbaff', 'arrow.left.arrow.right', 40),
  ('arabic:LINK',   'arabic', 'language', 'LINK',   'الروابط',      'Bridges',
   'cross-links', 'km_arabic_linguistic', '#8fa0b8', 'link', 50),
  ('arabic:SOURCE', 'arabic', 'language', 'SOURCE', 'المصادر',      'Sources',
   'provenance', 'km_arabic_linguistic', '#e8b45c', 'text.book.closed', 60),
  ('arabic:LEARN',  'arabic', 'language', 'LEARN',  'التعلّم',       'Learning',
   'vocab · memlets', 'km_arabic_linguistic', '#4dd9a8', 'graduationcap', 70),
  ('arabic:SARF',   'arabic', 'language', 'SARF',   'الصرف',        'Morphology',
   'lemma · paradigm', 'km_arabic_linguistic', '#e8c96a', 'square.grid.2x2', 80),
  ('arabic:KIN',    'arabic', 'language', 'KIN',    'المقاربات',    'Kindred',
   'near-synonyms · furūq', 'km_arabic_linguistic', '#6bbaff', 'circle.circle', 90),
  ('arabic:EXPR',   'arabic', 'language', 'EXPR',   'التعابير',     'Expressions',
   'idioms', 'km_arabic_linguistic', '#c58ad9', 'text.quote', 100);

-- ── Worldview · km_worldview ─────────────────────────────────────────────────
-- The `wv_nodes.node_type` values that actually carry rows, largest first.
--
-- NOT `wv_domains`, which is the obvious-looking choice and the wrong one. It
-- holds nine curated rows — scriptural · theological · philosophical ·
-- historical · sociological · anthropological · ideological · legal · ethical —
-- but nothing much references them: `wv_nodes` has no `domain_id` at all, and
-- only three low-count tables (wv_traditions, wv_moral_axes,
-- wv_civilizational_contributions) point at them. Nine layers with no content
-- behind them would read as nine gaps.
--
-- `node_type` is where the 360 nodes actually live, so it is what can be sensed.
-- If `wv_domains` is later wired to the graph it becomes the better axis and
-- these rows should be revisited.
--
-- Types with no rows are deliberately not declared.
INSERT OR IGNORE INTO cyb_layer
  (id, domain, lane, layer_key, name_ar, name_en, hint, db_name, color_hex, symbol, display_order)
VALUES
  ('wv:concept',   'wv', 'worldview', 'concept',   'المفاهيم',   'Concepts',
   'the ideas themselves', 'km_worldview', '#e8c96a', 'lightbulb', 10),
  ('wv:evidence',  'wv', 'worldview', 'evidence',  'الشواهد',    'Evidence',
   'what backs a claim', 'km_worldview', '#4dd9a8', 'doc.text.magnifyingglass', 20),
  ('wv:claim',     'wv', 'worldview', 'claim',     'الدعاوى',    'Claims',
   'asserted positions', 'km_worldview', '#6bbaff', 'quote.bubble', 30),
  ('wv:counter_claim', 'wv', 'worldview', 'counter_claim', 'الدعاوى المضادة', 'Counter-claims',
   'what contests them', 'km_worldview', '#e0785c', 'arrow.triangle.2.circlepath', 40),
  ('wv:person',    'wv', 'worldview', 'person',    'الأشخاص',    'People',
   'who said it', 'km_worldview', '#c58ad9', 'person', 50),
  ('wv:thinker',   'wv', 'worldview', 'thinker',   'المفكّرون',   'Thinkers',
   'schools and figures', 'km_worldview', '#e8b45c', 'person.bust', 60),
  ('wv:trope',     'wv', 'worldview', 'trope',     'الأنماط',    'Tropes',
   'recurring shapes', 'km_worldview', '#8fa0b8', 'theatermasks', 70),
  ('wv:motif',     'wv', 'worldview', 'motif',     'الزخارف',    'Motifs',
   'recurring images', 'km_worldview', '#6bbaff', 'scribble', 80),
  ('wv:era',       'wv', 'worldview', 'era',       'العصور',     'Eras',
   'when', 'km_worldview', '#4dd9a8', 'clock', 90),
  ('wv:framework', 'wv', 'worldview', 'framework', 'الأطر',      'Frameworks',
   'how it is organised', 'km_worldview', '#e8c96a', 'square.stack.3d.up', 100);
