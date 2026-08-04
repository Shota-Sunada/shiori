CREATE TABLE IF NOT EXISTS otanoshimi_teams (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  enmoku VARCHAR(255),
  leader INT NOT NULL,
  members TEXT NOT NULL,
  time INT NOT NULL,
  appearance_order INT NOT NULL,
  custom_performers TEXT,
  comment TEXT,
  supervisor TEXT
);