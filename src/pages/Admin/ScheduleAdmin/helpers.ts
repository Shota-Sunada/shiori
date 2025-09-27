import type { Dispatch, SetStateAction } from 'react';
import { SERVER_ENDPOINT } from '../../../config/serverEndpoint';
import { appFetch } from '../../../helpers/apiClient';
import type { Course, Event, Schedule } from './Types';
import { CacheKeys } from '../../../helpers/cacheKeys';

export const parseIntOrNaN = (s?: string) => (s === undefined || s === '' ? NaN : parseInt(s, 10));
export const isValidHour = (n: number) => Number.isInteger(n) && n >= 0 && n <= 23;
export const isValidMinute = (n: number) => Number.isInteger(n) && n >= 0 && n <= 59;
export const validateTimeRequired = (hStr?: string, mStr?: string) => {
  const h = parseIntOrNaN(hStr);
  const m = parseIntOrNaN(mStr);
  if (!isValidHour(h) || !isValidMinute(m)) return false;
  return true;
};
export const validateTimeOptionalPair = (hStr?: string, mStr?: string) => {
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
export const validateTimeOptionalPairLabeled = (label: string, hStr?: string, mStr?: string) => {
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
export const toMinutesIfPresent = (hStr?: string, mStr?: string) => {
  if (!hStr && !mStr) return null;
  const h = parseIntOrNaN(hStr);
  const m = parseIntOrNaN(mStr);
  if (!isValidHour(h) || !isValidMinute(m)) return null;
  return h * 60 + m;
};
const getEventStartMinutes = (event: Event | undefined | null) => {
  if (!event || event.time1Hour == null || event.time1Minute == null) return null;
  if (!isValidHour(event.time1Hour) || !isValidMinute(event.time1Minute)) return null;
  return event.time1Hour * 60 + event.time1Minute;
};

const sortByStartMinutes = (aMin: number | null, bMin: number | null) => {
  if (aMin == null && bMin == null) return 0;
  if (aMin == null) return 1;
  if (bMin == null) return -1;
  return aMin - bMin;
};

const normalizeSchedule = (schedule: Schedule): Schedule => {
  const events = schedule.events ?? [];
  const normalizedEvents = [...events]
    .map((event) => ({
      ...event,
      messages: event.messages ?? []
    }))
    .sort((a, b) => sortByStartMinutes(getEventStartMinutes(a), getEventStartMinutes(b)));

  return {
    ...schedule,
    events: normalizedEvents
  };
};

const normalizeCourse = (course: Course): Course => {
  const normalizedSchedules = [...(course.schedules ?? [])]
    .map((schedule) => normalizeSchedule(schedule))
    .sort((a, b) => sortByStartMinutes(getEventStartMinutes(a.events?.[0]), getEventStartMinutes(b.events?.[0])));

  return {
    ...course,
    schedules: normalizedSchedules
  };
};

export const normalizeCourses = (courses: Course[]) => courses.map((course) => normalizeCourse(course));

export const refresh = async (setData: Dispatch<SetStateAction<Course[]>>) => {
  try {
    const list = await appFetch<Course[]>(`${SERVER_ENDPOINT}/api/schedules`, { parse: 'json', alwaysFetch: true, requiresAuth: true, cacheKey: CacheKeys.schedules.list });
    setData(normalizeCourses(list));
  } catch (e) {
    console.error(e);
  }
};
