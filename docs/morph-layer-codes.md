# Layer Codes — 3-digit, all three DBs

> A 3-digit code per data layer (000–900, room to expand) so filling is ordered
> and every layer declares the ONLY sources it may cite (L1 provenance). Covers
> **all 247 domain tables** across `km_arabic`, `km_quran`, `km_arabic_linguistic`.
> Driven by two register tables in `km_arabic_linguistic`. Applied to live D1.

## The codes

| code | layer | العربية · اردو | DBs | fill |
|---|---|---|---|---|
| **000** | Register (master data) | السِّجِل · رجسٹر | AL | once |
| **010** | Sources (lexica & corpus) | المَصادر · مصادر | AL | ingest |
| **050** | Curriculum (pedagogy) | المَنهَج · نصاب | AR | authored |
| **100** | Root | الجَذْر · جڑ | AL + QR | once |
| **200** | Lemma | المُفْرَدَة · لفظ | AL + QR | once |
| **300** | Context / word | السِّياق والكلمة · سیاق و لفظ | QR | per-occ |
| **310** | Sentence structure (iʿrāb) | التَّركيب النحوي · نحوی ساخت | QR | per-verse |
| **320** | Passage | المَقْطَع · مقطع | QR | per-passage |
| **330** | Surah structures | بِنْية السورة · سورہ کی ساخت | QR | per-surah |
| **340** | Illustration / diagram | التَّصوير والمخطَّط · خاکہ و تصویر | QR | per-surah |
| **350** | Surah analysis | تحليل السورة · تجزیۂ سورہ | QR | per-surah |
| **360** | Reception & scholarship | التَّلَقّي والعلم · تلقی و علم | QR | per-surah |
| **370** | Corpus base | المُصْحَف · متنِ قرآن | QR | canonical |
| **400** | Kindred (near-synonyms) | النَّظائر · نظائر | AL | once |
| **500** | Expressions / idioms | التَّعابير · تعبیرات | AL + AR | ingest |
| **600** | Memlets | المُذَكِّرات · میملیٹ | AL | once |
| **700** | Questions | الأَسْئِلَة · سوالات | AL + AR | generated |
| **800** | Mastery & exposure | الإِتْقان · مہارت | AL + AR | runtime |
| **810** | Learner vocab & grammar | مفردات المتعلِّم · متعلم کی لغت | AR | authored |
| **900** | Media | الوَسائط · میڈیا | QR + AL | ingest |

Hundreds = domain family; tens = sub-step (so `300 → 310 → 320 …` is room to
expand within a family). **The Surah-study pipeline reads down the 3xx block:**
`300 word → 310 iʿrāb → 320 passage → 330 structures → 340 illustration →
350 analysis → 360 reception`.

## Live census (2026-07-10) — 247 tables

`000`:9 · `010`:23 · `050`:14 · `100`:10 · `200`:16 · `300`:24 · `310`:26 ·
`320`:10 · `330`:13 · `340`:4 · `350`:11 · `360`:30 · `370`:6 · `400`:6 ·
`500`:5 · `600`:5 · `700`:4 · `800`:11 · `810`:7 · `900`:1. Infra/link tables
(`layer_code IS NULL`) are excluded from fills by design.

## The two tables

- **`ar_ling_reg_build_layer`** (20 rows) — each layer: trilingual name,
  `fill_order`, `once_only`, `mode`, `primary_tables_json`, and
  `allowed_source_slugs_json` (the L1 whitelist for that layer).
- **`ar_ling_reg_table_map`** (247 rows) — every domain table in the three DBs
  tagged `(db, table_name, cluster, layer_code, role)`.

## How mining uses it

```sql
-- "What do I fill for the SS (sentence-structure) layer, and where?"
SELECT db, table_name, role FROM ar_ling_reg_table_map WHERE layer_code = '310';

-- Whole pipeline in fill order, with span:
SELECT m.layer_code, l.name_en, COUNT(*) tables, GROUP_CONCAT(DISTINCT m.db) dbs
FROM ar_ling_reg_table_map m JOIN ar_ling_reg_build_layer l USING (layer_code)
GROUP BY m.layer_code ORDER BY l.fill_order;
```

A row written under a layer whose `source_slug` is absent from that layer's
`allowed_source_slugs_json` is a provenance violation — checked from data, not code.

Migration: `0028_layer_codes_3digit.sql`. Fold recorded there too: the redundant
`nahw_concepts` / `balagha_concepts` / `balagha_branches` / `sentence_types`
tables were dropped (already present in `ar_ling_reg_term`).
