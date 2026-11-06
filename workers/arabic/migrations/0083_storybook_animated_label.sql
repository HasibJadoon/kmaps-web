-- 0083_storybook_animated_label.sql
--
-- A filmed story stands on the story-book shelf twice: the written book (read as pages) and its animated version
-- (played as its film, GET /ar/text/storybooks/<id>~animated). This is the animated card's chip. Idempotent.

INSERT OR REPLACE INTO ar_practice_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
 ('storybook', 'animated', 'Animated', 'مُتَحَرِّكَة', 'The story as a film: moving pictures, the telling and its sounds', 'play.rectangle.fill', '#E8C96A', NULL, NULL, 29);
