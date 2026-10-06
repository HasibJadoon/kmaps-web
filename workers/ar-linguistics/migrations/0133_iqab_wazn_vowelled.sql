-- 0133: عِقَاب is vowelled, so its pattern is فِعَال, not the unvowelled skeleton «فِعَال/فُعَال»
-- (WZ:fial_or_fuaal, which the registry itself says vowelling must decide). Our own derived row (from al-Raḍī's rule),
-- not an ingested value.
UPDATE ar_ling_root_lemma_wazn SET wazn_id = 'WZ:fial' WHERE id = 'LW:iqaab:masdar' AND wazn_id = 'WZ:fial_or_fuaal';
