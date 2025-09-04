import 'dotenv/config';

import express, { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import cors from 'cors';
import { ResultSetHeader } from 'mysql2/promise';
import { logger } from './logger';
import { sendNotification } from './notifications';

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

import otanoshimiRouter from './routes/otanoshimi';
app.use('/api/otanoshimi', otanoshimiRouter);

import rollCallRouter from './routes/roll-call';
app.use('/api/roll-call', rollCallRouter);

import { initializeDatabase, pool } from './db';

// Initialize the database and tables
initializeDatabase()
  .then(() => {
    logger.log('データベースの初期化が完了。');
  })
  .catch((error) => {
    logger.error('データベースの初期化に失敗:', error);
    process.exit(1);
  });

app.get('/', (req: Request, res: Response) => {
  res.send('Hello from Shiori Firebase Messaging Server!');
});

app.post('/register-token', async (req: Request, res: Response) => {
  const { userId, token } = req.body;
  logger.log(`ユーザー「${userId}」からのトークン登録リクエストを受信。`);

  if (!userId || !token) {
    logger.log(`登録リクエストにuserIdまたはtokenが含まれていません。`);
    return res.status(400).send({ error: '「userId」と「token」の両方が必要です。' });
  }

  try {
    await pool.execute('INSERT INTO fcm_tokens (user_id, token) VALUES (?, ?) ON DUPLICATE KEY UPDATE token = VALUES(token)', [userId, token]);
    logger.log(`ユーザー「${userId}」へのトークンの登録に成功。`);
    res.status(200).send({ message: 'データベースにトークンを登録しました。' });
  } catch (error) {
    logger.error(`ユーザー「${userId}」へのトークンの登録に失敗:`, error as Error);
    res.status(500).send({ error: 'トークンの登録に失敗しました。' });
  }
});

app.post('/send-notification', async (req: Request, res: Response) => {
  const { userId, title, body, link } = req.body;

  if (!userId || !title || !body) {
    return res.status(400).send({ error: '「userId」、「title」と「body」のすべてが必要です。' });
  }

  const success = await sendNotification(userId, title, body, link);

  if (success) {
    res.status(200).send({ message: '通知の送信に成功しました。' });
  } else {
    res.status(404).send({ error: `通知の送信に失敗しました。ユーザー「${userId}」のトークンが無効か、存在しません。` });
  }
});

import * as readline from 'readline';
import bcrypt from 'bcrypt';

app.listen(port, () => {
  logger.log(`「http://localhost:${port}」でサーバーが起動中。`);
  logger.log('コンソールコマンド入力可能');
  logger.log('createuser <id> <password> [--admin] [--teacher]');
  logger.log('deleteuser <id>');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  rl.on('line', async (line) => {
    const parts = line.trim().split(/\s+/);
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
        await pool.execute('INSERT INTO users (id, passwordHash, is_admin, is_teacher) VALUES (?, ?, ?, ?)', [id, passwordHash, isAdmin, isTeacher]);
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
        const [result] = await pool.execute<ResultSetHeader>('DELETE FROM users WHERE id = ?', [id]);

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
