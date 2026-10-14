-- The word an example is about (ṣarf: the word that shows the form or the sound change; naḥw: the word in that role),
-- so a drill can mark it in the line. NULL = the whole line shows the concept.
ALTER TABLE ar_ling_gram_term_example ADD COLUMN focus_ar TEXT;
