import type { Dispatch, SetStateAction } from 'react';
import { SERVER_ENDPOINT } from '../../../config/serverEndpoint';
import { appFetch } from '../../../helpers/apiClient';
import type { Course } from './Types';
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
export const refresh = async ( setData: Dispatch<SetStateAction<Course[]>>) => {
  try {
    const list = await appFetch<Course[]>(`${SERVER_ENDPOINT}/api/schedules`, { parse: 'json', alwaysFetch: true, requiresAuth: true, cacheKey: CacheKeys.schedules.list });
    setData(list);
  } catch (e) {
    console.error(e);
  }
};
