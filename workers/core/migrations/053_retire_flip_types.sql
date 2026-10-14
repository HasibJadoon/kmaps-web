-- 053 · The flip-card model leaves the data (owner, 2026-10-14). The flip types of cyb_card_type (front/back
-- templates, note types) are retired; the drill types live in cyb_drill_type (050) and the authored drills in
-- cyb_drill (052). Kept, not deleted: their history still explains the old review rows.
UPDATE cyb_card_type SET status = 'retired',
       note = COALESCE(note || ' · ', '') || 'retired 2026-10-14: superseded by cyb_drill_type (050) and cyb_drill (052)'
 WHERE status <> 'retired';
