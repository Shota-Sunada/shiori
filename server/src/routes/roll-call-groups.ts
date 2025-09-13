import express from 'express';
import { pool } from '../db';
import { logger } from '../logger';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

interface SQLError extends Error {
  code?: string;
}

const router = express.Router();

// Get all roll call groups
router.get('/', async (req: express.Request, res: express.Response): Promise<void> => {
  logger.info('[roll-call-groups] GET / リクエスト', { ip: req.ip });
  try {
    const [groups] = await pool.execute<RowDataPacket[]>('SELECT id, name, student_ids FROM roll_call_groups ORDER BY name');
    logger.info('[roll-call-groups] グループ一覧取得', { count: (groups as RowDataPacket[]).length });
    res.json(groups);
  } catch (error) {
    logger.error('点呼グループの取得中にエラーが発生しました:', { error: String(error) });
    res.status(500).json({ message: 'サーバーエラー' });
  }
});

// Create a new roll call group
router.post('/', async (req: express.Request, res: express.Response): Promise<void> => {
  const { name, student_ids } = req.body;
  logger.info('[roll-call-groups] POST / リクエスト', { body: req.body, ip: req.ip });

  if (!name || !student_ids || !Array.isArray(student_ids)) {
    res.status(400).json({ message: 'グループ名と生徒IDの配列が必要です。' });
    return;
  }

  try {
    const [result] = await pool.execute<ResultSetHeader>('INSERT INTO roll_call_groups (name, student_ids) VALUES (?, ?)', [name, JSON.stringify(student_ids)]);
    logger.info('[roll-call-groups] グループ作成', { name, student_count: student_ids.length });
    res.status(201).json({ id: result.insertId, name, student_ids });
  } catch (error) {
    logger.error('点呼グループの作成中にエラーが発生しました:', { error: String(error) });
    if ((error as SQLError).code === 'ER_DUP_ENTRY') {
      res.status(409).json({ message: '同じ名前のグループが既に存在します。' });
      return;
    }
    res.status(500).json({ message: 'サーバーエラー' });
  }
});

// Update a roll call group
router.put('/:id', async (req: express.Request, res: express.Response): Promise<void> => {
  const { id } = req.params;
  const { name, student_ids } = req.body;
  logger.info('[roll-call-groups] PUT /:id リクエスト', { params: req.params, body: req.body, ip: req.ip });

  if (!name || !student_ids || !Array.isArray(student_ids)) {
    res.status(400).json({ message: 'グループ名と生徒IDの配列が必要です。' });
    return;
  }

  try {
    await pool.execute('UPDATE roll_call_groups SET name = ?, student_ids = ? WHERE id = ?', [name, JSON.stringify(student_ids), id]);
    logger.info('[roll-call-groups] グループ更新', { id, name, student_count: student_ids.length });
    res.status(200).json({ message: '点呼グループを更新しました。' });
  } catch (error) {
    logger.error('点呼グループの更新中にエラーが発生しました:', { error: String(error) });
    if ((error as SQLError).code === 'ER_DUP_ENTRY') {
      res.status(409).json({ message: '同じ名前のグループが既に存在します。' });
      return;
    }
    res.status(500).json({ message: 'サーバーエラー' });
  }
});

// Delete a roll call group
router.delete('/:id', async (req: express.Request, res: express.Response): Promise<void> => {
  const { id } = req.params;
  logger.info('[roll-call-groups] DELETE /:id リクエスト', { params: req.params, ip: req.ip });

  try {
    const [result] = await pool.execute<ResultSetHeader>('DELETE FROM roll_call_groups WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      res.status(404).json({ message: '指定された点呼グループが見つかりません。' });
      return;
    }
    logger.info('[roll-call-groups] グループ削除', { id });
    res.status(200).json({ message: '点呼グループを削除しました。' });
  } catch (error) {
    logger.error('点呼グループの削除中にエラーが発生しました:', { error: String(error) });
    res.status(500).json({ message: 'サーバーエラー' });
  }
});

export default router;
