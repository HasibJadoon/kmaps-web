-- The Qurʾān's drill styles read as the Arabic ones (owner, 2026-10-14): the same tiles, inside each surah / unit of the path.
UPDATE qr_study_label SET label = 'Words', label_ar = 'المَعَانِي' WHERE scope = 'skill' AND key = 'vocab';
UPDATE qr_study_label SET label = 'Word forms' WHERE scope = 'skill' AND key = 'sarf';
