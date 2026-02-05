const CACHE_NAME = 'dmonline2-static-v1';
const IMAGE_CACHE_NAME = 'dmonline2-images-v1';

// キャッシュする静的アセット
// 注意: ビルドごとにハッシュが変わるファイルはここには書かず、動的にキャッシュします
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/card_back.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

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

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. 画像キャッシュ (/api/image)
  if (url.pathname.startsWith('/api/image')) {
    event.respondWith(
      caches.open(IMAGE_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((response) => {
          // キャッシュにあればそれを返す
          if (response) {
            return response;
          }
          // なければネットワークから取得してキャッシュ
          return fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            // オフラインで画像がない場合、裏面を返す
            return caches.match('/card_back.jpg');
          });
        });
      })
    );
    return;
  }

  // 2. その他のリクエスト (Stale-While-Revalidate 戦略)
  // まずキャッシュを表示し、裏でネットワークから最新を取得して更新
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // 成功したらキャッシュ更新
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // オフライン時は何もしない（キャッシュがあればそれが使われる）
      });

      // キャッシュがあればそれを即座に返す、なければネットワークの結果を待つ
      return cachedResponse || fetchPromise;
    })
  );
});