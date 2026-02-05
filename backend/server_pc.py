import os
import sqlite3
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import deck_scraper

app = Flask(__name__)
CORS(app)

DB_PATH = 'dm_cards.db'
IMAGES_DIR = 'images'

if not os.path.exists(IMAGES_DIR):
    os.makedirs(IMAGES_DIR)

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS cards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE,
            local_path TEXT
        )
    ''')
    conn.commit()
    conn.close()

init_db()

@app.route('/')
def home():
    return "DM Card Database Server is Running!"

# 画像配信
@app.route('/api/image_file/<filename>')
def serve_local_file(filename):
    return send_from_directory(IMAGES_DIR, filename)

# ★メイン機能: カード検索＆収集
@app.route('/api/cards', methods=['GET'])
def search_cards():
    keyword = request.args.get('q', '') # ?q=ボルシャック
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    results = []
    
    # 1. まずDB内を検索 (部分一致)
    if keyword:
        cursor.execute("SELECT name, local_path FROM cards WHERE name LIKE ?", (f'%{keyword}%',))
    else:
        cursor.execute("SELECT name, local_path FROM cards ORDER BY id DESC LIMIT 50") # 全件は重いので最新50件
        
    db_rows = cursor.fetchall()

    # 2. DBになければ(または結果が少なければ)、公式を見に行く
    # ここでは「検索ワードがあって、DBヒット数が0なら」公式に行くロジックにします
    if keyword and len(db_rows) == 0:
        print(f"[*] Not found in DB. Fetching online for: {keyword}")
        new_cards = deck_scraper.search_and_save_official(keyword, IMAGES_DIR)
        
        # 新しく取れたカードをDBに登録
        for card in new_cards:
            try:
                cursor.execute("INSERT OR IGNORE INTO cards (name, local_path) VALUES (?, ?)", 
                               (card['name'], card['filename']))
            except:
                pass
        conn.commit()
        
        # もう一度DBから検索して結果を整える
        cursor.execute("SELECT name, local_path FROM cards WHERE name LIKE ?", (f'%{keyword}%',))
        db_rows = cursor.fetchall()

    conn.close()

    # 3. JSONを作成して返す
    for row in db_rows:
        results.append({
            "name": row[0],
            "image_url": f"{request.host_url}api/image_file/{row[1]}"
        })
    
    return jsonify({"cards": results})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8003, debug=True)
