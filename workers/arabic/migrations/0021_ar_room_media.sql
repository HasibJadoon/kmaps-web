-- The Arabic home by medium: Series (drama and the animated Qurʾān stories), Documentaries,
-- Podcasts & News, Stories & Novels, Songs & Poetry, the Classical Library, Everyday.
-- Courses (three small items, nothing to grow a room from) is dropped; its works fall to
-- the library's fallback like any unplaced work.
DELETE FROM ar_room WHERE id IN ('courses', 'watch');
INSERT OR REPLACE INTO ar_room (id, title_en, title_ar, tagline, color, icon, layout, sort_order, rules_json, updated_at) VALUES
 ('series', 'Series', 'مُسَلْسَلَات', 'Drama and the animated Qurʾān stories — episode by episode, scene by scene', '#E07A5F', 'film.stack', 'collections', 1,
  '{"series":["عمر","الإمام أحمد بن حنبل","الإمام الغزالي","هارون الرشيد","فتح الأندلس","سمرقند","معاوية والحسنان","رسالة الإمام — مشاهد","ممالك النار — مشاهد","قصص العجائب في القرآن","قصص النساء في القرآن","قصص الإنسان في القرآن","قصص الحيوان في القرآن"]}', datetime('now')),
 ('documentary', 'Documentaries', 'وَثَائِقِيَّات', 'Arabic as it explains — history, science, lives', '#2A9D8F', 'globe.europe.africa', 'collections', 2,
  '{"series":["العلماء المسلمون"]}', datetime('now'));
UPDATE ar_room SET title_en = 'Stories & Novels', title_ar = 'قِصَصٌ وَرِوَايَات', sort_order = 4, icon = 'book',
  tagline = 'Tales, readers and the Nights — told and read aloud',
  rules_json = '{"series":["كان يا مكان","Arabic Short Stories for Language Learners","نوادر جحا","قصص","قصص مبسّطة للقراءة"],"shapes":["nights"]}',
  updated_at = datetime('now') WHERE id = 'stories';
UPDATE ar_room SET title_en = 'Podcasts & News', sort_order = 3, icon = 'mic', tagline = 'Talk, vlogs, opinion and the news — spoken Arabic today',
  rules_json = '{"series":["بودكاست","مقاطع قصيرة","V-logs","Convert Stories","تدوينات","آراء","تاريخ","يوميات","آخر الزمان","أخبار"]}',
  updated_at = datetime('now') WHERE id = 'voices';
UPDATE ar_room SET sort_order = 5, icon = 'music.note' WHERE id = 'poetry';
UPDATE ar_room SET sort_order = 6, icon = 'books.vertical' WHERE id = 'library';
UPDATE ar_room SET sort_order = 7 WHERE id = 'everyday';
