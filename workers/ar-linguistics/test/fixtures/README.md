# Lexicon composer fixtures

Captured 25 Jul 2026 from the live composers via `wrangler dev --remote` (real
production D1), **after** the naming-v2 rename and slug cutover.

These are the acceptance test for Phase 1b — retiring `lexicon_lane.ts` (794),
`lexicon_lisan.ts` (938), `lexicon_mufradat.ts` (666) and
`lexicon_five_lens.ts` (354) in favour of one composer driven by
`ar_ling_lexicon_display_profile`.

The replacement must return **byte-identical JSON** for every file here. These
render classical dictionary text, where a wrong-but-plausible result is the
failure mode that survives review — so "looks right" is not an acceptance
criterion and diffing against these is.

## Contents

`_display.json` — the 13 display profiles (new API, migration 0039).
`<slug>.json`   — `GET /al/lex/v2/read/<slug>/<root>` for one root per lexicon.

## Coverage: 11 of 13

Both gaps are real findings, not capture failures:

- **sinai_key_terms** — 404. Confirms the audit: 404 entries, and no composer
  has ever served it. Phase 1b should give it one via a profile row, no code.
- **kmaps_five_lens** — 404 on this path. It is served by `lexicon_five_lens.ts`
  under a different route, so its fixture must be captured from that path before
  that file is retired.

## Recapture

```bash
cd workers/ar-linguistics && npx wrangler dev --remote --port 8799
# then: curl -s "http://127.0.0.1:8799/al/lex/v2/read/<slug>/<root>"
```

Note: requests must send a browser-ish user-agent. `wrangler dev --remote`
proxies through the Cloudflare edge, which answers urllib with `403 error code:
1010`. curl works.
