-- Two Ibn Fāris rows got a "Reading:" note listing his other core meanings, written by a reviewer without a block id.
-- Both are confirmed in his own text; the block ids are added so the note points back to the book.
UPDATE ar_ling_root_asl SET note_md = note_md || ' Other core meanings in his text: «وساعةٌ من الزمان، وإدراك الشيء، وظَرف من الظروف» (next block, Maqāyīs p.542–543).' WHERE id = 'ASL:اني:maqayis_lugha' AND note_md NOT LIKE '%وساعةٌ من الزمان%';
UPDATE ar_ling_root_asl SET note_md = note_md || ' Second core meaning in his text: «والأصل الثاني ظُهور الشيء، نباتاً وغيره» (blk_mqy_499f69f749600465).' WHERE id = 'ASL:جدر:maqayis_lugha' AND note_md NOT LIKE '%blk_mqy_499f69f749600465%';
