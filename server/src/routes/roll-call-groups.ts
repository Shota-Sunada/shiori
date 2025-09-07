import express from 'express';
import { pool } from '../db';
import { logger } from '../logger';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

interface SQLError extends Error {
  code?: string;
}

const router = express.Router();

// Get all roll call groups
router.get('/', async (req, res) => {
  try {
    const [groups] = await pool.execute<RowDataPacket[]>('SELECT id, name, student_ids FROM roll_call_groups ORDER BY name');
    res.json(groups);
  } catch (error) {
    logger.error('点呼グループの取得中にエラーが発生しました:', error as Error);
    res.status(500).json({ message: 'サーバーエラー' });
  }
});

// Create a new roll call group
router.post('/', async (req, res) => {
  const { name, student_ids } = req.body;

  if (!name || !student_ids || !Array.isArray(student_ids)) {
    return res.status(400).json({ message: 'グループ名と生徒IDの配列が必要です。' });
  }

  try {
    const [result] = await pool.execute<ResultSetHeader>('INSERT INTO roll_call_groups (name, student_ids) VALUES (?, ?)', [name, JSON.stringify(student_ids)]);
    logger.info(`点呼グループ作成 name=${name}`);
    res.status(201).json({ id: result.insertId, name, student_ids });
  } catch (error) {
    logger.error('点呼グループの作成中にエラーが発生しました:', error as Error);
    if ((error as SQLError).code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: '同じ名前のグループが既に存在します。' });
    }
    res.status(500).json({ message: 'サーバーエラー' });
  }
});

// Update a roll call group
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, student_ids } = req.body;

  if (!name || !student_ids || !Array.isArray(student_ids)) {
    return res.status(400).json({ message: 'グループ名と生徒IDの配列が必要です。' });
  }

  try {
    await pool.execute('UPDATE roll_call_groups SET name = ?, student_ids = ? WHERE id = ?', [name, JSON.stringify(student_ids), id]);
    res.status(200).json({ message: '点呼グループを更新しました。' });
  } catch (error) {
    logger.error('点呼グループの更新中にエラーが発生しました:', error as Error);
    if ((error as SQLError).code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: '同じ名前のグループが既に存在します。' });
    }
    res.status(500).json({ message: 'サーバーエラー' });
  }
});

// Delete a roll call group
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.execute<ResultSetHeader>('DELETE FROM roll_call_groups WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: '指定された点呼グループが見つかりません。' });
    }
    res.status(200).json({ message: '点呼グループを削除しました。' });
  } catch (error) {
    logger.error('点呼グループの削除中にエラーが発生しました:', error as Error);
    res.status(500).json({ message: 'サーバーエラー' });
  }
});

export default router;
