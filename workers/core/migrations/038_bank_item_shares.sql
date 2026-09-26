-- A bank question shared with a workspace, beyond its pack's own visibility.
-- Every active member of the workspace can then read it — in that sūra's bank,
-- at its level, in its passage. Only the pack's owner shares; unsharing deletes
-- the row.
CREATE TABLE IF NOT EXISTS core_bank_item_share (
  item_ref      TEXT NOT NULL REFERENCES core_bank_item(id) ON DELETE CASCADE,
  workspace_id  TEXT NOT NULL REFERENCES core_workspaces(id),
  shared_by     TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  PRIMARY KEY (item_ref, workspace_id)
);
CREATE INDEX IF NOT EXISTS idx_core_bank_item_share_ws ON core_bank_item_share(workspace_id);
