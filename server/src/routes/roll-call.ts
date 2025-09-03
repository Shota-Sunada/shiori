import express from 'express';
import crypto from 'crypto';
import { pool } from '../db';
import { logger } from '../logger';
import { sendNotification } from '../notifications';
import { RowDataPacket } from 'mysql2';

interface MySQLError extends Error {
  code: string;
  errno: number;
}

function isMySQLError(error: unknown): error is MySQLError {
  return typeof error === 'object' && error !== null && 'code' in error && 'errno' in error;
}

const router = express.Router();

router.post('/start', async (req, res) => {
  const { teacher_id } = req.body;

  if (!teacher_id) {
    return res.status(400).json({ message: '先生のIDが必要です。' });
  }

  const rollCallId = crypto.randomUUID();

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute('INSERT INTO roll_calls (id, teacher_id) VALUES (?, ?)', [rollCallId, teacher_id]);

    const [students] = await connection.execute<RowDataPacket[]>('SELECT gakuseki FROM students');

    const notificationTitle = '点呼が開始されました';
    const notificationBody = 'アプリを開いて出欠を確認してください。';
    const notificationLink = `/call/${rollCallId}`;

    for (const student of students) {
      // Don't await here to send notifications in parallel
      sendNotification(student.gakuseki.toString(), notificationTitle, notificationBody, notificationLink);
    }

    await connection.commit();
    logger.log(`新しい点呼セッションが開始されました: ${rollCallId}`);
    res.status(201).json({ rollCallId });
  } catch (error) {
    await connection.rollback();
    logger.error('点呼セッションの開始中にエラーが発生しました:', error as Error);
    res.status(500).json({ message: 'サーバーエラー' });
  } finally {
    connection.release();
  }
});

router.post('/check-in', async (req, res) => {
  const { roll_call_id, student_id } = req.body;

  if (!roll_call_id || !student_id) {
    return res.status(400).json({ message: '点呼IDと生徒IDが必要です。' });
  }

  try {
    await pool.execute(
      'INSERT INTO roll_call_students (roll_call_id, student_id) VALUES (?, ?)',
      [roll_call_id, student_id]
    );
    logger.log(`生徒「${student_id}」が点呼「${roll_call_id}」に応答しました。`);
    res.status(200).json({ message: '点呼に応答しました。' });
  } catch (error) {
    if (isMySQLError(error) && error.code === 'ER_DUP_ENTRY') {
      logger.warn(`生徒「${student_id}」が点呼「${roll_call_id}」に再度応答しようとしました。`);
      return res.status(200).json({ message: 'すでに応答済みです。' });
    }
    logger.error('点呼への応答中にエラーが発生しました:', error as Error);
    res.status(500).json({ message: 'サーバーエラー' });
  }
});

export default router;
