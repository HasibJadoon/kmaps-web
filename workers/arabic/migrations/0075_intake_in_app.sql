-- An intake source whose episodes are already in the app (its domain pipeline reached 'aligned' or 'live')
-- leaves the active backlog: status 'in_app'. The inbox status stays triage-only otherwise; this is its last
-- state, set when the content is loaded, so a finished source never reads as still waiting.
INSERT OR REPLACE INTO ar_practice_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort)
VALUES ('intake_status', 'in_app', 'In the app', 'فِي التَّطْبِيق',
        'Downloaded and loaded — its episodes are in the app', 'checkmark.circle.fill', '#2E9E6B', 7,
        '{"active":false}', 7);

UPDATE ar_intake_item SET status = 'in_app', updated_at = datetime('now')
 WHERE parent_id IS NULL AND status IN ('logged', 'queued')
   AND id IN (SELECT intake_id FROM ar_intake_pipeline WHERE stage IN ('aligned', 'live'));
