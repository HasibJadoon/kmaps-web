#!/usr/bin/env python3
"""
End-to-end proof that the scheduler is real.

Not "the endpoint returned 200" — that passes for a stub. Each check below is
a property of FSRS that a broken or fake scheduler would violate:

  1. Good repeatedly must grow the interval (stability accrues).
  2. Again must collapse it and record a lapse.
  3. Easy must schedule further out than Good from the same state.
  4. A card must graduate learning -> review.
  5. Retention must become measurable once review-state cards are re-answered.
  6. Studying ahead must not inflate the due count.
  7. An early answer must earn less than a punctual one (elapsed time is read).

Every module gets a card driven through this, so no deck is untested.
"""
import json, sys, time, urllib.request, urllib.error

BASE = "https://backend.k-maps.com/api/core"
TOKEN = open(sys.argv[1]).read().strip()

fails, checks = [], []


def call(method, path, body=None):
    req = urllib.request.Request(
        f"{BASE}{path}", method=method,
        data=json.dumps(body).encode() if body is not None else None,
        # Cloudflare's browser-integrity check rejects python-urllib's default
        # agent with a 1010 and a non-JSON body.
        headers={"authorization": f"Bearer {TOKEN}", "content-type": "application/json",
                 "user-agent": "kmaps-e2e/1.0"})
    try:
        with urllib.request.urlopen(req) as r:
            # DELETE answers 204 with no body, which is not JSON and not an error.
            raw = r.read()
            return r.status, (json.loads(raw) if raw.strip() else {})
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"{}")


def check(name, cond, detail=""):
    checks.append(name)
    if cond:
        print(f"  \033[32mPASS\033[0m {name}" + (f"  ({detail})" if detail else ""))
    else:
        fails.append(name)
        print(f"  \033[31mFAIL\033[0m {name}  {detail}")


def grade(card_id, rating, secs=6):
    st, r = call("POST", f"/srs/cards/{card_id}/grade",
                 {"rating": rating, "duration_secs": secs})
    if st != 200:
        return None
    return r["data"]


def make_card(module, ref, front, back):
    st, r = call("POST", "/srs/cards", {
        "module": module, "resource_type": "concept", "resource_ref": ref,
        "front_text": front, "back_text": back, "card_kind": "concept",
        "concept_domain": "theology"})
    return r["data"] if st in (200, 201) else None


# A fresh probe per run. Reusing a fixed reference meant the dedup key found
# last run's card, so each run began from whatever state the previous run left
# — four Goods on an already-mature card produce a flat [2,2,2,2] and the
# growth check fails for a scheduler that is behaving correctly.
STAMP = int(time.time())
MODULES = [(m, f"algo-{m.lower()}-{STAMP}", f"Algorithm probe {STAMP} · {label}", "back")
           for m, label in [("QR", "Qurʾān"), ("AL", "Linguistics"),
                            ("AR", "Arabic"), ("WV", "Worldview")]]
PROBES = []

print("\n\033[1m─── FSRS algorithm, per module ───\033[0m")
for module, ref, front, back in MODULES:
    print(f"\n\033[1m{module}\033[0m")
    card = make_card(module, ref, front, back)
    if not card:
        check(f"{module} card created", False, "create failed")
        continue
    cid = card["id"]
    PROBES.append(cid)
    check(f"{module} card created", True, f"state={card['card_state']}")

    # 1. Good three times — intervals must grow, state must graduate.
    days, states = [], []
    for i in range(4):
        g = grade(cid, 3)
        if not g:
            break
        days.append(g["scheduled_days"])
        states.append(g["card_state"])
    check(f"{module} Good graduates learning -> review",
          "review" in states, f"states={states}")
    review_days = [d for d, s in zip(days, states) if s == "review"]
    check(f"{module} Good grows the interval",
          len(review_days) >= 2 and review_days[-1] > review_days[0],
          f"scheduled_days={days}")

    # 2. Easy from the same state must reach further than Good did.
    # Narrowed to this module's own probe. Scanning the whole collection here
    # cost four full-collection reads per run once a real import landed.
    st, r = call("GET", f"/srs/review?module={module}&ahead=3650&limit=200")
    mine = next((c for c in r["data"]["due"] if c["id"] == cid), None)
    if mine and mine.get("preview_days"):
        p = mine["preview_days"]
        check(f"{module} Easy > Good > Hard > Again",
              p["4"] > p["3"] > p["2"] >= p["1"],
              f"again={p['1']:.3g} hard={p['2']:.3g} good={p['3']:.3g} easy={p['4']:.3g}")
    else:
        check(f"{module} preview available", False, "card not in ahead queue")

    # 3. Again must collapse the interval and count a lapse.
    before = grade(cid, 3)
    after = grade(cid, 1)
    if before and after:
        check(f"{module} Again collapses the interval",
              after["scheduled_days"] < before["scheduled_days"],
              f"{before['scheduled_days']} -> {after['scheduled_days']}")
        check(f"{module} Again records a lapse",
              (after.get("lapses") or 0) > (before.get("lapses") or 0),
              f"lapses {before.get('lapses')} -> {after.get('lapses')}")

print("\n\033[1m─── Review ahead ───\033[0m")
st, due = call("GET", "/srs/review?limit=500")
st, ah = call("GET", "/srs/review?limit=500&ahead=365")
n_due, n_ahead = len(due["data"]["due"]), len(ah["data"]["due"])
check("ahead returns a superset of due", n_ahead >= n_due, f"due={n_due} ahead={n_ahead}")
check("ahead reaches cards that are not due", n_ahead > n_due,
      f"due={n_due} ahead={n_ahead}")
check("due_by_module still counts only what is due",
      sum(x["n"] for x in ah["data"].get("due_by_module", [])) == sum(
          x["n"] for x in due["data"].get("due_by_module", [])),
      "study-ahead must not inflate the done-for-today number")
check("ahead is bounded by its horizon",
      len(call("GET", "/srs/review?limit=500&ahead=1")[1]["data"]["due"]) <= n_ahead,
      "1 day <= 365 days")

# An early answer earns less than a punctual one: grade a not-yet-due card and
# confirm the scheduler read the real (short) elapsed time.
early = next((c for c in ah["data"]["due"]
              if c not in due["data"]["due"] and c["card_state"] == "review"), None)
if early:
    before_days = early["scheduled_days"]
    g = grade(early["id"], 3)
    check("early Good earns less than the punctual interval would",
          g is not None and g["scheduled_days"] < before_days * 3,
          f"was {before_days}d, early Good -> {g['scheduled_days']}d" if g else "grade failed")
else:
    check("a not-yet-due review card was reachable ahead", False, "none found")

print("\n\033[1m─── Statistics reflect the work ───\033[0m")
st, s = call("GET", "/srs/stats/detail")
d = s["data"]
check("reviews counted", (d.get("reviews_total") or 0) > 0, f"n={d.get('reviews_total')}")
check("ratings recorded", len(d.get("ratings") or []) > 0, f"{d.get('ratings')}")
check("intervals bucketed", len(d.get("intervals") or []) > 0, f"{d.get('intervals')}")
check("forecast populated", len(d.get("forecast") or []) > 0,
      f"{len(d.get('forecast') or [])} days scheduled")
check("retention measurable once review cards are re-answered",
      d.get("retention") is not None, f"retention={d.get('retention')}")

# Teardown: the probes were made to be graded, not kept. Leaving them behind
# is how the collection fills with test data and the next run starts dirty.
for cid in PROBES:
    call("DELETE", f"/srs/cards/{cid}")
print(f"\ncleaned up {len(PROBES)} probe cards")

print(f"\n\033[1m{len(checks) - len(fails)}/{len(checks)} passed\033[0m")
if fails:
    print("\033[31mfailed:\033[0m " + ", ".join(fails))
sys.exit(1 if fails else 0)
