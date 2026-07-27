-- 0064 — al-Rāghib's برك and كتب ṣarf families: senses and shawāhid.
--
-- Companion to 0063 (which did بين). These two were applied to the live D1
-- ahead of this file being written; it is the record catching up, so that a
-- database rebuilt from migrations carries the same content.
--
-- PROVENANCE. Every string below is al-Rāghib's own wording, read from the
-- Shamela digitisation of المفردات في غريب القرآن held locally at
-- Projects/Shamela4/04__علوم-القرآن-وأصول-التفسير/6119__المفردات-في-غريب-القرآن
-- (pages.jsonl — برك on printed p. 119, كتب on p. 699). Each form's existing
-- gloss already pointed at a specific sentence of his; the seed attaches that
-- sentence and its witness to the form. Nothing is paraphrased into his mouth.
--
-- Additive only: every path written was previously absent or null.

-- ── برك (blk_mfr_brk_fam) ────────────────────────────────────────────────────
-- «أصل البَرْك صدر البعير وإن استعمل في غيره … وبَرَكَ البعير: ألقى بركه، واعتبر
--   منه معنى اللزوم، فقيل: ابْتَرَكُوا في الحرب، أي: ثبتوا ولازموا موضع الحرب،
--   وبَرَاكَاء الحرب وبَرُوكَاؤُها للمكان الذي يلزمه الأبطال … والبَرَكَةُ: ثبوت
--   الخير الإلهي في الشيء. قال تعالى: لَفَتَحْنا عَلَيْهِمْ بَرَكاتٍ مِنَ السَّماءِ وَالْأَرْضِ»
UPDATE ar_ling_lexicon_block SET data_json = json_set(data_json,
 '$.forms[0].senses', json('[{"sense":{"ar":"صدر البعير، ومنه اللزوم","en":"the camel''s breast, and hence clinging","ur":"اونٹ کا سینہ، اور اسی سے لزوم"},"example":{"ar":"أصل البَرْك صدر البعير وإن استعمل في غيره، وبَرَكَ البعير: ألقى بركه","en":"the root of birk is the camel''s breast, though used of others; the camel baraka — it cast down its breast","ur":"بَرْک کی اصل اونٹ کا سینہ ہے؛ اونٹ نے اپنا سینہ زمین پر رکھا"}}]'),
 '$.forms[0].shahid', json('{"ar":"وبَرَكَ البعير: ألقى بركه، واعتبر منه معنى اللزوم","en":"the camel baraka — it cast down its breast; and from it the sense of clinging was taken","ur":"اونٹ بیٹھ گیا؛ اسی سے لزوم کا معنی لیا گیا"}'),
 '$.forms[1].senses', json('[{"sense":{"ar":"الثبات والملازمة","en":"standing fast, holding a place","ur":"ثابت قدمی اور ملازمت"},"example":{"ar":"ابْتَرَكُوا في الحرب، أي: ثبتوا ولازموا موضع الحرب","en":"they ibtaraku in battle — they stood fast and held the ground of the fight","ur":"وہ جنگ میں جم گئے اور میدان نہ چھوڑا"}}]'),
 '$.forms[1].shahid', json('{"ar":"وبَرَاكَاء الحرب وبَرُوكَاؤُها للمكان الذي يلزمه الأبطال","en":"the barākāʾ of battle is the place the champions hold fast to","ur":"برَاکاءُ الحرب: وہ جگہ جہاں بہادر جمے رہتے ہیں"}'),
 '$.forms[2].senses', json('[{"sense":{"ar":"ثبوت الخير الإلهي","en":"the fixity of divine good","ur":"خیرِ الٰہی کا ثبوت"},"example":{"ar":"والبَرَكَةُ: ثبوت الخير الإلهي في الشيء","en":"baraka is the settling of divine good in a thing","ur":"برکت: کسی چیز میں خیرِ الٰہی کا ٹھہر جانا"}}]'),
 '$.forms[2].shahid', json('{"ar":"لَفَتَحْنا عَلَيْهِمْ بَرَكاتٍ مِنَ السَّماءِ وَالْأَرْضِ","en":"We would have opened upon them blessings from the heaven and the earth","ur":"ہم ان پر آسمان و زمین کی برکتیں کھول دیتے"}')
) WHERE id='blk_mfr_brk_fam';

-- Form VI تَبارَكَ is deliberately left unseeded: al-Rāghib's paragraph on it is
-- a separate argument about God's exclusivity in good, and stretching one of the
-- sentences above to cover it would be an editorial claim, not his.

-- ── كتب (blk_mfr_ktb_fam) ────────────────────────────────────────────────────
-- «الْكَتْبُ: ضمّ أديم إلى أديم بالخياطة، يقال: كَتَبْتُ السّقاء، وكَتَبْتُ البغلة:
--   جمعت بين شفريها بحلقة، وفي التّعارف ضمّ الحروف بعضها إلى بعض بالخطّ …
--   ولهذا سمّي كلام الله - وإن لم يُكْتَبْ - كِتاباً كقوله: الم ذلِكَ الْكِتابُ»
UPDATE ar_ling_lexicon_block SET data_json = json_set(data_json,
 '$.forms[0].senses', json('[{"sense":{"ar":"ضمُّ أديمٍ إلى أديمٍ بالخياطة","en":"joining one hide to another by stitching","ur":"سلائی سے ایک چمڑے کو دوسرے سے ملانا"},"example":{"ar":"كَتَبْتُ السِّقاء، وكَتَبْتُ البغلة: جمعت بين شفريها بحلقة","en":"I katabtu the waterskin; I katabtu the mule — I joined its two edges with a ring","ur":"میں نے مشک سی دی؛ خچر کے دونوں کنارے حلقے سے ملا دیے"}}]'),
 '$.forms[0].shahid', json('{"ar":"الْكَتْبُ: ضمّ أديم إلى أديم بالخياطة","en":"al-katb is the joining of hide to hide by stitching","ur":"الکَتْب: سلائی سے چمڑا چمڑے سے ملانا"}'),
 '$.forms[1].senses', json('[{"sense":{"ar":"ضمُّ الحروف بعضها إلى بعض بالخطّ","en":"joining letters to one another in script","ur":"حروف کو خط میں باہم ملانا"},"example":{"ar":"الم ذلِكَ الْكِتابُ","en":"Alif Lām Mīm. That is the Book","ur":"الم۔ یہ وہ کتاب ہے"}}]'),
 '$.forms[1].shahid', json('{"ar":"ولهذا سمّي كلامُ الله — وإن لم يُكْتَبْ — كِتاباً","en":"and for this the speech of God is called kitāb, even when unwritten","ur":"اسی لیے اللہ کا کلام — خواہ لکھا نہ گیا ہو — کتاب کہلایا"}'),
 '$.forms[4].senses', json('[{"sense":{"ar":"ابتياعُ العبدِ نفسَه من سيّده","en":"a slave purchasing himself from his master","ur":"غلام کا اپنے آقا سے اپنی خریداری"},"example":{"ar":"كِتابةُ العبد: ابتياعُ نفسه من سيّده بما يؤدّيه من كسبه","en":"the kitāba of a slave: buying himself from his master with what he pays from his earnings","ur":"مکاتبت: غلام اپنی کمائی سے اپنے آپ کو آقا سے خرید لے"}}]')
) WHERE id='blk_mfr_ktb_fam';

-- Guard, run after applying:
--   SELECT id, json_valid(data_json) FROM ar_ling_lexicon_block
--   WHERE id IN ('blk_mfr_brk_fam','blk_mfr_ktb_fam');
