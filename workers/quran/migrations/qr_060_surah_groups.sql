-- qr_060_surah_groups.sql
--
-- Every grouping of the surahs in the Qurʾān atlas, as data (read by workers/quran/src/routes/atlas-groups.ts
-- and practice-groups.ts):
--
--   qr_study_label scope 'group'          the schemes: Iṣlāḥī's seven, the four transmitted divisions, the named
--                                         sets, the opening letters, Farrin's central group, Makkī / Madanī, and the
--                                         order of revelation. extra_json names each scheme's groups (qr_nazm_group.slug)
--                                         and its order ('mushaf' | 'revelation').
--   qr_study_label 'group_basis'          transmitted · argued · derived, as the app says them
--   qr_study_label 'group_source'         each source_slug as a citation
--   qr_study_label 'group_section'        the group page's section titles
--   qr_study_label skill 'groups' + kinds the drills (three levels; SRS-carded, module QR, kind 'groups')
--   qr_nazm_group makki · madani          the two classes of qr_surah.revelation_type as groups, so every surah's room
--                                         lists them with the rest
--   qr_surah_revelation_rank              the order of revelation where Ibn ʿĀshūr states one in his surah preface
--                                         (qr_tafsir_sura_preface) — mostly Jābir b. Zayd's count — with his own
--                                         sentence as evidence; a surah he gives no rank has no row, and two surahs he
--                                         gives the same rank keep it (qr_surah.order_revelation is empty)
--   qr_nazm_group_root                    each group's characteristic roots: over-represented in the group against the
--                                         whole Qurʾān (qr_word_occurrence), in at least half its surahs (a quarter
--                                         for groups of more than sixteen), ranked by n·ln(lift)
--
-- Also: the transmitted and derived groups' transliterations with their diacritics, and Iṣlāḥī's groups
-- numbered as he numbers them.
-- Apply with `d1 execute --file` (see qr_046: do not `migrations apply` km_quran).

-- ── the order of revelation, as Ibn ʿĀshūr states it ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qr_surah_revelation_rank (
  surah        INTEGER PRIMARY KEY,
  rank         INTEGER,                 -- NULL where he says the rank is not settled
  source_slug  TEXT NOT NULL,           -- ibn_ashur
  evidence_ar  TEXT NOT NULL,           -- his sentence, verbatim (diacritics stripped)
  note         TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TRIGGER IF NOT EXISTS trg_kcv_qr_surah_revelation_rank_i AFTER INSERT ON qr_surah_revelation_rank BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;
CREATE TRIGGER IF NOT EXISTS trg_kcv_qr_surah_revelation_rank_u AFTER UPDATE ON qr_surah_revelation_rank BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;
CREATE TRIGGER IF NOT EXISTS trg_kcv_qr_surah_revelation_rank_d AFTER DELETE ON qr_surah_revelation_rank BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

INSERT OR REPLACE INTO qr_surah_revelation_rank (surah, rank, source_slug, evidence_ar, note) VALUES
(5, 91, 'ibn_ashur', 'وقد عدت السورة الحادية والتسعين في عدد السور على ترتيب النزول.', NULL),
(7, 39, 'ibn_ashur', 'وهي معدودة التاسعة والثلاثين في ترتيب نزول السور عند جابر بن زيد عن ابن عباس، نزلت بعد سورة ”ص“ وقبل سورة الجن، كما تقدم، قالوا جعلها ابن مسعود في مصحفه عقب سورة البقرة وجعل بعدها سورة النساء، ثم آل عمران، ووقع في مصحف أبي بعد آل عمران الأنعام ثم الأعراف.', NULL),
(8, 89, 'ibn_ashur', 'وقد عدت السورة التاسعة والثمانين في عداد نزول سور القرآن في رواية جابر بن زيد عن ابن عباس، وإنها نزلت بعد سورة آل عمران وقبل سورة الأحزاب.', NULL),
(10, 51, 'ibn_ashur', 'وهي السورة الحادية والخمسون في ترتيب نزول السور.', NULL),
(11, 52, 'ibn_ashur', 'وقد عدت الثانية والخمسين في ترتيب نزول السور.', NULL),
(12, 53, 'ibn_ashur', 'وهي السورة الثالثة والخمسون في ترتيب نزول السور على قول الجمهور.', NULL),
(13, 97, 'ibn_ashur', 'والذين جعلوها مدنية عدوها في النزول بعد سورة القتال وقبل سورة الرحمن وعدوها سابعة وتسعين في عداد النزول.', 'The rank those who class it Madanī give it, as Ibn ʿĀshūr reports'),
(14, 70, 'ibn_ashur', 'وقد عدت السبعين في ترتيب السور في النزول.', NULL),
(15, 54, 'ibn_ashur', 'وعلى تصحيح أنها مكية فقد عدت الرابعة والخمسين في عدد نزول السور؛ نزلت بعد سورة يوسف وقبل سورة الأنعام.', NULL),
(16, 72, 'ibn_ashur', 'وهذه السورة نزلت بعد سورة الأنبياء، وقبل سورة (الم) السجدة، وقد عدت الثانية والسبعين في ترتيب نزول السور.', NULL),
(17, 50, 'ibn_ashur', 'وعدت السورة الخمسين في تعداد نزول سورة القرآن.', NULL),
(18, 68, 'ibn_ashur', 'وهي الثامنة والستون في ترتيب نزول السور عند جابر بن زيد.', NULL),
(19, 44, 'ibn_ashur', 'وهي السورة الرابعة والأربعون في ترتيب النزول؛ نزلت بعد سورة فاطر وقبل سورة طه.', NULL),
(20, 45, 'ibn_ashur', 'وهذه السورة هي الخامسة والأربعون في ترتيب النزول نزلت بعد سورة مريم وقبل سورة الواقعة.', NULL),
(21, 71, 'ibn_ashur', 'وهي السورة الحادية والسبعون في ترتيب النزول، نزلت بعد ”حم السجدة“ وقبل سورة النحل، فتكون من أواخر السور النازلة قبل الهجرة.', NULL),
(22, 105, 'ibn_ashur', 'وقد عدت السورة الخامسة والمائة في عداد نزول سور القرآن في رواية جابر بن زيد، عن ابن عباس قال: نزلت بعد سورة النور وقبل سورة المنافقين.', NULL),
(23, 76, 'ibn_ashur', 'وهي السورة السادسة والسبعون في عداد نزول سور القرآن نزلت بعد سورة (الطور) وقبل سورة ﴿تبارك الذي بيده الملك﴾ [الملك: ١] .', NULL),
(25, 42, 'ibn_ashur', 'وهي السورة الثانية والأربعون في ترتيب النزول، نزلت بعد سورة يس وقبل سورة فاطر، وعدد آياتها سبع وسبعون باتفاق أهل العدد.', NULL),
(26, 47, 'ibn_ashur', 'وهي السورة السابعة والأربعون في عداد نزول السور نزلت بعد سورة الواقعة وقبل سورة النمل.', NULL),
(27, 48, 'ibn_ashur', 'وهي السورة الثامنة والأربعون في عداد نزول السور، نزلت بعد الشعراء وقبل القصص.', NULL),
(28, 49, 'ibn_ashur', 'وهي السورة التاسعة والأربعون في عداد نزول سور القرآن، نزلت بعد سورة النمل وقبل سورة الإسراء، فكانت هذه الطواسين الثلاث متتابعة في النزول كما هو ترتيبها في المصحف، وهي متماثلة في افتتاح ثلاثتها بذكر موسى عليه السلام.', NULL),
(29, 85, 'ibn_ashur', 'وهذه السورة هي السورة الخامسة والثمانون في ترتيب نزول سور القرآن، نزلت بعد سورة الروم وقبل سورة المطففين، وسيأتي عند ذكر سورة الروم ما يقتضي أن العنكبوت نزلت في أواخر سنة إحدى عشرة قبل الهجرة، فتكون من أخريات السور المكية بحيث لم ينزل بعدها بمكة إلا سورة المطففين.', NULL),
(31, 57, 'ibn_ashur', 'وهذه السورة هي السابعة والخمسون في تعداد نزول السور، نزلت بعد سورة الصافات وقبل سورة سبأ.', NULL),
(35, 43, 'ibn_ashur', 'وهذه السورة هي الثالثة والأربعون في ترتيب نزول سور القرآن.', NULL),
(37, 56, 'ibn_ashur', 'وهي مكية بالاتفاق وهي السادسة والخمسون في تعداد نزول السور، نزلت بعد سورة الأنعام وقبل سورة لقمان.', NULL),
(38, 38, 'ibn_ashur', 'وهي السورة الثامنة والثلاثون في عداد نزول السورة، نزلت بعد سورة ﴿اقتربت الساعة﴾ [القمر: ١] وقبل سورة الأعراف.', NULL),
(39, 59, 'ibn_ashur', 'وهي السورة التاسعة والخمسون في ترتيب النزول على المختار، نزلت بعد سورة سبأ وقبل سورة غافر.', NULL),
(40, 60, 'ibn_ashur', 'وهذه السورة جعلت الستين في عداد ترتيب نزول السور نزلت بعد سورة الزمر وقبل سورة فصلت وهي أول سور آل حم نزولا.', NULL),
(43, 62, 'ibn_ashur', 'وهي معدودة السورة الثانية والستين في ترتيب نزول السور، نزلت بعد سورة فصلت وقبل سورة الدخان.', NULL),
(45, 64, 'ibn_ashur', 'وهي السورة الرابعة والستون في ترتيب نزول السور عند جابر بن زيد، نزلت بعد سورة الدخان وقبل الأحقاف.', NULL),
(46, 65, 'ibn_ashur', 'وهذه السورة معدودة الخامسة والستين في عداد نزول السور، نزلت بعد الجاثية وقبل الذاريات.', NULL),
(47, 96, 'ibn_ashur', 'وعدت السادسة والتسعين في عداد نزول سور القرآن، نزلت بعد سورة الحديد وقبل سورة الرعد.', NULL),
(48, 113, 'ibn_ashur', 'وهي السورة الثالثة عشرة بعد المائة في ترتيب نزول السور في قول جابر بن زيد.', NULL),
(49, 108, 'ibn_ashur', 'وهي السورة الثامنة بعد المائة في ترتيب نزول السور، نزلت بعد سورة المجادلة وقبل سورة التحريم وكان نزول هذه السورة سنة تسع، وأول آيها في شأن وفد بني تميم كما سيأتي عند قوله تعالى: ﴿يا أيها الذين آمنوا لا تقدموا بين يدي الله ورسوله﴾ [الحجرات: ١] وقوله ﴿إن الذين ينادونك من وراء الحجرات أكثرهم لا يعقلون﴾ [الحجرات: ٤] .', NULL),
(50, 34, 'ibn_ashur', 'وهي السورة الرابعة والثلاثون في ترتيب نزول السور عند جابر بن زيد نزلت بعد سورة المرسلات وقبل سورة لا أقسم بهذا البلد.', NULL),
(51, 66, 'ibn_ashur', 'وقد عدت السورة السادسة والستين في ترتيب نزول السور عند جابر بن زيد.', NULL),
(52, 75, 'ibn_ashur', 'وهي السورة الخامسة والسبعون في ترتيب نزول السور.', NULL),
(54, 37, 'ibn_ashur', 'وهي السورة السابعة والثلاثون في ترتيب نزول السور عند جابر بن زيد، نزلت بعد سورة الطارق وقبل سورة ص.', NULL),
(55, NULL, 'ibn_ashur', 'وللاختلاف فيها لم تحقق رتبتها في عداد نزول سور القرآن.', 'Ibn ʿĀshūr: its rank is not settled because of the dispute; al-Jaʿbarī counts it 98th on the view that it is Madanī'),
(56, 46, 'ibn_ashur', 'وهي السورة السادسة والأربعون في ترتيب نزول السور عند جابر بن زيد، نزلت بعد سورة طه وقبل سورة الشعراء.', NULL),
(57, 95, 'ibn_ashur', 'وقد عدت السورة الخامسة والتسعين في ترتيب نزول السور جريا على قول الجمهور: إنها مدنية فقالوا: نزلت بعد سورة الزلزال وقبل سورة القتال، وإذا روعي قول ابن مسعود: إنها نزلت بعد البعثة بأربع سنين.', NULL),
(58, 103, 'ibn_ashur', 'وهي السورة المائة وثلاث في عداد نزول سور القرآن نزلت بعد سورة المنافقين وقبل سورة التحريم.', NULL),
(59, 98, 'ibn_ashur', 'وهي الثامنة والتسعون في عداد نزول السور عند جابر بن زيد.', NULL),
(60, 92, 'ibn_ashur', 'وهذه السورة قد عدت الثانية والتسعين في تعداد نزول السور.', NULL),
(61, 108, 'ibn_ashur', 'وهي السورة الثامنة والمائة في ترتيب نزول السور عند جابر بن زيد.', NULL),
(62, 106, 'ibn_ashur', 'وقد عدت هذه السورة السادسة بعد المائة في ترتيب نزول السور عند جابر بن زيد، نزلت بعد سورة التحريم وقبل سورة التغابن.', NULL),
(63, 102, 'ibn_ashur', 'وقد عدت الثانية بعد المائة في عداد نزول السور عند جابر بن زيد.', NULL),
(64, 107, 'ibn_ashur', 'وهي معدودة السابعة والمائة في ترتيب نزول السور نزلت بعد سورة الجمعة وقبل سورة الصف بناء على أنها مدنية.', NULL),
(65, 96, 'ibn_ashur', 'وهي معدودة السادسة والتسعين في ترتيب نزول السور عند جابر بن زيد نزلت بعد سورة الإنسان وقبل سورة البينة.', NULL),
(66, 105, 'ibn_ashur', 'وهي معدودة الخامسة بعد المائة في عداد نزول سور القرآن نزلت بعد سورة الحجرات وقبل سورة الجمعة.', NULL),
(67, 76, 'ibn_ashur', 'وهي السادسة والسبعون في عداد نزول السور نزلت بعد سورة المؤمنين وقبل سورة الحاقة.', NULL),
(69, 77, 'ibn_ashur', 'وقد عدت هذه السورة السابعة والسبعين في عداد ترتيب النزول.', NULL),
(70, 78, 'ibn_ashur', 'وهي السورة الثامنة والسبعون في عداد نزول سور القرآن، عند جابر بن زيد نزلت بعد سورة الحاقة وقبل سورة النبأ.', NULL),
(71, 73, 'ibn_ashur', 'وعدت الثالثة والسبعين في ترتيب نزول السور، نزلت بعد نزول أربعين آية من سورة النحل وقبل سورة الطور.', NULL),
(73, 3, 'ibn_ashur', 'ثم قيل نزلت سورة المزمل بعد القلم فتكون ثالثة. وهذا قول جابر بن زيد في تعداد نزول السور، وعلى القول بأن المدثر هي الثانية. يحتمل أن تكون القلم ثالثة والمزمل رابعة', 'Disputed: Ibn ʿĀshūr reports Jābir b. Zayd''s count (third, after al-Qalam); if al-Muddaththir is second it may be fourth'),
(75, 31, 'ibn_ashur', 'وعدت الحادية والثلاثين في عداد نزول سور القرآن.', NULL),
(76, 98, 'ibn_ashur', 'وعدها جابر بن زيد الثامنة والتسعين في ترتيب نزول السور.', NULL),
(77, 33, 'ibn_ashur', 'وهي السورة الثالثة والثلاثون في عداد ترتيب نزول السور عند جابر بن زيد.', NULL),
(78, 80, 'ibn_ashur', 'وعدت السورة الثمانين في ترتيب نزول السور عند جابر بن زيد، نزلت بعد سورة المعارج وقبل سورة النازعات.', NULL),
(80, 24, 'ibn_ashur', 'وعدت الرابعة والعشرين في ترتيب نزول السور.', NULL),
(81, 7, 'ibn_ashur', 'وهي معدودة السابعة في عداد نزول سور القرآن، نزلت بعد سورة الفاتحة وقبل سورة الأعلى.', NULL),
(82, 82, 'ibn_ashur', 'وهي معدودة الثانية والثمانين في عداد نزول السور، نزلت بعد سورة النازعات وقبل سورة الانشقاق.', NULL),
(83, 86, 'ibn_ashur', 'وهي معدودة السادسة والثمانين في عداد نزول السور، نزلت بعد سورة العنكبوت وقبل سورة البقرة.', NULL),
(84, 83, 'ibn_ashur', 'وقد عدت الثالثة والثمانين في تعداد نزول السور نزلت بعد سورة الانفطار وقبل سورة الروم.', NULL),
(85, 27, 'ibn_ashur', 'ومعدودة السابعة والعشرين في تعداد نزول السور نزلت بعد سورة (والشمس وضحاها) وسورة (التين) .', NULL),
(86, 36, 'ibn_ashur', 'وعددها في ترتيب نزول السور السادسة والثلاثون.', NULL),
(87, 8, 'ibn_ashur', 'وهي معدودة ثامنة في ترتيب نزول السور عند جابر بن زيد نزلت بعد سورة التكوير وقبل سورة الليل.', NULL),
(88, 67, 'ibn_ashur', 'وهي معدودة السابعة والستين في عداد نزول السور نزلت بعد سورة الذاريات وقبل سورة الكهف.', NULL),
(89, 10, 'ibn_ashur', 'وقد عدت العاشرة في عداد نزول السور، نزلت بعد سورة الليل وقبل سورة الضحى.', NULL),
(90, 35, 'ibn_ashur', 'وقد عدت الخامسة والثلاثين في عدد نزول السور، نزلت بعد سورة (ق) وقبل سورة الطارق.', NULL),
(91, 26, 'ibn_ashur', 'وعدت السادسة والعشرين في عدد نزول السور، نزلت بعد سورة القدر، وقبل سورة البروج.', NULL),
(93, 11, 'ibn_ashur', 'وعدت هذه السورة حادية عشرة في ترتيب نزول السور، نزلت بعد سورة الفجر وقبل سورة الانشراح.', NULL),
(94, 12, 'ibn_ashur', 'وقد عدت الثانية عشرة في عداد نزول السور، نزلت بعد سورة الضحى بالاتفاق وقبل سورة العصر.', NULL),
(95, 28, 'ibn_ashur', 'وعدت الثامنة والعشرين في ترتيب نزول السور، نزلت بعد سورة البروج وقبل سورة الإيلاف.', NULL),
(97, 25, 'ibn_ashur', 'وقد عدها جابر بن زيد الخامسة والعشرين في ترتيب نزول السور، نزلت بعد سورة عبس وقبل سورة الشمس، فأما قول من قالوا إنها مدنية فيقتضي أن تكون نزلت بعد المطففين وقبل البقرة.', NULL),
(98, 101, 'ibn_ashur', 'وقد عدت المائة وإحدى في ترتيب النزول نزلت بعد سورة الطلاق وقبل سورة الحشر، فتكون نزلت قبل غزوةبني النضير، وكانت غزوة النضير سنة أربع في ربيع الأول؛ فنزول هذه السورة آخر سنة ثلاث أو أول سنة أربع.', NULL),
(99, 94, 'ibn_ashur', 'وقد عدت الرابعة والتسعين في عداد نزول السور فيما روي عن جابر بن زيد ونظمه الجعبري وهو بناء على أنها مدنية جعلها بعد سورة النساء وقبل سورة الحديد.', NULL),
(100, 14, 'ibn_ashur', 'وعدت الرابعة عشرة في ترتيب نزول السور عند جابر بن زيد على أنها مكية نزلت بعد سورة العصر وقبل سورة الكوثر.', NULL),
(101, 30, 'ibn_ashur', 'وعدت الثلاثين في عداد نزول السور.', NULL),
(102, 16, 'ibn_ashur', 'وقد عدت السادسة عشرة في ترتيب نزول السور، ونزلت بعد سورة الكوثر وقبل سورة الماعون بناء على أنها مكية.', NULL),
(103, 13, 'ibn_ashur', 'وقد عدت الثالثة عشرة في عداد نزول السور.', NULL),
(104, 32, 'ibn_ashur', 'وعدت الثانية والثلاثين في عداد نزول السور.', NULL),
(105, 19, 'ibn_ashur', 'وقد عدت التاسعة عشرة في ترتيب نزول السور.', NULL),
(106, 29, 'ibn_ashur', 'وقد عدت التاسعة والعشرين في عداد نزول السور، نزلت بعد سورة التين وقبل سورة القارعة.', NULL),
(107, 17, 'ibn_ashur', 'وعدت السابعة عشرة في عداد نزول السور بناء على أنها مكية، نزلت بعد سورة التكاثر وقبل سورة الكافرون.', NULL),
(108, 15, 'ibn_ashur', 'وعلى القول بأنها مكية عدوها الخامسة عشرة في عداد نزول السور، نزلت بعد سورة العاديات وقبل سورة التكاثر، وعلى القول بأنها مدنية فقد قيل: إنها نزلت في الحديبية.', NULL),
(109, 18, 'ibn_ashur', 'وقد عدت الثامنة عشرة في عداد نزول السور، نزلت بعد سورة الماعون وقبل سورة الفيل.', NULL),
(110, 103, 'ibn_ashur', 'وعدها جابر بن زيد السورة المائة والثلاث في ترتيب نزول السور وقال: نزلت بعد سورة الحشر وقبل سورة النور.', NULL),
(112, 22, 'ibn_ashur', 'وعلى الأصح من أنها مكية عدت السورة الثانية والعشرين في عداد نزول السور نزلت بعد سورة الناس وقبل سورة النجم.', NULL),
(113, 20, 'ibn_ashur', 'وعدت العشرين في عداد نزول السور، نزلت بعد سورة الفيل وقبل سورة الناس.', NULL);

-- ── Makkī and Madanī as groups ─────────────────────────────────────────────────────────────────
INSERT OR REPLACE INTO qr_nazm_group (id, slug, name_ar, name_en, name_translit, surah_from, surah_to, member_count, contiguous,
  group_basis, revelation_type, summary_md, note_md, gloss_json, source_slug, evidence_ref, confidence) VALUES
('QR:NZ:makki', 'makki', 'السور المكية', 'The Makkan surahs', 'al-Makkī', 1, 114, 0, 0, 'transmitted', 'makki',
 'The surahs revealed before the Hijra, as the surah metadata classes each surah as a whole.',
 'Classed per surah as a whole: where the tradition disputes a surah''s provenance, or holds some of its āyāt to be of the other period, that is not marked here. The order-of-revelation scheme ranks these by the count Ibn ʿĀshūr gives (qr_surah_revelation_rank).',
 '{"ar":"السور المكية","en":"The Makkan surahs","ur":"مکی سورتیں"}', 'qr_surah', 'qr_surah.revelation_type', 'attested'),
('QR:NZ:madani', 'madani', 'السور المدنية', 'The Madinan surahs', 'al-Madanī', 2, 110, 0, 0, 'transmitted', 'madani',
 'The surahs revealed after the Hijra, as the surah metadata classes each surah as a whole.',
 'Classed per surah as a whole: where the tradition disputes a surah''s provenance, or holds some of its āyāt to be of the other period, that is not marked here. The order-of-revelation scheme ranks these by the count Ibn ʿĀshūr gives (qr_surah_revelation_rank).',
 '{"ar":"السور المدنية","en":"The Madinan surahs","ur":"مدنی سورتیں"}', 'qr_surah', 'qr_surah.revelation_type', 'attested');

DELETE FROM qr_nazm_group_member WHERE group_id IN ('QR:NZ:makki', 'QR:NZ:madani');
INSERT INTO qr_nazm_group_member (id, group_id, surah, member_index)
SELECT 'QR:NZM:' || revelation_type || ':' || id, 'QR:NZ:' || revelation_type, id,
       ROW_NUMBER() OVER (PARTITION BY revelation_type ORDER BY id)
  FROM qr_surah WHERE revelation_type IN ('makki', 'madani');
UPDATE qr_nazm_group SET
  member_count = (SELECT COUNT(*) FROM qr_nazm_group_member m WHERE m.group_id = qr_nazm_group.id),
  surah_from   = (SELECT MIN(surah) FROM qr_nazm_group_member m WHERE m.group_id = qr_nazm_group.id),
  surah_to     = (SELECT MAX(surah) FROM qr_nazm_group_member m WHERE m.group_id = qr_nazm_group.id),
  updated_at   = datetime('now')
 WHERE id IN ('QR:NZ:makki', 'QR:NZ:madani');

-- ── names as the tradition spells them ─────────────────────────────────────────────────────────
UPDATE qr_nazm_group SET name_translit = CASE slug
  WHEN 'zahrawan' THEN 'al-Zahrāwān'            WHEN 'sab_tiwal' THEN 'al-Sabʿ al-Ṭiwāl'
  WHEN 'miun' THEN 'al-Miʾūn'                   WHEN 'mathani' THEN 'al-Mathānī'
  WHEN 'mufassal' THEN 'al-Mufaṣṣal'            WHEN 'muawwidhatan' THEN 'al-Muʿawwidhatān'
  WHEN 'tawasin' THEN 'al-Ṭawāsīn'              WHEN 'hawamim' THEN 'al-Ḥawāmīm'
  WHEN 'musabbihat' THEN 'al-Musabbiḥāt'        WHEN 'muqattaat' THEN 'al-Muqaṭṭaʿāt'
  WHEN 'alif_lam_mim' THEN 'Alif-Lām-Mīm'       WHEN 'alif_lam_ra' THEN 'Alif-Lām-Rā'
  WHEN 'farrin_central' THEN 'al-Sabʿ al-Mathānī (Farrin)'
  WHEN 'islahi_1' THEN 'al-Fātiḥa – al-Māʾida'  WHEN 'islahi_2' THEN 'al-Anʿām – al-Tawba'
  WHEN 'islahi_3' THEN 'Yūnus – al-Nūr'         WHEN 'islahi_4' THEN 'al-Furqān – al-Aḥzāb'
  WHEN 'islahi_5' THEN 'Sabaʾ – al-Ḥujurāt'     WHEN 'islahi_6' THEN 'Qāf – al-Taḥrīm'
  WHEN 'islahi_7' THEN 'al-Mulk – al-Nās'       ELSE name_translit END,
  name_en = CASE slug
  WHEN 'islahi_1' THEN 'Iṣlāḥī Group I'   WHEN 'islahi_2' THEN 'Iṣlāḥī Group II'  WHEN 'islahi_3' THEN 'Iṣlāḥī Group III'
  WHEN 'islahi_4' THEN 'Iṣlāḥī Group IV'  WHEN 'islahi_5' THEN 'Iṣlāḥī Group V'   WHEN 'islahi_6' THEN 'Iṣlāḥī Group VI'
  WHEN 'islahi_7' THEN 'Iṣlāḥī Group VII' ELSE name_en END
 WHERE slug IN ('zahrawan','sab_tiwal','miun','mathani','mufassal','muawwidhatan','tawasin','hawamim','musabbihat','muqattaat',
                'alif_lam_mim','alif_lam_ra','farrin_central','islahi_1','islahi_2','islahi_3','islahi_4','islahi_5','islahi_6','islahi_7');

-- ── each group's characteristic roots ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qr_nazm_group_root (
  group_id   TEXT NOT NULL,
  root       TEXT NOT NULL,
  n_group    INTEGER NOT NULL,     -- occurrences in the group's surahs
  n_surahs   INTEGER NOT NULL,     -- how many of its surahs use it
  n_quran    INTEGER NOT NULL,     -- occurrences in the whole Qurʾān
  lift       REAL NOT NULL,        -- its share of the group's rooted words over its share of the Qurʾān's
  rank       INTEGER NOT NULL,
  PRIMARY KEY (group_id, root)
);
CREATE TRIGGER IF NOT EXISTS trg_kcv_qr_nazm_group_root_i AFTER INSERT ON qr_nazm_group_root BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;
CREATE TRIGGER IF NOT EXISTS trg_kcv_qr_nazm_group_root_d AFTER DELETE ON qr_nazm_group_root BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

DELETE FROM qr_nazm_group_root;
INSERT INTO qr_nazm_group_root (group_id, root, n_group, n_surahs, n_quran, lift, rank)
WITH tot AS (SELECT COUNT(*) AS T FROM qr_word_occurrence WHERE root IS NOT NULL AND root <> ''),
     rq  AS (SELECT root, COUNT(*) AS n FROM qr_word_occurrence WHERE root IS NOT NULL AND root <> '' GROUP BY root),
     gr  AS (SELECT m.group_id, w.root, COUNT(*) AS n, COUNT(DISTINCT w.surah) AS ms
               FROM qr_word_occurrence w JOIN qr_nazm_group_member m ON m.surah = w.surah
              WHERE w.root IS NOT NULL AND w.root <> '' GROUP BY m.group_id, w.root),
     gt  AS (SELECT group_id, SUM(n) AS G FROM gr GROUP BY group_id),
     sc  AS (SELECT gr.group_id, gr.root, gr.n, gr.ms, rq.n AS nq,
                    (gr.n * 1.0 / gt.G) / (rq.n * 1.0 / (SELECT T FROM tot)) AS lift, g.member_count AS mc
               FROM gr JOIN gt USING (group_id) JOIN rq USING (root) JOIN qr_nazm_group g ON g.id = gr.group_id),
     ok  AS (SELECT *, ROW_NUMBER() OVER (PARTITION BY group_id ORDER BY n * ln(lift) DESC, root) AS rk FROM sc
              WHERE lift > 1.2 AND n >= 3
                AND ms >= MAX(MIN(2, mc), CASE WHEN mc > 16 THEN (mc + 3) / 4 ELSE (mc + 1) / 2 END))
SELECT group_id, root, n, ms, nq, round(lift, 3), rk FROM ok WHERE rk <= 12;

-- ── the schemes and their labels ───────────────────────────────────────────────────────────────
INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
('group', 'islahi', 'Iṣlāḥī''s seven groups', 'مجموعات إصلاحي السبع', 'Tadabbur-i Qurʾān: seven groups, each a Makkan run closed by Madinan surahs', 'square.grid.3x3', '#D8B657', NULL,
 '{"source_slug":"islahi_tadabbur","order":"mushaf"}', 0),
('group', 'divisions', 'The four divisions', 'الطوال والمئون والمثاني والمفصل', 'The transmitted division of the muṣḥaf by length — al-Sabʿ al-Ṭiwāl, al-Miʾūn, al-Mathānī, al-Mufaṣṣal. Their edges are disputed; each is stored on the majority view', 'ruler', '#E9C46A', NULL,
 '{"groups":["sab_tiwal","miun","mathani","mufassal"],"order":"mushaf"}', 1),
('group', 'named', 'Named sets', 'السور المسماة معا', 'Surahs the tradition names together — al-Zahrāwān, al-Ṭawāsīn, al-Ḥawāmīm, al-Musabbiḥāt, al-Muʿawwidhatān', 'tag', '#F2CC8F', NULL,
 '{"groups":["zahrawan","tawasin","hawamim","musabbihat","muawwidhatan"],"order":"mushaf"}', 2),
('group', 'letters', 'Opening letters', 'فواتح السور', 'The surahs that open with the disconnected letters (al-muqaṭṭaʿāt), and the sets that share one string — read off each surah''s first āyah. A surah can sit in more than one', 'textformat.abc', '#81B29A', NULL,
 '{"groups":["muqattaat","alif_lam_mim","alif_lam_ra"],"order":"mushaf","overlap":true}', 3),
('group', 'farrin', 'Farrin''s central group', 'المجموعة المركزية عند فارين', 'Raymond Farrin reads Q 50–56 as the centre of two concentric rings of groups. Only this central group is recorded — not the other eighteen, and not its inner pairing', 'circle.circle', '#B388EB', NULL,
 '{"groups":["farrin_central"],"order":"mushaf","ring":"not_recorded"}', 4),
('group', 'makki_madani', 'Makkī and Madanī', 'المكي والمدني', 'The surahs before and after the Hijra, as the surah metadata classes each one, in muṣḥaf order', 'moon.stars', '#5DA9E9', NULL,
 '{"groups":["makki","madani"],"order":"mushaf"}', 5),
('group', 'revelation', 'Order of revelation', 'ترتيب النزول', 'Makkī then Madanī, each in the order Ibn ʿĀshūr gives (mostly Jābir b. Zayd''s count). A surah he gives no rank closes its list', 'clock.arrow.circlepath', '#4FB3A9', NULL,
 '{"groups":["makki","madani"],"order":"revelation","rank_source":"ibn_ashur"}', 6),

('group_basis', 'transmitted', 'Transmitted', 'منقول', 'Named or grouped in the transmitted tradition — ḥadīth, the Companions, ʿulūm al-Qurʾān', 'quote.opening', '#D8B657', NULL, NULL, 0),
('group_basis', 'argued', 'Argued', 'مستدل عليه', 'A scholar''s reading of the order, argued from the text', 'text.magnifyingglass', '#B388EB', NULL, NULL, 1),
('group_basis', 'derived', 'Derived', 'مستخرج', 'Read off the muṣḥaf itself — a shared opening, a count', 'function', '#81B29A', NULL, NULL, 2),

('group_source', 'islahi_tadabbur', 'Amīn Aḥsan Iṣlāḥī, Tadabbur-i Qurʾān', 'أمين أحسن إصلاحي، تدبر قرآن', 'The group list of his Muqaddima; the themes are paraphrased', NULL, NULL, NULL, NULL, 0),
('group_source', 'uthmani', 'The muṣḥaf and the transmitted tradition', 'المصحف والمنقول', 'Names from ḥadīth and ʿulūm al-Qurʾān; membership checked against each surah''s opening in the muṣḥaf', NULL, NULL, NULL, NULL, 1),
('group_source', 'farrin_structure', 'Raymond Farrin, Structure and Qurʾanic Interpretation (2014)', NULL, 'Chapters 5–6 and Appendix C; reviewed in Journal of Qurʾanic Studies 19 (2017)', NULL, NULL, NULL, NULL, 2),
('group_source', 'qr_surah', 'Surah metadata (Tanzil / Tarteel)', NULL, 'The Makkī–Madanī class each surah carries', NULL, NULL, NULL, NULL, 3),
('group_source', 'ibn_ashur', 'Ibn ʿĀshūr, al-Taḥrīr wa-l-tanwīr', 'ابن عاشور، التحرير والتنوير', NULL, NULL, NULL, NULL, NULL, 4),
('group_source', 'maududi', 'Abul Aʿlā Mawdūdī, Tafhīm al-Qurʾān', NULL, 'The surah introductions', NULL, NULL, NULL, NULL, 5),
('group_source', 'editorial', 'A K-Maps structural reading', NULL, 'Not attributed to a scholar in the data — recorded as a proposal', NULL, NULL, NULL, NULL, 6),
('group_source', 'in_text', 'The text itself', NULL, 'An echo that can be read off the āyāt', NULL, NULL, NULL, NULL, 7),

('group_section', 'summary', 'The group', 'المجموعة', NULL, NULL, NULL, NULL, NULL, 0),
('group_section', 'members', 'Its surahs', 'سورها', 'Each with its place in the group and what it is about', NULL, NULL, NULL, NULL, 1),
('group_section', 'openings', 'Shared openings', 'الفواتح المشتركة', 'How its surahs open, and which openings more than one of them shares', NULL, NULL, NULL, NULL, 2),
('group_section', 'roots', 'Characteristic roots', 'الجذور المميزة', 'Roots the group uses more than the Qurʾān as a whole, across at least half its surahs', NULL, NULL, NULL, NULL, 3),
('group_section', 'ring', 'The ring', 'البناء الحلقي', 'Its parts paired around a centre, as recorded', NULL, NULL, NULL, NULL, 4),
('group_section', 'ring_unrecorded', 'The ring — pairing not recorded', NULL, 'Read as a ring, but which surah answers which is not recorded here; its surahs are shown in order', NULL, NULL, NULL, NULL, 5),
('group_section', 'links', 'Links between its surahs', 'الصلات', NULL, NULL, NULL, NULL, NULL, 6),
('group_section', 'readings', 'Readings and objections', 'القراءات والاعتراضات', NULL, NULL, NULL, NULL, NULL, 7),
('group_section', 'outside', 'Outside these groups', 'خارج هذه المجموعات', 'Surahs this scheme does not place in any group', NULL, NULL, NULL, NULL, 8),
('group_section', 'practise', 'Practise this group', 'تمرن على المجموعة', NULL, 'target', NULL, NULL, NULL, 9),
('group_section', 'rings', 'Rings', 'البناء الحلقي', 'Where the surah''s parts are recorded as paired around a centre', NULL, NULL, NULL, NULL, 10),

('skill', 'groups', 'Surah groups', 'مجموعات السور', 'Which group or class a surah belongs to, how the surahs of a group open, and each group''s theme and ring', 'square.grid.3x3.square', '#C9A66B', NULL,
 '{"source":"groups","levels":{"basic":{"band":"basic","asks":["group_of","makki_madani"]},"middle":{"band":"middle","asks":["opens_with","epithet","shared_opening"]},"advanced":{"band":"advanced","asks":["group_theme","surah_aim","ring_pair","ring_centre"]}},"opening_groups":["muqattaat","alif_lam_mim","alif_lam_ra","hawamim","tawasin","musabbihat","muawwidhatan"]}', 31),

('kind', 'group_of', 'Which group does this surah belong to?', 'إلى أي مجموعة تنتمي السورة؟', NULL, NULL, NULL, NULL, NULL, 110),
('kind', 'makki_madani', 'Makkī or Madanī?', 'مكية أم مدنية؟', NULL, NULL, NULL, NULL, NULL, 111),
('kind', 'opens_with', 'Which surah of the group opens this way?', 'أي سور المجموعة تفتتح بهذا؟', NULL, NULL, NULL, NULL, NULL, 112),
('kind', 'epithet', 'Which carries this epithet?', 'أيها يحمل هذا الوصف؟', NULL, NULL, NULL, NULL, NULL, 113),
('kind', 'shared_opening', 'Which group shares this opening?', 'أي مجموعة تشترك في هذه الفاتحة؟', NULL, NULL, NULL, NULL, NULL, 114),
('kind', 'group_theme', 'Whose theme is this — which group?', 'عمود أي مجموعة هذا؟', NULL, NULL, NULL, NULL, NULL, 115),
('kind', 'surah_aim', 'Which surah of the group has this aim?', 'أي سورة هذه أغراضها؟', NULL, NULL, NULL, NULL, NULL, 116),
('kind', 'ring_pair', 'Which part answers this one in the ring?', 'ما الذي يقابله في البناء الحلقي؟', NULL, NULL, NULL, NULL, NULL, 117),
('kind', 'ring_centre', 'What stands at the centre of the ring?', 'ما الذي في مركز البناء الحلقي؟', NULL, NULL, NULL, NULL, NULL, 118);

INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
('group_section', 'themes', 'Its themes', 'موضوعاتها', 'The themes recorded across the group, and where each falls', NULL, NULL, NULL, NULL, 11),
('group_section', 'schemes', 'Grouping', 'التقسيم', 'How the Surahs room gathers the surahs', NULL, NULL, NULL, NULL, 12);
