#!/usr/bin/env python3
"""ʿUḍayma, Dirāsāt li-uslūb al-Qurʾān al-karīm, as rows (km_arabic_linguistic migration 0110).

The book (ar_ling_gram_chunk, book 5264, source adima_dirasat) lists, under each heading, every
Qurʾānic word the heading covers — the āyah quoted, its reference «[١٠٠: ٩]» — with ʿUḍayma's
own observations. This reads the pages in book order and writes:

  ar_ling_adima_entry  one row per citation: chapter › section › head word, the verb pattern the
                       chapter studies and the meaning its heading names (bound to GT form_family /
                       sigha_maani terms), the āyah, the quote, the word of the āyah it is about
                       (qr_word_occurrence.word_index, by the head word and the corpus's form family),
                       and quote_match — the share of the quote found in the āyah it names.
  ar_ling_adima_note   his own observations on a head word (not the books he quotes), and the one
                       sentence of each that stands alone as a drill answer.

  python3 scripts/parse-adima.py --export --sql --apply     # all of it, in ./.adima-work
  python3 scripts/parse-adima.py --sql                      # re-parse what was exported

The pattern chapters of volume 4 (FORM_CHAPTERS) are the book's own «دراسة (…)» studies, by page.
The rows are derived: the chunks stay the record; re-run to rebuild.
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
        time.sleep(10)          # a busy database (another import running): wait and ask again
    raise SystemExit(f'{db}: {out[-400:]}')

def export():
    def dump(name, rows):
        with open(os.path.join(WORK, name), 'w') as f:
            for r in rows: f.write(json.dumps(r, ensure_ascii=False) + '\n')
    pages, seq = [], -1
    while True:     # the text column is read in a substr: a whole-column read of these rows trips D1's CPU limit
        rows = d1('ar-linguistics', 'km_arabic_linguistic',
                  f"SELECT id, discipline, bab_id, volume_no, page_no, seq, heading_norm, substr(text_ar, 1, 4000) AS text_ar "
                  f"FROM ar_ling_gram_chunk WHERE book_id = 5264 AND seq > {seq} ORDER BY seq LIMIT 500")
        if not rows: break
        pages += rows; seq = rows[-1]['seq']
    dump('adima_pages.jsonl', pages)
    dump('adima_babs.jsonl', d1('ar-linguistics', 'km_arabic_linguistic',
        "SELECT id, discipline, parent_id, title_ar, depth, matn_order, volume_no, page_start FROM ar_ling_gram_bab "
        "WHERE source_slug = 'adima_dirasat' ORDER BY matn_order"))
    dump('gt.jsonl', d1('ar-linguistics', 'km_arabic_linguistic',
        "SELECT id, category_key, parent_term_id, term_order, name_ar, name_en, discipline, status, name_bare, aliases_json FROM ar_ling_gram_term"))
    dump('gt_alias.jsonl', d1('ar-linguistics', 'km_arabic_linguistic', "SELECT alias_bare, term_id, alias_raw, alias_kind FROM ar_ling_gram_term_alias"))
    dump('adima_lessons.jsonl', d1('arabic', 'km_arabic',
        "SELECT id, parent_id, discipline, depth, title_ar, volume_no, page_start, bab_id, sort_order FROM ar_lesson "
        "WHERE spine = 'adima_dirasat' ORDER BY sort_order"))
    dump('qr_ayah.jsonl', d1('quran', 'km_quran', "SELECT surah, ayah, text_bare FROM qr_ayah ORDER BY surah, ayah"))
    words = []
    for s0 in range(1, 115, 6):
        words += d1('quran', 'km_quran', f"SELECT surah, ayah, word_index, word_text, word_text_bare, gt_form_family "
                                          f"FROM qr_word_occurrence WHERE surah BETWEEN {s0} AND {s0 + 5} ORDER BY surah, ayah, word_index")
    dump('qr_words.jsonl', words)

if '--export' in sys.argv: export()
os.chdir(WORK)

AR_DIG = str.maketrans('٠١٢٣٤٥٦٧٨٩', '0123456789')
DIAC = re.compile(r'[ؐ-ًؚ-ٰٟۖ-ۭـ]')

def bare(s):
    s = DIAC.sub('', s or '')
    s = re.sub('[أإآٱ]', 'ا', s).replace('ى', 'ي').replace('ة', 'ه').replace('ؤ', 'و').replace('ئ', 'ي')
    return s

def letters(s):
    return re.sub(r'[^ء-ي]', '', bare(s))

def norm_title(s):
    s = bare(s)
    s = re.sub(r'[\[\]()«»:،,.\-–—*]', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()

pages = [json.loads(l) for l in open('adima_pages.jsonl')]
babs = [json.loads(l) for l in open('adima_babs.jsonl')]
lessons = [json.loads(l) for l in open('adima_lessons.jsonl')]
gt = {r['id']: r for r in map(json.loads, open('gt.jsonl'))}
aliases = [json.loads(l) for l in open('gt_alias.jsonl')]
ayat = {(r['surah'], r['ayah']): r for r in map(json.loads, open('qr_ayah.jsonl'))}
words = collections.defaultdict(list)
for w in map(json.loads, open('qr_words.jsonl')):
    words[(w['surah'], w['ayah'])].append(w)
ayah_max = collections.Counter()
for (s, a) in ayat: ayah_max[s] = max(ayah_max[s], a)

# ── headings: the lesson spine and the book's own bābs, by volume and page ──────────────────
heads_at = collections.defaultdict(set)      # (vol, page) -> normalized titles that start there
known_titles = {}
lesson_titles = {norm_title(l['title_ar']) for l in lessons if l['depth'] >= 1}
for b in babs:
    t = norm_title(b['title_ar'])
    if len(t) < 2: continue
    if len(t.split()) == 1 and t not in lesson_titles: continue      # a verb the chapter lists: a head word
    known_titles[t] = b['title_ar']
    if b['volume_no'] and b['page_start']: heads_at[(b['volume_no'], b['page_start'])].add(t)
for l in lessons:
    if l['depth'] < 1: continue
    t = norm_title(l['title_ar'])
    if len(t) < 2: continue
    known_titles[t] = l['title_ar'].strip('[] ')
    if l['volume_no'] and l['page_start']: heads_at[(l['volume_no'], l['page_start'])].add(t)

# ── the verb-form studies of volume 4: each chapter is one pattern (the book's own chapters) ──
# (vol, first page, pattern as ʿUḍayma writes it, GT form family)
FORM_CHAPTERS = [
    (4, 84, 'أَفْعَلَ', 'GT:form_family:form_iv'),
    (4, 334, 'فَعَّلَ', 'GT:form_family:form_ii'),
    (4, 446, 'فَاعَلَ', 'GT:form_family:form_iii'),
    (4, 499, 'اِنْفَعَلَ', 'GT:form_family:form_vii'),
    (4, 508, 'اِفْتَعَلَ', 'GT:form_family:form_viii'),
    (4, 566, 'تَفَعَّلَ', 'GT:form_family:form_v'),
    (4, 623, 'اِفْعَلَّ', 'GT:form_family:form_ix'),
    (4, 628, 'تَفَاعَلَ', 'GT:form_family:form_vi'),
    (4, 658, 'اِسْتَفْعَلَ', 'GT:form_family:form_x'),
    (4, 689, 'اِفْعَوْعَلَ', 'GT:form_family:form_xii'),
    (4, 691, None, None),
]
def form_of(vol, page):
    cur = (None, None)
    if vol != 4: return cur
    for v, p, pat, term in FORM_CHAPTERS:
        if page >= p: cur = (pat, term)
    return cur

# A heading that says "X بمعنى Y" or "X و Y" is about the two patterns together, not one meaning.
PATTERN_WORDS = {'افعل', 'فعل', 'فاعل', 'انفعل', 'افتعل', 'تفعل', 'تفاعل', 'استفعل', 'افعوعل', 'فيعل'}

# ── GT matching: sigha_maani meanings, and any term whose name a heading states ──────────────
by_bare = collections.defaultdict(set)
for t in gt.values():
    if t['status'] != 'live': continue
    for n in [t['name_ar'], t.get('name_bare') or '']:
        b = norm_title(n).replace('ال', '', 1) if False else norm_title(n)
        if len(letters(b)) >= 3: by_bare[b].add(t['id'])
for a in aliases:
    b = norm_title(a['alias_raw'] or a['alias_bare'] or '')
    if len(letters(b)) >= 3 and a['term_id'] in gt: by_bare[b].add(a['term_id'])

MEANINGS = [t for t in gt.values() if t['category_key'] == 'sigha_maani' and t['status'] == 'live']
MEANING_KEYS = []
for t in MEANINGS:
    for n in [t['name_ar'], t.get('name_bare') or '']:
        b = norm_title(n)
        if b: MEANING_KEYS.append((b, t['id']))
        if b.startswith('ال'): MEANING_KEYS.append(('لل' + b[2:], t['id']))   # التعدية → للتعدية
        if b.startswith('ال'): MEANING_KEYS.append((b[2:], t['id']))
# ʿUḍayma's own wording for the same meanings
for k, tid in [('المتعدي لاثنين', 'GT:sigha_maani:taadiya_li_ithnayn'), ('المتعديه لاثنين', 'GT:sigha_maani:taadiya_li_ithnayn'),
               ('اللازم', 'GT:sigha_maani:lazim'), ('لازم', 'GT:sigha_maani:lazim'), ('للتعديه', 'GT:sigha_maani:taadiya'),
               ('بمعني الثلاثي', 'GT:sigha_maani:bi_maana_al_thulathi'), ('بمعني المجرد', 'GT:sigha_maani:bi_maana_al_thulathi'),
               ('للصيروره', 'GT:sigha_maani:sayrura'), ('للمطاوعه', 'GT:sigha_maani:mutawaa'), ('للسلب', 'GT:sigha_maani:salb')]:
    if tid in gt: MEANING_KEYS.append((k, tid))
MEANING_KEYS.sort(key=lambda x: -len(x[0]))

def meaning_of(title):
    t = ' ' + norm_title(title) + ' '
    m = re.search(r'بمعني ([^\s]+(?: [^\s]+)?)', t)
    for k, tid in MEANING_KEYS:
        if f' {k} ' in t or t.strip().endswith(k):
            return gt[tid]['name_ar'], tid
    if m:
        return 'بمعنى ' + m.group(1).strip(), None
    return None, None

def term_of(title):
    """the GT term a heading names: the longest registry name it contains"""
    t = ' ' + norm_title(title) + ' '
    best = None
    for k, ids in by_bare.items():
        if len(k) < 3: continue
        if f' {k} ' in t and (best is None or len(k) > len(best[0])):
            best = (k, sorted(ids)[0])
    return best[1] if best else None

# ── lines ────────────────────────────────────────────────────────────────────────────────────
REF = re.compile(r'\[([٠-٩0-9:،,\s\-]+)\]')
NUM = re.compile(r'^\s*(?:[٠-٩0-9]+|\([أ-ي]\)|[أ-ي]\))\s*[-–]\s*')
SOURCES = re.compile(r'الكشاف|البحر|النشر|الإتحاف|المحتسب|معاني القرآن|المفردات|غيث النفع|الشاطبية|العكبري|سيبويه|المقتضب|الخصائص|شرح|المغني|ابن |أبو |أبي |الفراء|الزجاج|الرضى|الرضي|القرطبي|الطبري')
CITED = re.compile(r'^(و?في |و?قال |و?يرى |انظر|و?ذكر |و?حكى |و?نقل |و?أجاز |و?منع |و?رد )')

def parse_refs(s):
    out, cur = [], None
    for part in re.split(r'[،,]', s.translate(AR_DIG)):
        part = part.strip()
        if not part: continue
        m = re.match(r'^(\d+)\s*:\s*(\d+)(?:\s*-\s*(\d+))?$', part)
        if m:
            cur = int(m.group(1)); out.append((cur, int(m.group(2))))
        elif re.match(r'^\d+(\s*-\s*\d+)?$', part) and cur:
            out.append((cur, int(re.match(r'^(\d+)', part).group(1))))
    return [(s_, a) for s_, a in out if 1 <= s_ <= 114 and 1 <= a <= ayah_max[s_]]

def quote_ok(quote, s, a):
    """does the quote stand in the āyah its reference names? (the share of its words found there)"""
    ay = ayat.get((s, a))
    if not ay: return 0
    text = ' ' + ' '.join(letters(x) for x in (ay['text_bare'] or '').split()) + ' '
    toks = [letters(x) for x in quote.split() if len(letters(x)) >= 2 and x != '...']
    if not toks: return 0
    return round(sum(1 for t in toks if t in text) / len(toks), 2)

def match_word(quote, head, s, a, pattern_term):
    """the word of the āyah the citation is about: the head word as it stands there"""
    ws = words.get((s, a), [])
    if not ws: return None
    hk = letters(head or '')
    qtoks = [letters(x) for x in quote.split()]
    def score(w):
        wb = letters(w['word_text_bare'] or w['word_text'])
        sc = 0
        if pattern_term and w.get('gt_form_family') == pattern_term: sc += 3
        if hk:
            core = re.sub(r'^(وال|فال|بال|كال|ال|و|ف|ب|ل|س)', '', wb)
            common = sum(1 for ch in set(hk) if ch in core)
            sc += 2 * common / max(1, len(set(hk)))
            if core.startswith(hk[:2]) or hk[:2] in core: sc += 0.5
        if any(wb and q == wb for q in qtoks): sc += 0.5
        return sc
    best = max(ws, key=score)
    if score(best) < (2.0 if hk else 3.0): return None
    return best

entries, notes = [], []
disc_stream = collections.defaultdict(list)
for p in pages: disc_stream[p['discipline']].append(p)

for disc, ps in disc_stream.items():
    section = chapter = head = None
    last_entry = None
    head_notes = []
    def flush_head():
        global notes
        if head_notes and (head or section):
            own = [n for n in head_notes if n[1] == 'own']
            if own:
                notes.append(dict(discipline=disc, section=section, chapter=chapter, head=head, **own_ctx,
                                  text='\n'.join(n[0] for n in own)[:1200], chunk=own[0][2], volume=own[0][3], page=own[0][4]))
    own_ctx = {}
    for p in ps:
        vol, page = p['volume_no'], p['page_no']
        starting = heads_at.get((vol, page), set())
        # a heading the book's index puts on this page but the page's text does not set on a line of its own
        page_lines = {norm_title(x) for x in re.split(r'[\r\n]+', p['text_ar'] or '')}
        for t in sorted(starting, key=len, reverse=True):
            if len(t.split()) >= 2 and t not in page_lines and t in known_titles:
                flush_head(); head_notes = []
                section = known_titles[t]; head = None
                if 'دراسة' in t or 'لمحات' in t: chapter = section
                pat, pterm = form_of(vol, page) if disc == 'SF' else (None, None)
                mean, mterm = meaning_of(section)
                toks = set(norm_title(section).split())
                if (not mean and pat and own_ctx.get('pattern') == pat and not (toks & PATTERN_WORDS)
                        and not re.search(r'قراء|دراس|لمحات', norm_title(section))):   # a sub-heading inside the same meaning's list
                    mean, mterm = own_ctx.get('meaning'), own_ctx.get('meaning_term')
                own_ctx = dict(pattern=pat, pattern_term=pterm, meaning=mean, meaning_term=mterm, section_term=term_of(section))
                break
        for raw in re.split(r'[\r\n]+', p['text_ar'] or ''):
            ln = raw.strip()
            if not ln or ln in ('* * *', '﷽') or ln.startswith('<'): continue
            nt = norm_title(ln)
            refm = REF.search(ln)
            # a heading of the book: a known title standing alone on its line
            if not refm and nt in known_titles and len(ln) <= 80 and (nt in starting or len(nt.split()) >= 2):
                flush_head(); head_notes = []
                section = known_titles[nt]; head = None
                if 'دراسة' in nt or 'لمحات' in nt: chapter = section
                pat, pterm = form_of(vol, page) if disc == 'SF' else (None, None)
                mean, mterm = meaning_of(section)
                toks = set(norm_title(section).split())
                if (not mean and pat and own_ctx.get('pattern') == pat and not (toks & PATTERN_WORDS)
                        and not re.search(r'قراء|دراس|لمحات', norm_title(section))):   # a sub-heading inside the same meaning's list
                    mean, mterm = own_ctx.get('meaning'), own_ctx.get('meaning_term')
                own_ctx = dict(pattern=pat, pattern_term=pterm, meaning=mean, meaning_term=mterm, section_term=term_of(section))
                continue
            if refm and (NUM.match(ln) or ln.rstrip('.').endswith(']') or ln.startswith('[')):
                refs = parse_refs(refm.group(1))
                quote = NUM.sub('', REF.sub('', ln)).strip(' .:،')
                if ln.startswith('[') and last_entry and not last_entry['refs']:
                    last_entry['refs'] = refs; continue
                if not refs: continue
                pat, pterm = form_of(vol, page) if disc == 'SF' else (None, None)
                mean, mterm = own_ctx.get('meaning'), own_ctx.get('meaning_term')
                s, a = refs[0]
                w = match_word(quote, head, s, a, pterm)
                e = dict(discipline=disc, chunk=p['id'], volume=vol, page=page, chapter=chapter, section=section, head=head,
                         pattern=pat, pattern_term=pterm, meaning=mean, meaning_term=mterm, section_term=own_ctx.get('section_term'),
                         quote=quote[:400], quote_ok=quote_ok(quote, s, a), surah=s, ayah=a, refs=refs[:40],
                         word_index=w['word_index'] if w else None, word=w['word_text'] if w else None)
                entries.append(e); last_entry = e
                continue
            if ln.startswith('[') and last_entry is not None:
                refs = parse_refs(REF.search(ln).group(1)) if REF.search(ln) else []
                if refs and not last_entry.get('_fixed'):
                    last_entry['_fixed'] = True
                continue
            # a head word: one or two words, no digits, not a sentence
            toks = ln.strip('()[] .').split()
            if 1 <= len(toks) <= 2 and not re.search(r'[0-9٠-٩=:؟«»]', ln) and not ln.endswith('.') and len(ln) <= 24 \
                    and nt not in ('المفردات', 'الايات', 'القراءات', 'دراسه', 'قراءات', 'الشواذ', 'من الشواذ', 'في السبع', 'من السبع', 'قراءه'):
                flush_head(); head_notes = []
                head = ln.strip('()[] ')
                continue
            if re.search(r'=\s*[٠-٩0-9]', ln): continue      # occurrence counts
            m = re.search(r'جاء(?:ت)? \(?[^\s)]+\)? (لل\S+|بمعنى \S+)', ln)
            if m and section and not own_ctx.get('meaning') and not re.search(r'دراس|لمحات|قراء', norm_title(section)):
                mean, mterm = meaning_of(m.group(1))
                if mean: own_ctx['meaning'], own_ctx['meaning_term'] = mean, mterm
            if len(ln) >= 12:
                digits = len(re.findall(r'[٠-٩0-9]', ln))
                kind = 'cited' if (CITED.match(ln) or '«' in ln or SOURCES.search(ln) or NUM.match(ln) or digits > 3
                                   or len(re.findall(r'[ء-ي]', ln)) < 10) else 'own'
                head_notes.append((ln, kind, p['id'], vol, page))
    flush_head()

# ── reading notes: ʿUḍayma's comments that name readings (the seven, the shādhdh) ─────────────
OPENERS = re.compile(r'^(ونلحظ|نلحظ|لم ي|ذكر |جاء|الفعل|وكان|كان|لا |ليس|هو |هي |قرئ|وقرئ|قراءة|المضارع|الماضي|الأمر|\()')
for n in notes:
    t = n['text']
    n['about_readings'] = bool(re.search(r'قر[ئأ]|القراء|السبع|الشواذ|شاذ', t))
    first = t.split('\n')[0].strip()
    hk = letters(n['head'] or '')
    # one sentence of ʿUḍayma's own, short enough to be an answer, about the word or the heading
    n['drill'] = first if (20 <= len(first) <= 200 and OPENERS.match(first) and not first.endswith(':')
                           and first.count('﴿') <= 1 and 'قلت' not in first and '»' not in first) else None

json.dump({'entries': len(entries), 'notes': len(notes)}, sys.stdout); print()
with open('adima_entries.jsonl', 'w') as f:
    for e in entries:
        e.pop('_fixed', None); f.write(json.dumps(e, ensure_ascii=False) + '\n')
with open('adima_notes.jsonl', 'w') as f:
    for n in notes: f.write(json.dumps(n, ensure_ascii=False) + '\n')

# ── SQL: the rows for ar_ling_adima_entry / ar_ling_adima_note (migration 0110) ──────────────
def lit(v):
    if v is None: return 'NULL'
    if isinstance(v, bool): return '1' if v else '0'
    if isinstance(v, (int, float)): return str(v)
    return "'" + str(v).replace("'", "''") + "'"

def emit(path_prefix, table, cols, rows, per=200, per_file=12000):
    files, buf, n = [], [], 0
    stmts = []
    for i in range(0, len(rows), per):
        vals = ',\n'.join('(' + ','.join(lit(r[c]) for c in cols) + ')' for r in rows[i:i + per])
        stmts.append(f'INSERT OR REPLACE INTO {table} ({",".join(cols)}) VALUES\n{vals};')
    for k in range(0, len(stmts), per_file // per):
        p = f'{path_prefix}_{len(files):02d}.sql'
        open(p, 'w').write('\n'.join(stmts[k:k + per_file // per]) + '\n')
        files.append(p)
    return files

if '--sql' in sys.argv:
    per_chunk = collections.Counter()
    erows = []
    for i, e in enumerate(entries):
        per_chunk[e['chunk']] += 1
        erows.append(dict(id=f"ADM:{e['chunk']}:{per_chunk[e['chunk']]}", discipline=e['discipline'], chunk_id=e['chunk'],
                          volume_no=e['volume'], page_no=e['page'], seq=i + 1, chapter_ar=e['chapter'], section_ar=e['section'],
                          head_ar=e['head'], pattern_ar=e['pattern'], pattern_term_id=e['pattern_term'], meaning_ar=e['meaning'],
                          meaning_term_id=e['meaning_term'], section_term_id=e['section_term'], quote_ar=e['quote'],
                          surah=e['surah'], ayah=e['ayah'], refs_json=json.dumps(e['refs']), word_index=e['word_index'],
                          word_ar=e['word'], quote_match=e['quote_ok']))
    nrows = [dict(id=f'ADN:{i + 1}', discipline=n['discipline'], chunk_id=n['chunk'], volume_no=n['volume'], page_no=n['page'],
                  chapter_ar=n['chapter'], section_ar=n['section'], head_ar=n['head'], pattern_ar=n.get('pattern'),
                  pattern_term_id=n.get('pattern_term'), meaning_ar=n.get('meaning'), meaning_term_id=n.get('meaning_term'),
                  section_term_id=n.get('section_term'), note_ar=n['text'], drill_ar=n['drill'], about_readings=n['about_readings'])
             for i, n in enumerate(notes)]
    fe = emit('adima_entry', 'ar_ling_adima_entry', list(erows[0].keys()), erows, per=100, per_file=8000)
    fn = emit('adima_note', 'ar_ling_adima_note', list(nrows[0].keys()), nrows, per=25, per_file=5000)
    print('files', fe + fn)


if '--apply' in sys.argv:
    for f in sorted(x for x in os.listdir(WORK) if re.match(r'adima_(entry|note)_\d+\.sql$', x)):
        subprocess.run(['npx', 'wrangler', 'd1', 'execute', 'km_arabic_linguistic', '--remote', '--file', os.path.join(WORK, f)],
                       cwd=os.path.join(ROOT, 'workers', 'ar-linguistics'), check=True)
