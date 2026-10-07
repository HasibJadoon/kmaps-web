-- The sentence screen shows the sentence's analysis again (its text and its board), so its
-- layer row goes back to the name it had before qr_080.
UPDATE qr_study_label
   SET label = 'Grammar & rhetoric', label_ar = 'النَّحْو وَالبَلَاغَة',
       detail = 'What each word does in its sentence, and how the wording carries its meaning'
 WHERE scope = 'layer' AND key = 'nahw';
