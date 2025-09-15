import mysql from 'mysql2/promise';
import { logger } from './logger';

function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v) {
    logger.error(`環境変数 ${key} が未設定です。`);
    process.exit(1);
  }
  return v;
}

const pool = mysql.createPool({
  host: requireEnv('DB_HOST'),
  user: requireEnv('DB_USER'),
  password: requireEnv('DB_PASSWORD'),
  database: requireEnv('DB_NAME'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function initializeDatabase() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    });

    const dbName = requireEnv('DB_NAME');

    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
    logger.log(`データベース「${dbName}」の存在を確認。`);

    await connection.query(`USE ${dbName}`);

    // --- 既存テーブル作成 ...existing code...
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY,
        passwordHash VARCHAR(255) NOT NULL,
        is_admin BOOLEAN NOT NULL DEFAULT FALSE,
        is_teacher BOOLEAN NOT NULL DEFAULT FALSE,
        failed_login_attempts INT NOT NULL DEFAULT 0,
        is_banned BOOLEAN NOT NULL DEFAULT FALSE
      );
    `);
    logger.log('テーブル「users」の存在を確認。');

    // --- スケジュール管理用テーブル ---
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS courses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        course_key VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255)
      );
    `);
    logger.log('テーブル「courses」の存在を確認。');

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS schedules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        course_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
      );
    `);
    logger.log('テーブル「schedules」の存在を確認。');

    await connection.execute(`
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
    `);
    logger.log('テーブル「events」の存在を確認。');

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS event_details (
        id INT AUTO_INCREMENT PRIMARY KEY,
        event_id INT NOT NULL,
        memo VARCHAR(255) NOT NULL,
        time1_hour INT,
        time1_minute INT,
        time2_hour INT,
        time2_minute INT,
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
      );
    `);
    logger.log('テーブル「event_details」の存在を確認。');

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS students (
        gakuseki INT PRIMARY KEY,
        surname VARCHAR(255) NOT NULL,
        forename VARCHAR(255) NOT NULL,
        surname_kana VARCHAR(255) NOT NULL,
        forename_kana VARCHAR(255) NOT NULL,
        class INT NOT NULL,
        number INT NOT NULL,
        day2num INT NOT NULL DEFAULT 0,
        day1id VARCHAR(255) NOT NULL,
        day3id VARCHAR(255) NOT NULL,
        day1bus INT NOT NULL DEFAULT 0,
        day3bus INT NOT NULL DEFAULT 0,
        room_fpr INT NOT NULL DEFAULT 0,
        room_tdh INT NOT NULL DEFAULT 0,
        shinkansen_day1_car_number INT NOT NULL,
        shinkansen_day1_seat VARCHAR(255),
        shinkansen_day4_car_number INT NOT NULL,
        shinkansen_day4_seat VARCHAR(255)
      );
    `);
    logger.log('テーブル「students」の存在を確認。');

    await connection.execute(`
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
        day3id VARCHAR(255) NOT NULL DEFAULT '',
        day3bus INT NOT NULL DEFAULT 0,
        day4class INT NOT NULL DEFAULT 0,
        FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    logger.log('テーブル「teachers」の存在を確認。');

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS fcm_tokens (
        user_id INT PRIMARY KEY,
        token TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    logger.log('テーブル「fcm_tokens」の存在を確認。');

    await connection.execute(`
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
    `);
    logger.log('テーブル「otanoshimi_teams」の存在を確認。');

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS roll_calls (
        id VARCHAR(36) PRIMARY KEY,
        teacher_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    logger.log('テーブル「roll_calls」の存在を確認。');

    await connection.execute(`
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
    `);
    logger.log('テーブル「roll_call_students」の存在を確認。');

    await connection.execute(`
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
    `);
    logger.log('テーブル「roll_call_absences」の存在を確認。');

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS roll_call_groups (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        student_ids JSON NOT NULL
      );
    `);
    logger.log('テーブル「roll_call_groups」の存在を確認。');

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS boat_assignments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        boat_index INT NOT NULL,
        student_ids JSON NOT NULL,
        teacher_ids JSON NOT NULL
      );
    `);
    logger.log('テーブル「boat_assignments」の存在を確認。');

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS credits (
        id INT AUTO_INCREMENT PRIMARY KEY,
        category VARCHAR(255) NOT NULL,
        items TEXT NOT NULL
      );
    `);
    logger.log('テーブル「credits」の存在を確認。');
  } catch (error) {
    logger.error('データベースの初期化に失敗:', error as Error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

export { pool, initializeDatabase };
