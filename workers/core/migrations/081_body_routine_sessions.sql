-- Each routine move timed (owner, 2026-10-21: "Each exercise select start and end and log time spent") — the adult
-- twenty and the kids' set alike (routes/body-routine.ts). A session is a move started and ended: started_at, then
-- ended_at and its seconds (now − start, kept within 5 s and 60 min). ended_at NULL: still running — one at a time,
-- starting another drops it, and it survives the app closing (the start is the server's). Ending marks the move done;
-- a done move can be timed again (another set) and its time adds up. The day's routine exercise entry counts the
-- timed seconds of the moves done, and an estimate only for a move ticked without a timer.

CREATE TABLE IF NOT EXISTS core_body_routine_session (
  id         TEXT PRIMARY KEY,
  owner_ref  TEXT NOT NULL,
  on_date    TEXT NOT NULL,                  -- the reader's day it was started on
  item_key   TEXT NOT NULL,                  -- core_body_routine_item.key
  started_at TEXT NOT NULL,                  -- ISO, the server's clock
  ended_at   TEXT,                           -- NULL while running
  seconds    INTEGER                         -- set when ended
);
CREATE INDEX IF NOT EXISTS idx_core_body_routine_session_owner ON core_body_routine_session (owner_ref, on_date);

-- the routine's words: the card, the session sheet, the day's time. {min} {reps} {unit} are filled by the worker or app
INSERT OR REPLACE INTO core_app_label (scope, key, parent, label, label_ar, detail, icon, color, extra_json, sort) VALUES
('body_routine_ui', 'start',         NULL, 'Start',               NULL, 'The timer keeps going if you close this', 'timer',                 NULL, '{"tone":"sage"}', 1),
('body_routine_ui', 'end',           NULL, 'End — log it',        NULL, NULL,                                       'stop.fill',             NULL, '{"tone":"rust"}', 2),
('body_routine_ui', 'cancel',        NULL, 'Cancel — not logged', NULL, NULL,                                       'xmark',                 NULL, '{"tone":"muted"}', 3),
('body_routine_ui', 'quick',         NULL, 'Done — no timer',     NULL, NULL,                                       'checkmark',             NULL, '{"tone":"muted"}', 4),
('body_routine_ui', 'again',         NULL, 'Time another set',    NULL, 'The time adds up',                         'arrow.clockwise',       NULL, '{"tone":"sage"}', 5),
('body_routine_ui', 'undo',          NULL, 'Not done after all',  NULL, 'Its time today is taken off',              'arrow.uturn.backward',  NULL, '{"tone":"muted"}', 6),
('body_routine_ui', 'running',       NULL, 'Timing',              NULL, NULL,                                       'timer',                 NULL, '{"tone":"teal"}', 7),
('body_routine_ui', 'done',          NULL, 'Done',                NULL, NULL,                                       'checkmark.circle.fill', NULL, '{"tone":"sage"}', 8),
('body_routine_ui', 'target',        NULL, 'Aim: {reps} {unit}',  NULL, NULL,                                       'target',                NULL, '{"tone":"sand"}', 9),
('body_routine_ui', 'spent',         NULL, 'Today',               NULL, NULL,                                       'clock.fill',            NULL, '{"tone":"sage"}', 10),
('body_routine_ui', 'seconds_today', NULL, '{min} min today',     NULL, 'Timed moves',                              'timer',                 NULL, '{"tone":"teal"}', 11),
-- a child's words, laid over these
('body_routine_ui_child', 'end',     NULL, 'Finished!',           NULL, NULL,                                       'flag.checkered',        NULL, '{"tone":"rust"}', 2),
('body_routine_ui_child', 'cancel',  NULL, 'Cancel',              NULL, NULL,                                       'xmark',                 NULL, '{"tone":"muted"}', 3),
('body_routine_ui_child', 'quick',   NULL, 'I did it — no timer', NULL, NULL,                                       'checkmark',             NULL, '{"tone":"muted"}', 4),
('body_routine_ui_child', 'again',   NULL, 'Do it again',         NULL, 'Your time adds up',                        'arrow.clockwise',       NULL, '{"tone":"sage"}', 5),
('body_routine_ui_child', 'running', NULL, 'Go, go, go!',         NULL, NULL,                                       'timer',                 NULL, '{"tone":"teal"}', 7);
