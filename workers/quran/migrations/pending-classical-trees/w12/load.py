import json
def load(p):
    s=open(p).read().strip()
    try:
        d=json.loads(s)
        if isinstance(d,list) and d and isinstance(d[0],dict) and 'results' in d[0]: return d[0]['results']
        return d
    except Exception:
        return [json.loads(l) for l in s.splitlines() if l.strip()]
