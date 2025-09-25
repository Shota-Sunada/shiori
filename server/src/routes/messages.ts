import express, { Request, Response } from 'express';
import { pool } from '../db';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// 先生がメッセージを送信
// 先生が全員宛にメッセージを送信
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  const { teacherId, title, message } = req.body;
  const TITLE_MAX_LENGTH = 50;
  if (!teacherId || !title || !message) {
    return res.status(400).json({ error: 'teacherId, title, messageは必須です' });
  }
  if (typeof title !== 'string' || title.length > TITLE_MAX_LENGTH) {
    return res.status(400).json({ error: `タイトルは${TITLE_MAX_LENGTH}文字以内で入力してください` });
  }
  try {
    await pool.execute('INSERT INTO messages (teacher_id, title, message) VALUES (?, ?, ?)', [teacherId, title, message]);
    res.status(201).json({ message: 'メッセージを送信しました' });
  } catch {
    res.status(500).json({ error: 'メッセージ送信に失敗しました' });
  }
});

// 全員宛メッセージ一覧取得
router.get('/', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query('SELECT * FROM messages ORDER BY created_at DESC');
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'メッセージ取得に失敗しました' });
  }
});

export default router;
