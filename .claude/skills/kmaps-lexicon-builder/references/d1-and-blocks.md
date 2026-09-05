# D1 databases, schemas, and block model

## Databases (Cloudflare account 722a276f61c1955a2fc6a75b6437d74c)
- **km_arabic_linguistic** = `192f4792-deb3-4f2e-9204-532cf484ecd2` — the lexicon lives here (reference/truth, ~2.5 GB).
- **km_quran** = `8dbd5053-c9b8-4dd0-9e45-1d66d3a58fba` — corpus, study passages, morphology display.
- OBSOLETE, never query: `knowledgemap` `ef164d27`. Also live: km_worldview `5640655e`, km_content `c59b9640`.
- Canonical root id for بين: `a30d6f8ea317824c7b2d71a0c0`.

D1 tips: the query tool runs **multi-statement batches** (semicolons) and returns one result per
statement. Keep compound SELECTs to ≤4 UNION arms. `num_tables` metadata is stale.

## Source entry table — `ar_ling_lexicon_root_entries`
Columns include `id`, `source_slug`, `root_norm`, `page_start`, `volume_no`, `parser_version`,
`status`, `source_url`, `source_path`, `raw_text`. `raw_text` is the archival source of record —
leave it faithful to the edition (including edition typos); correct only in display blocks.

Pull an entry:
```sql
SELECT id, source_slug, status, page_start, volume_no, parser_version, source_path,
       length(raw_text) AS raw_len, raw_text
FROM ar_ling_lexicon_root_entries
WHERE root_norm='بين' AND source_slug LIKE '%<source>%';
```
Known slugs: `thahabi_al_khalil_kitab_al_ayn`, `saaid_maqayis_al_lugha`,
`ketabonline_al_jawhari_al_sihah`, `ketabonline_al_raghib_mufradat`, `lisan_al_arab`,
`al_qamus_al_muhit`, `misbah_munir`, `taj_al_arus`, `lane_lexicon`, `sinai_key_terms`.

## Block table — `ar_ling_lexicon_blocks`
```
id, source_slug, root_entry_id, section_id, book_page_id, root_norm,
parent_block_id, block_path, block_seq, depth,          -- tree
block_type, lang, title_ar, title_en, text_plain, text_html,
data_json (NOT NULL DEFAULT '{}', CHECK json_valid),    -- must be valid JSON
origin (DEFAULT 'book_native'), origin_ref, printed_page, printed_anchor,
created_at, updated_at
UNIQUE(root_entry_id, block_path)
```
Aux tables that FK to blocks (clear before deleting blocks): `ar_ling_lexicon_block_links`
(`from_block_id`,`to_block_id`), `ar_ling_lexicon_block_annotations` (`block_id`),
`ar_ling_lexicon_block_tags` (`block_id`), `ar_ling_lexicon_quran_refs` (`block_id`).

### Block types used
- `root_header` — the head (depth 0, parent NULL). `text_plain` = the author's opening line; `data_json` = `{core_en, core_ur, anchor, source_page, signature?}`.
- `sarf_family` — the source's family panel (depth 1, parent = header). `text_plain` NULL; `data_json` = the family spec (see provenance-and-family.md). `origin='derived_display'`.
- `definition` — a verbatim passage (depth 1, parent = header). `text_plain` = verbatim Arabic; `data_json` = `{seq, sense_key, en, ur, …}`.
- `poetry_quote` — a passage that is mainly a verse / shāhid (same shape as definition).
- `footnote` — the author's footnotes (depth 1, parent NULL). `text_plain` = verbatim Arabic; `data_json` = `{num, topic?, en}`.
- `editor_note` — a defect/correction note (depth 1, parent NULL). `data_json` = `{defect, field, printed, corrected, reason, verified_against, status}`. `origin='kmaps_correction'`.

### Path & sequence convention
`e1.h` (seq 1) · `e1.fam` (seq 2) · `e1.p1..e1.pN` (seq 10,11,…) · `e1.fn1..e1.fnM` (seq 90+) ·
`e1.d<n>` (seq 95+). Ids: `blk_<src>2_<h|fam|p1|fn1|d41>` (the `2` avoids colliding with any
earlier build). `<src>` short tag: `ayn`, `mqy`, `sih`, `mfr`, `lisan`, …

### SQL escaping (critical)
The whole SQL literal is single-quoted, so **avoid straight apostrophes `'` and double-quotes `"`
inside English/Urdu** (rephrase to remove possessive `'s` and quotation marks). Arabic and Urdu
contain neither. `data_json` uses double-quotes as JSON delimiters — fine inside a single-quoted
SQL string as long as the values themselves contain no `"`. Insert `header + family` first and
confirm success to prove the JSON passes `json_valid` before loading the passages.

## Delete-and-reinsert (run as one batch)
```sql
DELETE FROM ar_ling_lexicon_block_links     WHERE from_block_id IN (SELECT id FROM ar_ling_lexicon_blocks WHERE root_entry_id='<ENTRY>') OR to_block_id IN (SELECT id FROM ar_ling_lexicon_blocks WHERE root_entry_id='<ENTRY>');
DELETE FROM ar_ling_lexicon_block_annotations WHERE block_id IN (SELECT id FROM ar_ling_lexicon_blocks WHERE root_entry_id='<ENTRY>');
DELETE FROM ar_ling_lexicon_block_tags        WHERE block_id IN (SELECT id FROM ar_ling_lexicon_blocks WHERE root_entry_id='<ENTRY>');
DELETE FROM ar_ling_lexicon_quran_refs        WHERE block_id IN (SELECT id FROM ar_ling_lexicon_blocks WHERE root_entry_id='<ENTRY>');
DELETE FROM ar_ling_lexicon_blocks WHERE root_entry_id='<ENTRY>' AND parent_block_id IS NOT NULL;
DELETE FROM ar_ling_lexicon_blocks WHERE root_entry_id='<ENTRY>';
```

## Insert template (header + family, then passages in batches of ~3)
```sql
INSERT INTO ar_ling_lexicon_blocks
(id, source_slug, root_entry_id, root_norm, parent_block_id, block_path, block_seq, depth,
 block_type, lang, title_ar, title_en, text_plain, data_json, origin, printed_page)
VALUES
('blk_<src>2_h','<slug>','<ENTRY>','بين',NULL,'e1.h',1,0,'root_header','ar','بين','byn (b-y-n)',
 '<verbatim opening>','{"core_en":"…","core_ur":"…","anchor":"al-Dukhān 44:2 — المُبين","source_page":"…"}','book_native',<page>),
('blk_<src>2_fam','<slug>','<ENTRY>','بين','blk_<src>2_h','e1.fam',2,1,'sarf_family','ar','<عنوان>','<title en>',NULL,
 '<family json — see provenance-and-family.md>','derived_display',<page>);
```
Passages (`parent_block_id='blk_<src>2_h'`, `depth 1`, `origin='book_native'`):
```sql
('blk_<src>2_p1','<slug>','<ENTRY>','بين','blk_<src>2_h','e1.p1',10,1,'definition','ar','<عنوان>','<title en>',
 '<VERBATIM ARABIC>','{"seq":1,"sense_key":"…","en":"<full faithful EN>","ur":"<full faithful UR>"}','book_native',<page>)
```

## Stamp the entry
```sql
UPDATE ar_ling_lexicon_root_entries
SET parser_version='kmaps_<src>_verbatim_<N>p_trilingual', status='clean', updated_at=datetime('now')
WHERE id='<ENTRY>';
```

## Verify the rebuilt set
```sql
SELECT block_seq, block_path, block_type, title_en,
       length(text_plain) AS ar, length(json_extract(data_json,'$.en')) AS en,
       length(json_extract(data_json,'$.ur')) AS ur
FROM ar_ling_lexicon_blocks WHERE root_entry_id='<ENTRY>' ORDER BY block_seq;
```

## Quran study-passage worklist (km_quran)
```sql
-- passage range
SELECT id, passage_no, ayah_from, ayah_to, title_en FROM qr_surah_study_passages
WHERE surah=44 AND passage_no=1;
-- content-word roots in āya order (the build worklist)
SELECT root_ar, MIN(ayah_no) AS first_ayah, COUNT(*) AS occ,
       GROUP_CONCAT(DISTINCT pos_en) AS pos, GROUP_CONCAT(DISTINCT lemma_ar) AS lemmas
FROM qr_morph_display_words
WHERE surah_no=44 AND ayah_no BETWEEN 1 AND 9 AND is_content_word=1
  AND root_ar IS NOT NULL AND root_ar<>''
GROUP BY root_ar ORDER BY first_ayah, occ DESC;
```
al-Dukhān 44 passage 1 = āyāt 1–9, 24 roots: بين، كتب، برك، ليل، نذر، نزل، امر، حكم، فرق، رسل،
ربب، رحم، سمع، علم، ارض، سمو، يقن، ابو، اله، اول، حيي، موت، شكك، لعب.
