-- (owner, 2026-10-15: 'all bad questions retire and delete fully')
-- 1 · Concept only: 'who says this line?' (speaker) and 'what happened in this scene?' (gist) are questions about people
--     and story, never the language — retired (the workers skip retired kinds); their content and cards are deleted by
--     kmaps-resources/scripts/srs/2026-10-15_bad_questions.py.
UPDATE ar_practice_label SET extra_json = json_set(COALESCE(extra_json, '{}'), '$.retired', 1) WHERE scope = 'kind' AND key IN ('speaker', 'gist');

-- 2 · Crossing axes: one line is one of each axis at once (an istiʿāra is taṣrīḥiyya AND aṣliyya AND murashshaḥa; an
--     iḍāfa is maʿnawiyya AND 'meaning of'), so a concept is never offered as a wrong choice for one on another axis of
--     its group — else 'which is it?' has two right answers. Read by the grammar generator (lib/grammar besideTerm).
INSERT OR REPLACE INTO ar_practice_label (scope, key, label, extra_json) VALUES
  ('term_axis', 'GT:balagha_bayan:istiara_tasrihiyya', 'istiara', '{"group":"istiara","axis":0}'),
  ('term_axis', 'GT:balagha_bayan:istiara_makniyya', 'istiara', '{"group":"istiara","axis":0}'),
  ('term_axis', 'GT:balagha_bayan:istiara_tamthiliyya', 'istiara', '{"group":"istiara","axis":0}'),
  ('term_axis', 'GT:balagha_bayan:istiara_asliyya', 'istiara', '{"group":"istiara","axis":1}'),
  ('term_axis', 'GT:balagha_bayan:istiara_tabaiyya', 'istiara', '{"group":"istiara","axis":1}'),
  ('term_axis', 'GT:balagha_bayan:istiara_murashshaha', 'istiara', '{"group":"istiara","axis":2}'),
  ('term_axis', 'GT:balagha_bayan:istiara_mujarrada', 'istiara', '{"group":"istiara","axis":2}'),
  ('term_axis', 'GT:balagha_bayan:istiara_mutlaqa', 'istiara', '{"group":"istiara","axis":2}'),
  ('term_axis', 'GT:balagha_bayan:kinaya_sifa', 'kinaya', '{"group":"kinaya","axis":0}'),
  ('term_axis', 'GT:balagha_bayan:kinaya_mawsuf', 'kinaya', '{"group":"kinaya","axis":0}'),
  ('term_axis', 'GT:balagha_bayan:kinaya_ramziyya', 'kinaya', '{"group":"kinaya","axis":1}'),
  ('term_axis', 'GT:balagha_maani:qasr_taqdim', 'qasr', '{"group":"qasr","axis":0}'),
  ('term_axis', 'GT:balagha_maani:qasr_atf', 'qasr', '{"group":"qasr","axis":0}'),
  ('term_axis', 'GT:balagha_maani:qasr_innama', 'qasr', '{"group":"qasr","axis":0}'),
  ('term_axis', 'GT:balagha_maani:qasr_nafy_istithna', 'qasr', '{"group":"qasr","axis":0}'),
  ('term_axis', 'GT:balagha_maani:ijaz_qasr', 'qasr', '{"group":"qasr","axis":0}'),
  ('term_axis', 'GT:balagha_maani:qasr_ifrad', 'qasr', '{"group":"qasr","axis":1}'),
  ('term_axis', 'GT:balagha_maani:qasr_qalb', 'qasr', '{"group":"qasr","axis":1}'),
  ('term_axis', 'GT:balagha_maani:qasr_tayin', 'qasr', '{"group":"qasr","axis":1}'),
  ('term_axis', 'GT:balagha_maani:taqdim_maful', 'qasr', '{"group":"qasr","axis":2}'),
  ('term_axis', 'GT:balagha_maani:taqdim_mamulat', 'qasr', '{"group":"qasr","axis":2}'),
  ('term_axis', 'GT:balagha_bayan:majaz_mursal', 'majaz', '{"group":"majaz","axis":0}'),
  ('term_axis', 'GT:balagha_bayan:alaqa_aliyya', 'majaz', '{"group":"majaz","axis":1}'),
  ('term_axis', 'GT:balagha_bayan:alaqa_halliyya', 'majaz', '{"group":"majaz","axis":1}'),
  ('term_axis', 'GT:balagha_bayan:alaqa_juziyya', 'majaz', '{"group":"majaz","axis":1}'),
  ('term_axis', 'GT:balagha_bayan:alaqa_kulliyya', 'majaz', '{"group":"majaz","axis":1}'),
  ('term_axis', 'GT:balagha_bayan:alaqa_ma_kana', 'majaz', '{"group":"majaz","axis":1}'),
  ('term_axis', 'GT:balagha_bayan:alaqa_ma_yakun', 'majaz', '{"group":"majaz","axis":1}'),
  ('term_axis', 'GT:balagha_bayan:alaqa_mahalliyya', 'majaz', '{"group":"majaz","axis":1}'),
  ('term_axis', 'GT:balagha_bayan:alaqa_musabbabiyya', 'majaz', '{"group":"majaz","axis":1}'),
  ('term_axis', 'GT:balagha_bayan:alaqa_sababiyya', 'majaz', '{"group":"majaz","axis":1}'),
  ('term_axis', 'GT:idafa_kind:lafziya', 'idafa', '{"group":"idafa","axis":0}'),
  ('term_axis', 'GT:idafa_kind:manawiya', 'idafa', '{"group":"idafa","axis":0}'),
  ('term_axis', 'GT:idafa_kind:bimana_fi', 'idafa', '{"group":"idafa","axis":1}'),
  ('term_axis', 'GT:idafa_kind:bimana_lam', 'idafa', '{"group":"idafa","axis":1}'),
  ('term_axis', 'GT:idafa_kind:bimana_min', 'idafa', '{"group":"idafa","axis":1}'),
  ('term_axis', 'GT:idafa_kind:masdar', 'idafa', '{"group":"idafa","axis":1}'),
  ('term_axis', 'GT:idafa_kind:masdar_fail', 'idafa', '{"group":"idafa","axis":1}'),
  ('term_axis', 'GT:idafa_kind:masdar_maful', 'idafa', '{"group":"idafa","axis":1}'),
  ('term_axis', 'GT:idafa_kind:masdar_zarf', 'idafa', '{"group":"idafa","axis":1}'),
  ('term_axis', 'GT:idafa_kind:mawsuf_sifa', 'idafa', '{"group":"idafa","axis":1}'),
  ('term_axis', 'GT:idafa_kind:mumtani', 'idafa', '{"group":"idafa","axis":1}'),
  ('term_axis', 'GT:idafa_kind:tafdil', 'idafa', '{"group":"idafa","axis":1}'),
  ('term_axis', 'GT:idafa_kind:tashrif', 'idafa', '{"group":"idafa","axis":1}'),
  ('term_axis', 'GT:harf_maani:zaida', 'zaida', '{"group":"zaida","axis":0}'),
  ('term_axis', 'GT:harf_maani:min_zaida', 'zaida', '{"group":"zaida","axis":1}');
