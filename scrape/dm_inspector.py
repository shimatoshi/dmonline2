import requests
from bs4 import BeautifulSoup
import re

# 前回成功した詳細ページのURL
TARGET_URL = "https://dm.takaratomy.co.jp/card/detail/?id=dm25rp4-ChoSec01"

def main():
    print(f"Inspecting Specs: {TARGET_URL}")
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
    }

    try:
        res = requests.get(TARGET_URL, headers=headers)
        res.encoding = res.apparent_encoding
        soup = BeautifulSoup(res.text, 'html.parser')

        print("\n--- Searching for Keywords ---")
        
        # 主要なキーワードを探し、その親要素を表示する
        keywords = ["パワー", "コスト", "文明", "種族", "特殊能力", "フレーバー"]
        
        for key in keywords:
            # テキストとしてキーワードを含む要素を探す
            # 完全に一致するものや、ラベルっぽいものを探す
            elements = soup.find_all(string=re.compile(key))
            
            print(f"\n[Keyword: {key}] Found {len(elements)} locations.")
            for i, text_node in enumerate(elements[:3]): # 最初3つだけ表示
                parent = text_node.parent
                print(f"  Location {i+1}: <{parent.name} class='{parent.get('class')}'>")
                print(f"  Content: {parent.get_text(strip=True)[:50]}...")
                
                # その「次」の要素に値が入っていることが多いので確認
                if parent.next_sibling:
                    print(f"    Next Sibling: {str(parent.next_sibling)[:50]}...")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
