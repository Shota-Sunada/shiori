import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { getUserFcmToken } from '../notifications';

const router = Router();

// 現在のユーザーのFCMトークンを取得
router.get('/me/fcm-token', authenticateToken, async (req: Request, res: Response) => {
  let userId: string | undefined;
  if (typeof req.user === 'string') {
    // If user is a string (e.g., JWT subject), use as userId
    userId = req.user;
  } else if (req.user && typeof req.user === 'object' && 'userId' in req.user) {
    // If user is a JwtPayload with userId property
    userId = (req.user as { userId: string }).userId;
  }
  if (!userId) {
    return res.status(401).json({ message: '認証情報がありません' });
  }
  try {
    const token = await getUserFcmToken(userId);
    res.status(200).json({ token });
  } catch {
    res.status(500).json({ message: 'FCMトークン取得に失敗しました' });
  }
});

export default router;
