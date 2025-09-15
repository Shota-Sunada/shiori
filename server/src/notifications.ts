import * as admin from 'firebase-admin';
import { RowDataPacket } from 'mysql2/promise';
import { pool } from './db';
import { logger } from './logger';

export async function getUserFcmToken(userId: string): Promise<string | null> {
  const [rows] = await pool.execute<RowDataPacket[]>('SELECT token FROM fcm_tokens WHERE user_id = ?', [userId]);
  if (rows.length === 0) return null;
  return rows[0].token || null;
}

/**
 * 指定したユーザーに通知を送信
 */
export async function sendNotification(userId: string, title: string, body: string, link?: string): Promise<boolean> {
  try {
    const token = await getUserFcmToken(userId);
    if (!token) {
      logger.warn(`ユーザー「${userId}」の有効なトークンなし。`);
      return false;
    }

    const message: admin.messaging.Message = {
      token,
      notification: { title, body },
      webpush: {
        notification: { title, body, icon: 'https://shiori.shudo-physics.com/icon.png' },
        fcmOptions: { link: link || 'https://shiori.shudo-physics.com' }
      },
      data: {
        type: 'default_notification',
        originalTitle: title,
        originalBody: body,
        link: link || ''
      }
    };

    await admin.messaging().send(message);
    logger.info(`通知送信成功 user=${userId}`);
    return true;
  } catch (error) {
    logger.error(`通知送信失敗 user=${userId}`, error as Error);
    if ((error as admin.FirebaseError).code === 'messaging/registration-token-not-registered') {
      await pool.execute('DELETE FROM fcm_tokens WHERE user_id = ?', [userId]);
      logger.warn(`無効トークン削除 user=${userId}`);
    }
    return false;
  }
}
