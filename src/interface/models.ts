// 共通インターフェース集約ファイル
// pages / components に散在していたデータ形状用 interface をここへ移動

// 教員 (管理画面 / 一般表示共通)
export interface Teacher {
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

// IndexTable 用 (API の型との差異を保持するため別名)
export interface IndexTeacher {
  id: number;
  surname: string;
  forename: string;
  room_fpr: number;
  room_tdh: number;
  shinkansen_day1_car_number: string; // 画面表示用に string 型で扱っていたためそのまま
  shinkansen_day1_seat: string;
  shinkansen_day4_car_number: string;
  shinkansen_day4_seat: string;
  day1id: string;
  day1bus: string;
  day3id: string;
  day3bus: string;
  day4class: number;
}

// ユーザー管理
export interface User {
  id: number;
  is_admin: boolean;
  is_teacher: boolean;
  failed_login_attempts: number;
  is_banned: boolean;
}

// 点呼一覧 / 詳細
export interface RollCall {
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

// 点呼詳細内の生徒 (TeacherRollCallViewer)
export interface RollCallStudent {
  gakuseki: number;
  surname: string;
  forename: string;
  class: number;
  number: number;
  status: 'targeted' | 'checked_in';
  absence_reason?: string;
  location?: string;
}

// 生徒モーダル (追加 / 編集)
export interface StudentFormData {
  surname: string;
  forename: string;
  surname_kana: string;
  forename_kana: string;
  class: string;
  number: string;
  gakuseki: string;
  day2num: string;
  day1id: string;
  day3id: string;
  day1bus: string;
  day3bus: string;
  room_fpr: number | '';
  room_tdh: number | '';
  shinkansen_day1_car_number: string;
  shinkansen_day4_car_number: string;
  shinkansen_day1_seat: string;
  shinkansen_day4_seat: string;
}

// ルームメイト (IndexTable)
export interface Roommate {
  gakuseki: string;
  surname: string;
  forename: string;
  class: number;
  number: number;
}

// 点呼プリセット (GroupEditorModal)
export interface RollCallGroup {
  id: number;
  name: string;
  student_ids: number[];
}

// PWA インストール案内 (InstallPWA)
export type SupportStatus = 'supported' | 'partial' | 'unsupported';
export interface BrowserInfo {
  name: string;
  icon: string;
  status: SupportStatus;
  note?: string;
}
export interface PlatformRow {
  platform: string;
  match: (os: string) => boolean;
  browsers: BrowserInfo[];
}
