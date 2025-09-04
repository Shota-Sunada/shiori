import * as admin from 'firebase-admin';
import { RowDataPacket } from 'mysql2/promise';
import { pool } from './db';
import { logger } from './logger';

/**
 * 指定したユーザーに通知を送信する一般化された関数
 * @param userId 通知を送信するユーザーのID
 * @param title 通知のタイトル
 * @param body 通知の本文
 * @returns {Promise<boolean>} 送信が成功した場合はtrue、失敗した場合はfalse
 */
export async function sendNotification(userId: string, title: string, body: string, link?: string): Promise<boolean> {
  try {
    // データベースからトークンを取得
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT token FROM fcm_tokens WHERE user_id = ?', [userId]);

    if (rows.length === 0) {
      logger.log(`ユーザー「${userId}」のトークンがデータベースに存在しません。`);
      return false;
    }

    const token = rows[0].token;
    if (!token) {
      logger.log(`ユーザー「${userId}」のトークンが無効です。`);
      return false;
    }

    const message: admin.messaging.Message = {
      notification: {
        title,
        body
      },
      webpush: {
        notification: {
          title,
          body,
          icon: 'https://shiori.shudo-physics.com/icon.png'
        },
        fcmOptions: {
          link: link || 'https://shiori.shudo-physics.com'
        }
      },
      token: token,
      data: {
        type: 'default_notification',
        originalTitle: title,
        originalBody: body,
        link: link || ''
      }
    };

    await admin.messaging().send(message);
    logger.log(`ユーザー「${userId}」への通知送信に成功。`);
    return true;
  } catch (error) {
    logger.error(`ユーザー「${userId}」への通知送信に失敗:`, error as Error);

    if ((error as admin.FirebaseError).code === 'messaging/registration-token-not-registered') {
      logger.log(`ユーザー「${userId}」のトークンが無効だったので、データベースから削除しました。`);
      await pool.execute('DELETE FROM fcm_tokens WHERE user_id = ?', [userId]);
    }
    return false;
  }
}
