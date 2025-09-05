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
  failed_login_attempts: number;
  is_banned: boolean;
}

// Secret key for JWT (should be in environment variables in production)
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  logger.error('ENTER THE JWT_SECRET in .env');
  process.exit(999);
}

// Register endpoint
router.post('/register', async (req: Request, res: Response) => {
  const { id, password } = req.body; // username の代わりに id を受け取る

  if (!id || !password) {
    return res.status(400).json({ message: 'IDとパスワードが必要です。' });
  }
  if (isNaN(Number(id))) {
    return res.status(400).json({ message: 'IDは整数8桁である必要があります。' });
  }

  try {
    // Check if user already exists
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT id FROM users WHERE id = ?', [id]); // id でチェック
    if (rows.length > 0) {
      return res.status(409).json({ message: 'ユーザーが既に存在します。' });
    }

    const passwordHash = await bcrypt.hash(password, 10); // Hash password
    await pool.execute('INSERT INTO users (id, passwordHash) VALUES (?, ?)', [id, passwordHash]); // id で挿入

    logger.log('新しいユーザーを登録:', id); // ログも id に変更
    res.status(201).json({ message: 'ユーザーの登録に成功しました。' });
  } catch (error) {
    logger.error('登録中にエラーが発生しました:', error as Error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Login endpoint
router.post('/login', async (req: Request, res: Response) => {
  const { id, password } = req.body; // username の代わりに id を受け取る

  if (!id || !password) {
    return res.status(400).json({ message: 'IDとパスワードが必要です。' });
  }
  if (isNaN(Number(id))) {
    // id が数字であることを確認
    return res.status(400).json({ message: 'IDは整数8桁である必要があります。' });
  }

  try {
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM users WHERE id = ?', [id]); // id で検索
    const users = rows as User[];

    if (users.length === 0) {
      return res.status(401).json({ message: '無効な資格情報です。' });
    }

    const user = users[0];

    if (user.is_banned) {
      return res.status(403).json({ message: '誤ったパスワードが何度も入力されたため、このアカウントはロックされています。管理者に連絡し、ロックを解除してください。' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      const newFailedAttempts = user.failed_login_attempts + 1;
      let query = 'UPDATE users SET failed_login_attempts = ? WHERE id = ?';
      const params = [newFailedAttempts, user.id];

      if (newFailedAttempts >= 10) {
        query = 'UPDATE users SET failed_login_attempts = ?, is_banned = 1 WHERE id = ?';
      }
      await pool.execute(query, params);

      return res.status(401).json({ message: '無効な資格情報です。' });
    }

    // Reset failed login attempts on successful login
    if (user.failed_login_attempts > 0) {
      await pool.execute('UPDATE users SET failed_login_attempts = 0 WHERE id = ?', [user.id]);
    }

    // Generate JWT
    const token = jwt.sign({ userId: user.id, is_admin: user.is_admin, is_teacher: user.is_teacher }, JWT_SECRET, { expiresIn: '7d' }); // JWTペイロードから username を削除

    res.status(200).json({ message: 'ログインに成功', token });
  } catch (error) {
    logger.error('ログイン時にエラーが発生:', error as Error);
    res.status(500).json({ message: '内部サーバーエラー' });
  }
});

export default router;