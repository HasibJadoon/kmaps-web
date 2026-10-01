#!/usr/bin/env python3
"""ʿUḍayma, Dirāsāt li-uslūb al-Qurʾān al-karīm, as rows (km_arabic_linguistic migration 0110).

The book (ar_ling_gram_chunk, book 5264, source adima_dirasat) lists, under each heading, every
Qurʾānic word the heading covers — the āyah quoted, its reference «[١٠٠: ٩]» — with ʿUḍayma's
own observations. This reads the pages in book order and writes:

  ar_ling_adima_entry  one row per citation: chapter › section › head word, the verb pattern the
                       chapter studies and the meaning its heading names (bound to GT form_family /
                       sigha_maani terms), the āyah, the quote, the word of the āyah it is about
                       (qr_word_occurrence.word_index; locate_kind says how it was told — see locate()),
                       and quote_match — the share of the quote found in the āyah it names.
  ar_ling_adima_note   his own observations on a head word (not the books he quotes), and the one
                       sentence of each that stands alone as a drill answer.
  ar_ling_adima_note_ayah  the āyāt a note discusses (migration 0115): the references it gives, the
                       āyah text it quotes, or the one āyah its head word is cited from.

  python3 scripts/parse-adima.py --export --sql --apply     # all of it, in ./.adima-work
  python3 scripts/parse-adima.py --sql                      # re-parse what was exported
  python3 scripts/parse-adima.py --locate --apply           # only the located words and the note āyāt, as
                                                            # UPDATEs by id (the rows themselves untouched)

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
        words += d1('quran', 'km_quran', f"SELECT surah, ayah, word_index, word_text, word_text_bare, root, lemma, pos, gt_form_family, "
                                          f"gt_derivation_type, prefix_count, suffix_count, has_det_prefix, has_pron_suffix "
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

# ── the word of the āyah a citation is about ────────────────────────────────────────────────
# A citation names an āyah; the heading above it names what in the āyah it is about — a head word
# (a verb in its past form, a noun, a particle), a pattern («فَعْلَى», «(فُعُل)»), a derived form of a
# pattern («اسم الفاعل من أفعل», «أفعل من الأجوف»), or a particle («(حتى)», «من) حالية», «الباء للسببية»).
# locate() finds that word among the words the quote covers, using the corpus's root / lemma / form /
# derivation columns of qr_word_occurrence, and says how (locate_kind):
#   root_form     a verb-form chapter (vol. 4): the word of the head word's root on the chapter's pattern
#   root          the word of the head word's root (or its lemma), the pattern not confirmed by the corpus
#   surface       the head word as written (a particle or a word with no root, or where the corpus's
#                 morphology has slid off the āyah's words)
#   form_only     a head-less line of a verb-form chapter: the one word of the āyah on the chapter's pattern
#   section_form  a head-less ṣarf section naming a participle of a form, or a weak verb of a form
#   wazn          the one word on the pattern the heading names (vowels checked where both carry them)
#   particle      naḥw: the one occurrence of the particle the heading (section, chapter) studies
# Nothing is guessed: two different words that fit equally leave it NULL, a ṣarf question never takes a
# particle (ḥarf), and a quote that does not stand in the āyah it names (quote_match < 0.5) is not located.
DIAC_ALL = re.compile('[ؐ-ًؚ-ٰٟۖ-ۭـ]')
MARKS = set('ًٌٍَُِّْ')
FATHA, DAMMA, KASRA, SUKUN, SHADDA = 'َ', 'ُ', 'ِ', 'ْ', 'ّ'
FUNCTION_POS = {'P', 'REL', 'PRON', 'NEG', 'ACC', 'DEM', 'COND', 'CONJ', 'SUB', 'RES', 'INTG', 'CERT', 'PRO', 'RET', 'EXP',
                'INC', 'EXL', 'AMD', 'INT', 'FUT', 'ANS', 'EXH', 'SUR', 'AVR', 'INL', 'SUP'}

def is_function(w):
    """a particle / pronoun / demonstrative / relative (ḥarf and the closed classes): never the word of a pattern question"""
    return w['pos'] in FUNCTION_POS or (w['pos'] in ('T', 'LOC') and not w.get('root'))

def plain(s):
    s = (s or '').replace('ىٰ', 'ى').replace('ٰ', 'ا')
    return DIAC_ALL.sub('', s)

def fold(s, keep_ta=False):
    """bare vs Uthmani vs imlāʾī: diacritics, dagger alif, alif and hamza seats, ى/ي, ة/ه (kept apart where a final ه
    could be read as a pronoun: وصية is not وصي + ـه)"""
    s = plain(s)
    s = re.sub('[أإآٱء]', 'ا', s).replace('ؤ', 'و').replace('ئ', 'ي').replace('ى', 'ي')
    if not keep_ta: s = s.replace('ة', 'ه')
    s = re.sub('ا+', 'ا', s)
    return re.sub('[^ء-ي]', '', s)

def pkey(s):
    """a particle's key: hamza seat, shadda and tanwīn kept (أَن ≠ إِنّ ≠ إِذًا)"""
    s = (s or '').replace('ىٰ', 'ى').replace('ٰ', '').replace('آ', 'ا').replace('ٱ', 'ا')
    s = re.sub('[ؐ-ٌؚ-ِْ-ٟۖ-ۭـ]', '', s)   # keep ً (064B) and ّ (0651)
    s = s.replace('ى', 'ي')
    return re.sub(r'اً$|ًا$', 'ًا', s)

PRO = ['', 'و', 'ف', 'ب', 'ل', 'ك', 'س', 'وب', 'ول', 'فب', 'فل', 'وس', 'فس', 'وك', 'فك', 'ا', 'اف', 'او']
ENC = ['', 'ه', 'ها', 'هم', 'هما', 'هن', 'ك', 'كم', 'كما', 'كن', 'ي', 'ني', 'نا', 'ا', 'وا', 'تم', 'تما', 'تن', 'ت', 'ون',
       'ين', 'ان', 'ات', 'ن', 'تموه', 'موه']

def cores(wf):
    """the word with its clitics (and the commonest inflection endings) taken off, every way"""
    out = set()
    for p in PRO:
        if not wf.startswith(p): continue
        a = wf[len(p):]
        for b in {a, a[2:] if a.startswith('ال') else a, ('ل' + a[1:]) if p.endswith('ل') and a.startswith('ل') else a}:
            for e in ENC:
                if e and not b.endswith(e): continue
                c = b[:len(b) - len(e)] if e else b
                if len(c) >= 2: out.add(c)
    return out

AUG = set('اتسلمنويه')
WEAK = set('اوي')

def root_fit(head_f, root):
    """can the head word be built from this root (its letters in order, the rest augment letters of the pattern)?
    returns (strong matched, weak matched, skipped, extra) or None"""
    if not root: return None
    r = fold(root)
    if len(r) < 2 or len(head_f) > len(r) + 5: return None
    best = None
    def go(i, j, sm, wm, sk, ex):
        nonlocal best
        if j == len(r):
            rest = head_f[i:]
            if all(ch in AUG for ch in rest):
                cand = (sm, wm, -sk, -(ex + len(rest)))
                if best is None or cand > best: best = cand
            return
        rj = r[j]
        if i < len(head_f):
            h = head_f[i]
            if h == rj or (rj in WEAK and h in WEAK):
                go(i + 1, j + 1, sm + (rj not in WEAK), wm + (rj in WEAK), sk, ex)
        if rj in WEAK or (j > 0 and rj == r[j - 1]):
            go(i, j + 1, sm, wm, sk + 1, ex)
        if i < len(head_f) and (head_f[i] in AUG or (j == 1 and head_f[i] in 'طد' and r[0] in 'صضطظدذز')):
            go(i + 1, j, sm, wm, sk, ex + 1)
    go(0, 0, 0, 0, 0, 0)
    if not best: return None
    sm, wm, nsk, nex = best
    if sm + wm < 2: return None
    return sm, wm, -nsk, -nex

# heading words that are not the word: grammar terms, sources, descriptors
STOP = set(fold(x) for x in '''آيات نصوص مواضع أخرى موقف الكشاف العكبري أبو حيان القراءات قراءات قراءة السبعية الشواذ شاذة من السبع
الاسم اسم الأسماء الحال حال الحالية حالية المقدرة الجمع جمع وحده صفة صفات الصفة الصفات الماضي المضارع مضارع المثبت الفعل والفعل الأفعال
النعت الزائدة زائدة تذكير تأنيث التأنيث المضاف وصف الوصف وصفان حذف النافية مصدر مصدران المصدرية للتبعيض مهموز جواب العائد عائد
الشرطية الموصولة الموصول تثقيل تخفيف الظرف ظرف ظرفان فقد الشروط الجملة الجمل التوكيد توكيد الإضراب الانتقالي للتعدية للسببية للمؤكد
تعليق التعليق مقرون بأل مواقع خبرها خبر خبرا قطع المتنازعان للمرة المخففة مثال المثال إبدال الجيم المرفوع الإضافة إضافة مضافين الصيرورة
التعدية الاستفهامية الاستفهام بالاستفهام للاستفهام الواجب لازم متعد العامل المعنوي العدد تمييز للتمني المتعين للفاعلية واو نزع الخافض تعين
المضاعف مضاعف المنقوص الناقص ناقص العلة زيادة تامة كسر الهمزة همزة الهمزتان الثاني الثالث والثالث للقسم كلمة التوحيد المعطوف المعطوفات
الاقتران بالواو نداء بمثل إحداهما الصلة الفصل قواعد التفسيرية النهي الإعراب الموصوف رجح الرفع رفع الموطئة السببي للمبتدأ المبتدأ التبليغ
عطف العطف التصريح بالمفعولين بالأجنبي للتعليل مراعاة اللفظ الرابط للبدل محذوف التعجبية المفعول مفعول المفعولين به بأجمع المشبهة
للظرفية الاستئنافية الاستئناف لغة طيئ صيغ المبالغة التفضيل الابتدائية باب مكسورتان النوع للآلة مؤكدة المؤكدة متفق عليه القبائل والأحياء
الجواب النفي نون المعية الاستعمال احتمال الاعتراض المعترضة إشباع الجنس العقود الضمير للمصاحبة أهملت وكررت تكرير تكرر الحالان مفردان
الألف الأجوف للسبب العاطفة القول الأعجمية للإلصاق للعاقل باللام الجامدة ألفاظ الزمن بذات فالرد للملابسة الفصيحة للاختصاص للتقوية
منفصلتان والأولى للتبيين التبيين بالباء المائة بذي المفسرة الفتحة فاء المجرور تقديم المحولة دراسة لمحات المفردات الآيات في الكشاف
البحر المحتسب ابن معاني القرآن سيبويه الفراء الزجاج المغني'''.split())

def content_tokens(head):
    """the words of a heading that may be the Qurʾānic word (not a term, a source, a descriptor or a particle name)"""
    out = []
    for t in re.split(r'[\s()\[\]،,.:\-–«»]+', plain(head or '')):
        f = fold(t)
        if len(f) < 2 or f in STOP: continue
        if f.startswith('لل') and len(f) > 4: continue                         # للتعدية, للمرة …
        if f.startswith('ال') and (f.endswith('يه') or f.endswith('يات')): continue   # الحلمية, الشرطية …
        if nkey(t) in PARTICLES or f in CLITIC: continue
        if len(f) >= 3 and f[0] in 'وف' and nkey(t[1:]) in PARTICLES: continue     # فإذ, ولو
        out.append((t, f))
    return out

# ── particles: the name a heading gives → the corpus lemma(s) (hamza seat, shadda, tanwīn kept) ──
def _p(*names): return {pkey(n) for n in names}
def nkey(s): return pkey(s).replace('\u0651', '')      # a heading's name: the book's text seldom carries the shadda
PARTICLES = {nkey(k): v for k, v in {
    'حتى': _p('حَتَّىٰ'), 'قد': _p('قَد'), 'هل': _p('هَل'), 'إلا': _p('إِلَّا'), 'ألا': _p('أَلَآ'),
    'لو': _p('لَو'), 'لولا': _p('لَوْلَآ'), 'ما': _p('مَا'), 'من': _p('مِن'), 'في': _p('فِى'),
    'على': _p('عَلَىٰ'), 'عن': _p('عَن'), 'إلى': _p('إِلَىٰ'), 'أو': _p('أَو'), 'أم': _p('أَم'),
    'أما': _p('أَمَّا'), 'إما': _p('إِمَّا'), 'ثم': _p('ثُمّ'), 'بل': _p('بَل'), 'بلى': _p('بَلَىٰ'),
    'لن': _p('لَن'), 'لم': _p('لَم'), 'كيف': _p('كَيْف'), 'كم': _p('كَم'), 'إذ': _p('إِذ'),
    'إذا': _p('إِذَا'), 'إذن': _p('إِذًا'), 'لعل': _p('لَعَلّ', 'لَّعَلّ'), 'لكن': _p('لَٰكِن', 'لَٰكِنّ'),
    'ليت': _p('لَيْت'), 'كأن': _p('كَأَنّ'), 'سوف': _p('سَوْف'), 'كلا': _p('كَلَّا'), 'كلما': _p('كُلَّمَا'),
    'لما': _p('لَمَّا', 'لَّمَّا'), 'كي': _p('كَى'), 'كى': _p('كَى'), 'غير': _p('غَيْر'), 'مثل': _p('مِثْل'),
    'كل': _p('كُلّ'), 'مع': _p('مَع'), 'بين': _p('بَيْن'), 'الذي': _p('الَّذِى'), 'الذين': _p('الَّذِى'),
    'ماذا': _p('مَاذَا'), 'أي': _p('أَىّ'), 'لا': _p('لَا'),
    'أن': _p('أَن', 'أَنّ'), 'إن': _p('إِن', 'إِنّ'),
}.items()}
# the particles that are a letter of the word (proclitics)
CLITIC = {'الباء': 'ب', 'باء': 'ب', 'اللام': 'ل', 'لام': 'ل', 'الفاء': 'ف', 'فاء': 'ف', 'الواو': 'و', 'واو': 'و', 'الكاف': 'ك',
          'السين': 'س', 'السين وسوف': 'س'}
CLITIC = {fold(k): v for k, v in CLITIC.items()}
# the function a heading names → the corpus tag it must carry
FUNC_POS = {fold(k): v for k, v in {
    'النافية': {'NEG'}, 'نافية': {'NEG'}, 'الموصولة': {'REL'}, 'موصولة': {'REL'}, 'الشرطية': {'COND'}, 'شرطية': {'COND'},
    'الاستفهامية': {'INTG'}, 'استفهامية': {'INTG'}, 'المصدرية': {'SUB'}, 'مصدرية': {'SUB'}, 'الفجائية': {'SUR'},
    'الاستثنائية': {'RES', 'EXP'}, 'الامتناعية': {'COND'}, 'الاستفتاحية': {'INC'}, 'الثنائية': {'SUB', 'INT'}}.items()}

DESCR = {fold(x) for x in 'حال حالية صفة زائدة مصدرية نافية شرطية موصولة استفهامية عاطفة جازمة ناصبة مخففة مهملة متصلة منقطعة'.split()}

def particle_of(text, allow_first=True):
    """the particle a heading names: «(حتى)», «من) حالية», «الباء للسببية», «أن الثنائية» → (lemma keys | clitic letter, tag filter)"""
    if not text: return None
    t = plain(text)
    t = re.sub(r'^\s*(لمحات عن|دراسة|دارسة)\s+', '', t)
    t = re.sub(r'^\s*(لمحات عن|دراسة|دارسة)\s+', '', t)
    t = re.sub(r'^\s*(من\s+)?(معاني|أحكام|مواقع|مواضع|أقسام|أنواع)\s+', '', t)     # «من معاني أو» → أو
    t = re.sub(r'\s+في القرآن( الكريم)?\s*$', '', t)
    m = re.search(r'\(([^()]{1,14})\)', t) or re.match(r'^\s*([^()\s]{1,6})\)', t) or re.search(r'\(([^()\s]{1,6})\s*$', t)
    toks = re.split(r'[\s()،,]+', t.strip())
    toks = [x for x in toks if x]
    # a heading that is a particle and what it does («من حالية», «هل») — not a sentence that starts with one
    def descriptor(x):
        f = fold(x)
        return (f in FUNC_POS or f in DESCR or (f.startswith('ال') and f[2:] in DESCR) or f.startswith('لل') or (f.startswith('ال') and f.endswith('يه'))
                or nkey(x) in PARTICLES or f in CLITIC or (f[:1] == 'و' and nkey(x[1:]) in PARTICLES))
    name = m.group(1).strip() if m else (toks[0] if allow_first and 0 < len(toks) <= 3 and all(descriptor(x) for x in toks[1:]) else None)
    if not name: return None
    rest = [fold(x) for x in toks if x]
    tag = None
    for x in rest:
        if x in FUNC_POS: tag = FUNC_POS[x]; break
    nk, nf = nkey(name), fold(name)
    first2 = fold(' '.join(name.split()[:1]))
    if nf in CLITIC or first2 in CLITIC:
        return ('clitic', CLITIC.get(nf) or CLITIC[first2], tag)
    if ' ' in name:        # «لا النافية للجنس», «لام التعليل», «فاء السببية», «إذا الشرطية»
        n0 = name.split()[0]
        if fold(n0) in CLITIC: return ('clitic', CLITIC[fold(n0)], tag)
        tag = tag or next((FUNC_POS[fold(x)] for x in name.split()[1:] if fold(x) in FUNC_POS), None)
        nk = nkey(n0)
    if nk in PARTICLES:
        if nk == nkey('أن') and 'الثنائية' in t: return ('lemma', _p('أَن'), None)
        return ('lemma', PARTICLES[nk], tag)
    return None

# ── wazn: ʿUḍayma names a pattern («فَعْلَى», «فُعالل», «فَعَل) الاسم») — the word of the āyah on it ──
def split_marks(s):
    """[(letter, marks)] — shadda doubles the letter (the first of the pair unvowelled)"""
    s = (s or '').replace('ىٰ', 'ى').replace('ٰ', 'ا').replace('ـ', '')
    out = []
    for ch in s:
        if 'ء' <= ch <= 'ي':
            out.append([ch, ''])
        elif ch in MARKS and out:
            out[-1][1] += ch
    res = []
    for ch, mk in out:
        if SHADDA in mk:
            res.append((ch, SUKUN)); res.append((ch, mk.replace(SHADDA, '')))
        else:
            res.append((ch, mk))
    return res

def vowel(mk):
    for v in (FATHA, DAMMA, KASRA, SUKUN):
        if v in mk: return v
    return None

def is_wazn(tok):
    f = fold(tok)
    if not re.search('ف.*ع.*ل', f): return False
    i = f.index('ف'); j = f.index('ع', i); k = f.rindex('ل')
    others = f[:i] + f[i + 1:j] + f[j + 1:k] + f[k + 1:]
    return all(ch in AUG for ch in others.replace('ل', '')) and len(f) <= 8

def wazn_of_head(tok):
    """the pattern as [(slot|letter, vowel)] — ف ع ل (ل) are the radicals"""
    lm = split_marks(tok)
    out = []
    for ch, mk in lm:
        c = fold(ch) or ch
        out.append((c, vowel(mk)))
    # the radicals: first ف, first ع after it, the ل(s) after that
    return out

def word_core(w):
    """the word's letters with their marks, clitics off (by the corpus's own prefix / suffix counts)"""
    lm = split_marks(w['word_text'])
    pc, det = w.get('prefix_count') or 0, w.get('has_det_prefix') or 0
    k = 0
    singles = pc - (1 if det else 0)
    k = max(0, singles)
    lm = lm[k:]
    if det:
        if len(lm) > 2 and fold(lm[0][0]) == 'ا' and lm[1][0] == 'ل': lm = lm[2:]
        elif lm and lm[0][0] == 'ل': lm = lm[1:]
        # the sun letter's doubling after al-
        if len(lm) > 1 and lm[0][0] == lm[1][0] and lm[0][1] == SUKUN: lm = lm[1:]
    if w.get('has_pron_suffix'):
        s = ''.join(fold(c) for c, _ in lm)
        for e in ['هما', 'كما', 'هم', 'هن', 'كم', 'كن', 'ها', 'نا', 'ني', 'ه', 'ك', 'ي']:
            if s.endswith(e) and len(s) - len(e) >= 3:
                lm = lm[:len(lm) - len(e)]; break
    # tanwīn alif / case-ending alif
    if len(lm) > 3 and fold(lm[-1][0]) == 'ا' and ('ً' in lm[-1][1] or (len(lm) > 1 and 'ً' in lm[-2][1])):
        lm = lm[:-1]
    return lm

def word_wazn(w):
    root = fold(w.get('root') or '')
    if len(root) not in (3, 4) or any(ch in WEAK for ch in root): return None
    lm = word_core(w)
    slots = 'فعلل' if len(root) == 4 else 'فعل'
    out, j, last = [], 0, None
    for ch, mk in lm:
        c = fold(ch)
        if j < len(root) and c == root[j]:
            out.append((slots[j], vowel(mk))); last = slots[j]; j += 1
        elif last and out and c == root[j - 1] and out[-1][1] == SUKUN and out[-1][0] == last:
            out.append((last, vowel(mk)))            # the doubled radical (shadda)
        else:
            out.append((c, vowel(mk))); last = None
    if j < len(root): return None
    return out

def wazn_match(head_w, word_w):
    hs = ''.join(c for c, _ in head_w); ws = ''.join(c for c, _ in word_w)
    hs, ws = re.sub('ا+', 'ا', hs), re.sub('ا+', 'ا', ws)
    for suf in ['', 'ون', 'ين', 'ان', 'ات', 'ا']:
        if suf and not ws.endswith(suf): continue
        if (ws[:len(ws) - len(suf)] if suf else ws) == hs: break
    else:
        return False
    # the vowels on the radicals, where both say
    hv = [v for c, v in head_w if c in 'فع']
    wv = [v for c, v in word_w if c in 'فع']
    for a, b in zip(hv, wv):
        if a and b and a != b: return False
    return True

def _subseq(needle, hay):
    it = iter(hay); return all(ch in it for ch in needle)

def sane(w):
    """does the corpus's root stand in the word's own letters? (a row whose morphology slid off its word does not)"""
    r = w.get('root')
    if not r or r == 'موه' or r == 'كون': return True
    s = re.sub(r'(.)\1', r'\1', ''.join(c for c in fold(r) if c not in WEAK))
    return _subseq(s, fold(w['word_text']))

def ayah_aligned(ws):
    return sum(not sane(w) for w in ws) < 2

def _eq(t, f):
    return t == f or (len(t) >= 2 and f.endswith(t) and f[:len(f) - len(t)] in ('و', 'ف')) \
        or (len(f) >= 2 and t.endswith(f) and t[:len(t) - len(f)] in ('و', 'ف'))

def quote_span(quote, ws):
    """the stretch of the āyah the quote covers: its words matched in order"""
    m = re.search('﴿([^﴾]+)﴾', quote or '')
    qt = [fold(x) for x in plain(m.group(1) if m else quote).split()]
    qt = [t for t in qt if t]
    wf = [fold(w['word_text']) for w in ws]
    best = None
    starts = {s for s in range(len(ws)) for t in qt[:12] if _eq(t, wf[s])}
    for s in sorted(starts):
        i, matched = s, []
        for t in qt:
            for j in range(i, min(i + 4, len(ws))):
                if _eq(t, wf[j]): matched.append(j); i = j + 1; break
        if matched and (best is None or len(matched) > len(best)): best = matched
    if not best or len(best) < max(1, len(qt) // 3): return []
    return ws[best[0]:best[-1] + 1]

SECTION_OK = {fold(x) for x in 'قراءات قراءة من الشواذ السبع في الاسم الصفة وزن على بناء أبنية آيات المصدر المصادر التي ترتيب'.split()}


VFORM = {fold(k): v for k, v in {'أفعل': 'GT:form_family:form_iv', 'استفعل': 'GT:form_family:form_x', 'افتعل': 'GT:form_family:form_viii',
         'انفعل': 'GT:form_family:form_vii', 'تفاعل': 'GT:form_family:form_vi', 'تفعل': 'GT:form_family:form_v',
         'فاعل': 'GT:form_family:form_iii', 'فعل': 'I', 'الثلاثي': 'I'}.items()}
WEAKCLS = {fold(k): v for k, v in {'الأجوف': 'hollow', 'الناقص': 'defective', 'المثال': 'mithal', 'المضعف': 'geminate',
           'المضاعف': 'geminate', 'المهموز': 'hamzated'}.items()}

def section_spec(section):
    """a head-less ṣarf section that names what its words are: «اسم المفعول من الثلاثي», «اسم الفاعل من أفعل»,
    «أفعل من الأجوف», «(أفعل) من الناقص», «أفعال الفعل الأجوف»"""
    t = plain(section or '')
    toks = [fold(x) for x in re.split(r'[\s()]+', t) if x]
    deriv = 'GT:derivation_type:active_participle' if 'اسم الفاعل' in t else 'GT:derivation_type:passive_participle' if 'اسم المفعول' in t else None
    weak = next((WEAKCLS[x] for x in toks if x in WEAKCLS), None)
    form = None
    m = re.search(r'من\s*\(?\s*(\S+?)\)?(?:\s|$)', t)
    if m and fold(m.group(1)) in VFORM: form = VFORM[fold(m.group(1))]
    elif toks and toks[0] in VFORM and toks[0] not in ('فعل', 'فاعل', 'الثلاثي') and not deriv: form = VFORM[toks[0]]
    if deriv: return dict(pos=('N', 'ADJ'), deriv=deriv, form=form, weak=None)
    if weak and (form or 'الفعل' in t or 'افعال' in toks):
        return dict(pos=('V',), deriv=None, form=form or 'I', weak=weak)
    return None

def weak_ok(root, cls):
    r = fold(root or '')
    if len(r) != 3: return False
    return {'hollow': r[1] in 'وي', 'defective': r[2] in 'وي', 'mithal': r[0] in 'وي', 'geminate': r[1] == r[2],
            'hamzated': 'ا' in r}[cls]

def by_spec(spec, pool):
    out = []
    for w in pool:
        if is_function(w) or not sane(w) or w['pos'] not in spec['pos']: continue
        ff = w.get('gt_form_family')
        if spec['form'] == 'I' and ff not in (None, 'GT:form_family:form_i'): continue
        if spec['form'] not in (None, 'I') and ff != spec['form']: continue
        if spec['deriv'] and w.get('gt_derivation_type') != spec['deriv']: continue
        if spec['weak'] and not weak_ok(w.get('root'), spec['weak']): continue
        out.append(w)
    return out

def lemma_key(w):
    return (w.get('lemma') or fold(w['word_text']), w.get('root'), w.get('gt_form_family'))

def pick(cands, kind, heads=()):
    """cands: [(score, w)] — the best-scoring lemma wins only if no other lemma ties it; the first place it stands"""
    if not cands: return None
    by = collections.defaultdict(list)
    for sc, w in cands: by[lemma_key(w)].append((sc, w))
    ranked = sorted(((max(s for s, _ in v), k) for k, v in by.items()), key=lambda x: -x[0])
    if len(ranked) > 1 and ranked[1][0] >= ranked[0][0]: return None
    occ = sorted((w for _, w in by[ranked[0][1]]), key=lambda x: x['word_index'])
    occ = list({w['word_index']: w for w in occ}.values())
    if len(occ) > 1:
        # the same lemma twice: the place written as the head is, else the first only when every place is the same word
        exact = [w for w in occ if fold(w['word_text']) in heads]
        if len(exact) == 1: return exact[0], kind
        # a noun with the article and without («الساعة … غير ساعة»): the one written as the head is
        det = [w for w in occ if bool(w.get('has_det_prefix')) == any(h.startswith('ال') for h in heads)]
        if w0 := (det[0] if det and len(det) < len(occ) else None): return w0, kind
    return occ[0], kind

def _weq(a, b):
    """equal, or equal but for a final weak letter (رمى / رماه, أوصى / أوصاني)"""
    return a == b or (len(a) >= 3 and len(b) >= 3 and a[-1] in 'اي' and b[-1] in 'اي' and a[:-1] == b[:-1])

def by_root(tokens, ws, pattern_term=None, verbal=None, allow_function=False, aligned=True):
    """the word whose root builds a heading word (the chapter's pattern scores it up), or the head word as it stands"""
    cands = []
    for w in ws:
        func = is_function(w)
        if func and not allow_function: continue
        if verbal is True and w['pos'] != 'V': continue
        if aligned and not sane(w): continue
        cs = cores(fold(w['word_text'], keep_ta=True))
        lf = fold(w.get('lemma') or '') if aligned else ''
        for t, f in tokens:
            ft = fold(t, keep_ta=True)
            surf = any(_weq(ft, c) for c in cs) or (ft.startswith('ال') and any(_weq(ft[2:], c) for c in cs)) or (lf and _weq(lf, f))
            fit = root_fit(f, w['root']) if (aligned and w.get('root') and not func) else None
            if func and not surf: continue
            if not fit and not surf: continue
            if fit:
                sm, wm, sk, ex = fit
                if sm < 2 and not surf and not (sk == 0 and ex == 0):
                    continue                               # a weak root: only with the word itself agreeing
                sc = sm * 3 + wm - sk - 0.5 * ex
            else:
                sc = 4
            if surf: sc += 3
            if pattern_term and aligned and w.get('gt_form_family') == pattern_term: sc += 2
            cands.append((sc, w))
    return cands

def locate(e, ws, quote_match):
    """(word, locate_kind) or (None, None)"""
    if not ws or (quote_match or 0) < 0.5: return None, None
    span = quote_span(e['quote'], ws)
    if not span: return None, None
    pool = span
    aligned = ayah_aligned(ws)
    disc, pat = e['discipline'], e.get('pattern_term')
    head = e.get('head')
    toks = content_tokens(head)
    ch = e.get('chapter') or ''
    verbal = True if (pat or 'الفعل' in ch or 'صيغة' in ch) else None

    if not aligned:            # the corpus's morphology slid off its words here: the head word as written, nothing else
        if toks:
            r = pick([(s, w) for s, w in by_root(toks, pool, None, None, allow_function=(disc == 'NH'), aligned=False)], 'surface', {f for _, f in toks})
            if r: return r
        return None, None

    # 1. a verb-form chapter: the word of the head's root on the chapter's pattern
    if pat and toks:
        cands = by_root(toks, pool, pat)
        on = [(s, w) for s, w in cands if w.get('gt_form_family') == pat]
        hf = {f for _, f in toks}
        r = pick(on, 'root_form', hf) or (pick(cands, 'root', hf) if not on else None)
        if r: return r
        return None, None
    if pat and not head:
        on = [w for w in pool if not is_function(w) and sane(w) and w.get('gt_form_family') == pat]
        if len(on) == 1: return on[0], 'form_only'
        return None, None
    # 2a. ṣarf, no head word: a section that says what its words are (a participle of a form, a weak verb of a form)
    if disc == 'SF' and not head:
        sp = section_spec(e.get('section'))
        if sp:
            c = by_spec(sp, pool)
            if len({lemma_key(w) for w in c}) == 1: return min(c, key=lambda x: x['word_index']), 'section_form'
            return None, None
    # 2. ṣarf: a pattern the heading names (the head, or a head-less section's «(…)»)
    if disc == 'SF':
        wz = [t for t in re.split(r'[\s()\[\]،,.:\-–]+', head or '') if t and is_wazn(t)]
        if not wz and not head:
            raw = e.get('section') or ''
            if not re.search(r'\(', raw):
                wz0 = [x for x in raw.split() if is_wazn(x)]
                rest = set(fold(x) for x in raw.split() if not is_wazn(x))
            else:              # «قراءات (فعل) من الشواذ», «(فَعَل) الاسم» — not «عمل اسم الفاعل من (فعل) النصب»
                wz0 = [t for x in re.findall(r'\(([^()]+)\)', raw) for t in x.split() if is_wazn(t)]
                rest = set(fold(x) for x in re.sub(r'\([^()]*\)', ' ', raw).split())
            if rest <= SECTION_OK: wz = wz0
        # a bare «فعل» / «فعلة» with no vowels names almost every trilateral noun: not enough to tell the word
        wz = [t for t in wz if not (fold(t) in ('فعل', 'فعله') and not any(v for c, v in wazn_of_head(t) if c in 'فع'))]
        about = head if head else (e.get('section') or '')
        if wz and not re.search('جمع|جموع|مصدر|مصادر', re.sub(r'(المصادر|المصدر|مصادر)(\s+التي)?\s+على', '', plain(about))):
            cands, blocked = [], False
            n_len = min(len(fold(t)) for t in wz)
            for w in pool:
                if is_function(w) or not sane(w): continue
                if verbal is True and w['pos'] != 'V': continue
                if verbal is None and w['pos'] not in ('N', 'ADJ'): continue
                ww = word_wazn(w)
                if ww is None:
                    # a weak or hamzated root: its pattern is not computed here, so it may be the word — unless far off
                    core = ''.join(fold(c) for c, _ in word_core(w))
                    if w.get('root') and abs(len(core) - n_len) <= 1: blocked = True
                    continue
                if any(wazn_match(wazn_of_head(t), ww) for t in wz): cands.append(w)
            if len({lemma_key(w) for w in cands}) == 1 and not blocked:
                return min(cands, key=lambda x: x['word_index']), 'wazn'
            return None, None
    # 3. the head word itself: by its root (or as written)
    if toks:
        r = pick(by_root(toks, pool, None, allow_function=(disc == 'NH')), 'root', {f for _, f in toks})
        if r:
            w, _ = r
            if is_function(w) or not w.get('root'): return w, 'surface'
            return r
        return None, None
    if disc == 'SF': return None, None
    # 4. naḥw: the particle the heading (or its section, or its chapter) studies
    sec = e.get('section')
    for src, allow_first in ((head, True), (sec, True), (ch if (sec == ch or not sec) else None, True)):
        p = particle_of(src, allow_first)
        if not p: continue
        kind, what, tag = p
        if kind == 'clitic' and src is not head and head:
            return None, None                      # a letter-particle only where the heading itself names it
        if kind == 'lemma':
            c = [w for w in pool if pkey(w.get('lemma')) in what and fold(w.get('lemma'))[:1] in fold(w['word_text'])]
            if tag:
                c2 = [w for w in c if w['pos'] in tag]
                c = c2 or c
        else:
            c = []
            for w in pool:
                f = fold(w['word_text'])
                if not (w.get('prefix_count') or 0) or len(f) < 3: continue
                for pre in ('', 'و', 'ف'):
                    if pre == what or not f.startswith(pre + what): continue
                    rt = fold(w.get('root') or '')
                    if not (rt and rt[0] == what and f.startswith(pre + rt[:2])):
                        c.append(w)
                    break
        if len(c) == 1: return c[0], 'particle'
        return None, None
    return None, None

entries, notes = [], []
BLK = [0]          # the head block a citation or a note belongs to: a note is about the citations of its block
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
                                  text='\n'.join(n[0] for n in own)[:1200], chunk=own[0][2], volume=own[0][3], page=own[0][4],
                                  blk=BLK[0]))
        BLK[0] += 1
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
                e = dict(discipline=disc, chunk=p['id'], volume=vol, page=page, chapter=chapter, section=section, head=head,
                         pattern=pat, pattern_term=pterm, meaning=mean, meaning_term=mterm, section_term=own_ctx.get('section_term'),
                         quote=quote[:400], quote_ok=quote_ok(quote, s, a), surah=s, ayah=a, refs=refs[:40], blk=BLK[0])
                w, how = locate(e, words.get((s, a), []), e['quote_ok'])
                e.update(word_index=w['word_index'] if w else None, word=w['word_text'] if w else None, locate_kind=how,
                         word_form=w.get('gt_form_family') if w else None)
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

# ── the āyāt a note discusses: the references it gives, the āyah text it quotes («﴿…﴾»), else the one
#    āyah its head word is cited from ─────────────────────────────────────────────────────────────
ayah_folds = {k: [fold(w['word_text']) for w in ws] for k, ws in words.items()}
where_word = collections.defaultdict(set)
for k, fw in ayah_folds.items():
    for f in fw: where_word[f].add(k)
by_blk = collections.defaultdict(list)
for e in entries: by_blk[e['blk']].append(e)

def stands_in(k, qt):
    """does the run of folded words qt stand, in order, in āyah k?"""
    fw = ayah_folds.get(k, [])
    return any(all(_eq(qt[j], fw[i + j]) for j in range(len(qt))) for i in range(len(fw) - len(qt) + 1))

def note_ayat(n):
    out, seen = [], set()
    def add(k, how, q=None):
        if k not in seen: seen.add(k); out.append(dict(surah=k[0], ayah=k[1], how=how, quote=q))
    for m in REF.finditer(n['text']):
        for k in parse_refs(m.group(1)): add(k, 'ref')
    near = []
    for e in by_blk.get(n['blk'], []):
        if e['quote_ok'] >= 0.5 and (e['surah'], e['ayah']) not in near: near.append((e['surah'], e['ayah']))
    for m in re.finditer('﴿([^﴾]+)﴾', n['text']):
        q = max(re.split(r'\.\.\.|…', m.group(1)), key=len).strip()
        qt = [fold(x) for x in plain(q).split() if fold(x)]
        if not qt: continue
        hit = [k for k in near if stands_in(k, qt)]
        if hit:
            for k in hit: add(k, 'quote_block', q)
            continue
        if len(qt) < 3 or len(''.join(qt)) < 10: continue          # too short to be told apart across the Qurʾān
        anchor = max(qt, key=len)
        ks = set()
        for v in (anchor, 'و' + anchor, 'ف' + anchor, anchor[1:] if anchor[:1] in 'وف' else anchor):
            ks |= where_word.get(v, set())
        ks = [k for k in ks if stands_in(k, qt)]
        if len(ks) == 1: add(ks[0], 'quote', q)
    if not out and len(near) == 1: add(near[0], 'block')
    return out

for n in notes: n['ayat'] = note_ayat(n)

# the rows' ids, as the table has them
per_chunk = collections.Counter()
for e in entries:
    per_chunk[e['chunk']] += 1
    e['id'] = f"ADM:{e['chunk']}:{per_chunk[e['chunk']]}"
for i, n in enumerate(notes): n['id'] = f'ADN:{i + 1}'

json.dump({'entries': len(entries), 'notes': len(notes), 'located': sum(1 for e in entries if e['word_index']),
           'by_kind': collections.Counter(e['locate_kind'] for e in entries if e['locate_kind']),
           'notes_with_ayat': sum(1 for n in notes if n['ayat']),
           'note_ayat_by_kind': collections.Counter(x['how'] for n in notes for x in n['ayat'])}, sys.stdout, ensure_ascii=False); print()
with open('adima_entries.jsonl', 'w') as f:
    for e in entries:
        e.pop('_fixed', None); f.write(json.dumps(e, ensure_ascii=False) + '\n')
with open('adima_notes.jsonl', 'w') as f:
    for n in notes: f.write(json.dumps(n, ensure_ascii=False) + '\n')

# ── SQL: the rows for ar_ling_adima_entry / ar_ling_adima_note (0110), ar_ling_adima_note_ayah (0115) ──
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

def emit_note_ayat():
    rows = [dict(note_id=n['id'], surah=x['surah'], ayah=x['ayah'], match_kind=x['how'], quote_ar=(x['quote'] or None) and x['quote'][:300])
            for n in notes for x in n['ayat']]
    for f in os.listdir(WORK):
        if re.match(r'adima_note_ayah_\d+\.sql$', f): os.remove(os.path.join(WORK, f))
    files = emit('adima_note_ayah', 'ar_ling_adima_note_ayah', list(rows[0].keys()), rows, per=100, per_file=3000)
    with open(files[0]) as f: body = f.read()
    with open(files[0], 'w') as f: f.write('DELETE FROM ar_ling_adima_note_ayah;\n' + body)
    return files

if '--sql' in sys.argv:
    erows = []
    for i, e in enumerate(entries):
        erows.append(dict(id=e['id'], discipline=e['discipline'], chunk_id=e['chunk'],
                          volume_no=e['volume'], page_no=e['page'], seq=i + 1, chapter_ar=e['chapter'], section_ar=e['section'],
                          head_ar=e['head'], pattern_ar=e['pattern'], pattern_term_id=e['pattern_term'], meaning_ar=e['meaning'],
                          meaning_term_id=e['meaning_term'], section_term_id=e['section_term'], quote_ar=e['quote'],
                          surah=e['surah'], ayah=e['ayah'], refs_json=json.dumps(e['refs']), word_index=e['word_index'],
                          word_ar=e['word'], quote_match=e['quote_ok'], locate_kind=e['locate_kind'], word_form_term_id=e['word_form']))
    nrows = [dict(id=n['id'], discipline=n['discipline'], chunk_id=n['chunk'], volume_no=n['volume'], page_no=n['page'],
                  chapter_ar=n['chapter'], section_ar=n['section'], head_ar=n['head'], pattern_ar=n.get('pattern'),
                  pattern_term_id=n.get('pattern_term'), meaning_ar=n.get('meaning'), meaning_term_id=n.get('meaning_term'),
                  section_term_id=n.get('section_term'), note_ar=n['text'], drill_ar=n['drill'], about_readings=n['about_readings'])
             for i, n in enumerate(notes)]
    fe = emit('adima_entry', 'ar_ling_adima_entry', list(erows[0].keys()), erows, per=100, per_file=8000)
    fn = emit('adima_note', 'ar_ling_adima_note', list(nrows[0].keys()), nrows, per=25, per_file=5000)
    print('files', fe + fn + emit_note_ayat())

if '--locate' in sys.argv:
    # the located word only, by id: the rows as they stand, their word_index / word_ar / locate_kind / word_form_term_id
    # set (and a stale one cleared) — 300 rows a statement, 1,500 a file
    for f in os.listdir(WORK):
        if re.match(r'adima_locate_\d+\.sql$', f): os.remove(os.path.join(WORK, f))
    stmts = []
    for i in range(0, len(entries), 300):
        vals = ',\n'.join(f"({lit(e['id'])},{lit(e['word_index'])},{lit(e['word'])},{lit(e['locate_kind'])},{lit(e['word_form'])})"
                          for e in entries[i:i + 300])
        stmts.append(f'WITH v(id, wi, wa, lk, wf) AS (VALUES\n{vals})\n'
                     f'UPDATE ar_ling_adima_entry SET word_index = v.wi, word_ar = v.wa, locate_kind = v.lk, word_form_term_id = v.wf\n'
                     f'  FROM v WHERE ar_ling_adima_entry.id = v.id;')
    files = []
    for k in range(0, len(stmts), 5):
        p = f'adima_locate_{len(files):02d}.sql'
        open(p, 'w').write('\n'.join(stmts[k:k + 5]) + '\n'); files.append(p)
    print('files', files + emit_note_ayat())


if '--apply' in sys.argv:
    kinds = 'locate|note_ayah' if '--locate' in sys.argv else 'entry|note|note_ayah'
    for f in sorted(x for x in os.listdir(WORK) if re.match(rf'adima_({kinds})_\d+\.sql$', x)):
        subprocess.run(['npx', 'wrangler', 'd1', 'execute', 'km_arabic_linguistic', '--remote', '--file', os.path.join(WORK, f)],
                       cwd=os.path.join(ROOT, 'workers', 'ar-linguistics'), check=True)
