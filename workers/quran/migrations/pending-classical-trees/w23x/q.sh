#!/bin/zsh
# usage: q.sh quran|ling "<SQL>" outfile
cd /Users/abdulhasibahmedjadoon/Documents/LLM/_Repositories/kmaps-web
if [[ $1 == ling ]]; then cfg=workers/ar-linguistics/wrangler.toml; db=km_arabic_linguistic; else cfg=workers/quran/wrangler.toml; db=km_quran; fi
npx wrangler d1 execute $db --remote --config $cfg --json --command "$2" > $3 2>/private/tmp/claude-501/-Users-abdulhasibahmedjadoon-Documents-LLM--Repositories/73a64ff3-0b6a-49e3-a716-d8abcb8410d5/scratchpad/ssbuild/w23x/q_err.txt
python3 -c "
import json,sys
d=json.load(open('$3'))
r=d[0]['results']
json.dump(r,open('$3','w'),ensure_ascii=False,indent=0)
print(len(r),'rows')
"
