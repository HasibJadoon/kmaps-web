CREATE TABLE IF NOT EXISTS ar_ling_lexicon_display_block_kind (
  kind_code    TEXT PRIMARY KEY,
  kind_family  TEXT NOT NULL,
  panel_key    TEXT NOT NULL,
  style_key    TEXT NOT NULL,
  name_ar      TEXT NOT NULL,
  name_en      TEXT NOT NULL,
  name_ur      TEXT NOT NULL,
  is_visible   INTEGER NOT NULL DEFAULT 1,
  is_collapsed INTEGER NOT NULL DEFAULT 0,
  sort_weight  INTEGER NOT NULL,
  icon         TEXT,
  status       TEXT NOT NULL DEFAULT 'live',
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ar_ling_lexicon_display_profile (
  source_slug       TEXT PRIMARY KEY,
  composer_key      TEXT NOT NULL,
  is_bilingual      INTEGER NOT NULL DEFAULT 0,
  footnote_mode     TEXT NOT NULL DEFAULT 'none',
  quran_cue_mode    TEXT NOT NULL DEFAULT 'none',
  headword_mode     TEXT NOT NULL DEFAULT 'root_header',
  page_anchor_mode  TEXT NOT NULL DEFAULT 'printed_page',
  script_key        TEXT NOT NULL DEFAULT 'amiri_quran',
  translation_langs TEXT NOT NULL DEFAULT '[]'
                    CHECK (json_valid(translation_langs)),
  display_order     INTEGER NOT NULL,
  status            TEXT NOT NULL DEFAULT 'live',
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ar_ling_lexicon_display_section (
  id           TEXT PRIMARY KEY,
  source_slug  TEXT NOT NULL,
  kind_code    TEXT NOT NULL,
  panel_key    TEXT NOT NULL,
  seq          INTEGER NOT NULL,
  label_ar     TEXT,
  label_en     TEXT,
  label_ur     TEXT,
  is_visible   INTEGER,
  is_collapsed INTEGER,
  block_count  INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (source_slug, kind_code)
);

CREATE TABLE IF NOT EXISTS ar_ling_lexicon_display_rule (
  id          TEXT PRIMARY KEY,
  source_slug TEXT NOT NULL,
  rule_key    TEXT NOT NULL,
  pattern     TEXT,
  flags       TEXT,
  replacement TEXT,
  seq         INTEGER NOT NULL DEFAULT 0,
  note_en     TEXT,
  status      TEXT NOT NULL DEFAULT 'live',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (source_slug, rule_key, seq)
);

CREATE INDEX IF NOT EXISTS ix_lexicon_display_section_slug_seq
  ON ar_ling_lexicon_display_section (source_slug, seq);
CREATE INDEX IF NOT EXISTS ix_lexicon_display_section_kind
  ON ar_ling_lexicon_display_section (kind_code);
CREATE INDEX IF NOT EXISTS ix_lexicon_display_rule_slug_key
  ON ar_ling_lexicon_display_rule (source_slug, rule_key, seq);
CREATE INDEX IF NOT EXISTS ix_lexicon_display_profile_order
  ON ar_ling_lexicon_display_profile (display_order);

INSERT OR REPLACE INTO ar_ling_lexicon_display_block_kind
  (kind_code, kind_family, panel_key, style_key, name_ar, name_en, name_ur,
   is_visible, is_collapsed, sort_weight) VALUES
  ('chapter_header', 'classical', 'head', 'heading', 'باب', 'Chapter heading (bāb)', 'باب کا عنوان', 1, 0, 5),
  ('root_header', 'classical', 'head', 'heading', 'مدخل الجذر', 'Root heading', 'جڑ کا عنوان', 1, 0, 10),
  ('entry_header', 'classical', 'head', 'heading', 'مدخل', 'Entry heading', 'اندراج کا عنوان', 1, 0, 20),
  ('definition', 'classical', 'body', 'prose', 'تعريف', 'Definition', 'تعریف', 1, 0, 30),
  ('quran_quote', 'classical', 'quran', 'mushaf', 'شاهد قرآني', 'Qurʾānic citation', 'قرآنی شاہد', 1, 0, 40),
  ('hadith_quote', 'classical', 'hadith', 'quote', 'شاهد حديثي', 'Ḥadīth citation', 'حدیثی شاہد', 1, 0, 50),
  ('poetry_quote', 'classical', 'poetry', 'verse', 'شاهد شعري', 'Poetic citation (shāhid)', 'شعری شاہد', 1, 0, 60),
  ('sarf_family', 'classical', 'sarf', 'panel', 'الأسرة الصرفية', 'Morphology family (ṣarf)', 'صرفی خاندان', 1, 0, 70),
  ('footnote', 'classical', 'apparatus', 'note', 'حاشية', 'Footnote', 'حاشیہ', 1, 1, 80),
  ('editor_note', 'classical', 'apparatus', 'note', 'تعليق المحقق', 'Editor''s note', 'محقق کا نوٹ', 1, 1, 90),
  ('page_break', 'classical', 'apparatus', 'rule', 'فاصل الصفحة', 'Page break', 'صفحہ وقفہ', 0, 1, 100),
  ('lens_lens', 'synthesis', 'lens', 'panel', 'العدسة', 'Lens', 'عدسہ', 1, 0, 110),
  ('lens_meaning', 'synthesis', 'lens', 'panel', 'المعنى', 'Meaning', 'معنی', 1, 0, 120),
  ('lens_constellation', 'synthesis', 'lens', 'panel', 'الكوكبة', 'Constellation', 'مجموعہ', 1, 0, 130),
  ('lens_figure', 'synthesis', 'lens', 'panel', 'الصورة', 'Figure', 'شکل', 1, 0, 140),
  ('lens_ayah', 'synthesis', 'lens', 'mushaf', 'الآية', 'Āyah', 'آیت', 1, 0, 150),
  ('lens_quran_sense', 'synthesis', 'lens', 'panel', 'المعنى القرآني', 'Qurʾānic sense', 'قرآنی معنی', 1, 0, 160),
  ('lens_xref', 'synthesis', 'lens', 'note', 'إحالة', 'Cross-reference', 'حوالہ', 1, 0, 170),
  ('lens_retention', 'synthesis', 'lens', 'panel', 'التثبيت', 'Retention aid', 'یادداشت', 1, 0, 180),
  ('lens_meta', 'synthesis', 'lens', 'note', 'بيانات', 'Entry metadata', 'میٹا ڈیٹا', 0, 1, 190);

INSERT OR REPLACE INTO ar_ling_lexicon_display_profile
  (source_slug, composer_key, is_bilingual, footnote_mode, quran_cue_mode,
   headword_mode, page_anchor_mode, translation_langs, display_order) VALUES
  ('al_raghib_mufradat', 'classical_prose', 0, 'marker_paren', 'inline_verse', 'root_header', 'printed_page', '[]', 1),
  ('lane_lexicon', 'lane_entry', 1, 'none', 'none', 'entry_header', 'page_break_block', '["en"]', 2),
  ('ketabonline_al_jawhari_al_sihah', 'classical_prose', 0, 'none', 'cue_only_verse_in_braces', 'root_header', 'printed_page', '[]', 4),
  ('ketabonline_ibn_manzur_lisan_al_arab', 'classical_prose', 0, 'inline_brackets', 'inline_verse', 'root_header', 'printed_page', '[]', 5),
  ('ketabonline_al_zabidi_taj_al_arus', 'classical_prose', 0, 'none', 'inline_verse', 'root_header', 'printed_page', '[]', 6),
  ('saaid_maqayis_al_lugha', 'classical_prose', 0, 'none', 'inline_verse', 'root_header', 'printed_page', '[]', 7),
  ('qomra_al_ubab_al_zakhir', 'classical_prose', 0, 'none', 'inline_verse', 'root_header', 'printed_page', '[]', 9),
  ('qomra_al_qamus_al_muhit', 'classical_prose', 0, 'none', 'inline_verse', 'root_header', 'printed_page', '[]', 11),
  ('ketabonline_ibn_duraid_jamharat_al_lugha', 'classical_prose', 0, 'none', 'inline_verse', 'root_header', 'printed_page', '[]', 12),
  ('ketabonline_al_fayyumi_misbah_munir', 'classical_prose', 0, 'footnote_blocks', 'inline_verse', 'root_header', 'printed_page', '[]', 13),
  ('thahabi_al_khalil_kitab_al_ayn', 'classical_prose', 0, 'footnote_blocks', 'inline_verse', 'root_header', 'printed_page', '[]', 14),
  ('sinai_key_terms', 'classical_prose', 1, 'none', 'none', 'root_header', 'none', '["en"]', 21),
  ('kmaps_five_lens', 'synthesis_lens', 1, 'none', 'none', 'root_header', 'none', '["en"]', 30);

INSERT OR REPLACE INTO ar_ling_lexicon_display_section
  (id, source_slug, kind_code, panel_key, seq, block_count) VALUES
  ('LXDS:al_raghib_mufradat:root_header', 'al_raghib_mufradat', 'root_header', 'head', 10, 1534),
  ('LXDS:al_raghib_mufradat:definition', 'al_raghib_mufradat', 'definition', 'body', 30, 28166),
  ('LXDS:al_raghib_mufradat:quran_quote', 'al_raghib_mufradat', 'quran_quote', 'quran', 40, 2478),
  ('LXDS:al_raghib_mufradat:hadith_quote', 'al_raghib_mufradat', 'hadith_quote', 'hadith', 50, 60),
  ('LXDS:al_raghib_mufradat:poetry_quote', 'al_raghib_mufradat', 'poetry_quote', 'poetry', 60, 473),
  ('LXDS:al_raghib_mufradat:sarf_family', 'al_raghib_mufradat', 'sarf_family', 'sarf', 70, 2),
  ('LXDS:al_raghib_mufradat:footnote', 'al_raghib_mufradat', 'footnote', 'apparatus', 80, 2611),
  ('LXDS:al_raghib_mufradat:editor_note', 'al_raghib_mufradat', 'editor_note', 'apparatus', 90, 1),
  ('LXDS:ketabonline_al_fayyumi_misbah_munir:chapter_header', 'ketabonline_al_fayyumi_misbah_munir', 'chapter_header', 'head', 5, 2273),
  ('LXDS:ketabonline_al_fayyumi_misbah_munir:root_header', 'ketabonline_al_fayyumi_misbah_munir', 'root_header', 'head', 10, 2282),
  ('LXDS:ketabonline_al_fayyumi_misbah_munir:definition', 'ketabonline_al_fayyumi_misbah_munir', 'definition', 'body', 30, 11495),
  ('LXDS:ketabonline_al_fayyumi_misbah_munir:hadith_quote', 'ketabonline_al_fayyumi_misbah_munir', 'hadith_quote', 'hadith', 50, 120),
  ('LXDS:ketabonline_al_fayyumi_misbah_munir:sarf_family', 'ketabonline_al_fayyumi_misbah_munir', 'sarf_family', 'sarf', 70, 1),
  ('LXDS:ketabonline_al_fayyumi_misbah_munir:footnote', 'ketabonline_al_fayyumi_misbah_munir', 'footnote', 'apparatus', 80, 345),
  ('LXDS:ketabonline_al_jawhari_al_sihah:root_header', 'ketabonline_al_jawhari_al_sihah', 'root_header', 'head', 10, 5509),
  ('LXDS:ketabonline_al_jawhari_al_sihah:definition', 'ketabonline_al_jawhari_al_sihah', 'definition', 'body', 30, 33947),
  ('LXDS:ketabonline_al_jawhari_al_sihah:quran_quote', 'ketabonline_al_jawhari_al_sihah', 'quran_quote', 'quran', 40, 766),
  ('LXDS:ketabonline_al_jawhari_al_sihah:hadith_quote', 'ketabonline_al_jawhari_al_sihah', 'hadith_quote', 'hadith', 50, 729),
  ('LXDS:ketabonline_al_jawhari_al_sihah:poetry_quote', 'ketabonline_al_jawhari_al_sihah', 'poetry_quote', 'poetry', 60, 4651),
  ('LXDS:ketabonline_al_jawhari_al_sihah:sarf_family', 'ketabonline_al_jawhari_al_sihah', 'sarf_family', 'sarf', 70, 2),
  ('LXDS:ketabonline_al_jawhari_al_sihah:footnote', 'ketabonline_al_jawhari_al_sihah', 'footnote', 'apparatus', 80, 8),
  ('LXDS:ketabonline_al_zabidi_taj_al_arus:root_header', 'ketabonline_al_zabidi_taj_al_arus', 'root_header', 'head', 10, 9088),
  ('LXDS:ketabonline_al_zabidi_taj_al_arus:definition', 'ketabonline_al_zabidi_taj_al_arus', 'definition', 'body', 30, 523578),
  ('LXDS:ketabonline_al_zabidi_taj_al_arus:hadith_quote', 'ketabonline_al_zabidi_taj_al_arus', 'hadith_quote', 'hadith', 50, 1042),
  ('LXDS:ketabonline_al_zabidi_taj_al_arus:poetry_quote', 'ketabonline_al_zabidi_taj_al_arus', 'poetry_quote', 'poetry', 60, 527),
  ('LXDS:ketabonline_al_zabidi_taj_al_arus:sarf_family', 'ketabonline_al_zabidi_taj_al_arus', 'sarf_family', 'sarf', 70, 1),
  ('LXDS:ketabonline_ibn_duraid_jamharat_al_lugha:root_header', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'root_header', 'head', 10, 1242),
  ('LXDS:ketabonline_ibn_duraid_jamharat_al_lugha:definition', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'definition', 'body', 30, 44341),
  ('LXDS:ketabonline_ibn_duraid_jamharat_al_lugha:hadith_quote', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'hadith_quote', 'hadith', 50, 15),
  ('LXDS:ketabonline_ibn_duraid_jamharat_al_lugha:poetry_quote', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'poetry_quote', 'poetry', 60, 112),
  ('LXDS:ketabonline_ibn_duraid_jamharat_al_lugha:sarf_family', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'sarf_family', 'sarf', 70, 14),
  ('LXDS:ketabonline_ibn_duraid_jamharat_al_lugha:editor_note', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'editor_note', 'apparatus', 90, 8),
  ('LXDS:ketabonline_ibn_manzur_lisan_al_arab:root_header', 'ketabonline_ibn_manzur_lisan_al_arab', 'root_header', 'head', 10, 9189),
  ('LXDS:ketabonline_ibn_manzur_lisan_al_arab:definition', 'ketabonline_ibn_manzur_lisan_al_arab', 'definition', 'body', 30, 107246),
  ('LXDS:ketabonline_ibn_manzur_lisan_al_arab:quran_quote', 'ketabonline_ibn_manzur_lisan_al_arab', 'quran_quote', 'quran', 40, 1201),
  ('LXDS:ketabonline_ibn_manzur_lisan_al_arab:hadith_quote', 'ketabonline_ibn_manzur_lisan_al_arab', 'hadith_quote', 'hadith', 50, 7481),
  ('LXDS:ketabonline_ibn_manzur_lisan_al_arab:poetry_quote', 'ketabonline_ibn_manzur_lisan_al_arab', 'poetry_quote', 'poetry', 60, 831),
  ('LXDS:ketabonline_ibn_manzur_lisan_al_arab:sarf_family', 'ketabonline_ibn_manzur_lisan_al_arab', 'sarf_family', 'sarf', 70, 1),
  ('LXDS:ketabonline_ibn_manzur_lisan_al_arab:footnote', 'ketabonline_ibn_manzur_lisan_al_arab', 'footnote', 'apparatus', 80, 8),
  ('LXDS:ketabonline_ibn_manzur_lisan_al_arab:editor_note', 'ketabonline_ibn_manzur_lisan_al_arab', 'editor_note', 'apparatus', 90, 2),
  ('LXDS:kmaps_five_lens:sarf_family', 'kmaps_five_lens', 'sarf_family', 'sarf', 70, 1),
  ('LXDS:kmaps_five_lens:lens_lens', 'kmaps_five_lens', 'lens_lens', 'lens', 110, 5),
  ('LXDS:kmaps_five_lens:lens_meaning', 'kmaps_five_lens', 'lens_meaning', 'lens', 120, 1),
  ('LXDS:kmaps_five_lens:lens_constellation', 'kmaps_five_lens', 'lens_constellation', 'lens', 130, 1),
  ('LXDS:kmaps_five_lens:lens_figure', 'kmaps_five_lens', 'lens_figure', 'lens', 140, 1),
  ('LXDS:kmaps_five_lens:lens_ayah', 'kmaps_five_lens', 'lens_ayah', 'lens', 150, 1),
  ('LXDS:kmaps_five_lens:lens_quran_sense', 'kmaps_five_lens', 'lens_quran_sense', 'lens', 160, 8),
  ('LXDS:kmaps_five_lens:lens_xref', 'kmaps_five_lens', 'lens_xref', 'lens', 170, 1),
  ('LXDS:kmaps_five_lens:lens_retention', 'kmaps_five_lens', 'lens_retention', 'lens', 180, 1),
  ('LXDS:kmaps_five_lens:lens_meta', 'kmaps_five_lens', 'lens_meta', 'lens', 190, 1),
  ('LXDS:lane_lexicon:root_header', 'lane_lexicon', 'root_header', 'head', 10, 5076),
  ('LXDS:lane_lexicon:entry_header', 'lane_lexicon', 'entry_header', 'head', 20, 47851),
  ('LXDS:lane_lexicon:definition', 'lane_lexicon', 'definition', 'body', 30, 47245),
  ('LXDS:lane_lexicon:sarf_family', 'lane_lexicon', 'sarf_family', 'sarf', 70, 1),
  ('LXDS:lane_lexicon:page_break', 'lane_lexicon', 'page_break', 'apparatus', 100, 3008),
  ('LXDS:qomra_al_qamus_al_muhit:root_header', 'qomra_al_qamus_al_muhit', 'root_header', 'head', 10, 9567),
  ('LXDS:qomra_al_qamus_al_muhit:definition', 'qomra_al_qamus_al_muhit', 'definition', 'body', 30, 11298),
  ('LXDS:qomra_al_qamus_al_muhit:quran_quote', 'qomra_al_qamus_al_muhit', 'quran_quote', 'quran', 40, 36),
  ('LXDS:qomra_al_qamus_al_muhit:hadith_quote', 'qomra_al_qamus_al_muhit', 'hadith_quote', 'hadith', 50, 215),
  ('LXDS:qomra_al_qamus_al_muhit:poetry_quote', 'qomra_al_qamus_al_muhit', 'poetry_quote', 'poetry', 60, 51),
  ('LXDS:qomra_al_qamus_al_muhit:sarf_family', 'qomra_al_qamus_al_muhit', 'sarf_family', 'sarf', 70, 1),
  ('LXDS:qomra_al_ubab_al_zakhir:root_header', 'qomra_al_ubab_al_zakhir', 'root_header', 'head', 10, 1527),
  ('LXDS:qomra_al_ubab_al_zakhir:definition', 'qomra_al_ubab_al_zakhir', 'definition', 'body', 30, 956),
  ('LXDS:qomra_al_ubab_al_zakhir:quran_quote', 'qomra_al_ubab_al_zakhir', 'quran_quote', 'quran', 40, 262),
  ('LXDS:qomra_al_ubab_al_zakhir:hadith_quote', 'qomra_al_ubab_al_zakhir', 'hadith_quote', 'hadith', 50, 228),
  ('LXDS:qomra_al_ubab_al_zakhir:poetry_quote', 'qomra_al_ubab_al_zakhir', 'poetry_quote', 'poetry', 60, 712),
  ('LXDS:saaid_maqayis_al_lugha:root_header', 'saaid_maqayis_al_lugha', 'root_header', 'head', 10, 4804),
  ('LXDS:saaid_maqayis_al_lugha:definition', 'saaid_maqayis_al_lugha', 'definition', 'body', 30, 39260),
  ('LXDS:saaid_maqayis_al_lugha:quran_quote', 'saaid_maqayis_al_lugha', 'quran_quote', 'quran', 40, 382),
  ('LXDS:saaid_maqayis_al_lugha:hadith_quote', 'saaid_maqayis_al_lugha', 'hadith_quote', 'hadith', 50, 462),
  ('LXDS:saaid_maqayis_al_lugha:poetry_quote', 'saaid_maqayis_al_lugha', 'poetry_quote', 'poetry', 60, 1810),
  ('LXDS:saaid_maqayis_al_lugha:sarf_family', 'saaid_maqayis_al_lugha', 'sarf_family', 'sarf', 70, 2),
  ('LXDS:saaid_maqayis_al_lugha:footnote', 'saaid_maqayis_al_lugha', 'footnote', 'apparatus', 80, 2),
  ('LXDS:saaid_maqayis_al_lugha:editor_note', 'saaid_maqayis_al_lugha', 'editor_note', 'apparatus', 90, 2),
  ('LXDS:sinai_key_terms:root_header', 'sinai_key_terms', 'root_header', 'head', 10, 1),
  ('LXDS:sinai_key_terms:definition', 'sinai_key_terms', 'definition', 'body', 30, 3),
  ('LXDS:sinai_key_terms:sarf_family', 'sinai_key_terms', 'sarf_family', 'sarf', 70, 1),
  ('LXDS:sinai_key_terms:editor_note', 'sinai_key_terms', 'editor_note', 'apparatus', 90, 1),
  ('LXDS:thahabi_al_khalil_kitab_al_ayn:chapter_header', 'thahabi_al_khalil_kitab_al_ayn', 'chapter_header', 'head', 5, 3273),
  ('LXDS:thahabi_al_khalil_kitab_al_ayn:root_header', 'thahabi_al_khalil_kitab_al_ayn', 'root_header', 'head', 10, 3289),
  ('LXDS:thahabi_al_khalil_kitab_al_ayn:definition', 'thahabi_al_khalil_kitab_al_ayn', 'definition', 'body', 30, 9564),
  ('LXDS:thahabi_al_khalil_kitab_al_ayn:quran_quote', 'thahabi_al_khalil_kitab_al_ayn', 'quran_quote', 'quran', 40, 205),
  ('LXDS:thahabi_al_khalil_kitab_al_ayn:hadith_quote', 'thahabi_al_khalil_kitab_al_ayn', 'hadith_quote', 'hadith', 50, 245),
  ('LXDS:thahabi_al_khalil_kitab_al_ayn:poetry_quote', 'thahabi_al_khalil_kitab_al_ayn', 'poetry_quote', 'poetry', 60, 3825),
  ('LXDS:thahabi_al_khalil_kitab_al_ayn:sarf_family', 'thahabi_al_khalil_kitab_al_ayn', 'sarf_family', 'sarf', 70, 17),
  ('LXDS:thahabi_al_khalil_kitab_al_ayn:footnote', 'thahabi_al_khalil_kitab_al_ayn', 'footnote', 'apparatus', 80, 5755),
  ('LXDS:thahabi_al_khalil_kitab_al_ayn:editor_note', 'thahabi_al_khalil_kitab_al_ayn', 'editor_note', 'apparatus', 90, 18);

INSERT OR REPLACE INTO ar_ling_lexicon_display_rule
  (id, source_slug, rule_key, pattern, flags, seq, note_en) VALUES
  ('LXDR:al_raghib_mufradat:footnote_marker:0', 'al_raghib_mufradat', 'footnote_marker', '«\s*([0-9٠-٩]+)\s*»', 'gu', 0, 'Guillemet marker. Verbatim from lexicon_v2.ts computeSectionBody().'),
  ('LXDR:al_raghib_mufradat:footnote_marker:1', 'al_raghib_mufradat', 'footnote_marker', '\(\s*\(\s*([0-9٠-٩]+)\s*\)\s*\)', 'gu', 1, 'Double-paren marker. Numbering restarts per printed page — resolve against printed_page.');

UPDATE ar_ling_lexicon_blocks SET block_type = 'lens_lens', updated_at = datetime('now')
 WHERE block_type = 'lens';
UPDATE ar_ling_lexicon_blocks SET block_type = 'lens_meaning', updated_at = datetime('now')
 WHERE block_type = 'meaning';
UPDATE ar_ling_lexicon_blocks SET block_type = 'lens_constellation', updated_at = datetime('now')
 WHERE block_type = 'constellation';
UPDATE ar_ling_lexicon_blocks SET block_type = 'lens_figure', updated_at = datetime('now')
 WHERE block_type = 'figure';
UPDATE ar_ling_lexicon_blocks SET block_type = 'lens_ayah', updated_at = datetime('now')
 WHERE block_type = 'ayah';
UPDATE ar_ling_lexicon_blocks SET block_type = 'lens_quran_sense', updated_at = datetime('now')
 WHERE block_type = 'quran_sense';
UPDATE ar_ling_lexicon_blocks SET block_type = 'lens_xref', updated_at = datetime('now')
 WHERE block_type = 'xref';
UPDATE ar_ling_lexicon_blocks SET block_type = 'lens_retention', updated_at = datetime('now')
 WHERE block_type = 'retention';
UPDATE ar_ling_lexicon_blocks SET block_type = 'lens_meta', updated_at = datetime('now')
 WHERE block_type = 'meta';
UPDATE ar_ling_lexicon_blocks SET block_type = 'sarf_family', updated_at = datetime('now')
 WHERE block_type = 'sarf';

INSERT OR REPLACE INTO ar_ling_reg_sub_layer
  (sub_code, band, band_key, band_name_ar, band_name_en, name_ar, name_en, name_ur,
   scope_level, discipline, default_card, display_order, tables_json, produced_by)
VALUES
  ('54-DISP', 50, 'SOURCE', 'المصدر', 'Source', 'عرض المعاجم', 'Lexicon display',
   'معاجم کی نمائش', 'root', 'lugha', 'P', 54,
   json('["ar_ling_lexicon_display_profile","ar_ling_lexicon_display_block_kind","ar_ling_lexicon_display_section","ar_ling_lexicon_display_rule"]'),
   'authored');

INSERT OR REPLACE INTO ar_ling_reg_table_map
  (db, table_name, cluster, layer_code, role, sub_code, role_code, code_full, discipline) VALUES
  ('km_arabic_linguistic', 'ar_ling_lexicon_display_profile', 'display', '010', 'reference', '54-DISP', 'P', 'AL:010-SRC:--:54-DISP:P', 'lugha'),
  ('km_arabic_linguistic', 'ar_ling_lexicon_display_block_kind', 'display', '010', 'reference', '54-DISP', 'P', 'AL:010-SRC:--:54-DISP:P', 'lugha'),
  ('km_arabic_linguistic', 'ar_ling_lexicon_display_section', 'display', '010', 'reference', '54-DISP', 'B', 'AL:010-SRC:--:54-DISP:B', 'lugha'),
  ('km_arabic_linguistic', 'ar_ling_lexicon_display_rule', 'display', '010', 'reference', '54-DISP', 'B', 'AL:010-SRC:--:54-DISP:B', 'lugha');
