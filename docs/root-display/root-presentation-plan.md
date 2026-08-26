# Root Presentation — full plan

Five resource levels, their endpoints, their payloads, and the stages to build them.
The بين reference page is the design target; this is what stands behind it.

**Architecture (settled).** The page is *computed from live carriers*, never a stored
document. `routes/ds.ts:9` records why: three stored projections — `ar_ling_root_display`
(13 rows), `display_json` on thirteen tables, `qr_morph_display_*` (33 roots, 4 with
blocks) — each stalled at a handful of hand-authored rows. The computed spec serves all
**1,642** roots today.

**Two call shapes, and they are not alternatives.**

| | call | when |
|---|---|---|
| **Page load** | `/al/ds/root/:root` + 2 overlays | opening a root — everything, in chapters |
| **Drill-down** | the per-resource endpoints below | tapping a form, a lemma, a sense, a card |

The ds spec is the page. The resource endpoints are what a tap opens. Building only the
first gives a page you cannot navigate; only the second gives no page.

---

# The one contract that governs everything

`km_core.core_srs_note_type` → **`NT:kmaps:root:v1`** is already the canonical field list
for a root, and its `templates_json` is already a renderer spec (`{v:2, front:[…], back:[…]}`).
Its fields map onto the reference page almost one-to-one:

| note-type field | page |
|---|---|
| `Root` `RootUid` `Radicals` `Soundness` | header |
| `AslStatement` `{ar,en,auth,deathAH,note}` | §1 |
| `Addad` `[{w,axis,status}]` — *status is attested\|derived and is **LOAD-BEARING*** | §2 |
| `SenseArc` `[{n,fam,ar,en,auth,d,concrete}]` · `Axes` | §3 |
| `FormLadder` `[{form,verb,bab,masadir[{m,s}],ap,pp,gov[],trans}]` — `s` is `attested\|qiyasi` | §4 |
| `LemmaInventory` `[{t,pos,n,gloss,ref}]` — *REFERENCED ONLY* | §5 |
| `Furuq` `[{w,farq}]` · `Expressions` `[{e,en,ref}]` | §7 §8 |
| `Scholarship` `[{author,claim,ref}]` · `Taqalib` · `Field` | §3 §10 |
| `LangContract` — *ar/en/ur are SEPARATE keys, never mixed in one string* | throughout |

**Rule: the display spec and the card read the same fields.** The card is the page at a
different setting. Derive both from the carriers; never let a builder invent a shape the
note type already names, or the two drift and the page contradicts the card a student
revised from.

---

# Level A — Root

```
GET /al/roots/search?q=بين&limit=20              exists · roots.ts:19
GET /al/ds/root/:root?form=desktop&scope=root    exists · 20 sections, live
GET /al/roots/:root/summary                      NEW · header facts
GET /core/cyb/scope/root/:root                   exists · build state → DsPlane
```

`/al/roots/:root/summary` — the header, and every figure derived, none stored:

```json
{
  "root_ar": "بين", "root_display": "ب ي ن", "root_uid": "…",
  "root_type": "أجوف يائي", "soundness_en": "hollow-yāʾ",
  "buckwalter": "byn",
  "radicals": [
    { "l": "ب", "name": "bāʾ", "makhraj": "shafawī", "sifa": "jahr · shidda", "order": 1 },
    { "l": "ي", "name": "yāʾ", "makhraj": "wasṭ al-lisān", "sifa": "jahr · rakhāwa", "order": 2 },
    { "l": "ن", "name": "nūn", "makhraj": "ṭaraf al-lisān", "sifa": "jahr · tawassuṭ", "order": 3 }
  ],
  "core": { "ar": "بُعْدُ الشيءِ وانكشافُه",
            "en": "the remoteness of a thing and its disclosure",
            "ur": "کسی چیز کی دُوری اور اُس کا انکشاف" },
  "counts": {
    "quran_tokens": 522, "quran_lemmas": 13,
    "forms_attested": 7, "forms_in_quran": 4,
    "senses_labelled": 13, "senses_total": 41,
    "sources_cited": 14
  },
  "anchor": { "surah": 44, "ayah": 2, "word_ar": "ٱلْمُبِينِ" },
  "completeness": { "bands_filled": 27, "bands_declared": 28 }
}
```

**`forms_attested: 7` and `forms_in_quran: 4` are separate counts on purpose.** The
reference page's single *"5 verb forms"* is neither, and there is no query that yields 5.
`ar_ling_root_form_masmu` holds seven (I II III IV V VI X); QAC finds four occurring
(II IV V X). Two questions — *what the language builds* vs *what the Qurʾān uses* — and
merging them is the error that produced the old scrambled ladder. Show both, labelled.

**Carriers:** `ar_ling_roots`, `ar_ling_root_dna`, `ar_ling_root_letter(_slot)`,
`ar_ling_root_naw_sawti`, `qr_word_occurrence` (count), `ar_ling_root_band_fill`.

---

# Level B — Root Form

```
GET /al/roots/:root/forms              NEW · the ladder
GET /al/roots/:root/forms/:roman       NEW · one form, expanded
```

```json
{
  "root_ar": "بين",
  "forms_attested": 7, "forms_in_quran": 4,
  "forms": [
    {
      "roman": "I", "bab": "ḍaraba", "wazn": "فَعَلَ",
      "verb_ar": "بانَ", "mudari_ar": "يَبِينُ", "amr_ar": "بِنْ",
      "masadir": [ { "m": "بَيْن", "s": "attested" },
                   { "m": "بَيْنونة", "s": "attested" },
                   { "m": "بُيون", "s": "attested" } ],
      "active_participle": "بَائِن",
      "passive_participle": null,
      "passive_note_ar": "غير مستعمل — لازم فقط",
      "meaning": { "ar": "انفصل وبَعُد؛ اتّضح وظهر (وهو من الأضداد)", "en": null, "ur": null },
      "government": [
        { "transitivity": "intransitive", "route": "lazim", "harf": null,
          "meaning_en": "to become distinct, to part",
          "source_ref": "lisan:بين" },
        { "transitivity": "transitive", "route": "bi-harf", "harf": "عَنْ" }
      ],
      "quran": { "finite": 0, "participle": 0, "total": 0 },
      "basis": "curated", "source_slug": "kmaps_synth", "is_synthesis": true
    },
    {
      "roman": "IV", "wazn": "أَفْعَلَ",
      "verb_ar": "أَبَانَ", "mudari_ar": "يُبِينُ",
      "masadir": [ { "m": "إِبَانَة", "s": "attested" } ],
      "active_participle": "مُبِين", "passive_participle": "مُبَان",
      "government": [
        { "transitivity": "transitive",   "route": "hamza" },
        { "transitivity": "intransitive", "route": "bi-maʿnā bāna",
          "note_en": "the grammatical basis for reading مُبِين intransitively at 44:2" }
      ],
      "quran": { "finite": 1, "participle": 119, "total": 120,
                 "finite_loci": [ { "surah": 43, "ayah": 52, "word_ar": "يُبِينُ" } ] },
      "lemmas": [ { "lemma_ref": "QR:lemma:mubin", "lemma_ar": "مُبِين",
                    "derivation_type": "active_participle", "count": 119 } ],
      "basis": "qac", "source_slug": "qac_morphology", "is_synthesis": false
    }
  ]
}
```

### The correctness rule — this is the whole fix

Group **strictly** by `ar_ling_root_lemma_form_map.form_roman` + `derivation_type`, joined
`ar_ling_roots.buckwalter = form_map.root_bw`. Both live in `DB_AL`; **no cross-database
read**. Never match the lemma *surface string* — surface matching is what put `يُبِينُ` (IV)
and `بَيَّنُ` (II) inside Form I, and `تَسْتَبِينَ` (X) inside Form II.

A lemma with no `form_map` row goes to an explicit `"form not yet determined"` entry.
Never a guess. Do **not** block on `verb_form_ref` — 1,436 of 8,484 Qurʾānic lemmas (17%);
the QAC map already carries 2,481 rows over 1,082 roots at high confidence.

### `basis` is required on every rung

Three of بين's seven forms (I, III, VI) are `kmaps_synth` with `is_curated=1`; four
(II IV V X) are `qac_morphology`. Synthesis standing beside attestation with nothing to
tell them apart is the failure mode this whole design exists to prevent.

**Known gap:** `meaning_en` is **NULL on all seven rows** for بين, and `voice_attested_json`
is `[]`. The reference page shows English for every form. Either backfill `meaning_en`, or
emit `"en": null` and let the client show the Arabic alone — **do not silently substitute a
compiler's translation into a field the source did not supply.**

**Carriers:** `ar_ling_root_form_masmu` (1,728), `ar_ling_root_lemma_form_map` (2,481),
`ar_ling_root_form_family` (28), `ar_ling_root_form_template` (517),
`ar_ling_root_sarf_form_index` (138), `ar_ling_root_lemma_tadiya` (395).

---

# Level C — Root Lemma

```
GET /al/roots/:root/lemmas          NEW · the family grid
GET /al/ds/lemma/:lemma             NEW · the lemma document (ds-shaped)
GET /al/lemmas/:lemma/government    NEW · 20-GOV, one lemma
GET /qr/lemmas/:lemma/occurrences   exists · lexicon.ts:62 — verify keyed on lemma_ref
```

**Grid** — what the family grill renders; `lemma_ref` is the navigation key:

```json
{
  "root_ar": "بين", "total": 13,
  "groups": [
    { "form_roman": "IV", "form_ar": "أَفْعَلَ",
      "lemmas": [
        { "lemma_ref": "QR:lemma:mubin", "lemma_ar": "مُبِين", "lemma_bare": "مبين",
          "pos": "adj", "derivation_type": "active_participle",
          "wazn_ar": "مُفْعِل", "count": 119,
          "gloss": { "ar": "ظاهر بيّن", "en": "manifest; making clear", "ur": "واضح" },
          "first": { "surah": 2, "ayah": 61 },
          "is_quran_word": true, "has_card": true }
      ] },
    { "form_roman": null, "form_ar": null, "label_en": "form not yet determined",
      "lemmas": [
        { "lemma_ref": "QR:lemma:bayn", "lemma_ar": "بَيْن", "pos": "noun",
          "derivation_type": "jamid", "count": 266 }
      ] }
  ]
}
```

**Lemma document** — what opens on tap:

```json
{
  "lemma_ref": "QR:lemma:mubin", "lemma_ar": "مُبِين", "root_ar": "بين",
  "identity": { "pos": "adj", "form_roman": "IV", "wazn_ar": "مُفْعِل",
                "derivation_type": "active_participle",
                "jumud": "mushtaqq", "root_soundness": "ajwaf yāʾī" },
  "chain_ar": "أَبَانَ — يُبِينُ ، أَبِنْ ، إبانةً ، فهو مُبِينٌ ، والمفعول مُبَانٌ",
  "ilal": { "derived_ar": "مُبْيِن", "resolved_ar": "مُبِين",
            "rule": "iʿlāl bi-l-naql",
            "note_en": "the kasra of the yāʾ transfers to the sound letter before it",
            "state": "unknown" },
  "government": [ { "transitivity": "transitive", "route": "hamza", "harf": null } ],
  "meaning_range": { "ar": "…", "en": "…", "ur": "…" },
  "arcs": [ { "arc_key": "clarity", "ar": "…", "en": "…", "is_synthesis": false,
              "steps": [ { "step_no": 1, "sense_id": "…", "note_md": "…" } ] } ],
  "furuq": [ { "w": "مُبَيِّنَة", "farq_en": "Form II — clarifies something else, by an act",
               "auth": "…", "locus": "24:34" } ],
  "expressions": [ { "e": "أَبَانَ بمعنى بانَ", "en": "Form IV with Form I's sense",
                     "ref": "Ibn ʿĀshūr at 44:10" } ],
  "occurrences": { "total": 119, "href": "/qr/lemmas/QR:lemma:mubin/occurrences" },
  "cards": [ { "card_id": "…", "note_type_id": "NT:kmaps:lemma:sarf:v9",
               "card_state": "review", "next_review_at": "…" } ]
}
```

`ilal.state: "unknown"` is deliberate. `24-ILAL` is `carrier_state = 'unkeyable'` in the
registry (24 rows, unbound). **It must report `unknown`, never `empty`** — `empty` claims a
measurement nobody took. Do not fabricate a keying for it.

**Carriers:** `ar_ling_root_lemma` (78,773), `ar_ling_root_lemma_tadiya`,
`ar_ling_lemma_arc` (14), `ar_ling_root_lemma_furuq_set` (751),
`ar_ling_root_lemma_tabir` (2,370), `ar_ling_root_lemma_ilal` (24),
`ar_ling_root_lemma_taswib` (18), `qr_word_occurrence` on `lemma_ref`.

---

# Level D — Root Senses

You asked for *"unique senses"* — and that word is doing real work here.
**بين has 41 sense rows and 13 unique senses.** The other 28 are per-source restatements
of the same sense. A flat list of 41 would tell a student the root has 41 meanings.

```
GET /al/roots/:root/senses            NEW · unique senses, sources folded in
GET /al/roots/:root/senses/:key       NEW · one sense, all witnesses
GET /al/roots/:root/arc               NEW · development + arc steps
GET /al/roots/:root/axes              NEW · sense axes
```

```json
{
  "root_ar": "بين", "unique": 13, "rows_total": 41,
  "senses": [
    {
      "sense_key": "firaq", "sort_order": 1, "is_core": true,
      "label":  { "ar": "فِراق", "en": "parting, separation", "ur": "جدائی" },
      "gloss":  { "ar": "البَيْنُ: الفِراقُ والانفصالُ", "en": "to part or depart", "ur": "…" },
      "witnesses": [
        { "source_slug": "kitab_al_ayn", "author_name": "al-Khalīl b. Aḥmad",
          "author_death_ah": 170,
          "quote_ar": "البَيْنونةُ: مصدرُ بانَ يَبِينُ بَيْناً وبَيْنونةً، أي: قَطَعَ",
          "quote_en": "…", "locator": "p.3151", "agreement": "agrees", "confidence": "high" }
      ],
      "shawahid": [ { "surah": 6, "ayah": 94, "text_ar": "لَقَد تَّقَطَّعَ بَيْنَكُم" } ],
      "basis": "attested"
    }
  ]
}
```

**Fold, don't flatten.** One entry per `sense_key`; every source that states it becomes a
`witnesses[]` row carrying its own quote and locator. That is how 41 rows become 13 senses
*without losing a single source* — and it is why `witnesses` is the natural home for the
verbatim lexicon text that must never sit on the root document itself.

**Aḍdād** (§2) — `ar_ling_root_didd` holds exactly **2** rows for بين, matching the page:

```json
{ "addad": [
    { "w_ar": "الفِراق ⟷ الوَصْل", "axis": "separation ⟷ union",
      "status": "attested", "generated_by": null,
      "source_slug": "kitab_al_ayn", "author_death_ah": 170,
      "shahid": { "surah": 6, "ayah": 94 } },
    { "w_ar": "بانَ (فارَقَ) ⟷ بانَ (ظَهَرَ)",
      "status": "derived", "generated_by": "kmaps_sense_map",
      "source_slug": null,
      "note_en": "no classical lexicon pairs these as aḍdād" } ] }
```

`status` is the note type's own word and it is marked **LOAD-BEARING**. It must render
visibly apart — not in a tooltip. A K-Maps inference shown in the same weight as al-Khalīl
teaches something the tradition does not say.

**Arc** — `ar_ling_sense_arc` (168) + `ar_ling_sense_arc_step` (355), plus
`ar_ling_root_tatawwur` (4 stages for بين). Both carry `is_synthesis`.

**Carriers:** `ar_ling_root_sense` (920), `ar_ling_sense_attestation` (**1,838**),
`ar_ling_sense_arc`, `ar_ling_sense_arc_step`, `ar_ling_root_sense_axis`,
`ar_ling_root_tatawwur`, `ar_ling_root_didd`, `ar_ling_root_haql`.

---

# Level E — Root SRS cards, front and back

```
GET /core/srs/cards?root=بين&scope=root|lemma|word   NEW filter on existing route
GET /core/srs/cards/:id?render=1                     extend · srs.ts:1352
GET /core/srs/note-types/:id                         NEW · fields + templates
POST /core/srs/cards/:id/grade                       exists · srs.ts:1378
```

`?render=1` returns the card **with its note type resolved**, so a client renders front and
back without knowing the schema:

```json
{
  "card": {
    "id": "CARD:root:byn", "resource_type": "root", "card_template": "root.card",
    "note_type_id": "NT:kmaps:root:v1", "root_norm": "بين",
    "card_state": "review", "stability": 8.4, "difficulty": 5.1,
    "reps": 3, "lapses": 0, "next_review_at": "2026-09-23T10:59:19.357Z",
    "suspended": 0,
    "fields_json": {
      "Root": "بين", "Soundness": "أجوف يائي",
      "Radicals": [ { "l": "ب", "name": "bāʾ", "makhraj": "shafawī", "order": 1 } ],
      "FormLadder": [ { "form": "IV", "verb": "أَبَانَ", "bab": null,
                        "masadir": [ { "m": "إِبَانَة", "s": "attested" } ],
                        "ap": "مُبِين", "pp": "مُبَان", "gov": ["hamza"], "trans": "mutaʿaddī" } ],
      "AslStatement": { "ar": "أصلٌ واحد، وهو بُعْدُ الشّيءِ وانكشافُه",
                        "en": null, "auth": "Ibn Fāris", "deathAH": 395, "note": null },
      "Addad": [ { "w": "الفِراق ⟷ الوَصْل", "axis": "…", "status": "attested" } ],
      "QuranTotal": 522, "VerseRef": "44:2"
    }
  },
  "note_type": {
    "id": "NT:kmaps:root:v1", "direction": "rtl_mixed",
    "fields": [ { "name": "Root", "type": "text_ar", "required": 1 } ],
    "templates": {
      "v": 2,
      "front": [ { "id": "root", "style": "headword", "ar": "{{Root}}" },
                 { "id": "form_ladder", "style": "list", "each": "FormLadder",
                   "label": { "en": "Forms", "ar": "الأبواب" },
                   "item": { "head_en": "{{form}}", "ar": "{{verb}}",
                             "meta": "bāb {{bab}} · {{trans}}",
                             "each": "masadir", "item": { "ar": "{{m}}", "meta": "{{s}}" } } } ],
      "back":  [ { "id": "asl", "style": "group", "label": { "en": "Aṣl", "ar": "الأصل" },
                   "ar": "{{AslStatement.ar}}", "meta": "{{AslStatement.auth}} ت{{AslStatement.deathAH}}" } ]
    }
  }
}
```

The renderer walks `templates.front` / `.back`, resolving `{{Field}}` and `{{Field.sub}}`
against `fields_json`, looping on `each`. **Styles in use:** `headword`, `list`, `meta`,
`verse`, `group`. That is the whole vocabulary — 3 note types, all v2.

### Retention — a constraint on every stage, not a step

`core_srs_review.card_id` is `ON DELETE CASCADE`.
`core_srs_card` is `UNIQUE (deck_id, resource_ref, card_template)`.

Live: **1,125 reviews across 62 cards** — 28 `review` (avg stability 8.4 d), 34 `learning`,
206 `new`. Also live and unversioned: `lemma.mushtaqq` ×17 (5 reviewed), `lemma.jamid` ×7
(all 7 reviewed), `root.dna` ×9, and the `CARD:44:*` āyah one-offs — **all with
`note_type_id = NULL`**.

- Nothing in this plan writes a card. The root page is a **read** path.
- Any change to `resource_ref`, `card_template` or `deck_id` mints a new row and cascades
  the history away. `UPDATE` in place; never delete-and-reinsert.
- A null-`note_type_id` card must still render — fall back to `front_text` / `back_text`.
  Twelve reviewed cards depend on it.
- Export `core_srs_card` + `core_srs_review` before any write touching `km_core`.

---

# Level F — what you did not name, and the data says you need

| # | Surface | Endpoint | Backing | Why |
|---|---|---|---|---|
| 1 | **Source registry** | `GET /al/sources?slugs=…` | `ar_ling_source` — **83 rows**, `author_name`, `author_death_ah/ce`, `title_ar/en/ur`, `source_order` | §1 and §10 print *"d. 502 AH"*. `ar_ling_root_asl` has `death_hijri` on **one row of four** and `authority_en` on one. Without this join those dates are unsourced on a page whose whole claim is that it cites. |
| 2 | **Attestations** | `GET /al/roots/:root/attestations` | `ar_ling_sense_attestation` — **1,838** rows with `quote_ar/en`, `locator`, `shamela_ref`, `agreement` | The shāhid under every §3 sense. `agreement` records where sources *disagree* — the Ibn Durayd / Ibn Fāris variant reading the page mentions. |
| 3 | **Lexicon entry** | `GET /al/lex/v2/display/:slug?root=` (exists) | `ar_ling_lexicon_entry`, `_block`, `_section` + FTS | Full verbatim text. **Routes out — never inlined.** Inlining Lane, Lisān, Tāj and Mufradāt is what made the old projection enormous. |
| 4 | **Tafsīr case** | `GET /qr/tafsir/ayah/:s/:a?root=` | `qr_tafsir_book_display_block` — 41,056 blocks, 8 works, FTS | §6 is a whole section with no endpoint. Needs a `root=` filter. |
| 5 | **Qurʾān word index** | `GET /qr/roots/:root/words` | `qr_word_occurrence` — 72,504 of 77,424 carry `lemma_ref` | §5. **Do not** read `ar_ling_lemma_arc_example` — 21 rows total, corpus-wide. |
| 6 | **Taqālīb** | `GET /al/roots/:root/taqalib` | `ar_ling_root_taqalib` | Note type declares `Taqalib {group,members[],unused,note}`. `unused` is real information — the language *declined* that permutation. |
| 7 | **Semantic field** | `GET /al/roots/:root/field` | `ar_ling_root_haql` — 5 rows for بين, SPEECH primary | `semantic_field` was NULL in the old projection despite the data existing. |
| 8 | **Scholarship** | `GET /al/roots/:root/scholarship` | `ar_ling_root_scholarship` — 311 rows, **7 for بين** | Sinai. A `52-SCHOL` block, **not** a lexicon lens. |
| 9 | **Root relations** | `GET /al/roots/:root/relations` | `ar_ling_root_relation`, `ar_ling_root_backlink` | Neighbouring roots — how a student leaves this page for the next one. |
| 10 | **Lexicon alias** | internal | `ar_ling_root_lexicon_alias` (`root_norm` → `lookup_norm`) | Variant spellings. Without it a root silently shows no lexicon entry. |
| 11 | **Corrections** | folded into lemma doc | `ar_ling_root_lemma_taswib` — 18 rows | `29-CORR`. Too thin for its own surface. |
| 12 | **Build state** | `GET /core/cyb/scope/root/:root` | `cyb_root_band` (28), `ar_ling_root_band_fill` (45,976) | Builder view only. **Never above the fold** — a reader should not see band codes. |

---

# Stages

**Stage 0 — freeze the contract.** Write the section↔band↔carrier map and extend
`workers/shared/test/ds-fixture.ts` with one block of every new kind. `DisplaySpecContractTests`
(iOS) decodes it. Nothing else starts until this compiles.

**Stage 1 — chapters.** `ds.repo.ts:56` `CHAPTERS` gains `family` · `behaviour` · `usage`;
`ds.repo.ts:74` `CHAPTER_OF` gains the 8 orphaned bands. Today `scope=lemma` returns
`chapters: ["sources"]` — all seven lemma sections filed under *"Where it was read"*.
Smallest change here, immediately visible in the live JSON.

**Stage 2 — the form ladder.** `22-BAB` + `26-ATTEST` builders, per the correctness rule.
**This is both the spine of the page and the correctness fix.** Verify بين yields
II IV V X in the Qurʾān column and I III VI as attested-only, then diff against
`km_core` root card `FormLadder`.

**Stage 3 — lemma spine.** `200-LEM` grid builder, `/al/ds/lemma/:lemma`, `20-GOV` ledger
(replacing the raw `ar_ling_root_lemma_tadiya` table dump), `80-KIN`, `82-EXPR`.

**Stage 4 — senses.** The 41→13 fold, witnesses, attestations, arc + steps, aḍdād with
`status`.

**Stage 5 — the source registry join.** `ar_ling_source` on every `source_slug`, everywhere.
Closes the death-year and authority gaps in one pass.

**Stage 6 — Qurʾān and tafsīr overlays.** `/qr/roots/:root/words`, tafsīr `root=` filter.
Fills the `quran` chapter, which is declared and permanently empty from AL.

**Stage 7 — SRS render.** `?render=1`, note-type resolution, front/back walker, null-note-type
fallback.

**Stage 8 — web.** Chapter renderer over `DisplaySpec`, one component per `DsBlock` kind.
Reuse the existing `FamilyTierVm` / `FamilyGroupVm` / `FamilyLemmaVm` and
`MorphWordCardComponent` — they were only ever starved of correct data. Route
`/lexicon/root/:root/lemma/:lemma`. `normaliseSpec()` at the HTTP boundary.

**Stage 9 — iOS.** Extract `DisplaySpec.swift` (395 lines, all 11 kinds) + `CybDSBlockView`
+ `CybDSSpecView` out of `CyberneticsFeature` into a shared target. **Move, don't fork** —
a second copy re-creates the drift the golden-fixture test exists to prevent. Reader lands
in `LinguisticsFeature`.

Stages 1–5 are AL-only and independently shippable. 6 is QR. 7 is CORE. 8–9 consume a
frozen contract.

---

# Three rules that carry the scholarship

**1. Absent sections do not render, and `unknown` is not `empty`.** عبد has no idioms and no
Sinai entry — it must show no empty headings. `unknown` means no audited carrier binds the
layer, so nothing was ever read; drawing it as `empty` claims a measurement nobody took.
`24-ILAL` is `unkeyable` and stays `unknown`.

**2. Derived claims are marked in the reader's face.** `is_synthesis` / `status: derived` /
`basis: curated`, on every kind that carries provenance. Never a tooltip.

**3. Nothing claims more than its row.** `ar_ling_root_asl.confidence` reads **`low`** on
the three statements the reference page badges `verbatim`. Either raise those values
deliberately, or render what the row says. A page whose entire premise is that it cites
cannot round its own confidence up.

---

# Verification

**Breadth is the test, not بين.** بين is the deepest root in the corpus — 27 bands, 287
rows. The distribution:

| bands filled | roots |
|---|---|
| 20+ | **6** |
| 10–19 | 472 |
| 5–9 | **1,153** |
| 2–4 | 11 |

A layout verified only on بين will render **1,153 roots** as a scaffold of empty headings.
Every stage checks one 20+ root, one mid root, and one 5-band root.

```bash
# Stage 1 — chapters are no longer ["sources"]
curl -s "https://backend.k-maps.com/api/al/ds/root/%D8%A8%D9%8A%D9%86?scope=lemma" \
 | python3 -c "import json,sys;d=json.load(sys.stdin)['data'];print([c['key'] for c in d['chapters']]);\
[print(s['code'],s['chapter'],s['state'],[b['kind'] for b in s['blocks']]) for s in d['sections']]"
```

```sql
-- Stage 2 — the ladder, against QAC
SELECT form_roman, derivation_type, SUM(occurrences)
FROM ar_ling_root_lemma_form_map WHERE root_bw='byn' AND status='live'
GROUP BY 1,2 ORDER BY 1;          -- expect II, IV, V, X — and NO Form I

-- Stage 4 — the fold
SELECT COUNT(*) rows, COUNT(DISTINCT sense_key) unique_senses
FROM ar_ling_root_sense WHERE root_norm='بين';   -- expect 41 / 13

-- SRS — before and after ANY km_core write
SELECT COUNT(*) FROM core_srs_review;              -- must stay 1125
SELECT COUNT(*) FROM core_srs_card WHERE reps>0;   -- must stay 62
```

Then grade one card through `POST /core/srs/cards/:id/grade` and confirm `core_srs_review`
gains exactly one row and the card's FSRS fields advance.

**Must not regress:** `/srs`, the surah SRS view, the surah morphology step, and Anki
export (`GET /core/srs/decks/:id/export`).

**iOS:** `DisplaySpecContractTests` passes against the extended fixture before any reader
view is written.
