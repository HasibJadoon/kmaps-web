#!/usr/bin/env python3
"""Refresh km_quran's replica of the global term registry (GT).

D1 cannot join across databases, so the morphology display path cannot reach
km_arabic_linguistic.ar_ling_gram_term at serve time. km_quran therefore keeps a
complete local replica under the SAME names and structure — ar_ling_gram_term
and ar_ling_gram_category, same columns, same constraints, same ids — so a query
written against the registry in AL runs verbatim against the copy in QR, and
every read stays a single query against one database.

GT is the only authored copy. This script is the only thing that writes the
replica; nothing in km_quran is ever hand-edited. It also regenerates
qr_morph_flag_decomp, the expansion of QAC's composite flag strings ('3MS')
into the atomic terms the registry holds ('3', 'M', 'S'), so that table is
derived from GT too rather than separately maintained.

Why this exists: the table it replaces, qr_gram_term_ref, was a hand-maintained
PARTIAL projection under a local name and a local column shape — 325 of GT's
435 terms. By 2026-08 it had drifted in both
directions: 110 terms missing, and six categories serving stale label text.

Usage:
    python3 scripts/sync_gt_mirror.py --dry-run   # show the diff, write nothing
    python3 scripts/sync_gt_mirror.py             # apply to remote km_quran
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import tempfile
from datetime import date
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
AL_CFG = REPO / "workers" / "ar-linguistics" / "wrangler.toml"
QR_CFG = REPO / "workers" / "quran" / "wrangler.toml"

# QAC never emits Form I — it is the unmarked form, carried in GT by
# is_default_when_absent=1. It is not a decomposition row.
NEVER_EMITTED = {"(I)"}

# PCPL is resolved by the display view, not here. GT holds the participles as
# the composites 'ACT|PCPL' and 'PASS|PCPL', and v_morph_display_word already
# has UNION branches that pick the right one from ACT/PASS. A decomposition row
# for bare PCPL therefore cannot help and actively hurts.
#
# The table this replaces did carry PCPL -> BOTH participles, on the theory that
# a bare PCPL is ambiguous. It never is: across all 3,525 participle words in
# the corpus, PCPL occurs bare exactly 0 times — ACT or PASS is always alongside
# it. So that rule fired on every participle word and always added the wrong
# label, leaving all 3,524 of them rendering "active participle" AND "passive
# participle" at once, 2,973 of them with active listed twice (the view's own
# UNION branch re-adds it under a different sort_order, so UNION cannot dedupe).
# Dropping these two rows fixes every one of them, and leaves the expansion
# purely mechanical: nothing here is an editorial judgement any more.
HANDLED_BY_VIEW = {"PCPL"}

# person / gender / number arrive fused: '3MS', '2FP', 'MD', '1P'.
PGN = re.compile(r"^(?=.)([123])?([MF])?([SDP])?$")


def d1(cfg: Path, sql: str) -> list[dict]:
    """Run a read query against a remote D1 and return its rows."""
    out = subprocess.run(
        ["npx", "wrangler", "d1", "execute", "--remote", "--json",
         "--config", str(cfg), "--command", sql],
        capture_output=True, text=True, cwd=REPO,
    )
    if out.returncode != 0:
        sys.exit(f"wrangler failed:\n{out.stderr}")
    # wrangler prints a banner before the JSON on some versions.
    body = out.stdout[out.stdout.index("["):]
    return json.loads(body)[0]["results"]


def d1_file(cfg: Path, sql: str) -> None:
    """Apply a batch of statements to a remote D1."""
    with tempfile.NamedTemporaryFile("w", suffix=".sql", delete=False) as fh:
        fh.write(sql)
        path = fh.name
    out = subprocess.run(
        ["npx", "wrangler", "d1", "execute", "--remote",
         "--config", str(cfg), "--file", path],
        capture_output=True, text=True, cwd=REPO,
    )
    Path(path).unlink(missing_ok=True)
    if out.returncode != 0:
        sys.exit(f"wrangler failed:\n{out.stderr}")


def q(v) -> str:
    """SQL literal. Arabic and Urdu ride through as UTF-8 text."""
    if v is None:
        return "NULL"
    if isinstance(v, (int, float)):
        return str(v)
    return "'" + str(v).replace("'", "''") + "'"


def decompose(flags: list[str], terms: list[dict]) -> dict[str, list[str]]:
    """Expand each QAC flag the corpus actually emits into registry term ids.

    Resolution is keyed on (qac_scope, qac_flag), never qac_flag alone: 'P' is
    both GT:number:plural (a stem flag) and GT:pos:harf_jarr (a POS), and 'ACC'
    both GT:case:accusative and GT:harf_maani:harf_nasb (a segment tag). Keying
    on the flag alone labels prepositions as plurals.
    """
    # 'both' belongs here too: GT:tense:imperative carries qac_scope='both'
    # because IMPV shows up as a stem flag and as a segment tag. Filtering to
    # 'stem_flag' alone drops the imperative and the expansion aborts.
    stem = {t["qac_flag"]: t["id"] for t in terms
            if t["qac_scope"] in ("stem_flag", "both") and t["qac_flag"]}
    out: dict[str, list[str]] = {}
    unresolved: list[str] = []

    for flag in sorted(flags):
        if flag in NEVER_EMITTED:
            continue
        if flag in HANDLED_BY_VIEW:
            continue
        if flag in stem:                      # exact: 'ACT', '(IV)', 'MOOD:JUS'
            out[flag] = [stem[flag]]
            continue
        m = PGN.fullmatch(flag)               # fused: '3MS', 'FP', '1S'
        if m and any(m.groups()):
            ids = [stem[a] for a in m.groups() if a and a in stem]
            if len(ids) == len([g for g in m.groups() if g]):
                out[flag] = ids
                continue
        unresolved.append(flag)

    if unresolved:
        sys.exit("flags the registry cannot resolve — GT is missing a term for "
                 f"each of these, fix GT first: {unresolved}")
    return out


TERM_COLS = ["id", "category_key", "term_key", "qac_flag", "parent_term_id",
             "term_order", "name_ar", "name_en", "name_ur", "short_ar",
             "short_en", "short_ur", "definition_ar", "definition_en",
             "definition_ur", "badge_color", "icon", "version", "superseded_by",
             "status", "discipline", "is_default_when_absent", "uid",
             "qac_scope", "applies_when"]

CAT_COLS = ["category_key", "name_ar", "name_en", "name_ur", "discipline",
            "applies_to", "is_closed", "display_order", "icon"]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true",
                    help="report the diff and write nothing")
    args = ap.parse_args()

    print("reading the registry from km_arabic_linguistic …")
    terms = d1(AL_CFG, f"SELECT {','.join(TERM_COLS)} FROM ar_ling_gram_term")
    cats = d1(AL_CFG, f"SELECT {','.join(CAT_COLS)} FROM ar_ling_gram_category")
    live_sig = d1(AL_CFG, "SELECT signature FROM ar_ling_gram_term_signature")[0]["signature"]
    print(f"  {len(terms)} terms · {len(cats)} categories · signature {live_sig}")

    print("reading km_quran …")
    # Not a copy-paste of the line above: the replica defines the same view
    # under the same name, so the identical query answers "what does the copy
    # hold?" when pointed at km_quran. Comparable signatures are the whole
    # reason the names match.
    have_sig = d1(QR_CFG, "SELECT signature FROM ar_ling_gram_term_signature")[0]["signature"]
    flags = [r["flag"] for r in d1(QR_CFG,
             "SELECT DISTINCT j.value AS flag FROM qr_word_occurrence w,"
             " json_each(json_extract(w.morphology_tag_json,'$.stem.flags')) j")]
    # Reuse the sort order the current table already carries. It decides the
    # order features render in, so regenerating it from scratch would reshuffle
    # every word's badge row for no reason.
    prior = {(r["flag"], r["gram_term_ref"]): (r["sort_order"], r["requires_flag"])
             for r in d1(QR_CFG, "SELECT flag, gram_term_ref, sort_order,"
                                 " requires_flag FROM qr_morph_flag_decomp")}
    # Expand the union of what the corpus emits and what the table already
    # covers. MOOD:JUS and MOOD:SUBJ are real registry terms that never appear
    # in $.stem.flags, so deriving from the corpus alone would quietly drop
    # them; keeping them costs two rows and avoids a regression if the tagger
    # starts emitting mood.
    flags = sorted(set(flags) | {f for f, _ in prior})
    print(f"  replica signature {have_sig} · {len(flags)} distinct flags in the corpus")

    if have_sig == live_sig:
        print("\nreplica is already current — nothing to do.")
        return

    decomp = decompose(flags, terms)
    cat_order = {c["category_key"]: c["display_order"] for c in cats}
    term_cat = {t["id"]: t["category_key"] for t in terms}

    rows = 0
    # Terms carry a foreign key onto categories, so they go first. D1 does not
    # enforce FKs at runtime, but the order should still be correct.
    parts = ['DELETE FROM "ar_ling_gram_term";',
             'DELETE FROM "ar_ling_gram_category";',
             "DELETE FROM qr_morph_flag_decomp;"]
    for c in cats:
        parts.append(f"INSERT INTO ar_ling_gram_category ({','.join(CAT_COLS)}) VALUES "
                     f"({','.join(q(c[k]) for k in CAT_COLS)});")
    for t in terms:
        parts.append(f"INSERT INTO ar_ling_gram_term ({','.join(TERM_COLS)}) VALUES "
                     f"({','.join(q(t[k]) for k in TERM_COLS)});")
    for flag, ids in sorted(decomp.items()):
        for gid in ids:
            order, requires = prior.get((flag, gid),
                                        (cat_order.get(term_cat.get(gid, ""), 50), None))
            parts.append(
                "INSERT INTO qr_morph_flag_decomp (flag, gram_term_ref, sort_order,"
                f" requires_flag, derived_from) VALUES ({q(flag)}, {q(gid)},"
                f" {order}, {q(requires)}, 'ar_ling_gram_term');")
            rows += 1
    parts.append(
        "INSERT OR REPLACE INTO qr_morph_display_build (build_id, built_at,"
        " gt_signature, gt_term_count, row_count, generator, note_md) VALUES ("
        f"{q('MDB:' + date.today().isoformat())}, {q(date.today().isoformat())},"
        f" {q(live_sig)}, {len(terms)},"
        " (SELECT COUNT(*) FROM v_morph_display_word),"
        " 'scripts/sync_gt_mirror.py (full GT replica in km_quran under AL's own names; no cross-db read at serve time)',"
        f" {q('Replica refreshed from km_arabic_linguistic. Serving reads km_quran only.')});")

    print(f"\n  {len(cats)} categories · {len(terms)} terms · {rows} decomposition rows")
    print(f"  signature {have_sig} → {live_sig}")

    if args.dry_run:
        print("\n--dry-run: nothing written.")
        return

    print("\nwriting the replica …")
    d1_file(QR_CFG, "\n".join(parts))

    after = d1(QR_CFG, "SELECT signature FROM ar_ling_gram_term_signature")[0]["signature"]
    if after != live_sig:
        sys.exit(f"replica did not land: {after} != {live_sig}")
    print(f"done — replica signature {after} matches the registry.")


if __name__ == "__main__":
    main()
