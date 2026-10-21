"""公式カード詳細(名前/文明/コスト/種族/能力テキスト)と画像を保存する。1秒間隔。
usage: python3 fetch_official_cards.py ids.json   (ids.json = カードID配列)"""
import urllib.request,re,sys,json,time,html,os
UA={"User-Agent":"Mozilla/5.0"}
BASE="https://dm.takaratomy.co.jp"
OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)),"official_cards")
def get(url):
    return urllib.request.urlopen(urllib.request.Request(url,headers=UA),timeout=30).read()
txt=lambda s:html.unescape(re.sub(r'\s+',' ',re.sub(r'<br\s*/?>|</li>','\n',s).replace('　',' '))) if False else html.unescape(re.sub(r'<[^>]+>','',re.sub(r'<br\s*/?>|</li>','\n',s))).strip()
def parse(h,i):
    h=h[h.find("class='cardDetail'"):]
    m=re.search(r"<h3 class='card-name'>(.*?)(?:<span class='packname'>\((.*?)\)</span>)?</h3>",h,re.S)
    d={"id":i,"name":txt(m.group(1)) if m else None,"pack":m.group(2) if m else None}
    for k in ("type","civil","rarelity","power","cost","mana","race","illusttxt"):
        x=re.search(r"<td[^>]*class='%s'[^>]*>(.*?)</td>"%k,h,re.S); d[k]=txt(x.group(1)) if x else None
    x=re.search(r"class='skills full'>(.*?)</td>",h,re.S); d["text"]=txt(x.group(1)) if x else None
    x=re.search(r"class='flavor full'>(.*?)</td>",h,re.S); d["flavor"]=txt(x.group(1)) if x else None
    d["images"]=list(dict.fromkeys(re.findall(r'src="(/wp-content/card/cardimage/[^"]+)"',h)))
    return d
ids=json.load(open(sys.argv[1])); dp=OUT+"/cards.json"
data=json.load(open(dp)) if os.path.exists(dp) else {}
for n,i in enumerate(ids):
    try:
        if i not in data:
            time.sleep(1); data[i]=parse(get(f"{BASE}/card/detail/?id={i}").decode(),i)
        for p in data[i]["images"]:
            f=OUT+"/images/"+os.path.basename(p)
            if not os.path.exists(f):
                time.sleep(1); open(f,"wb").write(get(BASE+p))
    except Exception as e: print("ERR",i,e,flush=True)
    if n%20==0: print(n,len(ids),flush=True); json.dump(data,open(dp,"w"),ensure_ascii=False,indent=1)
json.dump(data,open(dp,"w"),ensure_ascii=False,indent=1); print("DONE",flush=True)
