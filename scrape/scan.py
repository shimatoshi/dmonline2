import requests
from bs4 import BeautifulSoup

url = "https://dm.takaratomy.co.jp/card/detail/?id=dm25rp4-ChoSec01"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}

def scan_full_structure():
    try:
        print(f"Fetching: {url} ...")
        res = requests.get(url, headers=headers)
        res.encoding = res.apparent_encoding
        soup = BeautifulSoup(res.text, "html.parser")

        print("\n--- 1. カード名の特定 (h3タグの確認) ---")
        # ユーザーの記憶にある h3 をすべてリストアップ
        h3_tags = soup.find_all("h3")
        for i, h3 in enumerate(h3_tags):
            print(f"[h3 found] index:{i} | class: {h3.get('class')} | text: {h3.get_text(strip=True)}")

        print("\n--- 2. スペック表周辺の全容 ---")
        # さっき見つけた「文明」のあるテーブルを再度捕まえる
        target_keyword = "文明"
        marker = soup.find(string=lambda t: t and target_keyword in t)
        
        if marker:
            # テーブルを見つける
            table = marker.find_parent("table")
            if table:
                # 【重要】テーブルの「親」だけでなく「親の親（ラッパー）」を取得して、兄弟要素（テキストなど）も表示する
                wrapper = table.parent
                # もし親がただのdivなら、もう一つ上の階層を見る（確実性を高めるため）
                if wrapper.name == 'div':
                    wrapper = wrapper.parent
                
                print(f"Container Tag: <{wrapper.name} class='{wrapper.get('class')}'>")
                print("-" * 30)
                # 構造が見やすいように整形して表示（全容が見えるはず）
                print(wrapper.prettify()) 
                print("-" * 30)
            else:
                print("Table parent not found.")
        else:
            print("Marker '文明' not found.")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    scan_full_structure()
