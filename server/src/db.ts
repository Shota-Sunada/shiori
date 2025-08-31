import mysql from 'mysql2/promise';

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
    // Connect without specifying a database to create it if it doesn't exist
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

    const dbName = process.env.DB_NAME;
    if (!dbName) {
      throw new Error("DB_NAME is not defined in environment variables.");
    }

    await connection.execute(`CREATE DATABASE IF NOT EXISTS 
${dbName}
`);
    console.log(`Database '${dbName}' ensured to exist.`);

    // Now select the database and create tables
    // Now select the database and create tables
    await connection.query(`USE 
${dbName}
`); // execute() から query() に変更

    // Create users table if it doesn't exist
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY,
        passwordHash VARCHAR(255) NOT NULL,
        is_admin BOOLEAN NOT NULL DEFAULT FALSE,
        is_teacher BOOLEAN NOT NULL DEFAULT FALSE
      );
    `);
    console.log("Table 'users' ensured to exist.");

    // Create students table if it doesn't exist
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
    console.log("Table 'students' ensured to exist.");

  } catch (error) {
    console.error("Error initializing database:", error);
    process.exit(1); // Exit if database initialization fails
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

export { pool, initializeDatabase };
