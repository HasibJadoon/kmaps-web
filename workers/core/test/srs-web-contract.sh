#!/bin/bash
# Does the web SRS now speak the core worker's actual contract?
#
# Every request below is the exact call the rewritten Angular service makes —
# same path, same params, same body. If a case fails, the screen is broken in
# the browser too. Run it the way the main suite runs:
#
#   KMAPS_TEST_PASSWORD='…' bash srs-web-contract.sh
#
# The password is read from the environment and never written anywhere.

B=https://backend.k-maps.com/api/core
PASS=0; FAIL=0
: "${KMAPS_TEST_EMAIL:=system@test.com}"
if [ -z "$KMAPS_TEST_PASSWORD" ]; then
  echo "KMAPS_TEST_PASSWORD is not set — the suite signs in as $KMAPS_TEST_EMAIL." >&2
  exit 2
fi
T=$(curl -s -X POST "$B/auth/login" -H 'content-type: application/json' \
      -d "{\"email\":\"$KMAPS_TEST_EMAIL\",\"password\":\"$KMAPS_TEST_PASSWORD\"}" \
    | python3 -c 'import sys,json;print(json.load(sys.stdin).get("data",{}).get("token",""))')
if [ -z "$T" ]; then echo "Sign-in failed for $KMAPS_TEST_EMAIL." >&2; exit 2; fi
A="Authorization: Bearer $T"

j() { python3 -c 'import sys,json;d=json.load(sys.stdin);print(eval("d"+sys.argv[1]))' "$1" 2>/dev/null; }
check()   { if [ "$2" = "$3" ];  then echo "  PASS  $1 ($3)"; PASS=$((PASS+1)); else echo "  FAIL  $1 — expected $2, got $3"; FAIL=$((FAIL+1)); fi; }
checkne() { if [ "$2" != "$3" ]; then echo "  PASS  $1 ($3)"; PASS=$((PASS+1)); else echo "  FAIL  $1 — should not be $2"; FAIL=$((FAIL+1)); fi; }

echo "── W. The endpoints the web app used to call (must be gone) ──"
# These are what the Angular service pointed at before the fix. If any of them
# answers 200, the old wiring was not as dead as the diagnosis claimed.
check "W1 GET /api/qr/srs is not a route" "404" \
  "$(curl -s -o /dev/null -w '%{http_code}' -H "$A" https://backend.k-maps.com/api/qr/srs)"
check "W2 POST /api/quran/srs is not a route" "404" \
  "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "$A" -H 'content-type: application/json' \
      -d '{"entity_type":"note","front":"x","back":""}' https://backend.k-maps.com/api/quran/srs)"

echo "── X. Deck list — SrsService.decks() ─────────────────────"
DECKS=$(curl -s -H "$A" "$B/srs/decks")
check "X1 decks endpoint answers" "True" "$(echo "$DECKS" | j "['ok']")"
DN=$(echo "$DECKS" | j "len(d['data'])")
checkne "X2 the account has at least one deck" "0" "$DN"
# Every field toDeckMeta() reads must exist, or the tiles render blank.
check "X3 deck rows carry id/title/counts" "True" \
  "$(echo "$DECKS" | python3 -c "
import sys,json
rows=json.load(sys.stdin)['data']
need={'id','title','deck_type','description','parent_id','card_count','due_count','new_count'}
print(bool(rows) and all(need <= set(r) for r in rows))")"
check "X4 every deck title is non-empty" "True" \
  "$(echo "$DECKS" | python3 -c "
import sys,json
rows=json.load(sys.stdin)['data']
print(all((r.get('title') or '').strip() for r in rows))")"

echo "── Y. Queue — SrsService.loadBoard() ─────────────────────"
# The exact query the service sends for the 'due' filter.
Q=$(curl -s -H "$A" "$B/srs/review?limit=200")
check "Y1 review endpoint answers" "True" "$(echo "$Q" | j "['ok']")"
check "Y2 payload has a 'due' array (not 'items')" "True" \
  "$(echo "$Q" | python3 -c "import sys,json;d=json.load(sys.stdin)['data'];print(isinstance(d.get('due'),list))")"
# decorate() reads these. A missing one is a blank card face.
check "Y3 cards carry the fields the UI renders" "True" \
  "$(echo "$Q" | python3 -c "
import sys,json
due=json.load(sys.stdin)['data']['due']
need={'id','deck_id','front_text','back_text','fields','resource_ref','root_norm',
      'intro_surah','suspended','card_state','reps','lapses','next_review_at'}
print(not due or all(need <= set(c) for c in due))")"
# Every card's deck_id must resolve, or deck_label falls back to ''.
check "Y4 every card's deck_id is a real deck" "True" \
  "$(python3 -c "
import json,subprocess,sys
h=['-H','$A']
decks=json.loads(subprocess.run(['curl','-s',*h,'$B/srs/decks'],capture_output=True,text=True).stdout)['data']
due=json.loads(subprocess.run(['curl','-s',*h,'$B/srs/review?limit=200'],capture_output=True,text=True).stdout)['data']['due']
ids={d['id'] for d in decks}
print(all(c['deck_id'] in ids for c in due))")"
# The 'upcoming'/'all' filters add ahead=365 and must widen, never narrow.
N_DUE=$(echo "$Q" | j "len(d['data']['due'])")
N_AHEAD=$(curl -s -H "$A" "$B/srs/review?limit=200&ahead=365" | j "len(d['data']['due'])")
check "Y5 ahead=365 returns at least as many as today" "True" \
  "$(python3 -c "print(int('${N_AHEAD:-0}') >= int('${N_DUE:-0}'))")"
# The surah filter the Quran review screen sends.
check "Y6 surah filter is accepted" "True" \
  "$(curl -s -H "$A" "$B/srs/review?surah=44&limit=200" | j "['ok']")"

echo "── Z. Grading — SrsService.reviewCard() ──────────────────"
CARD=$(echo "$Q" | j "d['data']['due'][0]['id']")
if [ -z "$CARD" ]; then
  echo "  SKIP  no due card on this account; grading not exercised"
else
  # The old service sent {"rating":"good"}. The worker validates 1-4, so the
  # string form must be refused — this is the case that proves the fix matters.
  check "Z1 the OLD string rating is refused" "400" \
    "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "$A" -H 'content-type: application/json' \
        -d '{"rating":"good"}' "$B/srs/cards/$CARD/grade")"
  BEFORE=$(curl -s -H "$A" "$B/srs/cards/$CARD" | j "['data']['next_review_at']")
  G=$(curl -s -X POST -H "$A" -H 'content-type: application/json' \
        -d '{"rating":3,"duration_secs":4}' "$B/srs/cards/$CARD/grade")
  check "Z2 the NEW numeric rating is accepted" "True" "$(echo "$G" | j "['ok']")"
  check "Z3 grading returns the updated card" "$CARD" "$(echo "$G" | j "['data']['id']")"
  AFTER=$(echo "$G" | j "['data']['next_review_at']")
  checkne "Z4 the schedule actually moved" "$BEFORE" "$AFTER"
  check "Z5 the graded card still decorates" "True" \
    "$(echo "$G" | python3 -c "
import sys,json
c=json.load(sys.stdin)['data']
print({'id','deck_id','card_state','next_review_at'} <= set(c))")"
fi

echo
echo "── Result ────────────────────────────────────────────────"
echo "  $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] || exit 1
