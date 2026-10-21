"""新図鑑用の共通カードデータを生成する。
usage: python3 build_new_zukan.py カード正式名対応表.json
出力: ../public/data/official_cards.json (公式カード全件。img=既存GitHub画像があればそれ、無ければ空)"""
import json,sys,os
D=os.path.join(os.path.dirname(os.path.abspath(__file__)),"official_cards")
off={**json.load(open(D+"/cards.json")),**json.load(open(D+"/cards_extra.json"))}
gh={}
for m in json.load(open(sys.argv[1]))["mapping"]:
    for i in m["official_ids"]: gh.setdefault(i,m["url"])
keys=("id","name","pack","type","civil","rarelity","power","cost","race","text")
out=[]
for i,c in off.items():
    if not c.get("name"): continue
    d={k:c.get(k) for k in keys}
    d["img"]=gh.get(i) or ""
    out.append(d)
dst=os.path.join(os.path.dirname(os.path.abspath(__file__)),"..","public","data"); os.makedirs(dst,exist_ok=True)
json.dump(out,open(dst+"/official_cards.json","w"),ensure_ascii=False,separators=(",",":"))
print(len(out),sum(1 for d in out if d["img"]))
