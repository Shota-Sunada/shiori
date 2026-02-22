CREATE TABLE IF NOT EXISTS teachers (
  id INT PRIMARY KEY,
  surname VARCHAR(255) NOT NULL,
  forename VARCHAR(255) NOT NULL,
  room_fpr INT NOT NULL DEFAULT 0,
  room_tdh INT NOT NULL DEFAULT 0,
  shinkansen_day1_car_number INT NOT NULL,
  shinkansen_day1_seat VARCHAR(255),
  shinkansen_day4_car_number INT NOT NULL,
  shinkansen_day4_seat VARCHAR(255),
  day1id VARCHAR(255) NOT NULL DEFAULT '',
  day1bus INT NOT NULL DEFAULT 0,
  day2 INT NOT NULL DEFAULT 0,
  day3id VARCHAR(255) NOT NULL DEFAULT '',
  day3bus INT NOT NULL DEFAULT 0,
  day4class INT NOT NULL DEFAULT 0,
  FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
);