-- 0113_root_lexicon_key_weak_and_hamza.sql
--
-- The lexica file a WEAK or HAMZATED root under more than one spelling, as they file a geminate
-- under the bare biliteral (kmaps-database 028): each book writes the weak radical and the hamza
-- its own way, and the Qurʾān's key (qr_word_occurrence.root, ar_ling_roots.root_normalized) writes
-- one of them. A reader asking for دعو found al-Rāghib, the Lisān and the Ṣiḥāḥ nowhere — they file
-- it under دعا; asking for امن found no Miṣbāḥ — it files it under ءمن.
--
--   defective (final و / ي)   filed under the other weak letter, or as the verb is written:
--                             دعو → دعا، دعي · هدي → هدى، هدا · بغي → بغو، بغا
--   hamzated (the key's ا)    filed with the hamza on a seat or none: امن → ءمن · سال → سأل، سءل
--   hollow (medial و / ي)     filed under the alif of its past tense (قال، باع, as al-Qāmūs and
--                             al-Rāghib do) — ONLY where no other book files an entry under that
--                             spelling: ثار in Lane is ثأر (revenge), not ثور, and دير is a monastery,
--                             not دور. A medial و ↔ ي swap is never made (جور/جير, دور/دير are roots).
--
-- A row is written only where (a) entries exist under the variant, (b) the variant is not itself a
-- Qurʾānic root (قول and قيل are both roots), and (c) exactly one Qurʾānic root yields the variant
-- (قني and قنو both yield قنا: neither gets it). Rank 1, like the geminate rows: a reader wanting one
-- entry per book takes the lowest rank that hits; a reader building across a root's whole shelf
-- (the meaning arcs, 0114) reads every key and keeps found_under on what it read.
--
-- Of the 173 entries filed under a key missing from this table altogether, this reaches the 98
-- Miṣbāḥ hamza keys (ءمن, ءخذ …) and Sinai's alif-maqṣūra keys (خزى, خشى, شرى, غنى, هوى, وحى, وفى,
-- ولى); the rest are not roots (proper names in Sinai — ابراهيم، موسى …; the Qāmūs/Tāj chapter
-- headings and parse fragments — بابالتاء، فصلالالف، كالجعظ، والبهرجه …) and stay unkeyed.
-- Derived from root shape, so re-running after new roots are ingested extends it with no edit.
--
-- Apply with `d1 execute --file`, then record it in d1_migrations (the ledger is out of sync).

INSERT OR IGNORE INTO ar_ling_root_lexicon_key (root_norm, lookup_norm, key_rank, reason)
WITH q AS (SELECT DISTINCT root_normalized AS r FROM ar_ling_roots
            WHERE frequency_quran > 0 AND root_normalized IS NOT NULL AND length(root_normalized) BETWEEN 3 AND 4),
w(c) AS (VALUES ('و'), ('ي'), ('ا'), ('ى')),
h(c) AS (VALUES ('ء'), ('أ'), ('إ'), ('آ'), ('ئ'), ('ؤ')),
p(i) AS (VALUES (1), (2), (3), (4)),
v AS (
  SELECT r, substr(r, 1, length(r) - 1) || w.c AS v, 'defective root (final ' || substr(r, -1, 1) || ') — filed under ' || w.c AS reason, 'final' AS rule
    FROM q, w WHERE substr(r, -1, 1) IN ('و', 'ي') AND w.c <> substr(r, -1, 1)
  UNION ALL
  SELECT r, substr(r, 1, 1) || 'ا' || substr(r, 3), 'hollow root (medial ' || substr(r, 2, 1) || ') — filed under its past tense with ا', 'medial'
    FROM q WHERE length(r) = 3 AND substr(r, 2, 1) IN ('و', 'ي')
  UNION ALL
  SELECT r, substr(r, 1, p.i - 1) || h.c || substr(r, p.i + 1), 'hamzated root — the hamza written ' || h.c, 'hamza'
    FROM q, p, h WHERE p.i <= length(r) AND substr(r, p.i, 1) = 'ا'
),
keep AS (
  SELECT v.r, v.v, v.reason FROM v
   WHERE EXISTS (SELECT 1 FROM ar_ling_lexicon_entry e WHERE e.root_norm = v.v)
     AND v.v NOT IN (SELECT r FROM q)
     AND (SELECT COUNT(DISTINCT v2.r) FROM v v2 WHERE v2.v = v.v) = 1
     AND (v.rule <> 'medial' OR NOT EXISTS (SELECT 1 FROM ar_ling_lexicon_entry e WHERE e.root_norm = v.v
                                             AND e.source_slug NOT IN ('qamus_muhit', 'raghib_mufradat')))
)
SELECT r, v, 1, reason FROM keep;

-- ── read back, and withdrawn: the alphabetical lexica's keys fold a hamza to its seat, so a key like هدا
-- holds هَدَأَ (to be still) as well as — or instead of — هُدَى. Every ENTRY under a defective-root key above was
-- read (meaning_arcs.py): an entry whose opening writes the root's third radical as a hamza (هَدَأَ، نَهَأَ،
-- قَضَأَ …) is another root; an entry that does not, and writes the root's own words with its weak letter
-- (رَجَا يَرْجُو, twice or more), is this one. A key is withdrawn only where NO entry under it, in any book, is
-- the defective root — 31 of the 277 defective keys. (A key that holds both, like رجا — al-Rāghib's رجا is
-- رجو, the Lisān's is رجأ — stays; the arcs read it entry by entry.) The hamzated and hollow keys stand.
DELETE FROM ar_ling_root_lexicon_key
 WHERE key_rank = 1 AND reason LIKE 'defective root%'
   AND (root_norm, lookup_norm) IN (VALUES ('بكي','بكا'), ('جري','جرا'), ('جفو','جفي'), ('جني','جنا'), ('حلي','حلا'), ('حمي','حمو'), ('دنو','دني'), ('رقي','رقا'), ('رمي','رما'), ('زري','زرا'), ('زني','زنا'), ('سري','سرا'), ('شري','شرا'), ('صدي','صدا'), ('فدي','فدا'), ('فري','فرا'), ('فني','فنا'), ('قضي','قضا'), ('كدي','كدا'), ('كفي','كفو'), ('كوي','كوا'), ('لظي','لظا'), ('لفو','لفا'), ('لوي','لوا'), ('مسو','مسا'), ('نفي','نفا'), ('نهي','نها'), ('هدي','هدا'), ('هوي','هوا'), ('ودي','ودا'), ('وصي','وصا'));
