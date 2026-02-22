import express, { Request, Response } from 'express';
import { pool } from '../db';
import { authenticateToken } from '../middleware/auth';
import { RowDataPacket } from 'mysql2';
import { ResultSetHeader } from 'mysql2/promise';
import type { JwtPayload } from 'jsonwebtoken';

const router = express.Router();

const normalizeNumberArray = (values: unknown[]): number[] => {
  const seen = new Set<number>();
  const result: number[] = [];
  for (const v of values) {
    const num = typeof v === 'number' ? Math.trunc(v) : Number(v);
    if (Number.isInteger(num)) {
      if (!seen.has(num)) {
        seen.add(num);
        result.push(num);
      }
    }
  }
  result.sort((a, b) => a - b);
  return result;
};

const parseJsonNumberArray = (value: unknown): number[] => {
  if (Array.isArray(value)) {
    return normalizeNumberArray(value);
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parseJsonNumberArray(parsed);
    } catch {
      return [];
    }
  }
  if (value && typeof value === 'object') {
    try {
      const parsed = JSON.parse(JSON.stringify(value));
      return parseJsonNumberArray(parsed);
    } catch {
      return [];
    }
  }
  return [];
};

// 先生がメッセージを送信
// 先生が全員宛にメッセージを送信
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  const {
    teacherId,
    title,
    message,
    targetType = 'all',
    targetGroupName
  } = req.body as {
    teacherId?: number;
    title?: string;
    message?: string;
    targetType?: 'all' | 'group';
    targetGroupName?: string;
  };
  const TITLE_MAX_LENGTH = 50;
  if (!teacherId || !title || !message) {
    return res.status(400).json({ error: 'teacherId, title, messageは必須です' });
  }
  if (typeof title !== 'string' || title.length > TITLE_MAX_LENGTH) {
    return res.status(400).json({ error: `タイトルは${TITLE_MAX_LENGTH}文字以内で入力してください` });
  }
  if (targetType !== 'all' && targetType !== 'group') {
    return res.status(400).json({ error: 'targetTypeはallまたはgroupで指定してください' });
  }

  const trimmedTitle = title.trim();
  const trimmedMessage = message.trim();
  if (!trimmedTitle || !trimmedMessage) {
    return res.status(400).json({ error: 'titleとmessageは空白のみにはできません' });
  }

  let recipients: number[] = [];
  let normalizedGroupName: string | null = null;

  if (targetType === 'group') {
    if (!targetGroupName) {
      return res.status(400).json({ error: 'targetGroupNameが指定されていません' });
    }
    const [groupRows] = await pool.execute<RowDataPacket[]>('SELECT student_ids FROM roll_call_groups WHERE name = ?', [targetGroupName]);
    if (groupRows.length === 0) {
      return res.status(404).json({ error: '指定された送信先グループが見つかりません' });
    }
    recipients = parseJsonNumberArray(groupRows[0].student_ids);
    if (recipients.length === 0) {
      return res.status(400).json({ error: '送信先グループに生徒が登録されていません' });
    }
    normalizedGroupName = targetGroupName;
  } else {
    const [studentRows] = await pool.query<RowDataPacket[]>('SELECT gakuseki FROM students');
    recipients = normalizeNumberArray(studentRows.map((row) => row.gakuseki));
    if (recipients.length === 0) {
      return res.status(400).json({ error: '送信先の生徒が見つかりませんでした' });
    }
  }

  const recipientsJson = JSON.stringify(recipients);

  try {
    await pool.execute<ResultSetHeader>('INSERT INTO messages (teacher_id, title, message, target_type, target_group_name, target_student_ids) VALUES (?, ?, ?, ?, ?, ?)', [
      teacherId,
      trimmedTitle,
      trimmedMessage,
      targetType,
      normalizedGroupName,
      recipientsJson
    ]);
    res.status(201).json({ message: 'メッセージを送信しました' });
  } catch (error) {
    console.error('メッセージ送信エラー:', error);
    res.status(500).json({ error: 'メッセージ送信に失敗しました' });
  }
});

// 全員宛メッセージ一覧取得（read_reactions対応）
router.get('/', authenticateToken, async (_req: Request, res: Response) => {
  const req = _req as Request & { user?: JwtPayload };
  const payload = req.user as (JwtPayload & { userId?: number; is_teacher?: boolean; is_admin?: boolean }) | undefined;
  const userId = payload?.userId ? Number(payload.userId) : undefined;

  try {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM messages ORDER BY created_at DESC');
    // すべてのmessage_idを取得
    const messageIds = rows.map((row) => row.id);
    let reactions: { message_id: number; user_id: number; emoji_id: number }[] = [];
    if (messageIds.length > 0) {
      const [reactionRows] = await pool.query<RowDataPacket[]>('SELECT message_id, user_id, emoji_id FROM message_reactions WHERE message_id IN (?)', [messageIds]);
      reactions = reactionRows as { message_id: number; user_id: number; emoji_id: number }[];
    }
    const formatted = rows.map((row) => {
      const targetIds = parseJsonNumberArray(row.target_student_ids);
      const msgReactions = reactions.filter((r) => r.message_id === row.id);
      // emojiごとのカウント
      const emojiCounts: Record<number, number> = {};
      for (const { emoji_id } of msgReactions) {
        if (!emojiCounts[emoji_id]) emojiCounts[emoji_id] = 0;
        emojiCounts[emoji_id]++;
      }
      // 自分のリアクション
      const myReaction = userId ? msgReactions.find((r) => r.user_id === userId) : undefined;
      return {
        ...row,
        target_student_ids: targetIds,
        read_reactions: msgReactions,
        emoji_counts: emojiCounts,
        my_emoji_id: myReaction?.emoji_id ?? null,
        recipient_count: targetIds.length
      };
    });
    return res.json(formatted);
  } catch (error) {
    console.error('メッセージ取得エラー:', error);
    res.status(500).json({ error: 'メッセージ取得に失敗しました' });
  }
});

// 既読リアクション登録（emoji_id指定）
router.post('/:id/read', authenticateToken, async (req: Request, res: Response) => {
  const messageId = Number(req.params.id);
  if (!Number.isInteger(messageId) || messageId <= 0) {
    return res.status(400).json({ error: '有効なメッセージIDを指定してください' });
  }

  const reqWithUser = req as Request & { user?: JwtPayload };
  const payload = reqWithUser.user as (JwtPayload & { userId?: number | string; is_teacher?: boolean; is_admin?: boolean }) | undefined;
  const userId = payload?.userId !== undefined ? Number(payload.userId) : undefined;
  const { emoji_id } = req.body as { emoji_id?: number };

  if (!userId) {
    return res.status(401).json({ error: 'ユーザー情報を確認できませんでした' });
  }
  if (typeof emoji_id !== 'number' || ![1, 2, 3].includes(emoji_id)) {
    return res.status(400).json({ error: '有効なemoji_idを指定してください' });
  }

  try {
    const [messageRows] = await pool.query<RowDataPacket[]>('SELECT id, target_type, target_student_ids FROM messages WHERE id = ?', [messageId]);

    if (messageRows.length === 0) {
      return res.status(404).json({ error: 'メッセージが見つかりません' });
    }

    const row = messageRows[0];
    const targetIds = parseJsonNumberArray(row.target_student_ids);
    // userId, targetIds すべて数値で比較
    const canRead = row.target_type === 'all' || targetIds.includes(userId) || targetIds.length === 0;
    if (!canRead) {
      return res.status(403).json({ error: 'このメッセージにアクセスできません' });
    }

    // message_reactionsテーブルにUPSERT
    await pool.execute(
      `INSERT INTO message_reactions (message_id, user_id, emoji_id, reacted_at)
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE emoji_id = VALUES(emoji_id), reacted_at = NOW()`,
      [messageId, userId, emoji_id]
    );

    res.status(200).json({ message: '既読リアクションを登録しました', readAt: new Date().toISOString(), userId, emoji_id });
  } catch (error) {
    console.error('既読登録エラー:', error);
    res.status(500).json({ error: '既読処理に失敗しました' });
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
