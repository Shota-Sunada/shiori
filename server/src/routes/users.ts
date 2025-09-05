import { Router, Request, Response } from 'express';
import { pool } from '../db'; // Import the database connection pool
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import bcrypt from 'bcrypt';
import { logger } from '../logger';
import { isAdmin } from '../middleware/auth';

const router = Router();

// 全ユーザーデータを取得
router.get('/', isAdmin, async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT id, is_admin, is_teacher, failed_login_attempts, is_banned FROM users'); // パスワードハッシュは返さない
    res.status(200).json(rows);
  } catch (error) {
    logger.error('ユーザーデータの取得に失敗:', error as Error);
    res.status(500).json({ message: '内部サーバーエラー' });
  }
});

// 新しいユーザーを追加
router.post('/', isAdmin, async (req: Request, res: Response) => {
  const { id, password, is_admin, is_teacher } = req.body;

  if (!id || !password) {
    return res.status(400).json({ message: 'IDとパスワードが必要です。' });
  }
  if (isNaN(Number(id))) {
    return res.status(400).json({ message: 'IDは整数8桁である必要があります。' });
  }

  try {
    // ユーザーが既に存在するかチェック
    const [existingUsers] = await pool.execute<RowDataPacket[]>('SELECT id FROM users WHERE id = ?', [id]);
    if (existingUsers.length > 0) {
      return res.status(409).json({ message: 'このIDはすでに存在しています。' });
    }

    const passwordHash = await bcrypt.hash(password, 10); // パスワードをハッシュ化

    await pool.execute('INSERT INTO users (id, passwordHash, is_admin, is_teacher) VALUES (?, ?, ?, ?)', [id, passwordHash, is_admin || false, is_teacher || false]);
    res.status(201).json({ message: 'ユーザーの追加に成功' });
  } catch (error) {
    logger.error('ユーザーの追加に失敗:', error as Error);
    res.status(500).json({ message: '内部サーバーエラー' });
  }
});

// 特定のユーザーデータを更新
router.put('/:id', isAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { password, is_admin, is_teacher, is_banned, failed_login_attempts } = req.body;

  if (isNaN(Number(id))) {
    return res.status(400).json({ message: 'IDは整数8桁である必要があります。' });
  }

  try {
    const updates = [];
    const values = [];

    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      updates.push('passwordHash = ?');
      values.push(passwordHash);
    }

    if (is_admin !== undefined) {
      updates.push('is_admin = ?');
      values.push(is_admin);
    }

    if (is_teacher !== undefined) {
      updates.push('is_teacher = ?');
      values.push(is_teacher);
    }

    if (is_banned !== undefined) {
      updates.push('is_banned = ?');
      values.push(is_banned);
    }

    if (failed_login_attempts !== undefined) {
      updates.push('failed_login_attempts = ?');
      values.push(failed_login_attempts);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: '更新対象なし' });
    }

    values.push(id);

    const [result] = await pool.execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

    if ((result as ResultSetHeader).affectedRows === 0) {
      return res.status(404).json({ message: 'ユーザーが見つかりませんでした。' });
    }
    res.status(200).json({ message: 'ユーザーデータの更新に成功' });
  } catch (error) {
    logger.error('ユーザーデータの更新に失敗:', error as Error);
    res.status(500).json({ message: '内部サーバーエラー' });
  }
});

// ユーザーのBANを解除
router.put('/:id/unban', isAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  if (isNaN(Number(id))) {
    return res.status(400).json({ message: 'IDは整数である必要があります。' });
  }

  try {
    const [result] = await pool.execute(
      'UPDATE users SET is_banned = 0, failed_login_attempts = 0 WHERE id = ?',
      [id]
    );

    if ((result as ResultSetHeader).affectedRows === 0) {
      return res.status(404).json({ message: 'ユーザーが見つかりませんでした。' });
    }
    res.status(200).json({ message: 'ユーザーのBANを解除しました。' });
  } catch (error) {
    logger.error('ユーザーのBAN解除に失敗:', error as Error);
    res.status(500).json({ message: '内部サーバーエラー' });
  }
});


// 特定のユーザーデータを削除
router.delete('/:id', isAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  if (isNaN(Number(id))) {
    return res.status(400).json({ message: 'IDは整数8桁である必要があります。' });
  }

  try {
    const [result] = await pool.execute('DELETE FROM users WHERE id = ?', [id]);

    if ((result as ResultSetHeader).affectedRows === 0) {
      return res.status(404).json({ message: 'ユーザーが見つかりませんでした。' });
    }
    res.status(200).json({ message: 'ユーザーの削除に成功' });
  } catch (error) {
    logger.error('ユーザーの削除に失敗:', error as Error);
    res.status(500).json({ message: '内部サーバーエラー' });
  }
});

router.post('/bulk', isAdmin, async (req: Request, res: Response) => {
  const { users } = req.body;

  if (!Array.isArray(users)) {
    return res.status(400).json({ message: '与えられるデータはユーザーの配列である必要があります。' });
  }

  const results = [];
  let successCount = 0;
  let errorCount = 0;

  for (const user of users) {
    const { id, password, is_admin, is_teacher } = user;

    if (!id || !password) {
      results.push({ id, status: 'error', message: 'IDとパスワードが必要です。' });
      errorCount++;
      continue;
    }

    if (isNaN(Number(id))) {
      results.push({ id, status: 'error', message: 'IDは整数8桁である必要があります。' });
      errorCount++;
      continue;
    }

    try {
      const [existingUsers] = await pool.execute<RowDataPacket[]>('SELECT id FROM users WHERE id = ?', [id]);
      if (existingUsers.length > 0) {
        results.push({ id, status: 'error', message: 'このIDはすでに存在しています。' });
        errorCount++;
        continue;
      }

      const passwordHash = await bcrypt.hash(password, 10);

      await pool.execute('INSERT INTO users (id, passwordHash, is_admin, is_teacher) VALUES (?, ?, ?, ?)', [id, passwordHash, is_admin || false, is_teacher || false]);
      results.push({ id, status: 'success' });
      successCount++;
    } catch (error) {
      logger.error(`ユーザーID ${id} の追加に失敗:`, error as Error);
      results.push({ id, status: 'error', message: '内部サーバーエラー' });
      errorCount++;
    }
  }

  res.status(207).json({
    message: `ユーザー配列データの追加に成功。成功件数: ${successCount} 失敗件数: ${errorCount}`,
    results
  });
});

export default router;