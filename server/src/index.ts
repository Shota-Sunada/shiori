import 'dotenv/config';

import express, { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { ResultSetHeader } from 'mysql2/promise';
import { logger } from './logger';
import { sendNotification } from './notifications';
import { getUserFcmToken, sendNotification as sendNotificationSingle } from './notifications';
import { authenticateToken } from './middleware/auth';

// Firebase Admin SDKを初期化
// 注意: serviceAccountKey.jsonのパスが正しいことを確認してください
import serviceAccount from '../serviceAccountKey.json';
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
});

const app = express();
app.set('trust proxy', 1);
const port = 8080;

// CORSを有効化
app.use(cors({ origin: ['http://localhost:5173', 'https://shiori.shudo-physics.com'] })); // クライアントのオリジンに合わせて変更してください
app.use(express.json());

// Rate limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false // Disable the `X-RateLimit-*` headers
});

import authRouter from './routes/auth';
import studentsRouter from './routes/students';
import usersRouter from './routes/users';
import otanoshimiRouter from './routes/otanoshimi';
import rollCallRouter from './routes/roll-call';
import rollCallGroupsRouter from './routes/roll-call-groups';
import teachersRouter from './routes/teachers';
import creditsRouter from './routes/credits';
import scheduleRouter from './routes/schedule';
import boatsRouter from './routes/boats';
// バージョン取得用 (package.json から) - PWA クライアントのバージョン不一致検出に利用
import serverPkg from '../package.json';

// ルータ設定統合
type RouteConfig = {
  path: string;
  router: express.Router;
  middlewares?: express.RequestHandler[];
};

const routeConfigs: RouteConfig[] = [
  { path: '/api/auth', router: authRouter, middlewares: [authLimiter] },
  { path: '/api/students', router: studentsRouter, middlewares: [authenticateToken] },
  { path: '/api/users', router: usersRouter, middlewares: [authenticateToken] },
  { path: '/api/otanoshimi', router: otanoshimiRouter, middlewares: [authenticateToken] },
  { path: '/api/roll-call', router: rollCallRouter, middlewares: [authenticateToken] },
  { path: '/api/roll-call-groups', router: rollCallGroupsRouter, middlewares: [authenticateToken] },
  { path: '/api/teachers', router: teachersRouter, middlewares: [authenticateToken] },
  { path: '/api/credits', router: creditsRouter, middlewares: [authenticateToken] },
  { path: '/api/boats', router: boatsRouter, middlewares: [authenticateToken] }
];

routeConfigs.forEach(({ path, router, middlewares }) => {
  if (middlewares?.length) app.use(path, ...middlewares, router);
  else app.use(path, router);
});

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

// クライアントが自身の組み込みバージョンと比較するための公開エンドポイント
app.get('/api/version', (_req: Request, res: Response) => {
  res.json({ version: serverPkg.version });
});

app.post('/register-token', authenticateToken, async (req: Request, res: Response) => {
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

app.post('/send-notification', authenticateToken, async (req: Request, res: Response) => {
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

// 型補助: auth ミドルウェアで追加した user から userId を取得
function getUserId(req: Request): string | undefined {
  const r = req as Request & { user?: { userId?: string } };
  return r.user?.userId;
}

// 自分のFCMトークン確認用（デバッグ）
app.get('/api/me/fcm-token', authenticateToken, async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'unauthorized' });
  try {
    const token = await getUserFcmToken(userId);
    if (!token) return res.status(404).json({ token: null });
    res.json({ token });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// 自分宛テスト通知送信（デバッグ）
app.post('/api/me/test-notification', authenticateToken, async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'unauthorized' });
  const { title = 'テスト通知', body = '通知の到達性テスト', link = '/' } = req.body || {};
  try {
    const ok = await sendNotificationSingle(userId, title, body, link);
    res.json({ success: ok });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

import * as readline from 'readline';
import bcrypt from 'bcrypt';

const routers: Array<[string, express.Router, boolean?]> = [
  ['/api/auth', authRouter, false],
  ['/api/students', studentsRouter, true],
  ['/api/users', usersRouter, true],
  ['/api/otanoshimi', otanoshimiRouter, true],
  ['/api/roll-call', rollCallRouter, true],
  ['/api/roll-call-groups', rollCallGroupsRouter, true],
  ['/api/teachers', teachersRouter, true],
  ['/api/credits', creditsRouter, true],
  ['/api/schedules', scheduleRouter, true],
  ['/api/boats', boatsRouter, true]
];

routers.forEach(([path, r, needAuth]) => {
  if (needAuth) app.use(path, authenticateToken, r);
  else app.use(path, r);
});

function initCli() {
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
}

app.listen(port, () => {
  logger.log(`「http://localhost:${port}」でサーバー起動。`);
  initCli();
});
