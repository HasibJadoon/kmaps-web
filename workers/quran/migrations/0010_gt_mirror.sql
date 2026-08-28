-- 0010_gt_mirror.sql — replicate the global term registry into km_quran
--
-- WHY THIS EXISTS
-- ---------------
-- D1 cannot join across databases. The morphology display path needs a
-- trilingual label for every QAC feature on every promoted word, and the terms
-- live in km_arabic_linguistic.ar_ling_gram_term. Reaching them at serve time
-- would mean a second round trip and a join done in JS, on the hot path of
-- every passage read. So km_quran carries the registry itself.
--
-- IT IS A REPLICA, NOT A PROJECTION
-- ---------------------------------
-- Same table names, same structure, same ids. ar_ling_gram_term here is
-- byte-for-byte the DDL of ar_ling_gram_term there — same columns, same
-- constraints, same unique index — and every row keeps the id it has in AL
-- ('GT:form_family:form_iii' is that string in both databases). A query written
-- against the registry in AL runs verbatim against the copy in QR. There is no
-- mapping layer to drift, and no local naming to translate through.
--
-- This replaces qr_gram_term_ref, which was none of those things: a
-- hand-maintained PARTIAL projection under a local name, 325 of the registry's
-- 435 terms, with its own column shape. By 2026-08 it had drifted both ways —
-- 110 terms missing outright, and six categories serving stale text (e.g.
-- GT:sigha_maani:musharaka read "reciprocal" locally against the registry's
-- "reciprocal — the act runs between two parties").
--
-- THE CONTRACT
-- ------------
-- 1. km_arabic_linguistic holds the ONLY authored copy. Nothing here is ever
--    hand-edited; every row is written by scripts/sync_gt_mirror.py.
-- 2. The replica is COMPLETE — all 435 terms, all 30 categories, every column.
--    A subset is what rotted last time and is not permitted.
-- 3. Drift is detectable: ar_ling_gram_term_signature is defined here with the
--    identical body it has in AL, so the two signatures are directly
--    comparable. Equal means current. This is the check GT-008 should make —
--    the previous one compared AL's signature against a recorded copy of AL's
--    OWN signature, which matches by construction and can never detect drift.

-- ── the replica ──────────────────────────────────────────────────────────────
-- Category first: ar_ling_gram_term carries a foreign key onto it.
CREATE TABLE IF NOT EXISTS "ar_ling_gram_category" (
  category_key   TEXT PRIMARY KEY,
  name_ar TEXT NOT NULL, name_en TEXT NOT NULL, name_ur TEXT NOT NULL,
  discipline     TEXT NOT NULL,
  applies_to     TEXT NOT NULL,
  is_closed      INTEGER NOT NULL DEFAULT 1,
  display_order  INTEGER NOT NULL DEFAULT 0,
  icon           TEXT
);

CREATE TABLE IF NOT EXISTS "ar_ling_gram_term" (
  id             TEXT PRIMARY KEY,
  category_key   TEXT NOT NULL,
  term_key       TEXT NOT NULL,
  qac_flag       TEXT,
  parent_term_id TEXT,
  term_order     INTEGER NOT NULL DEFAULT 0,
  name_ar TEXT NOT NULL, name_en TEXT NOT NULL, name_ur TEXT NOT NULL,
  short_ar TEXT, short_en TEXT, short_ur TEXT,
  definition_ar TEXT, definition_en TEXT, definition_ur TEXT,
  badge_color TEXT, icon TEXT,
  version     INTEGER NOT NULL DEFAULT 1,
  superseded_by TEXT,
  status      TEXT NOT NULL DEFAULT 'live', discipline TEXT, is_default_when_absent INTEGER NOT NULL DEFAULT 0, uid TEXT, qac_scope TEXT, applies_when TEXT,
  UNIQUE (category_key, term_key),
  UNIQUE (category_key, qac_flag),
  FOREIGN KEY (category_key)   REFERENCES "ar_ling_gram_category"(category_key),
  FOREIGN KEY (parent_term_id) REFERENCES "ar_ling_gram_term"(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_gram_term_uid ON ar_ling_gram_term(uid);

-- No extra indexes: everything the display view looks up goes through the
-- primary key (features_json joins on t.id, the derived-type subqueries match
-- t.id against a literal GT ref), and the sync reads every row anyway. Adding
-- local-only indexes would be the first step back towards a divergent copy.
--
-- One trap for anything resolving a raw QAC flag: qac_flag is unique only
-- WITHIN a category, and two categories legitimately share a string. 'P' is
-- both GT:number:plural (a stem flag) and GT:pos:harf_jarr (a POS); 'ACC' both
-- GT:case:accusative and GT:harf_maani:harf_nasb (a segment tag). Key on
-- (qac_scope, qac_flag) or prepositions get labelled plural.

-- ── staleness ────────────────────────────────────────────────────────────────
-- Same name and same body as the view in km_arabic_linguistic, so the two
-- signatures can be compared directly. The charsum term is what catches a label
-- edit made without bumping version (GT-009).
CREATE VIEW IF NOT EXISTS ar_ling_gram_term_signature AS
 SELECT COUNT(*) AS term_count,
        COUNT(DISTINCT category_key) AS category_count,
        SUM(version) AS version_sum,
        SUM(CASE WHEN status='live' THEN 1 ELSE 0 END) AS live_count,
        COUNT(*)||'.'||COUNT(DISTINCT category_key)||'.'||SUM(version)||'.'||SUM(length(id)+length(name_ar)+length(name_en)+length(COALESCE(name_ur,''))) AS signature
 FROM ar_ling_gram_term;

-- ── flag decomposition, derived from the replica ─────────────────────────────
-- qr_morph_flag_decomp stays a TABLE rather than a view because the expansion
-- needs string parsing SQLite does badly: QAC emits '3MS' as ONE flag while the
-- registry holds '3', 'M' and 'S' as three separate terms. Its rows are written
-- by scripts/sync_gt_mirror.py from ar_ling_gram_term, so the registry stays the
-- only authored source here too. This one keeps its qr_ prefix — it is a
-- km_quran-local mapping from the corpus tagger's vocabulary onto registry ids,
-- not part of the registry.
--
-- Two flags the expansion deliberately omits:
--   • Form I — never emitted by QAC. It is the unmarked form, carried in the
--     registry by is_default_when_absent=1 with applies_when 'V:root3'.
--   • PCPL — resolved by the UNION branches in the view below, which pick the
--     right participle from ACT/PASS. The table this replaces mapped bare PCPL
--     to BOTH participles on the theory that it is ambiguous without them. It
--     never is: PCPL occurs bare 0 times in 3,525 participle words. That rule
--     therefore fired on every participle word and always added the wrong
--     label — all 3,524 rendered 'active participle' and 'passive participle'
--     together, 2,973 with active twice (the view re-adds it under a different
--     sort_order, so UNION cannot dedupe). Dropping it fixes all of them.
--
-- With those two gone the expansion is purely mechanical: 82 rows, no editorial
-- judgement, reproducible from ar_ling_gram_term alone.
ALTER TABLE qr_morph_flag_decomp ADD COLUMN derived_from TEXT NOT NULL DEFAULT 'ar_ling_gram_term';

-- NOTE ON ORDER — this migration deliberately does NOT touch the serving view.
-- It creates the replica empty. Repointing v_morph_display_word here would make
-- every morphology read join an empty table until the sync finishes, which is a
-- live outage for the length of that gap. The cutover is 0011, applied only
-- after scripts/sync_gt_mirror.py has populated and verified the replica:
--
--   1. wrangler d1 migrations apply km_quran   (0010 — create, empty)
--   2. python3 scripts/sync_gt_mirror.py       (populate + signature check)
--   3. apply 0011                              (cutover + drop the old table)

