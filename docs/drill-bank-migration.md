# Drill bank migration — the quran worker stops building drills

Owner ruling (2026-10-24): no drill is built or shaped at request time. Every Qurʾān drill is authored once into
km_core `cyb_drill`, stored whole, and the worker only serves it. This doc is the plan and the state of that move.

**State (2026-10-24):** plan only. Weekly usage was at 88% when the work started (stop line 90%), so no builder has
been moved yet. Every builder below still runs on the fly; only `arc` is off (it serves nothing; its drills are
`rg:*` bank rows from kmaps-resources `scripts/quran/author_range_drills.py`).

## 1 · What "whole" means

A bank row is what `drawSkill` returns today for one drill, after all serve-time shaping, frozen:

| today, at serve time | baked into the row |
|---|---|
| builder output (words, audio, en, span, options, answer, prompt) | `payload_json` as is |
| `ensureCard(d, skill)` — files a card for drills dealt without one | `payload_json.card` always present (same `ref`) |
| `foldSources(d)` — citations → source chips | `payload_json.sources` + `sources_json` |
| `instruction` / `instructionAr` from the `kind` label row | copied into the payload |
| `attachRef` / `widenToAyat` — full āyah + ﴿الأنعام، ١٢٨- 6:128 ﴾ | `payload_json.ref`, full-āyah `words` + timings |
| `attachGt` — registry terms the rows name | `payload_json.gt` |
| ṣarf graphics + motion (practice-sarf.ts) | `payload_json.graphic`, `payload_json.motion` |
| expert-tier filter (gram, gramterm) | applied at bake time: non-expert drills are not written |
| retired kinds (qr_124) | applied at bake time: not written |

Roots in every payload are written whole (فتن), never spaced. `practice-lexicon.ts` (`spaced(o.root)`) and
`practice-sarf.ts` (`[...r].join(' ')` in `rootOf`) space them today; the bake writes the whole root.

Row columns: `gid` = the drill's current `id` prefixed `qr:` (see §3), `domain='qr'`, `skill` = the skill key the
drill was drawn under, `kind`, `interaction`, `discipline` (NH / BL / SRF / LEX / TFS / TRN / STR), `work_ref =
'QR:surah:<s>'`, `intro_surah`, `intro_ayah` = first āyah the drill stands in. A drill met in several passages also
gets `cyb_drill_place` rows.

## 2 · The author step (bake)

A protected route in the quran worker, `POST /qr/practice/bake?skill=…&surah=…&passage=…` (owner token only):

1. for each studied passage of the sūra (km_quran `qr_surah_study_passage`), call the builder with `n` = all and the
   passage as scope, then the same shaping pipeline as `drawSkill` (one shared function, so served = baked);
2. return the shaped drills as JSON rows (gid, columns, payload) — the quran worker has **no CORE binding**, so it
   does not write km_core itself;
3. a kmaps-resources script `scripts/quran/bake_practice_drills.py` walks skills × sūras × passages, calls the
   route, and upserts into km_core `cyb_drill` with `status='draft'` via `wrangler d1 execute --remote` batches
   (the model scripts `author_*_drills.py` already write this way);
4. audit with `GET /core/cyb/drills/audit` (AGR:DRL rules), fix failures in the script, then promote:
   `UPDATE cyb_drill SET status='live' WHERE gid LIKE 'qr:<skill>:%' AND status='draft'`.

Builders that pick at random (fill/hear blanks, shuffled options, `pairs` grouping) must be made deterministic for
the bake (seed = the drill id), so a re-bake gives the same drill and the review card still matches.

## 3 · Serving

`drawSkill(skill, scope)` becomes: read live rows `WHERE domain='qr' AND skill=? AND work_ref=? AND intro_ayah
BETWEEN from AND to` (plus `cyb_drill_place`), parse `payload_json`, sample `n`. No shaping. Two ways to reach
km_core from the quran worker — pick one before step 3 starts:

- add a `CORE` service binding (`km-core-worker`) and call `/core/cyb/drills?domain=qr&skill=…&work=…&from=…&to=…`
  (preferred: keeps "one worker ↔ one D1");
- or the app asks core directly and `/qr/practice/session` is retired.

`practice-class.ts` (`skillsOf(node)` → `drawSkill(..., only, every)`) keeps calling `drawSkill`; `only` filters on
the payload's `ask`, `every` returns all rows of the scope instead of the hard-only ones (bake marks
`payload.hard=true|false`, so `every=false` filters on it).

Switch per skill with a label flag (`skill.extra.bank = true`): bank on → serve rows; off → old builder. Delete the
builder once its rows are live and a passage serves the same ids it did before.

## 4 · Per builder

Keep each drill's `id` and its card `ref` exactly; `gid = 'qr:' + id`. Order = highest traffic first (class steps
and the open practice menu), then the rest.

| # | source (file) | scope it reads | id → gid | card ref (kept) | serve-time shaping to bake | notes |
|---|---|---|---|---|---|---|
| 1 | `irab` (practice.ts `irabDrills`) | words of the passage's āyāt with an iʿrāb row | `irab:<s:a>:<word_index>` | `QR:irab:<s:a>:<wi>` | ensureCard, foldSources, ref, gt | band from `levels` — bake all bands, store `payload.band` |
| 2 | `lines` (`lineDrills`: fill / hear / order) | āyāt / sentences | `<skill>:<ayah id>` | `QR:<skill>:<id>[:<word>]` | ref, full āyah; random blank → seeded | `hear` keeps word-only audio; `order` keeps its tiles |
| 3 | `ss` (practice-ss.ts + `sentenceLineDrills`) | sentence nodes of the passage | `ss:tree:<sent>`, `ss:kind|mahall|role|books|ellipsis|nuance|why:<row>`, `ss:buildup:<passage>` | `QR:ss:…` | ref, widenToAyat, sources | `ss:books` asks which book — check against AGR:DRL:009 before baking |
| 4 | `sarf` (practice-sarf.ts) | focus words of the passage | `sarf:<id>` | `QR:sarf:<id>` (via ensureCard) | graphic + motion, ref; roots whole | biggest shaping job (1,098 lines) |
| 5 | `vocab` (practice-vocab.ts) | hard words (all with `every`) | as built | as built | ref; `hard` flag | 1,214 `vocab_same` rows already in the bank — reconcile, don't duplicate |
| 6 | `lexicon` (practice-lexicon.ts) | words + AL lexicon | `lexicon:<id>`, `lexicon:family|odd|form:<s:a>:<wi>` | `QR:lexicon:…` | roots whole (drop `spaced`) | |
| 7 | `translation` (`translationDrills`) | āyāt × renderings | `translation:<key>` | `QR:translation:<key>` | ref, sources | |
| 8 | `reading` (practice-reading.ts) | sentences of the passage | builder-prefixed ids, `keyterm:story:<id>` | `QR:<id>` | ref | `only` filters on the id prefix — keep the prefix |
| 9 | `tafsirq` (practice-tafsirq.ts: meaning / listen) | tafsīr blocks of the passage | as built | as built | sources | |
| 10 | `tafsir_read` / `tafsir_hear` / `tafsir_lang` (practice-tafsir.ts) | 4 works × passage | as built | as built | sources, audio | |
| 11 | `gram` (`gramDrills`, NH / BL) | gram/balāgha rows of the āyāt | `<skill>:<row id>` | `QR:<skill>:<row id>` | expert filter at bake, gt | |
| 12 | `gramterm` (practice-grammar.ts) | GT examples in the passage | `<skill>:<id>`, `gt:irab:<id>` | `QR:<id>` | expert filter, gt | |
| 13 | `idiom` (`idiomDrills`) | idioms in the āyāt | `idiom:<id>` | `QR:idiom:<id>` | ref, sources | |
| 14 | `irabbooks` (practice-irabbooks.ts) | iʿrāb books × words | `irabbooks:muyassar|which|allowed|allows:…` | `QR:irabbooks:<key>` | sources | `which` asks which book — likely retired under AGR:DRL:009/010 |
| 15 | `tafsir` (`tafsirDrills`) | tafsīr of the passage | as built | as built | sources | |
| 16 | `arc2` (practice-arc2.ts) | roots of the passage | `arc2:<ask>:<root>`, `arc2:lemma|word|link|disagree:…` | `QR:arc2:…` | ref; roots whole | overlaps the `rg:*` range drills — keep one |
| 17 | `nearsyn` / `keyterm` / `expression` (practice-surah-lex.ts) | sūra lexicon | as built | as built | ref, sources | scope is the sūra, not the passage: `work_ref` only |
| 18 | `structure` (practice-structure.ts) | passages of the sūra | `structure:relation|ring|ring_side|arc|arc_shape|arc_order|place:…` | `QR:structure:<ref>` | — | sūra scope |
| 19 | `groups` (practice-groups.ts) | sūra groups | `groups:<ask>:<slug>[:<s>]` | `QR:groups:…` | — | whole-Qurʾān scope: `work_ref='QR:groups'`; several asks (who, which book) may be retired |
| 20 | `questions` (`questionDrills`) | authored questions | as built | as built | — | |
| 21 | `pairs` (`pairsDrills`) | words of the passage | as built | as built | — | random grouping → seeded by passage |
| — | `arc` | — | — | — | — | already off (bank `rg:*`) |

"as built" = read the id template from the builder when baking it; it is kept unchanged.

## 5 · Order of work and stop rule

1. shared shaping function (extract the tail of `drawSkill`) + bake route + bake script, tried on 40:1–3 (Ghāfir
   passage 1) with `irab`;
2. per builder, in the table order: bake all studied passages → audit → live → flip `extra.bank` → compare served ids
   for one passage old vs new → delete the builder's on-the-fly path → `npx tsx --test workers/quran/test/*.test.ts`
   and `npm test` green → commit + push (`git pull --rebase` first);
3. last: delete `ensureCard` / `foldSources` / `attachRef` / `attachGt` calls from the serve path.

Stop at 90% weekly usage: commit what is finished, leave the rest on the on-the-fly path, update §6.

## 6 · Remaining

All 21 builders remain on the on-the-fly path. Nothing baked, no bank rows written by this migration, no code
changed. Open choice for the owner: CORE service binding in the quran worker vs. the app reading core directly (§3).
