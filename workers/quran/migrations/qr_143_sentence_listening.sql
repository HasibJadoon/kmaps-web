-- The Sentences step hears each sentence, as the āyah step hears each āyah (owner, 2026-10-15): listen & fill,
-- build the sentence, catch the word and shadow over the sentence's own words, cut from its āyāt and timed in the
-- recitation (practice.ts sentenceLineDrills; asks ss_order · ss_fill · ss_hear · ss_shadow).
-- ss_buildup is retired: it asked for the order of a translation's build-up steps — an order the book made, not a
-- fact of the text, with English where the Arabic should be. Building the sentence from its own words replaces it.
UPDATE qr_study_label SET extra_json = json_set(COALESCE(extra_json, '{}'), '$.retired', 1) WHERE scope = 'kind' AND key = 'ss_buildup';
UPDATE qr_study_label
   SET extra_json = json_set(extra_json, '$.only.ss',
         json('["ss_order","ss_fill","ss_hear","ss_shadow","ss_kind","ss_mahall","ss_role","ss_ellipsis","ss_why","ss_tree"]'))
 WHERE scope = 'class_node' AND key = 'sentences';
-- the old draws of the step are drawn again (the kept pool is keyed by the step's definition, which changed)
UPDATE kmaps_cache_version SET version = version + 1 WHERE family IN ('rest', 'books');
