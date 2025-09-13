import express from 'express';
import { pool } from '../db';
import type { Course, Schedule, Event, EventDetail } from '../models/schedule';
import { ResultSetHeader } from 'mysql2/promise';

const router = express.Router();

// スケジュール一覧取得
router.get('/', async (req, res) => {
  try {
    // courses → schedules → events → event_details をネストして取得（DBのsnake_case→camelCaseにエイリアス）
    const [coursesRaw] = await pool.query('SELECT id, course_key as courseKey, name FROM courses');
    const [schedulesRaw] = await pool.query('SELECT id, course_id as courseId, title FROM schedules');
    const [eventsRaw] = await pool.query(
      'SELECT id, schedule_id as scheduleId, memo, time1_hour as time1Hour, time1_minute as time1Minute, time1_postfix as time1Postfix, time2_hour as time2Hour, time2_minute as time2Minute, time2_postfix as time2Postfix FROM events'
    );
    const [eventDetailsRaw] = await pool.query(
      'SELECT id, event_id as eventId, memo, time1_hour as time1Hour, time1_minute as time1Minute, time2_hour as time2Hour, time2_minute as time2Minute FROM event_details'
    );

    const courses = coursesRaw as Course[];
    const schedules = schedulesRaw as Schedule[];
    const events = eventsRaw as Event[];
    const eventDetails = eventDetailsRaw as EventDetail[];

    // ネスト構造を組み立て
    const eventDetailsByEvent: { [key: number]: EventDetail[] } = {};
    for (const detail of eventDetails) {
      if (!eventDetailsByEvent[detail.eventId]) eventDetailsByEvent[detail.eventId] = [];
      eventDetailsByEvent[detail.eventId].push(detail);
    }
    const eventsBySchedule: { [key: number]: (Event & { details: EventDetail[] })[] } = {};
    for (const event of events) {
      const eventWithDetails = { ...event, details: eventDetailsByEvent[event.id] || [] };
      if (!eventsBySchedule[event.scheduleId]) eventsBySchedule[event.scheduleId] = [];
      eventsBySchedule[event.scheduleId].push(eventWithDetails);
    }
    const schedulesByCourse: { [key: number]: (Schedule & { events: (Event & { details: EventDetail[] })[] })[] } = {};
    for (const schedule of schedules) {
      const scheduleWithEvents = { ...schedule, events: eventsBySchedule[schedule.id] || [] };
      if (!schedulesByCourse[schedule.courseId]) schedulesByCourse[schedule.courseId] = [];
      schedulesByCourse[schedule.courseId].push(scheduleWithEvents);
    }
    type CourseRow = { id: number; courseKey?: string; course_key?: string; name?: string | null };
    const result = (courses as CourseRow[]).map((c) => ({
      id: c.id,
      course_key: c.course_key ?? c.courseKey ?? '',
      name: c.name ?? undefined,
      schedules: schedulesByCourse[c.id] || []
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'DB error', detail: err });
  }
});

// COURSES_DAY1からのコース作成（course_key重複は無視/上書き）
router.post('/courses', async (req, res) => {
  try {
    const { course_key, name } = req.body || {};
    if (!course_key) return res.status(400).json({ error: 'course_key is required' });
    const [result] = await pool.execute<ResultSetHeader>('INSERT INTO courses (course_key, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)', [course_key, name ?? null]);
    res.json({ ok: true, id: result.insertId || null });
  } catch (err) {
    res.status(500).json({ error: 'DB error', detail: String(err) });
  }
});

// スケジュール新規作成
router.post('/', async (req, res) => {
  try {
    const { courseId, title } = req.body || {};
    if (!courseId || !title) return res.status(400).json({ error: 'courseId and title are required' });
    const [r] = await pool.execute<ResultSetHeader>('INSERT INTO schedules (course_id, title) VALUES (?, ?)', [Number(courseId), String(title)]);
    res.json({ ok: true, id: r.insertId });
  } catch (err) {
    res.status(500).json({ error: 'DB error', detail: String(err) });
  }
});

// スケジュール更新
router.put('/:scheduleId', async (req, res) => {
  try {
    const id = Number(req.params.scheduleId);
    const { title } = req.body || {};
    if (!id || !title) return res.status(400).json({ error: 'scheduleId and title are required' });
    await pool.execute('UPDATE schedules SET title = ? WHERE id = ?', [String(title), id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'DB error', detail: String(err) });
  }
});

// イベント新規作成
router.post('/:scheduleId/events', async (req, res) => {
  try {
    const scheduleId = Number(req.params.scheduleId);
    const { memo, time1Hour, time1Minute, time1Postfix, time2Hour, time2Minute, time2Postfix } = req.body || {};
    if (!scheduleId || !memo) return res.status(400).json({ error: 'scheduleId and memo are required' });
    const num = (v: unknown) => (v === '' || v === undefined || v === null ? null : Number(v));
    const [r] = await pool.execute<ResultSetHeader>(
      'INSERT INTO events (schedule_id, memo, time1_hour, time1_minute, time1_postfix, time2_hour, time2_minute, time2_postfix) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [scheduleId, String(memo), num(time1Hour), num(time1Minute), time1Postfix ?? null, num(time2Hour), num(time2Minute), time2Postfix ?? null]
    );
    res.json({ ok: true, id: r.insertId });
  } catch (err) {
    res.status(500).json({ error: 'DB error', detail: String(err) });
  }
});

// イベント更新
router.put('/events/:eventId', async (req, res) => {
  try {
    const eventId = Number(req.params.eventId);
    const { memo, time1Hour, time1Minute, time1Postfix, time2Hour, time2Minute, time2Postfix } = req.body || {};
    if (!eventId || !memo) return res.status(400).json({ error: 'eventId and memo are required' });
    const num = (v: unknown) => (v === '' || v === undefined || v === null ? null : Number(v));
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
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'DB error', detail: String(err) });
  }
});

// イベント詳細 新規作成
router.post('/events/:eventId/details', async (req, res) => {
  try {
    const eventId = Number(req.params.eventId);
    const { memo, time1Hour, time1Minute, time2Hour, time2Minute } = req.body || {};
    if (!eventId || !memo) return res.status(400).json({ error: 'eventId and memo are required' });
    const num = (v: unknown) => (v === '' || v === undefined || v === null ? null : Number(v));
    const [r] = await pool.execute<ResultSetHeader>('INSERT INTO event_details (event_id, memo, time1_hour, time1_minute, time2_hour, time2_minute) VALUES (?, ?, ?, ?, ?, ?)', [
      eventId,
      String(memo),
      num(time1Hour),
      num(time1Minute),
      num(time2Hour),
      num(time2Minute)
    ]);
    res.json({ ok: true, id: r.insertId });
  } catch (err) {
    res.status(500).json({ error: 'DB error', detail: String(err) });
  }
});

// イベント詳細 更新
router.put('/event-details/:detailId', async (req, res) => {
  try {
    const detailId = Number(req.params.detailId);
    const { memo, time1Hour, time1Minute, time2Hour, time2Minute } = req.body || {};
    if (!detailId || !memo) return res.status(400).json({ error: 'detailId and memo are required' });
    const num = (v: unknown) => (v === '' || v === undefined || v === null ? null : Number(v));
    await pool.execute('UPDATE event_details SET memo = ?, time1_hour = ?, time1_minute = ?, time2_hour = ?, time2_minute = ? WHERE id = ?', [
      String(memo),
      num(time1Hour),
      num(time1Minute),
      num(time2Hour),
      num(time2Minute),
      detailId
    ]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'DB error', detail: String(err) });
  }
});

// 削除API
router.delete('/courses/:courseId', async (req, res) => {
  try {
    const id = Number(req.params.courseId);
    if (!id) return res.status(400).json({ error: 'courseId is required' });
    await pool.execute('DELETE FROM courses WHERE id = ?', [id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'DB error', detail: String(err) });
  }
});

router.delete('/events/:eventId', async (req, res) => {
  try {
    const id = Number(req.params.eventId);
    if (!id) return res.status(400).json({ error: 'eventId is required' });
    await pool.execute('DELETE FROM events WHERE id = ?', [id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'DB error', detail: String(err) });
  }
});

router.delete('/event-details/:detailId', async (req, res) => {
  try {
    const id = Number(req.params.detailId);
    if (!id) return res.status(400).json({ error: 'detailId is required' });
    await pool.execute('DELETE FROM event_details WHERE id = ?', [id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'DB error', detail: String(err) });
  }
});

router.delete('/:scheduleId', async (req, res) => {
  try {
    const id = Number(req.params.scheduleId);
    if (!id) return res.status(400).json({ error: 'scheduleId is required' });
    await pool.execute('DELETE FROM schedules WHERE id = ?', [id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'DB error', detail: String(err) });
  }
});

// 旧プレースホルダーは削除

export default router;
