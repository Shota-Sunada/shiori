import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { RowDataPacket } from 'mysql2';
import { logger } from '../logger';

const router = Router();

interface OtanoshimiData {
  name: string;
  enmoku: string;
  leader: number;
  members: number[];
  time: number;
  appearance_order: number;
  custom_performers: string[];
  comment: string;
  supervisor: string[];
}

router.get('/', async (req: Request, res: Response) => {
  logger.info('[otanoshimi] GET / リクエスト', { ip: req.ip });
  try {
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM otanoshimi_teams ORDER BY appearance_order ASC');
    const teams = rows.map((row) => ({
      ...row,
      members: JSON.parse(row.members || '[]'),
      custom_performers: JSON.parse(row.custom_performers || '[]'),
      comment: row.comment || '',
      supervisor: JSON.parse(row.supervisor || '[]')
    }));
    logger.info('[otanoshimi] チーム一覧取得', { count: teams.length });
    res.status(200).json(teams);
  } catch (error) {
    logger.error('Error fetching otanoshimi teams:', { error: String(error) });
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  const teams: OtanoshimiData[] = req.body;
  logger.info('[otanoshimi] POST / リクエスト', { ip: req.ip, body: req.body });
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute('TRUNCATE TABLE otanoshimi_teams');
    for (const t of teams) {
      const membersJson = JSON.stringify(t.members);
      const customPerformersJson = JSON.stringify(t.custom_performers);
      const supervisorJson = JSON.stringify(t.supervisor);
      await connection.execute('INSERT INTO otanoshimi_teams (name, enmoku, leader, members, time, appearance_order, custom_performers, comment, supervisor) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [
        t.name,
        t.enmoku,
        t.leader,
        membersJson,
        t.time,
        t.appearance_order,
        customPerformersJson,
        t.comment,
        supervisorJson
      ]);
    }
    await connection.commit();
    logger.info('[otanoshimi] チームデータ更新', { count: teams.length });
    res.status(200).json({ message: 'お楽しみ会チームの更新に成功' });
  } catch (error) {
    await connection.rollback();
    logger.error('お楽しみ会チームの更新に失敗:', { error: String(error) });
    res.status(500).json({ message: '内部サーバーエラー' });
  } finally {
    connection.release();
  }
});

export default router;
