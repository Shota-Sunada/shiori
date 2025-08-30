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

// --- 再利用可能な関数 --- //

/**
 * 指定したユーザーに通知を送信する一般化された関数
 * @param userId 通知を送信するユーザーのID
 * @param title 通知のタイトル
 * @param body 通知の本文
 * @returns {Promise<boolean>} 送信が成功した場合はtrue、失敗した場合はfalse
 */
async function sendNotification(userId: string, title: string, body: string): Promise<boolean> {
  try {
    // Firestoreからトークンを取得
    const tokenRef = db.collection('fcmTokens').doc(userId);
    const tokenDoc = await tokenRef.get();

    if (!tokenDoc.exists) {
      console.log(`[${new Date().toLocaleString()}] No token found for user ${userId} in Firestore.`);
      return false;
    }

    const token = tokenDoc.data()?.token;
    if (!token) {
      console.log(`[${new Date().toLocaleString()}] Token data is invalid for user ${userId}.`);
      return false;
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
    return true;

  } catch (error) {
    console.error(`[${new Date().toLocaleString()}] Error sending message to user ${userId}:`, error);

    // もしトークンが無効なら、Firestoreから削除する (自己修復)
    if ((error as admin.FirebaseError).code === 'messaging/registration-token-not-registered') {
      console.log(`[${new Date().toLocaleString()}] Invalid token for user ${userId}. Deleting from Firestore.`);
      await db.collection('fcmTokens').doc(userId).delete();
    }
    return false;
  }
}

// --- APIエンドポイント --- //

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
    console.error(`[${new Date().toLocaleString()}] Error saving token to Firestore:`, error);
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

  const success = await sendNotification(userId, title, body);

  if (success) {
    res.status(200).send({ message: 'Notification sent successfully' });
  } else {
    res.status(500).send({ error: 'Failed to send notification' });
  }
});

app.listen(port, () => {
  console.log(`[${new Date().toLocaleString()}] Server is running at http://localhost:${port}`);
});
