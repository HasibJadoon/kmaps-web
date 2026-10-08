import json,re,sys,os
base=os.path.expanduser('~/Projects/Shamela4/03__التفسير/')
books={'ashur':'3514','alusi':'5977','kash':'6111','razi':'6118','bahr':'6083'}
def norm(t):
    t=re.sub('[ً-ْٰـ]','',t)
    t=re.sub('[أإآٱ]','ا',t); t=t.replace('ى','ي').replace('ة','ه')
    return re.sub(r'\s+',' ',t)
bk=sys.argv[1]; pats=[norm(p) for p in sys.argv[2:]]
d=[x for x in os.listdir(base) if x.startswith(books[bk]+'__')][0]
for line in open(base+d+'/pages.jsonl'):
    j=json.loads(line); b=norm(j['body'] or '')
    if all(p in b for p in pats):
        print(j['part'],j['page_num'],j['sequence_num'])
