import re
D=re.compile(r'[ً-ْٰـ۟-ۭ]')
def strip(s): return D.sub('',s or '')
