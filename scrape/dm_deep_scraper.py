import os
import time
import re
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

# --- 設定 ---
SAVE_DIR = "card_images_final"
# ターゲット: 最新弾や検索結果のURLを入れてください
TARGET_URL = "https://dm.takaratomy.co.jp/card/" 
SLEEP_TIME = 1.5 # アクセス回数が増えるので、少し長めに待機

def sanitize_filename(name):
    # ファイル名に使えない文字を置換
    name = re.sub(r'[\\/*?:"<>|]', '_', name)
    # 改行や空白を整理
    name = name.replace('\n', '').replace('\r', '').strip()
    return name

def get_card_name_from_detail(detail_url, headers):
    """詳細ページにアクセスしてカード名を取得する"""
    try:
        time.sleep(SLEEP_TIME) # サーバー負荷軽減
        res = requests.get(detail_url, headers=headers, timeout=10)
        res.encoding = res.apparent_encoding
        if res.status_code != 200:
            return None
        
        soup = BeautifulSoup(res.text, 'html.parser')
        
        # 詳細ページのH1タグにカード名が入っている可能性が高い
        # ユーザー提供のテキスト情報から推測
        h1 = soup.select_one("h1")
        if h1:
            return h1.get_text(strip=True)
        
        # H1がない場合の保険: titleタグから取る
        if soup.title:
            return soup.title.get_text(strip=True).split("|")[0]
            
        return None
    except Exception as e:
        print(f"[Warning] Failed to get details from {detail_url}: {e}")
        return None

def download_image(img_url, card_name):
    if not os.path.exists(SAVE_DIR):
        os.makedirs(SAVE_DIR)

    ext = ".jpg" # デフォルト
    if ".png" in img_url: ext = ".png"

    base_filename = sanitize_filename(card_name)
    if not base_filename: return

    # ファイル名が長すぎるとOSエラーになるので制限
    if len(base_filename) > 100:
        base_filename = base_filename[:100]

    filename = f"{base_filename}{ext}"
    save_path = os.path.join(SAVE_DIR, filename)

    # 重複回避
    counter = 1
    while os.path.exists(save_path):
        filename = f"{base_filename}_{counter}{ext}"
        save_path = os.path.join(SAVE_DIR, filename)
        counter += 1

    try:
        res = requests.get(img_url, timeout=10)
        if res.status_code == 200:
            with open(save_path, 'wb') as f:
                f.write(res.content)
            print(f"[OK] Saved: {filename}")
        else:
            print(f"[Error] Image fetch failed: {img_url}")
    except Exception as e:
        print(f"[Error] Save failed: {e}")

def main():
    print(f"Deep Scraping Target: {TARGET_URL}")
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }

    try:
        res = requests.get(TARGET_URL, headers=headers)
        res.encoding = res.apparent_encoding
        soup = BeautifulSoup(res.text, 'html.parser')

        # data-href属性を持つimgタグ（カード画像）を探す
        # class="cardImage" を指定して精度を上げる
        images = soup.select("img.cardImage")
        
        print(f"Found {len(images)} potential cards. Starting deep crawl...")

        count = 0
        for img in images:
            img_url = img.get("data-src") or img.get("src")
            detail_path = img.get("data-href")

            # 画像URLと詳細ページパスの両方がある場合のみ実行
            if img_url and detail_path:
                # URLの絶対パス化
                if not img_url.startswith("http"):
                    img_url = urljoin(TARGET_URL, img_url)
                
                full_detail_url = urljoin(TARGET_URL, detail_path)

                print(f"Processing ({count+1}): Checking detail page...")
                
                # 詳細ページから名前を取得
                card_name = get_card_name_from_detail(full_detail_url, headers)
                
                if card_name:
                    download_image(img_url, card_name)
                    count += 1
                else:
                    print(f"[Skip] Name not found for {detail_path}")

    except Exception as e:
        print(f"Fatal Error: {e}")

if __name__ == "__main__":
    main()
