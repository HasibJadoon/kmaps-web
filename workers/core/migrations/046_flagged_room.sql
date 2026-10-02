-- Flagged: a room of the Apps Atlas that shows every drill flagged through the feedback sheet (045)
-- — its reason, the learner's note, the drill as it was shown, and what came of it. A reviewer sees
-- everyone's reports and acts on them; a learner sees their own and may withdraw one, which brings a
-- drill they removed back to them.
--
--   scope 'room' / 'door'  the room and its one door
--   scope 'flag_status'    a report's states, in the order the filter shows them
--   scope 'flag_action'    what may be done to a report: extra_json.to (the state it moves to),
--                          .who (reviewer · owner), .from (the states it may be done from),
--                          .note (it takes a note on what was done)
--   scope 'flagged_ui'     the screen's words

INSERT OR REPLACE INTO core_app_label (scope, key, parent, label, label_ar, detail, icon, color, extra_json, sort) VALUES
('room', 'flagged',       NULL,      'Flagged',        'البَلَاغَات', 'Drills reported — the reason, the note, and what came of it', 'flag.fill', '#E9A15D', NULL, 7),
('door', 'flagged.queue', 'flagged', 'Flagged drills', 'البَلَاغَات', 'Every drill flagged, as it was shown, with its outcome',        'flag.fill', '#E9A15D', NULL, 1);

INSERT OR REPLACE INTO core_app_label (scope, key, parent, label, label_ar, detail, icon, color, extra_json, sort) VALUES
('flag_status', 'open',      NULL, 'Open',             'مفتوح',        'Waiting for review',                     'exclamationmark.bubble.fill', '#F2CC8F', NULL, 1),
('flag_status', 'resolved',  NULL, 'Fixed',            'أُصلح',         'The drill was corrected',               'checkmark.seal.fill',         '#81B29A', NULL, 2),
('flag_status', 'removed',   NULL, 'Removed for all',  'حُذف للجميع',   'No one is dealt this drill any more',    'trash.fill',                  '#E07A5F', NULL, 3),
('flag_status', 'dismissed', NULL, 'Dismissed',        'رُفض',          'Looked at; the drill stands as it is',   'xmark.circle.fill',           '#9A948A', NULL, 4),
('flag_status', 'withdrawn', NULL, 'Withdrawn',        'سُحب',          'Taken back by the one who sent it',      'arrow.uturn.backward.circle.fill', '#5DA9E9', NULL, 5);

INSERT OR REPLACE INTO core_app_label (scope, key, parent, label, label_ar, detail, icon, color, extra_json, sort) VALUES
('flag_action', 'resolve',  NULL, 'Mark fixed',          'تمّ الإصلاح',     NULL, 'checkmark.seal.fill',  '#81B29A', '{"to":"resolved","who":"reviewer","from":["open"],"note":true}', 1),
('flag_action', 'remove',   NULL, 'Remove for everyone', 'احذفه للجميع',    NULL, 'trash.fill',           '#E07A5F', '{"to":"removed","who":"reviewer","from":["open"],"note":true}', 2),
('flag_action', 'dismiss',  NULL, 'Dismiss',             'ارفض',            NULL, 'xmark.circle.fill',    '#9A948A', '{"to":"dismissed","who":"reviewer","from":["open"],"note":true}', 3),
('flag_action', 'reopen',   NULL, 'Reopen',              'أعد فتحه',        NULL, 'arrow.counterclockwise', '#F2CC8F', '{"to":"open","who":"reviewer","from":["resolved","removed","dismissed"]}', 4),
('flag_action', 'withdraw', NULL, 'Withdraw',            'اسحب البلاغ',     'Take the report back — a drill you removed comes back to you',
                                                                                   'arrow.uturn.backward.circle.fill', '#5DA9E9', '{"to":"withdrawn","who":"owner","from":["open"]}', 5);

INSERT OR REPLACE INTO core_app_label (scope, key, parent, label, label_ar, detail, icon, color, extra_json, sort) VALUES
('flagged_ui', 'all',        NULL, 'All',                       'الكلّ',               NULL, 'tray.full.fill', NULL, NULL, 1),
('flagged_ui', 'reviewer',   NULL, 'Everyone''s reports — you are reviewing', 'بلاغات الجميع — أنت المراجِع', NULL, 'person.badge.shield.checkmark.fill', '#E9A15D', NULL, 2),
('flagged_ui', 'mine',       NULL, 'The drills you flagged',    'التمارين التي أبلغتَ عنها', NULL, 'person.fill', '#E9A15D', NULL, 3),
('flagged_ui', 'empty',      NULL, 'Nothing here — use the flag on any drill to report it', 'لا شيء هنا — استعمل العلَم على أيّ تمرين للإبلاغ عنه', NULL, 'flag', NULL, NULL, 4),
('flagged_ui', 'by',         NULL, 'Flagged by {name}',         'أبلغ عنه {name}',      NULL, 'person.crop.circle', NULL, NULL, 5),
('flagged_ui', 'reports',    NULL, '{n} reports on this drill', '{n} بلاغات على هذا التمرين', NULL, 'flag.2.crossed.fill', NULL, NULL, 6),
('flagged_ui', 'note',       NULL, 'Note',                      'الملاحظة',            NULL, 'text.bubble.fill', NULL, NULL, 7),
('flagged_ui', 'shown',      NULL, 'As it was shown',           'كما عُرض',            NULL, 'rectangle.on.rectangle', NULL, NULL, 8),
('flagged_ui', 'answer',     NULL, 'Answer',                    'الجواب',              NULL, 'checkmark.circle.fill', '#81B29A', NULL, 9),
('flagged_ui', 'outcome',    NULL, 'Outcome',                   'النتيجة',             NULL, 'checkmark.bubble.fill', NULL, NULL, 10),
('flagged_ui', 'outcome_note', NULL, 'What was done (optional)', 'ما الذي تمّ (اختياري)', NULL, 'square.and.pencil', NULL, NULL, 11),
('flagged_ui', 'failed',     NULL, 'Could not save — try again', 'تعذّر الحفظ — حاول مرة أخرى', NULL, 'wifi.slash', NULL, NULL, 12);
