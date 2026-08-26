# Three views · ثلاث نوافذ

A reader arrives at one of three things and must get a whole answer from any of them:

```
GET /al/root-doc/:root          الجذر    what the root is, and every form it builds
GET /al/lemma-doc/:lemma        اللفظة   one word-family: its form, its chain, its range
GET /qr/word-doc/:s/:a/:i       الكلمة   this word, in this āyah, and nothing else
```

Each is complete on its own and names the other two. They are not three sizes of the same
document: they answer different questions and are wrong to merge.

| | asks | scope of every claim |
|---|---|---|
| **Root** | what does ب-ي-ن mean, and what does it build | the root across the language |
| **Lemma** | what is مُبِين, and where does it sit | one lexical entry, everywhere it occurs |
| **Word** | what does ٱلْمُبِينِ mean *here* | one occurrence, one āyah |

They align with the three note types already in `km_core` — `NT:kmaps:root:v1`,
`NT:kmaps:lemma:sarf:v9`, `NT:kmaps:word:v1` — so a view and its card are the same content at
two settings, and neither can drift from the other.

---

# 1 · Root — `root.doc`

Built: `workers/ar-linguistics/src/repositories/root-doc.repo.ts`. Full shape in
`root-doc-contract.md`. In brief:

```jsonc
{
  "root":       { "ar": "بين", "letters": [...], "meaning": {...}, "counts": {...} },
  "asl":        [ { "ar": "…", "by": { "author": "Ibn Fāris", "died_ah": 395 } } ],
  "senses":     [ { "label": {...}, "witnesses": [ /* ≥2 */ ], "path": { "nodes": [...] } } ],
  "development":[ { "no": 1, "ar": "الفَصْلُ المحسوس" } ],
  "forms":      [ { "roman": "IV", "sarf_saghir": {...}, "government": [...],
                    "lemmas": [ { "ar": "مُبِين", "lemma_ref": "…" } ] } ],
  "unassigned": [ /* lemmas the corpus binds to no form */ ],
  "government": [ /* rows tied to no form — 80% of them, corpus-wide */ ],
  "expressions":[ { "ar": "…", "citations": [ { "surah": 44, "ayah": 10 } ] } ],
  "relations":  { "addad": [...], "field": [...], "taqalib": {...} },
  "sources":    [...], "gaps": [...]
}
```

**Down:** each `forms[].lemmas[]` entry carries `lemma_ref` → view 2.

---

# 2 · Lemma — `lemma.doc`

The word-family: which form built it, how it is derived, and its range **across the whole
Qurʾān** — not in one verse.

```jsonc
{
  "lemma": {
    "ref": "AL:lemma:…", "ar": "مُبِين", "bare": "مبين",

    // ── what kind of word this is ──────────────────────────────────────
    // Three axes, three registry namespaces, all trilingual from ar_ling_gram_term.
    "type": {
      "pos":        { "id": "GT:pos:ism",  "ar": "اِسْم", "en": "noun" },
      "jumud":      { "id": "GT:jumud:mushtaqq", "ar": "مُشتقّ", "en": "derived noun" },
      "derivation": { "id": "GT:derivation_type:active_participle",
                      "ar": "اسم الفاعل", "en": "active participle" }
    },

    "belongs_to": {                       // ← the form family that built it
      "roman": "IV", "verb_ar": "أَبَانَ", "pattern": "أَفْعَلَ",
      "root": { "ar": "بين", "ref": "/al/root-doc/بين" }
    },
    "wazn_ar": "مُفْعِل",
    "chain_ar": "أَبَانَ — يُبِينُ ، أَبِنْ ، إِبَانةً ، فهو مُبِينٌ",

    "ilal": [ { "rule_ar": "النقل في الإفعال من الأجوف",
                "before": "مُبْيِن", "after": "مُبِين", "basis": "derived" } ],

    "government": [ { "transitivity": "transitive", "route": "bi-hamza",
                      "meaning": { "en": "to make manifest" },
                      "by": { "author": "Ibn Manẓūr", "died_ah": 711 } } ],

    // the range this lemma spans across the corpus — one entry per distinct sense
    "meaning_range": [
      { "ar": "ظاهر", "en": "manifest, plain in itself", "ur": "واضح",
        "basis": "attested", "by": { "author": "al-Zamakhsharī", "died_ah": 538 },
        "examples": [ { "surah": 44, "ayah": 2 }, { "surah": 16, "ayah": 103 } ] },
      { "ar": "مُظهِر", "en": "making manifest", "ur": "ظاہر کرنے والا",
        "basis": "attested", "by": { "author": "al-Rāzī", "died_ah": 606 },
        "examples": [ { "surah": 12, "ayah": 1 } ] }
    ],

    "near_synonyms": [ { "ar": "مُبَيِّنَة", "farq_en": "Form II — clarifies something else",
                         "by": { "author": "…" }, "basis": "attested" } ],

    "in_quran": { "total": 119, "first": { "surah": 2, "ayah": 61 },
                  "occurrences_ref": "/qr/lemma/AL:lemma:…/occurrences" },

    "words": [                            // ← every occurrence, each a view-3 door
      { "surah": 44, "ayah": 2, "index": 2, "surface_ar": "ٱلْمُبِينِ",
        "ref": "/qr/word-doc/44/2/2" }
    ]
  }
}
```

**Up:** `belongs_to.root`. **Down:** `words[].ref` → view 3.

**Backed by** `ar_ling_root_lemma`, `ar_ling_gram_term` (399 terms, 29 namespaces),
`ar_ling_root_lemma_tadiya`, `ar_ling_root_lemma_ilal_apply` (added in `0107`),
`ar_ling_root_lemma_furuq_member` (3,290 rows, **keyed on `lemma_id`** — so near-synonyms
genuinely reach a lemma), `qr_word_occurrence` on `lemma_ref`.

---

# 3 · Word — `word.doc`

One word, in one āyah. The view that answers *what does this mean **here***.

```jsonc
{
  "word": {
    "surface_ar": "ٱلْمُبِينِ", "surah": 44, "ayah": 2, "index": 2,

    "type": {                              // same three axes as the lemma
      "pos":        { "ar": "اِسْم", "en": "noun" },
      "jumud":      { "ar": "مُشتقّ", "en": "derived noun" },
      "derivation": { "ar": "اسم الفاعل", "en": "active participle" }
    },
    "morphology": { "case": "genitive", "definiteness": "definite",
                    "gender": "masculine", "number": "singular" },

    "lemma": { "ar": "مُبِين", "ref": "/al/lemma-doc/…" },
    "form":  { "roman": "IV", "verb_ar": "أَبَانَ" },
    "root":  { "ar": "بين", "ref": "/al/root-doc/بين" },

    "verse": {
      "ar": "وَٱلْكِتَٰبِ ٱلْمُبِينِ",
      "highlight": [1, 1],
      "fluent": { "ar": "…", "en": "By the Book that makes all things plain",
                  "ur": "…", "basis": "ours" }
    },

    // What this word can mean HERE — not the lemma's whole range.
    // Where the readings disagree, both stand, each with its author.
    "meaning_here": [
      { "en": "plain in itself", "ar": "ظاهر", "ur": "واضح",
        "reading": "intransitive",
        "by": { "author": "Ibn ʿĀshūr", "died_ah": 1393, "work_ar": "التحرير والتنوير" },
        "basis": "attested" },
      { "en": "making plain", "ar": "مُظهِر", "ur": "ظاہر کرنے والا",
        "reading": "transitive",
        "by": { "author": "al-Rāzī", "died_ah": 606, "work_ar": "مفاتيح الغيب" },
        "basis": "attested" }
    ],

    "near_synonyms": [
      { "ar": "مُبَيِّنَة", "en": "clarifies something else, by an act",
        "scope": "lemma", "by": { "author": "…" }, "basis": "attested" }
    ],

    "antonyms": [
      { "ar": "أَعْجَمِىّ", "en": "of obscure speech", "axis": "clarity ⟷ obscurity",
        "scope": "root",                 // ← see the note below. NOT this word's own.
        "basis": "attested", "by": { "author": "al-Khalīl", "died_ah": 170 } }
    ],

    "also_here": [                        // other words of this root in this same āyah
      { "surface_ar": "…", "index": 0, "ref": "/qr/word-doc/44/2/0" }
    ],
    "neighbours": { "prev": "/qr/word-doc/44/2/1", "next": "/qr/word-doc/44/2/3" }
  }
}
```

**Up:** `lemma.ref` → view 2, `root.ref` → view 1.

## Two scope rules this view must obey

**`antonyms[].scope` is `"root"`, and must say so.** `ar_ling_root_didd` has 48 rows and
**no lemma, word or scope column at all** — every antonym in the database is a fact about the
root. The word note type asks for `Antonyms` per word; the carrier cannot supply that. Rendering
a root-level antonym as though it belonged to this word in this verse would be a scope error, so
the field carries its scope and the page prints it as *"of the root"*.

**`near_synonyms[].scope` is `"lemma"`.** `ar_ling_root_lemma_furuq_member` **is** keyed on
`lemma_id`, so these do reach one lexical entry — but not one occurrence. Same rule: carry the
scope, say it.

`meaning_here` is the only field in the document that is genuinely word-and-verse specific, and
it comes from the tafsīr corpus (`qr_tafsir_book_display_block`, 41,056 blocks, āyah-keyed), not
from the lexicon. That is why the مُبِين-at-44:2 material belongs here and not on the root page.

---

## The taxonomy behind `type`

All three axes are live registry terms, trilingual, with definitions — not free text.

| axis | namespace | terms | values |
|---|---|---|---|
| part of speech | `GT:pos:` | 18 | اِسْم · فِعْل · صِفَة · عَدَد · اسم عَلَم · ضَمِير · اسم إشارة · اسم موصول · حروف |
| derived or not | `GT:jumud:` | 3 | **فِعْل** · **جامد** *(underived — the ism dhāt)* · **مُشتقّ** *(derived)* |
| how derived | `GT:derivation_type:` | 13 | اسم الفاعل · اسم المفعول · مَصْدَر · المصدر الميمي · صيغة المبالغة · الصفة المشبّهة · اسم التفضيل · اسم الزمان · اسم المكان · اسم الآلة · اسم المرة · اسم الهيئة · مصدر بمعنى المفعول |

`GT:jumud:jamid` is the جامد / ism dhāt distinction, and `derivation` is populated only when
`jumud` is `mushtaqq` — a jāmid noun has no derivation type, and the field is absent rather
than empty.

---

## What is not yet buildable

| view | field | why |
|---|---|---|
| 2 · lemma | `type.derivation` | the QAC map holds it, keyed on the lemma's Buckwalter, which lemmas do not store — no join yet |
| 2 · lemma | `meaning_range` | no per-lemma sense carrier for most roots; كشف has 24 lemma-scoped senses, بين has 0 that reach a form |
| 3 · word | `meaning_here` | needs the tafsīr blocks filtered by root **and** āyah; the filter does not exist yet |
| 3 · word | `morphology` | `qr_word_occurrence.morphology_tag_json` holds it; the bundle dictionary it references carries no root or lemma key |
| all | Urdu | present on the registry terms and government, largely absent elsewhere |
