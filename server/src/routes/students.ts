import { Router, Request, Response } from 'express';
import { pool } from '../db'; // Import the database connection pool
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { logger } from '../logger';

const router = Router();

// 全生徒データを取得
router.get('/', async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM students');
    res.status(200).json(rows);
  } catch (error) {
    logger.error('Error fetching students:', error as Error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 特定の生徒データを取得
router.get('/:gakuseki', async (req: Request, res: Response) => {
  const { gakuseki } = req.params;
  try {
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM students WHERE gakuseki = ?', [gakuseki]);
    if (rows.length === 0) {
      return res.status(404).json({ message: '生徒が見つかりませんでした。' });
    }
    res.status(200).json(rows[0]); // 単一の生徒データを返す
  } catch (error) {
    logger.error('生徒データの取得に失敗:', error as Error);
    res.status(500).json({ message: '内部サーバーエラー' });
  }
});

// 新しい生徒データを追加
router.post('/', async (req: Request, res: Response) => {
  const studentData = req.body;
  const {
    gakuseki,
    surname,
    forename,
    surname_kana,
    forename_kana,
    class: studentClass,
    number: studentNumber,
    day1id,
    day3id,
    day1bus,
    day3bus,
    room_fpr,
    room_tdh,
    shinkansen_day1_car_number,
    shinkansen_day1_seat,
    shinkansen_day4_car_number,
    shinkansen_day4_seat
  } = studentData;

  try {
    await pool.execute(
      `INSERT INTO students (
        gakuseki, surname, forename, surname_kana, forename_kana,
        class, number, day1id, day3id,
        day1bus, day3bus, room_fpr, room_tdh,
        shinkansen_day1_car_number, shinkansen_day1_seat,
        shinkansen_day4_car_number, shinkansen_day4_seat
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        gakuseki,
        surname,
        forename,
        surname_kana,
        forename_kana,
        studentClass,
        studentNumber,
        day1id,
        day3id,
        day1bus,
        day3bus,
        room_fpr,
        room_tdh,
        shinkansen_day1_car_number,
        shinkansen_day1_seat,
        shinkansen_day4_car_number,
        shinkansen_day4_seat
      ]
    );
    res.status(201).json({ message: '生徒の追加に成功' });
  } catch (error) {
    logger.error('生徒の追加に失敗:', error as Error);
    res.status(500).json({ message: '内部サーバーエラー' });
  }
});

// 特定の生徒データを更新
function buildUpdate(data: Record<string, unknown>) {
  const keys = Object.keys(data);
  if (!keys.length) return { fragment: '', values: [] };
  return {
    fragment: keys.map((k) => `${k} = ?`).join(', '),
    values: keys.map((k) => data[k])
  };
}

router.put('/:gakuseki', async (req: Request, res: Response) => {
  const { gakuseki } = req.params;
  const { fragment, values } = buildUpdate(req.body);
  if (!fragment) return res.status(400).json({ message: '更新対象なし' });
  try {
    const [result] = await pool.execute(`UPDATE students SET ${fragment} WHERE gakuseki = ?`, [...values, gakuseki]);

    if ((result as ResultSetHeader).affectedRows === 0) {
      return res.status(404).json({ message: '生徒が見つかりませんでした。' });
    }
    res.status(200).json({ message: '生徒データの更新に成功' });
  } catch (error) {
    logger.error('生徒データの更新に失敗:', error as Error);
    res.status(500).json({ message: '内部サーバーエラー' });
  }
});

// 特定の生徒データを削除
router.delete('/:gakuseki', async (req: Request, res: Response) => {
  const { gakuseki } = req.params;
  try {
    const [result] = await pool.execute('DELETE FROM students WHERE gakuseki = ?', [gakuseki]);

    if ((result as ResultSetHeader).affectedRows === 0) {
      return res.status(404).json({ message: '生徒が見つかりませんでした。' });
    }
    res.status(200).json({ message: '生徒データの削除に成功' });
  } catch (error) {
    logger.error('生徒データの削除に失敗:', error as Error);
    res.status(500).json({ message: '内部サーバーエラー' });
  }
});

// JSONデータから一括で生徒データを更新/追加
router.post('/batch', async (req: Request, res: Response) => {
  const students = req.body;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    for (const studentData of students) {
      const { gakuseki, ...rest } = studentData;
      const [existing] = await connection.execute<RowDataPacket[]>('SELECT gakuseki FROM students WHERE gakuseki = ?', [gakuseki]);

      if (existing.length > 0) {
        // Update
        const fields = Object.keys(rest)
          .map((key) => `${key} = ?`)
          .join(', ');
        const values = Object.values(rest);
        await connection.execute(`UPDATE students SET ${fields} WHERE gakuseki = ?`, [...values, gakuseki]);
      } else {
        // Insert
        const columns = Object.keys(studentData).join(', ');
        const placeholders = Object.keys(studentData)
          .map(() => '?')
          .join(', ');
        const values = Object.values(studentData);
        await connection.execute(`INSERT INTO students (${columns}) VALUES (${placeholders})`, values);
      }
    }

    await connection.commit();
    res.status(200).json({ message: 'バッチ更新成功' });
  } catch (error) {
    await connection.rollback();
    logger.error('バッチ更新に失敗:', error as Error);
    res.status(500).json({ message: '内部サーバーエラー' });
  } finally {
    connection.release();
  }
});

// ホテルと部屋番号からルームメイトを取得
router.get('/roommates/:hotel/:room', async (req: Request, res: Response) => {
  const { hotel, room } = req.params;
  let roomColumn: string;

  if (hotel === 'tdh') {
    roomColumn = 'room_tdh';
  } else if (hotel === 'fpr') {
    roomColumn = 'room_fpr';
  } else {
    return res.status(400).json({ message: '無効なホテルが指定されました。' });
  }

  try {
    const [rows] = await pool.execute<RowDataPacket[]>(`SELECT gakuseki, surname, forename, class, number FROM students WHERE ${roomColumn} = ?`, [room]);
    res.status(200).json(rows);
  } catch (error) {
    logger.error('ルームメイトの取得に失敗:', error as Error);
    res.status(500).json({ message: '内部サーバーエラー' });
  }
});

export default router;
