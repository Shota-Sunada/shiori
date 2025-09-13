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
    logger.info('[index] データベースの初期化が完了。');
  })
  .catch((error) => {
    logger.error('[index] データベースの初期化に失敗', { error: String(error) });
    process.exit(1);
  });

app.get('/', (req: Request, res: Response) => {
  logger.info('[index] GET / リクエスト', { ip: req.ip });
  res.send('Hello from Shiori Firebase Messaging Server!');
});

// クライアントが自身の組み込みバージョンと比較するための公開エンドポイント
app.get('/api/version', (req: Request, res: Response) => {
  logger.info('[index] GET /api/version リクエスト', { ip: req.ip });
  res.json({ version: serverPkg.version });
});

app.post('/register-token', authenticateToken, async (req: Request, res: Response) => {
  const { userId, token } = req.body;
  logger.info('[index] POST /register-token リクエスト', { userId, ip: req.ip });

  if (!userId || !token) {
    logger.info('[index] register-token: userIdまたはtokenが未指定', { userId, token });
    res.status(400).send({ error: '「userId」と「token」の両方が必要です。' });
    return;
  }

  try {
    await pool.execute('INSERT INTO fcm_tokens (user_id, token) VALUES (?, ?) ON DUPLICATE KEY UPDATE token = VALUES(token)', [userId, token]);
    logger.info('[index] register-token: トークン登録成功', { userId });
    res.status(200).send({ message: 'データベースにトークンを登録しました。' });
  } catch (error) {
    logger.error('[index] register-token: トークン登録失敗', { userId, error: String(error) });
    res.status(500).send({ error: 'トークンの登録に失敗しました。' });
  }
});

app.post('/send-notification', authenticateToken, async (req: Request, res: Response) => {
  const { userId, title, body, link } = req.body;
  logger.info('[index] POST /send-notification リクエスト', { userId, title, ip: req.ip });

  if (!userId || !title || !body) {
    logger.info('[index] send-notification: 必須パラメータ不足', { userId, title, body });
    res.status(400).send({ error: '「userId」、「title」と「body」のすべてが必要です。' });
    return;
  }

  const success = await sendNotification(userId, title, body, link);

  if (success) {
    logger.info('[index] send-notification: 通知送信成功', { userId });
    res.status(200).send({ message: '通知の送信に成功しました。' });
  } else {
    logger.info('[index] send-notification: 通知送信失敗', { userId });
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
  logger.info('[index] GET /api/me/fcm-token リクエスト', { userId, ip: req.ip });
  if (!userId) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  try {
    const token = await getUserFcmToken(userId);
    if (!token) {
      res.status(404).json({ token: null });
      return;
    }
    res.json({ token });
  } catch (e) {
    logger.error('[index] /api/me/fcm-token 取得失敗', { userId, error: String(e) });
    res.status(500).json({ error: String(e) });
  }
});

// 自分宛テスト通知送信（デバッグ）
app.post('/api/me/test-notification', authenticateToken, async (req: Request, res: Response) => {
  const userId = getUserId(req);
  logger.info('[index] POST /api/me/test-notification リクエスト', { userId, ip: req.ip });
  if (!userId) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  const { title = 'テスト通知', body = '通知の到達性テスト', link = '/' } = req.body || {};
  try {
    const ok = await sendNotificationSingle(userId, title, body, link);
    logger.info('[index] /api/me/test-notification 通知送信', { userId, ok });
    res.json({ success: ok });
  } catch (e) {
    logger.error('[index] /api/me/test-notification 送信失敗', { userId, error: String(e) });
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
  logger.info('[index] コンソールコマンド入力可能');
  logger.info('[index] createuser <id> <password> [--admin] [--teacher]');
  logger.info('[index] deleteuser <id>');

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
        logger.info('[index] 使用方法: createuser <id> <password> [--admin] [--teacher]');
        return;
      }

      const id = Number(idArg);
      if (isNaN(id)) {
        logger.info('[index] エラー: IDは数字である必要があります。');
        return;
      }

      try {
        const passwordHash = await bcrypt.hash(passwordArg, 10);
        await pool.execute('INSERT INTO users (id, passwordHash, is_admin, is_teacher) VALUES (?, ?, ?, ?)', [id, passwordHash, isAdmin, isTeacher]);
        logger.info('[index] ユーザー作成', { id, isAdmin, isTeacher });
      } catch (error) {
        logger.error('[index] ユーザー作成中にエラーが発生しました:', { error: String(error) });
      }
    } else if (command === 'deleteuser') {
      const idArg = parts[1];
      if (!idArg) {
        logger.info('[index] 使用方法: deleteuser <id>');
        return;
      }

      const id = Number(idArg);
      if (isNaN(id)) {
        logger.info('[index] エラー: IDは数字である必要があります。');
        return;
      }

      try {
        const [result] = await pool.execute<ResultSetHeader>('DELETE FROM users WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
          logger.info('[index] ユーザー削除: 見つかりません', { id });
        } else {
          logger.info('[index] ユーザー削除: 成功', { id });
        }
      } catch (error) {
        logger.error('[index] ユーザー削除中にエラーが発生しました:', { error: String(error) });
      }
    } else if (command === 'exit') {
      logger.info('[index] サーバーを終了します...');
      process.exit(0);
    } else {
      logger.info('[index] 不明なコマンド', { command });
    }
  });
}

app.listen(port, () => {
  logger.info(`[index] サーバー起動: http://localhost:${port}`);
  initCli();
});
