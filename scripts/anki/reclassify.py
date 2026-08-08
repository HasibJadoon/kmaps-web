#!/usr/bin/env python3
"""Correct card_kind and resource_ref on cards already imported.

The classifier improved after the import ran. Re-importing would skip every
card (the origin dedup is doing its job), so the correction is a PATCH — and a
correction is not a review, so nothing about the schedule moves.
"""
import json, sys, urllib.request, urllib.error
BASE = "https://backend.k-maps.com/api/core"
TOK = open(sys.argv[1]).read().strip()
WANT = {c["origin"]: c for c in json.load(open(sys.argv[2]))}
H = {"authorization": f"Bearer {TOK}", "content-type": "application/json",
     "user-agent": "kmaps-anki/1.0"}

def call(method, path, body=None):
    req = urllib.request.Request(f"{BASE}{path}", method=method,
        data=json.dumps(body).encode() if body else None, headers=H)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, e.read()[:200].decode("utf8", "replace")

_, q = call("GET", "/srs/review?limit=500&ahead=36500")
live = [c for c in q["data"]["due"] if str(c.get("card_template", "")).startswith("anki:")]
print(f"live anki cards: {len(live)}  prepared: {len(WANT)}")

fixed_kind = missing = 0
for c in live:
    want = WANT.get(c["card_template"])
    if not want:
        missing += 1
        continue
    if c.get("card_kind") != want["card_kind"]:
        st, _ = call("PATCH", f"/srs/cards/{c['id']}", {"card_kind": want["card_kind"]})
        if st == 200:
            fixed_kind += 1
print(f"kind corrected : {fixed_kind}")
print(f"not in prepared: {missing}")
