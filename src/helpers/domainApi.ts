// ドメイン毎の型安全 API ラッパ (最小セット)
// 目的: 呼び出し側で URL 文字列を散在させない / キャッシュキーと併用しやすくする

import { appFetch, mutate } from './apiClient';
import { CacheKeys, CachePrefixes } from './cacheKeys';
import { SERVER_ENDPOINT } from '../config/serverEndpoint';

// ---- Students ----
// サーバが返す student レコードをアプリ全体で統一利用するための DTO
// (既存 UI の `student` 型との差異を吸収: 厳密な IntRange などは network layer では汎用の number として扱う)
export interface StudentDTO {
  surname: string;
  forename: string;
  surname_kana: string;
  forename_kana: string;
  class: number;
  number: number;
  gakuseki: number; // 一意 (主キー)
  day1id: string;
  day3id: string;
  day1bus: string;
  day3bus: string;
  room_fpr: number;
  room_tdh: number;
  shinkansen_day1_car_number: number;
  shinkansen_day1_seat: string;
  shinkansen_day4_car_number: number;
  shinkansen_day4_seat: string;
}

export const studentApi = {
  list: (opts: { alwaysFetch?: boolean; ttlMs?: number; staleWhileRevalidate?: boolean } = {}) =>
    appFetch<StudentDTO[]>(`${SERVER_ENDPOINT}/api/students`, {
      requiresAuth: true,
      cacheKey: CacheKeys.students.all,
      alwaysFetch: opts.alwaysFetch ?? false,
      ttlMs: opts.ttlMs,
      staleWhileRevalidate: opts.staleWhileRevalidate
    }),
  getById: (id: string | number) =>
    appFetch<StudentDTO>(`${SERVER_ENDPOINT}/api/students/${id}`, {
      requiresAuth: true,
      cacheKey: CacheKeys.students.byId(id)
    }),
  create: (payload: StudentDTO) =>
    mutate({
      url: `${SERVER_ENDPOINT}/api/students`,
      method: 'POST',
      jsonBody: payload,
      invalidateKeys: [CacheKeys.students.all]
    }),
  update: (gakuseki: number, partial: Partial<StudentDTO>, opts?: { optimisticList?: boolean }) =>
    mutate({
      url: `${SERVER_ENDPOINT}/api/students/${gakuseki}`,
      method: 'PUT',
      jsonBody: partial,
      invalidateKeys: opts?.optimisticList ? [] : [CacheKeys.students.all],
      optimistic: opts?.optimisticList
        ? [
            {
              key: CacheKeys.students.all,
              apply: (current) => {
                if (!Array.isArray(current)) return current;
                return (current as StudentDTO[]).map((s) => (s.gakuseki === gakuseki ? { ...s, ...partial } : s));
              }
            }
          ]
        : undefined
    }),
  remove: (gakuseki: number) =>
    mutate({
      url: `${SERVER_ENDPOINT}/api/students/${gakuseki}`,
      method: 'DELETE',
      invalidateKeys: [CacheKeys.students.all]
    }),
  batch: (students: StudentDTO[]) =>
    mutate({
      url: `${SERVER_ENDPOINT}/api/students/batch`,
      method: 'POST',
      jsonBody: students,
      invalidateKeys: [CacheKeys.students.all]
    }),
  roommates: (hotel: 'tdh' | 'fpr', room: string | number) =>
    appFetch<Pick<StudentDTO, 'gakuseki' | 'surname' | 'forename' | 'class' | 'number'>[]>(`${SERVER_ENDPOINT}/api/students/roommates/${hotel}/${room}`, {
      requiresAuth: true,
      alwaysFetch: true
    })
};

// ---- Users ----
export interface UserDTO {
  id: number;
  is_admin: boolean;
  is_teacher: boolean;
  failed_login_attempts: number;
  is_banned: boolean;
}

export const userApi = {
  list: () => appFetch<UserDTO[]>(`${SERVER_ENDPOINT}/api/users`, { requiresAuth: true, cacheKey: CacheKeys.users.list }),
  add: (payload: { id: number; password: string; is_admin: boolean; is_teacher: boolean }) =>
    mutate({
      url: `${SERVER_ENDPOINT}/api/users`,
      method: 'POST',
      jsonBody: payload,
      invalidateKeys: [CacheKeys.users.list]
    }),
  update: (id: number, body: Partial<Pick<UserDTO, 'is_admin' | 'is_teacher' | 'is_banned'>> & { password?: string }) =>
    mutate({
      url: `${SERVER_ENDPOINT}/api/users/${id}`,
      method: 'PUT',
      jsonBody: body,
      invalidateKeys: [CacheKeys.users.list]
    }),
  unban: (id: number) =>
    mutate({
      url: `${SERVER_ENDPOINT}/api/users/${id}/unban`,
      method: 'PUT',
      invalidateKeys: [CacheKeys.users.list]
    }),
  remove: (id: number) =>
    mutate({
      url: `${SERVER_ENDPOINT}/api/users/${id}`,
      method: 'DELETE',
      invalidateKeys: [CacheKeys.users.list]
    }),
  bulk: (users: unknown[]) =>
    mutate<{ message: string }>({
      url: `${SERVER_ENDPOINT}/api/users/bulk`,
      method: 'POST',
      jsonBody: { users },
      invalidateKeys: [CacheKeys.users.list]
    })
};

// ---- Teachers ----
// Teacher 管理画面で利用するエンドポイント群をまとめる
export interface TeacherDTO {
  id: number;
  surname: string;
  forename: string;
  room_fpr: number;
  room_tdh: number;
  shinkansen_day1_car_number: number;
  shinkansen_day1_seat: string;
  shinkansen_day4_car_number: number;
  shinkansen_day4_seat: string;
  day1id: string;
  day1bus: number;
  day3id: string;
  day3bus: number;
  day4class: number;
}

export const teacherApi = {
  list: () => appFetch<TeacherDTO[]>(`${SERVER_ENDPOINT}/api/teachers`, { requiresAuth: true, cacheKey: CacheKeys.teachers.list }),
  self: (id: string | number) =>
    appFetch<TeacherDTO>(`${SERVER_ENDPOINT}/api/teachers/${id}`, {
      requiresAuth: true,
      cacheKey: CacheKeys.teachers.self(id),
      alwaysFetch: true
    }),
  add: (payload: Omit<TeacherDTO, 'id'> & { id: number }) =>
    mutate({
      url: `${SERVER_ENDPOINT}/api/teachers`,
      method: 'POST',
      jsonBody: payload,
      invalidateKeys: [CacheKeys.teachers.list]
    }),
  update: (id: number, body: Partial<Omit<TeacherDTO, 'id'>>) =>
    mutate({
      url: `${SERVER_ENDPOINT}/api/teachers/${id}`,
      method: 'PUT',
      jsonBody: body,
      invalidateKeys: [CacheKeys.teachers.list]
    }),
  remove: (id: number) =>
    mutate({
      url: `${SERVER_ENDPOINT}/api/teachers/${id}`,
      method: 'DELETE',
      invalidateKeys: [CacheKeys.teachers.list]
    })
};

// ---- Otanoshimi ----
export interface OtanoshimiTeamDTO {
  name: string;
  enmoku: string;
  leader: number;
  members: number[];
  time: number;
  appearance_order: number;
  custom_performers: string[];
  comment: string;
  supervisor: string[];
}

export const otanoshimiApi = {
  list: () =>
    appFetch<OtanoshimiTeamDTO[]>(`${SERVER_ENDPOINT}/api/otanoshimi`, {
      requiresAuth: true,
      alwaysFetch: true // 毎回最新
    })
};

// ---- Roll Call ----
export interface RollCallGroupDTO {
  id: number;
  name: string;
  student_ids: number[];
}
export interface ActiveRollCallDTO {
  id: string;
  teacher_id: string;
  created_at: string;
}
export interface RollCallSummaryDTO {
  id: string;
  teacher_id: number;
  teacher_surname?: string;
  teacher_forename?: string;
  created_at: number;
  total_students: number;
  checked_in_students: number;
  is_active: boolean;
  expires_at: number;
}

export interface StudentInRollCallDTO {
  gakuseki: number;
  surname: string;
  forename: string;
  class: number;
  number: number;
  status: 'targeted' | 'checked_in';
  absence_reason?: string;
  location?: string;
}

export interface RollCallDetailDTO {
  rollCall: RollCallSummaryDTO; // 追加情報が来ても summary を拡張すれば良い
  students: StudentInRollCallDTO[];
}

export const rollCallApi = {
  groups: () => appFetch<RollCallGroupDTO[]>(`${SERVER_ENDPOINT}/api/roll-call-groups`, { requiresAuth: true, cacheKey: CacheKeys.rollCall.groups }),
  start: (body: { teacher_id: number; duration_minutes: number; specific_student_id?: string; group_name?: string }) =>
    mutate<{ rollCallId: string }>({
      url: `${SERVER_ENDPOINT}/api/roll-call/start`,
      method: 'POST',
      jsonBody: body,
      invalidatePrefixes: [CachePrefixes.rollCallListForTeacher(body.teacher_id)]
    }),
  listForTeacher: (teacherId: string | number, opts: { alwaysFetch?: boolean } = {}) =>
    appFetch<RollCallSummaryDTO[]>(`${SERVER_ENDPOINT}/api/roll-call/teacher/${teacherId}`, {
      requiresAuth: true,
      cacheKey: CacheKeys.rollCall.listForTeacher(teacherId),
      alwaysFetch: opts.alwaysFetch ?? false
    }),
  listAll: (opts: { alwaysFetch?: boolean } = {}) =>
    appFetch<RollCallSummaryDTO[]>(`${SERVER_ENDPOINT}/api/roll-call/all`, {
      requiresAuth: true,
      cacheKey: CacheKeys.rollCall.listAll,
      alwaysFetch: opts.alwaysFetch ?? false
    }),
  activeForStudent: (studentId: string | number) =>
    appFetch<ActiveRollCallDTO>(`${SERVER_ENDPOINT}/api/roll-call/active?student_id=${studentId}`, {
      requiresAuth: true,
      alwaysFetch: true // 常に最新が必要
    }),
  detail: (id: string) =>
    appFetch<RollCallDetailDTO>(`${SERVER_ENDPOINT}/api/roll-call?id=${id}`, {
      requiresAuth: true,
      cacheKey: CacheKeys.rollCall.view(id),
      alwaysFetch: true
    }),
  end: (rollCallId: string, teacherId: number) =>
    mutate({
      url: `${SERVER_ENDPOINT}/api/roll-call/end`,
      method: 'POST',
      jsonBody: { roll_call_id: rollCallId },
      invalidatePrefixes: [CachePrefixes.rollCallListForTeacher(teacherId), CachePrefixes.rollCallListAll]
    })
};
