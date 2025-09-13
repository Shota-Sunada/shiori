import express from 'express';
import crypto from 'crypto';
import { pool } from '../db';
import { logger } from '../logger';
import { sendNotification } from '../notifications';
import { RowDataPacket } from 'mysql2';

const router = express.Router();

// Middleware to update expired roll calls
const updateExpiredRollCalls = async (req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> => {
  logger.info('[roll-call] 期限切れ点呼の自動更新チェック', { ip: req.ip });
  try {
    await pool.execute('UPDATE roll_calls SET is_active = FALSE WHERE expires_at <= NOW() AND is_active = TRUE');
    logger.info('[roll-call] 期限切れ点呼の自動更新完了');
    next();
  } catch (error) {
    logger.error('期限切れの点呼の更新中にエラーが発生しました:', { error: String(error) });
    res.status(500).json({ message: 'サーバーエラー' });
  }
};

router.use(updateExpiredRollCalls);

router.get('/active', async (req: express.Request, res: express.Response): Promise<void> => {
  logger.info('[roll-call] GET /active リクエスト', { query: req.query, ip: req.ip });
  const { student_id } = req.query;
  if (!student_id) {
    res.status(400).json({ message: '生徒IDが必要です。' });
    return;
  }

  try {
    const connection = await pool.getConnection();
    logger.info('[roll-call] DBコネクション取得 /active');
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
        logger.info('[roll-call] 有効な点呼データ取得', { student_id });
        res.json(activeRollCallResult[0]);
      } else {
        logger.info('[roll-call] 有効な点呼データなし', { student_id });
        res.json(null);
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    logger.error('有効な点呼の確認中にエラーが発生しました:', { error: String(error) });
    res.status(500).json({ message: 'サーバーエラー' });
  }
});

// 指定教師の点呼一覧 (従来仕様)
router.get('/teacher/:teacher_id', async (req: express.Request, res: express.Response): Promise<void> => {
  logger.info('[roll-call] GET /teacher/:teacher_id リクエスト', { params: req.params, ip: req.ip });
  const { teacher_id } = req.params;

  if (!teacher_id) {
    res.status(400).json({ message: '先生IDが必要です。' });
    return;
  }

  try {
    const connection = await pool.getConnection();
    logger.info('[roll-call] DBコネクション取得 /teacher/:teacher_id');
    try {
      const [activeRollCalls] = await connection.execute<RowDataPacket[]>(
        `
        SELECT rc.id,
               rc.teacher_id,
               t.surname AS teacher_surname,
               t.forename AS teacher_forename,
               UNIX_TIMESTAMP(rc.created_at) * 1000 AS created_at,
               rc.is_active,
               UNIX_TIMESTAMP(rc.expires_at) * 1000 AS expires_at,
               COUNT(rcs.student_id) AS total_students,
               SUM(CASE WHEN rcs.status = 'checked_in' THEN 1 ELSE 0 END) AS checked_in_students
        FROM roll_calls rc
        JOIN roll_call_students rcs ON rc.id = rcs.roll_call_id
        LEFT JOIN teachers t ON rc.teacher_id = t.id
        WHERE rc.teacher_id = ?
        GROUP BY rc.id, rc.teacher_id, t.surname, t.forename, rc.created_at, rc.is_active, rc.expires_at
        ORDER BY rc.created_at DESC
        `,
        [teacher_id]
      );
      logger.info('[roll-call] 先生の点呼一覧取得', { teacher_id });
      res.json(activeRollCalls);
    } finally {
      connection.release();
    }
  } catch (error) {
    logger.error('先生の有効な点呼の取得中にエラーが発生しました:', { error: String(error) });
    res.status(500).json({ message: 'サーバーエラー' });
  }
});

// 全教師の点呼一覧 (教師全員が閲覧できる想定)
router.get('/all', async (req: express.Request, res: express.Response): Promise<void> => {
  logger.info('[roll-call] GET /all リクエスト', { ip: req.ip });
  try {
    const connection = await pool.getConnection();
    logger.info('[roll-call] DBコネクション取得 /all');
    try {
      const [rows] = await connection.execute<RowDataPacket[]>(
        `
        SELECT rc.id,
               rc.teacher_id,
               t.surname AS teacher_surname,
               t.forename AS teacher_forename,
               UNIX_TIMESTAMP(rc.created_at) * 1000 AS created_at,
               rc.is_active,
               UNIX_TIMESTAMP(rc.expires_at) * 1000 AS expires_at,
               COUNT(rcs.student_id) AS total_students,
               SUM(CASE WHEN rcs.status = 'checked_in' THEN 1 ELSE 0 END) AS checked_in_students
        FROM roll_calls rc
        JOIN roll_call_students rcs ON rc.id = rcs.roll_call_id
        LEFT JOIN teachers t ON rc.teacher_id = t.id
        GROUP BY rc.id, rc.teacher_id, t.surname, t.forename, rc.created_at, rc.is_active, rc.expires_at
        ORDER BY rc.created_at DESC
        `
      );
      logger.info('[roll-call] 全教師の点呼一覧取得');
      res.json(rows);
    } finally {
      connection.release();
    }
  } catch (error) {
    logger.error('全点呼一覧取得中にエラーが発生しました:', { error: String(error) });
    res.status(500).json({ message: 'サーバーエラー' });
  }
});

// 生徒用: 自分の点呼履歴
router.get('/history', async (req: express.Request, res: express.Response): Promise<void> => {
  logger.info('[roll-call] GET /history リクエスト', { query: req.query, ip: req.ip });
  const { student_id, limit } = req.query;
  if (!student_id) {
    res.status(400).json({ message: '生徒IDが必要です。' });
    return;
  }
  // LIMIT 句は一部の MySQL 設定でプレースホルダ不許可になるため、安全にバリデーションして文字列埋め込み
  let takeNum = Number(limit);
  if (!Number.isFinite(takeNum) || takeNum <= 0) takeNum = 50;
  if (takeNum > 200) takeNum = 200;
  const take = Math.trunc(takeNum);

  try {
    const connection = await pool.getConnection();
    logger.info('[roll-call] DBコネクション取得 /history');
    try {
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT
            rc.id,
            rc.teacher_id,
            UNIX_TIMESTAMP(rc.created_at) * 1000 AS created_at,
            UNIX_TIMESTAMP(rc.expires_at) * 1000 AS expires_at,
            rc.is_active,
            rcs.status,
            rca.reason AS absence_reason,
            rca.location
          FROM roll_calls rc
          JOIN roll_call_students rcs ON rc.id = rcs.roll_call_id
          LEFT JOIN roll_call_absences rca ON rca.roll_call_id = rc.id AND rca.student_id = rcs.student_id
          WHERE rcs.student_id = ?
          ORDER BY rc.created_at DESC
          LIMIT ${take}`,
        [student_id]
      );
      logger.info('[roll-call] 生徒の点呼履歴取得', { student_id, take });
      res.json(rows);
    } finally {
      connection.release();
    }
  } catch (error) {
    logger.error('点呼履歴取得中にエラーが発生しました:', { error: String(error) });
    res.status(500).json({ message: 'サーバーエラー' });
  }
});

router.get('/', async (req: express.Request, res: express.Response): Promise<void> => {
  logger.info('[roll-call] GET / リクエスト', { query: req.query, ip: req.ip });
  const { id } = req.query;

  if (!id) {
    res.status(400).json({ message: '点呼IDが必要です。' });
    return;
  }

  const rollCallId = id as string;

  try {
    const connection = await pool.getConnection();
    logger.info('[roll-call] DBコネクション取得 /');
    try {
      const [rollCallResult] = await connection.execute<RowDataPacket[]>(
        `
        SELECT
          rc.teacher_id,
          t.surname AS teacher_surname,
          t.forename AS teacher_forename,
          UNIX_TIMESTAMP(rc.created_at) * 1000 AS created_at,
          rc.is_active,
          UNIX_TIMESTAMP(rc.expires_at) * 1000 AS expires_at
        FROM roll_calls rc
        LEFT JOIN teachers t ON rc.teacher_id = t.id
        WHERE rc.id = ?
        `,
        [rollCallId]
      );
      const rollCall = rollCallResult[0];

      if (!rollCall) {
        res.status(404).json({ message: '指定された点呼セッションが見つかりません。' });
        return;
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

      logger.info('[roll-call] 点呼詳細取得', { rollCallId: id });
      res.json({
        rollCall,
        students
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    logger.error('点呼データの取得中にエラーが発生しました:', { error: String(error) });
    res.status(500).json({ message: 'サーバーエラー' });
  }
});

router.post('/start', async (req: express.Request, res: express.Response): Promise<void> => {
  logger.info('[roll-call] POST /start リクエスト', { body: req.body, ip: req.ip });
  const { teacher_id, specific_student_id, duration_minutes, group_name } = req.body;

  if (!teacher_id) {
    res.status(400).json({ message: '先生のIDが必要です。' });
    return;
  }

  if (!duration_minutes || isNaN(Number(duration_minutes)) || Number(duration_minutes) <= 0) {
    res.status(400).json({ message: '有効な時間（分）を指定してください。' });
    return;
  }

  const rollCallId = crypto.randomUUID();
  const expiresAt = new Date(Math.round(Date.now() / 1000) * 1000 + Number(duration_minutes) * 60 * 1000);

  const connection = await pool.getConnection();
  logger.info('[roll-call] DBコネクション取得 /start');
  try {
    await connection.beginTransaction();
    await connection.execute('INSERT INTO roll_calls (id, teacher_id, expires_at) VALUES (?, ?, ?)', [rollCallId, teacher_id, expiresAt]);

    let students: { gakuseki: number }[] = [];

    if (group_name) {
      const [groups] = await connection.execute<RowDataPacket[]>('SELECT student_ids FROM roll_call_groups WHERE name = ?', [group_name]);
      if (groups.length === 0) {
        await connection.rollback();
        res.status(404).json({ message: '指定されたグループが見つかりません。' });
        return;
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
      res.status(400).json({ message: '対象の生徒が見つかりません。' });
      return;
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
    logger.info('[roll-call] 新しい点呼セッションが開始されました', { rollCallId, teacher_id, group_name, student_count: students.length });
    res.status(201).json({ rollCallId });
  } catch (error) {
    await connection.rollback();
    logger.error('点呼セッションの開始中にエラーが発生しました:', { error: String(error) });
    res.status(500).json({ message: 'サーバーエラー' });
  } finally {
    connection.release();
  }
});

router.post('/check-in', async (req: express.Request, res: express.Response): Promise<void> => {
  logger.info('[roll-call] POST /check-in リクエスト', { body: req.body, ip: req.ip });
  const { roll_call_id, student_id } = req.body;

  if (!roll_call_id || !student_id) {
    res.status(400).json({ message: '点呼IDと生徒IDが必要です。' });
    return;
  }

  try {
    const [rollCallResult] = await pool.execute<RowDataPacket[]>('SELECT is_active FROM roll_calls WHERE id = ?', [roll_call_id]);
    const rollCall = rollCallResult[0];

    if (!rollCall || !rollCall.is_active) {
      res.status(400).json({ message: 'この点呼はすでに終了しているか、無効です。' });
      return;
    }

    await pool.execute("UPDATE roll_call_students SET status = 'checked_in' WHERE roll_call_id = ? AND student_id = ?", [roll_call_id, student_id]);
    logger.info('[roll-call] 生徒が点呼に応答', { student_id, roll_call_id });
    res.status(200).json({ message: '点呼に応答しました。' });
  } catch (error) {
    logger.error('点呼への応答中にエラーが発生しました:', { error: String(error) });
    res.status(500).json({ message: 'サーバーエラー' });
  }
});

router.post('/end', async (req: express.Request, res: express.Response): Promise<void> => {
  logger.info('[roll-call] POST /end リクエスト', { body: req.body, ip: req.ip });
  const { roll_call_id } = req.body;

  if (!roll_call_id) {
    res.status(400).json({ message: '点呼IDが必要です。' });
    return;
  }

  try {
    await pool.execute('UPDATE roll_calls SET is_active = FALSE WHERE id = ?', [roll_call_id]);
    logger.info('[roll-call] 点呼セッションが終了', { roll_call_id });
    res.status(200).json({ message: '点呼を終了しました。' });
  } catch (error) {
    logger.error('点呼の終了中にエラーが発生しました:', { error: String(error) });
    res.status(500).json({ message: 'サーバーエラー' });
  }
});

router.post('/absence', async (req: express.Request, res: express.Response): Promise<void> => {
  logger.info('[roll-call] POST /absence リクエスト', { body: req.body, ip: req.ip });
  const { roll_call_id, student_id, reason, location } = req.body;

  if (!roll_call_id || !student_id || !reason) {
    res.status(400).json({ message: '点呼ID、生徒ID、および理由が必要です。' });
    return;
  }

  try {
    await pool.execute('INSERT INTO roll_call_absences (roll_call_id, student_id, reason, location) VALUES (?, ?, ?, ?)', [roll_call_id, student_id, reason, location]);
    logger.info('[roll-call] 生徒が不在を申告', { student_id, roll_call_id, reason, location });
    res.status(200).json({ message: '不在届を送信しました。' });
  } catch (error) {
    logger.error('不在届の送信中にエラーが発生しました:', { error: String(error) });
    res.status(500).json({ message: 'サーバーエラー' });
  }
});

export default router;
