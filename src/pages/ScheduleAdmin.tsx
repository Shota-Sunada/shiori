import { useState, useEffect } from 'react';
import { appFetch } from '../helpers/apiClient';
import { SERVER_ENDPOINT } from '../config/serverEndpoint';
import { COURSES_DAY1, COURSES_DAY3, COURSES_DAY4 } from '../data/courses';

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

  const existingKeys = new Set((data || []).map((c) => c.course_key));
  const ALL_COURSES: Array<{ key: string; name: string }> = [
    ...COURSES_DAY1.map((c) => ({ key: c.key, name: c.name })),
    ...COURSES_DAY3.map((c) => ({ key: c.key, name: c.name })),
    ...COURSES_DAY4.map((c) => ({ key: c.key, name: c.name }))
  ];
  const selectableCourses = ALL_COURSES.filter((c) => !existingKeys.has(c.key));

  if (loading) return <div>読み込み中...</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">スケジュール管理</h1>
      {data.map((course: Course) => (
        <div key={course.id} className="mb-6 border rounded p-3">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">{course.name || course.course_key}</h2>
            <button
              className="text-xs px-2 py-1 bg-yellow-400 rounded"
              onClick={() => {
                setEditingCourse(course);
                setInput({ course_key: course.course_key ?? '', name: course.name ?? '' });
              }}>
              編集
            </button>
            <button
              className="text-xs px-2 py-1 bg-red-400 rounded"
              onClick={() => {
                appFetch(`${SERVER_ENDPOINT}/api/schedules/courses/${course.id}`, { method: 'DELETE', requiresAuth: true })
                  .then(() => refresh())
                  .catch((e) => console.error(e));
              }}>
              削除
            </button>
            <button
              className="text-xs px-2 py-1 bg-blue-400 rounded"
              onClick={() => {
                setEditingSchedule({ courseId: course.id, schedule: null });
                setInput({ title: '' });
              }}>
              ＋スケジュール追加
            </button>
          </div>
          {editingCourse && editingCourse.id === course.id && (
            <div className="my-2 p-2 border bg-gray-50">
              <div className="text-sm mb-2">コースマスタに基づくため、既存コースのキーは変更できません。</div>
              <div className="mb-2">
                <span className="font-semibold">コースキー:</span> {course.course_key}
              </div>
              <div className="mb-2">
                <span className="font-semibold">コース名:</span> {course.name}
              </div>
              <button
                className="px-2 py-1 bg-green-500 text-white rounded"
                onClick={() => {
                  setEditingCourse(null);
                }}>
                閉じる
              </button>
              <button className="px-2 py-1 ml-2" onClick={() => setEditingCourse(null)}>
                キャンセル
              </button>
            </div>
          )}
          {course.schedules.map((schedule: Schedule) => (
            <div key={schedule.id} className="ml-4 mb-2">
              <div className="flex items-center gap-2">
                <h3 className="font-bold">{schedule.title}</h3>
                <button
                  className="text-xs px-2 py-1 bg-yellow-400 rounded"
                  onClick={() => {
                    setEditingSchedule({ courseId: course.id, schedule });
                    setInput({ title: schedule.title });
                  }}>
                  編集
                </button>
                <button
                  className="text-xs px-2 py-1 bg-red-400 rounded"
                  onClick={() => {
                    appFetch(`${SERVER_ENDPOINT}/api/schedules/${schedule.id}`, { method: 'DELETE', requiresAuth: true })
                      .then(() => refresh())
                      .catch((e) => console.error(e));
                  }}>
                  削除
                </button>
                <button
                  className="text-xs px-2 py-1 bg-blue-400 rounded"
                  onClick={() => {
                    setEditingEvent({ scheduleId: schedule.id, event: null });
                    setInput({ memo: '', time1Hour: '', time1Minute: '', time1Postfix: '', time2Hour: '', time2Minute: '', time2Postfix: '' });
                  }}>
                  ＋イベント追加
                </button>
              </div>
              {editingSchedule && editingSchedule.schedule && editingSchedule.schedule.id === schedule.id && (
                <div className="my-2 p-2 border bg-gray-50">
                  <input name="title" value={input.title || ''} onChange={handleInput} placeholder="タイトル" className="border p-1 mr-2" />
                  <button
                    className="px-2 py-1 bg-green-500 text-white rounded"
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
                  <button className="px-2 py-1 ml-2" onClick={() => setEditingSchedule(null)}>
                    キャンセル
                  </button>
                </div>
              )}
              <ul className="ml-4 list-disc">
                {schedule.events.map((event: Event) => (
                  <li key={event.id}>
                    <div className="flex items-center gap-2">
                      <span>
                        {event.memo}（{event.time1Hour}:{event.time1Minute}
                        {event.time1Postfix ? ` ${event.time1Postfix}` : ''}
                        {event.time2Hour !== undefined ? ` - ${event.time2Hour}:${event.time2Minute}${event.time2Postfix ? ` ${event.time2Postfix}` : ''}` : ''}）
                      </span>
                      <button
                        className="text-xs px-2 py-1 bg-yellow-400 rounded"
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
                        className="text-xs px-2 py-1 bg-red-400 rounded"
                        onClick={() => {
                          appFetch(`${SERVER_ENDPOINT}/api/schedules/events/${event.id}`, { method: 'DELETE', requiresAuth: true })
                            .then(() => refresh())
                            .catch((e) => console.error(e));
                        }}>
                        削除
                      </button>
                      <button
                        className="text-xs px-2 py-1 bg-blue-400 rounded"
                        onClick={() => {
                          setEditingDetail({ eventId: event.id, detail: null });
                          setInput({ memo: '', time1Hour: '', time1Minute: '', time2Hour: '', time2Minute: '' });
                        }}>
                        ＋詳細追加
                      </button>
                    </div>
                    {editingEvent && editingEvent.event && editingEvent.event.id === event.id && (
                      <div className="my-2 p-2 border bg-gray-50">
                        <input name="memo" value={input.memo || ''} onChange={handleInput} placeholder="メモ" className="border p-1 mr-2" />
                        <div className="flex flex-row">
                          <input name="time1Hour" value={input.time1Hour || ''} onChange={handleInput} placeholder="開始時" className="border p-1 mr-2" inputMode="numeric" pattern="\\d*" />
                          <input name="time1Minute" value={input.time1Minute || ''} onChange={handleInput} placeholder="開始分" className="border p-1 mr-2" inputMode="numeric" pattern="\\d*" />
                          <select name="time1Postfix" value={input.time1Postfix || ''} onChange={handleInput} className="border p-1 mr-2">
                            <option value="">(なし)</option>
                            <option value="発">発</option>
                            <option value="着">着</option>
                          </select>
                        </div>
                        <div className="flex flex-row">
                          <input name="time2Hour" value={input.time2Hour || ''} onChange={handleInput} placeholder="終了時" className="border p-1 mr-2" inputMode="numeric" pattern="\\d*" />
                          <input name="time2Minute" value={input.time2Minute || ''} onChange={handleInput} placeholder="終了分" className="border p-1 mr-2" inputMode="numeric" pattern="\\d*" />
                          <select name="time2Postfix" value={input.time2Postfix || ''} onChange={handleInput} className="border p-1 mr-2">
                            <option value="">(なし)</option>
                            <option value="発">発</option>
                            <option value="着">着</option>
                          </select>
                        </div>
                        <button
                          className="px-2 py-1 bg-green-500 text-white rounded"
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
                        <button className="px-2 py-1 ml-2" onClick={() => setEditingEvent(null)}>
                          キャンセル
                        </button>
                      </div>
                    )}
                    {/* Always render details list so the add form can appear even when there are 0 details */}
                    <ul className="ml-4 list-circle text-sm">
                      {event.details.map((detail: EventDetail) => (
                        <li key={detail.id}>
                          <div className="flex items-center gap-2">
                            {detail.memo}（{detail.time1Hour}:{detail.time1Minute}
                            {detail.time2Hour !== undefined ? ` - ${detail.time2Hour}:${detail.time2Minute}` : ''}）
                            <button
                              className="text-xs px-2 py-1 bg-yellow-400 rounded"
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
                              className="text-xs px-2 py-1 bg-red-400 rounded"
                              onClick={() => {
                                appFetch(`${SERVER_ENDPOINT}/api/schedules/event-details/${detail.id}`, { method: 'DELETE', requiresAuth: true })
                                  .then(() => refresh())
                                  .catch((e) => console.error(e));
                              }}>
                              削除
                            </button>
                          </div>
                          {editingDetail && editingDetail.detail && editingDetail.detail.id === detail.id && (
                            <div className="my-2 p-2 border bg-gray-50">
                              <input name="memo" value={input.memo || ''} onChange={handleInput} placeholder="メモ" className="border p-1 mr-2" />
                              <div className="flex flex-row">
                                <input name="time1Hour" value={input.time1Hour || ''} onChange={handleInput} placeholder="開始時" className="border p-1 mr-2" inputMode="numeric" pattern="\\d*" />
                                <input name="time1Minute" value={input.time1Minute || ''} onChange={handleInput} placeholder="開始分" className="border p-1 mr-2" inputMode="numeric" pattern="\\d*" />
                              </div>
                              <div className="flex flex-row">
                                <input name="time2Hour" value={input.time2Hour || ''} onChange={handleInput} placeholder="終了時" className="border p-1 mr-2" inputMode="numeric" pattern="\\d*" />
                                <input name="time2Minute" value={input.time2Minute || ''} onChange={handleInput} placeholder="終了分" className="border p-1 mr-2" inputMode="numeric" pattern="\\d*" />
                              </div>
                              <button
                                className="px-2 py-1 bg-green-500 text-white rounded"
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
                              <button className="px-2 py-1 ml-2" onClick={() => setEditingDetail(null)}>
                                キャンセル
                              </button>
                            </div>
                          )}
                        </li>
                      ))}
                      {editingDetail && editingDetail.eventId === event.id && !editingDetail.detail && (
                        <li className="my-2 p-2 border bg-gray-50">
                          <input name="memo" value={input.memo || ''} onChange={handleInput} placeholder="メモ" className="border p-1 mr-2" />
                          <div className="flex flex-row">
                            <input name="time1Hour" value={input.time1Hour || ''} onChange={handleInput} placeholder="開始時" className="border p-1 mr-2" />
                            <input name="time1Minute" value={input.time1Minute || ''} onChange={handleInput} placeholder="開始分" className="border p-1 mr-2" />
                          </div>
                          <div className="flex flex-row">
                            <input name="time2Hour" value={input.time2Hour || ''} onChange={handleInput} placeholder="終了時" className="border p-1 mr-2" />
                            <input name="time2Minute" value={input.time2Minute || ''} onChange={handleInput} placeholder="終了分" className="border p-1 mr-2" />
                          </div>
                          <button
                            className="px-2 py-1 bg-green-500 text-white rounded"
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
                          <button className="px-2 py-1 ml-2" onClick={() => setEditingDetail(null)}>
                            キャンセル
                          </button>
                        </li>
                      )}
                    </ul>
                  </li>
                ))}
                {editingEvent && editingEvent.scheduleId === schedule.id && !editingEvent.event && (
                  <li className="my-2 p-2 border bg-gray-50 flex flex-col">
                    <input name="memo" value={input.memo || ''} onChange={handleInput} placeholder="メモ" className="border p-1 mr-2" />
                    <div className="flex flex-row">
                      <input name="time1Hour" value={input.time1Hour || ''} onChange={handleInput} placeholder="開始時" className="border p-1 mr-2" inputMode="numeric" pattern="\\d*" />
                      <input name="time1Minute" value={input.time1Minute || ''} onChange={handleInput} placeholder="開始分" className="border p-1 mr-2" inputMode="numeric" pattern="\\d*" />
                      <select name="time1Postfix" value={input.time1Postfix || ''} onChange={handleInput} className="border p-1 mr-2">
                        <option value="">(なし)</option>
                        <option value="発">発</option>
                        <option value="着">着</option>
                      </select>
                    </div>
                    <div className="flex flex-row">
                      <input name="time2Hour" value={input.time2Hour || ''} onChange={handleInput} placeholder="終了時" className="border p-1 mr-2" inputMode="numeric" pattern="\\d*" />
                      <input name="time2Minute" value={input.time2Minute || ''} onChange={handleInput} placeholder="終了分" className="border p-1 mr-2" inputMode="numeric" pattern="\\d*" />
                      <select name="time2Postfix" value={input.time2Postfix || ''} onChange={handleInput} className="border p-1 mr-2">
                        <option value="">(なし)</option>
                        <option value="発">発</option>
                        <option value="着">着</option>
                      </select>
                    </div>
                    <div className="flex flex-row">
                      <button
                        className="px-2 py-1 bg-green-500 text-white rounded"
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
                      <button className="px-2 py-1 ml-2" onClick={() => setEditingEvent(null)}>
                        キャンセル
                      </button>
                    </div>
                  </li>
                )}
              </ul>
            </div>
          ))}
          {editingSchedule && editingSchedule.courseId === course.id && !editingSchedule.schedule && (
            <div className="my-2 p-2 border bg-gray-50">
              <input name="title" value={input.title || ''} onChange={handleInput} placeholder="タイトル" className="border p-1 mr-2" />
              <button
                className="px-2 py-1 bg-green-500 text-white rounded"
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
              <button className="px-2 py-1 ml-2" onClick={() => setEditingSchedule(null)}>
                キャンセル
              </button>
            </div>
          )}
        </div>
      ))}
      {editingCourse && editingCourse.id === 0 && (
        <div className="my-2 p-2 border bg-gray-50">
          <label className="mr-2 font-semibold">コース:</label>
          <select
            name="course_key"
            className="border p-1 mr-2"
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
          <button
            className={`px-2 py-1 rounded ${input.course_key ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
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
          <button className="px-2 py-1 ml-2" onClick={() => setEditingCourse(null)}>
            キャンセル
          </button>
        </div>
      )}
      
      <button
        className={`mb-4 px-2 py-1 rounded ${selectableCourses.length ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
        disabled={!selectableCourses.length}
        onClick={() => {
          const first = selectableCourses[0];
          setEditingCourse({ id: 0, course_key: '', name: '', schedules: [] });
          setInput(first ? { course_key: first.key, name: first.name } : { course_key: '', name: '' });
        }}>
        ＋コース追加
      </button>
    </div>
  );
};

export default ScheduleAdmin;
