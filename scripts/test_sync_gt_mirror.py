"""Check the QAC flag expansion against the table it replaces.

Fixtures are the real registry rows and the real 47 flags the corpus emits, so
this pins the two things most likely to break silently: the (qac_scope,
qac_flag) keying that stops 'P' resolving to harf_jarr instead of plural, and
the exact set of rows the expansion is expected to differ by.

    python3 scripts/test_sync_gt_mirror.py
"""

import importlib.util
import pathlib
spec = importlib.util.spec_from_file_location("sync", pathlib.Path(__file__).with_name("sync_gt_mirror.py"))
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)

terms = [
 ("GT:form_family:form_i","(I)","stem_flag"),("GT:form_family:form_ii","(II)","stem_flag"),
 ("GT:form_family:form_iii","(III)","stem_flag"),("GT:form_family:form_iv","(IV)","stem_flag"),
 ("GT:form_family:form_ix","(IX)","stem_flag"),("GT:form_family:form_v","(V)","stem_flag"),
 ("GT:form_family:form_vi","(VI)","stem_flag"),("GT:form_family:form_vii","(VII)","stem_flag"),
 ("GT:form_family:form_viii","(VIII)","stem_flag"),("GT:form_family:form_x","(X)","stem_flag"),
 ("GT:form_family:form_xi","(XI)","stem_flag"),("GT:form_family:form_xii","(XII)","stem_flag"),
 ("GT:person:first","1","stem_flag"),("GT:person:second","2","stem_flag"),
 ("GT:person:third","3","stem_flag"),("GT:case:accusative","ACC","stem_flag"),
 ("GT:voice:active","ACT","stem_flag"),("GT:derivation_type:active_participle","ACT|PCPL","stem_flag"),
 ("GT:number:dual","D","stem_flag"),("GT:gender:feminine","F","stem_flag"),
 ("GT:case:genitive","GEN","stem_flag"),("GT:tense:imperfect","IMPF","stem_flag"),
 ("GT:definiteness:indefinite","INDEF","stem_flag"),("GT:gender:masculine","M","stem_flag"),
 ("GT:mood:jussive","MOOD:JUS","stem_flag"),("GT:mood:subjunctive","MOOD:SUBJ","stem_flag"),
 ("GT:case:nominative","NOM","stem_flag"),("GT:number:plural","P","stem_flag"),
 ("GT:voice:passive","PASS","stem_flag"),("GT:derivation_type:passive_participle","PASS|PCPL","stem_flag"),
 ("GT:tense:perfect","PERF","stem_flag"),("GT:number:singular","S","stem_flag"),
 ("GT:derivation_type:masdar","VN","stem_flag"),("GT:tense:imperative","IMPV","both"),
 # the collision traps: same flag string, different scope
 ("GT:pos:harf_jarr","P","pos"),("GT:harf_maani:harf_nasb","ACC","segment_tag"),
 ("GT:definiteness:definite","DET","segment_tag"),
]
terms = [dict(zip(("id","qac_flag","qac_scope"), t)) for t in terms]

CORPUS = "(II) (III) (IV) (IX) (V) (VI) (VII) (VIII) (X) (XI) (XII) 1P 1S 2D 2FD 2FP 2FS 2MD 2MP 2MS 3D 3FD 3FP 3FS 3MD 3MP 3MS ACC ACT F FD FP FS GEN IMPF IMPV INDEF M MD MP MS NOM P PASS PCPL PERF VN".split()
flags = sorted(set(CORPUS) | {"MOOD:JUS", "MOOD:SUBJ"})

got = {f"{f}>{i}" for f, ids in m.decompose(flags, terms).items() for i in ids}
# The two PCPL rows are removed on purpose — see HANDLED_BY_VIEW in the script.
INTENTIONALLY_DROPPED = {"PCPL>GT:derivation_type:active_participle",
                         "PCPL>GT:derivation_type:passive_participle"}
want = set(pathlib.Path(__file__).with_name("_decomp_baseline.txt").read_text().strip().split(";"))

print(f"derived {len(got)} rows · baseline {len(want)} rows")
assert got - want == set(), f"unexpected new rows: {sorted(got - want)}"
assert want - got == INTENTIONALLY_DROPPED, f"unexpected losses: {sorted((want - got) - INTENTIONALLY_DROPPED)}"
print("differs from baseline by exactly the 2 intended PCPL rows  OK")
# the collision must resolve to the stem-flag sense, not the POS/segment one
assert m.decompose(["P"], terms)["P"] == ["GT:number:plural"], "P resolved to harf_jarr!"
assert m.decompose(["ACC"], terms)["ACC"] == ["GT:case:accusative"], "ACC resolved to harf_nasb!"
print("collision guards: P -> number:plural, ACC -> case:accusative  OK")


# ── the replica must stay structurally identical to the registry ─────────────
# "Same table name and structure" is the requirement; this is what enforces it.
# Both sides are built in a real database and read back out of sqlite_master, so
# the comparison is between what SQLite actually created, not what the files
# appear to say.
import re, sqlite3

CATEGORY = """CREATE TABLE "ar_ling_gram_category" (
  category_key TEXT PRIMARY KEY, name_ar TEXT NOT NULL, name_en TEXT NOT NULL,
  name_ur TEXT NOT NULL, discipline TEXT NOT NULL, applies_to TEXT NOT NULL,
  is_closed INTEGER NOT NULL DEFAULT 1, display_order INTEGER NOT NULL DEFAULT 0,
  icon TEXT);"""

def _norm(ddl):
    return re.sub(r"\s+", " ", ddl.replace("IF NOT EXISTS ", "").replace('"', "")).strip().rstrip(";")

def _built(script):
    db = sqlite3.connect(":memory:")
    db.executescript(CATEGORY + "\n" + script)
    return db.execute("SELECT sql FROM sqlite_master WHERE name='ar_ling_gram_term'").fetchone()[0]

_here = pathlib.Path(__file__).parent
want = _built(_here.joinpath("_gram_term_ddl_baseline.txt").read_text())

mig = (_here.parent / "workers/quran/migrations/0010_gt_mirror.sql").read_text()
got = _built(re.search(r'CREATE TABLE IF NOT EXISTS "ar_ling_gram_term".*?\n\);', mig, re.S).group(0))

assert _norm(got) == _norm(want), (
    "the replica DDL has diverged from the registry\n"
    f"  registry: {_norm(want)}\n  replica:  {_norm(got)}")
print("replica DDL structurally identical to the registry  OK")
