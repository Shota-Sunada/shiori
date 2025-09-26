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
  messages: {
    list: 'messages:list',
    id: (id: number) => `messages:${id}`
  },
  roommates: {
    key: (hotel: string, room: string) => `roommates:${hotel}${room}`
  },
  credits: {
    list: 'credits:list'
  },
  schedules: {
    list: 'schedules:list',
    courses: 'schedules:courses'
  },
  rollCall: {
    groups: 'call:groups',
    listForTeacher: (teacherId: string | number) => `calls:list:teacher:${teacherId}`,
    listAll: 'calls:list:all',
    view: (id: string) => `call:view:${id}`,
    activeForStudent: (studentId: string | number) => `activeCall:${studentId}`,
    historyForStudent: (studentId: string | number) => `call:history:${studentId}`
  }
} as const;

// 前方一致を使うケース向けの prefix 集合
export const CachePrefixes = {
  rollCallListForTeacher: (teacherId: string | number) => `calls:list:teacher:${teacherId}`,
  rollCallListAll: 'calls:list:all'
} as const;
