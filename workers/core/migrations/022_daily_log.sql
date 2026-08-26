-- 022 — the daily log
--
-- One table, `core_daily_log`, for logging a day's work against the K-MAPS
-- corpus. It exists to answer one question before work starts rather than
-- after: **have I already done this?**
--
-- The looping problem is concrete. `ar_ling_gram_external_toc` already holds
-- 389 ʿUḍayma ṣarf entries; 238 ids inside the same span are unloaded. There
-- are 4,026 `sarf_family` blocks across an 11-source roster. `ar_ling_gram_term`
-- holds 399 terms of which 79 are QAC-backed. Nothing in any of those tables
-- records *when a human last looked at them*, so the same source × root can be
-- rebuilt three times and the same registry category audited twice, and the
-- data itself gives no signal that it happened.
--
-- So the loop guard is `unit_ref` — one free-text typed reference naming the
-- exact thing touched, in whatever namespace fits the work:
--
--   raghib_mufradat×برك      a source × root sarf_family build
--   GT:transitivity:mutaaddi  a registry term
--   adima:sarf:14690          a jamharah TOC entry
--   QR:44:2                   an āyah
--
-- Indexed on its own, so `WHERE unit_ref = ?` is the pre-flight check. It is
-- deliberately NOT unique: doing something twice on purpose is legitimate, and
-- a constraint that rejects the second row would hide the repetition instead
-- of showing it. Two rows with the same `unit_ref` IS the loop, visible.
--
-- Written for low-friction logging. Every column that can carry a default
-- does: `id`, `log_date`, `focus` and `state` all fill themselves, so the
-- smallest honest insert is two values —
--
--   INSERT INTO core_daily_log (project, whats_new)
--   VALUES ('km_arabic_linguistic', 'checked the 11-source roster for كشف');
--
-- A log that demands eight fields per entry does not get written.
--
-- `already_checked` is the other half of the guard: not what was built, but
-- what was ruled out. That is the finding most often lost between sessions and
-- most expensive to re-derive.
--
-- Run one statement at a time: D1 rejects a file that mixes DDL with INSERTs
-- and returns `D1_RESET_DO` without naming the reason.

-- 1. The table.
CREATE TABLE IF NOT EXISTS core_daily_log (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  log_date        TEXT NOT NULL DEFAULT (date('now')),

  -- where the work happened
  project         TEXT NOT NULL,
  focus           TEXT NOT NULL DEFAULT 'other'
                    CHECK (focus IN ('registry','sources','morphology','cards',
                                     'schema','app','docs','other')),

  -- the loop guard — what exactly was touched
  unit_kind       TEXT CHECK (unit_kind IS NULL OR unit_kind IN
                    ('source_root','gram_term','adima_toc','ayah','root',
                     'lemma','table','other')),
  unit_ref        TEXT,
  source_slug     TEXT,

  -- what changed
  whats_new       TEXT NOT NULL,
  state           TEXT NOT NULL DEFAULT 'done'
                    CHECK (state IN ('done','partial','blocked','abandoned','exploring')),
  next_step       TEXT,
  already_checked TEXT,

  -- monitoring yourself
  minutes         INTEGER CHECK (minutes IS NULL OR minutes >= 0),
  energy          INTEGER CHECK (energy IS NULL OR energy BETWEEN 1 AND 5),
  felt            TEXT,

  session_url     TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. The pre-flight lookup: "have I touched this before?"
CREATE INDEX IF NOT EXISTS idx_daily_log_unit ON core_daily_log(unit_ref);

-- 3. The diary read: most recent first.
CREATE INDEX IF NOT EXISTS idx_daily_log_date ON core_daily_log(log_date DESC);

-- 4. Focus over time — which lane actually got worked, vs which felt worked.
CREATE INDEX IF NOT EXISTS idx_daily_log_focus ON core_daily_log(focus, log_date DESC);

-- 5. Source coverage — which of the 11 sources have been touched at all.
CREATE INDEX IF NOT EXISTS idx_daily_log_source ON core_daily_log(source_slug);
