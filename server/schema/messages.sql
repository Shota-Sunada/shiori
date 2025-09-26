-- 先生から生徒へのメッセージ格納用テーブル
CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  teacher_id INT NOT NULL,
  title VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  target_type ENUM('all', 'group', 'custom') NOT NULL DEFAULT 'all',
  target_group_name VARCHAR(255) DEFAULT NULL,
  target_student_ids JSON NOT NULL,
  read_student_ids JSON NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id)
);
