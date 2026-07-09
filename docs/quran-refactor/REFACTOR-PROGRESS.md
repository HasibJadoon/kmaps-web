# Quran Module Refactor — Progress

Executing `quran-module-refactor-structure.md` on `apps/k-maps/src/app/features/quran/`.
Each phase was built (`npm run build -w apps/k-maps`) and committed; the app was verified
rendering in the dev server with no console errors.

## Done ✅

| Phase | What | Commit |
|---|---|---|
| 1 | Removed dead code: `sura/lesson/`, `quran-research/research/`, orphan `sura/surah*` island | `55e806b` |
| 2 | Sentence-structure de-dup — resolved by Phase 1 (the duplicate lived in `sura/lesson/`) | — |
| 3 | Renamed 17 morph `*.block.*` → `*-block.component.*`; removed stale root-level block duplicates; updated `morph-block.registry.ts` + templateUrl/styleUrl | `69d6763` |
| 7a | `sura/` → `surah/` (one spelling per concept) | `2de09e6` |
| 7b | Screens renamed to match UI: `quran-surahs`→`index` (SurahIndexComponent), `text`→`reader` (SurahReaderComponent), `vocabulary`→`linguistics` (SurahLinguisticsComponent) | `8eb1bc3` |
| 7c | Study grouping: `study/detail`→`study/scene` (StudySceneComponent), `study/surah-study`→`study/overview` (StudyOverviewComponent) | `e4efb4f` |
| 7d | `passage` → `surah/reader/passage` (SurahPassageComponent) | `cddb804` |

Current top-level: `quran/{quran.routes.ts, shared, quran-research, surah}` with
`surah/{index, reader/{…, passage}, study/{overview, scene}, linguistics, morphology,
near-synonyms, review, srs, notes, lessons, worldview, surah-card, surah-actions,
action-icon-tile}`.

## Remaining (safe techniques noted) ⏳

Established pattern: `git mv` file/folder → `sed` fix `templateUrl`/`styleUrl` + class name +
importer paths → `npm run build -w apps/k-maps` → commit. For a move that **nests deeper**,
prepend one `../` to relative up-imports (`s#from '\.\./#from '../../#g`); for a move that
**flattens up**, remove one (inverse) — verify each file's imports, since single-`../` sibling
imports don't transform uniformly.

- **7e — researcher/landing consolidation.** `quran-research/quran-landing` → `landing/`;
  `quran-research/quran-researcher-shell` → `researcher/` (shell at root);
  `quran-research/al-quran` → `researcher/al-quran`; `quran-research/researcher/*` →
  `researcher/*`. External blast radius = `quran.routes.ts` only, but these flatten up a
  level (depth-decrease import fixes — do carefully, file by file).
- **6 — `ui/` consolidation.** Move shared visual primitives into `quran/ui/`:
  `shared/quran-page-shell` (**15 importers**), `surah/surah-card`, `surah/surah-actions`,
  `surah/action-icon-tile`, `shared/morph-word-card`. `shared/` and `ui/` are siblings so
  import depths are preserved → repo-wide `sed` on the path fragment works
  (e.g. `s#shared/quran-page-shell#ui/page-shell/quran-page-shell#g`). Move
  `shared/empty-state` OUT to `src/app/shared/ui/empty-state` (app-generic).
- **7f — word deep-dive split.** `surah/study/scene/steps/vocabulary/{morph-word-page,
  blocks, modals, parts, support}` → `surah/study/word/*`, leaving `vocabulary-step` in
  `steps/`. Highest churn (big depth change + registry + host wiring) — do last, isolated.
- **4 — transliteration.** `tafseer`→`tafsir` (folder/file/class) — **deferred**: entangled
  with the `/quran/tafseer` **URL** and `tafsir-display`/`iraab-display` data-model types used
  across `shared/` services. Don't change the URL (plan guardrail); scope to component naming.
- **5 — doc-editor extraction.** `surah/notes/` editor internals (`km-document-*`, TipTap
  extensions) → `src/app/shared/doc-editor/`, reconciled with `features/docs/doc-editor/`.
  Cross-feature; do as its own change.
- **8 — selector renames.** `km-quran-text`→`km-surah-reader`, etc. Pure find-and-replace,
  do last once files are settled. (Class names were updated during 7b–7d; selectors were left
  as-is where unused in templates.)
