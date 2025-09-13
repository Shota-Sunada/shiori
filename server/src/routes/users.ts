import { Router, Request, Response } from 'express';
import { pool } from '../db'; // Import the database connection pool
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import bcrypt from 'bcrypt';
import { logger } from '../logger';
import { isAdmin } from '../middleware/auth';

const router = Router();

// 全ユーザーデータを取得
router.get('/', isAdmin, async (req: Request, res: Response) => {
  logger.info(`[users] GET /users リクエスト:`, { ip: req.ip, query: req.query });
  try {
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT id, is_admin, is_teacher, failed_login_attempts, is_banned FROM users');
    logger.info(`[users] ユーザーデータ取得成功 件数: ${rows.length}`);
    res.status(200).json(rows);
  } catch (error) {
    logger.error('ユーザーデータの取得に失敗:', error as Error);
    res.status(500).json({ message: '内部サーバーエラー' });
  }
});

// 新しいユーザーを追加
router.post('/', isAdmin, async (req: Request, res: Response) => {
  const { id, password, is_admin, is_teacher } = req.body;
  logger.info(`[users] POST /users リクエスト:`, { id, is_admin, is_teacher, ip: req.ip });

  if (!id || !password) {
    logger.warn(`[users] POST /users 不正なリクエスト: idまたはpassword未指定`);
    return res.status(400).json({ message: 'IDとパスワードが必要です。' });
  }
  if (isNaN(Number(id))) {
    logger.warn(`[users] POST /users 不正なリクエスト: idが整数8桁でない`);
    return res.status(400).json({ message: 'IDは整数8桁である必要があります。' });
  }

  try {
    const [existingUsers] = await pool.execute<RowDataPacket[]>('SELECT id FROM users WHERE id = ?', [id]);
    if (existingUsers.length > 0) {
      logger.warn(`[users] POST /users 既存ID: ${id}`);
      return res.status(409).json({ message: 'このIDはすでに存在しています。' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await pool.execute('INSERT INTO users (id, passwordHash, is_admin, is_teacher) VALUES (?, ?, ?, ?)', [id, passwordHash, is_admin || false, is_teacher || false]);
    logger.info(`[users] ユーザー追加成功: ${id}`);
    res.status(201).json({ message: 'ユーザーの追加に成功' });
  } catch (error) {
    logger.error('ユーザーの追加に失敗:', error as Error);
    res.status(500).json({ message: '内部サーバーエラー' });
  }
});

// 特定のユーザーデータを更新
router.put('/:id', isAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  logger.info(`[users] PUT /users/${id} リクエスト:`, { body: req.body, ip: req.ip });

  if (isNaN(Number(id))) {
    logger.warn(`[users] PUT /users/${id} 不正なID`);
    return res.status(400).json({ message: 'IDは整数8桁である必要があります。' });
  }

  try {
    const allowed = ['password', 'is_admin', 'is_teacher', 'is_banned', 'failed_login_attempts'] as const;
    const updates: string[] = [];
    const values: (string | number | boolean)[] = [];

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        if (key === 'password') {
          const passwordHash = await bcrypt.hash(req.body.password, 10);
          updates.push('passwordHash = ?');
          values.push(passwordHash);
        } else {
          updates.push(`${key} = ?`);
          values.push(req.body[key]);
        }
      }
    }
    if (!updates.length) {
      logger.warn(`[users] PUT /users/${id} 更新対象なし`);
      return res.status(400).json({ message: '更新対象なし' });
    }

    values.push(id);

    const [result] = await pool.execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

    if ((result as ResultSetHeader).affectedRows === 0) {
      logger.warn(`[users] PUT /users/${id} 対象ユーザーなし`);
      return res.status(404).json({ message: 'ユーザーが見つかりませんでした。' });
    }
    logger.info(`[users] ユーザー更新成功: ${id}`);
    res.status(200).json({ message: 'ユーザーデータの更新に成功' });
  } catch (error) {
    logger.error('ユーザーデータの更新に失敗:', error as Error);
    res.status(500).json({ message: '内部サーバーエラー' });
  }
});

// ユーザーのBANを解除
router.put('/:id/unban', isAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  logger.info(`[users] PUT /users/${id}/unban リクエスト:`, { ip: req.ip });
  if (isNaN(Number(id))) {
    logger.warn(`[users] PUT /users/${id}/unban 不正なID`);
    return res.status(400).json({ message: 'IDは整数である必要があります。' });
  }

  try {
    const [result] = await pool.execute('UPDATE users SET is_banned = 0, failed_login_attempts = 0 WHERE id = ?', [id]);

    if ((result as ResultSetHeader).affectedRows === 0) {
      logger.warn(`[users] PUT /users/${id}/unban 対象ユーザーなし`);
      return res.status(404).json({ message: 'ユーザーが見つかりませんでした。' });
    }
    logger.info(`[users] ユーザーBAN解除成功: ${id}`);
    res.status(200).json({ message: 'ユーザーのBANを解除しました。' });
  } catch (error) {
    logger.error('ユーザーのBAN解除に失敗:', error as Error);
    res.status(500).json({ message: '内部サーバーエラー' });
  }
});

// 特定のユーザーデータを削除
router.delete('/:id', isAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  logger.info(`[users] DELETE /users/${id} リクエスト:`, { ip: req.ip });
  if (isNaN(Number(id))) {
    logger.warn(`[users] DELETE /users/${id} 不正なID`);
    return res.status(400).json({ message: 'IDは整数8桁である必要があります。' });
  }

  try {
    const [result] = await pool.execute('DELETE FROM users WHERE id = ?', [id]);

    if ((result as ResultSetHeader).affectedRows === 0) {
      logger.warn(`[users] DELETE /users/${id} 対象ユーザーなし`);
      return res.status(404).json({ message: 'ユーザーが見つかりませんでした。' });
    }
    logger.info(`[users] ユーザー削除成功: ${id}`);
    res.status(200).json({ message: 'ユーザーの削除に成功' });
  } catch (error) {
    logger.error('ユーザーの削除に失敗:', error as Error);
    res.status(500).json({ message: '内部サーバーエラー' });
  }
});

// 一括追加エンドポイント
router.post('/bulk', isAdmin, async (req: Request, res: Response) => {
  const { users } = req.body;
  logger.info(`[users] POST /users/bulk リクエスト:`, { count: Array.isArray(users) ? users.length : 0, ip: req.ip });

  if (!Array.isArray(users)) {
    logger.warn(`[users] POST /users/bulk 不正なリクエスト: usersが配列でない`);
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
      logger.warn(`[users] POST /users/bulk 配列要素: idまたはpassword未指定`, { id });
      continue;
    }

    if (isNaN(Number(id))) {
      results.push({ id, status: 'error', message: 'IDは整数8桁である必要があります。' });
      errorCount++;
      logger.warn(`[users] POST /users/bulk 配列要素: idが整数8桁でない`, { id });
      continue;
    }

    try {
      const [existingUsers] = await pool.execute<RowDataPacket[]>('SELECT id FROM users WHERE id = ?', [id]);
      if (existingUsers.length > 0) {
        results.push({ id, status: 'error', message: 'このIDはすでに存在しています。' });
        errorCount++;
        logger.warn(`[users] POST /users/bulk 配列要素: 既存ID`, { id });
        continue;
      }

      const passwordHash = await bcrypt.hash(password, 10);

      await pool.execute('INSERT INTO users (id, passwordHash, is_admin, is_teacher) VALUES (?, ?, ?, ?)', [id, passwordHash, is_admin || false, is_teacher || false]);
      results.push({ id, status: 'success' });
      successCount++;
      logger.info(`[users] POST /users/bulk ユーザー追加成功: ${id}`);
    } catch (error) {
      logger.error(`ユーザーID ${id} の追加に失敗:`, error as Error);
      results.push({ id, status: 'error', message: '内部サーバーエラー' });
      errorCount++;
    }
  }

  logger.info(`[users] POST /users/bulk 完了: 成功${successCount}件, 失敗${errorCount}件`);
  res.status(207).json({
    message: `ユーザー配列データの追加に成功。成功件数: ${successCount} 失敗件数: ${errorCount}`,
    results
  });
});

export default router;
