import sys
from load import load
nodes=load('nodes.json'); trees={t['id']:t for t in load('trees.json')}; sents={s['id']:s for s in load('sents.json')}
words=load('words.json'); wid={w['id']:w for w in words}
only=sys.argv[1:] 
for tid in sorted(trees, key=lambda x:(int(x.split(':')[2]),int(x.split(':')[3]),x)):
    if only and not any(tid==o or tid.startswith(o+':') for o in only): continue
    t=trees[tid]; s=sents.get(t['sentence_id'])
    print('='*100); print(tid, '| sent', t['sentence_id'], '| src', t['source_ref'])
    if s:
        ws=[w for w in words if w['surah']==s['surah'] and s['ayah_from']<=w['ayah']<=s['ayah_to'] and (w['ayah']>s['ayah_from'] or w['word_index']>=s['word_start_index']) and (w['ayah']<s['ayah_to'] or w['word_index']<=s['word_end_index'])]
        print('WORDS:', ' '.join(f"{w['ayah']}:{w['word_index']}={w['word_text']}" for w in ws))
        print('SENT:', s['gt_sentence_class'], s['gt_kalam_kind'], s['gt_sentence_role'], s['source_basis'])
        print('SNOTE:', (s['note_md'] or '')[:700])
    print('TNOTE:', (t['note_md'] or '')[:500])
    ns=[n for n in nodes if n['tree_id']==tid]
    kids={}
    for n in ns: kids.setdefault(n['parent_node_id'],[]).append(n)
    def rec(p,ind):
        for n in sorted(kids.get(p,[]), key=lambda x:x['node_order']):
            w=wid.get(n['word_occurrence_id'])
            extra=[k for k in ['tafsir_note_md','balagha_note_md','sarf_note_md','note_md','gloss_json','tafsir_refs','balagha_refs','sarf_refs','sarf_term_ref','scope_type','scope_id'] if n.get(k)]
            print('  '*ind+f"[{n['depth']}|{n['node_order']}] {n['id'].split(':',4)[-1]} «{n['node_label']}» {n['gram_term_ref']} tk={n['term_key']} v={n['is_virtual']} w={(str(w['ayah'])+':'+str(w['word_index'])+'='+w['word_text']) if w else n['word_occurrence_id']} extra={extra}")
            if n['label_ar']: print('  '*ind+'    L: '+n['label_ar'][:400])
            rec(n['id'],ind+1)
    rec(None,0)
    orphans=[n for n in ns if n['parent_node_id'] and n['parent_node_id'] not in {x['id'] for x in ns}]
    if orphans: print('ORPHANS', [o['id'] for o in orphans])
