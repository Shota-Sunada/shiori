import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db'; // Import the database connection pool
import { RowDataPacket } from 'mysql2';
import { logger } from '../logger';

const router = Router();

// Define the User interface to match the database table structure
interface User {
  id: number;
  passwordHash: string;
  is_admin: boolean;
  is_teacher: boolean;
}

// Secret key for JWT (should be in environment variables in production)
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// Register endpoint
router.post('/register', async (req: Request, res: Response) => {
  const { id, password } = req.body; // username の代わりに id を受け取る

  if (!id || !password) {
    return res.status(400).json({ message: 'ID and password are required' });
  }
  if (isNaN(Number(id))) {
    // id が数字であることを確認
    return res.status(400).json({ message: 'ID must be a number' });
  }

  try {
    // Check if user already exists
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT id FROM users WHERE id = ?', [id]); // id でチェック
    if (rows.length > 0) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10); // Hash password
    await pool.execute('INSERT INTO users (id, passwordHash) VALUES (?, ?)', [id, passwordHash]); // id で挿入

    logger.log('Registered new user:', id); // ログも id に変更
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    logger.error('Error during registration:', error as Error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Login endpoint
router.post('/login', async (req: Request, res: Response) => {
  const { id, password } = req.body; // username の代わりに id を受け取る

  if (!id || !password) {
    return res.status(400).json({ message: 'ID and password are required' });
  }
  if (isNaN(Number(id))) {
    // id が数字であることを確認
    return res.status(400).json({ message: 'ID must be a number' });
  }

  try {
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT id, passwordHash, is_admin, is_teacher FROM users WHERE id = ?', [id]); // id で検索
    const users = rows as User[];

    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = users[0];
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign({ userId: user.id, is_admin: user.is_admin, is_teacher: user.is_teacher }, JWT_SECRET, { expiresIn: '1h' }); // JWTペイロードから username を削除

    res.status(200).json({ message: 'Login successful', token });
  } catch (error) {
    logger.error('Error during login:', error as Error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
