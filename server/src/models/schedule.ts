// スケジュール管理用のPrismaモデル雛形
// Prisma schemaファイル例（prisma/schema.prisma）
// ここではTypeScript型も定義

// Prisma用のスキーマ例（schema.prismaに追加）
// model Course {
//   id        Int      @id @default(autoincrement())
//   course_key String   @unique
//   name      String?
//   schedules Schedule[]
// }
// model Schedule {
//   id        Int      @id @default(autoincrement())
//   course    Course   @relation(fields: [courseId], references: [id])
//   courseId  Int
//   title     String
//   events    Event[]
// }
// model Event {
//   id        Int      @id @default(autoincrement())
//   schedule  Schedule @relation(fields: [scheduleId], references: [id])
//   scheduleId Int
//   memo      String
//   time1Hour Int?
//   time1Minute Int?
//   time1Postfix String?
//   time2Hour Int?
//   time2Minute Int?
//   time2Postfix String?
//   details   EventDetail[]
// }
// model EventDetail {
//   id        Int      @id @default(autoincrement())
//   event     Event    @relation(fields: [eventId], references: [id])
//   eventId   Int
//   memo      String
//   time1Hour Int?
//   time1Minute Int?
//   time2Hour Int?
//   time2Minute Int?
// }

// TypeScript型例
export type Course = {
  id: number;
  course_key: string;
  name?: string;
};
export type Schedule = {
  id: number;
  courseId: number;
  title: string;
};
export type Event = {
  id: number;
  scheduleId: number;
  memo: string;
  time1Hour?: number;
  time1Minute?: number;
  time1Postfix?: string;
  time2Hour?: number;
  time2Minute?: number;
  time2Postfix?: string;
};
export type EventDetail = {
  id: number;
  eventId: number;
  memo: string;
  time1Hour?: number;
  time1Minute?: number;
  time2Hour?: number;
  time2Minute?: number;
};
