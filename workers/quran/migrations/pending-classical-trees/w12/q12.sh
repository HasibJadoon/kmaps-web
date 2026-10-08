#!/bin/zsh
# usage: q12.sh "<SQL>" [ar]
cd /Users/abdulhasibahmedjadoon/Documents/LLM/_Repositories/kmaps-web
if [[ "$2" == "ar" ]]; then
  npx wrangler d1 execute km_arabic_linguistic --remote --config workers/ar-linguistics/wrangler.toml --json --command "$1" 2>/dev/null
else
  npx wrangler d1 execute km_quran --remote --config workers/quran/wrangler.toml --json --command "$1" 2>/dev/null
fi
