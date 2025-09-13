import type { IntRange } from 'type-fest';
import type { COURSES_DAY1_KEY, COURSES_DAY3_KEY } from './courses';

export type student = {
  surname: string;
  forename: string;
  surname_kana: string;
  forename_kana: string;
  class: IntRange<1, 8>;
  number: IntRange<1, 42>;
  gakuseki: number;
  day1id: COURSES_DAY1_KEY;
  day3id: COURSES_DAY3_KEY;
  day1bus: string;
  day3bus: string;
  room_fpr: number;
  room_tdh: number;
  shinkansen_day1_car_number: IntRange<1, 17>;
  shinkansen_day1_seat: string;
  shinkansen_day4_car_number: IntRange<1, 17>;
  shinkansen_day4_seat: string;
};
