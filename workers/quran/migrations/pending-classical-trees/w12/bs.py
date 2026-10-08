import json,re,sys,glob,os
B=os.path.expanduser('~/Projects/Shamela4/35__البلاغة/')
books={k:glob.glob(B+f'{k}__*/pages.jsonl')[0] for k in ('2611','3742','4064')}
TR=re.compile('[ً-ْٰـ]')
def norm(s):
    s=TR.sub('',s); s=re.sub('[أإآٱ]','ا',s); s=s.replace('ى','ي').replace('ة','ه')
    return s
data={}
for k,p in books.items():
    data[k]=[json.loads(l) for l in open(p)]
def search(pat,bks=('2611','3742','4064'),ctx=120,maxn=20):
    rp=re.compile(norm(pat))
    for k in bks:
        n=0
        for r in data[k]:
            b=r['body']; nb=norm(b)
            for m in rp.finditer(nb):
                n+=1
                if n>maxn: break
                s=max(0,m.start()-ctx); e=m.end()+ctx
                print(f"[{k} ج{r['part']} ص{r['page_num']} seq{r.get('sequence_num')}] ...{nb[s:e]}...".replace('\r',' / '))
        print(f'-- {k}: {n} hits')
if __name__=='__main__':
    ctx=int(sys.argv[2]) if len(sys.argv)>2 else 120
    bks=sys.argv[3].split(',') if len(sys.argv)>3 else ('2611','3742','4064')
    search(sys.argv[1],bks,ctx)
