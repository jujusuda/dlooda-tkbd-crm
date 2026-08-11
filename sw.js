/* ================================================================
   Dlooda TKBD CRM — Service Worker
   PWA 离线缓存 · 应用外壳预缓存
   ================================================================ */

var CACHE_VERSION = 'dlooda-tkbd-v9';

/* 需要预缓存的应用外壳文件 */
var APP_SHELL = [
  './',
  './index.html',
  './ai-assistant.html',
  './creator.html',
  './daily.html',
  './dashboard.html',
  './invite.html',
  './message.html',
  './product.html',
  './report.html',
  './sample.html',
  './task.html',
  './todo.html',
  './video.html',
  './css/style.css',
  './js/app.js',
  './js/data.js',
  './js/real-data.js',
  './js/translator.js',
  './js/ai-assistant.js',
  './js/creator.js',
  './js/daily.js',
  './js/dashboard.js',
  './js/invite.js',
  './js/message.js',
  './js/product.js',
  './js/report.js',
  './js/sample.js',
  './js/task.js',
  './js/todo.js',
  './js/video.js',
  './manifest.json'
];

/* 安装：预缓存应用外壳 */
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(function (cache) {
      // 逐个缓存，某个文件失败不影响整体
      return Promise.all(
        APP_SHELL.map(function (url) {
          return cache.add(url).catch(function () {
            // 忽略单个文件缓存失败（如 real-data.js 可能较大）
          });
        })
      );
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

/* 激活：清理旧缓存 */
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) {
          return key !== CACHE_VERSION;
        }).map(function (key) {
          return caches.delete(key);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

/* 请求拦截：Network-First（网络优先，保证永远拿到最新文件；离线时回退缓存） */
self.addEventListener('fetch', function (event) {
  var request = event.request;

  // 只处理 GET 请求
  if (request.method !== 'GET') return;

  var url = new URL(request.url);

  // 跨域请求直接走网络（不缓存）
  if (url.origin !== self.location.origin) return;

  // 带 ?reset=1 的请求：强制走网络并清掉旧缓存（一键清缓存开关）
  if (url.searchParams && url.searchParams.get('reset')) {
    event.respondWith(
      fetch(request).then(function (response) {
        caches.keys().then(function (keys) {
          keys.forEach(function (k) { caches.delete(k).catch(function () {}); });
        });
        return response;
      })
    );
    return;
  }

  // ===== 混合缓存策略 =====
  // · js/real-data.js（约 2.8MB，体积大且只随同步变）：缓存优先 + 后台再验证（stale-while-revalidate），
  //   切换模块秒开，后台静默更新。
  // · 其余所有资源（html/css/其它 js）：网络优先（network-first），保证代码改动刷新即生效，
  //   不再被旧缓存"卡"住看不到新功能。
  var isBigData = /\/js\/real-data\.js(\?|$)/.test(url.pathname);

  if (isBigData) {
    // 缓存优先，后台再验证
    event.respondWith(
      caches.match(request).then(function (cached) {
        var networkFetch = fetch(request).then(function (response) {
          if (response && response.status === 200 && response.type === 'basic') {
            var copy = response.clone();
            caches.open(CACHE_VERSION).then(function (cache) { cache.put(request, copy).catch(function () {}); });
          }
          return response;
        }).catch(function () {
          return cached || (request.mode === 'navigate' ? caches.match('./index.html') : new Response('', { status: 504, statusText: 'Offline' }));
        });
        return cached || networkFetch;
      })
    );
    return;
  }

  // 代码/页面/样式：网络优先，确保每次都拿到最新文件
  event.respondWith(
    fetch(request).then(function (response) {
      if (response && response.status === 200 && response.type === 'basic') {
        var copy = response.clone();
        caches.open(CACHE_VERSION).then(function (cache) { cache.put(request, copy).catch(function () {}); });
      }
      return response;
    }).catch(function () {
      // 离线或网络失败 → 回退缓存（仍可用旧版外壳）
      return caches.match(request).then(function (cached) {
        return cached || (request.mode === 'navigate' ? caches.match('./index.html') : new Response('', { status: 504, statusText: 'Offline' }));
      });
    })
  );
});
