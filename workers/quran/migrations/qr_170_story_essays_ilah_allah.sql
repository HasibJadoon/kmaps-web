-- the إله essay (km_content qr-keyterm-essay-ilah) joins the path before its story
UPDATE qr_keyterm_story SET essay_slug = 'qr-keyterm-essay-ilah' WHERE term_key = 'ilah';
-- touch the label so the 'rest' cache family moves and kept paths rebuild
UPDATE qr_study_label SET detail = detail WHERE scope = 'class_ui' AND key = 'essay_of';
-- and the الله essay (qr-keyterm-essay-allah)
UPDATE qr_keyterm_story SET essay_slug = 'qr-keyterm-essay-allah' WHERE term_key = 'allah';
UPDATE qr_study_label SET detail = detail WHERE scope = 'class_ui' AND key = 'essay_of';
