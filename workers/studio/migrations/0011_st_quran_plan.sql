-- The Qurʾān stream is planned surah by surah and group by group (owner, 2026-10-27: "surah by surah studies and
-- surah group studies can be done and planned"). The stream row says so — /st/streams/:key/plan serves a stream
-- whose meta names a plan — and each surah's strand names its surah in source_ref, so an episode under it (a
-- vocabulary root, a whole-surah introduction) is placed by reference, never by its title.
UPDATE st_streams SET meta_json = json_set(COALESCE(meta_json, '{}'), '$.plan', 'surahs'), updated_at = datetime('now')
 WHERE key = 'quran';
UPDATE st_episodes SET source_ref = 'QR:SURAH:40', updated_at = datetime('now')
 WHERE id IN ('SER:dozawiya:ghafir', 'SER:burhan:ghafir', 'SER:vocab:s40') AND source_ref IS NULL;
UPDATE st_episodes SET source_ref = 'QR:SURAH:44', updated_at = datetime('now')
 WHERE id IN ('SER:quran:44:father-son', 'SER:vocab:s44') AND source_ref IS NULL;
