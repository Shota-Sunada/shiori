import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { logger } from '../logger';
import { authenticateToken, isAdmin } from '../middleware/auth';

const router = Router();

// 全先生データを取得
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  logger.info(`[teachers] GET /teachers リクエスト:`, { ip: req.ip, query: req.query });
  try {
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM teachers');
    logger.info(`[teachers] 先生データ取得成功 件数: ${rows.length}`);
    res.status(200).json(rows);
  } catch (error) {
    logger.error('Error fetching teachers:', error as Error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 特定の先生データを取得
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  const { id } = req.params;
  logger.info(`[teachers] GET /teachers/${id} リクエスト:`, { ip: req.ip });
  try {
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM teachers WHERE id = ?', [id]);
    if (rows.length === 0) {
      logger.warn(`[teachers] GET /teachers/${id} 対象なし`);
      return res.status(404).json({ message: '先生が見つかりませんでした。' });
    }
    logger.info(`[teachers] 先生データ取得成功: ${id}`);
    res.status(200).json(rows[0]);
  } catch (error) {
    logger.error('先生データの取得に失敗:', error as Error);
    res.status(500).json({ message: '内部サーバーエラー' });
  }
});

// 新しい先生データを追加
router.post('/', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  const teacherData = req.body;
  const { id, surname, forename, room_fpr, room_tdh, shinkansen_day1_car_number, shinkansen_day1_seat, shinkansen_day4_car_number, shinkansen_day4_seat, day1id, day1bus, day3id, day3bus, day4class } =
    teacherData;
  logger.info(`[teachers] POST /teachers リクエスト:`, { id, surname, forename, ip: req.ip });

  if (!/^[0-9]{8}$/.test(String(id))) {
    logger.warn(`[teachers] POST /teachers 不正なID: ${id}`);
    return res.status(400).json({ message: 'IDは8桁の数字である必要があります。' });
  }

  try {
    const [userRows] = await pool.execute<RowDataPacket[]>('SELECT id, is_teacher FROM users WHERE id = ?', [id]);

    if (userRows.length === 0) {
      logger.warn(`[teachers] POST /teachers ユーザー未登録: ${id}`);
      return res.status(404).json({ message: '指定されたIDのユーザーが見つかりません。' });
    }

    if (!userRows[0].is_teacher) {
      logger.warn(`[teachers] POST /teachers is_teacher=false: ${id}`);
      return res.status(403).json({ message: '指定されたユーザーは先生ではありません。' });
    }

    await pool.execute(
      `INSERT INTO teachers (
        id, surname, forename,
        room_fpr, room_tdh,
        shinkansen_day1_car_number, shinkansen_day1_seat,
        shinkansen_day4_car_number, shinkansen_day4_seat,
        day1id, day1bus, day3id, day3bus, day4class
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, surname, forename, room_fpr, room_tdh, shinkansen_day1_car_number, shinkansen_day1_seat, shinkansen_day4_car_number, shinkansen_day4_seat, day1id, day1bus, day3id, day3bus, day4class]
    );
    logger.info(`[teachers] 先生追加成功: ${id}`);
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
  logger.info(`[teachers] PUT /teachers/${id} リクエスト:`, { body: teacherData, ip: req.ip });

  const fields = Object.keys(teacherData)
    .map((key) => `${key} = ?`)
    .join(', ');
  const values = Object.values(teacherData);

  if (fields.length === 0) {
    logger.warn(`[teachers] PUT /teachers/${id} 更新対象なし`);
    return res.status(400).json({ message: '更新対象なし' });
  }

  try {
    const [result] = await pool.execute(`UPDATE teachers SET ${fields} WHERE id = ?`, [...values, id]);

    if ((result as ResultSetHeader).affectedRows === 0) {
      logger.warn(`[teachers] PUT /teachers/${id} 対象なし`);
      return res.status(404).json({ message: '先生が見つかりませんでした。' });
    }
    logger.info(`[teachers] 先生データ更新成功: ${id}`);
    res.status(200).json({ message: '先生データの更新に成功' });
  } catch (error) {
    logger.error('先生データの更新に失敗:', error as Error);
    res.status(500).json({ message: '内部サーバーエラー' });
  }
});

// 特定の先生データを削除
router.delete('/:id', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  logger.info(`[teachers] DELETE /teachers/${id} リクエスト:`, { ip: req.ip });
  try {
    const [result] = await pool.execute('DELETE FROM teachers WHERE id = ?', [id]);

    if ((result as ResultSetHeader).affectedRows === 0) {
      logger.warn(`[teachers] DELETE /teachers/${id} 対象なし`);
      return res.status(404).json({ message: '先生が見つかりませんでした。' });
    }
    logger.info(`[teachers] 先生データ削除成功: ${id}`);
    res.status(200).json({ message: '先生データの削除に成功' });
  } catch (error) {
    logger.error('先生データの削除に失敗:', error as Error);
    res.status(500).json({ message: '内部サーバーエラー' });
  }
});

export default router;
