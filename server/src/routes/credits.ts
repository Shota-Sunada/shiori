import { Router } from 'express';
import { pool } from '../db';
import { logger } from '../logger';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT category, items FROM credits ORDER BY id ASC');
    res.json(rows);
    logger.debug('クレジットデータ取得成功');
  } catch (error) {
    logger.error('クレジットデータの取得中にエラーが発生しました:', error as Error);
    res.status(500).json({ message: 'サーバーエラー' });
  }
});

export default router;
