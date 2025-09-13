import express from 'express';
import { pool } from '../db';
import { logger } from '../logger';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

const router = express.Router();

// Get all boat assignments
router.get('/', async (req, res) => {
  try {
    const [assignments] = await pool.execute<RowDataPacket[]>('SELECT id, boat_index, student_ids, teacher_ids FROM boat_assignments ORDER BY boat_index');
    res.json(assignments);
  } catch (error) {
    logger.error('ボート割当の取得中にエラーが発生しました:', error as Error);
    res.status(500).json({ message: 'サーバーエラー' });
  }
});

// Create a new boat assignment
router.post('/', async (req, res) => {
  const { boat_index, student_ids, teacher_ids } = req.body;

  if (typeof boat_index !== 'number' || !Array.isArray(student_ids) || !Array.isArray(teacher_ids)) {
    return res.status(400).json({ message: 'boat_index, student_ids, teacher_idsが必要です。' });
  }

  try {
    const [result] = await pool.execute<ResultSetHeader>('INSERT INTO boat_assignments (boat_index, student_ids, teacher_ids) VALUES (?, ?, ?)', [
      boat_index,
      JSON.stringify(student_ids),
      JSON.stringify(teacher_ids)
    ]);
    logger.info(`ボート割当作成 boat_index=${boat_index}`);
    res.status(201).json({ id: result.insertId, boat_index, student_ids, teacher_ids });
  } catch (error) {
    logger.error('ボート割当の作成中にエラーが発生しました:', error as Error);
    res.status(500).json({ message: 'サーバーエラー' });
  }
});

// Update a boat assignment
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { boat_index, student_ids, teacher_ids } = req.body;

  if (typeof boat_index !== 'number' || !Array.isArray(student_ids) || !Array.isArray(teacher_ids)) {
    return res.status(400).json({ message: 'boat_index, student_ids, teacher_idsが必要です。' });
  }

  try {
    await pool.execute('UPDATE boat_assignments SET boat_index = ?, student_ids = ?, teacher_ids = ? WHERE id = ?', [boat_index, JSON.stringify(student_ids), JSON.stringify(teacher_ids), id]);
    res.status(200).json({ message: 'ボート割当を更新しました。' });
  } catch (error) {
    logger.error('ボート割当の更新中にエラーが発生しました:', error as Error);
    res.status(500).json({ message: 'サーバーエラー' });
  }
});

// Delete a boat assignment
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.execute<ResultSetHeader>('DELETE FROM boat_assignments WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: '指定されたボート割当が見つかりません。' });
    }
    res.status(200).json({ message: 'ボート割当を削除しました。' });
  } catch (error) {
    logger.error('ボート割当の削除中にエラーが発生しました:', error as Error);
    res.status(500).json({ message: 'サーバーエラー' });
  }
});

export default router;
