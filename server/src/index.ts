import 'dotenv/config';

import express, { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import cors from 'cors';
import { ResultSetHeader } from 'mysql2';

// Firebase Admin SDKを初期化
// 注意: serviceAccountKey.jsonのパスが正しいことを確認してください
import serviceAccount from '../serviceAccountKey.json';
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
});

// Firestoreのインスタンスを取得
const db = admin.firestore();

const app = express();
const port = 8080;

// CORSを有効化
app.use(cors({ origin: ['http://localhost:5173', 'https://shiori.shudo-physics.com'] })); // クライアントのオリジンに合わせて変更してください
app.use(express.json());

import authRouter from './routes/auth';
app.use('/api/auth', authRouter);

import studentsRouter from './routes/students';
app.use('/api/students', studentsRouter);

import usersRouter from './routes/users';
app.use('/api/users', usersRouter);

import { initializeDatabase } from './db';

// Initialize the database and tables
initializeDatabase().then(() => {
  console.log("Database initialization complete.");
}).catch(error => {
  console.error("Failed to initialize database:", error);
  process.exit(1);
});

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
        body
      },
      token: token
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
  console.log(`[${new Date().toLocaleString()}] Received token registration request for userId: ${userId}`);

  if (!userId || !token) {
    console.log(`[${new Date().toLocaleString()}] Missing userId or token in registration request.`);
    return res.status(400).send({ error: 'userId and token are required' });
  }

  try {
    const tokenRef = db.collection('fcmTokens').doc(userId);
    await tokenRef.set({ token });
    console.log(`[${new Date().toLocaleString()}] Token for userId: ${userId} registered successfully.`);
    res.status(200).send({ message: 'Token registered successfully in Firestore' });
  } catch (error) {
    console.error(`[${new Date().toLocaleString()}] Error saving token to Firestore for userId: ${userId}:`, error);
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

import * as readline from 'readline'; // readline モジュールをインポート
import bcrypt from 'bcrypt'; // bcrypt をインポート
import{ pool} from './db'; // db プールをインポート

app.listen(port, () => {
  console.log(`[${new Date().toLocaleString()}] Server is running at http://localhost:${port}`);
  console.log('コンソールコマンドを入力してください (例: createuser <id> <password> [--admin] [--teacher])');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false // ターミナルモードを無効にする (行単位の入力のため)
  });

  rl.on('line', async (line) => {
    const parts = line.trim().split(/\s+/); // スペースで分割
    const command = parts[0].toLowerCase();

    if (command === 'createuser') {
      const idArg = parts[1];
      const passwordArg = parts[2];
      const isAdmin = parts.includes('--admin');
      const isTeacher = parts.includes('--teacher');

      if (!idArg || !passwordArg) {
        console.log('使用方法: createuser <id> <password> [--admin] [--teacher]');
        return;
      }

      const id = Number(idArg);
      if (isNaN(id)) {
        console.log('エラー: IDは数字である必要があります。');
        return;
      }

      try {
        const passwordHash = await bcrypt.hash(passwordArg, 10);
        await pool.execute(
          'INSERT INTO users (id, passwordHash, is_admin, is_teacher) VALUES (?, ?, ?, ?)',
          [id, passwordHash, isAdmin, isTeacher]
        );
        console.log(`ユーザー '${id}' が正常に作成されました。 管理者: ${isAdmin}, 教員: ${isTeacher}`);
      } catch (error) {
        console.error('ユーザー作成中にエラーが発生しました:', error);
      }
    } else if (command === 'deleteuser') {
      const idArg = parts[1];
      if (!idArg) {
        console.log('使用方法: deleteuser <id>');
        return;
      }

      const id = Number(idArg);
      if (isNaN(id)) {
        console.log('エラー: IDは数字である必要があります。');
        return;
      }

      try {
        const [result] = await pool.execute(
          'DELETE FROM users WHERE id = ?',
          [id]
        );

        if ((result as ResultSetHeader).affectedRows === 0) {
          console.log(`ID '${id}' のユーザーが見つかりませんでした。`);
        } else {
          console.log(`ID '${id}' のユーザーが正常に削除されました。`);
        }
      } catch (error) {
        console.error('ユーザー削除中にエラーが発生しました:', error);
      }
    } else if (command === 'exit') {
      console.log('サーバーを終了します...');
      process.exit(0);
    } else {
      console.log(`不明なコマンド: ${command}`);
    }
  });
});
