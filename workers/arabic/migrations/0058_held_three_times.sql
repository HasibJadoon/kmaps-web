-- A drill graduates into review after three right answers in its lesson (core GRADUATE_AFTER, owner 2026-10-15).
UPDATE ar_practice_label SET label = '{n} not yet in review — they come round until you get each right three times' WHERE scope = 'stage' AND key = 'held';
