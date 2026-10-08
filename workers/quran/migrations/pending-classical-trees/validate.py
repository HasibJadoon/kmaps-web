"""Apply an agent's SQL to a copy of the exported tables and check every tree it touches.
usage: validate.py <base.db> <taxonomy.sql or -> <file.sql>"""
import re, shutil, sqlite3, subprocess, sys, collections

base, tax, sql = sys.argv[1], sys.argv[2], sys.argv[3]
test = sql + '.check.db'
shutil.copy(base, test)
errors = []
for f in ([tax] if tax != '-' else []) + [sql]:
    r = subprocess.run(['sqlite3', '-bail', test], stdin=open(f), capture_output=True, text=True)
    if r.returncode or r.stderr.strip():
        errors.append(f'{f.split("/")[-1]}: {r.stderr.strip()[:400]}')
db = sqlite3.connect(test)
text = open(sql).read()
trees = sorted(set(re.findall(r"QR:TR:[^'\s]+", text)) | {r[0] for r in db.execute(
    "SELECT DISTINCT tree_id FROM qr_ss_tree_node WHERE id IN (SELECT value FROM json_each(?))",
    [str(re.findall(r"'(QR:SSN:[^']+)'", text)).replace("'", '"')])})
terms = {r[0] for r in db.execute('SELECT id FROM ar_ling_gram_term')}
words = {r[0]: r[1:] for r in db.execute('SELECT id, surah, ayah, word_index FROM qr_word_occurrence')}
problems = collections.defaultdict(list)
for t in trees:
    sent = db.execute('SELECT sentence_id FROM qr_ss_tree WHERE id = ?', [t]).fetchone()
    if not sent:
        problems[t].append('no qr_ss_tree row'); continue
    nodes = {r[0]: r for r in db.execute(
        'SELECT id, parent_node_id, depth, node_order, gram_term_ref, term_key, word_occurrence_id FROM qr_ss_tree_node WHERE tree_id = ?', [t])}
    roots = [n for n in nodes.values() if n[1] is None]
    if len(roots) != 1: problems[t].append(f'{len(roots)} roots')
    for n in nodes.values():
        if n[1] is not None and n[1] not in nodes: problems[t].append(f'parent missing: {n[0]}')
        elif n[1] is not None and nodes[n[1]][2] + 1 != n[2]: problems[t].append(f'depth off: {n[0]}')
        if n[4] and n[4] not in terms: problems[t].append(f'unknown term {n[4]} on {n[0]}')
        if n[6] and n[6] not in words: problems[t].append(f'unknown word on {n[0]}')
    s = db.execute('SELECT surah, ayah_from, ayah_to, word_start_index, word_end_index, gt_kalam_kind FROM qr_ss_occ_sentence WHERE id = ?', [sent[0]]).fetchone()
    if s and s[5] and s[5] not in terms: problems[t].append(f'unknown balāgha type {s[5]}')
    # every word of a one-āyah sentence carried by exactly one node
    if s and s[1] == s[2] and s[3] is not None and s[4] is not None:
        held = collections.Counter(words[n[6]][2] for n in nodes.values() if n[6] in words and words[n[6]][1] == s[1])
        missing = [i for i in range(s[3], s[4] + 1) if not held.get(i)]
        twice = [i for i, c in held.items() if c > 1]
        if missing: problems[t].append(f'words not in tree: {missing}')
        if twice: problems[t].append(f'words carried twice: {twice}')
untyped = [r[0] for r in db.execute(
    "SELECT s.id FROM qr_ss_occ_sentence s JOIN qr_ss_tree t ON t.sentence_id = s.id WHERE t.id IN (SELECT value FROM json_each(?)) AND s.gt_kalam_kind IS NULL",
    [str(trees).replace("'", '"')])]
print(f'{sql.split("/")[-1]}: {len(trees)} trees · sql errors {len(errors)} · trees with problems {len(problems)} · untyped sentences {len(untyped)}')
for e in errors: print('  ERROR', e)
for t, ps in list(problems.items())[:40]: print(' ', t, '|', '; '.join(ps[:4]))
