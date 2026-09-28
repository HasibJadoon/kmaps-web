/// The Notion tree above every work: a recursive walk up ar_acq_entry, as CTEs
/// `path` (start_ar_no → trail, levels). Prefix a query with it and join
/// `path ON path.start_ar_no = e.ar_no`. Used by the shelf and the rooms.
export const ANCESTRY = `
  WITH RECURSIVE up(start_ar_no, ar_no, name, parent_ar_no, depth) AS (
    SELECT e.ar_no, e.ar_no, e.name, e.parent_ar_no, 0 FROM ar_acq_entry e
    UNION ALL
    SELECT up.start_ar_no, p.ar_no, p.name, p.parent_ar_no, up.depth + 1
      FROM ar_acq_entry p JOIN up ON p.ar_no = up.parent_ar_no
     WHERE up.depth < 6
  ),
  named AS (
    SELECT up.start_ar_no, up.depth,
           COALESCE(c.name_ar, up.name) AS label
      FROM up LEFT JOIN ar_acq_category c ON c.id = up.ar_no
     WHERE up.depth > 0
  ),
  path AS (
    SELECT start_ar_no,
           group_concat(label, ' ▸ ') AS trail,
           MAX(depth)                 AS levels
      FROM (SELECT * FROM named ORDER BY start_ar_no, depth DESC)
     GROUP BY start_ar_no
  )`;
