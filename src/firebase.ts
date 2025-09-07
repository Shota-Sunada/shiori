import { initializeApp } from 'firebase/app';
import { getMessaging, getToken } from 'firebase/messaging';
import { SERVER_ENDPOINT } from './config/serverEndpoint';
import { appFetch } from './helpers/apiClient';
import { getAuthToken } from './helpers/authTokenStore';

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

const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);

export const registerFCMToken = async (userId: string, swRegistration: ServiceWorkerRegistration) => {
  console.log('FCMトークンの登録を開始。対象ユーザー: ');

  try {
    console.log('VAPID_KEYを使用してgetToken()とserviceWorkerRegistrationを呼び出し中...');
    const currentToken = await getToken(messaging, { vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY, serviceWorkerRegistration: swRegistration });

    if (currentToken) {
      console.log('FCM登録トークンを正常に取得:', currentToken);

      const jwt = getAuthToken();
      if (!jwt) {
        console.error('JWT token not available');
        return;
      }
      await appFetch(`${SERVER_ENDPOINT}/register-token`, {
        method: 'POST',
        requiresAuth: true,
        jsonBody: { userId, token: currentToken },
        alwaysFetch: true
      });
      console.log('サーバーでのFCMトークンの登録に成功。');
    } else {
      console.warn('getToken()がトークンを返送しませんでした。これは通常、権限不足か、VAPID_KEYが無効であることを意味します。');
    }
  } catch (err) {
    console.error('getToken()の呼び出し中に、registerFCMToken内でエラーが発生しました:', err);
  }
};
