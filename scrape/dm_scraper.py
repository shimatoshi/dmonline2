import os
import time
import re
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

# --- 設定 ---
SAVE_DIR = "card_images_final"
TARGET_URL = "https://dm.takaratomy.co.jp/card/" 
SLEEP_TIME = 1.0 # 少しだけペース上げます

def sanitize_filename(name):
    # ファイルシステムで禁止されている文字を置換
    # スラッシュ(/)はディレクトリ区切りになるので特に重要
    name = re.sub(r'[\\/*?:"<>|]', '_', name)
    # 改行や空白を削除
    name = name.replace('\n', '').replace('\r', '').strip()
    return name

def get_card_name_from_detail(detail_url, headers):
    """詳細ページから正確なカード名を抜き出す"""
    try:
        # 詳細ページへアクセス
        res = requests.get(detail_url, headers=headers, timeout=10)
        res.encoding = res.apparent_encoding # 日本語文字化け防止
        
        if res.status_code != 200:
            return None
        
        soup = BeautifulSoup(res.text, 'html.parser')
        
        # 【修正箇所】H3タグのclass="card-name"を狙い撃ち
        # これで「アビスラブ=ジャシン帝(DM25RP4 超㊙1/超㊙10)」まで全部取れます
        name_tag = soup.select_one("h3.card-name")
        
        if name_tag:
            return name_tag.get_text(strip=True)
        
        # 万が一H3が取れなかった場合の保険（タイトルから取得）
        if soup.title:
            title_text = soup.title.get_text(strip=True)
            # " | デュエル・マスターズ" という余計な文言を削除
            return title_text.replace(" | デュエル・マスターズ", "")
            
        return None

    except Exception as e:
        print(f"[Warning] Detail page error: {e}")
        return None

def download_image(img_url, card_name):
    if not os.path.exists(SAVE_DIR):
        os.makedirs(SAVE_DIR)

    ext = ".jpg"
    if ".png" in img_url: ext = ".png"

    base_filename = sanitize_filename(card_name)
    if not base_filename: return

    # 長すぎるファイル名のカット（Android/Linuxの上限対策）
    if len(base_filename) > 120:
        base_filename = base_filename[:120]

    filename = f"{base_filename}{ext}"
    save_path = os.path.join(SAVE_DIR, filename)

    # 既にファイルがある場合はスキップする（時短のため）
    if os.path.exists(save_path):
        print(f"[Skip] Already exists: {filename}")
        return

    try:
        # 画像ダウンロード
        res = requests.get(img_url, timeout=10)
        if res.status_code == 200:
            with open(save_path, 'wb') as f:
                f.write(res.content)
            print(f"[OK] Saved: {filename}")
            time.sleep(SLEEP_TIME) # ここで待機（画像取得ごと）
        else:
            print(f"[Error] Image fetch failed: {res.status_code}")
    except Exception as e:
        print(f"[Error] Save failed: {e}")

def main():
    print(f"Target: {TARGET_URL}")
    print("Starting scraping process...")
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }

    try:
        res = requests.get(TARGET_URL, headers=headers)
        res.encoding = res.apparent_encoding
        soup = BeautifulSoup(res.text, 'html.parser')

        # 一覧ページから詳細リンクを持つ画像を取得
        images = soup.select("img.cardImage")
        
        print(f"Found {len(images)} cards on the list page.")

        for i, img in enumerate(images):
            img_url = img.get("data-src") or img.get("src")
            detail_path = img.get("data-href")

            if img_url and detail_path:
                # URLの絶対パス化
                if not img_url.startswith("http"):
                    img_url = urljoin(TARGET_URL, img_url)
                full_detail_url = urljoin(TARGET_URL, detail_path)

                print(f"[{i+1}/{len(images)}] Fetching details...")
                
                # 詳細ページから名前を取得
                card_name = get_card_name_from_detail(full_detail_url, headers)
                
                if card_name:
                    download_image(img_url, card_name)
                else:
                    print(f"[Skip] Could not find name for card {i+1}")

    except Exception as e:
        print(f"Fatal Error: {e}")

if __name__ == "__main__":
    main()
