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
        self.send_error(404)

    def do_GET(self):
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
        return os.path.join(WEB_ROOT, os.path.normpath(path))

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