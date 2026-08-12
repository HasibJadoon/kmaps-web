#!/bin/bash
# SRS end-to-end test plan, run against the live API as system@test.com.
#
# Each case states what it proves. A case that can only ever pass proves
# nothing, so the negative cases (auth, permission, idempotency) matter most.

S="$(dirname "$0")"
B=https://backend.k-maps.com/api/core
PASS=0; FAIL=0

# The suite logs itself in. It used to read a tok.txt that was never in the
# repo, so a fresh checkout produced 39 failures that all looked like broken
# endpoints and were really one missing file. The password stays out of the
# repo: pass it in the environment.
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

# The path is passed as argv, not interpolated into the source: embedding
# "['data']['x']" inside a quoted -c string terminates the Python string.
j() { python3 -c 'import sys,json;d=json.load(sys.stdin);print(eval("d"+sys.argv[1]))' "$1" 2>/dev/null; }

check() { # name expected actual
  if [ "$2" = "$3" ]; then echo "  PASS  $1 ($3)"; PASS=$((PASS+1));
  else echo "  FAIL  $1 — expected $2, got $3"; FAIL=$((FAIL+1)); fi
}
checkne() { # name notexpected actual
  if [ "$2" != "$3" ]; then echo "  PASS  $1 ($3)"; PASS=$((PASS+1));
  else echo "  FAIL  $1 — should not be $2"; FAIL=$((FAIL+1)); fi
}

echo "── A. Identity and access ────────────────────────────────"
check "A1 auth/me returns the account" "system@test.com" \
  "$(curl -s -H "$A" $B/auth/me | j "['data']['user']['email']")"
check "A2 unauthenticated review is refused" "401" \
  "$(curl -s -o /dev/null -w '%{http_code}' $B/srs/review)"
check "A3 garbage token is refused" "401" \
  "$(curl -s -o /dev/null -w '%{http_code}' -H 'Authorization: Bearer nonsense' $B/srs/review)"

echo "── B. Taxonomy ───────────────────────────────────────────"
check "B1 QR kinds include translation/idiom/concept" "True" \
  "$(curl -s -H "$A" $B/srs/taxonomy | j "['data']['modules']['QR']['kinds']" | grep -q "translation" && echo True)"
check "B2 four study modules present" "True" \
  "$(curl -s -H "$A" $B/srs/taxonomy | python3 -c "import sys,json;m=json.load(sys.stdin)['data']['modules'];print(all(k in m for k in ['QR','AL','AR','WV']))")"
check "B3 concept domains include law + ethics" "True" \
  "$(curl -s -H "$A" $B/srs/taxonomy | python3 -c "import sys,json;d=json.load(sys.stdin)['data']['concept_domains'];print('law' in d and 'ethics' in d)")"

echo "── C. Master library ─────────────────────────────────────"
# Counts are read, not hardcoded. The suite used to assert "32", which was
# true only of an account nobody had used: one approved submission later,
# every count-based case failed and pointed at endpoints that were fine.
LIB44=$(curl -s -H "$A" "$B/srs/library/items?surah=44" | j "['data']['available']")
check "C1 surah 44 offers a library" "True" \
  "$([ "${LIB44:-0}" -ge 32 ] && echo True)"
check "C2 nothing is held that is not offered" "True" \
  "$(curl -s -H "$A" "$B/srs/library/items?surah=44" | python3 -c "import sys,json;d=json.load(sys.stdin)['data'];print(d['enrolled']<=d['available'])")"

echo "── D. Enrollment and dedup ───────────────────────────────"
check "D1 enrolling surah 44 leaves 32 held (add or skip)" "32" \
  "$(curl -s -X POST -H "$A" -H 'content-type: application/json' -d '{"surah":44}' $B/srs/library/enroll | python3 -c "import sys,json;d=json.load(sys.stdin)['data'];print(d['enrolled']+d['skipped'])")"
check "D2 re-enrolling adds nothing" "0" \
  "$(curl -s -X POST -H "$A" -H 'content-type: application/json' -d '{"surah":44}' $B/srs/library/enroll | j "['data']['enrolled']")"
check "D3 enrolling leaves every offered card held" "True" \
  "$(curl -s -H "$A" "$B/srs/library/items?surah=44" | python3 -c "import sys,json;d=json.load(sys.stdin)['data'];print(d['enrolled']==d['available'])")"
# A floor, not an exact count: the library grows as submissions are approved,
# so "25" was a fact about one afternoon rather than a property of the route.
check "D4 roots reachable in linguistics" "True" \
  "$(curl -s -X POST -H "$A" -H 'content-type: application/json' -d '{"scope":"roots"}' $B/srs/library/enroll | python3 -c "import sys,json;d=json.load(sys.stdin)['data'];print(d['enrolled']+d['skipped']>=25)")"
check "D5 re-enrolling roots adds nothing" "0" \
  "$(curl -s -X POST -H "$A" -H 'content-type: application/json' -d '{"scope":"roots"}' $B/srs/library/enroll | j "['data']['enrolled']")"

echo "── E. Decks follow modules ───────────────────────────────"
check "E1 a Qurʾān deck exists" "True" \
  "$(curl -s -H "$A" $B/srs/decks | python3 -c "import sys,json;print(any(d['deck_type']=='QR' for d in json.load(sys.stdin)['data']))")"
check "E2 an Arabic Linguistics deck exists" "True" \
  "$(curl -s -H "$A" $B/srs/decks | python3 -c "import sys,json;print(any(d['deck_type']=='AL' for d in json.load(sys.stdin)['data']))")"

echo "── F. Queue scoping ──────────────────────────────────────"
# The horizon, not today's queue. Asserting on what happens to be *due* makes
# the case fail the moment someone studies — which is the suite's own doing,
# since section G grades cards. What must hold is that the surah's cards are
# all reachable, whatever their schedule says.
check "F1 surah 44 holds its whole library" "True" \
  "$(curl -s -H "$A" "$B/srs/review?module=QR&surah=44&limit=500&ahead=3650" | python3 -c "import sys,json;print(len(json.load(sys.stdin)['data']['due'])>=32)")"
check "F2 a surah with no cards is empty" "0" \
  "$(curl -s -H "$A" "$B/srs/review?module=QR&surah=2&limit=200" | python3 -c "import sys,json;print(len(json.load(sys.stdin)['data']['due']))")"
check "F3 every surah-44 card references 44" "True" \
  "$(curl -s -H "$A" "$B/srs/review?module=QR&surah=44&limit=200" | python3 -c "import sys,json;d=json.load(sys.stdin)['data']['due'];print(all(c['resource_ref'].startswith('44') for c in d))")"
# "Separate" is a property, not a number: nothing from another module may
# appear in this queue, and the linguistics material must all be there.
check "F4 linguistics queue holds only linguistics" "True" \
  "$(curl -s -H "$A" "$B/srs/review?module=AL&limit=500&ahead=3650" | python3 -c "import sys,json;d=json.load(sys.stdin)['data']['due'];print(len(d)>=25 and all(c['module']=='AL' for c in d))")"

echo "── G. Grading and FSRS ───────────────────────────────────"
# Reachable, not necessarily due. This section grades a card every run, so
# insisting on a *due* one meant the suite eventually emptied the queue it
# depends on and reported four broken endpoints that were fine.
CARD=$(curl -s -H "$A" "$B/srs/review?module=QR&surah=44&limit=1&ahead=3650" | j "['data']['due'][0]['id']")
check "G1 a card carries preview intervals" "True" \
  "$(curl -s -H "$A" "$B/srs/review?module=QR&surah=44&limit=1&ahead=3650" | python3 -c "import sys,json;d=json.load(sys.stdin)['data']['due'][0];print(d.get('preview_days') is not None)")"
check "G2 grading Good schedules the card" "True" \
  "$(curl -s -X POST -H "$A" -H 'content-type: application/json' -d '{"rating":3,"duration_secs":4}' $B/srs/cards/$CARD/grade | python3 -c 'import sys,json;d=json.load(sys.stdin)["data"];print(d["card_state"] in ("learning","review") and d["next_review_at"] is not None)')"
check "G3 graded card left the due queue" "True" \
  "$(curl -s -H "$A" "$B/srs/review?module=QR&surah=44&limit=200" | python3 -c "import sys,json;d=json.load(sys.stdin)['data']['due'];print(all(c['id']!=sys.argv[1] for c in d))" "$CARD")"
check "G4 invalid rating is rejected" "400" \
  "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "$A" -H 'content-type: application/json' -d '{"rating":9}' $B/srs/cards/$CARD/grade)"

echo "── H. Own cards, taxonomy-tagged ─────────────────────────"
check "H1 create a theology concept card" "True" \
  "$(curl -s -X POST -H "$A" -H 'content-type: application/json' -d '{"module":"QR","resource_type":"ayah","resource_ref":"44:4","front_text":"What is decided on that night?","back_text":"Every wise matter","card_kind":"concept","concept_domain":"theology"}' $B/srs/cards | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('ok',False))")"
# The filter is what is under test, not the schedule: these cards get graded
# by section G and by every earlier run, so a due-only query eventually finds
# nothing and blames the filter for it.
check "H2 kind filter finds it" "True" \
  "$(curl -s -H "$A" "$B/srs/review?module=QR&surah=44&kind=concept&limit=500&ahead=3650" | python3 -c "import sys,json;d=json.load(sys.stdin)['data']['due'];print(any(c.get('card_kind')=='concept' for c in d))")"
check "H3 domain filter narrows further" "True" \
  "$(curl -s -H "$A" "$B/srs/review?module=QR&surah=44&kind=concept&domain=theology&limit=500&ahead=3650" | python3 -c "import sys,json;d=json.load(sys.stdin)['data']['due'];print(all(c.get('concept_domain')=='theology' for c in d) and len(d)>0)")"
check "H4 a card with no module is rejected" "400" \
  "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "$A" -H 'content-type: application/json' -d '{"resource_ref":"44:9","front_text":"x"}' $B/srs/cards)"

echo "── I. Submissions and approval ───────────────────────────"
# A distinct front per run. A fixed one deduplicates against the row an
# earlier run already published, so approval and "take" both became no-ops
# that the suite then read as regressions.
STAMP=$(date +%s)
BEFORE=$(curl -s -H "$A" "$B/srs/library/items?surah=44" | j "['data']['available']")
SUB=$(curl -s -X POST -H "$A" -H 'content-type: application/json' -d "{\"module\":\"QR\",\"resource_ref\":\"44:5\",\"front_text\":\"Test submission $STAMP — mercy from your Lord\",\"back_text\":\"رَحْمَةً مِّن رَّبِّكَ\",\"card_kind\":\"translation\"}" $B/srs/library/submit | j "['data']['id']")
check "I1 submission is created pending" "True" \
  "$(echo "$SUB" | grep -q 'SRSLIB' && echo True)"
check "I2 approver sees the queue" "True" \
  "$(curl -s -H "$A" $B/srs/library/pending | j "['data']['can_approve']")"
check "I3 pending card is NOT yet in the library" "$BEFORE" \
  "$(curl -s -H "$A" "$B/srs/library/items?surah=44" | j "['data']['available']")"
check "I4 approving succeeds" "approved" \
  "$(curl -s -X POST -H "$A" -H 'content-type: application/json' -d '{"decision":"approved"}' $B/srs/library/$SUB/review | j "['data']['status']")"
check "I5 approved card joins the library" "$((BEFORE + 1))" \
  "$(curl -s -H "$A" "$B/srs/library/items?surah=44" | j "['data']['available']")"
check "I6 bad decision value is rejected" "400" \
  "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "$A" -H 'content-type: application/json' -d '{"decision":"maybe"}' $B/srs/library/$SUB/review)"

echo "── J. Selective take ─────────────────────────────────────"
NEWID=$(curl -s -H "$A" "$B/srs/library/items?surah=44" | python3 -c "import sys,json;d=[i for i in json.load(sys.stdin)['data']['items'] if not i['taken']];print(d[0]['id'] if d else '')")
check "J1 taking one card adds one" "1" \
  "$(curl -s -X POST -H "$A" -H 'content-type: application/json' -d "{\"ids\":[\"$NEWID\"]}" $B/srs/library/take | j "['data']['added']")"
check "J1b taking it again adds nothing" "0" \
  "$(curl -s -X POST -H "$A" -H 'content-type: application/json' -d "{\"ids\":[\"$NEWID\"]}" $B/srs/library/take | j "['data']['added']")"
check "J2 held count matches library" "True" \
  "$(curl -s -H "$A" "$B/srs/library/items?surah=44" | python3 -c "import sys,json;d=json.load(sys.stdin)['data'];print(d['enrolled']==d['available'])")"
check "J3 empty ids is rejected" "400" \
  "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "$A" -H 'content-type: application/json' -d '{"ids":[]}' $B/srs/library/take)"

echo "── K. Deck sharing ───────────────────────────────────────"
DECK=$(curl -s -H "$A" $B/srs/decks | python3 -c "import sys,json;print([d['id'] for d in json.load(sys.stdin)['data'] if d['deck_type']=='QR'][0])")
check "K1 publishing a deck sets is_shared" "1" \
  "$(curl -s -X PATCH -H "$A" -H 'content-type: application/json' -d '{"is_shared":true}' $B/srs/decks/$DECK | j "['data']['is_shared']")"
check "K2 own decks are excluded from shared list" "True" \
  "$(curl -s -H "$A" $B/srs/decks/shared | python3 -c "import sys,json;print(all(d['id']!='$DECK' for d in json.load(sys.stdin)['data']['decks']))")"
check "K3 taking your own deck adds nothing new" "0" \
  "$(curl -s -X POST -H "$A" -H 'content-type: application/json' -d '{}' $B/srs/decks/$DECK/copy | j "['data']['added']")"

echo "── L. Stats and scoreboard ───────────────────────────────"
check "L1 stats count enrolled cards" "True" \
  "$(curl -s -H "$A" $B/srs/stats | python3 -c "
import sys,json
b=json.load(sys.stdin)['data'].get('by_state',[])
n=sum(r['n'] for r in b) if isinstance(b,list) else sum(b.values())
print(n>50)")"
check "L2 scoreboard lists the account" "True" \
  "$(curl -s -H "$A" $B/srs/leaderboard | python3 -c "import sys,json;d=json.load(sys.stdin)['data']['leaderboard'];print(any(r['display_name']=='System Test' for r in d))")"
check "L3 params report the algorithm" "ts-fsrs" \
  "$(curl -s -H "$A" $B/srs/params | j "['data']['algorithm']")"

echo "── M. Anki interop ───────────────────────────────────────"
check "M1 export returns TSV with headers" "True" \
  "$(curl -s -H "$A" $B/srs/decks/$DECK/export | head -1 | grep -q 'separator:tab' && echo True)"
check "M2 export has one row per card" "True" \
  "$(curl -s -H "$A" $B/srs/decks/$DECK/export | tail -n +4 | wc -l | awk '{print ($1>30)?"True":"False"}')"
check "M3 import creates cards" "2" \
  "$(curl -s -X POST -H "$A" -H 'content-type: application/json' -d '{"title":"Anki import test","text":"#separator:tab\nfront one\tback one\nfront two\tback two"}' $B/srs/import | j "['data']['imported']")"

echo "── Teardown ──────────────────────────────────────────────"
# M3 creates a deck every run. Without this the account accumulated five
# "Anki import test" decks that buried the real ones on the SRS home screen —
# a test that dirties the thing it tests is a test you stop trusting.
LEFTOVER=$(curl -s -H "$A" $B/srs/decks \
  | python3 -c 'import sys,json;print("\n".join(d["id"] for d in json.load(sys.stdin)["data"] if d["title"]=="Anki import test"))')
REMOVED=0
for D in $LEFTOVER; do
  curl -s -o /dev/null -X DELETE -H "$A" "$B/srs/decks/$D" && REMOVED=$((REMOVED+1))
done
# The suite's own approved submission leaves through the same door a real
# mistake would — removal stops the offer without touching taken copies.
check "T0 test submission removed from the library" "204" \
  "$(curl -s -o /dev/null -w '%{http_code}' -X DELETE -H "$A" $B/srs/library/$SUB)"
check "T1 import decks cleaned up" "0" \
  "$(curl -s -H "$A" $B/srs/decks | python3 -c 'import sys,json;print(sum(1 for d in json.load(sys.stdin)["data"] if d["title"]=="Anki import test"))')"

echo
echo "────────────────────────────────────────────────────────"
echo "  PASS $PASS   FAIL $FAIL"
[ "$FAIL" -eq 0 ] && echo "  ALL GREEN" || echo "  SEE FAILURES ABOVE"
