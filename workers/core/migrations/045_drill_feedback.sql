-- Feedback on any drill: a learner flags a drill and says why — it needs review, its data is
-- wrong, its answer is wrong, it is unclear, its audio is broken — or removes it for themselves.
-- Each report keeps the drill as it was shown, so a reviewer sees exactly what the learner saw.
-- A reason that hides (extra_json.hides) takes the drill out of that learner's drilling and
-- suspends its review card; a reviewer who marks a report 'removed' takes the drill out for all.
--
--   scope 'feedback'     the reasons, in order
--   scope 'feedback_ui'  the sheet's words

CREATE TABLE IF NOT EXISTS core_drill_feedback (
  id              TEXT PRIMARY KEY,                -- DFB:<ulid>
  user_ref        TEXT NOT NULL,
  drill_id        TEXT NOT NULL,                   -- the drill's id as the worker dealt it
  module          TEXT,                            -- QR · AR …
  kind            TEXT,                            -- the drill's kind (its skill)
  resource_ref    TEXT,                            -- the card it files, when it has one
  reason          TEXT NOT NULL,                   -- a 'feedback' label key
  note            TEXT,
  drill_json      TEXT,                            -- the drill as it was shown
  status          TEXT NOT NULL DEFAULT 'open',    -- open · resolved · dismissed · removed
  resolved_by     TEXT,
  resolution_note TEXT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  resolved_at     TEXT
);
CREATE INDEX IF NOT EXISTS idx_core_drill_feedback_status ON core_drill_feedback(status, created_at);
CREATE INDEX IF NOT EXISTS idx_core_drill_feedback_user ON core_drill_feedback(user_ref, drill_id);

INSERT OR REPLACE INTO core_app_label (scope, key, parent, label, label_ar, detail, icon, color, extra_json, sort) VALUES
('feedback', 'needs_review', NULL, 'Needs review',        'تحتاج مراجعة',   'Something here is not right; have it looked at', 'eye.fill',                    '#F2CC8F', NULL, 1),
('feedback', 'data_issue',   NULL, 'Data issue',          'خطأ في البيانات', 'A wrong word, translation, term, title or text',  'exclamationmark.triangle.fill', '#E9A15D', NULL, 2),
('feedback', 'wrong_answer', NULL, 'The answer is wrong', 'الجواب خطأ',     'The answer marked right is not right',            'xmark.circle.fill',           '#E07A5F', NULL, 3),
('feedback', 'unclear',      NULL, 'Unclear question',    'سؤال غير واضح',  'It can be read more than one way',                'questionmark.circle.fill',    '#9C89B8', NULL, 4),
('feedback', 'audio',        NULL, 'Audio problem',       'مشكلة في الصوت', 'The recording is missing, cut, or does not match', 'speaker.slash.fill',          '#5DA9E9', NULL, 5),
('feedback', 'remove',       NULL, 'Remove this drill',   'احذف هذا التمرين', 'Do not show it to me again',                     'trash.fill',                  '#E07A5F', '{"hides":true}', 6);

INSERT OR REPLACE INTO core_app_label (scope, key, parent, label, label_ar, detail, icon, color, extra_json, sort) VALUES
('feedback_ui', 'title',   NULL, 'Feedback on this drill', 'ملاحظة على هذا التمرين', 'Say what is wrong; it goes to the review queue', 'flag.fill', '#E9A15D', NULL, 1),
('feedback_ui', 'note',    NULL, 'Add a note (optional)',   'أضف ملاحظة (اختياري)',   NULL, 'square.and.pencil', NULL, NULL, 2),
('feedback_ui', 'send',    NULL, 'Send',                    'أرسل',                   NULL, 'paperplane.fill',   NULL, NULL, 3),
('feedback_ui', 'thanks',  NULL, 'Thank you — it is in the review queue', 'شكرًا — أُضيف إلى قائمة المراجعة', NULL, 'checkmark.circle.fill', NULL, NULL, 4),
('feedback_ui', 'removed', NULL, 'Removed — you will not see it again',  'حُذف — لن تراه مرة أخرى',   NULL, 'trash',                 NULL, NULL, 5),
('feedback_ui', 'failed',  NULL, 'Could not send — try again',            'تعذّر الإرسال — حاول مرة أخرى', NULL, 'wifi.slash',            NULL, NULL, 6);
