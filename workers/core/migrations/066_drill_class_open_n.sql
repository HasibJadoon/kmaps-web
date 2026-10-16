-- 066 — a class's items still to perfect, kept on the class.
-- The class lists (/core/drill/classes, the roadmap, the scores) counted each class's open items with a subquery per
-- row on every read. The count is written with every sprint (the only write that moves an item's state) and read as is.
ALTER TABLE core_drill_class ADD COLUMN open_n INTEGER NOT NULL DEFAULT 0;
UPDATE core_drill_class SET open_n = (SELECT COUNT(*) FROM core_drill_class_item i WHERE i.class_id = core_drill_class.id AND i.state = 'open');
