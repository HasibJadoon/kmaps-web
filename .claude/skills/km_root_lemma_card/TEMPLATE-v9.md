# `lemma.card/v9` — fields and face

Note type **`NT:kmaps:lemma:sarf:v9`** · template **`lemma.mushtaqq`** · `card_kind=lemma` · discipline **SF**
Reference: `CARD:AL:lemma:6136730c086fe555263cfaeb40:lemma.mushtaqq` (مُّبَٰرَكَة)

> Supersedes an earlier draft of this file that named `NT:kmaps:lemma:sarf:v7` and
> `card_kind=morphology`. Both were stale. v6 and v7 hold **zero cards**.

## The 16 fields

| # | Field | Face | Type | Carries |
|---|---|---|---|---|
| 1 | `Headword` | front | text_ar | the lemma, fully vocalised as it stands |
| 2 | `Root` | front | text_ar | `ك · ت · ب` — spaced radicals |
| 3 | `Wazn` | front | text_ar | `فِعَال`, `مُفاعَلة` … |
| 4 | `Chain` | front | text_ar | the ṣarf chain, prepositions bracketed |
| 5 | `Identity` | front | text_ar | what KIND of word — maṣdar / ism fāʿil / jāmid, and any dispute |
| 6 | `FormEffects` | front | text_ar | what the FORM does to the meaning |
| 7 | `VerseAr` | front | text_ar | the anchor |
| 8 | `VerseRef` | front | text | `44:2` |
| 9 | `MeaningRange` | back | text_en | the span in one paragraph |
| 10 | `Arcs` | back | json | THIS lemma — `sum(count) == frequency_quran` |
| 11 | `FamilyLine` | back | text_ar | one line naming the family and its counts |
| 12 | `FamilyHeading` | back | text_ar | `أسرةُ كَتَبَ (فَعَلَ)` |
| 13 | `FamilyArcs` | back | json | one entry per family member |
| 14 | `OutsideFamily` | back | text_ar | forms that declare their OWN chain |
| 15 | `SiblingLine` | back | text_ar | siblings named + linked, **no arcs** |
| 16 | `Imagery` | back | json | `{passage_en, passage_ar, woven_sources[], shown}` |

## Arc shape

```json
{
  "construction_ar": "ٱلْكِتَٰب — المُنَزَّل",
  "count": 180,
  "arc_ar": "الوَحيُ المَجموعُ المُنَزَّل",
  "arc_en": "revealed scripture — the gathered revelation",
  "examples": [
    {"ar": "وَٱلْكِتَٰبِ ٱلْمُبِينِ", "ref": "44:2",
     "en": "By the Book that makes all clear",
     "note": "sworn BY — on al-Rāghib's reading the oath is by joined clarifying speech, not an inscribed object"}
  ]
}
```

`note` is where the card earns its keep. Not a gloss — **what this occurrence shows that the
others do not.**

## FRONT

```mustache
<section class="face front" lang="ar" dir="rtl">
  <div class="headword">{{Headword}}</div>
  <p class="root">{{Root}} · {{Wazn}}</p>
  <p class="chain">{{Chain}}</p>
  <p class="identity">{{Identity}}</p>
  <p class="formeffects">{{FormEffects}}</p>
  <blockquote>{{VerseAr}}<cite>{{VerseRef}}</cite></blockquote>
</section>
```

## BACK

```mustache
<section class="face back">
  <p class="range">{{MeaningRange}}</p>

  {{#Arcs}}
  <article class="arc">
    <h3 lang="ar" dir="rtl">{{construction_ar}} <span class="n">{{count}}</span></h3>
    <p lang="ar" dir="rtl">{{arc_ar}}</p><p>{{arc_en}}</p>
    {{#examples}}
    <blockquote><span lang="ar" dir="rtl">{{ar}}</span><cite>{{ref}}</cite>
      <span class="en">{{en}}</span><span class="note">{{note}}</span></blockquote>
    {{/examples}}
  </article>
  {{/Arcs}}

  <h2 lang="ar" dir="rtl">{{FamilyHeading}}</h2>
  <p class="familyline" lang="ar" dir="rtl">{{FamilyLine}}</p>
  {{#FamilyArcs}}
  <article class="arc family">
    <h3 lang="ar" dir="rtl">{{construction_ar}} <span class="n">{{count}}</span></h3>
    <p lang="ar" dir="rtl">{{arc_ar}}</p><p>{{arc_en}}</p>
    {{#examples}}<blockquote><span lang="ar" dir="rtl">{{ar}}</span><cite>{{ref}}</cite>
      <span class="note">{{note}}</span></blockquote>{{/examples}}
  </article>
  {{/FamilyArcs}}

  <p class="outside" lang="ar" dir="rtl">{{OutsideFamily}}</p>
  <p class="siblings" lang="ar" dir="rtl">{{SiblingLine}}</p>

  <aside class="imagery">
    <p>{{Imagery.passage_en}}</p>
    <p lang="ar" dir="rtl">{{Imagery.passage_ar}}</p>
    <ul>{{#Imagery.woven_sources}}<li>{{source}} — {{what_it_gave}}</li>{{/Imagery.woven_sources}}</ul>
  </aside>
</section>
```

## Render notes

- `count: 0` on a family member is **legitimate** — the form exists in the language and not in
  the corpus. Render the zero; do not hide the entry.
- Arabic inline in EN prose: wrap U+2066 (LRI) … U+2069 (PDI).
- Fonts: Amiri (Arabic), EB Garamond (Latin), Cinzel (display). Never Inter/Roboto/Arial.
