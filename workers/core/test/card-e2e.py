#!/usr/bin/env python3
"""End-to-end for a card's whole life, and the limits that govern it.

Create -> edit -> type -> grade -> suspend -> unsuspend -> delete, plus the
daily limit as a setting, a per-deck override, and study-ahead's exemption.
Each check is something a user can see going wrong.
"""
import json, sys, time, urllib.request, urllib.error

BASE = "https://backend.k-maps.com/api/core"
TOK = open(sys.argv[1]).read().strip()
H = {"authorization": f"Bearer {TOK}", "content-type": "application/json",
     "user-agent": "kmaps-card-e2e/1.0"}
fails, checks = [], []


def call(method, path, body=None):
    req = urllib.request.Request(f"{BASE}{path}", method=method,
        data=json.dumps(body).encode() if body is not None else None, headers=H)
    try:
        with urllib.request.urlopen(req) as r:
            raw = r.read()
            return r.status, (json.loads(raw) if raw.strip() else {})
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, {"raw": raw[:120].decode("utf8", "replace")}


def check(name, cond, detail=""):
    checks.append(name)
    print(("  \033[32mPASS\033[0m " if cond else "  \033[31mFAIL\033[0m ") + name
          + (f"  ({detail})" if detail else ""))
    if not cond:
        fails.append(name)


STAMP = int(time.time())
print("\n\033[1m─── A card's life ───\033[0m")
st, r = call("POST", "/srs/cards", {
    "module": "QR", "resource_type": "ayah", "resource_ref": f"44:{STAMP % 50 + 1}",
    "front_text": "probe front", "back_text": "probe back",
    "card_kind": "vocabulary"})
card = r.get("data", {})
cid = card.get("id")
check("created", st in (200, 201) and bool(cid), f"state={card.get('card_state')}")

st, r = call("PATCH", f"/srs/cards/{cid}", {"front_text": "probe front v2",
                                            "card_kind": "concept",
                                            "concept_domain": "theology"})
check("edited text and type", st == 200 and r["data"]["front_text"] == "probe front v2",
      f"kind={r.get('data',{}).get('card_kind')}")
check("editing did not schedule", r["data"]["reps"] == 0 and r["data"]["card_state"] == "new",
      "a correction is not a review")

st, r = call("POST", f"/srs/cards/{cid}/grade", {"rating": 3, "duration_secs": 5})
check("graded", st == 200 and r["data"]["reps"] == 1,
      f"state={r['data']['card_state']} due in {r['data']['scheduled_days']}d")

st, r = call("PATCH", f"/srs/cards/{cid}", {"suspended": True})
check("suspended", st == 200 and r["data"]["suspended"] is True)
st, q = call("GET", "/srs/review?limit=500&ahead=3650")
check("suspended card leaves every queue",
      all(c["id"] != cid for c in q["data"]["due"]), "including the ahead horizon")

st, r = call("PATCH", f"/srs/cards/{cid}", {"suspended": False})
check("unsuspended", st == 200 and r["data"]["suspended"] is False)

st, _ = call("DELETE", f"/srs/cards/{cid}")
check("deleted", st in (200, 204))
st, _ = call("GET", f"/srs/cards/{cid}")
check("deleted card is gone", st == 404, f"HTTP {st}")

print("\n\033[1m─── Limits are a setting ───\033[0m")
st, before = call("GET", "/srs/settings")
check("settings readable", st == 200 and "new_per_day" in before["data"],
      f"{before['data'].get('new_per_day')} new/day")
st, r = call("PATCH", "/srs/settings", {"new_per_day": 7, "review_per_day": 99})
check("settings writable", st == 200 and r["data"]["new_per_day"] == 7
      and r["data"]["review_per_day"] == 99)

decks = call("GET", "/srs/decks")[1]["data"]
deck = next((d for d in decks if (d.get("card_count") or 0) > 0), decks[0] if decks else None)
if deck:
    st, q = call("GET", f"/srs/review?limit=500&deck={deck['id']}")
    d = q["data"]["daily"]
    check("deck inherits the setting", d["new_per_day"] == 7,
          f"deck '{deck['title'][:18]}' -> {d['new_per_day']}")
    check("queue never exceeds the allowance",
          sum(1 for c in q["data"]["due"] if c["card_state"] == "new") <= (d["new_left"] or 0),
          f"new served <= new_left ({d['new_left']})")

    st, r = call("PATCH", f"/srs/decks/{deck['id']}/limits", {"new_per_day": 2})
    check("deck can override the setting", st == 200 and r["data"]["new_per_day"] == 2)
    st, q = call("GET", f"/srs/review?limit=500&deck={deck['id']}")
    check("override wins over the setting", q["data"]["daily"]["new_per_day"] == 2,
          f"{q['data']['daily']['new_per_day']} not 7")

    st, q = call("GET", f"/srs/review?limit=500&deck={deck['id']}&ahead=365")
    st2, q2 = call("GET", f"/srs/review?limit=500&deck={deck['id']}")
    check("study ahead ignores the limit",
          len(q["data"]["due"]) >= len(q2["data"]["due"]),
          f"ahead {len(q['data']['due'])} >= capped {len(q2['data']['due'])}")
    # Put the deck back on the shared setting.
    call("PATCH", f"/srs/decks/{deck['id']}/limits", {"new_per_day": None, "review_per_day": None})
else:
    check("a deck exists to test limits on", False)

call("PATCH", "/srs/settings",
     {"new_per_day": before["data"]["new_per_day"], "review_per_day": before["data"]["review_per_day"]})
print(f"\n\033[1m{len(checks) - len(fails)}/{len(checks)} passed\033[0m")
if fails:
    print("\033[31mfailed:\033[0m " + ", ".join(fails))
sys.exit(1 if fails else 0)
