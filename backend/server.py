import http.server
import socketserver
import os
import urllib.request
import urllib.parse
import hashlib
import mimetypes
import sys
import uuid
import json
import base64
import re
import html
import time
import threading

# Termux bionic DNSが外部ホストを引けない環境向けのフォールバック
try:
    import dns_patch  # noqa: F401
except ImportError:
    pass

# 設定
PORT = 8002
# Reactのビルド成果物があるディレクトリ
WEB_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'dist'))

# ディレクトリ設定
STORAGE_DIR = os.path.join(os.path.dirname(__file__), 'storage')
CACHE_DIR = os.path.join(STORAGE_DIR, 'images')
UPLOAD_DIR = os.path.join(STORAGE_DIR, 'uploads')
CUSTOM_FILE = os.path.join(STORAGE_DIR, 'custom_cards.json')
LOG_FILE = os.path.join(STORAGE_DIR, 'register_log.jsonl')

for d in [CACHE_DIR, UPLOAD_DIR]:
    if not os.path.exists(d):
        os.makedirs(d)

class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        if self.path == '/api/upload':
            self.handle_upload_json()
            return
        if self.path == '/api/fetch-image':
            self.handle_fetch_image()
            return
        if self.path == '/api/register-official':
            self.handle_register_official()
            return
        if self.path == '/api/register-cancel':
            self.handle_register_cancel()
            return
        if self.path == '/api/custom-cards/delete':
            self.handle_custom_delete()
            return
        self.send_error(404)

    def do_GET(self):
        if self.path.startswith('/api/custom-cards'):
            self.handle_custom_list()
            return
        if self.path.startswith('/api/register-log'):
            self.handle_register_log()
            return

        # 1. 画像プロキシ処理 (/api/image?url=...)
        if self.path.startswith('/api/image'):
            self.handle_image_proxy()
            return
        
        # 2. アップロードされた画像の配信 (/api/uploads/...)
        if self.path.startswith('/api/uploads/'):
            filename = os.path.basename(self.path)
            filepath = os.path.join(UPLOAD_DIR, filename)
            if os.path.exists(filepath):
                return self.serve_file(filepath)
            else:
                self.send_error(404)
                return

        # 3. 静的ファイルの配信
        path = self.translate_path(self.path)
        if os.path.isdir(path):
            possible_index = os.path.join(path, "index.html")
            if os.path.exists(possible_index):
                path = possible_index

        if os.path.exists(path) and not os.path.isdir(path):
            return self.serve_file(path)
        
        base, ext = os.path.splitext(path)
        if ext and ext.lower() not in ['.html', '']:
            self.send_error(404, "File not found")
            return

        index_path = os.path.join(WEB_ROOT, 'index.html')
        if os.path.exists(index_path):
            return self.serve_file(index_path)
        
        self.send_response(200)
        self.send_header('Content-type', 'text/plain')
        self.end_headers()
        self.wfile.write(b"Backend Server Running.")

    def handle_fetch_image(self):
        # クライアントから渡されたURLの画像をサーバー側で取得してuploadsに保存する。
        # （クライアントの外部アクセス遮断は維持したまま、登録だけサーバー経由で行う）
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            data = json.loads(self.rfile.read(content_length).decode('utf-8'))
            target_url = data.get('url')
            if not target_url or not target_url.startswith('http'):
                self.send_error(400, "Missing or invalid 'url' field")
                return

            req = urllib.request.Request(target_url, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                'Referer': f"{urllib.parse.urlparse(target_url).scheme}://{urllib.parse.urlparse(target_url).netloc}/",
            })
            with urllib.request.urlopen(req, timeout=15) as res:
                content_type = res.headers.get('Content-Type', '')
                file_bytes = res.read(10 * 1024 * 1024)  # 最大10MB

            if not content_type.startswith('image/'):
                self.send_error(415, f"Not an image: {content_type}")
                return

            ext_map = {'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp'}
            ext = ext_map.get(content_type.split(';')[0].strip(), '.jpg')

            # 同じURLは同じファイルに保存（重複取得しても増えない）
            file_hash = hashlib.md5(target_url.encode('utf-8')).hexdigest()
            new_filename = f"fetch_{file_hash}{ext}"
            with open(os.path.join(UPLOAD_DIR, new_filename), 'wb') as f:
                f.write(file_bytes)

            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"url": f"/api/uploads/{new_filename}"}).encode('utf-8'))
            print(f"[FetchImage] {target_url} -> {new_filename}")

        except Exception as e:
            print(f"[FetchImage Error] {e}")
            self.send_error(502, str(e))

    # ---- 新図鑑: ユーザー独自カードの登録(公式カード詳細URL) ----
    # 対象は dm.takaratomy.co.jp のカード詳細(?id=...)のみ(オープンプロキシ化を防ぐ)。
    # 登録データ・ログはサーバー側(storage/custom_cards.json, register_log.jsonl)に保存する。
    OFFICIAL_BASE = "https://dm.takaratomy.co.jp"
    UID_RE = re.compile(r'[^\s/\\]{1,128}')
    _store_lock = threading.Lock()

    @staticmethod
    def _official_text(s):
        s = re.sub(r'<br\s*/?>|</li>', '\n', s)
        return html.unescape(re.sub(r'<[^>]+>', '', s)).strip()

    def _official_get(self, url):
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=20) as res:
            return res.read(10 * 1024 * 1024)

    def _json(self, obj, code=200):
        body = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_body(self):
        n = int(self.headers.get('Content-Length', 0))
        return json.loads(self.rfile.read(n).decode('utf-8')) if n else {}

    def _uid(self, v):
        v = v or ''
        return v if self.UID_RE.fullmatch(v) else None

    def _load_custom(self):
        try:
            with open(CUSTOM_FILE, encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return {}

    def _save_custom(self, data):
        tmp = CUSTOM_FILE + '.tmp'
        with open(tmp, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False)
        os.replace(tmp, CUSTOM_FILE)

    def _log(self, uid, action, card, extra=None):
        rec = {"ts": int(time.time()), "uid": uid, "action": action,
               "id": card.get("id"), "name": card.get("name")}
        if extra:
            rec.update(extra)
        with self._store_lock, open(LOG_FILE, 'a', encoding='utf-8') as f:
            f.write(json.dumps(rec, ensure_ascii=False) + '\n')

    def _official_cards(self):
        # distはgit管理外で古い場合があるため、リポジトリ管理の public/data を優先する
        path = os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'official_cards.json')
        if not os.path.exists(path):
            path = os.path.join(WEB_ROOT, 'data', 'official_cards.json')
        try:
            mt = os.path.getmtime(path)
            if SPAHandler._oc_cache is None or SPAHandler._oc_cache[0] != mt:
                with open(path, encoding='utf-8') as f:
                    SPAHandler._oc_cache = (mt, json.load(f))
            return SPAHandler._oc_cache[1]
        except Exception:
            return []
    _oc_cache = None

    def _find_existing(self, uid, card):
        # 同じカードID、または同名のカードを、公式データ + 本人の登録済みから探す
        nm = lambda x: (x or '').replace(' ', '').replace('\u3000', '')
        key = nm(card["name"])
        out = []
        for c in self._official_cards():
            if c.get("img") and (c.get("id") == card["id"] or nm(c.get("name")) == key):
                if all(o["img"] != c["img"] for o in out):
                    out.append({"id": c["id"], "name": c["name"], "pack": c.get("pack"), "img": c["img"], "source": "official"})
        for c in [x for cs in self._load_custom().values() for x in cs]:
            if c.get("img") and (c.get("card_id") == card["id"] or nm(c.get("name")) == key):
                if all(o["img"] != c["img"] for o in out):
                    out.append({"id": c["id"], "name": c["name"], "pack": c.get("pack"), "img": c["img"], "source": "custom"})
        return out[:8]

    def _scrape_official(self, card_id):
        h = self._official_get(f"{self.OFFICIAL_BASE}/card/detail/?id={card_id}").decode('utf-8', 'replace')
        h = h[h.find("class='cardDetail'"):]
        t = self._official_text
        m = re.search(r"<h3 class='card-name'>(.*?)(?:<span class='packname'>\((.*?)\)</span>)?</h3>", h, re.S)
        if not m or not t(m.group(1)):
            return None, None
        card = {"id": card_id, "name": t(m.group(1)), "pack": t(m.group(2)) if m.group(2) else None}
        for k in ("type", "civil", "rarelity", "power", "cost", "race"):
            x = re.search(r"<td[^>]*class='%s'[^>]*>(.*?)</td>" % k, h, re.S)
            card[k] = t(x.group(1)) if x else None
        x = re.search(r"class='skills full'>(.*?)</td>", h, re.S)
        card["text"] = t(x.group(1)) if x else None
        imgs = list(dict.fromkeys(re.findall(r'src="(/wp-content/card/cardimage/[^"]+)"', h)))
        return card, imgs

    def handle_register_official(self):
        try:
            data = self._read_body()
            uid = self._uid(data.get('uid'))
            if not uid:
                self._json({"error": "ログインが必要です"}, 400)
                return
            raw = (data.get('url') or '').strip()
            if not re.match(r'^https?://', raw, re.I):
                raw = 'https://' + raw.lstrip('/')  # https:// 無しで貼られた場合も受け付ける
            u = urllib.parse.urlparse(raw)
            card_id = urllib.parse.parse_qs(u.query).get('id', [''])[0]
            if u.hostname not in ('dm.takaratomy.co.jp', 'www.dm.takaratomy.co.jp') or not re.fullmatch(r'[A-Za-z0-9_\-]{1,40}', card_id):
                self._json({"error": "公式カード詳細ページのURLではありません"}, 400)
                return

            card, imgs = self._scrape_official(card_id)
            if not card:
                self._json({"error": "カード情報を取得できませんでした"}, 404)
                return
            if not imgs:
                self._json({"error": "カード画像を取得できませんでした"}, 404)
                return

            # 重複確認: 既存があり、かつ「別バージョンとして登録」(force)でなければ確認を返す
            existing = self._find_existing(uid, card)
            if existing and not data.get('force'):
                self._log(uid, 'duplicate', card, {"existing": len(existing)})
                self._json({"status": "duplicate", "card": {k: card[k] for k in ("id", "name", "pack")}, "existing": existing})
                return

            fname = os.path.basename(urllib.parse.urlparse(imgs[0]).path)
            if not re.fullmatch(r'[\w\-.%]+', fname):
                fname = f"official_{card_id}.jpg"
            dest = os.path.join(UPLOAD_DIR, fname)
            if not os.path.exists(dest):
                with open(dest, 'wb') as f:
                    f.write(self._official_get(self.OFFICIAL_BASE + imgs[0]))
            card["img"] = f"/api/uploads/{fname}"

            with self._store_lock:
                store = self._load_custom()
                mine = store.setdefault(uid, [])
                card["card_id"] = card_id
                # 同じIDを別バージョンとして登録する場合は連番を付けて区別する
                n = sum(1 for cs in store.values() for c in cs if c.get("card_id") == card_id)
                card["id"] = card_id if n == 0 else f"{card_id}~v{n + 1}"
                if n:
                    card["version"] = n + 1
                card["createdAt"] = int(time.time())
                mine.append(card)
                self._save_custom(store)
            self._log(uid, 'register', card, {"variant": bool(existing)})
            self._json({"status": "registered", "card": card})
            print(f"[RegisterOfficial] {uid[:6]} {card['id']} {card['name']}")
        except Exception as e:
            print(f"[RegisterOfficial Error] {e}")
            self._json({"error": str(e)}, 502)

    def handle_register_cancel(self):
        try:
            data = self._read_body()
            uid = self._uid(data.get('uid'))
            if uid:
                self._log(uid, 'cancel', {"id": data.get('id'), "name": data.get('name')})
            self._json({"ok": True})
        except Exception as e:
            self._json({"error": str(e)}, 400)

    def handle_custom_delete(self):
        try:
            data = self._read_body()
            uid = self._uid(data.get('uid'))
            if not uid:
                self._json({"error": "bad uid"}, 400)
                return
            with self._store_lock:
                store = self._load_custom()
                mine = store.get(uid, [])
                gone = [c for c in mine if c.get("id") == data.get('id')]
                store[uid] = [c for c in mine if c.get("id") != data.get('id')]
                self._save_custom(store)
            for c in gone:
                self._log(uid, 'delete', c)
            self._json({"ok": True})
        except Exception as e:
            self._json({"error": str(e)}, 400)

    def handle_custom_list(self):
        q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        uid = self._uid(q.get('uid', [''])[0])
        if not uid:
            self._json({"error": "bad uid"}, 400)
            return
        # 登録カードは全員で共有する。自分が登録したものには mine=true を付ける(削除できるのは本人のみ)
        out = []
        for owner, cards in self._load_custom().items():
            for c in cards:
                out.append({**c, "mine": owner == uid})
        out.sort(key=lambda c: c.get("createdAt", 0), reverse=True)
        self._json({"cards": out})

    def handle_register_log(self):
        q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        uid = self._uid(q.get('uid', [''])[0])
        if not uid:
            self._json({"error": "bad uid"}, 400)
            return
        rows = []
        try:
            with open(LOG_FILE, encoding='utf-8') as f:
                for line in f:
                    try:
                        r = json.loads(line)
                    except ValueError:
                        continue
                    if r.get("uid") == uid:
                        r.pop("uid", None)
                        rows.append(r)
        except FileNotFoundError:
            pass
        self._json({"log": rows[-200:][::-1]})

    def handle_upload_json(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length == 0:
                self.send_error(400, "Content-Length missing or zero")
                return

            post_body = self.rfile.read(content_length)
            data = json.loads(post_body.decode('utf-8'))
            
            image_data = data.get('image')
            if not image_data:
                self.send_error(400, "Missing 'image' field")
                return

            # Base64ヘッダー除去 (data:image/png;base64,...)
            if ',' in image_data:
                header, encoded = image_data.split(',', 1)
                # 拡張子判定
                ext = ".jpg"
                if "png" in header: ext = ".png"
                elif "gif" in header: ext = ".gif"
            else:
                encoded = image_data
                ext = ".jpg"

            # デコードと保存
            file_bytes = base64.b64decode(encoded)
            new_filename = f"{uuid.uuid4()}{ext}"
            save_path = os.path.join(UPLOAD_DIR, new_filename)

            with open(save_path, 'wb') as f:
                f.write(file_bytes)

            # URLを返す
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            response = json.dumps({"url": f"/api/uploads/{new_filename}"})
            self.wfile.write(response.encode('utf-8'))

        except Exception as e:
            print(f"[Upload Error] {e}")
            self.send_error(500, str(e))

    def translate_path(self, path):
        path = path.split('?',1)[0].split('#',1)[0]
        path = urllib.parse.unquote(path).lstrip('/')
        full = os.path.normpath(os.path.join(WEB_ROOT, os.path.normpath(path)))
        # WEB_ROOT外へのパストラバーサル（../）を防ぐ
        if full != WEB_ROOT and not full.startswith(WEB_ROOT + os.sep):
            return os.path.join(WEB_ROOT, 'index.html')
        return full

    def serve_file(self, filepath):
        try:
            with open(filepath, 'rb') as f:
                content = f.read()
            mime_type, _ = mimetypes.guess_type(filepath)
            if filepath.endswith(".js"): mime_type = "application/javascript"
            elif filepath.endswith(".css"): mime_type = "text/css"
            if mime_type is None: mime_type = 'application/octet-stream'

            self.send_response(200)
            self.send_header('Content-type', mime_type)
            self.send_header('Content-Length', len(content))
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            self.send_error(500, f"File read error: {e}")

    # 自分のGitHub Release画像のみプロキシ許可（オープンプロキシ化を防ぐ）
    ALLOWED_PROXY_PREFIXES = (
        "https://github.com/shimatoshi/dmonline2/releases/download/",
        "https://github.com/shimatoshi/dmonline2-images/releases/download/",
    )

    def handle_image_proxy(self):
        # GitHub Release画像のキャッシュ付きプロキシ。
        # クライアントが直接GitHubを叩くとopaqueレスポンスしか得られず
        # SWで安全にキャッシュできない（ステータス不明・クォータ爆発）ため、
        # 同一管理下のこのプロキシ経由でCORS付き・ステータス可視のレスポンスを返す。
        try:
            query = urllib.parse.urlparse(self.path).query
            params = urllib.parse.parse_qs(query)
            target_url = params.get('url', [None])[0]
            if not target_url:
                self.send_error(400, "Missing 'url' parameter")
                return

            file_hash = hashlib.md5(target_url.encode('utf-8')).hexdigest()
            ext = os.path.splitext(urllib.parse.urlparse(target_url).path)[1] or ".jpg"
            local_path = os.path.join(CACHE_DIR, f"{file_hash}{ext}")

            if os.path.exists(local_path):
                self.serve_file(local_path)
                return

            if not target_url.startswith(self.ALLOWED_PROXY_PREFIXES):
                self.send_error(403, "URL not allowed")
                return

            req = urllib.request.Request(target_url, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            })
            with urllib.request.urlopen(req, timeout=20) as res:
                file_bytes = res.read(10 * 1024 * 1024)

            with open(local_path, 'wb') as f:
                f.write(file_bytes)
            self.serve_file(local_path)
        except Exception as e:
            print(f"[ImageProxy Error] {e}")
            self.send_error(502, str(e))

if __name__ == '__main__':
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(('', PORT), SPAHandler) as httpd:
        print(f"Serving at http://localhost:{PORT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            httpd.server_close()