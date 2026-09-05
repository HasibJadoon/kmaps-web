---
name: kmaps-wv-lens-build
description: >-
  Build the six worldview lenses for one source-phase in K-Maps / km_worldview, in dependency
  order (jughrafiya → rijal → tarikh → ijtima → nafs → falsafa), driven by the cyb_wv_band
  registry and cyb_node domain=wv. Every proposal goes through the staging pipeline
  (wv_insight_suggestions → wv_insight_decisions) and never straight to a carrier table. Use
  whenever the user wants to build, mine or extend worldview lenses for a source or phase —
  "build the lenses", "wv lens build", "run the six lenses", "phase N of this source",
  "geography/rijal/tarikh/ijtima/nafs/falsafa band", or asks why a philosophy band is blocked.
version: 1.0
---

# K-Maps Worldview Lens Build — `kmaps-wv-lens-build`

Registry **`cyb_wv_band`** (6 bands) · store **km_worldview** · control **cyb_node domain=wv**

## The six lenses, in dependency order
`400-10-JUGHRAFIYA` → `400-20-RIJAL` → `400-30-TARIKH` → `400-40-IJTIMA` → `400-50-NAFS` → `400-60-FALSAFA`

The order is a **time-scale order**: geography changes over millennia, philosophy in a
generation. Each band `depends_on` the one before it in `cyb_job`. You cannot mine philosophy
for a phase until the five beneath it have rows. `400-60-FALSAFA` is `gate_mode=block`.

| Band | Question | Carriers (km_worldview) |
|---|---|---|
| JUGHRAFIYA | Why there and not elsewhere? | `wv_locations`, `wv_location_role_links`, `wv_regions` |
| RIJAL | Taught by whom, paid by whom? | `wv_people`, `wv_people_relations`, `wv_affiliations` |
| TARIKH | What was happening meanwhile? | `wv_events`, `wv_event_participants`, `wv_periods` |
| IJTIMA | Who carried it, who was shut out? | `wv_institutions`, `wv_social_patterns`, `wv_schools` |
| NAFS | What is the self, what moves it? | `wv_anthropology_profiles`, `wv_psychology_schools` |
| FALSAFA | What is the argument? | `wv_claims`, `wv_arguments`, `wv_nodes`, `wv_node_edges` |

## STAGING-FIRST — the one law
**Never write to a carrier table directly.** Every proposal lands in
`wv_insight_suggestions` (payload_json, confidence, target_table) and waits.
The person approves or rejects; the decision is written to `wv_insight_decisions`;
only then does the row reach its carrier. This pipeline exists and has **never been run** —
0 rows in `wv_distill_batches`, `wv_distill_items`, `wv_insight_suggestions`.

## Domain axis
A claim is filed by `wv_domains.slug`, 11 of them. `geographical` and `psychological`
were added 2026-08-15. The lens band and the domain must agree.

## Node shape
`CYB:wv:{source}:{phase}` · scale `stage` · one node per phase, parent = the source node.
Sensors: 14 defs across build/study/content/retention, materialised per phase.

## Block fields — every block carries five
`problem_inherited` · `move` · `cost` · `islamic_echo` · `open_question`

`open_question` is the health sensor. If it stops filling, the study has become performance.
