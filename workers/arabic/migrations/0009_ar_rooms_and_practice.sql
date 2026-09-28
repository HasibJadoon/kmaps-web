-- The Arabic home, as rooms (like the Worldview Atlas), and the practice pool.
--
-- ar_room — each room of the Arabic home: its label, colour, icon, layout, and
-- the rules that put a readable work in it. The worker applies the rules in
-- order — a work's series first, then its shape, then its genre — and the first
-- room that claims it keeps it; what nothing claims falls to the room marked
-- fallback. Labels and rules live here, not in the app.
--
-- ar_practice_pool — the lines drills are cut from: real recorded speech from
-- the series, podcasts, stories and books, 4–14 words, every word timed. One
-- level band per row (basic A1–A2, middle B1–B2, advanced C1+), rebuilt by
-- re-running the INSERT when the recordings change.

CREATE TABLE IF NOT EXISTS ar_room (
  id          TEXT PRIMARY KEY,
  title_en    TEXT NOT NULL,
  title_ar    TEXT NOT NULL,
  tagline     TEXT,
  color       TEXT NOT NULL,
  icon        TEXT NOT NULL,          -- an SF Symbol name
  layout      TEXT NOT NULL,          -- collections | shelf | centuries | daily
  sort_order  INTEGER NOT NULL,
  rules_json  TEXT NOT NULL DEFAULT '{}',   -- {"series":[…], "shapes":[…], "genres":[…], "fallback":true}
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR REPLACE INTO ar_room (id, title_en, title_ar, tagline, color, icon, layout, sort_order, rules_json) VALUES
 ('watch', 'Watch', 'شاهِد', 'Drama and documentary — Arabic as it is spoken on screen', '#E07A5F', 'film.stack', 'collections', 1,
  '{"series":["عمر","الإمام أحمد بن حنبل","الإمام الغزالي","هارون الرشيد","فتح الأندلس","سمرقند","معاوية والحسنان","العلماء المسلمون","رسالة الإمام — مشاهد","ممالك النار — مشاهد"]}'),
 ('stories', 'Stories', 'حِكايات', 'Qurʾān stories, tales and fables, told simply', '#81B29A', 'book.closed', 'collections', 2,
  '{"series":["قصص العجائب في القرآن","قصص النساء في القرآن","قصص الإنسان في القرآن","قصص الحيوان في القرآن","كان يا مكان","Arabic Short Stories for Language Learners","نوادر جحا","قصص","قصص مبسّطة للقراءة"],"shapes":["nights"]}'),
 ('voices', 'Podcasts & News', 'أصوات وأخبار', 'Podcasts, clips, vlogs, opinion and interviews — the language of now', '#5DA9E9', 'waveform', 'collections', 3,
  '{"series":["بودكاست","مقاطع قصيرة","V-logs","Convert Stories","تدوينات","آراء","تاريخ","يوميات","آخر الزمان"]}'),
 ('poetry', 'Songs & Poetry', 'أناشيد وشعر', 'Nashīds, songs and the dīwāns of the poets', '#B388EB', 'music.quarternote.3', 'shelf', 4,
  '{"series":["شعر","أناشيد وأغانٍ"],"shapes":["diwan"]}'),
 ('library', 'Classical Library', 'التراث', 'Prose, maqāmāt and proverbs, century by century', '#D8B657', 'books.vertical', 'centuries', 5,
  '{"shapes":["prose","maqama","amthal"],"fallback":true}'),
 ('courses', 'Courses', 'دروس', 'Guided readers and conversation, step by step', '#F2CC8F', 'graduationcap', 'shelf', 6,
  '{"series":["EMSA","Asking Questions kids","سورة السجدة"],"shapes":["dialogue"]}'),
 ('everyday', 'Everyday', 'فصحى الحياة', 'Dialogues, sentences and words for daily life', '#4FB3A9', 'sun.max', 'daily', 7, '{}');

CREATE TABLE IF NOT EXISTS ar_practice_pool (
  id          TEXT PRIMARY KEY,       -- the segment's id
  band        TEXT NOT NULL,          -- basic | middle | advanced
  level       TEXT,                   -- the work's CEFR level
  audio_id    TEXT NOT NULL,
  work_id     TEXT,
  work_title  TEXT,
  object_key  TEXT NOT NULL,
  start_sec   REAL NOT NULL,
  end_sec     REAL NOT NULL,
  text_ar     TEXT NOT NULL,
  words_json  TEXT NOT NULL,          -- [[start,end], …] one per word of text_ar
  word_count  INTEGER NOT NULL,
  rnd         INTEGER NOT NULL        -- a random key, for cheap random draws
);
CREATE INDEX IF NOT EXISTS idx_ar_pp_band ON ar_practice_pool (band, rnd);

DELETE FROM ar_practice_pool;
INSERT INTO ar_practice_pool (id, band, level, audio_id, work_id, work_title, object_key, start_sec, end_sec, text_ar, words_json, word_count, rnd)
SELECT id, band, level, audio_id, work_id, work_title, object_key, start_sec, end_sec, text_ar, words_json, word_count, abs(random()) % 1000000000
  FROM (
    SELECT s.id, CASE WHEN r.level IN ('A1','A2') THEN 'basic' WHEN r.level IN ('B1','B2') THEN 'middle' ELSE 'advanced' END AS band,
           r.level, s.audio_id, r.id AS work_id, COALESCE(r.title_ar, r.title_en) AS work_title, a.object_key,
           s.start_sec, s.end_sec, trim(s.text_ar) AS text_ar, json_extract(s.meta_json, '$.w') AS words_json,
           json_array_length(json_extract(s.meta_json, '$.w')) AS word_count,
           row_number() OVER (PARTITION BY CASE WHEN r.level IN ('A1','A2') THEN 'basic' WHEN r.level IN ('B1','B2') THEN 'middle' ELSE 'advanced' END
                              ORDER BY random()) AS pick
      FROM ar_acq_audio_segment s
      JOIN ar_acq_audio a ON a.id = s.audio_id AND a.status = 'live' AND a.object_key NOT LIKE 'youtube:%'
      JOIN ar_acquisition_ref r ON r.id = a.acq_ref_id AND r.level IS NOT NULL
     WHERE json_valid(s.meta_json)
       AND json_array_length(json_extract(s.meta_json, '$.w')) BETWEEN 4 AND 14
       AND json_array_length(json_extract(s.meta_json, '$.w'))
           = length(trim(s.text_ar)) - length(replace(trim(s.text_ar), ' ', '')) + 1
       AND s.end_sec - s.start_sec BETWEEN 1.5 AND 12
  )
 WHERE pick <= 4000;

-- the new tables move the content version like the rest (kmaps_cache_version.sql)
CREATE TRIGGER IF NOT EXISTS trg_kcv_ar_room_i AFTER INSERT ON ar_room BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;
CREATE TRIGGER IF NOT EXISTS trg_kcv_ar_room_u AFTER UPDATE ON ar_room BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;
CREATE TRIGGER IF NOT EXISTS trg_kcv_ar_room_d AFTER DELETE ON ar_room BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;
UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content';
