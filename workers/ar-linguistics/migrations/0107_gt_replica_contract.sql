-- 0107_gt_replica_contract.sql — say what a legitimate replica of GT is, and
-- make the staleness check actually able to fail.
--
-- Four corrections, all to registry metadata; no term content changes.

-- ── 1. GT-008 could never fail ───────────────────────────────────────────────
-- It compared ar_ling_gram_term_signature against the signature recorded in
-- km_quran.qr_morph_display_build — but that recorded value is a copy of GT's
-- OWN signature, taken from this same table at build time. So the check
-- compared GT to GT. It matched by construction and could not detect that the
-- km_quran copy had drifted. It reported "in sync" on 2026-08-29 while the
-- projection was missing 110 terms and serving stale text in six categories.
--
-- The replica now computes the identical formula locally, so the comparison is
-- between two different populations and a difference means something.
UPDATE ar_ling_reg_conformance_check
   SET description = 'The km_quran replica of this registry must be current. '
                     'Step 1: SELECT signature FROM ar_ling_gram_term_signature (this db). '
                     'Step 2: SELECT signature FROM ar_ling_gram_term_signature (km_quran — the '
                     'replica defines the same view under the same name). '
                     'Equal means current. Unequal means the replica is behind and '
                     'scripts/sync_gt_mirror.py must be re-run before its labels are trusted. '
                     'Do NOT compare against qr_morph_display_build.gt_signature: that column '
                     'records a copy of THIS table''s signature, so comparing the two compares '
                     'GT to itself and always matches.',
       dimension   = 'staleness'
 WHERE check_id = 'GT-008';

-- ── 2. GT-006 forbade the thing that makes the read path possible ────────────
-- D1 cannot join across databases. km_quran must hold a local copy of the
-- registry or every morphology read becomes two round trips and a join in JS.
-- The rule that matters is not "no copy" — it is "no second AUTHORED copy".
-- A complete, generated, signature-checked replica is not a second source of
-- truth; a hand-maintained partial projection is, and that is what rotted.
UPDATE ar_ling_reg_conformance_check
   SET description = 'No database may hold a second AUTHORED copy of the term registry. '
                     'A generated replica is permitted and expected where D1 cannot join '
                     'across databases, on four conditions: (a) it is complete — every term, '
                     'never a subset, since a partial projection is what drifted before; '
                     '(b) it is written only by its sync job and never hand-edited; '
                     '(c) it exposes a signature view computing the identical formula to '
                     'ar_ling_gram_term_signature, so staleness is detectable; and (d) it is '
                     'reproducible — dropping and re-syncing it changes nothing. '
                     'km_quran.ar_ling_gram_term is the one such replica today — same table name, '
                     'same structure and same ids as this database, so a query written here '
                     'runs verbatim there '
                     '(scripts/sync_gt_mirror.py). Anything else matching %gram_term% or '
                     '%vocab% outside the allowed set is an offender: drop it and point its '
                     'refs at ar_ling_gram_term.',
       dimension   = 'single_registry'
 WHERE check_id = 'GT-006';

-- ── 3. GT-010 tested something that cannot be false ──────────────────────────
-- It asserted that every baked feature object carries a GT ref. But `ref` is
-- populated from the join key of an INNER JOIN, so it can never be NULL: the
-- check passes by construction, not by evidence. The real failure mode of that
-- join is the opposite — a flag whose ref does not resolve is silently DROPPED
-- from features_json, and no NULL ever appears to be counted.
UPDATE ar_ling_reg_conformance_check
   SET description = 'Every QAC flag the corpus emits must resolve to a registry term, or '
                     'the feature is silently dropped from features_json. The features_json '
                     'builder INNER JOINs the decomposition, so an unresolvable flag does not '
                     'surface as a null ref — it vanishes. Run in km_quran: '
                     'SELECT DISTINCT j.value FROM qr_word_occurrence w, '
                     'json_each(json_extract(w.morphology_tag_json,''$.stem.flags'')) j '
                     'LEFT JOIN qr_morph_flag_decomp d ON d.flag = j.value '
                     'WHERE d.flag IS NULL. Any row is a term missing from GT. '
                     'Checking for a null $.ref instead is vacuous.',
       dimension   = 'referential'
 WHERE check_id = 'GT-010';

-- ── 4. the decision record repeated a false premise ──────────────────────────
-- It described qr_morph_display_word as "a materialised table of 50,171 rows"
-- and concluded the two local tables were needed only to rebuild it. It is and
-- was a VIEW (CREATE VIEW qr_morph_display_word AS SELECT * FROM
-- v_morph_display_word), which computes features_json per read by joining those
-- tables. They were the serve path, not a build step, and dropping them would
-- have taken the morphology surface down.
UPDATE ar_ling_reg_decision
   SET data_state = 'done — 104,000+ refs migrated across all surahs; both km_quran linters '
                    'empty; qr_ss_vocab_register has no unset rows. Note the earlier claim '
                    'that 1.8M feature objects were checked was a misread of the query '
                    'planner''s rows_read; the real count is 184,734.',
       application_state =
         'done — km_quran holds a complete generated replica under this database''s own '
         'names and structure: ar_ling_gram_term (all 435 terms, same ids) and '
         'ar_ling_gram_category (30), refreshed by scripts/sync_gt_mirror.py and verified by '
         'comparing the two ar_ling_gram_term_signature views. Serving reads km_quran '
         'only: no cross-database join and no worker-to-worker call on the read path. '
         'qr_morph_flag_decomp is regenerated from the replica rather than maintained: 82 '
         'rows, differing from the previous 84 by exactly the two PCPL rows, dropped on purpose. '
         'Those mapped a bare PCPL to BOTH participles, but PCPL occurs bare 0 times in 3,525 '
         'participle words, so the rule fired on every one and always added the wrong label: all '
         '3,524 rendered active AND passive participle together, 2,973 with active twice. The '
         'view''s UNION branches already pick the right one. '
         'qr_gram_term_ref — the hand-maintained '
         '325-of-435 projection that had drifted — is dropped. '
         'CORRECTION: qr_morph_display_word is a VIEW, not a materialised table; it always '
         'was. features_json is computed per read, so the registry tables under it are the '
         'serve path. Materialising was considered and rejected: a passage reads in ~3ms and '
         'the widest query in the app (al-Baqara, 3,897 words) in ~42ms, so baking 50,171 '
         'rows would add a staleness surface and buy nothing.',
       enforced_by = 'qr_ss_gt_violations (km_quran); ar_ling_reg_conformance_check GT-* rows; '
                     'ar_ling_reg_ref_namespace prefix GT; the two ar_ling_gram_term_signature '
                     'views, here and in km_quran (GT-008)'
 WHERE decision_id = 'DEC:GT:001';
