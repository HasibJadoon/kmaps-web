-- 054 · Two more rules for authored drills (owner, 2026-10-14):
--   "meaning and concept centre — not information about people or book names or year, publish dates"
--   "concept always with examples, such that it covers all shapes and layers of the concept"
INSERT OR REPLACE INTO cyb_agent_rule (id, domain, db_scope, applies_to, trigger_md, rule_md, rationale_md, antipattern, correct, check_sql, expected, severity, discovered_on, status) VALUES
('AGR:DRL:009', 'drill', 'km_core', 'cyb_drill', 'Writing a prompt, an answer or a choice',
 'Meaning and concept only: no question, answer or choice asks or names who said it, which book or lexicon, a school, a year or a date. The source is cited in the explanation, never asked.',
 'Owner, 2026-10-14: master the concept, not information about people, books or dates.',
 'Who glosses it? · Which book has this bāb? · Whose position is this? · (d. 310 AH)',
 'What does it mean here? · Which device is it? · Why is this rendering stronger?',
 'SELECT count(*) FROM cyb_drill d WHERE d.status = ''live'' AND EXISTS (SELECT 1 FROM (SELECT json_extract(d.payload_json, ''$.prompt'') AS t UNION ALL SELECT json_extract(d.payload_json, ''$.answer'') UNION ALL SELECT value FROM json_each(d.payload_json, ''$.options'')) x WHERE lower(x.t) LIKE ''%which book%'' OR lower(x.t) LIKE ''%which lexicon%'' OR lower(x.t) LIKE ''%which mufassir%'' OR lower(x.t) LIKE ''%which scholar%'' OR lower(x.t) LIKE ''%according to %'' OR lower(x.t) LIKE ''%published%'' OR x.t GLOB ''*[0-9][0-9][0-9] AH*'' OR x.t GLOB ''*(d. [0-9]*'') OR EXISTS (SELECT 1 FROM (SELECT lower(COALESCE(json_extract(d.payload_json, ''$.prompt''), '''')) AS q) y WHERE y.q LIKE ''who %'' OR y.q LIKE ''whose %'' OR y.q LIKE ''%who said%'' OR y.q LIKE ''%who says%'' OR y.q LIKE ''%who wrote%'' OR y.q LIKE ''%who gloss%'' OR y.q LIKE ''%who state%'' OR y.q LIKE ''%whose position%'' OR y.q LIKE ''%whose reading%'' OR y.q LIKE ''%whose rendering%'' OR y.q LIKE ''%whose view%'')',
 0, 'critical', '2026-10-14', 'live'),
('AGR:DRL:010', 'drill', 'km_core', 'cyb_drill', 'A drill on a concept (naḥw, balāgha, meaning)',
 'A concept is always met in an example: the drill shows it in an āyah, a line or an Arabic phrase (its words, or an Arabic prompt) — never as a bare definition. Over a concept''s drills, the examples should cover its shapes and layers (different forms, positions, sources).',
 'Owner, 2026-10-14: concepts with examples, every flavour; a definition alone is information, not mastery.',
 'Which term means X? with no example', 'the marked words of an āyah: which device / role / sense is this?',
 'SELECT count(*) FROM cyb_drill WHERE status = ''live'' AND discipline IN (''NH'', ''BL'', ''DL'', ''TF'') AND interaction IN (''choose'', ''choose_all'', ''odd_one_out'') AND json_type(payload_json, ''$.words'') IS NOT ''array'' AND COALESCE(json_extract(payload_json, ''$.prompt''), '''') NOT GLOB ''*[ء-ي]*'' AND NOT EXISTS (SELECT 1 FROM json_each(payload_json, ''$.options'') o WHERE o.value GLOB ''*[ء-ي]*'')',
 0, 'high', '2026-10-14', 'live');
