"""図鑑カード名を公式検索で正式名に解決する(再開可能・1秒間隔)。
usage: python3 resolve_names.py library.json
出力: official_cards/search_cache.json (名前->ID配列), official_cards/cards_extra.json (ID->詳細)"""
import urllib.request,urllib.parse,re,sys,json,time,os
src=open(os.path.join(os.path.dirname(os.path.abspath(__file__)),"fetch_official_cards.py"),encoding="utf-8").read()
exec(src[:src.index("ids=json.load")])  # get/parse/BASE/OUT を再利用
def search(q):
    body=urllib.parse.urlencode({"keyword":q,"keyword_type[]":"card_name","pagenum":1,"samename":"show"}).encode()
    h=urllib.request.urlopen(urllib.request.Request(BASE+"/card/",data=body,headers=UA),timeout=30).read().decode()
    return list(dict.fromkeys(re.findall(r"card/detail/\?id=([^'\"&]+)",h)))
def load(p): return json.load(open(p)) if os.path.exists(p) else {}
sc_p,ex_p=OUT+"/search_cache.json",OUT+"/cards_extra.json"
sc,ex,base=load(sc_p),load(ex_p),load(OUT+"/cards.json")
lib=json.load(open(sys.argv[1]))
names=list(dict.fromkeys(c["name"].strip() for c in lib if c.get("name")))
for n,q in enumerate(names):
    try:
        if q not in sc: time.sleep(1); sc[q]=search(q)
        for i in sc[q][:8]:
            if i not in base and i not in ex: time.sleep(1); ex[i]=parse(get(f"{BASE}/card/detail/?id={i}").decode(),i)
    except Exception as e: print("ERR",q,e,flush=True)
    if n%20==0:
        print(n,len(names),flush=True); json.dump(sc,open(sc_p,"w"),ensure_ascii=False); json.dump(ex,open(ex_p,"w"),ensure_ascii=False)
json.dump(sc,open(sc_p,"w"),ensure_ascii=False); json.dump(ex,open(ex_p,"w"),ensure_ascii=False); print("DONE",flush=True)
