const CACHE_NAME = 'dm-online-v3';
const IMAGE_CACHE_NAME = 'dm-online-images-v1';

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
  // /api/image や firebasestorage、または画像拡張子
  if (
    url.pathname.startsWith('/api/image') ||
    url.host.includes('firebasestorage') ||
    event.request.destination === 'image'
  ) {
    // console.log('SW: Fetching image', url.href); // デバッグ用
    event.respondWith(
      caches.open(IMAGE_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(event.request).then((networkResponse) => {
            // 画像取得成功ならキャッシュに追加
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
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
