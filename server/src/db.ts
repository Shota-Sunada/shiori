import mysql from 'mysql2/promise';
import { logger } from './logger';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
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

    const dbName = process.env.DB_NAME;
    if (!dbName) {
      throw new Error('環境変数「DB_NAME」が設定されていません。');
    }

    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
    logger.log(`データベース「${dbName}」の存在を確認。`);

    await connection.query(`USE ${dbName}`);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY,
        passwordHash VARCHAR(255) NOT NULL,
        is_admin BOOLEAN NOT NULL DEFAULT FALSE,
        is_teacher BOOLEAN NOT NULL DEFAULT FALSE
      );
    `);
    logger.log("テーブル「users」の存在を確認。");

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS students (
        gakuseki INT PRIMARY KEY,
        surname VARCHAR(255) NOT NULL,
        forename VARCHAR(255) NOT NULL,
        surname_kana VARCHAR(255) NOT NULL,
        forename_kana VARCHAR(255) NOT NULL,
        class INT NOT NULL,
        number INT NOT NULL,
        day1id VARCHAR(255) NOT NULL,
        day3id VARCHAR(255) NOT NULL,
        day1bus VARCHAR(255),
        day3bus VARCHAR(255),
        room_shizuoka VARCHAR(255),
        room_tokyo VARCHAR(255),
        shinkansen_day1_car_number INT NOT NULL,
        shinkansen_day1_seat VARCHAR(255),
        shinkansen_day4_car_number INT NOT NULL,
        shinkansen_day4_seat VARCHAR(255)
      );
    `);
    logger.log("テーブル「students」の存在を確認。");

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS fcm_tokens (
        user_id INT PRIMARY KEY,
        token TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    logger.log("テーブル「fcm_tokens」の存在を確認。");
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
