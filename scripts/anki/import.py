#!/usr/bin/env python3
"""Send the prepared collection to /core/srs/import/anki, in batches."""
import json, sys, time, urllib.request, urllib.error

BASE = "https://backend.k-maps.com/api/core"
TOKEN = open(sys.argv[1]).read().strip()
CARDS = json.load(open(sys.argv[2]))
BATCH = int(sys.argv[3]) if len(sys.argv) > 3 else 20
DRY = "--dry" in sys.argv


def post(path, body):
    req = urllib.request.Request(
        f"{BASE}{path}", method="POST", data=json.dumps(body).encode(),
        headers={"authorization": f"Bearer {TOKEN}", "content-type": "application/json",
                 "user-agent": "kmaps-anki-import/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, (e.read()[:300]).decode("utf8", "replace")


payload = [{
    "module": c["module"],
    "resource_ref": c["resource_ref"],
    "card_kind": c["card_kind"],
    "front_text": c["front"],
    "back_text": c["back"],
    "origin": c["origin"],
    "tags": c["tags"],
    "reviews": c["reviews"],
} for c in CARDS]

print(f"{len(payload)} cards, {sum(len(c['reviews']) for c in payload)} reviews to replay")
if DRY:
    print(json.dumps(payload[0], ensure_ascii=False, indent=1)[:900])
    sys.exit(0)

tot = {"imported": 0, "skipped": 0, "replayed": 0}
for i in range(0, len(payload), BATCH):
    chunk = payload[i:i + BATCH]
    t = time.monotonic()
    status, res = post("/srs/import/anki", {"cards": chunk})
    if status not in (200, 201):
        print(f"  batch {i // BATCH + 1}: HTTP {status} {res}")
        continue
    d = res["data"]
    for k in tot:
        tot[k] += d.get(k, 0)
    print(f"  batch {i // BATCH + 1:2d}: +{d['imported']:2d} imported, "
          f"{d['skipped']:2d} skipped, {d['replayed']:4d} reviews replayed "
          f"({time.monotonic() - t:.1f}s)")

print(f"\ntotal: {tot}")
