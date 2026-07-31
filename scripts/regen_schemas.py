#!/usr/bin/env python3
"""Regenerate workers/*/schema.sql from the live Cloudflare D1 databases.

D1 is the source of truth for schema in this repo, and it is the only one.
The migration directories cannot serve that role — `content` and `worldview`
carry zero migration files against 38 and 158 live tables, so most objects were
created outside the migrations system. There is no local D1 either: `.wrangler`
holds only `tmp`, so nothing is shadowing the remote. Reading `sqlite_master`
back off each remote database is therefore the only way to know the schema, and
these files are a checked-in snapshot of that read — documentation, never an
input to anything.

Every schema.sql already says "do not hand-edit · regenerate with
scripts/regen_schemas.py". That script had never been committed. This is it.

Usage:
    python3 scripts/regen_schemas.py            # every worker
    python3 scripts/regen_schemas.py core quran # only these
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
from datetime import date
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
WORKERS_DIR = REPO / "workers"

# FTS5 creates shadow tables next to each virtual table. They are an
# implementation detail of the parent and must not be declared: recreating the
# virtual table recreates them, and declaring them by hand would conflict.
FTS_SHADOW_SUFFIXES = ("_config", "_data", "_docsize", "_idx", "_content")


def workers() -> list[str]:
    """Worker directories that bind a D1 database."""
    found = []
    for toml in sorted(WORKERS_DIR.glob("*/wrangler.toml")):
        if "database_name" in toml.read_text():
            found.append(toml.parent.name)
    return found


def database_name(worker: str) -> str:
    text = (WORKERS_DIR / worker / "wrangler.toml").read_text()
    match = re.search(r'database_name\s*=\s*"([^"]+)"', text)
    if not match:
        raise SystemExit(f"{worker}: no database_name in wrangler.toml")
    return match.group(1)


def read_schema(worker: str, db: str) -> list[dict]:
    """Every object in the remote sqlite_master, minus platform bookkeeping."""
    command = (
        "SELECT type, name, tbl_name, sql FROM sqlite_master "
        "WHERE sql IS NOT NULL "
        "AND name NOT LIKE 'sqlite_%' "
        "AND name NOT LIKE '_cf_%' "
        "AND name NOT LIKE 'd1_%' "
        "ORDER BY type, name"
    )
    result = subprocess.run(
        ["npx", "wrangler", "d1", "execute", db, "--remote",
         "--config", f"workers/{worker}/wrangler.toml", "--json",
         "--command", command],
        cwd=REPO, capture_output=True, text=True,
    )
    if result.returncode != 0:
        raise SystemExit(f"{worker}: wrangler failed\n{result.stderr[:800]}")
    # wrangler prints a banner before the JSON, so the payload is located
    # rather than assumed to start at byte zero.
    match = re.search(r'"results":\s*(\[.*?\])\s*,\s*"success"', result.stdout, re.S)
    if not match:
        raise SystemExit(f"{worker}: no results in wrangler output\n{result.stdout[:800]}")
    return json.loads(match.group(1))


def is_fts_shadow(name: str, virtual_tables: set[str]) -> bool:
    return any(
        name.endswith(suffix) and name[: -len(suffix)] in virtual_tables
        for suffix in FTS_SHADOW_SUFFIXES
    )


def render(db: str, rows: list[dict]) -> str:
    virtual = {
        r["name"] for r in rows
        if r["type"] == "table" and re.match(r"\s*CREATE\s+VIRTUAL", r["sql"] or "", re.I)
    }
    kept = [r for r in rows if not is_fts_shadow(r["name"], virtual)]

    tables = [r for r in kept if r["type"] == "table"]
    views = [r for r in kept if r["type"] == "view"]
    indexes = [r for r in kept if r["type"] == "index"]
    triggers = [r for r in kept if r["type"] == "trigger"]

    out = [
        f"-- Schema for {db}.",
        f"-- Generated from remote Cloudflare D1 sqlite_schema with data excluded, {date.today()}.",
        "-- Internal D1 bookkeeping tables and FTS5 shadow tables are omitted.",
        "-- Regenerate with scripts/regen_schemas.py — do not hand-edit.",
    ]
    for title, group in (("Tables", tables), ("Views", views),
                         ("Indexes", indexes), ("Triggers", triggers)):
        if not group:
            continue
        heading = f"-- ── {title} ({len(group)}) "
        out.append("")
        out.append(heading + "─" * max(4, 68 - len(heading)))
        out.append("")
        for row in group:
            statement = (row["sql"] or "").rstrip().rstrip(";")
            out.append(f"{statement};")
            out.append("")
    return "\n".join(out).rstrip() + "\n"


def main() -> None:
    targets = sys.argv[1:] or workers()
    for worker in targets:
        db = database_name(worker)
        rows = read_schema(worker, db)
        path = WORKERS_DIR / worker / "schema.sql"
        before = path.read_text() if path.exists() else ""
        after = render(db, rows)
        path.write_text(after)
        status = "unchanged" if before == after else "UPDATED"
        counts = {}
        for row in rows:
            counts[row["type"]] = counts.get(row["type"], 0) + 1
        summary = " ".join(f"{k}={v}" for k, v in sorted(counts.items()))
        print(f"{worker:<16} {db:<24} {status:<9} {summary}")


if __name__ == "__main__":
    main()
