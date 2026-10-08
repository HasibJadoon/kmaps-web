import json,sys,re,glob,os
# usage: gb.py <bookid|bal:bookid> <regex> [ctx=150] [max=8]
bid=sys.argv[1]; pat=sys.argv[2]; ctx=int(sys.argv[3]) if len(sys.argv)>3 else 150; mx=int(sys.argv[4]) if len(sys.argv)>4 else 8
base=os.path.expanduser('~/Projects/Shamela4')
if bid.startswith('bal:'): d=glob.glob(base+'/35__*/'+bid[4:]+'__*')[0]
else: d=glob.glob(base+'/31__*/'+bid+'__*')[0]
strip=re.compile('[ً-ْٰـ]')
n=0
for line in open(d+'/pages.jsonl'):
    r=json.loads(line); b=strip.sub('',r.get('body') or '')
    for m in re.finditer(pat,b):
        s=max(0,m.start()-ctx); e=min(len(b),m.end()+ctx)
        print(f"[{os.path.basename(d)[:30]} ج{r.get('part')} ص{r.get('page_num')}] ...{b[s:e]}...".replace('\n',' '))
        n+=1
        if n>=mx: sys.exit()
