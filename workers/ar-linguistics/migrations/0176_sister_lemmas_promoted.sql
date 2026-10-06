-- 0176: 60 Qurʾānic lemmas AL was missing (QR words had been linked to a SISTER lemma of the same root): آخِر (was
-- on أَخَّرَ), أَوَّل, حَمْد, وَاد (was on وَأَدَ, 'bury alive'), دُبُر, عَظْم … and مَن (824 مَن words were on مِن).
-- 48 Lane / staging duplicates merged into them; 16 QAC lemmas get their root; frequencies recounted.
-- sister_al: AL lemmas for Qurʾān words that were linked to a SISTER lemma (same root, different word), audit 2026-10-07.
-- Unnumbered body; give it the next AL migration number when adopting it. Apply BEFORE sister_qr.sql (QR points at these ids).
-- 1. 60 new canonical lemmas (59 from sister pairs/review + مَن), each with an ar_ling_root_lemma_link 'primary' row where it has a root.
--    Ids are deterministic (sha1 of 'kmaps-sister-2026-10-07:<text>|<root_id>')[:26]; INSERT guarded by NOT EXISTS, so re-running is a no-op.
-- 2. 48 staging lemmas (lane_lemma_*, ALL:NS:*) for the same words: merged_into -> the new id (guarded on the old merged_into).
-- 3. 16 root-less / mis-rooted QAC lemmas that already exist for the NULL review words: root_id, root_status, frequency_quran,
--    and (only where the stored text is an inflected stem or carries the assimilation shadda) lemma_text_canonical / part_of_speech / verb_form.
-- 4. frequency_quran recount on the 59 lemmas the QR words move OFF (guarded on the current value).
-- Nothing is deleted. The old sister lemmas stay (most were made by near-synonym ingestion and carry furūq rows) — see sister.md.

-- ── 1. new canonical lemmas ──
WITH v(id, root_id, lemma_text, lemma_text_bare, part_of_speech, verb_form, is_quran_word, frequency_quran, note_md, root_status, record_status) AS (VALUES
  ('8c57d7509082a22d4113f9a684',NULL,'مَن','من','pronoun',NULL,1,871,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «مِن» (AL:3312dd99c7201accb7bc026a70); QAC LEM:man (relative / interrogative / conditional), stored like مَا: no root','none','live'),
  ('5fb2f9bfd05da7d4a48624f642','03ce9a4bf546a87e6f1e43c1cc','أَبَدًا','ابدا','noun',NULL,1,28,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «أَبْدَا» (AL:11e8125bb5ca1e95ad20cd922b)','linked','live'),
  ('2ea97ed0a96f0211772ced02ab','32ebde8afd1ae39a5eb5952fd5','آثِم','اثم','noun',NULL,1,3,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «إِثْم» (AL:d7345862314b22bbe60bb2d94d)','linked','live'),
  ('d6aead83432331e7ff058bbed6','2a81ef8e1ddd0f6eeaa5ecb4ae','آخِر','اخر','noun',NULL,1,155,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «أَخَّرَ» (AL:718a0e1048f5e3dd0380015d35)','linked','live'),
  ('67c499a0d02e3854dcb46744d3','c911881fb3888138629e9fbbd4','أَسَف','اسف','noun',NULL,1,2,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «آسَفَ» (AL:96eacc16aa531ccdd70176f9db)','linked','live'),
  ('b2029ad4f74656612b3d0a88fa','da2cab6bc67be078bb3efb0fea','أَوَّل','اول','noun',NULL,1,82,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «أَوَّلَ» (AL:a45f6788a62d7a459ddc161f72)','linked','live'),
  ('79da781dbfae48cc4ca6293f95','e418a6ac550f57168a2e4526d9','أَبْرَأَ','ابرا','verb','IV',1,2,'promoted from Qurʾān (2026-10-07): QR words had no AL lemma (QR lemma تُبْرِؤُ is the inflected stem of أَبْرَأَ)','linked','live'),
  ('d5062d1de62216b37ce6d84528','e418a6ac550f57168a2e4526d9','بَرَّأَ','برا','verb','II',1,2,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «بَرَأَ» (AL:b2fbb7b013dfda53ad10648d4e)','linked','live'),
  ('7ff8dd5f57314a128ab1db4d57','5d930ef817af2caf76a63d5f09','تَبَرُّج','تبرج','noun',NULL,1,1,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «تَبَرَّج» (AL:3155f347b85ef402a346075e0f)','linked','live'),
  ('90eb0c7cef6183e62c82a95752','ca0554e7ceb445d7755afcd985','بَطْش','بطش','noun',NULL,1,3,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «بَطَشَ» (AL:3da4016869e349e87820404fce)','linked','live'),
  ('9200b347785bce926e06c88f38','11cb979edab7459713fa6caa6d','أَبْيَض','ابيض','noun',NULL,1,8,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «اِبْيَضَ» (AL:7a33d5fcbfb3014e077469164a)','linked','live'),
  ('520c0a436b31fe951faa66416d','dd530847a4fdd7102a3d3e0617','أَتْبَعَ','اتبع','verb','IV',1,15,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «اِتَّبَعَ» (AL:67a712db15a8a40e9c20fa2a8e)','linked','live'),
  ('a089dff0ca6bfdf901c6b1eb1d','92138f71fa07e6e8a9bf770ab6','جَبَل','جبل','noun',NULL,1,39,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «جَبَلَ» (AL:d3a4f0a3d29c5d4d17671a9795)','linked','live'),
  ('2d790fa3335bfb8ace4bf911dd','02c9c80c4c27745be9b0cca083','جَنِيّ','جني','adjective',NULL,1,1,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «جَنَىَ» (AL:6c71586c0b598ce4b0041befdd)','linked','live'),
  ('1cd651aa98629e0ce32e110465','c919a32939cef9e5a97becb195','جَار','جار','noun',NULL,1,3,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «جَارَ» (AL:4e20775da70856aba5120656b4)','linked','live'),
  ('4080fed62fe83cf2e1da6d7e81','5bf7b1b187a516e945ea48b5dc','حَبّ','حب','noun',NULL,1,7,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «حَبَّ» (AL:44301c75dce365b8934a48f64d)','linked','live'),
  ('b4fd84b8956631ebc75b08ba73','7a2793c2f5ecfdfba687e2ec4f','حُزْن','حزن','noun',NULL,1,2,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «حَزَنَ» (AL:84ffbbe633ec0b2e4113c04e46)','linked','live'),
  ('34a1cb975baacc4bcc29d4b6a4','270bd5949064c5b847b1cbb677','مَحِلّ','محل','noun',NULL,1,3,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «مَحْل» (AL:6410d9668ad470b40b57e99b15)','linked','live'),
  ('fd94860f5c7c07b5b8e54bdb88','c78b3469e55741f88944f25ce7','حَمْد','حمد','noun',NULL,1,43,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «حَمَدَ» (AL:a41ef697c12dcf2417c8544d1e)','linked','live'),
  ('8fbb4d32a21f05dead04ebcbc9','adfa6a6358caf76a0afdd77e9e','خُلُق','خلق','noun',NULL,1,2,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «خَلَقَ» (AL:26a9f2efe754fcb51a2162a9a7)','linked','live'),
  ('3390bd4e59eaf1e7c440063d0e','c203415b8db05d7c76f024c418','خَوْف','خوف','noun',NULL,1,26,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «خَوَّفَ» (AL:9d99b76a1c964f8de9792e8f06)','linked','live'),
  ('fa736d0712912c20b0db0ffca9','04ecd821607cc4d81392d2bfb1','دُبُر','دبر','noun',NULL,1,18,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «دَبَّرَ» (AL:8abfba7cf434d6bc1ae97f001a)','linked','live'),
  ('a1694e6ceb877d9ddfef589f19','fefe42b3fadcf9e8076e0fae44','دَرْك','درك','noun',NULL,1,1,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «دَرَكَ» (AL:ff16e6c16fea95b0b1e59377e1)','linked','live'),
  ('b0bece1a7c59dbf6bd33ce2001','bc77a463378a7c85b4e202f81b','دَار','دار','noun',NULL,1,48,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «دَارَ» (AL:2fae92fc925d2a1687eafc92ac)','linked','live'),
  ('0e2a5a85dd709814bbc387a697','b6d094b28aa895499c36e9a9ad','رُعْب','رعب','noun',NULL,1,5,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «رَعَبَ» (AL:4cb466921d1fecd53f6d87e5d4)','linked','live'),
  ('1c8699de6db12402275a126e3f','133bbacaec8ac0cbe779df65ad','رَاعَى','راعى','verb','III',1,2,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «رَاعَ» (AL:8846f99a5e66939e7732ae462e)','linked','live'),
  ('528934a01c84f28c5ebaf25fe1','a6d0fdccef5d3da2c130393a29','رِفْد','رفد','noun',NULL,1,1,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «رَفَدَ» (AL:7dad841a7fb6c6111c24e8eddb)','linked','live'),
  ('f3cfbc5a9680e8c9170136db14','15bae5ca141dc0ea604bf41069','رَهَب','رهب','noun',NULL,1,1,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «رَهَبَ» (AL:65a4b61dce23f6a6f178b42e13)','linked','live'),
  ('0d8dd22cad87dd935ea9d9de50','ec8b702c5c64fdeeaa0b6258a0','زَكِيّ','زكي','adjective',NULL,1,1,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «زَكَّى» (AL:ffa5f24e0bf7cef0c227153d5a)','linked','live'),
  ('988dd58f2da1f13d606dcb6fc2','527d4a12b6b6553a060ab25512','سَابَقَ','سابق','verb','III',1,1,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «سَابِق» (AL:567466ca26930d52e14c1015e3)','linked','live'),
  ('5b9e43602320fb3d2cf8b6043d','848e18c216cdadf4d96fd2b807','سَعْي','سعي','noun',NULL,1,10,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «سَعَى» (AL:f58e7c7bf4e6b6501c4143c4af)','linked','live'),
  ('9561fdd95029571dfda4c6a69e','a21e6ae36d6e09327bc8543914','سَلَف','سلف','noun',NULL,1,1,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «سَلَفَ» (AL:21b1b2c9d63c3041608716132c)','linked','live'),
  ('7fdc39de058c412fa7799ee027','5192968b6c0518a527d47ce166','سُلَّم','سلم','noun',NULL,1,2,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «سَلَم» (AL:d75e659ba81416a1354c4f9b40)','linked','live'),
  ('1ce861dbff51c1a9cf1b69a16f','21324ccfc283f2e81f1646d05b','سَوِيّ','سوي','adjective',NULL,1,5,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «سَوَّى» (AL:093ee2773f795b93d837e7b08e)','linked','live'),
  ('b851f0fdb0c50bf74b1a691f5d','c73b574389525ab45c5d482c57','صَبّ','صب','noun',NULL,1,1,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «صَبَّ» (AL:52f6e280dc963b4f72b9587930)','linked','live'),
  ('15a3c5acdb6175c6d31daa4d4c','d55579035a0b0cf5c25b591844','صِبْغ','صبغ','noun',NULL,1,1,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «صَبَغَ» (AL:04ded5cdb5eb87f72c84d89107)','linked','live'),
  ('9936588edfdecef80f25e0e178','537d7ee59a85721e51e4e2dfc8','صِلِيّ','صلي','noun',NULL,1,1,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «صَلَّى» (AL:2ee559960a10f9527ab4b9f64e)','linked','live'),
  ('37a4346224e3c4c2c74eb1dbd4','1a7ee2340f31653b1ebf221b07','ضُرّ','ضر','noun',NULL,1,19,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «ضَرَّ» (AL:77eaab4a5f7918f0ee87b82476)','linked','live'),
  ('b4d7f82bda0b5492675fcf04ed','9788b5b073c81b6db395e35975','طَمَع','طمع','noun',NULL,1,4,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «طَمَعَ» (AL:d8b10546bdc72e2a048a9f8b04)','linked','live'),
  ('cbff81caebc03f2f1508346fa8','88c87ec1159f053ec400502fc6','أَظْلَم','اظلم','noun',NULL,1,16,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «أَظْلَمَ» (AL:085c745bab319aaaed1e48102a)','linked','live'),
  ('71a51db820b6153ac3e2c2ead5','c6d1dd42ef860d23844b4b11a8','عَدّ','عد','noun',NULL,1,2,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «عَدَّ» (AL:0ad243e939c29e80179d502b5f)','linked','live'),
  ('5b9f59e6cf8e0f173ba8096610','66300488598c236d93189f4892','عَظْم','عظم','noun',NULL,1,2,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «عَظَّمَ» (AL:d5030e8ba7111ea32c44249754)','linked','live'),
  ('dd5d43913e263fe2b78d9a79c6','503e96b51d25a0a9ee8d34d5eb','غَسَق','غسق','noun',NULL,1,1,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «غَسَقَ» (AL:fa7870dc2f5f8baf3ae1c968e2)','linked','live'),
  ('436757022aa9bafa31c0a8abda','8f199370a1004c46ac5521e6db','غَضِبَ','غضب','verb','I',1,6,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «غَضَب» (AL:85741eb5517ec5a3d8a6490edc)','linked','live'),
  ('26450e943fc8688324814ad15b','457e682c2e077db6909e70da2a','غُلْب','غلب','adjective',NULL,1,1,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «غَلَبَ» (AL:f37626a3b3ba914666948ea69d)','linked','live'),
  ('311cde763dfbcaf1b29df5f2f5','24f00a128899f0db676acb49ca','فَقْر','فقر','noun',NULL,1,1,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «فَقَرَ» (AL:ae32d70c15ea788424588cceb5)','linked','live'),
  ('79d78e1614cd06f75fa1573a5e','40127f4568540923de55a0cf68','فَلَق','فلق','noun',NULL,1,1,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «فَلَقَ» (AL:81a94d81f73cce9006794734cb)','linked','live'),
  ('c521c53c92090c01d7bed1757b','15c831ab85b0007fab70713a31','قُدُس','قدس','noun',NULL,1,4,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «قَدَّسَ» (AL:9ab164b13933f1c6484349f329)','linked','live'),
  ('f506ea58cfa633a75e6a7cd76c','f45e9356109d4b5e784117b303','اِلْتَفَّ','التف','verb','VIII',1,1,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «اِلْتَفَتَ» (AL:02c8af6d200efa8c95d9eeec9e)','linked','live'),
  ('0a1d63408008511eae54b40638','d7b87e30b459ea8c9bc029d969','لَمْح','لمح','noun',NULL,1,2,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «لَمَحَ» (AL:ff0953d3c84930e7484fc664a1)','linked','live'),
  ('04758a6f165dbe35d9513432c4','540d8c258733211b75a7a25ff7','مُضِيّ','مضي','noun',NULL,1,1,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «مَضَى» (AL:08b344fbbb7682a7f602fdfaef)','linked','live'),
  ('b9b006a86a2cf662d4838887c3','d34e70084081244264d43a01a9','مُكْث','مكث','noun',NULL,1,1,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «مَكَثَ» (AL:1bc2ecb75d6bf36a2dfd5b0043)','linked','live'),
  ('e12cfae9d24f46fc47d56eb7d6','4fbfe8956df0ba7eda957e1814','مَكْر','مكر','noun',NULL,1,19,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «مَكَرَ» (AL:1c7ef14db90764dfbbc272d9b3)','linked','live'),
  ('52434373ef9671592ee3b6bd12','0f01494db508398dba9272d745','تَنَاوُش','تناوش','noun',NULL,1,1,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «تَنَاوَشَ» (AL:36794c2dbcdc05a3b12786249a)','linked','live'),
  ('0540dbe86b8fd39c825016d2c0','c645ca3c231e627707aa53b0f3','اِنْهَارَ','انهار','verb','VII',1,1,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «أَنْهَار» (AL:5a2414ad8972d5587ff74acfd0)','linked','live'),
  ('87a034abac0d21825ed9a0d61e','c645ca3c231e627707aa53b0f3','هَار','هار','noun',NULL,1,1,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «هَارَ» (AL:762dc9647b4e33872f93f3b1fa)','linked','live'),
  ('a246ccc1274f52db9d009a643b','8c331e14232115dcf723de6c02','وَاد','واد','noun',NULL,1,7,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «وَأَدَ» (AL:e342c7e83c1887414afbb18ef2)','linked','live'),
  ('00f8cc2ac49e7be2b3a98a7004','e83096e76a0e1d2ccaee92ff9b','وَرَدَ','ورد','verb','I',1,2,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «وِرْد» (AL:9579e51763a291a047eb13dfe6)','linked','live'),
  ('bc8479300c62441ffcd9f51c5d','1b5a0e09a0af8f29ca03695192','وَقْر','وقر','noun',NULL,1,6,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «وَقَّرَ» (AL:2376b6532a413b7d6953f8db67)','linked','live'),
  ('446f22592529d2f6027a9fd18b','ac7e0b44b7b84142a03bef5b3e','يَنْع','ينع','noun',NULL,1,1,'promoted from Qurʾān (2026-10-07): QR words linked to sister lemma «يَنَعَ» (AL:7dd5669ab4eb1ae15a1c76f508)','linked','live'))
INSERT INTO ar_ling_root_lemma (id, root_id, lemma_text, lemma_text_bare, part_of_speech, verb_form, is_quran_word, frequency_quran, note_md, root_status, record_status)
SELECT v.* FROM v WHERE NOT EXISTS (SELECT 1 FROM ar_ling_root_lemma l WHERE l.id = v.id);

WITH v(id, lemma_id, root_id) AS (VALUES
  ('b1fa044516137a8dc3e6c8a8c9','2ea97ed0a96f0211772ced02ab','32ebde8afd1ae39a5eb5952fd5'),
  ('2d30e28d8cd2404a063693fa49','d6aead83432331e7ff058bbed6','2a81ef8e1ddd0f6eeaa5ecb4ae'),
  ('dce0c77c0cc70df2354458f6f8','5fb2f9bfd05da7d4a48624f642','03ce9a4bf546a87e6f1e43c1cc'),
  ('941527621883ef6fc98c6a2dd1','79da781dbfae48cc4ca6293f95','e418a6ac550f57168a2e4526d9'),
  ('f7d9410aad06c0302cab145f53','9200b347785bce926e06c88f38','11cb979edab7459713fa6caa6d'),
  ('90835cff90b5fa158dd7087b87','520c0a436b31fe951faa66416d','dd530847a4fdd7102a3d3e0617'),
  ('d4cb4ee6aeb01989df26bbec17','67c499a0d02e3854dcb46744d3','c911881fb3888138629e9fbbd4'),
  ('11024fd6af1c1ff36f6d888e3d','cbff81caebc03f2f1508346fa8','88c87ec1159f053ec400502fc6'),
  ('36b51d767edfaa406a7b4a7744','b2029ad4f74656612b3d0a88fa','da2cab6bc67be078bb3efb0fea'),
  ('1393490b90145e7984ef1f0003','f506ea58cfa633a75e6a7cd76c','f45e9356109d4b5e784117b303'),
  ('c410f9e3311ee9cbe90e1a6d9a','0540dbe86b8fd39c825016d2c0','c645ca3c231e627707aa53b0f3'),
  ('189d1814431f0c2aad482cc91b','d5062d1de62216b37ce6d84528','e418a6ac550f57168a2e4526d9'),
  ('aab63bb148bf6ef5077495bfa0','90eb0c7cef6183e62c82a95752','ca0554e7ceb445d7755afcd985'),
  ('27f69e05ed56a5f109238c1a60','7ff8dd5f57314a128ab1db4d57','5d930ef817af2caf76a63d5f09'),
  ('740a6798a5272cd66d7a153c10','52434373ef9671592ee3b6bd12','0f01494db508398dba9272d745'),
  ('93151fe6fcd461be027b493b51','1cd651aa98629e0ce32e110465','c919a32939cef9e5a97becb195'),
  ('292e113b53efc26b3688b6dbf9','a089dff0ca6bfdf901c6b1eb1d','92138f71fa07e6e8a9bf770ab6'),
  ('561105aaa9f5e4017985e279a3','2d790fa3335bfb8ace4bf911dd','02c9c80c4c27745be9b0cca083'),
  ('a2ee010e70c1d180629479652f','4080fed62fe83cf2e1da6d7e81','5bf7b1b187a516e945ea48b5dc'),
  ('3ee695db5d1cf78995d78251a1','fd94860f5c7c07b5b8e54bdb88','c78b3469e55741f88944f25ce7'),
  ('bd1eaca940ea9a6c8c7e47d2b6','b4fd84b8956631ebc75b08ba73','7a2793c2f5ecfdfba687e2ec4f'),
  ('483132fe37edd42713f72cd4ef','3390bd4e59eaf1e7c440063d0e','c203415b8db05d7c76f024c418'),
  ('bc4616aa49348e71b29650e7da','8fbb4d32a21f05dead04ebcbc9','adfa6a6358caf76a0afdd77e9e'),
  ('76553fcc9f8ddbf43b04899ef7','b0bece1a7c59dbf6bd33ce2001','bc77a463378a7c85b4e202f81b'),
  ('e4b0e07cb170be740a544ec022','a1694e6ceb877d9ddfef589f19','fefe42b3fadcf9e8076e0fae44'),
  ('7b38e51e952872e6d018ab7dfc','fa736d0712912c20b0db0ffca9','04ecd821607cc4d81392d2bfb1'),
  ('4d64cec7c19a0d4eb4464bca54','1c8699de6db12402275a126e3f','133bbacaec8ac0cbe779df65ad'),
  ('44c47c48b26d05dbf2f3d2f25d','f3cfbc5a9680e8c9170136db14','15bae5ca141dc0ea604bf41069'),
  ('fc1e4ad394a44735e4534386c9','0e2a5a85dd709814bbc387a697','b6d094b28aa895499c36e9a9ad'),
  ('18364587a6e92ba38c926efdd9','528934a01c84f28c5ebaf25fe1','a6d0fdccef5d3da2c130393a29'),
  ('e39047d381825614af199088ec','0d8dd22cad87dd935ea9d9de50','ec8b702c5c64fdeeaa0b6258a0'),
  ('7da07e77122641142747883514','988dd58f2da1f13d606dcb6fc2','527d4a12b6b6553a060ab25512'),
  ('cb4227517953b37e3d8981b19e','5b9e43602320fb3d2cf8b6043d','848e18c216cdadf4d96fd2b807'),
  ('e4d37cca78923e3b3606ef8f1f','9561fdd95029571dfda4c6a69e','a21e6ae36d6e09327bc8543914'),
  ('835176f4cd3da5a58175fd01c5','1ce861dbff51c1a9cf1b69a16f','21324ccfc283f2e81f1646d05b'),
  ('e8e7d968c9e2462a269009a7be','7fdc39de058c412fa7799ee027','5192968b6c0518a527d47ce166'),
  ('67da522c8a29ebb51fd71e8fd4','b851f0fdb0c50bf74b1a691f5d','c73b574389525ab45c5d482c57'),
  ('ed1d94392f7a7237b992589520','15a3c5acdb6175c6d31daa4d4c','d55579035a0b0cf5c25b591844'),
  ('7ad84eee400a5e5d92f665c00f','9936588edfdecef80f25e0e178','537d7ee59a85721e51e4e2dfc8'),
  ('39cf8ed532502576abbb143037','37a4346224e3c4c2c74eb1dbd4','1a7ee2340f31653b1ebf221b07'),
  ('0df7d72a0d1fd0b1a2493d43b8','b4d7f82bda0b5492675fcf04ed','9788b5b073c81b6db395e35975'),
  ('ba3d4f985f34b95bfe79b1b7be','71a51db820b6153ac3e2c2ead5','c6d1dd42ef860d23844b4b11a8'),
  ('e47b155cf5ddeec9d55827c242','5b9f59e6cf8e0f173ba8096610','66300488598c236d93189f4892'),
  ('50519b18756542b05cc8537440','dd5d43913e263fe2b78d9a79c6','503e96b51d25a0a9ee8d34d5eb'),
  ('270651c065b4758c0140a062b4','436757022aa9bafa31c0a8abda','8f199370a1004c46ac5521e6db'),
  ('2015544f77e440df5f7ed842ac','26450e943fc8688324814ad15b','457e682c2e077db6909e70da2a'),
  ('1594ad8194eb13a020ac1af8c5','311cde763dfbcaf1b29df5f2f5','24f00a128899f0db676acb49ca'),
  ('b20586cf2205d543ffa2f2b763','79d78e1614cd06f75fa1573a5e','40127f4568540923de55a0cf68'),
  ('b2be5749147dcb06dfa2bedfae','c521c53c92090c01d7bed1757b','15c831ab85b0007fab70713a31'),
  ('224a41569e5b75aeb60b5f3c52','0a1d63408008511eae54b40638','d7b87e30b459ea8c9bc029d969'),
  ('40ebb75b037c6a94dc2627ff28','34a1cb975baacc4bcc29d4b6a4','270bd5949064c5b847b1cbb677'),
  ('c7dfa0166efa695288a3169434','e12cfae9d24f46fc47d56eb7d6','4fbfe8956df0ba7eda957e1814'),
  ('700d40b7fff966e43def44d78c','04758a6f165dbe35d9513432c4','540d8c258733211b75a7a25ff7'),
  ('3ef5771f22345cdd079e6bc0ae','b9b006a86a2cf662d4838887c3','d34e70084081244264d43a01a9'),
  ('bcb4cb20d4fbeff393a5d938b1','87a034abac0d21825ed9a0d61e','c645ca3c231e627707aa53b0f3'),
  ('30a89005b2b9c0f8acf592580f','a246ccc1274f52db9d009a643b','8c331e14232115dcf723de6c02'),
  ('1219654cfce8b76d17273772f1','00f8cc2ac49e7be2b3a98a7004','e83096e76a0e1d2ccaee92ff9b'),
  ('7891dd08318b9d48ab667fae62','bc8479300c62441ffcd9f51c5d','1b5a0e09a0af8f29ca03695192'),
  ('bd5412f50a3268a28d4d252bb8','446f22592529d2f6027a9fd18b','ac7e0b44b7b84142a03bef5b3e'))
INSERT OR IGNORE INTO ar_ling_root_lemma_link (id, lemma_id, root_id, link_type)
SELECT v.id, v.lemma_id, v.root_id, 'primary' FROM v;

-- ── 2. staging lemmas of the same words -> merged_into the new canonical id ──
-- آثِمٌ lane_lemma_n246 -> «آثِم»
UPDATE ar_ling_root_lemma SET merged_into = '2ea97ed0a96f0211772ced02ab', updated_at = datetime('now') WHERE id = 'lane_lemma_n246' AND merged_into IS NULL;
-- آخِرٌ lane_lemma_n387 -> «آخِر»
UPDATE ar_ling_root_lemma SET merged_into = 'd6aead83432331e7ff058bbed6', updated_at = datetime('now') WHERE id = 'lane_lemma_n387' AND merged_into IS NULL;
-- أَبْيَضُ lane_lemma_n3637 -> «أَبْيَض»
UPDATE ar_ling_root_lemma SET merged_into = '9200b347785bce926e06c88f38', updated_at = datetime('now') WHERE id = 'lane_lemma_n3637' AND merged_into IS NULL;
-- أَتْبَعَ ALL:NS:C3AECF429C23A682 (was merged into «اتَّبَعَ» f45bb8deae1ffe7edd3b6e43db) -> «أَتْبَعَ»
UPDATE ar_ling_root_lemma SET merged_into = '520c0a436b31fe951faa66416d', updated_at = datetime('now') WHERE id = 'ALL:NS:C3AECF429C23A682' AND merged_into = 'f45bb8deae1ffe7edd3b6e43db';
-- أَسَفٌ lane_lemma_n758 -> «أَسَف»
UPDATE ar_ling_root_lemma SET merged_into = '67c499a0d02e3854dcb46744d3', updated_at = datetime('now') WHERE id = 'lane_lemma_n758' AND merged_into IS NULL;
-- أَظْلَمُ lane_lemma_n27662 -> «أَظْلَم»
UPDATE ar_ling_root_lemma SET merged_into = 'cbff81caebc03f2f1508346fa8', updated_at = datetime('now') WHERE id = 'lane_lemma_n27662' AND merged_into IS NULL;
-- أَوَّلُ lane_lemma_n1510 -> «أَوَّل»
UPDATE ar_ling_root_lemma SET merged_into = 'b2029ad4f74656612b3d0a88fa', updated_at = datetime('now') WHERE id = 'lane_lemma_n1510' AND merged_into IS NULL;
-- اِلْتَفَّ lane_lemma_n43340 -> «اِلْتَفَّ»
UPDATE ar_ling_root_lemma SET merged_into = 'f506ea58cfa633a75e6a7cd76c', updated_at = datetime('now') WHERE id = 'lane_lemma_n43340' AND merged_into IS NULL;
-- بَرَّأَ ALL:NS:98FE6230FC173E6A (was merged into «بَرَأَ» b2fbb7b013dfda53ad10648d4e) -> «بَرَّأَ»
UPDATE ar_ling_root_lemma SET merged_into = 'd5062d1de62216b37ce6d84528', updated_at = datetime('now') WHERE id = 'ALL:NS:98FE6230FC173E6A' AND merged_into = 'b2fbb7b013dfda53ad10648d4e';
-- بَطْشٌ lane_lemma_n2777 -> «بَطْش»
UPDATE ar_ling_root_lemma SET merged_into = '90eb0c7cef6183e62c82a95752', updated_at = datetime('now') WHERE id = 'lane_lemma_n2777' AND merged_into IS NULL;
-- جَارٌ lane_lemma_n6672 -> «جَار»
UPDATE ar_ling_root_lemma SET merged_into = '1cd651aa98629e0ce32e110465', updated_at = datetime('now') WHERE id = 'lane_lemma_n6672' AND merged_into IS NULL;
-- جَبَلٌ lane_lemma_n4980 -> «جَبَل»
UPDATE ar_ling_root_lemma SET merged_into = 'a089dff0ca6bfdf901c6b1eb1d', updated_at = datetime('now') WHERE id = 'lane_lemma_n4980' AND merged_into IS NULL;
-- جَنِىٌّ lane_lemma_n6505 -> «جَنِيّ»
UPDATE ar_ling_root_lemma SET merged_into = '2d790fa3335bfb8ace4bf911dd', updated_at = datetime('now') WHERE id = 'lane_lemma_n6505' AND merged_into IS NULL;
-- حَبٌّ lane_lemma_n6846 -> «حَبّ»
UPDATE ar_ling_root_lemma SET merged_into = '4080fed62fe83cf2e1da6d7e81', updated_at = datetime('now') WHERE id = 'lane_lemma_n6846' AND merged_into IS NULL;
-- حَمْدٌ lane_lemma_n9039 -> «حَمْد»
UPDATE ar_ling_root_lemma SET merged_into = 'fd94860f5c7c07b5b8e54bdb88', updated_at = datetime('now') WHERE id = 'lane_lemma_n9039' AND merged_into IS NULL;
-- حُزْن ALL:NS:AAD457B8C682E126 (was merged into «حَزَن» 7e7df2eb29e192c21fd66a4e6a) -> «حُزْن»
UPDATE ar_ling_root_lemma SET merged_into = 'b4fd84b8956631ebc75b08ba73', updated_at = datetime('now') WHERE id = 'ALL:NS:AAD457B8C682E126' AND merged_into = '7e7df2eb29e192c21fd66a4e6a';
-- حُزْنٌ lane_lemma_n7897 -> «حُزْن»
UPDATE ar_ling_root_lemma SET merged_into = 'b4fd84b8956631ebc75b08ba73', updated_at = datetime('now') WHERE id = 'lane_lemma_n7897' AND merged_into IS NULL;
-- خَوْفٌ lane_lemma_n11715 -> «خَوْف»
UPDATE ar_ling_root_lemma SET merged_into = '3390bd4e59eaf1e7c440063d0e', updated_at = datetime('now') WHERE id = 'lane_lemma_n11715' AND merged_into IS NULL;
-- خُلُق ALL:NS:3A9CCBC93C20FED3 (was merged into «خَلَقَ» 60cfb41b9b6f4d1a704e15594a) -> «خُلُق»
UPDATE ar_ling_root_lemma SET merged_into = '8fbb4d32a21f05dead04ebcbc9', updated_at = datetime('now') WHERE id = 'ALL:NS:3A9CCBC93C20FED3' AND merged_into = '60cfb41b9b6f4d1a704e15594a';
-- خُلُقٌ lane_lemma_n11390 -> «خُلُق»
UPDATE ar_ling_root_lemma SET merged_into = '8fbb4d32a21f05dead04ebcbc9', updated_at = datetime('now') WHERE id = 'lane_lemma_n11390' AND merged_into IS NULL;
-- دَارٌ lane_lemma_n13388 -> «دَار»
UPDATE ar_ling_root_lemma SET merged_into = 'b0bece1a7c59dbf6bd33ce2001', updated_at = datetime('now') WHERE id = 'lane_lemma_n13388' AND merged_into IS NULL;
-- دَرْكٌ lane_lemma_n12464 -> «دَرْك»
UPDATE ar_ling_root_lemma SET merged_into = 'a1694e6ceb877d9ddfef589f19', updated_at = datetime('now') WHERE id = 'lane_lemma_n12464' AND merged_into IS NULL;
-- دُبُرٌ lane_lemma_n12000 -> «دُبُر»
UPDATE ar_ling_root_lemma SET merged_into = 'fa736d0712912c20b0db0ffca9', updated_at = datetime('now') WHERE id = 'lane_lemma_n12000' AND merged_into IS NULL;
-- رَهَبٌ lane_lemma_n16825 -> «رَهَب»
UPDATE ar_ling_root_lemma SET merged_into = 'f3cfbc5a9680e8c9170136db14', updated_at = datetime('now') WHERE id = 'lane_lemma_n16825' AND merged_into IS NULL;
-- رُعْبٌ lane_lemma_n15843 -> «رُعْب»
UPDATE ar_ling_root_lemma SET merged_into = '0e2a5a85dd709814bbc387a697', updated_at = datetime('now') WHERE id = 'lane_lemma_n15843' AND merged_into IS NULL;
-- رِفْدٌ lane_lemma_n16110 -> «رِفْد»
UPDATE ar_ling_root_lemma SET merged_into = '528934a01c84f28c5ebaf25fe1', updated_at = datetime('now') WHERE id = 'lane_lemma_n16110' AND merged_into IS NULL;
-- زَكِىٌّ lane_lemma_n17938 -> «زَكِيّ»
UPDATE ar_ling_root_lemma SET merged_into = '0d8dd22cad87dd935ea9d9de50', updated_at = datetime('now') WHERE id = 'lane_lemma_n17938' AND merged_into IS NULL;
-- زَكِىٌّ lane_lemma_n17943 -> «زَكِيّ»
UPDATE ar_ling_root_lemma SET merged_into = '0d8dd22cad87dd935ea9d9de50', updated_at = datetime('now') WHERE id = 'lane_lemma_n17943' AND merged_into IS NULL;
-- سَلَفٌ lane_lemma_n20477 -> «سَلَف»
UPDATE ar_ling_root_lemma SET merged_into = '9561fdd95029571dfda4c6a69e', updated_at = datetime('now') WHERE id = 'lane_lemma_n20477' AND merged_into IS NULL;
-- سَلَفٌ lane_lemma_n20479 -> «سَلَف»
UPDATE ar_ling_root_lemma SET merged_into = '9561fdd95029571dfda4c6a69e', updated_at = datetime('now') WHERE id = 'lane_lemma_n20479' AND merged_into IS NULL;
-- سَوِىٌّ lane_lemma_n21359 -> «سَوِيّ»
UPDATE ar_ling_root_lemma SET merged_into = '1ce861dbff51c1a9cf1b69a16f', updated_at = datetime('now') WHERE id = 'lane_lemma_n21359' AND merged_into IS NULL;
-- سُلَّمٌ lane_lemma_n20553 -> «سُلَّم»
UPDATE ar_ling_root_lemma SET merged_into = '7fdc39de058c412fa7799ee027', updated_at = datetime('now') WHERE id = 'lane_lemma_n20553' AND merged_into IS NULL;
-- صَبٌّ lane_lemma_n23608 -> «صَبّ»
UPDATE ar_ling_root_lemma SET merged_into = 'b851f0fdb0c50bf74b1a691f5d', updated_at = datetime('now') WHERE id = 'lane_lemma_n23608' AND merged_into IS NULL;
-- ضُرٌّ lane_lemma_n25665 -> «ضُرّ»
UPDATE ar_ling_root_lemma SET merged_into = '37a4346224e3c4c2c74eb1dbd4', updated_at = datetime('now') WHERE id = 'lane_lemma_n25665' AND merged_into IS NULL;
-- طَمَعٌ lane_lemma_n27112 -> «طَمَع»
UPDATE ar_ling_root_lemma SET merged_into = 'b4d7f82bda0b5492675fcf04ed', updated_at = datetime('now') WHERE id = 'lane_lemma_n27112' AND merged_into IS NULL;
-- عَظْمٌ lane_lemma_n29673 -> «عَظْم»
UPDATE ar_ling_root_lemma SET merged_into = '5b9f59e6cf8e0f173ba8096610', updated_at = datetime('now') WHERE id = 'lane_lemma_n29673' AND merged_into IS NULL;
-- غَسَقٌ lane_lemma_n31840 -> «غَسَق»
UPDATE ar_ling_root_lemma SET merged_into = 'dd5d43913e263fe2b78d9a79c6', updated_at = datetime('now') WHERE id = 'lane_lemma_n31840' AND merged_into IS NULL;
-- فَقْر ALL:NS:B81149CF1578B14E (was merged into «فَقَرَ» ae32d70c15ea788424588cceb5) -> «فَقْر»
UPDATE ar_ling_root_lemma SET merged_into = '311cde763dfbcaf1b29df5f2f5', updated_at = datetime('now') WHERE id = 'ALL:NS:B81149CF1578B14E' AND merged_into = 'ae32d70c15ea788424588cceb5';
-- فَقْرٌ lane_lemma_n34297 -> «فَقْر»
UPDATE ar_ling_root_lemma SET merged_into = '311cde763dfbcaf1b29df5f2f5', updated_at = datetime('now') WHERE id = 'lane_lemma_n34297' AND merged_into IS NULL;
-- فَلَقٌ lane_lemma_n34538 -> «فَلَق»
UPDATE ar_ling_root_lemma SET merged_into = '79d78e1614cd06f75fa1573a5e', updated_at = datetime('now') WHERE id = 'lane_lemma_n34538' AND merged_into IS NULL;
-- قُدُسٌ lane_lemma_n35308 -> «قُدُس»
UPDATE ar_ling_root_lemma SET merged_into = 'c521c53c92090c01d7bed1757b', updated_at = datetime('now') WHERE id = 'lane_lemma_n35308' AND merged_into IS NULL;
-- مَحِلٌّ lane_lemma_n8765 -> «مَحِلّ»
UPDATE ar_ling_root_lemma SET merged_into = '34a1cb975baacc4bcc29d4b6a4', updated_at = datetime('now') WHERE id = 'lane_lemma_n8765' AND merged_into IS NULL;
-- مَكْرٌ lane_lemma_n43664 -> «مَكْر»
UPDATE ar_ling_root_lemma SET merged_into = 'e12cfae9d24f46fc47d56eb7d6', updated_at = datetime('now') WHERE id = 'lane_lemma_n43664' AND merged_into IS NULL;
-- مَنْ lane_lemma_n43716 -> «مَن»
UPDATE ar_ling_root_lemma SET merged_into = '8c57d7509082a22d4113f9a684', updated_at = datetime('now') WHERE id = 'lane_lemma_n43716' AND merged_into IS NULL;
-- مُكْثٌ lane_lemma_n38804 -> «مُكْث»
UPDATE ar_ling_root_lemma SET merged_into = 'b9b006a86a2cf662d4838887c3', updated_at = datetime('now') WHERE id = 'lane_lemma_n38804' AND merged_into IS NULL;
-- وَادٍ lane_lemma_n44518 -> «وَاد»
UPDATE ar_ling_root_lemma SET merged_into = 'a246ccc1274f52db9d009a643b', updated_at = datetime('now') WHERE id = 'lane_lemma_n44518' AND merged_into IS NULL;
-- وَرَدَ ALL:NS:5E5C518123C77B0C (was merged into «وِرْد» 245a8a4d3b7f6080a73bd5de66) -> «وَرَدَ»
UPDATE ar_ling_root_lemma SET merged_into = '00f8cc2ac49e7be2b3a98a7004', updated_at = datetime('now') WHERE id = 'ALL:NS:5E5C518123C77B0C' AND merged_into = '245a8a4d3b7f6080a73bd5de66';
-- وَقْرٌ lane_lemma_n42240 -> «وَقْر»
UPDATE ar_ling_root_lemma SET merged_into = 'bc8479300c62441ffcd9f51c5d', updated_at = datetime('now') WHERE id = 'lane_lemma_n42240' AND merged_into IS NULL;

-- ── 3. existing root-less / mis-rooted QAC lemmas used for the NULL review words ──
-- «بِيَع» f97cc6e72897bda143c0e13c31: 1 word(s)
UPDATE ar_ling_root_lemma SET root_id = 'b25cc96d2f73dc376bbac9cf94', root_status = 'linked', frequency_quran = 1, is_quran_word = 1, note_md = coalesce(note_md || ' | ', '') || 'linked from Qurʾān (2026-10-07): QR NULL review word 22:40:20', updated_at = datetime('now')
 WHERE id = 'f97cc6e72897bda143c0e13c31' AND root_id IS NULL;
INSERT OR IGNORE INTO ar_ling_root_lemma_link (id, lemma_id, root_id, link_type) VALUES ('f0ed22db7c2962cd83ff05d60a', 'f97cc6e72897bda143c0e13c31', 'b25cc96d2f73dc376bbac9cf94', 'primary');
-- «تَبَّرْ» 6851991c33992de9c3402001e0: 2 word(s) · display → تَبَّرَ
UPDATE ar_ling_root_lemma SET root_id = '61feee9e296c2ee200ca9fdf06', root_status = 'linked', frequency_quran = 2, is_quran_word = 1, lemma_text_canonical = coalesce(lemma_text_canonical, 'تَبَّرَ'), part_of_speech = 'verb', verb_form = coalesce(verb_form, 'II'), note_md = coalesce(note_md || ' | ', '') || 'linked from Qurʾān (2026-10-07): QR NULL review words 17:7:20, 25:39:6; QAC stem تَبَّرْ; Form II verb', updated_at = datetime('now')
 WHERE id = '6851991c33992de9c3402001e0' AND root_id IS NULL;
INSERT OR IGNORE INTO ar_ling_root_lemma_link (id, lemma_id, root_id, link_type) VALUES ('1fe6b718805f7fd1943e0e7656', '6851991c33992de9c3402001e0', '61feee9e296c2ee200ca9fdf06', 'primary');
-- «تَذْكِير» c6e610c11d5714f7477aca84da: 1 word(s)
UPDATE ar_ling_root_lemma SET root_id = 'fd52fdda37a1a97915289c7c7c', root_status = 'linked', frequency_quran = 1, is_quran_word = 1, note_md = coalesce(note_md || ' | ', '') || 'linked from Qurʾān (2026-10-07): QR NULL review word 10:71:14', updated_at = datetime('now')
 WHERE id = 'c6e610c11d5714f7477aca84da' AND root_id IS NULL;
INSERT OR IGNORE INTO ar_ling_root_lemma_link (id, lemma_id, root_id, link_type) VALUES ('2530f615a5294308385dc60992', 'c6e610c11d5714f7477aca84da', 'fd52fdda37a1a97915289c7c7c', 'primary');
-- «تَزَيَّلُ» 78a417d89304f40bc157690092: 1 word(s) · display → تَزَيَّلَ
UPDATE ar_ling_root_lemma SET root_id = 'eb56f47ab1f2f12a34c8f1d5d5', root_status = 'linked', frequency_quran = 1, is_quran_word = 1, lemma_text_canonical = coalesce(lemma_text_canonical, 'تَزَيَّلَ'), part_of_speech = 'verb', verb_form = coalesce(verb_form, 'V'), note_md = coalesce(note_md || ' | ', '') || 'linked from Qurʾān (2026-10-07): QR NULL review word 48:25:34; QAC stem تَزَيَّلُ; Form V verb', updated_at = datetime('now')
 WHERE id = '78a417d89304f40bc157690092' AND root_id IS NULL;
INSERT OR IGNORE INTO ar_ling_root_lemma_link (id, lemma_id, root_id, link_type) VALUES ('cd12dda6396f074c49cecf6c43', '78a417d89304f40bc157690092', 'eb56f47ab1f2f12a34c8f1d5d5', 'primary');
-- «تَعَمَّدَتْ» d3e8fa1ddfe535241522aa646e: 1 word(s) · display → تَعَمَّدَ
UPDATE ar_ling_root_lemma SET root_id = 'c2174a222e243b7e9fa76b8a08', root_status = 'linked', frequency_quran = 1, is_quran_word = 1, lemma_text_canonical = coalesce(lemma_text_canonical, 'تَعَمَّدَ'), part_of_speech = 'verb', verb_form = 'V', note_md = coalesce(note_md || ' | ', '') || 'linked from Qurʾān (2026-10-07): QR NULL review word 33:5:23; QAC stem تَعَمَّدَتْ is inflected; Form V; root moved off كون', updated_at = datetime('now')
 WHERE id = 'd3e8fa1ddfe535241522aa646e' AND root_id = 'fa2a0b09289525d0f3becd4449';
UPDATE ar_ling_root_lemma_link SET root_id = 'c2174a222e243b7e9fa76b8a08' WHERE lemma_id = 'd3e8fa1ddfe535241522aa646e' AND root_id = 'fa2a0b09289525d0f3becd4449';
INSERT OR IGNORE INTO ar_ling_root_lemma_link (id, lemma_id, root_id, link_type) VALUES ('892b4c6b4f9862cf8c0cc3b7bb', 'd3e8fa1ddfe535241522aa646e', 'c2174a222e243b7e9fa76b8a08', 'primary');
-- «جَوَارِح» aa8157e48ddb98fffe41cd6da8: 1 word(s)
UPDATE ar_ling_root_lemma SET root_id = '43574205b643df74efc92f7ab7', root_status = 'linked', frequency_quran = 1, is_quran_word = 1, note_md = coalesce(note_md || ' | ', '') || 'linked from Qurʾān (2026-10-07): QR NULL review word 5:4:12', updated_at = datetime('now')
 WHERE id = 'aa8157e48ddb98fffe41cd6da8' AND root_id IS NULL;
INSERT OR IGNORE INTO ar_ling_root_lemma_link (id, lemma_id, root_id, link_type) VALUES ('0fb5452dd94955b4a48ccf7f82', 'aa8157e48ddb98fffe41cd6da8', '43574205b643df74efc92f7ab7', 'primary');
-- «حَآجّ» 551e3d7d48e57f90a2f62fec82: 1 word(s) · display → حَاجّ
UPDATE ar_ling_root_lemma SET root_id = '86ce2204de78162cf10592dae7', root_status = 'linked', frequency_quran = 1, is_quran_word = 1, lemma_text_canonical = coalesce(lemma_text_canonical, 'حَاجّ'), note_md = coalesce(note_md || ' | ', '') || 'linked from Qurʾān (2026-10-07): QR NULL review word 9:19:3; pilgrim; QAC spelling حَآجّ', updated_at = datetime('now')
 WHERE id = '551e3d7d48e57f90a2f62fec82' AND root_id IS NULL;
INSERT OR IGNORE INTO ar_ling_root_lemma_link (id, lemma_id, root_id, link_type) VALUES ('c419d3a0a5d02d9bc55a44cd4f', '551e3d7d48e57f90a2f62fec82', '86ce2204de78162cf10592dae7', 'primary');
-- «حَيَوَان» a8b346211740063545c67e7470: 1 word(s)
UPDATE ar_ling_root_lemma SET root_id = 'a5f72797b85ab6271323035c41', root_status = 'linked', frequency_quran = 1, is_quran_word = 1, note_md = coalesce(note_md || ' | ', '') || 'linked from Qurʾān (2026-10-07): QR NULL review word 29:64:12', updated_at = datetime('now')
 WHERE id = 'a8b346211740063545c67e7470' AND root_id IS NULL;
INSERT OR IGNORE INTO ar_ling_root_lemma_link (id, lemma_id, root_id, link_type) VALUES ('ca3d7dd4c042c41961e77e6e77', 'a8b346211740063545c67e7470', 'a5f72797b85ab6271323035c41', 'primary');
-- «زَلْزَلَة» ad69b2871efd25d7e82b69d019: 1 word(s)
UPDATE ar_ling_root_lemma SET root_id = 'b97744de632ac76074eaca51eb', root_status = 'linked', frequency_quran = 1, is_quran_word = 1, note_md = coalesce(note_md || ' | ', '') || 'linked from Qurʾān (2026-10-07): QR NULL review word 22:1:6', updated_at = datetime('now')
 WHERE id = 'ad69b2871efd25d7e82b69d019' AND root_id IS NULL;
INSERT OR IGNORE INTO ar_ling_root_lemma_link (id, lemma_id, root_id, link_type) VALUES ('ba80031b1c24d0b4240a1b1e95', 'ad69b2871efd25d7e82b69d019', 'b97744de632ac76074eaca51eb', 'primary');
-- «سِيرَت» 7fcbda5b54e9576ee80f7b8917: 1 word(s) · display → سِيرَة
UPDATE ar_ling_root_lemma SET root_id = '62c0cbe0005b66c6a01d3e2fd6', root_status = 'linked', frequency_quran = 1, is_quran_word = 1, lemma_text_canonical = coalesce(lemma_text_canonical, 'سِيرَة'), note_md = coalesce(note_md || ' | ', '') || 'linked from Qurʾān (2026-10-07): QR NULL review word 20:21:6; QAC stem سِيرَت', updated_at = datetime('now')
 WHERE id = '7fcbda5b54e9576ee80f7b8917' AND root_id IS NULL;
INSERT OR IGNORE INTO ar_ling_root_lemma_link (id, lemma_id, root_id, link_type) VALUES ('5ae52ae5bee028c7f2345c651e', '7fcbda5b54e9576ee80f7b8917', '62c0cbe0005b66c6a01d3e2fd6', 'primary');
-- «مَرَاضِع» a4a89bc7dfc18f8146cf9f8dec: 1 word(s)
UPDATE ar_ling_root_lemma SET root_id = '7bcad17d75ef9b03b5b414a0e8', root_status = 'linked', frequency_quran = 1, is_quran_word = 1, note_md = coalesce(note_md || ' | ', '') || 'linked from Qurʾān (2026-10-07): QR NULL review word 28:12:3', updated_at = datetime('now')
 WHERE id = 'a4a89bc7dfc18f8146cf9f8dec' AND root_id IS NULL;
INSERT OR IGNORE INTO ar_ling_root_lemma_link (id, lemma_id, root_id, link_type) VALUES ('aa04fd7ae75634aa96ac288587', 'a4a89bc7dfc18f8146cf9f8dec', '7bcad17d75ef9b03b5b414a0e8', 'primary');
-- «مَعَرَّة» 43cac3aa002436c78dd421a89b: 1 word(s)
UPDATE ar_ling_root_lemma SET root_id = 'caa68f6f68332234b623651980', root_status = 'linked', frequency_quran = 1, is_quran_word = 1, note_md = coalesce(note_md || ' | ', '') || 'linked from Qurʾān (2026-10-07): QR NULL review word 48:25:24', updated_at = datetime('now')
 WHERE id = '43cac3aa002436c78dd421a89b' AND root_id IS NULL;
INSERT OR IGNORE INTO ar_ling_root_lemma_link (id, lemma_id, root_id, link_type) VALUES ('6b671d47b6b55bb2c995171adb', '43cac3aa002436c78dd421a89b', 'caa68f6f68332234b623651980', 'primary');
-- «مُؤْتُون» ea63852dc22e8bdc37cfa31d5c: 1 word(s)
UPDATE ar_ling_root_lemma SET root_id = 'b421f7ebf570c5cc947b84a93d', root_status = 'linked', frequency_quran = 1, is_quran_word = 1, note_md = coalesce(note_md || ' | ', '') || 'linked from Qurʾān (2026-10-07): QR NULL review word 4:162:17; root moved off امن', updated_at = datetime('now')
 WHERE id = 'ea63852dc22e8bdc37cfa31d5c' AND root_id = '26062d06a34032128e64a08d1a';
UPDATE ar_ling_root_lemma_link SET root_id = 'b421f7ebf570c5cc947b84a93d' WHERE lemma_id = 'ea63852dc22e8bdc37cfa31d5c' AND root_id = '26062d06a34032128e64a08d1a';
INSERT OR IGNORE INTO ar_ling_root_lemma_link (id, lemma_id, root_id, link_type) VALUES ('66ea053d47c1e1d27e457eda32', 'ea63852dc22e8bdc37cfa31d5c', 'b421f7ebf570c5cc947b84a93d', 'primary');
-- «مُخْزِى» efe1f2cd2421711615e3260771: 1 word(s)
UPDATE ar_ling_root_lemma SET root_id = '879328dd1235f5ebc5eaaab457', root_status = 'linked', frequency_quran = 1, is_quran_word = 1, verb_form = coalesce(verb_form, 'IV'), note_md = coalesce(note_md || ' | ', '') || 'linked from Qurʾān (2026-10-07): QR NULL review word 9:2:13', updated_at = datetime('now')
 WHERE id = 'efe1f2cd2421711615e3260771' AND root_id IS NULL;
INSERT OR IGNORE INTO ar_ling_root_lemma_link (id, lemma_id, root_id, link_type) VALUES ('aeab21d268d7f12b2b353967ae', 'efe1f2cd2421711615e3260771', '879328dd1235f5ebc5eaaab457', 'primary');
-- «مُقْتَصِدَة» 218cfe2cd326b8026990987d79: 1 word(s) · display → مُقْتَصِدَة
UPDATE ar_ling_root_lemma SET root_id = '9ce079f6870380c1184b30ceee', root_status = 'linked', frequency_quran = 1, is_quran_word = 1, lemma_text_canonical = coalesce(lemma_text_canonical, 'مُقْتَصِدَة'), verb_form = coalesce(verb_form, 'VIII'), note_md = coalesce(note_md || ' | ', '') || 'linked from Qurʾān (2026-10-07): QR NULL review word 5:66:19; word-initial assimilation shadda dropped', updated_at = datetime('now')
 WHERE id = '218cfe2cd326b8026990987d79' AND root_id IS NULL;
INSERT OR IGNORE INTO ar_ling_root_lemma_link (id, lemma_id, root_id, link_type) VALUES ('9fb1860f327a831941a98f8ffa', '218cfe2cd326b8026990987d79', '9ce079f6870380c1184b30ceee', 'primary');
-- «يَتَنَافَسِ» 333f4f34317d2f43333e8d495e: 1 word(s) · display → تَنَافَسَ
UPDATE ar_ling_root_lemma SET root_id = 'b4b5234b99bdeb5a36bbdd5a58', root_status = 'linked', frequency_quran = 1, is_quran_word = 1, lemma_text_canonical = coalesce(lemma_text_canonical, 'تَنَافَسَ'), part_of_speech = 'verb', verb_form = coalesce(verb_form, 'VI'), note_md = coalesce(note_md || ' | ', '') || 'linked from Qurʾān (2026-10-07): QR NULL review word 83:26:5; QAC stem يَتَنَافَسِ is inflected; Form VI verb', updated_at = datetime('now')
 WHERE id = '333f4f34317d2f43333e8d495e' AND root_id IS NULL;
INSERT OR IGNORE INTO ar_ling_root_lemma_link (id, lemma_id, root_id, link_type) VALUES ('6ada49150b81d4184679f9d617', '333f4f34317d2f43333e8d495e', 'b4b5234b99bdeb5a36bbdd5a58', 'primary');

-- ── 4. frequency_quran recount on the lemmas the words move off (stored value = live QR link count before the move) ──
UPDATE ar_ling_root_lemma SET frequency_quran = 3068, updated_at = datetime('now') WHERE id = '3312dd99c7201accb7bc026a70' AND frequency_quran = 3938;  -- «مِن» 3939 links - 871 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 0, updated_at = datetime('now') WHERE id = '718a0e1048f5e3dd0380015d35' AND frequency_quran = 155;  -- «أَخَّرَ» 155 links - 155 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 0, updated_at = datetime('now') WHERE id = 'a45f6788a62d7a459ddc161f72' AND frequency_quran = 82;  -- «أَوَّلَ» 82 links - 82 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 0, updated_at = datetime('now') WHERE id = '2fae92fc925d2a1687eafc92ac' AND frequency_quran = 48;  -- «دَارَ» 48 links - 48 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 0, updated_at = datetime('now') WHERE id = 'a41ef697c12dcf2417c8544d1e' AND frequency_quran = 43;  -- «حَمَدَ» 43 links - 43 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 0, updated_at = datetime('now') WHERE id = 'd3a4f0a3d29c5d4d17671a9795' AND frequency_quran = 39;  -- «جَبَلَ» 39 links - 39 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 0, updated_at = datetime('now') WHERE id = '11e8125bb5ca1e95ad20cd922b' AND frequency_quran = 28;  -- «أَبْدَا» 28 links - 28 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 0, updated_at = datetime('now') WHERE id = '9d99b76a1c964f8de9792e8f06' AND frequency_quran = 26;  -- «خَوَّفَ» 26 links - 26 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 0, updated_at = datetime('now') WHERE id = '77eaab4a5f7918f0ee87b82476' AND frequency_quran = 19;  -- «ضَرَّ» 19 links - 19 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 0, updated_at = datetime('now') WHERE id = '1c7ef14db90764dfbbc272d9b3' AND frequency_quran = 19;  -- «مَكَرَ» 19 links - 19 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 1, updated_at = datetime('now') WHERE id = '085c745bab319aaaed1e48102a' AND frequency_quran = 16;  -- «أَظْلَمَ» 17 links - 16 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 0, updated_at = datetime('now') WHERE id = '67a712db15a8a40e9c20fa2a8e' AND frequency_quran = 15;  -- «اِتَّبَعَ» 15 links - 15 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 0, updated_at = datetime('now') WHERE id = '8abfba7cf434d6bc1ae97f001a' AND frequency_quran = 15;  -- «دَبَّرَ» 15 links - 15 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 0, updated_at = datetime('now') WHERE id = 'f58e7c7bf4e6b6501c4143c4af' AND frequency_quran = 10;  -- «سَعَى» 10 links - 10 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 0, updated_at = datetime('now') WHERE id = '7a33d5fcbfb3014e077469164a' AND frequency_quran = 8;  -- «اِبْيَضَ» 8 links - 8 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 0, updated_at = datetime('now') WHERE id = '44301c75dce365b8934a48f64d' AND frequency_quran = 7;  -- «حَبَّ» 7 links - 7 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 0, updated_at = datetime('now') WHERE id = 'e342c7e83c1887414afbb18ef2' AND frequency_quran = 7;  -- «وَأَدَ» 7 links - 7 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 0, updated_at = datetime('now') WHERE id = '85741eb5517ec5a3d8a6490edc' AND frequency_quran = 6;  -- «غَضَب» 6 links - 6 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 0, updated_at = datetime('now') WHERE id = '2376b6532a413b7d6953f8db67' AND frequency_quran = 6;  -- «وَقَّرَ» 6 links - 6 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 0, updated_at = datetime('now') WHERE id = '4cb466921d1fecd53f6d87e5d4' AND frequency_quran = 5;  -- «رَعَبَ» 5 links - 5 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 0, updated_at = datetime('now') WHERE id = '093ee2773f795b93d837e7b08e' AND frequency_quran = 5;  -- «سَوَّى» 5 links - 5 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 0, updated_at = datetime('now') WHERE id = '9ab164b13933f1c6484349f329' AND frequency_quran = 4;  -- «قَدَّسَ» 4 links - 4 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 0, updated_at = datetime('now') WHERE id = 'd8b10546bdc72e2a048a9f8b04' AND frequency_quran = 4;  -- «طَمَعَ» 4 links - 4 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 0, updated_at = datetime('now') WHERE id = '6410d9668ad470b40b57e99b15' AND frequency_quran = 3;  -- «مَحْل» 3 links - 3 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 0, updated_at = datetime('now') WHERE id = 'd7345862314b22bbe60bb2d94d' AND frequency_quran = 3;  -- «إِثْم» 3 links - 3 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 0, updated_at = datetime('now') WHERE id = '4e20775da70856aba5120656b4' AND frequency_quran = 3;  -- «جَارَ» 3 links - 3 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 0, updated_at = datetime('now') WHERE id = '3da4016869e349e87820404fce' AND frequency_quran = 3;  -- «بَطَشَ» 3 links - 3 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 0, updated_at = datetime('now') WHERE id = '8846f99a5e66939e7732ae462e' AND frequency_quran = 2;  -- «رَاعَ» 2 links - 2 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 0, updated_at = datetime('now') WHERE id = 'd75e659ba81416a1354c4f9b40' AND frequency_quran = 2;  -- «سَلَم» 2 links - 2 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 0, updated_at = datetime('now') WHERE id = 'b2fbb7b013dfda53ad10648d4e' AND frequency_quran = 2;  -- «بَرَأَ» 2 links - 2 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 0, updated_at = datetime('now') WHERE id = '96eacc16aa531ccdd70176f9db' AND frequency_quran = 2;  -- «آسَفَ» 2 links - 2 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 0, updated_at = datetime('now') WHERE id = '84ffbbe633ec0b2e4113c04e46' AND frequency_quran = 2;  -- «حَزَنَ» 2 links - 2 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 0, updated_at = datetime('now') WHERE id = 'ff0953d3c84930e7484fc664a1' AND frequency_quran = 2;  -- «لَمَحَ» 2 links - 2 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 0, updated_at = datetime('now') WHERE id = '0ad243e939c29e80179d502b5f' AND frequency_quran = 2;  -- «عَدَّ» 2 links - 2 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 0, updated_at = datetime('now') WHERE id = '9579e51763a291a047eb13dfe6' AND frequency_quran = 2;  -- «وِرْد» 2 links - 2 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 0, updated_at = datetime('now') WHERE id = '26a9f2efe754fcb51a2162a9a7' AND frequency_quran = 2;  -- «خَلَقَ» 2 links - 2 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 0, updated_at = datetime('now') WHERE id = 'ae32d70c15ea788424588cceb5' AND frequency_quran = 1;  -- «فَقَرَ» 1 links - 1 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 0, updated_at = datetime('now') WHERE id = 'ff16e6c16fea95b0b1e59377e1' AND frequency_quran = 1;  -- «دَرَكَ» 1 links - 1 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 0, updated_at = datetime('now') WHERE id = '7dd5669ab4eb1ae15a1c76f508' AND frequency_quran = 1;  -- «يَنَعَ» 1 links - 1 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 0, updated_at = datetime('now') WHERE id = '762dc9647b4e33872f93f3b1fa' AND frequency_quran = 1;  -- «هَارَ» 1 links - 1 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 0, updated_at = datetime('now') WHERE id = '5a2414ad8972d5587ff74acfd0' AND frequency_quran = 1;  -- «أَنْهَار» 1 links - 1 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 0, updated_at = datetime('now') WHERE id = '7dad841a7fb6c6111c24e8eddb' AND frequency_quran = 1;  -- «رَفَدَ» 1 links - 1 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 0, updated_at = datetime('now') WHERE id = 'fa7870dc2f5f8baf3ae1c968e2' AND frequency_quran = 1;  -- «غَسَقَ» 1 links - 1 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 0, updated_at = datetime('now') WHERE id = '1bc2ecb75d6bf36a2dfd5b0043' AND frequency_quran = 1;  -- «مَكَثَ» 1 links - 1 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 0, updated_at = datetime('now') WHERE id = 'd5030e8ba7111ea32c44249754' AND frequency_quran = 1;  -- «عَظَّمَ» 1 links - 1 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 0, updated_at = datetime('now') WHERE id = 'ffa5f24e0bf7cef0c227153d5a' AND frequency_quran = 1;  -- «زَكَّى» 1 links - 1 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 0, updated_at = datetime('now') WHERE id = '6c71586c0b598ce4b0041befdd' AND frequency_quran = 1;  -- «جَنَىَ» 1 links - 1 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 0, updated_at = datetime('now') WHERE id = '2ee559960a10f9527ab4b9f64e' AND frequency_quran = 1;  -- «صَلَّى» 1 links - 1 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 0, updated_at = datetime('now') WHERE id = '65a4b61dce23f6a6f178b42e13' AND frequency_quran = 1;  -- «رَهَبَ» 1 links - 1 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 0, updated_at = datetime('now') WHERE id = '04ded5cdb5eb87f72c84d89107' AND frequency_quran = 1;  -- «صَبَغَ» 1 links - 1 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 0, updated_at = datetime('now') WHERE id = '3155f347b85ef402a346075e0f' AND frequency_quran = 1;  -- «تَبَرَّج» 1 links - 1 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 0, updated_at = datetime('now') WHERE id = '36794c2dbcdc05a3b12786249a' AND frequency_quran = 1;  -- «تَنَاوَشَ» 1 links - 1 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 0, updated_at = datetime('now') WHERE id = '08b344fbbb7682a7f602fdfaef' AND frequency_quran = 1;  -- «مَضَى» 1 links - 1 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 0, updated_at = datetime('now') WHERE id = '21b1b2c9d63c3041608716132c' AND frequency_quran = 1;  -- «سَلَفَ» 1 links - 1 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 0, updated_at = datetime('now') WHERE id = '567466ca26930d52e14c1015e3' AND frequency_quran = 1;  -- «سَابِق» 1 links - 1 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 0, updated_at = datetime('now') WHERE id = '02c8af6d200efa8c95d9eeec9e' AND frequency_quran = 1;  -- «اِلْتَفَتَ» 1 links - 1 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 0, updated_at = datetime('now') WHERE id = '52f6e280dc963b4f72b9587930' AND frequency_quran = 1;  -- «صَبَّ» 1 links - 1 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 0, updated_at = datetime('now') WHERE id = 'f37626a3b3ba914666948ea69d' AND frequency_quran = 1;  -- «غَلَبَ» 1 links - 1 moved
UPDATE ar_ling_root_lemma SET frequency_quran = 0, updated_at = datetime('now') WHERE id = '81a94d81f73cce9006794734cb' AND frequency_quran = 1;  -- «فَلَقَ» 1 links - 1 moved
