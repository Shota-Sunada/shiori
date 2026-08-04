CREATE TABLE IF NOT EXISTS roll_call_students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  roll_call_id VARCHAR(36) NOT NULL,
  student_id INT NOT NULL,
  status ENUM('targeted', 'checked_in') NOT NULL DEFAULT 'targeted',
  status_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (roll_call_id) REFERENCES roll_calls(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(gakuseki) ON DELETE CASCADE,
  UNIQUE KEY (roll_call_id, student_id)
);