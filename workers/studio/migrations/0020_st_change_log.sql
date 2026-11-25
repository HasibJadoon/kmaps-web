-- One Studio, the audit trail: every studio.py apply writes the rows it changed, before and after, under one batch id,
-- so any batch can be undone (`studio.py undo <batch>`) and unmapped legacy meta keys are archived verbatim.
CREATE TABLE IF NOT EXISTS st_change_log (
  batch_id     TEXT NOT NULL,
  seq          INTEGER NOT NULL,
  db           TEXT NOT NULL,
  tbl          TEXT NOT NULL,
  pk           TEXT NOT NULL,
  op           TEXT NOT NULL,                    -- insert | update | archive | delete | note
  before_json  TEXT,
  after_json   TEXT,
  at           TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (batch_id, seq)
);
