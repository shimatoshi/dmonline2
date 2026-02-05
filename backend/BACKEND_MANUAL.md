# 島田商会推奨：堅牢バックエンドサーバー構築マニュアル

Windows PCを「不死身のオンプレミスサーバー」として稼働させるための標準構成仕様書です。
本構成は、アプリケーションエラーによる停止、ネットワーク瞬断、SSHホストキーの変更などのトラブルから**全自動で復帰**します。

---

## 1. 構成概要

- **環境:** Windows PC (バックエンド実機)
- **公開方法:** Serveo (SSHポートフォワーディング)
- **監視体制:** バッチファイルによる無限ループ監視
    1. **アプリ監視:** Pythonサーバーが落ちたら3秒後に再起動
    2. **トンネル監視:** SSH接続が切れたら10秒後に再接続

---

## 2. 必須ファイル構成

`backend/` フォルダ内に以下の3ファイルを配置します。

### ① `server.py` (Pythonサーバー本体)
**重要:** `allow_reuse_address = True` を設定しないと、再起動時に「ポート使用中」エラーでコケます。

```python
import http.server
import socketserver
import os

PORT = 8002  # ポート番号はプロジェクトごとに変更

# 再起動時の "Address already in use" エラーを防ぐ設定
socketserver.TCPServer.allow_reuse_address = True

Handler = http.server.SimpleHTTPRequestHandler

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving at port {PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
```

### ② `run_server_loop.bat` (サーバー監視・自動再起動)
Pythonサーバーを起動し、クラッシュしても即座に再起動させます。

```batch
@echo off
title [ProjectName] Backend Server (Auto-Restart)
cd /d %~dp0

:loop
cls
echo ==========================================
echo   Starting Backend Server...
echo   Time: %time%
echo ==========================================

:: サーバー起動
python server.py

echo.
echo [WARNING] Server stopped or crashed!
echo [RESTART] Restarting in 3 seconds...
timeout /t 3 >nul
goto loop
```

### ③ `connect_serveo_loop.bat` (トンネル監視・自動再接続)
**重要:** `127.0.0.1` 指定と `StrictHostKeyChecking=no` が安定稼働の鍵です。

```batch
@echo off
title Serveo Auto-Connector
cd /d %~dp0

:loop
cls
echo [Status] Killing old SSH processes...
taskkill /f /im ssh.exe >nul 2>&1

echo [Status] Connecting to Serveo...
echo [Time] %time%

:: ----------------------------------------------------------------
:: SSH Connection Command (重要設定解説)
:: -o StrictHostKeyChecking=no : サーバー鍵変更時の確認プロンプト(yes/no)を無視して強制接続
:: -o ServerAliveInterval=60   : 60秒ごとに生存確認パケットを送る
:: -o ExitOnForwardFailure=yes : ポート転送失敗時に即座に終了させる(そしてループで再接続)
:: -R [サブドメイン]:80:127.0.0.1:[ポート] : 必ず 127.0.0.1 を指定 (localhostだとIPv6エラーの原因になる)
:: ----------------------------------------------------------------
ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=60 -o ServerAliveCountMax=3 -o ExitOnForwardFailure=yes -R your-project-name:80:127.0.0.1:8002 serveo.net

echo.
echo [Warning] Connection lost or Port Conflict!
echo [Retry] Reconnecting in 10 seconds...
timeout /t 10 >nul
goto loop
```

---

## 3. Windows側の設定（最強の敵対策）

このシステムが止まる唯一かつ最大の原因は **「Windowsそのもののスリープ」** です。

1. **スリープの無効化:**
   - 「設定」→「システム」→「電源とスリープ」
   - 「電源に接続時、次の時間が経過した後にPCをスリープ状態にする」を **「なし」** に設定。

2. **Windows Update対策:**
   - 可能であればPro版でグループポリシー設定を行いますが、Home版の場合は「アクティブ時間」を業務時間に設定し、勝手な再起動を最小限に抑えます。

---

## 4. デプロイ手順

1. Termux上の `backend/` に上記ファイルを準備。
2. `scp` でWindowsのデスクトップ等に転送。
3. Windows側で **2つのバッチファイルをダブルクリックして起動**。
4. 黒い画面が2つ立ち上がれば構築完了。
