DELETE FROM ar_ling_lexicon_blocks
WHERE text_plain IN ('[', ']', '{', '}', '*', '.', ':', '(', ')');
