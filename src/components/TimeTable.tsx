// import { useEffect, useState } from 'react';
import type { COURSES_DAY1_KEY, COURSES_DAY3_KEY, COURSES_DAY4_KEY } from '../data/courses';
import { pad2 } from '../helpers/pad2';
import Message from './Message';

type EventDetail = {
  id: number;
  eventId: number;
  memo: string;
  time1Hour?: number;
  time1Minute?: number;
  time2Hour?: number;
  time2Minute?: number;
  sortOrder?: number;
};
type Message = {
  id: number;
  eventId: number;
  text: string;
  type?: 'notice' | 'info' | 'important' | 'alert';
  sortOrder?: number;
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
  messages?: Message[];
  sortOrder?: number;
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
  courses: Course[];
};

const hasHM = (h?: number, m?: number) => typeof h === 'number' && typeof m === 'number';
const fmtEventTime = (e: Event) => {
  const hasStart = hasHM(e.time1Hour, e.time1Minute);
  const hasEnd = hasHM(e.time2Hour, e.time2Minute);
  const start = hasStart ? `${pad2(e.time1Hour)}:${pad2(e.time1Minute)}${e.time1Postfix ? `${e.time1Postfix}` : ''}` : '';
  const end = hasEnd ? `${pad2(e.time2Hour)}:${pad2(e.time2Minute)}${e.time2Postfix ? `${e.time2Postfix}` : ''}` : '';
  return (
    <div className="flex flex-col items-center" style={{ height: '100%' }}>
      {hasStart && <div>{start}</div>}
      {hasStart && hasEnd && <div className="flex-grow flex-shrink" style={{ flexBasis: 0 }} />}
      {hasEnd && <div>{end}</div>}
    </div>
  );
};
const fmtDetailTime = (d: EventDetail) => {
  const hasStart = hasHM(d.time1Hour, d.time1Minute);
  const hasEnd = hasHM(d.time2Hour, d.time2Minute);
  const start = hasStart ? `${pad2(d.time1Hour)}:${pad2(d.time1Minute)}` : '';
  const end = hasEnd ? `${pad2(d.time2Hour)}:${pad2(d.time2Minute)}` : '';
  return (
    <div className="flex flex-col items-center justify-center">
      {hasStart && <div>{start}</div>}
      {hasEnd && <div>{end}</div>}
    </div>
  );
};

const TimeTable = ({ courseKey, ref, courses }: TimeTableProps) => {
  const course = courses.find((c) => c.course_key === courseKey) || null;
  if (!course) return <div className="p-4 text-center">該当コースが見つかりません</div>;
  return (
    <>
      <thead>
        <tr ref={ref}>
          <th colSpan={2}>{course.name}</th>
        </tr>
        <tr>
          <th className="w-1/10">時間</th>
          <th className="w-9/10">内容</th>
        </tr>
      </thead>
      <tbody>
        {(() => {
          const toMinutes = (h?: number, m?: number) => (typeof h === 'number' && typeof m === 'number' ? h * 60 + m : Number.POSITIVE_INFINITY);
          const rows = (course.schedules || []).flatMap((sch) => (sch.events || []).map((ev) => ({ schTitle: sch.title, ev })));
          rows.sort((a, b) => {
            // sort_orderが両方にあればそれで、なければ従来の時間順
            const ao = typeof a.ev.sortOrder === 'number' ? a.ev.sortOrder : undefined;
            const bo = typeof b.ev.sortOrder === 'number' ? b.ev.sortOrder : undefined;
            if (ao !== undefined && bo !== undefined) return ao - bo;
            return toMinutes(a.ev.time1Hour, a.ev.time1Minute) - toMinutes(b.ev.time1Hour, b.ev.time1Minute);
          });
          return rows.map(({ schTitle, ev }) => (
            <tr key={ev.id}>
              <td className="h-12 align-top p-0 border-b border-gray-300">{fmtEventTime(ev)}</td>
              <td className="border-b border-gray-300">
                <div className="text-xs text-gray-500">{schTitle}</div>
                <div>{ev.memo}</div>
                {/* 詳細とメッセージを統合してsort_order順で表示 */}
                {((ev.details && ev.details.length > 0) || (ev.messages && ev.messages.length > 0)) && (
                  <ul className="ml-4 text-sm text-gray-700 space-y-1">
                    {[
                      ...ev.details.map((d) => ({
                        type: 'detail' as const,
                        id: d.id,
                        sort_order: typeof d.sortOrder === 'number' ? d.sortOrder : undefined,
                        data: d
                      })),
                      ...(ev.messages?.map((m) => ({
                        type: 'message' as const,
                        id: m.id,
                        sort_order: typeof m.sortOrder === 'number' ? m.sortOrder : undefined,
                        data: m
                      })) || [])
                    ]
                      .sort((a, b) => {
                        const o1 = typeof a.sort_order === 'number' ? a.sort_order : undefined;
                        const o2 = typeof b.sort_order === 'number' ? b.sort_order : undefined;
                        if (o1 !== undefined && o2 !== undefined) return o1 - o2;
                        // sort_order未設定は後ろ
                        if (o1 !== undefined) return -1;
                        if (o2 !== undefined) return 1;
                        // どちらも未設定なら時間順
                        if (a.type === 'detail' && b.type === 'detail') {
                          return toMinutes(a.data.time1Hour, a.data.time1Minute) - toMinutes(b.data.time1Hour, b.data.time1Minute);
                        }
                        return 0;
                      })
                      .map((item) => {
                        if (item.type === 'detail') {
                          const d = item.data as EventDetail;
                          const time = fmtDetailTime(d);
                          return (
                            <li key={`detail-${d.id}`} className="list-disc">
                              {time ? <span className="inline-block pr-2 text-gray-500">{time}</span> : null}
                              <span>{d.memo}</span>
                            </li>
                          );
                        } else {
                          const m = item.data as Message;
                          return (
                            <li key={`message-${m.id}`} className="list-none">
                              <Message type={m.type}>
                                <span>{m.text}</span>
                              </Message>
                            </li>
                          );
                        }
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
