// 先生から生徒へのメッセージ用インターフェース
export interface TeacherMessage {
  id: number;
  teacher_id: number;
  title: string;
  message: string;
  created_at: string;
  updated_at?: string | null;
}
