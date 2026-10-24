#!/usr/bin/env bash
# Deploy the Cloudflare workers by hand, in the order the old CI used: internal workers first (service-binding only),
# km-backend-worker — the one public API — always last. Free GitHub only (owner, 2026-10-24): no Actions deploys.
#   npm run deploy:workers              every worker
#   npm run deploy:workers quran core   only these (still in order; backend last if named)
set -euo pipefail
cd "$(dirname "$0")/.."
ORDER=(core ar-linguistics studio content worldview quran arabic backend)
want=("$@")
for w in "${ORDER[@]}"; do
  if [ ${#want[@]} -gt 0 ] && [[ ! " ${want[*]} " == *" $w "* ]]; then continue; fi
  echo "── deploying $w"
  (cd "workers/$w" && npx wrangler deploy)
done
