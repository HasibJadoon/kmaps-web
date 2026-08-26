# Root Presentation — the plan, from the reader's side

The root page is a **public reference for students and scholars of the Qurʾān**. Everything
below serves two jobs a reader actually has:

- **Look up** — *I met this word in an āyah. What is it, and what does it mean?* Seconds, not minutes.
- **Learn** — *Take me through this root properly.* Ordered, sourced, and rememberable.

The earlier draft of this plan was written from the build side: bands, carriers, row counts.
That plan is still correct about **where the data lives**; it was wrong about **what the page
owes the reader**. This replaces it.

---

## 1 · The reader never sees the machinery

The registry organises a root by how it is *built* — `12-ASL`, `26-ATTEST`, `20-GOV`. Those codes
are right for a build plan and wrong for a person trying to understand a word. Nobody opens a
root asking what is in sub-layer 18-STEP.

So there are **two surfaces over the same carriers**, and this is the one structural decision
that makes the rest possible:

| | `GET /al/ds/root/:root` | `GET /roots/:root` |
|---|---|---|
| for | the build monitor | students, scholars, the public |
| sections named | `12-ASL`, `26-ATTEST` | `asl`, `sarf`, `quran`, `furuq` |
| empty layers | returned, marked `unknown` / `empty` | **absent** |
| provenance | `is_synthesis`, `source_slug`, `confidence` | `attested` with author + year, or `ours` |
| carriers | table names listed | never mentioned |
| counts | `total_rows`, band fill | only counts a reader wants — occurrences, forms |
| status | exists, live | **new — the public contract** |

Both are computed from the same carriers by the same repository. The reader surface is a
projection *of the response*, not a stored document — the same architecture, one layer up.

**Nothing technical crosses that line.** No band code, no table name, no confidence enum, no
`unknown` state. A layer nobody has built simply does not appear.

## 2 · The words the page uses

The section keys **are** the reader's vocabulary, in the tradition's own terms:

| key | heading | what the reader gets |
|---|---|---|
| `asl` | الأصل · The core meaning | The one idea the root turns on, and who said so |
| `addad` | الأضداد · The contronym | Where a root means a thing and its opposite |
| `senses` | المعاني · Sense inventory | Each sense with the lexicon that states it, and its shāhid |
| `tatawwur` | تطوّر المعنى · How the meaning grew | The arc from the physical to the abstract |
| `sarf` | الصرف · The forms | The ladder: chain, maṣādir, participles, government |
| `quran` | في القرآن · In the Qurʾān | Every word of the root, its count, a locus |
| `masala` | مسألة · A case in point | Where the mufassirūn disagree, and why |
| `furuq` | الفروق · Fine distinctions | What this word says that its near-synonyms do not |
| `tabir` | التعابير · Constructions | The idioms, grouped by the particle they take |
| `muraja` | المراجعة · Review | The same content, held for memory |
| `masadir` | المصادر · Sources | Every work cited, oldest first, with its page |

Two marks, and only two, both classical:

- **`attested` · مأثور** — the wording is the named author's own, checkable at the page cited.
- **`ours` · اجتهاد** — the claim is K-Maps', and no source states it. Shown so it can be rejected.

`is_synthesis`, `confidence: low`, `generated_by` and the rest collapse into those two before
they leave the worker.

## 3 · Two depths, one page

The ask names both audiences, and they want different amounts of the same thing.

```
GET /roots/:root?depth=student     the spine, glosses forward, one witness per sense
GET /roots/:root?depth=scholar     everything: all witnesses, variant readings, the disagreements
```

`student` is the default. It is not a cut-down page — it is the same sections with fewer
witnesses per sense, the English and Urdu given equal weight to the Arabic, and the interpretive
disputes folded behind a "what the commentators say" affordance rather than opened inline.
`scholar` opens all of it and puts the Arabic first.

Depth changes *how much*, never *what is true*. A claim marked `ours` at scholar depth is marked
`ours` at student depth, or it must not appear at either.

## 4 · The journeys, and the endpoints that serve them

### Look up — from an āyah to a root, in one tap

A student reading 44:2 taps ٱلْمُبِينِ.

```
GET /qr/ayah/:surah/:ayah/words          → each word with its root and lemma
GET /roots/:root                          → the root page
GET /roots/:root/words/:lemma             → that word, in this āyah
```

```json
{ "word_ar": "ٱلْمُبِينِ", "surah": 44, "ayah": 2, "position": 2,
  "root": { "ar": "بين", "display": "ب ي ن", "href": "/roots/بين" },
  "lemma": { "ar": "مُبِين", "form": "IV", "kind": "ism fāʿil", "occurrences": 119 },
  "here": { "en": "manifest — or making manifest; both readings stand",
            "ur": "واضح — یا واضح کرنے والا",
            "note": "see “A case in point”" } }
```

### Look up — by search

```
GET /search?q=بين            Arabic root or word
GET /search?q=mubin          transliteration
GET /search?q=clarity        meaning, English or Urdu
```

The index is there — 24,275 rows in the root full-text index, plus the lexicon entry and block
indexes. **But see §6:** meaning-search in English currently reaches a small fraction of roots,
and the endpoint must say when it is searching a partial index rather than return a confident
empty.

### Learn — the ordered read

```
GET /roots/:root?depth=student|scholar   the whole page, sections in reading order
```

One call. Sections arrive in the order a reader wants them — what it is, what it means, how it
builds, where it lives, who disagreed — not in build order.

### Learn — going deeper

```
GET /roots/:root/forms/:roman      one form, expanded
GET /roots/:root/words/:lemma      one word: its chain, range, and every verse
GET /roots/:root/senses/:key       one sense, all its witnesses
GET /sources/:slug?root=:root      the lexicon entry itself, in full
```

The last one matters: **the full verbatim lexicon text never sits inside the root page.** The
root page carries a summary and a route out. Inlining Lane, Lisān, Tāj and Mufradāt is what made
the previous attempt unreadable and enormous.

### Remember

```
GET  /roots/:root/review           the cards for this root, front and back
POST /review/:card/grade           Again · Hard · Good · Easy
```

The card is the page at a different setting — the same fields, a front and a back. A learner
sees "next review 23 September · seen 3 times". They never see stability, difficulty, lapses, or
a scheduler's name.

### Move on

```
GET /roots/:root/neighbours        related roots and permutations
```

19,890 permutation rows and the root relations behind "what else is near this".

## 5 · What the reader's payload looks like

One shape, every section:

```json
{
  "root": { "ar": "بين", "display": "ب ي ن", "letters": [
      { "l": "ب", "name": "bāʾ", "makhraj": "shafawī" },
      { "l": "ي", "name": "yāʾ", "makhraj": "wasṭ al-lisān" },
      { "l": "ن", "name": "nūn", "makhraj": "ṭaraf al-lisān" } ],
    "type": { "ar": "أجوف يائي", "en": "hollow-yāʾ" },
    "meaning": { "ar": "بُعْدُ الشيءِ وانكشافُه",
                 "en": "the remoteness of a thing, and its disclosure",
                 "ur": "کسی چیز کی دُوری اور اُس کا انکشاف" },
    "counts": { "in_quran": 522, "words": 13, "forms": 7, "forms_in_quran": 4, "works_cited": 15 },
    "anchor": { "surah": 44, "ayah": 2, "word_ar": "ٱلْمُبِينِ" } },

  "sections": [
    { "key": "asl", "heading": { "ar": "الأصل", "en": "The core meaning" },
      "lead": "The root looks as though it holds two unrelated meanings…",
      "entries": [
        { "ar": "أصلٌ واحد، وهو بُعْدُ الشّيءِ وانكشافُه",
          "en": "A single origin: the remoteness of a thing and its disclosure.",
          "ur": null,
          "by": { "author": "Ibn Fāris", "work_ar": "مقاييس اللغة",
                  "died_ah": 395, "at": "v.1 p.33" },
          "basis": "attested", "primary": true } ] },

    { "key": "sarf", "heading": { "ar": "الصرف", "en": "The forms" },
      "forms": [
        { "roman": "IV", "pattern": "أَفْعَلَ",
          "chain_ar": "أَبَانَ — يُبِينُ ، أَبِنْ ، إِبَانةً ، فهو مُبِينٌ ، والمفعول مُبَانٌ",
          "masadir": [ { "ar": "إِبَانَة", "basis": "attested" } ],
          "active_participle": "مُبِين", "passive_participle": "مُبَان",
          "meaning": { "ar": "أوضح وأظهر؛ فصل وقطع", "en": "to make manifest", "ur": "ظاہر کرنا" },
          "government": { "kind": "transitive", "by": "hamza",
                          "en": "made transitive by the hamza — and also used intransitively, in the sense of بانَ",
                          "source": "لسان العرب" },
          "in_quran": { "finite": 1, "participle": 119,
                        "loci": [ { "surah": 43, "ayah": 52, "word_ar": "يُبِينُ" } ] },
          "note": "The dual government of this one form is the whole question at 44:2." } ] }
  ]
}
```

Three things absent by design: no `code`, no `state`, no `carriers`. A section a root does not
have is simply not in the array — عبد has no idioms and no scholarship, and its page shows no
empty headings.

### The one rule the ladder must obey

Group strictly by the Qurʾānic Arabic Corpus's own form assignment, joined on Buckwalter — never
by matching the *surface* of the word. Surface matching is what put `يُبِينُ` (Form IV) and
`بَيَّنُ` (Form II) inside Form I in the page this replaces. A word with no form assignment is
shown as **unassigned**, never guessed into a form.

And keep the two counts apart: **seven forms the language builds, four the Qurʾān uses.** بَانَ,
بَايَنَ and تَبَايَنَ are attested in Lisān, Tāj and Lane and belong in the paradigm a student
learns; they simply never occur finite in the muṣḥaf. Merging the two questions is the same
error as guessing the ladder.

## 6 · The honest state of the languages — read this before scheduling anything

The page is trilingual. The data is not, yet. Measured against the **1,642 roots of the Qurʾān**:

| What a reader opens the page for | roots that can answer | share |
|---|---|---|
| An aṣl statement, in Arabic | 1,176 | **72%** |
| A form ladder | 1,079 | **66%** |
| Idioms and expressions | 408 | 25% |
| Senses with an English gloss | 254 | 15% |
| Government (lāzim / mutaʿaddī) | 193 | 12% |
| **An aṣl statement in English** | **75** | **4.6%** |
| Senses with an Urdu gloss | 58 | 3.5% |
| A one-line core meaning, English | 47 | 2.9% |
| A one-line core meaning, Urdu | 10 | 0.6% |

**The Arabic spine is a real product today. The English and Urdu are not.** Shipping a trilingual
page against this would give a school student — the audience least able to read the Arabic alone —
an empty column on roughly nineteen roots in twenty.

Three consequences, and they outrank every UI task below:

1. **The highest-leverage work is not UI.** 1,176 roots have an aṣl statement in Arabic and only
   75 have it in English. That is one translation pass from making the English page real for
   1,101 roots. Nothing in the interface comes close to that return.
2. **The page degrades per language, honestly.** If a section has Arabic but no English, an
   English reader sees the Arabic with a plain line — *"not yet translated"* — not a blank, and
   not a machine translation silently substituted for a scholar's wording. A learner must always
   be able to tell what the source said from what we have supplied.
3. **The core meaning comes from the aṣl, not from `meaning_core_*`.** Those columns are filled
   for 54 roots. The primary aṣl statement covers 1,176. Derive the headline; do not read a
   near-empty column.

## 7 · Stages, ordered by what a reader gains

**Stage 1 — the public contract.** Define `GET /roots/:root`: named sections, two marks, resolved
authors, absent things absent. Freeze it before any screen is built. *Reader gains: nothing yet —
but every later stage is cheap or expensive depending on this.*

**Stage 2 — the ladder, correctly.** The form section, grouped by corpus assignment, with
government attributed to the lexicon that states it, and the seven-versus-four counts kept apart.
*Reader gains: a paradigm that is true — the single worst defect fixed.*

**Stage 3 — words in the Qurʾān.** Every word of the root, its count, its locus, and the tap-through
from an āyah. *Reader gains: the lookup journey, end to end.*

**Stage 4 — meaning: aṣl, senses, arc.** Witnesses folded, oldest first, each with author and year.
*Reader gains: the reason to open the page at all.*

**Stage 5 — the English aṣl pass.** Translate the 1,101 statements that exist in Arabic and not in
English. Editorial work, tracked like a build. *Reader gains: the page stops being Arabic-only for
two-thirds of the Qurʾān's roots.*

**Stage 6 — furūq, idioms, and the case in point.** *Reader gains: the depth a scholar came for.*

**Stage 7 — review.** Cards front and back, four grades, "next review" in plain words.
*Reader gains: the page becomes something they retain, not just consult.*

**Stage 8 — search and neighbours.** Arabic, transliteration, and meaning — with the partial-index
caveat honest in the response. *Reader gains: a way in that is not a link from an āyah.*

**Stage 9 — the apps.** Web first, then iOS, both against the frozen public contract.

Stages 1–4 are one worker and independently shippable. Stage 5 is editorial and runs in parallel
from the moment Stage 1 lands.

## 8 · Data retention — the constraint on all of it

A learner's history is the one thing on this page that cannot be rebuilt. Live today:
**1,125 reviews across 62 cards** — 28 in review, 34 in learning, 206 new.

Review rows are tied to their card by a cascade, and a card is identified by the deck, the
resource it points at, and its template. Change any of the three and the card is a *new* card and
the history is gone.

- Nothing in this plan writes a card. The root page **reads**.
- If a card must change, update it in place. Never delete and re-insert.
- Preserve every scheduling value on any migration.
- Older cards carry no note type and must still render from their stored front and back — twelve
  of them have been reviewed.
- Export the cards and their review history before any write.

## 9 · How we know it works

**From the reader's side, not the builder's:**

- Open a root and answer *what does this mean* in under five seconds, without scrolling.
- Tap a word in 44:2 and arrive at بين with that word already in view.
- Read the form ladder for بين and find **II, IV, V, X** marked as occurring in the Qurʾān and
  **I, III, VI** as attested in the lexicons only — with no Form I claiming a Qurʾānic verb.
- Switch to English on a root that has no English and see a stated absence, never a blank.
- Turn a card, grade it, and see the next date change — then confirm the review count rose by
  exactly one and no card was replaced.

**Breadth is the real test.** بين is the deepest root in the corpus: 27 of 28 layers, 287 records.
The distribution is not kind — **1,153 roots sit at five to nine layers**, 472 at ten to nineteen,
and only **6** at twenty or more. A page proven on بين alone will render eleven hundred roots as a
scaffold of empty headings. Every stage checks a deep root, a middling one, and a thin one, and
the thin one must read as a short honest page rather than a broken deep one.
