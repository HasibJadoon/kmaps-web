-- 0040 — Source slug normalization (naming convention v2, phase 2, rule N22).
--
-- Provider prefixes (ketabonline_ / qomra_ / saaid_ / thahabi_) encode where a
-- text was scraped from. That already lives in ar_ling_sources.origin, so in the
-- slug it is redundant (N10) and it leaks pipeline trivia into public URLs. The
-- definite article goes with it: `al_` carries no distinguishing information
-- once the provider is gone.
--
-- PRECEDENT — 0033 already did exactly this for one book
-- (ketabonline_al_raghib_mufradat → al_raghib_mufradat). It never crossed into
-- km_quran, so qr_morph_display_sources still holds the pre-0033 slug today.
-- The companion km_quran migration in this batch closes that gap.
--
-- HARD CUTOVER — no alias table. D1, both Angular apps, iOS and the audit
-- scripts ship together. Old URLs 404 rather than redirect.
--
-- Also folded in: ibn_duraid → ibn_durayd. One author had two transliterations
-- across ar_ling_sources (ibn_duraid_jamharat vs ibn_durayd_ishtiqaq); N22
-- allows exactly one per author.
--
-- FTS — these are UPDATEs, not renames, so the AFTER UPDATE triggers on the four
-- external-content indexes keep search in sync. No rebuild needed here.

-- ── Step 1: release the slug on superseded ingests ─────────────────────────
-- Each is a second ingest of a book already present under another provider, so
-- each would collide once the provider prefix is stripped.
--
-- An earlier draft DELETEd these as "zero-row duplicates". Production rejected
-- that with a FOREIGN KEY failure, correctly: the zero-row claim was based on
-- lexicon entries and blocks only, and two of them hold raw ingested text in
-- ar_ling_source_chunks (2,908 and 2,691 rows — 5,599 chunks of classical
-- dictionary text, scraped but never promoted). Deleting the registry row would
-- have orphaned all of it.
--
-- Setting slug = NULL is the established pattern for this: a NULL slug means
-- "no TS-side identifier", and SourcesRepo already filters those out of every
-- query. The id, the chunks and the provenance all survive.

-- qomra_jamharat_al_lugha: same work as ibn_durayd_jamharat_lugha; 2,908 unpromoted source chunks retained
UPDATE ar_ling_sources SET slug = NULL WHERE slug = 'qomra_jamharat_al_lugha';
-- qomra_al_misbah_al_munir: same work as fayyumi_misbah_munir; 2,691 unpromoted source chunks retained
UPDATE ar_ling_sources SET slug = NULL WHERE slug = 'qomra_al_misbah_al_munir';
-- lane_quranic_research_perseus: superseded by lane_lexicon; no dependent rows, kept for provenance
UPDATE ar_ling_sources SET slug = NULL WHERE slug = 'lane_quranic_research_perseus';

-- ── Step 2: the registry row itself ────────────────────────────────────────
UPDATE ar_ling_sources SET slug = 'raghib_mufradat' WHERE slug = 'al_raghib_mufradat';
UPDATE ar_ling_sources SET slug = 'jawhari_sihah' WHERE slug = 'ketabonline_al_jawhari_al_sihah';
UPDATE ar_ling_sources SET slug = 'ibn_manzur_lisan_arab' WHERE slug = 'ketabonline_ibn_manzur_lisan_al_arab';
UPDATE ar_ling_sources SET slug = 'zabidi_taj_arus' WHERE slug = 'ketabonline_al_zabidi_taj_al_arus';
UPDATE ar_ling_sources SET slug = 'ibn_durayd_jamharat_lugha' WHERE slug = 'ketabonline_ibn_duraid_jamharat_al_lugha';
UPDATE ar_ling_sources SET slug = 'fayyumi_misbah_munir' WHERE slug = 'ketabonline_al_fayyumi_misbah_munir';
UPDATE ar_ling_sources SET slug = 'khalil_kitab_ayn' WHERE slug = 'thahabi_al_khalil_kitab_al_ayn';
UPDATE ar_ling_sources SET slug = 'maqayis_lugha' WHERE slug = 'saaid_maqayis_al_lugha';
UPDATE ar_ling_sources SET slug = 'qamus_muhit' WHERE slug = 'qomra_al_qamus_al_muhit';
UPDATE ar_ling_sources SET slug = 'ubab_zakhir' WHERE slug = 'qomra_al_ubab_al_zakhir';
UPDATE ar_ling_sources SET slug = 'hamalawi_shadha_arf' WHERE slug = 'hamalawi_shadha_al_arf';

-- ── Step 3: the denormalised join key across 40 tables ──────────────────
-- source_slug is carried denormalised on every content table so readers can
-- filter without joining. That means the rename touches all of them.
--
-- One CASE pass per table, not one UPDATE per slug. The first version of this
-- migration issued 11 statements per table — 440 in total, ~900k row-writes —
-- and D1 rejected the batch with an internal error. CASE does the same work in
-- a single index-assisted pass per table.
--
-- ar_ling_lexicon_block carries ~900k of those rows on its own and is split into
-- the companion migration 0040z so neither batch is oversized.
UPDATE ar_ling_citations
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_conjugation_templates
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_context_passages
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_expressions
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_form_families
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_form_paradigms
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_form_semantics
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_gram_bab
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_gram_chunks
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_gram_term_sources
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_inflection_rules
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_lane_patch_log
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_lemma_form_map
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_letters
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_lexicon_block_links
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
-- ar_ling_lexicon_blocks: see 0040z (≈900k rows)
UPDATE ar_ling_lexicon_book_pages
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_lexicon_display_profile
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_lexicon_display_rule
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_lexicon_display_section
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_lexicon_entry_sections
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_lexicon_quran_refs
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_lexicon_root_entries
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_lexicon_root_entry_sources
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_memlets
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_morph_corrections
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_orthography_rules
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_question_items
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_root_build_jobs
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_root_development_stages
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_root_form_attested
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_root_relations
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_root_scholarship
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_root_semantic_fields
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_root_sense_axes
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_root_senses
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_root_stage
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_source_chunks
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_vector_records
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_word_sums
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');

-- ── Step 4: identifiers that embed a slug ──────────────────────────────────
-- The display section/rule primary keys are built as LXDS:{slug}:{kind} and
-- LXDR:{slug}:{rule}:{seq}, so the slug is inside the key, not just the column.
-- Rewriting only the column would leave every id quoting a slug that no longer
-- exists — the same defect as ar_ling_root_stage.id carrying its sub_code.
-- Regenerate them here, in the same batch as the rename.
UPDATE ar_ling_lexicon_display_section
   SET id = 'LXDS:' || 'raghib_mufradat' || ':' || kind_code
 WHERE id LIKE 'LXDS:' || 'al_raghib_mufradat' || ':%';
UPDATE ar_ling_lexicon_display_rule
   SET id = 'LXDR:' || 'raghib_mufradat' || ':' || rule_key || ':' || seq
 WHERE id LIKE 'LXDR:' || 'al_raghib_mufradat' || ':%';
UPDATE ar_ling_lexicon_display_section
   SET id = 'LXDS:' || 'jawhari_sihah' || ':' || kind_code
 WHERE id LIKE 'LXDS:' || 'ketabonline_al_jawhari_al_sihah' || ':%';
UPDATE ar_ling_lexicon_display_rule
   SET id = 'LXDR:' || 'jawhari_sihah' || ':' || rule_key || ':' || seq
 WHERE id LIKE 'LXDR:' || 'ketabonline_al_jawhari_al_sihah' || ':%';
UPDATE ar_ling_lexicon_display_section
   SET id = 'LXDS:' || 'ibn_manzur_lisan_arab' || ':' || kind_code
 WHERE id LIKE 'LXDS:' || 'ketabonline_ibn_manzur_lisan_al_arab' || ':%';
UPDATE ar_ling_lexicon_display_rule
   SET id = 'LXDR:' || 'ibn_manzur_lisan_arab' || ':' || rule_key || ':' || seq
 WHERE id LIKE 'LXDR:' || 'ketabonline_ibn_manzur_lisan_al_arab' || ':%';
UPDATE ar_ling_lexicon_display_section
   SET id = 'LXDS:' || 'zabidi_taj_arus' || ':' || kind_code
 WHERE id LIKE 'LXDS:' || 'ketabonline_al_zabidi_taj_al_arus' || ':%';
UPDATE ar_ling_lexicon_display_rule
   SET id = 'LXDR:' || 'zabidi_taj_arus' || ':' || rule_key || ':' || seq
 WHERE id LIKE 'LXDR:' || 'ketabonline_al_zabidi_taj_al_arus' || ':%';
UPDATE ar_ling_lexicon_display_section
   SET id = 'LXDS:' || 'ibn_durayd_jamharat_lugha' || ':' || kind_code
 WHERE id LIKE 'LXDS:' || 'ketabonline_ibn_duraid_jamharat_al_lugha' || ':%';
UPDATE ar_ling_lexicon_display_rule
   SET id = 'LXDR:' || 'ibn_durayd_jamharat_lugha' || ':' || rule_key || ':' || seq
 WHERE id LIKE 'LXDR:' || 'ketabonline_ibn_duraid_jamharat_al_lugha' || ':%';
UPDATE ar_ling_lexicon_display_section
   SET id = 'LXDS:' || 'fayyumi_misbah_munir' || ':' || kind_code
 WHERE id LIKE 'LXDS:' || 'ketabonline_al_fayyumi_misbah_munir' || ':%';
UPDATE ar_ling_lexicon_display_rule
   SET id = 'LXDR:' || 'fayyumi_misbah_munir' || ':' || rule_key || ':' || seq
 WHERE id LIKE 'LXDR:' || 'ketabonline_al_fayyumi_misbah_munir' || ':%';
UPDATE ar_ling_lexicon_display_section
   SET id = 'LXDS:' || 'khalil_kitab_ayn' || ':' || kind_code
 WHERE id LIKE 'LXDS:' || 'thahabi_al_khalil_kitab_al_ayn' || ':%';
UPDATE ar_ling_lexicon_display_rule
   SET id = 'LXDR:' || 'khalil_kitab_ayn' || ':' || rule_key || ':' || seq
 WHERE id LIKE 'LXDR:' || 'thahabi_al_khalil_kitab_al_ayn' || ':%';
UPDATE ar_ling_lexicon_display_section
   SET id = 'LXDS:' || 'maqayis_lugha' || ':' || kind_code
 WHERE id LIKE 'LXDS:' || 'saaid_maqayis_al_lugha' || ':%';
UPDATE ar_ling_lexicon_display_rule
   SET id = 'LXDR:' || 'maqayis_lugha' || ':' || rule_key || ':' || seq
 WHERE id LIKE 'LXDR:' || 'saaid_maqayis_al_lugha' || ':%';
UPDATE ar_ling_lexicon_display_section
   SET id = 'LXDS:' || 'qamus_muhit' || ':' || kind_code
 WHERE id LIKE 'LXDS:' || 'qomra_al_qamus_al_muhit' || ':%';
UPDATE ar_ling_lexicon_display_rule
   SET id = 'LXDR:' || 'qamus_muhit' || ':' || rule_key || ':' || seq
 WHERE id LIKE 'LXDR:' || 'qomra_al_qamus_al_muhit' || ':%';
UPDATE ar_ling_lexicon_display_section
   SET id = 'LXDS:' || 'ubab_zakhir' || ':' || kind_code
 WHERE id LIKE 'LXDS:' || 'qomra_al_ubab_al_zakhir' || ':%';
UPDATE ar_ling_lexicon_display_rule
   SET id = 'LXDR:' || 'ubab_zakhir' || ':' || rule_key || ':' || seq
 WHERE id LIKE 'LXDR:' || 'qomra_al_ubab_al_zakhir' || ':%';
UPDATE ar_ling_lexicon_display_section
   SET id = 'LXDS:' || 'hamalawi_shadha_arf' || ':' || kind_code
 WHERE id LIKE 'LXDS:' || 'hamalawi_shadha_al_arf' || ':%';
UPDATE ar_ling_lexicon_display_rule
   SET id = 'LXDR:' || 'hamalawi_shadha_arf' || ':' || rule_key || ':' || seq
 WHERE id LIKE 'LXDR:' || 'hamalawi_shadha_al_arf' || ':%';

-- ── Step 5: default that names a slug ──────────────────────────────────────
-- ar_ling_letters.source_slug DEFAULTs to 'ibn_jinni_sirr_sinaat', which is
-- unaffected by this batch. Recorded so the next reader does not have to check.
