CREATE TABLE IF NOT EXISTS boat_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  boat_index INT NOT NULL,
  student_ids JSON NOT NULL,
  teacher_ids JSON NOT NULL
);