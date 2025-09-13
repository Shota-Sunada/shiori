import { useEffect, useState } from 'react';
import { appFetch } from '../helpers/apiClient';
import { SERVER_ENDPOINT } from '../config/serverEndpoint';
import type { COURSES_DAY1_KEY, COURSES_DAY3_KEY, COURSES_DAY4_KEY } from '../data/courses';
import { pad2 } from '../helpers/pad2';

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

export type COURSES_COMMON_KEY = 'day1_common1' | 'day1_common2' | 'day2_common' | 'day3_common1' | 'day3_common2' | 'day4_common1' | 'day4_common2';

export type TimeTableProps = {
  courseKey: COURSES_DAY1_KEY | COURSES_DAY3_KEY | COURSES_DAY4_KEY | COURSES_COMMON_KEY | null;
  ref?: React.RefObject<HTMLTableRowElement | null>;
};

const hasHM = (h?: number, m?: number) => typeof h === 'number' && typeof m === 'number';
const fmtEventTime = (e: Event) => {
  const hasStart = hasHM(e.time1Hour, e.time1Minute);
  const hasEnd = hasHM(e.time2Hour, e.time2Minute);
  const start = hasStart ? `${pad2(e.time1Hour)}:${pad2(e.time1Minute)}${e.time1Postfix ? ` ${e.time1Postfix}` : ''}` : '';
  const end = hasEnd ? `${pad2(e.time2Hour)}:${pad2(e.time2Minute)}${e.time2Postfix ? ` ${e.time2Postfix}` : ''}` : '';
  if (hasStart && hasEnd)
    return (
      <>
        <span>{start}</span>
        <br />
        <span>{end}</span>
      </>
    );
  if (hasStart) return start;
  if (hasEnd) return end;
  return '';
};
const fmtDetailTime = (d: EventDetail) => {
  const hasStart = hasHM(d.time1Hour, d.time1Minute);
  const hasEnd = hasHM(d.time2Hour, d.time2Minute);
  const start = hasStart ? `${pad2(d.time1Hour)}:${pad2(d.time1Minute)}` : '';
  const end = hasEnd ? `${pad2(d.time2Hour)}:${pad2(d.time2Minute)}` : '';
  if (hasStart && hasEnd)
    return (
      <>
        <span>{start}</span>
        <br />
        <span>{end}</span>
      </>
    );
  if (hasStart) return start;
  if (hasEnd) return end;
  return '';
};

const TimeTable = ({ courseKey, ref }: TimeTableProps) => {
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    appFetch<Course[]>(`${SERVER_ENDPOINT}/api/schedules`, { parse: 'json', alwaysFetch: true, requiresAuth: true })
      .then((list) => {
        if (!mounted) return;
        const c = (list || []).find((c) => c.course_key === courseKey);
        setCourse(c ?? null);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [courseKey]);

  if (loading) return <div className="p-4 text-center">読み込み中…</div>;
  if (error) return <div className="p-4 text-center text-red-600">エラー: {error}</div>;
  if (!course) return <div className="p-4 text-center">該当コースが見つかりません</div>;

  return (
    <>
      <thead>
        <tr ref={ref}>
          <th colSpan={2}>{course.name}</th>
        </tr>
        <tr>
          <th className="w-1/5">時間</th>
          <th className="w-4/5">内容</th>
        </tr>
      </thead>
      <tbody>
        {(() => {
          const toMinutes = (h?: number, m?: number) => (typeof h === 'number' && typeof m === 'number' ? h * 60 + m : Number.POSITIVE_INFINITY);
          const rows = (course.schedules || []).flatMap((sch) => (sch.events || []).map((ev) => ({ schTitle: sch.title, ev })));
          rows.sort((a, b) => toMinutes(a.ev.time1Hour, a.ev.time1Minute) - toMinutes(b.ev.time1Hour, b.ev.time1Minute));
          return rows.map(({ schTitle, ev }) => (
            <tr key={ev.id}>
              <td>{fmtEventTime(ev)}</td>
              <td>
                <div className="text-xs text-gray-500">{schTitle}</div>
                <div>{ev.memo}</div>
                {ev.details.length > 0 && (
                  <ul className="list-disc ml-4 text-sm text-gray-700">
                    {ev.details
                      .slice()
                      .sort((d1, d2) => toMinutes(d1.time1Hour, d1.time1Minute) - toMinutes(d2.time1Hour, d2.time1Minute))
                      .map((d) => {
                        const time = fmtDetailTime(d);
                        return (
                          <li key={d.id}>
                            {time ? <span className="inline-block pr-2 text-gray-500">{time}</span> : null}
                            <span>{d.memo}</span>
                          </li>
                        );
                      })}
                  </ul>
                )}
              </td>
            </tr>
          ));
        })()}
      </tbody>
    </>
  );
};

export default TimeTable;
