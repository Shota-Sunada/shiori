import { Router, Request, Response } from 'express';
import {pool} from '../db'; // Import the database connection pool
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import bcrypt from 'bcrypt';

const router = Router();

// 全ユーザーデータを取得
router.get('/', async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT id FROM users'); // パスワードハッシュは返さない
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 新しいユーザーを追加
router.post('/', async (req: Request, res: Response) => {
  const { id, password } = req.body;

  if (!id || !password) {
    return res.status(400).json({ message: 'ID and password are required' });
  }
  if (isNaN(Number(id))) {
    return res.status(400).json({ message: 'ID must be a number' });
  }

  try {
    // ユーザーが既に存在するかチェック
    const [existingUsers] = await pool.execute<RowDataPacket[]>('SELECT id FROM users WHERE id = ?', [id]);
    if (existingUsers.length > 0) {
      return res.status(409).json({ message: 'User with this ID already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10); // パスワードをハッシュ化

    await pool.execute(
      'INSERT INTO users (id, passwordHash) VALUES (?, ?)',
      [id, passwordHash]
    );
    res.status(201).json({ message: 'User added successfully' });
  } catch (error) {
    console.error('Error adding user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 特定のユーザーデータを更新 (パスワードのみ)
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ message: 'Password is required for update' });
  }
  if (isNaN(Number(id))) {
    return res.status(400).json({ message: 'ID must be a number' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10); // パスワードをハッシュ化

    const [result] = await pool.execute(
      'UPDATE users SET passwordHash = ? WHERE id = ?',
      [passwordHash, id]
    );

    if ((result as ResultSetHeader).affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 特定のユーザーデータを削除
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  if (isNaN(Number(id))) {
    return res.status(400).json({ message: 'ID must be a number' });
  }

  try {
    const [result] = await pool.execute(
      'DELETE FROM users WHERE id = ?',
      [id]
    );

    if ((result as ResultSetHeader).affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
