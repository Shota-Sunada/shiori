import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { logger } from '../logger';
import { authenticateToken, isAdmin } from '../middleware/auth';

const router = Router();

// 全先生データを取得
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM teachers');
    res.status(200).json(rows);
  } catch (error) {
    logger.error('Error fetching teachers:', error as Error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 特定の先生データを取得
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM teachers WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: '先生が見つかりませんでした。' });
    }
    res.status(200).json(rows[0]);
  } catch (error) {
    logger.error('先生データの取得に失敗:', error as Error);
    res.status(500).json({ message: '内部サーバーエラー' });
  }
});

// 新しい先生データを追加
router.post('/', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  const teacherData = req.body;
  const {
    id,
    surname,
    forename,
    room_fpr,
    room_tdh,
    shinkansen_day1_car_number,
    shinkansen_day1_seat,
    shinkansen_day4_car_number,
    shinkansen_day4_seat,
    day1id,
    day1bus,
    day2,
    day3id,
    day3bus,
    day4class
  } = teacherData;

  // IDが8桁の数字であることを確認
  if (!/^[0-9]{8}$/.test(String(id))) return res.status(400).json({ message: 'IDは8桁の数字である必要があります。' });

  try {
    // まずusersテーブルにidが存在し、is_teacherがtrueであることを確認
    const [userRows] = await pool.execute<RowDataPacket[]>('SELECT id, is_teacher FROM users WHERE id = ?', [id]);

    if (userRows.length === 0) {
      return res.status(404).json({ message: '指定されたIDのユーザーが見つかりません。' });
    }

    if (!userRows[0].is_teacher) {
      return res.status(403).json({ message: '指定されたユーザーは先生ではありません。' });
    }

    await pool.execute(
      `INSERT INTO teachers (
        id, surname, forename,
        room_fpr, room_tdh,
        shinkansen_day1_car_number, shinkansen_day1_seat,
        shinkansen_day4_car_number, shinkansen_day4_seat,
        day1id, day1bus, day2, day3id, day3bus, day4class
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, surname, forename, room_fpr, room_tdh, shinkansen_day1_car_number, shinkansen_day1_seat, shinkansen_day4_car_number, shinkansen_day4_seat, day1id, day1bus, day2, day3id, day3bus, day4class]
    );
    res.status(201).json({ message: '先生の追加に成功' });
  } catch (error) {
    logger.error('先生の追加に失敗:', error as Error);
    res.status(500).json({ message: '内部サーバーエラー' });
  }
});

// 特定の先生データを更新
router.put('/:id', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const teacherData = req.body;

  const fields = Object.keys(teacherData)
    .map((key) => `${key} = ?`)
    .join(', ');
  const values = Object.values(teacherData);

  if (fields.length === 0) {
    return res.status(400).json({ message: '更新対象なし' });
  }

  try {
    const [result] = await pool.execute(`UPDATE teachers SET ${fields} WHERE id = ?`, [...values, id]);

    if ((result as ResultSetHeader).affectedRows === 0) {
      return res.status(404).json({ message: '先生が見つかりませんでした。' });
    }
    res.status(200).json({ message: '先生データの更新に成功' });
  } catch (error) {
    logger.error('先生データの更新に失敗:', error as Error);
    res.status(500).json({ message: '内部サーバーエラー' });
  }
});

// 特定の先生データを削除
router.delete('/:id', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const [result] = await pool.execute('DELETE FROM teachers WHERE id = ?', [id]);

    if ((result as ResultSetHeader).affectedRows === 0) {
      return res.status(404).json({ message: '先生が見つかりませんでした。' });
    }
    res.status(200).json({ message: '先生データの削除に成功' });
  } catch (error) {
    logger.error('先生データの削除に失敗:', error as Error);
    res.status(500).json({ message: '内部サーバーエラー' });
  }
});

export default router;
