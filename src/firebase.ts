import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, getToken, deleteToken } from 'firebase/messaging';
import { SERVER_ENDPOINT } from './app';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const messaging = getMessaging(app);

/**
 * Requests notification permission and registers the FCM token.
 * @param gakuseki The student ID to associate with the token.
 */
export const requestAndRegisterToken = async (gakuseki: string) => {
  console.log(`FCMトークンのリクエストと登録を試行中 (学生ID: ${gakuseki})`);
  try {
    const permission = await Notification.requestPermission();
    console.log(`通知許可ステータス: ${permission}`);

    if (permission === 'granted') {
      // To ensure a fresh token is generated, always delete any existing one first.
      console.log(`既存のFCMトークンを削除中...`);
      await deleteToken(messaging);
      console.log(`既存のFCMトークンを削除しました。`);

      console.log(`新しいFCMトークンをリクエスト中...`);
      const currentToken = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
      });
      console.log(`新しいFCMトークンを取得しました: ${currentToken ? 'はい' : 'いいえ'}`);

      if (currentToken) {
        // Register the token with the server
        console.log(`トークンをサーバーに送信中...`);
        fetch(`${SERVER_ENDPOINT}/register-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ userId: gakuseki, token: currentToken })
        })
          .then((response) => {
            if (response.ok) {
              console.log(`トークンがサーバーに正常に登録されました (学生ID: ${gakuseki})`);
            } else {
              console.error(`サーバーでのトークン登録に失敗しました。ステータス: ${response.status}`);
            }
          })
          .catch((error) => {
            console.error(`トークンのサーバー送信中にエラーが発生しました (学生ID: ${gakuseki}):`, error);
          });
      } else {
        console.log(`サーバーに送信するFCMトークンがありません。`);
      }
    } else {
      console.log(`通知許可が拒否されました。トークン登録はスキップされます。`);
    }
  } catch (err) {
    console.error(`トークンのリクエストと登録中にエラーが発生しました (学生ID: ${gakuseki}):`, err);
  }
};
