import sys,subprocess,json
sys.path.insert(0,'/private/tmp/claude-501/-Users-abdulhasibahmedjadoon-Documents-LLM--Repositories/73a64ff3-0b6a-49e3-a716-d8abcb8410d5/scratchpad/w')
def q(sql,db='q'):
    out=subprocess.run(['/private/tmp/claude-501/-Users-abdulhasibahmedjadoon-Documents-LLM--Repositories/73a64ff3-0b6a-49e3-a716-d8abcb8410d5/scratchpad/ssbuild/w12/q12.sh',sql,db],capture_output=True,text=True).stdout.strip()
    try:
        d=json.loads(out)
        if isinstance(d,list) and d and isinstance(d[0],dict) and 'results' in d[0]: return d[0]['results']
        if isinstance(d,dict) and 'error' in d: raise SystemExit(json.dumps(d,ensure_ascii=False)[:800])
        return d
    except json.JSONDecodeError:
        return [json.loads(l) for l in out.splitlines() if l.strip()]
if __name__=='__main__':
    db=sys.argv[2] if len(sys.argv)>2 else 'q'
    for r in q(sys.argv[1],db): print(json.dumps(r,ensure_ascii=False))
