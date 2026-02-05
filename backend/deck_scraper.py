import requests
from bs4 import BeautifulSoup
import os
import time
import re
import urllib.parse

# ユーザーエージェント
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

def search_and_save_official(keyword, save_dir):
    """
    キーワードで公式サイトを検索し、結果ページにあるカードを全て保存する。
    戻り値: 保存したカード情報のリスト [{"name":..., "filename":...}, ...]
    """
    print(f"[*] Searching official site for: {keyword}")
    
    # 公式カード検索URL
    url = f"https://dm.takaratomy.co.jp/card/?keyword={urllib.parse.quote(keyword)}"
    
    found_cards = []
    
    try:
        res = requests.get(url, headers=HEADERS)
        res.raise_for_status()
        soup = BeautifulSoup(res.text, 'html.parser')

        # 検索結果のリストを取得
        # 公式サイトの構造: #cardlist .result_area > ul > li
        result_items = soup.select('#cardlist .result_area li')
        
        print(f"[*] Found {len(result_items)} results on page.")

        for item in result_items:
            # カード名取得
            name_tag = item.select_one('.card_name')
            if not name_tag:
                continue
            card_name = name_tag.get_text(strip=True)
            
            # 画像取得
            img_tag = item.select_one('.card_img img')
            if not img_tag:
                # 画像がない（lazyload等）場合のバックアップ
                img_tag = item.select_one('img')
            
            if img_tag and img_tag.get('src'):
                img_url = img_tag['src']
                if not img_url.startswith('http'):
                    img_url = 'https://dm.takaratomy.co.jp' + img_url
                
                # 保存ファイル名決定
                safe_name = re.sub(r'[\\/:*?"<>|]', '_', card_name)
                # 同名カードがある場合は連番などをつけるべきだが、今回はシンプルに上書きorスキップ
                filename = f"{safe_name}.jpg"
                save_path = os.path.join(save_dir, filename)
                
                # 画像ダウンロード（まだ持ってない場合のみ）
                if not os.path.exists(save_path):
                    print(f"   -> Downloading: {card_name}")
                    try:
                        time.sleep(0.5) # 優しさウェイト
                        img_data = requests.get(img_url, headers=HEADERS).content
                        with open(save_path, 'wb') as f:
                            f.write(img_data)
                    except Exception as e:
                        print(f"   [!] Failed to download {card_name}: {e}")
                        continue
                else:
                    # print(f"   -> Cached: {card_name}")
                    pass

                found_cards.append({
                    "name": card_name,
                    "filename": filename
                })

        return found_cards

    except Exception as e:
        print(f"[!] Error accessing official site: {e}")
        return []
