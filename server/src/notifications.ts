import * as admin from 'firebase-admin';
import { RowDataPacket } from 'mysql2/promise';
import { pool } from './db';
import { logger } from './logger';

export async function getUserFcmToken(userId: string): Promise<string | null> {
  logger.info('[notifications] getUserFcmToken リクエスト', { userId });
  const [rows] = await pool.execute<RowDataPacket[]>('SELECT token FROM fcm_tokens WHERE user_id = ?', [userId]);
  if (rows.length === 0) {
    logger.info('[notifications] getUserFcmToken: トークンなし', { userId });
    return null;
  }
  logger.info('[notifications] getUserFcmToken: トークン取得', { userId });
  return rows[0].token || null;
}

/**
 * 指定したユーザーに通知を送信
 */
export async function sendNotification(userId: string, title: string, body: string, link?: string): Promise<boolean> {
  logger.info('[notifications] sendNotification リクエスト', { userId, title });
  try {
    const token = await getUserFcmToken(userId);
    if (!token) {
      logger.warn('[notifications] 有効なトークンなし', { userId });
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
    logger.info('[notifications] 通知送信成功', { userId });
    return true;
  } catch (error) {
    logger.error('[notifications] 通知送信失敗', { userId, error: String(error) });
    if ((error as admin.FirebaseError).code === 'messaging/registration-token-not-registered') {
      await pool.execute('DELETE FROM fcm_tokens WHERE user_id = ?', [userId]);
      logger.warn('[notifications] 無効トークン削除', { userId });
    }
    return false;
  }
}
