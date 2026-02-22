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

    const normalizedTitle = (title ?? '').trim() || '通知';
    const normalizedBody = (body ?? '').trim();
    const normalizedLink = (link ?? '').trim();

    const message: admin.messaging.Message = {
      token,
      webpush: {
        notification: {
          title: normalizedTitle,
          body: normalizedBody,
          icon: 'https://shiori.shudo-physics.com/icon.png'
        },
        fcmOptions: { link: normalizedLink || 'https://shiori.shudo-physics.com' }
      },
      data: {
        type: 'default_notification',
        title: normalizedTitle,
        body: normalizedBody,
        originalTitle: normalizedTitle,
        originalBody: normalizedBody,
        link: normalizedLink,
        icon: 'https://shiori.shudo-physics.com/icon.png'
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
