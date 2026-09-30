#!/usr/bin/env python3
"""The scene questions, bound to the grammar-term registry (km_arabic ar_scene_feature_term, migration 0026).

A scene's feature questions (ar_scene_vocab.features_json) name what they ask about in free text
(term_ar: «لو الشرطية», «المبني للمجهول», «تفاعل»). This binds each to the registry term(s) it
names: by the term's headword and aliases (AL ar_ling_gram_term / ar_ling_gram_term_alias, the
teacher's names among them — AL migration 0111), then by its head words; a verb pattern written
with its shadda (فعّل, تفاعل) goes to its form family. A name the registry does not hold is left
unbound (and listed), not guessed.

  python3 scripts/map-scene-terms.py            # export, map, and write the table
"""
import json, re, collections, sys, os, subprocess, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORK = os.path.join(ROOT, '.adima-work')
os.makedirs(WORK, exist_ok=True)

def d1(worker, db, sql):
    for _ in range(6):
        out = subprocess.run(['npx', 'wrangler', 'd1', 'execute', db, '--remote', '--json', '--command', sql],
                             cwd=os.path.join(ROOT, 'workers', worker), capture_output=True, text=True).stdout
        try:
            d = json.loads(out)
            if isinstance(d, list): return d[0]['results']
        except Exception: pass
        time.sleep(10)
    raise SystemExit(f'{db}: {out[-400:]}')

def dump(name, rows):
    with open(os.path.join(WORK, name), 'w') as f:
        for r in rows: f.write(json.dumps(r, ensure_ascii=False) + '\n')
dump('scene_feats.jsonl', d1('arabic', 'km_arabic',
     "SELECT unit_id, scene_no, features_json FROM ar_scene_vocab WHERE features_json IS NOT NULL AND features_json <> '[]'"))
dump('gt.jsonl', d1('ar-linguistics', 'km_arabic_linguistic',
     "SELECT id, category_key, name_ar, name_en, discipline, name_bare, aliases_json, status FROM ar_ling_gram_term"))
dump('gt_alias.jsonl', d1('ar-linguistics', 'km_arabic_linguistic', "SELECT alias_bare, term_id, alias_raw, alias_kind FROM ar_ling_gram_term_alias"))
os.chdir(WORK)

DIAC = re.compile(r'[ؐ-ًؚ-ٰٟۖ-ۭـ]')
def bare(s):
    s = DIAC.sub('', s or '')
    s = re.sub('[أإآٱ]', 'ا', s).replace('ى', 'ي').replace('ة', 'ه')
    s = re.sub(r'[()\[\]«»"،,.:؛]', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()
def no_al(s):
    return ' '.join(w[2:] if w.startswith('ال') and len(w) > 3 else w for w in s.split())

terms = [json.loads(l) for l in open('gt.jsonl')]
terms = {t['id']: t for t in terms if t['status'] == 'live'}
aliases = [json.loads(l) for l in open('gt_alias.jsonl')]
index = collections.defaultdict(set)      # key -> term ids
def add(key, tid):
    k = bare(key)
    if len(k.replace(' ', '')) < 2: return
    index[k].add(tid); index[no_al(k)].add(tid)
for t in terms.values():
    add(t['name_ar'], t['id'])
    if t.get('name_bare'): add(t['name_bare'], t['id'])
    try:
        for a in json.loads(t.get('aliases_json') or '[]'):
            add(a if isinstance(a, str) else a.get('ar', ''), t['id'])
    except Exception: pass
for a in aliases:
    if a['term_id'] in terms:
        add(a.get('alias_raw') or a.get('alias_bare') or '', a['term_id'])
# the verb patterns as the scenes write them (with the shadda that tells فعّل from فعل)
PATTERNS = {'فعّل': 'form_ii', 'فاعل': 'form_iii', 'أفعل': 'form_iv', 'تفعّل': 'form_v', 'تفاعل': 'form_vi',
            'انفعل': 'form_vii', 'افتعل': 'form_viii', 'افعلّ': 'form_ix', 'استفعل': 'form_x'}
PREFER = {'grammar': ['NH', 'SF'], 'morphology': ['SF', 'NH'], 'rhetoric': ['BL', 'NH'], 'pragmatics': ['BL', 'NH'],
          'address': ['NH', 'BL'], 'connector': ['NH', 'BL'], 'collocation': ['NH', 'BL'], 'sound': ['SF', 'NH']}

def match(term_ar, bucket):
    raw = DIAC.sub(lambda m: m.group(0) if m.group(0) == 'ّ' else '', term_ar or '').strip()
    for p, key in PATTERNS.items():
        if raw.replace('ـ', '') == p or raw.startswith(p + ' '):
            tid = f'GT:form_family:{key}'
            if tid in terms: return [tid], 'pattern'
    k = bare(term_ar)
    words = k.split()
    tiers = [(k, 'exact'), (no_al(k), 'exact')]
    if len(words) >= 3: tiers.append((' '.join(words[:2]), 'head')); tiers.append((no_al(' '.join(words[:2])), 'head'))
    if len(words) >= 2: tiers.append((words[0], 'head')); tiers.append((no_al(words[0]), 'head'))
    for key, kind in tiers:
        ids = index.get(key)
        if ids:
            pref = PREFER.get(bucket, ['NH', 'SF', 'BL'])
            ranked = sorted(ids, key=lambda i: pref.index(terms[i]['discipline']) if terms[i]['discipline'] in pref else 9)
            best = [i for i in ranked if terms[i]['discipline'] == terms[ranked[0]]['discipline']]
            return best[:2], kind
    return [], None

rows, stat = [], collections.Counter()
for r in map(json.loads, open('scene_feats.jsonl')):
    for i, f in enumerate(json.loads(r['features_json'])):
        ids, kind = match(f.get('term_ar'), f.get('bucket'))
        stat[kind or 'none'] += 1
        for tid in ids:
            rows.append((r['unit_id'], r['scene_no'], i, f.get('term_ar') or '', tid, kind))
print(json.dumps(stat), len(rows), len({(a, b, c) for a, b, c, *_ in rows}), file=sys.stderr)
lit = lambda v: 'NULL' if v is None else str(v) if isinstance(v, int) else "'" + str(v).replace("'", "''") + "'"
with open('scene_feature_term.sql', 'w') as out:
    out.write('DELETE FROM ar_scene_feature_term;\n')
    for i in range(0, len(rows), 200):
        out.write('INSERT OR REPLACE INTO ar_scene_feature_term (unit_id, scene_no, feature_idx, term_ar, term_id, match_kind) VALUES\n'
                  + ',\n'.join('(' + ','.join(lit(v) for v in row) + ')' for row in rows[i:i + 200]) + ';\n')
unmatched = collections.Counter()
for r in map(json.loads, open('scene_feats.jsonl')):
    for f in json.loads(r['features_json']):
        if not match(f.get('term_ar'), f.get('bucket'))[0]: unmatched[f.get('term_ar')] += 1
print(unmatched.most_common(40), file=sys.stderr)

subprocess.run(['npx', 'wrangler', 'd1', 'execute', 'km_arabic', '--remote', '--file', os.path.join(WORK, 'scene_feature_term.sql')],
               cwd=os.path.join(ROOT, 'workers', 'arabic'), check=True)
