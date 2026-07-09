# K-MAPS Web — Project Guide

> Last updated: 2026-07-09
> Read this at the start of each coding session. This file describes the current repo shape only.

**This repo is the web platform only** (Angular apps + Cloudflare Workers). It was split out
of the old `knowledge-map` monorepo. Sibling repos hold what used to live alongside:
- **kmaps-database** — D1 migrations, schema, seeds, DB scripts, ingestion tooling
- **kmaps-resources** — fonts, icons, brand, design assets
Don't recreate `database/`, `scripts/`, or `resources/` here; make those changes in the
sibling repo. See `~/LLM/CLAUDE.md` for the workspace map.

## Current Shape

K-MAPS is an Islamic knowledge platform with Angular apps, Cloudflare Workers, and Cloudflare D1 databases.

Active top-level areas:

- `apps/k-maps/` - Angular web app.
- `apps/app-k-maps/` - Ionic/Angular app.
- `workers/` - all backend runtime code (gateway + 8 domain workers + `shared/`).
- `docs/` - architecture and workflow notes.

## Apps

The apps are kept as-is unless the user explicitly asks for app work.

Common commands:

```bash
npm run build -w apps/k-maps
npm run build -w apps/app-k-maps
npm run deploy:pages
npm run deploy:ionic
```

Angular conventions:

- Standalone components.
- Prefer Angular signals for local state.
- Keep route-level features lazy-loaded.
- Keep shared model and service code in existing app folders.
- Do not move app files during database or worker cleanup tasks.

## Workers

All backend code lives under `workers/`.

The public API entrypoint is:

- `workers/backend/` - `km-backend-worker`

Domain workers:

- `workers/quran/` - `km-quran-worker`, binding `DB_QR`, database `km_quran`
- `workers/ar-linguistics/` - `km-ar-linguistics-worker`, binding `DB_AL`, database `km_arabic_linguistic`
- `workers/arabic/` - `km-arabic-worker`, binding `DB_AR`, database `km_arabic`
- `workers/worldview/` - `km-worldview-worker`, binding `DB_WV`, database `km_worldview`
- `workers/content/` - `km-content-worker`, binding `DB_CM`, database `km_content`
- `workers/planner/` - `km-planner-worker`, binding `DB_PL`, database `km_planner`
- `workers/core/` - `km-core-worker`, binding `DB_CORE`, database `km_core`

Worker rules:

- Each domain worker owns exactly one D1 database.
- Cross-domain calls use Worker service bindings, not cross-database SQL.
- `workers/backend` is the only public gateway.
- Internal domain workers should stay `workers_dev = false`.
- Worker schema snapshots live at `workers/*/schema.sql`.
- Worker migrations live at `workers/*/migrations/`.

Common commands:

```bash
npm run dev:api
wrangler dev --config workers/backend/wrangler.toml --port 8788
wrangler deploy --config workers/backend/wrangler.toml
wrangler deploy --config workers/quran/wrangler.toml
```

## Domain Ownership

Hard ownership boundaries:

- QR owns Quran corpus, Quran structure, Quran claims, tafsir, reception, and Quran analysis.
- AL owns Arabic linguistic truth: roots, lemmas, morphology, syntax, balagha, lexicon, expressions.
- AR owns Arabic learning: curriculum, lessons, exercises, SRS, learner workflow.
- WV owns worldview reasoning: traditions, thinkers, claims, institutions, events, diagrams.
- CM owns authored content: documents, notes, captures, sources, media, publications.
- PL owns operational planning: plans, tasks, lanes, reviews, packets.
- CORE owns identity, workspaces, policies, roles, grants, and auth.

Typed references are the cross-domain contract:

```text
QR:<id>
AL:<id>
AR:<id>
WV:<id>
CM:<id>
PL:<id>
CORE:<id>
```

Do not duplicate canonical data across domains. Store typed references instead.

## Database & Ingestion (moved)

Migrations, seeds, ingestion inputs, and DB scripts now live in the **kmaps-database** repo
(`~/LLM/_Repositories/kmaps-database`). Do that work there. In *this* repo the only
database-adjacent files are per-worker `workers/*/schema.sql` (schema snapshots) and
`workers/*/migrations/` (each worker's own deploy migrations) — keep those in sync with
kmaps-database when schema changes.

## D1 Notes

- Cloudflare D1 is SQLite-compatible but not identical to local SQLite.
- Foreign key declarations document intent; do not rely on runtime enforcement.
- Add explicit indexes for production query paths.
- Keep domain migrations close to the domain worker when possible.
- Use `workers/*/schema.sql` as current schema snapshots.

Useful commands:

```bash
wrangler d1 migrations apply km_quran --remote --config workers/quran/wrangler.toml
wrangler d1 execute km_quran --remote --command "SELECT name FROM sqlite_master WHERE type='table';"
```

## Scripts

Important current generators/importers:

- `scripts/seed-docs.mjs` writes docs seed SQL into `database/seeds/`.
- `scripts/gen-quran-text-seed.js` writes Quran seed SQL into `database/seeds/`.
- `scripts/seed-ar-quran-synonyms.mjs` writes synonym seed SQL into `database/seeds/`.
- `scripts/export_quran_words_by_ayah.py` writes `database/seeds/seed-ar_quran_ayah_words.sql`.
- `scripts/import-tarteel-roots.py` reads roots from `database/ingestion/roots/sources/tarteel-ai/allroots.sql`.
- `scripts/regenerate_ar_u_roots_sql.py` writes root output to `database/ingestion/roots/outputs/roots-only.sql`.

Keep generated SQL out of service migration folders unless it is a true schema/data migration.

## Development Hygiene

- Use `rg` for searches.
- Do not touch unrelated app files during backend/database cleanup.
- Do not restore or delete user-local changes unless explicitly asked.
- Avoid committing ignored local source databases.
- Before committing cleanup work, run:

```bash
git diff --check
```

## Deployment

GitHub Actions:

- `.github/workflows/deploy-workers.yml` deploys domain workers and the backend worker.
- `.github/workflows/cloudflare-pages.yml` deploys `apps/k-maps`.
- `.github/workflows/cloudflare-pages-ionic.yml` deploys `apps/app-k-maps`.

Manual commands:

```bash
npm run deploy:pages
npm run deploy:ionic
wrangler deploy --config workers/backend/wrangler.toml
```

## Qurʾān Vocabulary / Morphology Study Step

For any work on the Surah → Passage → **Morphology** study step (vocabulary
backbone, Membean-style Memlet word view, or the per-Surah **SRS decks** at
`/srs` that feed Anki), read **`docs/quran-morphology-step-process.md`** first.
It is the canonical process memory: key tables across QR/AL/AR, the card
taxonomy, the Memlet→table mapping, the per-passage pipeline, and conventions.

## Current Priority

The repo is now worker-first and database assets are organized. New backend work should target `workers/`. New data import work should target `database/ingestion/`, then emit outputs to `database/seeds/` or the correct worker/domain migration path depending on whether the result is seed data or schema/data migration.
