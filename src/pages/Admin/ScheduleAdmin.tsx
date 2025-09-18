import { useState, useEffect, type ChangeEventHandler } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { appFetch } from '../../helpers/apiClient';
import { SERVER_ENDPOINT } from '../../config/serverEndpoint';
import { COURSES_DAY1, COURSES_DAY3, COURSES_DAY4 } from '../../data/courses';
import type { COURSES_COMMON_KEY } from '../../components/TimeTable';
import type { EventDetail, Event, Schedule, Course } from './ScheduleAdmin/Types';
import { DetailButtons, DetailCard, EditingDetail } from './ScheduleAdmin/Detail';

import type { Dispatch, SetStateAction } from 'react';
import type { Message as MessageType } from './ScheduleAdmin/Types';
import Message from '../../components/Message';

type Item = { type: 'detail'; id: number; data: EventDetail; sortOrder: number } | { type: 'message'; id: number; data: MessageType; sortOrder: number };

export const EventItemList = ({
  event,
  setData,
  input,
  handleInput,
  setInput,
  editingDetail,
  setEditingDetail
}: {
  event: Event;
  setData: Dispatch<SetStateAction<Course[]>>;
  input: Record<string, string>;
  handleInput: ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;
  setInput: Dispatch<SetStateAction<Record<string, string>>>;
  editingDetail: { eventId: number; detail: EventDetail | null } | null;
  setEditingDetail: Dispatch<SetStateAction<{ eventId: number; detail: EventDetail | null } | null>>;
}) => {
  // detailsとmessagesをsortOrderで統合ソート
  const getSortedItems = () => {
    const all: Item[] = [
      ...event.details.map((d) => ({ type: 'detail' as const, id: d.id, data: d, sortOrder: typeof d.sortOrder === 'number' ? d.sortOrder : 0 })),
      ...event.messages.map((m) => ({ type: 'message' as const, id: m.id, data: m, sortOrder: typeof m.sortOrder === 'number' ? m.sortOrder : 0 }))
    ];
    return all.sort((a, b) => a.sortOrder - b.sortOrder);
  };
  const [items, setItems] = useState<Item[]>(getSortedItems());
  useEffect(() => {
    setItems(getSortedItems());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.details, event.messages]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const newItems = Array.from(items);
    const [removed] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, removed);
    setItems(newItems);
    // 並べ替えAPIのリクエスト内容を確認
    const payload = { order: newItems.map((i) => ({ type: i.type, id: i.id })) };
    console.log('並べ替えAPI送信内容:', payload);
    appFetch(`${SERVER_ENDPOINT}/api/schedules/events/${event.id}/items/reorder`, {
      method: 'PUT',
      requiresAuth: true,
      jsonBody: payload
    }).then(() => setData((prev) => [...prev]));
  };

  // 詳細・Message追加UIや編集UIはここに統合（省略可、必要に応じて追加）

  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [editingType, setEditingType] = useState<'notice' | 'info' | 'important' | 'alert'>('info');

  // 編集保存
  const handleEditMessage = (msgId: number) => {
    appFetch(`${SERVER_ENDPOINT}/api/schedules/events/${event.id}/messages/${msgId}`, {
      method: 'PUT',
      requiresAuth: true,
      jsonBody: { text: editingText, type: editingType }
    }).then(() => {
      setEditingMessageId(null);
      setEditingText('');
      setEditingType('info');
      // データ再取得
      appFetch<Course[]>(`${SERVER_ENDPOINT}/api/schedules`, { parse: 'json', alwaysFetch: true, requiresAuth: true }).then((courses) => {
        const patched = courses.map((course) => ({
          ...course,
          schedules: course.schedules.map((schedule) => ({
            ...schedule,
            events: schedule.events.map((event) => ({
              ...event,
              messages: event.messages ?? []
            }))
          }))
        }));
        setData(patched);
      });
    });
  };
  // 削除
  const handleDeleteMessage = (msgId: number) => {
    if (!window.confirm('削除してもよろしいですか?')) return;
    appFetch(`${SERVER_ENDPOINT}/api/schedules/events/${event.id}/messages/${msgId}`, {
      method: 'DELETE',
      requiresAuth: true
    }).then(() => {
      appFetch<Course[]>(`${SERVER_ENDPOINT}/api/schedules`, { parse: 'json', alwaysFetch: true, requiresAuth: true }).then((courses) => {
        const patched = courses.map((course) => ({
          ...course,
          schedules: course.schedules.map((schedule) => ({
            ...schedule,
            events: schedule.events.map((event) => ({
              ...event,
              messages: event.messages ?? []
            }))
          }))
        }));
        setData(patched);
      });
    });
  };

  return (
    <div className="ml-2 list-none text-sm space-y-1 border-l-4 border-blue-200 pl-4">
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId={`items-droppable-${event.id}`}>
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps}>
              {items.map((item, idx) => (
                <Draggable key={item.type + '-' + item.id} draggableId={item.type + '-' + item.id} index={idx}>
                  {(provided, snapshot) => (
                    <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className={`flex flex-col gap-1 ${snapshot.isDragging ? 'ring-2 ring-blue-300' : ''}`}>
                      {item.type === 'detail' && editingDetail && editingDetail.detail && editingDetail.detail.id === item.id ? (
                        // 編集中の詳細
                        <EditingDetail isNew={false} input={input} handleInput={handleInput} editingDetail={editingDetail} setData={setData} setEditingDetail={setEditingDetail} />
                      ) : item.type === 'detail' ? (
                        <>
                          <DetailCard detail={item.data as EventDetail} />
                          <DetailButtons setEditingDetail={setEditingDetail} setInput={setInput} detail={item.data as EventDetail} event={event} setData={setData} />
                        </>
                      ) : (
                        <Message type={(item.data as MessageType).type ?? 'info'}>
                          <div className="flex flex-row items-start gap-2 w-full">
                            {editingMessageId === item.id ? (
                              <>
                                <div className="flex flex-col gap-1 w-full">
                                  <select
                                    className="border rounded px-2 py-1 w-full"
                                    value={editingType}
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      if (v === 'notice' || v === 'info' || v === 'important' || v === 'alert') {
                                        setEditingType(v);
                                      }
                                    }}>
                                    <option value="info">詳細</option>
                                    <option value="notice">注意</option>
                                    <option value="important">重要</option>
                                    <option value="alert">警告</option>
                                  </select>
                                  <textarea className="border rounded px-2 py-1 w-full" value={editingText} onChange={(e) => setEditingText(e.target.value)} />
                                </div>
                                <div className="flex flex-col gap-1 ml-2">
                                  <button className="text-xs px-2 py-1 rounded bg-green-500 text-white" onClick={() => handleEditMessage(item.id)}>
                                    保存
                                  </button>
                                  <button className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-700" onClick={() => setEditingMessageId(null)}>
                                    キャンセル
                                  </button>
                                </div>
                              </>
                            ) : (
                              <>
                                <span className="block mt-2 flex-1">{(item.data as MessageType).text}</span>
                                <button
                                  className="text-xs px-2 py-1 mx-1 bg-yellow-400 rounded"
                                  title="このメッセージを編集"
                                  onClick={() => {
                                    setEditingMessageId(item.id);
                                    setEditingText((item.data as MessageType).text);
                                    setEditingType((item.data as MessageType).type ?? 'info');
                                  }}>
                                  編集
                                </button>
                                <button className="text-xs px-2 py-1 mx-1 bg-red-400 rounded" title="このメッセージを削除" onClick={() => handleDeleteMessage(item.id)}>
                                  削除
                                </button>
                              </>
                            )}
                          </div>
                        </Message>
                      )}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};
import { EditingEvent, EventButtons, EventCard } from './ScheduleAdmin/Event';
import { EditingSchedule, ScheduleButtons, ScheduleCard } from './ScheduleAdmin/Schedule';
import { CourseButtons, EditingCourse, NewCourse } from './ScheduleAdmin/Course';

const ScheduleAdmin = () => {
  const [data, setData] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<{ courseId: number; schedule: Schedule | null } | null>(null);
  const [editingEvent, setEditingEvent] = useState<{ scheduleId: number; event: Event | null } | null>(null);
  const [editingDetail, setEditingDetail] = useState<{ eventId: number; detail: EventDetail | null } | null>(null);
  const [input, setInput] = useState<Record<string, string>>({});

  const [saving, setSaving] = useState(false);
  // スケジュール開閉状態: scheduleIdの配列
  const [openSchedules, setOpenSchedules] = useState<Record<number, boolean>>({});
  // イベント開閉状態: eventIdの配列
  const [openEvents, setOpenEvents] = useState<Record<number, boolean>>({});
  // コース開閉状態: courseIdの配列
  const [openCourses, setOpenCourses] = useState<Record<number, boolean>>({});

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

  useEffect(() => {
    appFetch<Course[]>(`${SERVER_ENDPOINT}/api/schedules`, { parse: 'json', alwaysFetch: true, requiresAuth: true })
      .then((courses) => {
        console.log('サーバーから受信したcourses:', courses);
        // Event.messagesがなければ空配列を補完
        const patched = courses.map((course) => ({
          ...course,
          schedules: course.schedules.map((schedule) => ({
            ...schedule,
            events: schedule.events.map((event) => ({
              ...event,
              messages: event.messages ?? []
            }))
          }))
        }));
        setData(patched);
      })
      .finally(() => setLoading(false));
  }, []);

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

  // 全開・全閉ハンドラ
  // 全開・全閉ハンドラ（全体 or コース単位）
  const handleAllToggle = (open: boolean, courseId?: number) => {
    if (courseId == null) {
      // 全体
      const newCourses: Record<number, boolean> = {};
      data.forEach((course) => {
        newCourses[course.id] = open;
      });
      setOpenCourses(newCourses);
      const newSchedules: Record<number, boolean> = {};
      data.forEach((course) =>
        course.schedules.forEach((s) => {
          newSchedules[s.id] = open;
        })
      );
      setOpenSchedules(newSchedules);
      const newEvents: Record<number, boolean> = {};
      data.forEach((course) =>
        course.schedules.forEach((s) =>
          s.events.forEach((e) => {
            newEvents[e.id] = open;
          })
        )
      );
      setOpenEvents(newEvents);
    } else {
      // コース単位
      setOpenCourses((prev) => ({ ...prev, [courseId]: open }));
      const course = data.find((c) => c.id === courseId);
      if (!course) return;
      setOpenSchedules((prev) => {
        const next = { ...prev };
        course.schedules.forEach((s) => {
          next[s.id] = open;
        });
        return next;
      });
      setOpenEvents((prev) => {
        const next = { ...prev };
        course.schedules.forEach((s) =>
          s.events.forEach((e) => {
            next[e.id] = open;
          })
        );
        return next;
      });
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-extrabold text-blue-800 mb-6 tracking-tight drop-shadow-sm flex items-center gap-2">
          <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          スケジュール管理
        </h1>
        {/* 全開・全閉ボタン */}
        <div className="flex gap-4 mb-4 justify-end">
          <button className="px-4 py-2 rounded bg-blue-500 text-white font-semibold shadow hover:bg-blue-600 transition" onClick={() => handleAllToggle(true)}>
            すべて開く
          </button>
          <button className="px-4 py-2 rounded bg-blue-200 text-blue-900 font-semibold shadow hover:bg-blue-300 transition" onClick={() => handleAllToggle(false)}>
            すべて閉じる
          </button>
        </div>
        <div className="grid md:grid-cols-2 gap-6 sm:grid-cols-1">
          {data.map((course: Course) => {
            const isCourseOpen = openCourses[course.id] ?? true;
            // スケジュールを最初のイベントの開始時間順にソート
            const getEventTime = (ev?: Event) => {
              if (!ev || ev.time1Hour == null || ev.time1Minute == null) return null;
              return ev.time1Hour * 60 + ev.time1Minute;
            };
            const getScheduleTime = (sch: Schedule) => {
              if (!sch.events || sch.events.length === 0) return null;
              // 最初のイベントの開始時刻
              return getEventTime(sch.events[0]);
            };
            const sortedSchedules = [...course.schedules].sort((a, b) => {
              const aTime = getScheduleTime(a);
              const bTime = getScheduleTime(b);
              if (aTime == null && bTime == null) return 0;
              if (aTime == null) return 1;
              if (bTime == null) return -1;
              return aTime - bTime;
            });
            return (
              <div key={course.id} className="rounded-xl shadow-lg border border-blue-100 bg-white p-4 mb-2 transition hover:shadow-xl">
                {/* カード上部の全開・全閉ボタン */}
                <div className="flex justify-end gap-2 mb-1">
                  <button className="px-2 py-1 rounded bg-blue-100 text-blue-900 text-xs font-semibold hover:bg-blue-200 transition" onClick={() => handleAllToggle(true, course.id)}>
                    開く
                  </button>
                  <button className="px-2 py-1 rounded bg-blue-100 text-blue-900 text-xs font-semibold hover:bg-blue-200 transition" onClick={() => handleAllToggle(false, course.id)}>
                    閉じる
                  </button>
                </div>
                <div className="flex items-center gap-2 my-1">
                  {/* コース編集中はトグル非表示 */}
                  {!(editingCourse && editingCourse.id === course.id) && (
                    <button
                      className="w-7 h-7 flex items-center justify-center rounded-full bg-blue-100 hover:bg-blue-200 transition"
                      onClick={() => setOpenCourses((prev) => ({ ...prev, [course.id]: !isCourseOpen }))}
                      aria-label={isCourseOpen ? '閉じる' : '開く'}>
                      <span className={`transition-transform ${isCourseOpen ? '' : 'rotate-180'}`}>▼</span>
                    </button>
                  )}
                  <h2 className="text-lg md:text-xl font-bold text-blue-700 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    {course.name || course.course_key}
                  </h2>
                </div>
                {isCourseOpen && (
                  <div className="flex flex-col gap-2">
                    {/* コース親元 */}
                    {editingSchedule && editingSchedule.courseId === course.id && !editingSchedule.schedule && (
                      <EditingSchedule isNew input={input} handleInput={handleInput} editingSchedule={editingSchedule} setEditingSchedule={setEditingSchedule} setData={setData} />
                    )}
                    {editingCourse && editingCourse.id === course.id && <EditingCourse course={course} setEditingCourse={setEditingCourse} />}
                    <CourseButtons setEditingCourse={setEditingCourse} course={course} setInput={setInput} setData={setData} setEditingSchedule={setEditingSchedule} />
                    {sortedSchedules.map((schedule: Schedule) => {
                      const isOpen = openSchedules[schedule.id] ?? true;
                      return (
                        <div key={schedule.id} className="rounded-lg border border-blue-100 bg-blue-50/40 p-3 mb-2">
                          <div className="flex items-center gap-2 mb-1">
                            {/* スケジュール編集中はトグル非表示 */}
                            {!(editingSchedule && editingSchedule.schedule && editingSchedule.schedule.id === schedule.id) && (
                              <button
                                className="w-7 h-7 flex items-center justify-center rounded-full bg-blue-100 hover:bg-blue-200 transition"
                                onClick={() => setOpenSchedules((prev) => ({ ...prev, [schedule.id]: !isOpen }))}
                                aria-label={isOpen ? '閉じる' : '開く'}>
                                <span className={`transition-transform ${isOpen ? '' : 'rotate-180'}`}>▼</span>
                              </button>
                            )}
                            {editingSchedule && editingSchedule.schedule && editingSchedule.schedule.id === schedule.id ? (
                              <EditingSchedule input={input} handleInput={handleInput} editingSchedule={editingSchedule} setEditingSchedule={setEditingSchedule} setData={setData} />
                            ) : (
                              <ScheduleCard schedule={schedule} />
                            )}
                          </div>
                          {isOpen && (
                            <>
                              <ScheduleButtons setEditingSchedule={setEditingSchedule} setInput={setInput} course={course} schedule={schedule} setData={setData} setEditingEvent={setEditingEvent} />
                              {/* イベント親元 */}
                              <div className="ml-2 md:ml-4 list-none border-l-4 border-blue-200 pl-4 space-y-2">
                                {editingEvent && editingEvent.scheduleId === schedule.id && !editingEvent.event && (
                                  <EditingEvent isNew input={input} handleInput={handleInput} editingEvent={editingEvent} setData={setData} setEditingEvent={setEditingEvent} />
                                )}
                                {schedule.events.map((event: Event) => {
                                  const isEventOpen = openEvents[event.id] ?? true;
                                  return (
                                    <div key={event.id}>
                                      <div className="flex items-center gap-2 p-1">
                                        {/* イベント編集中はトグル非表示 */}
                                        {!(editingEvent && editingEvent.event && editingEvent.event.id === event.id) && (
                                          <button
                                            className="w-6 h-6 flex items-center justify-center rounded-full bg-blue-50 hover:bg-blue-200 transition"
                                            onClick={() => setOpenEvents((prev) => ({ ...prev, [event.id]: !isEventOpen }))}
                                            aria-label={isEventOpen ? '閉じる' : '開く'}>
                                            <span className={`transition-transform ${isEventOpen ? '' : 'rotate-180'}`}>▼</span>
                                          </button>
                                        )}
                                        <div>
                                          {editingEvent && editingEvent.event && editingEvent.event.id === event.id ? (
                                            <EditingEvent input={input} handleInput={handleInput} editingEvent={editingEvent} setData={setData} setEditingEvent={setEditingEvent} />
                                          ) : (
                                            <EventCard event={event} setData={setData} />
                                          )}
                                          {isEventOpen && (
                                            <div>
                                              <EventButtons
                                                setEditingEvent={setEditingEvent}
                                                setInput={setInput}
                                                event={event}
                                                setData={setData}
                                                setEditingDetail={setEditingDetail}
                                                schedule={schedule}
                                              />
                                              {/* 詳細親元 */}
                                              <EventItemList
                                                event={event}
                                                setData={setData}
                                                input={input}
                                                handleInput={handleInput}
                                                setInput={setInput}
                                                editingDetail={editingDetail}
                                                setEditingDetail={setEditingDetail}
                                              />
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {editingCourse && editingCourse.id === 0 && (
          <NewCourse
            input={input}
            ALL_COURSES={ALL_COURSES}
            setInput={setInput}
            selectableCourses={selectableCourses}
            saving={saving}
            setSaving={setSaving}
            setData={setData}
            setEditingCourse={setEditingCourse}
          />
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
