-- The streams as the owner draws them (2026-10-21): "Arabic is related to reading books, reaction videos on scenes,
-- drill, grammar, balāgha, الصرف — acquiring Classical Arabic in studio"; "Qurʾānic related stuff stays in Qurʾān".
--  · The Qurʾānic Vocabulary shelf (SER:vocab, its two sūras and their 122 root episodes) moves to the Qurʾān stream.
--  · The Arabic stream's words: acquiring Classical Arabic; its ink words the disciplines.
--  · Its series in the owner's order, in both channels: Reading, Reactions, then four new — Drills, Grammar
--    (النحو), Balāgha (البلاغة), Ṣarf (الصرف); day-to-day speech stays, last.
-- Undo: ecosystem back to 'arabic' for the SER:vocab tree; DELETE the eight new SER:*:arabic:{drills,nahw,balagha,sarf}.

UPDATE st_episodes SET ecosystem = 'quran', updated_at = datetime('now')
 WHERE id IN ('SER:vocab', 'SER:vocab:s44', 'SER:vocab:s40')
    OR series_ref IN ('SER:vocab', 'SER:vocab:s44', 'SER:vocab:s40');

UPDATE st_streams
   SET tagline = 'Acquiring Classical Arabic — books, scene reactions, drills, grammar, balāgha and ṣarf',
       meta_json = '{"letters":"ابتثجحخدذرزسشصضطظعغفقكلمنهوي","words":["قرأ","نحو","صرف","بلاغة"]}',
       updated_at = datetime('now')
 WHERE key = 'arabic';

-- the order: reading, reactions, drills, grammar, balāgha, ṣarf, then day-to-day speech
UPDATE st_episodes SET session_no = 1 WHERE id IN ('SER:cyb:arabic:reading', 'SER:doz:arabic:reading');
UPDATE st_episodes SET session_no = 2 WHERE id IN ('SER:cyb:arabic:reactions', 'SER:doz:arabic:reactions');
UPDATE st_episodes SET session_no = 7 WHERE id IN ('SER:cyb:arabic:daily', 'SER:doz:arabic:daily');

DELETE FROM st_episodes WHERE id IN ('SER:cyb:arabic:drills', 'SER:cyb:arabic:nahw', 'SER:cyb:arabic:balagha', 'SER:cyb:arabic:sarf',
                                     'SER:doz:arabic:drills', 'SER:doz:arabic:nahw', 'SER:doz:arabic:balagha', 'SER:doz:arabic:sarf');
INSERT INTO st_episodes (id, core_user_ref, core_ws_ref, title, format, status, ecosystem, series_ref, session_no, output_kind, created_at, updated_at) VALUES
 ('SER:cyb:arabic:drills',  'CORE:01KZDFQ12RKB1A6H6D6CT1EVA5', 'WS:CYBERNETICS', 'التمارين — Drills',   'series', 'planned', 'arabic', 'SER:cyb:arabic', 3, 'mixed', datetime('now'), datetime('now')),
 ('SER:cyb:arabic:nahw',    'CORE:01KZDFQ12RKB1A6H6D6CT1EVA5', 'WS:CYBERNETICS', 'النحو — Grammar',     'series', 'planned', 'arabic', 'SER:cyb:arabic', 4, 'mixed', datetime('now'), datetime('now')),
 ('SER:cyb:arabic:balagha', 'CORE:01KZDFQ12RKB1A6H6D6CT1EVA5', 'WS:CYBERNETICS', 'البلاغة — Balāgha',   'series', 'planned', 'arabic', 'SER:cyb:arabic', 5, 'mixed', datetime('now'), datetime('now')),
 ('SER:cyb:arabic:sarf',    'CORE:01KZDFQ12RKB1A6H6D6CT1EVA5', 'WS:CYBERNETICS', 'الصرف — Ṣarf',        'series', 'planned', 'arabic', 'SER:cyb:arabic', 6, 'mixed', datetime('now'), datetime('now')),
 ('SER:doz:arabic:drills',  'CORE:01KZDFQ12RKB1A6H6D6CT1EVA5', 'WS:DOZAWIYA',    'التمارين — Drills',   'series', 'planned', 'arabic', 'SER:doz:arabic', 3, 'mixed', datetime('now'), datetime('now')),
 ('SER:doz:arabic:nahw',    'CORE:01KZDFQ12RKB1A6H6D6CT1EVA5', 'WS:DOZAWIYA',    'النحو — Grammar',     'series', 'planned', 'arabic', 'SER:doz:arabic', 4, 'mixed', datetime('now'), datetime('now')),
 ('SER:doz:arabic:balagha', 'CORE:01KZDFQ12RKB1A6H6D6CT1EVA5', 'WS:DOZAWIYA',    'البلاغة — Balāgha',   'series', 'planned', 'arabic', 'SER:doz:arabic', 5, 'mixed', datetime('now'), datetime('now')),
 ('SER:doz:arabic:sarf',    'CORE:01KZDFQ12RKB1A6H6D6CT1EVA5', 'WS:DOZAWIYA',    'الصرف — Ṣarf',        'series', 'planned', 'arabic', 'SER:doz:arabic', 6, 'mixed', datetime('now'), datetime('now'));
