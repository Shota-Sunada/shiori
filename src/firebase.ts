import { initializeApp } from 'firebase/app';
import { getMessaging, getToken } from 'firebase/messaging';
import { SERVER_ENDPOINT } from './app';

// Firebaseプロジェクトの設定情報
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID // Optional
};

// Firebaseを初期化
const app = initializeApp(firebaseConfig);

// Messagingサービスを取得
export const messaging = getMessaging(app);

// FCMトークンを取得し、サーバーに登録する関数
export const registerFCMToken = async (userId: string) => {
  try {
    const currentToken = await getToken(messaging, { vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY });
    if (currentToken) {
      console.log('FCM Registration Token:', currentToken);
      // サーバーにトークンを送信
      const response = await fetch(`${SERVER_ENDPOINT}/register-token`, {
        // サーバーのFCMトークン登録エンドポイント
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId, token: currentToken })
      });

      if (!response.ok) {
        throw new Error(`Failed to register FCM token on server: ${response.status}`);
      }
      console.log('FCM token registered on server successfully.');
    } else {
      console.log('No registration token available. Request permission to generate one.');
      // ユーザーに通知の許可を求める
      // これは通常、ユーザーのアクションによってトリガーされるべきです
      // Notification.requestPermission().then((permission) => { ... });
    }
  } catch (err) {
    console.error('An error occurred while retrieving token. ', err);
  }
};

// アプリがフォアグラウンドにあるときにメッセージを受信した場合の処理
// これはApp.tsxで既に実装されているが、ここでも定義可能
// onMessage(messaging, (payload) => {
//   console.log('Message received. ', payload);
//   // ...
// });
