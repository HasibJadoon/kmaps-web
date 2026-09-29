-- ar_text_unit_fts is an external-content index over ar_text_unit (text_ar, title_ar), kept
-- in step by triggers — but only on insert and delete. An UPDATE to a page's text or heading
-- left the index holding the old words. This keeps it current: the old row's words come out
-- and the new row's go in, only when one of the indexed columns actually changed.
CREATE TRIGGER IF NOT EXISTS ar_text_unit_au AFTER UPDATE ON ar_text_unit
WHEN old.text_ar IS NOT new.text_ar OR old.title_ar IS NOT new.title_ar
BEGIN
  INSERT INTO ar_text_unit_fts(ar_text_unit_fts, rowid, text_ar, title_ar)
  VALUES ('delete', old.rowid, old.text_ar, old.title_ar);
  INSERT INTO ar_text_unit_fts(rowid, text_ar, title_ar)
  VALUES (new.rowid, new.text_ar, new.title_ar);
END;
