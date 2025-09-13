import express, { Request, Response } from 'express';
import { pool } from '../db';
import type { Course, Schedule, Event, EventDetail } from '../models/schedule';
import { ResultSetHeader, FieldPacket } from 'mysql2/promise';
import { logger } from '../logger';

const router: express.Router = express.Router();

// スケジュール一覧取得
router.get('/', async (req: Request, res: Response): Promise<void> => {
  logger.info(`[schedule] GET /schedule リクエスト:`, { ip: req.ip, query: req.query });
  try {
    const [coursesRaw] = (await pool.query('SELECT id, course_key as courseKey, name FROM courses')) as [Course[], FieldPacket[]];
    const [schedulesRaw] = (await pool.query('SELECT id, course_id as courseId, title FROM schedules')) as [Schedule[], FieldPacket[]];
    const [eventsRaw] = (await pool.query(
      'SELECT id, schedule_id as scheduleId, memo, time1_hour as time1Hour, time1_minute as time1Minute, time1_postfix as time1Postfix, time2_hour as time2Hour, time2_minute as time2Minute, time2_postfix as time2Postfix FROM events'
    )) as [Event[], FieldPacket[]];
    const [eventDetailsRaw] = (await pool.query(
      'SELECT id, event_id as eventId, memo, time1_hour as time1Hour, time1_minute as time1Minute, time2_hour as time2Hour, time2_minute as time2Minute FROM event_details'
    )) as [EventDetail[], FieldPacket[]];

    const courses: Course[] = coursesRaw;
    const schedules: Schedule[] = schedulesRaw;
    const events: Event[] = eventsRaw;
    const eventDetails: EventDetail[] = eventDetailsRaw;

    const eventDetailsByEvent: { [key: number]: EventDetail[] } = {};
    for (const detail of eventDetails) {
      if (!eventDetailsByEvent[detail.eventId]) eventDetailsByEvent[detail.eventId] = [];
      eventDetailsByEvent[detail.eventId].push(detail);
    }
    const eventsBySchedule: { [key: number]: (Event & { details: EventDetail[] })[] } = {};
    for (const event of events) {
      const eventWithDetails: Event & { details: EventDetail[] } = { ...event, details: eventDetailsByEvent[event.id] || [] };
      if (!eventsBySchedule[event.scheduleId]) eventsBySchedule[event.scheduleId] = [];
      eventsBySchedule[event.scheduleId].push(eventWithDetails);
    }
    const schedulesByCourse: { [key: number]: (Schedule & { events: (Event & { details: EventDetail[] })[] })[] } = {};
    for (const schedule of schedules) {
      const scheduleWithEvents: Schedule & { events: (Event & { details: EventDetail[] })[] } = { ...schedule, events: eventsBySchedule[schedule.id] || [] };
      if (!schedulesByCourse[schedule.courseId]) schedulesByCourse[schedule.courseId] = [];
      schedulesByCourse[schedule.courseId].push(scheduleWithEvents);
    }
    type CourseRow = { id: number; courseKey?: string; course_key?: string; name?: string | null };
    const result: Array<{ id: number; course_key: string; name?: string; schedules: (Schedule & { events: (Event & { details: EventDetail[] })[] })[] }> = (courses as CourseRow[]).map((c) => ({
      id: c.id,
      course_key: c.course_key ?? c.courseKey ?? '',
      name: c.name ?? undefined,
      schedules: schedulesByCourse[c.id] || []
    }));
    logger.info(`[schedule] スケジュールデータ取得成功 件数: ${result.length}`);
    res.json(result);
  } catch (err: unknown) {
    logger.error('[schedule] スケジュール一覧取得失敗:', { error: String(err) });
    res.status(500).json({ error: 'DB error', detail: String(err) });
  }
});

// COURSES_DAY1からのコース作成（course_key重複は無視/上書き）
router.post('/courses', async (req: Request, res: Response): Promise<void> => {
  logger.info(`[schedule] POST /schedule/courses リクエスト:`, { body: req.body, ip: req.ip });
  try {
    const { course_key, name }: { course_key?: string; name?: string } = req.body || {};
    if (!course_key) {
      res.status(400).json({ error: 'course_key is required' });
      return;
    }
    const [result]: [ResultSetHeader, unknown] = await pool.execute<ResultSetHeader>('INSERT INTO courses (course_key, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)', [
      course_key,
      name ?? null
    ]);
    logger.info(`[schedule] コース追加/更新: ${course_key}`);
    res.json({ ok: true, id: result.insertId || null });
  } catch (err: unknown) {
    logger.error('[schedule] コース追加/更新失敗:', { error: String(err) });
    res.status(500).json({ error: 'DB error', detail: String(err) });
  }
});

// スケジュール新規作成
router.post('/', async (req: Request, res: Response): Promise<void> => {
  logger.info(`[schedule] POST /schedule リクエスト:`, { body: req.body, ip: req.ip });
  try {
    const { courseId, title }: { courseId?: number; title?: string } = req.body || {};
    if (!courseId || !title) {
      res.status(400).json({ error: 'courseId and title are required' });
      return;
    }
    const [r]: [ResultSetHeader, unknown] = await pool.execute<ResultSetHeader>('INSERT INTO schedules (course_id, title) VALUES (?, ?)', [Number(courseId), String(title)]);
    logger.info(`[schedule] スケジュール追加: courseId=${courseId}, title=${title}`);
    res.json({ ok: true, id: r.insertId });
  } catch (err: unknown) {
    logger.error('[schedule] スケジュール追加失敗:', { error: String(err) });
    res.status(500).json({ error: 'DB error', detail: String(err) });
  }
});

// スケジュール更新
router.put('/:scheduleId', async (req: Request, res: Response): Promise<void> => {
  const id: number = Number(req.params.scheduleId);
  logger.info(`[schedule] PUT /schedule/${id} リクエスト:`, { body: req.body, ip: req.ip });
  try {
    const { title }: { title?: string } = req.body || {};
    if (!id || !title) {
      res.status(400).json({ error: 'scheduleId and title are required' });
      return;
    }
    await pool.execute('UPDATE schedules SET title = ? WHERE id = ?', [String(title), id]);
    logger.info(`[schedule] スケジュール更新: id=${id}, title=${title}`);
    res.json({ ok: true });
  } catch (err: unknown) {
    logger.error('[schedule] スケジュール更新失敗:', { error: String(err) });
    res.status(500).json({ error: 'DB error', detail: String(err) });
  }
});

// イベント新規作成
router.post('/:scheduleId/events', async (req: Request, res: Response): Promise<void> => {
  const scheduleId: number = Number(req.params.scheduleId);
  logger.info(`[schedule] POST /schedule/${scheduleId}/events リクエスト:`, { body: req.body, ip: req.ip });
  try {
    const {
      memo,
      time1Hour,
      time1Minute,
      time1Postfix,
      time2Hour,
      time2Minute,
      time2Postfix
    }: {
      memo?: string;
      time1Hour?: number;
      time1Minute?: number;
      time1Postfix?: string;
      time2Hour?: number;
      time2Minute?: number;
      time2Postfix?: string;
    } = req.body || {};
    if (!scheduleId || !memo) {
      res.status(400).json({ error: 'scheduleId and memo are required' });
      return;
    }
    const num = (v: unknown): number | null => (v === '' || v === undefined || v === null ? null : Number(v));
    const [r]: [ResultSetHeader, unknown] = await pool.execute<ResultSetHeader>(
      'INSERT INTO events (schedule_id, memo, time1_hour, time1_minute, time1_postfix, time2_hour, time2_minute, time2_postfix) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [scheduleId, String(memo), num(time1Hour), num(time1Minute), time1Postfix ?? null, num(time2Hour), num(time2Minute), time2Postfix ?? null]
    );
    logger.info(`[schedule] イベント追加: scheduleId=${scheduleId}, memo=${memo}`);
    res.json({ ok: true, id: r.insertId });
  } catch (err: unknown) {
    logger.error('[schedule] イベント追加失敗:', { error: String(err) });
    res.status(500).json({ error: 'DB error', detail: String(err) });
  }
});

// イベント更新
router.put('/events/:eventId', async (req: Request, res: Response): Promise<void> => {
  const eventId: number = Number(req.params.eventId);
  logger.info(`[schedule] PUT /schedule/events/${eventId} リクエスト:`, { body: req.body, ip: req.ip });
  try {
    const {
      memo,
      time1Hour,
      time1Minute,
      time1Postfix,
      time2Hour,
      time2Minute,
      time2Postfix
    }: {
      memo?: string;
      time1Hour?: number;
      time1Minute?: number;
      time1Postfix?: string;
      time2Hour?: number;
      time2Minute?: number;
      time2Postfix?: string;
    } = req.body || {};
    if (!eventId || !memo) {
      res.status(400).json({ error: 'eventId and memo are required' });
      return;
    }
    const num = (v: unknown): number | null => (v === '' || v === undefined || v === null ? null : Number(v));
    await pool.execute('UPDATE events SET memo = ?, time1_hour = ?, time1_minute = ?, time1_postfix = ?, time2_hour = ?, time2_minute = ?, time2_postfix = ? WHERE id = ?', [
      String(memo),
      num(time1Hour),
      num(time1Minute),
      time1Postfix ?? null,
      num(time2Hour),
      num(time2Minute),
      time2Postfix ?? null,
      eventId
    ]);
    logger.info(`[schedule] イベント更新: eventId=${eventId}, memo=${memo}`);
    res.json({ ok: true });
  } catch (err: unknown) {
    logger.error('[schedule] イベント更新失敗:', { error: String(err) });
    res.status(500).json({ error: 'DB error', detail: String(err) });
  }
});

// イベント詳細 新規作成
router.post('/events/:eventId/details', async (req: Request, res: Response): Promise<void> => {
  const eventId: number = Number(req.params.eventId);
  logger.info(`[schedule] POST /schedule/events/${eventId}/details リクエスト:`, { body: req.body, ip: req.ip });
  try {
    const {
      memo,
      time1Hour,
      time1Minute,
      time2Hour,
      time2Minute
    }: {
      memo?: string;
      time1Hour?: number;
      time1Minute?: number;
      time2Hour?: number;
      time2Minute?: number;
    } = req.body || {};
    if (!eventId || !memo) {
      res.status(400).json({ error: 'eventId and memo are required' });
      return;
    }
    const num = (v: unknown): number | null => (v === '' || v === undefined || v === null ? null : Number(v));
    const [r]: [ResultSetHeader, unknown] = await pool.execute<ResultSetHeader>(
      'INSERT INTO event_details (event_id, memo, time1_hour, time1_minute, time2_hour, time2_minute) VALUES (?, ?, ?, ?, ?, ?)',
      [eventId, String(memo), num(time1Hour), num(time1Minute), num(time2Hour), num(time2Minute)]
    );
    logger.info(`[schedule] イベント詳細追加: eventId=${eventId}, memo=${memo}`);
    res.json({ ok: true, id: r.insertId });
  } catch (err: unknown) {
    logger.error('[schedule] イベント詳細追加失敗:', { error: String(err) });
    res.status(500).json({ error: 'DB error', detail: String(err) });
  }
});

// イベント詳細 更新
router.put('/event-details/:detailId', async (req: Request, res: Response): Promise<void> => {
  const detailId: number = Number(req.params.detailId);
  logger.info(`[schedule] PUT /schedule/event-details/${detailId} リクエスト:`, { body: req.body, ip: req.ip });
  try {
    const {
      memo,
      time1Hour,
      time1Minute,
      time2Hour,
      time2Minute
    }: {
      memo?: string;
      time1Hour?: number;
      time1Minute?: number;
      time2Hour?: number;
      time2Minute?: number;
    } = req.body || {};
    if (!detailId || !memo) {
      res.status(400).json({ error: 'detailId and memo are required' });
      return;
    }
    const num = (v: unknown): number | null => (v === '' || v === undefined || v === null ? null : Number(v));
    await pool.execute('UPDATE event_details SET memo = ?, time1_hour = ?, time1_minute = ?, time2_hour = ?, time2_minute = ? WHERE id = ?', [
      String(memo),
      num(time1Hour),
      num(time1Minute),
      num(time2Hour),
      num(time2Minute),
      detailId
    ]);
    logger.info(`[schedule] イベント詳細更新: detailId=${detailId}, memo=${memo}`);
    res.json({ ok: true });
  } catch (err: unknown) {
    logger.error('[schedule] イベント詳細更新失敗:', { error: String(err) });
    res.status(500).json({ error: 'DB error', detail: String(err) });
  }
});

// 削除API
router.delete('/courses/:courseId', async (req: Request, res: Response): Promise<void> => {
  const id: number = Number(req.params.courseId);
  logger.info(`[schedule] DELETE /schedule/courses/${id} リクエスト:`, { ip: req.ip });
  try {
    if (!id) {
      res.status(400).json({ error: 'courseId is required' });
      return;
    }
    await pool.execute('DELETE FROM courses WHERE id = ?', [id]);
    logger.info(`[schedule] コース削除: id=${id}`);
    res.json({ ok: true });
  } catch (err: unknown) {
    logger.error('[schedule] コース削除失敗:', { error: String(err) });
    res.status(500).json({ error: 'DB error', detail: String(err) });
  }
});

router.delete('/events/:eventId', async (req: Request, res: Response): Promise<void> => {
  const id: number = Number(req.params.eventId);
  logger.info(`[schedule] DELETE /schedule/events/${id} リクエスト:`, { ip: req.ip });
  try {
    if (!id) {
      res.status(400).json({ error: 'eventId is required' });
      return;
    }
    await pool.execute('DELETE FROM events WHERE id = ?', [id]);
    logger.info(`[schedule] イベント削除: id=${id}`);
    res.json({ ok: true });
  } catch (err: unknown) {
    logger.error('[schedule] イベント削除失敗:', { error: String(err) });
    res.status(500).json({ error: 'DB error', detail: String(err) });
  }
});

router.delete('/event-details/:detailId', async (req: Request, res: Response): Promise<void> => {
  const id: number = Number(req.params.detailId);
  logger.info(`[schedule] DELETE /schedule/event-details/${id} リクエスト:`, { ip: req.ip });
  try {
    if (!id) {
      res.status(400).json({ error: 'detailId is required' });
      return;
    }
    await pool.execute('DELETE FROM event_details WHERE id = ?', [id]);
    logger.info(`[schedule] イベント詳細削除: id=${id}`);
    res.json({ ok: true });
  } catch (err: unknown) {
    logger.error('[schedule] イベント詳細削除失敗:', { error: String(err) });
    res.status(500).json({ error: 'DB error', detail: String(err) });
  }
});

router.delete('/:scheduleId', async (req: Request, res: Response): Promise<void> => {
  const id: number = Number(req.params.scheduleId);
  logger.info(`[schedule] DELETE /schedule/${id} リクエスト:`, { ip: req.ip });
  try {
    if (!id) {
      res.status(400).json({ error: 'scheduleId is required' });
      return;
    }
    await pool.execute('DELETE FROM schedules WHERE id = ?', [id]);
    logger.info(`[schedule] スケジュール削除: id=${id}`);
    res.json({ ok: true });
  } catch (err: unknown) {
    logger.error('[schedule] スケジュール削除失敗:', { error: String(err) });
    res.status(500).json({ error: 'DB error', detail: String(err) });
  }
});

// 旧プレースホルダーは削除

export default router;
