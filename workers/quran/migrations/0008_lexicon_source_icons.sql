UPDATE qr_morph_display_sources SET icon = 'git-fork',    updated_at = datetime('now') WHERE id = 'MDS:maqayis';
UPDATE qr_morph_display_sources SET icon = 'book-open',   updated_at = datetime('now') WHERE id = 'MDS:mufradat';
UPDATE qr_morph_display_sources SET icon = 'library',     updated_at = datetime('now') WHERE id = 'MDS:lane';
UPDATE qr_morph_display_sources SET icon = 'book-marked', updated_at = datetime('now') WHERE id = 'MDS:sinai';
UPDATE qr_morph_display_sources SET icon = 'eye',         updated_at = datetime('now') WHERE id = 'MDS:ayn';
UPDATE qr_morph_display_sources SET icon = 'badge-check', updated_at = datetime('now') WHERE id = 'MDS:sihah';
UPDATE qr_morph_display_sources SET icon = 'lamp',        updated_at = datetime('now') WHERE id = 'MDS:misbah';
UPDATE qr_morph_display_sources SET icon = 'waves',       updated_at = datetime('now') WHERE id = 'MDS:qamus';
UPDATE qr_morph_display_sources SET icon = 'languages',   updated_at = datetime('now') WHERE id = 'MDS:lisan';
UPDATE qr_morph_display_sources SET icon = 'crown',       updated_at = datetime('now') WHERE id = 'MDS:taj';

INSERT INTO qr_morph_display_sources
  (id, source_slug, kind, title_ar, title_en, author_name_ar, author_name_en,
   death_year_hijri, register, badge_color, badge_glyph, display_order, is_visible, icon,
   title_ur, author_name_ur, created_at, updated_at)
VALUES
  ('MDS:ubab', 'qomra_al_ubab_al_zakhir', 'lexicon', 'العُباب الزاخر', 'al-ʿUbāb al-Zākhir',
   'الصاغاني', 'al-Ṣāghānī', 650, 'linguistic', '#6db3e6', 'ع', 20, 1, 'droplets',
   NULL, 'صغانی', datetime('now'), datetime('now')),
  ('MDS:jamhara', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'lexicon', 'جمهرة اللغة', 'Jamharat al-Lugha',
   'ابن دريد', 'Ibn Durayd', 321, 'linguistic', '#6db3e6', 'ج', 21, 1, 'boxes',
   NULL, 'ابن درید', datetime('now'), datetime('now'))
ON CONFLICT(id) DO UPDATE SET
  icon = excluded.icon, display_order = excluded.display_order,
  is_visible = excluded.is_visible, updated_at = datetime('now');
