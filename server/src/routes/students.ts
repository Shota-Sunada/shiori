import { Router, Request, Response } from 'express';
import {pool} from '../db'; // Import the database connection pool
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const router = Router();

// 全生徒データを取得
router.get('/', async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM students');
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 新しい生徒データを追加
router.post('/', async (req: Request, res: Response) => {
  const studentData = req.body;
  const {
    gakuseki, surname, forename, surname_kana, forename_kana,
    class: studentClass, number: studentNumber, day1id, day3id,
    day1bus, day3bus, room_shizuoka, room_tokyo,
    shinkansen_day1_car_number, shinkansen_day1_seat,
    shinkansen_day4_car_number, shinkansen_day4_seat
  } = studentData;

  try {
    await pool.execute(
      `INSERT INTO students (
        gakuseki, surname, forename, surname_kana, forename_kana,
        class, number, day1id, day3id,
        day1bus, day3bus, room_shizuoka, room_tokyo,
        shinkansen_day1_car_number, shinkansen_day1_seat,
        shinkansen_day4_car_number, shinkansen_day4_seat
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        gakuseki, surname, forename, surname_kana, forename_kana,
        studentClass, studentNumber, day1id, day3id,
        day1bus, day3bus, room_shizuoka, room_tokyo,
        shinkansen_day1_car_number, shinkansen_day1_seat,
        shinkansen_day4_car_number, shinkansen_day4_seat
      ]
    );
    res.status(201).json({ message: 'Student added successfully' });
  } catch (error) {
    console.error('Error adding student:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 特定の生徒データを更新
router.put('/:gakuseki', async (req: Request, res: Response) => {
  const { gakuseki } = req.params;
  const studentData = req.body; // 部分更新を考慮

  const fields = Object.keys(studentData).map(key => `${key} = ?`).join(', ');
  const values = Object.values(studentData);

  if (fields.length === 0) {
    return res.status(400).json({ message: 'No fields to update' });
  }

  try {
    const [result] = await pool.execute(
      `UPDATE students SET ${fields} WHERE gakuseki = ?`,
      [...values, gakuseki]
    );

    if ((result as ResultSetHeader).affectedRows === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.status(200).json({ message: 'Student updated successfully' });
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 特定の生徒データを削除
router.delete('/:gakuseki', async (req: Request, res: Response) => {
  const { gakuseki } = req.params;
  try {
    const [result] = await pool.execute(
      'DELETE FROM students WHERE gakuseki = ?',
      [gakuseki]
    );

    if ((result as ResultSetHeader).affectedRows === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.status(200).json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ message: 'Internal server error' });
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
      const [existing] = await connection.execute<RowDataPacket[]>(
        'SELECT gakuseki FROM students WHERE gakuseki = ?',
        [gakuseki]
      );

      if (existing.length > 0) {
        // Update
        const fields = Object.keys(rest).map(key => `${key} = ?`).join(', ');
        const values = Object.values(rest);
        await connection.execute(
          `UPDATE students SET ${fields} WHERE gakuseki = ?`,
          [...values, gakuseki]
        );
      } else {
        // Insert
        const columns = Object.keys(studentData).join(', ');
        const placeholders = Object.keys(studentData).map(() => '?').join(', ');
        const values = Object.values(studentData);
        await connection.execute(
          `INSERT INTO students (${columns}) VALUES (${placeholders})`,
          values
        );
      }
    }

    await connection.commit();
    res.status(200).json({ message: 'Batch update successful' });
  } catch (error) {
    await connection.rollback();
    console.error('Error during batch update:', error);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    connection.release();
  }
});

export default router;
