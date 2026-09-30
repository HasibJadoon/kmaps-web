-- qr_052_translation_choices.sql
--
-- Translation choices: how the English translators render an Arabic feature, measured
-- across the whole Qurʾān, and drilled at three levels.
--
--   qr_translation_feature       the registry: each feature, what detects it on the Arabic
--                                side, the named English strategies (choices_json, each with the
--                                regex that recognises it, tried in order — a choice with no regex
--                                is the fallback) and the comparisons a drill can ask (compare_json)
--   qr_translation_feature_ayah  where each feature stands: the āyah and the word(s) carrying it
--   qr_translation_choice        (āyah, feature, translation) → the choice taken, the words matched
--   qr_translation_profile       (feature, translation, choice) → n, share, lift — each translator's habit
--
-- The last three are computed by kmaps-resources/scripts/quran/translation_choices.py, which
-- reads this registry, pulls the words (qr_word_occurrence) and every English translation
-- (qr_translation, all English sources but the transliteration), classifies, and writes back.
-- It updates each feature's counts last, which moves the 'rest' cache version.
--
-- Apply with `d1 execute --file` (see qr_046: do not `migrations apply` km_quran).

CREATE TABLE IF NOT EXISTS qr_translation_feature (
  key             TEXT PRIMARY KEY,
  label_en        TEXT NOT NULL,
  label_ar        TEXT,
  detail          TEXT,                 -- why translators differ here, for the learner
  arabic_detector TEXT NOT NULL,        -- what counts as the feature on the Arabic side
  detector_json   TEXT,                 -- the detector's kind and parameters (lemmas, window …)
  scope           TEXT NOT NULL DEFAULT 'whole',   -- where the English is read: whole | start | end
  window_words    INTEGER,              -- … and how many words of it, for start / end
  choices_json    TEXT NOT NULL,        -- [{key, label, regex, flags, …}] in the order they are tried
  compare_json    TEXT,                 -- [{ask, yes:[choice], no:[choice]} | {ask, by:'min_value'|'max_value'}]
  n_ayat          INTEGER,              -- āyāt where the feature stands (written by the script)
  n_rows          INTEGER,              -- renderings classified
  computed_at     TEXT,
  sort            INTEGER NOT NULL DEFAULT 0
);
CREATE TRIGGER IF NOT EXISTS trg_kcv_qr_translation_feature_i AFTER INSERT ON qr_translation_feature BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;
CREATE TRIGGER IF NOT EXISTS trg_kcv_qr_translation_feature_u AFTER UPDATE ON qr_translation_feature BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;
CREATE TRIGGER IF NOT EXISTS trg_kcv_qr_translation_feature_d AFTER DELETE ON qr_translation_feature BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TABLE IF NOT EXISTS qr_translation_feature_ayah (
  feature      TEXT NOT NULL,
  surah        INTEGER NOT NULL,
  ayah         INTEGER NOT NULL,
  word_indexes TEXT NOT NULL,           -- '1' or '3,4' — qr_word_occurrence.word_index; '' for a whole-āyah feature
  ar_words     TEXT,
  PRIMARY KEY (feature, surah, ayah)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS idx_qr_tfa_ayah ON qr_translation_feature_ayah (surah, ayah);

CREATE TABLE IF NOT EXISTS qr_translation_choice (
  surah      INTEGER NOT NULL,
  ayah       INTEGER NOT NULL,
  feature    TEXT NOT NULL,
  source_id  TEXT NOT NULL,             -- qr_translation_source.id
  choice     TEXT NOT NULL,             -- a key of the feature's choices_json
  evidence   TEXT,                      -- the English words the choice's regex matched
  value      REAL,                      -- the length ratio (English words ÷ Arabic words), for length_ratio
  PRIMARY KEY (surah, ayah, feature, source_id)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS qr_translation_profile (
  feature    TEXT NOT NULL,
  source_id  TEXT NOT NULL,
  choice     TEXT NOT NULL,
  n          INTEGER NOT NULL,          -- renderings taking this choice
  total      INTEGER NOT NULL,          -- renderings of this feature by this translation
  share      REAL NOT NULL,             -- n ÷ total
  lift       REAL,                      -- share ÷ the mean share across translations: a signature is high
  PRIMARY KEY (feature, source_id, choice)
) WITHOUT ROWID;

INSERT OR REPLACE INTO qr_translation_feature (key, label_en, label_ar, detail, arabic_detector, detector_json, scope, window_words, choices_json, compare_json, sort) VALUES
('inna_initial', 'Emphatic inna opening the āyah', 'إِنَّ فِي صَدْرِ الآيَة',
 'إِنَّ (and إِنَّا, إِنَّهُ …) makes a statement emphatic — ‘it is so’. English has no single word for it: some translators give it a word of its own (Lo!, Verily, Indeed, Surely), some move the emphasis inside the clause, some restructure (‘As for …’), and some let the plain statement carry it.',
 'The āyah''s first word is the emphatic particle إِنَّ with or without a suffix (إِنَّا, إِنَّهُ, إِنَّكَ …), alone or after wa-/fa- (QAC lemma إِنّ, POS ACC). إِنَّمَا is its own feature; the question أَئِنَّ is left out.',
 '{"kind": "inna_initial"}', 'start', 12,
 '[{"key": "lo", "label": "Lo! / Behold", "regex": "^\\W*(?:(?:and|so|then|but|for)\\W+)?(?:lo|behold)\\b", "flags": "i", "emphatic": true}, {"key": "verily", "label": "Verily", "regex": "^\\W*(?:(?:and|so|then|but|for)\\W+)?verily\\b", "flags": "i", "emphatic": true}, {"key": "indeed", "label": "Indeed", "regex": "^\\W*(?:(?:and|so|then|but|for)\\W+)?indeed\\b", "flags": "i", "emphatic": true}, {"key": "surely", "label": "Surely / Truly / Certainly", "regex": "^\\W*(?:(?:and|so|then|but|for)\\W+)?(?:most\\s+)?(?:surely|truly|certainly|assuredly|undoubtedly|definitely|really|without\\s+(?:a\\s+)?doubt|no\\s+doubt|of\\s+a\\s+truth|in\\s+truth|in\\s+fact|know\\s+that|be\\s+sure)\\b", "flags": "i", "emphatic": true}, {"key": "as_for", "label": "Restructured: “As for …”", "regex": "^\\W*(?:(?:and|so|then|but)\\W+)?as\\s+(?:for|to|regards)\\b", "flags": "i"}, {"key": "inside", "label": "Emphasis moved inside the clause", "regex": "\\b(?:indeed|surely|truly|certainly|verily|assuredly|most\\s+surely|really)\\b", "flags": "i", "emphatic": true}, {"key": "omitted", "label": "Left unmarked", "regex": null}]',
 '[{"ask": "Which rendering gives the emphasis of إِنَّ a word of its own?", "yes": ["lo", "verily", "indeed", "surely"], "no": ["omitted", "as_for"]}, {"ask": "Which rendering restructures the āyah as “As for …”?", "yes": ["as_for"], "no": ["lo", "verily", "indeed", "surely", "omitted", "inside"]}, {"ask": "Which rendering leaves the emphasis unmarked?", "yes": ["omitted"], "no": ["lo", "verily", "indeed", "surely", "inside"]}]', 0),

('innama', 'Restrictive innamā', 'إِنَّمَا لِلْحَصْر',
 'إِنَّمَا restricts: ‘X is nothing but Y’, ‘only’. Translators choose between ‘only’, ‘but’ (‘he is but a man’), ‘merely/just’, a full ‘nothing but’, or read it as plain emphasis and lose the restriction.',
 'A word إِنَّمَا / فَإِنَّمَا / وَإِنَّمَا — emphatic إِنَّ with the restricting mā (QAC lemma إِنّ followed by the kāffa mā in one written word).',
 '{"kind": "innama"}', 'whole', NULL,
 '[{"key": "nothing_but", "label": "Nothing but / none but / no more than", "regex": "\\b(?:nothing|naught|none|no\\s+one|nobody|no\\s+other)\\s+(?:but|except|save|other\\s+than|else\\s+than|else\\s+but)\\b|\\bno\\s+(?:more|other|less)\\s+than\\b|\\bnot\\b[^.;:,]{0,30}\\b(?:but|except|save)\\b", "flags": "i", "restrictive": true}, {"key": "only", "label": "Only", "regex": "\\bonly\\b", "flags": "i", "restrictive": true}, {"key": "merely", "label": "Merely / just / simply / alone", "regex": "\\b(?:merely|simply|just|solely|mere|alone|exclusively)\\b", "flags": "i", "restrictive": true}, {"key": "but", "label": "“is but …”", "regex": "\\b(?:is|are|was|were|am|art|be|''s|''re)\\s+but\\b", "flags": "i", "restrictive": true}, {"key": "emphasis", "label": "Read as emphasis only (Indeed / Verily …)", "regex": "\\b(?:indeed|verily|surely|truly|certainly|lo|behold)\\b", "flags": "i"}, {"key": "unmarked", "label": "Restriction left unmarked", "regex": null}]',
 '[{"ask": "Which rendering keeps the restriction of إِنَّمَا (only / nothing but)?", "yes": ["nothing_but", "only", "merely", "but"], "no": ["emphasis", "unmarked"]}, {"ask": "Which rendering reads إِنَّمَا as plain emphasis?", "yes": ["emphasis"], "no": ["nothing_but", "only", "merely", "but"]}]', 1),

('qad_past', 'laqad / qad with a past verb', 'لَقَدْ / قَدْ مَعَ المَاضِي',
 'قَدْ before a past verb confirms it (‘has indeed …’); لَقَدْ adds the oath-lām — ‘by God, it has happened’. English can say Verily / Indeed / Certainly, can use ‘already’, can use the present perfect (‘We have sent’) to carry it, or give a plain past.',
 'The particle قَدْ (QAC POS CERT), bare or as لَقَدْ / وَلَقَدْ / فَقَدْ / وَقَدْ, followed within two words by a perfect (past) verb.',
 '{"kind": "qad_past"}', 'whole', NULL,
 '[{"key": "verily", "label": "Verily / Lo", "regex": "\\b(?:verily|lo)\\b", "flags": "i", "emphatic": true}, {"key": "indeed", "label": "Indeed", "regex": "\\bindeed\\b", "flags": "i", "emphatic": true}, {"key": "certainly", "label": "Certainly / Surely / Truly", "regex": "\\b(?:certainly|surely|assuredly|truly|of\\s+a\\s+truth|in\\s+truth|without\\s+doubt|undoubtedly|definitely|really)\\b", "flags": "i", "emphatic": true}, {"key": "already", "label": "Already", "regex": "\\balready\\b", "flags": "i"}, {"key": "perfect", "label": "Present perfect only (have / has …)", "regex": "\\b(?:have|has|hath|hast|had)\\s+(?:\\w+ly\\s+)?(?:been|\\w+ed|\\w+en|sent|made|brought|come|given|set|told|shown|known|heard|seen|taught|put|left|built|found|struck|held|laid|led|done|gone|said|kept|meant|thought|sought|caught|become|met|spent|won|lost|drawn|grown|thrown|shown)\\b", "flags": "i"}, {"key": "plain", "label": "Plain past", "regex": null}]',
 '[{"ask": "Which rendering gives قَدْ an emphatic word (Verily / Indeed / Certainly)?", "yes": ["verily", "indeed", "certainly"], "no": ["perfect", "plain"]}, {"ask": "Which rendering lets the tense alone (a plain past) carry قَدْ?", "yes": ["plain"], "no": ["verily", "indeed", "certainly", "already"]}]', 2),

('kana_participle', 'kāna with a description (kāna Allāhu ghafūran)', 'كَانَ مَعَ الوَصْف',
 'كَانَ اللَّهُ غَفُورًا رَحِيمًا is not ‘God was forgiving’ (and no longer is): kāna here states what has always been so. Translators say ‘ever’, ‘always’, ‘has been’, keep a literal ‘was’, or drop kāna for a timeless ‘is’.',
 'A past-tense form of كَانَ (QAC lemma kāna, PERF) followed within four words by an indefinite accusative description — an adjective or a participle — standing among the āyah''s last three words: the closing formula كَانَ اللَّهُ عَلِيمًا حَكِيمًا. The English is read in its last ten words.',
 '{"kind": "kana_participle", "window": 4, "closing": 3}', 'end', 10,
 '[{"key": "ever", "label": "“ever …”", "regex": "\\bever\\b|\\bever-", "flags": "i", "timeless": true}, {"key": "always", "label": "“always / forever …”", "regex": "\\b(?:always|forever|for\\s+ever|evermore|eternally|perpetually|constantly|at\\s+all\\s+times|ceaselessly)\\b", "flags": "i", "timeless": true}, {"key": "has_been", "label": "“has been / had been”", "regex": "\\b(?:has|have|had|hath|hast)\\s+been\\b", "flags": "i"}, {"key": "was", "label": "Literal past “was”", "regex": "\\b(?:was|were|wast|wert)\\b", "flags": "i"}, {"key": "is", "label": "Timeless present “is”", "regex": "\\b(?:is|are|art|am)\\b|''s\\b", "flags": "i", "timeless": true}, {"key": "other", "label": "Recast", "regex": null}]',
 '[{"ask": "Which rendering says kāna means ‘ever’ or ‘always’?", "yes": ["ever", "always"], "no": ["was", "is", "other"]}, {"ask": "Which rendering keeps a literal past ‘was’?", "yes": ["was"], "no": ["ever", "always", "is"]}]', 3),

('allah_name', 'Allāh: “Allah” or “God”', 'اسمُ الجَلالَة',
 'The name اللَّه is kept as ‘Allah’ by some translators — a proper name, and the Arabic Christians'' word too — and rendered ‘God’ by others, to say that it is the one God of all.',
 'The āyah contains the name اللَّه (QAC lemma {ll~ah, with any clitic: لِلَّهِ, بِاللَّهِ, وَاللَّهُ …).',
 '{"kind": "lemma_bw", "lemmas": ["{ll~ah"]}', 'whole', NULL,
 '[{"key": "both", "label": "Both “Allah” and “God”", "regex": "^(?=[\\s\\S]*\\b(?:Allah|Allāh|Allâh|Allaah|ALLAH)\\b)(?=[\\s\\S]*\\b(?:God|GOD)\\b)", "flags": ""}, {"key": "allah", "label": "“Allah”", "regex": "\\b(?:Allah|Allāh|Allâh|Allaah|ALLAH)\\b", "flags": ""}, {"key": "god", "label": "“God”", "regex": "\\b(?:God|GOD)\\b", "flags": ""}, {"key": "other", "label": "Neither (He, the Lord …)", "regex": null}]',
 '[{"ask": "Which rendering keeps the name “Allah”?", "yes": ["allah"], "no": ["god"]}, {"ask": "Which rendering says “God” for اللَّه?", "yes": ["god"], "no": ["allah"]}]', 4),

('ya_ayyuha_amanu', 'yā ayyuhā lladhīna āmanū', 'يَا أَيُّهَا الَّذِينَ آمَنُوا',
 'The Qurʾān''s address to the believers — literally ‘O you who have believed’ (a past verb). Translators keep the relative clause (O you who believe / O ye who believe), paraphrase it (O you who have attained to faith), or turn it into a noun (Believers!).',
 'The run يَا أَيُّهَا الَّذِينَ آمَنُوا — vocative yā, ayyuhā, the relative pronoun and the verb āmanū (ʾ-m-n, perfect).',
 '{"kind": "sequence", "bare": ["ياأيها", "الذين", "آمنوا"]}', 'whole', NULL,
 '[{"key": "o_ye", "label": "“O ye who believe”", "regex": "\\b(?:O|Oh)\\s+ye\\b", "flags": "i"}, {"key": "you_who_believe", "label": "“O you who believe”", "regex": "\\b(?:(?:O|Oh)\\s+)?you\\s+(?:who|that)\\s+(?:have\\s+)?(?:believe|believed)\\b", "flags": "i"}, {"key": "those_who", "label": "Literal: “O those who have believed”", "regex": "\\b(?:O|Oh|you)\\s+(?:those|people|ones)\\s+who\\b", "flags": "i"}, {"key": "faith", "label": "Paraphrased: “… who have attained to faith / have faith”", "regex": "\\bfaith(?:ful)?\\b|\\biman\\b|\\bmu''?mins?\\b|\\bwho\\s+(?:have\\s+)?(?:come\\s+to\\s+|chosen\\s+to\\s+)?(?:trust|acknowledge|accepted|accept|affirm)", "flags": "i"}, {"key": "believers", "label": "As a noun: “Believers!”", "regex": "\\bbelievers\\b", "flags": "i"}, {"key": "other", "label": "Recast", "regex": null}]',
 '[{"ask": "Which rendering turns the relative clause into a noun (“Believers!”)?", "yes": ["believers"], "no": ["o_ye", "you_who_believe", "faith"]}, {"ask": "Which rendering keeps the archaic plural “ye”?", "yes": ["o_ye"], "no": ["you_who_believe", "those_who", "faith", "believers"]}, {"ask": "Which rendering keeps the Arabic''s shape word for word (“O those who have believed”)?", "yes": ["those_who"], "no": ["you_who_believe", "o_ye", "faith", "believers"]}]', 5),

('oath_waw', 'The oath wa- opening the āyah (wa-l-fajr …)', 'وَاوُ القَسَم',
 'وَالْفَجْرِ is an oath — ‘By the dawn’. Most translators keep ‘By …’; some make it explicit (‘I swear by …’), some turn it into an invitation to look (‘Consider …’), and a few read the wa- as ‘and’.',
 'The āyah''s first word carries the oath prefix — wa- (QAC ‘w:P’) or ta- (تَاللَّهِ) — with its noun in the genitive, or is a wa- + genitive noun opening the surah (after its opening letters, if any: QAC tags وَالذَّارِيَاتِ and وَالطُّورِ as conjunctions); and each following āyah that carries the run of oaths on with wa- and a genitive noun (وَالشَّمْسِ … وَالْقَمَرِ …).',
 '{"kind": "oath_waw"}', 'start', 8,
 '[{"key": "swear", "label": "“I swear by …”", "regex": "\\b(?:swear|oath|call\\s+to\\s+witness)\\b", "flags": "i", "oath": true}, {"key": "by", "label": "“By …”", "regex": "^\\W*(?:(?:and|then|so|nay|now)\\W+)?by\\b", "flags": "i", "oath": true}, {"key": "consider", "label": "“Consider …” / “Think of …”", "regex": "^\\W*(?:(?:and|then)\\W+)?(?:consider|think\\s+of|behold|observe|look\\s+at|reflect|witness|remember|mark)\\b", "flags": "i"}, {"key": "and", "label": "“And …” — the oath carried on, not repeated", "regex": "^\\W*and\\b", "flags": "i"}, {"key": "other", "label": "No oath marker", "regex": null}]',
 '[{"ask": "Which rendering turns the oath into an invitation to reflect (“Consider …”)?", "yes": ["consider"], "no": ["by", "swear"]}, {"ask": "Which rendering makes the oath explicit (“I swear by …”)?", "yes": ["swear"], "no": ["by", "consider", "and"]}]', 6),

('laalla', 'laʿalla — ‘so that’ or ‘perhaps’', 'لَعَلَّ',
 'لَعَلَّ is hope or expectation (‘perhaps’); said by God, the commentators read it as purpose (‘so that’), since hope cannot be God''s. Translators split: purpose (so that, in order that, that you may), hope (perhaps, that haply, hopefully).',
 'The particle لَعَلَّ with its pronoun (لَعَلَّكُمْ, لَعَلَّهُمْ, لَعَلِّي …) — QAC lemma laʿall.',
 '{"kind": "lemma_bw", "lemmas": ["laEal~", "l~aEal~"]}', 'whole', NULL,
 '[{"key": "haply", "label": "“that haply …”", "regex": "\\bhaply\\b", "flags": "i", "hope": true}, {"key": "perhaps", "label": "“perhaps / maybe”", "regex": "\\b(?:perhaps|maybe|mayhap|possibly|peradventure|it\\s+may\\s+be|may\\s+be\\s+that|by\\s+chance|chance)\\b", "flags": "i", "hope": true}, {"key": "hope", "label": "“hopefully / in the hope that”", "regex": "\\bhop(?:e|es|ed|ing|efully)\\b", "flags": "i", "hope": true}, {"key": "in_order_that", "label": "“in order that / to”", "regex": "\\bin\\s+order\\s+(?:that|to|for)\\b", "flags": "i"}, {"key": "so_that", "label": "“so that …”", "regex": "\\bso\\s+that\\b|\\bso\\s+(?:you|ye|they|thou|he|she|we|I|it)\\s+(?:may|might|can|could|will|would|should)\\b", "flags": "i"}, {"key": "that_may", "label": "“that you may …”", "regex": "\\bthat\\s+(?:you|ye|they|thou|he|she|we|I|it|people|mankind|men)\\s+(?:may|might|mayest|mightest|should)\\b", "flags": "i"}, {"key": "other", "label": "Recast (to …, lest …)", "regex": null}]',
 '[{"ask": "Which rendering reads لَعَلَّ as hope (perhaps / haply)?", "yes": ["haply", "perhaps", "hope"], "no": ["so_that", "in_order_that", "that_may"]}, {"ask": "Which rendering reads لَعَلَّ as purpose (so that / in order that)?", "yes": ["so_that", "in_order_that"], "no": ["haply", "perhaps", "hope"]}]', 7),

('royal_we', 'The divine “We”', 'نُونُ العَظَمَة',
 'God speaks of Himself as ‘We’ — the plural of majesty (nūn al-ʿaẓama). Translators keep ‘We’, often capitalised as a mark of reverence; some write a plain ‘we’; a few turn it into ‘I’ or into the third person (‘God sent …’).',
 'A first-person plural verb (QAC person 1P) of an act the Qurʾān ascribes to God — sent down, created, sent, gave, made, destroyed, revealed, saved, raised, provided … (lemmas listed in detector_json).',
 '{"kind": "royal_we", "lemmas": ["jaEala", ">arosala", "A^taY", ">anzala", "xalaqa", ">aholaka", ">awoHaY`^", "jazaY`", "razaqa", "naj~aY`", ">axoraja", "naz~ala", ">anjaY`", ">a*aAqa", ">ugoriqu", ">arayo", "baEava", ">aEotadato", "hadaY", "qaS~a", "mak~a", "faS~ala", "Ha$ara", "Sar~afo", "rafaEa", "balawo", "kataba", ">an$a>a", "wahaba", ">aHoyaA", "m~at~aEo", "yas~ara", "Daraba", ">an[bata", "bay~anu", "faD~ala", "bad~ala", "zay~ana", "ka$afa", ">aloqaY`^", "fataHa", ">aworava", "ba`raka", "dam~ara", "Eal~ama", ">asoqayo", "waS~aY`", "nazaEa", "{ntaqamo", "Ea*~aba", "qad~ara", "qaf~ayo", "$aA^''a"]}', 'whole', NULL,
 '[{"key": "we_capital", "label": "“We” — capitalised mid-sentence", "regex": "[a-z,;:—–\\-]\\s+(?:We|Us|Our|Ours|Ourself|Ourselves)\\b|\\b(?:WE|US|OUR)\\b", "flags": ""}, {"key": "we_lower", "label": "“we” — lower case", "regex": "\\b(?:we|us|our|ours|ourselves)\\b", "flags": ""}, {"key": "we", "label": "“We” — only at a sentence''s start", "regex": "\\b(?:We|Us|Our)\\b", "flags": ""}, {"key": "i", "label": "“I” — singular", "regex": "\\b(?:I|Me|My|Myself|Mine)\\b", "flags": ""}, {"key": "third", "label": "Third person — God / He", "regex": "\\b(?:God|GOD|Allah|Allāh|Allâh|He|Him|His|Lord)\\b", "flags": ""}, {"key": "none", "label": "No pronoun (carried from the āyah before)", "regex": null}]',
 '[{"ask": "Which rendering capitalises the divine “We” as a mark of reverence?", "yes": ["we_capital"], "no": ["we_lower"]}, {"ask": "Which rendering writes the divine “we” in lower case?", "yes": ["we_lower"], "no": ["we_capital"]}]', 8),

('archaic', 'Archaic register — thou, ye, -eth', 'الأُسْلُوبُ القَدِيم',
 'Arabic keeps ‘you’ singular (anta) apart from ‘you’ plural (antum); older English did too — thou/thee for one, ye for many — and the King James register (-eth, hath, unto) came with it. Modern translators write ‘you’ for both.',
 'The āyah addresses someone: a word in the second person (a verb, a pronoun, or a pronoun suffix — QAC person 2).',
 '{"kind": "second_person"}', 'whole', NULL,
 '[{"key": "thou", "label": "thou / thee / thy", "regex": "\\b(?:thou|thee|thy|thine|thyself)\\b", "flags": "i", "archaic": true}, {"key": "ye", "label": "ye", "regex": "\\bye\\b", "flags": "i", "archaic": true}, {"key": "eth", "label": "-eth / hath / unto, with “you”", "regex": "\\b(?:hath|doth|hast|dost|wast|shalt|wilt|canst|didst|unto|saith|(?!teeth\\b)\\w{2,}[^i\\W]eth)\\b", "flags": "i", "archaic": true}, {"key": "you", "label": "Modern “you”", "regex": "\\b(?:you|your|yours|yourself|yourselves)\\b", "flags": "i"}, {"key": "none", "label": "No address in the English", "regex": null}]',
 '[{"ask": "Which rendering keeps the old singular/plural distinction (thou / ye)?", "yes": ["thou", "ye"], "no": ["you"]}]', 9),

('explicitation', 'Added words in brackets', 'الزِّيَادَةُ التَّفْسِيرِيَّة',
 'What the Arabic leaves implied, some translators spell out — and mark it as theirs with [square brackets] or (parentheses), so the reader can see what is added. Others fold it silently into the sentence, or add nothing.',
 'Every āyah (a whole-āyah feature).',
 '{"kind": "all"}', 'whole', NULL,
 '[{"key": "square", "label": "[Square brackets]", "regex": "\\[[^\\]]*[A-Za-z][^\\]]*\\]|˹[^˺]+˺", "flags": ""}, {"key": "round", "label": "(Parentheses)", "regex": "\\([^)]*[A-Za-z][^)]*\\)", "flags": ""}, {"key": "none", "label": "No marked additions", "regex": null}]',
 '[{"ask": "Which rendering marks its added words in brackets?", "yes": ["square", "round"], "no": ["none"]}]', 10),

('length_ratio', 'Length: literal or expansive', 'الطُّول: حَرْفِيَّةٌ أَمْ تَوَسُّع',
 'English words for each Arabic word. An Arabic word often packs a verb, its subject and its object (أَنزَلْنَاهُ — ‘We sent it down’), so even a literal rendering runs longer; how much longer shows how much the translator adds.',
 'Every āyah: the number of its words (QAC word count) against the English word count.',
 '{"kind": "all"}', 'whole', NULL,
 '[{"key": "literal", "label": "Close to the Arabic", "regex": null, "max": 1.91}, {"key": "middle", "label": "Moderate", "regex": null, "max": 2.33}, {"key": "expansive", "label": "Expansive", "regex": null}]',
 '[{"ask": "Which rendering is the most literal — fewest English words for the Arabic?", "by": "min_value"}, {"ask": "Which rendering is the most expansive — most English words for the Arabic?", "by": "max_value"}]', 11);

-- The drill: three levels (the worker reads extra_json.levels; nothing is hard-coded).
--   L1 who       a rendering with a strong signature (share ≥ minShare, lift ≥ minLift) → which translator?
--                options: complete translations that rarely take that choice (share ≤ maxOtherShare)
--   L2 strategy  a rendering and its marked Arabic → which of the feature's named strategies does it take?
--   L3 compare   3–4 renderings of one āyah → which one follows X (compare_json), with each one's choice shown
INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
('skill', 'translation', 'Translation choices', 'اخْتِيَارَاتُ التَّرْجَمَة', 'How the English translators render the Arabic — whose rendering, which strategy, which keeps what', 'text.alignleft', '#F2CC8F', NULL,
 '{"source":"translation","levels":{"basic":{"ask":"who","minShare":0.5,"minLift":2.5,"maxOtherShare":0.15,"coverage":0.9},"middle":{"ask":"strategy","features":["inna_initial","innama","qad_past","kana_participle","allah_name","ya_ayyuha_amanu","oath_waw","laalla","royal_we","archaic","explicitation"],"coverage":0.9},"advanced":{"ask":"compare","options":4,"coverage":0.9}}}', 9),
('kind', 'translation_who', 'Whose rendering is this?', 'تَرْجَمَةُ مَنْ هَذِهِ؟', NULL, NULL, NULL, NULL, NULL, 7),
('kind', 'translation_strategy', 'How does this rendering handle the marked Arabic?', 'كَيْفَ نَقَلَتْ هَذِهِ التَّرْجَمَةُ مَا عُلِّمَ؟', NULL, NULL, NULL, NULL, NULL, 8),
('kind', 'translation_compare', 'Compare the renderings', 'قَارِنْ بَيْنَ التَّرْجَمَات', NULL, NULL, NULL, NULL, NULL, 9);
