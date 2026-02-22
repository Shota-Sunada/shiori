CREATE TABLE IF NOT EXISTS event_details (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id INT NOT NULL,
  memo VARCHAR(255) NOT NULL,
  time1_hour INT,
  time1_minute INT,
  time2_hour INT,
  time2_minute INT,
  sort_order INT NOT NULL DEFAULT 0,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);