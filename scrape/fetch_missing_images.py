"""GitHub画像が無い公式カードの画像を1回だけ取得する(1秒間隔・再開可能)。
usage: python3 fetch_missing_images.py ../public/data/official_cards.json
公式側のIDは official_cards/cards*.json の images[0] を使う。"""
import json,os,sys,time,urllib.request
D=os.path.join(os.path.dirname(os.path.abspath(__file__)),"official_cards")
off={**json.load(open(D+"/cards.json")),**json.load(open(D+"/cards_extra.json"))}
need=[c["id"] for c in json.load(open(sys.argv[1])) if not c["img"]]
os.makedirs(D+"/images",exist_ok=True)
for n,i in enumerate(need):
    for p in off[i].get("images",[])[:1]:
        f=D+"/images/"+os.path.basename(p)
        if os.path.exists(f): continue
        try:
            time.sleep(1)
            open(f,"wb").write(urllib.request.urlopen(urllib.request.Request("https://dm.takaratomy.co.jp"+p,headers={"User-Agent":"Mozilla/5.0"}),timeout=30).read())
        except Exception as e: print("ERR",i,e,flush=True)
    if n%50==0: print(n,len(need),flush=True)
print("DONE",flush=True)
