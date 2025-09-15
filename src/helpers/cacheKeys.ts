// 共通で利用するキャッシュキー/プレフィックス定義
// 単純な string を直接書かず、ここ経由で参照することで typo を防ぎ
// 一括リネームを容易にする。

export const CacheKeys = {
  students: {
    all: 'students:all',
    byId: (id: string | number) => `student:${id}`
  },
  teachers: {
    list: 'teachers:list',
    self: (id: string | number) => `teacher:self:${id}`
  },
  users: {
    list: 'users:list'
  },
  otanoshimi: {
    teams: 'otanoshimi:teams'
  },
  rollCall: {
    groups: 'rollcall:groups',
    listForTeacher: (teacherId: string | number) => `rollCalls:list:teacher:${teacherId}`,
    listAll: 'rollCalls:list:all',
    view: (id: string) => `rollcall:view:${id}`,
    activeForStudent: (studentId: string | number) => `activeRollCall:${studentId}`,
    historyForStudent: (studentId: string | number) => `rollcall:history:${studentId}`
  }
} as const;

// 前方一致を使うケース向けの prefix 集合
export const CachePrefixes = {
  rollCallListForTeacher: (teacherId: string | number) => `rollCalls:list:teacher:${teacherId}`,
  rollCallListAll: 'rollCalls:list:all'
} as const;
