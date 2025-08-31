import 'dotenv/config';

import express, { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import cors from 'cors';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { logger } from './logger';

// Firebase Admin SDKを初期化
// 注意: serviceAccountKey.jsonのパスが正しいことを確認してください
import serviceAccount from '../serviceAccountKey.json';
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
});

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

import { initializeDatabase, pool } from './db';

// Initialize the database and tables
initializeDatabase().then(() => {
  logger.log("Database initialization complete.");
}).catch(error => {
  logger.error("Failed to initialize database:", error);
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
    // データベースからトークンを取得
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT token FROM fcm_tokens WHERE user_id = ?', [userId]);
    
    if (rows.length === 0) {
      logger.log(`No token found for user ${userId} in database.`);
      return false;
    }

    const token = rows[0].token;
    if (!token) {
      logger.log(`Token data is invalid for user ${userId}.`);
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
    logger.log(`Notification sent to user ${userId} was successful.`)
    return true;
  } catch (error) {
    logger.error(`Error sending message to user ${userId}:`, error as Error);

    // もしトークンが無効なら、データベースから削除する (自己修復)
    if ((error as admin.FirebaseError).code === 'messaging/registration-token-not-registered') {
      logger.log(`Invalid token for user ${userId}. Deleting from database.`);
      await pool.execute('DELETE FROM fcm_tokens WHERE user_id = ?', [userId]);
    }
    return false;
  }
}

// --- APIエンドポイント --- //

app.get('/', (req: Request, res: Response) => {
  res.send('Hello from Shiori Firebase Messaging Server!');
});

/**
 * ユーザーのFCMトークンをデータベースに登録するエンドポイント
 */
app.post('/register-token', async (req: Request, res: Response) => {
  const { userId, token } = req.body;
  logger.log(`Received token registration request for userId: ${userId}`);

  if (!userId || !token) {
    logger.log(`Missing userId or token in registration request.`);
    return res.status(400).send({ error: 'userId and token are required' });
  }

  try {
    await pool.execute(
      'INSERT INTO fcm_tokens (user_id, token) VALUES (?, ?) ON DUPLICATE KEY UPDATE token = VALUES(token)',
      [userId, token]
    );
    logger.log(`Token for userId: ${userId} registered successfully.`);
    res.status(200).send({ message: 'Token registered successfully in database' });
  } catch (error) {
    logger.error(`Error saving token to database for userId: ${userId}:`, error as Error);
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

app.listen(port, () => {
  logger.log(`Server is running at http://localhost:${port}`);
  logger.log('コンソールコマンドを入力してください (例: createuser <id> <password> [--admin] [--teacher])');

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
        logger.log('使用方法: createuser <id> <password> [--admin] [--teacher]');
        return;
      }

      const id = Number(idArg);
      if (isNaN(id)) {
        logger.log('エラー: IDは数字である必要があります。');
        return;
      }

      try {
        const passwordHash = await bcrypt.hash(passwordArg, 10);
        await pool.execute(
          'INSERT INTO users (id, passwordHash, is_admin, is_teacher) VALUES (?, ?, ?, ?)',
          [id, passwordHash, isAdmin, isTeacher]
        );
        logger.log(`ユーザー '${id}' が正常に作成されました。 管理者: ${isAdmin}, 教員: ${isTeacher}`);
      } catch (error) {
        logger.error('ユーザー作成中にエラーが発生しました:', error as Error);
      }
    } else if (command === 'deleteuser') {
      const idArg = parts[1];
      if (!idArg) {
        logger.log('使用方法: deleteuser <id>');
        return;
      }

      const id = Number(idArg);
      if (isNaN(id)) {
        logger.log('エラー: IDは数字である必要があります。');
        return;
      }

      try {
        const [result] = await pool.execute<ResultSetHeader>(
          'DELETE FROM users WHERE id = ?',
          [id]
        );

        if (result.affectedRows === 0) {
          logger.log(`ID '${id}' のユーザーが見つかりませんでした。`);
        } else {
          logger.log(`ID '${id}' のユーザーが正常に削除されました。`);
        }
      } catch (error) {
        logger.error('ユーザー削除中にエラーが発生しました:', error as Error);
      }
    } else if (command === 'exit') {
      logger.log('サーバーを終了します...');
      process.exit(0);
    } else {
      logger.log(`不明なコマンド: ${command}`);
    }
  });
});
