# Deck contract — v5

A deck is a lesson rendered as slides. The server sends rows; each client
switches on `slide.layout` and shapes nothing itself. Eleven layouts, three
renderers (Angular, SwiftUI, the reference HTML), one shape.

> **History.** This document was cited by a reference renderer as `deck-contract.md
> §3-§5` before it existed on disk. It was reconstructed in September 2026 from
> `deck-renderer.html`, which was the only surviving copy of the rules. Sections
> are numbered as that renderer cited them.

## §1 · Where a deck lives

No deck tables. A deck is the generic authored-document pair:

| Contract | Storage |
|---|---|
| deck header | `cm_documents`, `doc_type = 'deck'` |
| `contract_version`, `direction`, `slide_count`, `duration_min`, `videos[]`, `theme{}`, `collection{}`, `xref_gateway{}` | `cm_documents.meta_json` — no columns exist for these |
| a slide | `cm_blocks`, `block_type = 'slide'`, `seq_order = n` |
| `layout`, `accent`, `kicker`, `source`, `lines_ar[]`, `lines_en[]`, `notes_en[]` | `cm_blocks.attrs_json` |
| `verse_refs[]` | `cm_block_refs` (content domain) **and** `qr_citation` (Quran domain) |

Seeds are generated, never hand-written:

```bash
node scripts/gen-deck-seed.mjs <contract.json>   # in kmaps-database
```

It writes two files because they target two databases — `seed-cm-<slug>.sql` for
`km_content` and `seed-qr-<slug>-citations.sql` for `km_quran` — and it refuses
to emit at all if a layout is unknown, a `block_id` is missing, or there are more
glosses than Arabic lines.

## §2 · Endpoints

| Route | Returns |
|---|---|
| `GET /api/cm/decks` | summaries; optional `?domain=` / `?subdomain=` |
| `GET /api/cm/decks/:slug` | the full deck. Accepts a slug **or** a `doc_id` |
| `GET /api/qr/xref?to_ref=34:33` | who cites an āyah, plus the āyah text. `?from_domain=` / `?from_layer=` narrow it |

`cm` is a gated module, so a deck request carries the session token.

`to_ref` accepts `34:33` or a range `40:2-3`. Anything else is a 400 rather than
an empty result, so a malformed ref never reads as "nothing cites this".

Note the module key is **`qr`**, not `quran`: `/api/quran/xref` reaches nothing.
The generator rewrites the endpoint string in `meta_json` accordingly.

## §3 · Lines and their classification

`lines_en[i]` is the gloss for `lines_ar[i]` — index-parallel, rendered directly
beneath its line. A shorter gloss array is fine (that line simply has no gloss);
a longer one means the two have drifted and the generator rejects it.

Structure is read out of the Arabic text itself. Two rules apply in every
layout; three are layout-specific:

| Layout | Rule |
|---|---|
| `split` | `lines_ar[0]` is the stem; `[1..]` become columns |
| `table` | split each line on `—`; a line with no `—` is a full-width header row |
| `bayt` | `✧` separates the two hemistichs |
| `transform` | a line starting `←` is the result line |
| any | a line containing `﴿` is Qurʾānic; one starting `التقدير` is the underlying reading |

The eleven layouts are a closed set — `title`, `definition`, `split`,
`transform`, `examples`, `table`, `shahid`, `proof`, `bayt`, `rule`, `climax` —
and anything else **falls back to `examples`** rather than failing. A deck must
never fail to render because a newer authoring tool sent a layout this client
does not know yet.

`notes_en` is presenter prose: one short line each, inline `**strong**` and
`*em*` only. Arabic runs inside a note must be bidi-isolated, or the surrounding
Latin punctuation gets dragged to the wrong end of the line.

`accent` is `warn`, `gold`, or null, and tints the first line.

The k-th Qurʾānic line wears the k-th `verse_refs` entry as its label, so a
verse panel carries its own reference. Refs beyond the Qurʾānic lines render
as pills in the footer.

## §3a · Composition

Every slide is one frame in three bands, after the author's Keynote decks:

1. **Title band** — the headline in the reading corner (right, for `rtl`),
   its English caption beneath in the accent colour, the kicker as a pill in
   the opposite corner, and a full-width crimson rule under all of it.
2. **Body** — the remaining lines as large panels filling the frame, each
   labelled by a gold ellipse pill above it (a numeral, an ornament, a verse
   reference). Panels sit across the frame when there is room and stack when
   there is not.
3. **Footer** — the presenter notes as a bullet band, loose verse pills, and
   the source in small capitals.

Which line is the headline depends on the layout: the first line for most,
the stem for `split`, the first plain line for `shahid`, none for `title`,
`transform`, `examples` and `bayt`, whose lines are all content.

## §3b · Motion graphics

A slide may carry `graphic` — `{ kind, …data }` in `attrs_json` — a motion
graphic drawn **in place of the body**. The band (kicker, headline) and the
footer still render. The data is the graphic: what the pieces are and how they
relate; the renderer only decides how they arrive, piece by piece, and sets the
final state outright under reduced motion. A client that does not draw a kind
renders the layout as usual, so a graphic never breaks a deck.

| kind | data | draws |
|---|---|---|
| `chain` | `items[] {ar, en, ref, tone:"lit"}`, `note` | a row of related things on a thread, one lit |
| `dovetail` | `left/right {label, label_ar, items[] {id, ref, ar, en}}`, `links[] {from, to, label}` | one text's close laced into the next's opening; links draw, then the light walks them |
| `balance` | `items[] {ar, en, pull:"attract"\|"deter"}`, `labels {attract, deter}`, `note` | names placed above/below a line in order, a wave through them |
| `ring` | `items[] {label, ref, en}` (A…X…A′), `note` | a chiasm, pairs bracketed round the centre |
| `term` | `term_ar, term, root[], items[] {en}` | a word, its root letters, its questions one by one |
| `flow` | `items[] {en, tone}` | steps of an argument, a line growing through them |
| `trace` | `span, rows[] {name, ayat[], status:"paid"\|"unpaid"}` | where each name recurs across the sūra |
| `point` | `term_ar, term, ref, items[] {en}` | a talking point, its sub-points arriving |
| `recall` | `term_ar, term` (question), `note` (answer) | a review point: question, a pause, the answer |

Arabic in Uthmani orthography (it carries the muṣḥaf's small high signs) is
Qurʾān and sets in UthmanicHafs; other Arabic sets in Amiri.

## §4 · Theme

`theme` ships with the deck and is applied **scoped to the deck view** — as
`--deck-*` custom properties on the host element in Angular, as an environment
value in SwiftUI. It must not be written to `:root` or to the app palette: a
deck restyles itself, not the application around it.

Keys: `bg`, `surface`, `panel`, `ink`, `ink_soft`, `muted`, `rubric`, `gold`,
`lapis`, `verdigris`, `rule`. Underscores become hyphens (`ink_soft` →
`--deck-ink-soft`). Every key is optional; a renderer falls back to the app's own
tokens for anything absent.

## §5 · Navigation

The deck is right-to-left, so **left advances**:

| Input | Effect |
|---|---|
| `←` / swipe left / click left half | next slide |
| `→` / swipe right / click right half | previous slide |
| `Home` / `End` | first / last |
| `l` | cycle language: `both → ar → en`, persisted |

Swipes shorter than 45px are ignored. Clicks on the top bar do not navigate.
The URL carries `#/slide/{n}` so a slide is linkable and survives reload.

A verse pill does not navigate on its own — it raises an event carrying the ref,
and the host decides what to open. That keeps the deck renderer free of any
knowledge of the Quran feature.

## §6 · Motion

Both platforms run the **same cubic-bézier curves**: GSAP eases and SwiftUI's
`Animation.timingCurve` take the same control points, so parity is exact rather
than approximate.

| Beat | Duration | Ease | Stagger |
|---|---|---|---|
| slide out | 180ms | `power2.in` | — |
| kicker | 260ms | `power2.out` | — |
| Arabic lines | 420ms | `power3.out` | 70ms |
| glosses | 320ms | `power2.out` | 50ms, +120ms delay |
| notes | 300ms | `power2.out` | 45ms |
| verse pills | 340ms | `back.out(1.6)` | 60ms |
| source | 260ms | `power1.out` | — |

Lines enter from `x: +24` (the reading direction); going back reverses the sign.

Persistent chrome — the kicker, the source line, the counter, the gold rules
shared by `rule` and `climax` — **travels** between slides rather than fading:
GSAP Flip on the web, `matchedGeometryEffect` on iOS. This is the Keynote
"Magic Move" model, and it is the difference between a deck that cuts and a deck
that moves.

Under reduced motion, every renderer sets the final state directly. Never a
zero-duration tween — that still schedules a frame and still flickers.
