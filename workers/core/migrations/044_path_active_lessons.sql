-- The Path room opens with the learner's active lessons: the classes started and not yet studied,
-- each continued exactly where it was left. Which room shows them is data (extra_json.active);
-- so are its words.
UPDATE core_app_label SET extra_json = '{"active":true}' WHERE scope = 'room' AND key = 'path';

INSERT OR REPLACE INTO core_app_label (scope, key, parent, label, label_ar, detail, icon, color, extra_json, sort) VALUES
('today', 'active',      NULL, 'Active lessons',                   'دروس جارية',                 NULL, 'graduationcap.fill', NULL, NULL, 9),
('today', 'active_line', NULL, '{days} days · {open} to perfect',  '{days} أيام · {open} للإتقان', NULL, NULL, NULL, NULL, 10),
('today', 'no_active',   NULL, 'No lesson under way — open a sūra and study its first passage',
                               'لا درس جارٍ — افتح سورة وادرس أول مقطع فيها', NULL, 'book.closed', NULL, NULL, 11);
