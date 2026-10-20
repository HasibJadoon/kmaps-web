-- Dīwāns read as songs or left unclassified because the classifier only knew numbered bayts with a dash (٢٨ - …).
-- Reclassified from each work's first pages, counting bare bayts (صدر … عجز) and dash-less numbered ones too:
-- three or more bayts make a qasida, a commented_qasida where the commentary outweighs the verse.
UPDATE ar_acquisition_ref SET verse_form = 'qasida' WHERE id = 'ACQ:SHM:5087';
UPDATE ar_acquisition_ref SET verse_form = 'commented_qasida' WHERE id = 'ACQ:SHM:7170';
UPDATE ar_acquisition_ref SET verse_form = 'qasida' WHERE id = 'ACQ:SHM:7330';
UPDATE ar_acquisition_ref SET verse_form = 'commented_qasida' WHERE id = 'ACQ:SHM:8327';
UPDATE ar_acquisition_ref SET verse_form = 'qasida' WHERE id = 'ACQ:SHM:8453';
UPDATE ar_acquisition_ref SET verse_form = 'qasida' WHERE id = 'ACQ:SHM:8454';
UPDATE ar_acquisition_ref SET verse_form = 'qasida' WHERE id = 'ACQ:SHM:8455';
UPDATE ar_acquisition_ref SET verse_form = 'commented_qasida' WHERE id = 'ACQ:SHM:8456';
UPDATE ar_acquisition_ref SET verse_form = 'qasida' WHERE id = 'ACQ:SHM:8457';
UPDATE ar_acquisition_ref SET verse_form = 'commented_qasida' WHERE id = 'ACQ:SHM:8462';
UPDATE ar_acquisition_ref SET verse_form = 'qasida' WHERE id = 'ACQ:SHM:8464';
UPDATE ar_acquisition_ref SET verse_form = 'qasida' WHERE id = 'ACQ:SHM:8469';
UPDATE ar_acquisition_ref SET verse_form = 'qasida' WHERE id = 'ACQ:SHM:8470';
UPDATE ar_acquisition_ref SET verse_form = 'qasida' WHERE id = 'ACQ:SHM:8471';
UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content';
