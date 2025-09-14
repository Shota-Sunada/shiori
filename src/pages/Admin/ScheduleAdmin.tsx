import { useState, useEffect } from 'react';
import { appFetch } from '../../helpers/apiClient';
import { SERVER_ENDPOINT } from '../../config/serverEndpoint';
import { COURSES_DAY1, COURSES_DAY3, COURSES_DAY4 } from '../../data/courses';
import type { COURSES_COMMON_KEY } from '../../components/TimeTable';
import type { EventDetail, Event, Schedule, Course } from './ScheduleAdmin/Types';
import { DetailButtons, DetailCard, EditingDetail } from './ScheduleAdmin/Detail';
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
      .then(setData)
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
                <h2 className="text-lg md:text-xl font-bold text-blue-700 flex items-center gap-2 my-1">
                  <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  {course.name || course.course_key}
                </h2>

                {/* コース親元 */}
                {editingSchedule && editingSchedule.courseId === course.id && !editingSchedule.schedule && (
                  <EditingSchedule isNew input={input} handleInput={handleInput} editingSchedule={editingSchedule} setEditingSchedule={setEditingSchedule} setData={setData} />
                )}
                {editingCourse && editingCourse.id === course.id && <EditingCourse course={course} setEditingCourse={setEditingCourse} />}
                <CourseButtons setEditingCourse={setEditingCourse} course={course} setInput={setInput} setData={setData} setEditingSchedule={setEditingSchedule} />
                {course.schedules.map((schedule: Schedule) => (
                  // スケジュール親元
                  <div key={schedule.id} className="rounded-lg border border-blue-100 bg-blue-50/40 p-3 mb-2">
                    <div className="flex flex-col gap-1">
                      <div className="mb-1">
                        {editingSchedule && editingSchedule.schedule && editingSchedule.schedule.id === schedule.id ? (
                          <EditingSchedule input={input} handleInput={handleInput} editingSchedule={editingSchedule} setEditingSchedule={setEditingSchedule} setData={setData} />
                        ) : (
                          <ScheduleCard schedule={schedule} />
                        )}
                      </div>
                      <ScheduleButtons setEditingSchedule={setEditingSchedule} setInput={setInput} course={course} schedule={schedule} setData={setData} setEditingEvent={setEditingEvent} />
                    </div>
                    {/* イベント親元 */}
                    <div className="ml-2 md:ml-4 list-none border-l-4 border-blue-200 pl-4 space-y-2">
                      {editingEvent && editingEvent.scheduleId === schedule.id && !editingEvent.event && (
                        <EditingEvent isNew input={input} handleInput={handleInput} editingEvent={editingEvent} setData={setData} setEditingEvent={setEditingEvent} />
                      )}
                      {schedule.events.map((event: Event) => (
                        <div key={event.id}>
                          <div className="flex flex-col gap-1 p-1">
                            {editingEvent && editingEvent.event && editingEvent.event.id === event.id ? (
                              <EditingEvent input={input} handleInput={handleInput} editingEvent={editingEvent} setData={setData} setEditingEvent={setEditingEvent} />
                            ) : (
                              <EventCard event={event} />
                            )}
                            <EventButtons setEditingEvent={setEditingEvent} setInput={setInput} event={event} setData={setData} setEditingDetail={setEditingDetail} schedule={schedule} />
                          </div>
                          {/* 詳細親元 */}
                          <div className="ml-2 list-none text-sm space-y-1 border-l-4 border-blue-200 pl-4">
                            {editingDetail && editingDetail.eventId === event.id && !editingDetail.detail && (
                              <EditingDetail isNew input={input} handleInput={handleInput} editingDetail={editingDetail} setData={setData} setEditingDetail={setEditingDetail} />
                            )}
                            {event.details.map((detail: EventDetail) => (
                              <div key={detail.id}>
                                <div className="flex flex-col gap-1 p-1 border border-blue-100">
                                  {editingDetail && editingDetail.detail && editingDetail.detail.id === detail.id ? (
                                    <EditingDetail input={input} handleInput={handleInput} editingDetail={editingDetail} setData={setData} setEditingDetail={setEditingDetail} />
                                  ) : (
                                    <DetailCard detail={detail} />
                                  )}
                                  <DetailButtons setEditingDetail={setEditingDetail} setInput={setInput} detail={detail} event={event} setData={setData} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
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
