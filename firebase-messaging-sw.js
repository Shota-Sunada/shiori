// ---------------------------------------------
// Firebase Cloud Messaging Service Worker (Optimized)
// ---------------------------------------------

// 1. 外部スクリプト読込（互換レイヤ）
importScripts('https://www.gstatic.com/firebasejs/12.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.0.0/firebase-messaging-compat.js');

// 2. Workbox（ビルド時に __WB_MANIFEST が注入される想定）
import { precacheAndRoute } from 'workbox-precaching';

// 3. 即時適用（新 SW を素早く有効化）
self.skipWaiting();
// クライアント制御を早期に取得
self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

// ---------------------------------------------
// 設定 / ユーティリティ
// ---------------------------------------------
// 本番では false 推奨。必要に応じてビルド時置換（例: import.meta.env.MODE）を活用。
const DEBUG = false;
const log = (...args) => {
  if (DEBUG) console.log('[FCM SW]', ...args);
};
const logError = (...args) => console.error('[FCM SW]', ...args);

// Workbox precache を安全に呼び出し
try {
  if (typeof self.__WB_MANIFEST !== 'undefined') {
    precacheAndRoute(self.__WB_MANIFEST);
    log('Precache manifest applied.');
  } else {
    log('No __WB_MANIFEST found (skipping precache).');
  }
} catch (e) {
  logError('Precache error:', e);
}

log('Service Worker starting...');

// Firebase 設定（キーそのものは公開 SW 上でも可。セキュリティはルールで担保）
const firebaseConfig = {
  apiKey: 'AIzaSyANQYjNkd9Ay-ctK_nwhYp6WQK9ufcs-rc',
  authDomain: 'shudo-shiori-79.firebaseapp.com',
  databaseURL: 'https://shudo-shiori-79-default-rtdb.firebaseio.com',
  projectId: 'shudo-shiori-79',
  storageBucket: 'shudo-shiori-79.firebasestorage.app',
  messagingSenderId: '775436195688',
  appId: '1:775436195688:web:d8cd3e6cab31e583b468dd',
  measurementId: 'G-R1J4D68V93'
};

// ---------------------------------------------
// 初期化 & メッセージハンドラ
// ---------------------------------------------
try {
  if (firebase.apps.length === 0) {
    log('Initializing Firebase...');
    firebase.initializeApp(firebaseConfig);
  }
  const messaging = firebase.messaging();
  log('Firebase Messaging ready.');

  messaging.onBackgroundMessage(async (payload) => {
    log('Background message received:', payload);

    // payload 安全化
    const notif = payload?.notification || {};
    const title = notif.title || '通知';
    const body = notif.body || '';
    const clickUrl = payload?.fcmOptions?.link || '/';

    try {
      const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      if (clientsList && clientsList.length > 0) {
        // 既にアプリ表示中: フォアグラウンドでは OS 通知を出さない
        log('Window clients exist -> skip system notification.');
        return;
      }
    } catch (err) {
      // クライアント確認に失敗した場合は通知を諦めない
      logError('clients.matchAll failed; proceeding to show notification.', err);
    }

    const icon = '/icon.png'; // Precaching 対象 (Workbox) を想定
    const tag = `fcm-${Date.now()}`; // 重複防止やグルーピング調整可
    const options = {
      body,
      icon,
      tag,
      data: { url: clickUrl },
      // 通知クリックまでは一度きりで良いなら requireInteraction: false
      renotify: false
    };
    try {
      await self.registration.showNotification(title, options);
      log('Notification displayed:', { title, clickUrl });
    } catch (err) {
      logError('showNotification failed:', err);
    }
  });
} catch (e) {
  logError('Initialization error:', e);
}

// ---------------------------------------------
// 通知クリック
// ---------------------------------------------
self.addEventListener('notificationclick', (event) => {
  log('Notification click');
  event.notification.close();
  const targetUrl = event.notification?.data?.url || '/';

  event.waitUntil(
    (async () => {
      try {
        const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of allClients) {
          if (client.url.includes(new URL(targetUrl, self.location.origin).pathname)) {
            // 既存タブをフォーカス
            try {
              await client.focus();
            } catch (_) {}
            return;
          }
        }
        await self.clients.openWindow(targetUrl);
      } catch (err) {
        logError('notificationclick handling failed:', err);
        // フォールバック: とにかく開く
        try {
          await self.clients.openWindow(targetUrl);
        } catch (_) {}
      }
    })()
  );
});

// ---------------------------------------------
// 追加: エラーイベント（未捕捉エラー監視）
// ---------------------------------------------
self.addEventListener('error', (e) => {
  logError('SW runtime error:', e.filename, e.lineno, e.colno, e.message);
});
self.addEventListener('unhandledrejection', (e) => {
  logError('SW unhandled rejection:', e.reason);
});
