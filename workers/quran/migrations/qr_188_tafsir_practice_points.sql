-- qr_188 — each practice attempt also carries the tafsīr points its sentence teaches: what the scholar is doing (method) and the
-- key point it makes about the āyah. [{kind: method|key_point|link, point, ayah_ref}] — later authored into drills with the weak items.
ALTER TABLE qr_tafsir_practice_attempt ADD COLUMN tafsir_points_json TEXT NOT NULL DEFAULT '[]';
