import express, { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import cors from 'cors';

// Firebase Admin SDKを初期化
// 注意: serviceAccountKey.jsonのパスが正しいことを確認してください
import serviceAccount from '../serviceAccountKey.json';
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
});

// Firestoreのインスタンスを取得
const db = admin.firestore();

const app = express();
const port = 3000;

// CORSを有効化
app.use(cors());
app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.send('Hello from Shiori Firebase Messaging Server!');
});

/**
 * ユーザーのFCMトークンをFirestoreに登録するエンドポイント
 */
app.post('/register-token', async (req: Request, res: Response) => {
  const { userId, token } = req.body;

  if (!userId || !token) {
    return res.status(400).send({ error: 'userId and token are required' });
  }

  try {
    const tokenRef = db.collection('fcmTokens').doc(userId);
    await tokenRef.set({ token });
    res.status(200).send({ message: 'Token registered successfully in Firestore' });
  } catch (error) {
    console.error('Error saving token to Firestore:', error);
    res.status(500).send({ error: 'Failed to save token' });
  }
});

/**
 * 特定のユーザーに通知を送信するエンドポイント
 */
app.post('/send-notification', async (req: Request, res: Response) => {
  const { userId, title, body } = req.body;

  if (!userId || !title || !body) {
    return res.status(400).send({ error: 'userId, title, and body are required' });
  }

  try {
    // Firestoreからトークンを取得
    const tokenRef = db.collection('fcmTokens').doc(userId);
    const tokenDoc = await tokenRef.get();

    if (!tokenDoc.exists) {
      console.log(`No token found for user ${userId} in Firestore.`);
      return res.status(404).send({ error: 'Token not found for user' });
    }

    const token = tokenDoc.data()?.token;
    if (!token) {
      return res.status(404).send({ error: 'Token data is invalid for user' });
    }

    const message: admin.messaging.Message = {
      notification: {
        title,
        body,
      },
      token: token,
    };

    // メッセージを送信
    await admin.messaging().send(message);
    res.status(200).send({ message: 'Notification sent successfully' });

  } catch (error) {
    console.error(`Error sending message to user ${userId}:`, error);

    // もしトークンが無効なら、Firestoreから削除する (自己修復)
    if ((error as admin.FirebaseError).code === 'messaging/registration-token-not-registered') {
      console.log(`Invalid token for user ${userId}. Deleting from Firestore.`);
      await db.collection('fcmTokens').doc(userId).delete();
    }

    res.status(500).send({ error: 'Error sending notification' });
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
