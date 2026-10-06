-- 0139: every lemma and root is referenced by its GLOBAL id (ar_ling_reg_ref_namespace: AL:ROOT =
-- ar_ling_roots.id, AL:LEMMA = ar_ling_root_lemma.id — 26 chars), not only by its text. Three layers keyed
-- on root text alone get the id beside it (the text stays, AGR:ANY:005):
--   government  ar_ling_root_lemma_tadiya.root_id   (all rows whose root_norm names exactly one root)
--   arcs        ar_ling_sense_arc.root_id           (same rule)
--   verb tables ar_ling_root_form_paradigm.root_id + lemma_id (the Qurʾān's verb lemma for that form; NULL
--               where the Qurʾān has no verb of that form/bāb: شدد/عزز ḍaraba, قبل VI and X (participles only),
--               أَلَهَ)
ALTER TABLE ar_ling_root_lemma_tadiya ADD COLUMN root_id TEXT REFERENCES ar_ling_roots(id);
ALTER TABLE ar_ling_sense_arc ADD COLUMN root_id TEXT REFERENCES ar_ling_roots(id);
ALTER TABLE ar_ling_root_form_paradigm ADD COLUMN root_id TEXT REFERENCES ar_ling_roots(id);
ALTER TABLE ar_ling_root_form_paradigm ADD COLUMN lemma_id TEXT REFERENCES ar_ling_root_lemma(id);

UPDATE ar_ling_root_lemma_tadiya SET root_id = (SELECT r.id FROM ar_ling_roots r WHERE r.root_normalized = ar_ling_root_lemma_tadiya.root_norm)
 WHERE root_id IS NULL AND (SELECT count(*) FROM ar_ling_roots r WHERE r.root_normalized = ar_ling_root_lemma_tadiya.root_norm) = 1;
UPDATE ar_ling_sense_arc SET root_id = (SELECT r.id FROM ar_ling_roots r WHERE r.root_normalized = ar_ling_sense_arc.root_norm)
 WHERE root_id IS NULL AND (SELECT count(*) FROM ar_ling_roots r WHERE r.root_normalized = ar_ling_sense_arc.root_norm) = 1;
UPDATE ar_ling_root_form_paradigm SET root_id = (SELECT r.id FROM ar_ling_roots r WHERE r.root_normalized = substr(ar_ling_root_form_paradigm.id, 5, 3))
 WHERE source_ref LIKE 'qr_sarf_verb %' AND (SELECT count(*) FROM ar_ling_roots r WHERE r.root_normalized = substr(ar_ling_root_form_paradigm.id, 5, 3)) = 1;

UPDATE ar_ling_root_form_paradigm SET lemma_id = CASE id
  WHEN 'PAR:شدد:I:nasara' THEN '3f55c0cc3dd6f3d9b639739bda' WHEN 'PAR:شدد:VIII' THEN 'bb2f1f96be6439972742c92039'
  WHEN 'PAR:طول:I' THEN 'c408b2931b49b13a3118c66791' WHEN 'PAR:طول:VI' THEN '9ecd326ec131b8adfc677468ae'
  WHEN 'PAR:كتب:I' THEN 'd58ea72c63c320ebac8252b29a' WHEN 'PAR:كتب:III' THEN '5cac1c2bc3a27471902f5bb788' WHEN 'PAR:كتب:VIII' THEN '9432304317b35a28865dcab3ca'
  WHEN 'PAR:عقب:II' THEN '7c28cc640ea7f100e8c7bdad43' WHEN 'PAR:عقب:III' THEN 'c1db74b2f90ad230b75165ed7e' WHEN 'PAR:عقب:IV' THEN '8068c47ab58f76d72603106570'
  WHEN 'PAR:نزل:I' THEN '2800aea5ea522f1be1ab108d71' WHEN 'PAR:نزل:II' THEN 'fac2f894532e33e23e3e0b7b2e' WHEN 'PAR:نزل:IV' THEN 'd9dd34e69180a4fe29ded74142' WHEN 'PAR:نزل:V' THEN '05d62a0784bd84473542954971'
  WHEN 'PAR:علم:I' THEN 'b84fdd2bade6516b85ce8cee81' WHEN 'PAR:علم:II' THEN '2b5ea997b195cb4b96e6e4c221' WHEN 'PAR:علم:V' THEN '66ca394db8f6dbd335383bf864'
  WHEN 'PAR:صير:I' THEN '92c86e0a535b58b80a741edc4f'
  WHEN 'PAR:غفر:I' THEN '3f3548d833da9f61454be329f9' WHEN 'PAR:غفر:X' THEN '25404d93e809778d1c2bbcef5e'
  WHEN 'PAR:عزز:I:nasara' THEN '56834f34c3fa485855e9f3993f' WHEN 'PAR:عزز:II' THEN 'd0679f2fe2d659c5b9876f8576' WHEN 'PAR:عزز:IV' THEN 'da839bbeae2e7a23e7ede773e8'
  WHEN 'PAR:قبل:I' THEN '3976fb0950c0e47f9ba8096bb0' WHEN 'PAR:قبل:IV' THEN '40d911dc4aea22bff6c354f962' WHEN 'PAR:قبل:V' THEN 'b90cdc7da61367f79aaf032718'
  WHEN 'PAR:توب:I' THEN '3a455b6f1e1915d19ca0493fa2' END
 WHERE source_ref LIKE 'qr_sarf_verb %';
CREATE INDEX IF NOT EXISTS idx_tadiya_root_id ON ar_ling_root_lemma_tadiya(root_id);
CREATE INDEX IF NOT EXISTS idx_sense_arc_root_id ON ar_ling_sense_arc(root_id);
CREATE INDEX IF NOT EXISTS idx_paradigm_root_id ON ar_ling_root_form_paradigm(root_id);
