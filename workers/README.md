# K-MAPS Domain Workers

Eight Cloudflare Workers: the public gateway `km-backend-worker` (`backend/`, no D1 of its own) and
seven domain workers, each owning exactly one D1 database. There is no planner (PL) domain.

## Architecture

```
UI (Angular) / public backend Worker
         │
         │  service binding / HTTP
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Domain Workers                              │
│                                                                 │
│  km-quran-worker     →  DB_QR  (km_quran)          qr_*        │
│  km-ar-linguistics   →  DB_AL  (km_arabic_linguistic) ar_ling_*│
│  km-arabic-worker    →  DB_AR  (km_arabic)          ar_*       │
│  km-worldview-worker →  DB_WV  (km_worldview)       wv_*       │
│  km-content-worker   →  DB_CM  (km_content)         cm_*       │
│  km-core-worker      →  DB_CORE (km_core)           core_*     │
│  km-studio-worker    →  DB_ST  (km_studio)          st_*       │
└─────────────────────────────────────────────────────────────────┘
```

## Hard Rules

1. **One D1 binding per Worker** — each Worker binds ONLY its own database.
2. **Cross-domain = service bindings** — use Fetcher, never bind another DB.
3. **AL is the Arabic backbone** — QR and AR never duplicate roots/lemmas/sarf/nahw/balagha; they reference AL via `AL:ULID` typed refs.
   *The one sanctioned copy:* the grammar-term registry `ar_ling_gram_term` (AL is the term of record) is
   mirrored into DB_QR (with `ar_ling_gram_category` + `ar_ling_gram_term_alias`) and DB_AR, so their SQL can
   join a term's names. Only `scripts/project-gram-terms.mjs` writes the mirrors; never edit them by hand.
   `node scripts/check-gram-term-drift.mjs [quran|arabic]` is read-only (remote SELECTs) and reports rows
   missing, mirror-only or differing (exit 1 on drift) — run it before trusting a mirror.
4. **No LX database** — `LX:...` typed refs resolve to `DB_AL` (legacy compat).
5. **CORE owns ACL** — CM and other workers call CORE for resource grants; they never build their own access control tables.
6. **Store typed refs, not content** — a worker that points at another domain's row keeps `QR:`, `AR:`, … refs, never a copy.
7. **Optional reads fail narrowly** — `query(...).catch(softFail([]))` (`shared/src/soft-fail.ts`) returns the
   fallback only for a missing table/column and logs + rethrows anything else. Don't write `.catch(() => [])` on a D1 read.

## Acceptance Checks (before marking a domain migration complete)

```bash
# 1. Worker binds exactly one D1
rg "DB_" workers/<domain>/wrangler.toml

# 2. No other domain's DB binding in worker source
rg "DB_QR|DB_AL|DB_AR|DB_WV|DB_CM|DB_CORE" workers/<domain>/src/ | grep -v "DB_<own>"

# 3. Health check passes
wrangler dev workers/<domain> --port 8080
curl http://localhost:8080/health
```

## Per-Domain Structure

Every worker follows this layout:

```
workers/<domain>/
├── wrangler.toml             ← One D1 binding + service bindings + migrations_dir
├── migrations/
│   └── README.md             ← Migration files co-located here
└── src/
    ├── env.ts                ← <Domain>Env interface (owned DB + Fetcher bindings)
    ├── index.ts              ← Router.handle() entry point
    ├── routes/               ← One file per resource group (thin HTTP layer)
    │   ├── resource-a.ts     ← imports Router, calls repo methods, returns ok()/paginated()
    │   └── resource-b.ts
    ├── repositories/         ← All SQL lives here (one file per table group)
    │   ├── resource-a.repo.ts ← query/queryOne/execute/paginate from shared/db
    │   └── resource-b.repo.ts
    ├── schemas/              ← TypeScript types + lightweight validators
    │   └── resource-a.schema.ts
    └── clients/              ← Typed service binding wrappers (one per dependency)
        └── <dep>.client.ts
```

## Shared Utilities (workers/shared/src/)

| File | Purpose |
|------|---------|
| `types.ts` | `ApiResponse`, `ApiError`, `PaginatedResponse`, `AuthContext`, `DomainCode` |
| `http.ts` | `json()`, `dbHealth()`, `CORS_HEADERS` |
| `db.ts` | `query()`, `queryOne()`, `execute()`, `executeBatch()`, `paginate()`, `exists()` |
| `response.ts` | `ok()`, `created()`, `noContent()`, `paginated()`, `err()`, `notFound()`, `unauthorized()`, `forbidden()`, `badRequest()`, `conflict()`, `internalError()` |
| `router.ts` | `Router<Env>` — URLPattern dispatcher with CORS + error boundary |
| `auth.ts` | `verifyJwt()`, `extractBearerToken()`, `authenticate()`, `requireAuth()`, `requireAdmin()` |
| `ulid.ts` | `ulid()`, `typedId(module)`, `isUlid()`, `isTypedRef()` |
| `validate.ts` | `parseBody()`, `parsePagination()`, `parseIntParam()`, `requireParam()` |
| `service-client.ts` | `callService()` — typed Fetcher wrapper |
| `soft-fail.ts` | `softFail(fallback)`, `rethrowUnlessMissing(e)`, `isMissingSchema(e)` — optional-table reads |
| `collections.ts` | `shuffle()`, `uniq()`, `parseJson(s, fallback)` |

## Response Envelope

All workers return one of:

```typescript
// Success (single)
{ ok: true, data: T }

// Success (paginated)
{ ok: true, data: T[], meta: { total, page, per_page, has_more } }

// Error
{ ok: false, error: { code: string, message: string, details?: unknown } }
```

## Cross-Module Typed References

```
QR:01HW3XXXXXXXXXXXXXXXXXXX   ← Quran entity
AL:01HY2XXXXXXXXXXXXXXXXXXX   ← Arabic Linguistic entity (also: LX: for legacy)
AR:01HZ1XXXXXXXXXXXXXXXXXXX   ← Arabic learning entity
WV:01JA3XXXXXXXXXXXXXXXXXXX   ← Worldview entity
CM:01JB4XXXXXXXXXXXXXXXXXXX   ← Content entity
CORE:01JD6XXXXXXXXXXXXXXXXXXX ← Core entity (user, workspace, role, grant)

# Quran scope shorthand
QR:2:255          ← surah 2, ayah 255
QR:2:255-257      ← surah 2, ayah range
QR:36             ← entire surah 36
```

## Migration Strategy

```bash
# Provision databases (one-time, order matters)
wrangler d1 create km_arabic_linguistic
wrangler d1 create km_core
wrangler d1 create km_quran
wrangler d1 create km_arabic
wrangler d1 create km_worldview
wrangler d1 create km_content
wrangler d1 create km_studio

# Apply schemas (from co-located migrations/ dirs)
wrangler d1 migrations apply km_arabic_linguistic --remote
wrangler d1 migrations apply km_core             --remote
wrangler d1 migrations apply km_quran            --remote
wrangler d1 migrations apply km_arabic           --remote
wrangler d1 migrations apply km_worldview        --remote
wrangler d1 migrations apply km_content          --remote
wrangler d1 migrations apply km_studio           --remote
```

Migrations are authored in each worker's own `migrations/` folder — that is the source of truth.
`kmaps-database` is frozen for schema (its `scripts/` are still used by kmaps-resources).

## Public API Flow

1. Keep public API routing in `workers/backend`.
2. Put domain logic in the matching domain Worker.
3. Have the backend Worker call domain Workers through service bindings.
4. Verify response JSON stays compatible with the apps.
5. Run acceptance checks before deploying a domain change.
