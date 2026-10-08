import json,re,sys,os
base=os.path.expanduser('~/Projects/Shamela4/03__التفسير/')
books={'ashur':'3514','alusi':'5977','kash':'6111','razi':'6118','bahr':'6083'}
bk=sys.argv[1]; a=int(sys.argv[2]); b=int(sys.argv[3])
d=[x for x in os.listdir(base) if x.startswith(books[bk]+'__')][0]
for line in open(base+d+'/pages.jsonl'):
    j=json.loads(line)
    if a<=j['sequence_num']<=b:
        body=re.sub(r'<[^>]+>','',j['body'] or '').replace('\r','\n')
        print(f"\n######## {bk} part={j['part']} page={j['page_num']} seq={j['sequence_num']}\n"+body)
