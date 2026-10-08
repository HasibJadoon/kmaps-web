import json,sys
d=json.load(open(sys.argv[1]))
want=sys.argv[2] if len(sys.argv)>2 else None
from collections import defaultdict
bytree=defaultdict(list)
for r in d: bytree[r['tree_id']].append(r)
for t in sorted(bytree):
    if want and want not in t: continue
    rows=bytree[t]; kids=defaultdict(list)
    for r in rows: kids[r['parent_node_id']].append(r)
    print('=== ',t,len(rows))
    def rec(p,ind):
        for r in sorted(kids[p],key=lambda r:(r['node_order'],r['id'])):
            extra=' '.join(f"{k}={str(r[k])[:80]!r}" for k in ['tafsir_note_md','balagha_note_md','sarf_note_md','note_md','scope_type','scope_id','gloss_json','sarf_term_ref'] if r.get(k))
            print('  '*ind+f"[{r['depth']}/{r['node_order']}] {r['id'].split(':',4)[-1] if False else r['id']} | {r['node_label']} | tk={r['term_key']} gt={r['gram_term_ref']} w={r['word_occurrence_id']} v={r['is_virtual']} | {r['label_ar'] or ''} {extra}")
            rec(r['id'],ind+1)
    rec(None,0)
    orphans=[r for r in rows if r['parent_node_id'] and r['parent_node_id'] not in {x['id'] for x in rows}]
    if orphans: print('ORPHANS',[o['id'] for o in orphans])
