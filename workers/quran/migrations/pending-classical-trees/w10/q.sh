#!/bin/zsh
# usage: q.sh <db:quran|ling> "<SQL>" > out.json
cd /Users/abdulhasibahmedjadoon/Documents/LLM/_Repositories/kmaps-web
if [ "$1" = "ling" ]; then
npx wrangler d1 execute km_arabic_linguistic --remote --config workers/ar-linguistics/wrangler.toml --json --command "$2" 2>/dev/null | python3 -c "import json,sys;d=json.load(sys.stdin);print(json.dumps(d[0]['results'],ensure_ascii=False))"
else
npx wrangler d1 execute km_quran --remote --config workers/quran/wrangler.toml --json --command "$2" 2>/dev/null | python3 -c "import json,sys;d=json.load(sys.stdin);print(json.dumps(d[0]['results'],ensure_ascii=False))"
fi
