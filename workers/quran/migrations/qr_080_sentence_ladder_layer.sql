-- The sentence screen is the ladder alone now: each sentence of the passage built up from word
-- for word to fluent English. Its layer row says so.
UPDATE qr_study_label
   SET label = 'Sentence by sentence', label_ar = 'الجُمْلَة بَعْدَ الجُمْلَة',
       detail = 'Each sentence built up from word for word to fluent English'
 WHERE scope = 'layer' AND key = 'nahw';
