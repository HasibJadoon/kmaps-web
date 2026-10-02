# GT review — tafsīr lines of Ghāfir 40:1–3 (qr_071)

Raised while translating the 397 recorded lines (al-Rāzī, al-Ālūsī, Ibn ʿĀshūr, al-Zamakhsharī) and linking
their terms to the registry. Every linked ref is live; nothing below is applied. **Alias proposals** are new
spellings for terms the registry already has (AL `ar_ling_gram_term_alias`, then `scripts/project-gram-terms.mjs`).
**Gaps** are concepts the lines use that the registry does not hold, so they are not linked.

## Checked (2026-10-02)

- **al-Rāzī line 50** «قد يعفو عن الكبيرة بعد التوبة»: the printed edition reads the same (Shamela 6118,
  vol. 27 p. 483), so the recording and our page match the print. Kept as printed; the English carries
  "[so the printed text reads; the proofs that follow argue for pardon before repentance]". Line 51's
  «الواجبة على العبد» is also as printed, and reads correctly.
- **Alias proposals** → AL `0123_gt_tafsir_spellings.sql` (42 spellings, not applied). The alias key is
  (spelling, category), so the "sense split" worries (التعريف، الواو، صفة، حالية، إبدال، المبالغة) are
  plain additions beside the existing rows, not conflicts. No collisions: two already exist with the same
  term. Not taken: phrases that are not a term's name (موقوفة الأواخر، في موضع الصفة، حذف الهمزة تخفيفًا،
  إضافته غير محضة، الرعاية على الفاصلة), words too common to resolve safely (العلم، رمز، المجرور, and الصفات
  as a part of speech), and فتح / كسر / تسكين (vowelling in a reading is not the case sign).
- **Gaps** confirmed missing from the registry (only العلمية has a neighbour, the balāgha التعريف بالعلمية,
  which is a different concept). The ones these four works lean on most, worth adding as terms:
  الترغيب والترهيب · الإبهام · الثبوت والتجدد (meaning of a participle) · the kinds of بدل (كل من كل،
  بعض من كل، اشتمال، بداء) · المنعوت / الموصوف · اسم الجمع / اسم الجنس الجمعي · the causes of منع الصرف
  (العلمية، العجمة، التركيب) · التفخيم in the reading sense · التحريك / التسكين · المزاوجة · التفنن.
  Out of scope here: مكي/مدني, سبب النزول, prosody (العروض).

## razi

# al-Rāzī 40:1–6 (QRTA:razi:40-01, seq 1–136): GT alias proposals and gaps

## Alias proposals (surface as written | term_id | why it is the same term)

- إضْمارِ (seq 12, «بإضمار اقرأ») | GT:irab_role:idmar_al_amil | an unexpressed governing verb («اقرأ») is implied to account for the accusative; registry name is «إضمار العامل».
- التَّعْرِيفِ (seq 12, a cause of منع الصرف) | GT:definiteness:definite | grammatical definiteness; the existing alias «التعريف» points only to GT:balagha_maani:tarif (the rhetorical topic), so a naḥw-sense alias is needed.
- مَوْقُوفَةَ الأواخِرِ (seq 13) | GT:phonotactic:waqf | "endings pronounced in pause" is the pausal form, i.e. الوقف.
- الفَواتِحِ (seq 14, «هذه الفواتح») | GT:harf_maani:muqattaa | the sūra-opening letters = الحروف المقطعة.
- مُبالَغَةٌ (seq 32, «العليم مبالغة في العلم») | GT:derivation_type:mubalagha | morphological intensive form (فعيل); the existing alias «المبالغة» points only to GT:balagha_badi:mubalagha_badi (hyperbole).
- وصْفًا (seq 80, «وصفًا للنكرة») | GT:irab_role:naat | used interchangeably with «نعتًا» (seq 77) for the attributive adjective.
- تَقْدِيرِ (seq 85, «في تقدير: شديدٌ عقابُه») | GT:irab_role:taqdir | same term without the article; only «التقدير» is registered.
- مَعارِفُ (seq 87) | GT:definiteness:definite | plural of معرفة (definite nouns).
- خَفْضَ (seq 91) | GT:case:genitive | خفض is the Kufan synonym of جرّ; «جر» is already an alias, «خفض» is not.
- الصِّفاتِ (seq 92, grammatical attributes) | GT:pos:sifa | plural of صفة.
- الواوَ / الواوِ (seq 105, 108, 110, 112) | GT:harf_maani:atf | the conjunction «and»; the existing alias «الواو» points only to GT:irab_sign:waw (wāw as a case sign).
- انْتِهاءَ الغايَةِ (seq 136, said of «إلى») | GT:harf_maani:ila_intiha_ghaya | registry name is «إلى لانتهاء الغاية».

## Gaps (surface | what it means | nearest category)

- الفتح / الكسر / التسكين / التحريك (seq 9, 11) | the vowel a / i / no vowel / giving a vowel to a letter in a reading (not a case ending) | phonotactic (the registry has only the iʿrāb signs الفتحة/الكسرة/السكون)
- أعجمي / العجمة (seq 13) | being foreign, a cause of منع الصرف | noun_process
- اسم الجنس الجمعي / «جماعة» (seq 67, 69–70) | collective noun with a singular in ة (توبة/توب, تمرة/تمر) | number / noun_process
- الوعد والوعيد (seq 41) | promise and threat | balagha_maani
- الترغيب / الترهيب (seq 41, 130) | encouragement / deterrence | balagha_maani
- الثبوت والدوام / الحدوث والتجدد (seq 83–84, 95–97) | permanence vs. occurrence as the meaning of an active participle (what decides whether its iḍāfa makes it definite) | sigha_maani / derivation_type
- الإجمال (seq 125) | vagueness that has to be resolved from context | balagha_maani

## Source note (not a GT matter)

- seq 50 reads «قد يعفو عن الكبيرة بعد التوبة», but seq 54, 59 and 62 argue for forgiveness of major sins «قبل التوبة». The same wording is in qr_tafsir_book_display_block (TAFSIR_BLK_64f1cb01cdae4f7f). It was translated as written ("after repentance"). Check it against a printed edition.

## alusi-a

# al-Ālūsī, Rūḥ al-Maʿānī — QRTA:alusi:40-01 seq 1–74 — GT alias proposals and gaps

## Alias proposals (surface as written | term_id | why it is the same term)

- مناسبة (seq 20 مُناسِبَةِ, seq 26 مُناسَبَةٌ) | GT:balagha_maani:munasaba | indefinite form of المناسبة; the line uses it for the link between the opening of a surah and the end of the one before it, which is this term's definition
- إضمار (seq 50 بِإضْمارِ اقْرَأْ) | GT:irab_role:idmar_al_amil | "accusative by an implied اقرأ" is this term exactly; the term's own definition cites نصب بإضمار اقرأ
- منع من الصرف (seq 50 مُنِعَ مِنَ الصَّرْفِ) | GT:noun_process:man_al_sarf | verbal form of منع الصرف, given with its causes (العلمية والتأنيث)
- تسكين (seq 47 تَسْكِينِ المِيمِ) | GT:irab_sign:sukun | making a letter quiescent = giving it السكون
- فتح (seq 49 بِفَتْحِ المِيمِ) | GT:irab_sign:fatha | vowelling with الفتحة (here a non-case vowel to resolve two quiescent letters)
- كسر (seq 54 بِكَسْرِ المِيمِ) | GT:irab_sign:kasra | vowelling with الكسرة (here a non-case vowel to resolve two quiescent letters)
- تثنية (seq 68 تَثْنِيَتُهُ, seq 69 تَثْنِيَتَهُ) | GT:number:dual | forming the dual (مثنى)
- التعريف (grammatical sense, seq 53 بِالتَّعْرِيفِ) | GT:definiteness:definite | here definiteness as a cause of diptosis, not the rhetorical term; note the bare alias التعريف currently resolves only to GT:balagha_maani:tarif, so this needs a category-scoped alias
- بين بين (seq 49 بِالإمالَةِ بَيْنَ بَيْنَ) | GT:phonotactic:imala | half inclination = التقليل, already an alias of imala (linked via الإمالة in the same line)

## Gaps (surface | what it means | nearest category)

- تفخيم (seq 47 بِتَفْخِيمِ الألِفِ) | full, unslanted articulation of the alif, the opposite of الإمالة; NOT GT:balagha_maani:tafkhim (rhetorical magnification), so it was not linked | phonotactic
- العلمية (seq 50, 51) | proper-name status, one of the causes of diptosis | noun_process (or definiteness)
- شبه العجمة (seq 51) | quasi-foreignness: a non-Arab-looking pattern (فاعيل) that counts as a cause of diptosis | noun_process
- التركيب (seq 53) | being a compound name, as a cause of diptosis (التركيب المزجي) | noun_process
- الأسماء المركبة (seq 69) | compound names, including sentence-names like تأبط شرا (المركب الإسنادي); GT:noun_process:adad_murakkab covers numbers only | noun_process
- إعراب (seq 55 إعْرابٌ) | case inflection, as opposed to a non-inflectional vowel | irab_sign / case
- مبتدأ محذوف (seq 55 خَبَرُ مُبْتَدَأٍ مَحْذُوفٍ) | predicate of an omitted subject (GT:irab_role:khabar_mahdhuf is the reverse: an omitted predicate); مبتدأ and خبر were linked on their own | irab_role
- تحريك (seq 49, printed التَّحْرِيمِ, read التحريك) | giving a quiescent letter a vowel to break up two quiescent letters; not linked (also a likely misprint in the source text) | phonotactic
- الخفة (seq 49 لِلْخِفَّةِ) | lightness, as the reason for choosing the fatha | phonotactic
- الإمالة الصريحة / الإمالة بين بين (seq 48, 49) | full and half inclination as named sub-kinds; currently both fall under GT:phonotactic:imala | phonotactic (child terms)
- مكية / مدنية (seq 2, 7, 9) | Meccan / Medinan revelation | none (sciences of the Qurʾān); out of grammar scope
- سبب النزول (seq 11) | occasion of revelation | none (sciences of the Qurʾān); out of grammar scope

## Deliberately not linked

- مَرْفُوعًا (seq 32, 33): hadith term (traced back to the Prophet), not the nominative case
- بَدَلَ النُّونِ (seq 65): ordinary "in place of", not the apposition role بدل
- يُجْمَعُ / يُجْمَعَ (seq 56, 74): verb forms; no registry match by exact lookup

## alusi-b

# al-Ālūsī 40:2–3 (QRTA:alusi:40-01 seq 75–142): GT alias proposals and gaps

## Alias proposals (surface as written | term_id | why it is the same term)
- محضة / إضافة محضة (seq 82–83) | GT:idafa_kind:manawiya | the Basran name for the annexation that gives definiteness, the counterpart of the already-aliased «الإضافة غير المحضة» → lafziya
- التمحض (seq 85) | GT:idafa_kind:manawiya | an annexation that is not pure being treated as pure, i.e. becoming a meaning-bearing annexation
- إضافته غير محضة (seq 85) | GT:idafa_kind:lafziya | verbal form of the existing alias «الإضافة غير المحضة»
- صفات / الصفات / الوصف / الأوصاف / يوصف / ينعت / توصف (seq 79, 83, 85, 87, 93, 94, 108, 116) | GT:irab_role:naat | al-Ālūsī uses صفة/وصف for the naʿt role; the bare alias «صفة» currently points only to GT:pos:sifa (the part of speech), so the role sense has no alias
- صفة (said of a clause, seq 132) | GT:sentence_role:naat | name_ar is «نعت (صفة)», but «صفة» on its own resolves to pos:sifa
- مستأنفة (seq 130) | GT:sentence_role:istinafiyya | feminine adjective of the same term (registry has «استئنافية», «الجملة الاستئنافية»)
- حالية (said of a clause, seq 131) | GT:sentence_role:hal | the existing alias «حالية» points to GT:harf_maani:haliyya (the wāw of circumstance), which is wrong for a circumstantial clause, so the alias needs a sense split
- معرف بأل (seq 93) | GT:balagha_maani:tarif_bil_lam | «أل» is the common name for the article that the registry calls «اللام»
- العلم (seq 100) | GT:pos:alam | the registry has only «اسم علم»
- الإبدال / إبدال / أبدال (seq 97, 99, 107, 110) | GT:irab_role:badal | the existing alias «إبدال» points to GT:inflection_class:ibdal (letter substitution in morphology); in iʿrāb contexts it means making something a substitute, so the alias needs a sense split
- الواو (as conjunction, seq 114–123) | GT:harf_maani:atf | the existing alias «الواو» points to GT:irab_sign:waw (the case marker), which is the wrong sense here
- المقدر (seq 94) | GT:irab_role:taqdir | alias already present, listed only to confirm it was used for «المقدر في حكم الموجود»
- مشاكلة (seq 94–95) | GT:balagha_badi:mushakala | linked, but note that al-Ālūsī's sense here is formal assimilation (changing a word's form to match its neighbours, as in dualising a singular), wider than the badīʿ definition; a sense note may be wanted

## Gaps (surface | what it means | nearest category)
- الترغيب (seq 80) | mentioning something to arouse hope or desire | balagha_maani
- الترهيب (seq 80) | mentioning something to arouse fear | balagha_maani
- التفنن (seq 78) | stylistic variation, choosing a different word for variety | balagha_badi
- التجدد (seq 82) | a participle or verb signalling renewal or occurrence in time | balagha_maani
- الثبوت والاستمرار (seq 82) | a noun or participle signalling permanence and continuity | balagha_maani
- التوابع (seq 97) | the dependents (adjective, substitute, coordinated noun, emphasis) as a class | irab_role
- الإبهام (seq 97) | deliberate vagueness for magnification | balagha_maani
- بدل البداء (seq 103) | substitute of change of mind | irab_role (subtype of badal)
- بدل كل من كل (seq 103) | whole-for-whole substitute | irab_role (subtype of badal)
- بدل بعض من كل (seq 103) | part-for-whole substitute | irab_role (subtype of badal)
- بدل اشتمال (seq 104) | substitute of inclusion | irab_role (subtype of badal)
- المبدل منه (seq 105) | the antecedent of a substitute | irab_role
- الموصوف (seq 87) | the noun qualified by an adjective (منعوت) | irab_role
- اسم جمع (seq 111) | collective noun with no singular of its own pattern (تمر / تمرة, توب / توبة) | noun_process / pos
- الجمع المطلق / مطلق الجمع (seq 116–117) | the conjunction wāw signalling only combination, with no order | harf_maani
- الإجراء (seq 117, 123) | applying epithets to a noun as its descriptions | irab_role
- التخلية قبل التحلية (seq 125) | ordering principle: removing faults before adorning, used to explain the order of the epithets | balagha_maani
- إعراب (seq 75) | grammatical analysis as a discipline; no bare entry exists, only «لها/لا محل لها من الإعراب» | kalam_kind / irab_role

## ashur-zam

# GT registry notes: Ibn ʿĀshūr 40:1-3 (y-m2kq2xlU4DM-02, 1-54) + al-Kashshāf 40:1-3 (40-01, 1-65)

## Alias proposals (surface as written | term_id | why it is the same term)

- خلاف مقتضى الظاهر | GT:balagha_maani:mukhalafat_muqtada_zahir | the same concept (departing from what the situation requires), given in its usual phrasing "إخراج الكلام على خلاف مقتضى الظاهر" (IA 8)
- جعل المنكر كغير المنكر | GT:balagha_maani:tanzil_al_munkir_manzilat_ghayr_al_munkir | Ibn ʿĀshūr's wording for treating the denier as a non-denier (IA 8)
- حرف التعريف | GT:balagha_maani:tarif_bil_lam | "the definite article" is the device that the term "definiteness by the article (اللام)" refers to (IA 11)
- الألف واللام | GT:balagha_maani:tarif_bil_lam | al-Zamakhsharī's name for the definite article (Z 36, 40)
- رمز | GT:balagha_bayan:kinaya_ramziyya | in al-Sakkākī's division of kināya, رمز is the subtle allusion with few intermediate steps. Ibn ʿĀshūr pairs it with تعريض (IA 13, 18)
- ممدود / مقصور (ممدودة الآخر، مقصورة) | GT:noun_process:maqsur_mamdud | these are the two halves of the registered pair "المقصور والممدود" (IA 3, 4)
- حذف الهمزة تخفيفا | GT:phonotactic:takhfif_hamza | dropping the hamza for lightness is one of the ways of lightening the hamza (IA 4)
- إضافة غير حقيقية | GT:idafa_kind:lafziya | al-Zamakhsharī's name (also غير محضة) for the verbal / non-genuine annexation (Z 13, 25)
- إضافة حقيقية / إضافة محضة | GT:idafa_kind:manawiya | Basran names for the semantic / genuine annexation (Z 24, 26)
- الصفات المشبهة | GT:derivation_type:sifa_mushabbaha | plural of the registered headword (Z 26)
- صفة / الصفات / أوصاف / الوصف (syntactic sense) | GT:irab_role:naat | صفة is the Basran name for نعت. NOTE: the alias "صفة" already maps to GT:pos:sifa (adjective as a part of speech). In these lines the sense is the syntactic role, so I linked naat. This needs a disambiguation rule rather than a blind alias (Z 11, 17, 19, 22, 28, 30, 36, 44)
- نعوت | GT:irab_role:naat | plural of نعت (IA 11)
- معارف | GT:definiteness:definite | plural of معرفة (IA 11; Z 11, 19, 22)
- أبدال | GT:irab_role:badal | plural of بدل (Z 19, 30)
- في موضع الصفة | GT:sentence_role:naat | a sentence standing in the slot of an attribute = a sentence functioning as نعت (IA 46)
- إضمار (in "النصب بإضمار اقرأ") | GT:irab_role:idmar_al_amil | this is the implied governing verb. NOTE: do not make bare "إضمار" a global alias, because Z 33 uses الإضمار as a prosodic change (zihāf) (Z 5)
- الواو (in "ما بال الواو في قوله وقابل التوب") | GT:harf_maani:atf | the coordinating wāw. NOTE: the bare alias "الواو" already maps to GT:irab_sign:waw (the case-ending wāw), so a context rule is needed (Z 45)
- المجرور (in "تقديم المجرور") | GT:irab_role:jarr_majrur | here the term means the fronted prepositional phrase إليه. The exact alias "مجرور" maps to GT:case:genitive, which is not the sense here (IA 49)
- الرعاية على الفاصلة | GT:balagha_badi:riayat_fasila | Ibn ʿĀshūr's wording of رعاية الفاصلة (IA 49)
- براعة المطلع | GT:balagha_badi:baraat_istihlal | Ibn ʿĀshūr gives it explicitly as a synonym, "براعة المطلع أو براعة الاستهلال" (IA 54)

## Gaps (surface | what it means | nearest category)

- الترغيب / الترهيب (also الإطماع والتخويف) | encouraging with hope of reward / deterring with fear of punishment, as rhetorical aims of an allusion | balagha_maani (IA 24, 47)
- ترشيح (of an allusion) | reinforcing a figure with matching elements. The registry has only الاستعارة المرشحة | balagha_bayan (IA 20)
- إعجاز القرآن | the inimitability of the Qurʾān as a line of argument | balagha_maani (IA 17)
- مستتبعات التراكيب | secondary meanings that a construction entails beyond its literal sense | balagha_maani (IA 31)
- الاهتمام (as the motive for fronting) | concern or importance as the reason for تقديم. The registry has only الاهتمام بالخبر | balagha_maani (IA 23, 49)
- تجريد الخبر عن المؤكد | presenting a statement without emphasizers. Its closest match is الخبر الابتدائي, but it was not linked | balagha_maani (IA 8)
- عمل الفعل / إعمال اسم الفاعل | a participle governing (عمل) like its verb, which is what makes its annexation verbal | irab_role / derivation_type (IA 33)
- تخفيف لفظي | the purely verbal lightening that defines verbal annexation (إضافة لفظية). It was not linked as an alias | idafa_kind (IA 39)
- المنعوت / الموصوف | the noun that an epithet qualifies | irab_role (IA 36; Z 11, 41)
- المزاوجة / الازدواج | pairing attributes or forms for parallelism, and dropping the article for sound-matching | balagha_badi (IA 41; Z 36, 37)
- حرف لين / حرف صحيح | soft (weak) letter vs sound letter, as parts of a verse-ending | phonotactic (IA 50)
- التفخيم (qirāʾa sense) | the full, uninclined pronunciation of alif, the opposite of إمالة. The registered التفخيم is the homograph for rhetorical magnification | phonotactic (Z 4)
- التسكين / التحريك | making a letter vowelless / giving it a vowel | phonotactic (Z 4, 5)
- التعريف (= العلمية) and العجمة as causes of منع الصرف | proper-name status and foreignness as diptote causes | noun_process (Z 5, 6)
- العروض terms: بحر الرجز، الكامل، التفاعيل، مستفعلن/متفاعلن، الإضمار (zihāf) | prosody, used in the gloss analogy | no category (Z 20, 21, 31, 33)
- الإبهام (in "تنكيره وإبهامه") | deliberate vagueness for magnification | balagha_maani (Z 42)
- الإبدال (= choosing the badal analysis) | it is not linked because the alias "إبدال" belongs to GT:inflection_class:ibdal (letter substitution). This is a homograph | irab_role (Z 44)
- حال / استقبال (tense sense: present / future) | the time reference of a participle | tense (Z 23)
