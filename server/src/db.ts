import mysql from 'mysql2/promise';
import { logger } from './logger';
import { promises as fs } from 'fs';
import path from 'path';

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

    // schemaディレクトリ内の.sqlファイルを順に実行
    const schemaDir = path.join(__dirname, '../schema');
    const files = [
      'users.sql',
      'courses.sql',
      'schedules.sql',
      'events.sql',
      'event_details.sql',
      'students.sql',
      'teachers.sql',
      'fcm_tokens.sql',
      'otanoshimi_teams.sql',
      'roll_calls.sql',
      'roll_call_students.sql',
      'roll_call_absences.sql',
      'roll_call_groups.sql',
      'boat_assignments.sql',
      'credits.sql',
      'event_messages.sql'
    ];
    for (const file of files) {
      const sql = await fs.readFile(path.join(schemaDir, file), 'utf8');
      await connection.query(sql);
      logger.log(`スキーマ「${file}」を適用しました。`);
    }
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
