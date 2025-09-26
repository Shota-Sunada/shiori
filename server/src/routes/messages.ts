import express, { Request, Response } from 'express';
import { pool } from '../db';
import { authenticateToken } from '../middleware/auth';
import { RowDataPacket } from 'mysql2';

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

// メッセージ編集（タイトル・本文）
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, message } = req.body;
  const TITLE_MAX_LENGTH = 50;
  if (!title || !message) {
    return res.status(400).json({ error: 'title, messageは必須です' });
  }
  if (typeof title !== 'string' || title.length > TITLE_MAX_LENGTH) {
    return res.status(400).json({ error: `タイトルは${TITLE_MAX_LENGTH}文字以内で入力してください` });
  }
  try {
    const [result] = await pool.execute('UPDATE messages SET title = ?, message = ?, updated_at = NOW() WHERE id = ?', [title, message, id]);
    // @ts-expect-error result.affectedRows は型定義にないがmysql2の返却値には存在する
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'メッセージが見つかりません' });
    }
    // 更新後のデータを返す
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM messages WHERE id = ?', [id]);
    res.status(200).json({ message: 'メッセージを更新しました', data: rows[0] });
  } catch {
    res.status(500).json({ error: 'メッセージ更新に失敗しました' });
  }
});

// ...既存のimport, router宣言...

// ...既存のルーティング...

// メッセージ削除
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const [result] = await pool.execute('DELETE FROM messages WHERE id = ?', [id]);
    // @ts-expect-error result.affectedRows は型定義にないがmysql2の返却値には存在する
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'メッセージが見つかりません' });
    }
    res.status(200).json({ message: 'メッセージを削除しました' });
  } catch {
    res.status(500).json({ error: 'メッセージ削除に失敗しました' });
  }
});

export default router;
