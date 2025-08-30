import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, getToken, deleteToken } from 'firebase/messaging';

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
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // To ensure a fresh token is generated, always delete any existing one first.
      await deleteToken(messaging);

      const currentToken = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
      });

      if (currentToken) {
        // Register the token with the server
        fetch('http://localhost:3000/register-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ userId: gakuseki, token: currentToken })
        })
        .catch(error => {
            console.error('Error sending token to server:', error);
        });
      }
    }
  } catch (err) {
    console.error('An error occurred while retrieving token. ', err);
  }
};
