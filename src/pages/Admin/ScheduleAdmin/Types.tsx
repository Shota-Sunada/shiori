export type EventDetail = {
  id: number;
  eventId: number;
  memo: string;
  time1Hour?: number;
  time1Minute?: number;
  time2Hour?: number;
  time2Minute?: number;
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
  details: EventDetail[];
};

export type Schedule = {
  id: number;
  courseId: number;
  title: string;
  events: Event[];
};

export type Course = {
  id: number;
  course_key: string;
  name?: string;
  schedules: Schedule[];
};
