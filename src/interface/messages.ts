// 先生から生徒へのメッセージ用インターフェース
export interface TeacherMessage {
  id: number;
  teacher_id: number;
  title: string;
  message: string;
  target_type: 'all' | 'group' | 'custom';
  target_group_name?: string | null;
  recipient_count?: number | null;
  read_count?: number | null;
  is_read?: 0 | 1;
  read_at?: string | null;
  read_student_ids?: number[];
  created_at: string;
  updated_at?: string | null;
}
