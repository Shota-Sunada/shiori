CREATE TABLE IF NOT EXISTS events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  schedule_id INT NOT NULL,
  memo VARCHAR(255) NOT NULL,
  time1_hour INT,
  time1_minute INT,
  time1_postfix VARCHAR(32),
  time2_hour INT,
  time2_minute INT,
  time2_postfix VARCHAR(32),
  FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE
);