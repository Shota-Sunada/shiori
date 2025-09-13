import express from 'express';
import { pool } from '../db';
import { logger } from '../logger';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

const router = express.Router();

// Get all boat assignments
router.get('/', async (req: express.Request, res: express.Response): Promise<void> => {
  logger.info('[boats] GET / リクエスト', { ip: req.ip });
  try {
    const [assignments] = await pool.execute<RowDataPacket[]>('SELECT id, boat_index, student_ids, teacher_ids FROM boat_assignments ORDER BY boat_index');
    logger.info('[boats] ボート割当一覧取得', { count: (assignments as RowDataPacket[]).length });
    res.json(assignments);
  } catch (error) {
    logger.error('ボート割当の取得中にエラーが発生しました:', { error: String(error) });
    res.status(500).json({ message: 'サーバーエラー' });
  }
});

// Create a new boat assignment
router.post('/', async (req: express.Request, res: express.Response): Promise<void> => {
  const { boat_index, student_ids, teacher_ids } = req.body;
  logger.info('[boats] POST / リクエスト', { body: req.body, ip: req.ip });

  if (typeof boat_index !== 'number' || !Array.isArray(student_ids) || !Array.isArray(teacher_ids)) {
    res.status(400).json({ message: 'boat_index, student_ids, teacher_idsが必要です。' });
    return;
  }

  try {
    const [result] = await pool.execute<ResultSetHeader>('INSERT INTO boat_assignments (boat_index, student_ids, teacher_ids) VALUES (?, ?, ?)', [
      boat_index,
      JSON.stringify(student_ids),
      JSON.stringify(teacher_ids)
    ]);
    logger.info('[boats] ボート割当作成', { boat_index, student_count: student_ids.length, teacher_count: teacher_ids.length });
    res.status(201).json({ id: result.insertId, boat_index, student_ids, teacher_ids });
  } catch (error) {
    logger.error('ボート割当の作成中にエラーが発生しました:', { error: String(error) });
    res.status(500).json({ message: 'サーバーエラー' });
  }
});

// Update a boat assignment
router.put('/:id', async (req: express.Request, res: express.Response): Promise<void> => {
  const { id } = req.params;
  const { boat_index, student_ids, teacher_ids } = req.body;
  logger.info('[boats] PUT /:id リクエスト', { params: req.params, body: req.body, ip: req.ip });

  if (typeof boat_index !== 'number' || !Array.isArray(student_ids) || !Array.isArray(teacher_ids)) {
    res.status(400).json({ message: 'boat_index, student_ids, teacher_idsが必要です。' });
    return;
  }

  try {
    await pool.execute('UPDATE boat_assignments SET boat_index = ?, student_ids = ?, teacher_ids = ? WHERE id = ?', [boat_index, JSON.stringify(student_ids), JSON.stringify(teacher_ids), id]);
    logger.info('[boats] ボート割当更新', { id, boat_index, student_count: student_ids.length, teacher_count: teacher_ids.length });
    res.status(200).json({ message: 'ボート割当を更新しました。' });
  } catch (error) {
    logger.error('ボート割当の更新中にエラーが発生しました:', { error: String(error) });
    res.status(500).json({ message: 'サーバーエラー' });
  }
});

// Delete a boat assignment
router.delete('/:id', async (req: express.Request, res: express.Response): Promise<void> => {
  const { id } = req.params;
  logger.info('[boats] DELETE /:id リクエスト', { params: req.params, ip: req.ip });

  try {
    const [result] = await pool.execute<ResultSetHeader>('DELETE FROM boat_assignments WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      res.status(404).json({ message: '指定されたボート割当が見つかりません。' });
      return;
    }
    logger.info('[boats] ボート割当削除', { id });
    res.status(200).json({ message: 'ボート割当を削除しました。' });
  } catch (error) {
    logger.error('ボート割当の削除中にエラーが発生しました:', { error: String(error) });
    res.status(500).json({ message: 'サーバーエラー' });
  }
});

export default router;
