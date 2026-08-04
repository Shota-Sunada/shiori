CREATE TABLE IF NOT EXISTS roll_call_absences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  roll_call_id VARCHAR(36) NOT NULL,
  student_id INT NOT NULL,
  reason TEXT NOT NULL,
  location TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (roll_call_id) REFERENCES roll_calls(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(gakuseki) ON DELETE CASCADE
);