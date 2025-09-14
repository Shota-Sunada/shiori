import { useState, useEffect } from 'react';
import { appFetch } from '../../helpers/apiClient';
import { SERVER_ENDPOINT } from '../../config/serverEndpoint';
import { COURSES_DAY1, COURSES_DAY3, COURSES_DAY4 } from '../../data/courses';
import type { COURSES_COMMON_KEY } from '../../components/TimeTable';

type EventDetail = {
  id: number;
  eventId: number;
  memo: string;
  time1Hour?: number;
  time1Minute?: number;
  time2Hour?: number;
  time2Minute?: number;
};
type Event = {
  id: number;
  scheduleId: number;
  memo: string;
  time1Hour?: number;
  time1Minute?: number;
  time1Postfix?: string;
  time2Hour?: number;
  time2Minute?: number;
  time2Postfix?: string;
  details: EventDetail[];
};
type Schedule = {
  id: number;
  courseId: number;
  title: string;
  events: Event[];
};
type Course = {
  id: number;
  course_key: string;
  name?: string;
  schedules: Schedule[];
};

const ScheduleAdmin = () => {
  const [data, setData] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<{ courseId: number; schedule: Schedule | null } | null>(null);
  const [editingEvent, setEditingEvent] = useState<{ scheduleId: number; event: Event | null } | null>(null);
  const [editingDetail, setEditingDetail] = useState<{ eventId: number; detail: EventDetail | null } | null>(null);
  const [input, setInput] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // 数字のみ許可するフィールド（時・分）
    const numericFields = new Set(['time1Hour', 'time1Minute', 'time2Hour', 'time2Minute']);
    let v = value;
    if (numericFields.has(name)) {
      // 全角数字を半角に正規化
      const toHalf = (s: string) => s.replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xff10 + 0x30));
      const half = toHalf(value);
      // 数字以外を除去し、最大2桁に制限
      v = half.replace(/\D/g, '').slice(0, 2);
    }
    setInput({ ...input, [name]: v });
  };

  // 入力バリデーション用ユーティリティ
  const parseIntOrNaN = (s?: string) => (s === undefined || s === '' ? NaN : parseInt(s, 10));
  const isValidHour = (n: number) => Number.isInteger(n) && n >= 0 && n <= 23;
  const isValidMinute = (n: number) => Number.isInteger(n) && n >= 0 && n <= 59;
  const validateTimeRequired = (hStr?: string, mStr?: string) => {
    const h = parseIntOrNaN(hStr);
    const m = parseIntOrNaN(mStr);
    if (!isValidHour(h) || !isValidMinute(m)) return false;
    return true;
  };
  const validateTimeOptionalPair = (hStr?: string, mStr?: string) => {
    const hasH = !!hStr;
    const hasM = !!mStr;
    if (!hasH && !hasM) return { ok: true };
    if (hasH !== hasM) return { ok: false, msg: '終了時刻は時・分を両方入力してください' };
    const h = parseIntOrNaN(hStr);
    const m = parseIntOrNaN(mStr);
    if (!isValidHour(h) || !isValidMinute(m)) return { ok: false, msg: '終了時刻が不正です（時は0–23、分は0–59）' };
    return { ok: true };
  };
  // ラベル付き（開始/終了など）で任意ペアのチェック
  const validateTimeOptionalPairLabeled = (label: string, hStr?: string, mStr?: string) => {
    const hasH = !!hStr;
    const hasM = !!mStr;
    if (!hasH && !hasM) return { ok: true } as const;
    if (hasH !== hasM) return { ok: false, msg: `${label}は時・分を両方入力してください` } as const;
    const h = parseIntOrNaN(hStr);
    const m = parseIntOrNaN(mStr);
    if (!isValidHour(h) || !isValidMinute(m)) return { ok: false, msg: `${label}が不正です（時は0–23、分は0–59）` } as const;
    return { ok: true } as const;
  };
  // 時刻（時・分）から分に変換（どちらも未入力なら null を返す）
  const toMinutesIfPresent = (hStr?: string, mStr?: string) => {
    if (!hStr && !mStr) return null;
    const h = parseIntOrNaN(hStr);
    const m = parseIntOrNaN(mStr);
    if (!isValidHour(h) || !isValidMinute(m)) return null;
    return h * 60 + m;
  };

  useEffect(() => {
    appFetch<Course[]>(`${SERVER_ENDPOINT}/api/schedules`, { parse: 'json', alwaysFetch: true, requiresAuth: true })
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const refresh = async () => {
    try {
      const list = await appFetch<Course[]>(`${SERVER_ENDPOINT}/api/schedules`, { parse: 'json', alwaysFetch: true, requiresAuth: true });
      setData(list);
    } catch (e) {
      console.error(e);
    }
  };

  const COURSES_COMMON: { key: COURSES_COMMON_KEY; name: string }[] = [
    { key: 'day1_common1', name: '[1日目] 共通(昼)' },
    { key: 'day1_common2', name: '[1日目] 共通(夜)' },
    { key: 'day2_common', name: '[2日目] 共通' },
    { key: 'day3_common1', name: '[3日目] 共通(朝)' },
    { key: 'day3_common2', name: '[3日目] 共通(夜)' },
    { key: 'day4_common1', name: '[4日目] 共通(昼)' },
    { key: 'day4_common2', name: '[4日目] 共通(夜)' }
  ];

  const existingKeys = new Set((data || []).map((c) => c.course_key));
  const ALL_COURSES: Array<{ key: string; name: string }> = [
    ...COURSES_DAY1.map((c) => ({ key: c.key, name: `[1日目] ${c.name}` })),
    ...COURSES_DAY3.map((c) => ({ key: c.key, name: `[3日目] ${c.name}` })),
    ...COURSES_DAY4.map((c) => ({ key: c.key, name: `[4日目] ${c.name}` })),
    ...COURSES_COMMON.map((c) => ({ key: c.key, name: c.name }))
  ];
  const selectableCourses = ALL_COURSES.filter((c) => !existingKeys.has(c.key));

  if (loading) return <div>読み込み中...</div>;

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-extrabold text-blue-800 mb-6 tracking-tight drop-shadow-sm flex items-center gap-2">
          <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          スケジュール管理
        </h1>
        <div className="grid md:grid-cols-2 gap-6 sm:grid-cols-1">
          {data.map((course: Course) => (
            <div key={course.id} className="rounded-xl shadow-lg border border-blue-100 bg-white p-4 mb-2 transition hover:shadow-xl">
              <div className="flex flex-col gap-2">
                <h2 className="text-lg md:text-xl font-bold text-blue-700 flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  {course.name || course.course_key}
                </h2>
                <div className="flex flex-row flex-wrap gap-2 mb-2">
                  <button
                    className="text-xs px-2 py-1 mx-1 bg-yellow-400 rounded"
                    onClick={() => {
                      setEditingCourse(course);
                      setInput({ course_key: course.course_key ?? '', name: course.name ?? '' });
                    }}>
                    編集
                  </button>
                  <button
                    className="text-xs px-2 py-1 mx-1 bg-red-400 rounded"
                    onClick={() => {
                      if (!window.confirm('削除してもよろしいですか?')) return;
                      appFetch(`${SERVER_ENDPOINT}/api/schedules/courses/${course.id}`, { method: 'DELETE', requiresAuth: true })
                        .then(() => refresh())
                        .catch((e) => console.error(e));
                    }}>
                    削除
                  </button>
                  <button
                    className="text-xs px-2 py-1 mx-1 bg-blue-400 rounded"
                    onClick={() => {
                      setEditingSchedule({ courseId: course.id, schedule: null });
                      setInput({ title: '' });
                    }}>
                    ＋スケジュール追加
                  </button>
                </div>
                {editingCourse && editingCourse.id === course.id && (
                  <div className="bg-white rounded-lg shadow-md p-4 flex flex-col gap-4 border border-blue-100 my-2">
                    <div className="text-sm mb-2 text-gray-600">コースマスタに基づくため、既存コースのキーは変更できません。</div>
                    <div className="mb-2">
                      <span className="font-semibold text-gray-700">コースキー:</span> {course.course_key}
                    </div>
                    <div className="mb-2">
                      <span className="font-semibold text-gray-700">コース名:</span> {course.name}
                    </div>
                    <div className="flex flex-row gap-2 mt-2">
                      <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition" onClick={() => setEditingCourse(null)}>
                        閉じる
                      </button>
                      <button className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition" onClick={() => setEditingCourse(null)}>
                        キャンセル
                      </button>
                    </div>
                  </div>
                )}
                {course.schedules.map((schedule: Schedule) => (
                  <div key={schedule.id} className="rounded-lg border border-blue-100 bg-blue-50/40 p-3 mb-2">
                    <div className="flex flex-col gap-1">
                      <div className="mb-1">
                        {editingSchedule && editingSchedule.schedule && editingSchedule.schedule.id === schedule.id ? (
                          <div className="bg-white rounded-lg shadow-md p-4 flex flex-col gap-4 border border-blue-100 my-2">
                            <div>
                              <label className="block font-semibold text-gray-700 mb-1">タイトル</label>
                              <input
                                name="title"
                                value={input.title || ''}
                                onChange={handleInput}
                                placeholder="タイトル"
                                className="border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-300"
                              />
                            </div>
                            <div className="flex flex-row gap-2 mt-2">
                              <button
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                                onClick={() => {
                                  if (!editingSchedule?.schedule) return;
                                  if (!input.title || !input.title.trim()) {
                                    alert('タイトルは必須です');
                                    return;
                                  }
                                  const id = editingSchedule.schedule.id;
                                  const payload = { title: input.title.trim() };
                                  appFetch(`${SERVER_ENDPOINT}/api/schedules/${id}`, { method: 'PUT', requiresAuth: true, jsonBody: payload })
                                    .then(() => refresh())
                                    .then(() => setEditingSchedule(null))
                                    .catch((e) => {
                                      alert(`スケジュール更新に失敗しました: ${e.message}`);
                                      console.error(e);
                                    });
                                }}>
                                保存
                              </button>
                              <button className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition" onClick={() => setEditingSchedule(null)}>
                                キャンセル
                              </button>
                            </div>
                          </div>
                        ) : (
                          <h3 className="font-bold text-blue-900 text-base md:text-lg flex items-center gap-1">
                            <svg className="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            {schedule.title}
                          </h3>
                        )}
                      </div>
                      <div className="flex flex-row flex-wrap gap-2 mb-1">
                        <button
                          className="text-xs px-2 py-1 mx-1 bg-yellow-400 rounded"
                          onClick={() => {
                            setEditingSchedule({ courseId: course.id, schedule });
                            setInput({ title: schedule.title });
                          }}>
                          編集
                        </button>
                        <button
                          className="text-xs px-2 py-1 mx-1 bg-red-400 rounded"
                          onClick={() => {
                            if (!window.confirm('削除してもよろしいですか?')) return;
                            appFetch(`${SERVER_ENDPOINT}/api/schedules/${schedule.id}`, { method: 'DELETE', requiresAuth: true })
                              .then(() => refresh())
                              .catch((e) => console.error(e));
                          }}>
                          削除
                        </button>
                        <button
                          className="text-xs px-2 py-1 mx-1 bg-blue-400 rounded"
                          onClick={() => {
                            setEditingEvent({ scheduleId: schedule.id, event: null });
                            setInput({ memo: '', time1Hour: '', time1Minute: '', time1Postfix: '', time2Hour: '', time2Minute: '', time2Postfix: '' });
                          }}>
                          ＋イベント追加
                        </button>
                      </div>
                    </div>
                    {/* イベント */}
                    <ul className="ml-2 md:ml-4 list-none border-l-4 border-blue-200 pl-4 space-y-2">
                      {schedule.events.map((event: Event) => (
                        <li key={event.id}>
                          <div className="flex flex-col gap-1 p-1">
                            {editingEvent && editingEvent.event && editingEvent.event.id === event.id ? (
                              <div className="bg-white rounded-lg shadow-md p-4 flex flex-col gap-4 border border-blue-100">
                                <div>
                                  <label className="block font-semibold text-gray-700 mb-1">メモ</label>
                                  <input
                                    name="memo"
                                    value={input.memo || ''}
                                    onChange={handleInput}
                                    placeholder="メモ"
                                    className="border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-300"
                                  />
                                </div>
                                <div className="flex flex-row gap-4">
                                  <div className="flex-1">
                                    <label className="block font-semibold text-gray-700 mb-1">開始時刻</label>
                                    <div className="flex flex-row gap-2">
                                      <input
                                        name="time1Hour"
                                        value={input.time1Hour || ''}
                                        onChange={handleInput}
                                        placeholder="時"
                                        className="border border-gray-300 rounded px-2 py-1 w-16 focus:outline-none focus:ring-2 focus:ring-blue-300"
                                        inputMode="numeric"
                                        pattern="\\d*"
                                      />
                                      <span className="self-center">:</span>
                                      <input
                                        name="time1Minute"
                                        value={input.time1Minute || ''}
                                        onChange={handleInput}
                                        placeholder="分"
                                        className="border border-gray-300 rounded px-2 py-1 w-16 focus:outline-none focus:ring-2 focus:ring-blue-300"
                                        inputMode="numeric"
                                        pattern="\\d*"
                                      />
                                      <select
                                        name="time1Postfix"
                                        value={input.time1Postfix || ''}
                                        onChange={handleInput}
                                        className="border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-300">
                                        <option value="">(なし)</option>
                                        <option value="発">発</option>
                                        <option value="着">着</option>
                                      </select>
                                    </div>
                                  </div>
                                  <div className="flex-1">
                                    <label className="block font-semibold text-gray-700 mb-1">終了時刻</label>
                                    <div className="flex flex-row gap-2">
                                      <input
                                        name="time2Hour"
                                        value={input.time2Hour || ''}
                                        onChange={handleInput}
                                        placeholder="時"
                                        className="border border-gray-300 rounded px-2 py-1 w-16 focus:outline-none focus:ring-2 focus:ring-blue-300"
                                        inputMode="numeric"
                                        pattern="\\d*"
                                      />
                                      <span className="self-center">:</span>
                                      <input
                                        name="time2Minute"
                                        value={input.time2Minute || ''}
                                        onChange={handleInput}
                                        placeholder="分"
                                        className="border border-gray-300 rounded px-2 py-1 w-16 focus:outline-none focus:ring-2 focus:ring-blue-300"
                                        inputMode="numeric"
                                        pattern="\\d*"
                                      />
                                      <select
                                        name="time2Postfix"
                                        value={input.time2Postfix || ''}
                                        onChange={handleInput}
                                        className="border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-300">
                                        <option value="">(なし)</option>
                                        <option value="発">発</option>
                                        <option value="着">着</option>
                                      </select>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex flex-row gap-2 mt-2">
                                  <button
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                                    onClick={() => {
                                      if (!editingEvent?.event) return;
                                      const memo = (input.memo || '').trim();
                                      if (!memo) {
                                        alert('メモは必須です');
                                        return;
                                      }
                                      const opt1 = validateTimeOptionalPairLabeled('開始時刻', input.time1Hour, input.time1Minute);
                                      if (!opt1.ok) {
                                        alert(opt1.msg!);
                                        return;
                                      }
                                      const opt2 = validateTimeOptionalPairLabeled('終了時刻', input.time2Hour, input.time2Minute);
                                      if (!opt2.ok) {
                                        alert(opt2.msg!);
                                        return;
                                      }
                                      // 終了が開始より早い場合はNG
                                      const startMinForEvSave = toMinutesIfPresent(input.time1Hour, input.time1Minute);
                                      const endMinForEvSave = toMinutesIfPresent(input.time2Hour, input.time2Minute);
                                      if (endMinForEvSave !== null && startMinForEvSave !== null && endMinForEvSave < startMinForEvSave) {
                                        alert('終了時刻は開始時刻より後にしてください');
                                        return;
                                      }
                                      const id = editingEvent.event.id;
                                      const payload = {
                                        memo: input.memo,
                                        time1Hour: input.time1Hour,
                                        time1Minute: input.time1Minute,
                                        time1Postfix: input.time1Postfix ? input.time1Postfix : null,
                                        time2Hour: input.time2Hour,
                                        time2Minute: input.time2Minute,
                                        time2Postfix: input.time2Postfix ? input.time2Postfix : null
                                      };
                                      appFetch(`${SERVER_ENDPOINT}/api/schedules/events/${id}`, { method: 'PUT', requiresAuth: true, jsonBody: payload })
                                        .then(() => refresh())
                                        .then(() => setEditingEvent(null))
                                        .catch((e) => console.error(e));
                                    }}>
                                    保存
                                  </button>
                                  <button className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition" onClick={() => setEditingEvent(null)}>
                                    キャンセル
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-gray-700 bg-blue-50 rounded px-2 py-1">
                                <svg className="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="font-semibold">{event.memo}</span>
                                <span className="text-xs text-gray-500">
                                  （{event.time1Hour}:{event.time1Minute}
                                  {event.time1Postfix ? ` ${event.time1Postfix}` : ''}
                                  {event.time2Hour !== undefined ? ` - ${event.time2Hour}:${event.time2Minute}${event.time2Postfix ? ` ${event.time2Postfix}` : ''}` : ''}）
                                </span>
                              </div>
                            )}
                            <div className="flex flex-row flex-wrap gap-2 mt-1">
                              <button
                                className="text-xs px-2 py-1 mx-1 bg-yellow-400 rounded"
                                onClick={() => {
                                  setEditingEvent({ scheduleId: schedule.id, event });
                                  setInput({
                                    memo: event.memo ?? '',
                                    time1Hour: event.time1Hour?.toString() ?? '',
                                    time1Minute: event.time1Minute?.toString() ?? '',
                                    time1Postfix: event.time1Postfix ?? '',
                                    time2Hour: event.time2Hour?.toString() ?? '',
                                    time2Minute: event.time2Minute?.toString() ?? '',
                                    time2Postfix: event.time2Postfix ?? ''
                                  });
                                }}>
                                編集
                              </button>
                              <button
                                className="text-xs px-2 py-1 mx-1 bg-red-400 rounded"
                                onClick={() => {
                                  if (!window.confirm('削除してもよろしいですか?')) return;
                                  appFetch(`${SERVER_ENDPOINT}/api/schedules/events/${event.id}`, { method: 'DELETE', requiresAuth: true })
                                    .then(() => refresh())
                                    .catch((e) => console.error(e));
                                }}>
                                削除
                              </button>
                              <button
                                className="text-xs px-2 py-1 mx-1 bg-blue-400 rounded"
                                onClick={() => {
                                  setEditingDetail({ eventId: event.id, detail: null });
                                  setInput({ memo: '', time1Hour: '', time1Minute: '', time2Hour: '', time2Minute: '' });
                                }}>
                                ＋詳細追加
                              </button>
                            </div>
                          </div>

                          {/* Always render details list so the add form can appear even when there are 0 details */}
                          <ul className="ml-2 list-none text-sm space-y-1 border-l-4 border-blue-200 pl-4">
                            {event.details.map((detail: EventDetail) => (
                              <li key={detail.id}>
                                <div className="flex flex-col gap-1 p-1 border border-blue-100">
                                  {editingDetail && editingDetail.detail && editingDetail.detail.id === detail.id ? (
                                    <div className="bg-white rounded-lg shadow-md p-4 flex flex-col gap-4 border border-blue-100 my-2">
                                      <div>
                                        <label className="block font-semibold text-gray-700 mb-1">メモ</label>
                                        <input
                                          name="memo"
                                          value={input.memo || ''}
                                          onChange={handleInput}
                                          placeholder="メモ"
                                          className="border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-300"
                                        />
                                      </div>
                                      <div className="flex flex-row gap-4">
                                        <div className="flex-1">
                                          <label className="block font-semibold text-gray-700 mb-1">開始時刻</label>
                                          <div className="flex flex-row gap-2">
                                            <input
                                              name="time1Hour"
                                              value={input.time1Hour || ''}
                                              onChange={handleInput}
                                              placeholder="時"
                                              className="border border-gray-300 rounded px-2 py-1 w-16 focus:outline-none focus:ring-2 focus:ring-blue-300"
                                              inputMode="numeric"
                                              pattern="\\d*"
                                            />
                                            <span className="self-center">:</span>
                                            <input
                                              name="time1Minute"
                                              value={input.time1Minute || ''}
                                              onChange={handleInput}
                                              placeholder="分"
                                              className="border border-gray-300 rounded px-2 py-1 w-16 focus:outline-none focus:ring-2 focus:ring-blue-300"
                                              inputMode="numeric"
                                              pattern="\\d*"
                                            />
                                          </div>
                                        </div>
                                        <div className="flex-1">
                                          <label className="block font-semibold text-gray-700 mb-1">終了時刻</label>
                                          <div className="flex flex-row gap-2">
                                            <input
                                              name="time2Hour"
                                              value={input.time2Hour || ''}
                                              onChange={handleInput}
                                              placeholder="時"
                                              className="border border-gray-300 rounded px-2 py-1 w-16 focus:outline-none focus:ring-2 focus:ring-blue-300"
                                              inputMode="numeric"
                                              pattern="\\d*"
                                            />
                                            <span className="self-center">:</span>
                                            <input
                                              name="time2Minute"
                                              value={input.time2Minute || ''}
                                              onChange={handleInput}
                                              placeholder="分"
                                              className="border border-gray-300 rounded px-2 py-1 w-16 focus:outline-none focus:ring-2 focus:ring-blue-300"
                                              inputMode="numeric"
                                              pattern="\\d*"
                                            />
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex flex-row gap-2 mt-2">
                                        <button
                                          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                                          onClick={() => {
                                            if (!editingDetail?.detail) return;
                                            const memo = (input.memo || '').trim();
                                            if (!memo) {
                                              alert('メモは必須です');
                                              return;
                                            }
                                            const opt1 = validateTimeOptionalPairLabeled('開始時刻', input.time1Hour, input.time1Minute);
                                            if (!opt1.ok) {
                                              alert(opt1.msg!);
                                              return;
                                            }
                                            const opt2 = validateTimeOptionalPairLabeled('終了時刻', input.time2Hour, input.time2Minute);
                                            if (!opt2.ok) {
                                              alert(opt2.msg!);
                                              return;
                                            }
                                            // 終了が開始より早い場合はNG（両方揃っているときのみ比較）
                                            const startMinForDetEdit = toMinutesIfPresent(input.time1Hour, input.time1Minute);
                                            const endMinForDetEdit = toMinutesIfPresent(input.time2Hour, input.time2Minute);
                                            if (startMinForDetEdit !== null && endMinForDetEdit !== null && endMinForDetEdit < startMinForDetEdit) {
                                              alert('終了時刻は開始時刻より後にしてください');
                                              return;
                                            }
                                            const id = editingDetail.detail.id;
                                            const payload = {
                                              memo: input.memo,
                                              time1Hour: input.time1Hour,
                                              time1Minute: input.time1Minute,
                                              time2Hour: input.time2Hour,
                                              time2Minute: input.time2Minute
                                            };
                                            appFetch(`${SERVER_ENDPOINT}/api/schedules/event-details/${id}`, { method: 'PUT', requiresAuth: true, jsonBody: payload })
                                              .then(() => refresh())
                                              .then(() => setEditingDetail(null))
                                              .catch((e) => console.error(e));
                                          }}>
                                          保存
                                        </button>
                                        <button className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition" onClick={() => setEditingDetail(null)}>
                                          キャンセル
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 text-gray-700 bg-blue-100/40 rounded px-2 py-1">
                                      <svg className="w-3 h-3 text-blue-200" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                      </svg>
                                      <span className="font-semibold">{detail.memo}</span>
                                      <span className="text-xs text-gray-500">
                                        （{detail.time1Hour}:{detail.time1Minute}
                                        {detail.time2Hour !== undefined ? ` - ${detail.time2Hour}:${detail.time2Minute}` : ''}）
                                      </span>
                                    </div>
                                  )}

                                  <div className="flex flex-row flex-wrap gap-2 mt-1">
                                    <button
                                      className="text-xs px-2 py-1 mx-1 bg-yellow-400 rounded"
                                      onClick={() => {
                                        setEditingDetail({ eventId: event.id, detail });
                                        setInput({
                                          memo: detail.memo ?? '',
                                          time1Hour: detail.time1Hour?.toString() ?? '',
                                          time1Minute: detail.time1Minute?.toString() ?? '',
                                          time2Hour: detail.time2Hour?.toString() ?? '',
                                          time2Minute: detail.time2Minute?.toString() ?? ''
                                        });
                                      }}>
                                      編集
                                    </button>
                                    <button
                                      className="text-xs px-2 py-1 mx-1 bg-red-400 rounded"
                                      onClick={() => {
                                        if (!window.confirm('削除してもよろしいですか?')) return;
                                        appFetch(`${SERVER_ENDPOINT}/api/schedules/event-details/${detail.id}`, { method: 'DELETE', requiresAuth: true })
                                          .then(() => refresh())
                                          .catch((e) => console.error(e));
                                      }}>
                                      削除
                                    </button>
                                  </div>
                                </div>
                              </li>
                            ))}
                            {editingDetail && editingDetail.eventId === event.id && !editingDetail.detail && (
                              <li className="bg-white rounded-lg shadow-md p-4 flex flex-col gap-4 border border-blue-100 my-2">
                                <div>
                                  <label className="block font-semibold text-gray-700 mb-1">メモ</label>
                                  <input
                                    name="memo"
                                    value={input.memo || ''}
                                    onChange={handleInput}
                                    placeholder="メモ"
                                    className="border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-300"
                                  />
                                </div>
                                <div className="flex flex-row gap-4">
                                  <div className="flex-1">
                                    <label className="block font-semibold text-gray-700 mb-1">開始時刻</label>
                                    <div className="flex flex-row gap-2">
                                      <input
                                        name="time1Hour"
                                        value={input.time1Hour || ''}
                                        onChange={handleInput}
                                        placeholder="時"
                                        className="border border-gray-300 rounded px-2 py-1 w-16 focus:outline-none focus:ring-2 focus:ring-blue-300"
                                      />
                                      <span className="self-center">:</span>
                                      <input
                                        name="time1Minute"
                                        value={input.time1Minute || ''}
                                        onChange={handleInput}
                                        placeholder="分"
                                        className="border border-gray-300 rounded px-2 py-1 w-16 focus:outline-none focus:ring-2 focus:ring-blue-300"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex-1">
                                    <label className="block font-semibold text-gray-700 mb-1">終了時刻</label>
                                    <div className="flex flex-row gap-2">
                                      <input
                                        name="time2Hour"
                                        value={input.time2Hour || ''}
                                        onChange={handleInput}
                                        placeholder="時"
                                        className="border border-gray-300 rounded px-2 py-1 w-16 focus:outline-none focus:ring-2 focus:ring-blue-300"
                                      />
                                      <span className="self-center">:</span>
                                      <input
                                        name="time2Minute"
                                        value={input.time2Minute || ''}
                                        onChange={handleInput}
                                        placeholder="分"
                                        className="border border-gray-300 rounded px-2 py-1 w-16 focus:outline-none focus:ring-2 focus:ring-blue-300"
                                      />
                                    </div>
                                  </div>
                                </div>
                                <div className="flex flex-row gap-2 mt-2">
                                  <button
                                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
                                    onClick={() => {
                                      if (!editingDetail || !editingDetail.eventId) return;
                                      const memo = (input.memo || '').trim();
                                      if (!memo) {
                                        alert('メモは必須です');
                                        return;
                                      }
                                      const opt1 = validateTimeOptionalPairLabeled('開始時刻', input.time1Hour, input.time1Minute);
                                      if (!opt1.ok) {
                                        alert(opt1.msg!);
                                        return;
                                      }
                                      const opt2 = validateTimeOptionalPairLabeled('終了時刻', input.time2Hour, input.time2Minute);
                                      if (!opt2.ok) {
                                        alert(opt2.msg!);
                                        return;
                                      }
                                      // 終了が開始より早い場合はNG（両方揃っているときのみ比較）
                                      const startMinForDetAdd = toMinutesIfPresent(input.time1Hour, input.time1Minute);
                                      const endMinForDetAdd = toMinutesIfPresent(input.time2Hour, input.time2Minute);
                                      if (startMinForDetAdd !== null && endMinForDetAdd !== null && endMinForDetAdd < startMinForDetAdd) {
                                        alert('終了時刻は開始時刻より後にしてください');
                                        return;
                                      }
                                      const eventId = editingDetail.eventId;
                                      const payload = {
                                        memo: input.memo,
                                        time1Hour: input.time1Hour,
                                        time1Minute: input.time1Minute,
                                        time2Hour: input.time2Hour,
                                        time2Minute: input.time2Minute
                                      };
                                      appFetch(`${SERVER_ENDPOINT}/api/schedules/events/${eventId}/details`, { method: 'POST', requiresAuth: true, jsonBody: payload })
                                        .then(() => refresh())
                                        .then(() => setEditingDetail(null))
                                        .catch((e) => console.error(e));
                                    }}>
                                    追加
                                  </button>
                                  <button className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition" onClick={() => setEditingDetail(null)}>
                                    キャンセル
                                  </button>
                                </div>
                              </li>
                            )}
                          </ul>
                        </li>
                      ))}
                      {editingEvent && editingEvent.scheduleId === schedule.id && !editingEvent.event && (
                        <li className="bg-white rounded-lg shadow-md p-4 flex flex-col gap-4 border border-blue-100 my-2">
                          <div>
                            <label className="block font-semibold text-gray-700 mb-1">メモ</label>
                            <input
                              name="memo"
                              value={input.memo || ''}
                              onChange={handleInput}
                              placeholder="メモ"
                              className="border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-300"
                            />
                          </div>
                          <div className="flex flex-row gap-4">
                            <div className="flex-1">
                              <label className="block font-semibold text-gray-700 mb-1">開始時刻</label>
                              <div className="flex flex-row gap-2">
                                <input
                                  name="time1Hour"
                                  value={input.time1Hour || ''}
                                  onChange={handleInput}
                                  placeholder="時"
                                  className="border border-gray-300 rounded px-2 py-1 w-16 focus:outline-none focus:ring-2 focus:ring-blue-300"
                                  inputMode="numeric"
                                  pattern="\\d*"
                                />
                                <span className="self-center">:</span>
                                <input
                                  name="time1Minute"
                                  value={input.time1Minute || ''}
                                  onChange={handleInput}
                                  placeholder="分"
                                  className="border border-gray-300 rounded px-2 py-1 w-16 focus:outline-none focus:ring-2 focus:ring-blue-300"
                                  inputMode="numeric"
                                  pattern="\\d*"
                                />
                                <select
                                  name="time1Postfix"
                                  value={input.time1Postfix || ''}
                                  onChange={handleInput}
                                  className="border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-300">
                                  <option value="">(なし)</option>
                                  <option value="発">発</option>
                                  <option value="着">着</option>
                                </select>
                              </div>
                            </div>
                            <div className="flex-1">
                              <label className="block font-semibold text-gray-700 mb-1">終了時刻</label>
                              <div className="flex flex-row gap-2">
                                <input
                                  name="time2Hour"
                                  value={input.time2Hour || ''}
                                  onChange={handleInput}
                                  placeholder="時"
                                  className="border border-gray-300 rounded px-2 py-1 w-16 focus:outline-none focus:ring-2 focus:ring-blue-300"
                                  inputMode="numeric"
                                  pattern="\\d*"
                                />
                                <span className="self-center">:</span>
                                <input
                                  name="time2Minute"
                                  value={input.time2Minute || ''}
                                  onChange={handleInput}
                                  placeholder="分"
                                  className="border border-gray-300 rounded px-2 py-1 w-16 focus:outline-none focus:ring-2 focus:ring-blue-300"
                                  inputMode="numeric"
                                  pattern="\\d*"
                                />
                                <select
                                  name="time2Postfix"
                                  value={input.time2Postfix || ''}
                                  onChange={handleInput}
                                  className="border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-300">
                                  <option value="">(なし)</option>
                                  <option value="発">発</option>
                                  <option value="着">着</option>
                                </select>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-row gap-2 mt-2">
                            <button
                              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
                              onClick={() => {
                                if (!editingEvent || !editingEvent.scheduleId) return;
                                const memo = (input.memo || '').trim();
                                if (!memo) {
                                  alert('メモは必須です');
                                  return;
                                }
                                if (!validateTimeRequired(input.time1Hour, input.time1Minute)) {
                                  alert('開始時刻が不正です（時は0–23、分は0–59）');
                                  return;
                                }
                                const opt2 = validateTimeOptionalPair(input.time2Hour, input.time2Minute);
                                if (!opt2.ok) {
                                  alert(opt2.msg!);
                                  return;
                                }
                                // 終了が開始より早い場合はNG
                                const startMinForEvAdd = toMinutesIfPresent(input.time1Hour, input.time1Minute);
                                const endMinForEvAdd = toMinutesIfPresent(input.time2Hour, input.time2Minute);
                                if (endMinForEvAdd !== null && startMinForEvAdd !== null && endMinForEvAdd < startMinForEvAdd) {
                                  alert('終了時刻は開始時刻より後にしてください');
                                  return;
                                }
                                const scheduleId = editingEvent.scheduleId;
                                const payload = {
                                  memo: input.memo,
                                  time1Hour: input.time1Hour,
                                  time1Minute: input.time1Minute,
                                  time1Postfix: input.time1Postfix ? input.time1Postfix : null,
                                  time2Hour: input.time2Hour,
                                  time2Minute: input.time2Minute,
                                  time2Postfix: input.time2Postfix ? input.time2Postfix : null
                                };
                                appFetch(`${SERVER_ENDPOINT}/api/schedules/${scheduleId}/events`, { method: 'POST', requiresAuth: true, jsonBody: payload })
                                  .then(() => refresh())
                                  .then(() => setEditingEvent(null))
                                  .catch((e) => console.error(e));
                              }}>
                              追加
                            </button>
                            <button className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition" onClick={() => setEditingEvent(null)}>
                              キャンセル
                            </button>
                          </div>
                        </li>
                      )}
                    </ul>
                  </div>
                ))}
              </div>
              {editingSchedule && editingSchedule.courseId === course.id && !editingSchedule.schedule && (
                <div className="bg-white rounded-lg shadow-md p-4 flex flex-col gap-4 border border-blue-100 my-2">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">タイトル</label>
                    <input
                      name="title"
                      value={input.title || ''}
                      onChange={handleInput}
                      placeholder="タイトル"
                      className="border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                  </div>
                  <div className="flex flex-row gap-2 mt-2">
                    <button
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
                      onClick={() => {
                        if (!editingSchedule || !editingSchedule.courseId) return;
                        if (!input.title || !input.title.trim()) {
                          alert('タイトルは必須です');
                          return;
                        }
                        const payload = { courseId: editingSchedule.courseId, title: input.title.trim() };
                        appFetch(`${SERVER_ENDPOINT}/api/schedules`, { method: 'POST', requiresAuth: true, jsonBody: payload })
                          .then(() => refresh())
                          .then(() => setEditingSchedule(null))
                          .catch((e) => {
                            alert(`スケジュール作成に失敗しました: ${e.message}`);
                            console.error(e);
                          });
                      }}>
                      追加
                    </button>
                    <button className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition" onClick={() => setEditingSchedule(null)}>
                      キャンセル
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        {editingCourse && editingCourse.id === 0 && (
          <div className="bg-white rounded-lg shadow-md p-4 flex flex-col gap-4 border border-blue-100 my-2">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">コース</label>
              <select
                name="course_key"
                className="border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={input.course_key || ''}
                onChange={(e) => {
                  const key = e.target.value;
                  const selected = ALL_COURSES.find((c) => c.key === key);
                  setInput({ course_key: key, name: selected?.name ?? '' });
                }}>
                {selectableCourses.length === 0 && <option value="">追加可能なコースはありません</option>}
                {selectableCourses.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-row gap-2 mt-2">
              <button
                className={`px-4 py-2 rounded ${input.course_key ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
                disabled={!input.course_key || saving}
                onClick={async () => {
                  if (!input.course_key) return;
                  try {
                    setSaving(true);
                    await appFetch(`${SERVER_ENDPOINT}/api/schedules/courses`, {
                      method: 'POST',
                      requiresAuth: true,
                      jsonBody: { course_key: input.course_key, name: input.name }
                    });
                    await refresh();
                    setEditingCourse(null);
                    setInput({});
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setSaving(false);
                  }
                }}>
                {saving ? '追加中…' : '追加'}
              </button>
              <button className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition" onClick={() => setEditingCourse(null)}>
                キャンセル
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-center mt-8">
          <button
            className={`px-6 py-3 rounded-full text-lg font-semibold shadow transition-all duration-150 ${selectableCourses.length ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
            disabled={!selectableCourses.length}
            onClick={() => {
              const first = selectableCourses[0];
              setEditingCourse({ id: 0, course_key: '', name: '', schedules: [] });
              setInput(first ? { course_key: first.key, name: first.name } : { course_key: '', name: '' });
            }}>
            ＋コース追加
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScheduleAdmin;
