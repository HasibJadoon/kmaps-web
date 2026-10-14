-- 052 · The authored drill bank (plan Phase 1, A0): drills Claude writes under the Cybernetics rules, one row per
-- drill, keyed by its global id (DRL:<domain>:<discipline>:<id>, core 050). No faces — the drill itself is the
-- payload. A drill goes live only when every AGR:DRL rule's check_sql finds nothing wrong with it; lessons deal
-- live drills of their scope; review replays the same drill by gid.
CREATE TABLE IF NOT EXISTS cyb_drill (
  gid          TEXT PRIMARY KEY,                     -- DRL:<cyb_domain.code>:<cyb_discipline.code>:<id>
  domain       TEXT NOT NULL,                        -- AR · QR · WV
  discipline   TEXT NOT NULL,                        -- cyb_discipline.code
  kind         TEXT NOT NULL,                        -- cyb_drill_type kind
  interaction  TEXT,                                 -- choose · tiles · pairs …
  skill        TEXT,                                 -- the focus it is dealt under (fill, sarf, translation …)
  work_ref     TEXT,                                 -- the lesson: QR:SURAH:44, ACQ:…, WV:arc:…
  intro_surah  INTEGER, intro_ayah INTEGER,          -- the āyah it is met at (Qurʾān)
  payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),   -- the drill as dealt
  sources_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(sources_json)),
  author       TEXT NOT NULL DEFAULT 'claude',
  authored_by  TEXT,                                 -- the script / skill run that wrote it
  status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'live', 'retired')),
  version      INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_cyb_drill_scope ON cyb_drill (domain, work_ref, intro_ayah, status);

-- The rules authored drills are held to (AGR:DRL). Each check_sql counts the drills that break it; expected 0.
INSERT OR REPLACE INTO cyb_agent_rule (id, domain, db_scope, applies_to, trigger_md, rule_md, rationale_md, antipattern, correct, check_sql, expected, severity, discovered_on, status) VALUES
('AGR:DRL:001', 'drill', 'km_core', 'cyb_drill', 'Authoring any drill',
 'Every drill is classified: its discipline is a live code of cyb_discipline, never XX.',
 'The id names the domain and sub-domain (owner, 2026-10-14); an unclassified drill cannot be found or measured.',
 'discipline XX, or a code no registry row has', 'set drill.discipline, or add the kind to cyb_drill_type',
 'SELECT count(*) FROM cyb_drill d WHERE d.status = ''live'' AND (d.discipline = ''XX'' OR NOT EXISTS (SELECT 1 FROM cyb_discipline c WHERE c.code = d.discipline))',
 0, 'critical', '2026-10-14', 'live'),
('AGR:DRL:002', 'drill', 'km_core', 'cyb_drill', 'Authoring any drill',
 'The global id is the standard: DRL:<domain>:<discipline>:<the drill''s own id>.',
 'One drill, one id, for every learner, session and surface.', 'a free-form id', 'build gid from the three parts',
 'SELECT count(*) FROM cyb_drill WHERE status = ''live'' AND gid <> ''DRL:'' || domain || '':'' || discipline || '':'' || json_extract(payload_json, ''$.id'')',
 0, 'critical', '2026-10-14', 'live'),
('AGR:DRL:003', 'drill', 'km_core', 'cyb_drill', 'A drill answered by choosing',
 'A choice drill offers at least three choices, and its answer is one of them.',
 'Two choices is a coin toss; an answer that is not offered cannot be chosen.', 'two options; an answer missing from options',
 'near-misses of the same category, the answer among them',
 'SELECT count(*) FROM cyb_drill d WHERE d.status = ''live'' AND json_type(d.payload_json, ''$.options'') = ''array'' AND json_type(d.payload_json, ''$.correct'') IS NULL AND (json_array_length(d.payload_json, ''$.options'') < 3 OR NOT EXISTS (SELECT 1 FROM json_each(d.payload_json, ''$.options'') o WHERE o.value = json_extract(d.payload_json, ''$.answer'')))',
 0, 'high', '2026-10-14', 'live'),
('AGR:DRL:004', 'drill', 'km_core', 'cyb_drill', 'A drill answered by choosing',
 'No two choices are the same.', 'A duplicate choice is a giveaway or a trap.', 'the same option twice', 'distinct options',
 'SELECT count(*) FROM cyb_drill d WHERE d.status = ''live'' AND json_type(d.payload_json, ''$.options'') = ''array'' AND (SELECT count(*) FROM json_each(d.payload_json, ''$.options'')) <> (SELECT count(DISTINCT value) FROM json_each(d.payload_json, ''$.options''))',
 0, 'high', '2026-10-14', 'live'),
('AGR:DRL:005', 'drill', 'km_core', 'cyb_drill', 'A matching drill',
 'A matching set has at least three pairs.', 'Two pairs match themselves.', 'two pairs', 'three to six pairs',
 'SELECT count(*) FROM cyb_drill WHERE status = ''live'' AND json_type(payload_json, ''$.pairs'') = ''array'' AND json_array_length(payload_json, ''$.pairs'') < 3',
 0, 'high', '2026-10-14', 'live'),
('AGR:DRL:006', 'drill', 'km_core', 'cyb_drill', 'Authoring any drill',
 'Nothing is typed: every drill is answered by selecting (choose, choose_all, odd_one_out, translate_pick, tiles, listen_tiles, listen_mark, pairs, order_units, shadow, table).',
 'Owner, 2026-10-14: no typing, ever.', 'a typed answer', 'tiles or choices built from the answer',
 'SELECT count(*) FROM cyb_drill WHERE status = ''live'' AND interaction IS NOT NULL AND interaction NOT IN (''choose'', ''choose_all'', ''odd_one_out'', ''translate_pick'', ''tiles'', ''listen_tiles'', ''listen_mark'', ''pairs'', ''order_units'', ''shadow'', ''table'')',
 0, 'high', '2026-10-14', 'live'),
('AGR:DRL:007', 'drill', 'km_core', 'cyb_drill', 'Authoring any drill',
 'Concept only: no drill of a kind retired for asking about a person, a book, a school or where something stands.',
 'Owner, 2026-10-14: concepts with examples, never information gathering; the source is cited, never asked.',
 'who says / which book / whose position', 'ask the concept; cite the source in the explanation',
 'SELECT count(*) FROM cyb_drill d JOIN cyb_drill_type t ON t.domain = d.domain AND t.scope = ''kind'' AND t.code = d.kind WHERE d.status = ''live'' AND t.status = ''retired''',
 0, 'critical', '2026-10-14', 'live'),
('AGR:DRL:008', 'drill', 'km_core', 'cyb_drill', 'A drill over an āyah or a line',
 'A drill shown over a line someone recited or said carries its recording.', 'Context and audio first: the ear learns with the eye.',
 'words without audio', 'the line''s clip (reciter 7) or a SILMA / Kokoro clip',
 'SELECT count(*) FROM cyb_drill WHERE status = ''live'' AND json_type(payload_json, ''$.words'') = ''array'' AND json_extract(payload_json, ''$.audio.url'') IS NULL',
 0, 'medium', '2026-10-14', 'live');
