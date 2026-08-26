-- 0108 — Map every registry term to the book chapters that treat it, via the TOC.
--
-- The link is TERM -> TOC NODE, not term -> chunk. `ar_ling_gram_bab` already holds
-- 5,422 chapter headings across 25 works, and every one of them carries a page number.
-- A classical book names its subject in the heading — "النسب إلى فعيلة ومفعولة",
-- "شواذ التصغير", "باب الإدغام" — so one join over 5,422 headings answers "where is
-- this term settled?" for all 399 terms at once. The 21,319 chunks underneath stay
-- reachable through the bāb, which is how a reader opens a book anyway.
--
-- Matching is on diacritic-stripped Arabic with a leading باب/فصل/ذكر/القول في removed
-- from the heading, and a leading ال optionally removed from the term.
--   rank 1 exact    — the heading IS the term
--   rank 2 prefix   — the heading opens with it
--   rank 3 contains — the heading mentions it
-- Short terms (اسم، فعل، حال) admit ranks 1-2 only, or they match half the corpus.
--
-- `source_rank` prefers the books whose tables of contents are actually usable as an
-- index — short, term-named headings — over those whose headings are running sentences.
-- Measured on heading length: الغلاييني 92% of headings ≤25 chars, ابن هشام · القطر 88%,
-- السيوطي 89%; against المبرد · المقتضب at 18% and العلوي · الطراز at 26%.
--
-- Every row lands as state='auto'. Nothing here is a scholarly claim until a human
-- moves a row to 'confirmed'.

DROP TABLE IF EXISTS ar_ling_gram_term_toc;
DROP TABLE IF EXISTS ar_ling_gram_source_toc_rank;

CREATE TABLE ar_ling_gram_source_toc_rank (
  source_slug   TEXT PRIMARY KEY,
  source_rank   INTEGER NOT NULL,   -- 1 = reach for this book first
  tier          TEXT NOT NULL,      -- pedagogical | indexed | discursive
  note          TEXT
);

INSERT INTO ar_ling_gram_source_toc_rank (source_slug, source_rank, tier, note) VALUES
  ('ghalayini_jami_durus',   1, 'pedagogical', 'جامع الدروس العربية — modern synthesis; 120 of 130 headings are bare term names'),
  ('ibn_hisham_qatr',        2, 'pedagogical', 'قطر الندى — teaching text, 88% short headings'),
  ('ibn_hajib_shafiya',      3, 'pedagogical', 'الشافية — the matn the ṣarf commentaries hang on'),
  ('radi_sharh_shafiya',     4, 'indexed',     'شرح الشافية — the ṣarf authority; cite for wazn and nisba'),
  ('suyuti_hamn_hawami',     5, 'indexed',     'همع الهوامع — 582 clean headings, the widest naḥw index'),
  ('ibn_jinni_sirr_sinaat',  6, 'indexed',     'سر صناعة الإعراب — phonology and letters'),
  ('thamanini_sharh_tasrif', 7, 'indexed',     'شرح التصريف'),
  ('ibn_asfur_mumti',        8, 'indexed',     'الممتع في التصريف'),
  ('rukn_din_sharh_shafiya', 9, 'indexed',     'شرح الشافية — second ṣarf commentary'),
  ('ibn_iyaz_sharh_tareef', 10, 'indexed',     'شرح التصريف — the finest-grained nisba chapters in the corpus'),
  ('qazwini_idah',          11, 'indexed',     'الإيضاح — balāgha, cite for maʿānī/bayān/badīʿ'),
  ('sakkaki_miftah_ulum',   12, 'indexed',     'مفتاح العلوم — balāgha'),
  ('ibn_hisham_mughni',     13, 'indexed',     'مغني اللبيب — particles; only 14 headings ingested'),
  ('ibn_hisham_shudhur',    14, 'indexed',     'شذور الذهب; only 7 headings ingested'),
  ('ibn_yaish_sharh_mufassal', 15, 'discursive', 'شرح المفصّل — 966 headings but discursive; still the ṣarf-mubālagha citation'),
  ('sibawayh_kitab',        16, 'discursive',  'الكتاب — headings are full باب clauses'),
  ('ibn_jinni_munsif',      17, 'discursive',  'المنصف'),
  ('jurjani_asrar_balagha', 18, 'discursive',  'أسرار البلاغة'),
  ('jurjani_dalail_ijaz',   19, 'discursive',  'دلائل الإعجاز'),
  ('ibn_malik_lamiyyat_afal', 20, 'discursive','لامية الأفعال'),
  ('ibn_athir_mathal_sair', 21, 'discursive',  'المثل السائر — balāgha; a trap for النسب and المبالغة'),
  ('ibn_jinni_khasais',     22, 'discursive',  'الخصائص — headings are arguments, not labels'),
  ('ibn_malik_ijaz_tareef', 23, 'discursive',  'إيجاز التعريف'),
  ('alawi_tiraz',           24, 'discursive',  'الطراز — 893 headings, 26% short; a trap for المبالغة'),
  ('mubarrad_muqtadab',     25, 'discursive',  'المقتضب — 47-char headings, the least index-like');

CREATE TABLE ar_ling_gram_term_toc (
  id            TEXT PRIMARY KEY,
  term_id       TEXT NOT NULL,
  category_key  TEXT,
  source_slug   TEXT NOT NULL,
  source_rank   INTEGER NOT NULL,
  discipline    TEXT,
  bab_id        TEXT NOT NULL,
  bab_title_ar  TEXT,
  page_start    INTEGER,
  match_kind    TEXT NOT NULL CHECK (match_kind IN ('exact','prefix','contains')),
  match_rank    INTEGER NOT NULL,
  state         TEXT NOT NULL DEFAULT 'auto' CHECK (state IN ('auto','confirmed','rejected')),
  note          TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (term_id, bab_id)
);

CREATE INDEX idx_term_toc_best   ON ar_ling_gram_term_toc (term_id, match_rank, source_rank);
CREATE INDEX idx_term_toc_source ON ar_ling_gram_term_toc (source_slug, term_id);
CREATE INDEX idx_term_toc_disc   ON ar_ling_gram_term_toc (discipline, term_id, match_rank);

INSERT INTO ar_ling_gram_term_toc
  (id, term_id, category_key, source_slug, source_rank, discipline,
   bab_id, bab_title_ar, page_start, match_kind, match_rank)
WITH nb AS (
  SELECT b.id, b.source_slug, b.discipline, b.title_ar, b.page_start,
         replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(
           b.title_ar,'ً',''),'ٌ',''),'ٍ',''),'َ',''),'ُ',''),'ِ',''),'ّ',''),'ْ',''),'ٰ',''),'أ','ا'),'إ','ا') AS t
  FROM ar_ling_gram_bab b
  WHERE b.title_ar IS NOT NULL
),
nb2 AS (
  SELECT id, source_slug, discipline, title_ar, page_start, t,
         trim(CASE
           WHEN t LIKE 'باب %'      THEN substr(t, 5)
           WHEN t LIKE 'فصل %'      THEN substr(t, 5)
           WHEN t LIKE 'ذكر %'      THEN substr(t, 5)
           WHEN t LIKE 'القول في %' THEN substr(t, 10)
           ELSE t END) AS th
  FROM nb
),
nt AS (
  SELECT g.id, g.name_ar, g.category_key,
         replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(
           g.name_ar,'ً',''),'ٌ',''),'ٍ',''),'َ',''),'ُ',''),'ِ',''),'ّ',''),'ْ',''),'ٰ',''),'أ','ا'),'إ','ا') AS t
  FROM ar_ling_gram_term g
  WHERE g.name_ar IS NOT NULL AND g.status = 'live'
),
nt2 AS (
  SELECT id, name_ar, category_key, t,
         CASE WHEN t LIKE 'ال%' THEN substr(t, 3) ELSE t END AS tb
  FROM nt WHERE length(t) > 2
),
m AS (
  SELECT nt2.id AS term_id, nt2.category_key, nb2.id AS bab_id, nb2.source_slug,
         nb2.discipline, nb2.title_ar, nb2.page_start, length(nt2.t) AS tlen,
         CASE
           WHEN nb2.th = nt2.t OR nb2.th = nt2.tb                 THEN 'exact'
           WHEN instr(nb2.th, nt2.t) = 1 OR instr(nb2.th, nt2.tb) = 1 THEN 'prefix'
           ELSE 'contains'
         END AS match_kind
  FROM nt2
  JOIN nb2 ON instr(nb2.t, nt2.t) > 0 OR instr(nb2.t, nt2.tb) > 0
)
SELECT
  'TOC:' || replace(m.term_id, 'GT:', '') || ':' || m.bab_id,
  m.term_id, m.category_key, m.source_slug,
  COALESCE(r.source_rank, 99), m.discipline,
  m.bab_id, m.title_ar, m.page_start, m.match_kind,
  CASE m.match_kind WHEN 'exact' THEN 1 WHEN 'prefix' THEN 2 ELSE 3 END
FROM m
LEFT JOIN ar_ling_gram_source_toc_rank r ON r.source_slug = m.source_slug
-- a four-letter term buried inside a long heading is noise, not a citation
WHERE NOT (m.tlen <= 4 AND m.match_kind = 'contains');
