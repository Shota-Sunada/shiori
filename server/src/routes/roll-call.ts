import express from 'express';
import crypto from 'crypto';
import { pool } from '../db';
import { logger } from '../logger';
import { sendNotification } from '../notifications';
import { RowDataPacket } from 'mysql2';

const router = express.Router();

// Middleware to update expired roll calls
const updateExpiredRollCalls = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    await pool.execute('UPDATE roll_calls SET is_active = FALSE WHERE expires_at <= NOW() AND is_active = TRUE');
    next();
  } catch (error) {
    logger.error('期限切れの点呼の更新中にエラーが発生しました:', error as Error);
    res.status(500).json({ message: 'サーバーエラー' });
  }
};

router.use(updateExpiredRollCalls);

router.get('/active', async (req, res) => {
  const { student_id } = req.query;

  if (!student_id) {
    return res.status(400).json({ message: '生徒IDが必要です。' });
  }

  try {
    const connection = await pool.getConnection();
    try {
      const [activeRollCallResult] = await connection.execute<RowDataPacket[]>(
        `
        SELECT rc.id, rc.teacher_id, UNIX_TIMESTAMP(rc.created_at) * 1000 AS created_at, UNIX_TIMESTAMP(rc.expires_at) * 1000 AS expires_at
        FROM roll_calls rc
        JOIN roll_call_students rcs ON rc.id = rcs.roll_call_id
        WHERE rcs.student_id = ? AND rc.is_active = TRUE
        `,
        [student_id]
      );

      if (activeRollCallResult.length > 0) {
        res.json(activeRollCallResult[0]);
      } else {
        res.json(null);
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    logger.error('有効な点呼の確認中にエラーが発生しました:', error as Error);
    res.status(500).json({ message: 'サーバーエラー' });
  }
});

router.get('/teacher/:teacher_id', async (req, res) => {
  const { teacher_id } = req.params;

  if (!teacher_id) {
    return res.status(400).json({ message: '先生IDが必要です。' });
  }

  try {
    const connection = await pool.getConnection();
    try {
      const [activeRollCalls] = await connection.execute<RowDataPacket[]>(
        `
        SELECT rc.id, rc.teacher_id, UNIX_TIMESTAMP(rc.created_at) * 1000 AS created_at, rc.is_active, UNIX_TIMESTAMP(rc.expires_at) * 1000 AS expires_at,
          COUNT(rcs.student_id) AS total_students,
          SUM(CASE WHEN rcs.status = 'checked_in' THEN 1 ELSE 0 END) AS checked_in_students
        FROM roll_calls rc
        JOIN roll_call_students rcs ON rc.id = rcs.roll_call_id
        WHERE rc.teacher_id = ?
        GROUP BY rc.id, rc.teacher_id, rc.created_at, rc.is_active, rc.expires_at
        ORDER BY rc.created_at DESC
        `,
        [teacher_id]
      );
      res.json(activeRollCalls);
    } finally {
      connection.release();
    }
  } catch (error) {
    logger.error('先生の有効な点呼の取得中にエラーが発生しました:', error as Error);
    res.status(500).json({ message: 'サーバーエラー' });
  }
});

router.get('/', async (req, res) => {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ message: '点呼IDが必要です。' });
  }

  const rollCallId = id as string;

  try {
    const connection = await pool.getConnection();
    try {
      const [rollCallResult] = await connection.execute<RowDataPacket[]>(
        'SELECT teacher_id, UNIX_TIMESTAMP(created_at) * 1000 AS created_at, is_active, UNIX_TIMESTAMP(expires_at) * 1000 AS expires_at FROM roll_calls WHERE id = ?',
        [rollCallId]
      );
      const rollCall = rollCallResult[0];

      if (!rollCall) {
        return res.status(404).json({ message: '指定された点呼セッションが見つかりません。' });
      }

      const [students] = await connection.execute<RowDataPacket[]>(
        `
        SELECT
          s.gakuseki, s.surname, s.forename, s.class, s.number, rcs.status, rca.reason AS absence_reason, rca.location
        FROM students s
        JOIN roll_call_students rcs ON s.gakuseki = rcs.student_id
        LEFT JOIN roll_call_absences rca ON rcs.roll_call_id = rca.roll_call_id AND s.gakuseki = rca.student_id
        WHERE rcs.roll_call_id = ?
        ORDER BY s.class, s.number
      `,
        [rollCallId]
      );

      res.json({
        rollCall,
        students
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    logger.error('点呼データの取得中にエラーが発生しました:', error as Error);
    res.status(500).json({ message: 'サーバーエラー' });
  }
});

router.post('/start', async (req, res) => {
  const { teacher_id, specific_student_id, duration_minutes, group_name } = req.body;

  if (!teacher_id) {
    return res.status(400).json({ message: '先生のIDが必要です。' });
  }

  if (!duration_minutes || isNaN(Number(duration_minutes)) || Number(duration_minutes) <= 0) {
    return res.status(400).json({ message: '有効な時間（分）を指定してください。' });
  }

  const rollCallId = crypto.randomUUID();
  const expiresAt = new Date(Math.round(Date.now() / 1000) * 1000 + Number(duration_minutes) * 60 * 1000);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute('INSERT INTO roll_calls (id, teacher_id, expires_at) VALUES (?, ?, ?)', [rollCallId, teacher_id, expiresAt]);

    let students: { gakuseki: number }[] = [];

    if (group_name) {
      const [groups] = await connection.execute<RowDataPacket[]>('SELECT student_ids FROM roll_call_groups WHERE name = ?', [group_name]);
      if (groups.length === 0) {
        await connection.rollback();
        return res.status(404).json({ message: '指定されたグループが見つかりません。' });
      }
      const studentIds = groups[0].student_ids;
      if (Array.isArray(studentIds)) {
        students = studentIds.map((id) => ({ gakuseki: id }));
      }
    } else if (specific_student_id) {
      const [studentRows] = await connection.execute<RowDataPacket[]>('SELECT gakuseki FROM students WHERE gakuseki = ?', [specific_student_id]);
      students = studentRows as { gakuseki: number }[];
    } else {
      const [studentRows] = await connection.execute<RowDataPacket[]>('SELECT gakuseki FROM students');
      students = studentRows as { gakuseki: number }[];
    }

    if (students.length === 0) {
      await connection.rollback();
      return res.status(400).json({ message: '対象の生徒が見つかりません。' });
    }

    const insertPromises = students.map((student) => connection.execute('INSERT INTO roll_call_students (roll_call_id, student_id) VALUES (?, ?)', [rollCallId, student.gakuseki]));
    await Promise.all(insertPromises);

    const notificationTitle = '点呼が開始されました';
    const notificationBody = 'アプリを開いて出欠を確認してください。';
    const notificationLink = `/call?id=${rollCallId}`;

    for (const student of students) {
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
    const [rollCallResult] = await pool.execute<RowDataPacket[]>('SELECT is_active FROM roll_calls WHERE id = ?', [roll_call_id]);
    const rollCall = rollCallResult[0];

    if (!rollCall || !rollCall.is_active) {
      return res.status(400).json({ message: 'この点呼はすでに終了しているか、無効です。' });
    }

    await pool.execute("UPDATE roll_call_students SET status = 'checked_in' WHERE roll_call_id = ? AND student_id = ?", [roll_call_id, student_id]);
    logger.log(`生徒「${student_id}」が点呼「${roll_call_id}」に応答しました。`);
    res.status(200).json({ message: '点呼に応答しました。' });
  } catch (error) {
    logger.error('点呼への応答中にエラーが発生しました:', error as Error);
    res.status(500).json({ message: 'サーバーエラー' });
  }
});

router.post('/end', async (req, res) => {
  const { roll_call_id } = req.body;

  if (!roll_call_id) {
    return res.status(400).json({ message: '点呼IDが必要です。' });
  }

  try {
    await pool.execute('UPDATE roll_calls SET is_active = FALSE WHERE id = ?', [roll_call_id]);
    logger.log(`点呼セッション「${roll_call_id}」が終了されました。`);
    res.status(200).json({ message: '点呼を終了しました。' });
  } catch (error) {
    logger.error('点呼の終了中にエラーが発生しました:', error as Error);
    res.status(500).json({ message: 'サーバーエラー' });
  }
});

router.post('/absence', async (req, res) => {
  const { roll_call_id, student_id, reason, location } = req.body;

  if (!roll_call_id || !student_id || !reason) {
    return res.status(400).json({ message: '点呼ID、生徒ID、および理由が必要です。' });
  }

  try {
    await pool.execute('INSERT INTO roll_call_absences (roll_call_id, student_id, reason, location) VALUES (?, ?, ?, ?)', [roll_call_id, student_id, reason, location]);
    logger.log(`生徒「${student_id}」が点呼「${roll_call_id}」不在としてマークしました。`);
    res.status(200).json({ message: '不在届を送信しました。' });
  } catch (error) {
    logger.error('不在届の送信中にエラーが発生しました:', error as Error);
    res.status(500).json({ message: 'サーバーエラー' });
  }
});

export default router;
