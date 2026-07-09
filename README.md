# kmaps-web

Web platform for **K-Maps** — Qurʾān & Arabic knowledge maps.

## Structure

- `apps/k-maps` — Angular 20 web client (TipTap 3, D3, three.js, Yjs collaboration, Monaco)
- `apps/app-k-maps` — Ionic 8 + Capacitor 8 mobile / PWA client
- `workers/` — Cloudflare Workers backend: public gateway `backend` + 8 domain workers wired by service bindings; shared library in `workers/shared`

## Backend topology

The public gateway `backend` (`backend.k-maps.com`) fans out to `core`, `quran`,
`worldview`, `arabic`, `ar-linguistics`, `content`, `planner`, `studio`. Each domain
worker binds exactly one D1 database; `quran` also uses an R2 bucket (iʿrāb dependency-graph
SVGs) and `studio` uses a Durable Object. Every worker imports `workers/shared` via relative
paths — keep them together.

## Dev

```bash
npm install
npm run dev:api                  # wrangler dev — backend gateway on :8788
npm run build -w apps/k-maps     # build the web client
npm run deploy:all               # deploy both Cloudflare Pages projects
```

## Related repos

- **kmaps-database** — D1 migrations, schema, seeds, DB tooling
- **kmaps-resources** — canonical fonts, brand assets, icons
- **kmaps-ios**, **kmaps-studio** — native apps

## Notes

- D1 database IDs live per-worker in `workers/*/wrangler.toml` (the deploy source of truth).
- The root `wrangler.toml` still references a stale `k-maps-v2` Pages path — clean up before relying on it (deploys use the explicit `deploy:pages`/`deploy:ionic` scripts).
- Database **migrations** are authored in `kmaps-database`; each worker keeps a minimal `workers/*/migrations` set for its own deploys.
