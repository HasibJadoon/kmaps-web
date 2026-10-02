-- Where a learner left a class (drill-engine plan §2.3: "the class can be left and resumed on any
-- day, on iPhone or Mac"): the sprint under way — its node, its drills in order, which one is up,
-- every answer so far, the words marked — or the listen-through being heard. Written after each
-- answer; cleared when that sprint is sent. The device reopens the class exactly there.
ALTER TABLE core_drill_class ADD COLUMN resume_json TEXT;
ALTER TABLE core_drill_class ADD COLUMN resume_at TEXT;
