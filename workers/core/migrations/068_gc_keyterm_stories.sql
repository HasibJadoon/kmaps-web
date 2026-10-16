-- 068 — the global concepts the Qurʾān's key-term stories name (QR qr_164 qr_keyterm_story): each story is one
-- concept, each of its steps a concept it unfolds. Named first by QR; mirrored to its gc_concept.
INSERT OR IGNORE INTO core_concept (id, uid, concept_key, label_en, label_ar, domain, origin, note_md) VALUES
('GC:quran:kitab',          lower(hex(randomblob(13))), 'kitab',          'The Book (al-Kitāb)',                 'الكِتَاب',            'quran',    'qr', 'The revealed Book: kept in the Preserved Tablet, brought down by Jibrīl, sent down in Ramaḍān.'),
('GC:quran:tanzil',         lower(hex(randomblob(13))), 'tanzil',         'Sending down in stages (tanzīl)',      'التَّنْزِيل',          'quran',    'qr', 'The Qurʾān sent down from God, in parts over time, with the truth, in Arabic, upon the Prophet''s heart.'),
('GC:quran:lawh_mahfuz',    lower(hex(randomblob(13))), 'lawh_mahfuz',    'The Preserved Tablet',                 'اللَّوْحُ المَحْفُوظ',  'quran',    'qr', 'Q 85:22.'),
('GC:quran:umm_al_kitab',   lower(hex(randomblob(13))), 'umm_al_kitab',   'The Mother of the Book',               'أُمُّ الكِتَاب',        'quran',    'qr', 'Q 43:4, 13:39.'),
('GC:quran:tawrat',         lower(hex(randomblob(13))), 'tawrat',         'The Torah',                            'التَّوْرَاة',           'quran',    'qr', 'Q 3:3, 46:30.'),
('GC:quran:laylat_al_qadr', lower(hex(randomblob(13))), 'laylat_al_qadr', 'The Night of Decree',                  'لَيْلَةُ القَدْر',      'quran',    'qr', 'Q 97:1, 44:3, 2:185.'),
('GC:theology:jibril',      lower(hex(randomblob(13))), 'jibril',         'Jibrīl, the Trustworthy Spirit',       'جِبْرِيلُ الرُّوحُ الأَمِين', 'theology', 'qr', 'Q 26:193, 2:97, 53:5–6, 81:19–21.'),
('GC:theology:jinn',        lower(hex(randomblob(13))), 'jinn',           'The jinn',                             'الجِنّ',              'theology', 'qr', 'Q 72:1–2, 72:8–9, 46:29–31.');
INSERT OR IGNORE INTO core_concept (id, uid, concept_key, label_en, label_ar, domain, origin, note_md) VALUES
('GC:theology:ilah',  lower(hex(randomblob(13))), 'ilah',  'A god (ilāh): whatever is served and obeyed', 'الإِلَٰه', 'theology', 'qr', 'Q 25:43, 21:25, 28:38, 21:22, 3:18, 40:3.'),
('GC:theology:allah', lower(hex(randomblob(13))), 'allah', 'Allāh: the name, and its history',           'اللَّه',  'theology', 'qr', 'Q 29:61, 39:3, 17:110; Sinai, Key Terms, “allāh”.');
