-- Fixes from the check of every drill Ghāfir 40:1–3 deals (2026-10-02), reviewed by the owner:
-- the sentence step's words in plain English with Arabic terms (never transliteration); the 40:2
-- ellipsis on the well-known reading; four tafsīr questions and two passage questions corrected
-- against their own lines; three passage questions that repeat others retired; four typos in the
-- recorded tafsīr lines. (The tafsīr lines' cuts, the ring drill and the Read step's options are
-- fixed in the drill builders.)

-- ── the sentence step, in plain words ────────────────────────────────────────────────────────
UPDATE qr_study_label SET label = 'Listen — does the marked sentence start with a noun or a verb?' WHERE scope = 'kind' AND key = 'ss_kind';
UPDATE qr_study_label SET label = 'Does the marked sentence stand on its own, or take a word’s place?' WHERE scope = 'kind' AND key = 'ss_mahall';
UPDATE qr_study_label SET label = 'What does the marked sentence do here?' WHERE scope = 'kind' AND key = 'ss_role';
UPDATE qr_study_label SET label = 'The grammar books read the marked sentence in different ways — how does this one read it?' WHERE scope = 'kind' AND key = 'ss_books';
UPDATE qr_study_label SET label = 'A word is left unsaid in the marked words. Which one?' WHERE scope = 'kind' AND key = 'ss_ellipsis';
UPDATE qr_study_label SET label = 'What gives the marked words their extra meaning?' WHERE scope = 'kind' AND key = 'ss_nuance';
UPDATE qr_study_label SET label = 'Build the translation, step by step, into fluent English' WHERE scope = 'kind' AND key = 'ss_buildup';
UPDATE qr_study_label SET label = 'Why is it translated this way?' WHERE scope = 'kind' AND key = 'ss_why';

UPDATE qr_study_label SET label = 'A sentence that starts with a noun (جملة اسمية)' WHERE scope = 'ss_kind' AND key = 'ismiyya';
UPDATE qr_study_label SET label = 'A sentence that starts with a verb (جملة فعلية)' WHERE scope = 'ss_kind' AND key = 'filiyya';
UPDATE qr_study_label SET label = 'A phrase, not a full sentence — a preposition or a time or place word with its noun (شبه جملة)' WHERE scope = 'ss_kind' AND key = 'shibh';

UPDATE qr_study_label SET label = 'It stands on its own (لا محل لها من الإعراب)' WHERE scope = 'ss_mahall' AND key = 'none';
UPDATE qr_study_label SET label = 'It takes a noun’s place, in رفع (في محل رفع)' WHERE scope = 'ss_mahall' AND key = 'raf';
UPDATE qr_study_label SET label = 'It takes a noun’s place, in نصب (في محل نصب)' WHERE scope = 'ss_mahall' AND key = 'nasb';
UPDATE qr_study_label SET label = 'It takes a noun’s place, in جر (في محل جر)' WHERE scope = 'ss_mahall' AND key = 'jarr';
UPDATE qr_study_label SET label = 'It takes a verb’s place, in جزم (في محل جزم)' WHERE scope = 'ss_mahall' AND key = 'jazm';

UPDATE qr_study_label SET label = 'It opens the speech (ابتدائية)' WHERE scope = 'ss_role' AND key = 'ibtidaiyya';
UPDATE qr_study_label SET label = 'It starts afresh (استئنافية)' WHERE scope = 'ss_role' AND key = 'istinafiyya';
UPDATE qr_study_label SET label = 'It answers a question the listener would ask (استئناف بياني)' WHERE scope = 'ss_role' AND key = 'istinaf_bayani';
UPDATE qr_study_label SET label = 'It gives the reason (تعليلية)' WHERE scope = 'ss_role' AND key = 'talil';
UPDATE qr_study_label SET label = 'An aside, set between two linked parts (اعتراضية)' WHERE scope = 'ss_role' AND key = 'itiradiyya';
UPDATE qr_study_label SET label = 'It explains what came before (تفسيرية)' WHERE scope = 'ss_role' AND key = 'tafsiriyya';
UPDATE qr_study_label SET label = 'It completes الذي / التي … (صلة الموصول)' WHERE scope = 'ss_role' AND key = 'sila';
UPDATE qr_study_label SET label = 'It follows أنْ or ما and works like a noun (صلة الموصول الحرفي)' WHERE scope = 'ss_role' AND key = 'sila_harfi';
UPDATE qr_study_label SET label = 'What the oath swears to (جواب القسم)' WHERE scope = 'ss_role' AND key = 'jawab_qasam';
UPDATE qr_study_label SET label = 'The result of إذا / لو / لولا (جواب شرط غير جازم)' WHERE scope = 'ss_role' AND key = 'jawab_shart';
UPDATE qr_study_label SET label = 'The result of إنْ / مَنْ … (جواب شرط جازم)' WHERE scope = 'ss_role' AND key = 'jawab_shart_jazim';
UPDATE qr_study_label SET label = 'What is said to the one called (جواب النداء)' WHERE scope = 'ss_role' AND key = 'jawab_nida';
UPDATE qr_study_label SET label = 'What follows from a command or request (جواب الطلب)' WHERE scope = 'ss_role' AND key = 'jawab_talab';
UPDATE qr_study_label SET label = 'It tells us about the subject (خبر)' WHERE scope = 'ss_role' AND key = 'khabar';
UPDATE qr_study_label SET label = 'It describes the state at that moment (حال)' WHERE scope = 'ss_role' AND key = 'hal';
UPDATE qr_study_label SET label = 'It describes a noun (نعت)' WHERE scope = 'ss_role' AND key = 'naat';
UPDATE qr_study_label SET label = 'The words that were said (مقول القول)' WHERE scope = 'ss_role' AND key = 'maqul_qawl';
UPDATE qr_study_label SET label = 'It is what the verb acts on (مفعول به)' WHERE scope = 'ss_role' AND key = 'maful_bih';
UPDATE qr_study_label SET label = 'It completes إذ / إذا / حين … (مضاف إليه)' WHERE scope = 'ss_role' AND key = 'mudaf_ilayh';
UPDATE qr_study_label SET label = 'It stands in for the doer of a passive verb (نائب الفاعل)' WHERE scope = 'ss_role' AND key = 'naib_fail';
UPDATE qr_study_label SET label = 'It says again what came before, more clearly (بدل)' WHERE scope = 'ss_role' AND key = 'badal';
UPDATE qr_study_label SET label = 'The «if» itself (فعل الشرط)' WHERE scope = 'ss_role' AND key = 'shart';
UPDATE qr_study_label SET label = 'Joined by «and» to another sentence (معطوفة)' WHERE scope = 'ss_role' AND key = 'maatufa';

UPDATE qr_study_label SET label = 'a verb (فعل)' WHERE scope = 'ss_pos' AND key = 'V';
UPDATE qr_study_label SET label = 'a noun (اسم)' WHERE scope = 'ss_pos' AND key = 'N';
UPDATE qr_study_label SET label = 'a name (اسم علم)' WHERE scope = 'ss_pos' AND key = 'PN';
UPDATE qr_study_label SET label = 'a pronoun (ضمير)' WHERE scope = 'ss_pos' AND key = 'PRON';
UPDATE qr_study_label SET label = 'a pointing word — this, that (اسم إشارة)' WHERE scope = 'ss_pos' AND key = 'DEM';
UPDATE qr_study_label SET label = 'a linking word — who, which (اسم موصول)' WHERE scope = 'ss_pos' AND key = 'REL';
UPDATE qr_study_label SET label = 'a describing word (صفة)' WHERE scope = 'ss_pos' AND key = 'ADJ';
UPDATE qr_study_label SET label = 'a word that acts as a command (اسم فعل)' WHERE scope = 'ss_pos' AND key = 'IMPN';

UPDATE qr_study_label SET label = 'The beauty of expression (بلاغة)' WHERE scope = 'ss_driver' AND key = 'balagha';
UPDATE qr_study_label SET label = 'The grammar (نحو)' WHERE scope = 'ss_driver' AND key = 'grammar';
UPDATE qr_study_label SET label = 'A reading the grammar books give (وجه إعرابي)' WHERE scope = 'ss_driver' AND key = 'reading';
UPDATE qr_study_label SET label = 'A fine point of meaning (نكتة)' WHERE scope = 'ss_driver' AND key = 'nuance';
UPDATE qr_study_label SET label = 'The flow of the passage (سياق)' WHERE scope = 'ss_driver' AND key = 'discourse';
UPDATE qr_study_label SET label = 'The word’s own meaning (دلالة اللفظ)' WHERE scope = 'ss_driver' AND key = 'lexical';

UPDATE qr_study_label SET label = 'The subject (المبتدأ)' WHERE scope = 'ss_ellipsis' AND key = 'hadhf_mubtada';
UPDATE qr_study_label SET label = 'What is said about the subject (الخبر)' WHERE scope = 'ss_ellipsis' AND key = 'hadhf_khabar';
UPDATE qr_study_label SET label = 'The verb (الفعل)' WHERE scope = 'ss_ellipsis' AND key = 'hadhf_fil';
UPDATE qr_study_label SET label = 'What the verb acts on (المفعول به)' WHERE scope = 'ss_ellipsis' AND key = 'hadhf_maful';
UPDATE qr_study_label SET label = 'The result of the «if» (جواب الشرط)' WHERE scope = 'ss_ellipsis' AND key = 'hadhf_jawab_shart';
UPDATE qr_study_label SET label = 'What the oath swears to (جواب القسم)' WHERE scope = 'ss_ellipsis' AND key = 'hadhf_jawab_qasam';
UPDATE qr_study_label SET label = 'The noun being described (الموصوف)' WHERE scope = 'ss_ellipsis' AND key = 'hadhf_mawsuf';
UPDATE qr_study_label SET label = 'The first word of a pair like «the Book of God» (المضاف)' WHERE scope = 'ss_ellipsis' AND key = 'hadhf_mudaf';
UPDATE qr_study_label SET label = 'The calling word يا (حرف النداء)' WHERE scope = 'ss_ellipsis' AND key = 'hadhf_harf_nida';

-- the Sentences step holds the drills that teach the sentence in plain terms and the ones that build its
-- translation; 'which book reads it so' (a who-said-it question) and the fine-point drills (their wrong
-- options are other passages' notes) wait until they are rewritten plainly
UPDATE qr_study_label SET extra_json = json_set(extra_json, '$.only', json('{"ss":["ss_kind","ss_mahall","ss_role","ss_ellipsis","ss_buildup","ss_why"]}'))
 WHERE scope = 'class_node' AND key = 'sentences';

-- ── 40:2: what is left unsaid, on the well-known reading ───────────────────────────────────────
UPDATE qr_ss_ellipsis_event
   SET ellipsis_type = 'hadhf_mubtada',
       elided_element = '«هَذَا» أَوْ «هَذِهِ السُّورَةُ» — وَ«تَنْزِيلُ الْكِتَابِ» خَبَرُهُ',
       rhetorical_effect = 'Read as «This is the Book sent down from God»: the passage opens by pointing to what you are hearing, and names where it comes from.',
       note_md = 'The grammar books also read it another way: «The sending down of the Book is from God» — then nothing is left unsaid.'
 WHERE id = 'QR:EL:40:2:khabar';

-- ── tafsīr questions, held to their own lines ───────────────────────────────────────────────────
UPDATE qr_tafsir_question SET
  question_en = 'ٱلْعَزِيزِ can mean two things. Which one fits this verse, as the commentary explains it?',
  interaction = 'choose',
  options_json = '["The One who has no like","The Overpowering, whom no one equals in power","The Beloved","The One hidden from sight"]',
  correct_json = '[0]',
  explain_en = 'ٱلْعَزِيز can mean the overpowering one, or the one who has no like (الَّذِي لَا مِثْلَ لَهُ). Here it is the second: the commentary rules out “the Powerful” for this verse.',
  updated_at = datetime('now')
 WHERE id = 'QR:TQ:40:1-3:06';

UPDATE qr_tafsir_question SET
  question_en = 'شَدِيدِ ٱلْعِقَابِ is joined to its noun in a way that does not make it definite, unlike the names around it. One reading says it was left so on purpose. What does that add?',
  explain_en = 'Left indefinite and open on purpose (تَعَمَّدَ تَنْكِيرَهُ وَإِبْهَامَهُ): to point to a severity beyond anything — nothing harder or more bitter — and so to sharpen the warning.',
  updated_at = datetime('now')
 WHERE id = 'QR:TQ:40:1-3:17';

UPDATE qr_tafsir_question SET
  interaction = 'choose',
  options_json = '["His favour in holding back a punishment He could justly bring","That the punishment lasts only a short time","That the severe punishment is cancelled for everyone","That He needs His servants to repent"]',
  correct_json = '[0]',
  explain_en = 'ذِي ٱلطَّوْلِ — the Possessor of favour — comes right after شَدِيدِ ٱلْعِقَابِ, so the favour is read in that very matter: He may hold back a punishment He has every right to bring.',
  updated_at = datetime('now')
 WHERE id = 'QR:TQ:40:1-3:19';

UPDATE qr_tafsir_question SET
  question_en = 'A man given to drink was sent these verses (حمٓ … إِلَيْهِ ٱلْمَصِيرُ) in a letter. What did he take from them?',
  options_json = '["That God promised to forgive him, and warned him of His punishment","That his sin could never be forgiven","That punishment was certain whatever he did","That he need not change"]',
  explain_en = 'He read it again and again, saying: قَدْ وَعَدَنِي ٱللَّهُ أَنْ يَغْفِرَ لِي، وَحَذَّرَنِي عِقَابَهُ — God has promised to forgive me, and has warned me of His punishment — until he wept and turned back.',
  updated_at = datetime('now')
 WHERE id = 'QR:TQ:40:1-3:23';

-- ── passage questions ───────────────────────────────────────────────────────────────────────────
UPDATE qr_study_question SET options_json = json_set(options_json, '$.explain_en',
  'تَنزِيل is the مصدر of نَزَّلَ, whose doubled middle letter often carries the sense of doing a thing part by part. The Qurʾān came that way, over years: when the deniers asked why it was not sent down all at once, the answer was كَذَٰلِكَ لِنُثَبِّتَ بِهِ فُؤَادَكَ — so that We may make your heart firm by it (25:32).'),
  updated_at = datetime('now') WHERE id = 'QR:Q:40:1:03';

UPDATE qr_study_question SET options_json = json_set(options_json,
  '$.options', json('["Because شَدِيد is joined to its own noun (شَدِيدٌ عِقَابُهُ), which leaves it indefinite beside a definite name","Because شَدِيد is a verb, not a noun, so it cannot describe a name","Because شَدِيد is plural, while the name ٱللَّه is singular","Because شَدِيد alone stands in a different case from the names around it"]'),
  '$.correct', json('[0]'),
  '$.explain_en', 'شَدِيد joined to its own noun (شَدِيدٌ عِقَابُهُ) does not become definite, so on its own it should not describe ٱللَّه, the most definite name. It is read as a description all the same — His names are lasting, so it counts as definite — or as a word that says again what came before (بَدَل).'),
  updated_at = datetime('now') WHERE id = 'QR:Q:40:1:06';

-- repeats of other drills: Q02 of Q01 (العليم beside الحكيم), Q07 of tafsīr Q13, Q11 of tafsīr Q05
UPDATE qr_study_question SET status = 'draft', updated_at = datetime('now') WHERE id IN ('QR:Q:40:1:02', 'QR:Q:40:1:07', 'QR:Q:40:1:11');

-- ── the recorded tafsīr lines: four typos (each keeps its word count, so the timings hold) ───────
UPDATE qr_tafsir_audio_segment SET text_ar = replace(text_ar, 'رَمَزٌ', 'رَمْزٌ') WHERE id = 'SEG:QRTA:ibn_ashur:y-m2kq2xlU4DM-02:18';
UPDATE qr_tafsir_audio_segment SET text_ar = replace(text_ar, 'المَصِيُرُ', 'المَصِيرُ') WHERE id = 'SEG:QRTA:ibn_ashur:y-m2kq2xlU4DM-02:46';
UPDATE qr_tafsir_audio_segment SET text_ar = replace(text_ar, 'وتَقْدِيُمُ', 'وتَقْدِيمُ') WHERE id = 'SEG:QRTA:ibn_ashur:y-m2kq2xlU4DM-02:49';
UPDATE qr_tafsir_audio_segment SET text_ar = 'أخوات في معنى الرجوع. والطول: الفضل والزيادة.' WHERE id = 'SEG:QRTA:zamakhshari:40-01:8'
   AND text_ar = 'أخوات في معنى الرجوع والطول والفضل والزياد.';
