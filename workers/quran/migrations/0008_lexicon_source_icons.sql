-- 030_lexicon_source_icons.sql
-- The root view's "Classical lexicons" strip is driven by qr_morph_display_sources
-- (kind='lexicon' AND is_visible=1 ORDER BY display_order), not by a list in code.
-- Two things were missing before that could work:
--   1) icon was NULL on every row, so the lens carried no lucide name;
--   2) al-ʿUbāb and Jamharat al-Lugha exist in ar_ling_lexicon_root_entries but had
--      no registry row, so they could never surface.
--
-- Icon names must exist in the pool registered by RootComponent; the UI clamps an
-- unknown name to a fallback rather than throwing mid-render.

-- 1) Icons for the lexicons already registered.
UPDATE qr_morph_display_sources SET icon = 'git-fork',    updated_at = datetime('now') WHERE id = 'MDS:maqayis';   -- أصل واحد — the branching root
UPDATE qr_morph_display_sources SET icon = 'book-open',   updated_at = datetime('now') WHERE id = 'MDS:mufradat';
UPDATE qr_morph_display_sources SET icon = 'library',     updated_at = datetime('now') WHERE id = 'MDS:lane';
UPDATE qr_morph_display_sources SET icon = 'book-marked', updated_at = datetime('now') WHERE id = 'MDS:sinai';
UPDATE qr_morph_display_sources SET icon = 'eye',         updated_at = datetime('now') WHERE id = 'MDS:ayn';      -- كتاب العين
UPDATE qr_morph_display_sources SET icon = 'badge-check', updated_at = datetime('now') WHERE id = 'MDS:sihah';    -- الصِّحاح — the sound/authentic
UPDATE qr_morph_display_sources SET icon = 'lamp',        updated_at = datetime('now') WHERE id = 'MDS:misbah';   -- المصباح المنير — the lamp
UPDATE qr_morph_display_sources SET icon = 'waves',       updated_at = datetime('now') WHERE id = 'MDS:qamus';    -- القاموس المحيط — the encompassing ocean
UPDATE qr_morph_display_sources SET icon = 'languages',   updated_at = datetime('now') WHERE id = 'MDS:lisan';    -- لسان العرب — the tongue
UPDATE qr_morph_display_sources SET icon = 'crown',       updated_at = datetime('now') WHERE id = 'MDS:taj';      -- تاج العروس — the crown

-- 2) The two lexicons that have entries in AL but no display registry row.
--    display_order continues the lexicon band (maqayis=10 … taj=19).
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
