# WGRT — WorldView Global Rhetorical Terms

> Domain: **WV** (`km_worldview`, worker `km-worldview-worker`, binding `DB_WV`)
> Tables: `wv_rhetoric_devices`, `wv_rhetoric_terms`, `wv_rhetoric_usages`
> Routes: `/wv/rhetoric/*` (also `/worldview/rhetoric/*`), public GET through `workers/backend`
> SRS: note type `NT:kmaps:rhetoric:v1` in `km_core`, cards written via `POST /core/srs/cards/bulk`

## What this is for

Political and journalistic English does most of its worldview work through
figures, not through arguments. "Olive branch" settles who is generous before
anyone has read the terms. "The queen on the chessboard" settles who is
powerful, and quietly settles that there is a board, a player, and a king being
protected. WGRT is where those figures are saved so they can be examined
instead of absorbed.

The entry is not a dictionary gloss. A dictionary gives you `figurative_sense`
and stops. The three columns that make an entry worth storing are:

| Column | Question it answers |
|---|---|
| `literal_sense` | What is the picture actually made of? |
| `highlights` | What does the figure put in the foreground? |
| `hides` | What does it take off the table without arguing for it? |

`hides` is the analytical payload. An entry with an empty `hides` is a
half-entry — record it, but it is not yet doing any work.

## The three tables

### `wv_rhetoric_devices` — the figure taxonomy

Metaphor, allegory, metonymy, euphemism, allusion, framing, labelling epithet
and so on: 13 seeded. Each carries its Arabic balāgha counterpart by name
(`title_ar`, `classical_name`) and a `balagha_fit` of `exact` / `close` /
`partial` / `false_friend`, with `divergence_en` saying where the English label
and the classical term part ways — kināya is wider than metonymy, majāz mursal
is the genus of which synecdoche is one species, framing has no classical
counterpart at all.

`al_concept_ref` is deliberately left NULL in the seed. Per the domain
ownership rules in `CLAUDE.md`, AL owns balāgha; WV stores a typed `AL:<id>`
reference and nothing else. Bind it once the matching row exists in
`ar_ling_gram_term` — do not invent the id.

### `wv_rhetoric_terms` — the expressions

The WGRT entries themselves. `lang` defaults to `en` because that is where the
work starts, but the table is not English-only — the point of *global* is that
the same slot takes an Urdu or Arabic political idiom when you get to it.

`source_domain` and `target_domain` are kept to a short controlled vocabulary
(listed in the migration header) so `/wv/rhetoric/facets` returns usable filter
chips. The vivid specifics live in `literal_sense`, not in the facet.

`stance` — `neutral` / `persuasive` / `euphemistic` / `dysphemistic` /
`propagandistic` / `polemical` — is a judgement about the expression, and it is
where WGRT touches the adversarial side of WV (`wv_propaganda_systems`,
`wv_orientalist_frames`, `wv_deception_signatures`). Use `neutral` sparingly;
most of these figures are doing something.

`counter_term` is the rhetorical counter-move, so the table can be read in both
directions. "Olive branch" answers to "poisoned chalice"; "melting pot" answers
to "salad bowl".

### `wv_rhetoric_usages` — attestation

Who said it, where, when, and what the figure was doing in that instance.
**Never seed an invented quotation.** An entry with no checkable locus classicus
gets no usage row — five of the sixteen seeded terms have one, and that is the
honest number. `is_locus_classicus = 1` marks the coinage or the instance that
fixed the phrase in the language.

## API

```
GET   /wv/rhetoric/devices?family=trope
POST  /wv/rhetoric/devices
GET   /wv/rhetoric/facets
GET   /wv/rhetoric/terms?q=chess&stance=euphemistic&source_domain=games&live=1
POST  /wv/rhetoric/terms
GET   /wv/rhetoric/terms/:idOrSlug        -> { term, device, usages }
PATCH /wv/rhetoric/terms/:idOrSlug
POST  /wv/rhetoric/terms/:idOrSlug/usages

GET   /wv/rhetoric/terms/:idOrSlug/cards   # preview the SRS cards, no writes
POST  /wv/rhetoric/terms/:idOrSlug/cards   # build them into a deck
GET   /wv/rhetoric/cards?<term filters>    # preview a whole filtered set
POST  /wv/rhetoric/cards?<term filters>    # build the set
```

`:idOrSlug` accepts either, so `/wv/rhetoric/terms/olive-branch` works. `POST
/wv/rhetoric/terms` also accepts a device **slug** in `device`, so entries can
be posted as readable JSON:

```json
{
  "slug": "boiling-frog",
  "term": "boiling frog",
  "device": "allegory",
  "literal_sense": "A frog said not to notice water heated by degrees.",
  "figurative_sense": "A population said not to notice an incremental loss of rights.",
  "source_domain": "nature",
  "target_domain": "domestic politics",
  "register": "journalistic",
  "stance": "persuasive",
  "highlights": "Gradualism, and the difficulty of naming the moment of change.",
  "hides": "That the claim is false of actual frogs, and that it casts the population as unable to perceive rather than as constrained from acting."
}
```

## Studying it — WGRT → SRS

The entries are not an archive. Every one becomes English study material, so
the reading and the recall are the same body of work.

Cards are **module `EN`**, `resource_type` `vocabulary`, `concept_domain`
`English Language` — this is English vocabulary study, whatever domain owns the
underlying row. `resource_ref` keeps the typed WV reference
(`WV:RHT:<slug>`, or `WV:RHU:<id>` for an attestation), so a card in the deck
always walks back to the entry it came from.

WV builds the payloads; **CORE writes them**, because CORE owns `km_core`. The
WV worker forwards the caller's `Authorization` header over its `CORE` service
binding, so cards land in that user's own deck and WV never learns who they are.

### The five card templates

One entry yields three cards always, and up to two more when the data supports
them. They pull in different directions on purpose:

| Template | `card_kind` | Front → Back | What it trains |
|---|---|---|---|
| `rhetoric.recognition` | `rhetoric_recognition` | the phrase → what it is saying | you meet it on the page and know what it is doing |
| `rhetoric.production` | `rhetoric_production` | the meaning → the phrase | **the articulation card** — you have the thought and the phrase comes to hand |
| `rhetoric.critique` | `rhetoric_critique` | the phrase → what it hides | you can say what the figure took off the table |
| `rhetoric.device` | `rhetoric_device` | the phrase → the figure + its balāgha counterpart | the classical vocabulary, anchored to a live example |
| `rhetoric.attestation` | `rhetoric_attestation` | a cloze on the quotation → the phrase | recognition under the pressure of real prose |

`rhetoric.device` is emitted only when the entry has a device;
`rhetoric.attestation` once per usage row. The attestation front blanks the
phrase where it actually stands in the quotation, matching on letters and digits
alone so `melting pot` still finds `Melting-Pot`. Where the phrase is not in the
quotation at all — Eisenhower says *dominoes*, not *domino theory* — the card
degrades to an attribution question rather than printing a broken blank.

The current seed of 16 entries yields **69 cards**.

### Building them

```
GET  /wv/rhetoric/terms/olive-branch/cards          # preview, no writes
POST /wv/rhetoric/terms/olive-branch/cards          # build into a deck
GET  /wv/rhetoric/cards?stance=euphemistic          # preview a whole filtered set
POST /wv/rhetoric/cards?target_domain=geopolitics   # build the set
```

`?only=production,critique` narrows to the templates you want — bare names or
the full `rhetoric.` form. The POST body takes `deck_id`, or a `title` (a deck
of that name is found or created; the default is `English — rhetoric (WGRT)`).
The bulk routes cover up to 100 entries per call, which is the pagination cap.

Writing is idempotent. `core_srs_card` is unique on
`(deck_id, resource_ref, card_template)` and the bulk endpoint inserts with
`ON CONFLICT DO NOTHING`, reporting `inserted` and `skipped` per card — so
re-running after editing an entry reads as a no-op rather than as silent
success. **Editing an entry does not rewrite cards already built from it**; that
is the one sharp edge here. Until a refresh path exists, delete the card and
rebuild it when an entry changes materially.

`POST /core/srs/cards/bulk` is generic, not WGRT-specific: any generator that
builds a set of cards at once can use it.

### Rendering

`front_text` / `back_text` are written as plain prose, so the cards work in the
existing web reviewer and in an Anki export today with no client change. The
same content is also written to `fields_json` (`Term`, `Device`, `Hides`,
`Highlights`, …) under `NT:kmaps:rhetoric:v1`, whose v2 template renders the
whole entry on the back with every block `when`-guarded. A sparse entry shows no
empty headings.

## Working conventions

1. **Write `hides` first.** If you cannot say what the figure takes off the
   table, you do not yet have an entry — you have a definition.
2. **One controlled facet, prose everywhere else.** Do not invent a new
   `source_domain` when an existing one fits; put the specificity in
   `literal_sense`.
3. **No invented attestations.** A remembered quotation is not an attestation.
   Leave the usage row out.
4. **Typed references only across domains.** `al_concept_ref` → `AL:<id>`,
   `quran_ref` → `QR:<id>`. Never copy AL or QR content into these tables.
5. **Slugs are stable.** They are addressable in the API and quotable in notes.
   Supersede by `status`, do not rename.

## Where this goes next

Ordered by how much each adds relative to its cost.

1. **Balāgha binding.** Resolve each device's `al_concept_ref` to a real
   `GT:` id in `ar_ling_gram_term`. That turns WGRT into the English half of a
   two-tradition rhetoric map and makes the `divergence_en` column testable
   against the classical definition rather than against memory.
2. **A rebuild path for edited entries.** Today a card built from an entry does
   not change when the entry does. The fix is a `?refresh=1` on the build
   routes that updates `front_text` / `back_text` / `fields_json` in place on
   conflict, leaving the FSRS scheduling columns untouched — the card keeps its
   history, only its content is refreshed.
3. **A reading surface.** An Angular feature under
   `apps/k-maps/src/app/features/worldview/`, listing by facet, with the term
   card built around literal → highlights → hides, and a build-to-deck button.
   The API is shaped for it already (`/facets` returns the chips, list returns
   `device_title` joined).
4. **Capture from the reader.** WV already has `wv_highlights` and
   `wv_reading_sessions`. Promoting a highlight straight into a draft WGRT
   entry is the natural intake path — you meet these figures while reading, not
   while sitting at the table.
5. **Link to the adversarial layer.** `wv_term_links` already carries
   `entity_type` / `entity_id`, so a rhetoric term can be attached to a
   `wv_propaganda_systems` or `wv_orientalist_frames` row without a new table.
   "The Arab street" belongs to an orientalist frame; the link should say so.
6. **Counter-term as a real edge.** `counter_term` is free text today. Once the
   set is larger, promote it to a self-reference so the pairs can be walked.

### Candidate entries not yet seeded

Nature: boiling frog, tip of the iceberg, watershed moment, groundswell.
Health and body: cancer (of a group), lifeblood, hemorrhaging, immune response,
tighten our belts. Building: level playing field, cornerstone, roadmap,
building bridges, safety net, glass ceiling. War and force applied elsewhere:
war on drugs, war on poverty, trade war, culture war. Weather and flow: waves
of migrants, flood of refugees, chilling effect, thaw in relations, climate of
fear. Machinery and market: engine of growth, market correction, headwinds,
trickle-down, structural adjustment. Euphemism: enhanced interrogation,
rendition, regime change, boots on the ground, kinetic action, downsizing,
right-sizing, ethnic cleansing. Frames worth entering as `framing` rather than
as tropes: the international community, the free world, the developing world,
the war-torn region, moderate versus extremist.

The flood/wave family and the euphemism family are the two densest veins — both
are large, both are current, and in both the gap between `highlights` and
`hides` is wide enough to be worth writing down.
