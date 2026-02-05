import http.server
import socketserver
import os
import urllib.request
import urllib.parse
import hashlib
import mimetypes
import sys

# 設定
PORT = 8002
# Reactのビルド成果物があるディレクトリ
# Windows環境でのパス区切り文字に対応するため、abspathで正規化
WEB_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'dist'))

# 画像キャッシュディレクトリ
CACHE_DIR = os.path.join(os.path.dirname(__file__), 'storage', 'images')

# キャッシュディレクトリがなければ作成
if not os.path.exists(CACHE_DIR):
    os.makedirs(CACHE_DIR)

class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

    def do_GET(self):
        # 1. 画像プロキシ処理 (/api/image?url=...)
        if self.path.startswith('/api/image'):
            self.handle_image_proxy()
            return

        # 1.5 APIプロキシ (/api/cards...) -> Local Flask Server (8000)
        if self.path.startswith('/api/cards'):
            self.handle_api_proxy()
            return

        # 2. 静的ファイルの配信
        # URLに対応する物理パスを取得
        path = self.translate_path(self.path)
        
        # ディレクトリならindex.htmlを探す
        if os.path.isdir(path):
            possible_index = os.path.join(path, "index.html")
            if os.path.exists(possible_index):
                path = possible_index

        # ファイルが存在する場合
        if os.path.exists(path) and not os.path.isdir(path):
            return self.serve_file(path)
        
        # --- ここが修正ポイント ---
        # ファイルが存在しない場合
        # 拡張子があるリクエスト（.js, .css.pngなど）の場合は、404を返す
        # これをしないと、JSが見つからないときにindex.htmlを返してしまい、MIMEエラーになる
        base, ext = os.path.splitext(path)
        if ext and ext.lower() not in ['.html', '']:
            print(f"[404] File not found: {path} (Request: {self.path})")
            self.send_error(404, "File not found")
            return

        # 拡張子がない（ルートアクセスやパス）場合は、SPAとしてindex.htmlを返す
        index_path = os.path.join(WEB_ROOT, 'index.html')
        if os.path.exists(index_path):
            return self.serve_file(index_path)
        
        # index.htmlすら見つからない場合
        self.send_response(200)
        self.send_header('Content-type', 'text/plain')
        self.end_headers()
        self.wfile.write(b"Backend Server Running. (dist/index.html not found)")

    def translate_path(self, path):
        # URLパスをデコード
        path = path.split('?',1)[0]
        path = path.split('#',1)[0]
        path = urllib.parse.unquote(path)
        
        # ルートからの相対パスとして正規化
        # 先頭の / を削除して結合
        path = path.lstrip('/')
        
        # OS依存のパス区切りに変換
        path = os.path.normpath(path)
        
        # WEB_ROOTと結合
        full_path = os.path.join(WEB_ROOT, path)
        return full_path

    def serve_file(self, filepath):
        try:
            with open(filepath, 'rb') as f:
                content = f.read()
            
            mime_type, _ = mimetypes.guess_type(filepath)
            
            # WindowsでのMIME誤判定対策
            if filepath.endswith(".js"): mime_type = "application/javascript"
            elif filepath.endswith(".css"): mime_type = "text/css"
            elif filepath.endswith(".svg"): mime_type = "image/svg+xml"

            if mime_type is None:
                mime_type = 'application/octet-stream'

            self.send_response(200)
            self.send_header('Content-type', mime_type)
            self.send_header('Content-Length', len(content))
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            print(f"[Error] Serving file {filepath}: {e}")
            self.send_error(500, f"File read error: {e}")

    def handle_image_proxy(self):
        try:
            query = urllib.parse.urlparse(self.path).query
            params = urllib.parse.parse_qs(query)
            target_url = params.get('url', [None])[0]

            if not target_url:
                self.send_error(400, "Missing 'url' parameter")
                return

            file_hash = hashlib.md5(target_url.encode('utf-8')).hexdigest()
            ext = ".jpg"
            if ".png" in target_url: ext = ".png"
            filename = f"{file_hash}{ext}"
            local_path = os.path.join(CACHE_DIR, filename)

            if not os.path.exists(local_path):
                print(f"[Proxy] Downloading: {target_url}")
                req = urllib.request.Request(
                    target_url, 
                    headers={'User-Agent': 'Mozilla/5.0'}
                )
                with urllib.request.urlopen(req) as response:
                    data = response.read()
                    with open(local_path, 'wb') as f:
                        f.write(data)
            
            self.serve_file(local_path)

        except Exception as e:
            print(f"[Proxy Error] {e}")
            self.send_error(500, str(e))

    def handle_api_proxy(self):
        try:
            # localhost:8003 へ転送
            target_url = f"http://localhost:8003{self.path}"
            print(f"[API Proxy] Forwarding to {target_url}")
            
            req = urllib.request.Request(target_url)
            with urllib.request.urlopen(req) as response:
                self.send_response(response.status)
                # ヘッダーをコピー
                for key, value in response.getheaders():
                    # Transfer-Encoding は除外しないとプロトコルエラーになることがある
                    if key.lower() not in ['transfer-encoding', 'content-encoding']:
                         self.send_header(key, value)
                self.end_headers()
                self.wfile.write(response.read())
        except Exception as e:
            print(f"[API Proxy Error] {e}")
            self.send_error(502, f"Backend Proxy Error: {e}")

if __name__ == '__main__':
    # 既存のソケットを再利用できるように設定
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(('', PORT), SPAHandler) as httpd:
        print(f"Serving React + Proxy at http://localhost:{PORT}")
        print(f"Web Root: {WEB_ROOT}")
        print(f"Image Cache: {CACHE_DIR}")
        print(f"API Proxy: /api/cards -> http://localhost:8003")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopping server...")
            httpd.server_close()
