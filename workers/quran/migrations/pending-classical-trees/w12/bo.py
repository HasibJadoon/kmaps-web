# search printing ORIGINAL text around matches
import sys,re
from bs import data,norm
def nmap(s):
    out=[];idx=[]
    for i,c in enumerate(s):
        n=norm(c)
        for ch in n: out.append(ch); idx.append(i)
    return ''.join(out),idx
def search(pat,bks,before=150,after=250,maxn=15):
    rp=re.compile(norm(pat))
    for k in bks:
        n=0
        for r in data[k]:
          for fld in ('body','footnotes'):
            b=r.get(fld) or ''
            nb,idx=nmap(b)
            for m in rp.finditer(nb):
                n+=1
                if n>maxn: break
                s=idx[max(0,m.start()-before)] if m.start()>0 else 0
                e=idx[min(len(idx)-1,m.end()+after)]
                print(f"\n[{k} ج{r['part']} ص{r['page_num']} {'FN' if fld=='footnotes' else ''}] {b[s:e]}".replace('\r',' / '))
        print(f'-- {k}: {n} hits')
if __name__=='__main__':
    pat=sys.argv[1]; bks=sys.argv[2].split(',') if len(sys.argv)>2 else ['2611','3742','4064']
    bf=int(sys.argv[3]) if len(sys.argv)>3 else 150; af=int(sys.argv[4]) if len(sys.argv)>4 else 250
    search(pat,bks,bf,af)
