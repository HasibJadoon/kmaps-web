#!/usr/bin/env python3
"""Turn the Anki collection into K-MAPS cards, sorted and referenced properly.

Three things the naive export gets wrong, and this fixes:

1. The ayah. Most cards quote an ayah without citing it, so the reference is
   recovered by matching the quotation against the Qurʾān text itself. A card
   filed under "al-Anʿām" that quotes 6:164 gets `6:164`, not `6`.
2. What the card teaches. A lemma line followed by a quotation is vocabulary;
   a bare ayah with an English rendering is a translation; a short phrase is an
   expression. The Anki note type says none of this — everything was "Basic".
3. Duplicates. The collection has the same card entered twice with different
   histories; the copy with the longer history wins, because that is the one
   that reflects what was actually learned.

The review log comes across too. Two hundred cards with intervals up to five
years would otherwise arrive as "new", and the first session would ask for
everything already known.
"""
import html
import json
import re
import sqlite3
import sys
from collections import Counter, defaultdict

DB, AYAT, OUT = sys.argv[1], sys.argv[2], sys.argv[3]

SURAH_TAGS = {
    "الأنعام": 6, "الانعام": 6, "الأعراف": 7, "الاعراف": 7,
}

ARABIC_RANGE = "؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿"
ARABIC = re.compile(f"[{ARABIC_RANGE}]")
ARABIC_RUN = re.compile(f"[{ARABIC_RANGE}\\s]+")
DIACRITICS = re.compile(r"[ؐ-ًؚ-ٰٟۖ-ۭـ]")


def normalise(s):
    """Arabic reduced to its skeleton, for matching text against text.

    Diacritics, tatweel, and the alif/ya/hamza spelling variants are exactly
    the things that differ between a hand-typed quotation and the Uthmani
    corpus, and none of them change which ayah is being quoted.
    """
    s = DIACRITICS.sub("", s)
    s = re.sub(r"[أإآٱٲٳ]", "ا", s)
    s = re.sub(r"[ىئ]", "ي", s)
    s = s.replace("ؤ", "و").replace("ة", "ه").replace("ﻻ", "لا")
    s = re.sub(f"[^{ARABIC_RANGE}\\s]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def strip_html(s):
    s = re.sub(r"(?i)<\s*br\s*/?\s*>", "\n", s)
    s = re.sub(r"(?i)</\s*(div|p|li|tr)\s*>", "\n", s)
    # The *opening* tag breaks the line too. Dropping it silently fused the
    # paradigm line into the ayah that followed it — "خُسْرَانًا﴿الَّذِينَ" —
    # which is both unreadable and unmatchable against the corpus.
    s = re.sub(r"(?i)<\s*(div|p|li|tr)[^>]*>", "\n", s)
    s = re.sub(r"(?i)\[sound:[^\]]*\]", "", s)
    s = re.sub(r"<[^>]+>", "", s)
    s = html.unescape(s)
    s = s.replace("\xa0", " ").replace("‏", "").replace("‎", "")
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r" *\n *", "\n", s)
    s = re.sub(r"^\s*[—–-]{2,}\s*$", "", s, flags=re.M)
    s = re.sub(r"\n{3,}", "\n\n", s)
    return s.strip()


# ── The corpus, indexed for lookup ───────────────────────────────────────────
#
# A trigram index over normalised words. Quotations are hand-typed and rarely
# match an ayah character for character — a word dropped, a variant spelling,
# an ellipsis — so identification is by vote: whichever ayah shares the most
# three-word sequences with the quotation is the ayah being quoted. Three words
# of Qurʾānic Arabic are already near-unique, and voting survives the one word
# that was typed differently.
N = 3
ayat = json.load(open(AYAT))[0]["results"]
NGRAM = defaultdict(set)
AYAH_TEXT = {}
for a in ayat:
    body = normalise(a["text_uthmani_clean"] or a["text_bare"] or "")
    key = (a["surah"], a["ayah"])
    AYAH_TEXT[key] = body
    words = body.split()
    for i in range(len(words) - N + 1):
        NGRAM[tuple(words[i:i + N])].add(key)


def quote_lines(front):
    """Candidate quotation lines: each line, and the whole thing as a fallback.

    Per line, deliberately. A card is "paradigm ⏎ ayah", and treating the two
    as one run produces a phrase that appears in no ayah at all.
    """
    lines = [normalise(l) for l in front.split("\n")]
    return [l for l in lines if len(l.split()) >= N] or [normalise(front)]


def line_votes(line):
    """Which ayah this line quotes, by shared trigrams."""
    votes = Counter()
    words = line.split()
    for i in range(len(words) - N + 1):
        for key in NGRAM.get(tuple(words[i:i + N]), ()):
            votes[key] += 1
    return votes


def scan(front):
    """Per line: is it a quotation from the corpus, and of what?

    This one pass answers both questions the card poses. The reference comes
    from the line that quotes; the *kind* comes from where that line sits —
    a quotation on the first line is a card about the ayah, a quotation under
    a paradigm line is a card about the word, with the ayah as its context.
    """
    out = []
    for raw in front.split("\n"):
        line = normalise(raw)
        if len(line.split()) < N:
            out.append((line, Counter()))
            continue
        out.append((line, line_votes(line)))
    return out


def resolve_ayah(front, back, surah_hint, scanned, short_quote):
    cited = re.search(r"\(\s*[^\d()]{0,20}?(\d{1,3})\s*[:：]\s*(\d{1,3})\s*\)", front + back)
    if cited:
        return f"{int(cited.group(1))}:{int(cited.group(2))}", "cited"
    named = re.search(r"\(\s*([^\d()]{2,20}?)\s*(\d{1,3})\s*\)", front + back)
    if named:
        s = SURAH_TAGS.get(named.group(1).strip(), surah_hint)
        if s:
            return f"{s}:{int(named.group(2))}", "cited"

    votes = Counter()
    for _, v in scanned:
        votes.update(v)
    if votes:
        score = votes.most_common(1)[0][1]
        # One shared trigram can be a coincidence of common particles; two is
        # a quotation. Prefer the tagged surah when the vote is a tie.
        if score >= 2:
            top = [k for k, v in votes.items() if v == score]
            if len(top) > 1 and surah_hint:
                top = [k for k in top if k[0] == surah_hint] or top
            return f"{top[0][0]}:{top[0][1]}", "matched"

    # Two-word quotations are below the trigram floor — "أَنْتُمْ بِمُعْجِزِينَ"
    # is a real citation with nothing for the index to bite on. Inside the
    # tagged surah a two-word phrase is still decisive, so long as exactly one
    # ayah contains it.
    if surah_hint:
        for idx, (line, _) in sorted(enumerate(scanned),
                                     key=lambda p: -len(p[1][0].split())):
            if len(line.split()) < 2:
                continue
            hits = [k for k, text in AYAH_TEXT.items()
                    if k[0] == surah_hint and line in text]
            if len(hits) == 1:
                short_quote.append(idx)
                return f"{hits[0][0]}:{hits[0][1]}", "matched-short"
    return (str(surah_hint) if surah_hint else None), "surah-only"


LEMMA_LINE = re.compile(
    f"^[{ARABIC_RANGE}\\s]{{0,40}}[:：]|"            # "كسب: ..."
    f"[{ARABIC_RANGE}]+\\s*[-–،]\\s*[يت][{ARABIC_RANGE}]+"  # "كَسَبَ - يَكْسِبُ"
)


def classify(front, scanned, short_quote):
    """What the card teaches, decided by where the quotation sits.

    Position, not punctuation. The earlier version looked for a dash or a colon
    in the first line and mislabelled a third of the collection as
    "translation", because a paradigm written "خسِرَ يَخسَر ، خَسْرًا" has
    neither. Whether a line is Qurʾānic text is the fact that actually
    separates the word being learned from the ayah it was met in.
    """
    if not ARABIC.search(front):
        return "vocabulary"                  # the English word decks
    quoting = sorted([i for i, (_, votes) in enumerate(scanned)
                      if votes and votes.most_common(1)[0][1] >= 2] + short_quote)
    real = [i for i, (line, _) in enumerate(scanned) if line]
    if quoting:
        # A quotation that is not the first non-empty line means the card leads
        # with something else — the word — and cites the ayah as evidence.
        if quoting[0] > (real[0] if real else 0):
            return "vocabulary"
        return "translation"
    if LEMMA_LINE.search(front.split("\n")[0]):
        return "vocabulary"
    return "expression" if len(re.findall(f"[{ARABIC_RANGE}]+", front)) < 5 else "translation"


# ── Read ─────────────────────────────────────────────────────────────────────
con = sqlite3.connect(DB)
con.execute("drop table if exists sqlite_stat4")
rows = list(con.execute("""
    SELECT n.id, n.flds, n.tags, d.name, c.id, c.type, c.ivl, c.factor,
           c.reps, c.lapses
      FROM notes n JOIN cards c ON c.nid = n.id JOIN decks d ON d.id = c.did
"""))

# Anki's revlog. ease 0 and type 4 are reschedules and manual edits, not
# answers — replaying them as grades would invent reviews that never happened.
revlog = defaultdict(list)
for cid, rid, ease, rtype in con.execute(
        "SELECT cid, id, ease, type FROM revlog ORDER BY id"):
    if ease in (1, 2, 3, 4) and rtype in (0, 1, 2, 3):
        revlog[cid].append({"at": rid, "rating": ease})

cards, how = [], Counter()
for nid, flds, tags, deck, cid, ctype, ivl, factor, reps, lapses in rows:
    parts = flds.split("\x1f")
    front = strip_html(parts[0])
    back = strip_html(parts[1] if len(parts) > 1 else "")
    if not front:
        continue
    deck_name = deck.replace("\x1f", " > ")
    hint = next((SURAH_TAGS[t.split("::")[-1]] for t in tags.split()
                 if t.split("::")[-1] in SURAH_TAGS), None)
    scanned = scan(front)
    # Which line carried the quotation, filled in by whichever path found it —
    # the trigram vote or the short-phrase lookup. Classification needs the
    # position, so both paths have to report it.
    short_quote = []
    ref, source = resolve_ayah(front, back, hint, scanned, short_quote)
    how[source] += 1
    kind, domain = classify(front, scanned, short_quote), None
    module = "QR" if (hint or (ref and ":" in ref)) else "other"
    log = revlog.get(cid, [])
    cards.append({
        "front": front, "back": back,
        "module": module,
        "resource_ref": ref or deck_name[:60],
        "card_kind": kind, "concept_domain": domain,
        "origin": f"anki:{cid}",
        "deck": deck_name,
        "tags": [t for t in tags.split()],
        "ref_source": source,
        "anki_interval": ivl, "anki_reps": reps, "anki_lapses": lapses,
        "reviews": log,
    })

# ── Deduplicate ──────────────────────────────────────────────────────────────
by_content = defaultdict(list)
for c in cards:
    by_content[(normalise(c["front"]), c["back"].strip()[:80])].append(c)
unique, dropped = [], 0
for group in by_content.values():
    if len(group) > 1:
        group.sort(key=lambda c: (len(c["reviews"]), c["anki_interval"]), reverse=True)
        dropped += len(group) - 1
    unique.append(group[0])

def sort_key(c):
    ref = c["resource_ref"]
    if ":" in ref:
        s, a = ref.split(":")[:2]
        return (0, int(s), int(a) if a.isdigit() else 0, c["front"])
    return (1, 999, 0, c["front"])

unique.sort(key=sort_key)
json.dump(unique, open(OUT, "w"), ensure_ascii=False, indent=1)

print(f"read              : {len(cards)}")
print(f"duplicates dropped: {dropped}")
print(f"to import         : {len(unique)}")
print(f"reference source  : {dict(how)}")
print(f"exact ayah refs   : {sum(1 for c in unique if ':' in c['resource_ref'])}")
print(f"by module         : {dict(Counter(c['module'] for c in unique))}")
print(f"by kind           : {dict(Counter(c['card_kind'] for c in unique))}")
print(f"by surah          : {dict(sorted(Counter(c['resource_ref'].split(':')[0] for c in unique if ':' in c['resource_ref']).items(), key=lambda kv: int(kv[0])))}")
print(f"reviews to replay : {sum(len(c['reviews']) for c in unique)}")
print(f"cards with history: {sum(1 for c in unique if c['reviews'])}")
print(f"\nstill surah-only  : {[c['front'].split(chr(10))[0][:40] for c in unique if ':' not in c['resource_ref'] and c['module']=='QR'][:10]}")
print("\n─── first eight, in order ───")
for c in unique[:8]:
    print(f"\n[{c['resource_ref']:9s} {c['card_kind']:11s} {c['ref_source']:13s} "
          f"{len(c['reviews']):3d} reviews]")
    print("  F:", c["front"].replace("\n", " ⏎ ")[:120])
    print("  B:", c["back"].replace("\n", " ⏎ ")[:120])
