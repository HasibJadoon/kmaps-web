-- 0063 — al-Rāghib's بين ṣarf family: the depth his own article already carries.
--
-- The Form I cards rendered thin: two rows differing only by `pole`, no senses,
-- no shāhid, so the reader's expanded card had nothing to open into.
--
-- PROVENANCE. Everything seeded below is taken verbatim from al-Rāghib's own
-- entry as it already sits in this database
-- (ar_ling_lexicon_entry_section, source_slug='raghib_mufradat', root_norm='بين',
-- section_seq=1). Quoted here so the seed can be checked against it:
--
--   «بَيْنٌ موضوعٌ للخَلالةِ بين الشيئينِ ووسَطِهما … يقال: بَانَ كذا أي: انفصلَ وظهرَ
--    ما كان مستتراً منه، ولمّا اعتُبِرَ فيه معنى الانفصالِ والظهورِ استُعمِلَ في كلِّ
--    واحدٍ منفرداً، فقيل للبئرِ البعيدةِ القعرِ: بَيُونٌ، لبُعدِ ما بين الشَّفيرِ والقعرِ
--    لانفصالِ حبلِها من يدِ صاحبِها. وبانَ الصبحُ: ظهَرَ، وقولُه تعالى:
--    ﴿لَقَدْ تَقَطَّعَ بَيْنَكُمْ﴾ [الأنعام:٩٤]، أي: وصلُكم.»
--
-- That sentence is why there are two Form I rows in the first place: al-Rāghib
-- says the root's two senses were "used each one on its own", so the split is
-- his, not an editorial one. The seed simply gives each row the sense and the
-- witness he attaches to it.
--
-- NOT SEEDED, deliberately. The mockup for this card also shows an ism al-fāʿil
-- `بائِن` and the proverb `قَدْ بَانَ الصُّبْحُ لِذِي عَيْنَيْن`. Neither appears in
-- al-Rāghib's article. Both may well be sound Arabic, but attributing them to
-- him here would put unverified content behind his name, which is exactly what
-- km-root-forms-build rule 5 forbids. If they are wanted, they need a real
-- source and their own migration.
--
-- Additive only: every json_set below writes a key that is currently null or
-- absent. No existing value is overwritten.

UPDATE ar_ling_lexicon_block
SET data_json = json_set(
      data_json,
      -- ── Form I · separation (mfr2-f1) ─────────────────────────────────────
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
      -- ── Form I · disclosure (mfr2-f2) ─────────────────────────────────────
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

-- Guard: the block must still be valid JSON after the patch.
-- SELECT json_valid(data_json) FROM ar_ling_lexicon_block WHERE id='blk_mfr2_fam';
