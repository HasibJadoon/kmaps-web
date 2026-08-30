UPDATE ar_ling_lexicon_block
SET data_json = json_set(
      data_json,

      '$.forms[0].senses', json('[
        {"sense":   {"ar":"الانفصال","en":"separation","ur":"جدائی"},
         "example": {"ar":"لَقَدْ تَقَطَّعَ بَيْنَكُمْ",
                     "en":"the tie between you has been severed",
                     "ur":"تمہارے درمیان کا تعلق منقطع ہو گیا"}}
      ]'),
      '$.forms[0].shahid', json('{
        "ar":"لَقَدْ تَقَطَّعَ بَيْنَكُمْ — أي: وصلُكم",
        "en":"the tie between you has been severed — that is, your bond",
        "ur":"تمہارے درمیان کا تعلق کٹ گیا — یعنی تمہارا رشتہ"
      }'),
      '$.forms[0].trans_note', json('{
        "ar":"ومنه: البئرُ البعيدةُ القعرِ بَيُونٌ، لبُعدِ ما بين الشَّفيرِ والقعرِ",
        "en":"hence a deep-bottomed well is a bayūn, for the distance between its brink and its bottom",
        "ur":"اسی سے: گہرا کنواں بَیُون کہلاتا ہے، کنارے اور تہہ کے درمیان دوری کے سبب"
      }'),

      '$.forms[1].senses', json('[
        {"sense":   {"ar":"الظهور","en":"disclosure","ur":"ظہور"},
         "example": {"ar":"وبانَ الصبحُ: ظهَرَ",
                     "en":"the dawn bāna — it appeared",
                     "ur":"صبح ظاہر ہو گئی"}}
      ]'),
      '$.forms[1].shahid', json('{
        "ar":"وبانَ الصبحُ: ظهَرَ",
        "en":"and the dawn bāna — it appeared",
        "ur":"اور صبح نمودار ہوئی"
      }')
    )
WHERE id = 'blk_mfr2_fam'
  AND block_type = 'sarf_family'
  AND source_slug = 'raghib_mufradat'
  AND root_norm = 'بين';
