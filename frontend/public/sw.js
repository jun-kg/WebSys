/**
 * Service Worker for Mobile Performance Optimization
 * モバイルパフォーマンス最適化Service Worker
 *
 * キャッシュ戦略:
 * - Static assets (CSS, JS): Cache First (1年キャッシュ)
 * - HTML: Network First with 5s timeout
 * - API: Network First with 3s timeout, stale while revalidate
 * - Fonts: Cache First (永続キャッシュ)
 */

const CACHE_NAME = 'websys-v1.2';
const STATIC_CACHE = 'websys-static-v1.2';
const API_CACHE = 'websys-api-v1.2';
const FONT_CACHE = 'websys-fonts-v1.2';

// キャッシュ対象のStatic Assets
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/src/styles/fonts.css'
];

// キャッシュする時間設定（秒）
const CACHE_STRATEGY = {
  static: 31536000, // 1年
  api: 300,         // 5分
  html: 3600        // 1時間
};

// Service Worker インストール
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Service worker installed successfully');
        return self.skipWaiting();
      })
  );
});

// Service Worker アクティベート
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            // 古いキャッシュを削除
            if (cacheName !== CACHE_NAME &&
                cacheName !== STATIC_CACHE &&
                cacheName !== API_CACHE &&
                cacheName !== FONT_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

// フェッチイベント処理
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // GET リクエストのみキャッシュ処理
  if (request.method !== 'GET') {
    return;
  }

  // フォントファイルのキャッシュ戦略 (Cache First)
  if (isFontRequest(request)) {
    event.respondWith(cacheFirstStrategy(request, FONT_CACHE));
    return;
  }

  // CSS/JS静的アセットのキャッシュ戦略 (Cache First)
  if (isStaticAsset(request)) {
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
    return;
  }

  // API リクエストのキャッシュ戦略 (Network First with timeout)
  if (isApiRequest(request)) {
    event.respondWith(networkFirstWithTimeout(request, API_CACHE, 3000));
    return;
  }

  // HTML ドキュメントのキャッシュ戦略 (Network First with timeout)
  if (isDocumentRequest(request)) {
    event.respondWith(networkFirstWithTimeout(request, STATIC_CACHE, 5000));
    return;
  }

  // その他のリクエストは通常通り
  event.respondWith(fetch(request));
});

/**
 * フォントリクエスト判定
 */
function isFontRequest(request) {
  return request.url.includes('fonts.gstatic.com') ||
         request.url.includes('.woff2') ||
         request.url.includes('.woff') ||
         request.url.includes('fonts.css');
}

/**
 * 静的アセット判定
 */
function isStaticAsset(request) {
  return request.url.includes('/assets/') ||
         request.url.includes('.css') ||
         request.url.includes('.js') ||
         request.url.includes('.ico');
}

/**
 * API リクエスト判定
 */
function isApiRequest(request) {
  return request.url.includes('/api/');
}

/**
 * HTML ドキュメント判定
 */
function isDocumentRequest(request) {
  return request.destination === 'document';
}

/**
 * Cache First 戦略
 * キャッシュ優先、見つからない場合はネットワーク
 */
async function cacheFirstStrategy(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      console.log('[SW] Cache hit:', request.url);
      return cachedResponse;
    }

    console.log('[SW] Cache miss, fetching:', request.url);
    const response = await fetch(request);

    if (response.status === 200) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.error('[SW] Cache first strategy failed:', error);
    throw error;
  }
}

/**
 * Network First with Timeout 戦略
 * ネットワーク優先、タイムアウト時はキャッシュ
 */
async function networkFirstWithTimeout(request, cacheName, timeout) {
  try {
    const cache = await caches.open(cacheName);

    // タイムアウト付きでネットワークリクエスト
    const networkPromise = fetch(request);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Network timeout')), timeout);
    });

    try {
      const response = await Promise.race([networkPromise, timeoutPromise]);

      if (response.status === 200) {
        cache.put(request, response.clone());
      }

      console.log('[SW] Network success:', request.url);
      return response;
    } catch (networkError) {
      // ネットワークエラー時はキャッシュから取得
      console.log('[SW] Network failed, trying cache:', request.url);
      const cachedResponse = await cache.match(request);

      if (cachedResponse) {
        console.log('[SW] Cache fallback success:', request.url);
        return cachedResponse;
      }

      throw networkError;
    }
  } catch (error) {
    console.error('[SW] Network first strategy failed:', error);
    throw error;
  }
}

/**
 * メッセージハンドラー（キャッシュクリア用）
 */
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      })
    );
  }
});

console.log('[SW] Service Worker loaded successfully');