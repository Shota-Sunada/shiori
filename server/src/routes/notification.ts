import express, { type Request, type Response } from 'express';
import { sendNotification } from '../notifications';
import { logger } from '../logger';

const router = express.Router();

const getUserId = (req: Request): string | undefined => {
  const r = req as Request & { user?: { userId?: string } };
  return r.user?.userId;
};

router.post('/send', async (req: Request, res: Response) => {
  const { userId, title, body, link } = req.body as {
    userId?: string;
    title?: string;
    body?: string;
    link?: string;
  };

  if (!userId || !title || !body) {
    return res.status(400).json({ error: 'userId, title, body は必須です。' });
  }

  try {
    const success = await sendNotification(userId, title, body, link);
    if (success) {
      res.status(200).json({ message: '通知の送信に成功しました。' });
    } else {
      res.status(404).json({ error: `通知の送信に失敗しました。ユーザー「${userId}」のトークンが無効か、存在しません。` });
    }
  } catch (error) {
    logger.error('通知送信中にエラーが発生しました:', error as Error);
    res.status(500).json({ error: '通知の送信に失敗しました。' });
  }
});

router.post('/me/test', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const {
    title = 'テスト通知',
    body = '通知の到達性テスト',
    link = '/'
  } = (req.body ?? {}) as {
    title?: string;
    body?: string;
    link?: string;
  };

  if (!userId) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  try {
    const success = await sendNotification(userId, title, body, link);
    res.status(200).json({ success });
  } catch (error) {
    logger.error('テスト通知送信中にエラーが発生しました:', error as Error);
    res.status(500).json({ error: '通知の送信に失敗しました。' });
  }
});

export default router;
