import requests
from bs4 import BeautifulSoup

# エラーになった最初のページのURLを直接指定
TARGET_URL = "https://dm.takaratomy.co.jp/card/detail/?id=dm25rp4-ChoSec01"

def main():
    print(f"Debugging: {TARGET_URL}")
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }

    try:
        res = requests.get(TARGET_URL, headers=headers)
        res.encoding = res.apparent_encoding # 日本語文字化け対策

        print(f"Status Code: {res.status_code}")
        
        soup = BeautifulSoup(res.text, 'html.parser')

        # 1. ページのタイトルを確認（ここにあればラッキー）
        print(f"\n[Page Title]: {soup.title.string if soup.title else 'No Title Tag'}")

        # 2. H1タグを確認
        h1 = soup.select_one("h1")
        print(f"[H1 Tag]: {h1}")

        # 3. HTMLの中に「アビス」という文字が含まれているか強制検索
        # （これで見つかれば、データはあるけどタグが違うということ）
        if "アビス" in res.text:
            print("\n[Check]: 'アビス' found in HTML source! (Data exists)")
            
            # 「アビス」が含まれる周辺のHTMLタグを表示して特定する
            # 正規表現で雑に抽出
            import re
            match = re.search(r'([^<>]{0,50}アビス[^<>]{0,50})', res.text)
            if match:
                print(f"[Context]: ...{match.group(1)}...")
        else:
            print("\n[Check]: 'アビス' NOT found. (JavaScript required or Blocked)")

        # 4. H2や特定のクラスも念のため確認
        print(f"[H2 Tag]: {soup.select_one('h2')}")
        print(f"[Class 'card-name']: {soup.select_one('.card-name')}")
        print(f"[Class 'name']: {soup.select_one('.name')}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()

