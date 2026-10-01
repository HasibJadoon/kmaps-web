#!/usr/bin/env python3
"""The scene questions, bound to the grammar-term registry (km_arabic ar_scene_feature_term, migration 0026).

A scene's feature questions (ar_scene_vocab.features_json) name what they ask about in free text
(term_ar: «لو الشرطية», «المبني للمجهول», «تفاعل»). This binds each to the registry term(s) it
names: by the term's headword and aliases (AL ar_ling_gram_term / ar_ling_gram_term_alias, the
teacher's names among them — AL migration 0111), then by its head words; a verb pattern written
with its shadda (فعّل, تفاعل) goes to its form family. Past the name as written: the names the
scenes use for a registry term that the registry does not hold as a name (SCENE_NAMES — the tool
that belongs to a term's bāb, a named pair, the feature's own text deciding where a bare name could
be two things; AL migration 0116 holds the ones that are names of one term), the name cleaned of
its glosses and markup, the Form a feature line names, and the grammar-path lesson whose title it
is (km_arabic ar_lesson / ar_lesson_term). A name the registry does not hold is left unbound (and
listed), not guessed; SCENE_SKIP says why for the ones that look bindable and are not.

  python3 scripts/map-scene-terms.py            # export, map, and write the table
  python3 scripts/map-scene-terms.py --dry      # export and map; write the SQL, do not apply it
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
dump('lessons.jsonl', d1('arabic', 'km_arabic', "SELECT id, spine, title_ar FROM ar_lesson WHERE status = 'live'"))
dump('lesson_term.jsonl', d1('arabic', 'km_arabic', "SELECT lesson_id, term_id, origin FROM ar_lesson_term"))
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

# ── past the name as written ─────────────────────────────────────────────────────────────────
# A name the registry does not hold as written is tried, in order: as a name the scenes use for a
# registry term (SCENE_NAMES, below — each read against its questions, one term or a named pair,
# with the feature's own text deciding where the bare name could be two things); as its cleaned
# forms («بـ«لن»» → بلن, a parenthetical gloss or a «: …» note dropped, «صيغة/وزن» before a
# pattern, each side of a « / »); by the Form the feature line names («Form IV: …»); and by a
# lesson of the grammar path whose title it is (ar_lesson → ar_lesson_term, curated spines only).
# SCENE_SKIP holds names left unbound on purpose — a homonym of a registry name, or a name whose
# explanation contradicts it — so no later tier binds them.
def clean_variants(term_ar):
    s = DIAC.sub('', term_ar or '')
    s = re.sub(r'\([^)]*\)', ' ', s)                   # a parenthetical gloss
    s = re.sub(r'([بلك])\s*«', r'\1', s)               # بـ«لن» → بلن
    s = s.replace('«', ' ').replace('»', ' ')
    s = s.split('=')[0].split(':')[0]                  # «وإلّا = وإن لا», «افتعل: ت→ط»
    s = re.sub(r'[+…]|\.\.\.', ' ', s)
    out = []
    for part in [s] + (s.split('/') if '/' in s else []):
        p = re.sub(r'\s+', ' ', part).strip()
        if len(bare(p).replace(' ', '')) <= 3: continue   # «اعتصم بـ / من»: not the particle مَن
        out.append(p)
        q = re.sub(r'^(صيغة|صيغه|وزن)\s+', '', p)
        if q != p: out.append(q)
    return list(dict.fromkeys(out))

def T(*ids): return ['GT:' + i for i in ids]
EXPL = lambda f: ' '.join([f.get('explanation') or '', f.get('options', [''])[f.get('answer', 0)] if f.get('options') else '', f.get('feature') or ''])
IMPLIED = re.compile(r'\b(implied|understood|unstated)\b', re.I)     # «an implied verb», «an implied "seek!" governs…»
QE = lambda f: ' '.join([f.get('q') or '', f.get('explanation') or ''])
NEG_PARTICLE = T('harf_maani:nafiya', 'pos:nafy_harf')     # al-Ghalāyīnī's «أحرف النفي» teaches both
SCENE_NAMES = [
    # negation — by particle; ليس and its sisters are kāna's
    (['النفي بلن', 'لن + المضارع', 'لن', 'النفي بـ«لن»'], NEG_PARTICLE + T('mood:subjunctive'),
     lambda f: re.search(r'subjunctive|manṣūb', ' '.join([f.get('q') or '', EXPL(f)]), re.I) and re.search(r'mood|subjunctive', f.get('q') or '', re.I)),
    (['النفي بلن', 'لن + المضارع', 'لن', 'النفي بـ«لن»', 'النفي بما', 'النفي', 'النفي بـ«لم»'], NEG_PARTICLE, None),
    (['النفي بلا', 'لا النافية'], NEG_PARTICLE, lambda f: f.get('bucket') != 'echo' and not re.search(r'جنس|absolute', EXPL(f))),
    (['لم + المضارع المجزوم', 'لم … بعد'], T('harf_maani:lam_jazim'), None),
    (['النفي بليس', 'ليس', 'أمسى من أخوات كان', 'صار من أخوات كان', 'أضحى من أخوات كان', 'لا ينفكّ من أخوات كان',
      'كان', 'كان واسمها وخبرها', 'كان مع المضارع'], T('nawasikh:kana_wa_akhawatuha'), None),
    (['كان وخبرها'], T('irab_role:khabar_kana'), None),
    (['كأنّ للظنّ'], T('nawasikh:inna_wa_akhawatuha'), None),
    (['رأى القلبية بضميرين لواحد', 'هب بمعنى افترض', 'هَبْ بمعنى افترض'], T('nawasikh:zanna_wa_akhawatuha'), None),
    (['عسى'], T('nawasikh:kada_wa_akhawatuha', 'balagha_maani:tarajji'), None),
    (['النفي والمبني للمجهول'], NEG_PARTICLE + T('voice:passive'), None),
    (['لا النافية للجنس والاستثناء'], T('balagha_maani:qasr_nafy_istithna', 'nawasikh:la_nafiya_lil_jins'), None),
    # wishing, hoping, praise and blame, wonder — the meanings al-Ghalāyīnī's lessons on these tools teach
    (['ليت'], T('kalam_kind:tamanni', 'balagha_maani:tamanni'), None),
    (['لعلّ'], T('balagha_maani:tarajji'), None),
    (['لكنّ'], T('harf_maani:istidrak'), None),
    (['نعم'], T('kalam_kind:madh_dhamm'), lambda f: re.search(r'نِعْمَ|نِعمَ|praise', EXPL(f))),
    (['نعم للمدح', 'بئس', 'بئس للذم', 'أسلوب المدح بنعم', 'أسلوب الذم ببئس'], T('kalam_kind:madh_dhamm'), None),
    (['صيغة التعجب ما أفعله', 'أيّ التعجبية', 'يا لَـ التعجب'], T('kalam_kind:taajjub'), None),
    (['كم'], T('kalam_kind:istifham'), lambda f: 'الاستفهامية' in EXPL(f) or 'interrogative' in EXPL(f).lower()),
    (['الهمزة والواو', 'أم المعادلة', 'أم المتصلة', 'هل وأم'], T('kalam_kind:istifham'), None),
    (['لا محالة', 'لا بدّ'], T('nawasikh:la_nafiya_lil_jins'), lambda f: 'لا النافية للجنس' in EXPL(f)),
    (['ألا وإنّ للتنبيه والتوكيد'], T('harf_maani:ibtida', 'harf_maani:tawkid'), None),
    (['أحرى بـ', 'أحقّ بـ'], T('derivation_type:tafdil'), None),
    (['الإضافة للتفخيم'], T('irab_role:mudaf', 'irab_role:mudaf_ilayh', 'balagha_maani:tafkhim'), None),
    (['كم الاستفهامية وتمييزها'], T('kalam_kind:istifham', 'irab_role:tamyiz'), None),
    # particles, by the meaning the registry names them for
    (['بل'], T('harf_maani:idrab'), None),
    (['بل للإضراب الانتقالي'], T('balagha_maani:idrab_intiqali'), None),
    (['بلى', 'إي'], T('harf_maani:jawabiyya'), None),
    (['قد مع الماضي', 'الماضي مع قد'], T('harf_maani:tahqiq'), None),
    (['الماضي مع لقد'], T('harf_maani:tahqiq', 'pos:laqad'), None),
    (['المستقبل'], T('harf_maani:istiqbal'), lambda f: re.search(r'سـ|سوف', EXPL(f))),
    (['السين والمبني للمجهول'], T('harf_maani:istiqbal', 'voice:passive'), None),
    (['هلّا للتنديم', 'العرض والتحضيض'], T('harf_maani:tahdid'), None),
    (['إنّما'], T('harf_maani:hasr', 'balagha_maani:qasr_innama'), None),
    (['حرف التفسير', 'التفسير بـ«أي»'], T('harf_maani:tafsiliyya'), lambda f: 'أي' in EXPL(f)),
    (['التاء للقسم', 'لعمري', 'ايمُ الله'], T('kalam_kind:qasam'), None),
    (['فاء التعقيب', 'فاء الترتيب', 'ثمّ للترتيب', 'لا العاطفة'], T('pos:harf_atf'), None),
    (['نون التوكيد الثقيلة', 'نون التوكيد في الاستفهام'], T('harf_maani:tawkid'), None),
    # the moods
    (['جواب الطلب', 'جواب الأمر', 'جزم جواب الطلب', 'جزم فعل الشرط وجوابه', 'جزم الفعل المعتل', 'الجزم بـ«لم» للمثنى'],
     T('mood:jussive'), lambda f: re.search(r'jussive', EXPL(f), re.I)),
    (['جواب الطلب والجناس'], T('mood:jussive', 'balagha_badi:jinas'), None),
    (['النصب بـ«أن»', 'نصب المضارع بكي'], T('mood:subjunctive'), None),
    (['كي'], T('mood:subjunctive'), lambda f: re.search(r'subjunctive', QE(f), re.I)),
    # conditionals
    (['جواب لو'], T('shart_tool:law', 'harf_maani:lam_jawab'), None),
    (['حتى لو'], T('shart_tool:law'), None),
    (['إلّا الشرطية', 'وإلّا = وإن لا'], T('shart_tool:in'), None),
    (['أنّى الشرطية', 'أيّ الشرطية'], T('sentence_class:adat_shart'), None),
    # a governor left unsaid: taḥdhīr, ighrāʾ, istighātha — where the explanation says so
    (['التحذير', 'التحذير بإيّاك', 'الإغراء', 'الإغراء بالتكرار', 'الاستغاثة'], T('irab_role:idmar_al_amil'), lambda f: IMPLIED.search(EXPL(f))),
    # the vocative: nudba and istighātha are its kinds (the lament وا…اه, يا + lām)
    (['الندبة / النداء', 'يا أبتِ'], T('kalam_kind:nida'), None),
    (['الندبة', 'الندبة والاستغاثة', 'الاستغاثة'], T('kalam_kind:nida'),
     lambda f: re.search(r'وا\b|وا …|ـاه|-āh|vocative|nudba|lām al-istighātha|يا \+', EXPL(f)) and not IMPLIED.search(EXPL(f))),
    # pronouns, gender, number
    (['ياء المتكلم'], T('pos:damir', 'person:first'), None),
    (['نون النسوة', 'اتصال ضميرين'], T('pos:damir'), None),
    (['تاء التأنيث'], T('pos:ta_tanith'), None),
    (['الماضي للمثنّى'], T('number:dual'), None),
    (['تعدد الحال'], T('irab_role:hal'), None),
    (['النسبة'], T('noun_process:nasab'), lambda f: f.get('bucket') == 'morphology'),
    (['وزن فعلاء', 'فعلاء للمؤنث', 'وزن أفعل للعيوب'], T('derivation_type:sifa_mushabbaha'), None),
    (['التنوين على المقصور'], T('noun_process:maqsur_mamdud'), None),
    (['اللام الشمسية'], T('inflection_class:idgham'), None),
    (['اللام الشمسية وهمزة الوصل'], T('inflection_class:idgham', 'phonotactic:ibtida'), None),
    # balāgha
    (['التشخيص'], T('balagha_bayan:istiara_makniyya'), None),
    (['تأخير المفعول به'], T('balagha_maani:taqdim_mamulat'), None),
    (['الفاصلة القرآنية'], T('balagha_badi:riayat_fasila'), None),
    (['التهديد'], T('balagha_maani:amr_tahdid'), lambda f: re.search(r'command|imperative', EXPL(f), re.I)),
    (['الرثاء والسجع', 'المثل والسجع', 'حكمة مسجوعة'], T('balagha_badi:saj'), None),
    (['الإضافة والاستعارة'], T('irab_role:mudaf', 'irab_role:mudaf_ilayh', 'balagha_bayan:istiara'), None),
]
# left unbound on purpose, and why (so no later tier binds them)
SCENE_SKIP = {
    'النسبة إلى الأم': 'naming a man by his mother — not the nisba adjective',
    'النسبة إلى الأم للتحقير': 'naming a man by his mother — not the nisba adjective',
    'الاعتراض': 'a public objection — not the parenthetical clause',
    'فاء الاستئناف': 'the name says resumption, the explanation says consequence',
    'المعرّب': 'an Arabised loanword — not the declinable (muʿrab)',
    'ها التنبيه': 'the attention particle; the registry has no term for it (al-Ghalāyīnī\'s «أحرف التنبيه» is bound to the inceptive)',
    'ها التنبيه + قد': 'the attention particle; the registry has no term for it',
    'كان عليك': 'an idiom of obligation, not kāna\'s bāb',
    'كان مع السين': 'a compound idiom (would have)',
    'الماضي للدعاء': 'the past for supplication; the registry holds only the imperative for it',
    'النفي بما…ش': 'Egyptian negation — a register question, not the fuṣḥā particle',
    'المفعول الثاني / الحال': 'the name offers two readings (second object or ḥāl)',
}
FORM_NUM = {'II': 'form_ii', 'III': 'form_iii', 'IV': 'form_iv', 'V': 'form_v', 'VI': 'form_vi', 'VII': 'form_vii',
            'VIII': 'form_viii', 'IX': 'form_ix', 'X': 'form_x'}
def name_key(s):     # as written, less its vowels — not bare(): that folds كأنّ into كان
    return re.sub(r'\s+', ' ', DIAC.sub('', s or '')).strip()
scene_names = {}
for names, ids, cond in SCENE_NAMES:
    for n in names:
        scene_names.setdefault(name_key(n), []).append(([i for i in ids if i in terms], cond))
scene_skip = {name_key(k) for k in SCENE_SKIP}

def lesson_index(lessons, lesson_terms, spines=('ghalayini_jami_durus', 'النحو', 'البلاغة', 'دروسي'),
                 origins=('toc', 'node', 'tree', 'title', 'curated')):
    by_title = collections.defaultdict(list)
    lt = collections.defaultdict(set)
    for r in lesson_terms:
        if r['origin'] in origins and r['term_id'] in terms: lt[r['lesson_id']].add(r['term_id'])
    for l in lessons:
        if l['spine'] in spines and lt.get(l['id']):
            by_title[bare(l['title_ar'])].append(lt[l['id']])
    out = {}
    for k, sets in by_title.items():
        common = set.intersection(*sets)
        if 1 <= len(common) <= 2: out[k] = sorted(common)
    return out

def match_scene(f, lessons_by_title):
    name, bucket = f.get('term_ar') or '', f.get('bucket')
    n = name_key(name)
    if n in scene_skip: return [], None
    for ids, cond in scene_names.get(n, []):
        if ids and (cond is None or cond(f)): return ids, 'curated'
    if n in scene_names: return [], None                # a scene name whose condition did not hold
    k = bare(name)
    ids, kind = match(name, bucket)
    if ids: return ids, kind
    for v in clean_variants(name):
        if bare(v) == k: continue
        ids, kind = match(v, f.get('bucket'))
        if ids: return ids, 'cleaned'
        for ids, cond in scene_names.get(name_key(v), []):
            if ids and (cond is None or cond(f)): return ids, 'curated'
    m = re.search(r'\bForm (VIII|VII|VI|IV|IX|III|II|X|V)\b(?!-like)', f.get('feature') or '')
    if m and f.get('bucket') in ('morphology', 'collocation', 'register'):
        tid = 'GT:form_family:' + FORM_NUM[m.group(1)]
        if tid in terms: return [tid], 'form'
    for key in (k, no_al(k)):
        if key in lessons_by_title: return lessons_by_title[key], 'lesson'
    head = bare(clean_variants(name)[0]).split() if clean_variants(name) else []
    if len(head) >= 2 and head[0] in lessons_by_title:   # «الإضافة للتفخيم», «الإضافة والمثنى»: the lesson its head word names
        return lessons_by_title[head[0]], 'lesson'
    return [], None

lessons_by_title = lesson_index([json.loads(l) for l in open('lessons.jsonl')], [json.loads(l) for l in open('lesson_term.jsonl')])
rows, stat, unmatched = [], collections.Counter(), collections.Counter()
for r in map(json.loads, open('scene_feats.jsonl')):
    for i, f in enumerate(json.loads(r['features_json'])):
        ids, kind = match_scene(f, lessons_by_title)
        stat[kind or 'none'] += 1
        if not ids: unmatched[f.get('term_ar')] += 1
        for tid in ids:
            rows.append((r['unit_id'], r['scene_no'], i, f.get('term_ar') or '', tid, kind))
print(json.dumps(stat), len(rows), len({(a, b, c) for a, b, c, *_ in rows}), file=sys.stderr)
lit = lambda v: 'NULL' if v is None else str(v) if isinstance(v, int) else "'" + str(v).replace("'", "''") + "'"
with open('scene_feature_term.sql', 'w') as out:
    out.write('DELETE FROM ar_scene_feature_term;\n')
    for i in range(0, len(rows), 200):
        out.write('INSERT OR REPLACE INTO ar_scene_feature_term (unit_id, scene_no, feature_idx, term_ar, term_id, match_kind) VALUES\n'
                  + ',\n'.join('(' + ','.join(lit(v) for v in row) + ')' for row in rows[i:i + 200]) + ';\n')
print(unmatched.most_common(40), file=sys.stderr)

if '--dry' not in sys.argv:
    subprocess.run(['npx', 'wrangler', 'd1', 'execute', 'km_arabic', '--remote', '--file', os.path.join(WORK, 'scene_feature_term.sql')],
                   cwd=os.path.join(ROOT, 'workers', 'arabic'), check=True)
