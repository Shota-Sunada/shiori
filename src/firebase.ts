import { initializeApp } from 'firebase/app';
import { getMessaging, getToken } from 'firebase/messaging';
import { SERVER_ENDPOINT } from './app';

// Firebaseプロジェクトの設定情報
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

// Firebaseを初期化
const app = initializeApp(firebaseConfig);

// Messagingサービスを取得
export const messaging = getMessaging(app);

// FCMトークンを取得し、サーバーに登録する関数
export const registerFCMToken = async (userId: string, swRegistration: ServiceWorkerRegistration) => {
  console.log('Attempting to register FCM token for userId:', userId);
  try {
    console.log('Calling getToken() with vapidKey and serviceWorkerRegistration...');
    const currentToken = await getToken(messaging, { vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY, serviceWorkerRegistration: swRegistration });

    if (currentToken) {
      console.log('Successfully retrieved FCM Registration Token:', currentToken);
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
      console.warn('getToken() returned no token. This usually means permission was not granted or the VAPID key is invalid.');
    }
  } catch (err) {
    console.error('An error occurred inside registerFCMToken while calling getToken():', err);
  }
};

// アプリがフォアグラウンドにあるときにメッセージを受信した場合の処理
// これはApp.tsxで既に実装されているが、ここでも定義可能
// onMessage(messaging, (payload) => {
//   console.log('Message received. ', payload);
//   // ...
// });
