// v5/v3: opaqueキャッシュ廃止に伴い旧キャッシュ（毒入り・クォータ肥大の可能性）を破棄
const CACHE_NAME = 'dm-online-v5';
const IMAGE_CACHE_NAME = 'dm-online-images-v3';

// インストール時に最低限のリソースをキャッシュ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // index.html と vite.svg は最低限キャッシュしておく
      return cache.addAll([
        '/',
        '/index.html',
        '/vite.svg',
        '/manifest.webmanifest'
      ]);
    })
  );
  self.skipWaiting();
});

// 古いキャッシュの削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== IMAGE_CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// フェッチ処理
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. 画像リクエスト (Cache First)
  // 自サーバー画像（/api/image プロキシ・/api/uploads/）とローカル画像をキャッシュする。
  // 注意: opaqueレスポンス（クロスオリジンno-cors）は絶対にキャッシュしない。
  //   - ステータスが見えないため404/429等の失敗も「成功」として永久キャッシュされる
  //   - Chromeはopaque 1件をクォータ計算上7MB相当として扱うため、数百枚で
  //     オリジンのストレージが枯渇しCache API全体が死ぬ（全画像読込不能の原因）
  const isApiImage = url.pathname.includes('/api/image') || url.pathname.includes('/api/uploads/');
  if (isApiImage || event.request.destination === 'image') {
    // トンネルURL（ホスト名）が変わってもキャッシュが効くよう、パス＋クエリをキーにする
    const apiIdx = Math.max(url.pathname.indexOf('/api/image'), url.pathname.indexOf('/api/uploads/'));
    const cacheKey = apiIdx >= 0
      ? new Request(self.location.origin + url.pathname.slice(apiIdx) + url.search)
      : event.request;
    event.respondWith(
      caches.open(IMAGE_CACHE_NAME).then((cache) => {
        return cache.match(cacheKey).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // 自サーバーAPI画像はCORSモードで取得（サーバーはACAO:*を返す）。
          // これでレスポンスのステータスが見え、成功時のみ安全にキャッシュできる
          const fetchPromise = isApiImage
            ? fetch(event.request.url, { mode: 'cors' })
            : fetch(event.request);
          return fetchPromise.then((networkResponse) => {
            if (networkResponse && networkResponse.ok && networkResponse.type !== 'opaque') {
              cache.put(cacheKey, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
             // オフラインでキャッシュもない場合
             return new Response('', { status: 404 });
          });
        });
      })
    );
    return;
  }

  // 2. その他のリクエスト (Network First, falling back to Cache)
  // 特にJSやCSS、APIリクエストなど
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // 正常なレスポンスならキャッシュ更新
        if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
          // Cloneしてキャッシュへ
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // オフライン時
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          
          // SPA対応: HTMLリクエスト（ナビゲーション）なら index.html のキャッシュを返す
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html').then((indexHtml) => {
                if (indexHtml) return indexHtml;
                // 万が一 index.html もない場合
                return new Response('Offline: index.html missing', { status: 503, headers: {'Content-Type': 'text/plain'} });
            });
          }
          
          // その他のリソースが見つからない場合
          // 画像なら空を返すなどの処理も考えられるが、JS/CSSがないと動かないのでエラーレスポンス
          return new Response('Offline: Resource missing', { status: 503, statusText: 'Offline', headers: {'Content-Type': 'text/plain'} });
        });
      })
  );
});
